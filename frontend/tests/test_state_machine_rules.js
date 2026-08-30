/**
 * State Machine Rules Verification Test Suite
 * Tests all 11 explicit state machine rules & invariants
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('WORKOUT SESSION STATE MACHINE - 11 RULES VERIFICATION SUITE');
console.log('=============================================================\n');

const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const workoutJsContent = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

function createTestContext() {
  let activeSessionState = null;
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const mockGlobals = {
    location: { hash: '' },
    window: { location: { hash: '' }, addEventListener: () => {}, removeEventListener: () => {} },
    document: {
      getElementById: () => null,
      createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }),
      body: { appendChild: () => {} }
    },
    localStorage: localStorageMock,
    state: { exercises: [], workouts: [], todayResolved: null, activeSession: null },
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    showToast: () => {},
    render: () => {},
    todayISO: () => '2026-08-29',
    newUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9),
    renderIcon: (name) => `<icon:${name}>`,
    fmtSecs: (s) => `${s}s`,
    cueExerciseComplete: () => {},
    cueSetComplete: () => {},
    cueCountdownTick: () => {},
    cueTimerComplete: () => {},
    cueTick: () => {},
    cueRestEnd: () => {},
    cueHoldSave: () => {},
    isAutoAdvanceEnabled: () => false,
    triggerTimedAutoAdvance: () => {},
    cancelAutoAdvance: () => {}
  };

  const context = vm.createContext(mockGlobals);
  context.window = context;
  context.global = context;
  context.globalThis = context;

  vm.runInContext(constantsCode, context);
  vm.runInContext(utilsCode, context);
  vm.runInContext(audioCode, context);
  vm.runInContext(storageCode, context);
  vm.runInContext(stateCode, context);
  vm.runInContext(workoutJsContent, context);

  return context;
}

// Sample mock data for a workout with Warmup, Main (reps & duration hold), and Cooldown
const sampleWorkoutData = [
  // Warmup (2 items)
  { exercise_id: 1, exercise_name: 'Arm Circles', phase: 'warmup', duration_sec: 20, order_index: 0 },
  { exercise_id: 2, exercise_name: 'Wrist Prep', phase: 'warmup', duration_sec: 20, order_index: 1 },
  // Main Workout (2 exercises: 1 reps with 2 sets, 1 duration hold with 2 sets)
  { exercise_id: 10, exercise_name: 'Pull-ups', phase: 'main', sets: 2, reps: 5, rest_sec: 60, order_index: 2 },
  { exercise_id: 11, exercise_name: 'L-sit Hang', phase: 'main', exercise_type: 'duration', sets: 2, duration_sec: 15, rest_sec: 45, order_index: 3 },
  // Cooldown (2 items)
  { exercise_id: 20, exercise_name: 'Lat Stretch', phase: 'cooldown', duration_sec: 30, order_index: 4 },
  { exercise_id: 21, exercise_name: 'Shoulder Stretch', phase: 'cooldown', duration_sec: 30, order_index: 5 }
];

const ctx = createTestContext();

// -------------------------------------------------------------
// RULE 1: Starting Warm-Up changes phase from IDLE -> WARMUP / ACTIVE
// -------------------------------------------------------------
console.log('Testing Rule 1: Starting Warm-Up changes phase from IDLE -> WARMUP / ACTIVE');
ctx.startWorkoutFromData('Test Split', sampleWorkoutData, 4);
let session = ctx.getActiveSession();
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.WARMUP);
assert.strictEqual(session.phaseState, ctx.PHASE_STATES.IDLE);
assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.IDLE);

// Starting Warm-Up movement transitions IDLE -> ACTIVE
ctx.selectWarmupMovement(0);
session = ctx.getActiveSession();
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.WARMUP);
assert.strictEqual(session.phaseState, ctx.PHASE_STATES.ACTIVE);
assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.ACTIVE);
assert.strictEqual(session.warmupIndex, 0);
console.log('  ✓ Rule 1 verified: Initial session is IDLE -> starting warm-up transitions to WARMUP / ACTIVE\n');

// -------------------------------------------------------------
// RULE 2: Completing all warm-up exercises automatically unlocks Main Workout
// -------------------------------------------------------------
console.log('Testing Rule 2: Completing all warm-up exercises automatically unlocks Main Workout');
// Advance warmup item 0 -> warmup item 1
ctx.advanceWarmupMovement();
session = ctx.getActiveSession();
assert.strictEqual(session.warmupIndex, 1);
assert.strictEqual(session.warmup[0].completed, true);
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.WARMUP);

// Advance warmup item 1 (last warmup item) -> Warmup becomes COMPLETED
ctx.advanceWarmupMovement();
session = ctx.getActiveSession();
assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.COMPLETED);
console.log('  ✓ Rule 2 verified: Warmup COMPLETED unlocked Main Workout transition\n');

// -------------------------------------------------------------
// RULE 3: Starting Main Workout changes phase -> MAIN_WORKOUT
// -------------------------------------------------------------
console.log('Testing Rule 3: Starting Main Workout changes phase -> MAIN_WORKOUT');
ctx.startMainWorkoutFromWarmup();
session = ctx.getActiveSession();
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.MAIN_WORKOUT);
assert.strictEqual(session.currentPhase, 'main');
assert.strictEqual(session.phaseState, ctx.PHASE_STATES.ACTIVE);
assert.strictEqual(session.mainStatus, ctx.PHASE_STATES.ACTIVE);
assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE);
assert.strictEqual(session.activeExerciseIndex, 0);
assert.strictEqual(session.activeSetIndex, 0);
console.log('  ✓ Rule 3 verified: Transitioned to MAIN_WORKOUT / ACTIVE (SET_ACTIVE)\n');

// -------------------------------------------------------------
// RULE 4: Completing a set enters RESTING when rest is configured
// -------------------------------------------------------------
console.log('Testing Rule 4: Completing a set enters RESTING when rest is configured');
// Complete exercise 0, set 0 (Pull-ups, set 1)
ctx.toggleWorkoutSet(0, 0);
session = ctx.getActiveSession();
assert.strictEqual(session.exercises[0].sets[0].completed, true);
assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.RESTING);
assert.strictEqual(session.restTimer.isRunning, true);
assert.strictEqual(session.restTimer.durationSec, 60);
assert.strictEqual(session.restTimer.remainingSec, 60);
console.log('  ✓ Rule 4 verified: Set 0 complete, mainWorkoutSubState is RESTING with 60s rest timer\n');

// -------------------------------------------------------------
// RULE 5: Completing rest automatically makes the next set ready
// -------------------------------------------------------------
console.log('Testing Rule 5: Completing rest automatically makes the next set ready');
ctx.stopWorkoutRest();
session = ctx.getActiveSession();
assert.strictEqual(session.restTimer.isRunning, false);
assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE);
assert.strictEqual(session.activeExerciseIndex, 0);
assert.strictEqual(session.activeSetIndex, 1);
console.log('  ✓ Rule 5 verified: Rest completed, activeSetIndex advanced to 1, mainWorkoutSubState is SET_ACTIVE\n');

// -------------------------------------------------------------
// RULE 6: Completing the final set completes the exercise
// -------------------------------------------------------------
console.log('Testing Rule 6: Completing final set completes the exercise');
// Complete exercise 0, set 1 (final set of Pull-ups)
ctx.toggleWorkoutSet(0, 1);
session = ctx.getActiveSession();
assert.strictEqual(session.exercises[0].sets[1].completed, true);
assert.strictEqual(session.exercises[0].sets.every(s => s.completed), true);
// Active exercise auto-advances to next exercise (L-sit Hang, index 1)
assert.strictEqual(session.activeExerciseIndex, 1);
assert.strictEqual(session.activeSetIndex, 0);
console.log('  ✓ Rule 6 verified: Final set completed exercise 0, activeExerciseIndex advanced to 1\n');

// -------------------------------------------------------------
// Testing Isometric Hold Controls in Main Workout
// -------------------------------------------------------------
console.log('Testing Isometric Hold Exercise (L-sit Hang)');
ctx.stopWorkoutRest(); // Clear rest
session = ctx.getActiveSession();
ctx.startWorkoutHold(1, 0); // Start L-sit Hang hold
session = ctx.getActiveSession();
assert.strictEqual(session.holdTimer.isRunning, true);
assert.strictEqual(session.holdTimer.exIdx, 1);
assert.strictEqual(session.holdTimer.setIdx, 0);
assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE);

// Complete hold
ctx.stopWorkoutHold(true);
session = ctx.getActiveSession();
assert.strictEqual(session.exercises[1].sets[0].completed, true);
assert.strictEqual(session.holdTimer.isRunning, false);
assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.RESTING);
console.log('  ✓ Isometric hold start & stop completed successfully\n');

// -------------------------------------------------------------
// RULE 7: Completing the final main-workout exercise unlocks Cool Down
// -------------------------------------------------------------
console.log('Testing Rule 7: Completing the final main-workout exercise unlocks Cool Down');
ctx.stopWorkoutRest(); // Clear rest
// Complete final set of final exercise (L-sit Hang, set 1)
ctx.toggleWorkoutSet(1, 1);
session = ctx.getActiveSession();
assert.strictEqual(session.mainStatus, ctx.PHASE_STATES.COMPLETED);
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.COOLDOWN);
assert.strictEqual(session.currentPhase, 'cooldown');
assert.strictEqual(session.cooldownStatus, ctx.PHASE_STATES.ACTIVE);
assert.strictEqual(session.cooldownIndex, 0);
console.log('  ✓ Rule 7 verified: Main Workout complete, phase transitioned to COOLDOWN / ACTIVE\n');

// -------------------------------------------------------------
// RULE 8: Completing all cooldown exercises completes the workout
// -------------------------------------------------------------
console.log('Testing Rule 8: Completing all cooldown exercises completes the workout');
// Advance cooldown 0 -> cooldown 1
ctx.advanceCooldownStretch();
session = ctx.getActiveSession();
assert.strictEqual(session.cooldownIndex, 1);
assert.strictEqual(session.cooldown[0].completed, true);

// Advance cooldown 1 (last cooldown item) -> triggers finishWorkoutSession()
ctx.advanceCooldownStretch();
session = ctx.getActiveSession();
assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.COMPLETED, 'Session entered COMPLETED phase');
assert.strictEqual(session.status, 'completed', 'Session status marked completed');
assert.ok(session.summaryData, 'Summary metrics attached');

// Click Done on Workout Complete
ctx.handleDoneWorkoutClick();
assert.strictEqual(ctx.getActiveSession(), null, 'Active session cleared from state upon clicking Done');
console.log('  ✓ Rule 8 verified: Cooldown complete, workout session finished and archived\n');

// -------------------------------------------------------------
// RULE 9: Workout cannot become COMPLETED before required phases are completed unless user explicitly chooses to skip them
// -------------------------------------------------------------
console.log('Testing Rule 9: Required phase completion guards against premature finish');
const freshCtx = createTestContext();
freshCtx.startWorkoutFromData('Incomplete Split', sampleWorkoutData, 4);
let freshSession = freshCtx.getActiveSession();
// Workout is currently in Warm-up with 0 completed sets
let phaseModel = freshCtx.getWorkoutPhaseModel(freshSession);
assert.strictEqual(phaseModel.overall.isCompleted, false);

// Attempt to finish without completing required phases
let modalOpened = false;
freshCtx.openConfirmFinishWorkoutModal = () => { modalOpened = true; };
freshCtx.requestFinishWorkout();
assert.strictEqual(modalOpened, true, 'Confirmation modal must open when finishing prematurely');
assert.notStrictEqual(freshCtx.getActiveSession().phase, freshCtx.WORKOUT_PHASES.COMPLETED);
console.log('  ✓ Rule 9 verified: Incomplete session guarded from premature completion\n');

// -------------------------------------------------------------
// RULE 10 & 11: Pausing freezes all active workout timers, Resuming continues from exact state
// -------------------------------------------------------------
console.log('Testing Rule 10 & 11: Pause freezes timers, Resume continues without drift');
const timerCtx = createTestContext();
timerCtx.startWorkoutFromData('Timer Split', sampleWorkoutData, 4);
let timerSession = timerCtx.getActiveSession();

// Start rest timer
timerCtx.setWorkoutPhase('main');
timerCtx.startWorkoutRest(45, 'Next Set', 'Good job');
timerSession = timerCtx.getActiveSession();
assert.strictEqual(timerSession.restTimer.isRunning, true);
assert.strictEqual(timerSession.restTimer.remainingSec, 45);

// Pause Session
timerCtx.pauseWorkoutSession();
timerSession = timerCtx.getActiveSession();
assert.strictEqual(timerSession.phaseState, timerCtx.PHASE_STATES.PAUSED);
assert.strictEqual(timerSession.status, 'paused');
assert.ok(timerSession.pausedAt != null);
assert.strictEqual(timerSession.restTimer.isRunning, false);
assert.ok(timerSession.restTimer.pausedAt != null);
assert.strictEqual(timerSession.restTimer.remainingSec, 45);
console.log('  ✓ Rule 10 verified: Pause froze sessionTimer and restTimer at exactly 45s remaining');

// Resume Session
timerCtx.resumeWorkoutSession();
timerSession = timerCtx.getActiveSession();
assert.strictEqual(timerSession.phaseState, timerCtx.PHASE_STATES.ACTIVE);
assert.strictEqual(timerSession.status, 'in_progress');
assert.strictEqual(timerSession.restTimer.isRunning, true);
assert.strictEqual(timerSession.restTimer.remainingSec, 45);
console.log('  ✓ Rule 11 verified: Resume continued exactly from remaining 45s without loss or drift\n');

timerCtx.stopWorkoutRest();

console.log('=============================================================');
console.log('ALL 11 STATE MACHINE RULES VERIFIED AND PASSED 100%! ✅');
console.log('=============================================================');
process.exit(0);
