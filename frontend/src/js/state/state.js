/**
 * CalistheniX — Global Application State
 *
 * Central reactive state tree and session module variables.
 */

const state = {
  view:            'dashboard', // 'dashboard' | 'home' | 'routine' | 'edit' | 'log' | 'history' | 'prs' | 'calendar'
  routine:         'Push A',
  exercises:       [],       // all exercises from GET /exercises
  editingId:       null,     // id of exercise being edited (null = none)
  // Training Splits & Weekly Schedules (Custom Split Phase)
  splits:                [],       // list of all training splits from GET /splits
  activeSplit:           null,     // currently active split object
  selectedSplitId:       null,     // split id being viewed/edited in #routine
  selectedSplitDetail:   null,     // full split object with 7-day schedule from GET /splits/<id>
  editingDayIndex:       null,     // 0..6 if a day edit modal is active
  showCreateSplitModal:  false,    // create split modal visibility
  showEditSplitModal:    false,    // edit split modal visibility
  editingSplitId:        null,     // split id currently being edited in modal
  workouts:              [],       // list of all reusable workouts from GET /workouts
  selectedWorkoutId:     null,     // workout id being viewed/edited in #edit
  selectedWorkoutDetail: null,     // full workout object with exercises from GET /workouts/<id>
  editSubTab:            'workouts', // 'workouts' | 'catalog'
  showCreateWorkoutModal:false,    // create workout modal visibility
  showExercisePickerModal: false,  // exercise library picker modal visibility
  exercisePickerPhase:   'main',   // 'warmup' | 'main' | 'cooldown'
  exercisePickerSearch:  '',       // search term in picker
  exercisePickerFilter:  'All',    // 'All' | 'Push' | 'Pull' | 'Legs' | 'Core' | 'Skill' | 'Isometric'
  showAssignDaysModal:   false,    // assign routine to week days modal visibility
  assignRoutineWorkoutId:null,     // workout id being assigned to week days
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
  sessionTotalSets:null,     // total sets from workout exercise; null = unguided
  sessionRestSec:  null,     // rest_sec from workout exercise; null = unguided
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
  // Persistent Settings and Athlete Preferences
  language:           (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_language')) || 'en',
  weightUnit:         (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_weight_unit')) || 'kg',
  defaultRestSec:     (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && parseInt(localStorage.getItem('cx_default_rest_sec'), 10)) || 90,
  restPauseSec:       (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && parseInt(localStorage.getItem('cx_rest_pause_sec'), 10)) || 15,
  keepScreenAwake:    (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function' || localStorage.getItem('cx_keep_screen_awake') !== '0'),
  soundsEnabled:      (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function' || localStorage.getItem('cx_muted') !== '1'),
  flashScreen:        (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_flash_screen') === '1'),
  effortMode:         (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_effort_mode')) || 'RIR',
  theme:              (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_theme')) || 'dark',
  bodyDiagramModel:   (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_body_diagram_model')) || 'male',
  accentColor:        (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_accent_color')) || '#FF5D5D',
  equipmentProfile:   (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('cx_equipment_profile'))
    ? (function() { try { return JSON.parse(localStorage.getItem('cx_equipment_profile')) || ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor']; } catch { return ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor']; } })()
    : ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor'],
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

// ─── Body Weight & Check-In State Management ───────────────────────────────
const DEFAULT_WEIGHT_HISTORY = [
  { date: '2026-07-01', weight: 82.4 },
  { date: '2026-07-05', weight: 82.1 },
  { date: '2026-07-10', weight: 81.8 },
  { date: '2026-07-16', weight: 81.5 },
  { date: '2026-07-23', weight: 80.7 },
  { date: '2026-07-29', weight: 80.4 },
  { date: '2026-08-04', weight: 80.1 },
  { date: '2026-08-10', weight: 79.8 },
  { date: '2026-08-16', weight: 79.5 },
  { date: '2026-08-23', weight: 79.1 },
  { date: '2026-08-27', weight: 78.4 },
  { date: '2026-08-31', weight: 78.3 }
];

function getWeightHistory() {
  if (typeof state !== 'undefined' && state.weightHistory && Array.isArray(state.weightHistory) && state.weightHistory.length > 0) {
    return state.weightHistory;
  }
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('cx_weight_history');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (typeof state !== 'undefined') state.weightHistory = parsed;
          return parsed;
        }
      } catch (e) {}
    }
  }
  if (typeof state !== 'undefined') state.weightHistory = [];
  return [];
}

function getTargetWeight() {
  if (typeof state !== 'undefined' && state.targetWeight != null) return Number(state.targetWeight);
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('cx_target_weight');
    if (raw && !isNaN(Number(raw))) return Number(raw);
  }
  return 77.0;
}

function setTargetWeight(targetKg) {
  const val = Number(targetKg);
  if (isNaN(val) || val <= 0) return;
  if (typeof state !== 'undefined') state.targetWeight = val;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cx_target_weight', String(val));
}

function saveBodyWeight(weightKg, dateStr = null) {
  const val = Math.round(Number(weightKg) * 10) / 10;
  if (isNaN(val) || val <= 0) return null;

  const history = getWeightHistory().slice();
  const date = (dateStr || (typeof todayISO === 'function' ? todayISO() : new Date().toISOString().substring(0, 10))).substring(0, 10);

  // Check if entry for this date already exists — update it if so
  const existingIdx = history.findIndex(h => (h.date || '').substring(0, 10) === date);
  if (existingIdx >= 0) {
    history[existingIdx] = { ...history[existingIdx], weight: val, date };
  } else {
    history.push({ date, weight: val });
  }

  // Sort chronologically ascending
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (typeof state !== 'undefined') {
    state.weightHistory = history;
    state.latestWeight = val;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cx_weight_history', JSON.stringify(history));
    localStorage.setItem('cx_latest_weight', String(val));
  }

  // Trigger reactive UI refresh if on home view without page reload
  if (typeof state !== 'undefined' && (state.view === 'home' || state.view === 'dashboard')) {
    const mobileView = document.querySelector('.home-mobile-view');
    if (mobileView && typeof renderHomeView === 'function') {
      const container = document.getElementById('view-home') || document.getElementById('app-root');
      if (container) {
        renderHomeView(container);
      }
    }
  }

  return val;
}

function deleteBodyWeight(dateStr) {
  if (!dateStr) return;
  const targetDate = dateStr.substring(0, 10);
  const history = getWeightHistory().slice();
  const filtered = history.filter(h => (h.date || '').substring(0, 10) !== targetDate);
  if (typeof state !== 'undefined') {
    state.weightHistory = filtered;
    if (filtered.length > 0) {
      state.latestWeight = filtered[filtered.length - 1].weight;
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cx_weight_history', JSON.stringify(filtered));
    if (filtered.length > 0) {
      localStorage.setItem('cx_latest_weight', String(filtered[filtered.length - 1].weight));
    }
  }
  // Refresh UI
  if (typeof render === 'function') {
    render();
  }
  // Refresh checkin modal recent list if open
  if (typeof renderQuickCheckInRecentList === 'function') {
    renderQuickCheckInRecentList();
  }
}

function formatWeightPointDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${daysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`;
}

if (typeof window !== 'undefined') {
  window.state = state;
  window.setCurrentMovementPattern = setCurrentMovementPattern;
  window.EXERCISE_COACHING_TIPS = EXERCISE_COACHING_TIPS;
  window.getWeightHistory = getWeightHistory;
  window.getTargetWeight = getTargetWeight;
  window.setTargetWeight = setTargetWeight;
  window.saveBodyWeight = saveBodyWeight;
  window.deleteBodyWeight = deleteBodyWeight;
  window.formatWeightPointDate = formatWeightPointDate;
}
