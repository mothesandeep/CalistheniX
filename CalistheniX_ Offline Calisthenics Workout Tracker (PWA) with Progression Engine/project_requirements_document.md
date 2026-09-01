# CalistheniX: Offline Calisthenics Workout Tracker (PWA) with Progression Engine

## 1. Project Overview
CalistheniX is a Progressive Web App (PWA) built specifically for athletes who train using calisthenics, gymnastics, and other bodyweight movements. Unlike generic gym trackers, it focuses on the unique metrics of bodyweight training—like isometric hold durations, movement tempo codes, and skill-based progressions—while remaining 100% offline-capable. Athletes can design modular workout templates, execute live sessions with precision timing and immediate feedback, and track long-term skill gains using rich visual analytics.

This app is being built to fill the gap between simple note-taking fitness apps and heavyweight coaching platforms that require constant internet access. Key objectives include delivering a lightweight, crash-resistant experience; enabling full data ownership via JSON backups; and providing an automated progression engine that suggests when to advance to harder variations. Success is measured by smooth offline performance, a zero-loss workout runner (recoverable after browser crashes), and clear visual insights into user progress.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope
- Workout Management: create, edit, duplicate, categorize (Warm-up, Main, Cool-down) blueprints.
- Exercise Library: metadata for muscle groups, movement patterns, and progression chains.
- 7-Day Training Splits: calendar to assign workouts to days (Mon–Sun).
- Live Workout Runner: set logging (reps, duration, weight, RPE), tempo control, isometric timers.
- Rest Management: countdown timers with audio/haptic feedback and manual adjust.
- Progression Engine: readiness scoring and automated prompts to promote exercises.
- Personal Records: real-time PR detection during live sessions.
- Analytics & History: immutable session logs, consistency heatmaps, volume charts, trend lines via Chart.js.
- Data Portability: full JSON export/import for backups and restores.
- Offline-First PWA: Service Worker setup, asset & API caching, local state persistence.
- Cross-Platform PWA Compliance: installable on iOS, Android, Desktop.

### Out-of-Scope (Phase 1)
- Social/Community features (sharing workouts, leaderboards).
- Cloud sync or multi-device real-time data replication.
- Video tutorials or embedded coaching content.
- Third-party hardware integrations (smartwatches, heartrate straps).
- In-app purchases, subscriptions, or ad monetization.

---

## 3. User Flow

A new user lands on the **Onboarding Screen** where they are prompted to set up a weekly training split (e.g., Push/Pull/Legs) via the **Split Manager**, then build one or more workout templates in the **Workout Editor** by selecting exercises from the global library or adding custom movements. After saving, they can export a JSON backup to secure their data.

When opening the app on any subsequent day, the **Dashboard** automatically highlights “Today’s Workout” based on the calendar. Tapping “Start Workout” launches the **Live Runner**, guiding the user through Warm-up, Main, and Cool-down phases. Users log reps, hold times, and RPE; rest timers start and notify via chimes or vibrations. Upon completion, the session is saved, and the user can review their performance in **History** or **Progress** tabs, where Chart.js visualizations and readiness prompts help refine their next session.

---

## 4. Core Features
- **Authentication (Optional)**: local device only; no account required.
- **Workout Management Module**: create/edit/duplicate routines, handle supersets, tempo codes, hold durations.
- **Exercise Library**: pre-populated catalog + user-defined movements, tagged by muscle group and progression level.
- **Split Scheduler**: assign workouts to days of the week, view calendar heatmap.
- **Live Workout Runner**: phase navigation, timers, set logging (reps/weight/RPE), tempo guidance, hold stopwatch.
- **Rest Timer**: customizable countdown with audio (Web Audio API) and haptic (Vibration API) cues.
- **Progression Engine**: compute readiness score, suggest promotions along progression chain.
- **Personal Record Alerts**: detect and celebrate max reps/holds in run time.
- **Analytics Dashboard**: Chart.js charts—trend lines, volume bars, heatmaps showing consistency.
- **Offline-First PWA**: Asset & API response caching via Service Worker; app shell model for instant loads.
- **Data Backup & Restore**: JSON-based exports and idempotent imports stored in LocalStorage or IndexedDB.

---

## 5. Tech Stack & Tools

### Frontend
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visuals**: Chart.js for analytics, SVG for exercise animations
- **APIs**: Service Worker API (Workbox for routing & caching), Web Audio API, Vibration API, LocalStorage/IndexedDB
- **Styling**: CSS Variables, mobile-first dark theme

### Backend
- **Language**: Python 3.10+
- **Framework**: Flask with Flask-CORS
- **Database**: SQLite3 (local-first), configured with `PRAGMA journal_mode = WAL;`, `synchronous = NORMAL;`
- **Migrations**: Custom scripts for schema evolution

### Dev Tools
- Code Editor: VS Code
- Testing: pytest for backend, Jest or a simple test harness for frontend runner logic
- Bundler (optional): Rollup or plain ES modules

---

## 6. Non-Functional Requirements
- **Performance**: UI latency <100 ms on set logging; chart renders within 200 ms
- **Offline Reliability**: full app shell load in <1 s, automatic recovery of in-progress workout state after crashes
- **Storage**: handle up to 1 year of data locally without performance degradation; monitor via `navigator.storage.estimate()`
- **Security**: served over HTTPS, Service Worker scope locked to `/sw.js`, input sanitization for custom exercise names
- **Usability**: accessible UI with high contrast, ARIA roles for timers, simple one-touch interactions

---

## 7. Constraints & Assumptions
- Runs only in modern browsers supporting Service Workers, Web Audio, and Vibration APIs (Chrome 90+, Safari 14+, Firefox 88+).
- No user accounts or cloud required—data stays on device unless manually exported.
- User hardware has sufficient local storage (~50 MB) and basic vibration support.
- Flask backend may run remotely or locally; offline-first implies full functionality without network but requires initial service worker registration online.

---

## 8. Known Issues & Potential Pitfalls
- **Storage Quotas**: Browsers may purge data if device runs low. Mitigation: implement LRU cache for old analytics, warn user when usage >80%.
- **Service Worker Updates**: stale caches after deploy. Mitigation: use content-hashed filenames, prompt user to “Refresh to Update” on new SW activate event.
- **Timer Accuracy**: `setTimeout` drift on mobile when throttled. Mitigation: use `performance.now()` and correction logic in runner state machine.
- **Haptic Inconsistency**: not all devices support vibration. Mitigation: fallback to visual flash or silent chime.
- **SQLite Backend Offline Access**: if running remote Flask, true offline requires local bundling. Recommendation: consider IndexedDB-only implementation if Python service isn’t local.


*This document is the single source of truth for the AI model. All subsequent technical guidelines, file structures, and flowcharts must adhere closely to these clear and unambiguous requirements.*