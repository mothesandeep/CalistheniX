/**
 * Test Phase Separation & Clean Data Layer for CalistheniX Workouts
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST: WORKOUT PHASE SEPARATION & DATA INTEGRITY ===\n');

// 1. Load workout.js definitions and test logic in headless environment
const workoutJsContent = fs.readFileSync(path.join(__dirname, '../frontend/js/views/workout.js'), 'utf-8');

// Mock browser globals
const mockGlobals = {
  window: { location: { hash: '' } },
  state: {
    exercises: [],
    workouts: [],
    todayResolved: null
  },
  getActiveSession: () => mockGlobals._activeSession,
  saveActiveSession: (s) => { mockGlobals._activeSession = s; },
  openWorkoutView: () => {},
  showToast: () => {},
  render: () => {},
  todayISO: () => '2026-08-28',
  newUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 9),
  getExercise: (id) => null,
  renderIcon: () => '',
  fmtSecs: (s) => `${s}s`,
  getSessionElapsedSec: () => 0
};

// Evaluate workout.js in context
const vm = require('vm');
const context = vm.createContext(mockGlobals);
vm.runInContext(workoutJsContent, context);

// Test 1: Canonical phase helpers
console.log('Test 1: Canonical phase normalizer & helper methods');
assert.strictEqual(context.canonicalPhase('warmup'), 'warm_up');
assert.strictEqual(context.canonicalPhase('warm_up'), 'warm_up');
assert.strictEqual(context.canonicalPhase('warm-up'), 'warm_up');
assert.strictEqual(context.canonicalPhase('prepare'), 'warm_up');
assert.strictEqual(context.canonicalPhase('main'), 'main_workout');
assert.strictEqual(context.canonicalPhase('main_workout'), 'main_workout');
assert.strictEqual(context.canonicalPhase('cooldown'), 'cool_down');
assert.strictEqual(context.canonicalPhase('cool_down'), 'cool_down');
assert.strictEqual(context.canonicalPhase('cool-down'), 'cool_down');
assert.strictEqual(context.isWarmupPhase('warmup'), true);
assert.strictEqual(context.isMainPhase('main'), true);
assert.strictEqual(context.isCooldownPhase('cooldown'), true);
console.log('  ✓ Canonical phase mappings are authoritative and consistent\n');

// Test 2: Starting PULL B and verifying zero phase contamination
console.log('Test 2: Starting PULL B and verifying zero phase contamination');
const pullBExercises = [
  { exercise_id: 101, exercise_name: 'Wrist Preparation', phase: 'warmup', duration_sec: 30 },
  { exercise_id: 102, exercise_name: 'Arm Circles', phase: 'warmup', duration_sec: 60 },
  { exercise_id: 103, exercise_name: 'Shoulder Mobility', phase: 'warmup', duration_sec: 30 },
  { exercise_id: 104, exercise_name: 'Scapular Activation', phase: 'warmup', reps: 10 },
  { exercise_id: 105, exercise_name: 'Light General Activation', phase: 'warmup', duration_sec: 60 },
  { exercise_id: 201, exercise_name: 'Pull-ups Close Grip', phase: 'main', sets: 4, reps: 6 },
  { exercise_id: 202, exercise_name: 'Commando Pull-ups', phase: 'main', sets: 3, reps: 8 },
  { exercise_id: 203, exercise_name: 'Face Pulls', phase: 'main', sets: 3, reps: 15 },
  { exercise_id: 204, exercise_name: 'Prone Y-raises', phase: 'main', sets: 3, reps: 15 },
  { exercise_id: 205, exercise_name: 'Wall Angels', phase: 'main', sets: 3, reps: 12 },
  { exercise_id: 206, exercise_name: 'L-sit Hang', phase: 'main', sets: 3, duration_sec: 20 },
  { exercise_id: 301, exercise_name: 'Lat Stretch', phase: 'cooldown', duration_sec: 60 },
  { exercise_id: 302, exercise_name: 'Cross-Body Shoulder Stretch', phase: 'cooldown', duration_sec: 60 },
  { exercise_id: 303, exercise_name: 'Child\'s Pose', phase: 'cooldown', duration_sec: 60 },
  { exercise_id: 304, exercise_name: 'Shoulder Stretch', phase: 'cooldown', duration_sec: 60 },
  { exercise_id: 305, exercise_name: 'Wrist/Forearm Stretch', phase: 'cooldown', duration_sec: 60 }
];

context.startWorkoutFromData('Pull B', pullBExercises, 4);
const session = context.getActiveSession();
assert.ok(session, 'Session must be created');

const warmups = context.getWarmupExercises(session);
const mains = context.getMainWorkoutExercises(session);
const cooldowns = context.getCooldownExercises(session);

console.log('  WARM-UP (', warmups.length, 'exercises ):', warmups.map(w => w.exercise_name));
console.log('  MAIN WORKOUT (', mains.length, 'exercises ):', mains.map(m => m.exercise_name));
console.log('  COOL-DOWN (', cooldowns.length, 'exercises ):', cooldowns.map(c => c.exercise_name));

assert.strictEqual(warmups.length, 5, 'Warmup should have 5 exercises');
assert.strictEqual(mains.length, 6, 'Main workout should have 6 exercises');
assert.strictEqual(cooldowns.length, 5, 'Cooldown should have 5 exercises');

// Check that Warm-up exercises NEVER appear in Main Workout
const warmupNames = warmups.map(w => w.exercise_name);
const mainNames = mains.map(m => m.exercise_name);
const cooldownNames = cooldowns.map(c => c.exercise_name);

warmupNames.forEach(name => {
  assert.strictEqual(mainNames.includes(name), false, `Warm-up exercise "${name}" must NOT appear in Main Workout`);
  assert.strictEqual(cooldownNames.includes(name), false, `Warm-up exercise "${name}" must NOT appear in Cool Down`);
});

cooldownNames.forEach(name => {
  assert.strictEqual(mainNames.includes(name), false, `Cool-down exercise "${name}" must NOT appear in Main Workout`);
});

console.log('  ✓ No Warm-Up or Cool-Down exercise appears inside Main Workout');

// Test 3: getWorkoutPhaseModel progress and metrics calculation
console.log('\nTest 3: Phase model and progress metrics for PULL B');
const model = context.getWorkoutPhaseModel(session);

console.log('  Warmup model:', model.warmUp.totalCount, 'exercises,', model.warmUp.completedCount, 'completed');
console.log('  Main model:', model.mainWorkout.totalSets, 'sets across', model.mainWorkout.totalCount, 'exercises');
console.log('  Cooldown model:', model.coolDown.totalCount, 'exercises,', model.coolDown.completedCount, 'completed');
console.log('  Overall model:', model.overall.completedSets, '/', model.overall.totalSets, 'sets (', model.overall.progressPct, '% )');

assert.strictEqual(model.warmUp.totalCount, 5);
assert.strictEqual(model.mainWorkout.totalCount, 6);
assert.strictEqual(model.mainWorkout.totalSets, 19); // 4 + 3 + 3 + 3 + 3 + 3 = 19 sets
assert.strictEqual(model.coolDown.totalCount, 5);
assert.strictEqual(model.overall.totalSets, 5 + 19 + 5); // 29 items/sets

// Completing warmups should NOT increase main workout completed sets
session.warmup.forEach(w => { w.completed = true; });
const modelAfterWarmup = context.getWorkoutPhaseModel(session);
assert.strictEqual(modelAfterWarmup.warmUp.completedCount, 5);
assert.strictEqual(modelAfterWarmup.warmUp.isCompleted, true);
assert.strictEqual(modelAfterWarmup.mainWorkout.completedSets, 0, 'Main workout completed sets must remain 0');

console.log('  ✓ Completing Warm-Up does not pollute or advance Main Workout sets');

console.log('\n=== ALL PHASE SEPARATION & DATA INTEGRITY TESTS PASSED! ===');
