"""Conjunction ORM model."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Conjunction(Base):
    """Represents a close approach event between two orbiting objects."""

    __tablename__ = "conjunctions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    object1_norad: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    object1_name: Mapped[str] = mapped_column(String(255), nullable=False)
    object1_type: Mapped[str] = mapped_column(String(50), nullable=False)
    object2_norad: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    object2_name: Mapped[str] = mapped_column(String(255), nullable=False)
    object2_type: Mapped[str] = mapped_column(String(50), nullable=False)
    tca: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    miss_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    relative_velocity_km_s: Mapped[float] = mapped_column(Float, nullable=False)
    collision_probability: Mapped[float] = mapped_column(Float, nullable=False)
    tca_altitude_km: Mapped[float] = mapped_column(Float, nullable=False)
    tca_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    tca_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    covariance_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    alerts = relationship("Alert", back_populates="conjunction", cascade="all, delete-orphan")
