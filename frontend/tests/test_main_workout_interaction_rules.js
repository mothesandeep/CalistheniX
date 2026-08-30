/**
 * CalistheniX — Main Workout Interaction Rules Test Suite
 *
 * Verifies:
 * 1. Target is only a recommendation, not the performed result.
 * 2. User adjusts reps/hold -> Complete Set saves the actual performed value.
 * 3. Rest starts only after a completed set.
 * 4. Skipped set never starts as completed and does not trigger rest.
 * 5. “Same as last” fills the previous value but does not save until Complete Set.
 * 6. Weight and RPE belong to the current set.
 * 7. Next exercise unlocks only when the current exercise is finished.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Setup Sandbox
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
  _lastToast: null,
  _restStarted: false,
  _restDuration: 0,
  cueSetComplete: () => {},
  cueExerciseComplete: () => {},
  startWorkoutRest: (sec, nextInfo, feedback) => {
    sandbox._restStarted = true;
    sandbox._restDuration = sec;
  },
  stopWorkoutRest: () => { sandbox._restStarted = false; },
  startWorkoutDurationTimer: () => {},
  stopWorkoutDurationTimer: () => {},
  openExitWorkoutModal: () => {},
  openBiomechanicsModal: () => {},
  openSkipMainWorkoutSetModal: () => {},
  renderAutoAdvanceHtml: () => '',
  renderExerciseVisualStageCard: () => '<div class="visual-stage"></div>',
  renderExerciseMuscleFocusCard: () => '<div class="muscle-focus"></div>',
  renderWorkoutRestView: () => '<div class="rest-view"></div>',
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

const origStartWorkoutRest = sandbox.startWorkoutRest;
sandbox.startWorkoutRest = (sec, nextInfo, feedback) => {
  sandbox._restStarted = true;
  sandbox._restDuration = sec;
  return origStartWorkoutRest(sec, nextInfo, feedback);
};

function createMainWorkoutSession() {
  return {
    id: 'test-main-workout-rules',
    workout_id: 201,
    routine: 'UPPER BODY HYPERTROPHY',
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
        id: 101,
        exercise_id: 1,
        exercise_name: 'Weighted Pull-up',
        exercise_type: 'reps',
        rest_sec: 90,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, weight_kg: 10, rpe: 8, completed: false, skipped: false },
          { set_num: 2, target_val: 8, actual_val: 8, weight_kg: null, rpe: null, completed: false, skipped: false },
          { set_num: 3, target_val: 8, actual_val: 8, weight_kg: null, rpe: null, completed: false, skipped: false }
        ]
      },
      {
        id: 102,
        exercise_id: 2,
        exercise_name: 'Dips',
        exercise_type: 'reps',
        rest_sec: 60,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 12, actual_val: 12, weight_kg: null, rpe: null, completed: false, skipped: false },
          { set_num: 2, target_val: 12, actual_val: 12, weight_kg: null, rpe: null, completed: false, skipped: false }
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
console.log('MAIN WORKOUT INTERACTION RULES TEST SUITE');
console.log('=============================================================');

// ─── RULE 1: Target is Recommendation, not Performed Result ───────────────────
console.log('\n--- Rule 1: Target Recommendation Preservation ---');
let sess = createMainWorkoutSession();
sandbox.saveActiveSession(sess);
sandbox.state.activeSession = sess;

const cardHtml = sandbox.renderMainWorkoutCardView(sess);
assert(cardHtml.includes('Target: <strong>8 reps</strong>') || cardHtml.includes('8 reps'), 'Card renders Target recommendation');
assert(cardHtml.includes('Weighted Pull-up'), 'Card renders exercise name');

// User adjusts reps by +2
sandbox.adjustCurrentSetReps(2);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.exercises[0].sets[0].target_val, 8, 'target_val remains unchanged at 8 reps');
assert.strictEqual(sess.exercises[0].sets[0].actual_val, 10, 'actual_val adjusted to 10 reps');
assert.strictEqual(sess.exercises[0].sets[0].completed, false, 'Set is not completed yet during adjustment');

console.log('  ✓ Rule 1 PASSED: Target is preserved as recommendation while actual reps adjust.');

// ─── RULE 2 & 3: Complete Set Saves Performed Value & Starts Rest ─────────────
console.log('\n--- Rule 2 & 3: Complete Set Saves Value and Starts Rest ---');
sandbox._restStarted = false;
sandbox.completeMainWorkoutSet(); // User taps Complete Set
sess = sandbox.getActiveSession();

const set1 = sess.exercises[0].sets[0];
assert.strictEqual(set1.completed, true, 'Set 1 is marked completed: true');
assert.strictEqual(set1.skipped, false, 'Set 1 is not skipped');
assert.strictEqual(set1.actual_val, 10, 'Set 1 saved performed value (10)');
assert(set1.completed_at != null, 'Set 1 has completed_at timestamp');
assert.strictEqual(sandbox._restStarted, true, 'Rest timer started after completed set');
assert.strictEqual(sandbox._restDuration, 90, 'Rest timer duration is 90s');

console.log('  ✓ Rule 2 & 3 PASSED: Complete Set saves actual performed value and starts Rest.');

// ─── RULE 4: Skipped Set Never Starts Completed & Does Not Start Rest ─────────
console.log('\n--- Rule 4: Skipped Set Never Starts Completed and No Rest ---');
// User is now on Set 2
assert.strictEqual(sess.activeSetIndex, 1, 'Active set is Set 2');
sandbox._restStarted = false;

// User skips Set 2
sandbox.skipMainWorkoutSet();
sess = sandbox.getActiveSession();

const set2 = sess.exercises[0].sets[1];
assert.strictEqual(set2.skipped, true, 'Set 2 is marked skipped: true');
assert.strictEqual(set2.completed, false, 'Set 2 is completed: false');
assert.strictEqual(set2.completed_at, null, 'Set 2 has null completed_at');
assert.strictEqual(sandbox._restStarted, false, 'Rest timer did NOT start after a skipped set');
assert.strictEqual(sess.activeSetIndex, 2, 'Advanced to Set 3');

console.log('  ✓ Rule 4 PASSED: Skipped set is never completed and does not trigger rest.');

// ─── RULE 5: “Same as last” Fills Previous Value without Saving ───────────────
console.log('\n--- Rule 5: Same as Last Fills Values without Auto-Completing ---');
// User is on Set 3
assert.strictEqual(sess.activeSetIndex, 2, 'Active set is Set 3');
const set3Before = sess.exercises[0].sets[2];
assert.strictEqual(set3Before.completed, false, 'Set 3 is uncompleted');

// Click "Same as last"
sandbox.applySameAsLastPerformance(0, 2);
sess = sandbox.getActiveSession();

const set3After = sess.exercises[0].sets[2];
assert.strictEqual(set3After.completed, false, 'Set 3 is NOT marked completed by Same as Last');
assert.strictEqual(set3After.actual_val, 8, 'Set 3 filled with previous value (8)');
assert(sandbox._lastToast && sandbox._lastToast.includes('Tap Complete Set'), 'Informed user to tap Complete Set when finished');

console.log('  ✓ Rule 5 PASSED: Same as last fills previous values but does not save until Complete Set.');

// ─── RULE 6: Weight and RPE Belong to Current Set ─────────────────────────────
console.log('\n--- Rule 6: Weight and RPE Current Set Binding ---');
sandbox.updateWorkoutSetWeight(0, 2, 12.5);
sandbox.updateWorkoutSetRPE(0, 2, 9);
sess = sandbox.getActiveSession();

assert.strictEqual(sess.exercises[0].sets[2].weight_kg, 12.5, 'Weight 12.5kg assigned to Set 3');
assert.strictEqual(sess.exercises[0].sets[2].rpe, 9, 'RPE 9 assigned to Set 3');
assert.strictEqual(sess.exercises[0].sets[1].weight_kg, null, 'Set 2 weight unaffected');

console.log('  ✓ Rule 6 PASSED: Weight and RPE modify only the target active set.');

// ─── RULE 7: Next Exercise Unlocks Only When Current Exercise is Finished ─────
console.log('\n--- Rule 7: Next Exercise Lock Guard ---');
// Current exercise (0) has Set 3 still uncompleted
assert.strictEqual(sess.exercises[0].sets[2].completed, false, 'Set 3 is still pending');

// Attempting to select Exercise 1 (Dips)
sandbox._lastToast = null;
sandbox.selectExerciseToExecute('main', 1);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.activeExerciseIndex, 0, 'Exercise 1 is locked because Exercise 0 has unresolved sets');
assert(sandbox._lastToast && sandbox._lastToast.includes('Complete or skip all sets'), 'Toast informed user that exercise is locked');

// Now complete Set 3 (finishing Exercise 0)
sandbox.completeMainWorkoutSet();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.exercises[0].sets[2].completed, true, 'Set 3 completed');
assert.strictEqual(sess.exercises[0].completed, true, 'Exercise 0 is now completed');
assert.strictEqual(sess.activeExerciseIndex, 1, 'Exercise 1 (Dips) unlocked and selected automatically');

console.log('  ✓ Rule 7 PASSED: Next exercise unlocks only when current exercise is finished.');

console.log('\n=============================================================');
console.log('🎉 ALL 7 MAIN WORKOUT INTERACTION RULES VERIFIED & PASSED 100%!');
console.log('=============================================================');
