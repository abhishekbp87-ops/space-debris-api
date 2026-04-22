"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routes import alerts, conjunctions, debris, predict, satellites
from app.tasks.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize resources at startup and release them on shutdown."""
    await init_db()
    if settings.scheduler_enabled:
        start_scheduler()
    try:
        yield
    finally:
        if settings.scheduler_enabled:
            stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for predicting satellite/debris conjunction risk using SGP4 propagation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(satellites.router)
app.include_router(debris.router)
app.include_router(predict.router)
app.include_router(conjunctions.router)
app.include_router(alerts.router)


@app.get("/")
async def root() -> dict[str, object]:
    """Return top-level API metadata and endpoint map."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "openapi": "/openapi.json",
        "endpoints": {
            "satellites": "/satellites",
            "debris": "/debris",
            "prediction": "/predict",
            "conjunctions": "/conjunctions",
            "alerts": "/alerts",
            "health": "/health",
            "stats": "/stats",
        },
    }


@app.get("/health")
async def health() -> dict[str, str]:
    """Return health status and UTC timestamp."""
    return {"status": "healthy", "timestamp_utc": datetime.now(timezone.utc).isoformat()}


@app.get("/stats")
async def stats() -> dict[str, object]:
    """Return service capabilities, thresholds, and data sources."""
    return {
        "capabilities": [
            "SGP4 orbit propagation",
            "TCA search",
            "Chan 2D circular collision probability",
            "Satellite/debris catalog management",
            "Automated hourly conjunction scanning",
        ],
        "risk_thresholds": {
            "GREEN": "Pc < 0.0001",
            "YELLOW": "0.0001 <= Pc < 0.001",
            "ORANGE": "0.001 <= Pc < 0.01",
            "RED": "Pc >= 0.01",
        },
        "data_sources": {
            "external_tle": "https://celestrak.org/SOCRATES/",
            "fallback": "Embedded sample TLE set",
        },
        "scan_interval_hours": settings.scan_interval_hours,
    }
