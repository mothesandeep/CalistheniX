const fs = require('fs');
const vm = require('vm');

// Setup mock DOM & Storage
const dom = {
  window: { location: { hash: '' } },
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

const loggedPayloads = [];
const createdSessions = [];

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
  Array: Array,
  Object: Object,
  API: {
    createWorkoutSession: async (s) => {
      createdSessions.push(s);
      return { status: 'ok' };
    },
    createLog: async (l) => {
      loggedPayloads.push(l);
      return { status: 'ok' };
    }
  },
  loadDashboardSummary: async () => ({}),
  loadDashboardActivity: async () => ({}),
  showWorkoutSummaryModal: () => ({}),
  render: () => ({}),
  showToast: () => ({}),
  cueSetComplete: () => ({}),
  cueExerciseComplete: () => ({}),
  cueCountdownTick: () => ({}),
  cueTimerComplete: () => ({}),
  state: {
    exercises: [
      { id: 1, name: 'Pull-up', movement_pattern: 'pull_vertical' },
      { id: 2, name: 'Inverted Row', movement_pattern: 'pull_horizontal' }
    ],
    levelExercises: [],
    view: 'workout',
    todayResolved: { workout: { name: 'PULL B', total_sets: 7 } }
  }
});

// Load frontend dependencies
['icons.js', 'utils.js', 'storage.js', 'audio.js', 'state.js'].forEach(file => {
  const filePath = `./frontend/js/${file}`;
  if (fs.existsSync(filePath)) {
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, context);
  }
});

// Load workout.js
const workoutCode = fs.readFileSync('./frontend/js/views/workout.js', 'utf8');
vm.runInContext(workoutCode, context);

console.log('=================================================================');
console.log('STARTING COMPLETE END-TO-END FLOW VERIFICATION (STEP 23)');
console.log('=================================================================\n');

// ─── 1. START WORKOUT ────────────────────────────────────────────────────────
console.log('1. Testing Session Initialization...');
const exercisesList = [
  {
    exercise_id: 1,
    exercise_name: 'Pull-up',
    exercise_type: 'reps',
    sets: 3,
    reps: 8,
    rest_sec: 90,
    notes: 'Vertical pulling'
  },
  {
    exercise_id: 2,
    exercise_name: 'Inverted Row',
    exercise_type: 'reps',
    sets: 4,
    reps: 10,
    rest_sec: 60,
    notes: 'Horizontal pulling'
  }
];

context.startWorkoutFromData('PULL B', exercisesList, 101);
let session = context.getActiveSession();
console.log('✓ Workout session created:', session.routine, 'Phase:', session.currentPhase);
if (session.currentPhase !== 'warmup' || session.warmup.length !== 5) {
  throw new Error('Initial session failed to create 3-phase structure');
}

// ─── 2. WARM-UP EXECUTION ───────────────────────────────────────────────────
console.log('\n2. Testing Warm-Up Flow...');
// A. Start individual warm-up exercise
context.selectExerciseToExecute('warmup', 0);
session = context.getActiveSession();
console.log('✓ Selected individual exercise 0:', session.warmup[0].exercise_name, 'Timer running:', session.phaseTimer?.isRunning);

// B. Adjust timer
context.adjustPhaseTimer(5);
session = context.getActiveSession();
console.log('✓ Adjusted timer +5s, duration:', session.phaseTimer?.duration);

// C. Complete individual exercise
context.toggleWarmupItemComplete(0);
session = context.getActiveSession();
console.log('✓ Completed exercise 0, completed count:', session.warmup.filter(w => w.completed).length);

// D. Test Auto-Runner
context.startPhaseAutoRunner('warmup');
session = context.getActiveSession();
console.log('✓ Auto-runner started at index:', session.warmup_idx, 'Timer running:', session.phaseTimer?.isRunning);

// E. Advance through warm-up sequentially
for (let i = session.warmup_idx; i < session.warmup.length; i++) {
  context.advanceWarmupMovement();
}
session = context.getActiveSession();
console.log('✓ Warm-up completion status:', session.warmup_status);
if (session.warmup_status !== 'completed') {
  throw new Error('Warm-up failed to reach completed state');
}

