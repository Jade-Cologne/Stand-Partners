"""
Data cleaning: find duplicates, fix bad data, report issues.
Run via POST /api/admin/clean?dry_run=true (report only) or dry_run=false (apply fixes).
"""

import difflib
import re
from typing import Optional

from app.database import SessionLocal
from app import models


# Strip only the pure ensemble-type nouns that carry no identity on their own.
# Qualifier words like "youth", "chamber", "pops", "civic", "metropolitan" etc.
# are intentionally kept — they distinguish different ensembles in the same city.
GENERIC_WORDS = {
    "symphony", "orchestra", "philharmonic",
    "music", "musical", "association", "society", "foundation",
    "the", "of", "and", "a", "an",
}


def _normalize_name(name: str) -> str:
    """Normalize orchestra name for fuzzy comparison."""
    name = name.lower().strip()
    name = re.sub(r"^the\s+", "", name)
    name = re.sub(r"\s+(inc\.?|llc\.?|ltd\.?|corp\.?)$", "", name)
    name = re.sub(r"\s+", " ", name)
    return name


def _distinctive_words(name: str) -> list[str]:
    """Return only the non-generic words — the parts that actually identify an orchestra."""
    return [w for w in _normalize_name(name).split() if w not in GENERIC_WORDS]


def _fix_url(url: str) -> Optional[str]:
    """Return a corrected URL, or None if it's not salvageable."""
    if not url:
        return None
    url = url.strip()
    if not url or "." not in url or len(url) < 5:
        return None
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url


def _is_bad_coords(lat: float, lng: float) -> bool:
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return True
    if abs(lat) < 0.01 and abs(lng) < 0.01:  # null island
        return True
    return False


def run_data_clean(dry_run: bool = True) -> dict:
    db = SessionLocal()
    try:
        orchestras = db.query(models.Orchestra).all()
        report = {
            "dry_run": dry_run,
            "total_orchestras": len(orchestras),
            "fixed": {
                "malformed_urls": [],
                "bad_coordinates": [],
            },
            "warnings": {
                "duplicate_names": [],
                "duplicate_websites": [],
                "us_missing_state": [],
            },
        }

        # --- Auto-fixable issues ---

        for o in orchestras:
            # Fix website URL
            if o.website:
                fixed = _fix_url(o.website)
                if fixed != o.website:
                    report["fixed"]["malformed_urls"].append({
                        "id": o.id, "name": o.name,
                        "field": "website", "old": o.website, "new": fixed,
                    })
                    if not dry_run:
                        o.website = fixed

            # Fix audition_page URL
            if o.audition_page:
                fixed = _fix_url(o.audition_page)
                if fixed != o.audition_page:
                    report["fixed"]["malformed_urls"].append({
                        "id": o.id, "name": o.name,
                        "field": "audition_page", "old": o.audition_page, "new": fixed,
                    })
                    if not dry_run:
                        o.audition_page = fixed

            # Null out bad/zero coordinates
            if o.lat is not None and o.lng is not None:
                if _is_bad_coords(o.lat, o.lng):
                    report["fixed"]["bad_coordinates"].append({
                        "id": o.id, "name": o.name,
                        "lat": o.lat, "lng": o.lng,
                    })
                    if not dry_run:
                        o.lat = None
                        o.lng = None

        # --- Warnings: require manual review ---

        # Near-duplicate names within the same state.
        # Compare only the distinctive (non-generic) words, and only when both
        # names have the same number of distinctive words — this prevents
        # "Springfield Symphony" and "Columbus Symphony" from matching just
        # because they share "symphony".
        distinctive = [(o, _distinctive_words(o.name)) for o in orchestras]
        for i, (o1, d1) in enumerate(distinctive):
            for o2, d2 in distinctive[i + 1:]:
                if o1.state != o2.state:
                    continue
                if not d1 or not d2 or len(d1) != len(d2):
                    continue
                ratio = difflib.SequenceMatcher(None, " ".join(d1), " ".join(d2)).ratio()
                if ratio >= 0.85:
                    report["warnings"]["duplicate_names"].append({
                        "similarity": round(ratio, 2),
                        "distinctive_words": {"o1": d1, "o2": d2},
                        "orchestra_1": {"id": o1.id, "name": o1.name, "state": o1.state},
                        "orchestra_2": {"id": o2.id, "name": o2.name, "state": o2.state},
                    })

        # Duplicate website URLs
        website_map: dict[str, list] = {}
        for o in orchestras:
            if not o.website:
                continue
            key = o.website.rstrip("/").lower()
            website_map.setdefault(key, []).append(o)
        for url, orcs in website_map.items():
            if len(orcs) > 1:
                report["warnings"]["duplicate_websites"].append({
                    "website": url,
                    "orchestras": [
                        {"id": o.id, "name": o.name, "state": o.state} for o in orcs
                    ],
                })

        # US orchestras missing a state
        for o in orchestras:
            if o.country == "US" and not o.state:
                report["warnings"]["us_missing_state"].append({
                    "id": o.id, "name": o.name, "city": o.city,
                })

        if not dry_run:
            db.commit()
            fixed_count = (
                len(report["fixed"]["malformed_urls"]) +
                len(report["fixed"]["bad_coordinates"])
            )
            print(f"[clean] Applied {fixed_count} fixes.")

        # Add summary counts
        report["summary"] = {
            "malformed_urls": len(report["fixed"]["malformed_urls"]),
            "bad_coordinates": len(report["fixed"]["bad_coordinates"]),
            "duplicate_names": len(report["warnings"]["duplicate_names"]),
            "duplicate_websites": len(report["warnings"]["duplicate_websites"]),
            "us_missing_state": len(report["warnings"]["us_missing_state"]),
        }

        return report

    except Exception as e:
        db.rollback()
        print(f"[clean] Error: {e}")
        raise
    finally:
        db.close()
