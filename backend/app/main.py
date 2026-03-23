import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app import models
from app.routers import orchestras, auditions, excerpts, requests as requests_router, admin
from app.crawler.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://stand.partners"],
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
