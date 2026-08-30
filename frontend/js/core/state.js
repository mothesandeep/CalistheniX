/**
 * CalistheniX — Global Application State
 *
 * Central reactive state tree and session module variables.
 */

const state = {
  view:            'dashboard', // 'dashboard' | 'home' | 'routine' | 'edit' | 'log' | 'history' | 'prs' | 'calendar'
  routine:         'Push A',
  level:           1,
  exercises:       [],       // all exercises from GET /exercises
  levelId:         null,     // current routine_level.id (null = not yet created)
  levelExercises:  [],       // level_exercises joined with exercise data
  editingId:       null,     // id of level_exercise being edited (null = none)
  // Training Splits & Weekly Schedules (Custom Split Phase)
  splits:                [],       // list of all training splits from GET /splits
  activeSplit:           null,     // currently active split object
  selectedSplitId:       null,     // split id being viewed/edited in #routine
  selectedSplitDetail:   null,     // full split object with 7-day schedule from GET /splits/<id>
  editingDayIndex:       null,     // 0..6 if a day edit modal is active
  showCreateSplitModal:  false,    // create split modal visibility
  workouts:              [],       // list of all reusable workouts from GET /workouts
  selectedWorkoutId:     null,     // workout id being viewed/edited in #edit
  selectedWorkoutDetail: null,     // full workout object with exercises from GET /workouts/<id>
  editSubTab:            'workouts', // 'workouts' | 'catalog'
  showCreateWorkoutModal:false,    // create workout modal visibility
  todayResolved:         null,     // { status, day_of_week, day_name, split_name, workout, next_workout }
  // Dashboard view
  dashboardSummary: null,    // { streak_days, week_sessions, week_sets, top_movers }
  // Screen 1: Today's Day
  todayLogs:       {},       // { exercise_id: last_log | null }
  // Screen 2: Log Entry
  logExerciseId:   null,     // exercise.id being logged
  logReturnView:   'home',   // view to return to on goBack()
  // Guided session state (populated when opening from Today's Routine)
  sessionSet:      1,        // current set number (1-indexed)
  sessionTotalSets:null,     // total sets from level_exercise; null = unguided
  sessionRestSec:  null,     // rest_sec from level_exercise; null = unguided
  // Rest countdown
  restActive:      false,    // true while countdown is showing
  restRemaining:   0,        // seconds left on countdown
  restIntervalId:  null,     // setInterval id for countdown tick
  // Screen 3: History / Chart
  historyExerciseId: null,   // exercise.id whose chart is shown
  historyLogs:       null,   // null = loading | [] = no data | [...] = loaded
  historyMetricMode: 'best', // 'best' (max set) | 'volume' (sum/total)
  historyProgression:null,   // progression readiness status from /progression-status
  logTimer:        null,     // { startedAt: ms, intervalId } | null
  logElapsed:      0,        // seconds displayed on timer
  // Phase 3 & 4: Active Workout & Analytics
  activeSession:     null,   // in-progress workout session object
  dashboardRecords:  [],     // personal records from /dashboard/records
  dashboardActivity: [],     // 30-day activity logs from /dashboard/activity
  // Dedicated PRs & Calendar
  prsFilter:         'all',  // 'all' | 'reps' | 'hold' | 'weight'
  prsSearchQuery:    '',
  calendarYear:      new Date().getFullYear(),
  calendarMonth:     new Date().getMonth(),
  selectedCalendarDate: todayISO(),
  // Live Movement Pattern & Active Animation Tracking
  currentMovementPattern: 'push',
  currentExerciseId:      null,
  currentExerciseName:    '',
};

/**
 * Track and update the active exercise movement pattern in state.
 * Emits custom event 'cx:movement-pattern-changed' when pattern changes.
 */
function setCurrentMovementPattern(pattern, exerciseId = null, exerciseName = '') {
  const normalized = (typeof window !== 'undefined' && window.ExerciseAnimation)
    ? window.ExerciseAnimation.getPatternKey(pattern)
    : (pattern || 'push');
  const hasChanged = state.currentMovementPattern !== normalized || state.currentExerciseId !== exerciseId;
  state.currentMovementPattern = normalized;
  state.currentExerciseId = exerciseId;
  if (exerciseName) state.currentExerciseName = exerciseName;

  if (hasChanged && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('cx:movement-pattern-changed', {
      detail: { pattern: normalized, exerciseId, exerciseName }
    }));
  }
  return normalized;
}

// ─── Module-Level Runner State Variables ─────────────────────────────────────
let _workoutTimerInterval = null;
let _workoutHoldInterval = null;
let _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, duration: 0, target: 0 };
let _workoutRestInterval = null;
let _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
let _workoutPhaseTimerInterval = null;
let _selectedWorkoutExIdx = null;
let _chartInstance = null;
let _activeMuscleView = 'front';
let _currentWorkoutMuscles = { label: 'Legs, Glutes, Core', frontMuscles: ['quads', 'abs'], backMuscles: ['glutes', 'calves'] };
let _biomechanicsTab = 'anatomy';

