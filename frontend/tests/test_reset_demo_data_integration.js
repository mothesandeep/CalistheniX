/**
 * CalistheniX — Reset Demo Data Integration Test
 * 
 * Verifies:
 * 1. Existing demo/user history, sets, logs, and weights are cleanly removed.
 * 2. Complete canonical demo dataset is recreated (24 sessions, 480 sets, 12 weight points).
 * 3. Consistent data is restored for Home, Stats, and Progress.
 * 4. Zero duplicate records upon multiple resets.
 * 5. Workout presets and catalogs remain 100% intact.
 * 6. Browser refresh after reset does not create duplicate records.
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const path = require('path');

console.log('=============================================================');
console.log('🧪 RUNNING RESET DEMO DATA INTEGRATION TEST SUITE');
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
    { id: 13, name: 'Pull-ups Wide Grip', category: 'pull', level: 2, type: 'reps' },
    { id: 14, name: 'Chin-ups', category: 'pull', level: 2, type: 'reps' }
  ],
  workouts: [
    { id: 'push-a', name: 'Push A', category: 'Push', exercises: [1, 2, 3] },
    { id: 'pull-a', name: 'Pull A', category: 'Pull', exercises: [12, 13, 14] }
  ],
  splits: [
    { id: 1, name: '5-Day PPL', is_active: 1 }
  ],
  workoutSessions: [],
  dashboardSummary: null,
  dashboardRecords: [],
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
  getWorkoutSessions: async () => {
    const raw = mockLocalStorage.getItem('cx_sessions');
    return raw ? JSON.parse(raw) : [];
  },
  resetDemoData: async () => ({ status: 'success', sessions_count: 24 }),
  seedDemoData: async () => ({ status: 'success', sessions_count: 24 })
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
    loadDashboardSummary: async () => { loadDashboardSummaryCalls++; },
    loadWorkoutSessions: async () => {
      loadWorkoutSessionsCalls++;
      const raw = mockLocalStorage.getItem('cx_sessions');
      mockState.workoutSessions = raw ? JSON.parse(raw) : [];
      return mockState.workoutSessions;
    },
    loadExercises: async () => {},
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

  // 1. Setup dirty/modified user state
  store['cx_session_custom_001'] = JSON.stringify({ id: 'custom_001', routine: 'Modified Session' });
  store['cx_pending_session_002'] = JSON.stringify({ id: 'pending_002' });
  store['cx_workout_history'] = JSON.stringify([{ id: 'custom_001' }]);
  store['cx_completed_sessions'] = JSON.stringify([{ id: 'custom_001' }]);
  store['cx_today_logs'] = JSON.stringify({ '1': [{ reps: 99 }] });
  store['cx_quick_checkins'] = JSON.stringify([{ id: 'qc1' }]);
  store['cx_prs'] = JSON.stringify({ '1': { reps: 50 } });
  store['cx_weight_history'] = JSON.stringify([{ date: '2026-09-01', weight: 99.9 }]);
  store['cx_target_weight'] = '65';
  store['cx_latest_weight'] = '99.9';
  store['cx_active_session'] = JSON.stringify({ id: 'active_1' });
  store['cx_active_workout'] = JSON.stringify({ id: 'active_w' });
  store['cx_current_workout'] = 'Push A';
  store['cx_theme'] = 'dark';
  store['cx_accent_color'] = '#FF5D5D';

  const initialPresetsWorkouts = JSON.stringify(mockState.workouts);
  const initialPresetsExercises = JSON.stringify(mockState.exercises);
  const initialPresetsSplits = JSON.stringify(mockState.splits);

  // 2. Trigger Reset Demo Data
  console.log('  -> Step 1: Triggering resetDemoData()...');
  await sandbox.resetDemoData();

  // 3. Verify dirty keys removed and canonical data restored
  assert.strictEqual(store['cx_session_custom_001'], undefined, 'Custom session removed');
  assert.strictEqual(store['cx_pending_session_002'], undefined, 'Pending session removed');
  assert.strictEqual(store['cx_today_logs'], undefined, 'Today logs removed');
  assert.strictEqual(store['cx_quick_checkins'], undefined, 'Quick checkins removed');
  assert.strictEqual(store['cx_prs'], undefined, 'Dirty PRs removed');
  assert.strictEqual(store['cx_active_session'], undefined, 'Active session cleared');
  assert.strictEqual(store['cx_active_workout'], undefined, 'Active workout cleared');
  assert.strictEqual(store['cx_current_workout'], undefined, 'Current workout cleared');

  // Verify canonical demo sessions
  const sessions = JSON.parse(store['cx_sessions']);
  assert.strictEqual(sessions.length, 24, 'Exactly 24 canonical sessions restored');
  assert.strictEqual(JSON.parse(store['cx_workout_history']).length, 24, 'cx_workout_history has 24 sessions');
  assert.strictEqual(JSON.parse(store['cx_completed_sessions']).length, 24, 'cx_completed_sessions has 24 sessions');

  // Count total sets in restored sessions
  let totalSets = 0;
  sessions.forEach(s => {
    (s.exercises || []).forEach(e => {
      totalSets += (e.sets || []).length;
    });
  });
  assert.strictEqual(totalSets, 480, 'All 480 completed sets restored in canonical sessions');

  // Verify weight history
  const weights = JSON.parse(store['cx_weight_history']);
  assert.strictEqual(weights.length, 12, '12 canonical weight data points restored');
  assert.strictEqual(store['cx_latest_weight'], '78.3', 'Latest weight is 78.3 kg');
  assert.strictEqual(store['cx_target_weight'], '77', 'Target weight is 77 kg');
  assert.strictEqual(store['cx_initialized'], '1', 'cx_initialized is 1');
  assert.strictEqual(store['cx_demo_data'], '1', 'cx_demo_data is 1');

  // Verify user settings preserved
  assert.strictEqual(store['cx_theme'], 'dark', 'Theme setting preserved');
  assert.strictEqual(store['cx_accent_color'], '#FF5D5D', 'Accent color preserved');

  // Verify in-memory state updated
  assert.strictEqual(mockState.workoutSessions.length, 24, 'state.workoutSessions updated to 24');
  assert.strictEqual(mockState.weightHistory.length, 12, 'state.weightHistory updated to 12');
  assert.strictEqual(mockState.targetWeight, 77.0, 'state.targetWeight updated to 77');
  assert.strictEqual(mockState.latestWeight, 78.3, 'state.latestWeight updated to 78.3');
  assert.strictEqual(mockState.activeSession, null, 'state.activeSession reset to null');

  // Verify workout presets NOT touched
  assert.strictEqual(JSON.stringify(mockState.workouts), initialPresetsWorkouts, 'Workouts preset intact');
  assert.strictEqual(JSON.stringify(mockState.exercises), initialPresetsExercises, 'Exercises preset intact');
  assert.strictEqual(JSON.stringify(mockState.splits), initialPresetsSplits, 'Splits preset intact');

  console.log('  ✓ Step 1 passed: Dirty data removed, canonical 24 sessions & 480 sets restored, presets untouched.');

  // 4. Test Multiple Resets (Zero Duplicates)
  console.log('  -> Step 2: Testing multiple consecutive resets (idempotency)...');
  for (let i = 1; i <= 5; i++) {
    await sandbox.resetDemoData();
    const currSessions = JSON.parse(store['cx_sessions']);
    assert.strictEqual(currSessions.length, 24, `Reset iteration ${i}: sessions count strictly 24`);
    const currWeights = JSON.parse(store['cx_weight_history']);
    assert.strictEqual(currWeights.length, 12, `Reset iteration ${i}: weight count strictly 12`);
    
    // Check specific keys
    const sessionKeys = Object.keys(store).filter(k => k.startsWith('cx_session_'));
    assert.strictEqual(sessionKeys.length, 24, `Reset iteration ${i}: exactly 24 cx_session_* keys`);
  }
  console.log('  ✓ Step 2 passed: 5 consecutive resets produce zero duplicates.');

  // 5. Test Browser Refresh / Reload
  console.log('  -> Step 3: Simulating app refresh after reset...');
  assert.strictEqual(sandbox.shouldInitializeDemoData(), false, 'shouldInitializeDemoData() is false because data already present');
  const initRes = await sandbox.initializeDemoData();
  assert.strictEqual(initRes.seeded, false, 'Bootstrap initialization skipped on refresh');
  assert.strictEqual(JSON.parse(store['cx_sessions']).length, 24, 'Sessions count remains 24 after reload');
  assert.strictEqual(JSON.parse(store['cx_weight_history']).length, 12, 'Weight count remains 12 after reload');
  console.log('  ✓ Step 3 passed: App refresh creates zero duplicates.\n');
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
  console.log('🎉 ALL RESET DEMO DATA INTEGRATION TESTS PASSED 100%!');
  console.log('=============================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
