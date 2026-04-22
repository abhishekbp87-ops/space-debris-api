"""Orbital propagation utilities built on SGP4."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import atan2, cos, degrees, radians, sin, sqrt

import numpy as np
from sgp4.api import SGP4_ERRORS, Satrec, jday

EARTH_RADIUS_KM = 6371.0
J2000_JULIAN_DAY = 2451545.0
MU_EARTH_KM3_S2 = 398600.4418


@dataclass(slots=True)
class OrbitalState:
    """Represents a propagated orbital state at a specific UTC time."""

    time: datetime
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]
    altitude_km: float
    latitude_deg: float
    longitude_deg: float
    speed_km_s: float


def parse_tle(line1: str, line2: str) -> Satrec:
    """Parse two TLE lines into an SGP4 `Satrec` object."""
    cleaned_line1 = line1.strip()
    cleaned_line2 = line2.strip()
    if not cleaned_line1.startswith("1 ") or not cleaned_line2.startswith("2 "):
        raise ValueError("Invalid TLE format: line1 must start with '1 ' and line2 with '2 '.")
    try:
        return Satrec.twoline2rv(cleaned_line1, cleaned_line2)
    except Exception as exc:  # pragma: no cover - defensive exception wrapping
        raise ValueError(f"Unable to parse TLE lines: {exc}") from exc


def datetime_to_jday(dt: datetime) -> tuple[float, float]:
    """Convert a timezone-aware datetime into Julian day and fractional day values."""
    if dt.tzinfo is None:
        raise ValueError("Datetime must be timezone-aware and in UTC.")
    utc_dt = dt.astimezone(timezone.utc)
    second = utc_dt.second + (utc_dt.microsecond / 1_000_000)
    jd, fr = jday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour, utc_dt.minute, second)
    return float(jd), float(fr)


def _eci_to_geodetic(x_km: float, y_km: float, z_km: float, jd: float, fr: float) -> tuple[float, float]:
    """Convert ECI coordinates into approximate geodetic latitude/longitude."""
    days_since_j2000 = (jd + fr) - J2000_JULIAN_DAY
    gmst_deg = 280.46061837 + (360.98564736629 * days_since_j2000)
    gmst_rad = radians(gmst_deg % 360.0)

    x_ecef = (x_km * cos(gmst_rad)) + (y_km * sin(gmst_rad))
    y_ecef = (-x_km * sin(gmst_rad)) + (y_km * cos(gmst_rad))
    z_ecef = z_km

    longitude_deg = degrees(atan2(y_ecef, x_ecef))
    latitude_deg = degrees(atan2(z_ecef, sqrt((x_ecef * x_ecef) + (y_ecef * y_ecef))))

    normalized_longitude = ((longitude_deg + 180.0) % 360.0) - 180.0
    return latitude_deg, normalized_longitude


def propagate(tle_line1: str, tle_line2: str, dt: datetime) -> OrbitalState:
    """Propagate a TLE to a UTC datetime and return a full orbital state."""
    sat = parse_tle(tle_line1, tle_line2)
    jd, fr = datetime_to_jday(dt)
    error_code, position, velocity = sat.sgp4(jd, fr)
    if error_code != 0:
        error_description = SGP4_ERRORS.get(error_code, "Unknown SGP4 error")
        raise ValueError(f"SGP4 propagation failed (code {error_code}): {error_description}")

    x_km, y_km, z_km = (float(position[0]), float(position[1]), float(position[2]))
    vx_km_s, vy_km_s, vz_km_s = (float(velocity[0]), float(velocity[1]), float(velocity[2]))

    radius_km = sqrt((x_km * x_km) + (y_km * y_km) + (z_km * z_km))
    altitude_km = radius_km - EARTH_RADIUS_KM
    speed_km_s = float(np.linalg.norm(np.array([vx_km_s, vy_km_s, vz_km_s])))

    latitude_deg, longitude_deg = _eci_to_geodetic(x_km, y_km, z_km, jd, fr)

    return OrbitalState(
        time=dt.astimezone(timezone.utc),
        position_km=(x_km, y_km, z_km),
        velocity_km_s=(vx_km_s, vy_km_s, vz_km_s),
        altitude_km=altitude_km,
        latitude_deg=latitude_deg,
        longitude_deg=longitude_deg,
        speed_km_s=speed_km_s,
    )


def propagate_interval(
    tle_line1: str,
    tle_line2: str,
    start: datetime,
    end: datetime,
    step_seconds: int,
) -> list[OrbitalState]:
    """Propagate a TLE over a time interval with a fixed sampling period."""
    if step_seconds <= 0:
        raise ValueError("step_seconds must be greater than zero.")
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("Start and end datetimes must be timezone-aware.")
    if end < start:
        raise ValueError("End datetime must be greater than or equal to start datetime.")

    states: list[OrbitalState] = []
    current = start
    while current <= end:
        states.append(propagate(tle_line1, tle_line2, current))
        current += timedelta(seconds=step_seconds)

    return states


def get_orbital_elements(tle_line1: str, tle_line2: str) -> dict[str, float]:
    """Extract key orbital elements and derived values from TLE data."""
    sat = parse_tle(tle_line1, tle_line2)

    inclination_deg = degrees(float(sat.inclo))
    raan_deg = degrees(float(sat.nodeo))
    arg_perigee_deg = degrees(float(sat.argpo))
    eccentricity = float(sat.ecco)
    bstar_drag = float(sat.bstar)

    mean_motion_rev_per_day = float(sat.no_kozai) * (1440.0 / (2.0 * np.pi))
    period_min = 1440.0 / mean_motion_rev_per_day

    mean_motion_rad_per_sec = mean_motion_rev_per_day * (2.0 * np.pi) / 86400.0
    semi_major_axis_km = (MU_EARTH_KM3_S2 / (mean_motion_rad_per_sec**2)) ** (1.0 / 3.0)
    approx_altitude_km = semi_major_axis_km - EARTH_RADIUS_KM

    return {
        "inclination": inclination_deg,
        "eccentricity": eccentricity,
        "raan": raan_deg,
        "arg_perigee": arg_perigee_deg,
        "mean_motion": mean_motion_rev_per_day,
        "period_min": period_min,
        "semi_major_axis_km": semi_major_axis_km,
        "approx_altitude_km": approx_altitude_km,
        "bstar_drag": bstar_drag,
    }
