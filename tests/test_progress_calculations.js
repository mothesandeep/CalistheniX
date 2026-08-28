/**
 * Test Progress Calculations & Phase Isolation
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('=== TEST: DYNAMIC PROGRESS CALCULATIONS & PHASE ISOLATION ===\n');

// 1. Fetch real PULL B workout from tracker.db
const pyCmd = `
import sqlite3, json
conn = sqlite3.connect('backend/tracker.db')
conn.row_factory = sqlite3.Row
rows = conn.execute('''
  SELECT w.id as workout_id, w.name as workout_name,
         we.id as we_id, we.order_index, we.phase,
         e.id as exercise_id, e.name as exercise_name, e.type as exercise_type,
         we.sets, we.reps, we.duration_sec, we.rest_sec, we.notes
  FROM workouts w
  JOIN workout_exercises we ON we.workout_id = w.id
  JOIN exercises e ON e.id = we.exercise_id
  WHERE w.name = 'Pull B'
  ORDER BY we.order_index ASC
''').fetchall()
print(json.dumps([dict(r) for r in rows]))
`;

const rows = JSON.parse(execSync(`python3 -c "${pyCmd.replace(/"/g, '\\"')}"`, { cwd: path.join(__dirname, '..') }).toString());

// Load state.js & workout.js
const stateJsContent = fs.readFileSync(path.join(__dirname, '../frontend/js/state.js'), 'utf-8');
const workoutJsContent = fs.readFileSync(path.join(__dirname, '../frontend/js/views/workout.js'), 'utf-8');

let activeSessionState = null;

const mockGlobals = {
  window: {
    location: { hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: {
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
  },
  state: {
    exercises: [],
    workouts: [],
    todayResolved: null
  },
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  getActiveSession: () => activeSessionState,
  saveActiveSession: (s) => { activeSessionState = s; },
  openWorkoutView: () => {},
  showToast: () => {},
  render: () => {},
  todayISO: () => '2026-08-28',
  newUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 9),
  getExercise: (id) => null,
  renderIcon: (name) => `<icon:${name}>`,
  fmtSecs: (s) => `${s}s`,
  getSessionElapsedSec: () => 0
};

const vm = require('vm');
const context = vm.createContext(mockGlobals);
vm.runInContext(stateJsContent, context);
vm.runInContext(workoutJsContent, context);

// Initialize Session
context.startWorkoutFromData('Pull B', rows, 4);

// Initial State Progress Check
let model = context.getWorkoutPhaseModel(context.getActiveSession());

console.log('1. Checking Initial Progress Values:');
console.log('   Warm-Up:', model.warmUp.progressLabel);
console.log('   Main Workout:', model.mainWorkout.progressLabel);
console.log('   Cool Down:', model.coolDown.progressLabel);
console.log('   Overall:', `${model.overall.completedSets} / ${model.overall.totalSets} sets (${model.overall.progressPct}%)`);

assert.strictEqual(model.warmUp.totalCount, 5);
assert.strictEqual(model.warmUp.completedCount, 0);
assert.strictEqual(model.warmUp.progressLabel, '0 / 5 completed');

assert.strictEqual(model.mainWorkout.totalCount, 6);
assert.strictEqual(model.mainWorkout.totalSets, 19);
assert.strictEqual(model.mainWorkout.completedSets, 0);
assert.strictEqual(model.mainWorkout.progressLabel, '0 / 19 sets');

assert.strictEqual(model.coolDown.totalCount, 5);
assert.strictEqual(model.coolDown.completedCount, 0);
assert.strictEqual(model.coolDown.progressLabel, '0 / 5 completed');

console.log('   ✓ Initial progress labels match exact real exercise data counts\n');

// 2. Complete 2 Warm-Up exercises
console.log('2. Completing 2 Warm-Up exercises:');
context.toggleWarmupItemComplete(0);
context.toggleWarmupItemComplete(1);

model = context.getWorkoutPhaseModel(context.getActiveSession());
console.log('   Warm-Up:', model.warmUp.progressLabel, `(${model.warmUp.progress}%)`);
console.log('   Main Workout:', model.mainWorkout.progressLabel);
console.log('   Cool Down:', model.coolDown.progressLabel);

assert.strictEqual(model.warmUp.completedCount, 2);
assert.strictEqual(model.warmUp.progressLabel, '2 / 5 completed');
assert.strictEqual(model.warmUp.progress, 40);

// CRITICAL INVARIANT: Warm-Up completion MUST NOT increase Main Workout progress
assert.strictEqual(model.mainWorkout.completedSets, 0, 'Main Workout completed sets MUST remain 0');
assert.strictEqual(model.mainWorkout.progress, 0, 'Main Workout progress percentage MUST remain 0%');
assert.strictEqual(model.mainWorkout.progressLabel, '0 / 19 sets');
console.log('   ✓ Completing Warm-Up does NOT increase Main Workout progress\n');

// 3. Complete 3 Main Workout sets
console.log('3. Completing 3 Main Workout sets:');
context.toggleWorkoutSet(0, 0);
context.toggleWorkoutSet(0, 1);
context.toggleWorkoutSet(0, 2);

model = context.getWorkoutPhaseModel(context.getActiveSession());
console.log('   Warm-Up:', model.warmUp.progressLabel);
console.log('   Main Workout:', model.mainWorkout.progressLabel, `(${model.mainWorkout.progress}%)`);
console.log('   Cool Down:', model.coolDown.progressLabel);

assert.strictEqual(model.mainWorkout.completedSets, 3);
assert.strictEqual(model.mainWorkout.progressLabel, '3 / 19 sets');
assert.strictEqual(model.mainWorkout.progress, Math.round((3 / 19) * 100)); // 16%

// Warm-Up and Cool Down must not be mutated by Main Workout sets
assert.strictEqual(model.warmUp.completedCount, 2);
assert.strictEqual(model.coolDown.completedCount, 0);
console.log('   ✓ Main Workout set completion is isolated from Warm-Up and Cool Down\n');

// 4. Complete 1 Cool-Down stretch
console.log('4. Completing 1 Cool-Down stretch:');
context.toggleCooldownItemComplete(0);

model = context.getWorkoutPhaseModel(context.getActiveSession());
console.log('   Warm-Up:', model.warmUp.progressLabel);
console.log('   Main Workout:', model.mainWorkout.progressLabel);
console.log('   Cool Down:', model.coolDown.progressLabel, `(${model.coolDown.progress}%)`);

assert.strictEqual(model.coolDown.completedCount, 1);
assert.strictEqual(model.coolDown.progressLabel, '1 / 5 completed');
assert.strictEqual(model.coolDown.progress, 20);
assert.strictEqual(model.mainWorkout.completedSets, 3, 'Main Workout completed sets MUST remain 3');
console.log('   ✓ Cool-Down stretch completion is isolated from Main Workout\n');

console.log('=== ALL DYNAMIC PROGRESS CALCULATION TESTS PASSED! ✅ ===\n');
