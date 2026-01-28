import { create } from "zustand";
import { uid } from "../lib/uid";
import { clamp } from "../lib/clamp";
import { loadState, saveState } from "../lib/storage";
import type { Graph, Node, Edge } from "../engine/graph";
import type { RuntimeEvent } from "../engine/types";
import { REGISTRY } from "../plugins/registry";
import { runGraph } from "../engine/runner";

type Viewport = { x: number; y: number; z: number }; // pan (world offset), zoom

type HistorySnap = { graph: Graph; vp: Viewport; selectedId: string | null };

type State = {
  graph: Graph;
  vp: Viewport;
  selectedId: string | null;

  // wire-drag interaction
  connecting: null | { fromNodeId: string; fromPortId: string; kind: "flow" | "data" };

  // run output
  events: RuntimeEvent[];
  vars: Record<string, unknown>;
  runOk: boolean | null;

  // toasts
  toasts: Array<{ id: string; msg: string }>;

  // history
  past: HistorySnap[];
  future: HistorySnap[];

  boot: () => void;

  addNode: (type: string, atWorld: { x: number; y: number }) => void;
  deleteSelected: () => void;
  select: (id: string | null) => void;

  startConnect: (fromNodeId: string, fromPortId: string, kind: "flow" | "data") => void;
  finishConnect: (toNodeId: string, toPortId: string) => void;
  cancelConnect: () => void;

  moveNode: (nodeId: string, dx: number, dy: number) => void;

  setVP: (next: Partial<Viewport>) => void;
  zoomAt: (screenX: number, screenY: number, dz: number, screenToWorld: (sx: number, sy: number) => {x:number;y:number}) => void;

  pushToast: (msg: string) => void;

  runFrom: (startNodeId: string) => Promise<void>;

  undo: () => void;
  redo: () => void;
};

function emptyGraph(): Graph {
  return { id: uid(), name: "Untitled Flow", nodes: [], edges: [] };
}

function snap(state: State): HistorySnap {
  return {
    graph: structuredClone(state.graph),
    vp: { ...state.vp },
    selectedId: state.selectedId
  };
}

