"""Satellite API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.satellite import Satellite
from app.schemas.satellite import (
    OrbitalElementsResponse,
    OrbitalPositionResponse,
    SatelliteCountResponse,
    SatelliteCreate,
    SatelliteResponse,
    SeedResponse,
)
from app.services.orbital_propagator import get_orbital_elements, propagate
from app.services.tle_fetcher import SAMPLE_SATELLITES

router = APIRouter(prefix="/satellites", tags=["Satellites"])


@router.get("/", response_model=list[SatelliteResponse])
async def list_satellites(
    orbit_type: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[Satellite]:
    """List satellites with optional orbit type filter and pagination."""
    query = select(Satellite)
    if orbit_type:
        query = query.where(Satellite.orbit_type == orbit_type)
    query = query.order_by(Satellite.norad_id).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/count", response_model=SatelliteCountResponse)
async def count_satellites(db: AsyncSession = Depends(get_db)) -> SatelliteCountResponse:
    """Return total number of satellites in the database."""
    result = await db.execute(select(func.count()).select_from(Satellite))
    total = int(result.scalar_one())
    return SatelliteCountResponse(total=total)


@router.get("/{norad_id}", response_model=SatelliteResponse)
async def get_satellite(norad_id: int, db: AsyncSession = Depends(get_db)) -> Satellite:
    """Return a single satellite by NORAD identifier."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    satellite = result.scalar_one_or_none()
    if satellite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found.")
    return satellite


@router.get("/{norad_id}/position", response_model=OrbitalPositionResponse)
async def get_satellite_position(norad_id: int, db: AsyncSession = Depends(get_db)) -> OrbitalPositionResponse:
    """Propagate and return current orbital state for a satellite."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    satellite = result.scalar_one_or_none()
    if satellite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found.")

    try:
        state = await run_in_threadpool(
            propagate,
            satellite.tle_line1,
            satellite.tle_line2,
            datetime.now(timezone.utc),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return OrbitalPositionResponse(
        time_utc=state.time,
        position_km=state.position_km,
        velocity_km_s=state.velocity_km_s,
        altitude_km=state.altitude_km,
        latitude_deg=state.latitude_deg,
        longitude_deg=state.longitude_deg,
        speed_km_s=state.speed_km_s,
    )


@router.get("/{norad_id}/orbital-elements", response_model=OrbitalElementsResponse)
async def get_satellite_orbital_elements(
    norad_id: int,
    db: AsyncSession = Depends(get_db),
) -> OrbitalElementsResponse:
    """Return derived orbital elements for a satellite TLE."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    satellite = result.scalar_one_or_none()
    if satellite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found.")

    try:
        elements = await run_in_threadpool(get_orbital_elements, satellite.tle_line1, satellite.tle_line2)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return OrbitalElementsResponse(**elements)


@router.post("/", response_model=SatelliteResponse, status_code=status.HTTP_201_CREATED)
async def create_satellite(payload: SatelliteCreate, db: AsyncSession = Depends(get_db)) -> Satellite:
    """Create a new satellite record."""
    existing = await db.execute(select(Satellite).where(Satellite.norad_id == payload.norad_id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Satellite NORAD ID already exists.")

    altitude_km = payload.altitude_km
    inclination_deg = payload.inclination_deg
    period_min = payload.period_min

    if altitude_km is None or inclination_deg is None or period_min is None:
        try:
            elements = await run_in_threadpool(get_orbital_elements, payload.tle_line1, payload.tle_line2)
            altitude_km = altitude_km if altitude_km is not None else elements["approx_altitude_km"]
            inclination_deg = inclination_deg if inclination_deg is not None else elements["inclination"]
            period_min = period_min if period_min is not None else elements["period_min"]
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    satellite = Satellite(
        norad_id=payload.norad_id,
        name=payload.name,
        operator=payload.operator,
        country=payload.country,
        orbit_type=payload.orbit_type,
        tle_line1=payload.tle_line1,
        tle_line2=payload.tle_line2,
        tle_epoch=payload.tle_epoch,
        altitude_km=altitude_km,
        inclination_deg=inclination_deg,
        period_min=period_min,
        is_active=payload.is_active,
        launch_date=payload.launch_date,
        decay_date=payload.decay_date,
    )

    db.add(satellite)
    await db.commit()
    await db.refresh(satellite)
    return satellite


@router.post("/seed", response_model=SeedResponse)
async def seed_satellites(db: AsyncSession = Depends(get_db)) -> SeedResponse:
    """Seed built-in sample satellites into the database."""
    seeded_count = 0

    for sample in SAMPLE_SATELLITES:
        existing = await db.execute(select(Satellite).where(Satellite.norad_id == sample["norad_id"]))
        if existing.scalar_one_or_none() is not None:
            continue

        satellite = Satellite(
            norad_id=sample["norad_id"],
            name=sample["name"],
            operator=sample.get("operator"),
            country=sample.get("country"),
            orbit_type=sample.get("orbit_type"),
            tle_line1=sample["tle_line1"],
            tle_line2=sample["tle_line2"],
            tle_epoch=datetime.now(timezone.utc),
            altitude_km=sample.get("altitude_km"),
            inclination_deg=sample.get("inclination_deg"),
            period_min=sample.get("period_min"),
            is_active=sample.get("is_active", True),
        )
        db.add(satellite)
        seeded_count += 1

    await db.commit()

    total_result = await db.execute(select(func.count()).select_from(Satellite))
    total_count = int(total_result.scalar_one())
    return SeedResponse(seeded_count=seeded_count, total_count=total_count)


@router.delete("/{norad_id}")
async def delete_satellite(norad_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a satellite by NORAD identifier."""
    result = await db.execute(select(Satellite).where(Satellite.norad_id == norad_id))
    satellite = result.scalar_one_or_none()
    if satellite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found.")

    await db.delete(satellite)
    await db.commit()
    return {"message": f"Satellite {norad_id} deleted."}
