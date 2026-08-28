/**
 * Comprehensive Verification of Main Workout Screen, Sets/Reps/Weight/RPE, & Tab Switching
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('=== TEST: MAIN WORKOUT SCREEN & 3-PHASE ISOLATION VERIFICATION ===\n');

// 1. Fetch real PULL B workout from tracker.db via python
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
console.log(`Loaded ${rows.length} exercises from database for Pull B.`);

  // 2. Load state.js & workout.js
  const stateJsContent = fs.readFileSync(path.join(__dirname, '../frontend/js/state.js'), 'utf-8');
  const workoutJsContent = fs.readFileSync(path.join(__dirname, '../frontend/js/views/workout.js'), 'utf-8');

  let activeSessionState = null;
  let renderCallCount = 0;

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
    _workoutRestState: { active: false, remaining: 0, total: 0, nextInfo: '' },
    _workoutHoldState: { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 },
    _selectedWorkoutExIdx: 0,
    getActiveSession: () => activeSessionState,
    saveActiveSession: (s) => { activeSessionState = s; },
    openWorkoutView: () => {},
    showToast: () => {},
    render: () => { renderCallCount++; },
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

  // Initialize PULL B Session
  context.startWorkoutFromData('Pull B', rows, 4);
  const session = context.getActiveSession();
  assert.ok(session, 'Active session must be initialized');

  // Verify Segmented Data Sources
  const warmupExercises = context.getWarmupExercises(session);
  const mainExercises = context.getMainWorkoutExercises(session);
  const cooldownExercises = context.getCooldownExercises(session);

  console.log('\n--- 1. VERIFYING STRICT PHASE ARRAYS ---');
  console.log(`  Warm-Up (${warmupExercises.length}):`, warmupExercises.map(e => e.exercise_name));
  console.log(`  Main Workout (${mainExercises.length}):`, mainExercises.map(e => e.exercise_name));
  console.log(`  Cool Down (${cooldownExercises.length}):`, cooldownExercises.map(e => e.exercise_name));

  assert.strictEqual(warmupExercises.length, 5, 'Warmup must have exactly 5 exercises');
  assert.strictEqual(mainExercises.length, 6, 'Main Workout must have exactly 6 exercises');
  assert.strictEqual(cooldownExercises.length, 5, 'Cool Down must have exactly 5 exercises');

  const expectedWarmup = ['Wrist Preparation', 'Arm Circles', 'Shoulder Mobility', 'Scapular Activation', 'Light General Activation'];
  const expectedMain = ['Pull-ups Close Grip', 'Commando Pull-ups', 'Face Pulls', 'Prone Y-raises', 'Wall Angels', 'L-sit Hang'];
  const expectedCooldown = ['Lat Stretch', 'Cross-Body Shoulder Stretch', 'Child\'s Pose', 'Shoulder Stretch', 'Wrist/Forearm Stretch'];

  assert.deepStrictEqual(JSON.parse(JSON.stringify(warmupExercises.map(e => e.exercise_name))), expectedWarmup);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(mainExercises.map(e => e.exercise_name))), expectedMain);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cooldownExercises.map(e => e.exercise_name))), expectedCooldown);
  console.log('  ✓ Database phase arrays contain exact required movements');

  // --- 2. VERIFYING TAB SWITCHING AND RENDERED CONTENT ---
  console.log('\n--- 2. VERIFYING TAB SWITCHING & WORKSPACE ISOLATION ---');

  // A. Warm-Up Tab
  context.setWorkoutPhase('warmup');
  assert.strictEqual(context.getActiveSession().currentPhase, 'warmup');
  const warmupHtml = context.renderWorkoutPhaseWorkspace(context.getActiveSession(), 'warmup');
  
  expectedWarmup.forEach(name => {
    assert.ok(warmupHtml.includes(name), `Warm-Up workspace MUST include "${name}"`);
  });
  expectedMain.forEach(name => {
    assert.ok(!warmupHtml.includes(name), `Warm-Up workspace MUST NOT include main exercise "${name}"`);
  });
  expectedCooldown.forEach(name => {
    assert.ok(!warmupHtml.includes(name), `Warm-Up workspace MUST NOT include cool-down stretch "${name}"`);
  });
  console.log('  ✓ Warm-Up workspace renders ONLY warm-up exercises');

  // B. Main Workout Tab
  context.setWorkoutPhase('main');
  assert.strictEqual(context.getActiveSession().currentPhase, 'main');
  const mainHtml = context.renderWorkoutPhaseWorkspace(context.getActiveSession(), 'main');

  expectedMain.forEach(name => {
    assert.ok(mainHtml.includes(name), `Main Workout workspace MUST include "${name}"`);
  });
  expectedWarmup.forEach(name => {
    assert.ok(!mainHtml.includes(name), `Main Workout workspace MUST NOT include warm-up exercise "${name}"`);
  });
  expectedCooldown.forEach(name => {
    assert.ok(!mainHtml.includes(name), `Main Workout workspace MUST NOT include cool-down stretch "${name}"`);
  });
  console.log('  ✓ Main Workout workspace renders ONLY main strength/skill exercises');

  // C. Cool Down Tab
  context.setWorkoutPhase('cooldown');
  assert.strictEqual(context.getActiveSession().currentPhase, 'cooldown');
  const cooldownHtml = context.renderWorkoutPhaseWorkspace(context.getActiveSession(), 'cooldown');

  expectedCooldown.forEach(name => {
    assert.ok(cooldownHtml.includes(name), `Cool Down workspace MUST include "${name}"`);
  });
  expectedWarmup.forEach(name => {
    assert.ok(!cooldownHtml.includes(name), `Cool Down workspace MUST NOT include warm-up exercise "${name}"`);
  });
  expectedMain.forEach(name => {
    assert.ok(!cooldownHtml.includes(name), `Cool Down workspace MUST NOT include main exercise "${name}"`);
  });
  console.log('  ✓ Cool Down workspace renders ONLY cool-down exercises');

  // --- 3. VERIFYING MAIN WORKOUT CORE FUNCTIONALITY (Sets, Reps, Weight, RPE, Logging) ---
  console.log('\n--- 3. VERIFYING MAIN WORKOUT SETS, REPS, WEIGHT, RPE, REST ---');
  context.setWorkoutPhase('main');

  // Check Pull-ups Close Grip (4 sets)
  const pullUpEx = mainExercises[0];
  assert.strictEqual(pullUpEx.exercise_name, 'Pull-ups Close Grip');
  assert.strictEqual(pullUpEx.sets.length, 4);
  assert.strictEqual(pullUpEx.sets[0].target_val, 6);

  // 1. Adjust reps
  context.adjustWorkoutSetActual(0, 0, 2); // 6 + 2 = 8 reps
  assert.strictEqual(context.getActiveSession().exercises[0].sets[0].actual_val, 8, 'Set 1 actual reps should be adjusted to 8');

  // 2. Adjust Weight
  context.updateWorkoutSetWeight(0, 0, '12.5');
  assert.strictEqual(context.getActiveSession().exercises[0].sets[0].weight_kg, 12.5, 'Set 1 weight should be 12.5kg');

  // 3. Set RPE
  context.updateWorkoutSetRPE(0, 0, '8');
  assert.strictEqual(context.getActiveSession().exercises[0].sets[0].rpe, 8, 'Set 1 RPE should be 8');

  // 4. Toggle Set Complete
  context.toggleWorkoutSet(0, 0);
  assert.strictEqual(context.getActiveSession().exercises[0].sets[0].completed, true, 'Set 1 should be marked completed');

  // 5. Check Rest Timer Triggered
  assert.strictEqual(context.window.getWorkoutRestState().active, true, 'Rest timer should be triggered on set completion');
  console.log('  ✓ Sets, Reps adjustment, Weight, RPE, and Rest timer work seamlessly');

  // 6. Check Isometric Hold (L-sit Hang)
  const lsitExIdx = 5;
  const lsitEx = mainExercises[lsitExIdx];
  assert.strictEqual(lsitEx.exercise_name, 'L-sit Hang');
  assert.strictEqual(lsitEx.exercise_type, 'duration');
  assert.strictEqual(lsitEx.sets[0].target_val, 20);

  // Start hold
  context.startWorkoutHold(lsitExIdx, 0);
  assert.strictEqual(context.window.getWorkoutHoldState().exIdx, lsitExIdx);
  assert.strictEqual(context.window.getWorkoutHoldState().setIdx, 0);
  context.stopWorkoutHold(true); // Complete hold
  assert.strictEqual(context.getActiveSession().exercises[lsitExIdx].sets[0].completed, true, 'L-sit Hold Set 1 should be marked completed');
  console.log('  ✓ Isometric hold countdown and logging functional');

  console.log('\n=== ALL MAIN WORKOUT & 3-PHASE ISOLATION TESTS PASSED! ✅ ===\n');
