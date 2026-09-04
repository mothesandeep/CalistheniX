/**
 * CalistheniX — Reset Everything Verification Test Suite
 * 
 * Verifies:
 * 1. Adding dirty user data, custom sessions, completed sets, PRs, body-weight logs, and active session.
 * 2. Triggering executeResetEverything().
 * 3. Verifying ALL user/demo workout history, sessions, sets, logs, and weights are deleted.
 * 4. Verifying ALL existing workout presets (workouts, exercises, splits) are untouched.
 * 5. Verifying demo data is NOT automatically recreated immediately.
 * 6. Simulating app refresh/reopen and verifying data remains deleted while presets still exist.
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const path = require('path');

console.log('=============================================================');
console.log('🧪 RUNNING RESET EVERYTHING VERIFICATION TEST SUITE');
console.log('=============================================================\n');

let store = {};
const mockLocalStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  key: (i) => Object.keys(store)[i] || null,
  get length() { return Object.keys(store).length; }
};

const mockDocElement = {
  attrs: {},
  style: {
    properties: {},
    setProperty(k, v) { this.properties[k] = v; },
    getPropertyValue(k) { return this.properties[k] || ''; }
  },
  setAttribute: (k, v) => { mockDocElement.attrs[k] = v; },
  getAttribute: (k) => mockDocElement.attrs[k] || null
};

const mockElements = {};
function createMockElement(tag = 'div', id = '') {
  return {
    id,
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] || null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const mockDocument = {
  documentElement: mockDocElement,
  body: createMockElement('body', 'body'),
  getElementById(id) {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement('div', id);
    }
    return mockElements[id];
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(tag) { return createMockElement(tag); },
  addEventListener() {}
};

const mockState = {
  view: 'settings',
  exercises: [
    { id: 1, name: 'Diamond Push-ups', category: 'push', level: 1, type: 'reps' },
    { id: 2, name: 'Wide Push-ups', category: 'push', level: 1, type: 'reps' },
    { id: 3, name: 'Triceps Dips', category: 'push', level: 2, type: 'reps' },
    { id: 12, name: 'Dead Hang', category: 'pull', level: 1, type: 'duration' },
    { id: 13, name: 'Pull-ups Wide Grip', category: 'pull', level: 2, type: 'reps' }
  ],
  workouts: [
    { id: 'push-a', name: 'Push A', category: 'Push', exercises: [1, 2, 3] },
    { id: 'pull-a', name: 'Pull A', category: 'Pull', exercises: [12, 13] }
  ],
  splits: [
    { id: 1, name: '5-Day PPL', is_active: 1 }
  ],
  workoutSessions: [],
  dashboardSummary: null,
  dashboardRecords: [],
  dashboardActivity: [],
  weightHistory: [],
  targetWeight: 77.0,
  latestWeight: null,
  activeSession: null,
  todayLogs: {},
  historyLogs: null
};

let toastMessages = [];
let loadDashboardSummaryCalls = 0;
let loadWorkoutSessionsCalls = 0;
let renderCalls = 0;

const mockAPI = {
  baseUrl: '/api',
  invalidateCacheCalls: 0,
  invalidateCache() { this.invalidateCacheCalls++; },
  getExercises: async () => mockState.exercises,
  getWorkouts: async () => mockState.workouts,
  getSplits: async () => mockState.splits,
  getWorkoutSessions: async () => {
    const raw = mockLocalStorage.getItem('cx_sessions');
    return raw ? JSON.parse(raw) : [];
  },
  resetEverything: async () => ({ status: 'success' })
};

async function testTarget(demoDataPath, settingsPath, label) {
  console.log(`Testing Target: ${label}`);
  store = {};
  toastMessages = [];
  loadDashboardSummaryCalls = 0;
  loadWorkoutSessionsCalls = 0;
  renderCalls = 0;
  mockAPI.invalidateCacheCalls = 0;

  const targetSandbox = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    JSON,
    Math,
    parseInt,
    parseFloat,
    Array,
    Object,
    RegExp,
    document: mockDocument,
    localStorage: mockLocalStorage,
    state: mockState,
    API: mockAPI,
    API_BASE: 'http://127.0.0.1:5001',
    showToast: (msg) => { toastMessages.push(msg); },
    render: () => { renderCalls++; },
    renderApp: () => { renderCalls++; },
    initThemeAndAccent: () => {},
    closeSettingsModal: () => {},
    closeSettingsSheet: () => {},
    loadDashboardSummary: async () => { loadDashboardSummaryCalls++; },
    loadWorkoutSessions: async () => {
      loadWorkoutSessionsCalls++;
      const raw = mockLocalStorage.getItem('cx_sessions');
      mockState.workoutSessions = raw ? JSON.parse(raw) : [];
      return mockState.workoutSessions;
    },
    loadExercises: async () => {},
    loadSplits: async () => {},
    loadWorkouts: async () => {},
    switchView: (v) => { mockState.view = v; },
    renderIcon: (name, cls = '') => `<span class="icon-${name} ${cls}"></span>`
  };
  targetSandbox.window = targetSandbox;
  targetSandbox.global = targetSandbox;

  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const demoDataCode = fs.readFileSync(demoDataPath, 'utf8');
  const settingsCode = fs.readFileSync(settingsPath, 'utf8');

  vm.createContext(targetSandbox);
  vm.runInContext(constantsCode, targetSandbox);
  vm.runInContext(demoDataCode, targetSandbox);
  vm.runInContext(settingsCode, targetSandbox);

  const sandbox = targetSandbox;

  // Preserve initial preset references
  const initialPresetsWorkouts = JSON.stringify(mockState.workouts);
  const initialPresetsExercises = JSON.stringify(mockState.exercises);
  const initialPresetsSplits = JSON.stringify(mockState.splits);

  // 1. Setup Data (user + demo history)
  console.log('  -> Step 1: Adding user workout history, weights, PRs, and active session...');
  store['cx_session_demo_01'] = JSON.stringify({ id: 'demo_01', routine: 'Push A' });
  store['cx_session_user_02'] = JSON.stringify({ id: 'user_02', routine: 'My Split' });
  store['cx_pending_session_03'] = JSON.stringify({ id: 'pending_03' });
  store['cx_sessions'] = JSON.stringify([{ id: 'demo_01' }, { id: 'user_02' }]);
  store['cx_workout_history'] = JSON.stringify([{ id: 'demo_01' }, { id: 'user_02' }]);
  store['cx_completed_sessions'] = JSON.stringify([{ id: 'demo_01' }, { id: 'user_02' }]);
  store['cx_today_logs'] = JSON.stringify({ '1': [{ reps: 15, weight_kg: 20 }] });
  store['cx_quick_checkins'] = JSON.stringify([{ id: 'qc1', date: '2026-09-01' }]);
  store['cx_prs'] = JSON.stringify({ '1': { reps: 20 } });
  store['cx_weight_history'] = JSON.stringify([
    { date: '2026-08-01', weight: 80.0 },
    { date: '2026-08-15', weight: 79.2 }
  ]);
  store['cx_target_weight'] = '75';
  store['cx_latest_weight'] = '79.2';
  store['cx_active_session'] = JSON.stringify({ id: 'active_in_prog', status: 'in_progress' });
  store['cx_active_workout'] = JSON.stringify({ id: 'push-a' });
  store['cx_current_workout'] = 'Push A';

  mockState.workoutSessions = [{ id: 'demo_01' }, { id: 'user_02' }];
  mockState.weightHistory = [{ date: '2026-08-01', weight: 80.0 }];
  mockState.latestWeight = 79.2;
  mockState.targetWeight = 75;
  mockState.activeSession = { id: 'active_in_prog' };
  mockState.todayLogs = { '1': [{ reps: 15 }] };

  // 2. Execute Reset Everything
  console.log('  -> Step 2: Executing executeResetEverything()...');
  await sandbox.executeResetEverything();

  // 3. Verify ALL history & logs are deleted
  const remainingKeys = Object.keys(store);
  const sessionKeys = remainingKeys.filter(k => k.startsWith('cx_session_') || k.startsWith('cx_pending_'));
  assert.strictEqual(sessionKeys.length, 0, 'Zero session keys remaining');
  assert.strictEqual(store['cx_sessions'], undefined, 'cx_sessions removed');
  assert.strictEqual(store['cx_workout_history'], undefined, 'cx_workout_history removed');
  assert.strictEqual(store['cx_completed_sessions'], undefined, 'cx_completed_sessions removed');
  assert.strictEqual(store['cx_today_logs'], undefined, 'cx_today_logs removed');
  assert.strictEqual(store['cx_quick_checkins'], undefined, 'cx_quick_checkins removed');
  assert.strictEqual(store['cx_prs'], undefined, 'cx_prs removed');
  assert.strictEqual(store['cx_active_session'], undefined, 'cx_active_session removed');
  assert.strictEqual(store['cx_active_workout'], undefined, 'cx_active_workout removed');
  assert.strictEqual(store['cx_current_workout'], undefined, 'cx_current_workout removed');

  const weightHistory = JSON.parse(store['cx_weight_history'] || '[]');
  assert.strictEqual(weightHistory.length, 0, 'Weight history is completely empty array []');
  assert.strictEqual(store['cx_latest_weight'], undefined, 'cx_latest_weight cleared');
  assert.strictEqual(store['cx_user_cleared'], '1', 'cx_user_cleared is marked 1');
  assert.strictEqual(store['cx_demo_data'], '0', 'cx_demo_data is marked 0');

  // Verify runtime in-memory state
  assert.strictEqual(mockState.workoutSessions.length, 0, 'state.workoutSessions is empty array');
  assert.strictEqual(mockState.weightHistory.length, 0, 'state.weightHistory is empty array');
  assert.strictEqual(mockState.latestWeight, null, 'state.latestWeight is null');
  assert.strictEqual(mockState.activeSession, null, 'state.activeSession is null');
  assert.strictEqual(Object.keys(mockState.todayLogs).length, 0, 'state.todayLogs is empty object');
  assert.strictEqual(mockState.dashboardSummary.streak_days, 0, 'streak is 0');
  assert.strictEqual(mockState.dashboardSummary.week_sessions, 0, 'week sessions is 0');

  // Verify workout presets are 100% UNTOUCHED
  assert.strictEqual(JSON.stringify(mockState.workouts), initialPresetsWorkouts, 'Workout presets unchanged');
  assert.strictEqual(JSON.stringify(mockState.exercises), initialPresetsExercises, 'Exercise library unchanged');
  assert.strictEqual(JSON.stringify(mockState.splits), initialPresetsSplits, 'Split presets unchanged');

  console.log('  ✓ Step 2 passed: All user/demo data deleted, state reset to 0, workout presets intact.');

  // 4. Test Demo Resurrection Prevention on Refresh
  console.log('  -> Step 3: Simulating app refresh / reopen...');
  assert.strictEqual(sandbox.shouldInitializeDemoData(), false, 'shouldInitializeDemoData() must return false');
  
  const reinitResult = await sandbox.initializeDemoData();
  assert.strictEqual(reinitResult.seeded, false, 'initializeDemoData() must not reseed');
  
  const postRefreshKeys = Object.keys(store).filter(k => k.startsWith('cx_session_'));
  assert.strictEqual(postRefreshKeys.length, 0, 'Post-refresh: zero session keys');
  assert.strictEqual(JSON.parse(store['cx_weight_history']).length, 0, 'Post-refresh: weight history remains empty');
  
  // Presets still exist
  assert.strictEqual(JSON.stringify(mockState.workouts), initialPresetsWorkouts, 'Post-refresh: Workout presets unchanged');
  assert.strictEqual(JSON.stringify(mockState.exercises), initialPresetsExercises, 'Post-refresh: Exercise library unchanged');
  
  console.log('  ✓ Step 3 passed: Refresh maintains clean deleted state without demo resurrection.\n');
}

async function run() {
  await testTarget(
    path.join(__dirname, '../js/core/demo-data.js'),
    path.join(__dirname, '../js/views/settings.js'),
    'Root Frontend (frontend/js/)'
  );

  await testTarget(
    path.join(__dirname, '../src/js/utils/demo-data.js'),
    path.join(__dirname, '../src/js/features/settings.js'),
    'Modular Frontend (frontend/src/)'
  );

  console.log('=============================================================');
  console.log('🎉 ALL RESET EVERYTHING VERIFICATION CHECKS PASSED 100%!');
  console.log('=============================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
