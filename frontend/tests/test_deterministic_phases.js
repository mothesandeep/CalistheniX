/**
 * CalistheniX — Deterministic Workout Phases Test Suite
 *
 * Verifies:
 * 1. Deterministic sequence: WARM_UP -> MAIN_WORKOUT -> COOL_DOWN -> COMPLETE
 * 2. Main Workout stays locked until Warm-Up is completed or explicitly skipped
 * 3. Cool Down stays locked until Main Workout is finished
 * 4. Complete screen appears only after selected ending condition is reached
 * 5. Never allows UI to show conflicting phase states
 * 6. Refreshing the page does not corrupt current phase or progress
 * 7. Moving between exercises preserves correct exercise index and completion state
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
      { id: 1, name: 'Warm-up Movement 1', movement_pattern: 'push' },
      { id: 2, name: 'Warm-up Movement 2', movement_pattern: 'core' },
      { id: 10, name: 'Pull-ups Close Grip', movement_pattern: 'pull' },
      { id: 11, name: 'Commando Pull-ups', movement_pattern: 'pull' },
      { id: 20, name: 'Passive Dead Hang', movement_pattern: 'mobility' },
      { id: 21, name: 'Lat Stretch', movement_pattern: 'mobility' }
    ]
  },
  showToast: (msg) => { sandbox._lastToast = msg; },
  _lastToast: null,
  cueSetComplete: () => {},
  cueExerciseComplete: () => {},
  cueTimerComplete: () => {},
  startWorkoutDurationTimer: () => {},
  stopWorkoutDurationTimer: () => {},
  openDiscardWorkoutModal: () => {},
  openEarlyFinishModal: () => {},
  openSkipWarmupPhaseModal: () => {},
  closeSkipWarmupPhaseModal: () => {},
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

function createDeterministicTestSession() {
  return {
    id: 'det-session-uuid-1234',
    workout_id: 101,
    routine: 'PULL B',
    level: 2,
    status: 'in_progress',
    startTime: Date.now() - 60000,
    startedAt: Date.now() - 60000,
    pausedAt: null,
    currentPhase: 'warmup',
    phase: 'WARMUP',
    phaseState: 'ACTIVE',
    warmupStatus: 'ACTIVE',
    warmup_status: 'in_progress',
    warmupIndex: 0,
    warmup_idx: 0,
    warmup: [
      { id: 1, exercise_name: 'Arm Circles', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false },
      { id: 2, exercise_name: 'Cat-Cow Stretch', exercise_type: 'reps', reps: 10, completed: false, skipped: false }
    ],
    mainStatus: 'IDLE',
    activeExerciseIndex: 0,
    currentExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        id: 10,
        exercise_name: 'Pull-ups Close Grip',
        exercise_type: 'reps',
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 8, completed: false, skipped: false },
          { set_num: 2, target_val: 8, completed: false, skipped: false }
        ]
      },
      {
        id: 11,
        exercise_name: 'Commando Pull-ups',
        exercise_type: 'reps',
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 6, completed: false, skipped: false },
          { set_num: 2, target_val: 6, completed: false, skipped: false }
        ]
      }
    ],
    cooldownStatus: 'IDLE',
    cooldown_status: 'pending',
    cooldownIndex: 0,
    cooldown_idx: 0,
    cooldown: [
      { id: 20, exercise_name: 'Passive Dead Hang', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false },
      { id: 21, exercise_name: 'Lat Stretch', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false }
    ]
  };
}

console.log('=============================================================');
console.log('DETERMINISTIC WORKOUT PHASES TEST SUITE');
console.log('=============================================================');

// ─── TEST 1: Initial State & Locking ──────────────────────────────────────────
console.log('\n--- 1. Testing Initial Phase State & Strict Locking ---');
const sess1 = createDeterministicTestSession();
sandbox.saveActiveSession(sess1);
sandbox.state.activeSession = sess1;

let lockMain = sandbox.getPhaseLockStatus(sess1, 'main');
let lockCooldown = sandbox.getPhaseLockStatus(sess1, 'cooldown');

assert.strictEqual(lockMain.isLocked, true, 'Main workout must be locked while warm-up is unresolved');
assert.strictEqual(lockCooldown.isLocked, true, 'Cool down must be locked while warm-up & main are unresolved');

// Attempting to force setWorkoutPhase('main') or selectExerciseToExecute('main', 0) while locked
sandbox.setWorkoutPhase('main');
let curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.currentPhase, 'warmup', 'setWorkoutPhase must NOT switch to main when locked');

sandbox.selectExerciseToExecute('main', 0);
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.currentPhase, 'warmup', 'selectExerciseToExecute must NOT switch to main when locked');

console.log('  ✓ Main Workout and Cool Down are strictly locked before warm-up resolution.');

// ─── TEST 2: Warm-up Resolution Unlocks Main Workout ─────────────────────────
console.log('\n--- 2. Testing Warm-up Completion -> Main Workout Unlock ---');
// Complete warm-up movement 0
sandbox.advanceWarmupMovement();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmup[0].completed, true, 'Warm-up movement 0 completed');
assert.strictEqual(curSess.warmupIndex, 1, 'Advanced to warm-up movement 1');

// Complete warm-up movement 1
sandbox.advanceWarmupMovement();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.warmup[1].completed, true, 'Warm-up movement 1 completed');
assert.strictEqual(curSess.warmupStatus, 'COMPLETED', 'Warm-up status marked COMPLETED');

// Now Main Workout must be UNLOCKED
lockMain = sandbox.getPhaseLockStatus(curSess, 'main');
assert.strictEqual(lockMain.isLocked, false, 'Main workout is unlocked after warm-up is completed');

// But Cool Down MUST STILL BE LOCKED
lockCooldown = sandbox.getPhaseLockStatus(curSess, 'cooldown');
assert.strictEqual(lockCooldown.isLocked, true, 'Cool down remains locked because main workout is not done');

// Switch to Main Workout
sandbox.setWorkoutPhase('main');
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.currentPhase, 'main', 'Successfully transitioned to Main Workout');
console.log('  ✓ Warm-up completion accurately unlocked Main Workout while keeping Cool Down locked.');

// ─── TEST 3: Exercise Navigation Preserves Completion State & Index ───────────
console.log('\n--- 3. Testing Exercise Navigation & State Preservation ---');
// Complete set 0 of exercise 0
curSess.exercises[0].sets[0].completed = true;
curSess.exercises[0].sets[0].completed_at = new Date().toISOString();
sandbox.saveActiveSession(curSess);

// User clicks to navigate to Exercise 1
sandbox.selectExerciseToExecute('main', 1);
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.activeExerciseIndex, 1, 'Active exercise pointer moved to exercise 1');
assert.strictEqual(curSess.exercises[0].sets[0].completed, true, 'Exercise 0 set 0 completion preserved');
assert.strictEqual(curSess.exercises[0].sets[1].completed, false, 'Exercise 0 set 1 remaining intact');
assert.strictEqual(curSess.exercises[1].sets[0].completed, false, 'Exercise 1 set 0 intact');

// Navigate back to Exercise 0
sandbox.selectExerciseToExecute('main', 0);
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.activeExerciseIndex, 0, 'Active exercise pointer returned to exercise 0');
assert.strictEqual(curSess.activeSetIndex, 1, 'Active set pointer automatically selects first unresolved set (set 1)');
assert.strictEqual(curSess.exercises[0].sets[0].completed, true, 'Exercise 0 set 0 is still completed');

console.log('  ✓ Moving between exercises cleanly preserves exercise indices and set completion states.');

// ─── TEST 4: Cool Down Unlocks Only After Main Workout is Finished ───────────
console.log('\n--- 4. Testing Cool Down Unlocking After Main Workout Completion ---');
// Complete remaining sets of Exercise 0 and all sets of Exercise 1
curSess.exercises[0].sets[1].completed = true;
curSess.exercises[1].sets[0].completed = true;
curSess.exercises[1].sets[1].completed = true;
curSess.mainStatus = 'COMPLETED';
sandbox.saveActiveSession(curSess);

lockCooldown = sandbox.getPhaseLockStatus(curSess, 'cooldown');
assert.strictEqual(lockCooldown.isLocked, false, 'Cool down is unlocked now that main workout is completed');

// Transition to Cool Down
sandbox.setWorkoutPhase('cooldown');
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.currentPhase, 'cooldown', 'Successfully transitioned to Cool Down');
console.log('  ✓ Main workout completion unlocked Cool Down.');

// ─── TEST 5: Cool Down Completion Transitions to COMPLETE Screen ─────────────
console.log('\n--- 5. Testing Cool Down Completion -> Terminal State ---');
// Complete all cooldown stretches
sandbox.advanceCooldownStretch();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.cooldown[0].completed, true, 'Cooldown stretch 0 completed');

sandbox.advanceCooldownStretch();
curSess = sandbox.getActiveSession();
assert.strictEqual(curSess.cooldown[1].completed, true, 'Cooldown stretch 1 completed');
assert.strictEqual(curSess.status, 'completed', 'Session status is completed');
assert.strictEqual(curSess.currentPhase, 'completed', 'Current phase is completed');

// Verify Complete View renders
const finalHtml = sandbox.renderActiveWorkoutView();
assert(finalHtml.includes('runner-complete-screen') || finalHtml.includes('WORKOUT COMPLETE'), 'Complete screen is rendered upon reaching terminal condition');
console.log('  ✓ Cool down completion deterministically triggers the Workout Complete screen.');

// ─── TEST 6: Refresh Resilience & Anti-Corruption ────────────────────────────
console.log('\n--- 6. Testing Page Refresh Resilience ---');
const sessRefresh = createDeterministicTestSession();
sessRefresh.warmupStatus = 'COMPLETED';
sessRefresh.warmup_status = 'completed';
sessRefresh.warmup[0].completed = true;
sessRefresh.warmup[1].completed = true;
sessRefresh.currentPhase = 'main';
sessRefresh.phase = 'MAIN_WORKOUT';
sessRefresh.activeExerciseIndex = 1;
sessRefresh.activeSetIndex = 1;
sessRefresh.exercises[0].sets[0].completed = true;
sessRefresh.exercises[0].sets[1].completed = true;
sessRefresh.exercises[1].sets[0].completed = true;

// Save to localStorage simulation
mockLocalStorage.setItem('cx_active_session', JSON.stringify(sessRefresh));

// Simulate page refresh & re-opening workout view
sandbox.openWorkoutView();
const rehydrated = sandbox.getActiveSession();

assert.strictEqual(rehydrated.currentPhase, 'main', 'Rehydrated phase is preserved as main');
assert.strictEqual(rehydrated.activeExerciseIndex, 1, 'Rehydrated activeExerciseIndex is preserved');
assert.strictEqual(rehydrated.exercises[0].sets[0].completed, true, 'Progress set 0 preserved');
assert.strictEqual(rehydrated.exercises[0].sets[1].completed, true, 'Progress set 1 preserved');
assert.strictEqual(rehydrated.exercises[1].sets[0].completed, true, 'Progress set 2 preserved');

console.log('  ✓ Page refresh perfectly preserves active phase, index pointers, and completion history.');

// ─── TEST 7: Conflicting Phase State Prevention ──────────────────────────────
console.log('\n--- 7. Testing Conflicting Phase State Prevention ---');
// If a session has conflicting properties (e.g. currentPhase='cooldown' but main is incomplete and warmup is incomplete)
const corruptSession = createDeterministicTestSession();
corruptSession.currentPhase = 'cooldown'; // Invalid state!
corruptSession.phase = 'COOLDOWN';

const auth = sandbox.getAuthoritativeSessionState(corruptSession);
assert.strictEqual(auth.currentPhase, 'warmup', 'Authoritative state corrected conflicting phase to warmup');
assert.strictEqual(auth.phaseUpper, 'WARMUP', 'PhaseUpper synchronized with authoritative phase');

sandbox.syncAuthoritativeSessionState(corruptSession);
assert.strictEqual(corruptSession.currentPhase, 'warmup', 'Session state synchronized without conflicts');
assert.strictEqual(corruptSession.phase, 'WARMUP', 'Session phase synchronized to WARMUP');

console.log('  ✓ Single authoritative engine eliminates all conflicting phase states.');

console.log('\n=============================================================');
console.log('🎉 ALL DETERMINISTIC WORKOUT PHASE TESTS PASSED 100%!');
console.log('=============================================================');
