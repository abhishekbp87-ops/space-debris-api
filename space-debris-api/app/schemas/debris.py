"""Debris request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DebrisBase(BaseModel):
    """Shared debris payload fields."""

    norad_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=255)
    object_type: str = Field(default="DEBRIS", min_length=1, max_length=32)
    tle_line1: str = Field(..., min_length=60, max_length=80)
    tle_line2: str = Field(..., min_length=60, max_length=80)
    tle_epoch: datetime | None = None
    size_m: float | None = Field(default=None, gt=0)
    mass_kg: float | None = Field(default=None, gt=0)
    radar_cross_section: float | None = Field(default=None, ge=0)
    altitude_km: float | None = None
    inclination_deg: float | None = None
    eccentricity: float | None = Field(default=None, ge=0)
    period_min: float | None = Field(default=None, gt=0)
    source_country: str | None = Field(default=None, max_length=100)
    launch_year: int | None = Field(default=None, ge=1957, le=2100)
    parent_object: str | None = Field(default=None, max_length=255)


class DebrisCreate(DebrisBase):
    """Payload for creating a debris record."""


class DebrisResponse(DebrisBase):
    """Serialized debris record returned by the API."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DebrisCountResponse(BaseModel):
    """Response model for debris counts and type breakdown."""

    total: int
    by_type: dict[str, int]


class HeatmapBand(BaseModel):
    """Represents one altitude bin in a debris heatmap."""

    band_start_km: int
    band_end_km: int
    count: int


class DebrisHeatmapResponse(BaseModel):
    """Response model for debris altitude heatmap."""

    bands: list[HeatmapBand]


class SeedResponse(BaseModel):
    """Response model for seed operations."""

    seeded_count: int
    total_count: int
