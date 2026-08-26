# Design System & UI Specification — CalistheniX v2.0

## 1. Design Philosophy

- **Gym-Usable Ergonomics**: One-handed operation, massive tap targets (min 44×44px), high-contrast dark theme, and minimal screen time per set.
- **Data-Dense, Zero Fluff**: Structured statistics, tabular monospace numbers, and clean visual progress bars instead of marketing prose or unnecessary illustrations.
- **Dark Aesthetic Default**: Deep dark canvas (`#0a0a0f`) with electric purple accents (`#7c5cfc`) designed for harsh gym lighting and reduced OLED battery consumption.
- **Immediate Sensory Feedback**: Auditory and haptic cues (Web Audio API oscillators + Vibration API) enable blind feedback during strenuous isometric holds and rest intervals.

---

## 2. Visual Tokens & Styling System

| Token | CSS Variable | Value | Purpose / Usage |
|:---|:---|:---|:---|
| **Background** | `--bg` | `#0a0a0f` | Main viewport canvas |
| **Surface 1** | `--surface` | `#12121a` | Cards, primary containers, input panels |
| **Surface 2** | `--surface-2` | `#1a1a26` | Elevated rows, hover states, input fields |
| **Border** | `--border` | `rgba(255, 255, 255, 0.07)`| Subtle element boundaries |
| **Border Focus**| `--border-focus` | `#7c5cfc` | Active input outline |
| **Accent** | `--accent` | `#7c5cfc` | Brand accent, primary buttons, active tabs |
| **Accent Hover**| `--accent-hover` | `#9678fd` | Interactive hover highlight |
| **Accent Glow** | `--accent-glow` | `rgba(124, 92, 252, 0.25)`| Focus states, active indicators |
| **Success** | `--success` | `#22c55e` | Completed sets, positive progression deltas |
| **Warning / PR**| `--warning` | `#f59e0b` | High RPE, rest countdown urgency, gold PR badges |
| **Danger** | `--danger` | `#ef4444` | Deletion actions, negative deltas |
| **Text** | `--text` | `#f1f1f8` | Primary text and headings |
| **Text Muted** | `--text-muted` | `#8a8aa3` | Secondary labels, descriptions |
| **Text Dim** | `--text-dim` | `#52526b` | Placeholders, inactive hints |
| **Font Sans** | `--sans` | `'Inter', system-ui, sans-serif` | Clean geometric UI typography |
| **Font Mono** | `--mono` | `'JetBrains Mono', monospace` | Timers, reps, sets, tabular metrics |

---

## 3. Core Screens & Navigation Hierarchy

### Top Navigation Bar
- **Logo**: `CalistheniX` with vibrant purple `i` indicator.
- **Top Tabs**: `Dashboard` (`#dashboard`), `Today` (`#home`), `History` (`#history`), `Routine` (`#routine`), `Edit` (`#edit`).

---

### Screen 0: Dashboard View (`#dashboard`)
- **Top Metrics Row**: Consecutive streak counter (with dynamic yesterday preservation), weekly completed workouts, and rolling 7-day sets volume.
- **Top Movers Section**: Exercises showing greatest 2-week performance gains with positive delta badges (`+15%`).
- **All-Time Personal Records (PRs) Card**: All-time maximum reps, hold duration, and added load (+kg) badges with direct chart links.
- **4-Week Consistency Heatmap**: 28-cell visual activity calendar showing workout frequency and intensity.
- **Today Split Card**: Live split card displaying current cycle day (`Push A`, `Pull B`, etc.) with one-tap link to start or continue workout.
- **Backup & Restore Actions**: One-click JSON backup export (Bundle v2.0) and idempotent snapshot restore file picker.

---

### Screen 1: Today's Execution Launcher (`#home`)
- **Today Hero Card (`.today-hero-card`)**: High-impact split banner with current day tag (`Push A`), estimated workout duration, ~total sets, and live status badge (`Ready to Train` vs `Workout Completed`).
- **Exercise Preview List (`.today-ex-preview-card`)**: Clean, distraction-free exercise preview order with movement tags, set count, target prescriptions, and last logged session stats.
- **Action Buttons**: Primary **"Start Today's Workout"** (or **"Resume Workout"**) button launching the live runner.

---

### Screen 2: Routine Blueprint Viewer (`#routine`)
- **Routine & Level Selector**: Dropdowns for selecting split names (`Push A`, `Pull A`, `Legs A`, etc.) and Levels (1–5).
- **Workout Blueprint Table**: Displays exercise sequence, target sets, target reps/duration, tempo notation (e.g. `3010`), rest periods, and superset groupings.
- **Superset Brackets**: Visual enclosure for exercises sharing a superset group (`SS1`, `SS2`) with explicit *no rest between exercises* indicators.
- **Coaching Notes**: Form cues, mobility pointers, and tempo instructions.

