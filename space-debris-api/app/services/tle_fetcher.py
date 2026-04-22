"""Utilities for fetching and parsing TLE catalogs."""

from __future__ import annotations

from typing import Any

import httpx


SAMPLE_SATELLITES: list[dict[str, Any]] = [
    {
        "norad_id": 25544,
        "name": "ISS (ZARYA)",
        "operator": "NASA / Roscosmos",
        "country": "INTL",
        "source_country": "INTL",
        "orbit_type": "LEO",
        "tle_line1": "1 25544U 98067A   24001.00000000  .00002182  00000-0  40768-4 0  9990",
        "tle_line2": "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000000000",
        "size_m": 109.0,
        "mass_kg": 419725.0,
        "altitude_km": 420.0,
        "inclination_deg": 51.6416,
        "period_min": 92.90,
        "is_active": True,
    },
    {
        "norad_id": 43226,
        "name": "STARLINK-1",
        "operator": "SpaceX",
        "country": "US",
        "source_country": "US",
        "orbit_type": "LEO",
        "tle_line1": "1 43226U 18020A   24001.50000000  .00010000  00000-0  10000-3 0  9999",
        "tle_line2": "2 43226  53.0000 100.0000 0001000  90.0000 270.0000 15.05000000000000",
        "size_m": 3.2,
        "mass_kg": 260.0,
        "altitude_km": 550.0,
        "inclination_deg": 53.0,
        "period_min": 95.68,
        "is_active": True,
    },
    {
        "norad_id": 39084,
        "name": "GOES-15",
        "operator": "NOAA",
        "country": "US",
        "source_country": "US",
        "orbit_type": "GEO",
        "tle_line1": "1 39084U 13018A   24001.00000000 -.00000292  00000-0  00000-0 0  9998",
        "tle_line2": "2 39084   0.0500 105.1000 0000800 200.0000 160.0000  1.00273000000000",
        "size_m": 6.2,
        "mass_kg": 3180.0,
        "altitude_km": 35786.0,
        "inclination_deg": 0.05,
        "period_min": 1436.0,
        "is_active": True,
    },
]

SAMPLE_DEBRIS: list[dict[str, Any]] = [
    {
        "norad_id": 20580,
        "name": "SL-8 R/B",
        "object_type": "ROCKET BODY",
        "tle_line1": "1 20580U 90034B   24001.00000000  .00000087  00000-0  10000-4 0  9991",
        "tle_line2": "2 20580  82.9300 100.0000 0014000  30.0000 330.0000 13.72000000000000",
        "size_m": 2.6,
        "mass_kg": 950.0,
        "radar_cross_section": 8.0,
        "altitude_km": 880.0,
        "inclination_deg": 82.93,
        "eccentricity": 0.0014,
        "period_min": 104.96,
        "source_country": "SU",
        "launch_year": 1990,
        "parent_object": "COSMOS",
    },
    {
        "norad_id": 36828,
        "name": "FENGYUN 1C DEB",
        "object_type": "DEBRIS",
        "tle_line1": "1 36828U 99025AJD  24001.00000000  .00000500  00000-0  50000-4 0  9992",
        "tle_line2": "2 36828  98.5000 200.0000 0020000  45.0000 315.0000 14.20000000000000",
        "size_m": 0.35,
        "mass_kg": 3.5,
        "radar_cross_section": 0.12,
        "altitude_km": 840.0,
        "inclination_deg": 98.5,
        "eccentricity": 0.002,
        "period_min": 101.41,
        "source_country": "CN",
        "launch_year": 1999,
        "parent_object": "FENGYUN 1C",
    },
    {
        "norad_id": 33442,
        "name": "COSMOS 2251 DEB",
        "object_type": "DEBRIS",
        "tle_line1": "1 33442U 09004ANA  24001.00000000  .00001000  00000-0  15000-3 0  9993",
        "tle_line2": "2 33442  74.0000 150.0000 0050000  60.0000 300.0000 14.50000000000000",
        "size_m": 0.45,
        "mass_kg": 4.0,
        "radar_cross_section": 0.25,
        "altitude_km": 790.0,
        "inclination_deg": 74.0,
        "eccentricity": 0.005,
        "period_min": 99.31,
        "source_country": "RU",
        "launch_year": 2009,
        "parent_object": "COSMOS 2251",
    },
    {
        "norad_id": 34430,
        "name": "IRIDIUM 33 DEB",
        "object_type": "DEBRIS",
        "tle_line1": "1 34430U 97051CE  24001.00000000  .00001500  00000-0  20000-3 0  9994",
        "tle_line2": "2 34430  86.4000 180.0000 0030000  75.0000 285.0000 14.35000000000000",
        "size_m": 0.40,
        "mass_kg": 3.8,
        "radar_cross_section": 0.18,
        "altitude_km": 770.0,
        "inclination_deg": 86.4,
        "eccentricity": 0.003,
        "period_min": 100.35,
        "source_country": "US",
        "launch_year": 1997,
        "parent_object": "IRIDIUM 33",
    },
]


async def fetch_active_satellites() -> list[dict[str, Any]]:
    """Fetch active satellites from CelesTrak and fallback to sample data on failure."""
    url = "https://celestrak.org/SOCRATES/"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            parsed = _parse_three_line_tle(response.text)
            if not parsed:
                raise ValueError("No valid TLE records were parsed from CelesTrak response.")
            return parsed
    except Exception:
        return [record.copy() for record in SAMPLE_SATELLITES]


def _parse_three_line_tle(payload: str) -> list[dict[str, Any]]:
    """Parse a text payload formatted as repeating NAME/L1/L2 TLE blocks."""
    lines = [line.strip() for line in payload.splitlines() if line.strip()]
    records: list[dict[str, Any]] = []

    for index in range(0, len(lines) - 2, 3):
        name = lines[index]
        line1 = lines[index + 1]
        line2 = lines[index + 2]

        if not line1.startswith("1 ") or not line2.startswith("2 "):
            continue

        norad_token = line1[2:7].strip()
        if not norad_token.isdigit():
            continue

        records.append(
            {
                "name": name,
                "norad_id": int(norad_token),
                "tle_line1": line1,
                "tle_line2": line2,
                "orbit_type": "UNKNOWN",
                "country": "UNKNOWN",
                "operator": "UNKNOWN",
                "size_m": 1.0,
                "mass_kg": 1.0,
                "altitude_km": None,
                "inclination_deg": None,
                "period_min": None,
                "is_active": True,
            }
        )

    return records
