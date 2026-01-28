import React from "react";
import { PALETTE, REGISTRY } from "../plugins/registry";
import { useForgeStore } from "../store/useForgeStore";

export function Palette() {
  const addNode = useForgeStore(s => s.addNode);
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 shadow-glow p-3">
      <div className="text-sm font-semibold">Nodes</div>
      <div className="text-xs text-white/60 mt-1">Drag-add by clicking.</div>

      <div className="mt-3 grid gap-2">
        {grouped(PALETTE).map(([group, items]) => (
          <div key={group}>
            <div className="text-xs text-white/50 mt-2 mb-1">{group}</div>
            <div className="grid gap-2">
              {items.map(it => {
                const def = REGISTRY[it.type];
                return (
                  <button
                    key={it.type}
                    onClick={() => addNode(it.type, { x: 160 + Math.random() * 200, y: 120 + Math.random() * 160 })}
                    className="text-left px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <div className="text-sm font-semibold">{def.title}</div>
                    <div className="text-xs text-white/60">{def.subtitle ?? it.type}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function grouped<T extends { group: string }>(arr: T[]) {
  const m = new Map<string, T[]>();
  for (const x of arr) {
    if (!m.has(x.group)) m.set(x.group, []);
    m.get(x.group)!.push(x);
  }
  return Array.from(m.entries());
}
