"""Tests for debris endpoints."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_seed_debris(async_client):
    """Seed endpoint should insert sample debris records."""
    response = await async_client.post("/debris/seed")
    assert response.status_code == 200
    payload = response.json()
    assert payload["seeded_count"] > 0
    assert payload["total_count"] > 0


@pytest.mark.asyncio
async def test_list_debris(async_client):
    """List endpoint should return debris entries."""
    await async_client.post("/debris/seed")
    response = await async_client.get("/debris/")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) > 0


@pytest.mark.asyncio
async def test_debris_heatmap(async_client):
    """Heatmap endpoint should return altitude bands."""
    await async_client.post("/debris/seed")
    response = await async_client.get("/debris/heatmap")
    assert response.status_code == 200
    payload = response.json()
    assert "bands" in payload
    assert isinstance(payload["bands"], list)


@pytest.mark.asyncio
async def test_debris_position(async_client):
    """Position endpoint should return propagated state for debris."""
    await async_client.post("/debris/seed")
    response = await async_client.get("/debris/20580/position")
    assert response.status_code == 200
    payload = response.json()
    assert "altitude_km" in payload


@pytest.mark.asyncio
async def test_debris_not_found(async_client):
    """Get endpoint should return 404 for unknown debris id."""
    response = await async_client.get("/debris/99999")
    assert response.status_code == 404
