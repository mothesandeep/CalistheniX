/**
 * CalistheniX — Exercise Navigation Test Suite
 * Tests bidirectional Exercise Navigation (Previous / Next) across Warm-Up, Train, and Cool Down:
 * 1. Warm-Up intra-phase navigation & disabled Previous on first movement
 * 2. Cross-phase transition: Last Warm-up movement -> First Train exercise
 * 3. Train intra-phase navigation & set progression / state preservation
 * 4. Cross-phase transition: First Train exercise -> Last Warm-up movement
 * 5. Cross-phase transition: Last Train exercise -> First Cool Down stretch
 * 6. Cool Down intra-phase navigation
 * 7. Cross-phase transition: First Cool Down stretch -> Last Train exercise
 * 8. Terminal transition: Last Cool Down stretch -> Workout session completion
 * 9. UI validation: Buttons rendered below primary CTA with correct text and disabled attributes
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING BIDIRECTIONAL EXERCISE NAVIGATION TEST SUITE');
console.log('=============================================================\n');

const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const runnerCode = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

function createTestSandbox() {
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

  const sandbox = {
    console,
    localStorage: localStorageMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        id: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
        remove: () => {}
      }),
      body: { appendChild: () => {}, querySelector: () => null }
    },
    window: { location: { hash: '' }, addEventListener: () => {}, removeEventListener: () => {} },
    location: { hash: '' },
    render: () => {},
    renderIcon: (name, cls) => `<svg class="${cls || ''}"></svg>`,
    fmtSecs: (s) => `${s}s`,
    cueSetComplete: () => {},
    cueExerciseComplete: () => {},
    cueTimerComplete: () => {},
    checkAndCelebratePR: () => {},
    setCurrentMovementPattern: () => {},
    showToast: (msg) => { sandbox._lastToast = msg; },
    state: {
      exercises: [
        { id: 1, name: 'Handstand Push-ups', movement_pattern: 'push' },
        { id: 2, name: 'Weighted Dips', movement_pattern: 'push' }
      ],
      workouts: [],
      todayResolved: null,
      activeSession: null
    }
  };

  vm.createContext(sandbox);
  sandbox.window = sandbox;
  vm.runInContext(constantsCode, sandbox);
  vm.runInContext(utilsCode, sandbox);
  vm.runInContext(audioCode, sandbox);
  vm.runInContext(storageCode, sandbox);
  vm.runInContext(stateCode, sandbox);
  vm.runInContext(runnerCode, sandbox);

  return sandbox;
}

function createSampleWorkoutSession() {
  return {
    id: 'test-nav-session-1',
    workout_id: 101,
    routine: 'PUSH & CORE ADVANCED',
    status: 'in_progress',
    startTime: Date.now() - 30000,
    startedAt: Date.now() - 30000,
    currentPhase: 'warmup',
    phase: 'WARMUP',
    phaseState: 'ACTIVE',
    warmupStatus: 'ACTIVE',
    warmup_status: 'in_progress',
    warmupIndex: 0,
    warmup_idx: 0,
    mainStatus: 'IDLE',
    cooldownStatus: 'IDLE',
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    warmup: [
      { id: 'w1', exercise_name: 'Arm Circles', duration_sec: 30, completed: false, skipped: false },
      { id: 'w2', exercise_name: 'Wrist Mobility', duration_sec: 30, completed: false, skipped: false },
      { id: 'w3', exercise_name: 'Cat Cow', duration_sec: 30, completed: false, skipped: false }
    ],
    exercises: [
      {
        id: 'e1',
        exercise_id: 1,
        exercise_name: 'Handstand Push-ups',
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
        id: 'e2',
        exercise_id: 2,
        exercise_name: 'Weighted Dips',
        exercise_type: 'reps',
        rest_sec: 90,
        completed: false,
        skipped: false,
        sets: [
          { set_num: 1, target_val: 10, actual_val: 10, completed: false, skipped: false },
          { set_num: 2, target_val: 10, actual_val: 10, completed: false, skipped: false }
        ]
      }
    ],
    cooldown: [
      { id: 'c1', exercise_name: 'Chest Stretch', duration_sec: 30, completed: false, skipped: false },
      { id: 'c2', exercise_name: 'Wrist Flexor Stretch', duration_sec: 30, completed: false, skipped: false }
    ]
  };
}

// ─── TEST 1: Warm-Up Intra-Phase Navigation & Initial Boundary ───────────────
console.log('--- Test 1: Warm-Up Intra-Phase Navigation & Initial Boundary ---');
{
  const sb = createTestSandbox();
  const initial = createSampleWorkoutSession();
  sb.saveActiveSession(initial);

  let sess = sb.getActiveSession();
  assert.strictEqual(sess.warmupIndex, 0, 'Starts at Warm-Up movement 0');
  assert.strictEqual(sb.canNavigateToPreviousExercise(sess), false, 'Previous is disabled on movement 0');
  assert.strictEqual(sb.canNavigateToNextExercise(sess), true, 'Next is available on movement 0');

  // Navigate to Warm-Up movement 1
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.warmupIndex, 1, 'Advanced to Warm-Up movement 1');
  assert.strictEqual(sb.canNavigateToPreviousExercise(sess), true, 'Previous is now enabled on movement 1');
  assert.strictEqual(sb.canNavigateToNextExercise(sess), true, 'Next is enabled on movement 1');

  // Navigate back to movement 0
  sb.navigateToPreviousExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.warmupIndex, 0, 'Navigated back to Warm-Up movement 0');
  assert.strictEqual(sb.canNavigateToPreviousExercise(sess), false, 'Previous disabled again on movement 0');

  // Advance to last movement (movement 2: Cat Cow)
  sb.navigateToNextExercise();
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.warmupIndex, 2, 'On last Warm-Up movement (index 2)');
  assert.strictEqual(sb.canNavigateToNextExercise(sess), true, 'Next is available to enter Train phase');
  console.log('  ✓ Test 1 PASSED: Warm-Up intra-phase navigation and start boundary verified.');
}

// ─── TEST 2: Cross-Phase Warm-Up -> Train -> Warm-Up ─────────────────────────
console.log('\n--- Test 2: Cross-Phase Navigation between Warm-Up and Train ---');
{
  const sb = createTestSandbox();
  const initial = createSampleWorkoutSession();
  initial.warmupIndex = 2; // last warmup movement
  initial.warmup_idx = 2;
  sb.saveActiveSession(initial);

  // Press Next on last Warm-Up movement
  sb.navigateToNextExercise();
  let sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'main', 'Transitioned to main Train phase');
  assert.strictEqual(sess.phase, 'MAIN_WORKOUT', 'Phase updated to MAIN_WORKOUT');
  assert.strictEqual(sess.activeExerciseIndex, 0, 'On Train Exercise 0 (Handstand Push-ups)');
  assert.strictEqual(sb.canNavigateToPreviousExercise(sess), true, 'Previous is available on Train Exercise 0');

  // Press Previous on first Train exercise
  sb.navigateToPreviousExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'warmup', 'Navigated back to Warm-Up phase');
  assert.strictEqual(sess.warmupIndex, 2, 'Landed on last Warm-Up movement (index 2)');

  // Advance forward to Train again
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'main', 'Returned to Train phase');
  assert.strictEqual(sess.activeExerciseIndex, 0, 'On Train Exercise 0');
  console.log('  ✓ Test 2 PASSED: Cross-phase navigation between Warm-Up and Train verified.');
}

// ─── TEST 3: Train Intra-Phase Navigation & Set State Preservation ───────────
console.log('\n--- Test 3: Train Intra-Phase Navigation & Set State Preservation ---');
{
  const sb = createTestSandbox();
  const initial = createSampleWorkoutSession();
  initial.warmupStatus = 'COMPLETED';
  initial.warmup_status = 'completed';
  initial.currentPhase = 'main';
  initial.phase = 'MAIN_WORKOUT';
  initial.phaseState = 'ACTIVE';
  initial.mainStatus = 'ACTIVE';
  initial.activeExerciseIndex = 0;
  initial.activeSetIndex = 0;
  sb.saveActiveSession(initial);

  // Complete Set 1 on Exercise 0 with custom reps
  sb.adjustCurrentSetReps(2); // 6 + 2 = 8 reps
  sb.completeMainWorkoutSet();

  let sess = sb.getActiveSession();
  assert.strictEqual(sess.exercises[0].sets[0].completed, true, 'Exercise 0 Set 1 completed');
  assert.strictEqual(sess.exercises[0].sets[0].actual_val, 8, 'Exercise 0 Set 1 actual_val is 8');
  assert.strictEqual(sess.exercises[0].sets[0].target_val, 6, 'Exercise 0 Set 1 target_val is preserved as 6');

  // Navigate to Exercise 1
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.activeExerciseIndex, 1, 'Active exercise is Exercise 1 (Weighted Dips)');
  assert.strictEqual(sess.exercises[1].sets[0].completed, false, 'Exercise 1 Set 1 is pending');

  // Navigate back to Exercise 0
  sb.navigateToPreviousExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.activeExerciseIndex, 0, 'Navigated back to Exercise 0');

  // Verify Set 1 was preserved without modification
  const set1 = sess.exercises[0].sets[0];
  const set2 = sess.exercises[0].sets[1];
  assert.strictEqual(set1.completed, true, 'Set 1 is still marked completed');
  assert.strictEqual(set1.actual_val, 8, 'Set 1 actual_val is still 8');
  assert.strictEqual(set1.target_val, 6, 'Set 1 target_val is still 6');
  assert.strictEqual(set2.completed, false, 'Set 2 is still pending');
  assert.strictEqual(sess.activeSetIndex, 1, 'Active set pointer focused on first unresolved set (Set 2)');

  console.log('  ✓ Test 3 PASSED: Train intra-phase navigation preserves existing set data.');
}

// ─── TEST 4: Cross-Phase Train -> Cool Down -> Train ─────────────────────────
console.log('\n--- Test 4: Cross-Phase Navigation between Train and Cool Down ---');
{
  const sb = createTestSandbox();
  const initial = createSampleWorkoutSession();
  initial.warmupStatus = 'COMPLETED';
  initial.warmup_status = 'completed';
  initial.currentPhase = 'main';
  initial.phase = 'MAIN_WORKOUT';
  initial.phaseState = 'ACTIVE';
  initial.mainStatus = 'ACTIVE';
  initial.activeExerciseIndex = 1; // last train exercise (Weighted Dips)
  sb.saveActiveSession(initial);

  // Press Next on last Train exercise
  sb.navigateToNextExercise();
  let sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'cooldown', 'Entered Cool Down phase');
  assert.strictEqual(sess.phase, 'COOLDOWN', 'Phase updated to COOLDOWN');
  assert.strictEqual(sess.cooldownIndex, 0, 'On first Cool Down stretch (index 0)');

  // Press Previous on first Cool Down stretch
  sb.navigateToPreviousExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'main', 'Navigated back to Train phase');
  assert.strictEqual(sess.activeExerciseIndex, 1, 'Landed on last Train exercise (index 1)');

  // Advance back to Cool Down
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.currentPhase, 'cooldown', 'Returned to Cool Down phase');
  assert.strictEqual(sess.cooldownIndex, 0, 'On Cool Down stretch 0');
  console.log('  ✓ Test 4 PASSED: Cross-phase navigation between Train and Cool Down verified.');
}

// ─── TEST 5: Cool Down Intra-Phase & Terminal Workout Complete Transition ────
console.log('\n--- Test 5: Cool Down Intra-Phase & Session Completion ---');
{
  const sb = createTestSandbox();
  const initial = createSampleWorkoutSession();
  initial.warmupStatus = 'COMPLETED';
  initial.warmup_status = 'completed';
  initial.mainStatus = 'COMPLETED';
  initial.currentPhase = 'cooldown';
  initial.phase = 'COOLDOWN';
  initial.phaseState = 'ACTIVE';
  initial.cooldownStatus = 'ACTIVE';
  initial.cooldownIndex = 0;
  sb.saveActiveSession(initial);

  // Advance to stretch 1 (last stretch: Wrist Flexor Stretch)
  sb.navigateToNextExercise();
  let sess = sb.getActiveSession();
  assert.strictEqual(sess.cooldownIndex, 1, 'On Cool Down stretch 1');

  // Previous returns to stretch 0
  sb.navigateToPreviousExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.cooldownIndex, 0, 'Returned to stretch 0');

  // Forward to stretch 1
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.cooldownIndex, 1, 'On stretch 1 (last cool-down movement)');

  // Press Next on last Cool Down stretch -> leads to session completion
  sb.navigateToNextExercise();
  sess = sb.getActiveSession();
  assert.strictEqual(sess.phase, 'COMPLETED', 'Session reached COMPLETED phase');
  assert.strictEqual(sess.status, 'completed', 'Session status set to completed');
  console.log('  ✓ Test 5 PASSED: Cool Down intra-phase navigation and session completion verified.');
}

// ─── TEST 6: UI Rendering of Previous & Next Exercise Buttons ────────────────
console.log('\n--- Test 6: UI Rendering of Previous & Next Exercise Controls ---');
{
  const sb = createTestSandbox();
  const session = createSampleWorkoutSession();
  sb.saveActiveSession(session);

  // 1. Warm-Up Card UI
  const warmupHtml = sb.renderWarmupCardView(session);
  assert(warmupHtml.includes('← Previous Exercise'), 'Warm-Up card renders "← Previous Exercise"');
  assert(warmupHtml.includes('Next Exercise →'), 'Warm-Up card renders "Next Exercise →"');
  assert(warmupHtml.includes('runner-exercise-nav-row'), 'Warm-Up card includes .runner-exercise-nav-row');
  assert(warmupHtml.includes('disabled'), 'Previous button is disabled on first Warm-Up movement');

  // 2. Train Card UI
  session.currentPhase = 'main';
  session.phase = 'MAIN_WORKOUT';
  session.mainStatus = 'ACTIVE';
  session.activeExerciseIndex = 0;
  const mainHtml = sb.renderMainWorkoutCardView(session);
  assert(mainHtml.includes('← Previous Exercise'), 'Train card renders "← Previous Exercise"');
  assert(mainHtml.includes('Next Exercise →'), 'Train card renders "Next Exercise →"');
  assert(mainHtml.includes('runner-exercise-nav-row'), 'Train card includes .runner-exercise-nav-row');

  // 3. Cool Down Card UI
  session.currentPhase = 'cooldown';
  session.phase = 'COOLDOWN';
  session.cooldownStatus = 'ACTIVE';
  session.cooldownIndex = 0;
  const cooldownHtml = sb.renderCooldownCardView(session);
  assert(cooldownHtml.includes('← Previous Exercise'), 'Cool Down card renders "← Previous Exercise"');
  assert(cooldownHtml.includes('Next Exercise →'), 'Cool Down card renders "Next Exercise →"');
  assert(cooldownHtml.includes('runner-exercise-nav-row'), 'Cool Down card includes .runner-exercise-nav-row');

  console.log('  ✓ Test 6 PASSED: Previous and Next Exercise controls properly rendered in all 3 phases.');
}

console.log('\n=============================================================');
console.log('🎉 ALL BIDIRECTIONAL EXERCISE NAVIGATION TESTS PASSED 100%!');
console.log('=============================================================');
if (typeof createTestSandbox().cleanupAllWorkoutTimers === 'function') {
  createTestSandbox().cleanupAllWorkoutTimers();
}
process.exit(0);

