# Design System & UI Specification — CalistheniX

## 1. Design Philosophy

- **Gym-Usable Ergonomics**: One-handed operation, massive tap targets (min 44×44px), high-contrast dark theme, and minimal screen time per set.
- **Data-Dense, Zero Fluff**: Structured statistics, tabular monospace numbers, and clean visual progress indicators instead of marketing prose or unnecessary illustrations.
- **Dark Aesthetic Canvas**: Deep dark canvas (`#0a0a0f`) with glassmorphism surfaces (`#12121a`, `#1a1a26`) designed for harsh gym lighting and reduced OLED battery consumption.
- **Phase-Based Duotone Color System**: Amber (`#f59e0b`) for warm-up mobility, Coral-Red/Custom (`#FF5D5D`) for main strength overload, and Teal (`#14b8a6`) for cool-down recovery.
- **Immediate Sensory Feedback**: Auditory oscillators (Web Audio API) and haptic pulses (Navigator Vibration API) enable blind feedback during strenuous isometric holds and rest intervals.

---

## 2. Visual Tokens & Styling System

| Token | CSS Variable | Value | Purpose / Usage |
|:---|:---|:---|:---|
| **Background Canvas** | `--bg` | `#0a0a0f` | Main viewport canvas |
| **Surface 1** | `--surface` | `#12121a` | Cards, primary containers, input panels |
| **Surface 2** | `--surface-2` | `#1a1a26` | Elevated rows, hover states, input fields |
| **Border** | `--border` | `rgba(255, 255, 255, 0.07)`| Subtle element boundaries |
| **Border Focus** | `--border-focus` | `--accent` | Active input and element focus outline |
| **Accent (Train)** | `--accent` / `--phase-train` | `#FF5D5D` (Customizable) | Main workout phase, primary CTA, active navigation |
| **Warm-Up Accent** | `--phase-warmup` | `#f59e0b` | Joint prep, mobility drills, warmup rest |
| **Cool-Down Accent**| `--phase-cooldown` | `#14b8a6` | Static stretching, decompression, recovery |
| **PR Gold** | `--warning` / `--pr-gold` | `#eab308` | Gold Personal Record badges, all-time PR toasts |
| **Success** | `--success` | `#22c55e` | Completed sets, positive progression deltas |
| **Danger** | `--danger` | `#ef4444` | Deletion actions, negative deltas |
| **Text Primary** | `--text` | `#f1f1f8` | Primary text, titles, numbers |
| **Text Muted** | `--text-muted` | `#8a8aa3` | Secondary labels, descriptions |
| **Text Dim** | `--text-dim` | `#52526b` | Placeholders, inactive hints |
| **Font Sans** | `--sans` | `'Inter', 'Plus Jakarta Sans', system-ui, sans-serif` | Clean geometric UI typography |
| **Font Mono** | `--mono` | `'JetBrains Mono', monospace` | Timers, reps, hold seconds, tabular metrics |

---

## 3. Navigation Hierarchy & Screen Architecture

### Global Shell
- **Desktop Sidebar (`>= 1024px`)**: Fixed left navigation bar displaying logo `CalistheniX`, theme toggle, cloud sync status dot, navigation links, and athlete profile footer.
- **Mobile Header (`< 1024px`)**: Compact top bar with logo, sync status indicator, theme toggle button, and quick settings gear.
- **Mobile Bottom Navigation (`< 1024px`)**: Persistent bottom tab bar with dynamic sliding pill indicator supporting quick navigation across Home, Split, Workout (highlighted), Stats, and Progress.

---

### Core Screen Specifications

#### 1. Home / Daily Command Center (`#home`, `#dashboard`)
- **Today Hero Card**: Dynamic card displaying active split title (*Push Pull Legs*), day type (Workout vs. Rest), total movements, prescribed sets, estimated duration, and prominent **"Start Today's Workout"** button.
- **Rest Day Mode**: When today is configured as rest, presents recovery directives and a teaser preview of the next upcoming workout with an early start option.
- **Biomechanical Muscle Focus**: Front and back vector anatomical diagrams highlighting targeted muscle groups in real time.
- **Training Streak & Volume**: Active day streak counter, 7-day adherence bar, and weekly set metrics.

