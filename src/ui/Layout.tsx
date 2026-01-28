import React from "react";
import { TopBar } from "./TopBar";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { LogPanel } from "./LogPanel";
import { ToastHost } from "./ToastHost";

export function Layout() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="max-w-[1600px] mx-auto px-4 pb-4">
        <div className="grid grid-cols-12 gap-3 mt-3">
          <div className="col-span-12 lg:col-span-2"><Palette /></div>
          <div className="col-span-12 lg:col-span-7"><Canvas /></div>
          <div className="col-span-12 lg:col-span-3"><Inspector /></div>
          <div className="col-span-12"><LogPanel /></div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
