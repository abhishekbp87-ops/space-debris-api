"""Debris ORM model."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Debris(Base):
    """Represents a tracked debris object in Earth orbit."""

    __tablename__ = "debris"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    norad_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    object_type: Mapped[str] = mapped_column(String(32), nullable=False, default="DEBRIS")
    tle_line1: Mapped[str] = mapped_column(String(80), nullable=False)
    tle_line2: Mapped[str] = mapped_column(String(80), nullable=False)
    tle_epoch: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    size_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    mass_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    radar_cross_section: Mapped[float | None] = mapped_column(Float, nullable=True)
    altitude_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    inclination_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    eccentricity: Mapped[float | None] = mapped_column(Float, nullable=True)
    period_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    launch_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_object: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
