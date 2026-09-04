# CalistheniX

> **A local-first, offline-ready calisthenics progression tracker, 7-day schedule builder, and live workout runner engineered for isometric holds, tempo execution, and progressive overload.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Backend-Flask-000000.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Pure Web Platform](https://img.shields.io/badge/Frontend-Vanilla_JS_/_HTML5_/_CSS3-E34F26.svg?logo=html5&logoColor=white)]()
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline_Ready-5A0FC8.svg?logo=pwa&logoColor=white)]()
[![Tests](https://img.shields.io/badge/Tests-68_Passing-success.svg)]()

---

## Overview

Traditional workout trackers are built for standard gym machines and barbell training—they exclusively measure weight and repetitions. **CalistheniX** is designed specifically for bodyweight athletes, gymnasts, and calisthenics practitioners who require granular control over:

- **Isometric Hold Times**: Millisecond-accurate stopwatches for movements like the Planche, Front Lever, Handstand, and L-Sit.
- **Cadence & Tempo Notation**: Strict tempo prescriptions (e.g., `3010`, `40X1`) for eccentrics and paused contractions.
- **Tri-Phase Workout Architecture**: Structured sessions split into **Warm-Up** (mobility prep), **Main Workout** (strength/skill), and **Cool-Down** (static recovery).
- **Custom 7-Day Training Splits**: Full control over weekly schedules (Monday–Sunday) with dynamic day-to-day workout resolution.
- **Progressive Overload Readiness**: Data-driven promotion scoring (60% hit-rate + 40% RPE fatigue credit) protecting athletes from overtraining.
- **Zero-Latency Offline First Architecture**: Operates 100% offline via browser `localStorage` and Service Worker caching, syncing idempotently to a lightweight Python Flask + SQLite backend.

---

## Key Features

### 1. Tri-Phase Workout Structure & Preset Routine Library
- **Phase-Delineated Training**: Workouts are organized into three distinct phases with color-coded visual cues:
  - <span style="color:#f59e0b;">■</span> **Warm-Up Phase (Amber)**: Joint preparation, dynamic mobility, and kinetic activation (e.g., Wrist Circles, Shoulder CARs, Scapular Pulls, Cat-Cow).
  - <span style="color:#ff5d5d;">■</span> **Main Workout Phase (Coral-Red / Accent)**: Core strength progressions, weighted calisthenics, superset pairings (`SS1`, `SS2`), and isometric holds.
  - <span style="color:#14b8a6;">■</span> **Cool-Down Phase (Teal)**: Targeted static stretching, spinal decompression, and parasympathetic recovery (e.g., Chest Stretch, Lat Stretch, Child's Pose, Pigeon Pose).
- **Built-in Routine Templates**: Instant access to curated warm-up and cool-down routine templates for Full Body, Push, Pull, Legs, Handstand, Planche, Front Lever, and General Mobility.

### 2. Custom Training Splits & Dynamic 7-Day Schedule
- **Flexible Split Builder**: Create, edit, and switch between multiple custom training splits (e.g., *Push / Pull / Legs*, *Upper / Lower 4-Day*, *Skill & Strength*, *Full Body*).
- **Monday–Sunday Weekly Grid**: Assign each day of the week to a specific workout or set it as a dedicated Rest Day.
- **Dynamic Today Resolver (`GET /today`)**: The app automatically detects today's day of the week and active split:
  - On **Workout Days**: Previews prescribed exercises, sets, target reps/duration, previous performance stats, and launches the live runner with one tap.
  - On **Rest Days**: Shows active recovery guidance and previews the upcoming scheduled training session with an option to start early.

### 3. Live Active Workout Runner (`#workout`)
- **Focused Execution View**: Active exercise spotlight card (`.workout-ex-card-active` + `Focus` badge) eliminates distraction during high-intensity sets.
- **Dual Rep & Hold Logging**:
  - Direct numeric inputs and `+`/`-` stepper buttons for rapid rep/weight adjustments.
  - In-runner millisecond **Hold Stopwatch** for isometric holds that automatically captures exact hold times upon tapping stop.
- **Automated Rest Timer**: Automatic rest countdown with audio ticks (3s, 2s, 1s) via the Web Audio API and haptic pulses via the Vibration API.
- **Queue Navigation & Set Skipping**: Jump between exercises non-linearly or skip individual sets when equipment or stamina demands it.
- **RPE & Fatigue Context**: Rate of Perceived Exertion (RPE 1–10) tracking with Reps-in-Reserve (RIR) fatigue descriptors.
- **Crash Recovery**: Active session state continuously persists to `localStorage` (`cx_active_session`), ensuring zero data loss if the browser refreshes or backgrounded.

### 4. Real-Time Personal Record (PR) Detection
- **Multi-Metric Evaluation**: Evaluates personal bests in real time across **Max Reps**, **Longest Hold Duration (sec)**, and **Heaviest Added Weight (+kg)**.
- **In-Workout Celebration**: Instant auditory chime and gold toast alert (`🏆 NEW PR!`) when breaking an all-time record.
- **PR Leaderboard (`#prs`)**: Comprehensive personal records view highlighting historical milestones with direct links to progression charts.

### 5. Automated Progression Promotion Engine
- **Weighted Readiness Scoring**: Evaluates performance over recent sessions using a 60% target completion rate and 40% RPE fatigue credit.
- **Fatigue Guard**: Automatically flags overexertion and prevents premature progression if average RPE $\ge 9$.
- **One-Tap Promotion (`POST /exercises/<id>/promote`)**: Automatically advances your exercise slot to the next progression movement across your routines.

### 6. Training Analytics, Heatmaps & Biomechanics
- **4-Week Activity Heatmap**: Visualizes workout density, weekly set volumes, and consistency.
- **Dynamic Streak Calculation**: Intelligently preserves yesterday's active streak until today's workout is completed.
- **Interactive Progression Charts (`#progress`)**: Chart.js trend lines with toggles between *Best Set / Max Hold* and *Total Volume*.
- **Interactive Biomechanical Muscle Map**: Front and back SVG muscle diagrams highlighting targeted muscle groups for today's workout.
- **Calendar & History Log (`#calendar`, `#history_list`)**: Chronological workout logs with drilldown into exact recorded sets (`#session-<uuid>`).

### 7. Offline-First PWA & Data Portability
- **100% Offline Progressive Web App**: Fully functional without internet access via Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).
- **Optimistic Sync Loop**: Local writes save instantly to `localStorage` and sync asynchronously to SQLite with client UUID deduplication (`client_uuid`).
- **Idempotent Backup & Restore (`GET /export`, `POST /import`)**: Full JSON export and import bundling training splits, schedules, reusable workouts, exercise catalog, workout sessions, and set logs (Bundle v2.1).

### 8. Customization & Athlete Ergonomics
- **Theme & Accent Customization**: Dark mode, light mode, and system preference support with custom phase accent colors.
- **Unit Flexibility**: Seamless switching between kilograms (`kg`) and pounds (`lbs`).
- **Localization**: Built-in multi-language translation support.
- **Sensory Controls**: Audio oscillator tones and vibration feedback with quick gym mute controls.

---

## Technology Stack

| Layer | Technologies | Key Responsibilities |
|:---|:---|:---|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 | Zero-bundler client, DOM rendering, hash router, local state management |
| **Data Viz & Audio** | Chart.js 4.4.0 (CDN), Web Audio API, Vibration API | Progression trend graphs, synthetic non-visual audio cues, haptic feedback |
| **Offline & PWA** | Service Worker (`sw.js`), Web App Manifest, `localStorage` | Cache-first asset delivery, offline logging, optimistic sync queue |
| **Backend API** | Python 3.10+, Flask, Flask-CORS | REST API endpoints, today resolver, progression calculations, backup export/import |
| **Database** | SQLite 3 (`backend/tracker.db`) | Relational storage, PRAGMA foreign keys, index optimization, idempotent migrations |
| **Testing** | Python `unittest`, `pytest` | 68 backend test cases covering API contracts, data integrity, and business logic |

---

## System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client Platform (Browser / PWA)                    │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero build step)             │
│  - Service Worker (sw.js) for 100% Offline PWA asset caching            │
│  - LocalStorage optimistic writes (instant UI response)                 │
│  - Web Audio API (synthetic oscillators) + Vibration API for haptics    │
│  - Chart.js 4.4.0 for progression & volume visualization                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / JSON REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Backend — Flask Application                       │
│  - Application Factory & Blueprint Architecture (Port 5001)             │
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
│  - workouts (id, name, description)                                     │
│  - workout_exercises (workout_id, exercise_id, phase, sets, reps, tempo)│
│  - exercises (id, name, type, movement_pattern, target_reps, next_id)   │
│  - workout_sessions (session_uuid, routine_name, duration, raw_json)    │
│  - logs (exercise_id, timestamp, reps, duration_sec, client_uuid, phase)│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
CalistheniX/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py              # Configuration classes (Config, TestConfig)
│   │   ├── data/
│   │   │   ├── constants.py           # Day names, phase constants
│   │   │   ├── movement_patterns.py   # Biomechanical exercise classifications
│   │   │   └── seed_data.py           # Default exercises, warm-ups, cool-downs, workouts
│   │   ├── db/
│   │   │   ├── connection.py          # SQLite connection manager (PRAGMA foreign_keys)
│   │   │   ├── migrations.py          # Column & table schema migrations
│   │   │   ├── schema.py              # DDL schema definitions and indexes
│   │   │   └── seed.py                # Idempotent database seeder
│   │   ├── routes/
│   │   │   ├── backup.py              # /export and /import (JSON Bundle v2.1)
│   │   │   ├── dashboard.py           # /today, /dashboard/summary, /dashboard/records
│   │   │   ├── exercises.py           # /exercises, progression readiness & promotion
│   │   │   ├── legacy.py              # Deprecated compatibility routes
│   │   │   ├── sessions.py            # /workout_sessions, /logs, /logs/batch
│   │   │   ├── splits.py              # /splits and /splits/<id>/schedule
│   │   │   └── workouts.py            # /workouts, duplication, /routine-templates
│   │   ├── services/
│   │   │   ├── dashboard_service.py   # Streak, weekly volume, top movers, PR formatters
│   │   │   └── progression_service.py # Weighted readiness and fatigue guard algorithms
│   │   └── utils/
│   │       └── validators.py          # Payload sanitizers and parsers
│   ├── tests/
│   │   ├── test_api.py                # Core REST API endpoint tests
│   │   ├── test_api_compatibility.py  # Backward compatibility tests
│   │   ├── test_data_integrity.py     # SQLite constraints & foreign key validations
│   │   ├── test_performance_optimizations.py # Gzip & cache header validations
│   │   ├── test_services.py           # Unit tests for progression & dashboard math
│   │   └── test_workout_phases.py     # Tri-phase execution and template tests
│   ├── app.py                         # Backward-compatible import shim
│   └── requirements.txt               # Flask and Flask-Cors
├── frontend/
│   ├── assets/
│   │   ├── icons/                     # PWA SVGs (icon.svg, icon-192.svg, icon-512.svg)
│   │   ├── grip-guide.svg             # Grip anatomy diagram
│   │   ├── movement-stages.svg        # Progression stage diagram
│   │   ├── muscle-front.svg           # Anterior biomechanical muscle map
│   │   ├── muscle-back.svg            # Posterior biomechanical muscle map
│   │   └── tempo-guide.svg            # Tempo code breakdown guide
│   ├── css/
│   │   ├── base.css                   # Typography, resets, utility classes
│   │   ├── layout.css                 # Desktop sidebar & mobile shell layouts
│   │   ├── variables.css              # Design tokens, phase colors, glassmorphism
│   │   └── components/                # Modular component stylesheets (runner, cards, etc.)
│   ├── js/
│   │   ├── core/
│   │   │   ├── audio.py -> audio.js   # Web Audio synthetic oscillator cues
│   │   │   ├── constants.py -> .js    # Shared constants, i18n dictionaries
│   │   │   ├── prefetch.js            # Intelligent view data prefetching
│   │   │   ├── state.js               # Reactive client state store
│   │   │   ├── storage.js             # LocalStorage abstraction & outbox queue
│   │   │   └── utils.js               # Date helpers, formatters, sanitizers
│   │   ├── components/
│   │   │   ├── exercise-animation.js  # Procedural stickman exercise visualizer
│   │   │   └── muscle-map.js          # Interactive SVG muscle highlighter
│   │   ├── views/
│   │   │   ├── calendar.js            # Monthly workout calendar view
│   │   │   ├── exercise-library.js    # Movement catalog & custom exercise creator
│   │   │   ├── history-list.js        # Chronological session logs & drilldowns
│   │   │   ├── home.js                # Today's launcher & dashboard command center
│   │   │   ├── personal-records.js    # All-time PR leaderboard
│   │   │   ├── progress-chart.js      # Chart.js progression charts & promotion
│   │   │   ├── settings.js            # Theme, units, language, backup export/import
│   │   │   ├── split-manager.js       # 7-Day split editor & routine builder
│   │   │   ├── stats.js               # Training volume & consistency metrics
│   │   │   └── workout-runner.js      # Live workout runner, stopwatch, rest timers
│   │   ├── api.js                     # HTTP client communicating with backend
│   │   ├── bootstrap.js               # Client initialization & Service Worker register
│   │   └── router.js                  # Hash-based client router (#home, #workout, etc.)
│   ├── index.html                     # Single-page application root
│   ├── manifest.json                  # PWA installation manifest
│   ├── offline.html                   # Offline fallback page
│   ├── sw.js                          # Service worker caching strategy
│   └── tests/                         # Browser and CDP automated test scripts
├── AGENTS.md                          # Repository rules & architecture constraints
├── PRD.md                             # Product Requirements Document & scope guardrails
├── appflow.md                         # Detailed application navigation flow reference
├── architecture.md                    # System architecture & local-first sync design
├── design.md                          # Design system specification & UI tokens
├── memory.md                          # Engineering decisions & architectural log
├── phases.md                          # Milestone roadmap ledger (Phases 0 through 13)
└── run.py                             # Root application entrypoint
```

---

## Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### 1. Clone the Repository
```bash
git clone https://github.com/mothesandeep/CalistheniX.git
cd CalistheniX
```

### 2. Set Up Virtual Environment
```bash
# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows (cmd):
# venv\Scripts\activate.bat
# On Windows (PowerShell):
# venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Start the Application

#### Option A: Run Backend & Serve Frontend Statically (Recommended)

**Terminal 1 (Backend API):**
```bash
# Runs Flask backend on http://127.0.0.1:5001
python3 run.py
```

**Terminal 2 (Frontend):**
```bash
# Serve frontend on http://localhost:8080
python3 -m http.server 8080 --directory frontend
```

#### Option B: Direct File Access
Because the frontend requires no build steps or bundling, you can also open `frontend/index.html` directly in your browser while the Flask backend runs on port `5001`.

Navigate to: **`http://localhost:8080`**

---

## Environment Variables & Configuration

The backend supports the following environment variables (with defaults configured in `backend/app/core/config.py`):

| Variable | Default | Description |
|:---|:---|:---|
| `PORT` | `5001` | Port on which the Flask REST API server listens |
| `FLASK_DEBUG` | `False` | Enables Flask debug mode and hot-reloading (`True` / `False`) |
| `CALISTHENIX_DB_PATH` | `backend/tracker.db` | Absolute or relative path to the SQLite database file |
| `CORS_ORIGINS` | `*` | Allowed CORS origins for REST API consumers |

Example of running with custom environment configuration:
```bash
PORT=5002 FLASK_DEBUG=True python3 run.py
```

---

## Application Navigation & Views

| Hash Route | View Name | Purpose |
|:---|:---|:---|
| `#home` / `#dashboard` | **Today & Dashboard** | Command center: today's workout launcher, active streak, weekly volume, top movers, and muscle focus |
| `#workout` | **Workout Runner** | Live tri-phase workout execution with exercise focus spotlight, hold stopwatch, rest timer, and set steppers |
| `#split` | **My Split** | 7-day Monday–Sunday schedule planner, split switcher, and reusable workout builder |
| `#stats` | **Stats & Activity** | Training volume analytics, weekly consistency charts, and 4-week activity heatmap |
| `#progress` | **Progress & Promotion** | Exercise trend curves (Chart.js), performance metrics, and progressive overload readiness promotion |
| `#prs` | **Personal Records** | All-time PR leaderboard for Max Reps, Longest Holds, and Heaviest Added Load (+kg) |
| `#calendar` | **Training Calendar** | Monthly interactive training calendar with session completion markers |
| `#library` | **Exercise Library** | Global catalog of calisthenics exercises, movement patterns, and custom movement builder |
| `#history_list` | **Session History** | Chronological feed of past workouts with drilldown into exact recorded sets (`#session-<uuid>`) |
| `#settings` | **Settings Modal** | Theme toggle, accent color picker, weight units (kg/lbs), language selector, and JSON backup/restore |

---

## REST API Reference

All API routes are served at both the root level and with the `/api` prefix (e.g., `/today` and `/api/today`).

### 1. Dynamic Today Resolver
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/today` | Resolves active split and current day of week into today's workout or rest day recovery guidance |
| `GET` | `/api/today-workout` | Alias for `/today` |

### 2. Custom Training Splits & Weekly Schedule
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/splits` | List all custom training splits with active status and schedule summary |
| `POST` | `/splits` | Create a new custom training split |
| `GET` | `/splits/<id>` | Retrieve split detail including full 7-day Monday–Sunday schedule |
| `PUT` | `/splits/<id>` | Update split name, description, or set as active (`is_active: 1`) |
| `DELETE` | `/splits/<id>` | Delete training split (safely preserves historical workout logs) |
| `GET` | `/splits/<id>/schedule` | Fetch 7-day schedule array (days 0..6) for a split |
| `PUT` | `/splits/<id>/schedule` | Batch update 7-day schedule for a split |
| `PUT` | `/splits/<id>/schedule/<day>` | Update schedule assignment for a single day (0=Monday .. 6=Sunday) |

### 3. Reusable Workouts & Templates
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/workouts` | List all reusable workouts with set counts across warm-up, main, and cool-down phases |
| `POST` | `/workouts` | Create a new reusable workout with ordered exercise slots |
| `GET` | `/workouts/<id>` | Retrieve workout detail with complete exercise configuration across all phases |
| `PUT` | `/workouts/<id>` | Update workout name, description, and exercise slot definitions |
| `POST` | `/workouts/<id>/duplicate` | Duplicate workout into an independent copy with `(Copy)` suffix |
| `DELETE` | `/workouts/<id>` | Delete workout (resets referencing schedule days to Rest) |
| `GET` | `/api/routine-templates` | Fetch preset library of curated warm-up and cool-down routine templates |

### 4. Workout Sessions & Set Logs
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/workout_sessions` | Record a completed workout session with tri-phase durations and summary stats (Idempotent) |
| `GET` | `/workout_sessions` | Retrieve chronological feed of all past workout sessions |
| `GET` | `/workout_sessions/<uuid>` | Retrieve full session breakdown including all recorded sets and snapshot |
| `POST` | `/logs` | Record an individual set log linked to `session_uuid` (Idempotent via `client_uuid`) |
| `POST` | `/logs/batch` | Atomically persist a batch of set logs within a single SQLite transaction |
| `GET` | `/exercises/<id>/logs` | Fetch chronologically sorted log history for a specific exercise |

### 5. Exercises & Progression Intelligence
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/exercises` | List all catalog exercises, movement patterns, and progression chain links |
| `POST` | `/exercises` | Create a new custom exercise in the global catalog |
| `GET` | `/exercises/<id>/progression-status` | Evaluate weighted progression readiness score & fatigue credit |
| `POST` | `/exercises/<id>/promote` | Promote exercise to the next progression step across routine slots |

### 6. Dashboard, Analytics & Backup
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/dashboard/summary` | Retrieve active streak days, weekly sessions, weekly sets, and top movers |
| `GET` | `/dashboard/records` | Retrieve all-time Personal Records (PRs) across all exercises |
| `GET` | `/dashboard/activity` | Retrieve 30-day activity volume and set counts for the heatmap |
| `GET` | `/api/weekly-progress` | Retrieve weekly workout completion rate and 7-day schedule status |
| `GET` | `/api/muscle-focus` | Retrieve targeted muscle groups for today's resolved workout |
| `GET` | `/api/upcoming-workouts` | Retrieve upcoming 3 days of workouts from the active split |
| `GET` | `/export` | Full JSON database backup dump (Bundle v2.1) |
| `POST` | `/import` | Idempotent multi-entity JSON backup restoration and merge |

---

## Automated Testing

CalistheniX includes a comprehensive automated test suite testing API contracts, database schema integrity, tri-phase execution, backward compatibility shims, and service-layer algorithms.

Run the test suite using Python's built-in `unittest` runner:
```bash
PYTHONPATH=. ./venv/bin/python -m unittest discover -s backend/tests
```

Or run via `pytest`:
```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests
```

### Test Suite Overview:
- **`test_api.py`**: Validates all REST endpoints, status codes, payload validations, error handling, and idempotent sync.
- **`test_workout_phases.py`**: Tests warm-up, main, and cool-down phase ordering, template retrieval, and multi-phase duration tracking.
- **`test_data_integrity.py`**: Verifies SQLite constraints, foreign key cascades, and duplicate handling.
- **`test_services.py`**: Validates weighted progression readiness scoring, fatigue guard thresholds, and streak calculation edge cases.
- **`test_performance_optimizations.py`**: Verifies transparent gzip compression and caching headers.
- **`test_api_compatibility.py`**: Ensures legacy import paths and endpoints remain functional.

---

## Design System & UI Specifications

The CalistheniX user interface is built on modern, data-dense gym ergonomics:

| Element | Specification | Rationale / Purpose |
|:---|:---|:---|
| **Canvas** | `#0a0a0f` Deep Charcoal Black | Low battery consumption on OLED displays, high contrast under harsh gym lights |
| **Surfaces** | `#12121a` & `#1a1a26` (Glassmorphism) | Visual hierarchy with subtle borders (`rgba(255, 255, 255, 0.07)`) |
| **Warm-Up Accent** | `#f59e0b` Amber | Indicates preparatory joint mobility and kinetic activation |
| **Main Train Accent** | `#ff5d5d` Coral-Red (or User Custom) | Indicates primary overload and strength training sets |
| **Cool-Down Accent** | `#14b8a6` Teal | Indicates static stretching, relaxation, and parasympathetic recovery |
| **PR Gold** | `#eab308` Gold | Celebrates Personal Records and milestone achievements |
| **Typography** | `Inter`, `Outfit`, `Plus Jakarta Sans`, `JetBrains Mono` | High-legibility sans-serif UI with monospace numerals for timers and sets |
| **Touch Targets** | Minimum 44×44px | Effortless one-handed mobile input between heavy sets |

---

## Project Documentation

Detailed architecture specifications, product guidelines, and milestone ledgers are maintained in the repository:

- [**PRD.md**](PRD.md) — Product requirements document, feature specifications, and scope boundaries.
- [**architecture.md**](architecture.md) — Technical architecture, local-first data sync engine, and database schema.
- [**design.md**](design.md) — Design system specification, visual tokens, and UI layout hierarchy.
- [**phases.md**](phases.md) — Milestone roadmap ledger tracking Phases 0 through 13.
- [**appflow.md**](appflow.md) — Complete screen-by-screen application navigation and view state reference.
- [**memory.md**](memory.md) — Engineering decision record and architectural changelog.
- [**AGENTS.md**](AGENTS.md) — Development constraints, code style guidelines, and guardrails.

---

## Development Guidelines

When contributing to or extending CalistheniX:

1. **Offline-First Is Non-Negotiable**: Any new feature must function completely within browser `localStorage` first, and synchronize to SQLite second. Never build a feature that requires an active server connection to function.
2. **Zero Frontend Bundler**: Keep the frontend pure Vanilla HTML5, CSS3, and ES6+ JavaScript. Do not introduce Webpack, Vite, React, Vue, or JSX.
3. **Thin Flask Route Handlers**: Keep route controllers lightweight in `backend/app/routes/` and push business calculations into `backend/app/services/`.
4. **Tri-Phase Discipline**: Preserve the tri-phase workout structure (Amber Warm-up, Coral-Red/Custom Main, Teal Cool-down) and do not invent arbitrary accent colors.
5. **Idempotency**: All sync endpoints must use client UUIDs (`client_uuid`, `session_uuid`) to guarantee safe, collision-free replay on network reconnects.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file or standard MIT terms for details.

Developed with precision by [Sandeep Mothe](https://github.com/mothesandeep).
