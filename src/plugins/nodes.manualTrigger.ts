import type { NodeDef } from "../engine/types";

export const manualTrigger: NodeDef = {
  type: "trigger.manual",
  title: "Manual Trigger",
  subtitle: "Start the flow",
  inputs: [],
  outputs: [
    { id: "go", label: "Go", kind: "flow" }
  ],
  defaultData: {},
  exec: async ({ emit, nodeId }) => {
    emit({ kind: "info", at: Date.now(), msg: "Triggered.", nodeId });
    return { nextFlow: ["go"] };
  }
};
