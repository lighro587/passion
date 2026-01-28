import type { RuntimeEvent } from "./types";

export type Runtime = {
  vars: Record<string, unknown>;
  events: RuntimeEvent[];
  emit: (e: RuntimeEvent) => void;
};

export function createRuntime(): Runtime {
  const rt: Runtime = {
    vars: {},
    events: [],
    emit: (e) => rt.events.push(e)
  };
  return rt;
}
