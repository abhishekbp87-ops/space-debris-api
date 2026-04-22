"""Conjunction response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConjunctionResponse(BaseModel):
    """Serialized conjunction record returned by the API."""

    id: int
    object1_norad: int
    object1_name: str
    object1_type: str
    object2_norad: int
    object2_name: str
    object2_type: str
    tca: datetime
    miss_distance_km: float
    relative_velocity_km_s: float
    collision_probability: float
    tca_altitude_km: float
    tca_latitude: float
    tca_longitude: float
    risk_level: str
    covariance_data: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConjunctionListResponse(BaseModel):
    """List wrapper for conjunction responses."""

    conjunctions: list[ConjunctionResponse]
    count: int


class TodayConjunctionSummaryResponse(BaseModel):
    """Response for the next-24h conjunction summary endpoint."""

    conjunctions: list[ConjunctionResponse]
    risk_summary: dict[str, int]
    window_hours: int


class AlertResponse(BaseModel):
    """Serialized alert record returned by the API."""

    id: int
    conjunction_id: int
    satellite_norad: int
    satellite_name: str
    threat_norad: int
    threat_name: str
    risk_level: str
    collision_probability: float
    miss_distance_km: float
    time_to_conjunction_hours: float
    message: str
    is_acknowledged: bool
    acknowledged_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    """List wrapper for alerts."""

    alerts: list[AlertResponse]
    count: int


class AlertSummaryResponse(BaseModel):
    """Response model for alert summary statistics."""

    total: int
    unacknowledged: int
    by_risk_level: dict[str, int]
