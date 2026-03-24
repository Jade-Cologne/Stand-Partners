"""
Daily crawl: visit each orchestra's audition page, use Claude to extract
structured audition/sub-list data, persist to the database.
"""

import json
import logging
import time
from datetime import datetime, date, timedelta
from typing import Optional

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

EXTRACTION_PROMPT = """\
You are a data extraction assistant for an orchestral audition database.

Below is the raw text of an orchestra's auditions/employment web page.
Extract every audition listing, any sub-list information, and the orchestra's venue address.

Return a JSON object with this exact structure:
{{
  "venue_name": "name of the concert hall or venue, or null if not found",
  "venue_address": "full street address of the orchestra's primary venue, or null if not found",
  "personnel_manager_name": "name of the personnel manager or HR/audition contact if listed, or null",
  "personnel_manager_email": "email address of the personnel manager or audition contact if listed, or null",
  "auditions": [
    {{
      "position": "string, e.g. 'Principal Oboe' or 'Section Violin'",
      "instrument": "string, lowercase, e.g. 'oboe', 'violin', 'trombone'",
      "section": "string or null, e.g. 'woodwinds', 'strings', 'brass'",
      "is_section_audition": true/false,
      "is_per_service": true/false,
      "deadline": "YYYY-MM-DD or null",
      "audition_date": "YYYY-MM-DD or null",
      "audition_location": "string or null",
      "raw_excerpt_text": "verbatim excerpt list from the page, or null if not listed"
    }}
  ],
  "sub_list": {{
    "has_sublist": true/false/null,
    "contact_name": "string or null",
    "contact_email": "string or null",
    "contact_phone": "string or null",
    "has_formal_submission": true/false,
    "submission_url": "string or null",
    "submission_details": "string or null",
    "notes": "any additional relevant notes, or null"
  }}
}}

Rules:
- has_sublist: true if the page explicitly mentions a sub list, false if it explicitly says they don't have one, null if not mentioned at all.
- is_per_service: true if the position is marked as per-service, extra, or substitute (not a full tenured seat).
- If there are no auditions, return an empty auditions array.
- If there is no sub-list information at all, return has_sublist: null with all other sub_list fields as null.
- Dates must be ISO format (YYYY-MM-DD). If only a month/year is given, use the first of that month.
- Only include factual information from the page. Do not infer or fabricate.

Page URL: {url}
Page text:
---
{text}
---

Respond with only valid JSON, no markdown fences.
"""

EXCERPT_NORMALIZATION_PROMPT = """\
You are an expert orchestral librarian. Given this raw excerpt text from an audition listing,
identify each distinct excerpt and return a JSON array.

For each excerpt include:
{{
  "title": "common short title, e.g. 'Don Juan'",
  "composer": "last name only, e.g. 'Strauss'",
  "work": "full work title, e.g. 'Don Juan, Op. 20'",
  "movement": "movement or measure description if specified, or null"
}}

Raw text: {raw_text}

Respond with only valid JSON array, no markdown fences.
"""


def _geocode(query: str) -> Optional[tuple[float, float]]:
    """Return (lat, lng) for a venue address or city/state using Nominatim."""
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers={"User-Agent": "stand.partners orchestral audition aggregator (contact@stand.partners)"},
            timeout=10,
        )
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print(f"[geocode] Failed for {query!r}: {e}")
    return None


def _fetch_page(url: str) -> Optional[str]:
    """Fetch a URL and return visible text content. Retries twice on failure,
    then falls back to Playwright for JS-rendered pages."""
    headers = {"User-Agent": "stand.partners orchestral audition aggregator (contact@stand.partners)"}
    for attempt in range(3):
        try:
            resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)[:12000]
            # If we got very little text, the page is probably JS-rendered — try Playwright
            if len(text) < 200:
                pw_text = _fetch_page_playwright(url)
                if pw_text:
                    return pw_text
            return text
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                print(f"[crawl] Failed to fetch {url} after 3 attempts: {e}")
                return _fetch_page_playwright(url)
    return None


def _fetch_page_playwright(url: str) -> Optional[str]:
    """Playwright fallback for JS-rendered pages. No-ops gracefully if not installed."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=20000)
            content = page.content()
            browser.close()
        soup = BeautifulSoup(content, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:12000]
    except ImportError:
        return None
    except Exception as e:
        print(f"[crawl] Playwright fallback failed for {url}: {e}")
        return None


FIND_AUDITION_PAGE_PROMPT = """\
You are helping find the auditions or employment page for an orchestra website.

Base URL: {website}

Links found on the homepage:
{links}

