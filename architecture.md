# Architecture — Calisthenics Progression Tracker

## 1. Overview

```
┌─────────────────────────────────────────┐
│  Client — PWA (HTML/CSS/JS + Chart.js)   │
│  - Renders workout day, logs sets        │
│  - Local timer for hold-based exercises  │
│  - Writes every log to localStorage      │
│    FIRST, then syncs to backend          │
│  - Service worker: offline shell caching │
└───────────────┬───────────────────────────┘
                │  fetch() JSON, only when online
                ▼
┌─────────────────────────────────────────┐
│  Backend — Flask REST API                │
│  Endpoints:                              │
│   GET  /exercises                        │
│   GET  /exercises/:id/logs               │
│   POST /logs                             │
│   GET  /export  (JSON dump)              │
└───────────────┬───────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  SQLite (single file, e.g. tracker.db)   │
│  Tables: exercises, logs, progressions   │
└─────────────────────────────────────────┘
```

Single user, no auth layer in MVP — Flask API is not exposed publicly beyond your own device/network unless Phase 3 adds auth.

## 2. Data Model

**exercises**
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | e.g. "Tuck Front Lever" |
| day | TEXT | Push / Pull / Legs / Full Body / Active Recovery |
| type | TEXT | `reps` or `duration` — determines which logging UI shows |
| prerequisite_id | INTEGER FK → exercises.id, nullable | supports future skill-tree UI (Phase 3), unused in MVP UI but must exist now |
| next_id | INTEGER FK → exercises.id, nullable | same as above |

**logs**
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| exercise_id | INTEGER FK | |
| timestamp | DATETIME | |
| reps | INTEGER, nullable | used if exercise.type = reps |
| weight_kg | REAL, nullable | optional even for reps-type |
| duration_sec | INTEGER, nullable | used if exercise.type = duration |
| rpe | INTEGER, nullable | 1-10, optional |
| synced | BOOLEAN | local-only flag, not stored server-side — see sync note below |

**Why one `logs` table instead of splitting reps/duration into separate tables:** a single exercise's history should render on one chart regardless of type; splitting tables makes the query layer (and future exercise-type changes) more complex for no real benefit at this scale.

## 3. Offline Sync Approach (the one genuinely tricky integration point)

1. Every log action writes to `localStorage` immediately — this is the source of truth for "did my log succeed," never wait on network.
2. A background sync function runs on: app load, tab focus, and every 30s while a session is active.
3. Sync pushes any `localStorage` entries not yet confirmed synced to `POST /logs`; on success, marks them synced and eventually clears them.
4. If `POST /logs` is called twice for the same local entry (e.g. flaky connection), the client sends a locally-generated UUID per log; the backend treats `client_uuid` as a unique constraint to prevent duplicate rows.

This means the backend needs one extra column not shown above: `logs.client_uuid TEXT UNIQUE`.

## 4. Chart Rendering
- `GET /exercises/:id/logs` returns raw log rows.
- Client aggregates client-side (e.g. max duration per session, or estimated volume = reps × weight) and feeds Chart.js. Keep aggregation logic in one JS module so the "what counts as progress" definition lives in exactly one place — you'll want to tweak this metric as you go.

## 5. Deployment
- Flask app + SQLite file on any always-on machine you control (or a free-tier host). No horizontal scaling needed — single user, low write volume.
- PWA manifest + service worker so it installs to home screen; this is what makes offline logging actually feel native rather than "a website that broke."

## 6. Explicit Non-Architecture (things not to build yet)
- No auth layer, no multi-tenant data isolation — adding this later means every table needs a `user_id`, which is a mechanical but real migration; don't pre-build it speculatively.
- No queue/worker system — write volume is far too low to need one.
- No microservice split — Flask + SQLite in one process is correct at this scale; splitting further is premature.
