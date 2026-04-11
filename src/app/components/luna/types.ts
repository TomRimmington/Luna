// ── Model Selection ──────────────────────────────────────────────
// OpenRouter model IDs — provider/model-name format
export type ModelId = string;

export interface Model {
  id: ModelId;
  name: string;
  provider: string;
  costPer1k: number;
}

// ── Pipeline Stages ──────────────────────────────────────────────
export type PipelineStage =
  | 'idle'
  | 'generating'
  | 'extracting'
  | 'verifying'
  | 'critiquing'
  | 'judging'
  | 'correcting'
  | 'compressing'
  | 'auditing'
  | 'complete';

// ── Reasoning Trace ──────────────────────────────────────────────
export interface ReasoningStep {
  id: string;
  agent: 'generator' | 'extractor' | 'verifier' | 'critic' | 'judge' | 'compressor' | 'auditor';
  action: string;
  detail: string;
  timestamp: string;
  status: 'active' | 'complete' | 'failed';
}

// ── Claims ───────────────────────────────────────────────────────
export interface Claim {
  id: string;
  text: string;
  status: 'verified' | 'uncertain' | 'contradicted';
  confidence: number;
  sourceSpan?: { start: number; end: number };
}

// ── Evidence ─────────────────────────────────────────────────────
export interface Evidence {
  id: string;
  source: string;
  url: string;
  snippet: string;
  highlight: string;
  relevance: number;
  claimId?: string;
}

// ── Critic Feed ──────────────────────────────────────────────────
export type AgentRole = 'generator' | 'critic' | 'judge' | 'auditor';

export interface CriticMessage {
  id: string;
  role: AgentRole;
  content: string;
  reasoning?: string;
  timestamp: string;
}

// ── Context Compression ──────────────────────────────────────────
export interface CompressionMetrics {
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  preservedClaims: number;
  totalClaims: number;
}

// ── Auditor / Accountability Layer ───────────────────────────────
export interface AuditFinding {
  id: string;
  target: 'critic' | 'judge' | 'verifier';
  assessment: 'fair' | 'aggressive' | 'lenient' | 'missed_source';
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

// ── Trust Analysis ───────────────────────────────────────────────
export interface TrustAnalysis {
  claims: Claim[];
  evidence: Evidence[];
  criticFeed: CriticMessage[];
  reasoningTrace: ReasoningStep[];
  compression?: CompressionMetrics;
  audit?: AuditFinding[];
  revisedOutput: string;
  hallucinationRisk: number;
  trustScoreInitial: number;
  trustScoreFinal: number;
}

// ── Top-Level Result ─────────────────────────────────────────────
export interface RunResult {
  rawOutput: string;
  trust: TrustAnalysis;
  latency: number;
  cost: number;
}
