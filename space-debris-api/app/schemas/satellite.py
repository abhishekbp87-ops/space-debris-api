"""Satellite request and response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SatelliteBase(BaseModel):
    """Shared satellite payload fields."""

    norad_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=255)
    operator: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    orbit_type: str | None = Field(default=None, max_length=50)
    tle_line1: str = Field(..., min_length=60, max_length=80)
    tle_line2: str = Field(..., min_length=60, max_length=80)
    tle_epoch: datetime | None = None
    altitude_km: float | None = None
    inclination_deg: float | None = None
    period_min: float | None = None
    is_active: bool = True
    launch_date: date | None = None
    decay_date: date | None = None


class SatelliteCreate(SatelliteBase):
    """Payload for creating a satellite record."""


class SatelliteResponse(SatelliteBase):
    """Serialized satellite record returned by the API."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SatelliteCountResponse(BaseModel):
    """Response model for satellite count endpoint."""

    total: int


class OrbitalPositionResponse(BaseModel):
    """Response model for propagated orbital state."""

    time_utc: datetime
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]
    altitude_km: float
    latitude_deg: float
    longitude_deg: float
    speed_km_s: float


class OrbitalElementsResponse(BaseModel):
    """Response model for derived orbital elements."""

    inclination: float
    eccentricity: float
    raan: float
    arg_perigee: float
    mean_motion: float
    period_min: float
    semi_major_axis_km: float
    approx_altitude_km: float
    bstar_drag: float


class SeedResponse(BaseModel):
    """Response model for seed operations."""

    seeded_count: int
    total_count: int
