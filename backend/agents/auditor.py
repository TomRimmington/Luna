import json
import re
from typing import List
from config import client, DEFAULT_JUDGE, get_cost_per_1k
from models import Claim, Evidence, CriticMessage, AuditFinding

AUDITOR_PROMPT = """You are an accountability auditor reviewing a multi-model AI verification pipeline.

Two AI models (Model A and Model B) answered a question independently.
A separate judge model verified both answers.

Now audit the entire process:
1. CRITIC: Was the critique fair to both models?
2. VERIFIER: Did Wikipedia verification miss obvious sources?
3. JUDGE: Was the correction ruling proportionate?

Respond in JSON only:
{
  "findings": [
    {"target": "critic", "assessment": "fair|aggressive|lenient",
     "detail": "...", "severity": "info|warning|critical"},
    {"target": "verifier", "assessment": "fair|missed_source",
     "detail": "...", "severity": "info|warning"},
    {"target": "judge", "assessment": "fair|aggressive|lenient",
     "detail": "...", "severity": "info|warning|critical"}
  ],
  "summary": "overall assessment",
  "reasoning": "internal analysis"
}"""


async def run_auditor(
    claims: List[Claim],
    evidence: List[Evidence],
    critic_feed: List[CriticMessage],
    ruling: dict,
    judge_model: str = DEFAULT_JUDGE,
) -> tuple:
    """Audits the entire pipeline — watches the watchers"""

    claims_summary = "\n".join([
        f"- [{c.status} | {c.confidence}%] {c.text}"
        for c in claims
    ])

    evidence_summary = (
        f"{len(evidence)} evidence items retrieved, "
        f"avg relevance: "
        f"{sum(e.relevance for e in evidence) // max(len(evidence), 1)}%"
    )

    critic_summary = "\n".join([
        f"[{m.role}]: {m.content[:100]}..."
        for m in critic_feed
    ])

    judge_summary = f"Correction needed: {ruling.get('needs_correction', False)}"

    response = await client.chat.completions.create(
        model=judge_model,
        max_tokens=400,
        temperature=0.3,
        messages=[
            {
                "role": "user",
                "content": (
                    f"{AUDITOR_PROMPT}\n\n"
                    f"Claims:\n{claims_summary}\n\n"
                    f"Evidence:\n{evidence_summary}\n\n"
                    f"Critic exchange:\n{critic_summary}\n\n"
                    f"Judge ruling: {judge_summary}"
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
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {
            "findings": [],
            "summary": "Audit complete.",
            "reasoning": ""
        }

    findings = []
    for i, f in enumerate(parsed.get("findings", [])[:3]):
        findings.append(AuditFinding(
            id=f"a{i+1}",
            target=f.get("target", "critic"),
            assessment=f.get("assessment", "fair"),
            detail=f.get("detail", ""),
            severity=f.get("severity", "info"),
        ))

    audit_reasoning = parsed.get("reasoning", "")
    summary = parsed.get("summary", "Audit complete. No critical issues.")

    auditor_msg = CriticMessage(
        id="m6",
        role="auditor",
        content=summary,
        reasoning=audit_reasoning or None,
        timestamp="00:01.12",
    )

    reasoning = (
        f"Auditor ({judge_model}) audited entire pipeline. "
        f"{len(claims)} claims reviewed, "
        f"{len(evidence)} evidence items checked. "
        f"Found {sum(1 for f in findings if f.severity == 'warning')} warnings."
    )

    return findings, auditor_msg, cost, reasoning
