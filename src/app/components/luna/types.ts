export type ModelId = 'gpt-4o' | 'claude-3-5-sonnet' | 'gemini-pro' | 'llama-3-1' | 'mistral-large';

export interface Model {
  id: ModelId;
  name: string;
  provider: string;
  latency: number;
  costPer1k: number;
}

export interface Claim {
  id: string;
  text: string;
  status: 'verified' | 'uncertain' | 'contradicted';
  confidence: number;
}

export interface Evidence {
  id: string;
  source: string;
  url: string;
  snippet: string;
  highlight: string;
  relevance: number;
}

export interface CriticMessage {
  id: string;
  role: 'generator' | 'critic' | 'judge';
  content: string;
  timestamp: string;
}

export interface TrustAnalysis {
  claims: Claim[];
  evidence: Evidence[];
  criticFeed: CriticMessage[];
  revisedOutput: string;
  hallucinationRisk: number;
}

export interface RunResult {
  rawOutput: string;
  trust: TrustAnalysis;
  latency: number;
  cost: number;
}
