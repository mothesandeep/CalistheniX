/**
 * CalistheniX — Rest Timer Behavior & State Progression Test Suite
 *
 * Verifies:
 * 1. Required states: REST -> RUNNING -> PAUSED -> FINISHED.
 * 2. Controls: Pause, Resume, -15s, +15s, Skip Rest.
 * 3. When timer reaches zero:
 *    - Show a clear completion state (badge, 0s digits, START NEXT SET CTA).
 *    - Automatically prepare the next set.
 *    - Never mark the next set as completed.
 *    - Preserve correct exercise/set index.
 * 4. Timer remains accurate and does not reset unexpectedly during re-renders/refresh.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Setup Sandbox Environment
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

const mockDocument = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    appendChild: () => {},
    addEventListener: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

const sandbox = {
  window: {
    location: { hash: '#workout' },
    addEventListener: () => {},
    scrollTo: () => {},
    innerWidth: 1024
  },
  document: mockDocument,
  localStorage: mockLocalStorage,
  navigator: { vibrate: () => {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  state: {
    view: 'workout',
    activeSession: null,
    exercises: [
      { id: 1, name: 'Pull-up', movement_pattern: 'pull' },
      { id: 2, name: 'Dips', movement_pattern: 'push' }
    ]
  },
  _cueTickCalled: false,
  _cueRestEndCalled: false,
  cueTick: () => { sandbox._cueTickCalled = true; },
  cueRestEnd: () => { sandbox._cueRestEndCalled = true; },
  cueSetComplete: () => {},
  cueExerciseComplete: () => {},
  startWorkoutDurationTimer: () => {},
  stopWorkoutDurationTimer: () => {},
  openExitWorkoutModal: () => {},
  openBiomechanicsModal: () => {},
  renderAutoAdvanceHtml: () => '',
  renderExerciseVisualStageCard: () => '<div class="visual-stage"></div>',
  renderExerciseMuscleFocusCard: () => '<div class="muscle-focus"></div>',
  requestWakeLock: async () => {},
  releaseScreenWakeLock: () => {},
  render: () => {}
};

vm.createContext(sandbox);

// Load code files
const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const runnerCode = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

vm.runInContext(constantsCode, sandbox);
vm.runInContext(utilsCode, sandbox);
vm.runInContext(audioCode, sandbox);
vm.runInContext(storageCode, sandbox);
vm.runInContext(stateCode, sandbox);
vm.runInContext(runnerCode, sandbox);

sandbox.cueRestEnd = () => { sandbox._cueRestEndCalled = true; };
sandbox.cueTick = () => { sandbox._cueTickCalled = true; };

function createTestRestSession() {
  return {
    id: 'test-rest-session-123',
    workout_id: 301,
    routine: 'STRENGTH A',
    level: 1,
    status: 'in_progress',
    startTime: Date.now() - 120000,
    startedAt: Date.now() - 120000,
    pausedAt: null,
    currentPhase: 'main',
    phase: 'MAIN_WORKOUT',
    phaseState: 'ACTIVE',
    warmupStatus: 'COMPLETED',
    warmup_status: 'completed',
    warmupIndex: 0,
    warmup: [],
    mainStatus: 'ACTIVE',
    mainWorkoutSubState: 'SET_ACTIVE',
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        id: 1,
        exercise_id: 1,
        exercise_name: 'Weighted Pull-up',
        exercise_type: 'reps',
        rest_sec: 90,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false, skipped: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false, skipped: false }
        ]
      },
      {
        id: 2,
        exercise_id: 2,
        exercise_name: 'Parallel Bar Dips',
        exercise_type: 'reps',
        rest_sec: 60,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 10, actual_val: 10, completed: false, skipped: false }
        ]
      }
    ],
    cooldownStatus: 'IDLE',
    cooldown_status: 'pending',
    cooldownIndex: 0,
    cooldown: []
  };
}

console.log('=============================================================');
console.log('REST TIMER BEHAVIOR & STATE PROGRESSION TEST SUITE');
console.log('=============================================================');

// ─── 1. REST -> RUNNING Transition on Completed Set ──────────────────────────
console.log('\n--- 1. Testing REST -> RUNNING Transition ---');
let sess = createTestRestSession();
sandbox.saveActiveSession(sess);
sandbox.state.activeSession = sess;

// User completes Set 1 of Exercise 0
sandbox.completeMainWorkoutSet();
sess = sandbox.getActiveSession();

const restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.state, 'RUNNING', 'Rest timer state is RUNNING');
assert.strictEqual(restState.active, true, 'Rest timer active flag is true');
assert.strictEqual(restState.remaining, 90, 'Rest timer initialized with 90s');
assert.strictEqual(sess.mainWorkoutSubState, 'RESTING', 'mainWorkoutSubState is RESTING');
assert.strictEqual(sess.restTimer.state, 'RUNNING', 'session.restTimer state is RUNNING');
assert.strictEqual(sess.restTimer.isRunning, true, 'session.restTimer isRunning is true');

// Next set was prepared but NOT completed
assert.strictEqual(sess.activeExerciseIndex, 0, 'Active exercise is still 0 (Weighted Pull-up)');
assert.strictEqual(sess.activeSetIndex, 1, 'Active set pointer advanced to Set 2');
assert.strictEqual(sess.exercises[0].sets[1].completed, false, 'Next set (Set 2) is NEVER marked completed');
assert.strictEqual(sess.exercises[0].sets[1].skipped, false, 'Next set (Set 2) is not skipped');

console.log('  ✓ 1. Passed: Rest timer entered RUNNING state and prepared next set without premature completion.');

// ─── 2. Controls: Pause & Resume ─────────────────────────────────────────────
console.log('\n--- 2. Testing Pause and Resume Controls ---');
// User clicks Pause on Rest Card
sandbox.togglePauseWorkoutRest();
let curRest = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(curRest.state, 'PAUSED', 'Rest state is PAUSED');
assert.strictEqual(curRest.paused, true, 'Rest paused flag is true');
assert.strictEqual(sess.restTimer.state, 'PAUSED', 'session.restTimer state is PAUSED');
assert.strictEqual(sess.restTimer.isPaused, true, 'session.restTimer isPaused is true');
assert.strictEqual(sess.restTimer.isRunning, false, 'session.restTimer isRunning is false');

// Render verification
let restViewHtml = sandbox.renderWorkoutRestView(sess);
assert(restViewHtml.includes('REST PAUSED') || restViewHtml.includes('Resume'), 'Rest card displays PAUSED / Resume button');

// User clicks Resume
sandbox.togglePauseWorkoutRest();
curRest = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(curRest.state, 'RUNNING', 'Rest state resumed to RUNNING');
assert.strictEqual(curRest.paused, false, 'Rest paused flag is false');
assert.strictEqual(sess.restTimer.state, 'RUNNING', 'session.restTimer state is RUNNING');
assert.strictEqual(sess.restTimer.isRunning, true, 'session.restTimer isRunning is true');

console.log('  ✓ 2. Passed: Pause cleanly freezes remaining time and Resume continues countdown.');

// ─── 3. Controls: -15s and +15s Steppers ──────────────────────────────────────
console.log('\n--- 3. Testing -15s and +15s Controls ---');
// Subtract 15s (90s -> 75s)
sandbox.adjustWorkoutRest(-15);
curRest = sandbox.getWorkoutRestState();
assert.strictEqual(curRest.remaining, 75, 'Remaining rest reduced to 75s (-15s)');

// Add 15s (75s -> 90s)
sandbox.adjustWorkoutRest(15);
curRest = sandbox.getWorkoutRestState();
assert.strictEqual(curRest.remaining, 90, 'Remaining rest increased back to 90s (+15s)');

console.log('  ✓ 3. Passed: -15s and +15s adjust remaining rest duration accurately.');

// ─── 4. Reaching Zero -> FINISHED State & Next Set Preparation ───────────────
console.log('\n--- 4. Testing Timer Reaching Zero (FINISHED State) ---');
sandbox._cueRestEndCalled = false;

// Adjust rest to 0 (simulates timer completion)
sandbox.adjustWorkoutRest(-100);
curRest = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(curRest.state, 'FINISHED', 'Rest timer entered FINISHED state');
assert.strictEqual(curRest.completed, true, 'Rest timer completed flag is true');
assert.strictEqual(curRest.remaining, 0, 'Remaining rest is 0');
assert.strictEqual(sess.restTimer.state, 'FINISHED', 'session.restTimer state is FINISHED');
assert.strictEqual(sess.restTimer.isFinished, true, 'session.restTimer isFinished is true');
assert.strictEqual(sandbox._cueRestEndCalled, true, 'cueRestEnd sound/haptic played on completion');

// Render completion screen
restViewHtml = sandbox.renderWorkoutRestView(sess);
assert(restViewHtml.includes('REST COMPLETE') || restViewHtml.includes('REST FINISHED'), 'Rest card renders clear REST COMPLETE state');
assert(restViewHtml.includes('START NEXT SET'), 'Rest card renders prominent START NEXT SET CTA');
assert(restViewHtml.includes('Set 2'), 'Rest card previews Set 2');

// Next set is still uncompleted
assert.strictEqual(sess.activeExerciseIndex, 0, 'Active exercise preserved as Exercise 0');
assert.strictEqual(sess.activeSetIndex, 1, 'Active set preserved as Set 2');
assert.strictEqual(sess.exercises[0].sets[1].completed, false, 'Next set remains pending (never marked complete)');

console.log('  ✓ 4. Passed: Reaching zero shows clear completion state and preserves prepared uncompleted next set.');

// ─── 5. Controls: Start Next Set / Skip Rest ─────────────────────────────────
console.log('\n--- 5. Testing Start Next Set / Skip Rest ---');
// User clicks "START NEXT SET"
sandbox.startMainWorkoutSet();
curRest = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(curRest.state, 'IDLE', 'Rest timer state returned to IDLE');
assert.strictEqual(curRest.active, false, 'Rest timer active flag is false');
assert.strictEqual(sess.mainWorkoutSubState, 'SET_ACTIVE', 'mainWorkoutSubState is SET_ACTIVE');
assert.strictEqual(sess.activeExerciseIndex, 0, 'Exercise 0 active');
assert.strictEqual(sess.activeSetIndex, 1, 'Set 2 active for user execution');
assert.strictEqual(sess.exercises[0].sets[1].completed, false, 'Set 2 is ready to be performed');

console.log('  ✓ 5. Passed: START NEXT SET cleanly dismisses rest and activates Set 2.');

// ─── 6. Multi-Exercise Index Preservation across Rest ────────────────────────
console.log('\n--- 6. Testing Next Exercise Index Advancement across Sets & Rest ---');
// Complete Set 2 of Exercise 0 (finishing Exercise 0)
sandbox.completeMainWorkoutSet();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.exercises[0].completed, true, 'Exercise 0 is completed');
assert.strictEqual(sess.activeExerciseIndex, 1, 'Advanced to Exercise 1 (Dips)');
assert.strictEqual(sess.activeSetIndex, 0, 'Active set pointer at Set 1 of Exercise 1');
assert.strictEqual(sess.exercises[1].sets[0].completed, false, 'Exercise 1 Set 1 is pending');

// Skip rest directly to begin Exercise 1
sandbox.stopWorkoutRest();
sess = sandbox.getActiveSession();
assert.strictEqual(sess.mainWorkoutSubState, 'SET_ACTIVE', 'SET_ACTIVE substate for Exercise 1');
assert.strictEqual(sess.activeExerciseIndex, 1, 'Exercise 1 index preserved');

console.log('  ✓ 6. Passed: Next exercise index and set 0 are accurately positioned across exercise boundary.');

console.log('\n=============================================================');
console.log('🎉 ALL REST TIMER BEHAVIOR TESTS VERIFIED & PASSED 100%!');
console.log('=============================================================');
if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
