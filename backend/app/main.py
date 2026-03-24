import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import engine
from app import models
from app.routers import orchestras, auditions, excerpts, requests as requests_router, admin
from app.crawler.scheduler import start_scheduler, stop_scheduler


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter: 120 req/min per IP on public API endpoints."""
    def __init__(self, app, calls: int = 120, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self._counts: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/") or path.startswith("/api/admin"):
            return await call_next(request)
        ip = (request.client.host if request.client else "unknown")
        now = time.time()
        self._counts[ip] = [t for t in self._counts[ip] if now - t < self.period]
        if len(self._counts[ip]) >= self.calls:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        self._counts[ip].append(now)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)

    # Add any new enum values that may not exist yet in the DB
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TYPE orchestratype ADD VALUE IF NOT EXISTS 'other'"))
        conn.execute(text("ALTER TABLE orchestras ADD COLUMN IF NOT EXISTS crawl_error TEXT"))
        conn.execute(text("ALTER TABLE orchestras ADD COLUMN IF NOT EXISTS source VARCHAR"))
        conn.execute(text("ALTER TABLE orchestras ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE auditions ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP"))
        conn.execute(text("ALTER TABLE auditions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP"))
        conn.execute(text("ALTER TABLE auditions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orchestras_state ON orchestras(state)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orchestras_type ON orchestras(type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_auditions_orchestra_active ON auditions(orchestra_id, active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_auditions_archived ON auditions(archived_at)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job_runs (
                id SERIAL PRIMARY KEY,
                job VARCHAR NOT NULL,
                started_at TIMESTAMP NOT NULL,
                ended_at TIMESTAMP,
                status VARCHAR NOT NULL DEFAULT 'running',
                records_processed INTEGER,
                notes TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs(job)"))
        conn.commit()

    # Ensure upload directory exists
    os.makedirs("uploads/excerpts", exist_ok=True)

    # Seed starter orchestras (no-op if already seeded)
    try:
        from app.seed.orchestras import seed
        seed()
    except Exception as e:
        print(f"Seed warning (non-fatal): {e}")

    # Start background crawler scheduler
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="stand.partners API",
    description="Orchestra audition listings, sub-list info, and excerpt reference.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://stand.partners", "https://www.stand.partners"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orchestras.router, prefix="/api/orchestras", tags=["orchestras"])
app.include_router(auditions.router, prefix="/api/auditions", tags=["auditions"])
app.include_router(excerpts.router, prefix="/api/excerpts", tags=["excerpts"])
app.include_router(requests_router.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# Serve uploaded PDFs
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the built React frontend in production (must be last — mount "/" catches everything)
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
