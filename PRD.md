# PRD — Calisthenics Progression Tracker

## 1. Problem Statement
Generic weight-lifting trackers (Hevy, Strong, FitNotes) model training as `sets x reps @ weight`. Calisthenics skill work — planche, front lever, L-sit, handstand progressions — doesn't fit that shape. It's `hold duration`, `tempo`, and `progression tier` (e.g. tuck front lever → advanced tuck → straddle → full). No mainstream free tool models this well. This app exists to close that specific gap, not to replace a general workout logger.

## 2. Goal
A single-user tool that lets me log my existing 5-day PPL/aesthetic split — including rep-based and hold-based exercises — and see trend charts, so I can tell whether I'm actually progressing week over week.

**Explicit non-goal:** this is not trying to out-feature Hevy/Strong for general lifting. If the reps/weight logging becomes the primary use case, that's a signal the project has drifted and should stop.

## 3. Target User
Me. Single user, no auth in MVP. Design decisions should not be made "for scale" or "for other users" unless stated in Phase 3+.

## 4. Success Criteria (how I'll know the MVP was worth building)
- I open this app instead of a notes app / spreadsheet for at least 3 consecutive real gym sessions in week 1.
- I can look at any exercise and see a trend line/number without doing mental math.
- Logging a set takes under 10 seconds, including hold-timer exercises.

If these aren't true after 2 weeks of real use, stop building further phases — the tool isn't earning its place over Hevy + a spreadsheet.

## 5. Functional Requirements (MVP scope — see phases.md for what's cut)

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Pre-seeded list of my 5-day split exercises, grouped by day (Push/Pull/Legs/Full Body/Active Recovery) | Must |
| F2 | Log a rep-based set: reps, optional weight, optional RPE | Must |
| F3 | Log a hold-based set: start/stop timer → duration in seconds | Must |
| F4 | View a single trend chart per exercise (metric over time) | Must |
| F5 | Data persists locally even with no network (offline-first logging) | Must |
| F6 | Export all logs as JSON (backup) | Must |
| F7 | Exercises store `prerequisite` / `next` relationships (skill tree data model) — UI for this is NOT MVP, but schema must support it now | Must (data model only) |
| F8 | User can add/edit/delete custom exercises | Should (not MVP) |
| F9 | Auto-suggest progression when trend plateaus/improves | Won't (MVP) |
| F10 | Multi-user / auth | Won't (MVP) |
| F11 | Video form capture | Won't (MVP) |

## 6. Non-Functional Requirements
- Must be usable one-handed on a phone mid-workout, gym wifi assumed unreliable.
- No backend dependency for the core "log a set" action — writes to local storage first, syncs when possible.
- No paid infra. SQLite + Flask on something free-tier or self-hosted.

## 7. Out of Scope (explicitly, to prevent scope creep)
- Nutrition tracking
- Social features, sharing, leaderboards
- Auto-generated programs
- Anything resembling "a complete platform" — see architecture.md for the scope discipline note.

## 8. Risks (carried from prior discussion)
- Scope creep is the single biggest risk given past project patterns (see phases.md guardrails).
- Abandonment after week 2-3 is the default outcome for self-built trackers; success criteria above exist specifically to catch this early and cheaply.
- Time cost competes directly with DSA prep, which is the higher near-term priority (internships). This project should not expand past MVP unless success criteria in §4 are met.
