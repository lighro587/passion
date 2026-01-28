import React, { useEffect } from "react";
import { Layout } from "./ui/Layout";
import { useForgeStore } from "./store/useForgeStore";

export function App() {
  const boot = useForgeStore(s => s.boot);
  useEffect(() => { boot(); }, [boot]);
  return <Layout />;
}
