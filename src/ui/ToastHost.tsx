import React from "react";
import { useForgeStore } from "../store/useForgeStore";

export function ToastHost() {
  const toasts = useForgeStore(s => s.toasts);
  return (
    <div className="fixed top-4 right-4 z-[100] grid gap-2 w-[300px] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-none px-3 py-2 rounded-2xl bg-black/45 border border-white/10 shadow-glow text-sm">
          {t.msg}
        </div>
      ))}
    </div>
  );
}
