# CalistheniX — Product Requirements Document

**Status:** Active Development / Non-Stable
**Product:** CalistheniX
**Primary Platforms:** Web / PWA with mobile-first usage

---

## 1. Product Definition

CalistheniX is a focused, local-first training tracker and live workout runner built specifically for calisthenics and bodyweight training.

It should help an athlete:

**Plan → Train → Log → Review → Improve**

CalistheniX is not intended to be a generic weight-training logger. It must naturally support the realities of calisthenics training, including repetitions, isometric holds, tempo, rest periods, supersets, custom weekly schedules, reusable workouts, personal records, and training analytics.

The current repository is an active development version. Existing working functionality should be preserved unless a change is explicitly required to fix a defect or improve the product.

---

## 2. Product Goals

### P0 — Core Goals

1. Make workout execution fast and reliable.
2. Make actual training data easy to record.
3. Never lose completed workout data.
4. Keep Today and Routine clearly separated.
5. Make History a trustworthy record of completed sessions.
6. Make Dashboard and Progress reflect real persisted data.
7. Support calisthenics-specific metrics such as reps, holds, tempo, rest, RPE, and added load.
8. Provide a premium, clean, intentional interface that works during real training.
9. Work reliably with poor or unavailable connectivity for core training workflows.
10. Verify functionality before considering a feature complete — against actual code diffs and running behavior, not against the claim itself.

### P1 — Important Goals

- Strong personal-record tracking.
- Useful progress trends and training consistency analytics.
- Flexible custom exercises and reusable workouts.
- Backup and restore.
- Strong responsive/mobile ergonomics.
- Accessibility and performance improvements.

### P2 — Future Goals

- Smarter coaching and training intelligence.
- More advanced recommendations based on historical training data.
- Deeper athlete insights.

Do not expand the product with unrelated features merely to increase feature count.

---

## 3. Target User

Primary user:

**A dedicated calisthenics / bodyweight athlete who wants a reliable system for planning and recording training.**

The product should work particularly well in a gym or outdoor training environment where:
- the user may have sweaty hands,
- attention is focused on training,
- connectivity may be unreliable,
- controls must be easy to hit,
- important numbers must be immediately readable.

The experience should minimize unnecessary interaction between sets.

---

## 4. Core Product Model

CalistheniX revolves around five connected concepts:

### 4.1 Training Split
A named weekly program such as:
- Push / Pull / Legs
- Upper / Lower
- Full Body
- Custom split

Users may create and switch between multiple training splits.

### 4.2 Weekly Schedule
A Monday–Sunday schedule assigning either:
- a workout
- or Rest

Each day can be independently configured.

### 4.3 Reusable Workout
A reusable workout blueprint containing ordered exercises and their configuration.

Examples:
- Push A
- Pull A
- Upper Power
- Full Body A

A workout should not be permanently tied to only one calendar day.

### 4.4 Active Workout Session
A real-time training session created when the user starts a workout.

The active session contains the user's actual performance.

### 4.5 Completed Session
A persisted historical record of the completed workout.

Completed historical data must remain stable even if future routines, workouts, or schedules are changed.

---

## 5. Today vs Routine

These are intentionally different product concepts.

### Today

Today is the current-day execution entry point.

It answers:

> What should I do today?

It should display:
- today's scheduled workout or Rest
- current workout state
- quick Start / Resume action
- useful context about the current session

Today should not become a second weekly planner.

### Routine

Routine is the weekly planning and scheduling system.

It answers:

> How is my training week organized?

It should manage:
- training splits
- Monday–Sunday assignments
- workout assignment per day
- Rest days
- active split

Do not duplicate the same scheduling logic in multiple screens.

---

## 6. Workout Builder

Users should be able to create and edit reusable workouts.

Each workout may contain:
- name
- description
- ordered exercises
- sets
- reps
- hold duration
- rest interval
- tempo
- superset grouping
- coaching cues / notes

