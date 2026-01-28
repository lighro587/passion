export type XY = { x: number; y: number };

export type Node = {
  id: string;
  type: string;
  pos: XY;
  data: Record<string, unknown>;
};

export type Edge = {
  id: string;
  from: { nodeId: string; portId: string }; // output port
  to: { nodeId: string; portId: string };   // input port
};

export type Graph = {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
};
