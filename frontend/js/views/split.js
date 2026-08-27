/**
 * CalistheniX — Custom Splits & Workouts Library Builder View
 */

async function loadSplits() {
  try {
    const data = await API.getSplits();
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
    const data = await API.getSplitDetail(splitId);
    state.selectedSplitDetail = data;
    return data;
  } catch (e) {
    console.error('Failed to load split detail:', e);
  }
}

async function loadWorkouts() {
  try {
    const data = await API.getWorkouts();
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
    const data = await API.getWorkoutDetail(workoutId);
    state.selectedWorkoutDetail = data;
    return data;
  } catch (e) {
    console.error('Failed to load workout detail:', e);
  }
}


async function loadLevel() {
  const all = await API.getRoutineLevels(state.routine);
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
  const row = await API.createRoutineLevel({
    routine_name: state.routine,
    level: state.level,
  });
  state.levelId = row.id;
}

// ─── CRUD operations ──────────────────────────────────────────────────────────
async function addExercise(payload) {
  await ensureLevel();
  payload.order_index = state.levelExercises.length + 1;
  await API.addLevelExercise(state.levelId, payload);
  state.editingId = null;
  await loadLevel();
}

async function updateExercise(leId, payload) {
  await API.updateLevelExercise(leId, payload);
  state.editingId = null;
  await loadLevel();
}

async function deleteExercise(leId) {
  await API.deleteLevelExercise(leId);
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


// ─── Phase: Reusable Workouts & Catalog Editor View ──────────────────────────


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
        ${renderIcon('calendar', 'cx-icon cx-icon-inline')} 7-Day Weekly Schedule
      </button>
      <button class="btn ${currentTab === 'workouts' ? 'btn-primary' : 'btn-secondary'}" onclick="setSplitSubTab('workouts')">
        ${renderIcon('dumbbell', 'cx-icon cx-icon-inline')} Reusable Workouts (${state.workouts.length})
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

    const titleStr = isWorkout ? (d.workout_name || 'Workout') : 'Rest & Recovery';
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
          ${isWorkout ? `<button class="btn btn-secondary btn-sm" onclick="startWorkoutFromId(${d.workout_id})">${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Start</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openDayEditor(${d.day_of_week})">${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Edit Day</button>
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
            <button class="btn btn-secondary btn-sm" onclick="closeDayEditor()">${renderIcon('x', 'cx-icon')}</button>
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
              <button type="submit" class="btn btn-primary">Save Assignment</button>
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
            <button class="btn btn-secondary btn-sm" onclick="closeCreateSplitModal()">${renderIcon('x', 'cx-icon')}</button>
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
              <button type="submit" class="btn btn-primary">Create Split</button>
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
            ${!isActive ? `<button class="btn btn-secondary btn-sm" onclick="activateSplit(${currentSplit.id})">${renderIcon('star', 'cx-icon cx-icon-xs cx-icon-inline cx-gold')} Set as Active Split</button>` : `<span class="today-status-badge today-status-active">${renderIcon('star', 'cx-icon cx-icon-xs cx-icon-inline cx-gold')} Active Program</span>`}
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
        <button class="btn btn-secondary btn-sm" onclick="selectWorkoutForEditing(${w.id})">${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${w.id})">${renderIcon('copy', 'cx-icon cx-icon-xs cx-icon-inline')} Duplicate</button>
        <button class="btn btn-primary btn-sm" onclick="startWorkoutFromId(${w.id})">${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Test Run</button>
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
            </div>
            <button type="button" class="btn btn-danger btn-sm" style="padding:2px 8px; font-size:11px;" onclick="removeWorkoutExerciseSlot(${idx})">${renderIcon('x', 'cx-icon cx-icon-xs cx-icon-inline')} Remove</button>
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
            <summary style="font-size:11px; color:var(--accent); cursor:pointer; font-weight:600;">Advanced Settings (Tempo, Superset, Notes) ${renderIcon('chevronDown', 'cx-icon cx-icon-xs')}</summary>
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
            <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${selectedWorkout.id})">${renderIcon('copy', 'cx-icon cx-icon-xs cx-icon-inline')} Duplicate</button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteWorkout(${selectedWorkout.id}, '${selectedWorkout.name}')">${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Delete</button>
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
              <button type="button" class="btn btn-secondary" onclick="startWorkoutFromId(${selectedWorkout.id})">${renderIcon('zap', 'cx-icon cx-icon-xs cx-icon-inline')} Test Run Runner ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}</button>
              <button type="submit" class="btn btn-primary">Save Workout Changes</button>
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
            <button class="btn btn-secondary btn-sm" onclick="closeCreateWorkoutModal()">${renderIcon('x', 'cx-icon')}</button>
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
              <button type="submit" class="btn btn-primary">Create Workout</button>
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
    const created = await API.createSplit(payload);
    state.showCreateSplitModal = false;
    showToast(`Created Split "${created.name}"`);
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
    await API.activateSplit(splitId);
    showToast('Split set as Active');
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
    await API.deleteSplit(splitId);
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
    await API.updateScheduleDay(splitId, dayIndex, {
      day_type: dayType,
      workout_id: workoutId
    });
    state.editingDayIndex = null;
    showToast('Schedule day updated');
    await loadSplitDetail(splitId);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error updating day: ${e.message}`, true);
  }
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
    const created = await API.createWorkout(payload);
    state.showCreateWorkoutModal = false;
    showToast(`Created Workout "${created.name}"`);
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
    const dup = await API.duplicateWorkout(workoutId);
    showToast(`Duplicated into "${dup.name}"`);
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
    await API.deleteWorkout(workoutId);
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
    await API.updateWorkout(workoutId, {
      name,
      description: desc,
      exercises
    });
    showToast('Workout saved successfully');
    await loadWorkouts();
    await loadWorkoutDetail(workoutId);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error saving workout: ${e.message}`, true);
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