Required capabilities include:
- add exercise
- remove exercise
- reorder exercises
- edit exercise targets
- duplicate a workout
- create variations without corrupting the original workout

Workout editing must not mutate completed historical sessions.

---

## 7. Exercise & Movement Library

CalistheniX should maintain a reusable exercise catalog.

An exercise can include:
- name
- movement category
- target metric
- instructions / coaching cues
- equipment information where relevant
- relevant metadata

The user must be able to create custom exercises.

The system must support exercise types beyond simple `reps × weight`, including:
- repetition-based movements
- isometric holds
- weighted movements
- tempo-controlled movements

---

## 8. Live Workout Runner

The workout runner is a critical product experience.

During a session, the user should be able to quickly understand:

- current exercise
- current set
- target
- actual performance
- completed sets
- rest state
- overall workout progress
- exercise order
- relevant instructions

Core interactions include:
- Start
- Complete set
- Record actual performance
- Rest countdown
- Skip rest
- Pause / Resume where supported
- Move through exercises
- Complete workout

The UI should be optimized for one-handed and fast interaction.

---

## 9. Target vs Actual

The product must always distinguish between:

**Target** = what the workout prescribes.

**Actual** = what the athlete really completed.

Target values must not be silently overwritten by actual values.

Actual performance is the authoritative source for:
- History
- Progress
- PR calculations
- analytics

Supported actual metrics can include:
- reps
- hold duration
- added load
- RPE
- set completion
- notes where supported

---

## 10. Timers & Training Feedback

The workout runner should support reliable timing behavior.

### Session Stopwatch
Tracks elapsed workout duration and accurately handles pause/resume.

### Hold Timer
Captures exact isometric hold duration where applicable.

### Rest Timer
Supports:
- countdown
- automatic completion
- skip
- sensory cues such as audio where implemented

Timing logic must not be dependent on fragile UI rendering behavior.

Timer state and calculations should be deterministic and testable.

**Acceptance check:** every timer must have a pure, framework-independent function (input: start time, pause events, elapsed → output: duration) that can be unit-tested without rendering the UI. If a timer bug can only be reproduced by clicking through the app, the timer logic isn't isolated enough yet.

---

## 11. Session Persistence & Data Integrity

This is a **P0 requirement**.

The application must not lose workout information because of ordinary UI lifecycle events.

Core expectations:
- active session state survives reasonable interruptions where supported
- completed sessions are persisted
- refresh does not silently destroy completed data
- navigation does not silently destroy completed data
- duplicate submissions do not create duplicate sessions
- History reflects the canonical saved session
- Dashboard and analytics read from the same underlying data

Local-first behavior should remain available for core training workflows.

### 11.1 Idempotency & Race-Condition Checklist

Every write path that can be triggered more than once (double-tap "Complete Workout", retry after a dropped connection, sync replay after coming back online) needs an explicit answer to: *what happens if this exact request arrives twice?*

- Completed-session writes must use a client-generated idempotency key (e.g. session UUID created at workout start), not a server-generated one, so a retried request is recognized as a duplicate instead of creating a second row.
- Set-logging writes should be safe to resend without creating duplicate set entries.
- Sync-replay after reconnect must reconcile against the local session UUID, not blindly re-POST everything in the local queue.
- Any "last write wins" conflict resolution must be called out explicitly in code comments and in this document — silent overwrite of newer data by stale synced data is a data-integrity bug, not an edge case.

This checklist should be treated as part of the definition of done for §11, not a follow-up hardening task.

---

## 12. Workout History

History is the permanent record of training.

The user should be able to:
- browse completed sessions chronologically
- open a completed session
- inspect exercises
- inspect recorded sets
- inspect actual performance
- see duration and relevant totals

Changing future training configuration must never rewrite historical completed workouts.

History must reflect what happened, not what the current workout template looks like now.

---

## 13. Dashboard

Dashboard is the training overview / command center.

