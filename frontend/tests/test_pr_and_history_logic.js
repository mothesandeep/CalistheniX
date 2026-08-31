/**
 * CalistheniX — PR & Previous Performance Logic Test Suite
 *
 * Verifies:
 * 1. Last performance comes from stored workout history (not synthetic formulas).
 * 2. Current performance comes from current session data.
 * 3. PR compares strictly against historical best.
 * 4. Target is NOT a PR.
 * 5. "Last" is NOT automatically a PR.
 * 6. Only displays PR when current performance actually beats the historical best.
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
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; }
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
    remove: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} }
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
const prCode = fs.readFileSync(path.join(__dirname, '../js/views/personal-records.js'), 'utf8');

vm.runInContext(constantsCode, sandbox);
vm.runInContext(utilsCode, sandbox);
vm.runInContext(audioCode, sandbox);
vm.runInContext(storageCode, sandbox);
vm.runInContext(stateCode, sandbox);
vm.runInContext(runnerCode, sandbox);
vm.runInContext(prCode, sandbox);

sandbox.showToast = (msg) => { sandbox._lastToast = msg; };

// Setup Historical Records & Completed Session History
sandbox.window.state.dashboardRecords = [
  { exercise_id: 10, exercise_name: 'Weighted Dips', max_reps: 8, max_weight_kg: 20 },
  { exercise_id: 20, exercise_name: 'L-Sit Hold', max_duration_sec: 25, max_weight_kg: 0 }
];

// Seed a past completed workout session into localStorage
const pastCompletedSession = {
  id: 'cx_session_past_001',
  routine: 'DIPS & CORE',
  status: 'completed',
  completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  exercises: [
    {
      exercise_id: 10,
      exercise_name: 'Weighted Dips',
      sets: [
        { set_num: 1, completed: true, actual_val: 8, weight_kg: 20 }
      ]
    },
    {
      exercise_id: 20,
      exercise_name: 'L-Sit Hold',
      exercise_type: 'duration',
      sets: [
        { set_num: 1, completed: true, actual_val: 20 }
      ]
    }
  ]
};
mockLocalStorage.setItem('cx_session_past_001', JSON.stringify(pastCompletedSession));

console.log('=============================================================');
console.log('PR & PREVIOUS PERFORMANCE AUDIT TEST SUITE');
console.log('=============================================================');

// ─── 1. Last Performance Comes From Stored Workout History ──────────────────
console.log('\n--- 1. Testing Last Performance Retrieval ---');
const lastPerfDips = sandbox.getExerciseLastPerformance(10, 'Weighted Dips');
assert.strictEqual(lastPerfDips.hasHistory, true, 'Found stored history for Weighted Dips');
assert.strictEqual(lastPerfDips.val, 8, 'Retrieved actual reps (8) from last completed session');
assert.strictEqual(lastPerfDips.weight, 20, 'Retrieved actual weight (+20kg) from last session');
assert(lastPerfDips.displayText.includes('8 reps @ 20kg'), 'Display text accurately represents stored history');

const lastPerfUnknown = sandbox.getExerciseLastPerformance(999, 'Handstand Push-up');
assert.strictEqual(lastPerfUnknown.hasHistory, false, 'No history found for unperformed exercise');
assert.strictEqual(lastPerfUnknown.displayText, '—', 'Shows clean dash for exercise with no history');
console.log('  ✓ 1. Passed: Last performance comes accurately from stored history.');

// ─── 2. Target is NOT a PR & "Last" is NOT automatically a PR ───────────────
console.log('\n--- 2. Testing Target & Repeat Performance are NOT PRs ---');
sandbox._lastToast = null;

// User performs target reps (8 reps @ 20kg) which matches their previous best (8 reps @ 20kg)
sandbox.checkAndCelebratePR(10, 8, 20);
assert.strictEqual(sandbox._lastToast, null, 'No PR toast triggered for matching target / previous record');

const repeatSession = {
  exercises: [
    {
      id: 10,
      exercise_id: 10,
      exercise_name: 'Weighted Dips',
      sets: [
        { set_num: 1, completed: true, actual_val: 8, weight_kg: 20 }
      ]
    }
  ]
};
const repeatSummary = sandbox.getWorkoutSessionSummaryMetrics(repeatSession);
assert.strictEqual(repeatSummary.achievedPR, null, 'Repeat performance is not flagged as PR in summary');
console.log('  ✓ 2. Passed: Targets and repeating past performance do NOT trigger false PRs.');

// ─── 3. Genuine PR Achievement is Correctly Detected ─────────────────────────
console.log('\n--- 3. Testing Genuine PR Detection ---');
sandbox._lastToast = null;

// User performs 9 reps @ 20kg (beating 8 reps record)
sandbox.checkAndCelebratePR(10, 9, 20);
assert(sandbox._lastToast && sandbox._lastToast.includes('NEW PR'), 'Celebrated genuine new reps PR');
assert(sandbox._lastToast.includes('9 reps (beat previous 8 reps)'), 'Toast specifies previous record beaten');

// User performs 8 reps @ +25kg (beating +20kg weight record)
sandbox._lastToast = null;
sandbox.checkAndCelebratePR(10, 8, 25);
assert(sandbox._lastToast && sandbox._lastToast.includes('NEW WEIGHT PR'), 'Celebrated genuine new weight PR');
assert(sandbox._lastToast.includes('+25kg (beat previous +20kg)'), 'Toast specifies previous weight beaten');

const prSession = {
  exercises: [
    {
      id: 10,
      exercise_id: 10,
      exercise_name: 'Weighted Dips',
      sets: [
        { set_num: 1, completed: true, actual_val: 8, weight_kg: 25 }
      ]
    }
  ]
};
const prSummary = sandbox.getWorkoutSessionSummaryMetrics(prSession);
assert(prSummary.achievedPR != null && prSummary.achievedPR.includes('+25kg'), 'PR captured in session summary');
console.log('  ✓ 3. Passed: Genuine PR correctly detected and displayed.');

// ─── 4. Quick-fill "Same as Last" Uses Real History or Previous Set ──────────
console.log('\n--- 4. Testing Quick-fill "Same as Last" Integrity ---');
const activeRunnerSession = {
  id: 'current_active_session',
  routine: 'DIPS & CORE',
  currentPhase: 'main',
  phase: 'MAIN_WORKOUT',
  phaseState: 'ACTIVE',
  status: 'in_progress',
  activeExerciseIndex: 0,
  activeSetIndex: 0,
  exercises: [
    {
      id: 10,
      exercise_id: 10,
      exercise_name: 'Weighted Dips',
      sets: [
        { set_num: 1, target_val: 6, actual_val: null, weight_kg: null, completed: false },
        { set_num: 2, target_val: 6, actual_val: null, weight_kg: null, completed: false }
      ]
    }
  ]
};
sandbox.saveActiveSession(activeRunnerSession);
sandbox.window.state.activeSession = activeRunnerSession;

// For Set 1 (no previous set in current session), applySameAsLastPerformance fills from stored workout history (+20kg, 8 reps)
sandbox.applySameAsLastPerformance(0, 0);
let sess = sandbox.getActiveSession();
assert.strictEqual(sess.exercises[0].sets[0].actual_val, 8, 'Set 1 quick-fill used stored history reps (8)');
assert.strictEqual(sess.exercises[0].sets[0].weight_kg, 20, 'Set 1 quick-fill used stored history weight (20kg)');

// Now complete Set 1 with 9 reps @ 22.5kg
sess.exercises[0].sets[0].actual_val = 9;
sess.exercises[0].sets[0].weight_kg = 22.5;
sess.exercises[0].sets[0].completed = true;
sess.activeSetIndex = 1;
sandbox.saveActiveSession(sess);

// For Set 2, applySameAsLastPerformance fills from Set 1 in current session (9 reps @ 22.5kg)
sandbox.applySameAsLastPerformance(0, 1);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.exercises[0].sets[1].actual_val, 9, 'Set 2 quick-fill used Set 1 reps from current session (9)');
assert.strictEqual(sess.exercises[0].sets[1].weight_kg, 22.5, 'Set 2 quick-fill used Set 1 weight from current session (22.5kg)');
console.log('  ✓ 4. Passed: Quick-fill applies real historical or current session values without synthetic tampering.');

console.log('\n=============================================================');
console.log('🎉 ALL PR & PREVIOUS PERFORMANCE AUDIT TESTS PASSED 100%!');
console.log('=============================================================');
if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
