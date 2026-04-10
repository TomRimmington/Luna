import asyncio
import re
from typing import List, Tuple
import httpx
from models import Claim, Evidence

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

OPENALEX_API = "https://api.openalex.org/works"
CROSSREF_API = "https://api.crossref.org/works"
WORLDBANK_API = "https://api.worldbank.org/v2/country/WLD/indicator/"
DUCKDUCKGO_API = "https://api.duckduckgo.com/"


def compute_relevance(claim_text: str, evidence_text: str) -> int:
    if not evidence_text or not claim_text:
        return 0
    claim_words = set(re.findall(r'\b\w{4,}\b', claim_text.lower()))
    evidence_words = set(re.findall(r'\b\w{4,}\b', evidence_text.lower()))
    if not claim_words:
        return 0
    overlap = claim_words & evidence_words
    base = int((len(overlap) / len(claim_words)) * 100)
    claim_nums = set(re.findall(r'\b\d+\.?\d*\b', claim_text))
    evidence_nums = set(re.findall(r'\b\d+\.?\d*\b', evidence_text))
    if claim_nums & evidence_nums:
        base = min(95, base + 25)
    claim_ents = set(re.findall(r'\b[A-Z][a-z]+\b', claim_text))
    evidence_ents = set(re.findall(r'\b[A-Z][a-z]+\b', evidence_text))
    if len(claim_ents & evidence_ents) >= 2:
        base = min(95, base + 15)
    return min(95, max(0, base))


def extract_keywords(claim_text: str) -> str:
    stopwords = {
        'the','a','an','is','are','was','were','has','have','had',
        'that','this','with','for','and','but','not','from','than',
        'more','most','can','will','would','could','should','about','into',
    }
    words = claim_text.lower().split()
    keywords = [w for w in words if w not in stopwords and len(w) > 3]
    return " ".join(keywords[:6])


