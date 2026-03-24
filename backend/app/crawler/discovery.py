"""
Weekly discovery: use Claude + known directory pages to find orchestras
not yet in the database and add them for crawling.
"""

import json
import logging
import re
import time

import httpx
from bs4 import BeautifulSoup
import anthropic

from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

_anthropic_client = None

def _client():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()
    return _anthropic_client

# Known directory pages that list orchestra member organizations
DIRECTORY_SOURCES = [
    {
        "url": "https://www.icsom.org/orchestras/",
        "type": models.OrchestraType.professional,
        "description": "ICSOM (International Conference of Symphony and Opera Musicians) member orchestras",
    },
    {
        "url": "https://www.ropa.org/orchestras/",
        "type": models.OrchestraType.regional,
        "description": "ROPA (Regional Orchestra Players' Association) member orchestras",
    },
    {
        "url": "https://www.amc.net/directory/",
        "type": models.OrchestraType.community,
        "description": "American Music Conference community ensemble directory",
    },
]

DISCOVERY_PROMPT = """\
You are helping build a database of orchestras.

Below is text from a directory page that lists orchestra organizations.
Extract every orchestra you can identify and return a JSON array.

For each orchestra include:
{{
  "name": "full official name",
  "city": "city",
  "state": "two-letter US state code, or full name for non-US",
  "country": "two-letter country code, e.g. US, CA, GB",
  "website": "homepage URL if visible in the text, or null",
  "type": "{type}"
}}

Only include orchestras you can clearly identify. Do not hallucinate entries.
If a website URL is not in the text, set it to null.

Directory text:
---
{text}
---

Respond with only a valid JSON array, no markdown fences.
"""


def _fetch_text(url: str) -> str | None:
    try:
        headers = {"User-Agent": "stand.partners orchestral audition aggregator (contact@stand.partners)"}
        resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:15000]
    except Exception as e:
        logger.warning(f"Discovery fetch failed for {url}: {e}")
        return None


def _discover_from_source(source: dict) -> list[dict]:
    text = _fetch_text(source["url"])
    if not text:
        return []
    message = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        messages=[{
            "role": "user",
            "content": DISCOVERY_PROMPT.format(
                text=text,
                type=source["type"].value,
            ),
        }],
    )
    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except Exception as e:
        logger.error(f"Failed to parse discovery response: {e}\nRaw: {raw[:500]}")
        return []


US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
]

CLAUDE_DISCOVERY_PROMPT = """\
Return ONLY a valid JSON array, no other text, no markdown fences.
List every orchestra and symphony you know of in {state}, United States.
Include professional, regional, community, and youth orchestras.
Each object must have exactly these fields:
  "name": full official name,
  "city": city name,
  "state": two-letter state code,
  "country": "US",
  "website": your best guess at the homepage URL based on the orchestra name and city (e.g. www.citysymphony.org) — only use null if you truly have no basis for a guess,
  "type": one of professional | regional | community | youth
Exclude university, college, conservatory, and student orchestras entirely.
Only include orchestras open to the general public (professional auditions,
community participation, or youth programs not tied to a school).
Only include orchestras you are confident exist. Do not hallucinate.
Start your response with [ and end with ].
"""


def _discover_state_via_claude(state: str) -> list[dict]:
    message = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        messages=[{
            "role": "user",
            "content": CLAUDE_DISCOVERY_PROMPT.format(state=state),
        }],
    )
    raw = message.content[0].text.strip()
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        print(f"No JSON array in Claude response for {state}. Raw: {raw[:200]!r}")
        return []
    try:
        return json.loads(match.group())
    except Exception as e:
        print(f"Failed to parse Claude response for {state}: {e}")
        return []


def _save_orchestras(orchestras: list[dict], existing_names: set, db) -> int:
    added = 0
    for o in orchestras:
        name = o.get("name", "").strip()
        if not name or name.lower() in existing_names:
            continue
        raw_type = o.get("type", "other")
        try:
            orch_type = models.OrchestraType(raw_type)
        except ValueError:
            orch_type = models.OrchestraType.other
        db.add(models.Orchestra(
            name=name,
            type=orch_type,
            city=o.get("city", ""),
            state=o.get("state"),
            country=o.get("country", "US"),
            website=o.get("website"),
            crawl_enabled=True,
        ))
        existing_names.add(name.lower())
        added += 1
    return added


def run_claude_state_discovery_for(state: str):
    """Discover orchestras in a single state."""
    from app.crawler.cancel import is_cancelled
    print(f"Starting Claude discovery for {state}...")
    if is_cancelled("discover_claude"):
        print(f"Claude discovery cancelled before {state}.")
        return
    db = SessionLocal()
    try:
        existing_names = {o.name.lower() for o in db.query(models.Orchestra).all()}
        orchestras = _discover_state_via_claude(state)
        added = _save_orchestras(orchestras, existing_names, db)
        db.commit()
        print(f"[discover-claude] {state}: {len(orchestras)} found, {added} new")
    except Exception as e:
        db.rollback()
        print(f"Claude discovery error for {state}: {e}")
    finally:
        db.close()


