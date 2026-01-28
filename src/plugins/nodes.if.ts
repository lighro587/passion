import type { NodeDef } from "../engine/types";

export const ifNode: NodeDef = {
  type: "logic.if",
  title: "If",
  subtitle: "Branch by boolean",
  inputs: [
    { id: "in", label: "In", kind: "flow" },
    { id: "cond", label: "Cond", kind: "data" }
  ],
  outputs: [
    { id: "t", label: "True", kind: "flow" },
    { id: "f", label: "False", kind: "flow" }
  ],
  defaultData: {},
  exec: async ({ inputs, emit, nodeId }) => {
    const c = Boolean(inputs.cond);
    emit({ kind: "info", at: Date.now(), msg: `If = ${c}`, nodeId });
    return { nextFlow: [c ? "t" : "f"] };
  }
};
