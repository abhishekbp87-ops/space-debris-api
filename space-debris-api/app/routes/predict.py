"""Collision prediction API routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.alert import Alert
from app.models.conjunction import Conjunction
from app.models.debris import Debris
from app.models.satellite import Satellite
from app.schemas.conjunction import ConjunctionResponse
from app.schemas.predict import (
    CollisionRequest,
    CollisionResponse,
    RiskScoreResponse,
    SatelliteDebrisPredictionRequest,
)
from app.services.collision_math import analyze_conjunction

router = APIRouter(prefix="/predict", tags=["Prediction"])


RISK_DESCRIPTIONS = {
    "GREEN": "Low collision probability. Continue routine monitoring.",
    "YELLOW": "Elevated risk detected. Increase tracking cadence and assess covariance quality.",
    "ORANGE": "High concern conjunction. Pre-plan collision avoidance options.",
    "RED": "Critical collision risk. Immediate maneuver analysis is recommended.",
}


def _get_risk_description(risk_level: str) -> str:
    """Return textual interpretation for a risk level."""
    return RISK_DESCRIPTIONS.get(risk_level, "Risk level unavailable.")


@router.post("/collision", response_model=CollisionResponse)
async def predict_collision(payload: CollisionRequest) -> CollisionResponse:
    """Run conjunction analysis directly from raw TLE input."""
    try:
        conjunction = await run_in_threadpool(
            analyze_conjunction,
            payload.object1.tle_line1,
            payload.object1.tle_line2,
            payload.object1.name,
            payload.object2.tle_line1,
            payload.object2.tle_line2,
            payload.object2.name,
            datetime.now(timezone.utc),
            payload.duration_hours,
            payload.step_seconds,
            payload.object1.size_m,
            payload.object2.size_m,
            payload.position_uncertainty_km,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if conjunction is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conjunction analysis produced no data.")

    maneuver_recommended = conjunction.risk_level in {"ORANGE", "RED"}

    return CollisionResponse(
        object1=conjunction.object1_name,
        object2=conjunction.object2_name,
        tca_utc=conjunction.tca_time,
        miss_distance_km=conjunction.miss_distance_km,
        relative_velocity_km_s=conjunction.relative_velocity_km_s,
        collision_probability=conjunction.collision_probability,
        collision_probability_pct=conjunction.collision_probability * 100.0,
        risk_level=conjunction.risk_level,
        risk_description=_get_risk_description(conjunction.risk_level),
        tca_altitude_km=conjunction.tca_altitude_km,
        tca_latitude_deg=conjunction.tca_latitude_deg,
        tca_longitude_deg=conjunction.tca_longitude_deg,
        maneuver_recommended=maneuver_recommended,
        approach_timeline=conjunction.approach_data,
    )


@router.post("/satellite-vs-debris", response_model=ConjunctionResponse)
async def predict_satellite_vs_debris(
    payload: SatelliteDebrisPredictionRequest,
    db: AsyncSession = Depends(get_db),
) -> Conjunction:
    """Run conjunction prediction for one satellite and one debris object from the database."""
    satellite_result = await db.execute(select(Satellite).where(Satellite.norad_id == payload.satellite_norad))
    satellite = satellite_result.scalar_one_or_none()
    if satellite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found.")

    debris_result = await db.execute(select(Debris).where(Debris.norad_id == payload.debris_norad))
    debris = debris_result.scalar_one_or_none()
    if debris is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debris not found.")

    try:
        conjunction = await run_in_threadpool(
            analyze_conjunction,
            satellite.tle_line1,
            satellite.tle_line2,
            satellite.name,
            debris.tle_line1,
            debris.tle_line2,
            debris.name,
            datetime.now(timezone.utc),
            payload.duration_hours,
            payload.step_seconds,
            10.0,
            debris.size_m or 1.0,
            settings.default_position_uncertainty_km,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if conjunction is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conjunction analysis produced no data.")

    conjunction_record = Conjunction(
        object1_norad=satellite.norad_id,
        object1_name=satellite.name,
        object1_type="SATELLITE",
        object2_norad=debris.norad_id,
        object2_name=debris.name,
        object2_type=debris.object_type,
        tca=conjunction.tca_time,
        miss_distance_km=conjunction.miss_distance_km,
        relative_velocity_km_s=conjunction.relative_velocity_km_s,
        collision_probability=conjunction.collision_probability,
        tca_altitude_km=conjunction.tca_altitude_km,
        tca_latitude=conjunction.tca_latitude_deg,
        tca_longitude=conjunction.tca_longitude_deg,
        risk_level=conjunction.risk_level,
        covariance_data=json.dumps(
            {
                "method": "chan_2d_circular",
                "position_uncertainty_km": settings.default_position_uncertainty_km,
            }
        ),
    )
    db.add(conjunction_record)
    await db.flush()

    if conjunction.risk_level in {"ORANGE", "RED"}:
        hours_to_tca = max(0.0, (conjunction.tca_time - datetime.now(timezone.utc)).total_seconds() / 3600.0)
        db.add(
            Alert(
                conjunction_id=conjunction_record.id,
                satellite_norad=satellite.norad_id,
                satellite_name=satellite.name,
                threat_norad=debris.norad_id,
                threat_name=debris.name,
                risk_level=conjunction.risk_level,
                collision_probability=conjunction.collision_probability,
                miss_distance_km=conjunction.miss_distance_km,
                time_to_conjunction_hours=hours_to_tca,
                message=(
                    f"{conjunction.risk_level} risk conjunction predicted between "
                    f"{satellite.name} and {debris.name}."
                ),
            )
        )

    await db.commit()
    await db.refresh(conjunction_record)
    return conjunction_record


@router.get("/risk-score/{satellite_norad}", response_model=RiskScoreResponse)
async def risk_score(satellite_norad: int, db: AsyncSession = Depends(get_db)) -> RiskScoreResponse:
    """Return aggregated conjunction risk statistics for a satellite."""
    result = await db.execute(
        select(Conjunction).where(
            or_(Conjunction.object1_norad == satellite_norad, Conjunction.object2_norad == satellite_norad)
        )
    )
    conjunctions = list(result.scalars().all())

    risk_buckets = {"GREEN": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
    max_pc = 0.0
    miss_distances: list[float] = []
    now = datetime.now(timezone.utc)
    future_limit = now + timedelta(days=7)
    high_risk_upcoming = 0

    for conjunction in conjunctions:
        risk_buckets[conjunction.risk_level] = risk_buckets.get(conjunction.risk_level, 0) + 1
        max_pc = max(max_pc, float(conjunction.collision_probability))
        miss_distances.append(float(conjunction.miss_distance_km))
        if conjunction.risk_level in {"ORANGE", "RED"} and now <= conjunction.tca <= future_limit:
            high_risk_upcoming += 1

    average_miss = sum(miss_distances) / len(miss_distances) if miss_distances else 0.0

    return RiskScoreResponse(
        satellite_norad=satellite_norad,
        total_conjunctions=len(conjunctions),
        by_risk_level=risk_buckets,
        max_collision_probability=max_pc,
        average_miss_distance_km=average_miss,
        high_risk_upcoming_7d=high_risk_upcoming,
    )
