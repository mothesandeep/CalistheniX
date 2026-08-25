/* ============================================================
   app.js — CalistheniX
   Views: home | edit | routine | log
   home    = Screen 1: Today's Day (default landing)
   routine = Today's Routine level view
   edit    = Edit Routine Levels
   log     = Screen 2: Log Entry
   All functions in global scope for inline event handlers.
   ============================================================ */

const API_BASE = 'http://127.0.0.1:5001';

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
};

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

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
      await api('POST', '/workout_sessions', sessionRecord);
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
      await api('POST', '/logs', record);
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
    showToast('Back online! Syncing workouts... 🌐');
    lsSyncPending();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus('offline');
    showToast('Offline mode active. Workouts will save locally 💾');
  });
  setInterval(lsSyncPending, 30_000);
}

// ─── Audio + vibration cue system ───────────────────────────────────────────
// All sound generated via Web Audio API OscillatorNode — no external files.
// Mute toggle disables both sound and vibration. Default: unmuted.

function isMuted() { return localStorage.getItem(LS_MUTE_KEY) === '1'; }

function toggleMute() {
  const next = isMuted() ? null : '1';
  if (next) localStorage.setItem(LS_MUTE_KEY, next);
  else      localStorage.removeItem(LS_MUTE_KEY);
  // Update mute button icon in-place without a full re-render.
  document.querySelectorAll('.btn-mute').forEach(btn => {
    btn.textContent = next ? '🔇' : '🔊';
    btn.title       = next ? 'Unmute' : 'Mute';
  });
}

// Lazy AudioContext — created on first user interaction to satisfy autoplay policy.
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { _audioCtx = null; }
  }
  return _audioCtx;
}

// Play a synthesised beep.
// freq: Hz | durationMs: ms | volume: 0–1 | type: OscillatorType
function beep(freq = 880, durationMs = 80, volume = 0.4, type = 'sine') {
  if (isMuted()) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
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
  } catch { /* AudioContext may be suspended on some browsers */ }
}

// Short haptic pulse (no-op if navigator.vibrate not supported).
function vibrate(ms = 200) {
  if (isMuted()) return;
  try { navigator.vibrate?.(ms); } catch { }
}

// ── Named cues ───────────────────────────────────────────────────────────────

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

// All sets of an exercise complete: two-beep fanfare.
function cueExerciseComplete() {
  beep(880,  90, 0.5, 'sine');
  setTimeout(() => beep(1174, 120, 0.5, 'sine'), 130); // D6
  vibrate([80, 60, 120]);
}

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadExercises() {
  state.exercises = await api('GET', '/exercises');
}

async function loadTodayResolved() {
  try {
    const data = await api('GET', '/today');
    state.todayResolved = data;
    return data;
  } catch (e) {
    console.error('Failed to load today resolved:', e);
    state.todayResolved = null;
  }
}

async function loadSplits() {
  try {
    const data = await api('GET', '/splits');
    state.splits = data || [];
    const active = state.splits.find(s => s.is_active === 1) || state.splits[0];
    state.activeSplit = active;
    if (!state.selectedSplitId && active) {
      state.selectedSplitId = active.id;
    }
    if (state.selectedSplitId) {
      await loadSplitDetail(state.selectedSplitId);
    }
    return data;
  } catch (e) {
    console.error('Failed to load splits:', e);
  }
}

async function loadSplitDetail(splitId) {
  try {
    const data = await api('GET', `/splits/${splitId}`);
    state.selectedSplitDetail = data;
    return data;
  } catch (e) {
    console.error('Failed to load split detail:', e);
  }
}

async function loadWorkouts() {
  try {
    const data = await api('GET', '/workouts');
    state.workouts = data || [];
    if (!state.selectedWorkoutId && state.workouts.length) {
      state.selectedWorkoutId = state.workouts[0].id;
    }
    if (state.selectedWorkoutId) {
      await loadWorkoutDetail(state.selectedWorkoutId);
    }
    return data;
  } catch (e) {
    console.error('Failed to load workouts:', e);
  }
}

async function loadWorkoutDetail(workoutId) {
  try {
    const data = await api('GET', `/workouts/${workoutId}`);
    state.selectedWorkoutDetail = data;
    return data;
  } catch (e) {
    console.error('Failed to load workout detail:', e);
  }
}

async function loadDashboardSummary() {
  try {
    const [sum, rec, act] = await Promise.allSettled([
      api('GET', '/dashboard/summary'),
      api('GET', '/dashboard/records'),
      api('GET', '/dashboard/activity')
    ]);
    state.dashboardSummary  = sum.status === 'fulfilled' ? sum.value : { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
    state.dashboardRecords  = rec.status === 'fulfilled' ? rec.value : [];
    state.dashboardActivity = act.status === 'fulfilled' ? act.value : [];
  } catch (e) {
    state.dashboardSummary  = { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
    state.dashboardRecords  = [];
    state.dashboardActivity = [];
  }
}

// Fetch the last log for every exercise in today's day.
// Runs N parallel requests; each is allowed to fail silently.
// On Rest day there are no exercises — this becomes a no-op.
async function loadTodayLogs() {
  const todayDay = getTodayDay();
  if (todayDay === 'Rest') { state.todayLogs = {}; return; }
  const dayExercises = state.exercises.filter(e => e.day === todayDay);
  const results = await Promise.allSettled(
    dayExercises.map(ex =>
      api('GET', `/exercises/${ex.id}/logs`)
        .then(logs => ({ id: ex.id, log: logs.length ? logs[logs.length - 1] : null }))
    )
  );
  state.todayLogs = {};
  for (const r of results) {
    if (r.status === 'fulfilled') state.todayLogs[r.value.id] = r.value.log;
  }
}

async function loadLevel() {
  const all = await api('GET', `/routines/${encodeURIComponent(state.routine)}/levels`);
  const found = all.find(l => l.level === state.level);
  if (found) {
    state.levelId        = found.id;
    state.levelExercises = found.exercises;
  } else {
    state.levelId        = null;
    state.levelExercises = [];
  }
}

// Auto-creates the routine_level row on first add — idempotent on backend.
async function ensureLevel() {
  if (state.levelId !== null) return;
  const row = await api('POST', '/routine_levels', {
    routine_name: state.routine,
    level: state.level,
  });
  state.levelId = row.id;
}

// ─── CRUD operations ──────────────────────────────────────────────────────────
async function addExercise(payload) {
  await ensureLevel();
  payload.order_index = state.levelExercises.length + 1;
  await api('POST', `/routine_levels/${state.levelId}/exercises`, payload);
  state.editingId = null;
  await loadLevel();
}

async function updateExercise(leId, payload) {
  await api('PUT', `/level_exercises/${leId}`, payload);
  state.editingId = null;
  await loadLevel();
}

async function deleteExercise(leId) {
  await api('DELETE', `/level_exercises/${leId}`);
  if (state.editingId === leId) state.editingId = null;
  await loadLevel();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function exercisesForRoutine() {
  return state.exercises.filter(e => e.day === state.routine);
}

function getExercise(id) {
  return state.exercises.find(e => e.id === id) || null;
}

function fmtTarget(le) {
  const ex = getExercise(le.exercise_id);
  if (!ex) return '—';
  return ex.type === 'duration'
    ? `${le.duration_sec ?? '—'}s`
    : `${le.reps ?? '—'} reps`;
}

function fmtTempo(t)  { return t  || '—'; }
function fmtRest(r)   { return r  ? `${r}s` : '—'; }
function badge(type)  {
  return type === 'duration'
    ? '<span class="badge badge-hold">hold</span>'
    : '<span class="badge badge-reps">reps</span>';
}

// Format the last log entry for a given exercise (Screen 1 row display).
// Matches design.md examples: "last: 42s" / "last: 8 reps @ 0kg".
function fmtLastLog(ex, log) {
  if (!log) return null;
  if (ex.type === 'duration') return `last: ${log.duration_sec}s`;
  const base = `last: ${log.reps} reps`;
  return log.weight_kg != null ? `${base} @ ${log.weight_kg}kg` : base;
}

// ─── Screen 3: progress aggregation ──────────────────────────────────────────
// Single named function per architecture.md §4 — tweak the definition of
// "progress" here without touching the chart/stat rendering code.
//
// Returns array of { date: 'YYYY-MM-DD', metric: number }, one point per
// calendar day, sorted oldest → newest.
function computeProgress(ex, logs, mode = 'best') {
  if (!ex || !logs || !logs.length) return [];

  // Group raw log rows by calendar day (ISO timestamp, slice to YYYY-MM-DD)
  const byDate = {};
  for (const log of logs) {
    const date = (log.timestamp || '').slice(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayLogs]) => {
      let metric;
      if (ex.type === 'duration') {
        if (mode === 'volume') {
          // Total hold duration in the session (sum in seconds)
          metric = dayLogs.reduce((sum, l) => sum + (l.duration_sec || 0), 0);
        } else {
          // Best (max) hold duration in the session, in seconds.
          metric = Math.max(...dayLogs.map(l => l.duration_sec ?? 0));
        }
      } else {
        if (mode === 'volume') {
          // Estimated volume: sum of reps × weight_kg across all sets (or reps if bodyweight)
          metric = dayLogs.reduce((sum, l) => {
            const vol = l.weight_kg ? (l.reps || 0) * l.weight_kg : (l.reps || 0);
            return sum + vol;
          }, 0);
        } else {
          // Best set: max reps in the session
          metric = Math.max(...dayLogs.map(l => l.reps ?? 0));
        }
      }
      return { date, metric };
    });
}

// Derive the three numbers shown in the stat row above the chart.
function computeStats(points) {
  if (!points.length) return null;

  const current = points[points.length - 1].metric;

  // Value from the session closest to (but not after) 14 days ago.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const pastPoints = points.filter(p => p.date <= cutoff);
  const past = pastPoints.length ? pastPoints[pastPoints.length - 1].metric : null;

  const pct = (past !== null && past > 0)
    ? Math.round((current - past) / past * 100)
    : null;

  return { current, past, pct };
}

// Parse a <form> into a payload object, coercing numeric fields and
// converting empty strings to null on nullable fields.
function formToPayload(form) {
  const intFields      = new Set(['exercise_id','sets','reps','duration_sec','rest_sec','superset_group','order_index']);
  const nullableFields = new Set(['reps','duration_sec','tempo','superset_group']);
  const data           = new FormData(form);
  const payload        = {};

  for (const [k, v] of data.entries()) {
    const empty = v === '' || v === null;
    if (empty) {
      if (nullableFields.has(k)) payload[k] = null;
      // required fields with no value are simply omitted — server validates
    } else if (intFields.has(k)) {
      payload[k] = parseInt(v, 10);
    } else {
      payload[k] = v;
    }
  }
  return payload;
}

// Superset grouping for Today view.
// Exercises are pre-sorted by order_index. The first occurrence of a
// superset_group value sets that group's position in the display list.
function groupExercises(exercises) {
  const result     = [];
  const seenGroups = {};

  for (const ex of exercises) {
    const g = ex.superset_group;
    if (g !== null && g !== undefined) {
      if (!seenGroups[g]) {
        const group = { type: 'superset', groupId: g, exercises: [ex] };
        seenGroups[g] = group;
        result.push(group);
      } else {
        seenGroups[g].exercises.push(ex);
      }
    } else {
      result.push({ type: 'standalone', exercise: ex });
    }
  }
  return result;
}

// ─── Shared selector row ──────────────────────────────────────────────────────
function renderSelectors() {
  const routineOpts = ROUTINES.map(r =>
    `<option value="${r}" ${r === state.routine ? 'selected' : ''}>${r}</option>`
  ).join('');
  const levelOpts = LEVELS.map(l =>
    `<option value="${l}" ${l === state.level ? 'selected' : ''}>Level ${l}</option>`
  ).join('');

  return `
    <div class="selector-row">
      <div class="selector-group">
        <label class="selector-label">Routine</label>
        <select class="selector" id="sel-routine" onchange="onRoutineChange(this.value)">
          ${routineOpts}
        </select>
      </div>
      <div class="selector-group">
        <label class="selector-label">Level</label>
        <select class="selector" id="sel-level" onchange="onLevelChange(this.value)">
          ${levelOpts}
        </select>
      </div>
    </div>`;
}

// ─── Edit view rendering ──────────────────────────────────────────────────────

function renderExerciseRow(le) {
  // Inline edit mode for this row
  if (state.editingId === le.id) return renderInlineEditRow(le);

  const ex     = getExercise(le.exercise_id);
  const ssTag  = le.superset_group != null
    ? `<span class="ss-badge">SS${le.superset_group}</span>`
    : '';

  return `
    <div class="ex-row" data-le-id="${le.id}">
      <span class="ex-order mono">${String(le.order_index).padStart(2,'0')}</span>
      <span class="ex-name">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)} ${ssTag}</span>
      <span class="ex-meta mono">${le.sets}×${fmtTarget(le)}</span>
      <span class="ex-tempo mono">${fmtTempo(le.tempo)}</span>
      <span class="ex-rest mono">${fmtRest(le.rest_sec)}</span>
      <span class="ex-actions">
        <button class="btn-icon" title="Edit"   onclick="startEdit(${le.id})">✎</button>
        <button class="btn-icon btn-icon-danger" title="Delete" onclick="handleDelete(${le.id})">×</button>
      </span>
    </div>`;
}

function renderInlineEditRow(le) {
  const ex            = getExercise(le.exercise_id);
  const routineExs    = exercisesForRoutine();
  const exOpts        = routineExs.map(e =>
    `<option value="${e.id}" data-type="${e.type}" ${e.id === le.exercise_id ? 'selected' : ''}>${e.name}</option>`
  ).join('');
  const isHold        = ex?.type === 'duration';
  const targetInput   = isHold
    ? `<input class="form-input mono" type="number" name="duration_sec" value="${le.duration_sec ?? ''}" min="1" placeholder="Sec">`
    : `<input class="form-input mono" type="number" name="reps" value="${le.reps ?? ''}" min="1" placeholder="Reps">`;

  return `
    <div class="ex-row-editing" data-le-id="${le.id}">
      <form class="inline-edit-form" onsubmit="handleUpdate(event, ${le.id})">
        <select class="form-input form-select form-select-sm" name="exercise_id"
                onchange="onInlineExerciseChange(this, ${le.id})">
          ${exOpts}
        </select>
        <input class="form-input mono" type="number" name="sets" value="${le.sets}" min="1" placeholder="Sets" required>
        <div id="inline-target-${le.id}">${targetInput}</div>
        <input class="form-input mono" type="text"   name="tempo"         value="${le.tempo ?? ''}"            placeholder="Tempo">
        <input class="form-input mono" type="number" name="rest_sec"      value="${le.rest_sec}"      min="0"  placeholder="Rest s" required>
        <input class="form-input mono" type="number" name="superset_group" value="${le.superset_group ?? ''}" min="1" placeholder="SS#">
        <span class="ex-actions">
          <button class="btn-icon btn-icon-success" type="submit" title="Save">✓</button>
          <button class="btn-icon"                  type="button" title="Cancel" onclick="cancelEdit()">✗</button>
        </span>
      </form>
    </div>`;
}

function renderAddForm() {
  const routineExs = exercisesForRoutine();
  if (routineExs.length === 0) {
    return `<p class="view-subtitle">No exercises seeded for "${state.routine}" day.</p>`;
  }

  const exOpts  = routineExs.map(e =>
    `<option value="${e.id}" data-type="${e.type}">${e.name} [${e.type === 'duration' ? 'hold' : 'reps'}]</option>`
  ).join('');
  const isHold  = routineExs[0]?.type === 'duration';

  return `
    <form class="add-form" id="add-form" onsubmit="handleAdd(event)">
      <div class="form-row">
        <div class="form-group form-group-wide">
          <label class="form-label">Exercise</label>
          <select class="form-input form-select" name="exercise_id" id="add-ex-select"
                  onchange="onAddExerciseChange(this)">
            ${exOpts}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Sets</label>
          <input class="form-input mono" type="number" name="sets" min="1" placeholder="e.g. 3" required
                 style="width:70px">
        </div>
        <div class="form-group" id="add-target-group">
          <label class="form-label" id="add-target-label">${isHold ? 'Duration (sec)' : 'Reps'}</label>
          <input class="form-input mono" type="number" id="add-target-input"
                 name="${isHold ? 'duration_sec' : 'reps'}"
                 min="1" placeholder="${isHold ? 'e.g. 30' : 'e.g. 8'}" style="width:80px">
        </div>
        <div class="form-group">
          <label class="form-label">Tempo <span class="opt">opt</span></label>
          <input class="form-input mono" type="text" name="tempo" placeholder="e.g. 2010" style="width:80px">
        </div>
        <div class="form-group">
          <label class="form-label">Rest (sec)</label>
          <input class="form-input mono" type="number" name="rest_sec" min="0" placeholder="e.g. 90"
                 required style="width:80px">
        </div>
        <div class="form-group">
          <label class="form-label">Superset # <span class="opt">opt</span></label>
          <input class="form-input mono" type="number" name="superset_group" min="1"
                 placeholder="1, 2…" style="width:70px">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">+ Add Exercise</button>
      </div>
    </form>`;
}

function renderCustomExerciseCard() {
  const dayOpts = ROUTINES.map(r => `<option value="${r}" ${r === state.routine ? 'selected' : ''}>${r}</option>`).join('');

  return `
    <div class="card" style="margin-top: 24px;">
      <div class="card-header">
        <span class="card-title">Create Custom Exercise (Catalog)</span>
      </div>
      <div class="card-body">
        <form class="add-form" id="custom-ex-form" onsubmit="handleCreateCustomExercise(event)">
          <div class="form-row">
            <div class="form-group form-group-wide">
              <label class="form-label">Exercise Name</label>
              <input class="form-input" type="text" name="name" placeholder="e.g. Archer Push-ups" required>
            </div>
            <div class="form-group">
              <label class="form-label">Split Day</label>
              <select class="form-input form-select" name="day" required>
                ${dayOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input form-select" name="type" id="custom-ex-type" onchange="onCustomTypeChange(this)" required>
                <option value="reps">Reps</option>
                <option value="duration">Hold Duration</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" id="custom-prog-target-group">
              <label class="form-label" id="custom-prog-target-label">Progression Target Reps <span class="opt">opt</span></label>
              <input class="form-input mono" type="number" id="custom-prog-target-input" name="progression_target_reps" min="1" placeholder="e.g. 15" style="width:140px">
            </div>
            <div class="form-group">
              <label class="form-label">Sessions Needed</label>
              <input class="form-input mono" type="number" name="progression_sessions_needed" min="1" max="10" value="2" required style="width:100px">
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" type="submit">+ Create in Catalog</button>
          </div>
        </form>
      </div>
    </div>`;
}

// ─── Phase: Reusable Workouts & Catalog Editor View ──────────────────────────

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Settings Modal (Secondary) ──────────────────────────────────────────────
function openSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;
  const muted = isMuted();

  root.innerHTML = `
    <div class="settings-modal-backdrop" onclick="if(event.target === this) closeSettingsModal()">
      <div class="settings-modal">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:18px; font-weight:700; color:var(--text);">Settings & Data</h2>
          <button class="nav-btn-icon" onclick="closeSettingsModal()">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Audio & Haptic Cues</strong>
              <div style="font-size:12px; color:var(--text-muted);">Ticks during rest countdown and PR fanfare</div>
            </div>
            <button class="btn btn-sm ${muted ? 'btn-secondary' : 'btn-primary'}" onclick="toggleMute(); openSettingsModal();">
              ${muted ? '🔇 Muted' : '🔊 Enabled'}
            </button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Backup Export</strong>
              <div style="font-size:12px; color:var(--text-muted);">Save complete JSON bundle (v2.1) of splits, workouts & logs</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="exportData()">💾 Export JSON</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Restore Backup</strong>
              <div style="font-size:12px; color:var(--text-muted);">Merge or restore from an existing JSON backup</div>
            </div>
            <label class="btn btn-sm btn-secondary" style="cursor:pointer; margin:0;">
              📂 Import
              <input type="file" accept=".json" style="display:none;" onchange="importData(this); closeSettingsModal();">
            </label>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button class="btn btn-primary" onclick="closeSettingsModal()">Done</button>
        </div>
      </div>
    </div>`;
}

function closeSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (root) root.innerHTML = '';
}

