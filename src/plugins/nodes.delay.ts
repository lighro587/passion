import type { NodeDef } from "../engine/types";

export const delay: NodeDef = {
  type: "timing.delay",
  title: "Delay",
  subtitle: "Sleep and continue",
  inputs: [
    { id: "in", label: "In", kind: "flow" },
    { id: "ms", label: "Ms", kind: "data" }
  ],
  outputs: [
    { id: "out", label: "Out", kind: "flow" }
  ],
  defaultData: { ms: 500 },
  exec: async ({ data, inputs, sleep, emit, nodeId }) => {
    const ms = Math.max(0, Number(inputs.ms ?? data.ms ?? 0));
    emit({ kind: "info", at: Date.now(), msg: `Delay ${ms}ms`, nodeId });
    await sleep(ms);
    return { nextFlow: ["out"] };
  }
};
