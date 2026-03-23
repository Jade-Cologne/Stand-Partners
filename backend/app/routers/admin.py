import os
from fastapi import APIRouter, Header, HTTPException
from threading import Thread

router = APIRouter()

_ADMIN_KEY = os.getenv("ADMIN_KEY", "")


def _require_key(x_admin_key: str = Header(...)):
    if not _ADMIN_KEY or x_admin_key != _ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/crawl")
def trigger_crawl(x_admin_key: str = Header(...)):
    _require_key(x_admin_key)
    from app.crawler.parser import run_daily_crawl
    Thread(target=run_daily_crawl, daemon=True).start()
    return {"status": "crawl started"}


@router.post("/discover")
def trigger_discovery(x_admin_key: str = Header(...)):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_weekly_discovery
    Thread(target=run_weekly_discovery, daemon=True).start()
    return {"status": "discovery started"}


@router.post("/discover-claude")
def trigger_claude_discovery(x_admin_key: str = Header(...)):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_claude_state_discovery
    Thread(target=run_claude_state_discovery, daemon=True).start()
    return {"status": "claude state-by-state discovery started"}
