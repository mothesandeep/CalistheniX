/**
 * CalistheniX — Custom Splits & Workouts Library Builder View
 */

async function loadSplits() {
  try {
    const data = await API.getSplits();
    state.splits = Array.isArray(data) ? data : (data?.splits || []);
    const active = state.splits.find(s => s.is_active === 1) || state.splits[0];
    state.activeSplit = active || null;
    if (!state.selectedSplitId && active) {
      state.selectedSplitId = active.id;
    }
    if (state.selectedSplitId) {
      await loadSplitDetail(state.selectedSplitId);
    }
    return data;
  } catch (e) {
    console.error('Failed to load splits:', e);
    state.splits = [];
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

  // Schedule Grid (7 days Monday-Sunday, Section 12 Spec)
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const scheduleDays = currentSplit.schedule || [];

  const dayCardsHtml = scheduleDays.map((d, idx) => {
    const isToday = d.day_of_week === todayDow;
    const isPast = d.day_of_week < todayDow;
    const isWorkout = d.day_type === 'workout' && d.workout_id;

    const typeBadge = isWorkout
      ? `<span class="badge badge-reps">Workout</span>`
      : `<span class="badge badge-hold">Rest Day</span>`;

    const titleStr = isWorkout ? (d.workout_name || 'Workout') : 'Rest & Recovery';

    let actionBtnHtml = '';
    if (isToday) {
      if (isWorkout) {
        actionBtnHtml = `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="startWorkoutFromId(${d.workout_id})">${renderIcon('zap', 'cx-icon cx-icon-xs cx-icon-inline')} Start Today</button>`;
      } else {
        actionBtnHtml = `<button class="btn btn-secondary btn-sm" style="width:100%; opacity:0.85;" onclick="openDayEditor(${d.day_of_week})">Rest Day · Edit</button>`;
      }
    } else if (isPast) {
      actionBtnHtml = `<button class="btn btn-ghost btn-sm" onclick="switchView('history_list')">View Log →</button>`;
    } else {
      actionBtnHtml = `<button class="btn btn-ghost btn-sm" onclick="openDayEditor(${d.day_of_week})">${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Edit</button>`;
    }

    return `
      <div class="schedule-day-card ${isToday ? 'schedule-day-today' : ''} ${!isWorkout && !isToday ? 'is-rest-day' : ''}">
        <div class="schedule-day-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="schedule-day-name">${d.day_name}</span>
            ${isToday ? '<span class="schedule-today-pill">TODAY</span>' : ''}
          </div>
          ${typeBadge}
        </div>
        <div class="schedule-workout-info">
          <div class="schedule-workout-title">${titleStr}</div>
        </div>
        <div class="schedule-day-actions">
          ${actionBtnHtml}
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

const BUILDER_STARTER_TEMPLATES = {
  warmup: [
    {
      id: 'warmup_full_body',
      category: 'full_body',
      name: 'Full Body',
      tag: 'Kinetic Chain',
      description: 'Kinetic chain activation: joint mobility, hip openers, and dynamic full-body integration (3.5 min)',
      exercises: [
        { name: 'Arm Swings', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Dynamic horizontal and overhead arm swings' },
        { name: 'Wrist Circles', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Controlled clockwise and counter-clockwise rotations' },
        { name: 'Cat-Cow Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Segmental thoracic and lumbar articulation' },
        { name: 'Leg Swings', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Forward/backward and lateral dynamic hip swings' },
        { name: "World's Greatest Stretch", type: 'duration', target: 30, sets: 1, rest: 15, notes: 'Lunge + thoracic reach toward ceiling' }
      ]
    },
    {
      id: 'warmup_push',
      category: 'push',
      name: 'Push',
      tag: 'Pressing Prep',
      description: 'Targeted wrist loading, shoulder capsule mobility, and scapular protraction for pressing patterns (3.5 min)',
      exercises: [
        { name: 'Wrist Circles', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Thorough wrist joint preparation' },
        { name: 'Shoulder CARs', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Controlled Articular Rotations through full range' },
        { name: 'Scapular Push-ups', type: 'reps', target: 10, sets: 1, rest: 10, notes: 'Straight arms; isolate protraction and retraction' },
        { name: 'Arm Swings', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Open chest and activate anterior delts dynamically' },
        { name: 'Incline Push-up Prep', type: 'reps', target: 8, sets: 1, rest: 15, notes: 'Light pushing progression to prime pressing mechanics' }
      ]
    },
    {
      id: 'warmup_pull',
      category: 'pull',
      name: 'Pull',
      tag: 'Pulling Prep',
      description: 'Scapular depression, shoulder circles, grip prep, and light pulling activation (3.5 min)',
      exercises: [
        { name: 'Wrist Preparation', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Grip and forearm dynamic prep' },
        { name: 'Arm Circles', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Controlled shoulder circumduction' },
        { name: 'Scapular Pulls', type: 'reps', target: 8, sets: 1, rest: 10, notes: 'Depress scapulae without bending elbows' },
        { name: 'Dead Hang', type: 'duration', target: 20, sets: 1, rest: 10, notes: 'Passive to active grip and shoulder decompression' },
        { name: 'Incline Row Prep', type: 'reps', target: 8, sets: 1, rest: 15, notes: 'Light horizontal pulling to prime lat activation' }
      ]
    },
    {
      id: 'warmup_legs',
      category: 'legs',
      name: 'Legs',
      tag: 'Lower Body',
      description: 'Ankle mobility, hip openers, dynamic lunges, and bodyweight squat activation (4 min)',
      exercises: [
        { name: 'Ankle Circles', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Smooth ankle circumduction both directions' },
        { name: 'Leg Swings', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Dynamic forward and lateral swings' },
        { name: 'Deep Squat Hold', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Heels down, tall spine, open adductors' },
        { name: 'Bodyweight Squats', type: 'reps', target: 10, sets: 1, rest: 10, notes: 'Smooth controlled tempo through full range' },
        { name: 'Walking Lunges', type: 'reps', target: 10, sets: 1, rest: 15, notes: 'Dynamic step lunges to warm glutes and quads' }
      ]
    },
    {
      id: 'warmup_handstand',
      category: 'handstand',
      name: 'Handstand',
      tag: 'Inversion',
      description: 'Progressive wrist loading, shoulder flexion mobility, scapular elevation, and chest-to-wall alignment (4 min)',
      exercises: [
        { name: 'Wrist Preparation', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Warm up palm base, fingers, and wrist extensors' },
        { name: 'Wrist Rocks', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Forward and sideways gentle loading on palms' },
        { name: 'Shoulder Mobility', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Full overhead flexion without lumbar arching' },
        { name: 'Scapular Elevation', type: 'reps', target: 10, sets: 1, rest: 10, notes: 'Shrug shoulders to ears overhead with locked elbows' },
        { name: 'Wall-Facing Handstand Prep', type: 'duration', target: 20, sets: 1, rest: 15, notes: 'Chest to wall; push through floor and hollow body' }
      ]
    },
    {
      id: 'warmup_planche',
      category: 'planche',
      name: 'Planche',
      tag: 'Straight-Arm Press',
      description: 'High-torque wrist prep, anterior shoulder activation, locked-arm scapular protraction, and planche leans (3.5 min)',
      exercises: [
        { name: 'Wrist Preparation', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Thorough wrist extension conditioning' },
        { name: 'Shoulder Activation', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Straight-arm anterior deltoid engagement' },
        { name: 'Scapular Protraction', type: 'duration', target: 20, sets: 1, rest: 10, notes: 'Round upper back with straight arms; create dome shape' },
        { name: 'Planche Lean Prep', type: 'duration', target: 20, sets: 1, rest: 15, notes: 'Lean shoulders forward past wrists with full protraction' }
      ]
    },
    {
      id: 'warmup_front_lever',
      category: 'front_lever',
      name: 'Front Lever',
      tag: 'Straight-Arm Pull',
      description: 'Straight-arm lat activation, scapular depression/retraction, active dead hang, and hollow body core engagement (3.5 min)',
      exercises: [
        { name: 'Shoulder Activation', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Prime rotator cuff and posterior capsule' },
        { name: 'Scapular Pulls', type: 'reps', target: 8, sets: 1, rest: 10, notes: 'Straight-arm hanging scapular depressions' },
        { name: 'Dead Hang', type: 'duration', target: 20, sets: 1, rest: 10, notes: 'Active hang with retracted scapulae and neutral ribcage' },
        { name: 'Hollow Body Activation', type: 'duration', target: 20, sets: 1, rest: 15, notes: 'Posterior pelvic tilt with lower back pressed flat to floor' }
      ]
    },
    {
      id: 'warmup_mobility',
      category: 'mobility',
      name: 'Mobility / Recovery',
      tag: 'Flow & Joints',
      description: 'Thoracic spine waves, shoulder CARs, 90/90 hip transitions, and deep squat decompression (4 min)',
      exercises: [
        { name: 'Cat-Cow Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Segmental spinal movement from tailbone to neck' },
        { name: 'Shoulder CARs', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Slow controlled circular shoulder rotations' },
        { name: 'Hip 90/90 Transitions', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Internal and external rotational hip mobility' },
        { name: 'Deep Squat Hold', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Sit deep with elbows pushing knees gently outward' },
        { name: "World's Greatest Stretch", type: 'duration', target: 30, sets: 1, rest: 15, notes: 'Lunge + thoracic twist + hamstring opener' }
      ]
    }
  ],
  cooldown: [
    {
      id: 'cooldown_full_body',
      category: 'full_body',
      name: 'Full Body Recovery',
      tag: 'Full Body Static',
      description: 'Calming static stretches for chest, lats, hips, hamstrings, and spinal relaxation (3.5 min)',
      exercises: [
        { name: 'Chest Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Wall-supported gentle pectoral release' },
        { name: 'Lat Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Breathe deeply into ribcage and latissimus dorsi' },
        { name: 'Hip Flexor Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Kneeling lunge with posterior pelvic tuck' },
        { name: 'Hamstring Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Hinge gently at the hips without rounding lower back' },
        { name: "Child's Pose", type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Sink hips to heels; slow deep parasympathetic breaths' }
      ]
    },
    {
      id: 'cooldown_push',
      category: 'push',
      name: 'Push Recovery',
      tag: 'Chest & Arms',
      description: 'Targeted static stretching for pectorals, anterior deltoids, triceps, and abdominal wall (3 min)',
      exercises: [
        { name: 'Chest Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Open anterior chest fibers with gentle wall pressure' },
        { name: 'Shoulder Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Cross-body posterior deltoid release' },
        { name: 'Overhead Triceps Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Elbow bent behind head, gently drawing inward' },
        { name: 'Cobra Pose', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Gentle prone extension for anterior chain' }
      ]
    },
    {
      id: 'cooldown_pull',
      category: 'pull',
      name: 'Pull Recovery',
      tag: 'Lats & Forearms',
      description: 'Static stretching for lats, biceps, forearms, and rhomboids following pulling sessions (3 min)',
      exercises: [
        { name: 'Lat Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Bar or pole supported lat elongation' },
        { name: 'Biceps & Forearm Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Palm against wall, fingers pointing back' },
        { name: 'Eagle Arms Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Intertwine forearms to open upper back and rhomboids' },
        { name: 'Dead Hang', type: 'duration', target: 20, sets: 1, rest: 10, notes: 'Passive relaxing decompression of spine and shoulders' }
      ]
    },
    {
      id: 'cooldown_legs',
      category: 'legs',
      name: 'Legs Recovery',
      tag: 'Hips & Legs',
      description: 'Deep static stretches for hip flexors, hamstrings, glutes, adductors, and calves (3.5 min)',
      exercises: [
        { name: 'Hip Flexor Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Tuck pelvis under to isolate psoas' },
        { name: 'Hamstring Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Seated or standing hinge with relaxed neck' },
        { name: 'Pigeon Pose', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Deep piriformis and gluteus medius opening' },
        { name: 'Standing Calf Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Wall-assisted heel-down gastrocnemius stretch' },
        { name: 'Butterfly Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Soles together, gentle adductor release' }
      ]
    },
    {
      id: 'cooldown_handstand',
      category: 'handstand',
      name: 'Handstand Decompression',
      tag: 'Wrists & Shoulders',
      description: 'Wrist relief, posterior capsule stretch, lat elongation, and child\'s pose spinal release (3 min)',
      exercises: [
        { name: 'Reverse Wrist Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Gentle palms-up wrist extensor release' },
        { name: 'Shoulder Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Cross-body deltoid stretch' },
        { name: 'Lat Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Side body and overhead shoulder opener' },
        { name: "Child's Pose", type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Calm breathing and spinal decompression' }
      ]
    },
    {
      id: 'cooldown_planche',
      category: 'planche',
      name: 'Planche Recovery',
      tag: 'Wrists & Biceps',
      description: 'Wrist flexor/extensor release, distal biceps wall stretch, and anterior deltoid relief (3 min)',
      exercises: [
        { name: 'Reverse Wrist Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Kneeling palms-up gentle extensor stretch' },
        { name: 'Biceps & Forearm Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Distal biceps and anterior capsule wall stretch' },
        { name: 'Chest Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Pectoral and shoulder opener' },
        { name: "Child's Pose", type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Restorative diaphragmatic breathing' }
      ]
    },
    {
      id: 'cooldown_front_lever',
      category: 'front_lever',
      name: 'Front Lever Recovery',
      tag: 'Lats & Spine',
      description: 'Lat decompression, prone abdominal stretch, thoracic extension, and seated forward fold (3 min)',
      exercises: [
        { name: 'Lat Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Bar-assisted lat and teres major stretch' },
        { name: 'Cobra Pose', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Abdominal wall and anterior hip stretch' },
        { name: 'Puppy Pose', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Thoracic extension with chest melting toward floor' },
        { name: 'Seated Forward Fold', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Relaxed posterior chain and lower back release' }
      ]
    },
    {
      id: 'cooldown_mobility',
      category: 'mobility',
      name: 'Mobility Decompression',
      tag: 'Spine & Hips',
      description: 'Restorative hip and spine circuit: Child\'s pose, Pigeon pose, spinal twist, and butterfly stretch (3.5 min)',
      exercises: [
        { name: "Child's Pose", type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Deep restorative spinal resting pose' },
        { name: 'Pigeon Pose', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Deep glute and outer hip relaxation' },
        { name: 'Supine Spinal Twist', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Gentle rotational release for lower back and hips' },
        { name: 'Butterfly Stretch', type: 'duration', target: 30, sets: 1, rest: 10, notes: 'Adductor and pelvic floor relaxation' }
      ]
    }
  ]
};

function detectSmartIntent(workoutName = '', exercises = []) {
  const text = (workoutName || '').toLowerCase();
  if (text.includes('handstand') || text.includes('inversion') || text.includes('hspu')) return 'handstand';
  if (text.includes('planche')) return 'planche';
  if (text.includes('front lever') || text.includes('lever') || text.includes('flag')) return 'front_lever';
  if (text.includes('push') || text.includes('chest') || text.includes('dip') || text.includes('press')) return 'push';
  if (text.includes('pull') || text.includes('back') || text.includes('row') || text.includes('chin')) return 'pull';
  if (text.includes('leg') || text.includes('squat') || text.includes('lunge') || text.includes('lower')) return 'legs';
  if (text.includes('mobility') || text.includes('recovery') || text.includes('stretch') || text.includes('flow') || text.includes('warmup')) return 'mobility';

  // Check exercise patterns in the workout if name is generic
  if (exercises && exercises.length > 0) {
    let pushCount = 0, pullCount = 0, legCount = 0, handstandCount = 0, plancheCount = 0, leverCount = 0;
    exercises.forEach(e => {
      const p = (e.movement_pattern || '').toLowerCase();
      const n = (e.exercise_name || e.name || '').toLowerCase();
      if (p.includes('push') || n.includes('push') || n.includes('dip')) pushCount++;
      if (p.includes('pull') || n.includes('pull') || n.includes('row')) pullCount++;
      if (p.includes('squat') || p.includes('lunge') || p.includes('hinge') || p.includes('calf') || n.includes('squat')) legCount++;
      if (p.includes('handstand') || n.includes('handstand')) handstandCount++;
      if (p.includes('planche') || n.includes('planche')) plancheCount++;
      if (n.includes('lever')) leverCount++;
    });

    if (handstandCount >= 2) return 'handstand';
    if (plancheCount >= 2) return 'planche';
    if (leverCount >= 2) return 'front_lever';
    if (pushCount > pullCount && pushCount > legCount) return 'push';
    if (pullCount > pushCount && pullCount > legCount) return 'pull';
    if (legCount > pushCount && legCount > pullCount) return 'legs';
  }

  return 'full_body';
}

function renderPhaseSlotCard(phase, ex, idx, totalInPhase) {
  const isHold = ex.exercise_type === 'duration';
  const targetVal = isHold ? (ex.duration_sec || 30) : (ex.reps || 10);
  const defaultSets = phase === 'main' ? 3 : 1;
  const setsVal = ex.sets || defaultSets;
  const defaultRest = phase === 'main' ? 90 : 15;
  const restVal = (ex.rest_sec !== undefined && ex.rest_sec !== null) ? ex.rest_sec : defaultRest;

  const isFirst = idx === 0;
  const isLast = idx === totalInPhase - 1;

  const controlsHtml = `
    <div class="builder-slot-controls">
      <button type="button" class="builder-icon-btn" title="Move Up" ${isFirst ? 'disabled' : ''} onclick="moveWorkoutExerciseSlot('${phase}', ${idx}, -1)">
        ${renderIcon('arrowUp', 'cx-icon cx-icon-xs')}
      </button>
      <button type="button" class="builder-icon-btn" title="Move Down" ${isLast ? 'disabled' : ''} onclick="moveWorkoutExerciseSlot('${phase}', ${idx}, 1)">
        ${renderIcon('arrowDown', 'cx-icon cx-icon-xs')}
      </button>
      <button type="button" class="builder-icon-btn danger" title="Remove" onclick="removeWorkoutExerciseSlot('${phase}', ${idx})">
        ${renderIcon('x', 'cx-icon cx-icon-xs')}
      </button>
    </div>
  `;

  let extraFieldsHtml = '';
  if (phase === 'main') {
    extraFieldsHtml = `
      <details style="margin-top:4px;">
        <summary style="font-size:11px; color:var(--accent); cursor:pointer; font-weight:600;">Advanced Settings (Tempo, Superset, Notes) ${renderIcon('chevronDown', 'cx-icon cx-icon-xs')}</summary>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-top:8px;">
          <div class="form-group">
            <label class="form-label">Tempo <span class="opt">opt</span></label>
            <input class="form-input mono" type="text" id="slot-${phase}-tempo-${idx}" value="${ex.tempo || ''}" placeholder="3010" style="padding:5px 8px; font-size:13px;">
          </div>
          <div class="form-group">
            <label class="form-label">Superset # <span class="opt">opt</span></label>
            <input class="form-input mono" type="number" id="slot-${phase}-ss-${idx}" value="${ex.superset_group || ''}" placeholder="1, 2" min="1" style="padding:5px 8px; font-size:13px;">
          </div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <label class="form-label">Coaching Notes <span class="opt">opt</span></label>
          <input class="form-input" type="text" id="slot-${phase}-notes-${idx}" value="${ex.notes || ''}" placeholder="e.g. Full protraction at top, core braced" style="font-size:12px; padding:6px 10px;">
        </div>
      </details>
    `;
  } else {
    extraFieldsHtml = `
      <div class="form-group" style="margin-top:2px;">
        <input class="form-input" type="text" id="slot-${phase}-notes-${idx}" value="${ex.notes || ''}" placeholder="Coaching cue (e.g. Focus on joint lubrication / deep breath)" style="font-size:11.5px; padding:4px 8px;">
      </div>
    `;
  }

  return `
    <div class="builder-slot-card" id="builder-slot-${phase}-${idx}">
      <div class="builder-slot-header">
        <div class="builder-slot-title-wrap">
          <span class="builder-slot-idx">#${String(idx + 1).padStart(2, '0')}</span>
          <span class="builder-slot-name">${ex.exercise_name}</span>
          <span class="builder-slot-type-badge">${isHold ? 'Duration' : 'Reps'}</span>
        </div>
        ${controlsHtml}
      </div>

      <div class="builder-slot-grid">
        <div class="form-group">
          <label class="form-label">Sets</label>
          <div class="stepper-group">
            <button type="button" class="stepper-btn" onclick="adjustPhaseSlotSets('${phase}', ${idx}, -1)">-</button>
            <span class="stepper-val mono" id="slot-${phase}-sets-${idx}">${setsVal}</span>
            <button type="button" class="stepper-btn" onclick="adjustPhaseSlotSets('${phase}', ${idx}, 1)">+</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${isHold ? 'Hold (sec)' : 'Target Reps'}</label>
          <input class="form-input mono" type="number" id="slot-${phase}-target-${idx}" value="${targetVal}" min="1" style="padding:5px 8px; font-size:13px;">
        </div>

        <div class="form-group">
          <label class="form-label">Rest (sec)</label>
          <input class="form-input mono" type="number" id="slot-${phase}-rest-${idx}" value="${restVal}" min="0" step="5" style="padding:5px 8px; font-size:13px;">
        </div>
      </div>

      ${extraFieldsHtml}
    </div>
  `;
}

function renderPhaseBuilderSection(phase, exercises) {
  const isPrep = phase === 'warmup';
  const isTrain = phase === 'main';
  const isRecover = phase === 'cooldown';

  const badgeClass = isPrep ? 'badge-prep' : (isTrain ? 'badge-train' : 'badge-recover');
  const badgeLabel = isPrep ? 'PREP' : (isTrain ? 'TRAIN' : 'RECOVER');
  const title = isPrep ? 'Warm-up' : (isTrain ? 'Main Workout' : 'Cool-down & Stretching');
  const sub = isPrep
    ? 'Dynamic mobility & joint activation · Happens BEFORE training (Optional)'
    : (isTrain
        ? 'Primary working sets & strength progressions · Core Training'
        : 'Static stretching & tissue recovery · Happens AFTER training (Optional)');

  const phaseExs = exercises.filter(e => (e.phase || 'main') === phase);
  const countLabel = `${phaseExs.length} ${isTrain ? 'exercises' : (isPrep ? 'movements' : 'stretches')}`;

  let templatesHtml = '';
  if (!isTrain) {
    const tpls = BUILDER_STARTER_TEMPLATES[phase] || [];
    const detectedIntent = detectSmartIntent(
      state.selectedWorkoutDetail?.name,
      state.selectedWorkoutDetail?.exercises
    );

    const chips = tpls.map(t => {
      const isRec = t.category === detectedIntent;
      return `
        <button type="button" class="builder-template-chip ${isRec ? 'is-recommended' : ''}" onclick="applyBuilderStarterTemplate('${phase}', '${t.id}')" title="${t.description}">
          ${isRec ? renderIcon('sparkles', 'cx-icon cx-icon-xs cx-icon-inline') : ''}
          ${t.name}
          ${isRec ? '<span class="builder-rec-badge">Intent Match</span>' : ''}
        </button>
      `;
    }).join('');

    templatesHtml = `
      <div style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px;">
          <span style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">
            Intent-Based Starter Templates:
          </span>
          <span style="font-size:11px; color:var(--accent-light);">
            Detected: <strong>${detectedIntent.replace('_', ' ').toUpperCase()}</strong>
          </span>
        </div>
        <div class="builder-template-chip-group">
          ${chips}
        </div>
      </div>
    `;
  }

  let actionsHtml = '';
  if (phaseExs.length > 0 && !isTrain) {
    actionsHtml = `
      <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:11px;" onclick="clearBuilderPhase('${phase}')">
        ${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Clear Section
      </button>
    `;
  }

  let slotsHtml = '';
  if (phaseExs.length > 0) {
    slotsHtml = phaseExs.map((ex, idx) => renderPhaseSlotCard(phase, ex, idx, phaseExs.length)).join('');
  } else {
    slotsHtml = `
      <div class="builder-empty-phase">
        <div>No ${isPrep ? 'warm-up movements' : (isRecover ? 'cool-down stretches' : 'exercises')} configured.</div>
        ${!isTrain ? '<div style="margin-top:4px; font-size:11.5px; color:var(--text-dim);">Pick a starter template above or add custom movements below.</div>' : ''}
      </div>
    `;
  }

  let phaseCatalog = state.exercises || [];
  if (isPrep || isRecover) {
    const mobility = phaseCatalog.filter(e => (e.movement_pattern || '').startsWith('mobility_') || (e.movement_pattern || '').startsWith('stretch_') || e.day === 'Mobility & Stretching');
    const others = phaseCatalog.filter(e => !mobility.includes(e));
    phaseCatalog = [...mobility, ...others];
  }

  const selectOpts = phaseCatalog.map(e => `<option value="${e.id}">${e.name} (${e.type})</option>`).join('');

  return `
    <div class="builder-phase-section phase-${isPrep ? 'prep' : (isTrain ? 'train' : 'recover')}">
      <div class="builder-phase-header">
        <div>
          <div class="builder-phase-title-wrap">
            <span class="builder-phase-badge ${badgeClass}">${badgeLabel}</span>
            <h4 class="builder-phase-title">${title}</h4>
            <span class="badge badge-reps" style="font-size:10.5px;">${countLabel}</span>
          </div>
          <p class="builder-phase-sub">${sub}</p>
        </div>
        <div class="builder-phase-actions">
          ${actionsHtml}
        </div>
      </div>

      ${templatesHtml}

      <div style="margin-top:12px;">
        ${slotsHtml}
      </div>

      <div class="builder-add-row">
        <select class="form-input form-select" id="add-${phase}-exercise-id" style="flex:1; min-width:180px; font-size:12.5px; padding:6px 10px;">
          ${selectOpts}
        </select>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addExerciseSlotToWorkout('${phase}')">
          ${renderIcon('plus', 'cx-icon cx-icon-xs cx-icon-inline')} + Add to ${isPrep ? 'Warm-up' : (isRecover ? 'Cool-down' : 'Main Workout')}
        </button>
      </div>
    </div>
  `;
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
        <div style="font-size:12px; color:var(--text-muted); margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;" class="mono">
          <span>Total Sets: <strong>${w.total_sets || 0}</strong></span>
          ${w.warmup_sets ? `<span style="color:#f5a623;">Prep: <strong>${w.warmup_sets}</strong></span>` : ''}
          <span style="color:var(--accent);">Train: <strong>${w.main_sets || w.total_sets || 0}</strong></span>
          ${w.cooldown_sets ? `<span style="color:#2ed573;">Recover: <strong>${w.cooldown_sets}</strong></span>` : ''}
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

    const workoutMuscles = { primary: [], secondary: [] };
    exercises.forEach(ex => {
      if (typeof window !== 'undefined' && window.MuscleMap) {
        const m = window.MuscleMap.getExerciseMuscles(ex.exercise_name);
        if (m && m.primary) workoutMuscles.primary.push(...m.primary);
        if (m && m.secondary) workoutMuscles.secondary.push(...m.secondary);
      }
    });
    workoutMuscles.primary = Array.from(new Set(workoutMuscles.primary));
    workoutMuscles.secondary = Array.from(new Set(workoutMuscles.secondary.filter(s => !workoutMuscles.primary.includes(s))));

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

            <!-- PREP: Warm-up Section -->
            ${renderPhaseBuilderSection('warmup', exercises)}

            <!-- TRAIN: Main Workout Section -->
            ${renderPhaseBuilderSection('main', exercises)}

            <!-- RECOVER: Cool-down Section -->
            ${renderPhaseBuilderSection('cooldown', exercises)}

            <!-- Workout Target Muscle Activation Map -->
            <div class="card" style="background:var(--surface-2); padding:16px; margin-bottom:20px; border:1px solid rgba(124,92,252,0.18);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:12.5px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.04em;">
                  ${renderIcon('target', 'cx-icon cx-icon-xs cx-icon-inline')} Workout Target Muscle Activation Map
                </span>
                <span class="badge badge-reps" style="font-size:10.5px;">${workoutMuscles.primary.length} Primary Targets</span>
              </div>
              ${(typeof window !== 'undefined' && window.MuscleMap)
                ? window.MuscleMap.render({ primaryMuscles: workoutMuscles.primary, secondaryMuscles: workoutMuscles.secondary, size: 'sm', view: 'both', showLegend: true })
                : ''}
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
              <input class="form-input" type="text" name="name" id="create-workout-name-input" placeholder="e.g. Push Power, Handstand Skill, Leg Day..." oninput="autoSelectModalTemplates(this.value)" required autofocus>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Description <span class="opt">opt</span></label>
              <input class="form-input" type="text" name="description" placeholder="e.g. Heavy dips and push-up variations focus">
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
              <div class="form-group">
                <label class="form-label">Warm-up Preset <span class="opt">opt</span></label>
                <select class="form-input form-select" name="warmup_template" id="create-modal-warmup-select" style="font-size:12px;" onchange="this.dataset.userTouched='true'">
                  <option value="">None (Configure in builder)</option>
                  <option value="warmup_full_body">Full Body (Kinetic Chain)</option>
                  <option value="warmup_push">Push (Pressing Prep)</option>
                  <option value="warmup_pull">Pull (Pulling Prep)</option>
                  <option value="warmup_legs">Legs (Lower Body)</option>
                  <option value="warmup_handstand">Handstand (Inversion Prep)</option>
                  <option value="warmup_planche">Planche (Straight-Arm Press)</option>
                  <option value="warmup_front_lever">Front Lever (Straight-Arm Pull)</option>
                  <option value="warmup_mobility">Mobility / Recovery (Joint Flow)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Cool-down Preset <span class="opt">opt</span></label>
                <select class="form-input form-select" name="cooldown_template" id="create-modal-cooldown-select" style="font-size:12px;" onchange="this.dataset.userTouched='true'">
                  <option value="">None (Configure in builder)</option>
                  <option value="cooldown_full_body">Full Body Recovery (Static Stretch)</option>
                  <option value="cooldown_push">Push Recovery (Chest & Arms)</option>
                  <option value="cooldown_pull">Pull Recovery (Lats & Forearms)</option>
                  <option value="cooldown_legs">Legs Recovery (Hips & Legs)</option>
                  <option value="cooldown_handstand">Handstand Decompression (Wrists & Shoulders)</option>
                  <option value="cooldown_planche">Planche Recovery (Wrists & Biceps)</option>
                  <option value="cooldown_front_lever">Front Lever Recovery (Lats & Spine)</option>
                  <option value="cooldown_mobility">Mobility Decompression (Spine & Hips)</option>
                </select>
              </div>
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

function syncWorkoutEditorFormToState() {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  const nameInput = document.getElementById('edit-workout-name');
  const descInput = document.getElementById('edit-workout-desc');
  if (nameInput) state.selectedWorkoutDetail.name = nameInput.value;
  if (descInput) state.selectedWorkoutDetail.description = descInput.value;

  const phases = ['warmup', 'main', 'cooldown'];
  phases.forEach(phase => {
    const phaseExs = (state.selectedWorkoutDetail.exercises || []).filter(e => (e.phase || 'main') === phase);
    phaseExs.forEach((ex, idx) => {
      const targetEl = document.getElementById(`slot-${phase}-target-${idx}`);
      const setsEl = document.getElementById(`slot-${phase}-sets-${idx}`);
      const restEl = document.getElementById(`slot-${phase}-rest-${idx}`);
      const tempoEl = document.getElementById(`slot-${phase}-tempo-${idx}`);
      const ssEl = document.getElementById(`slot-${phase}-ss-${idx}`);
      const notesEl = document.getElementById(`slot-${phase}-notes-${idx}`);

      const isHold = ex.exercise_type === 'duration';
      if (targetEl && targetEl.value) {
        const val = parseInt(targetEl.value, 10);
        if (!isNaN(val)) {
          if (isHold) ex.duration_sec = val;
          else ex.reps = val;
        }
      }
      if (setsEl && setsEl.textContent) {
        const sVal = parseInt(setsEl.textContent, 10);
        if (!isNaN(sVal)) ex.sets = sVal;
      }
      if (restEl && restEl.value) {
        const rVal = parseInt(restEl.value, 10);
        if (!isNaN(rVal)) ex.rest_sec = rVal;
      }
      if (tempoEl) ex.tempo = tempoEl.value.trim() || null;
      if (ssEl) ex.superset_group = ssEl.value ? parseInt(ssEl.value, 10) : null;
      if (notesEl) ex.notes = notesEl.value.trim() || null;
    });
  });
}

function applyBuilderStarterTemplate(phase, templateId) {
  syncWorkoutEditorFormToState();
  if (!state.selectedWorkoutDetail) return;
  if (!state.selectedWorkoutDetail.exercises) state.selectedWorkoutDetail.exercises = [];

  const templates = BUILDER_STARTER_TEMPLATES[phase] || [];
  const tpl = templates.find(t => t.id === templateId);
  if (!tpl) return;

  const otherExercises = state.selectedWorkoutDetail.exercises.filter(e => (e.phase || 'main') !== phase);

  const newPhaseExercises = [];
  for (const tplEx of tpl.exercises) {
    const catalogEx = (state.exercises || []).find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())
      || (state.exercises || []).find(e => e.name.toLowerCase().includes(tplEx.name.toLowerCase()))
      || (state.exercises && state.exercises[0]);

    const isHold = (catalogEx?.type || tplEx.type) === 'duration';
    newPhaseExercises.push({
      exercise_id: catalogEx ? catalogEx.id : 1,
      exercise_name: catalogEx ? catalogEx.name : tplEx.name,
      exercise_type: isHold ? 'duration' : 'reps',
      phase: phase,
      sets: tplEx.sets || 1,
      reps: isHold ? null : (tplEx.target || 10),
      duration_sec: isHold ? (tplEx.target || 30) : null,
      rest_sec: tplEx.rest || (phase === 'main' ? 90 : 10),
      tempo: '',
      superset_group: null,
      notes: tplEx.notes || ''
    });
  }

  let assembled = [];
  if (phase === 'warmup') {
    const mainExs = otherExercises.filter(e => (e.phase || 'main') === 'main');
    const coolExs = otherExercises.filter(e => e.phase === 'cooldown');
    assembled = [...newPhaseExercises, ...mainExs, ...coolExs];
  } else if (phase === 'cooldown') {
    const warmExs = otherExercises.filter(e => e.phase === 'warmup');
    const mainExs = otherExercises.filter(e => (e.phase || 'main') === 'main');
    assembled = [...warmExs, ...mainExs, ...newPhaseExercises];
  } else {
    const warmExs = otherExercises.filter(e => e.phase === 'warmup');
    const coolExs = otherExercises.filter(e => e.phase === 'cooldown');
    assembled = [...warmExs, ...newPhaseExercises, ...coolExs];
  }

  state.selectedWorkoutDetail.exercises = assembled;
  showToast(`Applied "${tpl.name}" starter template`);
  render();
}

function clearBuilderPhase(phase) {
  syncWorkoutEditorFormToState();
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  state.selectedWorkoutDetail.exercises = state.selectedWorkoutDetail.exercises.filter(e => (e.phase || 'main') !== phase);
  showToast(`Cleared ${phase === 'warmup' ? 'Warm-up' : (phase === 'cooldown' ? 'Cool-down' : 'Main')} section`);
  render();
}

async function handleCreateWorkout(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const name = (data.get('name') || '').trim();
  const desc = data.get('description') || '';
  const warmupTpl = data.get('warmup_template');
  const cooldownTpl = data.get('cooldown_template');

  if (!name) {
    showToast('Workout name is required', true);
    return;
  }

  const exercises = [];
  let currentOrder = 1;

  if (warmupTpl && BUILDER_STARTER_TEMPLATES.warmup) {
    const tpl = BUILDER_STARTER_TEMPLATES.warmup.find(t => t.id === warmupTpl);
    if (tpl) {
      for (const tplEx of tpl.exercises) {
        const catEx = (state.exercises || []).find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())
          || (state.exercises || []).find(e => e.name.toLowerCase().includes(tplEx.name.toLowerCase()))
          || (state.exercises && state.exercises[0]);
        const isHold = (catEx?.type || tplEx.type) === 'duration';
        exercises.push({
          exercise_id: catEx ? catEx.id : 1,
          order_index: currentOrder++,
          phase: 'warmup',
          sets: tplEx.sets || 1,
          reps: isHold ? null : (tplEx.target || 10),
          duration_sec: isHold ? (tplEx.target || 30) : null,
          rest_sec: tplEx.rest || 10,
          notes: tplEx.notes || ''
        });
      }
    }
  }

  if (cooldownTpl && BUILDER_STARTER_TEMPLATES.cooldown) {
    const tpl = BUILDER_STARTER_TEMPLATES.cooldown.find(t => t.id === cooldownTpl);
    if (tpl) {
      for (const tplEx of tpl.exercises) {
        const catEx = (state.exercises || []).find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())
          || (state.exercises || []).find(e => e.name.toLowerCase().includes(tplEx.name.toLowerCase()))
          || (state.exercises && state.exercises[0]);
        const isHold = (catEx?.type || tplEx.type) === 'duration';
        exercises.push({
          exercise_id: catEx ? catEx.id : 1,
          order_index: currentOrder++,
          phase: 'cooldown',
          sets: tplEx.sets || 1,
          reps: isHold ? null : (tplEx.target || 10),
          duration_sec: isHold ? (tplEx.target || 30) : null,
          rest_sec: tplEx.rest || 10,
          notes: tplEx.notes || ''
        });
      }
    }
  }

  try {
    const created = await API.createWorkout({
      name,
      description: desc,
      exercises
    });
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
    const detail = await API.getWorkoutDetail(workoutId);
    if (!detail) return;
    const duplicatedName = `${detail.name} (Copy)`;
    const created = await API.createWorkout({
      name: duplicatedName,
      description: detail.description || '',
      warmup_template: detail.warmup_template || 'none',
      cooldown_template: detail.cooldown_template || 'none',
      exercises: (detail.exercises || []).map(e => ({
        exercise_id: e.exercise_id,
        sets: e.sets,
        reps: e.reps,
        duration_sec: e.duration_sec,
        rest_sec: e.rest_sec,
        tempo: e.tempo,
        phase: e.phase || 'main'
      }))
    });
    showToast(`Duplicated workout: ${duplicatedName}`);
    await loadWorkouts();
    state.selectedWorkoutId = created.id;
    await loadWorkoutDetail(created.id);
    render();
  } catch (e) {
    showToast(`Error duplicating workout: ${e.message}`, true);
  }
}

async function handleDeleteWorkout(workoutId, workoutName) {
  if (!confirm(`Are you sure you want to delete "${workoutName || 'this workout'}"?`)) return;
  try {
    await API.deleteWorkout(workoutId);
    showToast(`Deleted workout: ${workoutName || ''}`);
    await loadWorkouts();
    if (state.selectedWorkoutId === workoutId) {
      state.selectedWorkoutId = state.workouts[0]?.id || null;
      if (state.selectedWorkoutId) {
        await loadWorkoutDetail(state.selectedWorkoutId);
      } else {
        state.selectedWorkoutDetail = null;
      }
    }
    render();
  } catch (e) {
    showToast(`Error deleting workout: ${e.message}`, true);
  }
}

function adjustPhaseSlotSets(phase, idx, delta) {
  const el = document.getElementById(`slot-${phase}-sets-${idx}`);
  if (!el) return;
  const defaultSets = phase === 'main' ? 3 : 1;
  let val = parseInt(el.textContent, 10) || defaultSets;
  val = Math.max(1, Math.min(10, val + delta));
  el.textContent = val;

  const warmExs = (state.selectedWorkoutDetail?.exercises || []).filter(e => e.phase === 'warmup');
  const mainExs = (state.selectedWorkoutDetail?.exercises || []).filter(e => (e.phase || 'main') === 'main');
  const coolExs = (state.selectedWorkoutDetail?.exercises || []).filter(e => e.phase === 'cooldown');

  const targetArray = phase === 'warmup' ? warmExs : (phase === 'cooldown' ? coolExs : mainExs);
  if (targetArray[idx]) {
    targetArray[idx].sets = val;
  }
}

function adjustSlotSets(idxOrPhase, deltaOrIdx, delta) {
  if (typeof idxOrPhase === 'string') {
    adjustPhaseSlotSets(idxOrPhase, deltaOrIdx, delta);
  } else {
    adjustPhaseSlotSets('main', idxOrPhase, deltaOrIdx);
  }
}

function addExerciseSlotToWorkout(phase = 'main') {
  syncWorkoutEditorFormToState();
  const sel = document.getElementById(`add-${phase}-exercise-id`) || document.getElementById('add-slot-exercise-id');
  if (!sel || !sel.value) return;
  const exId = parseInt(sel.value, 10);
  const ex = getExercise(exId);
  if (!ex) return;

  if (!state.selectedWorkoutDetail) return;
  if (!state.selectedWorkoutDetail.exercises) state.selectedWorkoutDetail.exercises = [];

  const isHold = ex.type === 'duration';
  const defaultSets = phase === 'main' ? 3 : 1;
  const defaultRest = phase === 'main' ? 90 : 15;

  const newEx = {
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_type: ex.type,
    phase: phase,
    sets: defaultSets,
    reps: isHold ? null : 10,
    duration_sec: isHold ? 30 : null,
    rest_sec: defaultRest,
    tempo: '',
    superset_group: null,
    notes: ''
  };

  const warmExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'warmup');
  const mainExs = state.selectedWorkoutDetail.exercises.filter(e => (e.phase || 'main') === 'main');
  const coolExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'cooldown');

  if (phase === 'warmup') warmExs.push(newEx);
  else if (phase === 'cooldown') coolExs.push(newEx);
  else mainExs.push(newEx);

  state.selectedWorkoutDetail.exercises = [...warmExs, ...mainExs, ...coolExs];
  render();
}

function removeWorkoutExerciseSlot(phaseOrIdx, idx) {
  syncWorkoutEditorFormToState();
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;

  if (typeof phaseOrIdx === 'number' && idx === undefined) {
    state.selectedWorkoutDetail.exercises.splice(phaseOrIdx, 1);
    render();
    return;
  }

  const phase = phaseOrIdx;
  const warmExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'warmup');
  const mainExs = state.selectedWorkoutDetail.exercises.filter(e => (e.phase || 'main') === 'main');
  const coolExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'cooldown');

  if (phase === 'warmup' && warmExs[idx]) warmExs.splice(idx, 1);
  else if (phase === 'cooldown' && coolExs[idx]) coolExs.splice(idx, 1);
  else if (phase === 'main' && mainExs[idx]) mainExs.splice(idx, 1);

  state.selectedWorkoutDetail.exercises = [...warmExs, ...mainExs, ...coolExs];
  render();
}

function moveWorkoutExerciseSlot(phase, idx, direction) {
  syncWorkoutEditorFormToState();
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;

  const warmExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'warmup');
  const mainExs = state.selectedWorkoutDetail.exercises.filter(e => (e.phase || 'main') === 'main');
  const coolExs = state.selectedWorkoutDetail.exercises.filter(e => e.phase === 'cooldown');

  const targetArray = phase === 'warmup' ? warmExs : (phase === 'cooldown' ? coolExs : mainExs);
  const targetIdx = idx + direction;

  if (targetIdx >= 0 && targetIdx < targetArray.length) {
    const temp = targetArray[idx];
    targetArray[idx] = targetArray[targetIdx];
    targetArray[targetIdx] = temp;
  }

  state.selectedWorkoutDetail.exercises = [...warmExs, ...mainExs, ...coolExs];
  render();
}

async function handleSaveWorkout(event, workoutId) {
  event.preventDefault();
  const name = (document.getElementById('edit-workout-name')?.value || '').trim();
  const desc = (document.getElementById('edit-workout-desc')?.value || '').trim();

  if (!name) {
    showToast('Workout name is required', true);
    return;
  }

  const allExercises = [];
  const phases = ['warmup', 'main', 'cooldown'];
  let currentOrder = 1;

  for (const phase of phases) {
    const phaseExs = (state.selectedWorkoutDetail?.exercises || []).filter(e => (e.phase || 'main') === phase);
    for (let idx = 0; idx < phaseExs.length; idx++) {
      const orig = phaseExs[idx];
      const setsEl = document.getElementById(`slot-${phase}-sets-${idx}`);
      const targetEl = document.getElementById(`slot-${phase}-target-${idx}`);
      const restEl = document.getElementById(`slot-${phase}-rest-${idx}`);
      const tempoEl = document.getElementById(`slot-${phase}-tempo-${idx}`);
      const ssEl = document.getElementById(`slot-${phase}-ss-${idx}`);
      const notesEl = document.getElementById(`slot-${phase}-notes-${idx}`);

      const isHold = orig.exercise_type === 'duration';
      const targetVal = targetEl ? parseInt(targetEl.value, 10) : (isHold ? 30 : 10);
      const setsVal = setsEl ? parseInt(setsEl.textContent, 10) : (orig.sets || (phase === 'main' ? 3 : 1));
      const restVal = restEl ? parseInt(restEl.value, 10) : (phase === 'main' ? 90 : 15);
      const tempoVal = tempoEl ? tempoEl.value.trim() : null;
      const ssVal = ssEl && ssEl.value ? parseInt(ssEl.value, 10) : null;
      const notesVal = notesEl ? notesEl.value.trim() : null;

      allExercises.push({
        exercise_id: orig.exercise_id,
        order_index: currentOrder++,
        phase: phase,
        sets: setsVal,
        reps: isHold ? null : targetVal,
        duration_sec: isHold ? targetVal : null,
        rest_sec: restVal,
        tempo: tempoVal || null,
        superset_group: ssVal,
        notes: notesVal || null
      });
    }
  }

  try {
    await API.updateWorkout(workoutId, {
      name,
      description: desc,
      exercises: allExercises
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

function autoSelectModalTemplates(nameVal) {
  const intent = detectSmartIntent(nameVal, []);
  const warmSel = document.getElementById('create-modal-warmup-select');
  const coolSel = document.getElementById('create-modal-cooldown-select');
  if (warmSel && (!warmSel.dataset.userTouched || warmSel.dataset.userTouched === 'false')) {
    const warmId = `warmup_${intent}`;
    if (warmSel.querySelector(`option[value="${warmId}"]`)) {
      warmSel.value = warmId;
    }
  }
  if (coolSel && (!coolSel.dataset.userTouched || coolSel.dataset.userTouched === 'false')) {
    const coolId = `cooldown_${intent}`;
    if (coolSel.querySelector(`option[value="${coolId}"]`)) {
      coolSel.value = coolId;
    }
  }
}

if (typeof window !== 'undefined') {
  window.applyBuilderStarterTemplate = applyBuilderStarterTemplate;
  window.clearBuilderPhase = clearBuilderPhase;
  window.adjustPhaseSlotSets = adjustPhaseSlotSets;
  window.adjustSlotSets = adjustSlotSets;
  window.addExerciseSlotToWorkout = addExerciseSlotToWorkout;
  window.removeWorkoutExerciseSlot = removeWorkoutExerciseSlot;
  window.moveWorkoutExerciseSlot = moveWorkoutExerciseSlot;
  window.handleSaveWorkout = handleSaveWorkout;
  window.handleCreateWorkout = handleCreateWorkout;
  window.handleDuplicateWorkout = handleDuplicateWorkout;
  window.handleDeleteWorkout = handleDeleteWorkout;
  window.selectWorkoutForEditing = selectWorkoutForEditing;
  window.openCreateWorkoutModal = openCreateWorkoutModal;
  window.closeCreateWorkoutModal = closeCreateWorkoutModal;
  window.autoSelectModalTemplates = autoSelectModalTemplates;
  window.detectSmartIntent = detectSmartIntent;
}


