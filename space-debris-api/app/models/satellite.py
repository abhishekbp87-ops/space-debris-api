"""Satellite ORM model."""

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Satellite(Base):
    """Represents an active or historical satellite tracked in the system."""

    __tablename__ = "satellites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    norad_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    operator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    orbit_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tle_line1: Mapped[str] = mapped_column(String(80), nullable=False)
    tle_line2: Mapped[str] = mapped_column(String(80), nullable=False)
    tle_epoch: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    altitude_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    inclination_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    period_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    launch_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    decay_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
