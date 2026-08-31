/**
 * CalistheniX — Complete Workout QA Pass Test Suite
 *
 * Tests the EXACT user flow:
 * Start Workout
 * → Warm-Up
 * → complete movement
 * → skip movement
 * → Main Workout
 * → complete set
 * → Rest
 * → pause/resume
 * → skip rest
 * → skip set
 * → next exercise
 * → complete exercise
 * → Cool Down
 * → complete stretch
 * → skip stretch
 * → finish workout
 * → Workout Summary
 *
 * Verifies every transition:
 * - counts
 * - timers
 * - exercise indexes
 * - phase
 * - completed state
 * - skipped state
 * - progress percentage
 * - summary values
 * - history data
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Mock LocalStorage
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

// Mock DOM
const mockDocument = {
  getElementById: (id) => null,
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  createElement: (tag) => ({
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
    removeEventListener: () => {},
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
  _toasts: [],
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
  API: {
    getWorkoutSessions: async () => []
  },
  requestWakeLock: async () => {},
  releaseScreenWakeLock: () => {},
  render: () => {}
};

vm.createContext(sandbox);

// Load all core scripts
const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const runnerCode = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');
const prCode = fs.readFileSync(path.join(__dirname, '../js/views/personal-records.js'), 'utf8');
const historyCode = fs.readFileSync(path.join(__dirname, '../js/views/history-list.js'), 'utf8');

vm.runInContext(constantsCode, sandbox);
vm.runInContext(utilsCode, sandbox);
vm.runInContext(audioCode, sandbox);
vm.runInContext(storageCode, sandbox);
vm.runInContext(stateCode, sandbox);
vm.runInContext(runnerCode, sandbox);
vm.runInContext(prCode, sandbox);
vm.runInContext(historyCode, sandbox);

sandbox.showToast = (msg) => { sandbox._toasts.push(msg); };

console.log('=============================================================');
console.log('STARTING COMPLETE WORKOUT QA FLOW VERIFICATION PASS');
console.log('=============================================================');

// ─── STEP 1: Start Workout ──────────────────────────────────────────────────
console.log('\n[STEP 1] Start Workout Session...');
const workoutPayload = {
  workout_id: 'qa_routine_01',
  name: 'UPPER BODY QA',
  routine: 'UPPER BODY QA',
  level: 2,
  warmup_exercises: [
    { exercise_id: 101, exercise_name: 'Arm Circles', duration_sec: 30, reps: null, exercise_type: 'duration' },
    { exercise_id: 102, exercise_name: 'Wrist Mobility', duration_sec: 30, reps: null, exercise_type: 'duration' }
  ],
  exercises: [
    {
      id: 201,
      exercise_id: 201,
      exercise_name: 'Pull-up',
      exercise_type: 'reps',
      rest_sec: 60,
      sets: [
        { set_num: 1, target_val: 8, actual_val: null, weight_kg: null, rpe: null, completed: false, skipped: false },
        { set_num: 2, target_val: 8, actual_val: null, weight_kg: null, rpe: null, completed: false, skipped: false }
      ]
    },
    {
      id: 202,
      exercise_id: 202,
      exercise_name: 'Dips',
      exercise_type: 'reps',
      rest_sec: 60,
      sets: [
        { set_num: 1, target_val: 10, actual_val: null, weight_kg: null, rpe: null, completed: false, skipped: false },
        { set_num: 2, target_val: 10, actual_val: null, weight_kg: null, rpe: null, completed: false, skipped: false }
      ]
    }
  ],
  cooldown_exercises: [
    { exercise_id: 301, exercise_name: 'Dead Hang Stretch', duration_sec: 30, reps: null, exercise_type: 'duration' },
    { exercise_id: 302, exercise_name: 'Shoulder Extension Stretch', duration_sec: 30, reps: null, exercise_type: 'duration' }
  ]
};

sandbox.startWorkoutFromData(workoutPayload);
let session = sandbox.getActiveSession();

assert(session != null, 'Active session initialized');
assert.strictEqual(session.currentPhase, 'warmup', 'Phase starts at warmup');
assert.strictEqual(session.warmupIndex, 0, 'Warm-up starts at index 0');
assert.strictEqual(session.warmup_exercises.length, 2, '2 warm-up movements loaded');
assert.strictEqual(session.exercises.length, 2, '2 main exercises loaded');
assert.strictEqual(session.cooldown_exercises.length, 2, '2 cool-down stretches loaded');
console.log('✓ Step 1 Passed: Session successfully created with deterministic initial state.');

// ─── STEP 2: Warm-Up → Complete Movement ────────────────────────────────────
console.log('\n[STEP 2] Warm-Up: Complete Movement 0 (Arm Circles)...');
// User completes movement 0
sandbox.advanceWarmupMovement();
session = sandbox.getActiveSession();

assert.strictEqual(session.warmup_exercises[0].completed, true, 'Movement 0 marked completed');
assert.strictEqual(session.warmup_exercises[0].skipped, false, 'Movement 0 is NOT skipped');
assert.strictEqual(session.warmupIndex, 1, 'Warmup pointer advanced to Movement 1');

let warmupAuth = sandbox.getAuthoritativeSessionState(session).warmup;
assert.strictEqual(warmupAuth.completed, 1, 'Authoritative completed count is 1');
assert.strictEqual(warmupAuth.skipped, 0, 'Authoritative skipped count is 0');
console.log('✓ Step 2 Passed: Completed movement properly logged, state preserved, index advanced.');

// ─── STEP 3: Warm-Up → Skip Movement ────────────────────────────────────────
console.log('\n[STEP 3] Warm-Up: Skip Movement 1 (Wrist Mobility)...');
// User skips movement 1
sandbox.skipWarmupExercise();
session = sandbox.getActiveSession();

assert.strictEqual(session.warmup_exercises[1].skipped, true, 'Movement 1 marked skipped');
assert.strictEqual(session.warmup_exercises[1].completed, false, 'Movement 1 is NOT completed');

warmupAuth = sandbox.getAuthoritativeSessionState(session).warmup;
assert.strictEqual(warmupAuth.completed, 1, 'Warmup completed count is 1');
assert.strictEqual(warmupAuth.skipped, 1, 'Warmup skipped count is 1');
assert.strictEqual(warmupAuth.isDone, true, 'All warm-up movements resolved');
console.log('✓ Step 3 Passed: Skipped movement properly marked skipped (never completed), phase resolved.');

// ─── STEP 4: Transition to Main Workout ─────────────────────────────────────
console.log('\n[STEP 4] Transition to Main Workout Phase...');
sandbox.setWorkoutPhase('main');
session = sandbox.getActiveSession();

assert.strictEqual(session.currentPhase, 'main', 'Active phase transitioned to main');
assert.strictEqual(session.activeExerciseIndex, 0, 'Active exercise index is 0 (Pull-up)');
assert.strictEqual(session.activeSetIndex, 0, 'Active set index is 0 (Set 1)');
console.log('✓ Step 4 Passed: Main workout unlocked and cleanly active.');

// ─── STEP 5: Main Workout → Complete Set 1 ──────────────────────────────────
console.log('\n[STEP 5] Main Workout: Complete Set 1 on Exercise 0 (Pull-up)...');
// Adjust performed reps to 9, weight to 5kg, RPE to 8
sandbox.adjustWorkoutSetActual(0, 0, 1); // 8 + 1 = 9
sandbox.updateWorkoutSetWeight(0, 0, 5);
sandbox.updateWorkoutSetRPE(0, 0, 8);

session = sandbox.getActiveSession();
assert.strictEqual(session.exercises[0].sets[0].actual_val, 9, 'Actual performed reps adjusted to 9');
assert.strictEqual(session.exercises[0].sets[0].weight_kg, 5, 'Weight set to +5kg');
assert.strictEqual(session.exercises[0].sets[0].rpe, 8, 'RPE set to 8');

// Complete Set
sandbox.completeMainWorkoutSet();
session = sandbox.getActiveSession();

assert.strictEqual(session.exercises[0].sets[0].completed, true, 'Exercise 0 Set 1 marked completed');
assert.strictEqual(session.exercises[0].sets[0].skipped, false, 'Exercise 0 Set 1 is NOT skipped');
console.log('✓ Step 5 Passed: Set 1 completed with actual performance data saved.');

// ─── STEP 6: Rest → Pause / Resume ──────────────────────────────────────────
console.log('\n[STEP 6] Rest Interval: Verify Rest state, Pause & Resume...');
let restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.active, true, 'Rest timer is active after completed set');
assert.strictEqual(restState.state, 'RUNNING', 'Rest state is RUNNING');
assert(restState.remaining > 0, 'Rest timer has positive remaining duration');

// Pause Rest
sandbox.togglePauseWorkoutRest();
restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.state, 'PAUSED', 'Rest state transitioned to PAUSED');

// Resume Rest
sandbox.togglePauseWorkoutRest();
restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.state, 'RUNNING', 'Rest state transitioned back to RUNNING');
console.log('✓ Step 6 Passed: Rest timer pause and resume behave accurately.');

// ─── STEP 7: Rest → Skip Rest ───────────────────────────────────────────────
console.log('\n[STEP 7] Rest: Skip Rest countdown...');
sandbox.stopWorkoutRest();
restState = sandbox.getWorkoutRestState();
assert.strictEqual(restState.active, false, 'Rest timer deactivated upon skip');

session = sandbox.getActiveSession();
assert.strictEqual(session.activeExerciseIndex, 0, 'Still on Exercise 0');
assert.strictEqual(session.activeSetIndex, 1, 'Active set pointer prepared at Set 2');
assert.strictEqual(session.exercises[0].sets[1].completed, false, 'Next set NOT prematurely completed');
assert.strictEqual(session.exercises[0].sets[1].skipped, false, 'Next set NOT prematurely skipped');
console.log('✓ Step 7 Passed: Rest skipped cleanly without corrupting next set state.');

// ─── STEP 8: Main Workout → Skip Set 2 ──────────────────────────────────────
console.log('\n[STEP 8] Main Workout: Skip Set 2 on Exercise 0 (Pull-up)...');
sandbox.confirmSkipMainWorkoutSet();
session = sandbox.getActiveSession();

assert.strictEqual(session.exercises[0].sets[1].skipped, true, 'Exercise 0 Set 2 marked skipped');
assert.strictEqual(session.exercises[0].sets[1].completed, false, 'Exercise 0 Set 2 is NOT completed');

// Verify Exercise 0 counts
const ex0Sets = session.exercises[0].sets;
const ex0Completed = ex0Sets.filter(s => s.completed).length;
const ex0Skipped = ex0Sets.filter(s => s.skipped).length;
assert.strictEqual(ex0Completed, 1, 'Exercise 0 has 1 completed set');
assert.strictEqual(ex0Skipped, 1, 'Exercise 0 has 1 skipped set');
console.log('✓ Step 8 Passed: Skipped set registered accurately in exercise model.');

// ─── STEP 9: Next Exercise ──────────────────────────────────────────────────
console.log('\n[STEP 9] Advance to Next Exercise (Exercise 1: Dips)...');
// Since Exercise 0 is now fully resolved (Set 1 completed, Set 2 skipped), Exercise 1 is active/unlocked
session = sandbox.getActiveSession();
assert.strictEqual(session.activeExerciseIndex, 1, 'Active exercise pointer advanced to Exercise 1 (Dips)');
assert.strictEqual(session.activeSetIndex, 0, 'Active set pointer reset to Set 1 for Exercise 1');
console.log('✓ Step 9 Passed: Auto-advanced to next exercise with clean set pointers.');

// ─── STEP 10: Complete Exercise 1 ───────────────────────────────────────────
console.log('\n[STEP 10] Complete All Sets on Exercise 1 (Dips)...');
// Complete Set 1 of Dips
sandbox.completeMainWorkoutSet();
sandbox.stopWorkoutRest(); // Dismiss rest

// Complete Set 2 of Dips
sandbox.completeMainWorkoutSet();
session = sandbox.getActiveSession();

assert.strictEqual(session.exercises[1].sets[0].completed, true, 'Exercise 1 Set 1 completed');
assert.strictEqual(session.exercises[1].sets[1].completed, true, 'Exercise 1 Set 2 completed');

const mainAuth = sandbox.getAuthoritativeSessionState(session).main;
assert.strictEqual(mainAuth.completedSets, 3, 'Total completed main sets = 3 (1 Pull-up + 2 Dips)');
assert.strictEqual(mainAuth.skippedSets, 1, 'Total skipped main sets = 1 (1 Pull-up)');
assert.strictEqual(mainAuth.totalSets, 4, 'Total main sets = 4');
assert.strictEqual(mainAuth.isDone, true, 'Main workout phase marked finished');
console.log('✓ Step 10 Passed: Exercise 1 and entire Main Workout phase completed.');

// ─── STEP 11: Transition to Cool Down ───────────────────────────────────────
console.log('\n[STEP 11] Transition to Cool Down Phase...');
sandbox.setWorkoutPhase('cooldown');
session = sandbox.getActiveSession();

assert.strictEqual(session.currentPhase, 'cooldown', 'Active phase transitioned to cooldown');
assert.strictEqual(session.cooldownIndex, 0, 'Cool-down stretch index starts at 0');
console.log('✓ Step 11 Passed: Cool Down phase unlocked and active.');

// ─── STEP 12: Cool Down → Complete Stretch 0 ────────────────────────────────
console.log('\n[STEP 12] Cool Down: Complete Stretch 0 (Dead Hang Stretch)...');
sandbox.advanceCooldownStretch();
session = sandbox.getActiveSession();

assert.strictEqual(session.cooldown_exercises[0].completed, true, 'Stretch 0 marked completed');
assert.strictEqual(session.cooldown_exercises[0].skipped, false, 'Stretch 0 is NOT skipped');
assert.strictEqual(session.cooldownIndex, 1, 'Cool-down index advanced to Stretch 1');

let cdAuth = sandbox.getAuthoritativeSessionState(session).cooldown;
assert.strictEqual(cdAuth.completed, 1, 'Cool-down completed count is 1');
assert.strictEqual(cdAuth.skipped, 0, 'Cool-down skipped count is 0');
console.log('✓ Step 12 Passed: Stretch completed and index advanced.');

// ─── STEP 13: Cool Down → Skip Stretch 1 ────────────────────────────────────
console.log('\n[STEP 13] Cool Down: Skip Stretch 1 (Shoulder Extension Stretch)...');
sandbox.confirmSkipCooldownExercise();
session = sandbox.getActiveSession();

assert.strictEqual(session.cooldown_exercises[1].skipped, true, 'Stretch 1 marked skipped');
assert.strictEqual(session.cooldown_exercises[1].completed, false, 'Stretch 1 is NOT completed');

cdAuth = sandbox.getAuthoritativeSessionState(session).cooldown;
assert.strictEqual(cdAuth.completed, 1, 'Cool-down completed count is 1');
assert.strictEqual(cdAuth.skipped, 1, 'Cool-down skipped count is 1');
assert.strictEqual(cdAuth.isDone, true, 'All cool-down stretches resolved');
console.log('✓ Step 13 Passed: Stretch skipped properly.');

// ─── STEP 14: Finish Workout & Terminal State ────────────────────────────────
console.log('\n[STEP 14] Finish Workout Session...');
session = sandbox.getActiveSession();
assert.strictEqual(session.status, 'completed', 'Session status is completed');
assert.strictEqual(session.phase, 'COMPLETED', 'Session phase is COMPLETED');
console.log('✓ Step 14 Passed: Terminal completion reached seamlessly.');

// ─── STEP 15: Workout Summary Verification ──────────────────────────────────
console.log('\n[STEP 15] Verify Workout Summary Metrics & Phrasing...');
const summary = sandbox.getWorkoutSessionSummaryMetrics(session);

assert.strictEqual(summary.exercisesCompleted, 2, '2 exercises had resolved sets with completions');
assert.strictEqual(summary.setsCompleted, 3, 'Exactly 3 sets completed');
assert.strictEqual(summary.setsSkipped, 1, 'Exactly 1 set skipped');
assert.strictEqual(summary.totalSets, 4, 'Total sets = 4');
assert.strictEqual(summary.completionPct, 75, 'Completion % = (3 / 4) * 100 = 75%');
assert.strictEqual(summary.volumeFormatted, '45 kg', 'Volume = 9 reps * 5kg = 45 kg');

// Render complete view and verify honest phrasing
const completeHtml = sandbox.renderWorkoutCompleteView(session, summary);
assert(completeHtml.includes('3 sets completed · 1 skipped'), 'Summary card displays honest skipped breakdown');
assert(!completeHtml.includes('All sets completed'), 'Honest phrasing: does NOT claim all sets completed');
console.log('✓ Step 15 Passed: Summary metrics, percentages, volume, and honest phrasing verified.');

// ─── STEP 16: History Data & Storage Verification ───────────────────────────
(async () => {
  console.log('\n[STEP 16] Verify Stored History Session Persistence...');
  await sandbox.loadWorkoutSessions();
  const historySessions = vm.runInContext('state.workoutSessions', sandbox) || [];
  assert(historySessions.length > 0, 'Completed session saved into stored history');

  const lastHistorySess = historySessions[0];
  assert.strictEqual(lastHistorySess.routine_name || lastHistorySess.routine, 'UPPER BODY QA', 'History routine title matches');
  assert.strictEqual(lastHistorySess.warmup_status, 'completed', 'History warmup status is completed');
  assert.strictEqual(lastHistorySess.cooldown_status, 'completed', 'History cooldown status is completed');
  console.log('✓ Step 16 Passed: History persistence validated without data corruption.');

  console.log('\n=============================================================');
  console.log('🎉 COMPLETE WORKOUT QA FLOW PASS 100% VERIFIED & PASSED!');
  console.log('=============================================================');
  if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
  process.exit(0);
})();
