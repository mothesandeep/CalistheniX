# Phases — Calisthenics Progression Tracker

## Guardrail (read before starting any phase)
Past pattern: your projects (C++ note system, curriculum design) tend to expand into "complete platform" scope before the core loop is validated. This plan exists to prevent that here specifically. **Do not start Phase 2 until the Phase 1 exit criteria are actually met with real usage data — not "I think it'll work."**

Time is also competing directly with DSA prep (higher near-term priority per internship goal). If a phase is taking meaningfully longer than estimated, that's a signal to stop and reassess, not to push through.

---

## Phase 0 — Setup (~1-2 hrs)
- Seed `exercises` table with your actual 5-day split (from prior aesthetic program work), marking each `type: reps | duration`.
- Set up Flask project skeleton + SQLite file.
- Set up static HTML/CSS/JS shell, no logic yet.

**Exit criteria:** app loads, shows today's exercises from the DB, does nothing else.

---

## Phase 1 — MVP Core Loop (~15-20 hrs, ~2-3 weeks part-time)
Build F1–F7 from PRD.md, in this order:
1. F1 — Today's Day screen, exercises listed
2. F2 + F3 — Log entry (reps form, duration timer)
3. F5 — Local-first write (localStorage), background sync to Flask
4. F4 — Single trend chart per exercise
5. F6 — JSON export
6. F7 — DB columns for prerequisite/next exist, unused by UI

**Exit criteria (from PRD.md §4 — this is the actual gate, not a vibe check):**
- Used for 3+ consecutive real gym sessions
- Logging a set takes under 10 seconds including hold timers
- You can look at any exercise's trend without mental math

**If exit criteria aren't met after 2 weeks of honest use → stop. Do not proceed to Phase 2. Go back to Hevy/spreadsheet and treat this as a learning exercise, not a failure requiring more features to fix.**

---

## Phase 2 — Only if Phase 1 succeeds: Quality of Life
Scope: small, targeted fixes based on actual friction you hit in Phase 1 — not speculative features.
- F8 — add/edit/delete custom exercises (if you actually changed your split and it was annoying to edit the DB directly)
- Better aggregation options on the chart (e.g. toggle volume vs. max hold) — only if you found yourself wanting a different metric during Phase 1
- PWA install polish (icons, manifest refinement)

**Exit criteria:** still using it daily; no phase-2 item added unless it fixes a friction point you actually hit, logged during Phase 1.

---

## Phase 3 — Only if this becomes a portfolio piece: Skill Tree + Progression
This phase is the actual differentiator vs. Hevy/Strong (per the original "is this worth building" analysis) — but it's expensive, so it's gated behind real sustained use first.
- UI for prerequisite/next exercise relationships (skill tree view)
- Auto-suggest progression when trend plateaus/improves (F9)
- Possibly: auth + multi-user (F10), if intended to share/demo beyond yourself

**Do not start this phase for "completeness."** Start it only if (a) Phase 1+2 are in daily real use, and (b) you specifically want this as an internship portfolio artifact — in which case scope it as a deliberate decision, not an organic feature-creep continuation.

---

## Summary Timeline

| Phase | Est. time | Gate to proceed |
|---|---|---|
| 0 — Setup | 1-2 hrs | App loads with seeded data |
| 1 — MVP | 15-20 hrs / 2-3 wks | 3+ real sessions, <10s logging, readable trend — PRD §4 |
| 2 — QoL | TBD, small | Daily use continues, friction-driven only |
| 3 — Skill tree | TBD, larger | Explicit portfolio decision, not default next step |