#### 2. Live Workout Runner (`#workout`)
- **Session Topbar**: Live elapsed stopwatch (`MM:SS`), Pause/Resume toggle, Leave button, and Finish Workout CTA.
- **Tri-Phase Progress Bar**: Visual phase indicator showing current transition (*Warm-up* &rarr; *Main Workout* &rarr; *Cool-down*).
- **Active Exercise Spotlight**: `.workout-ex-card-active` with vibrant focus border and animated `Focus` badge.
- **Hold Stopwatch vs. Rep Stepper**:
  - Reps: `+` / `-` steppers with direct numeric input and "Same as last" quick fill.
  - Holds: Prominent millisecond stopwatch button that saves exact measured hold seconds.
- **Automated Rest Timer**: Countdown overlay with audio tick tones (3s, 2s, 1s) and skip button.
- **PR Celebrations**: Real-time evaluation triggering celebratory audio fanfare and gold toast (`🏆 NEW PR!`).

#### 3. Split & Weekly Schedule Planner (`#split`)
- **7-Day Grid (Monday–Sunday)**: Interactive day cards showing assigned workout blueprints or rest days.
- **Day Editor Modal**: Quick modal for assigning workouts or toggling rest days.
- **Reusable Workouts Tab**: Reusable workout catalog with exercise slot ordering, set targets, tempo codes (`3010`), rest intervals, supersets (`SS1`, `SS2`), and one-tap duplication.

#### 4. Stats & Consistency Dashboard (`#stats`)
- **Volume & Metrics**: Total completed sessions, total volume tonnage, set counts, and average workout duration.
- **4-Week Consistency Heatmap**: 28-cell visual activity calendar showing session density and training intensity.
- **Top Movers**: Movements showing highest 2-week performance gains with positive delta badges (`+15%`).

#### 5. Progress Trends & Promotion Engine (`#progress`)
- **Chart.js Performance Graph**: Interactive line chart visualizing performance progression over time.
- **Metric Toggle**: Switch between **[Best Set / Max Hold]** and **[Total Volume / Duration]**.
- **Overload Readiness & Promotion**: Weighted readiness score card (60% hit-rate + 40% fatigue credit) with one-tap **"Promote"** action to level up routine slots.

#### 6. Personal Records Leaderboard (`#prs`)
- **All-Time Milestone Cards**: Displays highest achievements for **Max Reps**, **Longest Hold Duration (sec)**, and **Heaviest Added Weight (+kg)** with relative achievement dates.

#### 7. Training Calendar (`#calendar`)
- **Monthly Interactive Calendar**: Full-month grid displaying completed workout indicators, session volume, and direct links to historical workout summaries.

#### 8. Movement Library (`#library`)
- **Movement Catalog**: Filterable catalog of calisthenics exercises categorized by biomechanical movement patterns.
- **Custom Exercise Builder**: Modal form for registering custom exercises with progression prerequisites and targets.

#### 9. History Feed & Session Drilldown (`#history_list`, `#session-<uuid>`)
- **Feed**: Chronological list of completed workout cards with duration, completed sets, and phase statuses.
- **Session Drilldown**: Exact recorded set breakdown (reps, hold seconds, added kg, RPE, timestamps).

#### 10. Settings & Preferences Modal (`#settings`)
- **Theme & Accents**: Light / Dark / System mode toggle and custom phase accent color selector.
- **Units & Audio**: Kilograms (`kg`) vs. Pounds (`lbs`), sound effect toggle, and vibration feedback toggle.
- **Data Portability**: Full JSON backup export (`GET /export`) and idempotent restore (`POST /import`).

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
5. **Crash Recovery & Offline First**: Active workout state is continuously mirrored to `localStorage` (`cx_active_session`), ensuring sessions survive accidental browser tab closures or network drops.
