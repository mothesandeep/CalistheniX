/**
 * test_main_workout_interaction.js
 * Comprehensive automated verification for the redesigned Main Workout interaction logic.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING MAIN WORKOUT INTERACTION VERIFICATION TESTS');
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
        // sync textContent when innerHTML is set
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
    setInterval: () => 123,
    clearInterval: () => {},
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

  // Expose window exports onto ctx
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
// TEST SUITE: Main Workout Tracker Flow & Interaction Logic
// ============================================================================

console.log('--- Suite 1: Exercise Ready Info & UI Rendering ---');

runTest('Renders Exercise Name, Set indicator, Target, Rest, and Form Focus', (ctx) => {
  const routineData = {
    id: 'test-main-1',
    routine: 'PULL B',
    phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
    currentPhase: 'main',
    phaseState: ctx.PHASE_STATES.ACTIVE,
    warmupStatus: ctx.PHASE_STATES.COMPLETED,
    mainStatus: ctx.PHASE_STATES.ACTIVE,
    cooldownStatus: ctx.PHASE_STATES.IDLE,
    mainWorkoutSubState: ctx.MAIN_WORKOUT_STATES.EXERCISE_READY,
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    exercises: [
      {
        exercise_id: 'pull_up',
        exercise_name: 'Pull Ups',
        exercise_type: 'reps',
        rest_sec: 90,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false, skipped: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false, skipped: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  const session = ctx.getActiveSession();
  const cardHtml = ctx.renderMainWorkoutCardView(session);

  assert(cardHtml.includes('Pull Ups'), 'Renders exercise name "Pull Ups"');
  assert(cardHtml.includes('Set 1 of 2'), 'Renders "Set 1 of 2"');
  assert(cardHtml.includes('Target'), 'Renders Target');
  assert(cardHtml.includes('Rest'), 'Renders Rest');
  assert(cardHtml.includes('Form Focus:'), 'Renders Form Focus');
  assert(cardHtml.includes('COMPLETE SET') || cardHtml.includes('START'), 'Renders action button');
});

console.log('\n--- Suite 2: Reps Steppers (+ / -) & Target Immutability ---');

runTest('Steppers modify only actual_val, never target_val', (ctx) => {
  const routineData = {
    id: 'test-main-2',
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
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);

  // Decrease by 1
  ctx.adjustCurrentSetReps(-1);
  let session = ctx.getActiveSession();
  assert.strictEqual(session.exercises[0].sets[0].actual_val, 7, 'Actual reps decreased to 7');
  assert.strictEqual(session.exercises[0].sets[0].target_val, 8, 'Target reps preserved at 8');

  // Increase by 3
  ctx.adjustCurrentSetReps(3);
  session = ctx.getActiveSession();
  assert.strictEqual(session.exercises[0].sets[0].actual_val, 10, 'Actual reps increased to 10');
  assert.strictEqual(session.exercises[0].sets[0].target_val, 8, 'Target reps preserved at 8');
});

console.log('\n--- Suite 3: Set Completion, Performance Saving, & Rest Flow ---');

runTest('Completing set saves performance immediately and starts rest timer', (ctx) => {
  const routineData = {
    id: 'test-main-3',
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
          { set_num: 1, target_val: 8, actual_val: 7, completed: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.completeMainWorkoutSet();

  const session = ctx.getActiveSession();
  assert.strictEqual(session.exercises[0].sets[0].completed, true, 'Set 1 is completed');
  assert.strictEqual(session.exercises[0].sets[0].actual_val, 7, 'Saved actual performance 7');
  assert.strictEqual(session.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.RESTING, 'Sub-state entered RESTING');
  assert.strictEqual(session.restTimer.isRunning, true, 'Rest countdown running');
  assert.strictEqual(session.activeSetIndex, 1, 'Active set advanced to Set 2');

  // Complete rest
  ctx.stopWorkoutRest();
  const sessionAfterRest = ctx.getActiveSession();
  assert.strictEqual(sessionAfterRest.mainWorkoutSubState, ctx.MAIN_WORKOUT_STATES.SET_ACTIVE, 'Rest completed -> SET_ACTIVE for next set');
});

console.log('\n--- Suite 4: Skip Set Modal & Confirmation ---');

runTest('Skip Set prompts confirmation modal and marks set skipped on confirm', (ctx) => {
  const routineData = {
    id: 'test-main-4',
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
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false },
          { set_num: 2, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);

  // Open modal
  ctx.openSkipMainWorkoutSetModal();
  const modal = ctx.document.getElementById('skip-set-modal');
  assert(modal !== null, 'Skip set modal rendered');
  assert(modal.textContent.includes('Skip this set?'), 'Modal title is "Skip this set?"');

  // Confirm skip
  ctx.confirmSkipMainWorkoutSet();
  const session = ctx.getActiveSession();
  assert.strictEqual(ctx.document.getElementById('skip-set-modal'), null, 'Modal removed after confirm');
  assert.strictEqual(session.exercises[0].sets[0].skipped, true, 'Set 1 marked skipped');
  assert.strictEqual(session.exercises[0].sets[0].completed, false, 'Set 1 is not completed');
  assert.strictEqual(session.activeSetIndex, 1, 'Active set advanced to Set 2');
});

console.log('\n--- Suite 5: Exercise Completion & Auto-advance ---');

runTest('Final set completed marks exercise COMPLETED and advances to next exercise', (ctx) => {
  const routineData = {
    id: 'test-main-5',
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
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false }
        ]
      },
      {
        exercise_id: 'face_pull',
        exercise_name: 'Face Pulls',
        exercise_type: 'reps',
        sets: [
          { set_num: 1, target_val: 12, actual_val: 12, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.completeMainWorkoutSet();

  const session = ctx.getActiveSession();
  assert.strictEqual(session.exercises[0].completed, true, 'Pull Ups marked completed');
  assert.strictEqual(session.activeExerciseIndex, 1, 'Auto-advanced to Face Pulls (Exercise 2)');
  assert.strictEqual(session.activeSetIndex, 0, 'Set index reset to 0');
});

console.log('\n--- Suite 6: Final Exercise Completion & "Main Workout Complete" Celebration ---');

runTest('Completing last exercise shows "Main Workout Complete" screen with "Start Cool Down"', (ctx) => {
  const routineData = {
    id: 'test-main-6',
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
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false }
        ]
      }
    ]
  };

  ctx.saveActiveSession(routineData);
  ctx.completeMainWorkoutSet();

  const session = ctx.getActiveSession();
  assert.strictEqual(session.mainStatus, ctx.PHASE_STATES.COMPLETED, 'mainStatus is COMPLETED');

  const workspaceHtml = ctx.renderWorkoutPhaseWorkspace(session, 'main');
  assert(workspaceHtml.includes('Main Workout Complete'), 'Renders Main Workout Complete title');
  assert(workspaceHtml.includes('Start Cool Down'), 'Renders Start Cool Down CTA button');
  assert(!workspaceHtml.includes('runner-exercise-item-card'), 'Does not render redundant card stack list');

  // Click Start Cool Down
  ctx.startCoolDownFromMain();
  const cdSession = ctx.getActiveSession();
  assert.strictEqual(cdSession.phase, ctx.WORKOUT_PHASES.COOLDOWN, 'Phase transitions to COOLDOWN');
  assert.strictEqual(cdSession.cooldownStatus, ctx.PHASE_STATES.ACTIVE, 'cooldownStatus is ACTIVE');
});

console.log('\n=============================================================');
console.log(`🎉 ALL ${testPassCount}/${testTotalCount} TESTS PASSED SUCCESSFULLY!`);
console.log('=============================================================\n');
if (typeof ctx !== 'undefined' && ctx.cleanupAllWorkoutTimers) ctx.cleanupAllWorkoutTimers();
process.exit(0);
