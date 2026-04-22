"""APScheduler job for hourly satellite vs debris scans."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.alert import Alert
from app.models.conjunction import Conjunction
from app.models.debris import Debris
from app.models.satellite import Satellite
from app.services.collision_math import analyze_conjunction

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None


async def run_hourly_scan() -> None:
    """Scan all satellite/debris pairs over 24 hours and persist non-green events."""
    total_pairs = 0
    conjunctions_saved = 0
    alerts_raised = 0

    async with AsyncSessionLocal() as db:
        satellite_result = await db.execute(
            select(Satellite).where(
                Satellite.is_active.is_(True),
                Satellite.tle_line1.is_not(None),
                Satellite.tle_line2.is_not(None),
            )
        )
        debris_result = await db.execute(
            select(Debris).where(Debris.tle_line1.is_not(None), Debris.tle_line2.is_not(None))
        )

        satellites = list(satellite_result.scalars().all())
        debris_objects = list(debris_result.scalars().all())
        scan_start_time = datetime.now(timezone.utc)

        for satellite in satellites:
            for debris in debris_objects:
                total_pairs += 1
                try:
                    conjunction = await asyncio.to_thread(
                        analyze_conjunction,
                        satellite.tle_line1,
                        satellite.tle_line2,
                        satellite.name,
                        debris.tle_line1,
                        debris.tle_line2,
                        debris.name,
                        scan_start_time,
                        24,
                        60,
                        10.0,
                        debris.size_m or 1.0,
                        settings.default_position_uncertainty_km,
                    )
                except ValueError as exc:
                    logger.warning(
                        "Skipping pair satellite=%s debris=%s because propagation failed: %s",
                        satellite.norad_id,
                        debris.norad_id,
                        exc,
                    )
                    continue

                if conjunction is None or conjunction.risk_level == "GREEN":
                    continue

                conjunction_record = Conjunction(
                    object1_norad=satellite.norad_id,
                    object1_name=satellite.name,
                    object1_type="SATELLITE",
                    object2_norad=debris.norad_id,
                    object2_name=debris.name,
                    object2_type=debris.object_type,
                    tca=conjunction.tca_time,
                    miss_distance_km=conjunction.miss_distance_km,
                    relative_velocity_km_s=conjunction.relative_velocity_km_s,
                    collision_probability=conjunction.collision_probability,
                    tca_altitude_km=conjunction.tca_altitude_km,
                    tca_latitude=conjunction.tca_latitude_deg,
                    tca_longitude=conjunction.tca_longitude_deg,
                    risk_level=conjunction.risk_level,
                    covariance_data=json.dumps(
                        {
                            "method": "chan_2d_circular",
                            "position_uncertainty_km": settings.default_position_uncertainty_km,
                        }
                    ),
                )
                db.add(conjunction_record)
                await db.flush()
                conjunctions_saved += 1

                if conjunction.risk_level in {"ORANGE", "RED"}:
                    hours_to_tca = max(
                        0.0,
                        (conjunction.tca_time - datetime.now(timezone.utc)).total_seconds() / 3600.0,
                    )
                    alert = Alert(
                        conjunction_id=conjunction_record.id,
                        satellite_norad=satellite.norad_id,
                        satellite_name=satellite.name,
                        threat_norad=debris.norad_id,
                        threat_name=debris.name,
                        risk_level=conjunction.risk_level,
                        collision_probability=conjunction.collision_probability,
                        miss_distance_km=conjunction.miss_distance_km,
                        time_to_conjunction_hours=hours_to_tca,
                        message=(
                            f"{conjunction.risk_level} risk conjunction predicted between "
                            f"{satellite.name} and {debris.name}."
                        ),
                    )
                    db.add(alert)
                    alerts_raised += 1

        await db.commit()

    logger.info(
        "Hourly scan complete: pairs_scanned=%d conjunctions_saved=%d alerts_raised=%d",
        total_pairs,
        conjunctions_saved,
        alerts_raised,
    )


def start_scheduler() -> None:
    """Initialize and start the asynchronous scheduler with hourly scans."""
    global _scheduler

    if _scheduler is not None:
        return

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        run_hourly_scan,
        trigger="interval",
        hours=settings.scan_interval_hours,
        id="hourly_conjunction_scan",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler started with interval=%d hour(s)", settings.scan_interval_hours)


def stop_scheduler() -> None:
    """Stop the running scheduler instance if active."""
    global _scheduler

    if _scheduler is None:
        return

    _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("APScheduler stopped")
