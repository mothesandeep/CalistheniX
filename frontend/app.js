/* ============================================================
   app.js — CalistheniX Routine Builder
   Two views: Edit Routine Levels (CRUD) + Today's Routine (read-only)
   All functions in global scope for inline event handlers.
   ============================================================ */

const API_BASE = 'http://127.0.0.1:5000';

const ROUTINES = ['Push', 'Pull', 'Legs', 'Full Body', 'Active Recovery'];
const LEVELS   = [1, 2, 3, 4, 5];

// ─── Application state ───────────────────────────────────────────────────────
const state = {
  view:            'edit',   // 'edit' | 'today'
  routine:         'Push',
  level:           1,
  exercises:       [],       // all exercises from GET /exercises
  levelId:         null,     // current routine_level.id (null = not yet created)
  levelExercises:  [],       // level_exercises joined with exercise data
  editingId:       null,     // id of level_exercise being edited (null = none)
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
  return `
    <div class="today-ex-row">
      <span class="today-order mono">${String(idx).padStart(2,'0')}</span>
      <span class="today-name">${le.exercise_name ?? ex?.name ?? '?'} ${badge(ex?.type)}</span>
      <span class="today-sets mono">${le.sets}</span>
      <span class="today-target mono">${fmtTarget(le)}</span>
      <span class="today-tempo mono">${fmtTempo(le.tempo)}</span>
      <span class="today-rest mono">${fmtRest(le.rest_sec)}</span>
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

// ─── Main render ─────────────────────────────────────────────────────────────
function render() {
  // Sync active nav link
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.view === state.view)
  );

  const root = document.getElementById('app-root');
  root.innerHTML = state.view === 'edit' ? renderEditView() : renderTodayView();
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
  window.location.hash = view;
  render();
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
  state.view = ['edit', 'today'].includes(hash) ? hash : 'edit';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  render();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  applyHash();
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
