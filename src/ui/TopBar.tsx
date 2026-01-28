import React from "react";
import { Play, Undo2, Redo2, Trash2 } from "lucide-react";
import { useForgeStore } from "../store/useForgeStore";
import { REGISTRY } from "../plugins/registry";

export function TopBar() {
  const graph = useForgeStore(s => s.graph);
  const selectedId = useForgeStore(s => s.selectedId);
  const undo = useForgeStore(s => s.undo);
  const redo = useForgeStore(s => s.redo);
  const del = useForgeStore(s => s.deleteSelected);
  const runFrom = useForgeStore(s => s.runFrom);

  const selectedNode = graph.nodes.find(n => n.id === selectedId) ?? null;
  const isTrigger = selectedNode?.type?.startsWith("trigger.") ?? false;

  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold tracking-tight">FlowForge</div>
          <div className="text-xs text-white/60">
            Node canvas • engine • debugger • plugins
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 shadow-glow inline-flex items-center gap-2">
            <Undo2 size={18} /> Undo
          </button>
          <button onClick={redo} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 shadow-glow inline-flex items-center gap-2">
            <Redo2 size={18} /> Redo
          </button>
          <button
            onClick={del}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 shadow-glow inline-flex items-center gap-2"
            disabled={!selectedNode}
            title="Delete selected node"
          >
            <Trash2 size={18} /> Delete
          </button>

          <button
            onClick={() => selectedNode && runFrom(selectedNode.id)}
            className={[
              "px-4 py-2 rounded-xl shadow-glow inline-flex items-center gap-2",
              isTrigger ? "bg-violet-500/40 hover:bg-violet-500/50" : "bg-white/10 hover:bg-white/15 opacity-60 cursor-not-allowed"
            ].join(" ")}
            disabled={!isTrigger}
            title={isTrigger ? "Run from selected trigger" : "Select a trigger node to run"}
          >
            <Play size={18} /> Run
          </button>
        </div>
      </div>
    </div>
  );
}
