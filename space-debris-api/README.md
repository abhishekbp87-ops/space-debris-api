# Space Debris Collision Prediction API

A production-ready FastAPI microservice for satellite and space debris conjunction analysis. The service propagates TLEs with SGP4, finds Time of Closest Approach (TCA), computes collision probability with Chan's approximation, classifies risk, persists conjunction records, and raises operational alerts.

## Real-World Use Cases

- Mission operations risk screening for active satellites against debris catalogs.
- Automated conjunction watchlists with hourly background scanning.
- Safety dashboards that need current orbital position, risk score, and alert status.
- Rapid pre-maneuver assessment from raw TLE pairs.

## Prerequisites

- Python 3.11+
- `pip`

## Installation

```bash
git clone <your-repo-url>
cd space-debris-api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

If you are on Windows PowerShell, activate with:

```powershell
venv\Scripts\Activate.ps1
```

## Quick Start

1. Seed satellites:

```bash
curl -X POST http://127.0.0.1:8000/satellites/seed
```

2. Seed debris:

```bash
curl -X POST http://127.0.0.1:8000/debris/seed
```

3. Run a raw TLE collision prediction:

```bash
curl -X POST http://127.0.0.1:8000/predict/collision \
  -H "Content-Type: application/json" \
  -d '{
    "object1": {
      "name": "ISS",
      "tle_line1": "1 25544U 98067A   24001.00000000  .00002182  00000-0  40768-4 0  9990",
      "tle_line2": "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000000000",
      "size_m": 109.0
    },
    "object2": {
      "name": "FENGYUN 1C DEB",
      "tle_line1": "1 36828U 99025AJD  24001.00000000  .00000500  00000-0  50000-4 0  9992",
      "tle_line2": "2 36828  98.5000 200.0000 0020000  45.0000 315.0000 14.20000000000000",
      "size_m": 0.35
    },
    "duration_hours": 72,
    "step_seconds": 60,
    "position_uncertainty_km": 0.5
  }'
```

4. Check next 24h conjunctions:

```bash
curl http://127.0.0.1:8000/conjunctions/today
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API info, version, and endpoint map |
| GET | `/health` | Service health and UTC timestamp |
| GET | `/stats` | Capabilities, thresholds, data sources |
| GET | `/satellites/` | List satellites (filter by orbit type, skip, limit) |
| GET | `/satellites/count` | Total satellite count |
| GET | `/satellites/{norad_id}` | Get one satellite |
| GET | `/satellites/{norad_id}/position` | Propagated current position |
| GET | `/satellites/{norad_id}/orbital-elements` | Derived orbital elements |
| POST | `/satellites/` | Create satellite |
| POST | `/satellites/seed` | Seed built-in sample satellites |
| DELETE | `/satellites/{norad_id}` | Delete satellite |
| GET | `/debris/` | List debris (type, altitude range, country filters) |
| GET | `/debris/count` | Total debris count + breakdown by type |
| GET | `/debris/heatmap` | Debris count per 100 km altitude band (200-2100 km) |
| GET | `/debris/{norad_id}` | Get one debris object |
| GET | `/debris/{norad_id}/position` | Propagated current position |
| POST | `/debris/` | Create debris object |
| POST | `/debris/seed` | Seed built-in sample debris |
| DELETE | `/debris/{norad_id}` | Delete debris object |
| POST | `/predict/collision` | Full conjunction analysis from raw TLE input |
| POST | `/predict/satellite-vs-debris` | Lookup by NORAD, run conjunction, save to DB |
| GET | `/predict/risk-score/{satellite_norad}` | Aggregated risk score for a satellite |
| GET | `/conjunctions/` | List conjunction history (risk level, hours ahead filters) |
| GET | `/conjunctions/today` | Next 24h conjunctions + risk summary |
| GET | `/conjunctions/{id}` | Get one conjunction |
| GET | `/alerts/` | List alerts (risk and acknowledgment filters) |
| POST | `/alerts/{id}/acknowledge` | Acknowledge one alert |
| GET | `/alerts/summary` | Alert counts by risk level |

## Risk Levels

| Risk Level | Collision Probability (Pc) |
|---|---|
| GREEN | `Pc < 0.0001` |
| YELLOW | `0.0001 <= Pc < 0.001` |
| ORANGE | `0.001 <= Pc < 0.01` |
| RED | `Pc >= 0.01` |

## Physics and Math Overview

### 1) SGP4 Orbit Propagation

- TLE lines are parsed with `sgp4==2.23`.
- For each UTC timestamp, position and velocity are propagated in ECI coordinates.
- Altitude is computed as `|r| - EarthRadius` with Earth radius = 6371 km.
- ECI to latitude/longitude conversion uses GMST:
  - `GMST = 280.46061837 + 360.98564736629 * days_since_J2000`

### 2) Time of Closest Approach (TCA)

- Two trajectories are sampled over a time window.
- Miss distance is computed at each step.
- Minimum miss distance index is selected as TCA.

### 3) Collision Probability (Chan Approximation)

- Uses 2D Gaussian circular approximation with uncertainty `sigma`.
- For very large normalized miss distance (`u > 10`), a tail approximation is used.
- Otherwise, angular integration is computed with `scipy.integrate.quad`.
- Result is clamped to `[0, 1]` and mapped to risk levels.

## Background Hourly Scan (APScheduler)

- Scheduler runs every 1 hour.
- For each active satellite x debris pair:
  - Analyze conjunction over next 24h with 60s step.
  - Save non-GREEN conjunctions.
  - Create alerts for ORANGE and RED events.

## Docker Usage

Build and run:

```bash
docker-compose up --build
```

API will be available at:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Running Tests

```bash
pytest tests/ -v
```

## Example `.env`

```env
APP_NAME=Space Debris Collision Prediction API
APP_VERSION=1.0.0
DATABASE_URL=sqlite+aiosqlite:///./space_debris.db
DB_ECHO=false
SCHEDULER_ENABLED=true
SCAN_INTERVAL_HOURS=1
DEFAULT_POSITION_UNCERTAINTY_KM=0.5
CORS_ORIGINS=*
```

## Notes

- All datetime values are handled in UTC.
- All DB access is async via SQLAlchemy 2.0 async APIs.
- Swagger UI is available at `/docs`.
