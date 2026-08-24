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
  logTimer:        null,     // { startedAt: ms, intervalId } | null
  logElapsed:      0,        // seconds displayed on timer
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

// Push all unsynced entries to POST /logs. On success, mark each synced.
async function lsSyncPending() {
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

// Schedule background sync: on load, on tab focus, every 30 s.
function startSyncLoop() {
  lsSyncPending();
  window.addEventListener('focus', lsSyncPending);
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
    state.dashboardSummary = await api('GET', '/dashboard/summary');
  } catch (e) {
    state.dashboardSummary = { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
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
function computeProgress(ex, logs) {
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
        // Best (max) hold duration in the session, in seconds.
        metric = Math.max(...dayLogs.map(l => l.duration_sec ?? 0));
      } else {
        // Estimated volume: sum of reps × weight_kg across all sets.
        // For bodyweight sets (weight_kg null/0) use reps as a relative signal.
        metric = dayLogs.reduce((sum, l) => {
          const vol = l.weight_kg ? (l.reps || 0) * l.weight_kg : (l.reps || 0);
          return sum + vol;
        }, 0);
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
    </div>`;
}

// ─── Today's Routine view rendering ──────────────────────────────────────────

// Returns true if this exercise has been marked complete for today.
function isExerciseDone(exerciseId) {
  return localStorage.getItem(`cx_done_${exerciseId}_${todayISO()}`) === '1';
}

// Mark an exercise complete for today (keyed by exercise_id + date).
function markExerciseDone(exerciseId) {
  localStorage.setItem(`cx_done_${exerciseId}_${todayISO()}`, '1');
}

function renderTodayRow(le, idx) {
  const ex   = getExercise(le.exercise_id);
  const done = isExerciseDone(le.exercise_id);
  // Pass the whole le object as JSON so openLogView gets sets/rest_sec.
  const leJson = JSON.stringify(le).replace(/'/g, "\\'");

  if (done) {
    // Completed: non-interactive, shows checkmark.
    return `
      <div class="today-ex-row today-ex-done">
        <span class="today-order mono">${String(idx).padStart(2,'0')}</span>
        <span class="today-name today-name-done">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)}</span>
        <span class="today-sets mono">${le.sets}</span>
        <span class="today-target mono">${fmtTarget(le)}</span>
        <span class="today-tempo mono">${fmtTempo(le.tempo)}</span>
        <span class="today-done-check">✓</span>
      </div>`;
  }

  return `
    <div class="today-ex-row today-ex-clickable" role="button" tabindex="0"
         onclick="openLogViewFromRoutine(${le.exercise_id})"
         onkeydown="if(event.key==='Enter')openLogViewFromRoutine(${le.exercise_id})">
      <span class="today-order mono">${String(idx).padStart(2,'0')}</span>
      <span class="today-name">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)}</span>
      <span class="today-sets mono">${le.sets}</span>
      <span class="today-target mono">${fmtTarget(le)}</span>
      <span class="today-tempo mono">${fmtTempo(le.tempo)}</span>
      <span class="today-rest mono">${fmtRest(le.rest_sec)} <span class="log-arrow">→</span></span>
    </div>`;
}

// Called from Today's Routine rows — looks up the le from state.levelExercises
// so openLogView gets the sets/rest_sec context without needing to serialize to HTML.
function openLogViewFromRoutine(exerciseId) {
  const le = state.levelExercises.find(e => e.exercise_id === exerciseId) || null;
  openLogView(exerciseId, 'routine', le);
}

function renderTodayView() {
  const groups = groupExercises(state.levelExercises);
  let idx = 1;

  const bodyHtml = groups.length === 0
    ? `<div class="empty-state">
         Nothing here yet.
         <a href="#edit" onclick="switchView('edit')">Add exercises →</a>
       </div>`
    : groups.map(g => {
        if (g.type === 'standalone') {
          return `<div class="today-block">${renderTodayRow(g.exercise, idx++)}</div>`;
        }
        const rows = g.exercises.map(ex => renderTodayRow(ex, idx++)).join('');
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
      <h1 class="view-title">Today's Routine</h1>
      <p class="view-subtitle">Read-only. Exercises sharing a superset group are bracketed together.</p>
    </div>
    ${renderSelectors()}

    <div class="card">
      <div class="card-header">
        <span class="card-title">${state.routine} · Level ${state.level}</span>
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
    : `<div class="dashboard-today-card">
        <a href="#home" class="dashboard-today-link" onclick="switchView('home')">
          <div class="dashboard-today-info">
            <span class="dashboard-today-tag">Today's Split</span>
            <span class="dashboard-today-name">${day}</span>
            <span class="dashboard-today-date">${label}</span>
          </div>
          <span class="dashboard-today-action">Start Workout →</span>
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

      ${todayCard}

      <div class="dashboard-footer-actions">
        <button class="btn-export-backup" onclick="exportData()">
          <span>💾</span> Export All Logs (JSON)
        </button>
      </div>
    </div>`;
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
      <div class="home-header">
        <h1 class="home-day-name">${day}</h1>
        <span class="home-date">${getTodayLabel()}</span>
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

// Navigate to history for a specific exercise; fetch logs then render.
function openHistoryView(exerciseId) {
  state.historyExerciseId = exerciseId;
  state.historyLogs       = null; // null = loading
  state.view              = 'history';
  window.location.hash    = `history-${exerciseId}`;
  render(); // show skeleton immediately
  api('GET', `/exercises/${exerciseId}/logs`)
    .then(logs => { state.historyLogs = logs; render(); })
    .catch(()  => { state.historyLogs = [];   render(); });
}

function goBackFromHistory() {
  // Return to the log screen for the same exercise so the user can keep logging.
  state.view = 'log';
  window.location.hash = `log-${state.historyExerciseId}`;
  render();
}

// ── Chart.js chart ────────────────────────────────────────────────────────────
let _chartInstance = null;

function buildHistoryChart() {
  const canvas = document.getElementById('history-canvas');
  if (!canvas || !window.Chart) return;

  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

  const ex     = getExercise(state.historyExerciseId);
  const points = computeProgress(ex, state.historyLogs || []);
  if (!points.length) return;

  const unit = ex?.type === 'duration' ? 's' : '';

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

  const points = computeProgress(ex, state.historyLogs);
  const stats  = computeStats(points);
  const unit   = ex?.type === 'duration' ? 's' : '';

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
        <span class="history-metric-label">${ex?.type === 'duration' ? 'Best hold / session' : 'Est. volume / session'}</span>
      </div>
      ${statHtml}
      ${bodyHtml}
    </div>`;
}



// ─── Main render ─────────────────────────────────────────────────────────────
function render() {
  // Sync active nav link (log view has no tab)
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.view === state.view)
  );

  const root = document.getElementById('app-root');
  switch (state.view) {
    case 'dashboard': root.innerHTML = renderDashboardView(); break;
    case 'home':      root.innerHTML = renderHomeView();      break;
    case 'routine':   root.innerHTML = renderTodayView();     break;
    case 'edit':      root.innerHTML = renderEditView();      break;
    case 'log':       root.innerHTML = renderLogView();       break;
    case 'history':   root.innerHTML = renderHistoryView();   break;
    default:          root.innerHTML = renderDashboardView();
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

// Build the RPE 1-10 tap buttons after the log form is in the DOM.
function buildRpeRow() {
  const row    = document.getElementById('rpe-row');
  const hidden = document.getElementById('rpe-hidden');
  if (!row || !hidden) return;
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'rpe-btn';
    btn.textContent = i;
    btn.onclick = () => {
      hidden.value = i;
      row.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('rpe-active'));
      btn.classList.add('rpe-active');
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
  const validViews = ['dashboard', 'home', 'routine', 'edit', 'log', 'history'];
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

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  applyHash();
  startSyncLoop();
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