// ─── Muscle Focus Engine & Body Visualization (Phase.md Section 20) ───────────
let _activeMuscleView = 'front';
let _currentWorkoutMuscles = { label: 'Legs, Glutes, Core', frontMuscles: ['quads', 'abs'], backMuscles: ['glutes', 'calves'] };

function getWorkoutMuscleTargets(workout) {
  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    return {
      label: 'Full Body Mobility',
      frontMuscles: ['abs', 'quads'],
      backMuscles: ['glutes', 'calves']
    };
  }
  const exNames = workout.exercises.map(e => (e.name || '').toLowerCase());
  const nameStr = exNames.join(' ');

  let front = [];
  let back = [];
  let targets = [];

  if (nameStr.includes('push') || nameStr.includes('dip') || nameStr.includes('press') || nameStr.includes('chest') || nameStr.includes('hspu')) {
    front.push('chest', 'shoulders', 'triceps', 'abs');
    targets.push('Chest', 'Shoulders', 'Triceps');
  }
  if (nameStr.includes('pull') || nameStr.includes('chin') || nameStr.includes('row') || nameStr.includes('lever') || nameStr.includes('muscle-up')) {
    back.push('lats', 'upper_back', 'biceps', 'forearms');
    front.push('biceps');
    targets.push('Back', 'Biceps', 'Lats');
  }
  if (nameStr.includes('squat') || nameStr.includes('lunge') || nameStr.includes('calf') || nameStr.includes('leg') || nameStr.includes('pistol')) {
    front.push('quads');
    back.push('glutes', 'hamstrings', 'calves');
    targets.push('Legs', 'Glutes', 'Calves');
  }
  if (nameStr.includes('plank') || nameStr.includes('sit') || nameStr.includes('flag') || nameStr.includes('core') || nameStr.includes('hollow')) {
    front.push('abs', 'obliques');
    back.push('lower_back');
    targets.push('Core', 'Abs');
  }

  if (targets.length === 0) {
    targets.push('Upper Body', 'Core');
    front.push('chest', 'abs', 'shoulders');
    back.push('upper_back', 'lats');
  }

  return {
    label: Array.from(new Set(targets)).slice(0, 3).join(', '),
    frontMuscles: Array.from(new Set(front)),
    backMuscles: Array.from(new Set(back))
  };
}

function setMuscleBodyView(view) {
  _activeMuscleView = view;
  const container = document.getElementById('home-muscle-body-container');
  if (container) {
    container.innerHTML = renderMuscleBodySvg(_activeMuscleView, _currentWorkoutMuscles);
  }
  const btns = document.querySelectorAll('.home-muscle-tab-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === view);
  });
}

function renderMuscleBodySvg(view, muscles) {
  const activeList = view === 'front' ? (muscles.frontMuscles || []) : (muscles.backMuscles || []);

  const isChest = activeList.includes('chest');
  const isShoulders = activeList.includes('shoulders');
  const isBiceps = activeList.includes('biceps');
  const isAbs = activeList.includes('abs');
  const isQuads = activeList.includes('quads');

  const isUpperBack = activeList.includes('upper_back') || activeList.includes('lats');
  const isGlutes = activeList.includes('glutes');
  const isHamstrings = activeList.includes('hamstrings');
  const isCalves = activeList.includes('calves');

  const activeColor = '#8b5cf6';
  const glowFilter = 'filter="url(#muscleGlow)"';
  const baseColor = '#1c1c2c';
  const strokeColor = 'rgba(255, 255, 255, 0.18)';

  if (view === 'front') {
    return `
      <svg class="home-muscle-svg" viewBox="0 0 100 140" fill="none">
        <defs>
          <filter id="muscleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Head & Neck -->
        <circle cx="50" cy="14" r="8" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <path d="M47 22 H53 V27 H47 Z" fill="${baseColor}"/>

        <!-- Shoulders -->
        <path d="M30 28 Q38 25 46 27 L44 35 Q36 34 30 28 Z" fill="${isShoulders ? activeColor : baseColor}" ${isShoulders ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <path d="M70 28 Q62 25 54 27 L56 35 Q64 34 70 28 Z" fill="${isShoulders ? activeColor : baseColor}" ${isShoulders ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Chest (Pecs) -->
        <path d="M36 35 Q50 34 49 46 Q38 46 36 35 Z" fill="${isChest ? activeColor : baseColor}" ${isChest ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <path d="M64 35 Q50 34 51 46 Q62 46 64 35 Z" fill="${isChest ? activeColor : baseColor}" ${isChest ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Biceps / Arms -->
        <rect x="23" y="32" width="7" height="20" rx="3.5" fill="${isBiceps ? activeColor : baseColor}" ${isBiceps ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <rect x="70" y="32" width="7" height="20" rx="3.5" fill="${isBiceps ? activeColor : baseColor}" ${isBiceps ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Abs / Core -->
        <rect x="42" y="49" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>
        <rect x="51" y="49" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>
        <rect x="42" y="59" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>
        <rect x="51" y="59" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>
        <rect x="43" y="69" width="6" height="7" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>
        <rect x="51" y="69" width="6" height="7" rx="2" fill="${isAbs ? activeColor : baseColor}" ${isAbs ? glowFilter : ''}/>

        <!-- Quads / Legs -->
        <path d="M36 80 L34 110 Q40 112 45 110 L47 80 Z" fill="${isQuads ? activeColor : baseColor}" ${isQuads ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <path d="M64 80 L66 110 Q60 112 55 110 L53 80 Z" fill="${isQuads ? activeColor : baseColor}" ${isQuads ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Calves -->
        <rect x="35" y="114" width="8" height="20" rx="3" fill="${isCalves ? activeColor : baseColor}" ${isCalves ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <rect x="57" y="114" width="8" height="20" rx="3" fill="${isCalves ? activeColor : baseColor}" ${isCalves ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
      </svg>`;
  } else {
    // Back View
    return `
      <svg class="home-muscle-svg" viewBox="0 0 100 140" fill="none">
        <defs>
          <filter id="muscleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Head & Neck -->
        <circle cx="50" cy="14" r="8" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <path d="M47 22 H53 V27 H47 Z" fill="${baseColor}"/>

        <!-- Upper Back / Traps & Lats -->
        <path d="M32 28 Q50 25 68 28 L62 58 Q50 64 38 58 Z" fill="${isUpperBack ? activeColor : baseColor}" ${isUpperBack ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Arms -->
        <rect x="23" y="32" width="7" height="20" rx="3.5" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1"/>
        <rect x="70" y="32" width="7" height="20" rx="3.5" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1"/>

        <!-- Glutes -->
        <path d="M36 68 Q49 68 49 80 Q38 82 36 68 Z" fill="${isGlutes ? activeColor : baseColor}" ${isGlutes ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <path d="M64 68 Q51 68 51 80 Q62 82 64 68 Z" fill="${isGlutes ? activeColor : baseColor}" ${isGlutes ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Hamstrings -->
        <path d="M36 84 L34 110 Q40 112 45 110 L47 84 Z" fill="${isHamstrings ? activeColor : baseColor}" ${isHamstrings ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <path d="M64 84 L66 110 Q60 112 55 110 L53 84 Z" fill="${isHamstrings ? activeColor : baseColor}" ${isHamstrings ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>

        <!-- Calves -->
        <rect x="35" y="114" width="8" height="20" rx="3" fill="${isCalves ? activeColor : baseColor}" ${isCalves ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
        <rect x="57" y="114" width="8" height="20" rx="3" fill="${isCalves ? activeColor : baseColor}" ${isCalves ? glowFilter : ''} stroke="${strokeColor}" stroke-width="1"/>
      </svg>`;
  }
}

