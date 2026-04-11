import asyncio
import re
from typing import List, Tuple
from concurrent.futures import ProcessPoolExecutor
from functools import partial
import httpx
from bs4 import BeautifulSoup
from models import Claim, Evidence

_process_pool = ProcessPoolExecutor(max_workers=2)

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json",
}

OPENALEX_API = "https://api.openalex.org/works"
CROSSREF_API = "https://api.crossref.org/works"
WORLDBANK_API = "https://api.worldbank.org/v2/country/WLD/indicator/"

MAX_SCRAPE_URLS = 2
SCRAPE_TIMEOUT = 5.0
SEARCH_TIMEOUT = 8.0


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


# ── Live Web Search via DuckDuckGo ──────────────────────────────

def _ddg_search_sync(query: str, max_results: int = 3, time_filter: str = 'm') -> list[dict]:
    """
    Synchronous DDG search with time filter.
    time_filter: 'd', 'w', 'm', 'y' or None for no filter.
    """
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            # Pass the 'time' parameter if provided
            return list(ddgs.text(query, max_results=max_results, time=time_filter))
    except Exception:
        return []


async def search_web(query: str, claim_id: str, claim_text: str) -> Tuple[List[Evidence], List[str]]:
    """
    Real web search via DuckDuckGo. Returns evidence from snippets
    and a list of URLs for optional deeper scraping.
    """
    loop = asyncio.get_event_loop()
    try:
        results = await asyncio.wait_for(
            loop.run_in_executor(_process_pool, partial(_ddg_search_sync, query, 3, 'm')),
            timeout=SEARCH_TIMEOUT,
        )
    except (asyncio.TimeoutError, Exception):
        results = []

    evidence = []
    urls_to_scrape = []

    for i, r in enumerate(results):
        title = r.get("title", "")
        body = r.get("body", "")
        href = r.get("href", "")
        snippet = f"{title}. {body}".strip()

        if not snippet or len(snippet) < 15:
            continue

        relevance = compute_relevance(claim_text, snippet)
        evidence.append(Evidence(
            id=f"e_{claim_id}_web{i}",
            source=title[:60] or "Web Search",
            url=href or "https://duckduckgo.com",
            snippet=snippet[:300],
            highlight=snippet[:120],
            relevance=max(relevance, 35),
            claimId=claim_id,
        ))

        if href and i < MAX_SCRAPE_URLS:
            urls_to_scrape.append(href)

    return evidence, urls_to_scrape


# ── Page Scraping with BeautifulSoup ─────────────────────────────

async def scrape_page(
    url: str, client: httpx.AsyncClient, claim_id: str, claim_text: str, idx: int
) -> List[Evidence]:
    """Fetch a page and extract paragraph text with BeautifulSoup."""
    try:
        resp = await client.get(url, timeout=SCRAPE_TIMEOUT, follow_redirects=True)
        if resp.status_code != 200:
            return []

        content_type = resp.headers.get("content-type", "")
        if "text/html" not in content_type:
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            tag.decompose()

        paragraphs = soup.find_all("p")
        text_chunks = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40]
        page_text = " ".join(text_chunks[:15])

        if len(page_text) < 50:
            return []

        page_text = page_text[:500]
        relevance = compute_relevance(claim_text, page_text)

        if relevance < 15:
            return []

        domain = url.split("/")[2] if len(url.split("/")) > 2 else url
        return [Evidence(
            id=f"e_{claim_id}_scrape{idx}",
            source=f"Scraped: {domain}",
            url=url,
            snippet=page_text[:300],
            highlight=page_text[:120],
            relevance=max(relevance, 40),
            claimId=claim_id,
        )]
    except Exception:
        return []


# ── Existing API Sources ─────────────────────────────────────────

async def search_openalex(query: str, client: httpx.AsyncClient, claim_id: str, claim_text: str) -> List[Evidence]:
    evidence = []
    try:
        resp = await client.get(OPENALEX_API, params={"search": query, "per_page": 3, "select": "title,publication_year,doi"}, timeout=SEARCH_TIMEOUT)
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
        resp = await client.get(CROSSREF_API, params={"query": query, "rows": 3, "select": "title,published,DOI"}, timeout=SEARCH_TIMEOUT)
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
        resp = await client.get(f"{WORLDBANK_API}{matched}", params={"format": "json", "mrv": 1, "per_page": 1}, timeout=SEARCH_TIMEOUT)
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


# ── Pipeline Entry Points ────────────────────────────────────────

MAX_WEB_SEARCH_CLAIMS = 3


async def verify_single_claim(
    claim: Claim, client: httpx.AsyncClient, use_web_search: bool = True,
) -> List[Evidence]:
    keywords = extract_keywords(claim.text)

    tasks: list = [
        search_openalex(keywords, client, claim.id, claim.text),
        search_crossref(keywords, client, claim.id, claim.text),
        search_worldbank(claim.text, client, claim.id),
    ]
    if use_web_search:
        tasks.insert(0, search_web(keywords, claim.id, claim.text))

    api_results = await asyncio.gather(*tasks, return_exceptions=True)

    all_evidence = []
    urls_to_scrape = []

    for result in api_results:
        if isinstance(result, tuple):
            evidence_list, urls = result
            all_evidence.extend(evidence_list)
            urls_to_scrape.extend(urls)
        elif isinstance(result, list):
            all_evidence.extend(result)

    if use_web_search and urls_to_scrape:
        scrape_tasks = [
            scrape_page(url, client, claim.id, claim.text, i)
            for i, url in enumerate(urls_to_scrape[:MAX_SCRAPE_URLS])
        ]
        try:
            scrape_results = await asyncio.wait_for(
                asyncio.gather(*scrape_tasks, return_exceptions=True),
                timeout=SEARCH_TIMEOUT,
            )
            for result in scrape_results:
                if isinstance(result, list):
                    all_evidence.extend(result)
        except asyncio.TimeoutError:
            pass

    return all_evidence


async def verify_claims(
    claims: List[Claim], web_search: bool = True,
) -> Tuple[List[Evidence], float, str]:
    if not claims:
        return [], 0.0, "No claims to verify."

    all_evidence = []
    async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, verify=False, timeout=10.0) as client:
        tasks = []
        for i, claim in enumerate(claims):
            use_ws = web_search and i < MAX_WEB_SEARCH_CLAIMS
            tasks.append(verify_single_claim(claim, client, use_web_search=use_ws))
        results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, list):
            all_evidence.extend(result)

    verified = sum(1 for c in claims if c.status == "verified")
    uncertain = sum(1 for c in claims if c.status == "uncertain")
    contradicted = sum(1 for c in claims if c.status == "contradicted")
    avg_rel = sum(e.relevance for e in all_evidence) / len(all_evidence) if all_evidence else 0

    sources = "Web Search, OpenAlex, CrossRef, World Bank" if web_search else "OpenAlex, CrossRef, World Bank"
    reasoning = (
        f"Verified {len(claims)} claims using {sources}. "
        f"Found {len(all_evidence)} evidence items. "
        f"Results: {verified} verified, {uncertain} uncertain, {contradicted} contradicted. "
        f"Average relevance: {avg_rel:.0f}%."
    )

    return all_evidence, 0.0, reasoning