---

### Screen 3: Routine & Catalog Editor (`#edit`)
- **Interactive Exercise Management**: Add exercises to routine levels, edit parameters inline, adjust tempo/rest, or remove slots.
- **Custom Exercise Creator**: Form for registering brand-new movements in the global catalog with progression target thresholds.

---

### Screen 4: Active Workout Runner (`#workout`)
- **Session Topbar**: Real-time duration timer (`MM:SS`), Pause/Resume toggle (`Pause` / `Resume`), Leave button, and Finish Workout CTA.
- **Dynamic Progress Bar**: Live set completion ratio (`X / Y Sets Completed`) with smooth gradient fill.
- **Active Exercise Focus Spotlight (`.workout-ex-card-active`)**: Current in-progress exercise card glows with a purple accent border and displays an animated `Focus` badge.
- **Tempo Prescriptions**: Inline pill badge (e.g. `Tempo: 3010`) maintaining strict eccentric/isometric form guidance.
- **Frictionless Set Adjustments**: Inline `+` and `-` stepper buttons alongside direct numerical input for instant set adjustments without mobile keyboard popups.
- **Dedicated Hold Stopwatch**: Hold-type exercises feature a prominent **"Start Hold"** button that runs a millisecond stopwatch and saves exact measured seconds upon clicking **"Stop"**.
- **Live In-Workout PR Detection**: Beating a previous all-time personal record instantly triggers a celebratory fanfare chime and a gold alert toast (`🏆 NEW PR!`).
- **Automated Rest Countdown**: Automatic rest timer overlay with countdown numerals, tick sounds (3s, 2s, 1s), and quick skip option.

---

### Screen 5: Unified Training Log History (`#history`)
- **Workout Sessions Feed**: Chronological cards of all recorded workouts displaying split name, routine level, completion percentage, total sets, date, and exact duration.
- **Session Detail Drilldown (`#session-<uuid>`)**: Full breakdown of every exercise and every recorded set (reps/seconds, added weight in kg, RPE, timestamp).
- **Direct Navigation**: Tap any historical session to view exact set records or tap any exercise to view progression charts.

---

### Screen 6: Exercise History & Chart View (`#history-<id>`)
- **Performance Chart**: Interactive line chart (Chart.js) rendering historical progress over time.
- **Metric Mode Switch**: Toggle between **[Best Set / Max Hold]** and **[Total Volume / Total Duration]**.
- **Progression Banner & Promotion**: Surfaces weighted readiness scoring (60% hit-rate + 40% fatigue credit) and a one-tap **"Promote"** action when criteria are satisfied.

---

### Screen 7: Standalone Log Entry Screen (`#log-<id>`)
- **Repetition Logging**: Large numerical rep keypad, optional weight input, and 1–10 RPE segmented control.
- **Isometric Hold Timer**: Giant start/stop timer widget displaying elapsed seconds in high-contrast monospace numerals.
- **Rest Countdown**: Automated rest timer screen with remaining seconds countdown and audio/haptic cues.

---

## 4. Rate of Perceived Exertion (RPE) & Fatigue System

| RPE | Reps in Reserve (RIR) | Effort Level | Training Context |
|:---|:---|:---|:---|
| **1–5** | 5+ RIR | Very Light / Warmup | Mobility, dynamic warm-up drills, active recovery |
| **6** | ~4 RIR | Comfortable | Technical skill practice, easy work |
| **7** | ~3 RIR | Moderate | Volume accumulation sets |
| **8** | ~2 RIR | Target Overload | Primary progressive overload zone (optimal stimulus-to-fatigue) |
| **9** | ~1 RIR | Heavy / Near Limit | Near technical failure (triggers fatigue guard if sustained) |
| **10** | 0 RIR | Maximum Effort | Technical failure (absolute limit) |

---

## 5. Interaction Patterns & Touch Targets

1. **Touch Target Size**: Minimum 44×44px hit areas on all buttons and inputs to prevent missed taps during workouts.
2. **Instant Optimistic Feedback**: Set saves immediately display a checkmark animation without awaiting backend sync.
3. **No Intrusive Confirmations**: Actions are fast and reversible; no blocking confirmation dialogs between sets.
4. **Haptic & Audio Signals**: Distinct audible beeps and vibrations for hold start, hold save, rest countdown tick, rest end, PR achievement, and level promotions.
5. **Crash Recovery & Offline First**: Active workout state is continuously mirrored to `localStorage` (`cx_active_session`), ensuring sessions survive accidental browser tabs closure or network drops.