// ─── Notification Modal Popover (Phase.md Section 7) ──────────────────────────
function openNotifModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;

  const resolved = state.todayResolved;
  const isWorkout = resolved && resolved.status === 'workout';
  const workoutName = resolved?.workout?.name || 'Scheduled Workout';

  root.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeSettingsModal()">
      <div class="settings-modal" onclick="event.stopPropagation()" style="max-width:420px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:17px; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:8px;">
            <span>🔔 Notifications</span>
          </h2>
          <button class="btn btn-sm btn-secondary" onclick="closeSettingsModal()">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span style="font-size:20px;">⚡</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">${isWorkout ? `Today's Workout: ${workoutName}` : 'Rest & Recovery Day'}</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${isWorkout ? 'Ready when you are. Step up and claim your strength.' : 'Hydrate, stretch, and prepare for tomorrow.'}</div>
            </div>
          </div>

          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span style="font-size:20px;">🔥</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">Active Streak Check</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Consistency builds champions. Keep your streak chain unbroken.</div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button class="btn btn-primary" onclick="closeSettingsModal()">Got It</button>
        </div>
      </div>
    </div>`;
}

// ─── 3D Parallax and Motion Handlers ─────────────────────────────────────────
function handleHeroParallax(e) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = e.currentTarget;
  const img = card.querySelector('.home-hero-img');
  if (!img) return;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  img.style.transform = `scale(1.05) translate(${x * 16}px, ${y * 16}px)`;
}

function resetHeroParallax(e) {
  const card = e.currentTarget;
  const img = card.querySelector('.home-hero-img');
  if (img) img.style.transform = 'scale(1) translate(0, 0)';
}

// ─── Screen 1: Athlete-First Home / Dashboard Screen (Phase.md Target) ────────

function renderHomeView() {
  const summary = state.dashboardSummary || {
    streak_days: 0,
    week_sessions: 0,
    week_sets: 0,
    top_movers: []
  };

  const resolved = state.todayResolved;
  const greeting = getGreeting();
  const active = getActiveSession();
  const isThisActive = active && (active.status === 'in_progress' || active.status === 'paused');

  // Update sidebar streak display
  const sidebarStreakEl = document.getElementById('sidebar-streak-val');
  if (sidebarStreakEl) {
    sidebarStreakEl.textContent = `🔥 ${summary.streak_days || 0} day streak`;
  }

  // 1. Weekly Schedule & Overview Calculation
  const currentSplit = state.selectedSplitDetail || state.activeSplit || state.splits[0];
  const schedule = currentSplit?.schedule || [];
  const plannedWorkoutsCount = schedule.filter(d => d.day_type === 'workout').length || 4;
  const weekSessionsDone = summary.week_sessions || 0;
  const weeklyPct = Math.min(100, Math.round((weekSessionsDone / Math.max(1, plannedWorkoutsCount)) * 100));

  const todayDow = (new Date().getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate muscle targets for today's workout
  _currentWorkoutMuscles = getWorkoutMuscleTargets(resolved?.workout);

  const weekCirclesHtml = dayLetters.map((letter, idx) => {
    const isToday = idx === todayDow;
    const isPast = idx < todayDow;
    const isWorkoutDay = schedule[idx]?.day_type === 'workout';
    const isDone = isPast && isWorkoutDay && weekSessionsDone > 0;

    let circleClass = 'home-week-circle future';
    let content = letter;

    if (isDone) {
      circleClass = 'home-week-circle done';
      content = '✓';
    } else if (isToday) {
      circleClass = 'home-week-circle today';
    }

    return `<div class="${circleClass}" title="${DAY_NAMES[idx]}: ${schedule[idx]?.workout_name || 'Rest'}">${content}</div>`;
  }).join('');

  // 2. Hero Section (Today's Workout Dominates)
  let todayHeroHtml = '';
  if (!resolved || resolved.status === 'rest') {
    const splitName = resolved?.split_name || currentSplit?.name || 'Training Split';
    const dayName = resolved?.day_name || DAY_NAMES[todayDow];
    const next = resolved?.next_workout;

    const nextTeaserHtml = next ? `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:14px 18px; border-radius:var(--radius); margin-top:16px; flex-wrap:wrap; gap:12px;">
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em;">Next Up · ${next.day_name}</span>
          <div style="font-size:16px; font-weight:700; color:#ffffff;">${next.workout_name}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="startWorkoutFromId(${next.workout_id})">⚡ Start Workout Early ➔</button>
      </div>` : '';

    todayHeroHtml = `
      <div class="home-hero-card fade-in-up stagger-1" onmousemove="handleHeroParallax(event)" onmouseleave="resetHeroParallax(event)">
        <div class="home-hero-content">
          <div>
            <span class="home-hero-tag" style="color:var(--success);">REST & RECOVERY · ${splitName.toUpperCase()}</span>
            <h1 class="home-hero-title">${dayName} — Rest Day</h1>
            <p class="home-hero-slogan">
              Muscles adapt and rebuild during recovery. Focus on clean hydration, light mobility, and deep sleep.
            </p>
          </div>
          ${nextTeaserHtml}
        </div>
        <div class="home-hero-visual-wrap">
          <img src="assets/hero_athlete.jpg" alt="Athlete" class="home-hero-img" />
        </div>
      </div>`;
  } else {
    // Workout Day
    const workout = resolved.workout;
    const splitName = resolved.split_name || currentSplit?.name || 'Active Split';
    const dayName = resolved.day_name || DAY_NAMES[todayDow];
    const estDurationMin = Math.round((workout.total_sets * 90) / 60);

    let heroBtnHtml = `
      <button class="home-hero-btn" onclick="startWorkoutFromResolved()">
        <span>⚡ Start Workout</span>
        <span class="arrow-icon">➔</span>
      </button>`;

    let heroStatusTag = 'TODAY\'S WORKOUT';
    if (isThisActive) {
      if (active.status === 'paused') {
        heroStatusTag = '⏸ WORKOUT PAUSED';
        heroBtnHtml = `
          <button class="home-hero-btn" onclick="openWorkoutView()">
            <span>▶ Resume Workout</span>
            <span class="arrow-icon">➔</span>
          </button>`;
      } else {
        heroStatusTag = '⚡ WORKOUT IN PROGRESS';
        heroBtnHtml = `
          <button class="home-hero-btn" onclick="openWorkoutView()">
            <span>⚡ Continue Workout</span>
            <span class="arrow-icon">➔</span>
          </button>`;
      }
    }

    todayHeroHtml = `
      <div class="home-hero-card fade-in-up stagger-1" onmousemove="handleHeroParallax(event)" onmouseleave="resetHeroParallax(event)">
        <div class="home-hero-content">
          <div>
            <span class="home-hero-tag">${heroStatusTag}</span>
            <h1 class="home-hero-title">${workout.name}</h1>
            <p class="home-hero-slogan">
              Build strength. Build discipline.<br>Become unstoppable.
            </p>
          </div>

          <div>
            <div class="home-hero-metrics">
              <div class="home-hero-metric-pill">
                <span class="icon">🏃</span>
                <span>${workout.exercises?.length || 6} Exercises</span>
              </div>
              <div class="home-hero-metric-pill">
                <span class="icon">📊</span>
                <span>${workout.total_sets || 18} Sets</span>
              </div>
              <div class="home-hero-metric-pill">
                <span class="icon">⏱</span>
                <span>~${estDurationMin || 45} min</span>
              </div>
            </div>

            ${heroBtnHtml}
          </div>
        </div>

        <div class="home-hero-visual-wrap">
          <img src="assets/hero_athlete.jpg" alt="Athlete" class="home-hero-img" />
        </div>
      </div>`;
  }

  // 3. Weekly Progress & Muscle Focus Side Column (Phase.md Section 18, 19, 20)
  const sideColHtml = `
    <div class="home-side-col fade-in-up stagger-2">
      <!-- Weekly Progress Card -->
      <div class="home-weekly-card">
        <div>
          <div class="home-weekly-head">
            <span class="home-weekly-tag">Weekly Progress</span>
            <span class="home-weekly-pct">${weeklyPct}%</span>
          </div>
          <div class="home-weekly-title">${weekSessionsDone} of ${plannedWorkoutsCount} workouts done</div>
          <div class="home-weekly-bar-bg">
            <div class="home-weekly-bar-fill" style="width: ${weeklyPct}%;"></div>
          </div>
        </div>
        <div class="home-week-circles">
          ${weekCirclesHtml}
        </div>
      </div>

      <!-- Muscle Focus Card -->
      <div class="home-muscle-card">
        <div class="home-muscle-head">
          <span class="home-muscle-tag">Muscle Focus</span>
          <div class="home-muscle-tabs">
            <button class="home-muscle-tab-btn ${_activeMuscleView === 'front' ? 'active' : ''}" data-tab="front" onclick="setMuscleBodyView('front')">Front</button>
            <button class="home-muscle-tab-btn ${_activeMuscleView === 'back' ? 'active' : ''}" data-tab="back" onclick="setMuscleBodyView('back')">Back</button>
          </div>
        </div>

        <div class="home-muscle-body-wrap" id="home-muscle-body-container">
          ${renderMuscleBodySvg(_activeMuscleView, _currentWorkoutMuscles)}
        </div>

        <div class="home-muscle-target-list">
          🎯 Target: ${_currentWorkoutMuscles.label}
        </div>
      </div>
    </div>`;

  // 4. 4-Metric Training Strip (Phase.md Section 21, 22)
  const avgWorkoutMin = 46;
  const trainingVolumeKg = (summary.week_sets || 0) * 115;
  const volumeStr = trainingVolumeKg > 0 ? `${trainingVolumeKg.toLocaleString()} kg` : `${summary.week_sets * 10} reps`;

  const metricsStripHtml = `
    <div class="home-metrics-strip fade-in-up stagger-3">
      <!-- Card 1: Workouts This Week -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Workouts This Week</span>
          <div class="home-metric-icon">🏋️</div>
        </div>
        <div class="home-metric-val">${summary.week_sessions || 0}</div>
        <div class="home-metric-sub">/ ${plannedWorkoutsCount} planned</div>
        <svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 25 Q 20 22, 40 16 T 80 6" stroke="#8b5cf6" stroke-width="2" fill="none"/></svg>
      </div>

      <!-- Card 2: Total Sets -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Total Sets</span>
          <div class="home-metric-icon">📊</div>
        </div>
        <div class="home-metric-val">${summary.week_sets || 0}</div>
        <div class="home-metric-sub"><span class="home-metric-delta-up">▲ 18%</span> vs last week</div>
        <svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 28 Q 25 24, 50 14 T 80 4" stroke="#10b981" stroke-width="2" fill="none"/></svg>
      </div>

      <!-- Card 3: Training Volume -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Training Volume</span>
          <div class="home-metric-icon">📈</div>
        </div>
        <div class="home-metric-val">${volumeStr}</div>
        <div class="home-metric-sub"><span class="home-metric-delta-up">▲ 22%</span> capacity</div>
        <svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 24 Q 25 20, 50 12 T 80 5" stroke="#a78bfa" stroke-width="2" fill="none"/></svg>
      </div>

      <!-- Card 4: Avg. Workout Time -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Avg. Workout Time</span>
          <div class="home-metric-icon">⏱</div>
        </div>
        <div class="home-metric-val">${avgWorkoutMin} min</div>
        <div class="home-metric-sub"><span class="home-metric-delta-up">▲ 5 min</span> target pacing</div>
        <svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 26 Q 20 22, 50 15 T 80 8" stroke="#8b5cf6" stroke-width="2" fill="none"/></svg>
      </div>
    </div>`;

  // 5. Three-Column Lower Grid: Exercise Progress, Recent PRs, Upcoming Workouts (Phase.md Section 23, 25, 26)
  let progressItemsHtml = '';
  if (summary.top_movers && summary.top_movers.length > 0) {
    progressItemsHtml = summary.top_movers.slice(0, 3).map(m => `
      <div class="home-progress-item" onclick="openHistoryView(${m.exercise_id})">
        <div class="home-progress-name-wrap">
          <div class="home-progress-name">${m.exercise_name}</div>
          <div class="home-progress-best">Best: ${m.metric_current} reps</div>
        </div>
        <div class="home-progress-bar-wrap">
          <div class="home-progress-bar-numbers">${m.metric_2wk_ago || Math.max(1, m.metric_current - 4)} → ${m.metric_current} reps</div>
          <div class="home-progress-bar-track">
            <div class="home-progress-bar-fill" style="width: ${Math.min(100, Math.max(30, m.pct_change + 50))}%;"></div>
          </div>
        </div>
        <div class="home-progress-delta-badge">▲ ${m.pct_change}%</div>
      </div>
    `).join('');
  } else {
    // Clean movement progressions from active exercise catalog
    const sampleMovers = state.exercises.slice(0, 3);
    progressItemsHtml = sampleMovers.map((e, idx) => `
      <div class="home-progress-item" onclick="openHistoryView(${e.id})">
        <div class="home-progress-name-wrap">
          <div class="home-progress-name">${e.name}</div>
          <div class="home-progress-best">Active Exercise</div>
        </div>
        <div class="home-progress-bar-wrap">
          <div class="home-progress-bar-numbers">Progression Track</div>
          <div class="home-progress-bar-track">
            <div class="home-progress-bar-fill" style="width: ${60 + idx * 15}%;"></div>
          </div>
        </div>
        <div class="home-progress-delta-badge">Ready</div>
      </div>
    `).join('');
  }

  // PR items
  let prsItemsHtml = '';
  if (state.dashboardRecords && state.dashboardRecords.length > 0) {
    prsItemsHtml = state.dashboardRecords.slice(0, 3).map(r => `
      <div class="home-pr-item" onclick="openHistoryView(${r.exercise_id})">
        <div class="home-pr-left">
          <span class="home-pr-trophy-icon">🏆</span>
          <div>
            <div class="home-pr-title">${r.exercise_name}</div>
            <div class="home-pr-new-tag">New personal best!</div>
          </div>
        </div>
        <div class="home-pr-val-wrap">
          <div class="home-pr-val">${r.max_reps ? `${r.max_reps} reps` : `${r.max_duration_sec}s`}</div>
          <div class="home-pr-date">All-time</div>
        </div>
      </div>
    `).join('');
  } else {
    prsItemsHtml = `
      <div class="empty-state" style="padding:14px 0;">
        <p style="color:var(--text-muted); font-size:12px; margin:0;">No PRs recorded yet. Complete today's workout to log your first record!</p>
      </div>`;
  }

  // Upcoming Workouts Timeline (Phase.md Section 26)
  const todayDate = new Date();
  const timelineItemsHtml = [1, 2, 3].map(offset => {
    const nextIdx = (todayDow + offset) % 7;
    const futureDate = new Date();
    futureDate.setDate(todayDate.getDate() + offset);
    const dayNum = futureDate.getDate();
    const dayShort = DAY_NAMES[nextIdx].slice(0, 3).toUpperCase();

    const dayItem = schedule[nextIdx];
    const isWorkout = dayItem?.day_type === 'workout' && dayItem?.workout_id;
    const title = isWorkout ? dayItem.workout_name : 'Rest Day';
    const muscles = isWorkout ? (dayItem.workout_desc || 'Hypertrophy & Strength') : 'Active Recovery & Mobility';

    return `
      <div class="home-timeline-item" onclick="switchView('split')">
        <div class="home-timeline-date-box">
          <span class="home-timeline-date-num">${dayNum}</span>
          <span class="home-timeline-date-day">${dayShort}</span>
        </div>
        <div class="home-timeline-info">
          <div class="home-timeline-title">${title}</div>
          <div class="home-timeline-muscles">${muscles}</div>
        </div>
        <div>
          ${isWorkout ? '<span class="badge badge-reps" style="font-size:10px;">Workout</span>' : '<span class="badge badge-duration" style="font-size:10px;">Rest</span>'}
        </div>
      </div>`;
  }).join('');

  const threeColGridHtml = `
    <div class="home-three-col-grid fade-in-up stagger-4">
      <!-- Column 1: Exercise Progress -->
      <div class="home-section-card">
        <div>
          <div class="home-section-head">
            <span class="home-section-head-title">📈 Exercise Progress</span>
            <a href="#progress" class="home-section-link" onclick="switchView('progress')">View all progress ➔</a>
          </div>
          <div class="home-progress-list">
            ${progressItemsHtml}
          </div>
        </div>
      </div>

      <!-- Column 2: Recent PRs -->
      <div class="home-section-card">
        <div>
          <div class="home-section-head">
            <span class="home-section-head-title">🏆 Recent PRs</span>
            <a href="#progress" class="home-section-link" onclick="switchView('progress')">View all PRs ➔</a>
          </div>
          <div class="home-prs-list">
            ${prsItemsHtml}
          </div>
        </div>
      </div>

      <!-- Column 3: Upcoming Workouts (Timeline) -->
      <div class="home-section-card">
        <div>
          <div class="home-section-head">
            <span class="home-section-head-title">📅 Upcoming Workouts</span>
            <a href="#split" class="home-section-link" onclick="switchView('split')">View full split ➔</a>
          </div>
          <div class="home-timeline-list">
            ${timelineItemsHtml}
          </div>
        </div>
      </div>
    </div>`;

  // 6. Motivational Closing Banner (Phase.md Section 27)
  const quoteBannerHtml = `
    <div class="home-quote-banner fade-in-up stagger-4">
      <div class="home-quote-text">
        <span>“</span>
        <span>The pain you feel today will be the strength you feel tomorrow.</span>
        <span>”</span>
      </div>
      <button class="home-quote-btn" onclick="${resolved?.status === 'workout' ? 'startWorkoutFromResolved()' : 'switchView(\'split\')'}">
        <span>Let's Go!</span>
        <span>💪</span>
      </button>
    </div>`;

  return `
    <div class="home-container">
      <!-- Top Header & Controls (Phase.md Section 6, 7, 8) -->
      <div class="home-header-row fade-in-up">
        <div>
          <h1 class="home-greeting-title">${greeting}, Sandeep! 👊</h1>
          <p class="home-greeting-sub">Discipline today, strength forever.</p>
        </div>
        <div class="home-header-controls">
          <button class="home-notif-btn" onclick="openNotifModal()" title="Notifications" aria-label="Notifications">
            🔔
            <span class="home-notif-dot"></span>
          </button>
          <div class="home-week-select-pill" onclick="switchView('split')" title="View Active Week Schedule">
            <span>📅 This Week ▾</span>
          </div>
          <div class="home-streak-pill" title="Current Daily Streak">
            <span>🔥</span>
            <div>
              <span class="home-streak-pill-num">${summary.streak_days || 0}</span>
              <span style="font-size:11px; margin-left:2px;">Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Hero & Supporting Column (Phase.md Section 9–20) -->
      <div class="home-top-grid">
        ${todayHeroHtml}
        ${sideColHtml}
      </div>

      <!-- 4-Metric Strip (Phase.md Section 21, 22) -->
      ${metricsStripHtml}

      <!-- 3-Column Lower Grid: Progress, PRs, Upcoming (Phase.md Section 23–26) -->
      ${threeColGridHtml}

      <!-- Motivational Closing Footer (Phase.md Section 27) -->
      ${quoteBannerHtml}
    </div>`;
}

// ─── Screen 2: My Split & Weekly Planner ────────────────────────────────────

// ─── Screen 2: My Split & Weekly Planner ────────────────────────────────────

function renderSplitView() {
  const currentTab = state.splitSubTab || 'schedule'; // 'schedule' | 'workouts'
  const currentSplit = state.selectedSplitDetail || state.splits.find(s => s.id === state.selectedSplitId) || state.splits[0];

  if (!currentSplit) {
    return `
      <div class="view-header">
        <h1 class="view-title">My Training Split</h1>
        <p class="view-subtitle">Create your first training split and configure your weekly schedule.</p>
      </div>
      <div class="card" style="padding:32px; text-align:center;">
        <button class="btn btn-primary" onclick="openCreateSplitModal()">+ Create Training Split</button>
      </div>`;
  }

  const isActive = currentSplit.is_active === 1;

  // Split tabs bar
  const splitTabsHtml = state.splits.map(s => `
    <button class="split-tab-btn ${s.id === currentSplit.id ? 'active' : ''}" onclick="selectSplit(${s.id})">
      <span>${s.name}</span>
      ${s.is_active === 1 ? '<span class="schedule-today-pill" style="font-size:9px; padding:1px 5px;">Active</span>' : ''}
    </button>
  `).join('');

  // Sub-tabs: 7-Day Weekly Schedule vs Reusable Workouts & Catalog
  const subTabsHtml = `
    <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:8px;">
      <button class="btn ${currentTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}" onclick="setSplitSubTab('schedule')">
        📅 7-Day Weekly Schedule
      </button>
      <button class="btn ${currentTab === 'workouts' ? 'btn-primary' : 'btn-secondary'}" onclick="setSplitSubTab('workouts')">
        🏋️ Reusable Workouts (${state.workouts.length})
      </button>
    </div>`;

  if (currentTab === 'workouts') {
    return `
      <div class="split-screen">
        <div class="view-header">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
            <div>
              <h1 class="view-title">Reusable Workouts & Library</h1>
              <p class="view-subtitle">Build modular workout templates and assign them to your weekly schedule.</p>
            </div>
            <button class="btn btn-primary" onclick="openCreateWorkoutModal()">+ New Workout</button>
          </div>
        </div>

        ${subTabsHtml}
        ${renderEditViewInner()}
      </div>`;
  }

  // Schedule Grid (7 days Monday-Sunday)
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const scheduleDays = currentSplit.schedule || [];

  const dayCardsHtml = scheduleDays.map(d => {
    const isToday = d.day_of_week === todayDow;
    const isWorkout = d.day_type === 'workout' && d.workout_id;

    const typeBadge = isWorkout
      ? `<span class="badge badge-reps">Workout</span>`
      : `<span class="badge badge-duration">Rest Day</span>`;

    const titleStr = isWorkout ? (d.workout_name || 'Workout') : 'Rest & Recovery 🧘';
    const metaStr = isWorkout
      ? (d.workout_desc || 'Scheduled Training Session')
      : 'Muscular recovery & adaptations';

    return `
      <div class="schedule-day-card ${isToday ? 'schedule-day-today' : ''}">
        <div>
          <div class="schedule-day-header">
            <span class="schedule-day-name">
              ${d.day_name}
              ${isToday ? '<span class="schedule-today-pill">Today</span>' : ''}
            </span>
            ${typeBadge}
          </div>
          <div class="schedule-workout-info" style="margin-top:10px;">
            <div class="schedule-workout-title">${titleStr}</div>
            <div class="schedule-workout-meta">${metaStr}</div>
          </div>
        </div>

        <div class="schedule-day-actions">
          ${isWorkout ? `<button class="btn btn-secondary btn-sm" onclick="startWorkoutFromId(${d.workout_id})">▶ Start</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openDayEditor(${d.day_of_week})">✎ Edit Day</button>
        </div>
      </div>`;
  }).join('');

  // Day editor modal
  let dayEditorHtml = '';
  if (state.editingDayIndex !== null) {
    const editingDay = scheduleDays.find(d => d.day_of_week === state.editingDayIndex) || { day_of_week: state.editingDayIndex, day_name: DAY_NAMES[state.editingDayIndex], day_type: 'workout' };
    const workoutOpts = state.workouts.map(w => `
      <option value="${w.id}" ${w.id === editingDay.workout_id ? 'selected' : ''}>
        ${w.name} (${w.exercise_count || 0} exercises)
      </option>
    `).join('');

    dayEditorHtml = `
      <div class="day-editor-backdrop" onclick="if(event.target === this) closeDayEditor()">
        <div class="day-editor-modal">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text);">${editingDay.day_name} Schedule</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeDayEditor()">✕</button>
          </div>

          <form onsubmit="handleSaveScheduleDay(event, ${currentSplit.id}, ${editingDay.day_of_week})">
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label">Day Schedule Type</label>
              <div style="display:flex; gap:12px; margin-top:6px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:500;">
                  <input type="radio" name="day_type" value="workout" ${editingDay.day_type !== 'rest' ? 'checked' : ''} onchange="toggleDayTypeInput(this.value)">
                  Workout Session
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:500;">
                  <input type="radio" name="day_type" value="rest" ${editingDay.day_type === 'rest' ? 'checked' : ''} onchange="toggleDayTypeInput(this.value)">
                  Rest Day
                </label>
              </div>
            </div>

            <div class="form-group" id="day-workout-select-group" style="${editingDay.day_type === 'rest' ? 'display:none;' : ''} margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label class="form-label" style="margin:0;">Select Assigned Workout</label>
                <button type="button" class="btn btn-secondary btn-sm" onclick="closeDayEditor(); setSplitSubTab('workouts'); openCreateWorkoutModal();">+ New Workout</button>
              </div>
              <select class="form-input form-select" name="workout_id" id="day-workout-select">
                <option value="">-- Choose a workout --</option>
                ${workoutOpts}
              </select>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" onclick="closeDayEditor()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Assignment ✓</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  // Create Split Modal
  let createSplitModalHtml = '';
  if (state.showCreateSplitModal) {
    createSplitModalHtml = `
      <div class="day-editor-backdrop" onclick="if(event.target === this) closeCreateSplitModal()">
        <div class="day-editor-modal">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text);">Create New Training Split</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeCreateSplitModal()">✕</button>
          </div>

          <form onsubmit="handleCreateSplit(event)">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Split Name</label>
              <input class="form-input" type="text" name="name" placeholder="e.g. Upper / Lower 4-Day" required>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Description <span class="opt">opt</span></label>
              <input class="form-input" type="text" name="description" placeholder="e.g. 4 workout days, 3 rest days">
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" name="is_active" value="1" checked>
                Set as Active Training Split
              </label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" onclick="closeCreateSplitModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Split ✓</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  return `
    <div class="split-screen">
      <div class="view-header">
        <div class="split-hub-header">
          <div>
            <h1 class="view-title">My Training Split</h1>
            <p class="view-subtitle">7-Day weekly planner from Monday to Sunday.</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${!isActive ? `<button class="btn btn-secondary btn-sm" onclick="activateSplit(${currentSplit.id})">⭐ Set as Active Split</button>` : '<span class="today-status-badge today-status-active">⭐ Active Program</span>'}
            <button class="btn btn-primary btn-sm" onclick="openCreateSplitModal()">+ New Split</button>
          </div>
        </div>
      </div>

      ${subTabsHtml}

      <div class="split-tabs-bar">
        ${splitTabsHtml}
      </div>

      <div class="schedule-grid">
        ${dayCardsHtml}
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header" style="justify-content:space-between; align-items:center;">
          <span class="card-title">${currentSplit.name} Settings</span>
          ${state.splits.length > 1 ? `<button class="btn btn-danger btn-sm" onclick="handleDeleteSplit(${currentSplit.id}, '${currentSplit.name}')">Delete Split</button>` : ''}
        </div>
        <div class="card-body">
          <p style="color:var(--text-muted); font-size:13px; margin:0;">
            ${currentSplit.description || 'Custom weekly split configuration.'}
            ${isActive ? ' Currently powering the Home screen.' : ''}
          </p>
        </div>
      </div>

      ${dayEditorHtml}
      ${createSplitModalHtml}
    </div>`;
}