export const useForgeStore = create<State>((set, get) => ({
  graph: emptyGraph(),
  vp: { x: 0, y: 0, z: 1 },
  selectedId: null,
  connecting: null,

  events: [],
  vars: {},
  runOk: null,

  toasts: [],
  past: [],
  future: [],

  boot: () => {
    const saved = loadState<{ graph: Graph; vp: Viewport; selectedId: string | null }>();
    if (saved?.graph) {
      set({ graph: saved.graph, vp: saved.vp ?? {x:0,y:0,z:1}, selectedId: saved.selectedId ?? null });
      return;
    }

    // starter flow (not cringe, just shows the engine)
    const t = "trigger.manual";
    const s = "logic.setVar";
    const d = "timing.delay";
    const a = "action.toast";

    const n1: Node = { id: uid(), type: t, pos: { x: 80, y: 80 }, data: {} };
    const n2: Node = { id: uid(), type: s, pos: { x: 380, y: 70 }, data: { key: "name", fallback: "World" } };
    const n3: Node = { id: uid(), type: d, pos: { x: 660, y: 70 }, data: { ms: 350 } };
    const n4: Node = { id: uid(), type: a, pos: { x: 940, y: 70 }, data: { msg: "Flow complete." } };

    const e1: Edge = { id: uid(), from: { nodeId: n1.id, portId: "go" }, to: { nodeId: n2.id, portId: "in" } };
    const e2: Edge = { id: uid(), from: { nodeId: n2.id, portId: "out" }, to: { nodeId: n3.id, portId: "in" } };
    const e3: Edge = { id: uid(), from: { nodeId: n3.id, portId: "out" }, to: { nodeId: n4.id, portId: "in" } };

    const g: Graph = { id: uid(), name: "Demo Flow", nodes: [n1,n2,n3,n4], edges: [e1,e2,e3] };
    set({ graph: g, vp: { x: 0, y: 0, z: 1 } });
  },

  pushToast: (msg) => {
    const id = uid();
    set(s => ({ toasts: [{ id, msg }, ...s.toasts].slice(0, 4) }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2200);
  },

  select: (id) => set({ selectedId: id }),

  addNode: (type, atWorld) => {
    const def = REGISTRY[type];
    if (!def) return;

    const node: Node = {
      id: uid(),
      type,
      pos: { x: Math.round(atWorld.x / 10) * 10, y: Math.round(atWorld.y / 10) * 10 },
      data: structuredClone(def.defaultData ?? {})
    };

    set(s => ({
      past: [snap(s), ...s.past].slice(0, 80),
      future: [],
      graph: { ...s.graph, nodes: [node, ...s.graph.nodes] },
      selectedId: node.id
    }));

    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  deleteSelected: () => {
    const id = get().selectedId;
    if (!id) return;
    set(s => {
      const nodes = s.graph.nodes.filter(n => n.id !== id);
      const edges = s.graph.edges.filter(e => e.from.nodeId !== id && e.to.nodeId !== id);
      return {
        past: [snap(s), ...s.past].slice(0, 80),
        future: [],
        graph: { ...s.graph, nodes, edges },
        selectedId: null
      };
    });
    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  startConnect: (fromNodeId, fromPortId, kind) => set({ connecting: { fromNodeId, fromPortId, kind } }),
  cancelConnect: () => set({ connecting: null }),

  finishConnect: (toNodeId, toPortId) => {
    const c = get().connecting;
    if (!c) return;

    // prevent self-loop into same port
    if (c.fromNodeId === toNodeId && c.fromPortId === toPortId) return;

    const edge: Edge = { id: uid(), from: { nodeId: c.fromNodeId, portId: c.fromPortId }, to: { nodeId: toNodeId, portId: toPortId } };

    set(s => ({
      past: [snap(s), ...s.past].slice(0, 80),
      future: [],
      connecting: null,
      graph: { ...s.graph, edges: [edge, ...s.graph.edges] }
    }));

    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  moveNode: (nodeId, dx, dy) => {
    set(s => ({
      graph: {
        ...s.graph,
        nodes: s.graph.nodes.map(n =>
          n.id === nodeId ? { ...n, pos: { x: n.pos.x + dx, y: n.pos.y + dy } } : n
        )
      }
    }));
  },

  setVP: (next) => {
    set(s => ({ vp: { ...s.vp, ...next } }));
    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  zoomAt: (screenX, screenY, dz, screenToWorld) => {
    const s = get();
    const before = screenToWorld(screenX, screenY);
    const z = clamp(s.vp.z * dz, 0.35, 2.5);
    set({ vp: { ...s.vp, z } });
    const after = screenToWorld(screenX, screenY);
    // keep the world point under cursor stable
    set(st => ({ vp: { ...st.vp, x: st.vp.x + (after.x - before.x), y: st.vp.y + (after.y - before.y) } }));
    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  runFrom: async (startNodeId) => {
    set({ events: [], vars: {}, runOk: null });

    const res = await runGraph({ graph: get().graph, registry: REGISTRY, startNodeId });

    set({ events: res.events, vars: res.vars, runOk: res.ok });

    // turn “toast node” into actual UI toast if found in events
    for (const e of res.events) {
      if (e.kind === "info" && e.msg.startsWith("Toast: ")) {
        get().pushToast(e.msg.replace("Toast: ", ""));
      }
    }
  },

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const [head, ...rest] = s.past;
    set({
      past: rest,
      future: [snap(s), ...s.future].slice(0, 80),
      graph: head.graph,
      vp: head.vp,
      selectedId: head.selectedId
    });
    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const [head, ...rest] = s.future;
    set({
      future: rest,
      past: [snap(s), ...s.past].slice(0, 80),
      graph: head.graph,
      vp: head.vp,
      selectedId: head.selectedId
    });
    saveState({ graph: get().graph, vp: get().vp, selectedId: get().selectedId });
  }
}));
