"""Tests for satellite endpoints."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_seed_satellites(async_client):
    """Seed endpoint should insert sample satellites."""
    response = await async_client.post("/satellites/seed")
    assert response.status_code == 200
    payload = response.json()
    assert payload["seeded_count"] > 0
    assert payload["total_count"] > 0


@pytest.mark.asyncio
async def test_list_satellites(async_client):
    """List endpoint should return a list of satellites."""
    await async_client.post("/satellites/seed")
    response = await async_client.get("/satellites/")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) > 0


@pytest.mark.asyncio
async def test_get_satellite(async_client):
    """Get endpoint should return seeded ISS by NORAD id."""
    await async_client.post("/satellites/seed")
    response = await async_client.get("/satellites/25544")
    assert response.status_code == 200
    payload = response.json()
    assert payload["norad_id"] == 25544


@pytest.mark.asyncio
async def test_satellite_position(async_client):
    """Position endpoint should return propagated altitude for ISS."""
    await async_client.post("/satellites/seed")
    response = await async_client.get("/satellites/25544/position")
    assert response.status_code == 200
    payload = response.json()
    assert "altitude_km" in payload


@pytest.mark.asyncio
async def test_satellite_not_found(async_client):
    """Get endpoint should return 404 for unknown satellite."""
    response = await async_client.get("/satellites/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_and_delete_satellite(async_client, sample_satellite):
    """Create and delete endpoints should manage a satellite lifecycle."""
    create_response = await async_client.post("/satellites/", json=sample_satellite)
    assert create_response.status_code == 201

    norad_id = sample_satellite["norad_id"]
    get_response = await async_client.get(f"/satellites/{norad_id}")
    assert get_response.status_code == 200

    delete_response = await async_client.delete(f"/satellites/{norad_id}")
    assert delete_response.status_code == 200

    missing_response = await async_client.get(f"/satellites/{norad_id}")
    assert missing_response.status_code == 404
