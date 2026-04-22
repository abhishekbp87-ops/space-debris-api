"""Alert API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.conjunction import AlertListResponse, AlertResponse, AlertSummaryResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    unacknowledged_only: bool = Query(default=False),
    risk_level: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    """List alerts with optional acknowledgment and risk filters."""
    query = select(Alert)

    if unacknowledged_only:
        query = query.where(Alert.is_acknowledged.is_(False))
    if risk_level:
        query = query.where(Alert.risk_level == risk_level.upper())

    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    alerts = list(result.scalars().all())
    return AlertListResponse(alerts=alerts, count=len(alerts))


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db)) -> Alert:
    """Mark an alert as acknowledged."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    if not alert.is_acknowledged:
        alert.is_acknowledged = True
        alert.acknowledged_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(alert)

    return alert


@router.get("/summary", response_model=AlertSummaryResponse)
async def alert_summary(db: AsyncSession = Depends(get_db)) -> AlertSummaryResponse:
    """Return total and per-risk alert counts."""
    total_result = await db.execute(select(func.count()).select_from(Alert))
    total = int(total_result.scalar_one())

    unacked_result = await db.execute(select(func.count()).select_from(Alert).where(Alert.is_acknowledged.is_(False)))
    unacknowledged = int(unacked_result.scalar_one())

    grouped_result = await db.execute(select(Alert.risk_level, func.count()).group_by(Alert.risk_level))
    by_risk = {str(row[0]): int(row[1]) for row in grouped_result.all()}

    return AlertSummaryResponse(total=total, unacknowledged=unacknowledged, by_risk_level=by_risk)
