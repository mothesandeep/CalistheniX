# Design System & UI Specification — CalistheniX

## 1. Design Philosophy

- **Gym-Usable Ergonomics**: One-handed operation, massive tap targets (min 44×44px), high-contrast dark theme, and minimal screen time per set.
- **Data-Dense, Zero Fluff**: Structured statistics, tabular monospace numbers, and clean visual progress bars instead of marketing prose or unnecessary illustrations.
- **Dark Aesthetic Default**: Deep dark canvas (`#0a0a0f`) with electric purple accents (`#7c5cfc`) designed for harsh gym lighting and reduced OLED battery consumption.

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
| **Warning** | `--warning` | `#f59e0b` | High RPE, rest countdown urgency |
| **Danger** | `--danger` | `#ef4444` | Deletion actions, negative deltas |
| **Text** | `--text` | `#f1f1f8` | Primary text and headings |
| **Text Muted** | `--text-muted` | `#8a8aa3` | Secondary labels, descriptions |
| **Text Dim** | `--text-dim` | `#52526b` | Placeholders, inactive hints |
| **Font Sans** | `--sans` | `'Inter', system-ui, sans-serif` | Clean geometric UI typography |
| **Font Mono** | `--mono` | `'JetBrains Mono', monospace` | Timers, reps, sets, tabular metrics |

---

## 3. Core Screens & Navigation Hierarchy

### Screen 0: Dashboard View (`#dashboard`)
- **Top Metrics Row**: Consecutive streak counter, weekly completed workouts, and weekly total sets.
- **Top Movers Section**: Exercises showing greatest 2-week performance gains with positive delta badges (`+15%`).
- **Personal Records (PRs) Card**: All-time maximum reps, hold duration, and added weight badges.
- **4-Week Consistency Heatmap**: 28-cell visual activity calendar showing workout frequency and intensity.
- **Today Split Card**: Live split card displaying current cycle day (`Push A`, `Pull B`, etc.) with one-tap link to start or continue workout.
- **Backup & Restore Actions**: One-click JSON backup export and snapshot restore file picker.

### Screen 1: Today's Split (`#home`)
- **Split Header**: Active split name, calendar date, and cycle tag.
- **Exercise Card List**: Chronological list of today's target exercises showing last logged numbers (e.g. `last: 4 × 15 reps` or `last: 32s`).
- **Start Workout Button**: Direct one-tap launcher for the active workout session.

### Screen 2: Routine View (`#routine`)
- **Routine & Level Selector**: Dropdowns for selecting split names (`Push A`, `Pull A`, `Legs A`, etc.) and Levels (1–5).
- **Workout Blueprint Table**: Displays exercise sequence, target sets, target reps/duration, tempo notation (e.g. `2010`), rest periods, and superset groupings.
- **Superset Brackets**: Visual enclosure for exercises sharing a superset group (`SS1`, `SS2`) with explicit *no rest between exercises* indicators.

### Screen 3: Routine & Catalog Editor (`#edit`)
- **Interactive Exercise Management**: Add exercises to routine levels, edit parameters inline, adjust tempo/rest, or remove slots.
- **Custom Exercise Creator**: Inline form for registering brand-new movements in the global catalog with progression target thresholds.

### Screen 4: Active Workout Runner (`#workout`)
- **Session Topbar**: Real-time duration timer (`MM:SS`), Leave button, and Finish Workout button.
- **Dynamic Progress Bar**: Live set completion ratio (`X / Y Sets Completed`) with percentage fill.
- **Target vs. Actual Matrix**: Individual set rows with editable actual reps/duration input, optional weight, and completion checkboxes.

### Screen 5: Log Entry & Guided Workout Screen (`#log-<id>`)
- **Repetition Logging**: Large numerical rep keypad, optional weight input, and 1–10 RPE segmented control.
- **Isometric Hold Timer**: Giant start/stop timer widget displaying elapsed seconds in high-contrast monospace numerals.
- **Rest Countdown**: Automated rest timer screen with remaining seconds countdown and audio/haptic cues.

### Screen 6: Exercise History & Chart View (`#history-<id>`)
- **Performance Chart**: Interactive line chart (Chart.js) rendering historical progress over time.
- **Metric Mode Switch**: Toggle between **[Best Set / Max Hold]** and **[Total Volume / Total Duration]**.
- **Progression Banner & Promotion**: Surfaces 2-week rolling performance comparisons and a one-tap **"Promote 🚀"** button when targets are achieved.

---

## 4. Interaction Patterns & Touch Targets

1. **Touch Target Size**: Minimum 44×44px hit areas on all buttons and inputs to prevent missed taps during workouts.
2. **Instant Optimistic Feedback**: Set saves immediately display a checkmark animation without awaiting backend sync.
3. **No Intrusive Confirmations**: Actions are fast and reversible; no blocking confirmation dialogs between sets.
4. **Haptic & Audio Signals**: Distinct audible beeps and vibrations for hold start, hold save, rest countdown tick, and rest end.
