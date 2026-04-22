"""Alert ORM model."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Alert(Base):
    """Represents an operational warning derived from a conjunction event."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conjunction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conjunctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    satellite_norad: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    satellite_name: Mapped[str] = mapped_column(String(255), nullable=False)
    threat_norad: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    threat_name: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    collision_probability: Mapped[float] = mapped_column(Float, nullable=False)
    miss_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    time_to_conjunction_hours: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    conjunction = relationship("Conjunction", back_populates="alerts")
