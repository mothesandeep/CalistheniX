/**
 * CalistheniX — Global State & Shared Core Utilities
 */

// ─── Modern SVG Icon System ──────────────────────────────────────────────────
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  pullup: '<path d="M3 4h18"/><path d="M6 4v5"/><path d="M18 4v5"/><path d="M9 13v7"/><path d="M15 13v7"/><path d="M9 13h6"/>',
  rings: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><line x1="7" y1="3" x2="7" y2="11.5"/><line x1="17" y1="3" x2="17" y2="11.5"/>',
  tempo: '<path d="m14 3-5 18h10l-5-18z"/><line x1="12" y1="3" x2="8" y2="12"/><circle cx="8" cy="12" r="1.5"/>',
  rpe: '<path d="M12 4a9 9 0 0 0-9 9 9 9 0 0 0 13.5 7.8M21 13a9 9 0 0 0-3.5-7.1"/><line x1="12" y1="13" x2="16" y2="9"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  calendarDays: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  history: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>',
  trendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>',
  dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95l1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95Z"/><path d="m3 3 1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95L8.65-2.65a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95Z"/>',
  barChart: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/><line x1="2" x2="22" y1="20" y2="20"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  moreVertical: '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
  chevronUp: '<polyline points="18 15 12 9 6 15"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M12 2v3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volumeMute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
};

function renderIcon(name, cls = 'cx-icon') {
  const body = ICONS[name] || '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const ROUTINES = ['Push A', 'Push B', 'Pull A', 'Pull B', 'Legs A', 'Legs B'];
const LEVELS   = [1, 2, 3, 4, 5];

// ─── Rolling 7-day cycle (not tied to weekday) ────────────────────────────────
// Day 1: Push A | Day 2: Pull A | Day 3: Legs A
// Day 4: Push B | Day 5: Pull B | Day 6: Legs B | Day 7: Rest
const CYCLE = [
  'Push A',  // day 1
  'Pull A',  // day 2
  'Legs A',  // day 3
  'Push B',  // day 4
  'Pull B',  // day 5
  'Legs B',  // day 6
  'Rest',    // day 7
];

const LS_CYCLE_KEY = 'cx_cycle_start';

// Return today's ISO date string (YYYY-MM-DD, local calendar day).
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get or initialise the cycle start date in localStorage.
function getCycleStart() {
  let start = localStorage.getItem(LS_CYCLE_KEY);
  if (!start) {
    start = todayISO();
    localStorage.setItem(LS_CYCLE_KEY, start);
  }
  return start;
}

// Days elapsed between two ISO date strings (today minus startDate, floored).
function daysBetween(startISO, endISO) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / msPerDay);
}

