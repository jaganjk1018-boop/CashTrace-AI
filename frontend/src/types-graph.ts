// src/types-graph.ts

export interface GraphNode {
  id: string;
  type: "account" | "complaint";
  label: string;
  bank: string;
  risk_score?: number;
  amount_lost?: number;
  // d3 mutates these in place once the simulation runs
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  amount: number;
  txn_time: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
