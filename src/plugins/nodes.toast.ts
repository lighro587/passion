import type { NodeDef } from "../engine/types";

export const toast: NodeDef = {
  type: "action.toast",
  title: "Toast",
  subtitle: "Show notification",
  inputs: [
    { id: "in", label: "In", kind: "flow" },
    { id: "msg", label: "Msg", kind: "data" }
  ],
  outputs: [
    { id: "out", label: "Out", kind: "flow" }
  ],
  defaultData: { msg: "Hello from FlowForge" },
  exec: async ({ data, inputs, emit, nodeId }) => {
    const msg = String(inputs.msg ?? data.msg ?? "Toast");
    // engine emits; UI listens and renders toasts
    emit({ kind: "info", at: Date.now(), msg: `Toast: ${msg}`, nodeId });
    return { outputs: { msg }, nextFlow: ["out"] };
  }
};
