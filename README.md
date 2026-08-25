# CalistheniX 🤸‍♂️⚡

> A local-first, aesthetic calisthenics progression tracker and workout runner built for hold-based skill work and progressive overload.

CalistheniX is engineered specifically for calisthenics athletes and bodyweight practitioners. Unlike traditional gym loggers that only model `weight × reps`, CalistheniX tracks isometric hold durations, tempos, rest countdowns, supersets, progressive overload across multi-tier routine levels, live active workout sessions, all-time personal records (PRs), and training consistency heatmaps.

---

## ✨ Key Features

- **🥋 Calisthenics-First Data Model**: First-class support for repetition-based movements (push-ups, pull-ups, dips) and duration-based static holds (planche, front lever, L-sit, handstand).
- **🔄 Rolling 7-Day PPL A/B Split**: Automatic daily workout calculation using a rolling 7-day cycle (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest Day`) with configurable cycle anchor dates.
- **🏋️ Live Active Workout Runner**:
  - Interactive workout execution screen (`#workout`) with a live elapsed session timer (`MM:SS`), Pause/Resume controls, and accurate duration accounting.
  - Active exercise spotlight (`.workout-ex-card-active` + `⚡ Focus` badge) keeping you dialed into current movements.
  - Side-by-side **Target vs. Actual** reps/duration inputs per set, with inline `+`/`-` steppers and direct numerical entry.
  - Dedicated **Start Hold Stopwatch** for isometric exercises that saves exact measured seconds into actual values.
  - Automatic **Rest Countdown Timer** with real-time audio ticks (3s, 2s, 1s) and skip option.
  - Session state auto-persists in `localStorage` (`cx_active_session`) for crash recovery and background persistence.
- **📖 Canonical Workout Sessions & History Log**:
  - Dedicated `workout_sessions` database table tracking routine name, level, start/end timestamps, and duration.
  - Chronological **Workout History Feed (`#history`)** with completion percentage and duration badges.
  - Comprehensive **Session Detail View (`#session-<uuid>`)** breaking down every exercise and every recorded set with reps, hold seconds, added weight (+kg), and RPE.
- **🚀 Automated Progression Promotion Engine**:
  - Weighted readiness scoring (60% target hit-rate + 40% RPE fatigue credit).
  - High-fatigue guard protecting athletes from premature overload when average RPE >= 9.
  - One-tap **"Promote 🚀"** endpoint (`POST /exercises/:id/promote`) and UI action that automatically advances your routine levels to the next progression step.
- **🏆 Live In-Workout PR Detection & Benchmark Tracking**:
  - Multi-dimensional PR tracking across max reps, hold duration, and added load (+kg).
  - Instant celebratory audio chime and gold alert banner when a set beats your previous all-time personal record.
  - Dashboard Personal Records leaderboard with direct link to exercise progress charts.
- **🧘 Rate of Perceived Exertion (RPE) & Fatigue Guidance**:
  - Interactive RPE 1–10 selector with real-time Reps-In-Reserve (RIR) tooltips.
  - Inline RPE selectors on active workout sets and standalone logging views.
- **📊 Consistency Heatmap & Analytics**:
  - 4-Week Activity Heatmap grid visualizing workout frequency, volume density, and streak momentum.
  - Dynamic streak calculation preserving yesterday's streak until today's workout is completed.
  - Chart.js interactive performance trend charts with 2-week rolling delta percentages.
- **📱 Progressive Web App (PWA v2.0)**:
  - Web App Manifest (`manifest.json`) and service worker (`sw.js`) enabling 100% offline mobile app installation on iOS and Android with `#0a0a0f` dark mode theme.
- **💾 Full JSON Backup & Idempotent Restore**:
  - Full bundle export (`GET /export`) versioned to `2.0` containing exercises, workout sessions, and set logs.
  - Multi-entity idempotent import (`POST /import`) with duplicate skipping and client outbox resilience.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend — Pure Web Platform                 │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundle step)│
