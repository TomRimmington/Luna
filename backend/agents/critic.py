import json
import re
from typing import List, Optional
from config import client, DEFAULT_JUDGE, get_cost_per_1k
from models import Claim, Evidence, CriticMessage

CRITIC_AND_JUDGE_PROMPT = """You are a skeptical fact-checker AND impartial judge reviewing TWO AI responses to the same question.

Model A and Model B both answered independently. Do TWO things in ONE response:

PART 1 — CRITIQUE:
1. Find claims that BOTH models agree on — these are likely true
2. Find claims where they DISAGREE — these need verification
3. Find claims that evidence CONTRADICTS — these are wrong
Be precise. Quote specific problematic claims.

PART 2 — RULING:
Based on your critique, determine:
- needs_correction (true/false): true if any claim is "contradicted" OR more than 2 claims are "uncertain" with confidence < 60
- correction_signal: if correction needed, write SHORT (<80 words) specific instruction on what must change
- judge_statement: 2-3 sentence summary of your ruling

Respond in JSON only:
{
  "critique": "your analysis as a string",
  "critique_reasoning": "your internal thinking for the critique",
  "needs_correction": true,
  "correction_signal": "...",
  "judge_statement": "...",
  "judge_reasoning": "your internal thinking for the ruling"
}"""


async def run_critic_and_judge(
    combined_output: str,
    claims: List[Claim],
    evidence: List[Evidence],
    judge_model: str = DEFAULT_JUDGE,
) -> tuple:
    """Single LLM call that critiques both answers AND issues a ruling."""

    claims_summary = "\n".join([
        f"- [{c.status.upper()} | {c.confidence}%] {c.text}"
        for c in claims
    ])

    evidence_summary = "\n".join([
        f"- [{e.source}] {e.snippet[:150]}..."
        for e in evidence[:4]
    ])

    contradicted = [c for c in claims if c.status == "contradicted"]
    uncertain_low = [c for c in claims if c.status == "uncertain" and c.confidence < 60]
    claims_info = (
        f"\nContradicted ({len(contradicted)}): "
        f"{[c.text for c in contradicted]}"
        f"\nLow-confidence uncertain ({len(uncertain_low)}): "
        f"{[c.text for c in uncertain_low]}"
    )

    response = await client.chat.completions.create(
        model=judge_model,
        max_tokens=700,
        temperature=0.3,
        timeout=30,
        messages=[
            {
                "role": "user",
                "content": (
                    f"{CRITIC_AND_JUDGE_PROMPT}\n\n"
                    f"Both answers:\n{combined_output[:800]}\n\n"
                    f"Claims found:\n{claims_summary}\n\n"
                    f"Evidence:\n{evidence_summary}"
                    f"{claims_info}"
                )
            }
        ],
    )

    raw_text = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 500
    cost = (tokens / 1000) * get_cost_per_1k(judge_model)

    try:
        cleaned = re.sub(r'^```json?\s*\n?', '', raw_text.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {}

    # --- Build critic feed ---
    critique_text = parsed.get("critique", raw_text)
    critic_reasoning = parsed.get("critique_reasoning", "")

    if isinstance(critique_text, dict):
        critique_text = str(critique_text)
    if isinstance(critic_reasoning, dict):
        critic_reasoning = str(critic_reasoning)

    gen_msg = CriticMessage(
        id="m1", role="generator",
        content=f"Two models answered. Analyzing {len(claims)} claims...",
        timestamp="00:00.12",
    )
    critic_msg = CriticMessage(
        id="m2", role="critic",
        content=str(critique_text),
        reasoning=str(critic_reasoning) or None,
        timestamp="00:00.31",
    )

    has_issues = any(c.status in ["uncertain", "contradicted"] for c in claims)
    gen_ack = CriticMessage(
        id="m3", role="generator",
        content="Acknowledged. Flagged claims require correction." if has_issues
        else "Both models claims are supported by evidence.",
        timestamp="00:00.44",
    )

    critic_feed = [gen_msg, critic_msg, gen_ack]

    # --- Build ruling ---
    ruling = {
        "needs_correction": parsed.get("needs_correction", False),
        "correction_signal": parsed.get("correction_signal", ""),
        "judge_statement": parsed.get("judge_statement", "Ruling complete."),
    }

    judge_msg = CriticMessage(
        id="m5", role="judge",
        content=ruling["judge_statement"],
        reasoning=str(parsed.get("judge_reasoning", "")) or None,
        timestamp="00:01.02",
    )
    ruling["judge_message"] = judge_msg

    critic_reasoning_summary = (
        f"Judge ({judge_model}) critiqued and ruled on {len(claims)} claims "
        f"from both Model A and B against {len(evidence)} evidence sources. "
        f"Found {len(contradicted)} contradicted, "
        f"{sum(1 for c in claims if c.status == 'uncertain')} uncertain. "
        f"Correction {'required' if ruling['needs_correction'] else 'not required'}."
    )

    return critic_feed, ruling, cost, critic_reasoning_summary
