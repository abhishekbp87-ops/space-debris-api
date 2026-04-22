"""Prediction request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class PredictionObject(BaseModel):
    """Input schema for an object used in collision prediction."""

    name: str = Field(..., min_length=1, max_length=255)
    tle_line1: str = Field(..., min_length=60, max_length=80)
    tle_line2: str = Field(..., min_length=60, max_length=80)
    size_m: float = Field(..., gt=0)


class CollisionRequest(BaseModel):
    """Request schema for raw TLE collision prediction."""

    object1: PredictionObject
    object2: PredictionObject
    duration_hours: int = Field(default=72, ge=1, le=168)
    step_seconds: int = Field(default=60, ge=10, le=300)
    position_uncertainty_km: float = Field(default=0.5, gt=0)


class ApproachTimelinePoint(BaseModel):
    """Timeline point around time of closest approach."""

    time_utc: datetime
    miss_distance_km: float
    relative_velocity_km_s: float
    object1_position_km: tuple[float, float, float]
    object2_position_km: tuple[float, float, float]


class CollisionResponse(BaseModel):
    """Response schema for collision prediction output."""

    object1: str
    object2: str
    tca_utc: datetime
    miss_distance_km: float
    relative_velocity_km_s: float
    collision_probability: float
    collision_probability_pct: float
    risk_level: str
    risk_description: str
    tca_altitude_km: float
    tca_latitude_deg: float
    tca_longitude_deg: float
    maneuver_recommended: bool
    approach_timeline: list[ApproachTimelinePoint]


class SatelliteDebrisPredictionRequest(BaseModel):
    """Request schema for database lookup based predictions."""

    satellite_norad: int = Field(..., gt=0)
    debris_norad: int = Field(..., gt=0)
    duration_hours: int = Field(default=72, ge=1, le=168)
    step_seconds: int = Field(default=60, ge=10, le=300)


class RiskScoreResponse(BaseModel):
    """Aggregated collision risk score response for a satellite."""

    satellite_norad: int
    total_conjunctions: int
    by_risk_level: dict[str, int]
    max_collision_probability: float
    average_miss_distance_km: float
    high_risk_upcoming_7d: int