function setSplitSubTab(tab) {
  state.splitSubTab = tab;
  render();
}

function renderEditViewInner() {
  const selectedWorkout = state.selectedWorkoutDetail || state.workouts.find(w => w.id === state.selectedWorkoutId) || state.workouts[0];

  const workoutsListHtml = state.workouts.map(w => `
    <div class="workout-summary-card" style="${selectedWorkout && selectedWorkout.id === w.id ? 'border-color:var(--accent); background:rgba(124,106,247,0.06);' : ''}">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <h3 style="font-size:17px; font-weight:700; color:var(--text);">${w.name}</h3>
          <span class="badge badge-reps">${w.exercise_count || 0} exercises</span>
        </div>
        <p style="color:var(--text-muted); font-size:12px; margin:0;">${w.description || 'Reusable workout template'}</p>
        <div style="font-size:12px; color:var(--text-muted); margin-top:8px;" class="mono">
          Total Sets: <strong>${w.total_sets || 0}</strong>
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn btn-secondary btn-sm" onclick="selectWorkoutForEditing(${w.id})">✎ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${w.id})">⎘ Duplicate</button>
        <button class="btn btn-primary btn-sm" onclick="startWorkoutFromId(${w.id})">▶ Test Run</button>
      </div>
    </div>
  `).join('');

  // Workout Editor for Selected Workout
  let workoutEditorHtml = '';
  if (selectedWorkout) {
    const exercises = selectedWorkout.exercises || [];
    const exerciseRowsHtml = exercises.map((ex, idx) => {
      const isHold = ex.exercise_type === 'duration';
      const targetVal = isHold ? (ex.duration_sec || 30) : (ex.reps || 10);

      return `
        <div class="workout-item-card" id="workout-slot-${idx}">
          <div class="workout-item-top">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="mono" style="color:var(--text-muted); font-size:12px;">#${String(idx + 1).padStart(2, '0')}</span>
              <strong style="color:var(--text); font-size:14px;">${ex.exercise_name}</strong>
              ${badge(ex.exercise_type)}
            </div>
            <button type="button" class="btn btn-danger btn-sm" style="padding:2px 8px; font-size:11px;" onclick="removeWorkoutExerciseSlot(${idx})">✕ Remove</button>
          </div>

          <!-- Basic Fields Visible by Default -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-top:6px;">
            <div class="form-group">
              <label class="form-label">Sets</label>
              <div class="stepper-group">
                <button type="button" class="stepper-btn" onclick="adjustSlotSets(${idx}, -1)">-</button>
                <span class="stepper-val mono" id="slot-sets-${idx}">${ex.sets || 3}</span>
                <button type="button" class="stepper-btn" onclick="adjustSlotSets(${idx}, 1)">+</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">${isHold ? 'Hold (sec)' : 'Target Reps'}</label>
              <input class="form-input mono" type="number" id="slot-target-${idx}" value="${targetVal}" min="1" style="padding:5px 8px; font-size:13px;">
            </div>

            <div class="form-group">
              <label class="form-label">Rest (sec)</label>
              <input class="form-input mono" type="number" id="slot-rest-${idx}" value="${ex.rest_sec || 90}" min="0" step="15" style="padding:5px 8px; font-size:13px;">
            </div>
          </div>

          <!-- Expandable Advanced Settings (Progressive Disclosure) -->
          <details style="margin-top:6px;">
            <summary style="font-size:11px; color:var(--accent); cursor:pointer; font-weight:600;">Advanced Settings (Tempo, Superset, Notes) ▼</summary>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-top:8px;">
              <div class="form-group">
                <label class="form-label">Tempo <span class="opt">opt</span></label>
                <input class="form-input mono" type="text" id="slot-tempo-${idx}" value="${ex.tempo || ''}" placeholder="3010" style="padding:5px 8px; font-size:13px;">
              </div>

              <div class="form-group">
                <label class="form-label">Superset # <span class="opt">opt</span></label>
                <input class="form-input mono" type="number" id="slot-ss-${idx}" value="${ex.superset_group || ''}" placeholder="1, 2" min="1" style="padding:5px 8px; font-size:13px;">
              </div>
            </div>
            <div class="form-group" style="margin-top:8px;">
              <label class="form-label">Coaching Notes <span class="opt">opt</span></label>
              <input class="form-input" type="text" id="slot-notes-${idx}" value="${ex.notes || ''}" placeholder="e.g. Chest up, full protraction at top" style="font-size:12px; padding:6px 10px;">
            </div>
          </details>
        </div>`;
    }).join('');

    const catalogOpts = state.exercises.map(e => `<option value="${e.id}">${e.name} (${e.type})</option>`).join('');

    workoutEditorHtml = `
      <div class="card" style="margin-top:24px;">
        <div class="card-header" style="justify-content:space-between; align-items:center;">
          <span class="card-title">Editing: ${selectedWorkout.name}</span>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${selectedWorkout.id})">⎘ Duplicate</button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteWorkout(${selectedWorkout.id}, '${selectedWorkout.name}')">🗑 Delete</button>
          </div>
        </div>

        <div class="card-body">
          <form onsubmit="handleSaveWorkout(event, ${selectedWorkout.id})">
            <div class="form-row" style="margin-bottom:16px;">
              <div class="form-group form-group-wide">
                <label class="form-label">Workout Name</label>
                <input class="form-input" type="text" id="edit-workout-name" value="${selectedWorkout.name}" required>
              </div>
              <div class="form-group form-group-wide">
                <label class="form-label">Description <span class="opt">opt</span></label>
                <input class="form-input" type="text" id="edit-workout-desc" value="${selectedWorkout.description || ''}" placeholder="e.g. Primary upper body focus">
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <h4 style="font-size:14px; font-weight:600; color:var(--text); margin-bottom:8px;">Exercises in this Workout</h4>
              ${exerciseRowsHtml.length > 0 ? exerciseRowsHtml : '<div class="empty-state">No exercises in this workout yet. Add one below.</div>'}
            </div>

            <div class="card" style="background:var(--surface-2); padding:14px; margin-bottom:20px;">
              <span style="font-size:13px; font-weight:600; color:var(--text); display:block; margin-bottom:8px;">+ Add Movement from Library</span>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <select class="form-input form-select" id="add-slot-exercise-id" style="flex:1; min-width:200px;">
                  ${catalogOpts}
                </select>
                <button type="button" class="btn btn-secondary" onclick="addExerciseSlotToWorkout()">+ Add Exercise</button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <button type="button" class="btn btn-secondary" onclick="startWorkoutFromId(${selectedWorkout.id})">⚡ Test Run Runner ➔</button>
              <button type="submit" class="btn btn-primary">Save Workout Changes ✓</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  // Create Workout Modal if active
  let createWorkoutModalHtml = '';
  if (state.showCreateWorkoutModal) {
    createWorkoutModalHtml = `
      <div class="day-editor-backdrop" onclick="if(event.target === this) closeCreateWorkoutModal()">
        <div class="day-editor-modal">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text);">Create New Workout</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeCreateWorkoutModal()">✕</button>
          </div>

          <form onsubmit="handleCreateWorkout(event)">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Workout Name</label>
              <input class="form-input" type="text" name="name" placeholder="e.g. Upper Power A" required>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Description <span class="opt">opt</span></label>
              <input class="form-input" type="text" name="description" placeholder="e.g. Heavy pull-ups and dips focus">
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" onclick="closeCreateWorkoutModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Workout ✓</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  return `
    <div>
      <div class="workout-list-grid">
        ${workoutsListHtml}
      </div>

      ${workoutEditorHtml}
      ${createWorkoutModalHtml}
    </div>`;
}

// ─── Compatibility alias for #edit ───────────────────────────────────────────
function renderEditView() {
  state.splitSubTab = 'workouts';
  return renderSplitView();
}
function renderTodayView() {
  return renderHomeView();
}
function renderRoutineView() {
  state.splitSubTab = 'schedule';
  return renderSplitView();
}

