import asyncio
import time
from typing import Optional
from models import (
    RunResult, TrustAnalysis, ReasoningStep,
    Claim, Evidence, CriticMessage, AuditFinding,
)
from agents.generator import generate_response
from agents.claim_extractor import extract_claims
from agents.critic import run_critic_and_judge
from agents.compressor import compress_context
from agents.auditor import run_auditor
from verifier.search import verify_claims
from verifier.scorer import compute_scores
from config import DEFAULT_JUDGE


async def run_pipeline(
    prompt: str,
    model_a: str,
    model_b: str,
    judge_model: str = DEFAULT_JUDGE,
    web_search: bool = True,
) -> RunResult:
    """
    Runs 2 user-selected models in parallel.
    A user-selected judge model evaluates both answers.
    """
    total_cost = 0.0
    reasoning_trace = []
    pipeline_start = time.time()

    def elapsed():
        s = time.time() - pipeline_start
        return f"{int(s // 60):02d}:{s % 60:05.2f}"

    # Step 1: Run Model A and Model B in PARALLEL
    (output_a, cost_a, _), (output_b, cost_b, _) = await asyncio.gather(
        generate_response(prompt, model_a),
        generate_response(prompt, model_b),
    )
    total_cost += cost_a + cost_b

    reasoning_trace.append(ReasoningStep(
        id="r1", agent="generator",
        action=f"Both models answered — {model_a} and {model_b}",
        detail=(
            f"Model A ({model_a}): {len(output_a.split())} words. "
            f"Model B ({model_b}): {len(output_b.split())} words. "
            f"Running in parallel for speed."
        ),
        timestamp=elapsed(), status="complete",
    ))

    # Step 2: Combine both answers for judge
    combined_output = (
        f"=== Model A ({model_a}) answer ===\n{output_a}\n\n"
        f"=== Model B ({model_b}) answer ===\n{output_b}"
    )

    # Step 3: Extract claims from BOTH answers
    claims, extract_cost, extract_reasoning = await extract_claims(
        combined_output, judge_model=judge_model
    )
    total_cost += extract_cost
    reasoning_trace.append(ReasoningStep(
        id="r2", agent="extractor",
        action=f"Extracted {len(claims)} claims from both answers",
        detail=extract_reasoning,
        timestamp=elapsed(), status="complete",
    ))

    # Step 4: Verify claims against external sources
    evidence, verify_cost, verify_reasoning = await verify_claims(claims, web_search=web_search)
    total_cost += verify_cost
    reasoning_trace.append(ReasoningStep(
        id="r3", agent="verifier",
        action=f"Retrieved {len(evidence)} evidence items",
        detail=verify_reasoning,
        timestamp=elapsed(), status="complete",
    ))

    # Step 5: Score claims
    scored_claims, hallucination_risk, trust_initial = compute_scores(
        claims, evidence
    )

    # Step 6+7: Critique + Judge ruling in a single LLM call
    critic_feed, ruling, cj_cost, cj_reasoning = await run_critic_and_judge(
        combined_output, scored_claims, evidence, judge_model=judge_model
    )
    total_cost += cj_cost
    reasoning_trace.append(ReasoningStep(
        id="r4", agent="critic",
        action=f"Judge ({judge_model}) evaluated both answers",
        detail=cj_reasoning,
        timestamp=elapsed(), status="complete",
    ))
    reasoning_trace.append(ReasoningStep(
        id="r5", agent="judge",
        action="Correction ruling issued",
        detail=f"Correction {'required' if ruling.get('needs_correction') else 'not required'}.",
        timestamp=elapsed(), status="complete",
    ))

    if "judge_message" in ruling:
        critic_feed.append(ruling["judge_message"])

    # Step 8: Correction if needed
    revised_output = output_a
    if ruling.get("needs_correction", False):
        revised_output, rev_cost, _ = await generate_response(
            prompt,
            model_a,
            correction_signal=ruling.get("correction_signal", ""),
            original_output=output_a,
        )
        total_cost += rev_cost

    # Step 9: Compress
    compression, comp_reasoning = compress_context(
        combined_output, scored_claims, evidence, critic_feed
    )
    reasoning_trace.append(ReasoningStep(
        id="r6", agent="compressor",
        action="Context compressed",
        detail=comp_reasoning,
        timestamp=elapsed(), status="complete",
    ))

    # Step 10: Audit
    audit_findings, auditor_msg, audit_cost, audit_reasoning = await run_auditor(
        scored_claims, evidence, critic_feed, ruling, judge_model=judge_model,
    )
    total_cost += audit_cost
    critic_feed.append(auditor_msg)
    reasoning_trace.append(ReasoningStep(
        id="r7", agent="auditor",
        action="Pipeline audit complete",
        detail=audit_reasoning,
        timestamp=elapsed(), status="complete",
    ))

    trust_final = compute_final_trust(
        scored_claims, ruling.get("needs_correction", False)
    )

    return RunResult(
        rawOutputA=output_a,
        rawOutputB=output_b,
        modelA=model_a,
        modelB=model_b,
        judgeModel=judge_model,
        trust=TrustAnalysis(
            claims=scored_claims,
            evidence=evidence,
            criticFeed=critic_feed,
            reasoningTrace=reasoning_trace,
            compression=compression,
            audit=audit_findings,
            revisedOutput=revised_output,
            hallucinationRisk=hallucination_risk,
            trustScoreInitial=trust_initial,
            trustScoreFinal=trust_final,
        ),
        latency=0,
        cost=round(total_cost, 6),
    )

def compute_final_trust(claims: list, was_corrected: bool) -> int:
    if not claims:
        return 65

    total = len(claims)
    weighted_sum = 0
    for c in claims:
        if c.status == "verified":
            weighted_sum += min(c.confidence + 15, 100)
        elif c.status == "uncertain":
            weighted_sum += c.confidence
        elif c.status == "contradicted":
            weighted_sum += max(c.confidence - 20, 5)

    base = int(weighted_sum / total)

    if was_corrected:
        base = min(98, base + 12)

    return max(40, min(95, base))
