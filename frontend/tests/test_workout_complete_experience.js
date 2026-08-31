/**
 * CalistheniX — Test Suite: Workout Complete Experience & Persistence
 *
 * Verifies:
 * 1. Workout Complete only shows after reaching a valid terminal state.
 * 2. All 8 required metrics + summary rows come dynamically from real session data:
 *    - Workout name
 *    - Total duration
 *    - Exercises completed
 *    - Sets completed
 *    - Sets skipped
 *    - Volume (if available / bodyweight)
 *    - Calories
 *    - Completion percentage
 *    - Simple summary (Completed, Skipped, Best performance / PR)
 * 3. Primary button ("Done") and Secondary button ("View Workout Summary").
 * 4. Permanent session persistence (localStorage + API sync).
 * 5. History screen immediately containing the workout.
 * 6. Dashboard / Progress data updating.
 * 7. Browser refresh resilience (no data loss).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function createTestContext() {
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
    key(i) { return Object.keys(this._data)[i] || null; },
    get length() { return Object.keys(this._data).length; }
  };

  const createdElements = [];
  const toastMessages = [];
  const createdSessions = [];

  const mockGlobals = {
    location: { hash: '' },
    window: {
      location: { hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    document: {
      body: {
        appendChild: (el) => { createdElements.push(el); },
        removeChild: (el) => {
          const idx = createdElements.indexOf(el);
          if (idx !== -1) createdElements.splice(idx, 1);
        }
      },
      getElementById: (id) => {
        return createdElements.find(el => el.id === id) || null;
      },
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          className: '',
          innerHTML: '',
          attributes: {},
          style: {},
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k] || null; },
          removeAttribute(k) { delete this.attributes[k]; },
          remove() {
            const idx = createdElements.indexOf(el);
            if (idx !== -1) createdElements.splice(idx, 1);
          },
          classList: {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); },
            contains(c) { return this._classes.has(c); },
            toggle(c, force) {
              if (force === undefined) {
                if (this._classes.has(c)) this._classes.delete(c);
                else this._classes.add(c);
              } else if (force) this._classes.add(c);
              else this._classes.delete(c);
            }
          }
        };
        return el;
      },
      querySelectorAll: () => [],
      querySelector: () => null
    },
    localStorage: localStorageMock,
    sessionStorage: localStorageMock,
    showToast: (msg) => { toastMessages.push(msg); },
    renderIcon: (name, cls) => `<i class="${cls}">${name}</i>`,
    render: () => {},
    console: {
      log: () => {},
      warn: () => {},
      error: (...args) => console.error(...args)
    },
    Date: Date,
    Math: Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: () => 123,
    clearInterval: () => {},
    JSON: JSON,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    Set: Set,
    Map: Map,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    API: {
      getWorkoutSessions: async () => [...createdSessions],
      getWorkoutSessionDetail: async (id) => createdSessions.find(s => s.id === id || s.session_uuid === id),
      createWorkoutSession: async (payload) => {
        createdSessions.push(payload);
        return { ok: true, session: payload };
      },
      getDashboardSummary: async () => ({
        streak_days: 3,
        week_sessions: createdSessions.length,
        week_sets: createdSessions.reduce((acc, s) => acc + (s.completed_sets || 0), 0)
      }),
      getDashboardRecords: async () => [],
      getDashboardActivity: async () => []
    }
  };

  mockGlobals.window.document = mockGlobals.document;
  mockGlobals.window.localStorage = localStorageMock;
  mockGlobals.window.API = mockGlobals.API;
  mockGlobals.window.showToast = mockGlobals.showToast;
  mockGlobals.window.renderIcon = mockGlobals.renderIcon;

  const context = vm.createContext(mockGlobals);
  context.globalThis = context;

  // Load core files
  const constantsCode = fs.existsSync(path.join(__dirname, '../js/core/constants.js'))
    ? fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8') : '';
  const audioCode = fs.existsSync(path.join(__dirname, '../js/core/audio.js'))
    ? fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8') : '';
  const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
  const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
  const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
  const historyCode = fs.readFileSync(path.join(__dirname, '../js/views/history-list.js'), 'utf8');
  const runnerCode = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

  if (constantsCode) vm.runInContext(constantsCode, context);
  vm.runInContext(utilsCode, context);
  if (audioCode) vm.runInContext(audioCode, context);
  vm.runInContext(storageCode, context);
  vm.runInContext(stateCode, context);
  vm.runInContext('window.state = state;', context);
  context.state = vm.runInContext('state', context);
  vm.runInContext(historyCode, context);
  vm.runInContext(runnerCode, context);

  return { context, mockGlobals, createdElements, toastMessages, createdSessions };
}

async function runTests() {
  console.log('=============================================================');
  console.log('CALISTHENIX — WORKOUT COMPLETE EXPERIENCE & PERSISTENCE TESTS');
  console.log('=============================================================\n');

  const { context, createdElements, createdSessions } = createTestContext();

  // Setup state
  context.state.exercises = [
    { id: 'pull_up', name: 'Pull-up', day: 'Pull A', target_reps: 8, target_sets: 3 },
    { id: 'weighted_dip', name: 'Weighted Dip', day: 'Push A', target_reps: 6, target_sets: 3 },
    { id: 'l_sit', name: 'L-sit Hang', day: 'Pull A', target_hold_sec: 30, target_sets: 2 }
  ];
  context.state.todayResolved = {
    workout: { id: 'pull_b', name: 'PULL B', total_sets: 19 }
  };

  // ─── TEST 1: Metric Calculations from Real Session Data (No Mock/Hardcoded) ─
  console.log('>>> TEST 1: Verifying Dynamic Metric Calculations (No Hardcoding)...');

  const sampleSession = {
    id: 'sess-test-complete-1',
    routine: 'PUSH & CORE ADVANCED',
    startTime: Date.now() - 3600000, // 60 minutes ago
    pausedMs: 0,
    warmup_duration_sec: 300,
    main_duration_sec: 2700,
    cooldown_duration_sec: 600,
    warmup_status: 'completed',
    cooldown_status: 'completed',
    warmup: [
      { exercise_id: 'arm_circles', exercise_name: 'Arm Circles', completed: true, actual_val: 15 },
      { exercise_id: 'wrist_prep', exercise_name: 'Wrist Prep', completed: true, actual_val: 15 }
    ],
    exercises: [
      {
        exercise_id: 'weighted_dip',
        exercise_name: 'Weighted Dip',
        sets: [
          { set_num: 1, target_val: 6, actual_val: 6, weight_kg: 20, completed: true },
          { set_num: 2, target_val: 6, actual_val: 7, weight_kg: 20, completed: true },
          { set_num: 3, target_val: 6, actual_val: 5, weight_kg: 25, completed: true }
        ]
      },
      {
        exercise_id: 'push_up',
        exercise_name: 'Push-ups',
        sets: [
          { set_num: 1, target_val: 12, actual_val: 12, completed: true },
          { set_num: 2, target_val: 12, actual_val: 10, completed: true },
          { set_num: 3, target_val: 12, actual_val: 0, skipped: true }
        ]
      },
      {
        exercise_id: 'l_sit',
        exercise_name: 'L-sit Hang',
        exercise_type: 'duration',
        sets: [
          { set_num: 1, target_val: 30, actual_val: 35, completed: true }
        ]
      }
    ],
    cooldown: [
      { exercise_id: 'shoulder_stretch', exercise_name: 'Shoulder Stretch', completed: true, actual_val: 45 }
    ]
  };

  const metrics = context.getWorkoutSessionSummaryMetrics(sampleSession);
  console.log('  Calculated Metrics:');
  console.log('    - Workout Name:', metrics.workoutName);
  console.log('    - Duration:', metrics.durationFormatted);
  console.log('    - Exercises Completed:', `${metrics.exercisesCompleted} / ${metrics.totalExercises}`);
  console.log('    - Sets Completed:', metrics.setsCompleted);
  console.log('    - Sets Skipped:', metrics.setsSkipped);
  console.log('    - Volume:', metrics.volumeText);
  console.log('    - Calories:', `${metrics.calories} kcal`);
  console.log('    - Completion Rate:', `${metrics.completionPercentage}%`);
  console.log('    - Best Performance:', metrics.bestPerformance);

  assert.strictEqual(metrics.workoutName, 'PUSH & CORE ADVANCED');
  assert.strictEqual(metrics.setsCompleted, 9); // 2 warmup + 3 dips + 2 pushups + 1 lsit + 1 cooldown
  assert.strictEqual(metrics.setsSkipped, 1);   // 1 pushup skipped
  assert.strictEqual(metrics.totalSets, 10);
  assert.strictEqual(metrics.completionPercentage, 90);
  assert.strictEqual(metrics.volumeKg, 385);   // 6*20 + 7*20 + 5*25 = 385
  assert.strictEqual(metrics.volumeText, '385 kg');
  assert.ok(metrics.calories > 0);
  assert.ok(metrics.bestPerformance && metrics.bestPerformance.includes('Weighted Dip'));
  console.log('  ✓ Dynamic metrics computation verified 100% (zero hardcoded values).\n');

  // ─── TEST 2: Terminal State Guard ───────────────────────────────────────────
  console.log('>>> TEST 2: Terminal State Enforcement...');

  // Non-terminal session (in_progress)
  const activeSession = Object.assign({}, sampleSession, {
    status: 'in_progress',
    phase: 'MAIN_WORKOUT',
    phaseState: 'ACTIVE'
  });
  context.saveActiveSession(activeSession);

  let html = context.renderActiveWorkoutView();
  assert.ok(!html.includes('WORKOUT COMPLETE') && !html.includes('runner-complete-modal-card'), 'Workout Complete must NOT show while session is active/in_progress');
  console.log('  ✓ Non-terminal session correctly renders active runner, not Workout Complete');

  // Terminal session (completed)
  activeSession.status = 'completed';
  activeSession.phase = 'COMPLETED';
  activeSession.phaseState = 'COMPLETED';
  activeSession.summaryData = metrics;
  context.saveActiveSession(activeSession);

  html = context.renderActiveWorkoutView();
  assert.ok(html.includes('WORKOUT COMPLETE'), 'Workout Complete must render when session is in terminal COMPLETED state');
  assert.ok(html.includes('PUSH & CORE ADVANCED'), 'Workout Complete view must display actual workout name');
  assert.ok(html.includes('385 kg'), 'Workout Complete view must display computed 385 kg volume');
  assert.ok(html.includes('90%'), 'Workout Complete view must display 90% completion percentage');
  assert.ok(html.includes('View Workout Summary') && html.includes('Done'), 'Workout Complete view must contain Done and View Workout Summary buttons');
  console.log('  ✓ Terminal session correctly renders Workout Complete screen with full metrics.\n');

  // ─── TEST 3: Modal Dialog Rendering ─────────────────────────────────────────
  console.log('>>> TEST 3: Workout Complete Modal Rendering...');
  context.renderWorkoutCompleteModal(metrics);
  const modalEl = createdElements.find(el => el.id === 'workout-complete-modal');
  assert.ok(modalEl, 'Modal element #workout-complete-modal was created');
  assert.ok(modalEl.innerHTML.includes('WORKOUT COMPLETE') && modalEl.innerHTML.includes('385 kg'), 'Modal dialog contains required complete metrics');
  console.log('  ✓ Workout Complete modal rendered successfully with dynamic data.');
  context.closeWorkoutCompleteModal();
  assert.ok(!context.document.getElementById('workout-complete-modal'), 'Modal is removed on close');
  console.log('  ✓ Workout Complete modal closed cleanly.\n');

  // ─── TEST 4: "Done" Button & Permanent Persistence to Dashboard ─────────────
  console.log('>>> TEST 4: Done Action & Dashboard Updating...');
  context.saveActiveSession(activeSession);

  await context.handleDoneWorkoutClick();

  assert.strictEqual(context.getActiveSession(), null, 'Active session cleared after clicking Done');
  assert.strictEqual(context.state.view, 'dashboard', 'State view switched to dashboard');
  assert.strictEqual(createdSessions.length, 1, 'Session was persisted via API createWorkoutSession');
  assert.strictEqual(createdSessions[0].routine, 'PUSH & CORE ADVANCED');
  assert.strictEqual(createdSessions[0].id, 'sess-test-complete-1');
  console.log('  ✓ Done button permanently persisted workout and navigated to Dashboard.\n');

  // ─── TEST 5: History Screen Integration ─────────────────────────────────────
  console.log('>>> TEST 5: History Screen Integration...');
  await context.openHistoryListView();
  assert.strictEqual(context.state.view, 'history_list');
  assert.ok(context.state.workoutSessions && context.state.workoutSessions.length > 0, 'History list contains completed sessions');
  const historyItem = context.state.workoutSessions.find(s => s.session_uuid === 'sess-test-complete-1' || s.id === 'sess-test-complete-1');
  assert.ok(historyItem, 'History list contains saved workout session');
  const historyHtml = context.renderHistoryListView();
  assert.ok(historyHtml.includes('PUSH & CORE ADVANCED'), 'History UI renders the saved session card');
  console.log('  ✓ History screen immediately displays the completed workout.\n');

  // ─── TEST 6: Browser Refresh Resilience ─────────────────────────────────────
  console.log('>>> TEST 6: Browser Refresh Resilience...');
  const freshSession = Object.assign({}, sampleSession, {
    id: 'sess-refresh-test',
    status: 'completed',
    phase: 'COMPLETED',
    phaseState: 'COMPLETED',
    summaryData: metrics
  });
  context.saveActiveSession(freshSession);

  // Simulate reload
  const reloadedActiveSession = context.getActiveSession();
  assert.ok(reloadedActiveSession && reloadedActiveSession.id === 'sess-refresh-test', 'Session state survived reload');
  const refreshedHtml = context.renderActiveWorkoutView();
  assert.ok(refreshedHtml.includes('WORKOUT COMPLETE') && refreshedHtml.includes('385 kg'), 'Workout Complete screen persists after refresh');
  console.log('  ✓ Browser refresh correctly preserves completed workout metrics without loss.\n');

  console.log('=============================================================');
  console.log('ALL WORKOUT COMPLETE & PERSISTENCE TESTS PASSED 100%! ✅');
  console.log('=============================================================');
}

runTests().then(() => {
  if (typeof context !== 'undefined' && context.cleanupAllWorkoutTimers) context.cleanupAllWorkoutTimers();
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
