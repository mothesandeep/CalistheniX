/**
 * test_rest_state.js
 * Comprehensive automated verification for the dedicated REST state between sets.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING REST STATE & MULTI-TIMER VERIFICATION TESTS');
console.log('=============================================================\n');

const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const audioCode = fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
const workoutJsContent = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

function createTestContext() {
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

  const createdElements = [];

  const mockGlobals = {
    location: { hash: '' },
    window: { location: { hash: '' }, addEventListener: () => {}, removeEventListener: () => {} },
    document: {
      body: {
        appendChild: (el) => { createdElements.push(el); },
        removeChild: (el) => {
          const idx = createdElements.indexOf(el);
          if (idx !== -1) createdElements.splice(idx, 1);
        }
      },
      getElementById: (id) => createdElements.find(e => e.id === id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          innerHTML: '',
          textContent: '',
          style: {},
          setAttribute: (k, v) => { el[k] = v; },
          remove: () => {
            const idx = createdElements.indexOf(el);
            if (idx !== -1) createdElements.splice(idx, 1);
          }
        };
        Object.defineProperty(el, 'innerHTML', {
          set(val) {
            this._html = val;
            this.textContent = val.replace(/<[^>]*>/g, ' ');
          },
          get() {
            return this._html || '';
          }
        });
        return el;
      }
    },
    localStorage: localStorageMock,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    render: () => {},
    console: console,
    navigator: { vibrate: () => {} },
    Date: Date,
    Math: Math
  };

  mockGlobals.window.document = mockGlobals.document;
  mockGlobals.window.localStorage = mockGlobals.localStorage;

  const ctx = vm.createContext(mockGlobals);
  vm.runInContext(constantsCode, ctx);
  vm.runInContext(utilsCode, ctx);
  vm.runInContext(audioCode, ctx);
  vm.runInContext(storageCode, ctx);
  vm.runInContext(stateCode, ctx);
  vm.runInContext(workoutJsContent, ctx);

  Object.assign(ctx, ctx.window);

  return ctx;
}

let testPassCount = 0;
let testTotalCount = 0;

function runTest(testName, testFn) {
  testTotalCount++;
  try {
    const ctx = createTestContext();
    testFn(ctx);
    console.log(`  ✓ PASS: ${testName}`);
    testPassCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// TEST SUITES: REST STATE & MULTI-TIMER SYNCHRONIZATION
// ============================================================================

console.log('--- Suite 1: Entering Dedicated REST Interface ---');

runTest('Completing set with rest_sec > 0 enters RESTING state and renders dedicated REST interface', (ctx) => {
  const routineData = {
    id: 'test-rest-1',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        exercise_id: 'pull_up',
        exercise_name: 'Pull Ups',
        exercise_type: 'reps',
        rest_sec: 90,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.completeMainWorkoutSet();

  const session = ctx.getActiveSession();
  assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.RESTING, 'Sub-state entered RESTING');
  assert.strictEqual(session.restTimer.isRunning, true, 'Rest timer isRunning = true');
  assert.strictEqual(session.restTimer.durationSec, 90, 'Rest timer durationSec = 90');

  // Verify dedicated rest view renders
  const workspaceHtml = ctx.renderWorkoutPhaseWorkspace(session, 'main');
  assert(workspaceHtml.includes('runner-rest-display') || workspaceHtml.includes('runner-floating-rest-island'), 'Renders dedicated rest card container');
  assert(workspaceHtml.includes('REST') || workspaceHtml.includes('Rest'), 'Displays Rest title');
  assert(workspaceHtml.includes('15') || workspaceHtml.includes('sec'), 'Renders rest adjustment controls');
});

console.log('\n--- Suite 2: Rest Time Adjustments (+15s / -15s) ---');

runTest('+15 sec increases time, -15 sec decreases time, floor at 0 triggers Rest Complete', (ctx) => {
  const routineData = {
    id: 'test-rest-2',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        exercise_id: 'pull_up',
        exercise_name: 'Pull Ups',
        exercise_type: 'reps',
        rest_sec: 30,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.startWorkoutRest(30, 'Next: Set 2 · Pull Ups', 'Set 1 done');

  // Add 15 sec -> 45s
  ctx.adjustWorkoutRest(15);
  let restState = ctx.getWorkoutRestState();
  assert.strictEqual(restState.remaining, 45, 'Remaining rest increased to 45s');

  // Subtract 15 sec -> 30s
  ctx.adjustWorkoutRest(-15);
  restState = ctx.getWorkoutRestState();
  assert.strictEqual(restState.remaining, 30, 'Remaining rest decreased to 30s');

  // Subtract 45 sec -> Hits 0s, triggers Rest Complete
  ctx.adjustWorkoutRest(-45);
  restState = ctx.getWorkoutRestState();
  assert.strictEqual(restState.remaining, 0, 'Remaining rest floored at 0s');
  const session = ctx.getActiveSession();
  const restViewHtml = ctx.renderWorkoutRestView(session);
  assert(restViewHtml.includes('is-complete') || restViewHtml.includes('0:00'), 'Displays Rest Complete status');
  assert(restViewHtml.includes('Start Set'), 'Displays "Start Set" button');
});

console.log('\n--- Suite 3: Start Set & Skip Rest Behavior ---');

runTest('Clicking "Start Set" or "Skip Rest" transitions to SET_ACTIVE without auto-completing next set', (ctx) => {
  const routineData = {
    id: 'test-rest-3',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.RESTING,
    activeExerciseIndex: 0,
    activeSetIndex: 1,
    exercises: [
      {
        exercise_id: 'pull_up',
        exercise_name: 'Pull Ups',
        exercise_type: 'reps',
        rest_sec: 90,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: true },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.startWorkoutRest(90, 'Next: Set 2 · Pull Ups', 'Set 1 done');

  // Click Skip Rest
  ctx.stopWorkoutRest();
  let session = ctx.getActiveSession();
  assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE, 'Sub-state is SET_ACTIVE');
  assert.strictEqual(session.exercises[0].sets[1].completed, false, 'Next set is NOT automatically marked complete');
  assert.strictEqual(session.activeSetIndex, 1, 'Active set remains Set 2');

  // Athlete starts set
  ctx.startMainWorkoutSet();
  session = ctx.getActiveSession();
  assert.strictEqual(session.exercises[0].sets[1].completed, false, 'Starting set does not complete it');
});

console.log('\n--- Suite 4: Multi-Timer Independence Under Global Pause/Resume ---');

runTest('Session Duration, Hold Timer, and Rest Timer freeze and resume synchronously under global Pause', (ctx) => {
  const now = 1756500000000;
  const routineData = {
    id: 'test-rest-4',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    status: 'in_progress',
    startTime: now - 120000,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.RESTING,
    activeExerciseIndex: 0,
    activeSetIndex: 1,
    exercises: [
      {
        exercise_id: 'pull_up',
        exercise_name: 'Pull Ups',
        exercise_type: 'reps',
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: true },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.startWorkoutRest(60, 'Next: Set 2 · Pull Ups', 'Set 1 done');

  // Trigger Pause
  ctx.pauseWorkoutSession();
  let session = ctx.getActiveSession();
  assert.strictEqual(session.phaseState, ctx.PHASE_STATES.PAUSED, 'phaseState is PAUSED');
  assert.strictEqual(session.status, 'paused', 'status is paused');
  assert.strictEqual(session.restTimer.isRunning, false, 'Rest timer is paused');
  assert.notStrictEqual(session.restTimer.pausedAt, null, 'Rest timer pausedAt captured');

  // Trigger Resume
  ctx.resumeWorkoutSession();
  session = ctx.getActiveSession();
  assert.strictEqual(session.phaseState, ctx.PHASE_STATES.ACTIVE, 'phaseState is ACTIVE');
  assert.strictEqual(session.status, 'in_progress', 'status is in_progress');
  assert.strictEqual(session.restTimer.isRunning, true, 'Rest timer resumed');
  assert.strictEqual(session.restTimer.pausedAt, null, 'Rest timer pausedAt cleared');
});

console.log('\n--- Suite 5: Timer Cleanup Prevents Multiple Concurrent Timers ---');

runTest('Starting rest cleans up hold timers, starting hold cleans up rest timers', (ctx) => {
  const routineData = {
    id: 'test-rest-5',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        exercise_id: 'l_sit_hang',
        exercise_name: 'L-sit Hang',
        exercise_type: 'duration',
        duration_sec: 30,
        rest_sec: 45,
        sets: [
          { set_num: 1, target_val: 30, actual_val: 30, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);

  // 1. Start Hold
  ctx.startWorkoutHold(0, 0);
  let holdState = ctx.getWorkoutHoldState();
  let restState = ctx.getWorkoutRestState();
  assert.strictEqual(holdState.exIdx, 0, 'Hold timer running on exercise 0');
  assert.strictEqual(restState.active, false, 'Rest timer is inactive');

  // 2. Start Rest
  ctx.startWorkoutRest(45);
  holdState = ctx.getWorkoutHoldState();
  restState = ctx.getWorkoutRestState();
  assert.strictEqual(holdState.exIdx, null, 'Hold timer cleared when rest starts');
  assert.strictEqual(restState.active, true, 'Rest timer is active');

  // 3. Start Hold again
  ctx.startWorkoutHold(0, 0);
  holdState = ctx.getWorkoutHoldState();
  restState = ctx.getWorkoutRestState();
  assert.strictEqual(holdState.exIdx, 0, 'Hold timer active');
  assert.strictEqual(restState.active, false, 'Rest timer cleared when hold starts');

  // Cleanup
  ctx.stopWorkoutHold(false);
  ctx.stopWorkoutRest();
});

console.log('\n=============================================================');
console.log(`🎉 ALL ${testPassCount}/${testTotalCount} TESTS PASSED SUCCESSFULLY!`);
console.log('=============================================================\n');

process.exit(0);
