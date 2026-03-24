import os
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from threading import Thread

router = APIRouter()

_ADMIN_KEY = os.getenv("ADMIN_KEY", "")


def _require_key(x_admin_key: str = Header(...)):
    if not _ADMIN_KEY or x_admin_key != _ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/crawl")
def trigger_crawl(x_admin_key: str = Header(...), sync: bool = False):
    _require_key(x_admin_key)
    from app.crawler.parser import run_daily_crawl
    if sync:
        run_daily_crawl()
        return {"status": "crawl complete"}
    Thread(target=run_daily_crawl, daemon=True).start()
    return {"status": "crawl started"}


@router.post("/discover")
def trigger_discovery(x_admin_key: str = Header(...), sync: bool = False):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_weekly_discovery
    if sync:
        run_weekly_discovery()
        return {"status": "discovery complete"}
    Thread(target=run_weekly_discovery, daemon=True).start()
    return {"status": "discovery started"}


@router.post("/discover-claude")
def trigger_claude_discovery(x_admin_key: str = Header(...), sync: bool = False):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_claude_state_discovery
    if sync:
        run_claude_state_discovery()
        return {"status": "claude discovery complete"}
    Thread(target=run_claude_state_discovery, daemon=True).start()
    return {"status": "claude state-by-state discovery started"}


class StopRequest(BaseModel):
    job: str


class StateRequest(BaseModel):
    state: str


@router.post("/stop")
def stop_job(payload: StopRequest, x_admin_key: str = Header(...)):
    _require_key(x_admin_key)
    from app.crawler.cancel import request_cancel
    request_cancel(payload.job)
    return {"status": f"cancel requested for {payload.job}"}


@router.post("/enrich-urls")
def trigger_url_enrichment(x_admin_key: str = Header(...), sync: bool = False):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_url_enrichment
    if sync:
        run_url_enrichment()
        return {"status": "url enrichment complete"}
    Thread(target=run_url_enrichment, daemon=True).start()
    return {"status": "url enrichment started"}


@router.post("/discover-claude-state")
def trigger_claude_state(payload: StateRequest, x_admin_key: str = Header(...), sync: bool = False):
    _require_key(x_admin_key)
    from app.crawler.discovery import run_claude_state_discovery_for
    if sync:
        run_claude_state_discovery_for(payload.state)
        return {"status": f"discovery complete for {payload.state}"}
    Thread(target=run_claude_state_discovery_for, args=(payload.state,), daemon=True).start()
    return {"status": f"discovery started for {payload.state}"}