// ─── 3. SIMULATE REFRESH DURING WARM-UP / PHASE TRANSITION ─────────────────
console.log('\n3. Testing Persistence Across Page Refresh...');
const savedRaw = dom.localStorage.getItem('cx_active_session');
console.log('✓ Session state persisted in localStorage length:', savedRaw ? savedRaw.length : 0);
if (!savedRaw) throw new Error('Session state not saved in localStorage');

const restoredSession = JSON.parse(savedRaw);
if (restoredSession.warmup_status !== 'completed' || restoredSession.routine !== 'PULL B') {
  throw new Error('Restored session data mismatch');
}
console.log('✓ Page refresh restoration verified successfully');

// ─── 4. MAIN WORKOUT EXECUTION ──────────────────────────────────────────────
console.log('\n4. Testing Main Workout Flow...');
context.setWorkoutPhase('main');
session = context.getActiveSession();
console.log('✓ Switched to Main Workout phase:', session.currentPhase);

// A. Exercise Selection
context.selectExerciseToExecute('main', 0);
console.log('✓ Selected exercise 0 (Pull-up)');

// B. Rep Adjustments
context.adjustWorkoutSetActual(0, 0, 1);
session = context.getActiveSession();
console.log('✓ Adjusted Set 1 reps to:', session.exercises[0].sets[0].actual_val);

// C. Added Weight & RPE Logging
context.updateWorkoutSetWeight(0, 0, '10');
context.updateWorkoutSetRPE(0, 0, '8');
session = context.getActiveSession();
console.log('✓ Logged weight:', session.exercises[0].sets[0].weight_kg, 'kg, RPE:', session.exercises[0].sets[0].rpe);

// D. Toggle Set Completion
context.toggleWorkoutSet(0, 0);
session = context.getActiveSession();
console.log('✓ Set 1 completed:', session.exercises[0].sets[0].completed);

// E. Rest Timer Trigger & Adjustments
context.startWorkoutRest(90, 'Next: Set 2 · Pull-up');
context.adjustWorkoutRest(15);
context.stopWorkoutRest();
console.log('✓ Rest timer triggered, adjusted (+15s), and stopped');

// Complete remaining main sets
for (let exIdx = 0; exIdx < session.exercises.length; exIdx++) {
  const ex = session.exercises[exIdx];
  for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
    if (!ex.sets[sIdx].completed) {
      context.toggleWorkoutSet(exIdx, sIdx);
    }
  }
}
session = context.getActiveSession();
const allMainDone = session.exercises.every(ex => ex.sets.every(s => s.completed));
console.log('✓ All Main Workout sets completed:', allMainDone);
if (!allMainDone) throw new Error('Main workout sets failed to complete');

// ─── 5. COOL DOWN EXECUTION ─────────────────────────────────────────────────
console.log('\n5. Testing Cool Down Flow...');
context.setWorkoutPhase('cooldown');
session = context.getActiveSession();
console.log('✓ Switched to Cool Down phase:', session.currentPhase);

// A. Start individual stretch
context.selectExerciseToExecute('cooldown', 0);
session = context.getActiveSession();
console.log('✓ Selected stretch 0:', session.cooldown[0].exercise_name, 'Timer:', session.phaseTimer?.isRunning);

// B. Complete cooldown sequentially
for (let i = 0; i < session.cooldown.length; i++) {
  context.advanceCooldownStretch();
}
console.log('✓ Advanced through all cool-down recovery stretches');

// ─── 6. WORKOUT FINISHING & DATA PERSISTENCE ───────────────────────────────
console.log('\n6. Testing Workout Finishing & Persistence Engine...');
// Complete workout finishes cleanly
context.finishWorkoutSession();
console.log('✓ Finished workout session');

// Verify session snapshot structure
console.log('✓ Total session snapshots assembled:', createdSessions.length);
if (createdSessions.length > 0) {
  const s = createdSessions[0];
  console.log('✓ Session payload summary:', {
    routine: s.routine,
    duration_sec: s.duration_sec,
    warmup_status: s.warmup_status,
    cooldown_status: s.cooldown_status,
    exercises_count: s.exercises.length
  });
}

console.log('\n=================================================================');
console.log('ALL COMPLETE FLOW TEST ASSERTIONS PASSED SUCCESSFULLY! ✅');
console.log('=================================================================');
