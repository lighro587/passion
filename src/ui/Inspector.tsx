import React from "react";
import { useForgeStore } from "../store/useForgeStore";
import { REGISTRY } from "../plugins/registry";

export function Inspector() {
  const graph = useForgeStore(s => s.graph);
  const selectedId = useForgeStore(s => s.selectedId);

  const node = graph.nodes.find(n => n.id === selectedId) ?? null;
  if (!node) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/30 shadow-glow p-4">
        <div className="text-sm font-semibold">Inspector</div>
        <div className="text-sm text-white/60 mt-2">Select a node to edit.</div>
      </div>
    );
  }

  const def = REGISTRY[node.type];
  const data = node.data ?? {};

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 shadow-glow p-4">
      <div className="text-sm font-semibold">{def?.title ?? node.type}</div>
      <div className="text-xs text-white/60 mt-1">{node.type}</div>

      <div className="mt-4 grid gap-3">
        {Object.keys(data).length === 0 ? (
          <div className="text-sm text-white/60">No editable fields.</div>
        ) : (
          Object.entries(data).map(([k, v]) => (
            <Field key={k} nodeId={node.id} k={k} v={v} />
          ))
        )}
      </div>
    </div>
  );
}

function Field({ nodeId, k, v }: { nodeId: string; k: string; v: unknown }) {
  const graph = useForgeStore(s => s.graph);
  const setGraph = (updater: (g: typeof graph) => typeof graph) => {
    // minimal mutation: directly set graph
    (useForgeStore as any).setState((s: any) => ({ graph: updater(s.graph) }));
  };

  const isNum = typeof v === "number";
  const isBool = typeof v === "boolean";

  return (
    <label className="text-xs text-white/60">
      {k}
      {isBool ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(v)}
            onChange={(e) => {
              const next = e.target.checked;
              setGraph(g => ({
                ...g,
                nodes: g.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [k]: next } } : n)
              }));
            }}
          />
          <span className="text-sm text-white/80">{String(v)}</span>
        </div>
      ) : (
        <input
          className="mt-1 w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-white/20 text-sm text-white/90"
          value={String(v ?? "")}
          onChange={(e) => {
            const raw = e.target.value;
            const next: any = isNum ? Number(raw) : raw;
            setGraph(g => ({
              ...g,
              nodes: g.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [k]: next } } : n)
            }));
          }}
        />
      )}
    </label>
  );
}