It should summarize meaningful information such as:
- current streak
- recent training
- weekly sessions
- weekly sets / volume
- recent PRs
- meaningful performance changes
- activity consistency

Dashboard values must come from trustworthy persisted training data.

Do not display fake, hard-coded, or disconnected metrics.

If the user has no data for a metric, show a deliberate empty state.

### 13.1 No-Mock-Data Verification

Before any dashboard metric is considered done:
- Trace the metric backward from the rendered UI element to the exact query or calculation that produces it. If that trace dead-ends in a literal number, placeholder array, or `// TODO: wire this up`, the feature is not done.
- New users (zero completed sessions) must see the deliberate empty state, never a plausible-looking placeholder value that could be mistaken for real data.
- This trace should be repeated after any refactor that touches the dashboard, since placeholder values from early scaffolding tend to survive silently.

---

## 14. Progress & Analytics

Progress exists to answer:

> Am I improving?

Useful views include:
- exercise performance over time
- repetition trends
- hold-duration trends
- added-load trends
- PR history
- training frequency
- consistency
- meaningful volume or workload trends

Charts should be used when they make progress easier to understand.

Do not add visualizations simply because they make the dashboard look more sophisticated.

Trend calculations must be based on actual recorded training data.

---

## 15. Personal Records

CalistheniX should support meaningful exercise-specific PRs.

Examples:
- maximum reps
- longest hold duration
- heaviest added load

PR logic must be:
- deterministic
- metric-aware
- based on completed actual performance
- testable
- resistant to duplicate logging

When a PR is detected during an active workout, visual/audio feedback may be provided without interrupting the training flow.

---

## 16. Training Consistency

The product should help the athlete understand training consistency.

Examples:
- streaks
- weekly session counts
- recent activity
- rolling activity heatmaps

Consistency metrics must be calculated from completed sessions, not planned sessions.

A planned workout that was never completed must not falsely count as completed training.

---

## 17. Backup & Restore

Where implemented, the product should support:

### Export
A complete backup of user training data.

### Import / Restore
A safe restoration process that:
- does not unnecessarily duplicate records
- preserves historical data
- handles repeated imports safely
- does not corrupt existing records

Backup functionality must be treated as data-integrity functionality, not merely a utility screen.

---

## 18. Offline / PWA

CalistheniX should remain useful during training even when connectivity is unavailable.

Core workout actions should not unnecessarily depend on a live network.

Where local-first synchronization is used:
- local state should remain usable
- synchronization should be resilient
- duplicate submissions should be prevented
- conflicts should be handled deliberately
- stale data should not silently overwrite newer data

Existing PWA, service-worker, caching, and local persistence behavior should be preserved unless intentionally redesigned.

**Cross-reference:** the duplicate-submission and stale-overwrite requirements above are the same ones formalized in §11.1. Treat any offline-sync change as touching both sections.

---

## 19. Mobile & Responsive Requirements

The primary workout interaction is mobile-first.

Requirements:
- large, easy-to-hit primary controls
- readable training numbers while moving
- minimal typing
- thumb-friendly interaction
- no accidental horizontal overflow
- correct layout on small phones
- usable tablet layout
- usable desktop layout

A responsive design is not considered complete merely because the page technically fits. It should be checked at actual small-phone, tablet, and desktop breakpoints, not just a resized browser window.

---

## 20. UI / UX Quality Bar

CalistheniX should feel:

**Premium + Minimal + Athletic + Focused + Intentional**

The interface must not feel:
- generic
- template-generated
- AI-generated
- like a generic gym tracker
- cluttered with decorative cards
- overloaded with gradients
- dependent on emojis for primary visual communication

Prefer:
- strong hierarchy
- disciplined spacing
- consistent typography
- purposeful motion
- clear states
- focused information density
- professional icons / SVG assets
- deliberate empty states
- polished micro-interactions

Animations should improve feedback and orientation rather than become a distraction.

