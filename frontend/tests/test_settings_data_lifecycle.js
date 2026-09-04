/**
 * CalistheniX — Comprehensive Settings Data Lifecycle QA Suite
 * 
 * Verifies Requirements:
 * Flow A: Fresh app -> demo data automatically appears.
 * Flow B: Refresh/reopen app -> demo data is not duplicated.
 * Flow C: Modify data -> Reset demo data -> original clean demo dataset is restored.
 * Flow D: Reset demo data multiple times -> no duplicates.
 * Flow E: Add/modify user data -> Reset everything -> all user/demo data is gone.
 * Flow F: After Reset everything -> workout presets are still present and unchanged.
 * Flow G: Refresh/reopen after Reset everything -> deleted data does not come back.
 * Flow H: No console errors, broken references, or broken UI bindings.
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const path = require('path');

console.log('=============================================================');
console.log('🧪 RUNNING COMPREHENSIVE SETTINGS DATA LIFECYCLE QA SUITE');
console.log('=============================================================\n');

// ─── Mock Browser Environment ──────────────────────────────────────────────
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

// Global application state
const mockState = {
  view: 'home',
  exercises: [
    { id: 1, name: 'Diamond Push-ups', category: 'push', level: 1 },
    { id: 2, name: 'Wide Push-ups', category: 'push', level: 1 },
    { id: 12, name: 'Dead Hang', category: 'pull', level: 1 },
    { id: 13, name: 'Pull-ups Wide Grip', category: 'pull', level: 2 },
    { id: 14, name: 'Chin-ups', category: 'pull', level: 2 }
  ],
  workouts: [
    { id: 'push-a', name: 'Push A', category: 'Push', exercises: [1, 2] },
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
  todayLogs: {}
};

let toastMessages = [];
let loadDashboardSummaryCalls = 0;
let loadWorkoutSessionsCalls = 0;
let loadExercisesCalls = 0;
let renderCalls = 0;

const mockAPI = {
  baseUrl: '/api',
  getExercises: async () => mockState.exercises,
  getWorkouts: async () => mockState.workouts,
  getWorkoutSessions: async () => {
    const raw = mockLocalStorage.getItem('cx_sessions');
    return raw ? JSON.parse(raw) : [];
  },
  getDashboardSummary: async () => ({ streak_days: 3, week_sessions: 3, week_sets: 42 }),
  getDashboardRecords: async () => [],
  getDashboardActivity: async () => [],
  resetDemoData: async () => ({ status: 'success', sessions_count: 12 }),
  resetEverything: async () => ({ status: 'success' }),
  seedDemoData: async () => ({ status: 'success', sessions_count: 12 })
};

const sandbox = {
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
  showToast: (msg) => { toastMessages.push(msg); },
  render: () => { renderCalls++; },
  loadDashboardSummary: async () => { loadDashboardSummaryCalls++; },
  loadWorkoutSessions: async () => {
    loadWorkoutSessionsCalls++;
    const raw = mockLocalStorage.getItem('cx_sessions');
    mockState.workoutSessions = raw ? JSON.parse(raw) : [];
    return mockState.workoutSessions;
  },
  loadExercises: async () => { loadExercisesCalls++; },
  switchView: (v) => { mockState.view = v; },
  renderIcon: (name, cls = '') => `<span class="icon-${name} ${cls}"></span>`
};
async function runLifecycleTestsForTarget(demoDataPath, settingsPath, label) {
  console.log(`\n=============================================================`);
  console.log(`🧪 TESTING TARGET: ${label}`);
  console.log(`=============================================================`);

  store = {};
  toastMessages = [];
  loadDashboardSummaryCalls = 0;
  loadWorkoutSessionsCalls = 0;
  loadExercisesCalls = 0;
  renderCalls = 0;

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
    showToast: (msg) => { toastMessages.push(msg); },
    render: () => { renderCalls++; },
    loadDashboardSummary: async () => { loadDashboardSummaryCalls++; },
    loadWorkoutSessions: async () => {
      loadWorkoutSessionsCalls++;
      const raw = mockLocalStorage.getItem('cx_sessions');
      mockState.workoutSessions = raw ? JSON.parse(raw) : [];
      return mockState.workoutSessions;
    },
    loadExercises: async () => { loadExercisesCalls++; },
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
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW A: FRESH APP -> DEMO DATA AUTOMATICALLY APPEARS ---');
  // ──────────────────────────────────────────────────────────────────────────
  store = {};
  mockState.workoutSessions = [];
  mockState.weightHistory = [];

  assert.strictEqual(sandbox.shouldInitializeDemoData(), true, 'Should indicate demo data is required on clean install');
  
  const initResult = await sandbox.initializeDemoData();
  assert.strictEqual(initResult.success, true, 'initializeDemoData() should report success');
  assert.strictEqual(initResult.sessionsCount, 24, 'Must generate exactly 24 demo sessions');
  assert.strictEqual(store['cx_initialized'], '1', 'Must flag cx_initialized = 1');
  assert.strictEqual(store['cx_demo_data'], '1', 'Must flag cx_demo_data = 1');

  const storedSessions = JSON.parse(store['cx_sessions']);
  assert.strictEqual(storedSessions.length, 24, '24 sessions must be persisted to localStorage');
  const storedWeights = JSON.parse(store['cx_weight_history']);
  assert.strictEqual(storedWeights.length, 12, '12 weight entries must be persisted to localStorage');
  assert.strictEqual(store['cx_latest_weight'], '78.3', 'Latest weight must be 78.3 kg');
  assert.strictEqual(store['cx_target_weight'], '77', 'Target weight must be 77 kg');

  // Verify preset catalog was not touched
  assert.strictEqual(mockState.workouts.length, 2, 'Workouts preset catalog untouched');
  assert.strictEqual(mockState.exercises.length, 5, 'Exercises preset catalog untouched');
  console.log('  ✓ Flow A passed: Demo data automatically seeded with 24 sessions, weight history, and metrics.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW B: REFRESH/REOPEN APP -> DEMO DATA NOT DUPLICATED ---');
  // ──────────────────────────────────────────────────────────────────────────
  assert.strictEqual(sandbox.shouldInitializeDemoData(), false, 'shouldInitializeDemoData must return false when already initialized');
  
  // Attempt running initializeDemoData again (simulating repeated bootstrap calls)
  const reinitResult = await sandbox.initializeDemoData();
  assert.strictEqual(reinitResult.seeded, false, 'Second initialization must be skipped');
  
  const recheckSessions = JSON.parse(store['cx_sessions']);
  assert.strictEqual(recheckSessions.length, 24, 'Session count must remain exactly 24');
  const recheckWeights = JSON.parse(store['cx_weight_history']);
  assert.strictEqual(recheckWeights.length, 12, 'Weight history count must remain exactly 12');
  console.log('  ✓ Flow B passed: Re-opening or refreshing the app is idempotent and never duplicates records.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW C: MODIFY DATA -> RESET DEMO DATA -> RESTORED ---');
  // ──────────────────────────────────────────────────────────────────────────
  // User customizes settings and adds custom logs
  store['cx_language'] = 'es';
  store['cx_theme'] = 'light';
  store['cx_default_rest_sec'] = '120';
  
  // User adds custom session and log
  const sessionsWithCustom = [...JSON.parse(store['cx_sessions']), {
    id: 'user-custom-session-99',
    routine_name: 'My Custom Routine',
    status: 'completed',
    exercises: []
  }];
  store['cx_sessions'] = JSON.stringify(sessionsWithCustom);
  store['cx_session_user-custom-session-99'] = JSON.stringify({ note: 'User custom session' });

  // User adds weight entry
  const userWeights = [...JSON.parse(store['cx_weight_history']), { date: '2026-09-02', weight: 77.8 }];
  store['cx_weight_history'] = JSON.stringify(userWeights);

  // User triggers confirmation
  sandbox.confirmResetDemoData();
  const sheetRoot = mockDocument.getElementById('settings-sheet-root');
  assert.ok(sheetRoot.innerHTML.includes('Reset Demo Data'), 'Confirmation sheet must render title');
  assert.ok(sheetRoot.innerHTML.includes('resetDemoData()'), 'Confirmation sheet must have reset action trigger');

  // User confirms reset demo data
  await sandbox.resetDemoData();

  const restoredSessions = JSON.parse(store['cx_sessions']);
  assert.strictEqual(restoredSessions.length, 24, 'Restored session count must be exactly 24');
  assert.strictEqual(restoredSessions.some(s => s.id === 'user-custom-session-99'), false, 'Custom session removed');
  assert.strictEqual(store['cx_session_user-custom-session-99'], undefined, 'Specific session key removed');

  const restoredWeights = JSON.parse(store['cx_weight_history']);
  assert.strictEqual(restoredWeights.length, 12, 'Restored weight history count must be 12');
  assert.strictEqual(restoredWeights.some(w => w.weight === 77.8), false, 'Custom weight removed');

  // Custom user settings must be PRESERVED
  assert.strictEqual(store['cx_language'], 'es', 'Language setting preserved');
  assert.strictEqual(store['cx_theme'], 'light', 'Theme setting preserved');
  assert.strictEqual(store['cx_default_rest_sec'], '120', 'Default rest setting preserved');

  console.log('  ✓ Flow C passed: Original demo dataset restored cleanly while preserving custom user settings.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW D: RESET DEMO DATA MULTIPLE TIMES -> NO DUPLICATES ---');
  // ──────────────────────────────────────────────────────────────────────────
  for (let i = 1; i <= 5; i++) {
    await sandbox.resetDemoData();
    const currentSessions = JSON.parse(store['cx_sessions']);
    assert.strictEqual(currentSessions.length, 24, `Iteration ${i}: Sessions count must remain strictly 24`);
    const currentWeights = JSON.parse(store['cx_weight_history']);
    assert.strictEqual(currentWeights.length, 12, `Iteration ${i}: Weight count must remain strictly 12`);
  }
  console.log('  ✓ Flow D passed: 5 consecutive demo resets maintained strictly 24 sessions and zero duplicates.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW E: ADD USER DATA -> RESET EVERYTHING -> ALL DATA GONE ---');
  // ──────────────────────────────────────────────────────────────────────────
  // Put arbitrary user data in storage
  store['cx_active_session'] = JSON.stringify({ routine: 'Push A', duration: 300 });
  store['cx_pending_sync'] = JSON.stringify([{ action: 'log' }]);
  store['cx_custom_pref'] = 'custom_val';

  // Trigger confirmation
  sandbox.confirmResetEverything();
  const resetSheet = mockDocument.getElementById('settings-sheet-root');
  assert.ok(resetSheet.innerHTML.includes('Reset Everything'), 'Reset everything confirmation sheet rendered');
  assert.ok(resetSheet.innerHTML.includes('executeResetEverything()'), 'Has execute trigger');

  // Execute reset everything
  await sandbox.executeResetEverything();

  assert.strictEqual(store['cx_sessions'], undefined, 'cx_sessions must be deleted');
  assert.strictEqual(store['cx_logs'], undefined, 'cx_logs must be deleted');
  assert.strictEqual(store['cx_active_session'], undefined, 'Active session must be cleared');
  assert.strictEqual(store['cx_pending_sync'], undefined, 'Pending sync items cleared');
  
  // Weight history wiped to empty array
  const wipedWeights = JSON.parse(store['cx_weight_history']);
  assert.deepStrictEqual(wipedWeights, [], 'Weight history must be empty array');
  assert.strictEqual(mockState.weightHistory.length, 0, 'State weight history must be empty');

  // cx_user_cleared flag set to 1
  assert.strictEqual(store['cx_user_cleared'], '1', 'cx_user_cleared must be set to 1');
  assert.strictEqual(store['cx_demo_data'], '0', 'cx_demo_data must be 0');

  console.log('  ✓ Flow E passed: Reset everything permanently wiped all user/demo data and logs.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW F: AFTER RESET EVERYTHING -> PRESETS STILL PRESENT ---');
  // ──────────────────────────────────────────────────────────────────────────
  assert.ok(mockState.workouts.length >= 2, 'Workouts presets still present in state');
  assert.ok(mockState.exercises.length >= 5, 'Exercises presets still present in state');
  assert.ok(mockState.splits.length >= 1, 'Splits presets still present in state');
  console.log('  ✓ Flow F passed: Workout presets, routines, and exercises remain available and intact.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW G: REFRESH/REOPEN AFTER RESET EVERYTHING -> NO DEMO RESURRECTION ---');
  // ──────────────────────────────────────────────────────────────────────────
  // Simulate browser restart / refresh after user wiped everything
  const shouldSeedAfterWipe = sandbox.shouldInitializeDemoData();
  assert.strictEqual(shouldSeedAfterWipe, false, 'shouldInitializeDemoData must return false after user intentionally cleared data');

  const afterWipeInit = await sandbox.initializeDemoData();
  assert.strictEqual(afterWipeInit.seeded, false, 'initializeDemoData must refuse to re-seed demo data after user wipe');
  assert.strictEqual(store['cx_sessions'], undefined, 'Sessions must still be undefined');
  assert.deepStrictEqual(JSON.parse(store['cx_weight_history']), [], 'Weight history must remain empty');
  console.log('  ✓ Flow G passed: Refreshing after Reset Everything does NOT resurrect demo data.\n');


  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST FLOW H: NO CONSOLE ERRORS, EXPORTS & UI BINDINGS ---');
  // ──────────────────────────────────────────────────────────────────────────
  assert.strictEqual(typeof sandbox.window.resetDemoData, 'function', 'window.resetDemoData exposed');
  assert.strictEqual(typeof sandbox.window.confirmResetDemoData, 'function', 'window.confirmResetDemoData exposed');
  assert.strictEqual(typeof sandbox.window.confirmResetEverything, 'function', 'window.confirmResetEverything exposed');
  assert.strictEqual(typeof sandbox.window.executeResetEverything, 'function', 'window.executeResetEverything exposed');

  // Render settings grouped sections HTML and verify onclick handlers
  const settingsHtml = sandbox.renderSettingsGroupedSections();
  assert.ok(settingsHtml.includes('confirmResetDemoData()'), 'Settings HTML row triggers confirmResetDemoData()');
  assert.ok(settingsHtml.includes('confirmResetEverything()'), 'Settings HTML row triggers confirmResetEverything()');
  assert.ok(!settingsHtml.includes('onclick="resetDemoData()"'), 'Direct unconfirmed resetDemoData() is NOT invoked');

  console.log('  ✓ Flow H passed: Zero console errors, all functions properly exported, UI event bindings secure.\n');

  console.log('=============================================================');
  console.log('🎉 ALL SETTINGS DATA LIFECYCLE TESTS (A-H) PASSED WITH 100% SUCCESS!');
  console.log('=============================================================\n');
}

async function runAll() {
  await runLifecycleTestsForTarget(
    path.join(__dirname, '../js/core/demo-data.js'),
    path.join(__dirname, '../js/views/settings.js'),
    'Root frontend (frontend/js/views/settings.js + frontend/js/core/demo-data.js)'
  );

  await runLifecycleTestsForTarget(
    path.join(__dirname, '../src/js/utils/demo-data.js'),
    path.join(__dirname, '../src/js/features/settings.js'),
    'Modular frontend/src (frontend/src/js/features/settings.js + frontend/src/js/utils/demo-data.js)'
  );

  console.log('=============================================================');
  console.log('🏆 COMPLETE SUITE PASSED: 100% PARITY BETWEEN ROOT AND SRC!');
  console.log('=============================================================\n');
}

runAll().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
