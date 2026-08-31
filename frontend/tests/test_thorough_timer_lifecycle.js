/**
 * CalistheniX — Comprehensive Timer Lifecycle & Robustness Test Suite
 *
 * Directly tests the 8 core timer invariants:
 * 1. Start → 40 → 39 → 38 → ...
 * 2. Pause at 17 → stays at 17 (even as time passes or re-renders occur).
 * 3. Resume → 16 → 15 → ... (continues from exact remaining time, never restarts).
 * 4. Pause/resume repeatedly → no speed-up (single interval, wall-clock accuracy).
 * 5. Switch movement → old timer must stop.
 * 6. Complete movement → only one completion (idempotent, single cue & timestamp).
 * 7. Refresh/remount → no duplicate timers (max 1 interval).
 * 8. End session → timer must stop completely (all intervals cleared).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=============================================================');
console.log('🧪 RUNNING COMPREHENSIVE TIMER LIFECYCLE TESTS (8 SCENARIOS)');
console.log('=============================================================\n');

// ─── Setup Sandbox Environment ──────────────────────────────────────────────
let currentTime = 1700000000000;
let registeredIntervals = [];
let soundEvents = [];
let toastMessages = [];

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
  getElementById: (id) => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    appendChild: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

const sandbox = {
  window: {
    location: { hash: '#workout' },
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    innerWidth: 1024
  },
  document: mockDocument,
  localStorage: mockLocalStorage,
  navigator: { vibrate: () => {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: (fn, ms) => {
    const id = setInterval(fn, ms);
    registeredIntervals.push({ id, fn, ms });
    return id;
  },
  clearInterval: (id) => {
    clearInterval(id);
    registeredIntervals = registeredIntervals.filter(i => i.id !== id);
  },
  getActiveIntervalsCount: () => registeredIntervals.length,
  tickAllTimers: () => {
    const current = [...registeredIntervals];
    for (const item of current) {
      item.fn();
    }
  },
  console: console,
  Date: class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(currentTime);
      else super(...args);
    }
    static now() {
      return currentTime;
    }
  },
  Math: Math,
  JSON: JSON,
  render: () => {},
  showToast: (msg) => { toastMessages.push(msg); },
  cueSetComplete: () => { soundEvents.push('set_complete'); },
  cueExerciseComplete: () => { soundEvents.push('exercise_complete'); },
  cueTimerComplete: () => { soundEvents.push('timer_complete'); },
  cueCountdownTick: (s) => { soundEvents.push(`tick_${s}`); },
  cueRestEnd: () => { soundEvents.push('rest_end'); },
  cueHoldSave: () => { soundEvents.push('hold_save'); }
};

sandbox.window.state = sandbox.state;
vm.createContext(sandbox);

// Load required scripts
const constantsJs = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf-8');
const utilsJs = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf-8');
const storageJs = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf-8');
const stateJs = fs.readFileSync(path.join(__dirname, '../js/core/state.js'), 'utf-8');
const workoutRunnerJs = fs.readFileSync(path.join(__dirname, '../js/views/workout-runner.js'), 'utf-8');

vm.runInContext(constantsJs, sandbox);
vm.runInContext(utilsJs, sandbox);
vm.runInContext(storageJs, sandbox);
vm.runInContext(stateJs, sandbox);
vm.runInContext(workoutRunnerJs, sandbox);
vm.runInContext("state.view = 'workout';", sandbox);

function createInitialSession() {
  return {
    id: 'test-timer-lifecycle-session',
    routine_name: 'Timer Lifecycle Routine',
    routine: 'Timer Lifecycle Routine',
    status: 'in_progress',
    phaseState: 'ACTIVE',
    currentPhase: 'warmup',
    phase: 'WARMUP',
    startTime: currentTime,
    startedAt: currentTime,
    totalPausedMs: 0,
    pausedAt: null,
    warmupIndex: 0,
    warmup_status: 'in_progress',
    warmupStatus: 'ACTIVE',
    warmup: [
      { id: 101, exercise_name: 'Arm Circles', duration_sec: 40, exercise_type: 'duration', completed: false, skipped: false },
      { id: 102, exercise_name: 'Cat Cow', duration_sec: 30, exercise_type: 'duration', completed: false, skipped: false }
    ],
    exercises: [
      {
        exercise_name: 'L-sit Hold',
        exercise_id: 1,
        exercise_type: 'duration',
        duration_sec: 40,
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 40, actual_val: 40, completed: false, skipped: false }
        ]
      }
    ],
    cooldownIndex: 0,
    cooldown_status: 'pending',
    cooldownStatus: 'IDLE',
    cooldown: [
      { id: 201, exercise_name: 'Chest Stretch', duration_sec: 40, exercise_type: 'duration', completed: false, skipped: false }
    ]
  };
}

async function runLifecycleTests() {
  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Start → 40 → 39 → 38 → ...
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- Scenario 1: Start → 40 → 39 → 38 → ... ---');
  sandbox.cleanupAllWorkoutTimers();
  soundEvents = [];
  let sess = createInitialSession();
  sandbox.saveActiveSession(sess);

  sandbox.startPhaseAutoRunner('warmup');
  sandbox.togglePhaseTimer(); // Start timer

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Timer started running');
  assert.strictEqual(sess.movementTimer.durationSec, 40, 'Duration is 40s');
  assert.strictEqual(sess.movementTimer.remainingSec, 40, 'Initial remaining is 40s');

  // Advance 1s
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 39, 'Ticked to 39s after 1 second');

  // Advance another 1s
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 38, 'Ticked to 38s after 2 seconds');

  // Advance another 1s
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 37, 'Ticked to 37s after 3 seconds');

  console.log('  ✓ Scenario 1 PASSED: Start → 40 → 39 → 38 → 37 counts down precisely 1s per second.');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Pause at 17 → stays at 17
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 2: Pause at 17 → stays at 17 ---');
  // Advance from 37s down to 17s (20 more seconds)
  currentTime += 20000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 17, 'Reached exactly 17s');

  // Click Pause at 17s
  sandbox.togglePhaseTimer();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, false, 'Timer is now paused (isRunning = false)');
  assert.strictEqual(sess.movementTimer.remainingSec, 17, 'Remaining time is frozen at 17s');
  assert(sess.movementTimer.pausedAt != null, 'Paused timestamp recorded');

  // Advance wall clock by 30 seconds while paused and tick
  currentTime += 30000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 17, 'Remaining time STAYS at 17s while paused');

  console.log('  ✓ Scenario 2 PASSED: Pausing at 17 freezes time at 17s regardless of elapsed wall-clock time.');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Resume → 16 → 15 → ...
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 3: Resume → 16 → 15 → ... ---');
  // Click Resume
  sandbox.togglePhaseTimer();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Timer resumed running');
  assert.strictEqual(sess.movementTimer.remainingSec, 17, 'Remaining time is 17s at moment of resume');

  // Advance 1s
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 16, 'Resumed count ticked to 16s');

  // Advance another 1s
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 15, 'Resumed count ticked to 15s');

  console.log('  ✓ Scenario 3 PASSED: Resume smoothly continues from 17 → 16 → 15 (never resets to 40).');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Pause/resume repeatedly → no speed-up
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 4: Pause/resume repeatedly → no speed-up ---');
  // Rapidly toggle pause/resume 8 times
  for (let i = 0; i < 8; i++) {
    sandbox.togglePhaseTimer();
    currentTime += 100; // 100ms jitter between clicks
  }
  // Ensure timer is currently running
  sess = sandbox.getActiveSession();
  if (!sess.movementTimer.isRunning) {
    sandbox.togglePhaseTimer();
    sess = sandbox.getActiveSession();
  }
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Timer is running');
  const remainingBefore = sess.movementTimer.remainingSec;

  // Advance exactly 1 second
  currentTime += 1000;
  sandbox.tickAllTimers();
  sess = sandbox.getActiveSession();
  const remainingAfter = sess.movementTimer.remainingSec;

  assert.strictEqual(remainingBefore - remainingAfter, 1, 'Decremented exactly 1 second in 1s real time (no speedup)');

  console.log('  ✓ Scenario 4 PASSED: Rapid pause/resume cycles cause zero timer acceleration or rate drift.');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Switch movement → old timer must stop
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 5: Switch movement → old timer must stop ---');
  // First complete movement 0 so movement 1 is unlocked
  sess.warmup[0].completed = true;
  sandbox.saveActiveSession(sess);

  // Switch to Movement 1 (Cat Cow, 30s)
  sandbox.selectWarmupMovement(1);
  sess = sandbox.getActiveSession();

  assert.strictEqual(sess.warmupIndex, 1, 'Switched to movement index 1');
  assert.strictEqual(sess.movementTimer.isRunning, false, 'New movement timer is stopped / ready (not running old timer)');
  assert.strictEqual(sess.movementTimer.durationSec, 30, 'New duration set to 30s');
  assert.strictEqual(sess.movementTimer.remainingSec, 30, 'New remaining set to 30s');
  assert.strictEqual(sess.movementTimer.startedAt, null, 'Old startedAt cleared');

  console.log('  ✓ Scenario 5 PASSED: Switching movement cleanly stops previous timer and initializes fresh 30s timer.');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Complete movement → only one completion
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 6: Complete movement → only one completion ---');
  soundEvents = [];
  sandbox.togglePhaseTimer(); // Start Movement 1 (30s)
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Movement 1 timer running');

  // Advance clock past 30s to trigger completion at 0
  currentTime += 31000;
  sandbox.tickAllTimers();

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 0, 'Remaining time is 0');
  assert.strictEqual(sess.movementTimer.isRunning, false, 'Timer stopped on reaching 0');
  assert.strictEqual(sess.warmup[1].completed, true, 'Movement 1 marked completed: true');
  assert.strictEqual(sess.warmup[1].actual_val, 30, 'actual_val recorded as 30s');

  const setCompleteCount = soundEvents.filter(e => e === 'set_complete').length;
  assert.strictEqual(setCompleteCount, 1, 'Completion cue fired exactly once');

  // Tick 5 more times at 0
  for (let i = 0; i < 5; i++) {
    currentTime += 1000;
    sandbox.tickAllTimers();
  }
  const setCompleteCountAfter = soundEvents.filter(e => e === 'set_complete').length;
  assert.strictEqual(setCompleteCountAfter, 1, 'Zero duplicate completions on subsequent ticks at 0');

  console.log('  ✓ Scenario 6 PASSED: Movement completion fires exactly once with full idempotency.');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Refresh / Remount → no duplicate timers
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 7: Refresh / Remount → no duplicate timers ---');
  // Simulate 3 consecutive remounts / router renders
  sandbox.startWorkoutDurationTimer();
  sandbox.startWorkoutDurationTimer();
  sandbox.startWorkoutDurationTimer();

  const intervalsCount = sandbox.getActiveIntervalsCount();
  assert.strictEqual(intervalsCount, 1, 'Exactly 1 active timer interval exists after multiple remount calls');

  console.log('  ✓ Scenario 7 PASSED: Multiple remounts / renders clean up previous intervals (max 1 active).');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: End session → timer must stop completely
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario 8: End session → timer must stop completely ---');
  // Transition to cooldown and finish
  sess = sandbox.getActiveSession();
  sess.warmupStatus = 'COMPLETED';
  sess.mainStatus = 'COMPLETED';
  sess.cooldownStatus = 'ACTIVE';
  sess.currentPhase = 'cooldown';
  sess.phase = 'COOLDOWN';
  sess.cooldown[0].completed = true;
  sandbox.saveActiveSession(sess);

  // Finish session
  sandbox.finishWorkoutSession();
  await new Promise(r => setTimeout(r, 20));

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.status, 'completed', 'Session status is completed');
  assert.strictEqual(sess.phase, 'COMPLETED', 'Session phase is COMPLETED');

  // Verify all timers stopped
  const postFinishIntervals = sandbox.getActiveIntervalsCount();
  assert.strictEqual(postFinishIntervals, 0, 'All timer intervals completely cleared upon session finish');

  console.log('  ✓ Scenario 8 PASSED: Ending session stops all intervals completely with 0 lingering timers.');

  console.log('\n=============================================================');
  console.log('🎉 ALL 8 TIMER LIFECYCLE SCENARIOS VERIFIED & PASSED 100%!');
  console.log('=============================================================\n');

  sandbox.cleanupAllWorkoutTimers();
  process.exit(0);
}

runLifecycleTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