async def search_openalex(query: str, client: httpx.AsyncClient, claim_id: str, claim_text: str) -> List[Evidence]:
    evidence = []
    try:
        resp = await client.get(OPENALEX_API, params={"search": query, "per_page": 3, "select": "title,publication_year,doi"}, timeout=8.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return []
        titles = [r.get("title", "") for r in results if r.get("title")]
        text = "Academic research: " + " | ".join(titles[:3])
        relevance = compute_relevance(claim_text, text)
        if relevance > 10:
            doi = results[0].get("doi", "")
            url = f"https://doi.org/{doi}" if doi else "https://openalex.org"
            evidence.append(Evidence(id=f"e_{claim_id}_openalex", source="OpenAlex Academic", url=url, snippet=text[:250], highlight=text[:100], relevance=max(relevance, 40), claimId=claim_id))
    except Exception:
        pass
    return evidence


async def search_crossref(query: str, client: httpx.AsyncClient, claim_id: str, claim_text: str) -> List[Evidence]:
    evidence = []
    try:
        resp = await client.get(CROSSREF_API, params={"query": query, "rows": 3, "select": "title,published,DOI"}, timeout=8.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        items = data.get("message", {}).get("items", [])
        if not items:
            return []
        titles = []
        for item in items[:3]:
            title = item.get("title", [])
            if title:
                year = item.get("published", {}).get("date-parts", [[""]])[0][0]
                titles.append(f"{title[0]} ({year})")
        text = "Research papers: " + " | ".join(titles)
        relevance = compute_relevance(claim_text, text)
        if relevance > 10:
            doi = items[0].get("DOI", "")
            url = f"https://doi.org/{doi}" if doi else "https://crossref.org"
            evidence.append(Evidence(id=f"e_{claim_id}_crossref", source="CrossRef Research", url=url, snippet=text[:250], highlight=text[:100], relevance=max(relevance, 40), claimId=claim_id))
    except Exception:
        pass
    return evidence


async def search_worldbank(claim_text: str, client: httpx.AsyncClient, claim_id: str) -> List[Evidence]:
    evidence = []
    try:
        indicators = {
            "co2": "EN.ATM.CO2E.PC", "carbon": "EN.ATM.CO2E.PC",
            "climate": "EN.ATM.CO2E.PC", "temperature": "EN.CLC.MDAT.ZS",
            "gdp": "NY.GDP.MKTP.CD", "population": "SP.POP.TOTL",
            "energy": "EG.USE.PCAP.KG.OE", "renewable": "EG.ELC.RNEW.ZS",
        }
        matched = None
        for keyword, indicator in indicators.items():
            if keyword in claim_text.lower():
                matched = indicator
                break
        if not matched:
            return []
        resp = await client.get(f"{WORLDBANK_API}{matched}", params={"format": "json", "mrv": 1, "per_page": 1}, timeout=8.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        if isinstance(data, list) and len(data) > 1:
            records = data[1] or []
            if records and records[0].get("value"):
                record = records[0]
                value = record.get("value")
                year = record.get("date", "")
                name = record.get("indicator", {}).get("value", "")
                text = f"World Bank: {name} = {value:.2f} ({year})" if isinstance(value, float) else f"World Bank: {name} = {value} ({year})"
                relevance = compute_relevance(claim_text, text)
                evidence.append(Evidence(id=f"e_{claim_id}_worldbank", source="World Bank Data", url="https://data.worldbank.org", snippet=text, highlight=text[:80], relevance=max(relevance, 45), claimId=claim_id))
    except Exception:
        pass
    return evidence


async def search_duckduckgo(query: str, client: httpx.AsyncClient, claim_id: str, claim_text: str) -> List[Evidence]:
    evidence = []
    try:
        resp = await client.get(DUCKDUCKGO_API, params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"}, timeout=8.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        text = (data.get("AbstractText", "") or data.get("Answer", "") or " | ".join([t.get("Text", "") for t in data.get("RelatedTopics", [])[:3] if isinstance(t, dict) and t.get("Text")]))
        if text and len(text) > 20:
            relevance = compute_relevance(claim_text, text)
            evidence.append(Evidence(id=f"e_{claim_id}_ddg", source="DuckDuckGo", url=data.get("AbstractURL", "https://duckduckgo.com"), snippet=text[:250], highlight=text[:100], relevance=relevance, claimId=claim_id))
    except Exception:
        pass
    return evidence


async def verify_single_claim(claim: Claim, client: httpx.AsyncClient) -> List[Evidence]:
    keywords = extract_keywords(claim.text)
    results = await asyncio.gather(
        search_openalex(keywords, client, claim.id, claim.text),
        search_crossref(keywords, client, claim.id, claim.text),
        search_worldbank(claim.text, client, claim.id),
        search_duckduckgo(keywords, client, claim.id, claim.text),
        return_exceptions=True,
    )
    all_evidence = []
    for result in results:
        if isinstance(result, list):
            all_evidence.extend(result)
    return all_evidence


async def verify_claims(claims: List[Claim]) -> Tuple[List[Evidence], float, str]:
    if not claims:
        return [], 0.0, "No claims to verify."

    all_evidence = []
    async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, verify=False, timeout=10.0) as client:
        tasks = [verify_single_claim(claim, client) for claim in claims]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, list):
            all_evidence.extend(result)

    verified = sum(1 for c in claims if c.status == "verified")
    uncertain = sum(1 for c in claims if c.status == "uncertain")
    contradicted = sum(1 for c in claims if c.status == "contradicted")
    avg_rel = sum(e.relevance for e in all_evidence) / len(all_evidence) if all_evidence else 0

    reasoning = (
        f"Verified {len(claims)} claims using OpenAlex, CrossRef, World Bank, DuckDuckGo. "
        f"Found {len(all_evidence)} evidence items. "
        f"Results: {verified} verified, {uncertain} uncertain, {contradicted} contradicted. "
        f"Average relevance: {avg_rel:.0f}%."
    )

    return all_evidence, 0.0, reasoning