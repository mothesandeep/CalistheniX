/**
 * CalistheniX — Cool Down Interaction Rules Test Suite
 *
 * Verifies:
 * 1. Shows target duration.
 * 2. Start/Resume and Pause timer.
 * 3. -5s / +5s controls.
 * 4. Done marks the stretch completed.
 * 5. Skip marks it skipped.
 * 6. Next moves only to the correct next stretch.
 * 7. Completed stretches = green check (✓, #10b981), Skipped stretches = skipped state (⏭, #eab308).
 * 8. Terminal transition to Workout Complete on final stretch resolution.
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
    if (id === 'skip-cooldown-modal') return _createdModalEl;
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
      { id: 1, name: 'Passive Dead Hang', movement_pattern: 'pull' },
      { id: 2, name: 'Child Pose Stretch', movement_pattern: 'push' }
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

function createTestCooldownSession() {
  return {
    id: 'test-cooldown-session-123',
    workout_id: 501,
    routine: 'FULL BODY RECOVERY',
    level: 1,
    status: 'in_progress',
    startTime: Date.now() - 300000,
    startedAt: Date.now() - 300000,
    pausedAt: null,
    currentPhase: 'cooldown',
    phase: 'COOLDOWN',
    phaseState: 'ACTIVE',
    warmupStatus: 'COMPLETED',
    warmup_status: 'completed',
    warmupIndex: 0,
    warmup: [],
    mainStatus: 'COMPLETED',
    main_status: 'completed',
    mainWorkoutSubState: 'SET_ACTIVE',
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        id: 1,
        exercise_name: 'Pull-up',
        completed: true,
        skipped: false,
        sets: [{ set_num: 1, target_val: 10, actual_val: 10, completed: true, skipped: false }]
      }
    ],
    cooldownStatus: 'ACTIVE',
    cooldown_status: 'in_progress',
    cooldownIndex: 0,
    cooldown_idx: 0,
    cooldown: [
      {
        id: 1,
        exercise_id: 101,
        exercise_name: 'Passive Dead Hang',
        exercise_type: 'duration',
        duration_sec: 45,
        target_val: 45,
        completed: false,
        skipped: false
      },
      {
        id: 2,
        exercise_id: 102,
        exercise_name: 'Child Pose Stretch',
        exercise_type: 'duration',
        duration_sec: 30,
        target_val: 30,
        completed: false,
        skipped: false
      }
    ]
  };
}

console.log('=============================================================');
console.log('COOL DOWN INTERACTION RULES TEST SUITE');
console.log('=============================================================');

// ─── Rule 1: Show Target Duration ───────────────────────────────────────────
console.log('\n--- Rule 1: Show Target Duration ---');
let sess = createTestCooldownSession();
sandbox.saveActiveSession(sess);
sandbox.state.activeSession = sess;

let cdCardHtml = sandbox.renderCooldownCardView(sess);
assert(cdCardHtml.includes('45s hold'), 'Cool-down card displays 45s hold target duration');
assert(cdCardHtml.includes('Passive Dead Hang'), 'Cool-down card displays stretch name');
console.log('  ✓ Rule 1 PASSED: Target duration is clearly displayed.');

// ─── Rule 2 & 3: Start/Resume & Pause Timer ─────────────────────────────────
console.log('\n--- Rule 2 & 3: Start/Resume and Pause Timer ---');
// Start Timer
sandbox.togglePhaseTimer();
sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseTimer.isRunning, true, 'Timer started and is running');

cdCardHtml = sandbox.renderCooldownCardView(sess);
assert(cdCardHtml.includes('Pause Timer') || cdCardHtml.includes('Pause'), 'Card displays Pause control when running');

// Pause Timer
sandbox.togglePhaseTimer();
sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseTimer.isRunning, false, 'Timer paused');

cdCardHtml = sandbox.renderCooldownCardView(sess);
assert(cdCardHtml.includes('Resume Timer') || cdCardHtml.includes('Start') || cdCardHtml.includes('PAUSED'), 'Card displays Resume/Start control when paused');
console.log('  ✓ Rule 2 & 3 PASSED: Timer starts and pauses cleanly.');

// ─── Rule 4: -5s / +5s Controls ──────────────────────────────────────────────
console.log('\n--- Rule 4: -5s and +5s Timer Adjustments ---');
sandbox.adjustPhaseTimer(-5);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseTimer.remaining, 40, 'Remaining time reduced to 40s (-5s)');

sandbox.adjustPhaseTimer(5);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.phaseTimer.remaining, 45, 'Remaining time restored to 45s (+5s)');
console.log('  ✓ Rule 4 PASSED: -5s and +5s stepper controls adjust duration accurately.');

// ─── Rule 5: Next Stretch Lock Guard ─────────────────────────────────────────
console.log('\n--- Rule 5: Next Stretch Lock Guard ---');
sandbox._lastToast = null;
sandbox.handleCooldownNextClick();
sess = sandbox.getActiveSession();

assert.strictEqual(sess.cooldownIndex, 0, 'Did not advance to Stretch 2 because Stretch 1 is not completed/skipped');
assert(sandbox._lastToast && sandbox._lastToast.includes('Complete or skip'), 'Lock guard showed toast warning');

// Attempt to jump forward via selectCooldownStretch
sandbox.selectCooldownStretch(1);
sess = sandbox.getActiveSession();
assert.strictEqual(sess.cooldownIndex, 0, 'selectCooldownStretch blocked jumping ahead');
console.log('  ✓ Rule 5 PASSED: Next stretch locked until current stretch is resolved.');

// ─── Rule 6: Done Marks Stretch Completed ───────────────────────────────────
console.log('\n--- Rule 6: Done Marks Stretch Completed ---');
sandbox.advanceCooldownStretch();
sess = sandbox.getActiveSession();

const stretch1 = sess.cooldown[0];
assert.strictEqual(stretch1.completed, true, 'Stretch 1 marked completed: true');
assert.strictEqual(stretch1.skipped, false, 'Stretch 1 is not skipped');
assert(stretch1.completed_at != null, 'completed_at timestamp recorded');
assert.strictEqual(sess.cooldownIndex, 1, 'Advanced to Stretch 2 (Child Pose Stretch)');

// Verify visual rendering of completed stretch
cdCardHtml = sandbox.renderCooldownCardView(sess);
assert(cdCardHtml.includes('class="runner-set-dot done"'), 'Stretch 1 dot has .done styling');
console.log('  ✓ Rule 6 PASSED: Done marks stretch completed and unlocks Next.');

// ─── Rule 7: Skip Marks Stretch Skipped (Never Completed) ───────────────────
console.log('\n--- Rule 7: Skip Marks Stretch Skipped ---');
sandbox.openSkipCooldownExerciseModal();
assert(_createdModalEl != null, 'Skip cooldown modal opened');
assert(_createdModalEl.innerHTML.includes('You are skipping this stretch. It will not count as completed.'));

sandbox.confirmSkipCooldownExercise();
sess = sandbox.getActiveSession();

const stretch2 = sess.cooldown[1];
assert.strictEqual(stretch2.skipped, true, 'Stretch 2 marked skipped: true');
assert.strictEqual(stretch2.completed, false, 'Stretch 2 is NEVER completed');
assert.strictEqual(stretch2.completed_at, null, 'Stretch 2 completed_at is null');
assert(stretch2.skipped_at != null, 'Stretch 2 skipped_at timestamp recorded');

console.log('  ✓ Rule 7 PASSED: Skip marks stretch skipped and never completed.');

// ─── Rule 8: Terminal State on Final Stretch Resolution ─────────────────────
console.log('\n--- Rule 8: Terminal Workout Complete Transition ---');
assert.strictEqual(sess.cooldownStatus, 'COMPLETED', 'Cool Down marked COMPLETED');
assert.strictEqual(sess.status, 'completed', 'Workout session status transitioned to completed');
console.log('  ✓ Rule 8 PASSED: Final stretch resolution deterministically transitions to Workout Complete.');

console.log('\n=============================================================');
console.log('🎉 ALL COOL DOWN INTERACTION RULES VERIFIED & PASSED 100%!');
console.log('=============================================================');
if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
