const path = require('path');
const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const dom = {
  window: {
    location: { hash: '' }
  },
  document: {
    _elements: {},
    getElementById: function(id) { return this._elements[id] || null; },
    createElement: function(tag) {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        remove: () => {
          if (el.id) delete dom.document._elements[el.id];
        },
        focus: () => {}
      };
      return el;
    },
    body: {
      appendChild: function(el) {
        if (el.id) dom.document._elements[el.id] = el;
      }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
  }
};

const context = vm.createContext({
  window: dom.window,
  document: dom.document,
  localStorage: dom.localStorage,
  navigator: { userAgent: 'node' },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Number: Number,
  String: String,
  API: {
    createWorkoutSession: async () => ({ status: 'ok' }),
    createLog: async () => ({ status: 'ok' })
  },
  loadDashboardSummary: async () => ({}),
  loadDashboardActivity: async () => ({}),
  showWorkoutSummaryModal: () => ({}),
  render: () => ({}),
  showToast: () => ({}),
  state: {
    exercises: [
      { id: 1, name: 'Pull-up', movement_pattern: 'pull_vertical' },
      { id: 2, name: 'Chin-up', movement_pattern: 'pull_vertical' },
      { id: 3, name: 'Inverted Row', movement_pattern: 'pull_horizontal' }
    ],
    todayLogs: {},
    todayResolved: null
  },
  render: () => {},
  switchView: () => {},
  openModal: () => {},
  closeModal: () => {}
});

// Load state.js & workout.js into context

const constantsCode = fs.readFileSync(path.join(__dirname, "../js/core/constants.js"), "utf8");
const utilsCode = fs.readFileSync(path.join(__dirname, "../js/core/utils.js"), "utf8");
const audioCode = fs.readFileSync(path.join(__dirname, "../js/core/audio.js"), "utf8");
const storageCode = fs.readFileSync(path.join(__dirname, "../js/core/storage.js"), "utf8");
const stateCode = fs.readFileSync(path.join(__dirname, "../js/core/state.js"), "utf8");

const workoutCode = fs.readFileSync(path.join(__dirname, "../js/views/workout-runner.js"), 'utf8');


vm.runInContext(constantsCode, context);
vm.runInContext(utilsCode, context);
vm.runInContext(audioCode, context);
vm.runInContext(storageCode, context);
vm.runInContext(stateCode, context);

vm.runInContext(workoutCode, context);

// Test startWorkoutFromData
console.log('Testing startWorkoutFromData with PULL B...');
context.startWorkoutFromData('PULL B', [
  { exercise_id: 1, exercise_name: 'Pull-up', sets: 4, reps: 8, phase: 'main' },
  { exercise_id: 2, exercise_name: 'Chin-up', sets: 3, reps: 10, phase: 'main' }
]);

const session = context.getActiveSession();
console.log('Session Routine:', session.routine);
console.log('Warmup exercises count:', session.warmup.length);
console.log('Main exercises count:', session.exercises.length);
console.log('Cooldown exercises count:', session.cooldown.length);

if (session.warmup.length === 0 || session.cooldown.length === 0) {
  throw new Error('Warm-up or Cool-down was not automatically populated!');
}

// Test renderActiveWorkoutView
console.log('Testing renderActiveWorkoutView for Warm-up...');
const warmupHtml = context.renderActiveWorkoutView();
console.log('Contains OVERALL PROGRESS:', warmupHtml.includes('OVERALL PROGRESS'));
console.log('Contains WARM-UP timeline card:', warmupHtml.includes('runner-timeline-step-wrapper'));
console.log('Contains Segmented Tabs:', warmupHtml.includes('runner-segmented-tabs-bar'));
console.log('Contains Hero Banner:', warmupHtml.includes('runner-phase-hero-banner'));
console.log('Contains Why Warm-Up?:', warmupHtml.includes('Why Warm-Up?'));

if (!warmupHtml.includes('OVERALL PROGRESS') || !warmupHtml.includes('Why Warm-Up?')) {
  throw new Error('Warm-up view HTML missing critical elements');
}

// Test getWorkoutPhaseModel
console.log('Testing getWorkoutPhaseModel...');
const model = context.getWorkoutPhaseModel(session);
console.log('Warm-up Phase:', model.warmUp.title, model.warmUp.totalCount, 'exercises, estimated duration:', model.warmUp.estimatedDuration);
console.log('Main Workout Phase:', model.mainWorkout.title, model.mainWorkout.totalCount, 'exercises, sets:', model.mainWorkout.totalSets);
console.log('Cool-Down Phase:', model.coolDown.title, model.coolDown.totalCount, 'exercises');
console.log('Overall total sets:', model.overall.totalSets, 'completed sets:', model.overall.completedSets);

if (!model.warmUp.id || !model.warmUp.description || !model.warmUp.estimatedDuration) {
  throw new Error('Warm-up phase model missing required properties');
}
if (!model.mainWorkout.id || !model.mainWorkout.exercises || model.mainWorkout.totalSets !== 7) {
  throw new Error('Main workout phase model has incorrect set calculations');
}
if (!model.coolDown.id || !model.coolDown.completionState) {
  throw new Error('Cool-down phase model missing completion state');
}

