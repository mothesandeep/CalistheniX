# Product Requirements Document (PRD) — CalistheniX

## 1. Problem Statement
Generic weight-lifting trackers (Hevy, Strong, FitNotes) model training almost exclusively as `sets × reps @ weight`. Calisthenics skill work — planche, front lever, L-sit, handstand progressions, muscle-ups — fundamentally relies on isometric `hold duration`, movement `tempo`, zero-rest `supersets`, and `progression tiers` (e.g., tuck front lever → advanced tuck → straddle → full).

Mainstream workout loggers fail to represent these dimensions naturally. **CalistheniX** exists to close this gap with a focused, local-first, distraction-free tracker and active workout execution system optimized for calisthenics athletes.

---

## 2. Goals & Value Proposition
- Provide a dedicated single-user training cockpit for tracking a rolling 7-day PPL A/B split with repetition-based and hold-based exercises.
- Provide a live active workout execution runner with distinct Target vs. Actual rep tracking, live session timer, and set completion feedback.
- Deliver immediate visual trend charts, metric aggregation toggles, and delta metrics (% change over 2 weeks) to verify progression over time without mental math.
- Support automated progression promotion to advance routine tiers upon meeting target criteria.
- Support all-time Personal Records (PRs) tracking and a 4-week training consistency activity heatmap.
- Zero network reliance for active gym sessions via optimistic local-first caching, PWA offline caching, and background synchronization.

---

## 3. Target User & Persona
- **Primary User:** Dedicated calisthenics athlete / bodyweight fitness practitioner.
- **Gym Environment:** Gyms with unreliable or non-existent Wi-Fi/cellular connection, mid-set fatigue, sweaty hands, requiring high-contrast dark mode and large touch targets.

---

## 4. Success Criteria
- Active use for consecutive training sessions without falling back to notes apps or spreadsheets.
- Logging any set takes **under 10 seconds**, including automatic hold duration capture.
- Trend line, progression status, all-time PRs, and volume deltas are instantly readable.

---

## 5. Functional Requirements Matrix

| ID | Requirement | Category | Priority | Status |
|:---|:---|:---|:---|:---|
| **F1** | Repetition-based exercise set logging with optional added weight (+kg) & RPE scale (1–10) | Core Logging | P0 | Complete |
| **F2** | Dedicated isometric hold duration timer (handstand, planche, L-sit, levers) | Core Logging | P0 | Complete |
| **F3** | High-contrast countdown rest timer with audio ticks, skip option, and auto-dismissal | Timer & UX | P0 | Complete |
| **F4** | Single-tap historical trend charts per exercise (Chart.js volume / hold metrics & toggles) | Analytics | P0 | Complete |
| **F5** | Local-first persistence (`localStorage`) with background idempotent sync (`client_uuid`) | Resilience | P0 | Complete |
| **F6** | Full database JSON export and backup restoration / import (`POST /import`) | Data Portability | P0 | Complete |
| **F7** | Multi-tier routine & level management (`routine_levels`, `level_exercises`, tempo, rest, supersets) | Routines | P0 | Complete |
| **F8** | Rolling 7-day PPL A/B calendar split with automatic daily resolution | Scheduling | P0 | Complete |
| **F9** | Dashboard analytics hub: streak counter, weekly volume, weekly sets, top movers | Analytics | P0 | Complete |
| **F10** | Sensory feedback cues (Web Audio API synthetics + Vibration API haptic pulses) | UX / Cues | P0 | Complete |
| **F11** | Exercise progression evaluation engine (`/exercises/:id/progression-status`) & auto-promotion | Progression | P0 | Complete |
| **F12** | Interactive routine editor (add, edit, delete, re-order, configure supersets, custom movements) | Routine Mgmt | P0 | Complete |
| **F13** | Live Active Workout Execution Runner with Target vs. Actual tracking & live session timer | Workout Runner | P0 | Complete |
| **F14** | All-Time Personal Records (PRs) hub & 4-week Training Consistency Activity Heatmap | Analytics | P1 | Complete |
| **F15** | Progressive Web App (PWA) manifest & service worker for 100% offline mobile app install | PWA / Mobile | P1 | Complete |

---

## 6. Non-Functional Requirements
- **Performance**: Instant UI responsiveness (<100ms render response time) with zero blocking network calls during workout logging.
- **Accessibility & UX**: High-contrast dark theme (`#0a0a0f` palette), tabular numerical typography (`JetBrains Mono`), and thumb-reachable primary action buttons (min 44×44px).
- **Data Integrity**: Idempotent sync ensures duplicate submissions due to flaky connectivity never corrupt logs.
- **Infrastructure**: Lightweight Python Flask + SQLite backend running on zero-cost or self-hosted environments.