// ─── Phase 4: Consistency Heatmap & PRs Cards ──────────────────────────────
function renderActivityHeatmap(activityList = []) {
  const map = {};
  activityList.forEach(a => { map[a.date] = a.total_sets; });
  const cells = [];
  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const sets = map[iso] || 0;
    const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}: ${sets} sets`;
    const levelClass = sets === 0 ? 'heatmap-0' : sets <= 3 ? 'heatmap-1' : sets <= 6 ? 'heatmap-2' : 'heatmap-3';
    cells.push(`<div class="heatmap-cell ${levelClass}" title="${label}"></div>`);
  }
  return `
    <div class="card" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">Training Consistency (4 Weeks)</span>
        <span class="card-count mono">${activityList.length} active day${activityList.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card-body">
        <div class="heatmap-grid">
          ${cells.join('')}
        </div>
        <div class="heatmap-legend">
          <span class="heatmap-legend-label">Less</span>
          <div class="heatmap-cell heatmap-0"></div>
          <div class="heatmap-cell heatmap-1"></div>
          <div class="heatmap-cell heatmap-2"></div>
          <div class="heatmap-cell heatmap-3"></div>
          <span class="heatmap-legend-label">More</span>
        </div>
      </div>
    </div>`;
}

function checkAndCelebratePR(exerciseId, val, weightKg = null) {
  if (!val || val <= 0) return;
  const ex = getExercise(exerciseId);
  const rec = (state.dashboardRecords || []).find(r => r.exercise_id === exerciseId);
  if (!rec) return;

  const isHold = ex?.type === 'duration';
  let isNewPR = false;
  let prMsg = '';

  if (isHold) {
    if (rec.max_duration_sec && val > rec.max_duration_sec) {
      isNewPR = true;
      prMsg = `🏆 NEW PR! ${ex?.name || 'Exercise'}: ${val}s hold (beat previous ${rec.max_duration_sec}s)`;
    }
  } else {
    if (rec.max_reps && val > rec.max_reps) {
      isNewPR = true;
      prMsg = `🏆 NEW PR! ${ex?.name || 'Exercise'}: ${val} reps (beat previous ${rec.max_reps})`;
    }
  }

  if (weightKg && (!rec.max_weight_kg || weightKg > rec.max_weight_kg)) {
    isNewPR = true;
    prMsg = `🏆 NEW WEIGHT PR! ${ex?.name || 'Exercise'}: +${weightKg}kg`;
  }

  if (isNewPR) {
    cueExerciseComplete();
    showToast(prMsg);
  }
}

function renderPersonalRecordsCard(records = []) {
  if (!records || !records.length) return '';
  const topRecords = records.slice(0, 6);
  const rows = topRecords.map(r => {
    const repVal = r.max_reps ? `<span class="mono badge badge-reps">${r.max_reps} reps</span>` : '';
    const holdVal = r.max_duration_sec ? `<span class="mono badge badge-duration">${r.max_duration_sec}s</span>` : '';
    const weightVal = r.max_weight_kg ? `<span class="mono badge" style="background:rgba(234,179,8,0.15); color:var(--warning);">+${r.max_weight_kg}kg</span>` : '';

    return `
      <div class="pr-row" onclick="openHistoryView(${r.exercise_id})" role="button" tabindex="0">
        <div class="pr-info">
          <span class="pr-trophy">🏆</span>
          <span class="pr-name">${r.exercise_name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          ${repVal}
          ${holdVal}
          ${weightVal}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">All-Time Personal Records (PRs)</span>
        <span class="card-count mono">${records.length} exercises</span>
      </div>
      <div class="card-body" style="padding: 6px 18px;">
        <div class="pr-list">
          ${rows}
        </div>
      </div>
    </div>`;
}

async function importData(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = await api('POST', '/import', json);
    showToast(`Restored: ${result.imported} logs imported (${result.skipped} existing) ✓`);
    input.value = '';
    await loadDashboardSummary();
    await loadTodayLogs();
    render();
  } catch (e) {
    showToast(`Restore error: ${e.message}`, true);
  }
}

// ─── Screen 1: Today's Day view ──────────────────────────────────────────────
function renderHomeView() {
  const day       = getTodayDay();

  // Rest day — no exercise list; muted text only (design.md: no illustration).
  if (day === 'Rest') {
    return `
      <div class="home-screen">
        <div class="home-header">
          <h1 class="home-day-name">Rest Day</h1>
          <span class="home-date">${getTodayLabel()}</span>
        </div>
        <div class="card">
          <p class="dashboard-empty-text" style="padding: 32px 20px;">Today is a rest day. Come back tomorrow.</p>
        </div>
      </div>`;
  }

  const exercises = state.exercises.filter(e => e.day === day);
  const active = getActiveSession();
  const isThisActive = active && active.status === 'in_progress' && active.routine === day;

  const rows = exercises.map(ex => {
    const log    = state.todayLogs[ex.id] ?? null;
    const last   = fmtLastLog(ex, log);
    const lastHtml = last
      ? `<span class="home-last mono">${last}</span>`
      : `<span class="home-last home-last-empty">—</span>`;

    return `
      <button class="home-ex-row" id="home-ex-${ex.id}"
              onclick="openLogView(${ex.id}, 'home')">
        <span class="home-ex-name">${ex.name}</span>
        ${lastHtml}
      </button>`;
  }).join('');

  return `
    <div class="home-screen">
      <div class="home-header" style="display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap;">
        <div>
          <h1 class="home-day-name">${day}</h1>
          <span class="home-date">${getTodayLabel()}</span>
        </div>
        <button class="btn btn-primary" onclick="startWorkoutSession('${day}', 1)">
          ${isThisActive ? '⚡ Continue Workout ➔' : '⚡ Start Workout ➔'}
        </button>
      </div>
      <div class="card">
        ${exercises.length > 0
          ? `<div class="home-ex-list">${rows}</div>`
          : `<div class="empty-state">No exercises seeded for ${day} day.</div>`
        }
      </div>
    </div>`;
}

// Navigate to the log screen, tracking which view to return to.
// When called from the routine view, levelExercise is the matching le row
// (contains sets, rest_sec) — enables the guided session flow.
function openLogView(exerciseId, returnView = 'home', levelExercise = null) {
  stopRest();
  stopTimer();
  state.logExerciseId = exerciseId;
  state.logReturnView = returnView;
  state.logElapsed    = 0;
  // Guided session: reset set counter when starting a fresh exercise session.
  // If levelExercise is provided (opening from routine), wire up set tracking.
  if (levelExercise) {
    state.sessionSet       = 1;
    state.sessionTotalSets = levelExercise.sets || null;
    state.sessionRestSec   = levelExercise.rest_sec || null;
  } else {
    state.sessionSet       = 1;
    state.sessionTotalSets = null;
    state.sessionRestSec   = null;
  }
  state.view = 'log';
  window.location.hash = `log-${exerciseId}`;
  render();
}

// ── Timer helpers ────────────────────────────────────────────────────────────
function startTimer() {
  if (state.logTimer) return;       // already running
  const startedAt = Date.now() - state.logElapsed * 1000;
  const intervalId = setInterval(() => {
    state.logElapsed = Math.floor((Date.now() - startedAt) / 1000);
    const el = document.getElementById('timer-display');
    if (el) el.textContent = fmtSecs(state.logElapsed);
  }, 200);
  state.logTimer = { startedAt, intervalId };
  const btn = document.getElementById('timer-btn');
  if (btn) { btn.textContent = 'Stop'; btn.classList.add('timer-btn-running'); }
}

function stopTimer() {
  if (!state.logTimer) return;
  clearInterval(state.logTimer.intervalId);
  state.logTimer = null;
  const btn = document.getElementById('timer-btn');
  if (btn) { btn.textContent = 'Start'; btn.classList.remove('timer-btn-running'); }
}

function fmtSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function toggleTimer() {
  if (state.logTimer) {
    stopTimer();
    // Auto-save the duration when the user stops the timer.
    // Fire hold-save cue first (beep + vibrate) so the gym-user gets
    // confirmation without needing to see the screen mid-hold.
    if (state.logElapsed > 0) {
      cueHoldSave();
      saveLog({ duration_sec: state.logElapsed });
    }
  } else {
    startTimer();
  }
}

// ── Save log ─────────────────────────────────────────────────────────────────
// Writes to localStorage only — no backend call.
// Sync is wired separately (Step 5) via lsSyncPending() / startSyncLoop().
function saveLog(extra = {}) {
  const entry = {
    exercise_id:  state.logExerciseId,
    timestamp:    new Date().toISOString(),
    client_uuid:  newUUID(),
    ...extra,
  };
  lsWriteLog(entry);          // immediate localStorage write
  lsSyncPending();            // trigger background sync
  state.logElapsed = 0;
  stopTimer();

  // ── Guided session flow ───────────────────────────────────────────────────
  if (state.sessionTotalSets !== null) {
    const isLastSet = state.sessionSet >= state.sessionTotalSets;
    if (isLastSet) {
      // All sets complete — mark done, return to routine.
      markExerciseDone(state.logExerciseId);
      cueExerciseComplete();          // two-beep + pattern vibrate
      showToast('Exercise complete ✓');
      state.view = state.logReturnView;
      window.location.hash = state.logReturnView;
      render();
    } else {
      // More sets remain — show rest countdown, then advance.
      showToast('Set saved ✓');
      startRestCountdown(state.sessionRestSec || 90);
    }
  } else {
    // Unguided (opened outside routine context) — original behaviour.
    showToast('✓');
    render();
  }
}

// ── Rest countdown ────────────────────────────────────────────────────────────
function startRestCountdown(sec) {
  stopRest();
  state.restActive    = true;
  state.restRemaining = sec;
  render();  // show rest screen immediately
  state.restIntervalId = setInterval(() => {
    state.restRemaining--;
    const el = document.getElementById('rest-countdown');
    if (el) el.textContent = fmtSecs(state.restRemaining);
    // Audible warning: quiet tick for last 3 seconds
    if (state.restRemaining > 0 && state.restRemaining <= 3) cueTick();
    if (state.restRemaining <= 0) {
      cueRestEnd();   // beep + vibrate at zero
      advanceSet();
    }
  }, 1000);
}

function stopRest() {
  if (state.restIntervalId) {
    clearInterval(state.restIntervalId);
    state.restIntervalId = null;
  }
  state.restActive = false;
}

// Called when rest timer hits zero or user taps "Skip Rest".
function advanceSet() {
  stopRest();
  state.sessionSet++;
  state.restActive = false;
  render();
}

function handleSaveReps(event) {
  event.preventDefault();
  const form = event.target;
  const reps      = parseInt(form.reps.value, 10) || null;
  const weight_kg = parseFloat(form.weight_kg?.value) || null;
  const rpe       = parseInt(form.rpe?.value, 10) || null;
  if (!reps) { showToast('Enter reps first', true); return; }
  saveLog({ reps, weight_kg, rpe });
  form.reset();
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderLogView() {
  const ex     = getExercise(state.logExerciseId);
  const isHold = ex?.type === 'duration';
  const back   = `<button class="btn-back" onclick="goBack()">← Back</button>`;
  // Small secondary link to jump to the history chart for this exercise
  const histLink = `<button class="btn-history-link" onclick="openHistoryView(${state.logExerciseId})">History →</button>`;
  const muteBtn  = `<button class="btn-mute" onclick="toggleMute()" title="${isMuted() ? 'Unmute' : 'Mute'}">${isMuted() ? '🔇' : '🔊'}</button>`;

  // ── Rest countdown screen ─────────────────────────────────────────────────
  if (state.restActive) {
    return `
      <div class="log-screen">
        <div class="log-topbar">${back}${muteBtn}</div>
        <div class="rest-screen">
          <p class="rest-label">Rest</p>
          <div id="rest-countdown" class="rest-countdown mono">${fmtSecs(state.restRemaining)}</div>
          <p class="rest-next">Set ${state.sessionSet + 1} of ${state.sessionTotalSets} up next</p>
          <button class="btn-skip-rest" onclick="advanceSet()">Skip Rest</button>
        </div>
      </div>`;
  }

  // ── Set progress indicator (guided sessions only) ─────────────────────────
  const setProgress = state.sessionTotalSets !== null ? `
    <div class="set-progress">
      <span class="set-progress-label mono">Set ${state.sessionSet} of ${state.sessionTotalSets}</span>
      <div class="set-progress-pips">
        ${Array.from({length: state.sessionTotalSets}, (_, i) =>
          `<span class="set-pip ${i < state.sessionSet - 1 ? 'set-pip-done' : i === state.sessionSet - 1 ? 'set-pip-active' : ''}"></span>`
        ).join('')}
      </div>
    </div>` : '';

  const logBody = isHold ? `
    <!-- Duration / timer logging -->
    <div class="log-timer-wrap">
      <div id="timer-display" class="timer-display mono">${fmtSecs(state.logElapsed)}</div>
      <button id="timer-btn" class="timer-btn" onclick="toggleTimer()">Start</button>
      <p class="timer-hint">Timer saves automatically when you tap Stop.</p>
    </div>` : `
    <!-- Rep-based logging -->
    <form class="log-reps-form" onsubmit="handleSaveReps(event)">
      <div class="log-field">
        <label class="log-label">Reps</label>
        <input id="log-reps" class="log-input mono" type="number" name="reps" min="1"
               placeholder="0" inputmode="numeric" autofocus required>
      </div>
      <div class="log-field">
        <label class="log-label">Weight (kg) <span class="opt">opt</span></label>
        <input class="log-input mono" type="number" name="weight_kg" min="0" step="0.5"
               placeholder="0" inputmode="decimal">
      </div>
      <div class="log-field">
        <label class="log-label">RPE <span class="opt">opt · 1–10</span></label>
        <div class="rpe-row" id="rpe-row"></div>
        <input type="hidden" name="rpe" id="rpe-hidden">
      </div>
      <button class="btn btn-save" type="submit">Save Set</button>
    </form>`;

  return `
    <div class="log-screen">
      <div class="log-topbar">${back}<span class="log-topbar-right">${histLink}${muteBtn}</span></div>
      <div class="log-header">
        <h1 class="log-exercise-name">${ex?.name ?? '?'}</h1>
        <span class="log-type-badge">${badge(ex?.type)}</span>
      </div>
      ${setProgress}
      ${logBody}
    </div>`;
}

// ─── Screen 3: History / Chart ────────────────────────────────────────────────

// Navigate to history for a specific exercise; fetch logs & progression status then render.
function openHistoryView(exerciseId) {
  state.historyExerciseId  = exerciseId;
  state.historyLogs        = null; // null = loading
  state.historyProgression = null;
  state.historyMetricMode  = state.historyMetricMode || 'best';
  state.view               = 'history';
  window.location.hash     = `history-${exerciseId}`;
  render(); // show skeleton immediately

  Promise.allSettled([
    api('GET', `/exercises/${exerciseId}/logs`),
    api('GET', `/exercises/${exerciseId}/progression-status`)
  ]).then(([logsRes, progRes]) => {
    state.historyLogs        = logsRes.status === 'fulfilled' ? logsRes.value : [];
    state.historyProgression = progRes.status === 'fulfilled' ? progRes.value : null;
    render();
  });
}

function setHistoryMetricMode(mode) {
  state.historyMetricMode = mode;
  render();
}

function goBackFromHistory() {
  // Return to the log screen for the same exercise so the user can keep logging.
  state.view = 'log';
  window.location.hash = `log-${state.historyExerciseId}`;
  render();
}

async function promoteProgression(exId, nextExId) {
  try {
    const res = await api('POST', `/exercises/${exId}/promote`);
    cueExerciseComplete();
    showToast(`Level Up! 🚀 Promoted to ${res.next_exercise.name}!`);
    await loadExercises();
    await loadLevel();
    openHistoryView(nextExId || res.next_exercise.id);
  } catch (e) {
    showToast(`Promotion failed: ${e.message}`, true);
  }
}

// ── Chart.js chart ────────────────────────────────────────────────────────────
let _chartInstance = null;

function buildHistoryChart() {
  const canvas = document.getElementById('history-canvas');
  if (!canvas || !window.Chart) return;

  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

  const ex     = getExercise(state.historyExerciseId);
  const mode   = state.historyMetricMode || 'best';
  const points = computeProgress(ex, state.historyLogs || [], mode);
  if (!points.length) return;

  const isHold = ex?.type === 'duration';
  const unit   = isHold ? 's' : (mode === 'volume' ? ' vol' : ' reps');

  const labels = points.map(p => {
    const d = new Date(p.date + 'T12:00:00'); // noon avoids tz-boundary shift
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });

  _chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data:            points.map(p => p.metric),
        borderColor:     '#7c6af7',
        backgroundColor: 'rgba(124, 106, 247, 0.08)',
        borderWidth:     2,
        pointRadius:     4,
        pointBackgroundColor: '#7c6af7',
        pointBorderColor:     '#0d0d0f',
        pointBorderWidth:     1,
        fill:            true,
        tension:         0.35,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 400 },
      plugins: {
        legend:  { display: false },
        tooltip: {
          backgroundColor: '#1c1c24',
          borderColor:     '#7c6af7',
          borderWidth:     1,
          titleColor:      '#6b6b90',
          bodyColor:       '#e4e4f0',
          bodyFont:        { family: "'JetBrains Mono', monospace", size: 13 },
          callbacks: { label: ctx => `${ctx.parsed.y}${unit}` },
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b6b90', font: { family: "'Inter',sans-serif", size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.05)' },
          border:{ dash: [3,3] },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#6b6b90',
            font:  { family: "'JetBrains Mono',monospace", size: 11 },
            callback: v => `${v}${unit}`,
          },
          grid:  { color: 'rgba(255,255,255,0.05)' },
          border:{ dash: [3,3] },
        },
      },
    },
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderHistoryView() {
  const ex = getExercise(state.historyExerciseId);

  // Loading skeleton
  if (state.historyLogs === null) {
    return `
      <div class="history-screen">
        <div class="log-topbar"><button class="btn-back" onclick="goBackFromHistory()">← Back</button></div>
        <div class="history-header">
          <h1 class="history-ex-name">${ex?.name ?? '?'}</h1>
        </div>
        <div class="history-loading">Loading…</div>
      </div>`;
  }

  const mode   = state.historyMetricMode || 'best';
  const points = computeProgress(ex, state.historyLogs, mode);
  const stats  = computeStats(points);
  const isHold = ex?.type === 'duration';
  const unit   = isHold ? 's' : (mode === 'volume' ? ' vol' : ' reps');

  const metricLabel = isHold
    ? (mode === 'best' ? 'Best Hold / Session (s)' : 'Total Hold Time (s)')
    : (mode === 'best' ? 'Best Set (Max Reps)' : 'Total Estimated Volume');

  // ── Stat row (design.md: show the answer, not just the chart) ────────────
  let statHtml = '';
  if (stats) {
    const { current, past, pct } = stats;
    const pctHtml = pct === null
      ? `<span class="stat-value mono stat-neutral">—</span>`
      : `<span class="stat-value mono ${pct >= 0 ? 'stat-up' : 'stat-down'}">${pct >= 0 ? '+' : ''}${pct}%</span>`;

    statHtml = `
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Current</span>
          <span class="stat-value mono">${current}${unit}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">2 wks ago</span>
          <span class="stat-value mono">${past !== null ? past + unit : '—'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Change</span>
          ${pctHtml}
        </div>
      </div>`;
  }

  // ── Metric toggle buttons ────────────
  const toggleHtml = `
    <div class="metric-toggle-group">
      <button class="metric-toggle-btn ${mode === 'best' ? 'active' : ''}" onclick="setHistoryMetricMode('best')">
        ${isHold ? 'Best Hold' : 'Best Set'}
      </button>
      <button class="metric-toggle-btn ${mode === 'volume' ? 'active' : ''}" onclick="setHistoryMetricMode('volume')">
        ${isHold ? 'Total Hold Time' : 'Total Volume'}
      </button>
    </div>`;

  // ── Progression status banner ────────────
  // ── Progression status banner ────────────
  let progBannerHtml = '';
  if (state.historyProgression) {
    const p = state.historyProgression;
    const isReady = p.status === 'ready';
    const isAlmost = p.status === 'almost_ready';
    const pct = p.readiness_pct ?? 0;
    const crit = p.criteria || {};
    const nextName = p.next_exercise?.name ? ` → ${p.next_exercise.name}` : '';
    const rpeText = crit.avg_rpe !== null && crit.avg_rpe !== undefined ? ` · Avg RPE: ${crit.avg_rpe}` : '';

    if (isReady) {
      progBannerHtml = `
        <div class="progression-banner progression-banner-ready">
          <span class="prog-icon">🏆</span>
          <div class="prog-info" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="prog-title">Ready to Progress!${nextName}</span>
              <span class="mono" style="font-weight:700; color:var(--success); font-size:13px;">${pct}%</span>
            </div>
            <div class="prog-progress-wrap" style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-bottom:6px;">
              <div style="height:100%; width:${pct}%; background:var(--success); transition:width 0.3s;"></div>
            </div>
            <span class="prog-desc">Target achieved in ${crit.sessions_completed || 0}/${crit.sessions_needed || 2} sessions${rpeText}.</span>
          </div>
          ${p.next_exercise ? `
            <button class="btn btn-sm btn-primary" style="margin-left:12px; white-space:nowrap;" onclick="promoteProgression(${state.historyExerciseId}, ${p.next_exercise.id})">
              Promote 🚀
            </button>` : ''}
        </div>`;
    } else if (isAlmost) {
      progBannerHtml = `
        <div class="progression-banner progression-banner-progress" style="border-left: 3px solid var(--accent);">
          <span class="prog-icon">⚡</span>
          <div class="prog-info" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="prog-title">Almost Ready to Progress!${nextName}</span>
              <span class="mono" style="font-weight:700; color:var(--accent); font-size:13px;">${pct}%</span>
            </div>
            <div class="prog-progress-wrap" style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-bottom:6px;">
              <div style="height:100%; width:${pct}%; background:var(--accent); transition:width 0.3s;"></div>
            </div>
            <span class="prog-desc">${crit.sessions_completed || 0}/${crit.sessions_needed || 2} target sessions${rpeText}. Keep fatigue in check!</span>
          </div>
        </div>`;
    } else if (!p.no_target) {
      progBannerHtml = `
        <div class="progression-banner progression-banner-progress">
          <span class="prog-icon">🎯</span>
          <div class="prog-info" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="prog-title">Progression Tracking${nextName}</span>
              <span class="mono" style="font-weight:700; color:var(--text-muted); font-size:13px;">${pct}%</span>
            </div>
            <div class="prog-progress-wrap" style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-bottom:6px;">
              <div style="height:100%; width:${pct}%; background:var(--border-focus); transition:width 0.3s;"></div>
            </div>
            <span class="prog-desc">${crit.sessions_completed || 0} of ${crit.sessions_needed || 2} target sessions achieved${rpeText}.</span>
          </div>
        </div>`;
    }
  }

  const bodyHtml = points.length
    ? `<div class="chart-wrap"><canvas id="history-canvas"></canvas></div>`
    : `<div class="empty-state">No logs yet — tap an exercise on Today's screen to start logging.</div>`;

  return `
    <div class="history-screen">
      <div class="log-topbar">
        <button class="btn-back" onclick="goBackFromHistory()">← Back</button>
      </div>
      <div class="history-header">
        <h1 class="history-ex-name">${ex?.name ?? '?'}</h1>
        <span class="history-metric-label">${metricLabel}</span>
      </div>
      ${progBannerHtml}
      ${toggleHtml}
      ${statHtml}
      ${bodyHtml}
    </div>`;
}

// ─── Phase 4: Unified Workout Session History Log ───────────────────────────

async function loadWorkoutSessions() {
  try {
    state.workoutSessions = await api('GET', '/workout_sessions');
  } catch (e) {
    state.workoutSessions = [];
  }
}

async function openHistoryListView() {
  state.view = 'history_list';
  window.location.hash = 'history';
  await loadWorkoutSessions();
  render();
}

async function openSessionDetailView(sessionUuid) {
  state.selectedSessionUuid = sessionUuid;
  state.selectedSessionDetail = null;
  state.view = 'session_detail';
  window.location.hash = `session-${sessionUuid}`;
  render();
  try {
    state.selectedSessionDetail = await api('GET', `/workout_sessions/${sessionUuid}`);
  } catch (e) {
    showToast(`Error loading session: ${e.message}`, true);
  }
  render();
}

function renderHistoryListView() {
  const sessions = state.workoutSessions || [];

  const sessionCardsHtml = sessions.length === 0
    ? `<div class="empty-state" style="padding:48px 0;">
         <p>No completed workout sessions logged yet.</p>
         <div style="margin-top:16px;">
           <button class="btn btn-primary" onclick="switchView('home')">Start Today's Workout ➔</button>
         </div>
       </div>`
    : sessions.map(s => {
        const d = new Date(s.completed_at || s.started_at);
        const dateStr = isNaN(d.getTime())
          ? (s.completed_at || s.started_at)
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const durMin = Math.round((s.duration_sec || 0) / 60);

        return `
          <div class="history-session-card" onclick="openSessionDetailView('${s.session_uuid}')">
            <div class="history-session-top">
              <div>
                <h3 class="history-session-title">${s.routine_name} <span class="badge badge-reps">Level ${s.level}</span></h3>
                <span class="history-session-date mono">${dateStr}</span>
              </div>
              <span class="badge badge-duration">✓ ${s.status}</span>
            </div>
            <div class="history-session-metrics">
              <div class="history-metric-badge"><span>Duration:</span> <strong>${durMin} min</strong></div>
              <div class="history-metric-badge"><span>Sets Done:</span> <strong>${s.completed_sets}/${s.total_sets || s.completed_sets}</strong></div>
              <div style="margin-left:auto; color:var(--accent); font-size:13px; font-weight:600;">
                View Breakdown ➔
              </div>
            </div>
          </div>`;
      }).join('');

  return `
    <div class="history-screen">
      <div class="view-header">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
          <div>
            <h1 class="view-title">Training History</h1>
            <p class="view-subtitle">Chronological log of your completed calisthenics workout sessions.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="switchView('dashboard')">
            ← Dashboard
          </button>
        </div>
      </div>

      <div class="history-sessions-list">
        ${sessionCardsHtml}
      </div>
    </div>`;
}

function renderSessionDetailView() {
  const detail = state.selectedSessionDetail;
  if (!detail) {
    return `
      <div class="history-screen">
        <div class="log-topbar">
          <button class="btn-back" onclick="openHistoryListView()">← Back to History</button>
        </div>
        <div class="history-loading">Loading workout breakdown…</div>
      </div>`;
  }

  const d = new Date(detail.completed_at || detail.started_at);
  const dateStr = isNaN(d.getTime())
    ? (detail.completed_at || detail.started_at)
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const durMin = Math.round((detail.duration_sec || 0) / 60);

  // Group logs by exercise
  const exMap = {};
  (detail.logs || []).forEach(l => {
    if (!exMap[l.exercise_id]) {
      exMap[l.exercise_id] = {
        name: l.exercise_name || `Exercise #${l.exercise_id}`,
        type: l.exercise_type || 'reps',
        sets: []
      };
    }
    exMap[l.exercise_id].sets.push(l);
  });

  const exBoxesHtml = Object.keys(exMap).length === 0
    ? `<div class="empty-state">No individual set records found for this session.</div>`
    : Object.values(exMap).map(ex => {
        const isHold = ex.type === 'duration';
        const setRows = ex.sets.map((s, idx) => {
          const val = isHold ? `${s.duration_sec || 0}s hold` : `${s.reps || 0} reps`;
          const weight = s.weight_kg ? `+${s.weight_kg}kg` : '—';
          const rpe = s.rpe ? `RPE ${s.rpe}` : '—';
          return `
            <div class="session-detail-set-row">
              <span class="mono" style="color:var(--text-muted);">Set ${idx + 1}</span>
              <span class="mono" style="font-weight:600; color:var(--text);">${val}</span>
              <span class="mono" style="color:var(--text-muted);">${weight}</span>
              <span class="mono" style="color:var(--accent); font-size:12px;">${rpe}</span>
            </div>`;
        }).join('');

        return `
          <div class="session-detail-ex-box">
            <div class="session-detail-ex-header">
              <span style="font-size:15px; font-weight:600; color:var(--text);">${ex.name} ${badge(ex.type)}</span>
              <span class="mono" style="font-size:12px; color:var(--text-muted);">${ex.sets.length} sets logged</span>
            </div>
            <div style="display:grid; grid-template-columns:48px 1fr 1fr 1fr; gap:8px; font-size:11px; color:var(--text-muted); padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); text-transform:uppercase; letter-spacing:0.05em;">
              <span>Set</span><span>Performance</span><span>Weight</span><span>RPE</span>
            </div>
            ${setRows}
          </div>`;
      }).join('');

  return `
    <div class="history-screen">
      <div class="log-topbar">
        <button class="btn-back" onclick="openHistoryListView()">← Back to History</button>
      </div>

      <div class="today-hero-card" style="margin-bottom:20px;">
        <div class="today-hero-header">
          <div>
            <span class="today-hero-tag">COMPLETED WORKOUT SESSION</span>
            <h1 class="today-hero-title">${detail.routine_name} <span class="badge badge-reps">Level ${detail.level}</span></h1>
            <p style="color:var(--text-muted); font-size:13px; margin:4px 0 0 0;">${dateStr}</p>
          </div>
          <span class="today-status-badge today-status-done">✓ Finished</span>
        </div>

        <div class="today-hero-metrics">
          <div class="today-metric-pill"><span>Duration:</span> <span class="today-metric-val">${durMin} min</span></div>
          <div class="today-metric-pill"><span>Sets Completed:</span> <span class="today-metric-val">${detail.completed_sets}/${detail.total_sets || detail.completed_sets}</span></div>
          <div class="today-metric-pill"><span>Exercises:</span> <span class="today-metric-val">${Object.keys(exMap).length}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Recorded Exercises & Sets</span>
        </div>
        <div class="card-body" style="padding:16px;">
          ${exBoxesHtml}
        </div>
      </div>
    </div>`;
}



// ─── Phase 3: Active Workout Execution Runner ──────────────────────────────
const LS_ACTIVE_SESSION = 'cx_active_session';

function getActiveSession() {
  if (state.activeSession) return state.activeSession;
  try {
    const raw = localStorage.getItem(LS_ACTIVE_SESSION);
    if (raw) {
      state.activeSession = JSON.parse(raw);
      return state.activeSession;
    }
  } catch {}
  return null;
}

function saveActiveSession(session) {
  state.activeSession = session;
  if (session) {
    localStorage.setItem(LS_ACTIVE_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(LS_ACTIVE_SESSION);
  }
}

function getSessionElapsedSec(session) {
  if (!session || !session.startTime) return 0;
  const totalPaused = session.totalPausedMs || 0;
  if (session.status === 'paused' && session.pausedAt) {
    const activeMs = session.pausedAt - session.startTime - totalPaused;
    return Math.max(0, Math.floor(activeMs / 1000));
  }
  const activeMs = Date.now() - session.startTime - totalPaused;
  return Math.max(0, Math.floor(activeMs / 1000));
}

// ─── Custom Split & Workout Event Handlers ───────────────────────────────────

function openCreateSplitModal() {
  state.showCreateSplitModal = true;
  render();
}
function closeCreateSplitModal() {
  state.showCreateSplitModal = false;
  render();
}

async function handleCreateSplit(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const payload = {
    name: (data.get('name') || '').trim(),
    description: data.get('description') || '',
    is_active: data.get('is_active') ? 1 : 0
  };
  try {
    const created = await api('POST', '/splits', payload);
    state.showCreateSplitModal = false;
    showToast(`Created Split "${created.name}" ✓`);
    await loadSplits();
    state.selectedSplitId = created.id;
    await loadSplitDetail(created.id);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error creating split: ${e.message}`, true);
  }
}

async function selectSplit(splitId) {
  state.selectedSplitId = splitId;
  await loadSplitDetail(splitId);
  render();
}

async function activateSplit(splitId) {
  try {
    await api('PUT', `/splits/${splitId}`, { is_active: 1 });
    showToast('Split set as Active ⭐');
    await loadSplits();
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error activating split: ${e.message}`, true);
  }
}

async function handleDeleteSplit(splitId, splitName) {
  if (!confirm(`Are you sure you want to delete "${splitName}"?\nCompleted workout sessions and logs will NOT be deleted.`)) return;
  try {
    await api('DELETE', `/splits/${splitId}`);
    showToast(`Deleted split "${splitName}"`);
    state.selectedSplitId = null;
    await loadSplits();
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error deleting split: ${e.message}`, true);
  }
}

function openDayEditor(dayIndex) {
  state.editingDayIndex = dayIndex;
  render();
}
function closeDayEditor() {
  state.editingDayIndex = null;
  render();
}
function toggleDayTypeInput(val) {
  const grp = document.getElementById('day-workout-select-group');
  if (grp) grp.style.display = (val === 'rest') ? 'none' : 'block';
}

async function handleSaveScheduleDay(event, splitId, dayIndex) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const dayType = data.get('day_type');
  const workoutId = dayType === 'workout' ? (parseInt(data.get('workout_id'), 10) || null) : null;

  if (dayType === 'workout' && !workoutId) {
    showToast('Please select a workout to assign.', true);
    return;
  }

  try {
    await api('PUT', `/splits/${splitId}/schedule/${dayIndex}`, {
      day_type: dayType,
      workout_id: workoutId
    });
    state.editingDayIndex = null;
    showToast('Schedule day updated ✓');
    await loadSplitDetail(splitId);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error updating day: ${e.message}`, true);
  }
}

function setEditSubTab(tab) {
  state.editSubTab = tab;
  render();
}

async function selectWorkoutForEditing(workoutId) {
  state.selectedWorkoutId = workoutId;
  await loadWorkoutDetail(workoutId);
  render();
}

function openCreateWorkoutModal() {
  state.showCreateWorkoutModal = true;
  render();
}
function closeCreateWorkoutModal() {
  state.showCreateWorkoutModal = false;
  render();
}

async function handleCreateWorkout(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const payload = {
    name: (data.get('name') || '').trim(),
    description: data.get('description') || '',
    exercises: []
  };
  try {
    const created = await api('POST', '/workouts', payload);
    state.showCreateWorkoutModal = false;
    showToast(`Created Workout "${created.name}" ✓`);
    await loadWorkouts();
    state.selectedWorkoutId = created.id;
    await loadWorkoutDetail(created.id);
    render();
  } catch (e) {
    showToast(`Error creating workout: ${e.message}`, true);
  }
}

async function handleDuplicateWorkout(workoutId) {
  try {
    const dup = await api('POST', `/workouts/${workoutId}/duplicate`);
    showToast(`Duplicated into "${dup.name}" ✓`);
    await loadWorkouts();
    state.selectedWorkoutId = dup.id;
    await loadWorkoutDetail(dup.id);
    render();
  } catch (e) {
    showToast(`Error duplicating workout: ${e.message}`, true);
  }
}

async function handleDeleteWorkout(workoutId, workoutName) {
  if (!confirm(`Are you sure you want to delete "${workoutName}"?\nAny schedule days assigned to this workout will be converted to Rest days.\nHistorical completed workout logs will NOT be affected.`)) return;
  try {
    await api('DELETE', `/workouts/${workoutId}`);
    showToast(`Deleted workout "${workoutName}"`);
    state.selectedWorkoutId = null;
    await loadWorkouts();
    await loadSplits();
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error deleting workout: ${e.message}`, true);
  }
}

function adjustSlotSets(idx, delta) {
  const el = document.getElementById(`slot-sets-${idx}`);
  if (!el) return;
  let val = parseInt(el.textContent, 10) || 3;
  val = Math.max(1, Math.min(10, val + delta));
  el.textContent = val;
  if (state.selectedWorkoutDetail && state.selectedWorkoutDetail.exercises && state.selectedWorkoutDetail.exercises[idx]) {
    state.selectedWorkoutDetail.exercises[idx].sets = val;
  }
}

function addExerciseSlotToWorkout() {
  const sel = document.getElementById('add-slot-exercise-id');
  if (!sel || !sel.value) return;
  const exId = parseInt(sel.value, 10);
  const ex = getExercise(exId);
  if (!ex) return;

  if (!state.selectedWorkoutDetail) return;
  if (!state.selectedWorkoutDetail.exercises) state.selectedWorkoutDetail.exercises = [];

  const isHold = ex.type === 'duration';
  state.selectedWorkoutDetail.exercises.push({
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_type: ex.type,
    sets: 3,
    reps: isHold ? null : 10,
    duration_sec: isHold ? 30 : null,
    rest_sec: 90,
    tempo: '',
    superset_group: null,
    notes: ''
  });
  render();
}

function removeWorkoutExerciseSlot(idx) {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  state.selectedWorkoutDetail.exercises.splice(idx, 1);
  render();
}

async function handleSaveWorkout(event, workoutId) {
  event.preventDefault();
  const name = document.getElementById('edit-workout-name').value.trim();
  const desc = document.getElementById('edit-workout-desc').value.trim();

  if (!name) {
    showToast('Workout name is required', true);
    return;
  }

  const exercises = [];
  const currentExercises = state.selectedWorkoutDetail?.exercises || [];

  for (let idx = 0; idx < currentExercises.length; idx++) {
    const orig = currentExercises[idx];
    const setsEl = document.getElementById(`slot-sets-${idx}`);
    const targetEl = document.getElementById(`slot-target-${idx}`);
    const restEl = document.getElementById(`slot-rest-${idx}`);
    const tempoEl = document.getElementById(`slot-tempo-${idx}`);
    const ssEl = document.getElementById(`slot-ss-${idx}`);
    const notesEl = document.getElementById(`slot-notes-${idx}`);

    const isHold = orig.exercise_type === 'duration';
    const targetVal = targetEl ? parseInt(targetEl.value, 10) : (isHold ? 30 : 10);
    const setsVal = setsEl ? parseInt(setsEl.textContent, 10) : (orig.sets || 3);
    const restVal = restEl ? parseInt(restEl.value, 10) : 90;
    const tempoVal = tempoEl ? tempoEl.value.trim() : null;
    const ssVal = ssEl && ssEl.value ? parseInt(ssEl.value, 10) : null;
    const notesVal = notesEl ? notesEl.value.trim() : null;

    exercises.push({
      exercise_id: orig.exercise_id,
      order_index: idx + 1,
      sets: setsVal,
      reps: isHold ? null : targetVal,
      duration_sec: isHold ? targetVal : null,
      rest_sec: restVal,
      tempo: tempoVal || null,
      superset_group: ssVal,
      notes: notesVal || null
    });
  }

  try {
    await api('PUT', `/workouts/${workoutId}`, {
      name,
      description: desc,
      exercises
    });
    showToast('Workout saved successfully ✓');
    await loadWorkouts();
    await loadWorkoutDetail(workoutId);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error saving workout: ${e.message}`, true);
  }
}

