from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class RunRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    model_a: str = "claude-sonnet-4-6"
    model_b: str = "llama-3.3-70b-versatile"

class SourceSpan(BaseModel):
    start: int
    end: int

class Claim(BaseModel):
    id: str
    text: str
    status: Literal["verified", "uncertain", "contradicted"]
    confidence: int = Field(..., ge=0, le=100)
    sourceSpan: Optional[SourceSpan] = None
    agreedByBoth: Optional[bool] = None

class Evidence(BaseModel):
    id: str
    source: str
    url: str
    snippet: str
    highlight: str
    relevance: int = Field(..., ge=0, le=100)
    claimId: Optional[str] = None

class CriticMessage(BaseModel):
    id: str
    role: Literal["generator", "critic", "judge", "auditor"]
    content: str
    reasoning: Optional[str] = None
    timestamp: str

class ReasoningStep(BaseModel):
    id: str
    agent: Literal["generator", "extractor", "verifier",
                   "critic", "judge", "compressor", "auditor"]
    action: str
    detail: str
    timestamp: str
    status: Literal["active", "complete", "failed"]

class CompressionMetrics(BaseModel):
    originalTokens: int
    compressedTokens: int
    ratio: float
    preservedClaims: int
    totalClaims: int

class AuditFinding(BaseModel):
    id: str
    target: Literal["critic", "judge", "verifier"]
    assessment: Literal["fair", "aggressive", "lenient", "missed_source"]
    detail: str
    severity: Literal["info", "warning", "critical"]

class TrustAnalysis(BaseModel):
    claims: List[Claim]
    evidence: List[Evidence]
    criticFeed: List[CriticMessage]
    reasoningTrace: List[ReasoningStep]
    compression: Optional[CompressionMetrics] = None
    audit: Optional[List[AuditFinding]] = None
    revisedOutput: str
    hallucinationRisk: int = Field(..., ge=0, le=100)
    trustScoreInitial: int = Field(..., ge=0, le=100)
    trustScoreFinal: int = Field(..., ge=0, le=100)

class RunResult(BaseModel):
    rawOutputA: str
    rawOutputB: str
    modelA: str
    modelB: str
    judgeModel: str
    trust: TrustAnalysis
    latency: int
    cost: float