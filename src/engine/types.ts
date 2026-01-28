export type PortKind = "flow" | "data";

export type PortDef = {
  id: string;
  label: string;
  kind: PortKind;
  // direction inferred by whether it's in inputs or outputs
};

export type NodeDef = {
  type: string;
  title: string;
  subtitle?: string;
  inputs: PortDef[];
  outputs: PortDef[];
  defaultData?: Record<string, unknown>;
  // optional: fast validation
  validate?: (data: Record<string, unknown>) => string | null;
  // execution: given inputs + node data, produce outputs (data) and next flow port(s)
  exec: (ctx: ExecCtx) => Promise<ExecResult> | ExecResult;
};

export type ExecCtx = {
  nodeId: string;
  nodeType: string;
  data: Record<string, unknown>;
  inputs: Record<string, unknown>; // data ports only
  vars: Record<string, unknown>;
  emit: (e: RuntimeEvent) => void;
  sleep: (ms: number) => Promise<void>;
};

export type ExecResult = {
  outputs?: Record<string, unknown>;
  varsPatch?: Record<string, unknown>;
  nextFlow?: string[]; // output port ids to follow (flow kind)
};

export type RuntimeEvent =
  | { kind: "info"; at: number; msg: string; nodeId?: string }
  | { kind: "warn"; at: number; msg: string; nodeId?: string }
  | { kind: "step"; at: number; nodeId: string; nodeType: string; title: string }
  | { kind: "error"; at: number; msg: string; nodeId?: string };
