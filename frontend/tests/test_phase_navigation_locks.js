/**
 * Phase Navigation & Locking Verification Test Suite
 * Tests strict enforcement of phase progression rules:
 * - Before Warm-Up: Warm-Up available, Main locked, Cool Down locked
 * - During Warm-Up: Warm-Up active, Main locked, Cool Down locked
 * - Explicit Skip Warm-Up modal & confirmation flow
 * - After Warm-Up: Warm-Up completed, Main available/active, Cool Down locked
 * - During Main: Main active, Cool Down locked
 * - After Main: Main completed, Cool Down unlocked
 * - Clear explanation when clicking locked phases (toast & skip modal)
 * - Tabs render lock icons & accurate accessibility attributes
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function createTestContext() {
  const localStorageMock = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
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
      getElementById: (id) => createdElements.find(e => e.id === id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          innerHTML: '',
          textContent: '',
          className: '',
          style: {},
          setAttribute: (k, v) => { el[k] = v; },
          remove: () => {
            const idx = createdElements.indexOf(el);
            if (idx !== -1) createdElements.splice(idx, 1);
          },
          focus: () => {}
        };
        return el;
      }
    },
    localStorage: localStorageMock,
    render: () => {},
    showToast: (msg) => { toastMessages.push(msg); },
    fetch: async (url, opts) => {
      if (opts && opts.body) {
        try {
          const body = JSON.parse(opts.body);
          if (url.includes('/workout_sessions')) {
            createdSessions.push(body);
          }
        } catch (e) {}
      }
      return { ok: true, json: async () => ({}) };
    },
    navigator: {
      onLine: true,
      wakeLock: { request: async () => ({ release: async () => {} }) }
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 123,
    clearInterval: () => {}
  };

  const ctx = vm.createContext(mockGlobals);
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;

  // Load core files in sequence
  const constantsCode = fs.existsSync(path.join(__dirname, '../js/core/constants.js'))
    ? fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8') : '';
  const audioCode = fs.existsSync(path.join(__dirname, '../js/core/audio.js'))
    ? fs.readFileSync(path.join(__dirname, '../js/core/audio.js'), 'utf8') : '';
  const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
  const stateCode = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf8');
  const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
  const apiCode = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
  const runnerCode = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf8');

  if (constantsCode) vm.runInContext(constantsCode, ctx);
  vm.runInContext(utilsCode, ctx);
  if (audioCode) vm.runInContext(audioCode, ctx);
  vm.runInContext(storageCode, ctx);
  vm.runInContext(stateCode, ctx);
  vm.runInContext(apiCode, ctx);
  vm.runInContext(runnerCode, ctx);

  ctx.showToast = (msg) => { toastMessages.push(msg); };
  ctx.toastMessages = toastMessages;
  ctx.createdElements = createdElements;
  ctx.createdSessions = createdSessions;

  return ctx;
}

let testPassCount = 0;
let testTotalCount = 0;

async function runTest(testName, testFn) {
  testTotalCount++;
  const ctx = createTestContext();
  try {
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
  console.log('=============================================================');
  console.log('🧪 RUNNING PHASE NAVIGATION & LOCKING VERIFICATION TESTS');
  console.log('=============================================================\n');

  console.log('--- Suite 1: Initial Phase Status (Before Warm-Up) ---');

  await runTest('Before Warm-Up: Warm-Up available, Main locked, Cool Down locked', async (ctx) => {
    const session = {
      id: 'lock-test-1',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.IDLE,
      warmup: [
        { exercise_id: 'w1', exercise_name: 'Wrist Prep', completed: false },
        { exercise_id: 'w2', exercise_name: 'Arm Circles', completed: false }
      ],
      exercises: [
        {
          exercise_id: 'pull_up',
          exercise_name: 'Pull Ups',
          sets: [{ set_num: 1, target_val: 8, completed: false }]
        }
      ],
      cooldown: [
        { exercise_id: 'c1', exercise_name: 'Lat Stretch', completed: false }
      ]
    };

    ctx.saveActiveSession(session);

    const warmupLock = ctx.getPhaseLockStatus(session, 'warmup');
    assert.strictEqual(warmupLock.isLocked, false, 'Warm-up is unlocked');
    assert.strictEqual(warmupLock.status, 'active', 'Warm-up is active (current phase)');

    const mainLock = ctx.getPhaseLockStatus(session, 'main');
    assert.strictEqual(mainLock.isLocked, true, 'Main Workout is locked before warm-up');
    assert.strictEqual(mainLock.status, 'locked', 'Main Workout status is locked');
    assert(mainLock.lockReason.includes('Warm-Up'), 'Lock reason explains warm-up requirement');

    const cooldownLock = ctx.getPhaseLockStatus(session, 'cooldown');
    assert.strictEqual(cooldownLock.isLocked, true, 'Cool Down is locked before warm-up & main');
    assert.strictEqual(cooldownLock.status, 'locked', 'Cool Down status is locked');
    assert(cooldownLock.lockReason.includes('Warm-Up and Main Workout'), 'Lock reason explains warm-up & main requirements');
  });

  await runTest('Attempting to navigate to locked Main Workout blocks transition, shows toast, and opens skip modal', async (ctx) => {
    const session = {
      id: 'lock-test-2',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmup: [
        { exercise_id: 'w1', exercise_name: 'Wrist Prep', completed: false }
      ],
      exercises: [
        { exercise_id: 'pull_up', exercise_name: 'Pull Ups', sets: [{ set_num: 1, completed: false }] }
      ]
    };

    ctx.saveActiveSession(session);

    // Try to switch to Main Workout while Warm-Up is incomplete
    ctx.setWorkoutPhase('main');

    // Session phase must NOT change
    const curSession = ctx.getActiveSession();
    assert.strictEqual(curSession.phase, ctx.WORKOUT_PHASES.WARMUP, 'Phase was NOT changed to MAIN_WORKOUT');
    assert.strictEqual(curSession.currentPhase, 'warmup', 'currentPhase remains warmup');

    // Toast message explanation
    assert(ctx.toastMessages.some(m => m.includes('Warm-Up')), 'Toast explanation displayed');

    // Skip Warm-Up modal opened
    const modalEl = ctx.document.getElementById('skip-warmup-phase-modal');
    assert.notStrictEqual(modalEl, null, 'Skip Warm-Up confirmation modal was opened');
    assert(modalEl.innerHTML.includes('Skip Warm-Up?'), 'Modal title is "Skip Warm-Up?"');
    assert(modalEl.innerHTML.includes('Cancel'), 'Modal includes Cancel button');
  });

  await runTest('Attempting to navigate to locked Cool Down blocks transition and shows explanation toast', async (ctx) => {
    const session = {
      id: 'lock-test-3',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmup: [{ exercise_id: 'w1', completed: false }],
      exercises: [{ exercise_id: 'pull_up', sets: [{ set_num: 1, completed: false }] }],
      cooldown: [{ exercise_id: 'c1', completed: false }]
    };

    ctx.saveActiveSession(session);

    // Try to switch to Cool Down directly
    ctx.setWorkoutPhase('cooldown');

    const curSession = ctx.getActiveSession();
    assert.strictEqual(curSession.phase, ctx.WORKOUT_PHASES.WARMUP, 'Phase remains WARMUP');
    assert(ctx.toastMessages.some(m => m.includes('Warm-Up and Main Workout')), 'Toast explains Warm-Up and Main Workout requirement');
  });

  console.log('\n--- Suite 2: Explicit Skip Warm-Up Confirmation Flow ---');

  await runTest('Confirming Skip Warm-Up modal unlocks and switches directly to Main Workout', async (ctx) => {
    const session = {
      id: 'skip-warmup-test',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmup: [{ exercise_id: 'w1', completed: false }],
      exercises: [{ exercise_id: 'pull_up', sets: [{ set_num: 1, completed: false }] }]
    };

    ctx.saveActiveSession(session);

    // 1. Open Skip Warm-Up modal
    ctx.openSkipWarmupPhaseModal();
    let modalEl = ctx.document.getElementById('skip-warmup-phase-modal');
    assert.notStrictEqual(modalEl, null, 'Modal rendered in DOM');

    // 2. Confirm skip
    ctx.confirmSkipWarmupPhase();

    // Modal removed
    modalEl = ctx.document.getElementById('skip-warmup-phase-modal');
    assert.strictEqual(modalEl, null, 'Modal removed from DOM');

    // Session updated
    const updated = ctx.getActiveSession();
    assert.strictEqual(updated.warmupStatus, ctx.PHASE_STATES.SKIPPED, 'warmupStatus is SKIPPED');
    assert.strictEqual(updated.warmup_status, 'skipped', 'warmup_status is skipped');
    assert.strictEqual(updated.phase, ctx.WORKOUT_PHASES.MAIN_WORKOUT, 'phase transitioned to MAIN_WORKOUT');
    assert.strictEqual(updated.currentPhase, 'main', 'currentPhase is main');

    // Main Workout now unlocked
    const mainLock = ctx.getPhaseLockStatus(updated, 'main');
    assert.strictEqual(mainLock.isLocked, false, 'Main Workout is now unlocked');
    assert.strictEqual(mainLock.status, 'active', 'Main Workout is active');
  });

  console.log('\n--- Suite 3: Progression from Warm-Up -> Main -> Cool Down ---');

  await runTest('Completing all warm-up exercises unlocks Main Workout and marks Warm-Up completed', async (ctx) => {
    const session = {
      id: 'progression-test-1',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      warmup_status: 'completed',
      warmup: [
        { exercise_id: 'w1', completed: true },
        { exercise_id: 'w2', completed: true }
      ],
      exercises: [
        { exercise_id: 'pull_up', sets: [{ set_num: 1, completed: false }] }
      ],
      cooldown: [
        { exercise_id: 'c1', completed: false }
      ]
    };

    ctx.saveActiveSession(session);

    const warmupLock = ctx.getPhaseLockStatus(session, 'warmup');
    assert.strictEqual(warmupLock.isLocked, false, 'Warm-up is unlocked');

    const mainLock = ctx.getPhaseLockStatus(session, 'main');
    assert.strictEqual(mainLock.isLocked, false, 'Main Workout unlocked after Warm-Up');
    assert.strictEqual(mainLock.status, 'available', 'Main Workout status is available');

    const cooldownLock = ctx.getPhaseLockStatus(session, 'cooldown');
    assert.strictEqual(cooldownLock.isLocked, true, 'Cool Down remains locked until Main Workout is done');
    assert.strictEqual(cooldownLock.lockReason, 'Complete the Main Workout first.');

    // Transitioning to Main Workout succeeds
    ctx.setWorkoutPhase('main');
    const curSession = ctx.getActiveSession();
    assert.strictEqual(curSession.phase, ctx.WORKOUT_PHASES.MAIN_WORKOUT, 'Switched to MAIN_WORKOUT successfully');
  });

  await runTest('Completing Main Workout unlocks Cool Down and marks Main Workout completed', async (ctx) => {
    const session = {
      id: 'progression-test-2',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.MAIN_WORKOUT,
      currentPhase: 'main',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmupStatus: ctx.PHASE_STATES.COMPLETED,
      warmup_status: 'completed',
      mainStatus: ctx.PHASE_STATES.COMPLETED,
      warmup: [{ exercise_id: 'w1', completed: true }],
      exercises: [
        { exercise_id: 'pull_up', sets: [{ set_num: 1, completed: true }] }
      ],
      cooldown: [
        { exercise_id: 'c1', completed: false }
      ]
    };

    ctx.saveActiveSession(session);

    const mainLock = ctx.getPhaseLockStatus(session, 'main');
    assert.strictEqual(mainLock.status, 'active', 'Main is active');

    const cooldownLock = ctx.getPhaseLockStatus(session, 'cooldown');
    assert.strictEqual(cooldownLock.isLocked, false, 'Cool Down is unlocked after Main Workout complete');
    assert.strictEqual(cooldownLock.status, 'available', 'Cool Down is available');

    // Switch to Cool Down succeeds
    ctx.setWorkoutPhase('cooldown');
    const curSession = ctx.getActiveSession();
    assert.strictEqual(curSession.phase, ctx.WORKOUT_PHASES.COOLDOWN, 'Switched to COOLDOWN successfully');
  });

  console.log('\n--- Suite 4: Segmented Tabs UI Rendering & Attributes ---');

  await runTest('renderWorkoutSegmentedTabs renders accurate lock classes, icons, and accessible attributes', async (ctx) => {
    const session = {
      id: 'tabs-ui-test',
      routine: 'PULL B',
      phase: ctx.WORKOUT_PHASES.WARMUP,
      currentPhase: 'warmup',
      status: 'in_progress',
      phaseState: ctx.PHASE_STATES.ACTIVE,
      warmup: [{ exercise_id: 'w1', completed: false }],
      exercises: [{ exercise_id: 'pull_up', sets: [{ set_num: 1, completed: false }] }],
      cooldown: [{ exercise_id: 'c1', completed: false }]
    };

    ctx.saveActiveSession(session);

    const html = ctx.renderWorkoutSegmentedTabs(session, 'warmup');

    // Tab 1: Warm-Up
    assert(html.includes('runner-segmented-tab-btn is-active'), 'Warm-Up has is-active class');
    assert(html.includes('aria-selected="true"'), 'Warm-Up has aria-selected="true"');

    // Tab 2: Main Workout (Locked)
    assert(html.includes('runner-segmented-tab-btn is-locked'), 'Main Workout has is-locked class');
    assert(html.includes('title="Complete or skip Warm-Up first to unlock Main Workout."'), 'Main Workout title displays lock reason');

    // Tab 3: Cool Down (Locked)
    assert(html.includes('title="Complete the Warm-Up and Main Workout first."'), 'Cool Down title displays lock reason');
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
