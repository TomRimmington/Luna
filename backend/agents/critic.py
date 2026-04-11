import json
import re
from typing import List
from config import client, DEFAULT_JUDGE, get_cost_per_1k
from models import Claim, Evidence, CriticMessage

CRITIC_PROMPT = """You are a skeptical fact-checker reviewing TWO AI responses to the same question.

Model A and Model B both answered independently. Your job:
1. Find claims that BOTH models agree on — these are likely true
2. Find claims where they DISAGREE — these need verification
3. Find claims that Wikipedia evidence CONTRADICTS — these are wrong

Be precise. Quote specific problematic claims.

Respond in JSON only:
{"critique": "your analysis as a string", "reasoning": "your internal thinking as a string"}"""


async def run_critic(
    combined_output: str,
    claims: List[Claim],
    evidence: List[Evidence],
    judge_model: str = DEFAULT_JUDGE,
) -> tuple:
    """Judge model critiques both Model A and Model B answers"""

    claims_summary = "\n".join([
        f"- [{c.status.upper()} | {c.confidence}%] {c.text}"
        for c in claims
    ])

    evidence_summary = "\n".join([
        f"- [{e.source}] {e.snippet[:150]}..."
        for e in evidence[:4]
    ])

    gen_msg = CriticMessage(
        id="m1",
        role="generator",
        content=f"Two models answered. Analyzing {len(claims)} claims...",
        timestamp="00:00.12",
    )

    response = await client.chat.completions.create(
        model=judge_model,
        max_tokens=500,
        temperature=0.3,
        messages=[
            {
                "role": "user",
                "content": (
                    f"{CRITIC_PROMPT}\n\n"
                    f"Both answers:\n{combined_output[:800]}\n\n"
                    f"Claims found:\n{claims_summary}\n\n"
                    f"Evidence:\n{evidence_summary}"
                )
            }
        ],
    )

    raw_text = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 300
    cost = (tokens / 1000) * get_cost_per_1k(judge_model)

    try:
        cleaned = re.sub(r'^```json?\s*\n?', '', raw_text.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        parsed = json.loads(cleaned)
        critique_text = parsed.get("critique", raw_text)
        critic_reasoning = parsed.get("reasoning", "")
    except json.JSONDecodeError:
        critique_text = raw_text
        critic_reasoning = ""

    if isinstance(critique_text, dict):
        critique_text = critique_text.get("critique", str(critique_text))
    elif not isinstance(critique_text, str):
        critique_text = str(critique_text)

    if isinstance(critic_reasoning, dict):
        critic_reasoning = str(critic_reasoning)
    elif not isinstance(critic_reasoning, str):
        critic_reasoning = str(critic_reasoning)

    critic_msg = CriticMessage(
        id="m2",
        role="critic",
        content=critique_text,
        reasoning=critic_reasoning or None,
        timestamp="00:00.31",
    )

    has_issues = any(
        c.status in ["uncertain", "contradicted"] for c in claims
    )

    gen_ack = CriticMessage(
        id="m3",
        role="generator",
        content="Acknowledged. Flagged claims require correction."
        if has_issues else
        "Both models claims are supported by evidence.",
        timestamp="00:00.44",
    )

    reasoning = (
        f"Judge ({judge_model}) cross-referenced {len(claims)} claims "
        f"from both Model A and B against {len(evidence)} evidence sources. "
        f"Found {sum(1 for c in claims if c.status == 'contradicted')} "
        f"contradicted, "
        f"{sum(1 for c in claims if c.status == 'uncertain')} uncertain."
    )

    return [gen_msg, critic_msg, gen_ack], cost, reasoning