Return ONLY the single most likely URL for the orchestra's auditions, employment, jobs, or careers page.
Convert relative URLs to absolute using the base URL.
If no such page exists, return null.
Respond with only the URL or null — no other text.
"""


def _find_audition_page(website: str) -> Optional[str]:
    """Fetch the homepage, extract links, and ask Claude to identify the auditions page."""
    try:
        headers = {"User-Agent": "stand.partners orchestral audition aggregator (contact@stand.partners)"}
        resp = httpx.get(website, headers=headers, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True)
            if href and text:
                links.append(f"{text}: {href}")
        if not links:
            return None
    except Exception as e:
        print(f"[find-audition-page] Failed to fetch {website}: {e}")
        return None

    message = _client().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": FIND_AUDITION_PAGE_PROMPT.format(
                website=website,
                links="\n".join(links[:200]),
            ),
        }],
    )
    result = message.content[0].text.strip()
    if result.lower() == "null" or not result.startswith("http"):
        return None
    return result


def _parse_page(url: str, text: str) -> dict:
    """Send page text to Claude and get structured audition data."""
    import re as _re
    message = _client().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": EXTRACTION_PROMPT.format(url=url, text=text),
        }],
    )
    raw = message.content[0].text.strip()
    # Strip markdown fences if present
    match = _re.search(r"\{.*\}", raw, _re.DOTALL)
    if not match:
        print(f"[crawl] No JSON in Claude response for {url}. Raw: {raw[:200]!r}")
        return {"auditions": [], "sub_list": {}}
    try:
        return json.loads(match.group())
    except Exception as e:
        print(f"[crawl] JSON parse error for {url}: {e}")
        return {"auditions": [], "sub_list": {}}


def _normalize_excerpts(raw_text: str) -> list[dict]:
    """Ask Claude to parse raw excerpt text into structured excerpt data."""
    if not raw_text or not raw_text.strip():
        return []
    message = _client().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": EXCERPT_NORMALIZATION_PROMPT.format(raw_text=raw_text),
        }],
    )
    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except Exception:
        return []


def _get_or_create_excerpt(db, instrument: str, excerpt_data: dict) -> models.Excerpt:
    """Find a matching excerpt or create a new one."""
    existing = db.query(models.Excerpt).filter(
        models.Excerpt.instrument == instrument,
        models.Excerpt.title.ilike(excerpt_data["title"]),
        models.Excerpt.composer.ilike(excerpt_data["composer"]),
    ).first()
    if existing:
        return existing
    excerpt = models.Excerpt(
        title=excerpt_data["title"],
        composer=excerpt_data["composer"],
        work=excerpt_data.get("work", excerpt_data["title"]),
        movement=excerpt_data.get("movement"),
        instrument=instrument,
    )
    db.add(excerpt)
    db.flush()
    return excerpt


def _upsert_audition(db, orchestra: models.Orchestra, audition_data: dict, source_url: str):
    """Create or update an audition record."""
    position = audition_data.get("position", "").strip()
    if not position:
        return

    # Look for an existing active audition for this position
    existing = db.query(models.Audition).filter(
        models.Audition.orchestra_id == orchestra.id,
        models.Audition.position == position,
        models.Audition.active == True,
    ).first()

    def parse_date(val) -> Optional[date]:
        if not val:
            return None
        try:
            return date.fromisoformat(val)
        except Exception:
            return None

    now = datetime.utcnow()
    new_excerpt_text = audition_data.get("raw_excerpt_text")

    if existing:
        existing.deadline = parse_date(audition_data.get("deadline"))
        existing.audition_date = parse_date(audition_data.get("audition_date"))
        existing.audition_location = audition_data.get("audition_location")
        existing.raw_excerpt_text = new_excerpt_text
        existing.source_url = source_url
        existing.scraped_at = now
        existing.last_seen = now
        audition = existing
    else:
        audition = models.Audition(
            orchestra_id=orchestra.id,
            position=position,
            instrument=audition_data.get("instrument", "").lower(),
            section=audition_data.get("section"),
            is_section_audition=audition_data.get("is_section_audition", False),
            is_per_service=audition_data.get("is_per_service", False),
            deadline=parse_date(audition_data.get("deadline")),
            audition_date=parse_date(audition_data.get("audition_date")),
            audition_location=audition_data.get("audition_location"),
            raw_excerpt_text=new_excerpt_text,
            source_url=source_url,
            active=True,
            first_seen=now,
            last_seen=now,
        )
        db.add(audition)
        db.flush()

    # Only re-normalize excerpts if the raw text actually changed
    excerpt_text_changed = new_excerpt_text and new_excerpt_text != (
        existing.raw_excerpt_text if existing else None
    )
    raw_excerpt_text = new_excerpt_text
    if raw_excerpt_text and (not existing or excerpt_text_changed):
        instrument = audition_data.get("instrument", "").lower()
        excerpts = _normalize_excerpts(raw_excerpt_text)
        for exc_data in excerpts:
            excerpt = _get_or_create_excerpt(db, instrument, exc_data)
            # Add link if not already present
            link_exists = db.query(models.AuditionExcerpt).filter(
                models.AuditionExcerpt.audition_id == audition.id,
                models.AuditionExcerpt.excerpt_id == excerpt.id,
            ).first()
            if not link_exists:
                db.add(models.AuditionExcerpt(audition_id=audition.id, excerpt_id=excerpt.id))


def _upsert_sub_list(db, orchestra: models.Orchestra, sub_data: dict):
    """Create or update sub-list info for an orchestra."""
    existing = db.query(models.SubListInfo).filter(
        models.SubListInfo.orchestra_id == orchestra.id
    ).first()

    kwargs = {
        "has_sublist": sub_data.get("has_sublist"),
        "contact_name": sub_data.get("contact_name"),
        "contact_email": sub_data.get("contact_email"),
        "contact_phone": sub_data.get("contact_phone"),
        "has_formal_submission": sub_data.get("has_formal_submission", False),
        "submission_url": sub_data.get("submission_url"),
        "submission_details": sub_data.get("submission_details"),
        "notes": sub_data.get("notes"),
        "updated_at": datetime.utcnow(),
    }

    if existing:
        for k, v in kwargs.items():
            setattr(existing, k, v)
    else:
        db.add(models.SubListInfo(orchestra_id=orchestra.id, **kwargs))


def crawl_orchestra(orchestra: models.Orchestra):
    """Crawl a single orchestra and persist results."""
    db = SessionLocal()
    try:
        # Determine URL to fetch
        url = orchestra.audition_page or orchestra.website
        if not url:
            return

        text = _fetch_page(url)

        # If the audition page 404'd or returned nothing, fall back to discovery
        if not text and orchestra.audition_page:
            print(f"[crawl] Audition page failed for {orchestra.name}, searching homepage...")
            orchestra.audition_page = None
            url = orchestra.website
            if url:
                found = _find_audition_page(url)
                if found:
                    url = found
                    orchestra.audition_page = found
                text = _fetch_page(url) if url else None

        # If we only have the homepage, try to find the auditions page
        if text is None and url == orchestra.website:
            found = _find_audition_page(url)
            if found:
                url = found
                orchestra.audition_page = found
                text = _fetch_page(url)

        if not text:
            orchestra.crawl_error = "Failed to fetch page or no content returned"
            db.commit()
            return

        data = _parse_page(url, text)

        # Geocode if we don't have coordinates yet
        if orchestra.lat is None or orchestra.lng is None:
            venue_address = data.get("venue_address")
            geocode_query = venue_address or f"{orchestra.city}, {orchestra.state}, US"
            coords = _geocode(geocode_query)
            if coords:
                orchestra.lat, orchestra.lng = coords
                print(f"[geocode] {orchestra.name}: {geocode_query!r} → {coords}")

        # Mark all current auditions as inactive — we'll reactivate/create below
        db.query(models.Audition).filter(
            models.Audition.orchestra_id == orchestra.id,
            models.Audition.active == True,
        ).update({"active": False})

        for audition_data in data.get("auditions", []):
            _upsert_audition(db, orchestra, audition_data, url)

        if data.get("sub_list"):
            _upsert_sub_list(db, orchestra, data["sub_list"])

        # Update personnel manager info if found
        if data.get("personnel_manager_name"):
            orchestra.personnel_manager_name = data["personnel_manager_name"]
        if data.get("personnel_manager_email"):
            orchestra.personnel_manager_email = data["personnel_manager_email"]

        # Archive auditions that have been inactive for 90+ days
        cutoff = datetime.utcnow() - timedelta(days=90)
        db.query(models.Audition).filter(
            models.Audition.orchestra_id == orchestra.id,
            models.Audition.active == False,
            models.Audition.archived_at.is_(None),
            models.Audition.last_seen < cutoff,
        ).update({"archived_at": datetime.utcnow()})

        orchestra.last_crawled_at = datetime.utcnow()
        orchestra.crawl_error = None
        db.commit()
        print(f"[crawl] {orchestra.name}: {len(data.get('auditions', []))} audition(s)")

    except Exception as e:
        db.rollback()
        print(f"[crawl] Error crawling {orchestra.name}: {e}")
        try:
            orchestra.crawl_error = str(e)
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


def run_daily_crawl():
    """Entry point for the APScheduler daily job."""
    from app.crawler.cancel import is_cancelled, reset
    reset("crawl")
    print("Starting daily audition crawl...")
    db = SessionLocal()
    try:
        orchestras = db.query(models.Orchestra).filter(
            models.Orchestra.crawl_enabled == True
        ).all()
    finally:
        db.close()

    skip_cutoff = datetime.utcnow() - timedelta(days=12)
    for orchestra in orchestras:
        if is_cancelled("crawl"):
            print("Daily crawl cancelled.")
            return
        if orchestra.last_crawled_at and orchestra.last_crawled_at > skip_cutoff:
            continue
        crawl_orchestra(orchestra)
        time.sleep(1)  # be polite — 1 req/sec

    print("Daily crawl complete.")
