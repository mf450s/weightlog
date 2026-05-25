# WeightLog

Minimalist weight tracking app. Offline-first, ship-ready.

**Backend:** FastAPI + SQLite  
**Frontend:** Expo (React Native) — iOS + Android

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8001
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/entries` | Create entry |
| GET | `/api/entries` | List entries (paginated, filterable) |
| GET | `/api/entries/{id}` | Get single entry |
| PUT | `/api/entries/{id}` | Update entry |
| DELETE | `/api/entries/{id}` | Delete entry |
| PUT | `/api/entries/by-date/{date}` | Upsert by date |
| GET | `/api/stats` | Statistics (min, max, avg, BMI, trend) |
| GET | `/api/settings` | User settings |
| PUT | `/api/settings` | Update settings (height, target, unit) |
| GET | `/api/export` | CSV export |

## Features

- Log daily weight
- View history with interactive chart
- Track BMI (with height setting)
- Target weight progress tracking
- Offline-first: works without backend, syncs when connected
- kg/lbs toggle
- Dark mode UI
- CSV export
