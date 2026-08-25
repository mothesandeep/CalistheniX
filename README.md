# CalistheniX 🤸‍♂️⚡

> [!WARNING]  
> **🚧 WORK IN PROGRESS — ACTIVE DEVELOPMENT**  
> This repository contains the actively developed version of CalistheniX. Features may change, bugs and incomplete functionality may exist, and it should NOT be considered a stable production release. Stable/release versions will be maintained separately.

> **A local-first, aesthetic calisthenics progression tracker, custom weekly schedule builder, and live workout runner engineered for progressive overload and skill mastery.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Backend-Flask-green.svg)](https://flask.palletsprojects.com/)
[![Pure Web](https://img.shields.io/badge/Frontend-Vanilla_JS_/_HTML5_/_CSS3-orange.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline_Ready-success.svg)]()

---

CalistheniX is engineered specifically for bodyweight athletes, gymnasts, and calisthenics practitioners. Unlike generic gym loggers that only understand `weight × reps`, CalistheniX provides first-class support for **isometric hold durations**, **tempo execution**, **custom weekly splits (Monday–Sunday)**, **reusable workout blueprints**, **automated progression overload readiness scoring**, **live active workout execution**, **in-session Personal Record (PR) detection**, and **training consistency analytics**.

---

## ✨ Key Features

### 📅 Custom Training Splits & 7-Day Weekly Schedules
- **User-Defined Training Splits**: Create, name, and manage multiple training splits (e.g. *Push Pull Legs*, *Upper / Lower 4-Day*, *Skill & Strength*, *Full Body*). Switch your active split with one tap.
- **7-Day Monday–Sunday Weekly Grid**: Assign each day of the week independently to a **Workout Session** or a **Rest Day**.
- **Dynamic Today Resolver (`GET /today`)**: The app automatically determines your active split and day of week. On workout days, it launches today's workout directly. On rest days, it presents recovery guidance and previews your next scheduled training session with an early-start option.

### 🏋️ Reusable Workouts & Movement Library
- **Modular Workout Builder**: Build reusable training workouts (`Push A`, `Pull A`, `Upper Power`, etc.) independent of fixed days.
- **Granular Exercise Parameters**: Configure sets, reps or hold duration targets, rest intervals (sec), tempo codes (e.g., `3010`), superset groupings (`SS1`, `SS2`), and coaching cue annotations.
- **One-Tap Duplication (`⎘ Duplicate`)**: Clone existing workouts to rapidly experiment with variations without starting from scratch.
- **Global Exercise Catalog**: Add custom exercises with progression links and target benchmarks.

### ⚡ Live Active Workout Runner (`#workout`)
- **Live Session Stopwatch**: Live elapsed workout timer (`MM:SS`) with pause, resume, and accurate active duration accounting.
- **Active Exercise Spotlight**: Focused card highlighting (`.workout-ex-card-active` + `⚡ Focus` badge) keeps you dialed into your current exercise.
- **Side-by-Side Target vs. Actual Steppers**: Intuitive `+` / `-` steppers and direct number inputs for rapid logging between sets.
- **Dedicated Hold Stopwatch**: In-runner stopwatch for isometric holds (planche, front lever, handstands) automatically recording your exact measured hold time.
- **Automatic Rest Countdown**: Rest interval countdown with audio ticks (3s, 2s, 1s) and skip button.
- **Crash-Resistant State**: Active session state auto-persists in `localStorage` (`cx_active_session`) for crash recovery and background multi-tasking.

### 🏆 In-Workout Personal Record (PR) Detection
- **Multi-Dimensional PR Tracking**: Real-time evaluation across **Max Reps**, **Longest Hold Duration**, and **Heaviest Added Load (+kg)**.
- **Live Celebration Banner**: Instant audio chime and gold highlight banner when a set breaks an all-time personal best.
- **Dashboard PR Leaderboard**: Quick-access PR dashboard showing best historical achievements with links to trend charts.

### 📖 Immutable Workout History & Session Logs
- **Canonical Session Lifecycle**: Dedicated `workout_sessions` table storing immutable snapshots of completed workouts with duration and volume totals.
- **Chronological History Feed (`#history`)**: Clean workout log cards with drilldown into exact recorded sets (`#session-<uuid>`).
- **Historical Data Safety**: Modifying or deleting future workouts or schedules **never** mutates or corrupts past completed workout history.

### 🚀 Automated Progression Promotion Engine
- **Weighted Readiness Scoring**: Evaluates athlete readiness using a 60% target hit-rate and 40% RPE fatigue credit.
- **Fatigue Guard**: Automatically prevents premature progression if average RPE $\ge 9$, protecting athletes from overuse injury.
- **One-Tap Promotion (`POST /exercises/:id/promote`)**: Seamlessly promotes your movement slots to the next progression step.

### 📊 Consistency Heatmap & Analytics
- **4-Week Activity Heatmap**: Visualizes workout density, weekly set volume, and training momentum.
- **Dynamic Streak Calculation**: Preserves yesterday's streak until today's workout is completed.
- **Chart.js Performance Trends**: Progression trend lines with 2-week rolling delta percentages.

### 📱 100% Offline Progressive Web App (PWA)
- Web App Manifest (`manifest.json`) and service worker (`sw.js`) enabling installable app experience on iOS, Android, macOS, and Windows with dark mode aesthetic (`#0a0a0f`).
- Optimistic UI caching and local sync loop for seamless offline logging.

### 💾 Backup & Idempotent Restore (v2.1)
- Full JSON backup export (`GET /export`) bundling training splits, weekly schedules, reusable workouts, exercises, sessions, and logs.
- Multi-entity idempotent restore (`POST /import`) with deduplication.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Frontend — Pure Web Platform                      │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundler dependencies)   │
│  - Chart.js for progression visualization                               │
│  - Web Audio API (synthetic oscillators) + Vibration API for haptics    │
│  - Service Worker (sw.js) for 100% offline PWA caching                  │
│  - LocalStorage optimistic caching & automatic background sync loop     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / JSON REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Backend — Flask REST API                          │
│  - Python 3.10+ / Flask / Flask-CORS (Port 5001)                        │
│  - Dynamic Today Resolver (/today) combining Split + Day of Week        │
│  - Custom Split, Weekly Schedule & Reusable Workout Management APIs     │
│  - Canonical workout_sessions lifecycle & idempotent set logging        │
│  - Weighted progression readiness scoring & promotion engine            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ SQLite3 Connection (PRAGMA foreign_keys = ON)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Database — SQLite (backend/tracker.db)              │
│  - training_splits (id, name, description, is_active)                   │
│  - weekly_schedules (split_id, day_of_week 0..6, day_type, workout_id)  │
│  - workouts & workout_exercises (reusable templates, sets, tempo, notes)│
│  - exercises (catalog, progression links, type, targets)                │
│  - workout_sessions (uuid, routine, workout_id, duration, sets, json)   │
│  - logs (session_uuid, reps, duration, weight_kg, rpe, client_uuid)     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Modern web browser (Chrome, Safari, Firefox, Edge)

### 1. Start the Flask Backend
```bash
# Clone the repository
git clone https://github.com/mothesandeep/CalistheniX.git
cd CalistheniX

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start Flask backend server (runs on http://127.0.0.1:5001)
FLASK_DEBUG=True python3 backend/app.py
```

### 2. Launch the Frontend
In a separate terminal:
```bash
cd CalistheniX

# Serve frontend on port 8080
python3 -m http.server 8080 --directory frontend
```

Open your browser and navigate to:
👉 **`http://localhost:8080`**

---

## 🧪 Automated Testing

Run the full automated test suite covering all backend APIs, custom splits, weekly schedules, workout duplication, progression scoring, workout session lifecycles, and backup/restore:

```bash
PYTHONPATH=. ./venv/bin/python -m unittest -v backend/test_app.py
```

---

## 📡 REST API Reference

### Dynamic Today Resolver
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/today` | Resolves active split + current day of week into scheduled workout or rest day with next workout teaser |

### Training Splits & Weekly Schedule
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/splits` | List all custom training splits with active indicator and schedule summary |
| `POST` | `/splits` | Create a new custom training split |
| `GET` | `/splits/<id>` | Retrieve split detail including full 7-day Monday–Sunday schedule |
| `PUT` | `/splits/<id>` | Update split name, description, or set as active (`is_active: 1`) |
| `DELETE` | `/splits/<id>` | Delete training split (safely preserves historical workout logs) |
| `GET` | `/splits/<id>/schedule` | Fetch 7-day schedule array (days 0..6) for a split |
| `PUT` | `/splits/<id>/schedule` | Batch update 7-day schedule for a split |
| `PUT` | `/splits/<id>/schedule/<day>` | Update schedule assignment for a single day of week (0=Mon..6=Sun) |

### Reusable Workouts & Exercise Assignments
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/workouts` | List all reusable workouts with total sets and exercise counts |
| `POST` | `/workouts` | Create a new reusable workout with ordered exercise slots |
| `GET` | `/workouts/<id>` | Retrieve workout detail with complete exercise configuration |
| `PUT` | `/workouts/<id>` | Update workout name, description, and exercise slot definitions |
| `POST` | `/workouts/<id>/duplicate` | Duplicate workout into an independent copy with `(Copy)` suffix |
| `DELETE` | `/workouts/<id>` | Delete workout (resets referencing schedule days to Rest) |

### Workout Sessions & History Logs
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/workout_sessions` | Record a completed workout session with summary volume & duration (Idempotent) |
| `GET` | `/workout_sessions` | Retrieve chronological feed of all past workout sessions |
| `GET` | `/workout_sessions/<uuid>` | Retrieve full session breakdown including all recorded sets |
| `POST` | `/logs` | Record an individual set log linked to `session_uuid` |
| `GET` | `/exercises/<id>/logs` | Fetch chronologically sorted log history for an exercise |

### Exercises & Progression Intelligence
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/exercises` | List all catalog exercises and progression links |
| `POST` | `/exercises` | Create a new custom exercise in the catalog |
| `GET` | `/exercises/<id>/progression-status` | Evaluate weighted progression readiness score & fatigue credit |
| `POST` | `/exercises/<id>/promote` | Promote exercise to next progression step across routine levels |

### Dashboard, Analytics & Backup
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/dashboard/summary` | Retrieve dynamic streak days, weekly sessions, weekly sets, and top movers |
| `GET` | `/dashboard/records` | Retrieve all-time Personal Records (PRs) across all exercises |
| `GET` | `/dashboard/activity` | Retrieve 30-day activity volume and set counts for the heatmap |
| `GET` | `/export` | Full JSON database backup dump (Bundle v2.1) |
| `POST` | `/import` | Idempotent multi-entity JSON backup restoration and merge |

---

## 📱 Application Screens

- **Dashboard (`#dashboard`)**: Training command center featuring streak counter, weekly volume, top movers, all-time PRs, 4-week activity heatmap, today's workout launcher, and JSON backup export/restore.
- **Today (`#home`)**: Dynamic execution entry point displaying today's scheduled workout or rest day with recovery guidance and early workout launcher.
- **Weekly Schedule & Split Hub (`#routine`)**: 7-Day Monday to Sunday schedule grid, day editor modal, split switcher, and active program selector.
- **Reusable Workouts & Library (`#edit`)**: Reusable workouts manager, exercise set steppers, tempo, rest interval controls, and global catalog editor.
- **Live Workout Runner (`#workout`)**: Active session tracker with exercise spotlight, pause/resume, target vs. actual steppers, hold stopwatch, audio rest timer, and finish flow.
- **Workout History Log (`#history`)**: Chronological workout session feed with drilldown into exact recorded sets (`#session-<uuid>`).
- **Exercise Progression Trends (`#history-<id>`)**: Interactive Chart.js trend charts, metric aggregation toggle, and one-tap progression promotion.

---

## 📄 License
MIT License. Created by [Sandeep Mothe](https://github.com/mothesandeep).
