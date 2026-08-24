# CalistheniX 🤸‍♂️⚡

> A local-first, aesthetic calisthenics progression tracker built for hold-based skill work and progressive overload.

CalistheniX is engineered specifically for calisthenics athletes and bodyweight practitioners. Unlike traditional gym loggers that only model `weight × reps`, CalistheniX tracks isometric hold durations, tempos, rest countdowns, supersets, and progressive overload across multi-tier routine levels and skill progressions.

---

## ✨ Features

- **🥋 Calisthenics-First Data Model**: First-class support for both repetition-based exercises (push-ups, pull-ups, dips) and duration-based static holds (planche, front lever, L-sit, handstand).
- **🔄 Rolling 7-Day PPL A/B Split**: Automatic daily workout calculation using a rolling 7-day cycle (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest Day`) with configurable cycle anchor dates.
- **📊 Interactive Dashboard & Metrics**: Real-time streak tracking, weekly session counts, weekly total sets, and top progression movers with delta metrics.
- **⏱️ Live Hold Timer & Rest Countdown**:
  - One-tap start/stop hold timer with millisecond precision and auto-save on stop.
  - Guided session set counter (`Set X of Y`) with progress pips.
  - Built-in rest timer countdown with skip rest option and audio/vibration cues.
- **🔊 Sensory Gym Cues**: Web Audio API synthetics (start/stop beeps, rest completion alerts) and Vibration API haptic pulses designed for hands-free feedback during strenuous workouts.
- **📈 Progression Trends & Charting**: Exercise history charts powered by Chart.js featuring 2-week rolling delta percentages and session-by-session volume/hold metrics.
- **🛠️ Routine & Level Management**:
  - Multi-level routine definitions (Level 1–5).
  - Configurable target sets, target reps/duration, tempo notation (e.g. `2010`), and rest durations.
  - Superset groupings (`SS1`, `SS2`) with zero-rest transitions.
  - Inline exercise CRUD and ordering.
- **⚡ Local-First & Offline Resilience**: Logs are written instantly to `localStorage` first, ensuring zero UI latency and zero data loss on spotty gym Wi-Fi, with automatic idempotent synchronization (`client_uuid`).
- **💾 One-Click JSON Backup**: Full export of all exercises, routine levels, and training logs into a portable JSON backup.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend — Pure Web Platform                 │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundle step)│
│  - Chart.js for data visualization                          │
│  - Web Audio API + Vibration API for workout cues           │
│  - LocalStorage optimistic caching & sync loop              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend — Flask REST API                     │
│  - Python 3.10+ / Flask / Flask-CORS                        │
│  - Idempotent log creation via client UUID deduplication    │
│  - PPL A/B routine level management & progression endpoints │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite3 Connection
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Database — SQLite (tracker.db)               │
│  - exercises (prerequisites, progressions, type)            │
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

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the Flask backend (runs on http://127.0.0.1:5001)
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

## 📡 REST API Reference

### Exercises & Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/exercises` | List all available exercises and progression links |
| `GET` | `/exercises/<id>/logs` | Fetch chronologically sorted log history for an exercise |
| `POST` | `/logs` | Record a set log (`exercise_id`, `timestamp`, `reps`/`duration_sec`, `rpe`, `client_uuid`) |
| `GET` | `/exercises/<id>/progression-status` | Get progression readiness evaluation against targets |

### Routines & Levels
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/routines` | Get all distinct routine names (e.g. `Push A`, `Pull A`) |
| `GET` | `/routines/<name>/levels` | Fetch all level definitions and ordered exercises for a routine |
| `POST` | `/routines/<name>/levels` | Create a new level for a routine |
| `POST` | `/routines/<name>/levels/<level>/exercises` | Add an exercise slot to a routine level |
| `PUT` | `/level-exercises/<id>` | Update exercise parameters (sets, target, tempo, rest, superset) |
| `DELETE` | `/level-exercises/<id>` | Delete an exercise slot from a routine level |

### Dashboard & Maintenance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Retrieve streak days, week sessions, weekly sets count, and top movers |
| `GET` | `/export` | Export the complete database as JSON |

---

## 📱 Navigation & App Screens

- **Dashboard (`#dashboard`)**: High-level training overview, weekly streak, total volume, top movers, and one-click jump to today's scheduled workout.
- **Today (`#home`)**: Displays today's scheduled split based on the rolling 7-day calendar, with quick-access exercise logging cards.
- **Routine (`#routine`)**: Authoritative workout blueprint viewer across all split routines and levels, displaying tempo, target reps/duration, rest times, and supersets.
- **Edit (`#edit`)**: Routine builder for adding exercises, re-ordering, assigning superset groups, and tuning parameters.
- **Log View (`#log-<id>`)**: Focused, distraction-free logging interface with numerical input, RPE rating, live hold timer, and rest countdown.
- **History (`#history-<id>`)**: Progression charts tracking performance trends, maximum holds, and volume over time.

---

## 🔒 Design Philosophy & Non-Goals

1. **Gym-Usable & Fast**: Every logging flow is designed to be completed in under 10 seconds with one hand.
2. **Zero Unnecessary Bloat**: No social feeds, no third-party tracking, no mandatory cloud subscriptions.
3. **Local-First Reliability**: Always works even in underground gyms with zero mobile reception.

---

## 📄 License
MIT License. Created by [Sandeep Mothe](https://github.com/mothesandeep).
