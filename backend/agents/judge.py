import json
import re
from typing import List, Optional
from config import client, DEFAULT_JUDGE, get_cost_per_1k
from models import Claim, CriticMessage

JUDGE_PROMPT = """You are an impartial judge reviewing a fact-checking analysis of TWO AI models.

Given the critic's findings, determine:
1. needs_correction (true/false): true if any claim is "contradicted" OR more than 2 claims are "uncertain" with confidence < 60
2. correction_signal: if correction needed, write SHORT (<80 words) specific instruction on what must change
3. judge_statement: 2-3 sentence summary of your ruling

Also output your reasoning.

Respond in JSON only:
{"needs_correction": true, "correction_signal": "...", "judge_statement": "...", "reasoning": "..."}"""


async def run_judge(
    critic_feed: List[CriticMessage],
    claims: Optional[List[Claim]] = None,
    judge_model: str = DEFAULT_JUDGE,
) -> tuple:
    """Judge model decides if correction is needed"""

    critic_content = "\n".join([
        f"[{msg.role.upper()}]: {msg.content}"
        for msg in critic_feed
    ])

    claims_info = ""
    if claims:
        contradicted = [c for c in claims if c.status == "contradicted"]
        uncertain_low = [c for c in claims if c.status == "uncertain"
                        and c.confidence < 60]
        claims_info = (
            f"\nContradicted ({len(contradicted)}): "
            f"{[c.text for c in contradicted]}"
            f"\nLow-confidence uncertain ({len(uncertain_low)}): "
            f"{[c.text for c in uncertain_low]}"
        )

    response = await client.chat.completions.create(
        model=judge_model,
        max_tokens=300,
        temperature=0.2,
        messages=[
            {
                "role": "user",
                "content": (
                    f"{JUDGE_PROMPT}\n\n"
                    f"Critic exchange:\n{critic_content}"
                    f"{claims_info}\n\nYour ruling:"
                )
            }
        ],
    )

    raw = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 200
    cost = (tokens / 1000) * get_cost_per_1k(judge_model)

    try:
        cleaned = re.sub(r'^```json?\s*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        ruling = json.loads(cleaned)
    except json.JSONDecodeError:
        ruling = {
            "needs_correction": False,
            "correction_signal": "",
            "judge_statement": "Ruling unavailable.",
            "reasoning": ""
        }

    judge_reasoning = ruling.get("reasoning", "")

    ruling["judge_message"] = CriticMessage(
        id="m5",
        role="judge",
        content=ruling.get("judge_statement", "Ruling complete."),
        reasoning=judge_reasoning or None,
        timestamp="00:01.02",
    )

    reasoning = (
        f"Judge ({judge_model}) assessed both models' outputs. "
        f"Correction {'required' if ruling.get('needs_correction') else 'not required'}."
    )

    return ruling, cost, reasoning
