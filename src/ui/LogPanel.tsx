import React from "react";
import { useForgeStore } from "../store/useForgeStore";

export function LogPanel() {
  const events = useForgeStore(s => s.events);
  const ok = useForgeStore(s => s.runOk);
  const vars = useForgeStore(s => s.vars);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 shadow-glow p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Run Log</div>
          <div className="text-xs text-white/60 mt-1">
            {ok === null ? "Not run yet." : ok ? "✅ Success" : "❌ Failed"}
          </div>
        </div>
        <div className="text-xs text-white/50">Events: {events.length}</div>
      </div>

      <div className="mt-3 grid lg:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black/25 border border-white/10 p-3 max-h-[220px] overflow-auto">
          {events.length === 0 ? (
            <div className="text-sm text-white/60">Select a trigger node and hit Run.</div>
          ) : (
            <div className="grid gap-2">
              {events.slice().reverse().map((e, idx) => (
                <div key={idx} className="text-xs">
                  <span className="text-white/50">{new Date(e.at).toLocaleTimeString()} </span>
                  <span className={e.kind === "error" ? "text-red-300" : e.kind === "warn" ? "text-amber-200" : "text-white/80"}>
                    [{e.kind}] {("title" in e ? e.title : "")}{" "}
                    {"msg" in e ? e.msg : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-black/25 border border-white/10 p-3 max-h-[220px] overflow-auto">
          <div className="text-xs text-white/60 mb-2">Runtime Vars</div>
          <pre className="text-xs text-white/80 whitespace-pre-wrap">{JSON.stringify(vars, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
