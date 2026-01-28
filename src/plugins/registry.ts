import type { NodeDef } from "../engine/types";
import { manualTrigger } from "./nodes.manualTrigger";
import { setVar } from "./nodes.setVar";
import { ifNode } from "./nodes.if";
import { delay } from "./nodes.delay";
import { toast } from "./nodes.toast";

export const REGISTRY: Record<string, NodeDef> = {
  [manualTrigger.type]: manualTrigger,
  [setVar.type]: setVar,
  [ifNode.type]: ifNode,
  [delay.type]: delay,
  [toast.type]: toast
};

export const PALETTE = [
  { type: manualTrigger.type, group: "Triggers" },
  { type: setVar.type, group: "Logic" },
  { type: ifNode.type, group: "Logic" },
  { type: delay.type, group: "Timing" },
  { type: toast.type, group: "Actions" }
];
