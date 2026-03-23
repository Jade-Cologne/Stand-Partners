"""
Weekly discovery: use Claude + known directory pages to find orchestras
not yet in the database and add them for crawling.
"""

import json
import logging
import time

import httpx
from bs4 import BeautifulSoup
import anthropic

from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

_anthropic = anthropic.Anthropic()

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
    message = _anthropic.messages.create(
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


def run_weekly_discovery():
    """Entry point for the APScheduler weekly job."""
    logger.info("Starting weekly orchestra discovery...")
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
        logger.info(f"Discovery complete: {added} new orchestras added.")
    except Exception as e:
        db.rollback()
        logger.error(f"Discovery error: {e}")
    finally:
        db.close()
