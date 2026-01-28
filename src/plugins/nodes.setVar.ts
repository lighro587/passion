import type { NodeDef } from "../engine/types";

export const setVar: NodeDef = {
  type: "logic.setVar",
  title: "Set Variable",
  subtitle: "Write into runtime vars",
  inputs: [
    { id: "in", label: "In", kind: "flow" },
    { id: "value", label: "Value", kind: "data" }
  ],
  outputs: [
    { id: "out", label: "Out", kind: "flow" }
  ],
  defaultData: { key: "name" },
  validate: (data) => {
    const k = String(data.key ?? "").trim();
    return k ? null : "Key required.";
  },
  exec: async ({ data, inputs, emit, nodeId, vars }) => {
    const key = String(data.key ?? "").trim();
    const value = inputs.value ?? data.fallback ?? true;
    emit({ kind: "info", at: Date.now(), msg: `Var set: ${key}`, nodeId });
    return { varsPatch: { ...vars, [key]: value }, nextFlow: ["out"] };
  }
};
