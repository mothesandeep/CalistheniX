# CalistheniX — Technical Baseline & Audit (Phase 0)

## 1. System Architecture Overview

CalistheniX is structured as a two-tier application:

1. **Frontend (Browser Client)**:
   - **Stack**: Vanilla HTML5, CSS3, ES6+ JavaScript (zero bundle step), Chart.js CDN.
   - **State**: Central in-memory `state` object in `frontend/app.js`.
   - **Storage**: Browser `localStorage` for offline caching and optimistic UI updates (`cx_active_session`, `cx_pending_*`, `cx_cycle_start`).
   - **PWA**: `frontend/sw.js` (Cache version `calisthenix-v1.7`) caching static assets.
   - **Sensory**: Procedural Web Audio API oscillators and HTML5 Vibration API.

2. **Backend (REST API)**:
   - **Stack**: Python 3.10+, Flask, Flask-CORS on port 5001.
   - **Database**: SQLite3 (`backend/tracker.db`) with Foreign Key enforcement (`PRAGMA foreign_keys = ON`).
   - **Connection Safety**: Managed exclusively through `@contextmanager def get_db()`.
   - **Idempotency**: `logs` table deduplicates duplicate set submissions via `client_uuid UNIQUE`.

---

## 2. Current Data Models & Schema

### Database Tables (`backend/tracker.db`)
- `exercises`: Catalog & progression chains (`id`, `name`, `day`, `type`, `prerequisite_id`, `next_id`, `progression_target_reps`, `progression_target_duration`, `progression_sessions_needed`).
- `routine_levels`: Routine split tiers (`id`, `routine_name`, `level`, `UNIQUE(routine_name, level)`).
- `level_exercises`: Routine configurations (`id`, `routine_level_id`, `exercise_id`, `order_index`, `sets`, `reps`, `duration_sec`, `tempo`, `rest_sec`, `superset_group`, `notes`).
- `logs`: Completed sets (`id`, `exercise_id`, `timestamp`, `reps`, `weight_kg`, `duration_sec`, `rpe`, `client_uuid UNIQUE`).

### Frontend LocalStorage Contract
| Key | Type | Description |
|:---|:---|:---|
| `cx_active_session` | JSON Object | In-progress workout state (id, routine, level, startTime, exercises with sets). |
| `cx_pending_<uuid>` | JSON Object | Outbox of un-synced log entries queued for background sync. |
| `cx_cycle_start` | ISO String | Anchor date for 7-day rolling PPL cycle. |
| `cx_active_routine` | String | User's currently selected routine filter (default: `Push A`). |
| `cx_active_level` | Number | User's currently selected level tier (default: `1`). |

---

## 3. Current Workout Lifecycle & Execution Flow

```text
[Start Button] 
      ↓
`startWorkoutSession(routineName, level)`
      ↓
Creates active session snapshot in localStorage (`cx_active_session`):
{
  id: "<uuid>",
  routine: "Pull A",
  level: 1,
  startTime: 1724589000000,
  status: "in_progress",
  exercises: [
    {
      exercise_id: 11,
      exercise_name: "Dead Hang",
      exercise_type: "duration",
      sets: [
        { set_num: 1, target_val: 45, actual_val: 0, completed: false },
        { set_num: 2, target_val: 45, actual_val: 0, completed: false }
      ]
    }
  ]
}
      ↓
[Set Completion During Session]
- Reps: `toggleWorkoutSet()` → marks `completed = true`, triggers rest timer.
- Hold: `startWorkoutHold()` → `stopWorkoutHold()` → records elapsed sec, marks `completed = true`, triggers rest timer.
- Saved immediately to `localStorage` via `saveActiveSession()`.
      ↓
[Rest Interval]
- `startWorkoutRest(sec, nextInfo)` runs countdown banner with audio cues (`cueTick`, `cueRestEnd`).
      ↓
[Workout Completion]
`finishWorkoutSession()`
- Iterates over all completed sets.
- Writes each set to `localStorage` (`cx_pending_<uuid>`).
- Triggers `lsSyncPending()` to POST logs to `/logs`.
- Clears `cx_active_session`.
- Reloads dashboard and navigates to `#dashboard`.
```

---

## 4. Key Gaps & High-Risk Areas Identified

1. **No Backend Session Entity**: The database only stores individual sets in `logs`. There is no `workout_sessions` table capturing overall session metadata (`session_uuid`, `routine_name`, `started_at`, `completed_at`, `duration_sec`, `total_sets`).
2. **History View Granularity**: History (`#history-<id>`) only shows single-exercise performance charts. A unified "Workout History Log" representing completed full training sessions is missing.
3. **Today vs. Routine Coupling**: Today (`#home`) and Routine (`#routine`) have overlapping responsibilities; Today should strictly act as the execution launchpad referencing the configured routine.
4. **Monolithic Code Structure**: `frontend/app.js` is ~2400 lines combining state, rendering, event handling, audio synthesis, and networking.

---

## 5. Refactor Roadmap (Phase 1+)

- **Phase 1**: Introduce the canonical `WorkoutSession` model with database table and full crash-recovery lifecycle.
- **Phase 2**: Cleanly separate Today (execution entry) from Routine (configuration).
- **Phase 3**: Harden offline sync and backup/restore reliability.
- **Phase 4**: Build unified Workout Session History.
- **Phase 5**: Ensure Dashboard aggregates directly from canonical completed sessions.
- **Phase 6**: Refine Runner UX (previous performance, rest timer safety).
