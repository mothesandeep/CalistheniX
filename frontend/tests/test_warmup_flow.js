/**
 * CalistheniX - Warm-Up Flow Verification Test Suite
 * Tests the complete Warm-Up user experience and state machine rules:
 * - Overview state with "Start All Warm-Up" and preview list
 * - Single active exercise player replacing empty/overview states
 * - Exercise progression, Done, Rest, Skip with confirmation, Next, Back, Pause/Resume
 * - Warm-Up Complete state transition screen
 * - Transition into Main Workout
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING WARM-UP FLOW VERIFICATION TESTS');
console.log('=============================================================\n');

const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const workoutJsContent = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

function createTestContext() {
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

  const createdElements = [];

  const mockGlobals = {
    location: { hash: '' },
    window: { location: { hash: '' }, addEventListener: () => {}, removeEventListener: () => {} },
    document: {
      getElementById: (id) => createdElements.find(e => e.id === id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          innerHTML: '',
          style: {},
          setAttribute: (k, v) => { el[k] = v; },
          appendChild: () => {},
          remove: () => {
            const idx = createdElements.indexOf(el);
            if (idx !== -1) createdElements.splice(idx, 1);
          }
        };
        createdElements.push(el);
        return el;
      },
      body: {
        appendChild: () => {}
      }
    },
    localStorage: localStorageMock,
    state: {
      exercises: [
        { id: 'w1', name: 'Arm Circles', movement_pattern: 'mobility' },
        { id: 'w2', name: 'Wrist Prep', movement_pattern: 'mobility' },
        { id: 'w3', name: 'Scapular Pulls', movement_pattern: 'pull' },
        { id: 'e1', name: 'Pull-Up', movement_pattern: 'pull' }
      ],
      workouts: [],
      todayResolved: null,
      activeSession: null
    },
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
    cancelAutoAdvance: () => {},
    createdElements
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

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    console.error(err.stack);
  }
}

// ─── TEST SUITE ─────────────────────────────────────────────────────────────

const ctx = createTestContext();

const routineExercises = [
  { exercise_id: 'w1', exercise_name: 'Arm Circles', duration_sec: 30, exercise_type: 'duration', rest_sec: 10, phase: 'warm_up' },
  { exercise_id: 'w2', exercise_name: 'Wrist Prep', duration_sec: 30, exercise_type: 'duration', rest_sec: 0, phase: 'warm_up' },
  { exercise_id: 'w3', exercise_name: 'Scapular Pulls', reps: 10, exercise_type: 'reps', rest_sec: 0, phase: 'warm_up' },
  {
    exercise_id: 'e1',
    exercise_name: 'Pull-Up',
    exercise_type: 'reps',
    rest_sec: 90,
    phase: 'main_workout',
    sets: [
      { set_num: 1, target_val: 8, actual_val: 8, completed: false },
      { set_num: 2, target_val: 8, actual_val: 8, completed: false }
    ]
  },
  { exercise_id: 'c1', exercise_name: 'Shoulder Stretch', duration_sec: 30, exercise_type: 'duration', phase: 'cool_down' }
];

test('1. Start Workout begins in WARMUP / IDLE Overview State', () => {
  ctx.startWorkoutFromData('Full Body Primer', routineExercises, 'routine-1');

  const session = ctx.getActiveSession();
  assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.WARMUP, 'Phase must be WARMUP');
  assert.strictEqual(session.phaseState, ctx.PHASE_STATES.IDLE, 'Initial phase state must be IDLE');
  assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.IDLE, 'Warmup status must be IDLE');

  const html = ctx.renderWorkoutPhaseWorkspace(session, 'warmup');
  assert.ok(html.includes('Start All Warm-Up'), 'Must show Start All Warm-Up button in overview');
  assert.ok(html.includes('Arm Circles'), 'Must list preview exercise');
  assert.ok(!html.includes('Warm-up unavailable'), 'Must NOT show unavailable when warmup exercises exist');
  assert.ok(!html.includes('runner-session-view-wrapper'), 'Must NOT show active player in IDLE overview');
});

test('2. Start All Warm-Up transitions to WARMUP / ACTIVE & renders single active player', () => {
  ctx.startPhaseAutoRunner('warmup');
  const session = ctx.getActiveSession();

  assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.WARMUP);
  assert.strictEqual(session.phaseState, ctx.PHASE_STATES.ACTIVE);
  assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.ACTIVE);
  assert.strictEqual(session.warmupIndex, 0);

  const html = ctx.renderWorkoutPhaseWorkspace(session, 'warmup');
  assert.ok(html.includes('runner-session-view-wrapper'), 'Must render active card player');
  assert.ok(html.includes('Arm Circles'), 'Must show Exercise 1');
  assert.ok(!html.includes('Start All Warm-Up'), 'Must NOT show overview hero banner underneath');
});

test('3. Done on Exercise 1 marks it complete & triggers rest interval if configured', () => {
  ctx.advanceWarmupMovement();
  const session = ctx.getActiveSession();

  assert.strictEqual(session.warmup[0].completed, true, 'Exercise 1 must be marked completed');
  assert.strictEqual(session.warmupIndex, 1, 'Index must advance to 1');

  const restState = ctx.getWorkoutRestState();
  assert.strictEqual(restState.active, true, 'Rest timer must activate for 10s');
  assert.strictEqual(restState.remaining, 10);
  assert.ok(restState.nextInfo.includes('Wrist Prep'), 'Rest must display Next: Wrist Prep');
});

test('4. Stopping rest proceeds to Exercise 2', () => {
  ctx.stopWorkoutRest();
  const restState = ctx.getWorkoutRestState();
  assert.strictEqual(restState.active, false, 'Rest timer must stop');

  const session = ctx.getActiveSession();
  const html = ctx.renderWorkoutPhaseWorkspace(session, 'warmup');
  assert.ok(html.includes('Wrist Prep'), 'Must show Exercise 2');
  assert.ok(html.includes('30s hold'), 'Must show 30s target');
});

test('5. Skip Exercise 2 modal & confirmation skips and advances to Exercise 3', () => {
  ctx.openSkipWarmupExerciseModal();
  const modal = ctx.document.getElementById('skip-warmup-modal');
  assert.ok(modal, 'Skip warmup modal must open');
  assert.ok(modal.innerHTML.includes('Skip this exercise?'), 'Modal title must ask "Skip this exercise?"');
  assert.ok(modal.innerHTML.includes('Skip Exercise'), 'Must have "Skip Exercise" button');

  ctx.confirmSkipWarmupExercise();
  assert.strictEqual(ctx.document.getElementById('skip-warmup-modal'), null, 'Modal must close on confirm');

  const session = ctx.getActiveSession();
  assert.strictEqual(session.warmup[1].skipped, true, 'Exercise 2 must be marked skipped');
  assert.strictEqual(session.warmup[1].completed, false, 'Exercise 2 must not be completed');
  assert.strictEqual(session.warmupIndex, 2, 'Index must advance to 2');

  const html = ctx.renderWorkoutPhaseWorkspace(session, 'warmup');
  assert.ok(html.includes('Scapular Pulls'), 'Must show Exercise 3');
  assert.ok(html.includes('10 reps'), 'Must show 10 reps target');
});

test('6. Rep adjustment steppers work on reps-based warmup exercise', () => {
  ctx.adjustWarmupItemReps(2, 2);
  let session = ctx.getActiveSession();
  assert.strictEqual(session.warmup[2].actual_val, 12, 'Reps should increase to 12');

  ctx.adjustWarmupItemReps(2, -4);
  session = ctx.getActiveSession();
  assert.strictEqual(session.warmup[2].actual_val, 8, 'Reps should decrease to 8');
});

test('7. Exit Warm-Up modal opens with "Exit Warm-Up?" and Cancel/Exit buttons', () => {
  ctx.openExitWarmupModal();
  const modal = ctx.document.getElementById('exit-warmup-modal');
  assert.ok(modal, 'Exit warmup modal must open');
  assert.ok(modal.innerHTML.includes('Exit Warm-Up?'), 'Modal title must ask "Exit Warm-Up?"');
  assert.ok(modal.innerHTML.includes('Cancel'), 'Must have Cancel button');
  assert.ok(modal.innerHTML.includes('Exit'), 'Must have Exit button');

  ctx.closeExitWarmupModal();
  assert.strictEqual(ctx.document.getElementById('exit-warmup-modal'), null, 'Modal must close on cancel');
});

test('8. Completing final warmup exercise transitions to Warm-Up Complete state', () => {
  ctx.advanceWarmupMovement();
  const session = ctx.getActiveSession();

  assert.strictEqual(session.warmup[2].completed, true, 'Exercise 3 must be marked completed');
  assert.strictEqual(session.warmupStatus, ctx.PHASE_STATES.COMPLETED, 'Warmup status must be COMPLETED');

  const html = ctx.renderWorkoutPhaseWorkspace(session, 'warmup');
  assert.ok(html.includes('Warm-Up Complete'), 'Must display "Warm-Up Complete" title');
  assert.ok(html.includes("You're ready for the main workout."), 'Must display "You\'re ready for the main workout."');
  assert.ok(html.includes('Start Main Workout'), 'Must display primary button "Start Main Workout"');
  assert.ok(!html.includes('runner-session-view-wrapper'), 'Active exercise player must be gone');
  assert.ok(!html.includes('Start All Warm-Up'), 'Overview banner must be gone');
});

test('9. Clicking "Start Main Workout" enters MAIN_WORKOUT / ACTIVE / SET_ACTIVE', () => {
  ctx.startMainWorkoutFromWarmup();
  const session = ctx.getActiveSession();

  assert.strictEqual(session.phase, ctx.WORKOUT_PHASES.MAIN_WORKOUT, 'Phase must be MAIN_WORKOUT');
  assert.strictEqual(session.phaseState, ctx.PHASE_STATES.ACTIVE, 'PhaseState must be ACTIVE');
  assert.strictEqual(session.mainStatus, ctx.PHASE_STATES.ACTIVE, 'MainStatus must be ACTIVE');
  assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE, 'SubState must be SET_ACTIVE');
  assert.strictEqual(session.activeExerciseIndex, 0);
  assert.strictEqual(session.activeSetIndex, 0);
});

console.log(`\n======================================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`======================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
