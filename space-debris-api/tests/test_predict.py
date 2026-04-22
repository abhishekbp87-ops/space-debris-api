"""Tests for collision prediction services and endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.services.collision_math import collision_probability_chan, get_risk_level
from app.services.orbital_propagator import propagate

ISS_TLE1 = "1 25544U 98067A   24001.00000000  .00002182  00000-0  40768-4 0  9990"
ISS_TLE2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000000000"
DEBRIS_TLE1 = "1 36828U 99025AJD  24001.00000000  .00000500  00000-0  50000-4 0  9992"
DEBRIS_TLE2 = "2 36828  98.5000 200.0000 0020000  45.0000 315.0000 14.20000000000000"


@pytest.mark.asyncio
async def test_collision_prediction_with_valid_tles(async_client):
    """Predict endpoint should return conjunction metrics for valid TLE pairs."""
    response = await async_client.post(
        "/predict/collision",
        json={
            "object1": {"name": "ISS", "tle_line1": ISS_TLE1, "tle_line2": ISS_TLE2, "size_m": 109.0},
            "object2": {
                "name": "FENGYUN DEBRIS",
                "tle_line1": DEBRIS_TLE1,
                "tle_line2": DEBRIS_TLE2,
                "size_m": 0.35,
            },
            "duration_hours": 6,
            "step_seconds": 60,
            "position_uncertainty_km": 0.5,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "tca_utc" in payload
    assert "miss_distance_km" in payload
    assert "collision_probability" in payload
    assert "risk_level" in payload


def test_collision_probability_math():
    """Chan collision probability should return a bounded probability."""
    result = collision_probability_chan(
        miss_distance_km=1.0,
        relative_velocity_km_s=14.0,
        combined_radius_m=5.0,
        position_uncertainty_km=0.5,
    )
    assert 0.0 <= result <= 1.0


def test_propagation():
    """ISS propagation should produce altitude within expected LEO band."""
    state = propagate(ISS_TLE1, ISS_TLE2, datetime.now(timezone.utc))
    assert 300 <= state.altitude_km <= 500


def test_risk_level_thresholds():
    """Risk thresholds should map probabilities to expected color codes."""
    assert get_risk_level(0.015) == "RED"
    assert get_risk_level(0.002) == "ORANGE"
    assert get_risk_level(0.0002) == "YELLOW"
    assert get_risk_level(0.000001) == "GREEN"
