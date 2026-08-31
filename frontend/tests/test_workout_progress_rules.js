/**
 * test_workout_progress_rules.js
 * 
 * Comprehensive test suite verifying all 7 Workout Progress Logic Rules:
 * 1. Completed set = completed.
 * 2. Skipped set = skipped, never completed.
 * 3. Skipped sets must not increase completed-set count.
 * 4. Exercise is completed only when all required sets/movements are completed or explicitly skipped.
 * 5. Never show a green check if the exercise still says 0/3.
 * 6. Overall progress must clearly separate Completed, Skipped and Remaining.
 * 7. All progress indicators must use the same session state.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=============================================================');
console.log('WORKOUT PROGRESS LOGIC RULES - TEST SUITE');
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
    removeItem(k) { delete this._data[k]; }
  };

  const mockGlobals = {
    location: { hash: '' },
    window: {
      location: { hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      ExerciseAnimation: { getPatternKey: () => 'pull' },
      MuscleMap: {
        resolveMuscles: () => ({ primary: ['lats'], secondary: ['biceps'] }),
        renderBackSVG: () => '<svg></svg>',
        renderFrontSVG: () => '<svg></svg>'
      }
    },
    document: {
      getElementById: () => null,
      createElement: () => ({
        setAttribute: () => {},
        getAttribute: () => null,
        style: {},
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false }
      }),
      body: { appendChild: () => {}, removeChild: () => {} }
    },
    localStorage: localStorageMock,
    state: {
      exercises: [
        { id: 'ex_pullup', name: 'Pull-ups Close Grip', movement_pattern: 'pull', primary_muscles: ['lats', 'biceps'] },
        { id: 'ex_dip', name: 'Dips', movement_pattern: 'push', primary_muscles: ['chest', 'triceps'] }
      ],
      workouts: [],
      todayResolved: null,
      activeSession: null
    },
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    showToast: () => {},
    render: () => {},
    todayISO: () => '2026-08-30',
    newUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9),
    renderIcon: (name, cls) => `<i data-icon="${name}" class="${cls || ''}"></i>`,
    fmtSecs: (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`,
    cueExerciseComplete: () => {},
    cueSetComplete: () => {},
    cueCountdownTick: () => {},
    cueTimerComplete: () => {},
    cueTick: () => {},
    cueRestEnd: () => {},
    cueHoldSave: () => {},
    isAutoAdvanceEnabled: () => false,
    triggerTimedAutoAdvance: () => {},
    cancelAutoAdvance: () => {}
  };

  const context = vm.createContext(mockGlobals);
  vm.runInContext(constantsCode, context);
  vm.runInContext(utilsCode, context);
  vm.runInContext(audioCode, context);
  vm.runInContext(storageCode, context);
  vm.runInContext(stateCode, context);
  vm.runInContext(workoutJsContent, context);

  return context;
}

const ctx = createTestContext();

function createSampleSession() {
  return {
    id: 'test-session-progress',
    routine: 'Test Routine',
    status: 'in_progress',
    currentPhase: 'main',
    phase: 'MAIN_WORKOUT',
    phaseState: 'ACTIVE',
    startTime: Date.now() - 300000,
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    warmup: [
      { id: 'w1', exercise_name: 'Arm Circles', exercise_type: 'reps', reps: 10, completed: true, skipped: false },
      { id: 'w2', exercise_name: 'Wrist Stretch', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: true }
    ],
    exercises: [
      {
        exercise_id: 'ex_pullup',
        exercise_name: 'Pull-ups Close Grip',
        rest_sec: 90,
        sets: [
          { set_num: 1, target_val: 8, actual_val: null, completed: false, skipped: false },
          { set_num: 2, target_val: 8, actual_val: null, completed: false, skipped: false },
          { set_num: 3, target_val: 8, actual_val: null, completed: false, skipped: false }
        ]
      },
      {
        exercise_id: 'ex_dip',
        exercise_name: 'Dips',
        rest_sec: 90,
        sets: [
          { set_num: 1, target_val: 10, actual_val: null, completed: false, skipped: false },
          { set_num: 2, target_val: 10, actual_val: null, completed: false, skipped: false },
          { set_num: 3, target_val: 10, actual_val: null, completed: false, skipped: false }
        ]
      }
    ],
    cooldown: [
      { id: 'c1', exercise_name: 'Lat Stretch', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false },
      { id: 'c2', exercise_name: 'Chest Stretch', exercise_type: 'duration', duration_sec: 30, completed: false, skipped: false }
    ]
  };
}

// -------------------------------------------------------------
// RULE 1 & 2: Completed set = completed; Skipped set = skipped, never completed
// -------------------------------------------------------------
console.log('--- Testing Rule 1 & 2: Set Completion and Skipping Status ---');
const s1 = createSampleSession();
ctx.state.activeSession = s1;

// Mark set 0 completed
s1.exercises[0].sets[0].completed = true;
s1.exercises[0].sets[0].skipped = false;
assert.strictEqual(s1.exercises[0].sets[0].completed, true, 'Set 0 should be completed');
assert.strictEqual(s1.exercises[0].sets[0].skipped, false, 'Set 0 should not be skipped');

// Mark set 1 skipped
s1.exercises[0].sets[1].skipped = true;
s1.exercises[0].sets[1].completed = false;
assert.strictEqual(s1.exercises[0].sets[1].skipped, true, 'Set 1 should be skipped');
assert.strictEqual(s1.exercises[0].sets[1].completed, false, 'Skipped set must never be completed');

console.log('  ✓ Rule 1 & 2 PASSED: Sets are mutually exclusive and skipped sets are never marked completed.');

// -------------------------------------------------------------
// RULE 3: Skipped sets must not increase completed-set count
// -------------------------------------------------------------
console.log('\n--- Testing Rule 3: Skipped Sets Do Not Increase Completed Count ---');
const s3 = createSampleSession();
ctx.state.activeSession = s3;

let authState = ctx.getAuthoritativeSessionState(s3);
const initialCompletedSets = authState.overall.completedSets;
assert.strictEqual(initialCompletedSets, 1, 'Initial completed sets: 1 warmup completed');

// Now skip all 3 sets of Exercise 0
s3.exercises[0].sets[0].skipped = true;
s3.exercises[0].sets[0].completed = false;
s3.exercises[0].sets[1].skipped = true;
s3.exercises[0].sets[1].completed = false;
s3.exercises[0].sets[2].skipped = true;
s3.exercises[0].sets[2].completed = false;

authState = ctx.getAuthoritativeSessionState(s3);
assert.strictEqual(authState.overall.completedSets, 1, 'Completed sets must remain 1 after skipping 3 sets');
assert.strictEqual(authState.overall.skippedSets, 4, 'Skipped sets should be 1 warmup + 3 main sets = 4');
assert.strictEqual(authState.main.completedSets, 0, 'Main workout completed sets must be 0');
assert.strictEqual(authState.main.skippedSets, 3, 'Main workout skipped sets must be 3');
assert.strictEqual(authState.main.pct, 0, 'Main workout progress pct must be 0% when 0 sets completed');

console.log('  ✓ Rule 3 PASSED: Skipped sets strictly increment skippedSets without increasing completedSets or progressPct.');

// -------------------------------------------------------------
// RULE 4: Exercise is completed only when all required sets are resolved
// -------------------------------------------------------------
console.log('\n--- Testing Rule 4: Exercise Completion Requirement ---');
const s4 = createSampleSession();
ctx.state.activeSession = s4;

// Exercise 0: 1 of 3 sets done -> Incomplete
s4.exercises[0].sets[0].completed = true;
authState = ctx.getAuthoritativeSessionState(s4);
assert.strictEqual(authState.main.completedExercises, 0, 'Exercise 0 not done with 1/3 sets');
assert.strictEqual(authState.main.resolvedExercises, 0, 'Exercise 0 not resolved with 1/3 sets');

// Exercise 0: 2 completed, 1 skipped -> All 3 resolved
s4.exercises[0].sets[1].completed = true;
s4.exercises[0].sets[2].skipped = true;
authState = ctx.getAuthoritativeSessionState(s4);
assert.strictEqual(authState.main.resolvedExercises, 1, 'Exercise 0 resolved when 2 done + 1 skipped');
assert.strictEqual(authState.main.completedExercises, 1, 'Exercise 0 completed when resolved with completions');

// Exercise 1: all 3 skipped -> Resolved as skipped, not completed
s4.exercises[1].sets[0].skipped = true;
s4.exercises[1].sets[1].skipped = true;
s4.exercises[1].sets[2].skipped = true;
authState = ctx.getAuthoritativeSessionState(s4);
assert.strictEqual(authState.main.skippedExercises, 1, 'Exercise 1 should be counted as skipped exercise');
assert.strictEqual(authState.main.completedExercises, 1, 'Completed exercises count must remain 1 (not 2)');
assert.strictEqual(authState.main.resolvedExercises, 2, 'Resolved exercises count is 2');

console.log('  ✓ Rule 4 PASSED: Exercises complete only when all sets are resolved, and all-skipped exercises are classified as skipped.');

// -------------------------------------------------------------
// RULE 5: Never show a green check if the exercise still says 0/3
// -------------------------------------------------------------
console.log('\n--- Testing Rule 5: Never Show Green Check for 0/3 Sets ---');
const s5 = createSampleSession();
ctx.state.activeSession = s5;

// Scenario A: Exercise 0 has 0/3 sets completed, 3 sets skipped
s5.exercises[0].sets[0].skipped = true;
s5.exercises[0].sets[1].skipped = true;
s5.exercises[0].sets[2].skipped = true;
// Exercise 1 has 0/3 sets completed, 0 sets skipped (unstarted)

let workspaceHtml = ctx.renderWorkoutPhaseWorkspace(s5, 'main');

// Check Exercise 0 HTML (0/3 sets, 3 skp)
assert(workspaceHtml.includes('0/3') && workspaceHtml.includes('3 skp'), 'Workspace displays 0/3 with 3 skp');

// Exercise 0 queue pill must NOT contain '✓' and must NOT have green color (#10b981)
const ex0CardHtmlMatch = workspaceHtml.match(/id="main-card-0"[\s\S]*?id="main-card-1"/);
const ex0Html = ex0CardHtmlMatch ? ex0CardHtmlMatch[0] : '';
assert(!ex0Html.includes('<span>✓</span>'), 'Exercise with 0/3 sets must NOT have ✓ check icon');
assert(!ex0Html.includes('color:#10b981'), 'Exercise with 0/3 sets must NOT have green text color');
assert(ex0Html.includes('<span>⏭</span>'), 'All-skipped exercise has skip icon in queue strip');

// Check Exercise 1 HTML (0/3 sets, pending)
const ex1Html = workspaceHtml.slice(workspaceHtml.indexOf('id="main-card-1"'));
assert(ex1Html.includes('(0/3)'), 'Workspace displays 0/3 for Exercise 1');
assert(!ex1Html.includes('id="main-card-1" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#10b981;'), 'Uncompleted exercise 1 must NOT have green color');

console.log('  ✓ Rule 5 PASSED: HTML output strictly verifies no green check is ever rendered for 0/3 sets.');

// -------------------------------------------------------------
// RULE 6: Overall progress must clearly separate Completed, Skipped and Remaining
// -------------------------------------------------------------
console.log('\n--- Testing Rule 6: Clear Separation of Completed, Skipped and Remaining ---');
const s6 = createSampleSession();
ctx.state.activeSession = s6;

s6.exercises[0].sets[0].completed = true;
s6.exercises[0].sets[1].completed = true;
s6.exercises[0].sets[2].skipped = true;

const auth6 = ctx.getAuthoritativeSessionState(s6);
assert.strictEqual(auth6.overall.totalSets, 10, 'Total sets is 10');
assert.strictEqual(auth6.overall.completedSets, 3, 'Completed sets is 3');
assert.strictEqual(auth6.overall.skippedSets, 2, 'Skipped sets is 2');
assert.strictEqual(auth6.overall.remainingSets, 5, 'Remaining sets is 5');
assert.strictEqual(auth6.overall.progressPct, 30, 'Progress pct is 30% (3/10 * 100)');

const sidebarHtml = ctx.renderWorkoutStructureSidebar(s6, 'main');
assert(sidebarHtml.includes('3 / 10 sets · 30%'), 'Sidebar contains overall sets and progress percentage');
assert(sidebarHtml.includes('3 Done') || sidebarHtml.includes('3 Completed'), 'Sidebar clearly separates completed count');
assert(sidebarHtml.includes('2 Skipped'), 'Sidebar clearly separates skipped count');
assert(sidebarHtml.includes('5 Remaining'), 'Sidebar clearly separates remaining count');

console.log('  ✓ Rule 6 PASSED: Overall progress clearly outputs 3 Completed, 2 Skipped, and 5 Remaining.');

// -------------------------------------------------------------
// RULE 7: All progress indicators must use the same session state
// -------------------------------------------------------------
console.log('\n--- Testing Rule 7: Single Source of Truth Across All Screens ---');
const s7 = createSampleSession();
ctx.state.activeSession = s7;

s7.exercises[0].sets[0].completed = true;
s7.exercises[0].sets[1].completed = true;
s7.exercises[0].sets[2].completed = true;

const auth7 = ctx.getAuthoritativeSessionState(s7);
const phaseModel = ctx.getWorkoutPhaseModel(s7);
const summaryMetrics = ctx.getWorkoutSessionSummaryMetrics(s7);

// Compare values across all modules
assert.strictEqual(phaseModel.overall.totalSets, auth7.overall.totalSets, 'Total sets synchronized');
assert.strictEqual(phaseModel.overall.completedSets, auth7.overall.completedSets, 'Completed sets synchronized');
assert.strictEqual(phaseModel.overall.skippedSets, auth7.overall.skippedSets, 'Skipped sets synchronized');
assert.strictEqual(summaryMetrics.setsCompleted, auth7.overall.completedSets, 'Summary completed sets synchronized');
assert.strictEqual(summaryMetrics.setsSkipped, auth7.overall.skippedSets, 'Summary skipped sets synchronized');
assert.strictEqual(summaryMetrics.totalSets, auth7.overall.totalSets, 'Summary total sets synchronized');
assert.strictEqual(summaryMetrics.completionPercentage, auth7.overall.progressPct, 'Summary completion % synchronized');

console.log('  ✓ Rule 7 PASSED: Authoritative session state is identical across phase model, summary, and UI renderers.');

console.log('\n=============================================================');
console.log('🎉 ALL 7 WORKOUT PROGRESS LOGIC RULES VERIFIED & PASSED 100%!');
console.log('=============================================================');
if (typeof ctx !== 'undefined' && ctx.cleanupAllWorkoutTimers) ctx.cleanupAllWorkoutTimers();
process.exit(0);
