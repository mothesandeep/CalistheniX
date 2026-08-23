# Design — Calisthenics Progression Tracker

## 1. Design Principles
- **Gym-usable, one hand, under 10 seconds per log.** Every design decision gets checked against this. If a screen needs two hands or careful reading mid-set, it's wrong.
- **No decoration that isn't information.** You've consistently preferred dashboard-style, structured, decision-table UI over generic prose — same principle applies here: charts and numbers, not motivational copy or empty states with mascots.
- **Dark theme default** — gym lighting is usually bad, and this matches the note-taking system you already use for C++ chapters (JetBrains Mono + Inter, dark background) for visual consistency across your own tools.

## 2. Screens (MVP — 4 screens total, no more)

### Screen 1 — Today's Day
- Shows current split day (Push/Pull/Legs/Full Body/Active Recovery) — auto-detected from a simple day-of-week → split mapping you set once, editable.
- Lists exercises for that day as tappable rows.
- Each row shows: exercise name, last logged value (e.g. "last: 42s" or "last: 8 reps @ 0kg").

### Screen 2 — Log Entry (per exercise)
- If `type = reps`: three inputs — reps (numeric keypad), weight (optional, numeric keypad), RPE (optional, 1-10 stepper). One "Save" button.
- If `type = duration`: single large Start/Stop timer button, shows running time, saves duration on stop. No typing required mid-set.
- Save always writes local-first (see architecture.md §3) — UI shows an optimistic checkmark instantly, never a spinner waiting on network.

### Screen 3 — Exercise History / Chart
- One line chart: metric (duration or estimated volume) vs. date.
- A small stat row above the chart: current value, value 2 weeks ago, % change. This is the actual "is this working" answer — surface it, don't make the user read the chart to infer it.

### Screen 4 — Export
- One button: "Export all logs (JSON)". No settings, no options. This is the backup safety net from architecture.md — keep it trivially simple so it's never skipped.

## 3. Visual System

| Token | Value | Notes |
|---|---|---|
| Background | near-black (#0d0d0f style) | matches existing dark-theme note system |
| Font (UI) | Inter | body/UI text |
| Font (numbers) | JetBrains Mono | reps, weights, timers — tabular alignment matters for scanning fast |
| Accent | single accent color for "progress up" state | keep it to one accent; resist adding a full palette |
| Type hierarchy | large numerals for the active timer/input, small labels | mid-set, the number is what matters, not the label |

## 4. Interaction Notes
- Timer screen: the Start/Stop button should be the single largest tappable element on screen — thumb-reachable, no precision required, since hands may be sweaty/shaking post-set.
- No confirmation dialogs on save — every added tap is friction against the 10-second target. Undo (not confirm) is the right pattern if mistakes need correcting.
- No onboarding flow, no tutorial screens — this is a single-user tool for someone who designed the split it's logging; skip anything built for a stranger user.

## 5. Explicit Non-Design (MVP)
- No skill-tree visualization screen yet — data model supports it (architecture.md §2), but the UI for prerequisite/next relationships is Phase 3, not MVP. Don't design it now; it'll bias the schema toward a UI that doesn't exist yet.
- No settings screen beyond the one-time day-mapping setup — resist adding configuration options preemptively.
- No custom exercise creation UI in MVP — exercises are seeded directly into the DB by you, once, at setup.
