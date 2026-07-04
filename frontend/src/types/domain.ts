export type DriftState = "stable" | "aging" | "drifting";

export interface Incident {
  id: string;
  title: string;
  source: "ticket" | "chat" | "changelog" | "release";
  summary: string;
  component: string;
  createdAt: string;
}

export interface EvidenceChunk {
  incidentId: string;
  excerpt: string;
  relevance: number;
}

export interface DiagnosisResult {
  bugId: string;
  rootCause: string;
  recommendedFix: string;
  confidence: number;
  evidence: EvidenceChunk[];
}

export interface DriftResult {
  datasetName: string;
  memoryTitle: string;
  state: DriftState;
  reason: string;
  recommendForget: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "incident" | "fix" | "component";
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
