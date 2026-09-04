# Architecture & Technical Design — CalistheniX

## 1. System Overview

CalistheniX uses a lightweight, decoupled local-first architecture designed for maximum reliability, sub-millisecond response times, and zero gym-network dependencies:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Client — Pure Web Platform                        │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundler dependencies)   │
│  - Chart.js for data visualization                                      │
│  - Web Audio API (synthetic oscillators) + Vibration API for haptics    │
│  - PWA Service Worker (sw.js) for 100% offline asset caching            │
│  - Optimistic Local-First writes (localStorage)                         │
│  - Idempotent background sync queue with client UUID deduplication      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / JSON REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Backend — Flask REST API                          │
│  - Python 3.10+ / Flask / Flask-CORS (Port 5001)                        │
│  - Application Factory & Blueprint Modular Routing                      │
│  - Dynamic Today Resolver (/today) combining Split + Day of Week        │
│  - Custom Split, Weekly Schedule & Reusable Workout Management APIs     │
│  - Canonical workout_sessions lifecycle & idempotent set logging        │
│  - Weighted progression readiness scoring & promotion engine            │
│  - Backup export/import engine (Bundle v2.1)                            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ SQLite3 Connection (PRAGMA foreign_keys = ON)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Database — SQLite (backend/tracker.db)              │
│  - Tables: training_splits, weekly_schedules, workouts,                │
│    workout_exercises, exercises, workout_sessions, logs                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### `training_splits`
Defines named weekly training programs (e.g., *Push Pull Legs*, *Upper / Lower 4-Day*, *Full Body*).

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique split identifier |
| `name` | `TEXT` | `NOT NULL` | Split name (e.g. "Push Pull Legs PPL") |
| `description` | `TEXT` | `NULLABLE` | Tactical notes or focus areas |
| `is_active` | `INTEGER` | `NOT NULL DEFAULT 0` | `1` for the active program, `0` otherwise |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Split creation timestamp |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Split update timestamp |

### `weekly_schedules`
Defines 7-day Monday–Sunday schedule assignments for each training split.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique schedule slot identifier |
| `split_id` | `INTEGER` | `FOREIGN KEY → training_splits.id ON DELETE CASCADE` | Associated training split |
| `day_of_week` | `INTEGER` | `NOT NULL` | Day index (`0` = Monday .. `6` = Sunday) |
| `day_type` | `TEXT` | `NOT NULL DEFAULT 'workout'` | `workout` or `rest` |
| `workout_id` | `INTEGER` | `FOREIGN KEY → workouts.id ON DELETE SET NULL` | Assigned workout template (null for rest) |
| *Composite* | — | `UNIQUE(split_id, day_of_week)` | Enforces one configuration per day per split |

### `workouts`
Defines modular, reusable workout blueprints independent of calendar days.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique workout blueprint identifier |
| `name` | `TEXT` | `NOT NULL` | Workout name (e.g. "Push A", "Pull Power") |
| `description` | `TEXT` | `NULLABLE` | Workout focus and instructions |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