def run_claude_state_discovery():
    """Query Claude for orchestras in each US state and add new ones to the DB."""
    from app.crawler.cancel import is_cancelled, reset
    reset("discover_claude")
    print("Starting Claude state-by-state discovery...")
    db = SessionLocal()
    try:
        existing_names = {o.name.lower() for o in db.query(models.Orchestra).all()}
        total_added = 0

        for state in US_STATES:
            if is_cancelled("discover_claude"):
                print("Claude discovery cancelled.")
                return
            print(f"[discover-claude] {state}...")
            orchestras = _discover_state_via_claude(state)
            added = _save_orchestras(orchestras, existing_names, db)
            db.commit()
            total_added += added
            print(f"[discover-claude] {state}: {len(orchestras)} found, {added} new")
            time.sleep(1)

        print(f"Claude discovery complete: {total_added} new orchestras added.")
    except Exception as e:
        db.rollback()
        print(f"Claude discovery error: {e}")
    finally:
        db.close()


URL_ENRICHMENT_PROMPT = """\
For each orchestra below, provide your best guess at the official website URL.
Most orchestras follow patterns like www.[cityname]symphony.org or www.[name].org.
Return ONLY a valid JSON array, no other text. Each object:
  "id": the id field as given,
  "website": your best guess URL (never null — always make a reasonable guess)

Orchestras:
{orchestras}

Start your response with [ and end with ].
"""


def run_url_enrichment():
    """Fill in missing website URLs for orchestras using Claude's best-guess."""
    from app.crawler.cancel import is_cancelled, reset
    reset("enrich_urls")
    print("Starting URL enrichment...")
    db = SessionLocal()
    try:
        missing = db.query(models.Orchestra).filter(
            models.Orchestra.website.is_(None)
        ).all()
        print(f"Found {len(missing)} orchestras without websites")

        batch_size = 25
        updated = 0
        for i in range(0, len(missing), batch_size):
            if is_cancelled("enrich_urls"):
                print("URL enrichment cancelled.")
                return
            batch = missing[i:i + batch_size]
            orchestra_list = "\n".join(
                f'  {{"id": {o.id}, "name": "{o.name}", "city": "{o.city}", "state": "{o.state}"}}'
                for o in batch
            )
            message = _client().messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                messages=[{
                    "role": "user",
                    "content": URL_ENRICHMENT_PROMPT.format(orchestras=orchestra_list),
                }],
            )
            raw = message.content[0].text.strip()
            match = re.search(r"\[.*\]", raw, re.DOTALL)
            if not match:
                print(f"[enrich] No JSON in response for batch {i//batch_size + 1}")
                continue
            try:
                results = json.loads(match.group())
            except Exception as e:
                print(f"[enrich] Parse error for batch {i//batch_size + 1}: {e}")
                continue

            id_to_url = {r["id"]: r.get("website") for r in results if r.get("website")}
            for o in batch:
                if o.id in id_to_url:
                    o.website = id_to_url[o.id]
                    updated += 1
                    # Probe for a direct auditions/employment page
                    if not o.audition_page:
                        from app.crawler.parser import _find_audition_page
                        found = _find_audition_page(o.website)
                        if found:
                            o.audition_page = found
                            print(f"[enrich] {o.name}: found audition page {found}")
            db.commit()
            print(f"[enrich] Batch {i//batch_size + 1}: {len(id_to_url)} URLs found")
            time.sleep(1)

        print(f"URL enrichment complete: {updated} orchestras updated.")
    except Exception as e:
        db.rollback()
        print(f"URL enrichment error: {e}")
    finally:
        db.close()


def run_weekly_discovery():
    """Entry point for the APScheduler weekly job."""
    from app.crawler.cancel import is_cancelled, reset
    reset("discover")
    print("Starting weekly directory discovery...")
    db = SessionLocal()
    try:
        existing_names = {o.name.lower() for o in db.query(models.Orchestra).all()}
        added = 0

        for source in DIRECTORY_SOURCES:
            if is_cancelled("discover"):
                print("Directory discovery cancelled.")
                return
            orchestras = _discover_from_source(source)
            for o in orchestras:
                name = o.get("name", "").strip()
                if not name or name.lower() in existing_names:
                    continue
                new_orch = models.Orchestra(
                    name=name,
                    type=source["type"],
                    city=o.get("city", ""),
                    state=o.get("state"),
                    country=o.get("country", "US"),
                    website=o.get("website"),
                    crawl_enabled=True,
                )
                db.add(new_orch)
                existing_names.add(name.lower())
                added += 1
            time.sleep(2)

        db.commit()
        print(f"Directory discovery complete: {added} new orchestras added.")
    except Exception as e:
        db.rollback()
        print(f"Directory discovery error: {e}")
    finally:
        db.close()