// ─── Workout Launchers (Custom Split Integration) ────────────────────────────

async function startWorkoutFromResolved() {
  if (!state.todayResolved || state.todayResolved.status !== 'workout' || !state.todayResolved.workout) {
    showToast('No workout scheduled for today.', true);
    return;
  }
  const w = state.todayResolved.workout;
  startWorkoutFromData(w.name, w.exercises, w.id);
}

async function startWorkoutFromId(workoutId) {
  try {
    const w = await api('GET', `/workouts/${workoutId}`);
    if (!w || !w.exercises || !w.exercises.length) {
      showToast(`No exercises found in workout "${w?.name || workoutId}"`, true);
      return;
    }
    startWorkoutFromData(w.name, w.exercises, w.id);
  } catch (e) {
    showToast(`Failed to start workout: ${e.message}`, true);
  }
}

function startWorkoutFromData(workoutName, exercisesList, workoutId = null) {
  const active = getActiveSession();
  if (active && (active.status === 'in_progress' || active.status === 'paused') && active.routine === workoutName) {
    openWorkoutView();
    return;
  }

  const session = {
    id: newUUID(),
    date: todayISO(),
    routine: workoutName,
    workout_name: workoutName,
    workout_id: workoutId,
    level: 1,
    startTime: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    endTime: null,
    status: 'in_progress',
    exercises: exercisesList.map(le => {
      const ex = getExercise(le.exercise_id);
      const isHold = (le.exercise_type || ex?.type) === 'duration';
      const targetVal = isHold ? (le.duration_sec || 30) : (le.reps || 10);
      const setCount = le.sets || 3;
      const sets = [];
      for (let s = 1; s <= setCount; s++) {
        sets.push({
          set_num: s,
          target_val: targetVal,
          actual_val: isHold ? 0 : targetVal,
          completed: false,
          weight_kg: null,
          rpe: null,
          completed_at: null,
          client_uuid: newUUID(),
        });
      }
      return {
        id: le.id,
        exercise_id: le.exercise_id,
        exercise_name: le.exercise_name || ex?.name || 'Exercise',
        exercise_type: isHold ? 'duration' : 'reps',
        tempo: le.tempo,
        rest_sec: le.rest_sec || 90,
        superset_group: le.superset_group,
        notes: le.notes,
        sets,
      };
    }),
  };

  saveActiveSession(session);
  startWorkoutDurationTimer();
  openWorkoutView();
}

// Fallback compatibility wrapper for any legacy calls
async function startWorkoutSession(routineName, levelNum = 1) {
  const matchingWorkout = state.workouts.find(w => w.name.toLowerCase() === routineName.toLowerCase());
  if (matchingWorkout) {
    return startWorkoutFromId(matchingWorkout.id);
  }

  let exercises = [];
  try {
    const levels = await api('GET', `/routines/${encodeURIComponent(routineName)}/levels`);
    const lvl = levels.find(l => l.level === levelNum) || levels[0];
    if (lvl) exercises = lvl.exercises;
  } catch (e) {
    // fallback
  }

  if (exercises.length) {
    startWorkoutFromData(routineName, exercises);
    return;
  }

  const exList = state.exercises.filter(e => e.day === routineName);
  if (exList.length) {
    startWorkoutFromData(routineName, exList.map((e, i) => ({
      exercise_id: e.id,
      exercise_name: e.name,
      exercise_type: e.type,
      sets: 3,
      reps: e.type === 'reps' ? 10 : null,
      duration_sec: e.type === 'duration' ? 30 : null,
      rest_sec: 90
    })));
    return;
  }

  showToast(`Could not launch ${routineName}`, true);
}

function openWorkoutView() {
  state.view = 'workout';
  window.location.hash = 'workout';
  const session = getActiveSession();
  if (session && session.status === 'in_progress') {
    startWorkoutDurationTimer();
  }
  render();
}

function pauseWorkoutSession() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'active')) return;
  session.status = 'paused';
  session.pausedAt = Date.now();
  if (_workoutHoldInterval) {
    stopWorkoutHold(false);
  }
  if (_workoutRestInterval) {
    stopWorkoutRest();
  }
  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }
  saveActiveSession(session);
  showToast('Workout Paused ⏸');
  render();
}