// Returns the current cycle day's split name (e.g. 'Push A' or 'Rest').
function getTodayDay() {
  const cycleDay = daysBetween(getCycleStart(), todayISO()) % 7;
  return CYCLE[cycleDay];
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getTodayLabel()  {
  const d = new Date();
  return `${DAY_NAMES[d.getDay()]} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Application state ───────────────────────────────────────────────────────
const state = {
  view:            'dashboard', // 'dashboard' | 'home' | 'routine' | 'edit' | 'log' | 'history'
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

// API client functions are loaded from js/api.js (window.API)

// ─── UUID generator (crypto.randomUUID with fallback) ─────────────────────────
function newUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── localStorage-first sync (architecture.md §3) ────────────────────────────
// Key prefix for pending (unsynced) log entries.
const LS_PREFIX    = 'cx_pending_';
const LS_MUTE_KEY  = 'cx_muted';    // '1' = muted, absent/other = unmuted

// Write a log entry to localStorage immediately.
// Returns the client_uuid so the caller can track it.
function lsWriteLog(entry) {
  const uuid = entry.client_uuid || newUUID();
  const record = { ...entry, client_uuid: uuid, synced: false };
  localStorage.setItem(`${LS_PREFIX}${uuid}`, JSON.stringify(record));
  return uuid;
}

const LS_SESSION_PREFIX = 'cx_pending_session_';

function updateSyncStatus(status) {
  const pills = [
    document.getElementById('sync-status-pill'),
    document.getElementById('sync-status-pill-mobile')
  ].filter(Boolean);
  const txt = document.getElementById('sync-status-text');

  let cls = 'sync-pill-synced';
  let label = 'Synced';
  if (status === 'syncing') {
    cls = 'sync-pill-syncing';
    label = 'Syncing...';
  } else if (status === 'local') {
    cls = 'sync-pill-local';
    label = 'Saved locally';
  } else if (status === 'offline') {
    cls = 'sync-pill-local';
    label = 'Offline';
  }

  pills.forEach(p => {
    p.className = `sync-pill ${cls}`;
  });
  if (txt) txt.textContent = label;
}

// Push all unsynced entries to POST /logs and POST /workout_sessions.
async function lsSyncPending() {
  const sessionKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_SESSION_PREFIX));
  const logKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));

  if (sessionKeys.length === 0 && logKeys.length === 0) {
    if (!navigator.onLine) updateSyncStatus('offline');
    else updateSyncStatus('synced');
    return;
  }

  if (!navigator.onLine) {
    updateSyncStatus('local');
    return;
  }

  updateSyncStatus('syncing');

  // 1. Sync pending workout sessions
  for (const key of sessionKeys) {
    let sessionRecord;
    try { sessionRecord = JSON.parse(localStorage.getItem(key)); } catch { continue; }
    try {
      await API.createWorkoutSession(sessionRecord);
      localStorage.removeItem(key);
    } catch {
      // Leave in localStorage for next retry
    }
  }

  // 2. Sync pending individual log entries
  for (const key of logKeys) {
    let record;
    try { record = JSON.parse(localStorage.getItem(key)); } catch { continue; }
    if (record.synced) { localStorage.removeItem(key); continue; }
    try {
      await API.createLog(record);
      localStorage.removeItem(key); // clean up confirmed entries
    } catch {
      // Network unavailable — leave in localStorage, will retry on next sync.
    }
  }

  const remainingSessions = Object.keys(localStorage).filter(k => k.startsWith(LS_SESSION_PREFIX));
  const remainingLogs = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
  if (remainingSessions.length > 0 || remainingLogs.length > 0) {
    updateSyncStatus('local');
  } else {
    updateSyncStatus('synced');
  }
}

// Schedule background sync: on load, on tab focus, on reconnect (online), every 30 s.
function startSyncLoop() {
  lsSyncPending();
  window.addEventListener('focus', lsSyncPending);
  window.addEventListener('online', () => {
    showToast('Back online! Syncing workouts...');
    lsSyncPending();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus('offline');
    showToast('Offline mode active. Workouts will save locally.');
  });
  setInterval(lsSyncPending, 30_000);
}

// ─── Audio + vibration cue system ───────────────────────────────────────────
// All sound generated via Web Audio API OscillatorNode — no external files.
// Mute toggle disables both sound and vibration. Default: unmuted.

const LS_AUDIO_CUES_KEY = 'calisthenix_audio_cues';
const LS_AUTO_ADVANCE_KEY = 'calisthenix_auto_advance';

function isMuted() { return localStorage.getItem(LS_MUTE_KEY) === '1'; }

function toggleMute() {
  const next = isMuted() ? null : '1';
  if (next) localStorage.setItem(LS_MUTE_KEY, next);
  else      localStorage.removeItem(LS_MUTE_KEY);
  // Update mute button icon in-place without a full re-render.
  document.querySelectorAll('.btn-mute').forEach(btn => {
    btn.innerHTML = next ? renderIcon('volumeMute', 'cx-icon') : renderIcon('volume', 'cx-icon');
    btn.title       = next ? 'Unmute' : 'Mute';
  });
}

function isAudioCuesEnabled() {
  if (isMuted()) return false;
  return localStorage.getItem(LS_AUDIO_CUES_KEY) !== '0';
}

function toggleAudioCues() {
  const current = isAudioCuesEnabled();
  localStorage.setItem(LS_AUDIO_CUES_KEY, current ? '0' : '1');
  return !current;
}

function setAudioCuesEnabled(enabled) {
  localStorage.setItem(LS_AUDIO_CUES_KEY, enabled ? '1' : '0');
}

function isAutoAdvanceEnabled() {
  return localStorage.getItem(LS_AUTO_ADVANCE_KEY) !== '0';
}

function toggleAutoAdvance() {
  const current = isAutoAdvanceEnabled();
  localStorage.setItem(LS_AUTO_ADVANCE_KEY, current ? '0' : '1');
  return !current;
}

function setAutoAdvanceEnabled(enabled) {
  localStorage.setItem(LS_AUTO_ADVANCE_KEY, enabled ? '1' : '0');
}

// Lazy AudioContext with iOS WebKit gesture unlocker
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        _audioCtx = new AudioCtxClass();
      }
    } catch {
      _audioCtx = null;
    }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

// Global user-gesture audio unlock for iOS Safari autoplay restrictions
function setupAudioUnlock() {
  const unlock = () => {
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

// ─── Screen Wake Lock API System ──────────────────────────────────────────
// Prevents mobile/tablet screen from sleeping or locking during active workouts.
let _screenWakeLock = null;

async function acquireScreenWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
    try {
      if (!_screenWakeLock || _screenWakeLock.released) {
        _screenWakeLock = await navigator.wakeLock.request('screen');
        _screenWakeLock.addEventListener('release', () => {
          _screenWakeLock = null;
        });
      }
    } catch {
      // Graceful silent fallback on unsupported platforms, battery saver, or policy restrictions
      _screenWakeLock = null;
    }
  }
}

async function releaseScreenWakeLock() {
  if (_screenWakeLock) {
    try {
      if (!_screenWakeLock.released && typeof _screenWakeLock.release === 'function') {
        await _screenWakeLock.release();
      }
    } catch {
      // Graceful silent fallback on release error
    }
    _screenWakeLock = null;
  }
}

function isScreenWakeLockActive() {
  return !!(_screenWakeLock && !_screenWakeLock.released);
}

// Auto-reacquire wake lock when tab returns to foreground if workout is in progress
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const session = typeof getActiveSession === 'function' ? getActiveSession() : null;
      if (session && (session.status === 'in_progress' || session.status === 'active')) {
        if (typeof state !== 'undefined' && state.view === 'workout') {
          await acquireScreenWakeLock();
        }
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.acquireScreenWakeLock = acquireScreenWakeLock;
  window.releaseScreenWakeLock = releaseScreenWakeLock;
  window.isScreenWakeLockActive = isScreenWakeLockActive;
}

// Play a synthesised beep with full feature-detection and silent degradation.
// freq: Hz | durationMs: ms | volume: 0–1 | type: OscillatorType
function beep(freq = 880, durationMs = 80, volume = 0.4, type = 'sine') {
  if (isMuted() || !isAudioCuesEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    // Fast fade-out to avoid click at end
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Graceful degradation on unsupported browsers or backgrounded tabs
  }
}

// Safe haptic pulse with explicit iOS Safari feature-detection (silent no-op on iOS)
function vibrate(pattern = 200) {
  if (isMuted()) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Gracefully catch any security or permissions policy restrictions
  }
}

// ── Named cues ───────────────────────────────────────────────────────────────

// Short beep at 3, 2, 1 seconds remaining during timed holds / countdowns
function cueCountdownTick(secondsRemaining = 3) {
  if (!isAudioCuesEnabled()) return;
  // High-frequency crisp countdown tick (740 Hz, ~75ms)
  beep(740, 75, 0.42, 'sine');
  vibrate(35);
}

// Distinct "completion chime" when timed movement timer hits 0 (ascending harmonic chime)
function cueTimerComplete() {
  if (!isAudioCuesEnabled()) return;
  // Ascending 4-tone melodic arpeggio C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz)
  beep(523.25, 80, 0.45, 'sine');
  setTimeout(() => beep(659.25, 90, 0.5, 'sine'), 85);
  setTimeout(() => beep(783.99, 100, 0.55, 'sine'), 180);
  setTimeout(() => beep(1046.50, 260, 0.65, 'sine'), 285);
  vibrate([60, 40, 100, 40, 160]);
}

// Rest countdown hit zero → start next set. Main alert.
function cueRestEnd() {
  beep(880, 120, 0.55, 'sine');
  vibrate(200);
}

// Tick during last 3 seconds of rest. Quiet, distinct pitch.
function cueTick() {
  beep(660, 60, 0.2, 'sine');
}

// Hold timer stopped and saved mid-exercise.
function cueHoldSave() {
  beep(1047, 100, 0.4, 'sine'); // C6 — higher/lighter
  vibrate(150);
}

// Single set completed: crisp upward chime + subtle haptic pulse
function cueSetComplete() {
  beep(587.33, 60, 0.45, 'sine'); // D5
  setTimeout(() => beep(880, 90, 0.5, 'sine'), 65); // A5 upward chime
  vibrate([40, 30, 60]);
}

// All sets of an exercise complete: two-beep fanfare.
function cueExerciseComplete() {
  beep(880,  90, 0.5, 'sine');
  setTimeout(() => beep(1174, 120, 0.5, 'sine'), 130); // D6
  vibrate([80, 60, 120]);
}



// ─── Formatters & UI Utilities ───────────────────────────────────────────────
function fmtTarget(le) {
  if (le.type === 'duration') {
    return `${le.duration_sec ?? 30}s hold`;
  }
  return `${le.reps ?? 10} reps`;
}

function fmtTempo(t) { return t || 'Standard'; }
function fmtRest(r)  { return r ? `${r}s rest` : '90s rest'; }
function badge(type) {
  if (type === 'duration') return '<span class="cx-badge cx-badge-gold">Hold</span>';
  return '<span class="cx-badge cx-badge-cyan">Reps</span>';
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Morning';
  if (hr < 18) return 'Afternoon';
  return 'Evening';
}

function fmtSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

let _toastTimer = null;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'} toast-show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.className = 'toast toast-hidden';
  }, 3500);
}

// ─── Active Session & Timer Context ──────────────────────────────────────────
const LS_ACTIVE_SESSION = 'cx_active_session';
let _workoutTimerInterval = null;
let _workoutHoldInterval = null;
let _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, duration: 0, target: 0 };
let _workoutRestInterval = null;
let _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
let _selectedWorkoutExIdx = null;
let _chartInstance = null;
let _activeMuscleView = 'front';
let _currentWorkoutMuscles = { label: 'Legs, Glutes, Core', frontMuscles: ['quads', 'abs'], backMuscles: ['glutes', 'calves'] };
let _biomechanicsTab = 'anatomy';

function getExercise(id) {
  if (!id) return null;
  return (state && state.exercises) ? (state.exercises.find(e => e.id === Number(id)) || null) : null;
}

function getActiveSession() {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveActiveSession(session) {
  if (!session) {
    localStorage.removeItem(LS_ACTIVE_SESSION);
  } else {
    localStorage.setItem(LS_ACTIVE_SESSION, JSON.stringify(session));
  }
}

function getSessionElapsedSec(session) {
  if (!session) return 0;
  const start = session.startTime || session.startedAt;
  if (!start) return 0;

  const now = Date.now();
  let pausedMs = session.totalPausedMs || (session.pausedTotalSec ? session.pausedTotalSec * 1000 : 0);
  if (session.status === 'paused' && session.pausedAt) {
    pausedMs += (now - session.pausedAt);
  }
  const rawElapsedMs = now - start - pausedMs;
  return Math.max(0, Math.floor(rawElapsedMs / 1000));
}

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

const RPE_DESCRIPTIONS = {
  1: 'Very light recovery (5+ reps in reserve)',
  2: 'Light warmup (5+ reps in reserve)',
  3: 'Light warmup (4+ reps in reserve)',
  4: 'Moderate warmup (4 reps in reserve)',
  5: 'Moderate warmup (3-4 reps in reserve)',
  6: 'Comfortable effort (~4 reps in reserve)',
  7: 'Moderate effort (~3 reps in reserve)',
  7.5: 'Solid working set (~2-3 reps in reserve)',
  8: 'Challenging effort (2 reps in reserve)',
  8.5: 'Heavy working set (1-2 reps in reserve)',
  9: 'Near maximal effort (1 rep in reserve)',
  9.5: 'Extremely hard (maybe 1 grindy rep left)',
  10: 'Maximal effort / Absolute failure (0 reps in reserve)'
};

if (typeof window !== 'undefined') {
  window.state = state;
  window.renderIcon = renderIcon;
  window.getActiveSession = getActiveSession;
  window.saveActiveSession = saveActiveSession;
  window.getExercise = getExercise;
  window.fmtSecs = fmtSecs;
  window.todayISO = todayISO;
  window.newUUID = newUUID;
  window.getGreeting = getGreeting;
  window.showToast = showToast;
  window.DAY_NAMES = DAY_NAMES;
  window.MONTH_NAMES = MONTH_NAMES;
}
