import type { Graph } from "./graph";
import type { NodeDef, RuntimeEvent } from "./types";
import { createRuntime } from "./runtime";

type Registry = Record<string, NodeDef>;

function now() { return Date.now(); }

export type RunResult = {
  ok: boolean;
  events: RuntimeEvent[];
  vars: Record<string, unknown>;
};

export async function runGraph(args: {
  graph: Graph;
  registry: Registry;
  // start at a specific trigger node (manual)
  startNodeId: string;
  maxSteps?: number;
}): Promise<RunResult> {
  const { graph, registry, startNodeId } = args;
  const maxSteps = args.maxSteps ?? 200;

  const rt = createRuntime();
  const nodesById = new Map(graph.nodes.map(n => [n.id, n]));
  const edges = graph.edges;

  const emit = (e: RuntimeEvent) => rt.emit(e);

  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

  function outgoing(fromNodeId: string, fromPortId: string) {
    return edges.filter(e => e.from.nodeId === fromNodeId && e.from.portId === fromPortId);
  }

  function incomingData(toNodeId: string, toPortId: string) {
    // data edges end at an input port; source provides output data port
    return edges.filter(e => e.to.nodeId === toNodeId && e.to.portId === toPortId);
  }

  async function evalNode(nodeId: string): Promise<{ flowPorts: string[]; outputs: Record<string, unknown> }> {
    const node = nodesById.get(nodeId);
    if (!node) throw new Error(`Node missing: ${nodeId}`);
    const def = registry[node.type];
    if (!def) throw new Error(`Unknown node type: ${node.type}`);

    // gather data inputs
    const inputs: Record<string, unknown> = {};
    for (const p of def.inputs.filter(p => p.kind === "data")) {
      const inc = incomingData(node.id, p.id);
      if (inc.length === 0) continue;
      // take first for MVP; later: merge or multi-input policies
      const srcEdge = inc[0];
      const srcNode = nodesById.get(srcEdge.from.nodeId);
      const srcDef = srcNode ? registry[srcNode.type] : null;
      if (!srcNode || !srcDef) continue;

      // recursively evaluate source node to get its outputs (lazy)
      // NOTE: We cache by step to avoid repeats; implemented below
    }

    // inputs resolved by outer cache path
    emit({ kind: "step", at: now(), nodeId: node.id, nodeType: node.type, title: def.title });

    const result = await def.exec({
      nodeId: node.id,
      nodeType: node.type,
      data: node.data ?? {},
      inputs,
      vars: rt.vars,
      emit,
      sleep
    });

    if (result.varsPatch) rt.vars = { ...rt.vars, ...result.varsPatch };
    return { flowPorts: result.nextFlow ?? [], outputs: result.outputs ?? {} };
  }

  // Cache outputs per node per run to avoid recompute storms
  const outputCache = new Map<string, Record<string, unknown>>();
  async function getNodeOutputs(nodeId: string) {
    if (outputCache.has(nodeId)) return outputCache.get(nodeId)!;
    // Evaluate node but do NOT advance flow; used for data dependency
    const node = nodesById.get(nodeId);
    if (!node) return {};
    const def = registry[node.type];
    if (!def) return {};

    // resolve its own data inputs recursively
    const inputs: Record<string, unknown> = {};
    for (const p of def.inputs.filter(p => p.kind === "data")) {
      const inc = edges.filter(e => e.to.nodeId === nodeId && e.to.portId === p.id);
      if (inc.length === 0) continue;
      const e0 = inc[0];
      const srcOut = await getNodeOutputs(e0.from.nodeId);
      inputs[p.id] = srcOut[e0.from.portId];
    }

    const result = await def.exec({
      nodeId,
      nodeType: node.type,
      data: node.data ?? {},
      inputs,
      vars: rt.vars,
      emit,
      sleep
    });
    if (result.varsPatch) rt.vars = { ...rt.vars, ...result.varsPatch };
    const out = result.outputs ?? {};
    outputCache.set(nodeId, out);
    return out;
  }

  async function evalNodeWithInputs(nodeId: string) {
    const node = nodesById.get(nodeId)!;
    const def = registry[node.type]!;
    const inputs: Record<string, unknown> = {};
    for (const p of def.inputs.filter(p => p.kind === "data")) {
      const inc = edges.filter(e => e.to.nodeId === nodeId && e.to.portId === p.id);
      if (inc.length === 0) continue;
      const e0 = inc[0];
      const srcOut = await getNodeOutputs(e0.from.nodeId);
      inputs[p.id] = srcOut[e0.from.portId];
    }

    rt.emit({ kind: "step", at: now(), nodeId: node.id, nodeType: node.type, title: def.title });

    const result = await def.exec({
      nodeId: node.id,
      nodeType: node.type,
      data: node.data ?? {},
      inputs,
      vars: rt.vars,
      emit,
      sleep
    });

    if (result.varsPatch) rt.vars = { ...rt.vars, ...result.varsPatch };
    const outputs = result.outputs ?? {};
    outputCache.set(nodeId, outputs);
    return { flowPorts: result.nextFlow ?? [], outputs };
  }

  try {
    emit({ kind: "info", at: now(), msg: "Run started." });

    // Start node must have a flow output; we follow first flow port(s)
    let queue: Array<{ nodeId: string; fromPort: string }> = [];
    const startNode = nodesById.get(startNodeId);
    if (!startNode) throw new Error("Start node not found.");

    // Run the trigger itself
    const triggerOut = await evalNodeWithInputs(startNodeId);
    for (const fp of triggerOut.flowPorts) queue.push({ nodeId: startNodeId, fromPort: fp });

    let steps = 0;

    while (queue.length > 0) {
      if (steps++ > maxSteps) throw new Error(`Run stopped: exceeded max steps (${maxSteps}).`);

      const { nodeId, fromPort } = queue.shift()!;
      const outs = outgoing(nodeId, fromPort);

      for (const e of outs) {
        const next = e.to.nodeId;
        const nextNode = nodesById.get(next);
        if (!nextNode) continue;

        const res = await evalNodeWithInputs(next);
        for (const fp of res.flowPorts) queue.push({ nodeId: next, fromPort: fp });
      }
    }

    emit({ kind: "info", at: now(), msg: "Run complete." });
    return { ok: true, events: rt.events, vars: rt.vars };
  } catch (err: any) {
    emit({ kind: "error", at: now(), msg: err?.message ?? "Unknown error" });
    return { ok: false, events: rt.events, vars: rt.vars };
  }
}
