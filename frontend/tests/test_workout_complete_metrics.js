/**
 * CalistheniX — Workout Complete Metrics & Real Session Data Test Suite
 *
 * Verifies:
 * 1. Every value comes from the actual session (no hardcoded values).
 * 2. Separate Duration, Exercises completed, Sets completed, Sets skipped, Completion %, Total volume.
 * 3. Synthetic/fake calories card is removed.
 * 4. PR is displayed ONLY when an actual previous record is beaten.
 * 5. Wording:
 *    - If sets skipped > 0: "Workout Finished", "X sets completed · Y skipped", never "All sets completed".
 *    - If sets skipped === 0: "All X sets completed".
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

const mockDocument = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    appendChild: () => {},
    remove: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} }
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

// Set benchmark records in state
sandbox.window.state.dashboardRecords = [
  { exercise_id: 1, exercise_name: 'Weighted Pull-up', max_reps: 8, max_weight_kg: 10 },
  { exercise_id: 2, exercise_name: 'Dips', max_reps: 12, max_weight_kg: 0 }
];
sandbox.window.state.exercises = [
  { id: 1, name: 'Weighted Pull-up', movement_pattern: 'pull' },
  { id: 2, name: 'Dips', movement_pattern: 'push' }
];

console.log('=============================================================');
console.log('WORKOUT COMPLETE REAL SESSION METRICS TEST SUITE');
console.log('=============================================================');

// ─── 1. Partial Workout with Skipped Sets (No PR) ───────────────────────────
console.log('\n--- 1. Testing Summary with Skipped Sets (Never "All Completed") ---');
const partialSession = {
  id: 'session-partial-1',
  routine: 'UPPER BODY POWER',
  level: 1,
  status: 'completed',
  duration_sec: 1425, // 23m 45s
  startTime: Date.now() - 1425000,
  warmupStatus: 'COMPLETED',
  warmup: [
    { exercise_name: 'Arm Circles', completed: true, skipped: false, reps: 15, actual_val: 15 }
  ],
  mainStatus: 'COMPLETED',
  exercises: [
    {
      id: 1,
      exercise_id: 1,
      exercise_name: 'Weighted Pull-up',
      completed: true,
      skipped: false,
      sets: [
        { set_num: 1, target_val: 6, actual_val: 6, weight_kg: 10, completed: true, skipped: false }, // weight 10kg = record (not beating record)
        { set_num: 2, target_val: 6, actual_val: 5, weight_kg: 10, completed: true, skipped: false },
        { set_num: 3, target_val: 6, actual_val: 0, weight_kg: 0, completed: false, skipped: true }
      ]
    },
    {
      id: 2,
      exercise_id: 2,
      exercise_name: 'Dips',
      completed: false,
      skipped: true,
      sets: [
        { set_num: 1, target_val: 10, actual_val: 0, completed: false, skipped: true },
        { set_num: 2, target_val: 10, actual_val: 0, completed: false, skipped: true }
      ]
    }
  ],
  cooldownStatus: 'COMPLETED',
  cooldown: [
    { exercise_name: 'Passive Hang', completed: true, skipped: false, duration_sec: 30, actual_val: 30 }
  ]
};

const summary1 = sandbox.getWorkoutSessionSummaryMetrics(partialSession);

assert.strictEqual(summary1.durationFormatted, '23:45', 'Duration is accurately formatted');
assert.strictEqual(summary1.setsCompleted, 4, 'Sets completed is 4');
assert.strictEqual(summary1.setsSkipped, 3, 'Sets skipped is 3');
assert.strictEqual(summary1.totalSets, 7, 'Total sets is 7');
assert.strictEqual(summary1.completionPercentage, 57, 'Completion percentage is 57% (4/7)');
assert.strictEqual(summary1.volumeKg, 110, 'Total volume is 110 kg');
assert.strictEqual(summary1.volumeText, '110 kg', 'Volume text is 110 kg');
assert.strictEqual(summary1.achievedPR, null, 'No PR was achieved (did not beat 10kg/8 reps)');

const viewHtml1 = sandbox.renderWorkoutCompleteView(partialSession, summary1);

// Phrasing checks:
assert(viewHtml1.includes('4 sets completed · 3 skipped'), 'Displays "4 sets completed · 3 skipped"');
assert(!viewHtml1.includes('All 4 sets completed'), 'NEVER says "All sets completed" when sets were skipped');
assert(!viewHtml1.includes('kcal'), 'Fake calories card is NOT present');
assert(!viewHtml1.includes('Personal Record (PR)'), 'No PR row is rendered when no record was beaten');

console.log('  ✓ 1. Passed: Skipped sets, duration, volume, and percentage are computed from actual session without calories or unearned PR.');

// ─── 2. Perfect Workout with Genuine PR ──────────────────────────────────────
console.log('\n--- 2. Testing 100% Workout with Genuine PR Achievement ---');
const prSession = {
  id: 'session-pr-2',
  routine: 'WEIGHTED PULL-UP PEAK',
  level: 3,
  status: 'completed',
  duration_sec: 2400, // 40m 00s
  startTime: Date.now() - 2400000,
  warmupStatus: 'COMPLETED',
  warmup: [
    { exercise_name: 'Band Pull-aparts', completed: true, skipped: false, reps: 20, actual_val: 20 }
  ],
  mainStatus: 'COMPLETED',
  exercises: [
    {
      id: 1,
      exercise_id: 1,
      exercise_name: 'Weighted Pull-up',
      completed: true,
      skipped: false,
      sets: [
        { set_num: 1, target_val: 6, actual_val: 6, weight_kg: 15, completed: true, skipped: false } // 15kg beats previous 10kg PR!
      ]
    }
  ],
  cooldownStatus: 'COMPLETED',
  cooldown: [
    { exercise_name: 'Lats Stretch', completed: true, skipped: false, duration_sec: 45, actual_val: 45 }
  ]
};

const summary2 = sandbox.getWorkoutSessionSummaryMetrics(prSession);

assert.strictEqual(summary2.durationFormatted, '40:00', 'Duration is 40:00');
assert.strictEqual(summary2.setsCompleted, 3, 'Sets completed is 3');
assert.strictEqual(summary2.setsSkipped, 0, 'Sets skipped is 0');
assert.strictEqual(summary2.totalSets, 3, 'Total sets is 3');
assert.strictEqual(summary2.completionPercentage, 100, 'Completion percentage is 100%');
assert.strictEqual(summary2.volumeKg, 90, 'Volume is 90 kg (6 * 15kg)');
assert(summary2.achievedPR != null && summary2.achievedPR.includes('+15kg'), 'Achieved PR detected (+15kg beat 10kg)');

const viewHtml2 = sandbox.renderWorkoutCompleteView(prSession, summary2);

assert(viewHtml2.includes('All 3 sets completed'), 'Displays "All 3 sets completed" when 0 sets skipped');
assert(viewHtml2.includes('Personal Record (PR)'), 'Renders PR badge when genuine record is beaten');
assert(viewHtml2.includes('+15kg'), 'Displays the specific record beaten');

console.log('  ✓ 2. Passed: 100% completed workout displays "All sets completed" and renders genuine PR.');

// ─── 3. Pure Bodyweight Session ──────────────────────────────────────────────
console.log('\n--- 3. Testing Pure Bodyweight Session Volume Handling ---');
const bwSession = {
  id: 'session-bw-3',
  routine: 'BODYWEIGHT FOUNDATIONS',
  status: 'completed',
  duration_sec: 900, // 15:00
  startTime: Date.now() - 900000,
  warmupStatus: 'COMPLETED',
  warmup: [],
  mainStatus: 'COMPLETED',
  exercises: [
    {
      id: 2,
      exercise_id: 2,
      exercise_name: 'Dips',
      completed: true,
      skipped: false,
      sets: [
        { set_num: 1, target_val: 10, actual_val: 10, weight_kg: 0, completed: true, skipped: false }
      ]
    }
  ],
  cooldownStatus: 'COMPLETED',
  cooldown: []
};

const summary3 = sandbox.getWorkoutSessionSummaryMetrics(bwSession);
assert.strictEqual(summary3.volumeText, 'Bodyweight', 'Bodyweight session reports Bodyweight for volume');
assert.strictEqual(summary3.volumeKg, 0, 'Volume kg is 0');

const viewHtml3 = sandbox.renderWorkoutCompleteView(bwSession, summary3);
assert(viewHtml3.includes('Bodyweight'), 'Renders Bodyweight volume cleanly');

console.log('  ✓ 3. Passed: Bodyweight workouts cleanly report Bodyweight volume.');

console.log('\n=============================================================');
console.log('🎉 ALL WORKOUT COMPLETE METRICS TESTS VERIFIED & PASSED 100%!');
console.log('=============================================================');
if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
process.exit(0);