│  - Chart.js for data visualization                          │
│  - Web Audio API (synthetic oscillators) + Vibration API    │
│  - PWA Service Worker (sw.js v2.0) for offline caching      │
│  - LocalStorage optimistic caching & sync loop              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend — Flask REST API                     │
│  - Python 3.10+ / Flask / Flask-CORS (Port 5001)            │
│  - Canonical workout_sessions lifecycle & set linkage       │
│  - Idempotent log creation via client UUID deduplication    │
│  - Routine level management, progression & analytics APIs   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite3 Connection (PRAGMA foreign_keys = ON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Database — SQLite (backend/tracker.db)       │
│  - exercises (prerequisites, progressions, type, targets)   │
│  - workout_sessions (uuid, routine, level, duration, sets) │
│  - logs (session_uuid, reps, duration, weight, RPE, UUID)   │
│  - routine_levels & level_exercises (sets, tempo, supersets)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Modern web browser (Chrome, Safari, Firefox, Edge)

### 1. Start Backend Server
```bash
# Clone the repository
git clone https://github.com/mothesandeep/CalistheniX.git
cd CalistheniX

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the Flask backend (runs on http://127.0.0.1:5001)
FLASK_DEBUG=True python3 backend/app.py
```

### 2. Launch the Frontend
In a separate terminal window:
```bash
cd CalistheniX

# Serve frontend directory on port 8080 (or 8000)
python3 -m http.server 8080 --directory frontend
```

Open your browser and navigate to:
**`http://localhost:8080`**

---

## 🧪 Automated Testing

Run the full automated test suite covering all backend APIs, progression scoring, workout session lifecycles, backup/restore bundles, and error handling:

```bash
PYTHONPATH=. ./venv/bin/python -m unittest -v backend/test_app.py
```

---

## 📡 REST API Reference Table

### Workout Sessions & Logging
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/workout_sessions` | Record a completed workout session with summary volume & duration (Idempotent) |
| `GET` | `/workout_sessions` | Retrieve chronological feed of all past workout sessions |
| `GET` | `/workout_sessions/<uuid>` | Retrieve full session breakdown including all recorded sets |
| `POST` | `/logs` | Record an individual set log linked to `session_uuid` |
| `GET` | `/exercises/<id>/logs` | Fetch chronologically sorted log history for an exercise |

### Exercises & Overload Intelligence
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/exercises` | List all catalog exercises and progression links |
| `POST` | `/exercises` | Create a new custom exercise in catalog |
| `GET` | `/exercises/<id>/progression-status` | Evaluate weighted progression readiness score & fatigue credit |
| `POST` | `/exercises/<id>/promote` | Promote exercise to next progression step across routine levels |

### Routines & Levels
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/routines` | Get all distinct routine splits (e.g. `Push A`, `Pull A`) |
| `GET` | `/routines/<name>/levels` | Fetch all level definitions and ordered exercises |
| `POST` | `/routines/<name>/levels/<level>/exercises` | Add an exercise slot to a routine level |
| `PUT` | `/level_exercises/<id>` | Update exercise parameters (sets, target, tempo, rest, superset) |
| `DELETE` | `/level_exercises/<id>` | Delete an exercise slot from a routine level |

### Dashboard, Analytics & Backup
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/dashboard/summary` | Retrieve dynamic streak days, weekly sessions, weekly sets, and top movers |
| `GET` | `/dashboard/records` | Retrieve all-time Personal Records (PRs) across all exercises |
| `GET` | `/dashboard/activity` | Retrieve 30-day activity volume and set counts for the heatmap |
| `GET` | `/export` | Full JSON database backup dump (Bundle v2.0) |
| `POST` | `/import` | Idempotent multi-entity JSON backup restoration and merge |

---

## 📱 Application Screens

- **Dashboard (`#dashboard`)**: Training command center featuring streak counter, weekly volume, top movers, all-time PRs, 4-week activity heatmap, today's split launcher, and JSON backup export/restore.
- **Today (`#home`)**: Pure execution launcher displaying today's scheduled split with Hero card, metrics, and start workout CTA.
- **Routine (`#routine`)**: Authoritative workout blueprint viewer across all split routines and levels, displaying tempo, target reps/duration, rest times, and supersets.
- **Edit (`#edit`)**: Routine builder for adding exercises, re-ordering, assigning superset groups, tuning parameters, and creating custom exercises in the catalog.
- **Active Workout Runner (`#workout`)**: Live session tracker with active exercise spotlight, pause/resume, target vs. actual inputs with steppers, hold stopwatch, rest timer countdown, and finish flow.
- **Workout History Log (`#history`)**: Chronological workout session cards with drilldown into exact recorded sets (`#session-<uuid>`).
- **Exercise Progression Trends (`#history-<id>`)**: Interactive Chart.js trend charts, metric aggregation toggle, and one-tap progression promotion.

---

## 📄 License
MIT License. Created by [Sandeep Mothe](https://github.com/mothesandeep).
