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
        max_tokens=4096,
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
List every orchestra, symphony, sinfonietta, chamber orchestra, pops orchestra,
wind ensemble, concert band, wind symphony, opera company, ballet/dance company
orchestra, and summer festival orchestra you know of in {state}, United States.
Include professional, regional, community, and youth ensembles of all these types.
Each object must have exactly these fields:
  "name": full official name,
  "city": city name,
  "state": two-letter state code,
  "country": "US",
  "website": homepage URL string or null,
  "type": one of professional | regional | community | youth
Exclude university, college, conservatory, and student ensembles entirely.
Only include ensembles open to the general public (professional auditions,
community participation, or youth programs not tied to a school).
Only include ensembles you are confident exist. Do not hallucinate.
Start your response with [ and end with ].
"""


def _discover_state_via_claude(state: str) -> list[dict]:
    message = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": CLAUDE_DISCOVERY_PROMPT.format(state=state),
        }],
    )
    raw = message.content[0].text.strip()
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        logger.warning(f"No JSON array in Claude response for {state}")
        return []
    try:
        return json.loads(match.group())
    except Exception as e:
        logger.error(f"Failed to parse Claude response for {state}: {e}")
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
    print(f"Starting Claude discovery for {state}...")
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
    print("Starting Claude state-by-state discovery...")
    db = SessionLocal()
    try:
        existing_names = {o.name.lower() for o in db.query(models.Orchestra).all()}
        total_added = 0

        for state in US_STATES:
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


def run_weekly_discovery():
    """Entry point for the APScheduler weekly job."""
    print("Starting weekly directory discovery...")
    db = SessionLocal()
    try:
        existing_names = {o.name.lower() for o in db.query(models.Orchestra).all()}
        added = 0

        for source in DIRECTORY_SOURCES:
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
