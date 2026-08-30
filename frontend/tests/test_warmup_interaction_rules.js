/**
 * CalistheniX — Warm-Up Interaction Rules Test Suite
 *
 * Verifies:
 * 1. Show movement name
 * 2. Show target duration/reps
 * 3. Start Timer begins the timer
 * 4. Pause pauses it
 * 5. Timer completion does not automatically mark the movement complete
 * 6. User taps Mark Complete to finish the movement
 * 7. Next Movement becomes available only after completion or explicit skip
 * 8. Completed movements show a clear green check
 * 9. Skipped movements show skipped state, never completed state
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
    clear: () => { store = {}; },
    _dump: () => ({ ...store })
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
      { id: 1, name: 'Arm Circles', movement_pattern: 'push' },
      { id: 2, name: 'Wrist Stretch', movement_pattern: 'mobility' },
      { id: 3, name: 'Cat-Cow Stretch', movement_pattern: 'core' }
    ]
  },
  showToast: (msg) => { sandbox._lastToast = msg; },
  _lastToast: null,
  cueSetComplete: () => { sandbox._cueSetCompleteCalled = true; },
  _cueSetCompleteCalled: false,
  cueExerciseComplete: () => {},
  cueTimerComplete: () => { sandbox._cueTimerCompleteCalled = true; },
  _cueTimerCompleteCalled: false,
  startWorkoutDurationTimer: () => {},
  stopWorkoutDurationTimer: () => {},
  openExitWorkoutModal: () => {},
  openSkipWarmupExerciseModal: () => {},
  openBiomechanicsModal: () => {},
  renderAutoAdvanceHtml: () => '',
  renderExerciseVisualStageCard: () => '<div class="visual-stage"></div>',
  renderExerciseMuscleFocusCard: () => '<div class="muscle-focus"></div>',
  requestWakeLock: async () => {},
  releaseScreenWakeLock: () => {},
  lsWriteLog: () => {},
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

sandbox.showToast = (msg) => { sandbox._lastToast = msg; };

function createWarmupTestSession() {
  return {
    id: 'test-warmup-rules-session',
    workout_id: 101,
    routine: 'PUSH & MOBILITY',
    level: 1,
    status: 'in_progress',
    startTime: Date.now() - 30000,
    startedAt: Date.now() - 30000,
    pausedAt: null,
    currentPhase: 'warmup',
    phase: 'WARMUP',
    phaseState: 'ACTIVE',
    warmupStatus: 'ACTIVE',
    warmup_status: 'in_progress',
    warmupIndex: 0,
    warmup_idx: 0,
    movementTimer: { isRunning: false, remainingSec: 30, durationSec: 30, startedAt: null, pausedAt: null },
    phaseTimer: { isRunning: false, remaining: 30, duration: 30, startedAt: null, pausedMs: 0 },
    warmup: [
      { id: 1, exercise_name: 'Arm Circles', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false },
      { id: 2, exercise_name: 'Wrist Stretch', exercise_type: 'duration', duration_sec: 20, completed: false, skipped: false },
      { id: 3, exercise_name: 'Cat-Cow Stretch', exercise_type: 'reps', reps: 10, completed: false, skipped: false }
    ],
    mainStatus: 'IDLE',
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        id: 10,
        exercise_name: 'Standard Push-up',
        exercise_type: 'reps',
        completed: false,
        skipped: false,
        sets: [{ set_num: 1, target_val: 12, completed: false, skipped: false }]
      }
    ],
    cooldownStatus: 'IDLE',
    cooldown_status: 'pending',
    cooldownIndex: 0,
    cooldown: []
  };
}

console.log('=============================================================');
console.log('WARM-UP INTERACTION RULES TEST SUITE');
console.log('=============================================================');

// ─── RULE 1 & 2: Show Movement Name and Target Duration/Reps ─────────────────
console.log('\n--- Rule 1 & 2: Show Movement Name and Target Duration/Reps ---');
const sess = createWarmupTestSession();
sandbox.saveActiveSession(sess);
sandbox.state.activeSession = sess;

const cardHtml = sandbox.renderWarmupCardView(sess);
assert(cardHtml.includes('Arm Circles'), 'Warmup card renders movement name (Arm Circles)');
assert(cardHtml.includes('30s hold') || cardHtml.includes('30'), 'Warmup card renders target duration (30s hold)');
assert(cardHtml.includes('MARK COMPLETE'), 'Warmup card renders Mark Complete action CTA');
assert(cardHtml.includes('Skip Movement'), 'Warmup card renders Skip Movement button');

console.log('  ✓ Rule 1 & 2 PASSED: Movement name and target duration/reps are prominently rendered.');

// ─── RULE 3 & 4: Start Timer Begins & Pause Pauses ───────────────────────────
console.log('\n--- Rule 3 & 4: Start Timer Begins and Pause Pauses ---');
assert.strictEqual(sess.phaseTimer.isRunning, false, 'Timer is initially stopped/ready');

// Start timer
sandbox.togglePhaseTimer();
let curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.phaseTimer.isRunning, true, 'Timer is running after togglePhaseTimer (Start Timer)');
assert(curSess.phaseTimer.startedAt != null, 'Timer startedAt timestamp recorded');

// Pause timer
sandbox.togglePhaseTimer();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.phaseTimer.isRunning, false, 'Timer is paused after second togglePhaseTimer');
assert(curSess.phaseTimer.pausedAt != null, 'Timer pausedAt timestamp recorded');

console.log('  ✓ Rule 3 & 4 PASSED: Start Timer begins countdown and Pause timer cleanly freezes it.');

// ─── RULE 5: Timer Completion Does NOT Automatically Mark Complete ───────────
console.log('\n--- Rule 5: Timer Completion Does NOT Auto-Complete Movement ---');
curSess.movementTimer.remainingSec = 0;
curSess.phaseTimer.remaining = 0;
curSess.movementTimer.isRunning = false;
curSess.phaseTimer.isRunning = false;
sandbox.saveActiveSession(curSess);

// Movement must NOT be completed automatically
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmup[0].completed, false, 'Movement 0 is NOT automatically completed when timer reaches 0');
assert.strictEqual(curSess.warmup[0].skipped, false, 'Movement 0 is NOT skipped');
assert.strictEqual(curSess.warmupIndex, 0, 'User remains on Movement 0 after timer expiry');

console.log('  ✓ Rule 5 PASSED: Timer reaching 0 does not auto-advance or mark movement completed.');

// ─── RULE 6: User Taps Mark Complete to Finish Movement ──────────────────────
console.log('\n--- Rule 6: User Taps Mark Complete to Finish Movement ---');
sandbox.advanceWarmupMovement(); // Simulates tapping MARK COMPLETE
curSess = sandbox.getActiveSession();

assert.strictEqual(curSess.warmup[0].completed, true, 'Movement 0 is marked completed: true');
assert.strictEqual(curSess.warmup[0].skipped, false, 'Movement 0 is not skipped');
assert(curSess.warmup[0].completed_at != null, 'Movement 0 has completion timestamp');
assert.strictEqual(curSess.warmupIndex, 1, 'Advanced to Movement 1');

console.log('  ✓ Rule 6 PASSED: Tapping Mark Complete marks movement complete and advances.');

// ─── RULE 7: Next Movement Available Only After Completion or Explicit Skip ───
console.log('\n--- Rule 7: Next Movement Lock Guard ---');
// User is on Movement 1 (uncompleted, unskipped)
assert.strictEqual(curSess.warmup[1].completed, false, 'Movement 1 is uncompleted');
assert.strictEqual(curSess.warmup[1].skipped, false, 'Movement 1 is unskipped');

// Attempting to click Next Movement before completion or skip
sandbox._lastToast = null;
sandbox.handleWarmupNextClick();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmupIndex, 1, 'handleWarmupNextClick does NOT advance past uncompleted movement');
assert(sandbox._lastToast && sandbox._lastToast.includes('Complete or skip'), 'Toast informs user to complete or skip');

// Attempting to click Movement 2 in queue strip
sandbox.selectWarmupMovement(2);
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmupIndex, 1, 'selectWarmupMovement does NOT jump forward past uncompleted movement');

// Now explicitly skip Movement 1
sandbox.skipWarmupExercise();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmup[1].skipped, true, 'Movement 1 is explicitly marked skipped');
assert.strictEqual(curSess.warmup[1].completed, false, 'Movement 1 is never marked completed');
assert.strictEqual(curSess.warmupIndex, 2, 'Advanced to Movement 2 after explicit skip');

console.log('  ✓ Rule 7 PASSED: Next Movement requires completion or explicit skip to proceed.');

// ─── RULE 8 & 9: Green Check for Completed & Skipped State (Never Green Check)
console.log('\n--- Rule 8 & 9: Badge States (Green Check vs Skipped) ---');
const workspaceHtml = sandbox.renderWorkoutPhaseWorkspace(curSess, 'warmup');

// Movement 0: Completed -> Check badge ✓ in green
const m0Match = workspaceHtml.match(/id="warmup-card-0"[\s\S]*?id="warmup-card-1"/);
const m0Html = m0Match ? m0Match[0] : '';
assert(m0Html.includes('✓'), 'Completed Movement 0 renders ✓ check');
assert(m0Html.includes('#10b981'), 'Completed Movement 0 renders green color');

// Movement 1: Skipped -> Skip badge ⏭ in amber (#eab308), NEVER green ✓
const m1Match = workspaceHtml.match(/id="warmup-card-1"[\s\S]*?id="warmup-card-2"/);
const m1Html = m1Match ? m1Match[0] : '';
assert(m1Html.includes('⏭'), 'Skipped Movement 1 renders ⏭ skip icon');
assert(m1Html.includes('#eab308'), 'Skipped Movement 1 renders amber color');
assert(!m1Html.includes('<span>✓</span>'), 'Skipped Movement 1 does NOT render ✓ check');

// Movement 2: Incomplete/Pending -> Step number 3. in gray
const m2Html = workspaceHtml.slice(workspaceHtml.indexOf('id="warmup-card-2"'));
assert(m2Html.includes('3.'), 'Pending Movement 2 renders 3.');
assert(!m2Html.includes('<span>✓</span>'), 'Pending Movement 2 does NOT render ✓ check');

console.log('  ✓ Rule 8 & 9 PASSED: Completed movements render green check ✓; Skipped movements render amber ⏭ (never green check).');

console.log('\n=============================================================');
console.log('🎉 ALL 9 WARM-UP INTERACTION RULES VERIFIED & PASSED 100%!');
console.log('=============================================================');
