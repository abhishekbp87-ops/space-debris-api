"""Debris API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.debris import Debris
from app.schemas.debris import (
    DebrisCountResponse,
    DebrisCreate,
    DebrisHeatmapResponse,
    DebrisResponse,
    HeatmapBand,
    SeedResponse,
)
from app.schemas.satellite import OrbitalPositionResponse
from app.services.orbital_propagator import propagate
from app.services.tle_fetcher import SAMPLE_DEBRIS

router = APIRouter(prefix="/debris", tags=["Debris"])


@router.get("/", response_model=list[DebrisResponse])
async def list_debris(
    object_type: str | None = Query(default=None),
    min_altitude_km: float | None = Query(default=None),
    max_altitude_km: float | None = Query(default=None),
    country: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[Debris]:
    """List debris with optional type, altitude, and country filters."""
    query = select(Debris)

    if object_type:
        query = query.where(func.upper(Debris.object_type) == object_type.upper())
    if min_altitude_km is not None:
        query = query.where(Debris.altitude_km >= min_altitude_km)
    if max_altitude_km is not None:
        query = query.where(Debris.altitude_km <= max_altitude_km)
    if country:
        query = query.where(func.upper(Debris.source_country) == country.upper())

    query = query.order_by(Debris.norad_id).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/count", response_model=DebrisCountResponse)
async def count_debris(db: AsyncSession = Depends(get_db)) -> DebrisCountResponse:
    """Return total debris count and count grouped by object type."""
    total_result = await db.execute(select(func.count()).select_from(Debris))
    total = int(total_result.scalar_one())

    grouped_result = await db.execute(select(Debris.object_type, func.count()).group_by(Debris.object_type))
    by_type = {str(item[0]): int(item[1]) for item in grouped_result.all()}

    return DebrisCountResponse(total=total, by_type=by_type)


@router.get("/heatmap", response_model=DebrisHeatmapResponse)
async def debris_heatmap(db: AsyncSession = Depends(get_db)) -> DebrisHeatmapResponse:
    """Return counts of debris objects by 100 km altitude bins from 200 to 2100 km."""
    bands: list[HeatmapBand] = []

    for start in range(200, 2100, 100):
        end = start + 100
        count_result = await db.execute(
            select(func.count()).select_from(Debris).where(Debris.altitude_km >= start, Debris.altitude_km < end)
        )
        count = int(count_result.scalar_one())
        bands.append(HeatmapBand(band_start_km=start, band_end_km=end, count=count))

    return DebrisHeatmapResponse(bands=bands)


@router.get("/{norad_id}", response_model=DebrisResponse)
async def get_debris(norad_id: int, db: AsyncSession = Depends(get_db)) -> Debris:
    """Return a single debris object by NORAD identifier."""
    result = await db.execute(select(Debris).where(Debris.norad_id == norad_id))
    debris = result.scalar_one_or_none()
    if debris is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debris not found.")
    return debris


@router.get("/{norad_id}/position", response_model=OrbitalPositionResponse)
async def get_debris_position(norad_id: int, db: AsyncSession = Depends(get_db)) -> OrbitalPositionResponse:
    """Propagate and return current orbital state for a debris object."""
    result = await db.execute(select(Debris).where(Debris.norad_id == norad_id))
    debris = result.scalar_one_or_none()
    if debris is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debris not found.")

    try:
        state = await run_in_threadpool(
            propagate,
            debris.tle_line1,
            debris.tle_line2,
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


@router.post("/", response_model=DebrisResponse, status_code=status.HTTP_201_CREATED)
async def create_debris(payload: DebrisCreate, db: AsyncSession = Depends(get_db)) -> Debris:
    """Create a new debris record."""
    existing = await db.execute(select(Debris).where(Debris.norad_id == payload.norad_id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Debris NORAD ID already exists.")

    debris = Debris(
        norad_id=payload.norad_id,
        name=payload.name,
        object_type=payload.object_type,
        tle_line1=payload.tle_line1,
        tle_line2=payload.tle_line2,
        tle_epoch=payload.tle_epoch,
        size_m=payload.size_m,
        mass_kg=payload.mass_kg,
        radar_cross_section=payload.radar_cross_section,
        altitude_km=payload.altitude_km,
        inclination_deg=payload.inclination_deg,
        eccentricity=payload.eccentricity,
        period_min=payload.period_min,
        source_country=payload.source_country,
        launch_year=payload.launch_year,
        parent_object=payload.parent_object,
    )

    db.add(debris)
    await db.commit()
    await db.refresh(debris)
    return debris


@router.post("/seed", response_model=SeedResponse)
async def seed_debris(db: AsyncSession = Depends(get_db)) -> SeedResponse:
    """Seed built-in sample debris objects into the database."""
    seeded_count = 0

    for sample in SAMPLE_DEBRIS:
        existing = await db.execute(select(Debris).where(Debris.norad_id == sample["norad_id"]))
        if existing.scalar_one_or_none() is not None:
            continue

        record = Debris(
            norad_id=sample["norad_id"],
            name=sample["name"],
            object_type=sample["object_type"],
            tle_line1=sample["tle_line1"],
            tle_line2=sample["tle_line2"],
            tle_epoch=datetime.now(timezone.utc),
            size_m=sample.get("size_m"),
            mass_kg=sample.get("mass_kg"),
            radar_cross_section=sample.get("radar_cross_section"),
            altitude_km=sample.get("altitude_km"),
            inclination_deg=sample.get("inclination_deg"),
            eccentricity=sample.get("eccentricity"),
            period_min=sample.get("period_min"),
            source_country=sample.get("source_country"),
            launch_year=sample.get("launch_year"),
            parent_object=sample.get("parent_object"),
        )
        db.add(record)
        seeded_count += 1

    await db.commit()

    total_result = await db.execute(select(func.count()).select_from(Debris))
    total_count = int(total_result.scalar_one())

    return SeedResponse(seeded_count=seeded_count, total_count=total_count)


@router.delete("/{norad_id}")
async def delete_debris(norad_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Delete a debris record by NORAD identifier."""
    result = await db.execute(select(Debris).where(Debris.norad_id == norad_id))
    debris = result.scalar_one_or_none()
    if debris is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debris not found.")

    await db.delete(debris)
    await db.commit()
    return {"message": f"Debris {norad_id} deleted."}
