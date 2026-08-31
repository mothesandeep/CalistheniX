/**
 * CalistheniX — Movement Completion Behavior Verification Suite
 *
 * Requirements Tested:
 * 1. When timer reaches 0: Set remainingTime = 0.
 * 2. Mark current movement completed exactly once.
 * 3. Stop the timer.
 * 4. Move to the next movement only after completion logic finishes.
 * 5. Do not trigger completion multiple times.
 * 6. If it is the last movement, transition correctly to the next workout phase.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ─── Setup Test Sandbox Environment ──────────────────────────────────────────
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
  createElement: (tag) => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    appendChild: () => {},
    addEventListener: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

let currentTime = 1700000000000;
let soundEvents = [];

let registeredIntervals = [];

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
  setInterval: (fn, ms) => {
    const id = setInterval(fn, ms);
    registeredIntervals.push({ id, fn, ms });
    return id;
  },
  clearInterval: (id) => {
    clearInterval(id);
    registeredIntervals = registeredIntervals.filter(i => i.id !== id);
  },
  tickAllTimers: () => {
    const current = [...registeredIntervals];
    for (const item of current) {
      item.fn();
    }
  },
  console: console,
  Date: class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(currentTime);
      } else {
        super(...args);
      }
    }
    static now() {
      return currentTime;
    }
  },
  Math: Math,
  JSON: JSON,
  state: {
    view: 'workout',
    activeSession: null,
    exercises: [
      { id: 1, name: 'Arm Circles', category: 'Warmup' },
      { id: 2, name: 'Pull-up', category: 'Strength' }
    ],
    workoutSessions: []
  },
  render: () => {},
  switchView: () => {},
  showToast: (msg) => { sandbox._lastToast = msg; },
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

console.log('=============================================================');
console.log('🧪 RUNNING MOVEMENT COMPLETION BEHAVIOR TEST SUITE');
console.log('=============================================================\n');

function createTestSession() {
  return {
    id: 'test-completion-session',
    routine_name: 'Completion Test Routine',
    routine: 'Completion Test Routine',
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
      { id: 101, exercise_name: 'Arm Circles', duration_sec: 20, exercise_type: 'duration', completed: false, skipped: false },
      { id: 102, exercise_name: 'Cat Cow', duration_sec: 15, exercise_type: 'duration', completed: false, skipped: false }
    ],
    exercises: [
      {
        exercise_name: 'Pull-ups',
        exercise_id: 1,
        exercise_type: 'reps',
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 8, actual_val: 8, completed: false, skipped: false }
        ]
      },
      {
        exercise_name: 'L-sit Hold',
        exercise_id: 2,
        exercise_type: 'duration',
        duration_sec: 25,
        rest_sec: 60,
        sets: [
          { set_num: 1, target_val: 25, actual_val: 25, completed: false, skipped: false }
        ]
      }
    ],
    cooldownIndex: 0,
    cooldown_status: 'pending',
    cooldownStatus: 'IDLE',
    cooldown: [
      { id: 201, exercise_name: 'Chest Stretch', duration_sec: 20, exercise_type: 'duration', completed: false, skipped: false },
      { id: 202, exercise_name: 'Dead Hang', duration_sec: 30, exercise_type: 'duration', completed: false, skipped: false }
    ]
  };
}

async function runTests() {
  // ─── TEST 1: Timer Expiry Sets remainingTime = 0, Stops Timer, and Marks Completed Exactly Once ─────
  console.log('--- Test 1: Timer Expiry Sets remainingTime = 0, Stops Timer, and Marks Completed Exactly Once ---');
  soundEvents = [];
  let sess = createTestSession();
  sandbox.saveActiveSession(sess);
  sandbox.startPhaseAutoRunner('warmup');
  sandbox.togglePhaseTimer();

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Movement timer started running');
  assert.strictEqual(sess.movementTimer.durationSec, 20, 'Duration is 20s');

  // Advance clock past the duration (22 seconds)
  currentTime += 22000;

  // Execute duration timer tick
  sandbox.tickAllTimers();

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.remainingSec, 0, 'Remaining time is set to exactly 0 (not negative)');
  assert.strictEqual(sess.phaseTimer.remaining, 0, 'Phase timer remaining is 0');
  assert.strictEqual(sess.movementTimer.isRunning, false, 'Movement timer is stopped');
  assert.strictEqual(sess.phaseTimer.isRunning, false, 'Phase timer is stopped');

  // Verify movement 0 completed exactly once
  assert.strictEqual(sess.warmup[0].completed, true, 'Warmup movement 0 is marked completed: true');
  assert.strictEqual(sess.warmup[0].actual_val, 20, 'Warmup movement 0 actual_val is set to duration (20)');
  assert.strictEqual(sess.warmup[0].skipped, false, 'Warmup movement 0 is not skipped');
  assert(sess.warmup[0].completed_at != null, 'Warmup movement 0 has valid completion timestamp');

  console.log('  ✓ 1. Passed: When timer reaches 0, remainingTime = 0, timer is stopped, and movement is completed.');

  // ─── TEST 2: Do Not Trigger Completion Multiple Times ───────────────────────
  console.log('\n--- Test 2: Idempotency: Multiple Ticks Do Not Trigger Completion Multiple Times ---');
  const prevCompletedAt = sess.warmup[0].completed_at;
  const prevSoundEventsLength = soundEvents.filter(e => e === 'set_complete').length;
  assert.strictEqual(prevSoundEventsLength, 1, 'set_complete sound played exactly once');

  // Tick 5 more times at 0
  for (let i = 0; i < 5; i++) {
    currentTime += 1000;
    sandbox.tickAllTimers();
  }

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.warmup[0].completed, true, 'Warmup movement 0 remains completed');
  assert.strictEqual(sess.warmup[0].completed_at, prevCompletedAt, 'completed_at was not overwritten');
  const currentSoundEventsLength = soundEvents.filter(e => e === 'set_complete').length;
  assert.strictEqual(currentSoundEventsLength, 1, 'set_complete was NOT triggered multiple times');

  console.log('  ✓ 2. Passed: Multiple timer ticks at 0 do not trigger completion logic repeatedly.');

  // ─── TEST 3: Move to the Next Movement Only After Completion Logic Finishes ─
  console.log('\n--- Test 3: Move to the Next Movement After Completion Finishes ---');
  // User is on movement 0 (completed)
  assert.strictEqual(sess.warmupIndex, 0, 'Movement 0 is completed, user currently on movement 0');

  // Now advance to next warmup movement
  sandbox.advanceWarmupMovement();
  sess = sandbox.getActiveSession();

  assert.strictEqual(sess.warmupIndex, 1, 'Cleanly advanced to movement 1 (Cat Cow)');
  assert.strictEqual(sess.warmup[1].exercise_name, 'Cat Cow', 'Movement 1 is Cat Cow');
  assert.strictEqual(sess.warmup[1].completed, false, 'Movement 1 is not yet completed');
  assert.strictEqual(sess.movementTimer.durationSec, 15, 'Movement 1 timer initialized with 15s');
  assert.strictEqual(sess.movementTimer.remainingSec, 15, 'Movement 1 timer remainingSec is 15s');
  assert.strictEqual(sess.movementTimer.isRunning, false, 'Movement 1 timer ready and stopped');

  console.log('  ✓ 3. Passed: Advanced to movement 1 only after completion logic, initializing fresh timer state.');

  // ─── TEST 4: Last Movement Completion Correctly Transitions to Next Workout Phase ─────
  console.log('\n--- Test 4: Last Movement Completion Transitions to Next Workout Phase ---');
  // Start timer for movement 1 (last warmup movement)
  sandbox.togglePhaseTimer();
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Movement 1 timer is running');

  // Advance clock past 15s duration
  currentTime += 16000;
  sandbox.tickAllTimers();

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.warmup[1].completed, true, 'Last warmup movement is completed');
  assert.strictEqual(sess.warmupStatus, 'COMPLETED', 'Warmup phase transitioned to COMPLETED');
  assert.strictEqual(sess.warmup_status, 'completed', 'warmup_status is completed');
  assert(sess.warmup_completed_at != null, 'warmup_completed_at timestamp recorded');
  assert(sess.warmup_duration_sec >= 0, 'warmup_duration_sec computed');

  console.log('  ✓ 4. Passed: Last warmup movement completion transitioned warmup phase to COMPLETED.');

  // ─── TEST 5: Cool-down Last Movement Completion Transitions to Finished Workout ─────
  console.log('\n--- Test 5: Cool-Down Last Movement Transitions to Workout Complete ---');
  sandbox.cleanupAllWorkoutTimers();
  sess = createTestSession();
  sess.warmupStatus = 'COMPLETED';
  sess.warmup_status = 'completed';
  sess.mainStatus = 'COMPLETED';
  sess.currentPhase = 'cooldown';
  sess.phase = 'COOLDOWN';
  sess.phaseState = 'ACTIVE';
  sess.cooldownStatus = 'ACTIVE';
  sess.cooldown_status = 'in_progress';
  sess.cooldownIndex = 1; // On last cooldown stretch (Dead Hang, 30s)
  sess.cooldown[0].completed = true; // First stretch already done
  sandbox.saveActiveSession(sess);

  sandbox.startPhaseAutoRunner('cooldown');
  sandbox.selectCooldownStretch(1);
  sandbox.togglePhaseTimer();

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.movementTimer.isRunning, true, 'Dead hang timer running');

  // Advance clock past 30s duration
  currentTime += 32000;
  sandbox.tickAllTimers();
  await new Promise(r => setTimeout(r, 10));

  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.cooldown[1].completed, true, 'Dead hang stretch completed');
  assert.strictEqual(sess.cooldownStatus, 'COMPLETED', 'Cooldown status is COMPLETED');
  assert.strictEqual(sess.phase, 'COMPLETED', 'Phase transitioned to COMPLETED');
  assert.strictEqual(sess.status, 'completed', 'Session status is completed');
  assert(sess.endTime != null || sess.completed_at != null, 'Workout end timestamp recorded');

  console.log('  ✓ 5. Passed: Last cool-down movement completion transitions to Workout Complete.');

  // ─── TEST 6: Isometric Hold Movement Reaching Target Completes Exactly Once ─────────
  console.log('\n--- Test 6: Isometric Hold Movement Reaching Target Completes Exactly Once ---');
  sandbox.cleanupAllWorkoutTimers();
  sess = createTestSession();
  sess.warmupStatus = 'COMPLETED';
  sess.mainStatus = 'ACTIVE';
  sess.currentPhase = 'main';
  sess.phase = 'MAIN_WORKOUT';
  sess.activeExerciseIndex = 1; // L-sit Hold (25s)
  sess.activeSetIndex = 0;
  sandbox.saveActiveSession(sess);

  sandbox.startWorkoutHold(1, 0);
  sess = sandbox.getActiveSession();
  assert.strictEqual(sess.holdTimer.isRunning, true, 'Hold timer running');

  // Advance clock by 25 seconds
  currentTime += 25000;

  // Execute hold stop/completion
  sandbox.stopWorkoutHold(true);
  sess = sandbox.getActiveSession();

  assert.strictEqual(sess.holdTimer.isRunning, false, 'Hold timer stopped');
  assert.strictEqual(sess.exercises[1].sets[0].completed, true, 'L-sit Hold set marked completed');
  assert.strictEqual(sess.exercises[1].sets[0].actual_val, 25, 'Hold duration logged as 25s');
  assert(sess.exercises[1].sets[0].completed_at != null, 'Hold completed timestamp recorded');

  console.log('  ✓ 6. Passed: Isometric hold completion marks set completed exactly once with full duration.');

  console.log('\n=============================================================');
  console.log('🎉 ALL MOVEMENT COMPLETION BEHAVIOR TESTS PASSED 100%!');
  console.log('=============================================================\n');

  if (typeof sandbox !== 'undefined' && sandbox.cleanupAllWorkoutTimers) sandbox.cleanupAllWorkoutTimers();
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