### 20.1 "Does This Look AI-Generated?" Check

Before a screen is considered visually done, check it against the specific tells this PRD is trying to avoid:
- Are spacing values consistent and intentional, or do they look like framework defaults nobody adjusted?
- Is the phase-accent system (amber / coral-red / teal for warm-up / train / cool-down) applied consistently across every screen it appears on, or does one screen quietly use a different shade?
- Would removing all icons still leave the hierarchy readable? (If hierarchy depends on icon/emoji decoration rather than typography and spacing, that's a tell.)
- Does any screen look like it was assembled from a generic component library without adaptation to CalistheniX's own visual identity?

This check applies most to newly built screens, since scaffolding and first-draft AI-generated layouts are where generic defaults tend to survive unnoticed.

---

## 21. Accessibility

Core product functionality should remain accessible.

Requirements include:
- sufficient contrast
- semantic controls
- clear labels
- visible focus states
- sensible keyboard interaction where relevant
- touch targets large enough for mobile use
- status not communicated by color alone
- meaningful text for important controls

Accessibility should be considered during implementation, not added as a final patch.

**Specific to the phase-accent system:** because warm-up/train/cool-down states are currently distinguished by color (amber/coral-red/teal), each state also needs a non-color signal — label text, icon shape, or position — so the distinction survives for color-blind users and isn't lost in bright outdoor sunlight on a phone screen.

---

## 22. Performance

The app must feel responsive during training.

Priorities:
- fast screen transitions
- responsive set logging
- stable timers
- minimal blocking work
- efficient rendering
- no unnecessary network dependency during active workout logging

Performance optimizations must not compromise data correctness.

### 22.1 Performance Budget

Set explicit targets rather than a vague "feels fast":
- Time to interactive on the Live Workout Runner screen (the one used mid-set, one-handed): should not regress as more history/analytics features are added.
- Set-logging action (tap "Complete Set" → UI reflects it): should feel instant — no visible network round-trip should block this on a good connection, and it must work identically offline.
- Dashboard and Progress screens (data-heavier, checked less mid-workout) can tolerate more load time than the Runner, but should still avoid layout shift once charts load.

Re-check these informally whenever a new chart, sync mechanism, or analytics calculation is added to a screen that's on the critical training path (Today, Runner, Rest Timer).

---

## 23. Current Technical Baseline

The current repository uses a lightweight architecture centered around:

### Frontend
- Vanilla HTML
- CSS
- modern JavaScript
- Chart.js where required
- Service Worker / PWA capabilities
- LocalStorage / local-first behavior
- Web Audio / Vibration APIs where implemented

### Backend
- Python
- Flask
- REST APIs

### Database
- SQLite

The current architecture should be improved incrementally where necessary.

Do not migrate technologies simply because a newer framework exists.

Do not rewrite the application without a concrete product or engineering reason.

---

## 24. API & Data Rules

Backend/API behavior must preserve clear ownership of data.

Important domains include:
- training splits
- weekly schedules
- reusable workouts
- exercises
- workout sessions
- set logs
- dashboard summaries
- PR data
- backup / restore

APIs should be:
- predictable
- idempotent where repeated requests are possible
- explicit about failures
- safe for offline retry scenarios
- consistent with the actual database state

Frontend state must not become a second, contradictory source of truth.

---

## 25. Testing Strategy

Testing should focus on real user-critical behavior.

### Unit / Logic Tests
Use for:
- timer calculations
- PR calculations
- streak calculations
- analytics calculations
- persistence logic
- idempotency logic
- important data transformations

### Integration / API Tests
Use for:
- workout creation
- schedule changes
- session lifecycle
- set logging
- history retrieval
- backup / restore
- dashboard data

### End-to-End Tests
Critical flows should include:

**Routine → Today → Start Workout → Log Sets → Rest → Finish → History → Dashboard**

Also verify:
- refresh during an active session where supported
- duplicate submission handling
- empty states
- mobile layout
- important error states
- accessibility basics (contrast, focus order, non-color status signals) as part of the same E2E pass, not a separate audit that happens once and is forgotten

---

## 26. Development Workflow

Every meaningful change should follow:

**Understand → Inspect → Plan → Implement → Test → Verify**

For bugs:

**Reproduce → Trace → Identify Root Cause → Fix → Regression Test → Verify**

Do not:
- guess at the root cause
- patch symptoms repeatedly
- rewrite unrelated code
- claim success without verification

Before changing a feature, inspect the current implementation and preserve working behavior.

### 26.1 Verification Discipline

"Verify" in the workflow above means checking against something external to the claim itself — the actual diff, the running app's behavior, or a passing test — not re-reading the change and deciding it looks right.

- A change is not "done" because it was written; it's done when §29's checklist is actually satisfied against the current code, not against intent.
- Prefer small, surgical diffs over broad rewrites, especially in session-persistence, timer, and sync code — these are exactly the areas where a large refactor can silently reintroduce a bug this PRD already solved once.
- When a change touches idempotency or offline-sync logic (§11.1, §18), state explicitly what was tested (e.g. "double-submitted the complete-workout request and confirmed only one row was created") rather than asserting it works.

---

## 27. Prioritized Development Roadmap

### P0 — Stabilize the Core

1. Workout session reliability
2. Accurate target vs actual logging
3. Active workout runner
4. Timer reliability
5. Session persistence (including §11.1 idempotency checklist)
6. Today behavior
7. Routine scheduling
8. Workout History
9. Dashboard synchronization (including §13.1 no-mock-data trace)
10. Core progress analytics
11. Mobile usability
12. Error handling and recovery

### P1 — Strengthen the Product

1. PR experience
2. Custom exercise management
3. Custom workout management
4. Backup / restore hardening
5. Offline reliability
6. Responsive polish
7. Accessibility (including §21 phase-accent non-color signal)
8. Performance optimization (against §22.1 budget)
9. Better history and analytics UX

### P2 — Intelligence & Refinement

1. More useful training insights
2. Smarter recommendations
3. Advanced athlete analytics
4. Additional quality-of-life improvements

No feature should be promoted in priority merely because it looks impressive.

---

## 28. Non-Goals

CalistheniX is not intended to become:

- a generic bodybuilding/gym logger
- a social network
- a feed-first fitness product
- a gamified mobile game
- a metric dashboard with meaningless statistics
- an AI-generated UI showcase
- a rigid scheduling system
- a product that values visual polish over reliable training data

---

## 29. Definition of Done

A feature is DONE only when:

- [ ] The requirement is clearly understood.
- [ ] Existing implementation was inspected.
- [ ] Existing functionality was preserved unless intentionally changed.
- [ ] Data flow is correct.
- [ ] Persistence works where required, including the §11.1 idempotency/duplicate-submission check where applicable.
- [ ] Error and empty states are handled.
- [ ] UI is responsive at real small-phone, tablet, and desktop breakpoints.
- [ ] Accessibility basics are considered, including non-color status signals where relevant.
- [ ] Dashboard/analytics values are traced back to real data (§13.1), not left on placeholder scaffolding.
- [ ] The screen has been checked against §20.1's "does this look AI-generated" tells.
- [ ] Relevant automated tests pass.
- [ ] Critical user flow is verified in the running application when applicable.
- [ ] Lint/type/build checks pass where applicable.
- [ ] No known regression remains.
- [ ] Documentation is updated when behavior or architecture changes.

**Writing the code is not the same as completing the feature.**

---

## 30. Product North Star

CalistheniX should become a training tool that an athlete can trust during every session.

The product succeeds when the user can:

**Open → See what to train → Train → Record exactly what happened → Finish → Trust the saved history → Understand progress → Come back and train again.**

Reliability, clarity, and training usefulness take priority over feature count.
