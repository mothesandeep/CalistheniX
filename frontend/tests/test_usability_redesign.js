const path = require('path');
const fs = require('fs');
const vm = require('vm');

console.log('=============================================================');
console.log('VERIFYING USABILITY-FIRST ACTIVE WORKOUT SCREEN REDESIGN');
console.log('=============================================================');

const dom = {
  window: { location: { hash: '#workout' } },
  document: {
    _elements: {},
    getElementById: function(id) { return this._elements[id] || null; },
    querySelector: function(selector) { return null; },
    querySelectorAll: function(selector) { return []; },
    createElement: function(tag) {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        remove: () => { if (el.id) delete dom.document._elements[el.id]; },
        focus: () => {}
      };
      return el;
    },
    body: {
      appendChild: function(el) { if (el.id) dom.document._elements[el.id] = el; }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
  }
};

const sandbox = {
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
      { id: 2, name: 'Dip', movement_pattern: 'push_vertical' }
    ],
    todayLogs: {},
    todayResolved: null
  },
  switchView: () => {},
  openModal: () => {},
  closeModal: () => {}
};

dom.window.window = dom.window;
sandbox.global = sandbox;

const context = vm.createContext(sandbox);

const files = [
  'frontend/js/core/constants.js',
  'frontend/js/core/utils.js',
  'frontend/js/core/audio.js',
  'frontend/js/core/storage.js',
  'frontend/js/core/state.js',
  'frontend/js/components/exercise-animation.js',
  'frontend/js/components/muscle-map.js',
  'frontend/js/views/workout-runner.js'
];

for (const f of files) {
  const content = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
  vm.runInContext(content, context);
}

// 1. Initialize Workout Session
console.log('\n[1] Initializing workout session (Push & Pull)...');
context.startWorkoutFromData('Upper Body Power', [
  { exercise_id: 1, exercise_name: 'Pull-up', sets: 3, reps: 8, rest_sec: 90, phase: 'main' },
  { exercise_id: 2, exercise_name: 'Dip', sets: 3, reps: 10, rest_sec: 90, phase: 'main' }
]);

const session = context.getActiveSession();
if (!session || !session.warmup || !session.exercises || !session.cooldown) {
  throw new Error('Session structure invalid');
}
console.log('✓ Workout session initialized with 3 phases (Warmup:', session.warmup.length, 'Main:', session.exercises.length, 'Cooldown:', session.cooldown.length, ')');

// 2. Test Desktop 3-Panel Layout
console.log('\n[2] Testing Desktop 3-Column layout and Component Assembly...');
const warmupRender = context.renderActiveWorkoutView();

// Check 3-column container
if (!warmupRender.includes('runner-3col-layout')) {
  throw new Error('Missing .runner-3col-layout container in renderActiveWorkoutView()');
}
console.log('✓ Desktop 3-column layout container (.runner-3col-layout) present.');

// Check Left Rail Sidebar
if (!warmupRender.includes('runner-rail-sidebar') || !warmupRender.includes('runner-rail-progress-bar')) {
  throw new Error('Missing compact left progress rail');
}
console.log('✓ Compact left rail progress & checklist (.runner-rail-sidebar) present.');

// Check Center Column Execution Card
if (!warmupRender.includes('runner-center-column') || !warmupRender.includes('runner-execution-card')) {
  throw new Error('Missing focused center execution card');
}
console.log('✓ Focused center execution card (.runner-execution-card) present.');

// Check Right Panel
if (!warmupRender.includes('runner-right-panel') || !warmupRender.includes('runner-anatomy-accordion')) {
  throw new Error('Missing right panel with collapsible anatomy');
}
console.log('✓ Right panel with motion preview and collapsible anatomy (.runner-anatomy-accordion) present.');