### `workout_exercises`
Defines ordered exercise slots within a workout across Warm-up, Main, and Cool-down phases.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique slot identifier |
| `workout_id` | `INTEGER` | `FOREIGN KEY → workouts.id ON DELETE CASCADE` | Associated workout blueprint |
| `exercise_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Associated catalog exercise |
| `order_index` | `INTEGER` | `NOT NULL` | Ordering sequence in the workout |
| `sets` | `INTEGER` | `NOT NULL DEFAULT 3` | Prescribed set count |
| `reps` | `INTEGER` | `NULLABLE` | Target rep count (for rep-based movements) |
| `duration_sec` | `INTEGER` | `NULLABLE` | Target hold time in seconds (for holds) |
| `rest_sec` | `INTEGER` | `NOT NULL DEFAULT 90` | Rest countdown duration in seconds |
| `tempo` | `TEXT` | `NULLABLE` | Movement cadence notation (e.g. `3010`) |
| `superset_group` | `INTEGER` | `NULLABLE` | Superset identifier (`1`, `2`, null for solo) |
| `notes` | `TEXT` | `NULLABLE` | Tactical form cues or coaching notes |
| `phase` | `TEXT` | `NOT NULL DEFAULT 'main'` | Workout phase: `warmup`, `main`, or `cooldown` |

### `exercises`
Defines the global catalog of calisthenics exercises, movement patterns, and progression chain links.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique exercise identifier |
| `name` | `TEXT` | `NOT NULL` | Exercise name (e.g. "Diamond Push-ups") |
| `day` | `TEXT` | `NOT NULL` | Category tag (e.g. `Push A`, `Pull A`, `Warm-up`) |
| `type` | `TEXT` | `NOT NULL` | Execution metric: `reps` or `duration` |
| `movement_pattern` | `TEXT` | `NOT NULL DEFAULT 'push_horizontal'` | Biomechanical movement pattern (`push_horizontal`, `push_vertical`, `pull_vertical`, `pull_horizontal`, `squat`, `lunge`, `hinge`, `core`, `hanging`, `hold_isometric`, `isolation`, `mobility`, `stretch`) |
| `prerequisite_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Previous progression movement |
| `next_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Next progression movement |
| `progression_target_reps` | `INTEGER` | `NULLABLE` | Rep threshold required to advance |
| `progression_target_duration` | `INTEGER` | `NULLABLE` | Hold seconds required to advance |
| `progression_sessions_needed`| `INTEGER` | `NOT NULL DEFAULT 2` | Consecutive sessions hitting target before promotion |

### `workout_sessions`
Stores immutable, canonical snapshots of completed training sessions with tri-phase duration breakdowns.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique session record ID |
| `session_uuid` | `TEXT` | `UNIQUE NOT NULL` | Client-generated UUID for deduplication |
| `routine_name` | `TEXT` | `NOT NULL` | Workout name executed |
| `level` | `INTEGER` | `NOT NULL DEFAULT 1` | Routine difficulty level |
| `started_at` | `DATETIME` | `NOT NULL` | ISO 8601 start timestamp |
| `completed_at` | `DATETIME` | `NULLABLE` | ISO 8601 completion timestamp |
| `duration_sec` | `INTEGER` | `DEFAULT 0` | Total elapsed training time in seconds |
| `warmup_duration_sec` | `INTEGER` | `DEFAULT 0` | Time spent in warm-up phase |
| `main_duration_sec` | `INTEGER` | `DEFAULT 0` | Time spent in main workout phase |
| `cooldown_duration_sec`| `INTEGER` | `DEFAULT 0` | Time spent in cool-down phase |
| `warmup_status` | `TEXT` | `DEFAULT 'none'` | `completed`, `skipped`, or `none` |
| `cooldown_status` | `TEXT` | `DEFAULT 'none'` | `completed`, `skipped`, or `none` |
| `total_sets` | `INTEGER` | `DEFAULT 0` | Total prescribed sets |
| `completed_sets` | `INTEGER` | `DEFAULT 0` | Total logged sets |
| `status` | `TEXT` | `NOT NULL DEFAULT 'completed'` | Session status (`completed`, `in_progress`) |
| `raw_json` | `TEXT` | `NULLABLE` | Complete client-side snapshot payload |

### `logs`
Stores individual completed sets with RPE, added load, hold duration, and phase metadata.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique log entry ID |
| `exercise_id` | `INTEGER` | `FOREIGN KEY → exercises.id` | Associated exercise |
| `timestamp` | `DATETIME` | `NOT NULL` | ISO 8601 set completion timestamp |
| `reps` | `INTEGER` | `NULLABLE` | Completed rep count (if `type = reps`) |
| `weight_kg` | `REAL` | `NULLABLE` | Added load in kilograms (optional) |
| `duration_sec` | `INTEGER` | `NULLABLE` | Isometric hold time in seconds (if `type = duration`) |
| `rpe` | `INTEGER` | `NULLABLE` | Rate of Perceived Exertion (1–10) |
| `client_uuid` | `TEXT` | `UNIQUE NOT NULL` | Client UUID for idempotent deduplication |
| `session_uuid` | `TEXT` | `NULLABLE` | Foreign link to parent `workout_sessions.session_uuid` |
| `phase` | `TEXT` | `NOT NULL DEFAULT 'main'` | Phase when set was logged (`warmup`, `main`, `cooldown`) |

---

## 3. Database Indexes & Query Optimization

To maintain sub-millisecond query execution on low-powered mobile devices and local environments, the following composite B-tree indexes are enforced:

```sql
CREATE INDEX IF NOT EXISTS idx_logs_exercise_timestamp ON logs(exercise_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_session_uuid ON logs(session_uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON workout_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON workout_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_split_day ON weekly_schedules(split_id, day_of_week);
```

---

## 4. Local-First Synchronization Engine

```
[ User Logs Set / Finishes Workout ]
                │
                ▼
[ localStorage: Append entry & mark synced=false ] ──> (UI updates instantly)
                │
                ▼ (Immediate sync + 30s background timer + tab focus trigger)
[ POST /logs or POST /workout_sessions with client_uuid ]
                │
        ┌───────┴──────────────┐
        ▼ (Success)            ▼ (Network Error / Offline)
[ Mark synced=true ]    [ Retain in localStorage queue for retry ]
```

### Key Guarantees:
1. **Zero UI Latency**: Logging operations never await network round-trips.
2. **Idempotent Ingestion**: `client_uuid` and `session_uuid` unique constraints ensure duplicate sync submissions are safely ignored without duplicating rows.
3. **Offline Survivability**: Logs remain buffered in `localStorage` indefinitely until connection to the Flask server is restored.

---

## 5. Active Workout Runner Lifecycle

1. **Initialization**:
   - Fetches configured routine exercises and initializes an active session object in `localStorage` (`cx_active_session`).
   - Starts live duration stopwatch accounting for active vs. paused time.
2. **Tri-Phase Set Execution**:
   - **Warm-up Phase**: Guided joint mobility with rest intervals.
   - **Main Phase**: Strength progressions, hold timers, target vs. actual inputs, tempo adherence, and RPE rating.
   - **Cool-down Phase**: Static stretching and spinal recovery.
3. **Set Logging & PR Detection**:
   - Set completion triggers instant PR evaluation against all-time personal bests.
   - New PRs trigger celebratory Web Audio fanfare and gold toast notifications.
4. **Completion Flow**:
   - Computes total training volume, set completion count, and phase duration totals.
   - Persists completed session to `workout_sessions` and set rows to `logs`.
   - Clears active session state and updates streak counters.

---

## 6. Audio & Haptic Feedback Architecture

- **Web Audio API**: Synthetic audio oscillators generate clean, non-visual cues at defined frequencies (440Hz, 880Hz, 1200Hz) without external audio files or network requests.
- **Navigator Vibration API**: Patterned haptic pulses (`[80, 50, 80]` ms) alert the athlete when hold durations finish or rest timers reach zero.
- **Mute Toggle**: Global mute state persisted in `localStorage` allows athletes to silence cues in public gym environments.

---

## 7. Progressive Web App (PWA) & Backup Architecture

- **PWA Service Worker (`sw.js`)**: Caches static assets (HTML, CSS, JS, fonts, Chart.js) with a cache-first strategy for instant loading.
- **Data Portability**: Full JSON export (`GET /export`) and idempotent restore (`POST /import`) ensure zero vendor lock-in and seamless device migrations (Bundle v2.1).
