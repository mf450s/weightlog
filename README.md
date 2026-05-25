# OpenWeights — Mobile Frontend

Expo (React Native) frontend for the [openweightsbackend](https://github.com/mf450s/openweightsbackend) workout tracker.

iOS + Android. Dark, minimal, gym-ready.

## Backend

This is the **frontend only**. The backend lives at:
https://github.com/mf450s/openweightsbackend (branch: `development`)

## Quick Start

```bash
cd frontend
npm install
npx expo start
```

Configure the backend URL in `lib/api.ts` (`BASE` constant). Defaults to `localhost:8000` (iOS) / `10.0.2.2:8000` (Android).

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Auth | `/auth` | Register / Login |
| Dashboard | `/` | Active session, recent workouts, quick stats |
| Active Workout | `/workout` | Log sets: kg, reps, RIR. Save / finish. Template support. |
| Session Detail | `/session/[id]` | View past session with volume stats |
| Exercises | `/exercises` | Browse, create exercises with muscle region |
| Templates | `/templates` | Workout templates → quick start with pre-filled exercises |
| History | `/history` | All past sessions, grouped by month |
| Settings | `/settings` | Profile, password, account deletion |

## Architecture

- **expo-router** — file-based routing
- **AsyncStorage** — auth token persistence
- **JWT auth** — Bearer token in all API calls, auto-refresh on 401
- **Offline-first** — not yet implemented (API calls fail gracefully)

## API

All endpoints under `/api/v1/` — see openweightsbackend Swagger at `/docs`.