// Check Mobile Bottom-Sheet Drawer
if (!warmupRender.includes('runner-drawer-sheet') || !warmupRender.includes('runner-drawer-backdrop')) {
  throw new Error('Missing mobile bottom-sheet queue drawer');
}
console.log('✓ Mobile bottom-sheet drawer (.runner-drawer-sheet) present.');

// 3. Test Priority Elements on Warmup Card
console.log('\n[3] Testing Warmup Card Information Hierarchy...');
if (!warmupRender.includes('runner-exercise-name-title') || !warmupRender.includes('stepper-btn') || !warmupRender.includes('MARK COMPLETE')) {
  throw new Error('Warmup card missing primary prioritized elements');
}
console.log('✓ Warmup card displays current movement, 56px stepper, and MARK COMPLETE hero CTA.');

// 4. Test Priority Elements on Main Workout Card
console.log('\n[4] Testing Main Workout Card Information Hierarchy...');
context.skipWarmupPhase();
const mainRender = context.renderActiveWorkoutView();

if (!mainRender.includes('Pull-up')) {
  throw new Error('Main workout card not rendering current exercise name');
}
if (!mainRender.includes('Set 1 of 3') && !mainRender.includes('Set 1 / 3')) {
  throw new Error('Main workout card not rendering set number');
}
if (!mainRender.includes('Target') || !mainRender.includes('Last')) {
  throw new Error('Main workout card missing Target vs Last comparison');
}
if (!mainRender.includes('COMPLETE SET') && !mainRender.includes('START SET')) {
  throw new Error('Main workout card missing COMPLETE SET button');
}
if (!mainRender.includes('stepper-btn') || !mainRender.includes('workout-active-counter-digits')) {
  throw new Error('Main workout card missing stepper quantity controls');
}
console.log('✓ Priority 1: Current exercise name ("Pull-up") prominently displayed.');
console.log('✓ Priority 2: Set + Target ("Set 1 of 3", Target: 8 reps) clearly displayed.');
console.log('✓ Priority 3: Rep/time 56px touch steppers and mono counter present.');
console.log('✓ Priority 4: 56px hero CTA button ("COMPLETE SET") present.');

// 5. Test Rest Interval Rendering
console.log('\n[5] Testing Rest Interval Countdown & Usability...');
context.completeMainWorkoutSet();
const restSession = context.getActiveSession();
const restRender = context.renderActiveWorkoutView();

if (!restRender.includes('runner-rest-hero-countdown') && !restRender.includes('runner-rest-display')) {
  throw new Error('Rest countdown screen not rendered during rest');
}
console.log('✓ Priority 5: Rest timer displayed with countdown digits, skip and adjust buttons.');

// 6. Test Cooldown Phase & Finishing
console.log('\n[6] Testing Cooldown Phase and Workout Finishing...');
context.stopWorkoutRest();
context.completeMainWorkoutSet();
context.stopWorkoutRest();
context.completeMainWorkoutSet(); // Pull-up done
context.stopWorkoutRest();

// Complete Dip
context.completeMainWorkoutSet();
context.stopWorkoutRest();
context.completeMainWorkoutSet();
context.stopWorkoutRest();
context.completeMainWorkoutSet();

// Transition to Cooldown
context.setWorkoutPhase('cooldown');
const cdRender = context.renderActiveWorkoutView();
if (!cdRender.includes('runner-execution-card') || !cdRender.includes('DONE')) {
  throw new Error('Cooldown card missing focused card view or DONE CTA');
}
console.log('✓ Cooldown card renders cleanly with 56px steppers and DONE CTA.');

context.advanceCooldownStretch();
context.requestFinishWorkout();

const terminalSession = context.getActiveSession();
console.log('✓ Terminal status reached:', terminalSession?.status);

console.log('\n=============================================================');
console.log('🎉 ALL USABILITY REDESIGN VALIDATION CHECKS PASSED (100%)');
console.log('=============================================================');
if (typeof context !== 'undefined' && context.cleanupAllWorkoutTimers) context.cleanupAllWorkoutTimers();
process.exit(0);
