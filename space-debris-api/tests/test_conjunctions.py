"""Tests for conjunction and alert listing endpoints."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_conjunctions_today_empty(async_client):
    """Today endpoint should return conjunctions key even when empty."""
    response = await async_client.get("/conjunctions/today")
    assert response.status_code == 200
    payload = response.json()
    assert "conjunctions" in payload


@pytest.mark.asyncio
async def test_list_conjunctions(async_client):
    """Conjunction listing endpoint should return conjunctions key."""
    response = await async_client.get("/conjunctions/")
    assert response.status_code == 200
    payload = response.json()
    assert "conjunctions" in payload


@pytest.mark.asyncio
async def test_alerts_list(async_client):
    """Alert listing endpoint should return alerts key."""
    response = await async_client.get("/alerts/")
    assert response.status_code == 200
    payload = response.json()
    assert "alerts" in payload