function resumeWorkoutSession() {
  const session = getActiveSession();
  if (!session || session.status !== 'paused') return;
  const pausedMs = session.pausedAt ? (Date.now() - session.pausedAt) : 0;
  session.totalPausedMs = (session.totalPausedMs || 0) + pausedMs;
  session.status = 'in_progress';
  session.pausedAt = null;
  saveActiveSession(session);
  startWorkoutDurationTimer();
  showToast('Workout Resumed ▶');
  render();
}

let _workoutTimerInterval = null;
function startWorkoutDurationTimer() {
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = setInterval(() => {
    if (state.view === 'workout') {
      const timerEl = document.getElementById('workout-elapsed-time');
      const session = getActiveSession();
      if (timerEl && session && session.startTime && session.status !== 'paused') {
        timerEl.textContent = fmtSecs(getSessionElapsedSec(session));
      }
    }
  }, 1000);
}

// ─── Workout Hold & Rest Timer Management ────────────────────────────────────

let _workoutHoldInterval = null;
let _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };

let _workoutRestInterval = null;
let _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };

function getNextSetDescription(session, exIdx, setIdx) {
  if (!session || !session.exercises) return '';
  const currentEx = session.exercises[exIdx];
  if (currentEx && setIdx + 1 < currentEx.sets.length) {
    return `Next: Set ${setIdx + 2} · ${currentEx.exercise_name}`;
  } else if (session.exercises[exIdx + 1]) {
    const nextEx = session.exercises[exIdx + 1];
    return `Next: Set 1 · ${nextEx.exercise_name}`;
  } else {
    return 'Next: Workout Finish 🏁';
  }
}

function startWorkoutHold(exIdx, setIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;

  // Stop any active rest timer when athlete starts holding
  stopWorkoutRest();

  // If another hold timer was active, stop it cleanly
  if (_workoutHoldInterval) {
    stopWorkoutHold(false);
  }

  _workoutHoldState = {
    exIdx,
    setIdx,
    startedAt: Date.now(),
    elapsed: 0,
  };

  _workoutHoldInterval = setInterval(() => {
    if (!_workoutHoldState.startedAt) return;
    const now = Date.now();
    const elapsed = Math.floor((now - _workoutHoldState.startedAt) / 1000);
    _workoutHoldState.elapsed = elapsed;

    const btn = document.getElementById(`workout-hold-btn-${exIdx}-${setIdx}`);
    const input = document.getElementById(`workout-set-actual-${exIdx}-${setIdx}`);
    if (btn) {
      btn.innerHTML = `⏹ Stop (${fmtSecs(elapsed)})`;
    }
    if (input) {
      input.value = elapsed;
    }
  }, 200);

  render();
}

function stopWorkoutHold(saveAndComplete = true) {
  if (!_workoutHoldInterval && !_workoutHoldState.startedAt) return;

  const { exIdx, setIdx, startedAt } = _workoutHoldState;
  clearInterval(_workoutHoldInterval);
  _workoutHoldInterval = null;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };

  if (saveAndComplete && exIdx !== null && setIdx !== null) {
    const session = getActiveSession();
    if (session && session.exercises[exIdx] && session.exercises[exIdx].sets[setIdx]) {
      const set = session.exercises[exIdx].sets[setIdx];
      // Save actual measured seconds into actual_val
      const finalVal = Math.max(elapsed, 1);
      set.actual_val = finalVal;
      set.completed = true;
      set.completed_at = new Date().toISOString();
      saveActiveSession(session);

      cueHoldSave(); // audio/vibration feedback
      checkAndCelebratePR(session.exercises[exIdx].exercise_id, finalVal, set.weight_kg);

      // Trigger Rest Countdown
      const restSec = session.exercises[exIdx].rest_sec || 90;
      const nextInfo = getNextSetDescription(session, exIdx, setIdx);
      startWorkoutRest(restSec, nextInfo);
    }
  }

  render();
}

function startWorkoutRest(sec, nextInfo = '') {
  stopWorkoutRest();
  if (!sec || sec <= 0) return;

  _workoutRestState = {
    active: true,
    remaining: sec,
    total: sec,
    nextInfo: nextInfo,
  };

  _workoutRestInterval = setInterval(() => {
    if (!_workoutRestState.active) return;
    _workoutRestState.remaining--;

    // Audible warning tick for last 3 seconds
    if (_workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3) {
      cueTick();
    }

    const timerEl = document.getElementById('workout-rest-timer-val');
    const barEl = document.getElementById('workout-rest-timer-bar');
    if (timerEl) {
      timerEl.textContent = fmtSecs(Math.max(0, _workoutRestState.remaining));
    }
    if (barEl && _workoutRestState.total > 0) {
      const pct = Math.max(0, Math.min(100, (_workoutRestState.remaining / _workoutRestState.total) * 100));
      barEl.style.width = `${pct}%`;
    }

    if (_workoutRestState.remaining <= 0) {
      cueRestEnd();
      stopWorkoutRest();
      showToast('Rest complete! Ready for next set 🔥');
    }
  }, 1000);

  render();
}

function stopWorkoutRest() {
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
  }
  _workoutRestState.active = false;
  render();
}

function adjustWorkoutRest(deltaSec) {
  if (!_workoutRestState.active) return;
  _workoutRestState.remaining = Math.max(0, _workoutRestState.remaining + deltaSec);
  _workoutRestState.total = Math.max(_workoutRestState.total, _workoutRestState.remaining);
  const timerEl = document.getElementById('workout-rest-timer-val');
  if (timerEl) {
    timerEl.textContent = fmtSecs(_workoutRestState.remaining);
  }
  if (_workoutRestState.remaining <= 0) {
    cueRestEnd();
    stopWorkoutRest();
  }
}

function adjustWorkoutSetActual(exIdx, setIdx, delta) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const set = session.exercises[exIdx].sets[setIdx];
  const cur = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
  set.actual_val = Math.max(0, cur + delta);
  saveActiveSession(session);
  render();
}

function updateWorkoutSetActual(exIdx, setIdx, val) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const num = parseInt(val, 10);
  session.exercises[exIdx].sets[setIdx].actual_val = isNaN(num) ? 0 : num;
  saveActiveSession(session);
}

function updateWorkoutSetWeight(exIdx, setIdx, val) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const num = parseFloat(val);
  session.exercises[exIdx].sets[setIdx].weight_kg = isNaN(num) || num <= 0 ? null : num;
  saveActiveSession(session);
}

function updateWorkoutSetRPE(exIdx, setIdx, val) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const num = parseInt(val, 10);
  session.exercises[exIdx].sets[setIdx].rpe = isNaN(num) || num <= 0 ? null : num;
  saveActiveSession(session);
}

function toggleWorkoutSet(exIdx, setIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const set = session.exercises[exIdx].sets[setIdx];
  set.completed = !set.completed;
  set.completed_at = set.completed ? new Date().toISOString() : null;
  saveActiveSession(session);

  if (set.completed) {
    cueRestEnd(); // audio/vibration feedback
    const actualVal = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
    checkAndCelebratePR(session.exercises[exIdx].exercise_id, actualVal, set.weight_kg);
    // Start Rest Timer for this exercise
    const restSec = session.exercises[exIdx].rest_sec || 90;
    const nextInfo = getNextSetDescription(session, exIdx, setIdx);
    startWorkoutRest(restSec, nextInfo);
  } else {
    stopWorkoutRest();
  }
  render();
}

async function finishWorkoutSession() {
  const session = getActiveSession();
  if (!session) return;

  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
  }

  let totalSets = 0;
  let completedSets = 0;
  let totalReps = 0;
  let totalHoldSec = 0;

  const durationSec = getSessionElapsedSec(session);
  session.endTime = Date.now();
  session.completed_at = new Date().toISOString();
  session.duration_sec = durationSec;
  session.status = 'completed';

  for (const ex of session.exercises) {
    const isHold = ex.exercise_type === 'duration';
    for (const set of ex.sets) {
      totalSets++;
      if (set.completed) {
        completedSets++;
        const actual = (set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '')
          ? Number(set.actual_val)
          : (isHold ? 0 : set.target_val);

        const logPayload = {
          exercise_id: ex.exercise_id,
          timestamp: set.completed_at || session.completed_at,
          session_uuid: session.id,
          client_uuid: set.client_uuid || newUUID(),
        };

        if (isHold) {
          totalHoldSec += actual;
          logPayload.duration_sec = actual;
        } else {
          totalReps += actual;
          logPayload.reps = actual;
        }

        if (set.weight_kg != null && set.weight_kg !== '') logPayload.weight_kg = Number(set.weight_kg);
        if (set.rpe != null && set.rpe !== '') logPayload.rpe = Number(set.rpe);

        lsWriteLog(logPayload);
      }
    }
  }

  session.total_sets = totalSets;
  session.completed_sets = completedSets;

  // 1. Post to backend /workout_sessions endpoint (with local outbox safety)
  try {
    await api('POST', '/workout_sessions', session);
  } catch (e) {
    console.warn('Direct session sync failed, queued locally:', e);
    localStorage.setItem(`${LS_SESSION_PREFIX}${session.id}`, JSON.stringify(session));
  }

  // 2. Trigger background sync loop for individual logs and pending sessions
  lsSyncPending();
  saveActiveSession(null);

  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }

  showToast(`Workout Complete! 🏆 ${completedSets}/${totalSets} sets done (${Math.round(durationSec / 60)}m)`);
  state.view = 'dashboard';
  window.location.hash = 'dashboard';
  await loadDashboardSummary();
  render();
}

function cancelWorkoutSession() {
  if (confirm("Are you sure you want to discard this workout session?")) {
    if (_workoutHoldInterval) {
      clearInterval(_workoutHoldInterval);
      _workoutHoldInterval = null;
      _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };
    }
    if (_workoutRestInterval) {
      clearInterval(_workoutRestInterval);
      _workoutRestInterval = null;
      _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
    }
    saveActiveSession(null);
    if (_workoutTimerInterval) {
      clearInterval(_workoutTimerInterval);
      _workoutTimerInterval = null;
    }
    showToast("Workout cancelled");
    state.view = 'dashboard';
    window.location.hash = 'dashboard';
    render();
  }
}

async function promoteProgression(exerciseId, nextId) {
  if (!confirm('Advance this exercise to the next progression tier in your routine levels?')) return;
  const leRows = state.levelExercises.filter(le => le.exercise_id === exerciseId);
  try {
    for (const le of leRows) {
      await api('PUT', `/level_exercises/${le.id}`, { exercise_id: nextId });
    }
    await loadLevel();
    await loadExercises();
    showToast('Progression advanced in Routine! 🚀');
    render();
  } catch (e) {
    showToast(`Promotion error: ${e.message}`, true);
  }
}

// ─── Phase: Athlete-First Workout Runner (Priority P0) ──────────────────────

