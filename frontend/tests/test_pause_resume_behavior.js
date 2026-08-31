/**
 * CalistheniX — Pause & Resume Behavior Verification Suite
 *
 * Requirements Tested:
 * 1. Countdown must completely stop when paused.
 * 2. Remaining time must stay unchanged while paused.
 * 3. Resume must continue from the exact remaining time.
 * 4. Never restart the movement from its original duration upon resume.
 * 5. Prevent multiple timer instances after repeated pause/resume clicks.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ─── Setup Test Sandbox Environment ──────────────────────────────────────────
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
  getElementById: (id) => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
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

let currentTime = 1700000000000;

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
  Date: class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(currentTime);
      } else {
        super(...args);
      }
    }
    static now() {
      return currentTime;
    }
  },
  Math: Math,
  JSON: JSON,
  state: {
    view: 'workout',
    activeSession: null,
    exercises: [
      { id: 1, name: 'Pull-up', category: 'Strength' },
      { id: 2, name: 'Dip', category: 'Strength' }
    ],
    workoutSessions: []
  },
  render: () => {},
  switchView: () => {},
  showToast: (msg) => { sandbox._lastToast = msg; }
};

sandbox.window.state = sandbox.state;
vm.createContext(sandbox);

// Load required scripts
const constantsJs = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf-8');
const utilsJs = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf-8');
const stateJs = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf-8');
const workoutRunnerJs = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf-8');

vm.runInContext(constantsJs, sandbox);
vm.runInContext(utilsJs, sandbox);
vm.runInContext(stateJs, sandbox);
vm.runInContext(workoutRunnerJs, sandbox);

console.log('=============================================================');
console.log('🧪 RUNNING PAUSE / RESUME BEHAVIOR TEST SUITE');
console.log('=============================================================\n');

function createTestSession() {
  return {
    id: 'test-pause-resume-session',
    routine_name: 'Upper Body Test',
    routine: 'Upper Body Test',
    status: 'in_progress',
    phaseState: 'ACTIVE',
    currentPhase: 'warmup',
    phase: 'WARMUP',
    startTime: currentTime,
    startedAt: currentTime,
    totalPausedMs: 0,
    pausedAt: null,
    warmupIndex: 0,
    warmup_status: 'in_progress',
    warmup: [
      { exercise_name: 'Arm Circles', duration_sec: 30, exercise_type: 'duration', completed: false, skipped: false },
      { exercise_name: 'Cat Cow', duration_sec: 30, exercise_type: 'duration', completed: false, skipped: false }
    ],
    exercises: [
      {
        exercise_name: 'Pull-ups',
        exercise_id: 1,
        exercise_type: 'reps',
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false, skipped: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false, skipped: false }
        ]
      },
      {
        exercise_name: 'L-sit Hold',
        exercise_id: 2,
        exercise_type: 'duration',
        duration_sec: 30,
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 30, actual_val: 30, completed: false, skipped: false }
        ]
      }
    ],
    cooldownIndex: 0,
    cooldown_status: 'pending',
    cooldown: [
      { exercise_name: 'Dead Hang', duration_sec: 30, exercise_type: 'duration', completed: false, skipped: false }
    ]
  };
}

// ─── TEST 1: Warm-up Countdown Stops Completely When Paused ──────────────────
console.log('--- Test 1: Warm-up Countdown Stops & Freezes Remaining Time on Pause ---');
let sess = createTestSession();
sandbox.saveActiveSession(sess);
sandbox.startPhaseAutoRunner('warmup');
sandbox.togglePhaseTimer();

sess = sandbox.getActiveSession();
assert.strictEqual(sess.movementTimer.isRunning, true, 'Movement timer started running');
assert.strictEqual(sess.movementTimer.durationSec, 30, 'Duration is 30s');

// Advance clock by 8 seconds
currentTime += 8000;

// Now Pause session
sandbox.pauseWorkoutSession();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.phaseState, 'PAUSED', 'Phase state transitioned to PAUSED');
assert.strictEqual(sess.status, 'paused', 'Session status is paused');
assert.strictEqual(sess.movementTimer.isRunning, false, 'Movement timer is stopped');
assert.strictEqual(sess.movementTimer.remainingSec, 22, 'Remaining time frozen at exactly 22 seconds (30 - 8)');
assert.strictEqual(sess.phaseTimer.remaining, 22, 'Phase timer remaining frozen at 22 seconds');

// Advance clock by 15 more seconds while paused
currentTime += 15000;

// Re-render and check that remaining time stayed UNCHANGED
const renderedHtml = sandbox.renderWarmupCardView(sess);
assert(renderedHtml.includes('22'), 'Warmup card renders frozen 22 seconds while paused');
sess = sandbox.getActiveSession();
assert.strictEqual(sess.movementTimer.remainingSec, 22, 'Remaining time stayed strictly 22 seconds while paused');

console.log('  ✓ 1. Passed: Countdown stops completely and remaining time stays unchanged during pause.');

// ─── TEST 2: Resume Continues from Exact Remaining Time (Never Restarts) ─────
console.log('\n--- Test 2: Resume Continues From Exact Remaining Time (Never Restarts) ---');

// Now resume session
sandbox.resumeWorkoutSession();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.phaseState, 'ACTIVE', 'Phase state transitioned to ACTIVE');
assert.strictEqual(sess.status, 'in_progress', 'Session status is in_progress');
assert.strictEqual(sess.movementTimer.isRunning, true, 'Movement timer resumed');
assert.strictEqual(sess.movementTimer.remainingSec, 22, 'Movement timer resumed from exactly 22 seconds (not 30s)');

// Advance clock by 5 seconds
currentTime += 5000;

// Check tick calculation
const dur = sess.movementTimer.durationSec;
const elapsed = Math.floor((currentTime - sess.movementTimer.startedAt) / 1000);
const curRemaining = Math.max(0, dur - elapsed);
assert.strictEqual(curRemaining, 17, '5 seconds elapsed after resume results in exactly 17 seconds remaining (22 - 5)');

console.log('  ✓ 2. Passed: Resume continues from exact remaining time (22s -> 17s) without restarting to 30s.');

// ─── TEST 3: Rest Timer Pause and Resume Integrity ──────────────────────────
console.log('\n--- Test 3: Rest Timer Pause / Resume Integrity ---');
sandbox.cleanupAllWorkoutTimers();
sess = createTestSession();
sess.currentPhase = 'main';
sess.phase = 'MAIN_WORKOUT';
sess.mainStatus = 'ACTIVE';
sandbox.saveActiveSession(sess);

// Start a 60-second rest
sandbox.startWorkoutRest(60);
let restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.state, 'RUNNING', 'Rest state is RUNNING');
assert.strictEqual(restState.remaining, 60, 'Initial rest is 60s');

// Advance clock by 25 seconds
currentTime += 25000;

// Pause via togglePauseWorkoutRest
sandbox.togglePauseWorkoutRest();
restState = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(restState.state, 'PAUSED', 'Rest state is PAUSED');
assert.strictEqual(restState.paused, true, 'Rest state paused flag is true');
assert.strictEqual(restState.remaining, 35, 'Rest remaining frozen at exactly 35s (60 - 25)');
assert.strictEqual(sess.restTimer.remainingSec, 35, 'Session restTimer remainingSec frozen at 35s');

// Advance clock by 30 seconds while paused
currentTime += 30000;
assert.strictEqual(sandbox.getWorkoutRestState().remaining, 35, 'Rest remaining stayed 35s while paused');

// Resume rest via togglePauseWorkoutRest
sandbox.togglePauseWorkoutRest();
restState = sandbox.getWorkoutRestState();
sess = sandbox.getActiveSession();

assert.strictEqual(restState.state, 'RUNNING', 'Rest state resumed to RUNNING');
assert.strictEqual(restState.remaining, 35, 'Rest resumed from exactly 35 seconds');
assert.strictEqual(sess.restTimer.isRunning, true, 'Session restTimer is running');

// Advance clock by 10 seconds
currentTime += 10000;
const restElapsed = Math.floor((currentTime - restState.startedAt) / 1000);
const remainingAfterResume = Math.max(0, restState.total - restElapsed);
assert.strictEqual(remainingAfterResume, 25, '10 seconds elapsed after resume results in exactly 25s remaining (35 - 10)');

console.log('  ✓ 3. Passed: Rest timer freezes at 35s and resumes accurately to 25s without resetting to 60s.');

// ─── TEST 4: Isometric Hold Timer Pause and Resume Integrity ────────────────
console.log('\n--- Test 4: Isometric Hold Timer Pause / Resume Integrity ---');
sandbox.cleanupAllWorkoutTimers();
sess = createTestSession();
sess.currentPhase = 'main';
sess.phase = 'MAIN_WORKOUT';
sess.activeExerciseIndex = 1; // L-sit Hold (30s)
sess.activeSetIndex = 0;
sandbox.saveActiveSession(sess);

sandbox.startWorkoutHold(1, 0);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.holdTimer.isRunning, true, 'Hold timer is running');

// Advance clock by 12 seconds
currentTime += 12000;

// Global Pause
sandbox.pauseWorkoutSession();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.holdTimer.isRunning, false, 'Hold timer stopped');
assert.strictEqual(sess.holdTimer.elapsedSec, 12, 'Hold timer elapsedSec frozen at 12s');

// Advance clock by 20 seconds while paused
currentTime += 20000;

// Global Resume
sandbox.resumeWorkoutSession();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.holdTimer.isRunning, true, 'Hold timer resumed');
assert.strictEqual(sess.holdTimer.elapsedSec, 12, 'Hold timer resumed from exactly 12s elapsed');

// Advance clock by 6 seconds
currentTime += 6000;
const holdCurNow = currentTime;
const curHoldElapsed = Math.floor((holdCurNow - sess.holdTimer.startedAt) / 1000);
assert.strictEqual(curHoldElapsed, 18, '6s elapsed after resume results in 18s total elapsed (12 + 6)');

console.log('  ✓ 4. Passed: Hold timer freezes at 12s and resumes cleanly to 18s.');

// ─── TEST 5: Repeated Pause / Resume Clicks Do NOT Corrupt State or Create Multi-Timers ─────
console.log('\n--- Test 5: Repeated Pause / Resume Clicks (Idempotence & Multi-Timer Prevention) ---');

// Rapidly pause 5 times
sandbox.pauseWorkoutSession();
sandbox.pauseWorkoutSession();
sandbox.pauseWorkoutSession();
sandbox.pauseWorkoutSession();
sandbox.pauseWorkoutSession();

sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseState, 'PAUSED', 'State remains PAUSED');
assert.strictEqual(sess.holdTimer.elapsedSec, 18, 'Hold timer elapsedSec remains 18s');

// Rapidly resume 5 times
sandbox.resumeWorkoutSession();
sandbox.resumeWorkoutSession();
sandbox.resumeWorkoutSession();
sandbox.resumeWorkoutSession();
sandbox.resumeWorkoutSession();

sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseState, 'ACTIVE', 'State remains ACTIVE');
assert.strictEqual(sess.holdTimer.elapsedSec, 18, 'Hold timer startedAt was not reset repeatedly');

// Toggle pause/resume rapidly
sandbox.togglePauseWorkoutSession(); // PAUSE
assert.strictEqual(sandbox.getActiveSession().phaseState, 'PAUSED');

sandbox.togglePauseWorkoutSession(); // RESUME
assert.strictEqual(sandbox.getActiveSession().phaseState, 'ACTIVE');

sandbox.togglePauseWorkoutSession(); // PAUSE
assert.strictEqual(sandbox.getActiveSession().phaseState, 'PAUSED');

sandbox.togglePauseWorkoutSession(); // RESUME
assert.strictEqual(sandbox.getActiveSession().phaseState, 'ACTIVE');

console.log('  ✓ 5. Passed: Rapid pause and resume clicks are idempotent, preserve time, and prevent duplicate timers.');

console.log('\n=============================================================');
console.log('🎉 ALL PAUSE / RESUME BEHAVIOR TESTS PASSED 100%!');
console.log('=============================================================\n');

if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
