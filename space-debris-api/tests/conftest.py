"""Pytest fixtures for async API testing."""

from __future__ import annotations

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Disable background scheduler during tests.
os.environ["SCHEDULER_ENABLED"] = "false"

from app.core.database import Base, get_db
from app.main import app


@pytest_asyncio.fixture
async def test_db_sessionmaker() -> async_sessionmaker:
    """Create an isolated in-memory async SQLite database for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_maker = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        """Override dependency to provide the test database session."""
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield session_maker
    finally:
        app.dependency_overrides.clear()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


@pytest_asyncio.fixture
async def async_client(test_db_sessionmaker: async_sessionmaker) -> AsyncClient:
    """Return an async HTTP client bound to the FastAPI app."""
    _ = test_db_sessionmaker
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def sample_satellite() -> dict[str, object]:
    """Return a valid sample satellite payload for CRUD tests."""
    return {
        "norad_id": 99001,
        "name": "TEST-SAT-1",
        "operator": "Test Operator",
        "country": "US",
        "orbit_type": "LEO",
        "tle_line1": "1 25544U 98067A   24001.00000000  .00002182  00000-0  40768-4 0  9990",
        "tle_line2": "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000000000",
        "is_active": True,
    }


@pytest.fixture
def sample_debris() -> dict[str, object]:
    """Return a valid sample debris payload for CRUD tests."""
    return {
        "norad_id": 99002,
        "name": "TEST-DEBRIS-1",
        "object_type": "DEBRIS",
        "tle_line1": "1 36828U 99025AJD  24001.00000000  .00000500  00000-0  50000-4 0  9992",
        "tle_line2": "2 36828  98.5000 200.0000 0020000  45.0000 315.0000 14.20000000000000",
        "size_m": 0.5,
        "mass_kg": 3.0,
        "radar_cross_section": 0.2,
        "altitude_km": 840.0,
        "inclination_deg": 98.5,
        "eccentricity": 0.002,
        "period_min": 101.41,
        "source_country": "CN",
        "launch_year": 1999,
        "parent_object": "FENGYUN 1C",
    }