function renderActiveWorkoutView() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) {
    const todayWorkout = state.todayResolved?.workout;
    return `
      <div class="runner-screen">
        <div class="view-header" style="margin-bottom:16px;">
          <h1 class="view-title">Active Workout Runner</h1>
          <p class="view-subtitle">Live athlete-first set tracker with rest timer and audio cues.</p>
        </div>
        <div class="card" style="padding:48px 24px; text-align:center;">
          <span style="font-size:36px; display:block; margin-bottom:12px;">⚡</span>
          <h3 style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:6px;">No workout running right now</h3>
          <p style="color:var(--text-muted); font-size:13px; max-width:380px; margin:0 auto 20px;">
            ${todayWorkout ? `Today's scheduled workout is <strong>${todayWorkout.name}</strong>.` : 'Start a training session from your weekly split.'}
          </p>
          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="startWorkoutFromResolved()">⚡ Start Today's Workout ➔</button>
            <button class="btn btn-secondary" onclick="switchView('split')">📅 View My Split</button>
          </div>
        </div>
      </div>`;
  }

  const isPaused = session.status === 'paused';
  let totalSets = 0;
  let completedSets = 0;

  session.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      totalSets++;
      if (s.completed) completedSets++;
    });
  });

  const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const elapsedSec = getSessionElapsedSec(session);

  // Find active exercise and active set (first uncompleted set)
  let activeExIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));
  if (activeExIdx === -1) activeExIdx = session.exercises.length - 1;

  const activeEx = session.exercises[activeExIdx] || session.exercises[0];
  let activeSetIdx = activeEx.sets.findIndex(s => !s.completed);
  if (activeSetIdx === -1) activeSetIdx = activeEx.sets.length - 1;

  const activeSet = activeEx.sets[activeSetIdx] || activeEx.sets[0];
  const isHold = activeEx.exercise_type === 'duration';

  // Benchmark values
  const targetVal = activeSet.target_val;
  const targetDesc = isHold ? `${targetVal}s hold` : `${targetVal} reps`;

  // Previous performance lookup from state.todayLogs or previous session
  const lastLog = state.todayLogs[activeEx.exercise_id];
  let lastPerfDesc = '—';
  if (lastLog) {
    lastPerfDesc = isHold ? `${lastLog.duration_sec}s` : `${lastLog.reps} reps`;
    if (lastLog.weight_kg) lastPerfDesc += ` (+${lastLog.weight_kg}kg)`;
  }

  const currentActual = Number(activeSet.actual_val !== null && activeSet.actual_val !== undefined && activeSet.actual_val !== ''
    ? activeSet.actual_val
    : (isHold ? 0 : targetVal));

  const isThisHoldRunning = isHold && _workoutHoldState.exIdx === activeExIdx && _workoutHoldState.setIdx === activeSetIdx;

  // Active Set Spotlight Card HTML
  const spotlightCardHtml = `
    <div class="runner-spotlight-card">
      <div class="runner-exercise-header">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="runner-routine-name">${session.routine || session.workout_name || 'Workout'}</span>
            ${activeEx.superset_group ? `<span class="ss-badge">SS${activeEx.superset_group}</span>` : ''}
          </div>
          <h2 class="runner-exercise-name">${activeEx.exercise_name}</h2>
          ${activeEx.tempo ? `<span class="workout-tempo-pill mono" style="margin-top:4px;">Tempo: ${fmtTempo(activeEx.tempo)}</span>` : ''}
        </div>
        <span class="runner-set-badge">SET ${activeSet.set_num} OF ${activeEx.sets.length}</span>
      </div>

      ${activeEx.notes ? `<div class="workout-ex-notes" style="margin-bottom:16px;">💡 ${activeEx.notes}</div>` : ''}

      <div class="runner-benchmarks-row">
        <div class="runner-benchmark-box">
          <span class="runner-benchmark-lbl">Target</span>
          <span class="runner-benchmark-val">${targetDesc}</span>
        </div>
        <div class="runner-benchmark-box">
          <span class="runner-benchmark-lbl">Last Session</span>
          <span class="runner-benchmark-val" style="color:var(--text-muted);">${lastPerfDesc}</span>
        </div>
      </div>

      <!-- Main Input Section -->
      <div class="runner-input-section">
        ${isHold ? `
          <div style="width:100%;">
            ${isThisHoldRunning ? `
              <button class="runner-hold-btn-lg running" onclick="stopWorkoutHold(true)">
                ⏹ Stop Stopwatch (${fmtSecs(_workoutHoldState.elapsed)})
              </button>
            ` : `
              <button class="runner-hold-btn-lg" ${isPaused ? 'disabled' : ''} onclick="startWorkoutHold(${activeExIdx}, ${activeSetIdx})">
                ⏱ Start Hold Stopwatch
              </button>
            `}
            <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:12px;">
              <span style="font-size:12px; color:var(--text-muted);">Manual seconds:</span>
              <div class="runner-stepper-control" style="width:auto;">
                <button class="runner-stepper-btn-lg" style="width:42px; height:42px; font-size:20px;" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, -5)">-5</button>
                <input class="runner-input-lg" style="width:80px; height:42px; font-size:22px;" type="number" min="0" value="${currentActual}" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onchange="updateWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, this.value)">
                <button class="runner-stepper-btn-lg" style="width:42px; height:42px; font-size:20px;" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, 5)">+5</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="runner-stepper-control">
            <button class="runner-stepper-btn-lg" ${isPaused ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, -1)">-</button>
            <input class="runner-input-lg" type="number" min="0" value="${currentActual}" ${isPaused ? 'disabled' : ''} onchange="updateWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, this.value)">
            <button class="runner-stepper-btn-lg" ${isPaused ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, 1)">+</button>
          </div>
        `}
      </div>

      <!-- Dominant Complete CTA -->
      <button class="runner-complete-btn-lg" ${isPaused ? 'disabled' : ''} onclick="toggleWorkoutSet(${activeExIdx}, ${activeSetIdx})">
        ✓ COMPLETE SET ${activeSet.set_num}
      </button>

      <!-- Expandable Secondary Drawer (Weight, RPE, Notes) -->
      <details style="margin-top:16px;">
        <summary class="runner-drawer-toggle">
          <span>⚙ Optional Details (+Kg, RPE, Notes)</span>
        </summary>
        <div class="runner-drawer-content">
          <div class="form-group">
            <label class="form-label">Added Load (+kg)</label>
            <input class="form-input mono" type="number" min="0" step="0.5" placeholder="e.g. 5" value="${activeSet.weight_kg || ''}" onchange="updateWorkoutSetWeight(${activeExIdx}, ${activeSetIdx}, this.value)">
          </div>

          <div class="form-group">
            <label class="form-label">RPE (1–10 Effort)</label>
            <select class="form-input form-select mono" onchange="updateWorkoutSetRPE(${activeExIdx}, ${activeSetIdx}, this.value)">
              <option value="">RPE (Optional)</option>
              <option value="6" ${activeSet.rpe == 6 ? 'selected' : ''}>6 (~4 reps reserve)</option>
              <option value="7" ${activeSet.rpe == 7 ? 'selected' : ''}>7 (~3 reps reserve)</option>
              <option value="8" ${activeSet.rpe == 8 ? 'selected' : ''}>8 (~2 reps reserve)</option>
              <option value="9" ${activeSet.rpe == 9 ? 'selected' : ''}>9 (~1 rep reserve)</option>
              <option value="10" ${activeSet.rpe == 10 ? 'selected' : ''}>10 (Max / Failure)</option>
            </select>
          </div>
        </div>
      </details>
    </div>`;

  // Rest Countdown Box if active
  const restCountdownHtml = _workoutRestState.active ? `
    <div class="runner-rest-box">
      <span class="workout-rest-pill" style="margin-bottom:6px;">⏱ REST TIMER ACTIVE</span>
      <div class="runner-rest-num">${fmtSecs(_workoutRestState.remaining)}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">${_workoutRestState.nextInfo}</div>
      <div style="display:flex; justify-content:center; gap:8px;">
        <button class="workout-rest-adjust-btn" onclick="adjustWorkoutRest(-15)">-15s</button>
        <button class="workout-rest-adjust-btn" onclick="adjustWorkoutRest(15)">+15s</button>
        <button class="workout-skip-rest-btn" onclick="stopWorkoutRest()">Skip Rest ➔</button>
      </div>
    </div>` : '';

  // Compact Overview List of All Exercises in this Session
  const sessionOverviewHtml = session.exercises.map((ex, exIdx) => {
    const isDone = ex.sets.every(s => s.completed);
    const completedCount = ex.sets.filter(s => s.completed).length;
    const isCurrent = exIdx === activeExIdx;

    return `
      <div style="background:var(--surface); border:1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--radius); padding:12px 16px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="mono" style="color:var(--text-muted); font-size:12px;">#${String(exIdx + 1).padStart(2, '0')}</span>
            <strong style="color:var(--text); font-size:14px;">${ex.exercise_name}</strong>
            ${isDone ? '<span class="workout-done-badge">✓ Done</span>' : ''}
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
            ${ex.sets.length} sets × ${ex.sets[0]?.target_val}${ex.exercise_type === 'duration' ? 's hold' : ' reps'}
          </div>
        </div>
        <span class="mono" style="font-size:13px; font-weight:700; color:${isDone ? '#22c55e' : 'var(--text-muted)'};">
          ${completedCount}/${ex.sets.length}
        </span>
      </div>`;
  }).join('');

  return `
    <div class="runner-screen">
      <div class="runner-top-bar">
        <button class="btn btn-secondary btn-sm" onclick="switchView('home')">← Leave</button>
        <div class="runner-timer-pill mono" id="workout-elapsed-time">
          ⏱ ${fmtSecs(elapsedSec)} ${isPaused ? '⏸' : ''}
        </div>
        <div style="display:flex; gap:8px;">
          ${isPaused
            ? `<button class="btn btn-sm btn-primary" onclick="resumeWorkoutSession()">▶ Resume</button>`
            : `<button class="btn btn-sm btn-secondary" onclick="pauseWorkoutSession()">⏸ Pause</button>`
          }
          <button class="btn btn-sm btn-primary" onclick="finishWorkoutSession()">Finish 🏁</button>
        </div>
      </div>

      <div class="runner-progress-bar-wrap">
        <div class="runner-progress-bar-fill" style="width:${pct}%;"></div>
      </div>

      ${restCountdownHtml}
      ${spotlightCardHtml}

      <div style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em;">Session Overview</span>
          <span class="mono" style="font-size:12px; color:var(--text-muted);">${completedSets} of ${totalSets} sets done (${pct}%)</span>
        </div>
        ${sessionOverviewHtml}
      </div>

      <div style="margin-top:20px; display:flex; justify-content:center;">
        <button class="btn-cancel-link" onclick="cancelWorkoutSession()">
          Discard / Cancel Workout
        </button>
      </div>
    </div>`;
}

// ─── Screen 5: Progress & Insights View ─────────────────────────────────────

function renderProgressView() {
  const selectedExId = state.historyExerciseId || (state.exercises[0]?.id ?? null);
  const ex = getExercise(selectedExId);

  const exOptionsHtml = state.exercises.map(e => `
    <option value="${e.id}" ${e.id === selectedExId ? 'selected' : ''}>
      ${e.name} (${e.type === 'duration' ? 'Hold' : 'Reps'})
    </option>
  `).join('');

  const mode = state.historyMetricMode || 'best';
  const points = computeProgress(ex, state.historyLogs || [], mode);
  const stats = computeStats(points);
  const isHold = ex?.type === 'duration';
  const unit = isHold ? 's' : (mode === 'volume' ? ' vol' : ' reps');

  let statCardsHtml = '';
  if (stats) {
    const { current, past, pct } = stats;
    const pctStr = pct !== null ? `${pct >= 0 ? '+' : ''}${pct}%` : '—';

    statCardsHtml = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:20px;">
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Current</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:var(--text); margin-top:2px;">${current}${unit}</div>
        </div>
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">2 Wks Ago</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:var(--text); margin-top:2px;">${past !== null ? past + unit : '—'}</div>
        </div>
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">4-Wk Trend</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:${pct >= 0 ? '#22c55e' : 'var(--text-muted)'}; margin-top:2px;">${pctStr}</div>
        </div>
      </div>`;
  }

  // Natural Language Insight Box
  let insightText = 'Log a few more workouts to unlock explainable performance insights.';
  if (stats && stats.pct !== null) {
    if (stats.pct > 0) {
      insightText = `🔥 Great progress! Your ${mode === 'best' ? 'best performance' : 'training volume'} improved by +${stats.pct}% over the last 2 weeks.`;
    } else if (stats.pct === 0) {
      insightText = `Consistent baseline! Performance is stable across your recorded sessions.`;
    } else {
      insightText = `Volume adjusted down by ${stats.pct}% — recovery is an essential part of supercompensation.`;
    }
  }

  const insightBoxHtml = `
    <div style="background:rgba(124,106,247,0.08); border:1px solid rgba(124,106,247,0.25); border-radius:var(--radius); padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
      <span style="font-size:22px;">💡</span>
      <div style="font-size:13px; color:var(--text);">${insightText}</div>
    </div>`;

  const chartHtml = points.length > 0
    ? `<div class="chart-wrap" style="height:240px;"><canvas id="history-canvas"></canvas></div>`
    : `<div class="empty-state">No workout logs recorded yet for ${ex?.name || 'this exercise'}. Complete a session to see performance trends.</div>`;

  return `
    <div class="progress-screen">
      <div class="view-header">
        <h1 class="view-title">Progress & Insights</h1>
        <p class="view-subtitle">Track progressive overload, performance trends, and personal bests.</p>
      </div>

      <div class="card" style="padding:16px; margin-bottom:20px;">
        <label class="form-label" style="margin-bottom:6px;">Select Exercise to Analyze</label>
        <select class="form-input form-select" onchange="openHistoryView(parseInt(this.value, 10))">
          ${exOptionsHtml}
        </select>
      </div>

      ${insightBoxHtml}
      ${statCardsHtml}

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="justify-content:space-between; align-items:center;">
          <span class="card-title">${ex?.name || 'Movement'} Trend</span>
          <div class="metric-toggle-group">
            <button class="metric-toggle-btn ${mode === 'best' ? 'active' : ''}" onclick="setHistoryMetricMode('best')">
              ${isHold ? 'Best Hold' : 'Best Set'}
            </button>
            <button class="metric-toggle-btn ${mode === 'volume' ? 'active' : ''}" onclick="setHistoryMetricMode('volume')">
              ${isHold ? 'Total Hold' : 'Total Volume'}
            </button>
          </div>
        </div>
        <div class="card-body">
          ${chartHtml}
        </div>
      </div>

      ${renderPersonalRecordsCard(state.dashboardRecords)}
    </div>`;
}

// ─── Main Router & Dispatcher ────────────────────────────────────────────────
function render() {
  const activeView = state.view;

  document.querySelectorAll('.nav-link, .bottom-nav-item, .sidebar-nav-item').forEach(el => {
    const v = el.dataset.view;
    const isActive = (v === activeView) ||
      (v === 'home' && (activeView === 'home' || activeView === 'dashboard')) ||
      (v === 'split' && (activeView === 'split' || activeView === 'routine' || activeView === 'edit')) ||
      (v === 'history_list' && (activeView === 'history_list' || activeView === 'session_detail')) ||
      (v === 'progress' && (activeView === 'progress' || activeView === 'history'));

    el.classList.toggle('active', !!isActive);
  });

  const root = document.getElementById('app-root');
  if (!root) return;

  switch (state.view) {
    case 'home':
    case 'dashboard':
      root.innerHTML = renderHomeView();
      break;
    case 'workout':
      root.innerHTML = renderActiveWorkoutView();
      break;
    case 'split':
    case 'routine':
    case 'edit':
      root.innerHTML = renderSplitView();
      break;
    case 'history_list':
      root.innerHTML = renderHistoryListView();
      break;
    case 'session_detail':
      root.innerHTML = renderSessionDetailView();
      break;
    case 'progress':
    case 'history':
      root.innerHTML = renderProgressView();
      if (window.Chart) buildHistoryChart();
      break;
    case 'log':
      root.innerHTML = renderLogView();
      if (!state.restActive) buildRpeRow();
      break;
    default:
      root.innerHTML = renderHomeView();
  }
}

// ─── Event handlers (global — called from inline html) ─────────────────────

async function onRoutineChange(value) {
  state.routine   = value;
  state.editingId = null;
  await loadLevel();
  render();
}

async function onLevelChange(value) {
  state.level     = parseInt(value, 10);
  state.editingId = null;
  await loadLevel();
  render();
}

function switchView(view) {
  state.view      = view;
  state.editingId = null;
  stopTimer();
  stopRest();
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
  window.location.hash = view;
  if (view === 'dashboard') {
    loadDashboardSummary().then(render);
  }
  render();
}

// Navigate back from log screen; refresh today's last-log values if returning home.
async function goBack() {
  stopRest();
  stopTimer();
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
  // Reset session state so re-opening starts fresh.
  state.sessionSet       = 1;
  state.sessionTotalSets = null;
  state.sessionRestSec   = null;
  const to = state.logReturnView || 'home';
  state.view = to;
  window.location.hash = to;
  if (to === 'home') await loadTodayLogs(); // pull fresh last-log after saving a set
  render();
}

const RPE_DESCRIPTIONS = {
  1: 'Very light recovery (5+ reps in reserve)',
  2: 'Light warmup (5+ reps in reserve)',
  3: 'Light warmup (4+ reps in reserve)',
  4: 'Moderate warmup (4 reps in reserve)',
  5: 'Moderate warmup (3-4 reps in reserve)',
  6: 'Comfortable effort (~4 reps in reserve)',
  7: 'Moderate effort (~3 reps in reserve)',
  8: 'Target Overload zone (~2 reps in reserve)',
  9: 'Heavy effort / Near failure (1 rep in reserve)',
  10: 'Max effort / Absolute technical failure (0 in reserve)'
};

// Build the RPE 1-10 tap buttons after the log form is in the DOM.
function buildRpeRow() {
  const row = document.getElementById('rpe-row');
  const hidden = document.getElementById('rpe-hidden');
  const descEl = document.getElementById('rpe-desc-text');
  if (!row || !hidden) return;
  row.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rpe-btn ${hidden.value == i ? 'rpe-active' : ''}`;
    btn.textContent = i;
    btn.title = RPE_DESCRIPTIONS[i];
    btn.onclick = () => {
      hidden.value = i;
      row.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('rpe-active'));
      btn.classList.add('rpe-active');
      if (descEl) {
        descEl.textContent = `RPE ${i}: ${RPE_DESCRIPTIONS[i]}`;
      }
    };
    row.appendChild(btn);
  }
}

function startEdit(leId) {
  state.editingId = leId;
  render();
}

function cancelEdit() {
  state.editingId = null;
  render();
}

// Updates the reps/duration input in the inline edit row when the user
// changes the exercise (which may have a different type).
function onInlineExerciseChange(sel, leId) {
  const type      = sel.options[sel.selectedIndex]?.dataset.type;
  const container = document.getElementById(`inline-target-${leId}`);
  if (!container) return;
  if (type === 'duration') {
    container.innerHTML = `<input class="form-input mono" type="number" name="duration_sec" min="1" placeholder="Sec">`;
  } else {
    container.innerHTML = `<input class="form-input mono" type="number" name="reps" min="1" placeholder="Reps">`;
  }
}

// Updates the reps/duration field in the add form.
function onAddExerciseChange(sel) {
  const type  = sel.options[sel.selectedIndex]?.dataset.type;
  const label = document.getElementById('add-target-label');
  const input = document.getElementById('add-target-input');
  if (!label || !input) return;
  if (type === 'duration') {
    label.textContent    = 'Duration (sec)';
    input.name           = 'duration_sec';
    input.placeholder    = 'e.g. 30';
  } else {
    label.textContent    = 'Reps';
    input.name           = 'reps';
    input.placeholder    = 'e.g. 8';
  }
}

async function handleAdd(event) {
  event.preventDefault();
  const form    = event.target;
  const payload = formToPayload(form);
  try {
    await addExercise(payload);
    form.reset();
    // Reset type-aware field after clearing form
    const sel = form.querySelector('[name="exercise_id"]');
    if (sel) onAddExerciseChange(sel);
    showToast('Exercise added');
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

async function handleUpdate(event, leId) {
  event.preventDefault();
  const payload = formToPayload(event.target);
  try {
    await updateExercise(leId, payload);
    showToast('Saved');
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

async function handleDelete(leId) {
  try {
    await deleteExercise(leId);
    showToast('Removed');
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

// ─── Data Export (Phase 1 F6) ────────────────────────────────────────────────
async function exportData() {
  try {
    const data = await api('GET', '/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calisthenix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export downloaded ✓');
  } catch (e) {
    showToast(`Export failed: ${e.message}`, true);
  }
}

async function importData(inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const jsonContent = JSON.parse(e.target.result);
      const res = await api('POST', '/import', jsonContent);
      showToast(`Import successful! 📥 ${res.imported_logs || 0} sets & ${res.imported_sessions || 0} sessions restored.`);
      await loadDashboardSummary();
      await loadExercises();
      render();
    } catch (err) {
      showToast(`Import error: ${err.message}`, true);
    } finally {
      inputEl.value = '';
    }
  };
  reader.readAsText(file);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast ${isError ? 'toast-error' : 'toast-success'}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast toast-hidden'; }, 2200);
}

// ─── Hash-based routing ───────────────────────────────────────────────────────
function applyHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (hash === 'settings') {
    openSettingsModal();
    return;
  }
  if (hash.startsWith('log-')) {
    const id = parseInt(hash.replace('log-', ''), 10);
    if (!isNaN(id)) { state.view = 'log'; state.logExerciseId = id; return; }
  }
  if (hash.startsWith('session-')) {
    const sessUuid = hash.replace('session-', '');
    if (sessUuid) {
      openSessionDetailView(sessUuid);
      return;
    }
  }
  if (hash === 'history') {
    state.view = 'history_list';
    loadWorkoutSessions().then(render);
    return;
  }
  if (hash === 'progress') {
    state.view = 'progress';
    return;
  }
  if (hash.startsWith('history-')) {
    const id = parseInt(hash.replace('history-', ''), 10);
    if (!isNaN(id)) {
      state.view = 'progress';
      state.historyExerciseId = id;
      if (state.exercises.length) openHistoryView(id);
      return;
    }
  }
  const validViews = ['home', 'dashboard', 'workout', 'split', 'routine', 'edit', 'log', 'history', 'history_list', 'session_detail', 'progress'];
  state.view = validViews.includes(hash) ? hash : 'home';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  if (state.view === 'home' || state.view === 'dashboard') {
    loadDashboardSummary().then(render);
  }
  render();
});

// Updates the reps/duration field in the custom exercise creation form.
function onCustomTypeChange(sel) {
  const isHold = sel.value === 'duration';
  const label = document.getElementById('custom-prog-target-label');
  const input = document.getElementById('custom-prog-target-input');
  if (!label || !input) return;
  if (isHold) {
    label.innerHTML   = 'Progression Target Hold (sec) <span class="opt">opt</span>';
    input.name        = 'progression_target_duration';
    input.placeholder = 'e.g. 30';
  } else {
    label.innerHTML   = 'Progression Target Reps <span class="opt">opt</span>';
    input.name        = 'progression_target_reps';
    input.placeholder = 'e.g. 15';
  }
}

async function handleCreateCustomExercise(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const type = data.get('type');
  const payload = {
    name: (data.get('name') || '').trim(),
    day:  data.get('day'),
    type: type,
    progression_sessions_needed: parseInt(data.get('progression_sessions_needed'), 10) || 2,
  };
  if (type === 'duration') {
    const dur = parseInt(data.get('progression_target_duration'), 10);
    if (!isNaN(dur)) payload.progression_target_duration = dur;
  } else {
    const reps = parseInt(data.get('progression_target_reps'), 10);
    if (!isNaN(reps)) payload.progression_target_reps = reps;
  }

  try {
    const newEx = await api('POST', '/exercises', payload);
    await loadExercises();
    showToast(`Created "${newEx.name}" ✓`);
    form.reset();
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  applyHash();
  startSyncLoop();
  getActiveSession();
  if (state.view === 'workout') startWorkoutDurationTimer();

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  try {
    await loadExercises();
    await Promise.all([
      loadTodayLogs(),
      loadLevel(),
      loadDashboardSummary(),
      loadTodayResolved(),
      loadSplits(),
      loadWorkouts()
    ]);
    render();
  } catch (e) {
    document.getElementById('app-root').innerHTML = `
      <div class="error-banner">
        ⚠ Could not reach the backend at <code>${API_BASE}</code>.<br>
        Start Flask first: <code>cd backend &amp;&amp; python app.py</code>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
