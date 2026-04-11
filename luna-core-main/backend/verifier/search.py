import asyncio
import os
import re
import httpx
from models import Claim, Evidence

WIKIPEDIA_SEARCH = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"


async def search_wikipedia(query: str, client: httpx.AsyncClient) -> dict | None:
    """Search Wikipedia for a page matching the query."""
    try:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": 3,
        }
        resp = await client.get(WIKIPEDIA_SEARCH, params=params, timeout=8.0)
        resp.raise_for_status()
        results = resp.json().get("query", {}).get("search", [])

        if not results:
            return None

        title = results[0]["title"].replace(" ", "_")
        summary = await client.get(
            WIKIPEDIA_SUMMARY.format(title=title), timeout=8.0
        )
        summary.raise_for_status()
        return summary.json()

    except Exception:
        return None


def compute_overlap(claim: str, evidence: str) -> float:
    """Token overlap between claim and evidence (0.0-1.0)."""
    claim_words = set(re.findall(r'\b\w{4,}\b', claim.lower()))
    evidence_words = set(re.findall(r'\b\w{4,}\b', evidence.lower()))
    if not claim_words:
        return 0.0
    return len(claim_words & evidence_words) / len(claim_words)


def pick_highlight(claim: str, snippet: str) -> str:
    """Find most relevant sentence in snippet."""
    claim_words = set(re.findall(r'\b\w{4,}\b', claim.lower()))
    sentences = snippet.split('. ')
    best = max(
        sentences,
        key=lambda s: len(set(re.findall(r'\b\w{4,}\b', s.lower())) & claim_words),
        default=snippet[:80],
    )
    return best[:120]


async def verify_claims(
    claims: list[Claim],
) -> tuple[list[Evidence], float, str]:
    """Returns (evidence_list, cost, reasoning_detail). Cost is 0 — Wikipedia is free!"""

    evidence_list: list[Evidence] = []
    search_log: list[str] = []

    async with httpx.AsyncClient() as client:
        # Search all claims in parallel
        tasks = [search_wikipedia(c.text, client) for c in claims]
        wiki_results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, (claim, wiki) in enumerate(zip(claims, wiki_results)):
            if isinstance(wiki, Exception) or wiki is None:
                search_log.append(f"c{i+1}: no Wikipedia result")
                continue

            snippet = wiki.get("extract", "")[:400]
            if len(snippet) < 30:
                search_log.append(f"c{i+1}: snippet too short")
                continue

            overlap = compute_overlap(claim.text, snippet)
            relevance = min(int(overlap * 150), 100)

            if relevance < 15:
                search_log.append(f"c{i+1}: low relevance ({relevance}%)")
                continue

            title = wiki.get("title", "Wikipedia")
            url = wiki.get("content_urls", {}).get(
                "desktop", {}).get("page", "https://en.wikipedia.org")

            evidence_list.append(Evidence(
                id=f"e{len(evidence_list)+1}",
                source=f"Wikipedia — {title}",
                url=url,
                snippet=snippet,
                highlight=pick_highlight(claim.text, snippet),
                relevance=relevance,
                claimId=claim.id,
            ))
            search_log.append(f"c{i+1}: found ({relevance}% relevance)")

    reasoning = (
        f"Ran parallel Wikipedia lookups for {len(claims)} claims. "
        f"Results: {'; '.join(search_log)}. "
        f"Retrieved {len(evidence_list)} evidence items total."
    )

    return evidence_list[:6], 0.0, reasoning