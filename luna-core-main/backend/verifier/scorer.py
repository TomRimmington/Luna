import re
from models import Claim, Evidence

CONTRADICTION_SIGNALS = [
    "not demonstrated", "no evidence", "has not been",
    "contradicts", "incorrect", "false", "disputed",
    "inaccurate", "not yet achieved", "remains unproven",
    "not confirmed", "no real-world", "never been",
]

VERIFICATION_SIGNALS = [
    "confirmed", "demonstrated", "published", "according to",
    "researchers found", "study shows", "announced", "released",
    "unveiled", "achieved", "established",
]


def score_single_claim(claim: Claim, evidence: list[Evidence]) -> tuple[str, int]:
    """Score one claim against evidence. Returns (status, confidence)."""

    # Find evidence for this claim
    relevant = [e for e in evidence if e.claimId == claim.id]
    if not relevant:
        relevant = sorted(evidence, key=lambda e: e.relevance, reverse=True)[:2]

    if not relevant:
        return "uncertain", 45

    best = relevant[0]
    all_text = " ".join(e.snippet.lower() for e in relevant[:3])

    if best.relevance < 25:
        return "uncertain", 42

    # Check for contradictions
    contradiction_hits = sum(1 for s in CONTRADICTION_SIGNALS if s in all_text)
    if contradiction_hits >= 1:
        conf = max(8, 28 - contradiction_hits * 6)
        return "contradicted", conf

    # Check for verification
    verification_hits = sum(1 for s in VERIFICATION_SIGNALS if s in all_text)
    if verification_hits >= 1 and best.relevance >= 55:
        conf = min(97, 75 + verification_hits * 5 + int(best.relevance * 0.15))
        return "verified", conf

    conf = min(72, 45 + int(best.relevance * 0.35))
    return "uncertain", conf


def compute_scores(
    claims: list[Claim],
    evidence: list[Evidence],
) -> tuple[list[Claim], int, int]:
    """Returns (scored_claims, hallucination_risk, trust_score_initial)."""

    if not claims:
        return [], 50, 50

    scored = []
    for claim in claims:
        status, confidence = score_single_claim(claim, evidence)
        scored.append(Claim(
            id=claim.id,
            text=claim.text,
            status=status,
            confidence=confidence,
            sourceSpan=claim.sourceSpan,
        ))

    # Calculate hallucination risk
    risk = 0
    for c in scored:
        if c.status == "contradicted":
            risk += 35
        elif c.status == "uncertain" and c.confidence < 55:
            risk += 15
        elif c.status == "uncertain":
            risk += 5
        elif c.status == "verified" and c.confidence > 85:
            risk -= 5

    risk = int(risk / len(scored) * 1.5)
    risk = max(5, min(95, risk))
    trust_initial = 100 - risk

    return scored, risk, trust_initial