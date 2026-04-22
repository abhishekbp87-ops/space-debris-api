"""Collision probability and conjunction analysis utilities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import math
from typing import Any

import numpy as np
from scipy.integrate import quad

from app.services.orbital_propagator import OrbitalState, propagate_interval


@dataclass(slots=True)
class ConjunctionResult:
    """Container for conjunction analysis outputs around time of closest approach."""

    object1_name: str
    object2_name: str
    tca_time: datetime
    miss_distance_km: float
    relative_velocity_km_s: float
    collision_probability: float
    risk_level: str
    tca_altitude_km: float
    tca_latitude_deg: float
    tca_longitude_deg: float
    approach_data: list[dict[str, Any]]


def compute_miss_distance(state1: OrbitalState, state2: OrbitalState) -> float:
    """Compute Euclidean miss distance between two ECI position vectors."""
    vector1 = np.array(state1.position_km)
    vector2 = np.array(state2.position_km)
    return float(np.linalg.norm(vector1 - vector2))


def compute_relative_velocity(state1: OrbitalState, state2: OrbitalState) -> float:
    """Compute relative speed magnitude between two ECI velocity vectors."""
    vector1 = np.array(state1.velocity_km_s)
    vector2 = np.array(state2.velocity_km_s)
    return float(np.linalg.norm(vector1 - vector2))


def find_tca(states1: list[OrbitalState], states2: list[OrbitalState]) -> tuple[int, float]:
    """Find the index and miss distance of time of closest approach in paired trajectories."""
    if not states1 or not states2:
        raise ValueError("State arrays must not be empty.")

    minimum_length = min(len(states1), len(states2))
    min_index = 0
    min_distance = float("inf")

    for index in range(minimum_length):
        current_distance = compute_miss_distance(states1[index], states2[index])
        if current_distance < min_distance:
            min_distance = current_distance
            min_index = index

    return min_index, min_distance


def collision_probability_chan(
    miss_distance_km: float,
    relative_velocity_km_s: float,
    combined_radius_m: float,
    position_uncertainty_km: float,
) -> float:
    """Estimate collision probability using Chan's 2D Gaussian circular approximation."""
    if position_uncertainty_km <= 0:
        raise ValueError("position_uncertainty_km must be greater than zero.")

    sigma = float(position_uncertainty_km)
    u = float(miss_distance_km) / sigma
    v = (float(combined_radius_m) / 1000.0) / sigma

    if v <= 0:
        return 0.0

    if u > 10.0:
        pc = ((v * v) / (u * sigma)) * math.exp(-(u * u) / 2.0) / math.sqrt(2.0 * math.pi)
    else:
        def integrand(theta: float) -> float:
            """Angular integrand used in Chan's circular probability expression."""
            return math.exp(-0.5 * (((u + (v * math.cos(theta))) ** 2) + ((v * math.sin(theta)) ** 2)))

        result, _ = quad(integrand, 0.0, 2.0 * math.pi, limit=200)
        pc = result * (v * v) / (2.0 * math.pi * sigma * sigma)

    # Relative velocity is not directly used in this simplified closed-form method,
    # but retained in the signature for API completeness and future model upgrades.
    _ = relative_velocity_km_s

    if math.isnan(pc) or math.isinf(pc):
        return 0.0

    return float(min(1.0, max(0.0, pc)))


def get_risk_level(pc: float) -> str:
    """Classify risk level from collision probability thresholds."""
    if pc >= 0.01:
        return "RED"
    if pc >= 0.001:
        return "ORANGE"
    if pc >= 0.0001:
        return "YELLOW"
    return "GREEN"


def analyze_conjunction(
    tle1_l1: str,
    tle1_l2: str,
    name1: str,
    tle2_l1: str,
    tle2_l2: str,
    name2: str,
    start_time: datetime,
    duration_hours: int,
    step_seconds: int,
    object1_size_m: float,
    object2_size_m: float,
    position_uncertainty_km: float,
) -> ConjunctionResult | None:
    """Propagate two objects and compute conjunction metrics within a scan window."""
    if duration_hours <= 0:
        raise ValueError("duration_hours must be greater than zero.")
    if step_seconds <= 0:
        raise ValueError("step_seconds must be greater than zero.")

    if start_time.tzinfo is None:
        start_utc = start_time.replace(tzinfo=timezone.utc)
    else:
        start_utc = start_time.astimezone(timezone.utc)

    end_time = start_utc + timedelta(hours=duration_hours)

    states1 = propagate_interval(tle1_l1, tle1_l2, start_utc, end_time, step_seconds)
    states2 = propagate_interval(tle2_l1, tle2_l2, start_utc, end_time, step_seconds)

    if not states1 or not states2:
        return None

    tca_index, miss_distance_km = find_tca(states1, states2)
    relative_velocity_km_s = compute_relative_velocity(states1[tca_index], states2[tca_index])

    combined_radius_m = max((float(object1_size_m) + float(object2_size_m)) / 2.0, 0.01)
    pc = collision_probability_chan(
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=relative_velocity_km_s,
        combined_radius_m=combined_radius_m,
        position_uncertainty_km=position_uncertainty_km,
    )
    risk_level = get_risk_level(pc)

    tca_state_1 = states1[tca_index]
    tca_state_2 = states2[tca_index]
    tca_time = tca_state_1.time
    tca_altitude_km = (tca_state_1.altitude_km + tca_state_2.altitude_km) / 2.0
    tca_latitude_deg = (tca_state_1.latitude_deg + tca_state_2.latitude_deg) / 2.0
    tca_longitude_deg = (tca_state_1.longitude_deg + tca_state_2.longitude_deg) / 2.0

    approach_data: list[dict[str, Any]] = []
    start_index = max(0, tca_index - 5)
    end_index = min(len(states1) - 1, tca_index + 5)

    for index in range(start_index, end_index + 1):
        if index == tca_index:
            continue
        state1 = states1[index]
        state2 = states2[index]
        approach_data.append(
            {
                "time_utc": state1.time,
                "miss_distance_km": compute_miss_distance(state1, state2),
                "relative_velocity_km_s": compute_relative_velocity(state1, state2),
                "object1_position_km": state1.position_km,
                "object2_position_km": state2.position_km,
            }
        )

    return ConjunctionResult(
        object1_name=name1,
        object2_name=name2,
        tca_time=tca_time,
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=relative_velocity_km_s,
        collision_probability=pc,
        risk_level=risk_level,
        tca_altitude_km=tca_altitude_km,
        tca_latitude_deg=tca_latitude_deg,
        tca_longitude_deg=tca_longitude_deg,
        approach_data=approach_data,
    )