const EXERCISE_COACHING_TIPS = {
  'Push-ups': {
    cue: 'Screw your hands into the floor to pack your lats and stabilize your shoulders.',
    anatomy: 'Primary: Chest (Sternal/Clavicular), Anterior Deltoid, Triceps Brachii. Secondary: Core, Serratus Anterior.',
    commonMistake: 'Sagging lower back or flared elbows (>45 degrees).',
    regression: 'Incline Push-ups or Knee Push-ups',
    progression: 'Diamond Push-ups or Ring Push-ups'
  },
  'Diamond Push-ups': {
    cue: 'Thumbs and index fingers touch under the sternum; keep elbows tucked to chest.',
    anatomy: 'Primary: Triceps Brachii (Medial/Lateral/Long head), Inner Sternal Pectoralis.',
    commonMistake: 'Flaring elbows outward putting excess torque on wrist joints.',
    regression: 'Standard Push-ups',
    progression: 'Archer Push-ups or Dips'
  },
  'Dips': {
    cue: 'Depress shoulders downwards before descending; lean chest slightly forward for chest bias.',
    anatomy: 'Primary: Lower Pectoralis Major, Triceps Brachii, Anterior Deltoids.',
    commonMistake: 'Shrugging shoulders into ears causing acromial impingement.',
    regression: 'Bench Dips or Band-assisted Parallel Bar Dips',
    progression: 'Ring Dips or Weighted Dips'
  },
  'Pull-ups': {
    cue: 'Drive elbows down to hips; lead with sternum towards the bar with hollow body.',
    anatomy: 'Primary: Latissimus Dorsi, Teres Major, Biceps Brachii, Brachialis, Rhomboids.',
    commonMistake: 'Kicking legs or kipping without active scapular depression first.',
    regression: 'Scapular Pull-ups or Band-Assisted Pull-ups',
    progression: 'L-Sit Pull-ups, Archer Pull-ups, or Weighted Pull-ups'
  },
  'Chin-ups': {
    cue: 'Supinated grip shoulder-width; pull chest to bar squeezing biceps at the peak.',
    anatomy: 'Primary: Biceps Brachii (Short/Long head), Latissimus Dorsi, Lower Trapezius.',
    commonMistake: 'Incomplete range of motion at bottom dead hang.',
    regression: 'Inverted Supinated Rows',
    progression: 'L-Sit Chin-ups or Weighted Chin-ups'
  },
  'Inverted Rows': {
    cue: 'Retract scapulae first, pull bar to lower ribs while keeping body as rigid as a plank.',
    anatomy: 'Primary: Rhomboids, Middle/Lower Traps, Posterior Deltoid, Brachialis.',
    commonMistake: 'Hips sagging or neck craning forward to reach the bar.',
    regression: 'High-angle Incline Rows',
    progression: 'Feet-elevated Rows or Ring Inverted Rows'
  },
  'Squats': {
    cue: 'Spread the floor with feet; track knees over toes while keeping torso upright.',
    anatomy: 'Primary: Quadriceps (Rectus Femoris, Vasto-laterals), Gluteus Maximus.',
    commonMistake: 'Knees caving inward (valgus collapse) or heels lifting.',
    regression: 'Box Squats or Assisted Squats',
    progression: 'Bulgarian Split Squats, Pistol Squats'
  },
  'Bulgarian Split Squats': {
    cue: 'Drop back knee straight down toward the floor; keep 80% weight on lead heel.',
    anatomy: 'Primary: Quadriceps, Gluteus Medius/Maximus, Hamstrings.',
    commonMistake: 'Lead foot too close to bench jamming knee forward excessively.',
    regression: 'Static Split Squats',
    progression: 'Elevated Front-Foot Split Squats or Deficit Pistol Squats'
  },
  'Pike Push-ups': {
    cue: 'Form a tripod at the bottom: head descends forward of hands.',
    anatomy: 'Primary: Anterior & Lateral Deltoids, Clavicular Pectoral, Upper Traps.',
    commonMistake: 'Descending head straight between hands instead of forward triangle.',
    regression: 'Decline Push-ups',
    progression: 'Elevated Feet Pike Push-ups or Wall Handstand Push-ups'
  },
  'Hollow Body Hold': {
    cue: 'Press lumbar spine flush against the floor; glue thighs together with pointed toes.',
    anatomy: 'Primary: Rectus Abdominis, Transverse Abdominis, Hip Flexors (Psoas).',
    commonMistake: 'Lower back arching off the floor breaking intra-abdominal pressure.',
    regression: 'Tuck Hollow Hold (knees bent at 90)',
    progression: 'Rocking Hollow Body or V-Ups'
  },
  'Plank': {
    cue: 'Protraction at scapulae (push floor away), posterior pelvic tilt, squeeze glutes.',
    anatomy: 'Primary: Transverse Abdominis, Rectus Abdominis, Serratus Anterior.',
    commonMistake: 'Hips sagging or hiking too high in a pike position.',
    regression: 'Kneeling Plank',
    progression: 'Extended Arm Long-lever Plank'
  },
  'L-Sit': {
    cue: 'Lock elbows, depress scapulae hard into parallel bars, point toes forward.',
    anatomy: 'Primary: Iliopsoas, Rectus Abdominis, Quadriceps, Lower Trapezius/Lats.',
    commonMistake: 'Shoulders shrugging up or knees bending.',
    regression: 'Tuck L-Sit or One-leg extended L-Sit',
    progression: 'V-Sit or Manna progression'
  }
};

if (typeof window !== 'undefined') {
  window.state = state;
  window.setCurrentMovementPattern = setCurrentMovementPattern;
  window.EXERCISE_COACHING_TIPS = EXERCISE_COACHING_TIPS;
}
