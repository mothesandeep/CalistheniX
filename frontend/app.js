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

// Push all unsynced entries to POST /logs and POST /workout_sessions.
async function lsSyncPending() {
  // 1. Sync pending workout sessions
  const sessionKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_SESSION_PREFIX));
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
  const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
  for (const key of keys) {
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

function renderEditView() {
  const hasRows = state.levelExercises.length > 0;

  return `
    <div class="view-header">
      <h1 class="view-title">Edit Routine Levels</h1>
      <p class="view-subtitle">Add exercises from your program. No values are pre-filled — enter exactly what your book says.</p>
    </div>
    ${renderSelectors()}

    <div class="card">
      <div class="card-header">
        <span class="card-title">${state.routine} · Level ${state.level}</span>
        <span class="card-count">${state.levelExercises.length} exercise${state.levelExercises.length !== 1 ? 's' : ''}</span>
      </div>
      ${hasRows ? `
        <div class="ex-list-header">
          <span>#</span><span>Exercise</span><span>Sets × Target</span>
          <span>Tempo</span><span>Rest</span><span></span>
        </div>` : ''}
      <div id="ex-list">
        ${hasRows
          ? state.levelExercises.map(renderExerciseRow).join('')
          : '<div class="empty-state">No exercises yet — add one below.</div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Add Exercise</span>
      </div>
      <div class="card-body">
        ${renderAddForm()}
      </div>
    </div>

    ${renderCustomExerciseCard()}`;
}

// ─── Today's Routine view rendering ──────────────────────────────────────────

// ─── Phase 2: Today (Execution Entry Point) ──────────────────────────────────

function renderTodayView() {
  const day = getTodayDay();
  const label = getTodayLabel();
  const isRest = (day === 'Rest');

  const active = getActiveSession();
  const isThisActive = active && (active.status === 'in_progress' || active.status === 'paused');

  if (isRest) {
    return `
      <div class="today-screen">
        <div class="today-hero-card" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border-color: rgba(34, 197, 94, 0.25);">
          <div class="today-hero-header">
            <div>
              <span class="today-hero-tag" style="color:var(--success);">REST & RECOVERY</span>
              <h1 class="today-hero-title">Rest Day</h1>
            </div>
            <span class="today-status-badge today-status-done">✓ Scheduled Rest</span>
          </div>
          <p style="color:var(--text-muted); font-size:14px; margin:0;">
            Muscles grow and recover during rest. Hydrate well, stretch, and get adequate sleep.
          </p>
          <div class="today-hero-metrics">
            <div class="today-metric-pill"><span>Split:</span> <span class="today-metric-val">7-Day Rolling Cycle</span></div>
            <div class="today-metric-pill"><span>Focus:</span> <span class="today-metric-val">Recovery & Mobility</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Looking to Train Ahead?</span>
          </div>
          <div class="card-body">
            <p style="color:var(--text-muted); font-size:13px; margin-bottom:16px;">
              You can start tomorrow's <strong>Push A</strong> workout today or preview your full program.
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="startWorkoutSession('Push A', 1)">Start Push A Workout ➔</button>
              <button class="btn btn-secondary" onclick="switchView('routine')">View Routine Splits ➔</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // Active workout status
  let statusBadgeHtml = `<span class="today-status-badge today-status-ready">Ready to Train</span>`;
  let heroBtnHtml = `<button class="btn btn-primary btn-lg" onclick="startWorkoutSession('${day}', 1)">⚡ Start Today's Workout ➔</button>`;

  if (isThisActive) {
    if (active.status === 'paused') {
      statusBadgeHtml = `<span class="today-status-badge today-status-active">⏸ Workout Paused</span>`;
      heroBtnHtml = `<button class="btn btn-primary btn-lg" onclick="openWorkoutView()">▶ Resume Workout ➔</button>`;
    } else {
      statusBadgeHtml = `<span class="today-status-badge today-status-active">⚡ Workout in Progress</span>`;
      heroBtnHtml = `<button class="btn btn-primary btn-lg" onclick="openWorkoutView()">⚡ Continue Workout ➔</button>`;
    }
  }

  // Filter exercises for today's routine split
  const dayExercises = state.exercises.filter(e => e.day === day);
  const totalSets = dayExercises.length * 3; // Standard baseline estimation
  const estDurationMin = Math.round((totalSets * 90) / 60);

  const previewCardsHtml = dayExercises.length === 0
    ? `<div class="empty-state">No exercises configured for ${day}. <a href="#routine" onclick="switchView('routine')">Configure in Routine →</a></div>`
    : dayExercises.map((ex, i) => {
        const isHold = ex.type === 'duration';
        const targetDesc = isHold
          ? (ex.progression_target_duration ? `${ex.progression_target_duration}s hold` : '30s hold')
          : (ex.progression_target_reps ? `${ex.progression_target_reps} reps` : '10-12 reps');

        return `
          <div class="today-ex-preview-card">
            <div class="today-ex-info">
              <span class="today-ex-title">
                <span class="mono" style="color:var(--text-muted); font-size:12px;">#${String(i + 1).padStart(2, '0')}</span>
                ${ex.name} ${badge(ex.type)}
              </span>
              <span class="today-ex-meta">Target: 3-4 sets × ${targetDesc} · Rest 90s</span>
            </div>
            <span class="mono" style="font-size:12px; color:var(--text-muted);">Standard</span>
          </div>`;
      }).join('');

  return `
    <div class="today-screen">
      <div class="today-hero-card">
        <div class="today-hero-header">
          <div>
            <span class="today-hero-tag">TODAY'S SCHEDULED WORKOUT</span>
            <h1 class="today-hero-title">${day}</h1>
            <p style="color:var(--text-muted); font-size:13px; margin:4px 0 0 0;">${label}</p>
          </div>
          ${statusBadgeHtml}
        </div>

        <div class="today-hero-metrics">
          <div class="today-metric-pill"><span>Exercises:</span> <span class="today-metric-val">${dayExercises.length}</span></div>
          <div class="today-metric-pill"><span>Total Sets:</span> <span class="today-metric-val">~${totalSets}</span></div>
          <div class="today-metric-pill"><span>Est. Duration:</span> <span class="today-metric-val">~${estDurationMin} min</span></div>
        </div>

        <div style="margin-top:4px;">
          ${heroBtnHtml}
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="justify-content:space-between; align-items:center;">
          <span class="card-title">Exercise Execution Order</span>
          <a href="#routine" onclick="switchView('routine')" style="font-size:13px; color:var(--accent); text-decoration:none; font-weight:500;">
            Customize in Routine ➔
          </a>
        </div>
        <div class="card-body" style="padding:16px;">
          ${previewCardsHtml}
        </div>
      </div>
    </div>`;
}

// ─── Phase 2: Routine (Program Architecture & Configuration) ─────────────────

function renderRoutineRow(le, idx) {
  const ex = getExercise(le.exercise_id);
  const ssTag = le.superset_group != null ? `<span class="ss-badge">SS${le.superset_group}</span>` : '';

  return `
    <div class="today-ex-row" style="cursor:default;">
      <span class="today-order mono">${String(idx).padStart(2,'0')}</span>
      <span class="today-name">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)} ${ssTag}</span>
      <span class="today-sets mono">${le.sets}</span>
      <span class="today-target mono">${fmtTarget(le)}</span>
      <span class="today-tempo mono">${fmtTempo(le.tempo)}</span>
      <span class="today-rest mono">${fmtRest(le.rest_sec)}</span>
    </div>`;
}

function renderRoutineView() {
  const groups = groupExercises(state.levelExercises);
  let idx = 1;

  const bodyHtml = groups.length === 0
    ? `<div class="empty-state">
         No exercises configured in ${state.routine} Level ${state.level}.
         <a href="#edit" onclick="switchView('edit')">Add exercises in Program Editor →</a>
       </div>`
    : groups.map(g => {
        if (g.type === 'standalone') {
          return `<div class="today-block">${renderRoutineRow(g.exercise, idx++)}</div>`;
        }
        const rows = g.exercises.map(ex => renderRoutineRow(ex, idx++)).join('');
        return `
          <div class="today-block today-superset">
            <div class="superset-header">
              <span class="superset-label">Superset ${g.groupId}</span>
              <span class="superset-note">no rest between exercises</span>
            </div>
            ${rows}
          </div>`;
      }).join('');

  return `
    <div class="view-header">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
        <div>
          <h1 class="view-title">Routine Architecture</h1>
          <p class="view-subtitle">Program configuration: View exercise order, targets, tempo, supersets, and coaching cues for each routine split.</p>
        </div>
        <button class="btn btn-secondary" onclick="switchView('edit')">
          ✎ Edit in Program Editor
        </button>
      </div>
    </div>

    ${renderSelectors()}

    <div class="card">
      <div class="card-header">
        <span class="card-title">${state.routine} · Level ${state.level} Structure</span>
        <span class="card-count">${state.levelExercises.length} exercise${state.levelExercises.length !== 1 ? 's' : ''}</span>
      </div>
      ${state.levelExercises.length > 0 ? `
        <div class="today-header">
          <span>#</span><span>Exercise</span>
          <span>Sets</span><span>Target</span><span>Tempo</span><span>Rest</span>
        </div>` : ''}
      <div class="today-list">${bodyHtml}</div>
    </div>`;
}

// ─── Screen 0: Dashboard view ────────────────────────────────────────────────
function renderDashboardView() {
  const summary = state.dashboardSummary || {
    streak_days: 0,
    week_sessions: 0,
    week_sets: 0,
    top_movers: []
  };

  const day   = getTodayDay();
  const label = getTodayLabel();

  // Dashboard today card: rest day variant
  const isRest = (day === 'Rest');
  const active = getActiveSession();
  const isAnyActive = active && active.status === 'in_progress';

  const todayCard = isRest
    ? `<div class="dashboard-today-card">
        <div class="dashboard-today-link" style="cursor:default;">
          <div class="dashboard-today-info">
            <span class="dashboard-today-tag">Today</span>
            <span class="dashboard-today-name">Rest Day</span>
            <span class="dashboard-today-date">${label}</span>
          </div>
        </div>
      </div>`
    : `<div class="dashboard-today-card ${isAnyActive ? 'dashboard-today-card-active' : ''}">
        <a href="#workout" class="dashboard-today-link" onclick="${isAnyActive ? 'openWorkoutView()' : `startWorkoutSession('${day}', 1)`}; return false;">
          <div class="dashboard-today-info">
            <span class="dashboard-today-tag">${isAnyActive ? '⚡ Active Workout in Progress' : "Today's Split"}</span>
            <span class="dashboard-today-name">${isAnyActive ? `${active.routine} · Level ${active.level}` : day}</span>
            <span class="dashboard-today-date">${label}</span>
          </div>
          <span class="dashboard-today-action">${isAnyActive ? 'Continue Workout ➔' : 'Start Workout ➔'}</span>
        </a>
      </div>`;

  let moversBody = '';
  if (!summary.top_movers || summary.top_movers.length === 0) {
    moversBody = `<p class="dashboard-empty-text">Log a few more sessions to see trends here.</p>`;
  } else {
    moversBody = `
      <div class="mover-list">
        ${summary.top_movers.map(m => `
          <div class="mover-row" onclick="openHistoryView(${m.exercise_id})" role="button" tabindex="0">
            <span class="mover-name">${m.exercise_name}</span>
            <span class="mover-pct mono ${m.pct_change >= 0 ? 'stat-up' : 'stat-neutral'}">
              ${m.pct_change >= 0 ? '+' : ''}${m.pct_change}%
            </span>
          </div>
        `).join('')}
      </div>`;
  }

  return `
    <div class="dashboard-screen">
      <div class="dashboard-streak-card">
        <div class="dashboard-streak-num mono">${summary.streak_days}</div>
        <div class="dashboard-streak-label">day streak</div>
      </div>

      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Week Sessions</span>
          <span class="stat-value mono">${summary.week_sessions}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Week Sets</span>
          <span class="stat-value mono">${summary.week_sets}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Top Movers</span>
        </div>
        <div class="card-body">
          ${moversBody}
        </div>
      </div>

      ${renderPersonalRecordsCard(state.dashboardRecords)}

      ${renderActivityHeatmap(state.dashboardActivity)}

      ${todayCard}

      <div style="margin-top:16px; margin-bottom:16px;">
        <button class="btn btn-secondary" style="width:100%; justify-content:center; padding:14px; font-weight:600;" onclick="openHistoryListView()">
          📖 View Workout History Log ➔
        </button>
      </div>

      <div class="dashboard-footer-actions">
        <button class="btn-export-backup" onclick="exportData()">
          <span>💾</span> Export Backup (JSON)
        </button>
        <label class="btn-export-backup" style="cursor:pointer;">
          <span>📂</span> Restore Backup (JSON)
          <input type="file" accept=".json" style="display:none;" onchange="importData(this)">
        </label>
      </div>
    </div>`;
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

async function startWorkoutSession(routineName, levelNum = 1) {
  const active = getActiveSession();
  if (active && (active.status === 'in_progress' || active.status === 'paused') && active.routine === routineName && active.level === levelNum) {
    openWorkoutView();
    return;
  }

  let exercises = [];
  try {
    const levels = await api('GET', `/routines/${encodeURIComponent(routineName)}/levels`);
    const lvl = levels.find(l => l.level === levelNum) || levels[0];
    if (lvl) exercises = lvl.exercises;
  } catch (e) {
    showToast(`Failed to load routine: ${e.message}`, true);
    return;
  }

  if (!exercises.length) {
    showToast(`No exercises configured in ${routineName} Level ${levelNum}`, true);
    return;
  }

  const session = {
    id: newUUID(),
    date: todayISO(),
    routine: routineName,
    level: levelNum,
    startTime: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    endTime: null,
    status: 'in_progress',
    exercises: exercises.map(le => {
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

function renderActiveWorkoutView() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) {
    return `
      <div class="workout-screen">
        <div class="log-topbar">
          <button class="btn-back" onclick="switchView('dashboard')">← Dashboard</button>
        </div>
        <div class="empty-state" style="padding:48px 0;">
          <p>No active workout session running.</p>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="startWorkoutSession('${getTodayDay() === 'Rest' ? 'Push A' : getTodayDay()}', 1)">Start Today's Workout ➔</button>
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
  const activeExIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));

  const exCardsHtml = session.exercises.map((ex, exIdx) => {
    const isHold = ex.exercise_type === 'duration';
    const isExDone = ex.sets.length > 0 && ex.sets.every(s => s.completed);
    const isCardActive = (exIdx === activeExIdx);
    const ssTag = ex.superset_group ? `<span class="ss-badge">SS${ex.superset_group}</span>` : '';
    const tempoHtml = ex.tempo ? `<span class="workout-tempo-pill mono">Tempo: ${fmtTempo(ex.tempo)}</span>` : '';

    const setRowsHtml = ex.sets.map((set, sIdx) => {
      const isThisHoldRunning = isHold && _workoutHoldState.exIdx === exIdx && _workoutHoldState.setIdx === sIdx;

      let statusBtnHtml = '';
      if (isHold) {
        if (isThisHoldRunning) {
          statusBtnHtml = `
            <button class="workout-hold-btn workout-hold-btn-running"
                    id="workout-hold-btn-${exIdx}-${sIdx}"
                    onclick="stopWorkoutHold(true)">
              ⏹ Stop (${fmtSecs(_workoutHoldState.elapsed)})
            </button>`;
        } else if (set.completed) {
          statusBtnHtml = `
            <button class="workout-check-btn workout-check-btn-done"
                    ${isPaused ? 'disabled style="opacity:0.6;"' : ''}
                    onclick="toggleWorkoutSet(${exIdx}, ${sIdx})">
              ✓ ${set.actual_val}s
            </button>`;
        } else {
          statusBtnHtml = `
            <button class="workout-hold-btn"
                    ${isPaused ? 'disabled style="opacity:0.6;"' : ''}
                    id="workout-hold-btn-${exIdx}-${sIdx}"
                    onclick="startWorkoutHold(${exIdx}, ${sIdx})">
              ⏱ Start Hold
            </button>`;
        }
      } else {
        statusBtnHtml = `
          <button class="workout-check-btn ${set.completed ? 'workout-check-btn-done' : ''}"
                  ${isPaused ? 'disabled style="opacity:0.6;"' : ''}
                  onclick="toggleWorkoutSet(${exIdx}, ${sIdx})">
            ${set.completed ? '✓ Done' : 'Check'}
          </button>`;
      }

      return `
        <div class="workout-set-row ${set.completed ? 'workout-set-row-done' : ''}">
          <span class="workout-set-num mono">Set ${set.set_num}</span>
          <span class="workout-set-target mono">${set.target_val}${isHold ? 's' : 'r'}</span>
          <div class="workout-stepper-wrap">
            <button class="workout-stepper-btn" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${exIdx}, ${sIdx}, -1)">-</button>
            <input class="workout-set-input mono ${set.completed ? 'workout-set-input-done' : ''}" type="number" min="0"
                   id="workout-set-actual-${exIdx}-${sIdx}"
                   ${isPaused ? 'disabled' : ''}
                   value="${set.actual_val !== null && set.actual_val !== undefined ? set.actual_val : ''}"
                   placeholder="${set.target_val}"
                   onchange="updateWorkoutSetActual(${exIdx}, ${sIdx}, this.value)">
            <button class="workout-stepper-btn" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${exIdx}, ${sIdx}, 1)">+</button>
          </div>
          <div class="workout-set-input-wrap">
            <input class="workout-set-input mono" type="number" min="0" step="0.5"
                   ${isPaused ? 'disabled' : ''}
                   value="${set.weight_kg != null ? set.weight_kg : ''}"
                   placeholder="kg"
                   onchange="updateWorkoutSetWeight(${exIdx}, ${sIdx}, this.value)" style="width:50px;">
          </div>
          <div class="workout-set-input-wrap">
            <select class="workout-set-input mono"
                    ${isPaused ? 'disabled' : ''}
                    onchange="updateWorkoutSetRPE(${exIdx}, ${sIdx}, this.value)"
                    style="width:60px; padding:4px 2px; font-size:11px;"
                    title="RPE (Rate of Perceived Exertion)">
              <option value="">RPE</option>
              <option value="6" ${set.rpe == 6 ? 'selected' : ''}>6</option>
              <option value="7" ${set.rpe == 7 ? 'selected' : ''}>7</option>
              <option value="8" ${set.rpe == 8 ? 'selected' : ''}>8</option>
              <option value="9" ${set.rpe == 9 ? 'selected' : ''}>9</option>
              <option value="10" ${set.rpe == 10 ? 'selected' : ''}>10</option>
            </select>
          </div>
          ${statusBtnHtml}
        </div>`;
    }).join('');

    return `
      <div class="workout-ex-card ${isExDone ? 'workout-ex-card-done' : (isCardActive ? 'workout-ex-card-active' : '')}">
        <div class="workout-ex-header">
          <div class="workout-ex-title-wrap">
            <h2 class="workout-ex-name">
              ${ex.exercise_name} ${badge(ex.exercise_type)} ${ssTag}
              ${isCardActive && !isExDone ? '<span class="workout-active-badge">⚡ Focus</span>' : ''}
            </h2>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
              <span class="workout-ex-target-label mono">Target: ${ex.sets.length} × ${ex.sets[0]?.target_val}${isHold ? 's' : ' reps'}</span>
              ${tempoHtml}
            </div>
          </div>
          ${isExDone ? `<span class="workout-done-badge">✓ Done</span>` : ''}
        </div>
        ${ex.notes ? `<div class="workout-ex-notes">${ex.notes}</div>` : ''}
        <div class="workout-sets-header">
          <span>Set</span><span>Target</span><span>Actual</span><span>+Kg</span><span>RPE</span><span>Status</span>
        </div>
        <div class="workout-sets-list">
          ${setRowsHtml}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="workout-screen">
      <div class="workout-topbar">
        <button class="btn-back" onclick="switchView('dashboard')">← Leave</button>
        <div class="workout-timer-badge mono" id="workout-elapsed-time">
          ${fmtSecs(elapsedSec)} ${isPaused ? '⏸' : ''}
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${isPaused
            ? `<button class="btn btn-sm btn-primary" onclick="resumeWorkoutSession()">▶ Resume</button>`
            : `<button class="btn btn-sm" style="background:var(--surface-2); border:1px solid var(--border);" onclick="pauseWorkoutSession()">⏸ Pause</button>`
          }
          <button class="btn btn-sm btn-primary" onclick="finishWorkoutSession()">Finish 🏁</button>
        </div>
      </div>

      ${isPaused ? `
        <div class="workout-paused-banner">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">⏸</span>
            <div>
              <strong style="color:var(--text);">Workout is currently paused</strong>
              <div style="font-size:12px; color:var(--text-muted);">Elapsed timer is halted. Tap resume to continue logging.</div>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="resumeWorkoutSession()">▶ Resume Workout</button>
        </div>
      ` : ''}

      <div class="workout-header">
        <span class="workout-routine-tag">${session.routine} · Level ${session.level}</span>
        <h1 class="workout-title">Active Session</h1>
      </div>

      <div class="workout-progress-wrap">
        <div class="workout-progress-text">
          <span class="mono">${completedSets} / ${totalSets} Sets Completed</span>
          <span class="mono">${pct}%</span>
        </div>
        <div class="workout-progress-bar">
          <div class="workout-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>

      <div class="workout-exercises-list">
        ${exCardsHtml}
      </div>

      ${_workoutRestState.active ? `
        <div class="workout-rest-banner" id="workout-rest-banner">
          <div class="workout-rest-header">
            <div class="workout-rest-title-wrap">
              <span class="workout-rest-pill">⏱ REST TIMER</span>
              <span class="workout-rest-next">${_workoutRestState.nextInfo}</span>
            </div>
            <button class="workout-rest-close-btn" onclick="stopWorkoutRest()" title="Dismiss Rest">✕</button>
          </div>
          <div class="workout-rest-body">
            <div class="workout-rest-time mono" id="workout-rest-timer-val">${fmtSecs(_workoutRestState.remaining)}</div>
            <div class="workout-rest-controls">
              <button class="workout-rest-adjust-btn" onclick="adjustWorkoutRest(-15)">-15s</button>
              <button class="workout-rest-adjust-btn" onclick="adjustWorkoutRest(15)">+15s</button>
              <button class="workout-skip-rest-btn" onclick="stopWorkoutRest()">Skip Rest ➔</button>
            </div>
          </div>
          <div class="workout-rest-progress">
            <div class="workout-rest-fill" id="workout-rest-timer-bar" style="width: ${_workoutRestState.total > 0 ? Math.max(0, Math.min(100, (_workoutRestState.remaining / _workoutRestState.total) * 100)) : 0}%;"></div>
          </div>
        </div>
      ` : ''}

      <div class="workout-bottom-actions">
        <button class="btn btn-save" style="width:100%; justify-content:center; padding:16px; font-size:16px;" onclick="finishWorkoutSession()">
          Finish Workout 🏁
        </button>
        <button class="btn-cancel-link" onclick="cancelWorkoutSession()">
          Discard / Cancel Workout
        </button>
      </div>
    </div>`;
}

// ─── Main render ─────────────────────────────────────────────────────────────
function render() {
  // Sync active nav link (log view has no tab)
  document.querySelectorAll('.nav-link').forEach(a => {
    const v = a.dataset.view;
    const isActive = v === state.view ||
      (v === 'history_list' && (state.view === 'history_list' || state.view === 'session_detail' || state.view === 'history'));
    a.classList.toggle('active', isActive);
  });

  const root = document.getElementById('app-root');
  switch (state.view) {
    case 'dashboard':      root.innerHTML = renderDashboardView();     break;
    case 'home':           root.innerHTML = renderTodayView();         break;
    case 'routine':        root.innerHTML = renderRoutineView();       break;
    case 'edit':           root.innerHTML = renderEditView();          break;
    case 'log':            root.innerHTML = renderLogView();           break;
    case 'history':        root.innerHTML = renderHistoryView();       break;
    case 'history_list':   root.innerHTML = renderHistoryListView();   break;
    case 'session_detail': root.innerHTML = renderSessionDetailView(); break;
    case 'workout':        root.innerHTML = renderActiveWorkoutView();  break;
    default:               root.innerHTML = renderDashboardView();
  }
  if (state.view === 'log' && !state.restActive) buildRpeRow();
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
  const hash = window.location.hash.replace('#', '') || 'dashboard';
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
  if (hash.startsWith('history-')) {
    const id = parseInt(hash.replace('history-', ''), 10);
    if (!isNaN(id)) {
      state.view = 'history';
      state.historyExerciseId = id;
      // Logs are fetched lazily in openHistoryView; if landing directly via
      // hash, trigger the fetch here so the chart populates.
      if (state.exercises.length) openHistoryView(id);
      return;
    }
  }
  const validViews = ['dashboard', 'home', 'routine', 'edit', 'log', 'history', 'history_list', 'session_detail', 'workout'];
  state.view = validViews.includes(hash) ? hash : 'dashboard';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  if (state.view === 'dashboard') {
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
    await Promise.all([ loadTodayLogs(), loadLevel(), loadDashboardSummary() ]);
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
