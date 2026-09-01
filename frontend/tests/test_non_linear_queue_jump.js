/**
 * test_non_linear_queue_jump.js
 * Verifies that jumping directly to any queue exercise (e.g. exercise #5) and completing it
 * does NOT prematurely complete the phase when earlier exercises remain uncompleted.
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const constantsCode = fs.readFileSync('frontend/js/core/constants.js', 'utf8');
const utilsCode = fs.readFileSync('frontend/js/core/utils.js', 'utf8');
const storageCode = fs.readFileSync('frontend/js/core/storage.js', 'utf8');
const runnerCode = fs.readFileSync('frontend/js/views/workout-runner.js', 'utf8');

const sandbox = {
  window: {
    location: { hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute: () => {} }),
    body: { appendChild: () => {} }
  },
  localStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
  },
  state: { view: 'workout', exercises: [], workouts: [] },
  render: () => {},
  showToast: () => {},
  cueSetComplete: () => {},
  cueExerciseComplete: () => {},
  renderIcon: () => '',
  setInterval: () => 123,
  clearInterval: () => {},
  setTimeout: () => 456,
  clearTimeout: () => {},
  console: console
};

const stateCode = fs.readFileSync('frontend/js/core/state.js', 'utf8');

vm.createContext(sandbox);
vm.runInContext([constantsCode, utilsCode, stateCode, storageCode, runnerCode].join('\n;\n'), sandbox);

console.log('=============================================================');
console.log('🧪 TESTING NON-LINEAR QUEUE SELECTION & COMPLETION FLOW');
console.log('=============================================================');

// Test 1: Jumping to last warmup movement and completing it
console.log('\n--- Test 1: Complete 5th warmup exercise when 1-4 are pending ---');
const session = {
  id: 'test-nonlinear-1',
  workout_name: 'Pull A',
  routine: 'Pull A',
  status: 'in_progress',
  phase: 'WARMUP',
  currentPhase: 'warmup',
  phaseState: 'ACTIVE',
  warmupStatus: 'ACTIVE',
  warmupIndex: 4, // 5th exercise
  warmup: [
    { exercise_name: 'Arm Circles', duration_sec: 40, completed: false, skipped: false },
    { exercise_name: 'Cat-Cow Stretch', duration_sec: 30, completed: false, skipped: false },
    { exercise_name: 'Band Pull-Aparts', reps: 15, completed: false, skipped: false },
    { exercise_name: 'Scapular Pulls', reps: 8, completed: false, skipped: false },
    { exercise_name: 'Dead Hang (Activation)', duration_sec: 20, completed: false, skipped: false }
  ],
  exercises: [{ exercise_name: 'Pull-up', sets: [{ completed: false, skipped: false }] }]
};
sandbox.saveActiveSession(session);

// Advance (mark complete on 5th movement)
sandbox.advanceWarmupMovement();

const updated1 = sandbox.getActiveSession();
assert.strictEqual(updated1.warmup[4].completed, true, 'Exercise 5 must be completed');
assert.strictEqual(updated1.warmupStatus, 'ACTIVE', 'Warm-up phase must NOT be marked COMPLETED when movements 1-4 are pending');
assert.strictEqual(updated1.warmupIndex, 0, 'Must automatically cycle to the first pending movement (Arm Circles)');
console.log('  ✓ PASSED: Warm-Up phase remains ACTIVE and switched to movement 1 (Arm Circles)!');

// Test 2: Complete all remaining movements
console.log('\n--- Test 2: Complete remaining movements until all 5 are done ---');
sandbox.advanceWarmupMovement(); // completes 0 (Arm Circles) -> advances to 1
sandbox.advanceWarmupMovement(); // completes 1 (Cat-Cow) -> advances to 2
sandbox.advanceWarmupMovement(); // completes 2 (Band Pull-Aparts) -> advances to 3
sandbox.advanceWarmupMovement(); // completes 3 (Scapular Pulls) -> all 5 now done!

const updated2 = sandbox.getActiveSession();
assert.strictEqual(updated2.warmup.every(w => w.completed), true, 'All 5 movements must be completed');
assert.strictEqual(updated2.warmupStatus, 'COMPLETED', 'Warm-up phase must be COMPLETED only when 100% of movements are done');
console.log('  ✓ PASSED: Warm-Up marked COMPLETED only when all 5/5 movements are done!');

console.log('\n=============================================================');
console.log('🎉 ALL NON-LINEAR QUEUE COMPLETION TESTS PASSED (100%)');
console.log('=============================================================');