// Test phase locking & navigation rules
console.log('Testing phase lock rules...');
// Main is locked before Warm-up is resolved
context.setWorkoutPhase('main');
let currentSession = context.getActiveSession();
console.log('Main workout is locked before warm-up resolved:', currentSession.currentPhase === 'warmup');

// Skip Warm-up properly unlocks Main Workout
context.skipWarmupPhase();
currentSession = context.getActiveSession();
console.log('Warmup status after skip:', currentSession.warmup_status);
if (currentSession.warmup_status !== 'skipped') {
  throw new Error('Warm-up status should be skipped');
}
const warmupItemsCompleted = currentSession.warmup.filter(w => w.completed).length;
console.log('Warmup items completed after skip:', warmupItemsCompleted);
if (warmupItemsCompleted > 0) {
  throw new Error('Skipped warm-up items should not be falsely marked as completed');
}

// Now on Main Workout
const mainHtml = context.renderActiveWorkoutView();
console.log('Contains Main Workout Focus:', mainHtml.includes('Main Workout Focus'));
console.log('Contains Sets & Progression:', mainHtml.includes('SETS & PROGRESSION'));

// Complete main workout sets to unlock Cool Down
currentSession.exercises.forEach(ex => { (ex.sets || []).forEach(s => { s.completed = true; }); });
currentSession.mainStatus = 'COMPLETED';
context.saveActiveSession(currentSession);

// Switch to Cool Down
context.setWorkoutPhase('cooldown');
const cooldownHtml = context.renderActiveWorkoutView();
console.log('Contains Why Cool Down?:', cooldownHtml.includes('Why Cool Down?'));
console.log('Contains Lower Heart Rate pill:', cooldownHtml.includes('Lower Heart Rate'));

// Test Step 20: Workout Finishing & Confirmation Modal
console.log('Testing Step 20: Workout Finishing...');
// Create an incomplete session to test early modal
const incSession = Object.assign({}, context.getActiveSession(), {
  mainStatus: 'ACTIVE',
  exercises: [{ exercise_id: 'pull_up', sets: [{ set_num: 1, completed: false }] }]
});
context.saveActiveSession(incSession);

// Incomplete session triggers modal
context.requestFinishWorkout();
const modalEl = dom.document.getElementById('confirm-finish-workout-modal');
console.log('Confirmation modal created for incomplete session:', !!modalEl);
if (!modalEl || !modalEl.innerHTML.includes('Finish Workout Early?')) {
  throw new Error('Expected incomplete workout confirmation modal');
}

// Close modal and verify
context.closeConfirmFinishWorkoutModal();
console.log('Modal removed on close:', !dom.document.getElementById('confirm-finish-workout-modal'));

// Confirm Finish Anyway
context.requestFinishWorkout();
context.confirmFinishAnyway();
context.saveActiveSession(null);

// Test Step 21: Empty / Error State Fallbacks
console.log('Testing Step 21: Empty & Fallback State Handling...');
// 1. No active session renders clean starting card
const noSessionHtml = context.renderActiveWorkoutView();
console.log('Clean empty workout screen rendered:', noSessionHtml.includes('No active workout in progress'));
if (!noSessionHtml.includes('No active workout in progress')) {
  throw new Error('Expected clean fallback when no active workout exists');
}

// 2. Start a session with empty warmup and empty cooldown
const emptyPhaseSession = {
  id: 'test_empty_phases',
  routine: 'CUSTOM',
  status: 'in_progress',
  currentPhase: 'warmup',
  startTime: Date.now(),
  warmup: [],
  exercises: [{ exercise_name: 'Push-up', sets: [{ set_num: 1, target_val: 10, completed: true }] }],
  cooldown: []
};
context.saveActiveSession(emptyPhaseSession);

// Test warmup empty fallback
const emptyWarmupHtml = context.renderActiveWorkoutView();
console.log('Renders Warm-up unavailable fallback:', emptyWarmupHtml.includes('Warm-up unavailable'));
if (!emptyWarmupHtml.includes('Warm-up unavailable')) {
  throw new Error('Expected clean fallback for empty warm-up');
}

// Test cooldown empty fallback
context.setWorkoutPhase('cooldown');
const emptyCooldownHtml = context.renderActiveWorkoutView();
console.log('Renders Cool-down unavailable fallback:', emptyCooldownHtml.includes('Cool-down unavailable'));
if (!emptyCooldownHtml.includes('Cool-down unavailable')) {
  throw new Error('Expected clean fallback for empty cool-down');
}

console.log('ALL WORKOUT SCREEN REDESIGN LOGICAL TESTS PASSED SUCCESSFULLY! ✅');
if (typeof context !== 'undefined' && context.cleanupAllWorkoutTimers) context.cleanupAllWorkoutTimers();
process.exit(0);


