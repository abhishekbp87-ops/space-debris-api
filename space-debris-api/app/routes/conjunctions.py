"""Conjunction history and summary API routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.conjunction import Conjunction
from app.schemas.conjunction import (
    ConjunctionListResponse,
    ConjunctionResponse,
    TodayConjunctionSummaryResponse,
)

router = APIRouter(prefix="/conjunctions", tags=["Conjunctions"])


@router.get("/", response_model=ConjunctionListResponse)
async def list_conjunctions(
    risk_level: str | None = Query(default=None),
    hours_ahead: int | None = Query(default=None, ge=1, le=720),
    db: AsyncSession = Depends(get_db),
) -> ConjunctionListResponse:
    """List conjunction events with optional risk and look-ahead filters."""
    query = select(Conjunction)

    if risk_level:
        query = query.where(Conjunction.risk_level == risk_level.upper())

    if hours_ahead is not None:
        start = datetime.now(timezone.utc)
        end = start + timedelta(hours=hours_ahead)
        query = query.where(Conjunction.tca >= start, Conjunction.tca <= end)

    query = query.order_by(Conjunction.tca.asc())
    result = await db.execute(query)
    conjunctions = list(result.scalars().all())

    return ConjunctionListResponse(conjunctions=conjunctions, count=len(conjunctions))


@router.get("/today", response_model=TodayConjunctionSummaryResponse)
async def conjunctions_today(db: AsyncSession = Depends(get_db)) -> TodayConjunctionSummaryResponse:
    """Return conjunctions in the next 24 hours and summarize risk distribution."""
    start = datetime.now(timezone.utc)
    end = start + timedelta(hours=24)

    result = await db.execute(
        select(Conjunction).where(Conjunction.tca >= start, Conjunction.tca <= end).order_by(Conjunction.tca.asc())
    )
    conjunctions = list(result.scalars().all())

    summary = {"GREEN": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
    for conjunction in conjunctions:
        summary[conjunction.risk_level] = summary.get(conjunction.risk_level, 0) + 1

    return TodayConjunctionSummaryResponse(conjunctions=conjunctions, risk_summary=summary, window_hours=24)


@router.get("/{conjunction_id}", response_model=ConjunctionResponse)
async def get_conjunction(conjunction_id: int, db: AsyncSession = Depends(get_db)) -> Conjunction:
    """Return a single conjunction event by database identifier."""
    result = await db.execute(select(Conjunction).where(Conjunction.id == conjunction_id))
    conjunction = result.scalar_one_or_none()
    if conjunction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conjunction not found.")
    return conjunction
