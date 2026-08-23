/* ============================================================
   app.js — CalistheniX Routine Builder
   Views: edit | today | log
   All functions in global scope for inline event handlers.
   ============================================================ */

const API_BASE = 'http://127.0.0.1:5001';

const ROUTINES = ['Push', 'Pull', 'Legs', 'Full Body', 'Active Recovery'];
const LEVELS   = [1, 2, 3, 4, 5];

// ─── Application state ───────────────────────────────────────────────────────
const state = {
  view:            'edit',   // 'edit' | 'today' | 'log'
  routine:         'Push',
  level:           1,
  exercises:       [],       // all exercises from GET /exercises
  levelId:         null,     // current routine_level.id (null = not yet created)
  levelExercises:  [],       // level_exercises joined with exercise data
  editingId:       null,     // id of level_exercise being edited (null = none)
  // log view
  logExerciseId:   null,     // exercise.id being logged
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
const LS_PREFIX = 'cx_pending_';

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

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadExercises() {
  state.exercises = await api('GET', '/exercises');
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

function renderTodayRow(le, idx) {
  const ex = getExercise(le.exercise_id);
  // Tapping anywhere on the row opens the log screen for this exercise.
  return `
    <div class="today-ex-row today-ex-clickable" onclick="openLogView(${le.exercise_id})"
         role="button" tabindex="0"
         onkeydown="if(event.key==='Enter')openLogView(${le.exercise_id})">
      <span class="today-order mono">${String(idx).padStart(2,'0')}</span>
      <span class="today-name">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)}</span>
      <span class="today-sets mono">${le.sets}</span>
      <span class="today-target mono">${fmtTarget(le)}</span>
      <span class="today-tempo mono">${fmtTempo(le.tempo)}</span>
      <span class="today-rest mono">${fmtRest(le.rest_sec)} <span class="log-arrow">→</span></span>
    </div>`;
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

// ─── Log view ─────────────────────────────────────────────────────────────────
// Navigate to the log screen for a specific exercise.
function openLogView(exerciseId) {
  stopTimer();                      // clear any running timer from a previous visit
  state.logExerciseId = exerciseId;
  state.logElapsed    = 0;
  state.view          = 'log';
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
    // Auto-save the duration when the user stops the timer
    if (state.logElapsed > 0) saveLog({ duration_sec: state.logElapsed });
  } else {
    startTimer();
  }
}

// ── Save log ─────────────────────────────────────────────────────────────────
function saveLog(extra = {}) {
  const entry = {
    exercise_id:  state.logExerciseId,
    timestamp:    new Date().toISOString(),
    client_uuid:  newUUID(),
    ...extra,
  };
  lsWriteLog(entry);          // writes to localStorage immediately
  lsSyncPending();            // attempt immediate sync; ok if offline
  showToast('Set saved ✓');
  // Reset form / timer display without leaving the screen
  state.logElapsed = 0;
  stopTimer();
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
      <div class="log-topbar">${back}</div>
      <div class="log-header">
        <h1 class="log-exercise-name">${ex?.name ?? '?'}</h1>
        <span class="log-type-badge">${badge(ex?.type)}</span>
      </div>
      ${logBody}
    </div>`;
}

// ─── Main render ─────────────────────────────────────────────────────────────
function render() {
  // Sync active nav link (log view has no nav tab)
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.view === state.view)
  );

  const root = document.getElementById('app-root');
  if (state.view === 'log')   root.innerHTML = renderLogView();
  else if (state.view === 'today') root.innerHTML = renderTodayView();
  else root.innerHTML = renderEditView();

  // Build RPE stepper after render (reps view only)
  if (state.view === 'log') buildRpeRow();
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
  render();
}

// Navigate back from log screen to Today's Routine.
function goBack() {
  stopTimer();
  state.view = 'today';
  window.location.hash = 'today';
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
  const hash = window.location.hash.replace('#', '') || 'edit';
  if (hash.startsWith('log-')) {
    const id = parseInt(hash.replace('log-', ''), 10);
    if (!isNaN(id)) { state.view = 'log'; state.logExerciseId = id; return; }
  }
  state.view = ['edit', 'today', 'log'].includes(hash) ? hash : 'edit';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  render();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  applyHash();
  startSyncLoop();             // begin background sync loop
  try {
    await loadExercises();
    await loadLevel();
    render();
  } catch (e) {
    document.getElementById('app-root').innerHTML = `
      <div class="error-banner">
        ⚠ Could not reach the backend at <code>${API_BASE}</code>.<br>
        Start Flask first: <code>cd backend && python app.py</code>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
