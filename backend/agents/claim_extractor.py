import json
import re
from typing import Optional
from config import client, DEFAULT_JUDGE, get_cost_per_1k
from models import Claim, SourceSpan

EXTRACTION_PROMPT = """Extract all verifiable factual claims from the text below.

A "claim" is a specific, atomic statement that can be checked as true or false.
It must contain a concrete fact: a number, date, named entity, or measurement.

Output a JSON array. Each object must have:
- "text": the claim as a standalone sentence
- "checkworthy": true if important enough to verify

Extract 4-8 claims. Respond with ONLY a JSON array:
[{"text": "...", "checkworthy": true}, ...]"""


def find_source_span(claim_text: str, raw_output: str) -> Optional[SourceSpan]:
    raw_lower = raw_output.lower()
    claim_lower = claim_text.lower()
    idx = raw_lower.find(claim_lower)
    if idx >= 0:
        return SourceSpan(start=idx, end=idx + len(claim_text))
    return None


async def extract_claims(raw_output: str, judge_model: str = DEFAULT_JUDGE) -> tuple:
    response = await client.chat.completions.create(
        model=judge_model,
        max_tokens=800,
        temperature=0.1,
        messages=[
            {
                "role": "user",
                "content": f"{EXTRACTION_PROMPT}\n\nExtract claims from:\n\n{raw_output}"
            }
        ],
    )

    raw = response.choices[0].message.content or "[]"
    tokens = response.usage.total_tokens if response.usage else 300
    cost = (tokens / 1000) * get_cost_per_1k(judge_model)

    try:
        cleaned = re.sub(r'^```json?\s*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            items = list(parsed.values())[0] if parsed else []
        else:
            items = parsed
    except (json.JSONDecodeError, KeyError):
        items = []

    claims = []
    for i, item in enumerate(items[:8]):
        if not item.get("checkworthy", True):
            continue
        span = find_source_span(item.get("text", ""), raw_output)
        claims.append(Claim(
            id=f"c{i+1}",
            text=item.get("text", ""),
            status="uncertain",
            confidence=50,
            sourceSpan=span,
        ))

    reasoning = (
        f"Extracted {len(claims)} claims from combined output "
        f"using {judge_model}."
    )

    return claims, cost, reasoning
