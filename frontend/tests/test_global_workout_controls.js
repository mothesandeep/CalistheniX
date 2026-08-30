/**
 * test_global_workout_controls.js
 * Comprehensive automated verification for global workout controls:
 * 1. Header controls (Back, Session Timer, Pause, Finish Workout)
 * 2. Back confirmation modal & saving progress as ABANDONED/INCOMPLETE
 * 3. Global Pause freezing all timers (session, hold, rest, warmup, cooldown)
 * 4. Finish Workout early guard vs complete transition
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING GLOBAL WORKOUT CONTROLS VERIFICATION TESTS');
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
  const createdSessions = [];
  const loggedPayloads = [];

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
          },
          focus: () => {}
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
    Math: Math,
    createdSessions,
    loggedPayloads,
    API: {
      createWorkoutSession: async (payload) => {
        createdSessions.push(payload);
        return payload;
      },
      createLog: async (payload) => {
        loggedPayloads.push(payload);
        return payload;
      },
      getRoutineLevels: async () => []
    }
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

async function runTest(testName, testFn) {
  testTotalCount++;
  try {
    const ctx = createTestContext();
    await testFn(ctx);
    console.log(`  ✓ PASS: ${testName}`);
    testPassCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  // ============================================================================
  // TEST SUITE 1: HEADER CONTROLS RENDERING
  // ============================================================================
  console.log('--- Suite 1: Unified Header Top Bar Across Views ---');

  await runTest('Header consistently includes Back, Session Timer, Pause, and Finish Workout buttons', async (ctx) => {
    const session = {
      id: 'header-test',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      startTime: Date.now() - 30000,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      mainStatus: ctx.PHASE_STATES.ACTIVE,
      cooldownStatus: ctx.PHASE_STATES.IDLE,
      mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
      warmup: [{ exercise_name: 'Arm Circles', completed: true }],
      exercises: [
        {
          exercise_id: 'pull_up',
          exercise_name: 'Pull Ups',
          exercise_type: 'reps',
          sets: [{ set_num: 1, target_val: 8, actual_val: 8, completed: false }]
        }
      ],
      cooldown: [{ exercise_name: 'Lat Stretch', completed: false }]
    };

    ctx.saveActiveSession(session);

    // 1. Warm-up view
    const warmupHtml = ctx.renderWarmupCardView(session);
    assert(warmupHtml.includes('openExitWorkoutModal()'), 'Warm-up header has Back button');
    assert(warmupHtml.includes('workout-elapsed-val'), 'Warm-up header has Session Timer');
    assert(warmupHtml.includes('togglePauseWorkoutSession()'), 'Warm-up header has Pause button');
    assert(warmupHtml.includes('requestFinishWorkout()'), 'Warm-up header has Finish Workout button');

    // 2. Main Workout view
    const mainHtml = ctx.renderMainWorkoutCardView(session);
    assert(mainHtml.includes('openExitWorkoutModal()'), 'Main header has Back button');
    assert(mainHtml.includes('workout-elapsed-val'), 'Main header has Session Timer');
    assert(mainHtml.includes('togglePauseWorkoutSession()'), 'Main header has Pause button');
    assert(mainHtml.includes('requestFinishWorkout()'), 'Main header has Finish Workout button');

    // 3. Rest view
    const restHtml = ctx.renderWorkoutRestView(session);
    assert(restHtml.includes('openExitWorkoutModal()'), 'Rest header has Back button');
    assert(restHtml.includes('workout-elapsed-val'), 'Rest header has Session Timer');
    assert(restHtml.includes('togglePauseWorkoutSession()'), 'Rest header has Pause button');
    assert(restHtml.includes('requestFinishWorkout()'), 'Rest header has Finish Workout button');

    // 4. Cool Down view
    const cdHtml = ctx.renderCooldownCardView(session);
    assert(cdHtml.includes('openExitWorkoutModal()'), 'Cooldown header has Back button');
    assert(cdHtml.includes('workout-elapsed-val'), 'Cooldown header has Session Timer');
    assert(cdHtml.includes('togglePauseWorkoutSession()'), 'Cooldown header has Pause button');
    assert(cdHtml.includes('requestFinishWorkout()'), 'Cooldown header has Finish Workout button');
  });

  // ============================================================================
  // TEST SUITE 2: BACK BUTTON CONFIRMATION & ABANDONED/INCOMPLETE SAVE
  // ============================================================================
  console.log('\n--- Suite 2: Back Button Confirmation & Incomplete Saving ---');

  await runTest('Back button prompts "Exit Workout?" modal and preserves progress as abandoned/incomplete', async (ctx) => {
    const session = {
      id: 'back-test-1',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      startTime: Date.now() - 60000,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      mainStatus: ctx.PHASE_STATES.ACTIVE,
      cooldownStatus: ctx.PHASE_STATES.IDLE,
      mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
      activeExerciseIndex: 0,
      activeSetIndex: 1,
      warmup: [{ exercise_id: 'warm_1', exercise_name: 'Arm Circles', completed: true, actual_val: 15 }],
      exercises: [
        {
          exercise_id: 'pull_up',
          exercise_name: 'Pull Ups',
          exercise_type: 'reps',
          sets: [
            { set_num: 1, target_val: 8, actual_val: 9, completed: true },
            { set_num: 2, target_val: 8, actual_val: 8, completed: false }
          ]
        }
      ]
    };

    ctx.saveActiveSession(session);

    // 1. Open Exit Workout Modal
    ctx.openExitWorkoutModal();
    const modalEl = ctx.document.getElementById('exit-workout-modal');
    assert.notStrictEqual(modalEl, null, 'Exit modal created in DOM');
    assert(modalEl.innerHTML.includes('Exit Workout?'), 'Modal title is "Exit Workout?"');
    assert(modalEl.innerHTML.includes('Your current workout progress will be saved, but this session will end.'), 'Modal description explains progress will be saved');
    assert(modalEl.innerHTML.includes('Continue Workout'), 'Modal has "Continue Workout" button');
    assert(modalEl.innerHTML.includes('Exit Workout'), 'Modal has "Exit Workout" button');

    // 2. Confirm Exit
    await ctx.confirmExitWorkout();

    // Active session cleared from active storage
    assert.strictEqual(ctx.getActiveSession(), null, 'Active session cleared from memory');

    // Verify stored payload in createdSessions or local storage outbox
    const payload = ctx.createdSessions.find(s => s.id === 'back-test-1') || JSON.parse(ctx.localStorage.getItem('cx_session_back-test-1') || '{}');
    assert.strictEqual(payload.status, 'abandoned', 'Session status marked as abandoned');
    assert.strictEqual(payload.is_completed, false, 'Session marked not completed');
    assert.strictEqual(payload.completed_at, null, 'completed_at is null');
    assert.strictEqual(payload.exercises[0].sets[0].completed, true, 'Warmup set preserved');
    assert.strictEqual(payload.exercises[1].sets[0].completed, true, 'Main workout set 1 preserved');
  });

  // ============================================================================
  // TEST SUITE 3: GLOBAL PAUSE FREEZES ALL TIMERS
  // ============================================================================
  console.log('\n--- Suite 3: Global Pause Freezes All 5 Timers ---');

  await runTest('Pause freezes session, exercise, rest, warmup, and cooldown timers simultaneously', async (ctx) => {
    const now = 1756500000000;
    const session = {
      id: 'pause-test-1',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      startTime: now - 30000,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      mainStatus: ctx.PHASE_STATES.ACTIVE,
      cooldownStatus: ctx.PHASE_STATES.IDLE,
      mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.RESTING,
      activeExerciseIndex: 0,
      activeSetIndex: 1,
      restTimer: {
        isRunning: true,
        durationSec: 60,
        remainingSec: 45,
        startedAt: now - 15000,
        pausedAt: null
      },
      holdTimer: {
        isRunning: true,
        exIdx: 0,
        setIdx: 1,
        targetSec: 30,
        elapsedSec: 10,
        startedAt: now - 10000,
        pausedAt: null
      },
      movementTimer: {
        isRunning: true,
        durationSec: 30,
        remainingSec: 20,
        startedAt: now - 10000,
        pausedAt: null
      },
      phaseTimer: {
        isRunning: true,
        duration: 30,
        remaining: 20,
        startedAt: now - 10000,
        pausedMs: 0
      },
      exercises: [
        {
          exercise_id: 'l_sit',
          exercise_name: 'L-sit Hold',
          exercise_type: 'duration',
          sets: [{ set_num: 1, target_val: 30, completed: false }]
        }
      ]
    };

    ctx.saveActiveSession(session);

    // Trigger global Pause
    ctx.pauseWorkoutSession();
    let pausedSession = ctx.getActiveSession();
    assert.strictEqual(pausedSession.status, 'paused', 'Session status is paused');
    assert.strictEqual(pausedSession.phaseState, ctx.PHASE_STATES.PAUSED, 'Phase state is PAUSED');
    assert.strictEqual(pausedSession.restTimer.isRunning, false, 'Rest timer is frozen');
    assert.strictEqual(pausedSession.holdTimer.isRunning, false, 'Hold timer is frozen');
    assert.strictEqual(pausedSession.movementTimer.isRunning, false, 'Movement timer is frozen');
    assert.strictEqual(pausedSession.phaseTimer.isRunning, false, 'Phase timer is frozen');

    // Trigger Resume
    ctx.resumeWorkoutSession();
    let resumedSession = ctx.getActiveSession();
    assert.strictEqual(resumedSession.status, 'in_progress', 'Session status resumed');
    assert.strictEqual(resumedSession.phaseState, ctx.PHASE_STATES.ACTIVE, 'Phase state is ACTIVE');
    assert.strictEqual(resumedSession.restTimer.isRunning, true, 'Rest timer resumed');
    assert.strictEqual(resumedSession.holdTimer.isRunning, true, 'Hold timer resumed');
    assert.strictEqual(resumedSession.movementTimer.isRunning, true, 'Movement timer resumed');
  });

  // ============================================================================
  // TEST SUITE 4: FINISH WORKOUT EARLY VS COMPLETED GUARD
  // ============================================================================
  console.log('\n--- Suite 4: Finish Workout Early Guard vs Complete Transition ---');

  await runTest('Incomplete workout prompts "Finish Workout Early?" and saves as completed_early on confirm', async (ctx) => {
    const session = {
      id: 'finish-early-test',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      startTime: Date.now() - 120000,
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
          sets: [
            { set_num: 1, target_val: 8, actual_val: 8, completed: true },
            { set_num: 2, target_val: 8, actual_val: 8, completed: false }
          ]
        }
      ]
    };

    ctx.saveActiveSession(session);

    // 1. Click Finish Workout on incomplete session
    ctx.requestFinishWorkout();
    const modalEl = ctx.document.getElementById('confirm-finish-workout-modal');
    assert.notStrictEqual(modalEl, null, 'Early finish confirmation modal shown');
    assert(modalEl.innerHTML.includes('Finish Workout Early?'), 'Modal title is "Finish Workout Early?"');
    assert(modalEl.innerHTML.includes('1 of 2 sets completed.'), 'Modal shows "1 of 2 sets completed."');
    assert(modalEl.innerHTML.includes('Continue Workout'), 'Modal has "Continue Workout" button');
    assert(modalEl.innerHTML.includes('Finish Anyway'), 'Modal has "Finish Anyway" button');

    // 2. Click Finish Anyway -> transitions to terminal Workout Complete
    await ctx.confirmFinishAnyway();
    const curSession = ctx.getActiveSession();
    assert.strictEqual(curSession.status, 'completed_early', 'Session status set to completed_early');
    assert.strictEqual(curSession.phase, 'COMPLETED', 'Session entered COMPLETED phase');

    // 3. Click Done to finalize and clear active runner
    await ctx.handleDoneWorkoutClick();
    assert.strictEqual(ctx.getActiveSession(), null, 'Active session cleared after Done');

    // Verify saved payload
    const payload = ctx.createdSessions.find(s => s.id === 'finish-early-test') || JSON.parse(ctx.localStorage.getItem('cx_session_finish-early-test') || '{}');
    assert.strictEqual(payload.status, 'completed_early', 'Session status saved as completed_early');
    assert.strictEqual(payload.is_early_finish, true, 'is_early_finish is true');
    assert.strictEqual(payload.is_completed, false, 'is_completed is false');
    assert.strictEqual(payload.exercises[0].sets[0].completed, true, 'Completed set 1 preserved');
  });

  await runTest('Fully completed workout transitions directly to Workout Complete without early modal', async (ctx) => {
    const session = {
      id: 'finish-complete-test',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      startTime: Date.now() - 180000,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      mainStatus: ctx.PHASE_STATES.ACTIVE,
      cooldownStatus: ctx.PHASE_STATES.COMPLETED,
      mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.SET_ACTIVE,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
      exercises: [
        {
          exercise_id: 'pull_up',
          exercise_name: 'Pull Ups',
          exercise_type: 'reps',
          sets: [
            { set_num: 1, target_val: 8, actual_val: 8, completed: true }
          ]
        }
      ]
    };

    ctx.saveActiveSession(session);

    // 1. Click Finish Workout on 100% complete session
    await ctx.requestFinishWorkout();
    const modalEl = ctx.document.getElementById('confirm-finish-workout-modal');
    assert.strictEqual(modalEl, null, 'No early finish warning modal shown');

    // 2. Click Done to finalize
    await ctx.handleDoneWorkoutClick();
    assert.strictEqual(ctx.getActiveSession(), null, 'Active session cleared after Done');

    // Verify payload saved as full completed
    const payload = ctx.createdSessions.find(s => s.id === 'finish-complete-test') || JSON.parse(ctx.localStorage.getItem('cx_session_finish-complete-test') || '{}');
    assert.strictEqual(payload.status, 'completed', 'Session status saved as completed');
    assert.strictEqual(payload.is_completed, true, 'is_completed is true');
    assert.strictEqual(payload.is_early_finish, false, 'is_early_finish is false');
    assert.notStrictEqual(payload.completed_at, null, 'completed_at timestamp recorded');
  });

  console.log('\n=============================================================');
  console.log(`🎉 ALL ${testPassCount}/${testTotalCount} TESTS PASSED SUCCESSFULLY!`);
  console.log('=============================================================\n');

  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
