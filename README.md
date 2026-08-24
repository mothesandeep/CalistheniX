# CalistheniX 🤸‍♂️⚡

> A local-first, aesthetic calisthenics progression tracker and workout runner built for hold-based skill work and progressive overload.

CalistheniX is engineered specifically for calisthenics athletes and bodyweight practitioners. Unlike traditional gym loggers that only model `weight × reps`, CalistheniX tracks isometric hold durations, tempos, rest countdowns, supersets, progressive overload across multi-tier routine levels, live active workout sessions, all-time personal records (PRs), and training consistency heatmaps.

---

## ✨ Features

- **🥋 Calisthenics-First Data Model**: First-class support for repetition-based movements (push-ups, pull-ups, dips) and duration-based static holds (planche, front lever, L-sit, handstand).
- **🔄 Rolling 7-Day PPL A/B Split**: Automatic daily workout calculation using a rolling 7-day cycle (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest Day`) with configurable cycle anchor dates.
- **🏋️ Live Active Workout Runner**:
  - Interactive workout execution screen (`#workout`) with a live elapsed session timer (`MM:SS`).
  - Side-by-side **Target vs. Actual** reps/duration inputs per set.
  - Set completion tracking with audio/vibration feedback and dynamic progress bar (`X / Y Sets Completed`).
  - Session state persists in `localStorage` across page refreshes with one-tap *"Continue Workout ➔"*.
  - Finish Workout flow that automatically records logs, computes summary volume, and updates streaks.
- **🚀 Automated Progression Promotion Engine**:
  - Backend engine (`/exercises/:id/progression-status`) continuously evaluates consecutive sessions against progression thresholds.
  - One-tap **"Promote 🚀"** action in History view advances the exercise tier in your routine levels.
- **📊 Personal Records (PRs) & Consistency Heatmap**:
  - All-Time PRs showcase tracking all-time max reps, longest hold duration, and heaviest added load.
  - 4-Week Activity Heatmap grid visualizing workout frequency, volume density, and streak momentum.
- **📈 Progression Trends & Metric Toggles**:
  - Chart.js interactive performance charts with 2-week rolling delta percentages (`+15%`).
  - Metric mode toggles: **[Best Set / Max Hold]** vs. **[Total Volume / Total Hold Time]**.
- **🛠️ Routine & Catalog Management**:
  - Multi-level routine definitions (Level 1–5).
  - Configurable target sets, target reps/duration, tempo notation (e.g. `2010`), and rest durations.
  - Superset groupings (`SS1`, `SS2`) with zero-rest indicators.
  - Custom exercise creator for adding new movements to the global catalog.
- **⏱️ Live Hold Timer & Rest Countdown**:
  - One-tap start/stop hold timer with millisecond precision and auto-save on stop.
  - Built-in rest timer countdown with skip rest option and audio/vibration cues.
- **🔊 Sensory Gym Cues**: Procedural Web Audio API oscillators (start/stop beeps, rest completion alerts) and Vibration API haptic pulses designed for hands-free feedback during strenuous sets.
- **📱 Progressive Web App (PWA)**:
  - Web App Manifest (`manifest.json`) and service worker (`sw.js`) enabling 100% offline mobile app installation on iOS and Android.
- **💾 Full JSON Backup & Snapshot Restore**:
  - Export all exercises and logs as a portable JSON backup.
  - Idempotent restore/import (`POST /import`) to merge or restore backups across devices.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend — Pure Web Platform                 │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundle step)│
│  - Chart.js for data visualization                          │
│  - Web Audio API (synthetic oscillators) + Vibration API    │
│  - PWA Service Worker (sw.js) for offline caching           │
│  - LocalStorage optimistic caching & sync loop              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend — Flask REST API                     │
│  - Python 3.10+ / Flask / Flask-CORS (Port 5001)            │
│  - Idempotent log creation via client UUID deduplication    │
│  - Routine level management, progression & analytics APIs   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite3 Connection (PRAGMA foreign_keys = ON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Database — SQLite (backend/tracker.db)       │
│  - exercises (prerequisites, progressions, type, targets)   │
│  - logs (reps, duration, weight, RPE, timestamp, UUID)      │
│  - routine_levels & level_exercises (sets, tempo, supersets)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Modern web browser (Chrome, Safari, Firefox, Edge)

### 1. Clone & Setup Backend
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
python3 backend/app.py
```

### 2. Launch the Frontend
In a separate terminal window:
```bash
cd CalistheniX

# Serve the frontend directory using Python's static HTTP server
python3 -m http.server 8000 --directory frontend
```

Open your browser and navigate to:
**`http://localhost:8000`**

---

## 📡 REST API Reference Table

### Exercises & Logging
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/exercises` | List all available exercises and progression links |
| `POST` | `/exercises` | Create a new custom exercise in the catalog |
| `GET` | `/exercises/<id>/logs` | Fetch chronologically sorted log history for an exercise |
| `POST` | `/logs` | Record a set log (`exercise_id`, `timestamp`, `reps`/`duration_sec`, `rpe`, `client_uuid`) |
| `GET` | `/exercises/<id>/progression-status` | Evaluate progression readiness against consecutive target sessions |

### Routines & Levels
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/routines` | Get all distinct routine names (e.g. `Push A`, `Pull A`) |
| `GET` | `/routines/<name>/levels` | Fetch all level definitions and ordered exercises for a routine |
| `POST` | `/routines/<name>/levels` | Create a new level tier for a routine |
| `POST` | `/routines/<name>/levels/<level>/exercises` | Add an exercise slot to a routine level |
| `PUT` | `/level_exercises/<id>` | Update exercise parameters (sets, target, tempo, rest, superset, exercise_id) |
| `DELETE` | `/level_exercises/<id>` | Delete an exercise slot from a routine level |

### Dashboard, Analytics & Backup
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/dashboard/summary` | Retrieve streak days, week sessions, weekly sets count, and top movers |
| `GET` | `/dashboard/records` | Retrieve all-time Personal Records (PRs) across all exercises |
| `GET` | `/dashboard/activity` | Retrieve 30-day activity volume and set counts for the heatmap |
| `GET` | `/export` | Full JSON database backup dump |
| `POST` | `/import` | Idempotent JSON backup restoration / merge |

---

## 📱 Application Screens

- **Dashboard (`#dashboard`)**: Training command center featuring streak counter, weekly volume, top movers, all-time PRs, 4-week activity heatmap, today's split launcher, and JSON backup export/restore.
- **Today (`#home`)**: Displays today's scheduled split based on the rolling 7-day calendar, with quick-access exercise logging cards and active workout launcher.
- **Routine (`#routine`)**: Authoritative workout blueprint viewer across all split routines and levels, displaying tempo, target reps/duration, rest times, and supersets.
- **Edit (`#edit`)**: Routine builder for adding exercises, re-ordering, assigning superset groups, tuning parameters, and creating custom exercises in the catalog.
- **Active Workout Runner (`#workout`)**: Live session tracker with live elapsed timer, target vs. actual reps entry, set completion toggles, progress bar, and finish flow.
- **Log View (`#log-<id>`)**: Focused, distraction-free logging interface with numerical input, RPE rating, live hold timer, and rest countdown.
- **History (`#history-<id>`)**: Interactive Chart.js trend charts, metric aggregation toggle, and one-tap progression promotion.

---

## 📄 License
MIT License. Created by [Sandeep Mothe](https://github.com/mothesandeep).
