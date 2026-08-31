/**
 * CalistheniX — Skip Set Behavior Test Suite
 *
 * Verifies:
 * 1. Confirmation modal clearly displays: "You are skipping this set. It will not count as completed."
 * 2. After confirmation:
 *    - mark the set as SKIPPED
 *    - never mark it completed
 *    - update remaining/skipped counts
 *    - move to the correct next set
 *    - if the exercise has no remaining sets, move to the next exercise
 *    - preserve skipped status in the final summary
 * 3. Never use green completed styling for skipped sets (amber ⏭, never green ✓).
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

let _createdModalEl = null;

const mockDocument = {
  getElementById: (id) => {
    if (id === 'skip-set-modal') return _createdModalEl;
    return null;
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    const el = {
      id: '',
      className: '',
      style: {},
      innerHTML: '',
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      setAttribute: (k, v) => { el[k] = v; },
      appendChild: () => {},
      remove: () => { _createdModalEl = null; }
    };
    return el;
  },
  body: {
    appendChild: (el) => { _createdModalEl = el; },
    removeChild: () => { _createdModalEl = null; }
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
      { id: 1, name: 'Weighted Pull-up', movement_pattern: 'pull' },
      { id: 2, name: 'Dips', movement_pattern: 'push' }
    ]
  },
  _lastToast: null,
  cueSetComplete: () => {},
  cueExerciseComplete: () => {},
  cueTick: () => {},
  cueRestEnd: () => {},
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

sandbox.showToast = (msg) => { sandbox._lastToast = msg; };

function createTestSkipSession() {
  return {
    id: 'test-skip-set-session',
    workout_id: 401,
    routine: 'PUSH & PULL POWER',
    level: 2,
    status: 'in_progress',
    startTime: Date.now() - 60000,
    startedAt: Date.now() - 60000,
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
          { set_num: 1, target_val: 6, actual_val: 6, completed: false, skipped: false },
          { set_num: 2, target_val: 6, actual_val: 6, completed: false, skipped: false }
        ]
      },
      {
        id: 2,
        exercise_id: 2,
        exercise_name: 'Dips',
        exercise_type: 'reps',
        rest_sec: 60,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 10, actual_val: 10, completed: false, skipped: false },
          { set_num: 2, target_val: 10, actual_val: 10, completed: false, skipped: false }
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
console.log('SKIP SET BEHAVIOR & FLOW TEST SUITE');
console.log('=============================================================');

// ─── 1. Confirmation Modal Text Verification ─────────────────────────────────
console.log('\n--- 1. Testing Confirmation Modal Phrasing ---');
sandbox.openSkipMainWorkoutSetModal();
assert(_createdModalEl != null, 'Skip set modal element was created');
const modalHtml = _createdModalEl.innerHTML;
assert(
  modalHtml.includes('You are skipping this set. It will not count as completed.'),
  'Modal clearly states: "You are skipping this set. It will not count as completed."'
);
assert(modalHtml.includes('Skip Set'), 'Modal has Skip Set confirmation button');

console.log('  ✓ 1. Passed: Confirmation modal displays exact required warning.');

// ─── 2. After Confirmation: Mark as SKIPPED, Never Completed ─────────────────
console.log('\n--- 2. Testing Set Skipping and Count Updates ---');
let sess = createTestSkipSession();
sandbox.saveActiveSession(sess);
sandbox.state.activeSession = sess;

// User confirms skip on Set 1 of Exercise 0
sandbox.confirmSkipMainWorkoutSet();
sess = sandbox.getActiveSession();

const set1 = sess.exercises[0].sets[0];
assert.strictEqual(set1.skipped, true, 'Set 1 is marked skipped: true');
assert.strictEqual(set1.completed, false, 'Set 1 is NEVER marked completed');
assert.strictEqual(set1.completed_at, null, 'Set 1 completed_at is null');
assert(set1.skipped_at != null, 'Set 1 skipped_at timestamp recorded');

// Authoritative counts verification
const auth = sandbox.getAuthoritativeSessionState(sess);
assert.strictEqual(auth.main.completedSets, 0, 'Completed sets is 0');
assert.strictEqual(auth.main.skippedSets, 1, 'Skipped sets is 1');
assert.strictEqual(auth.main.remainingSets, 3, 'Remaining sets is 3 (out of 4 total)');
assert.strictEqual(auth.main.pct, 0, 'Main progress percentage is 0%');
assert.strictEqual(auth.overall.progressPct, 0, 'Overall progress percentage is 0%');

// Active set moved to Set 2 of same exercise
assert.strictEqual(sess.activeExerciseIndex, 0, 'Active exercise remains 0');
assert.strictEqual(sess.activeSetIndex, 1, 'Active set pointer moved to Set 2');

console.log('  ✓ 2. Passed: Set marked skipped (never completed), counts updated, moved to Set 2.');

// ─── 3. Move to Next Exercise when All Sets are Finished ─────────────────────
console.log('\n--- 3. Testing Moving to Next Exercise on Last Set Skip ---');
// User completes Set 2 of Exercise 0
sandbox.completeMainWorkoutSet();
sess = sandbox.getActiveSession();

// Exercise 0 is now finished (1 skipped + 1 completed)
assert.strictEqual(sess.exercises[0].completed, true, 'Exercise 0 is completed');
assert.strictEqual(sess.activeExerciseIndex, 1, 'Advanced to Exercise 1 (Dips)');
assert.strictEqual(sess.activeSetIndex, 0, 'Active set pointer at Set 1 of Exercise 1');

// Now skip Set 1 of Exercise 1
sandbox.confirmSkipMainWorkoutSet();
sess = sandbox.getActiveSession();
assert.strictEqual(sess.activeExerciseIndex, 1, 'Still in Exercise 1');
assert.strictEqual(sess.activeSetIndex, 1, 'Moved to Set 2 of Exercise 1');

// Now skip Set 2 of Exercise 1 (entire Exercise 1 is all skipped)
sandbox.confirmSkipMainWorkoutSet();
sess = sandbox.getActiveSession();

// Exercise 1 is finished as skipped (0 completed sets)
assert.strictEqual(sess.exercises[1].skipped, true, 'Exercise 1 is marked skipped: true');
assert.strictEqual(sess.exercises[1].completed, false, 'Exercise 1 is NOT completed');
assert.strictEqual(sess.mainStatus, 'COMPLETED', 'Main workout finished and ready for Cool Down');

console.log('  ✓ 3. Passed: Skipping last set advances to next exercise / finishes main workout.');

// ─── 4. Never Use Green Completed Styling for Skipped Sets ───────────────────
console.log('\n--- 4. Testing Skipped Visual Styling (Never Green) ---');
// Create a session in ACTIVE main workout where Exercise 0 is all skipped and Exercise 1 is active
let activeSess = createTestSkipSession();
activeSess.exercises[0].sets.forEach(s => { s.skipped = true; s.completed = false; });
activeSess.exercises[0].skipped = true;
activeSess.exercises[0].completed = false;
activeSess.activeExerciseIndex = 1;
activeSess.activeSetIndex = 0;
activeSess.mainStatus = 'ACTIVE';

const workspaceHtml = sandbox.renderWorkoutPhaseWorkspace(activeSess, 'main');

// Exercise 0 is all skipped in the queue selector strip -> Must render amber ⏭ (#eab308), NEVER green check ✓ (#10b981)
const ex0CardHtml = workspaceHtml.slice(workspaceHtml.indexOf('id="main-card-0"'), workspaceHtml.indexOf('id="main-card-1"'));
assert(ex0CardHtml.includes('⏭'), 'All-skipped exercise 0 renders ⏭ skip icon');
assert(ex0CardHtml.includes('#eab308'), 'All-skipped exercise 0 renders amber color (#eab308)');
assert(!ex0CardHtml.includes('✓'), 'All-skipped exercise 0 does NOT render green checkmark (✓)');

console.log('  ✓ 4. Passed: Skipped sets/exercises render amber ⏭ and never green completed checkmark.');

// ─── 5. Preserving Skipped Status in Final Summary ───────────────────────────
console.log('\n--- 5. Testing Final Summary Metrics Preservation ---');
const summary = sandbox.getWorkoutSessionSummaryMetrics(sess);
assert.strictEqual(summary.setsCompleted, 1, 'Summary has 1 completed set');
assert.strictEqual(summary.setsSkipped, 3, 'Summary has 3 skipped sets');
assert.strictEqual(summary.totalSets, 4, 'Summary has 4 total sets');

const completeViewHtml = sandbox.renderWorkoutCompleteView(sess, summary);
assert(completeViewHtml.includes('Sets Skipped') && completeViewHtml.includes('3'), 'Workout Complete screen displays 3 Sets Skipped');

console.log('  ✓ 5. Passed: Skipped status is accurately preserved and displayed in final summary.');

console.log('\n=============================================================');
console.log('🎉 ALL SKIP SET BEHAVIOR TESTS VERIFIED & PASSED 100%!');
console.log('=============================================================');
if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
