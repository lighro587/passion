import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForgeStore } from "../store/useForgeStore";
import { REGISTRY } from "../plugins/registry";
import { clamp } from "../lib/clamp";

type Pt = { x: number; y: number };

const NODE_W = 240;
const NODE_H = 120;
const PORT_R = 7;

export function Canvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  const graph = useForgeStore(s => s.graph);
  const vp = useForgeStore(s => s.vp);
  const setVP = useForgeStore(s => s.setVP);
  const zoomAt = useForgeStore(s => s.zoomAt);

  const selectedId = useForgeStore(s => s.selectedId);
  const select = useForgeStore(s => s.select);

  const connecting = useForgeStore(s => s.connecting);
  const startConnect = useForgeStore(s => s.startConnect);
  const finishConnect = useForgeStore(s => s.finishConnect);
  const cancelConnect = useForgeStore(s => s.cancelConnect);

  const moveNode = useForgeStore(s => s.moveNode);
  const deleteSelected = useForgeStore(s => s.deleteSelected);
  const undo = useForgeStore(s => s.undo);
  const redo = useForgeStore(s => s.redo);

  const [drag, setDrag] = useState<null | { kind: "pan" } | { kind: "node"; id: string }>(null);
  const [mouse, setMouse] = useState<Pt>({ x: 0, y: 0 });

  // world<->screen
  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - vp.x) / vp.z,
    y: (sy - vp.y) / vp.z
  });
  const worldToScreen = (wx: number, wy: number) => ({
    x: wx * vp.z + vp.x,
    y: wy * vp.z + vp.y
  });

  const hit = useMemo(() => {
    // precompute port positions for hit-testing
    const ports: Array<{ kind: "port"; nodeId: string; portId: string; dir: "in" | "out"; p: Pt; portKind: "flow" | "data" }> = [];
    const nodes = graph.nodes;

    for (const n of nodes) {
      const def = REGISTRY[n.type];
      if (!def) continue;

      const inPorts = def.inputs;
      const outPorts = def.outputs;

      // input ports on left
      inPorts.forEach((p, i) => {
        const py = n.pos.y + 40 + i * 18;
        ports.push({ kind: "port", nodeId: n.id, portId: p.id, dir: "in", p: { x: n.pos.x - 8, y: py }, portKind: p.kind });
      });

      // output ports on right
      outPorts.forEach((p, i) => {
        const py = n.pos.y + 40 + i * 18;
        ports.push({ kind: "port", nodeId: n.id, portId: p.id, dir: "out", p: { x: n.pos.x + NODE_W + 8, y: py }, portKind: p.kind });
      });
    }

    return { ports };
  }, [graph.nodes]);

  // draw loop
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(c.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawGrid = () => {
      const step = 40 * vp.z;
      const ox = ((vp.x % step) + step) % step;
      const oy = ((vp.y % step) + step) % step;

      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;

      for (let x = -step + ox; x < c.clientWidth + step; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.clientHeight); ctx.stroke();
      }
      for (let y = -step + oy; y < c.clientHeight + step; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.clientWidth, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const curve = (a: Pt, b: Pt) => {
      const dx = Math.max(80, Math.abs(b.x - a.x) * 0.45);
      const c1 = { x: a.x + dx, y: a.y };
      const c2 = { x: b.x - dx, y: b.y };
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
      ctx.stroke();
    };

    const tick = () => {
      ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);

      // background vignette
      const g = ctx.createRadialGradient(c.clientWidth * 0.5, c.clientHeight * 0.2, 40, c.clientWidth * 0.5, c.clientHeight * 0.2, c.clientWidth);
      g.addColorStop(0, "rgba(140,100,255,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);

      drawGrid();

      // edges
      for (const e of graph.edges) {
        const fromPort = hit.ports.find(p => p.nodeId === e.from.nodeId && p.portId === e.from.portId && p.dir === "out");
        const toPort = hit.ports.find(p => p.nodeId === e.to.nodeId && p.portId === e.to.portId && p.dir === "in");
        if (!fromPort || !toPort) continue;

        const a = worldToScreen(fromPort.p.x, fromPort.p.y);
        const b = worldToScreen(toPort.p.x, toPort.p.y);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(233,233,255,0.45)";
        curve(a, b);
      }

      // live wire preview
      if (connecting) {
        const fromPort = hit.ports.find(p => p.nodeId === connecting.fromNodeId && p.portId === connecting.fromPortId && p.dir === "out");
        if (fromPort) {
          const a = worldToScreen(fromPort.p.x, fromPort.p.y);
          const b = { x: mouse.x, y: mouse.y };
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(120,86,255,0.85)";
          curve(a, b);
        }
      }

      // nodes
      for (const n of graph.nodes.slice().reverse()) {
        const def = REGISTRY[n.type];
        if (!def) continue;

        const s = worldToScreen(n.pos.x, n.pos.y);
        const w = NODE_W * vp.z;
        const h = NODE_H * vp.z;

        const selected = n.id === selectedId;

        // body
        ctx.fillStyle = selected ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.28)";
        ctx.strokeStyle = selected ? "rgba(180,160,255,0.35)" : "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1.5;

        roundRect(ctx, s.x, s.y, w, h, 18 * vp.z);
        ctx.fill(); ctx.stroke();

        // header glow
        const hg = ctx.createLinearGradient(s.x, s.y, s.x + w, s.y);
        hg.addColorStop(0, "rgba(120,86,255,0.25)");
        hg.addColorStop(1, "rgba(38,255,224,0.08)");
        ctx.fillStyle = hg;
        roundRect(ctx, s.x, s.y, w, 34 * vp.z, 18 * vp.z);
        ctx.fill();

        // text
        ctx.fillStyle = "rgba(233,233,255,0.92)";
        ctx.font = `${12 * vp.z}px ui-sans-serif`;
        ctx.fillText(def.title, s.x + 14 * vp.z, s.y + 22 * vp.z);

        ctx.fillStyle = "rgba(233,233,255,0.55)";
        ctx.font = `${10 * vp.z}px ui-sans-serif`;
        if (def.subtitle) ctx.fillText(def.subtitle, s.x + 14 * vp.z, s.y + 46 * vp.z);

        // ports
        for (const p of hit.ports.filter(p => p.nodeId === n.id)) {
          const sp = worldToScreen(p.p.x, p.p.y);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, PORT_R * vp.z, 0, Math.PI * 2);
          ctx.fillStyle = p.portKind === "flow" ? "rgba(255,255,255,0.85)" : "rgba(38,255,224,0.75)";
          ctx.fill();

          ctx.fillStyle = "rgba(233,233,255,0.6)";
          ctx.font = `${9 * vp.z}px ui-sans-serif`;
          const label = (REGISTRY[n.type]?.[p.dir === "in" ? "inputs" : "outputs"] as any)?.find((x:any)=>x.id===p.portId)?.label ?? p.portId;
          if (p.dir === "in") ctx.fillText(label, sp.x + 10 * vp.z, sp.y + 3 * vp.z);
          else ctx.fillText(label, sp.x - (ctx.measureText(label).width + 10 * vp.z), sp.y + 3 * vp.z);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const roundRect = (ctx2: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx2.beginPath();
      ctx2.moveTo(x + rr, y);
      ctx2.arcTo(x + w, y, x + w, y + h, rr);
      ctx2.arcTo(x + w, y + h, x, y + h, rr);
      ctx2.arcTo(x, y + h, x, y, rr);
      ctx2.arcTo(x, y, x + w, y, rr);
      ctx2.closePath();
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [graph, vp, selectedId, connecting, mouse.x, mouse.y, hit.ports]);

  // input handling
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") cancelConnect();
      if (e.key === "Backspace" || e.key === "Delete") deleteSelected();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, cancelConnect, deleteSelected]);

  const findPortHit = (sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    for (const p of hit.ports) {
      const dx = w.x - p.p.x;
      const dy = w.y - p.p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 12 / vp.z) return p;
    }
    return null;
  };

  const findNodeHit = (sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    for (const n of graph.nodes) {
      if (w.x >= n.pos.x && w.x <= n.pos.x + NODE_W && w.y >= n.pos.y && w.y <= n.pos.y + NODE_H) return n;
    }
    return null;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 shadow-glow overflow-hidden">
      <div className="h-[560px] relative">
        <canvas
          ref={ref}
          className="w-full h-full block"
          onMouseMove={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = e.clientX - r.left;
            const sy = e.clientY - r.top;
            setMouse({ x: sx, y: sy });

            if (drag?.kind === "pan") setVP({ x: vp.x + e.movementX, y: vp.y + e.movementY });
            if (drag?.kind === "node") moveNode(drag.id, e.movementX / vp.z, e.movementY / vp.z);
          }}
          onMouseDown={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = e.clientX - r.left;
            const sy = e.clientY - r.top;

            const ph = findPortHit(sx, sy);
            if (ph) {
              // connect from outputs only (MVP)
              if (ph.dir === "out") startConnect(ph.nodeId, ph.portId, ph.portKind);
              else if (connecting) finishConnect(ph.nodeId, ph.portId);
              return;
            }

            const nh = findNodeHit(sx, sy);
            if (nh) {
              select(nh.id);
              setDrag({ kind: "node", id: nh.id });
            } else {
              select(null);
              setDrag({ kind: "pan" });
            }
          }}
          onMouseUp={() => setDrag(null)}
          onDoubleClick={(e) => {
            // double click empty = center view a bit
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = e.clientX - r.left;
            const sy = e.clientY - r.top;
            const w = screenToWorld(sx, sy);
            setVP({ x: vp.x - w.x * (vp.z - 1), y: vp.y - w.y * (vp.z - 1) });
          }}
          onWheel={(e) => {
            e.preventDefault();
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = e.clientX - r.left;
            const sy = e.clientY - r.top;
            const dz = e.deltaY > 0 ? 0.92 : 1.08;
            zoomAt(sx, sy, dz, (x,y) => screenToWorld(x,y));
          }}
        />

        <div className="absolute bottom-3 left-3 text-xs text-white/60 bg-black/35 border border-white/10 rounded-2xl px-3 py-2">
          Drag nodes • Mousewheel zoom • Drag empty to pan • Ctrl/Cmd+Z undo • Del delete • Esc cancel wire
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
