# Architecture — CalistheniX

## 1. System Overview

CalistheniX uses a lightweight, decoupled local-first architecture designed for maximum reliability and zero gym-network dependencies:

```
┌─────────────────────────────────────────────────────────────┐
│                 Client — Pure Web Platform                  │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript                   │
│  - Chart.js for data visualization                          │
│  - Web Audio API (synthetic beeps) & Vibration API          │
│  - Optimistic Local-First writes (localStorage)             │
│  - Idempotent background sync queue                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend — Flask REST API                    │
│  - Python 3.10+ / Flask / Flask-CORS                        │
│  - Endpoints:                                               │
│    • GET  /exercises                                        │
│    • GET  /exercises/:id/logs                               │
│    • POST /logs                                             │
│    • GET  /exercises/:id/progression-status                 │
│    • GET  /routines                                         │
│    • GET  /routines/:name/levels                            │
│    • POST /routines/:name/levels                            │
│    • POST /routines/:name/levels/:level/exercises           │
│    • PUT  /level-exercises/:id                              │
│    • DELETE /level-exercises/:id                            │
│    • GET  /dashboard/summary                                │
│    • GET  /export                                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite3 Connection
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database — SQLite (tracker.db)              │
│  - PRAGMA foreign_keys = ON                                 │
│  - Tables: exercises, logs, routine_levels, level_exercises │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### `exercises`
Defines the global catalog of calisthenics exercises and their progression chain links.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique exercise identifier |
| `name` | `TEXT` | `NOT NULL` | Exercise name (e.g. "Diamond Push-ups") |
| `day` | `TEXT` | `NOT NULL` | Associated split category (`Push`, `Pull`, `Legs`, etc.) |
| `type` | `TEXT` | `NOT NULL` | `reps` or `duration` |
| `prerequisite_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Previous progression step |
| `next_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Next progression step |
| `progression_target_reps` | `INTEGER` | `NULLABLE` | Rep threshold required to advance |
| `progression_target_duration` | `INTEGER` | `NULLABLE` | Hold seconds required to advance |
| `progression_sessions_needed`| `INTEGER` | `DEFAULT 2` | Required consecutive sessions hitting target |

### `logs`
Stores recorded training sets and performance records.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique log record ID |
| `exercise_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Associated exercise |
| `timestamp` | `DATETIME` | `NOT NULL` | ISO 8601 timestamp of set completion |
| `reps` | `INTEGER` | `NULLABLE` | Rep count (if `type = reps`) |
| `weight_kg` | `REAL` | `NULLABLE` | Added load in kilograms (optional) |
| `duration_sec` | `INTEGER` | `NULLABLE` | Isometric hold time in seconds (if `type = duration`) |
| `rpe` | `INTEGER` | `NULLABLE` | Rate of Perceived Exertion (1–10) |
| `client_uuid` | `TEXT` | `UNIQUE NOT NULL` | Client-generated UUID for idempotent deduplication |

### `routine_levels`
Defines distinct difficulty tiers for each workout routine.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique routine level ID |
| `routine_name` | `TEXT` | `NOT NULL` | Split name (e.g. `Push A`, `Pull A`, `Legs B`) |
| `level` | `INTEGER` | `NOT NULL` | Level tier number (`1`–`5`) |
| *Composite* | — | `UNIQUE(routine_name, level)`| Enforces unique level per routine |

### `level_exercises`
Defines ordered exercise configurations within a routine level.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique level exercise slot ID |
| `routine_level_id`| `INTEGER` | `FOREIGN KEY → routine_levels.id` | Associated routine level |
| `exercise_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Associated exercise catalog item |
| `order_index` | `INTEGER` | `NOT NULL` | Order in the workout session |
| `sets` | `INTEGER` | `NOT NULL DEFAULT 3` | Target set count |
| `reps` | `INTEGER` | `NULLABLE` | Target rep count per set |
| `duration_sec` | `INTEGER` | `NULLABLE` | Target hold duration per set |
| `tempo` | `TEXT` | `NULLABLE` | Movement cadence (e.g. `3010`) |
| `rest_sec` | `INTEGER` | `NULLABLE DEFAULT 90` | Rest countdown timer in seconds |
| `superset_group` | `INTEGER` | `NULLABLE` | Superset identifier (`1`, `2`, null for standalone) |
| `notes` | `TEXT` | `NULLABLE` | Short tactical cues or notes |

---

## 3. Local-First Synchronization Engine

```
[ User Logs Set ]
       │
       ▼
[ localStorage: Append entry & mark synced=false ] ──> (UI instantly shows success checkmark)
       │
       ▼ (Immediate sync + 30s background timer + tab focus trigger)
[ POST /logs with client_uuid ]
       │
   ┌───┴──────────────┐
   ▼ (Success)        ▼ (Network Error / Offline)
[ Mark synced=true ]  [ Keep in localStorage queue for retry ]
```

### Key Guarantees:
1. **Zero UI Latency**: Logging never awaits a network round-trip.
2. **Idempotent Ingestion**: `client_uuid` unique constraint prevents duplicate rows even if network retries collide.
3. **Offline Survivability**: Logs remain securely buffered in `localStorage` indefinitely until connection to the Flask server is restored.

---

## 4. Audio & Haptic Feedback Architecture
CalistheniX incorporates non-visual gym feedback cues:
- **Web Audio API**: Synthetic audio oscillators generate short, crisp beeps at defined frequencies (440Hz, 880Hz, 1200Hz) without requiring external audio files.
- **Navigator Vibration API**: Patterned haptic vibrations (`[80, 50, 80]` ms) alert the athlete when hold durations finish or rest timers hit zero.
- **Mute Toggle**: Global mute state persisted in `localStorage` allows athletes to silence cues in public gym environments.

---

## 5. Security & Deployment Profile
- **Deployment**: Pure static frontend served by any web server (Python `http.server`, Nginx, Caddy) + Flask backend.
- **Network Surface**: Single-user design; intended for local machine usage or private home/tailscale network access.
- **Backup**: One-click JSON serialization exports the entire database state directly to the user's local filesystem.
