/**
 * CalistheniX — Custom Splits & Workouts Library Builder View
 */

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

// ─── Exercise Library Picker & Routine Assigner Modal Renderers ─────────────

function renderExercisePickerModalHtml() {
  if (!state.showExercisePickerModal) return '';
  const phase = state.exercisePickerPhase || 'main';
  const phaseTitle = phase === 'warmup' ? 'Warm-up & Mobility' : (phase === 'cooldown' ? 'Cool-down & Recovery' : 'Main Workout');
  const filterChips = ['All', 'In Profile', 'Push', 'Pull', 'Legs', 'Core', 'Skill', 'Isometric'];

  return `
    <div class="split-modal-backdrop" onclick="if(event.target === this) closeExerciseLibraryPicker()">
      <div class="split-modal-container exercise-picker-modal-container">
        <div class="split-modal-header">
          <div>
            <div class="split-modal-title-row">
              <h2 class="split-modal-title">Exercise Library Catalog</h2>
              <span class="badge ${phase === 'warmup' ? 'badge-prep' : (phase === 'cooldown' ? 'badge-recover' : 'badge-train')}" style="font-size:11px;">
                Adding to ${phaseTitle}
              </span>
            </div>
            <p class="split-modal-subtitle">Pick from 60+ movements with progression paths and muscle targets.</p>
          </div>
          <button class="split-modal-close-btn" type="button" onclick="closeExerciseLibraryPicker()" title="Close">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <div class="exercise-picker-search-bar" style="padding:16px 20px 8px 20px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <div class="library-search-box" style="margin-bottom:10px;">
            <span class="library-search-icon">
              <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input 
              type="text" 
              id="exercise-picker-search-input"
              class="library-search-input" 
              placeholder="Search exercises (e.g. Dips, Pull-up, Planche, Squats, Muscle-up)..." 
              value="${escapeHtml(state.exercisePickerSearch || '')}" 
              oninput="handlePickerSearch(this.value)"
              autofocus
            />
          </div>

          <div class="library-filter-chips" style="padding-bottom:6px; display:flex; gap:6px; overflow-x:auto;">
            ${filterChips.map(chip => `
              <button 
                type="button"
                class="library-chip ${(state.exercisePickerFilter || 'All') === chip ? 'active' : ''}" 
                onclick="setExercisePickerFilter('${chip}')"
              >
                ${chip}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="split-modal-body" style="max-height:55vh; overflow-y:auto; padding:16px 20px;">
          <div class="exercise-picker-cards-grid" id="exercise-picker-cards-grid">
            ${renderExercisePickerGridHtml()}
          </div>
        </div>

        <div class="split-modal-footer" style="justify-content:space-between; align-items:center;">
          <div style="font-size:12px; color:var(--text-muted);">
            Tap <strong>+ Add</strong> to instantly insert movement into <strong>${phaseTitle}</strong>
          </div>
          <button type="button" class="btn btn-secondary" onclick="closeExerciseLibraryPicker()">Done</button>
        </div>
      </div>
    </div>
  `;
}

function renderAssignRoutineToDaysModalHtml(currentSplit) {
  if (!state.showAssignDaysModal || !state.assignRoutineWorkoutId) return '';
  const workout = state.workouts.find(w => w.id === state.assignRoutineWorkoutId) || state.selectedWorkoutDetail;
  const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentSchedule = currentSplit ? (currentSplit.schedule || []) : [];

  return `
    <div class="split-modal-backdrop" onclick="if(event.target === this) closeAssignRoutineToDaysModal()">
      <div class="split-modal-container" style="max-width:520px;">
        <div class="split-modal-header">
          <div>
            <h2 class="split-modal-title">Assign to Weekly Schedule</h2>
            <p class="split-modal-subtitle">Assign "<strong>${workout ? escapeHtml(workout.name) : 'Routine'}</strong>" to days of the week in <em>${currentSplit ? escapeHtml(currentSplit.name) : 'Active Split'}</em>.</p>
          </div>
          <button class="split-modal-close-btn" type="button" onclick="closeAssignRoutineToDaysModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <form onsubmit="handleSaveAssignRoutineToDays(event, ${workout ? workout.id : 0})">
          <div class="split-modal-body">
            <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:14px;">
              Check the days you want to run this routine:
            </div>

            <div class="assign-days-checkbox-grid">
              ${[0, 1, 2, 3, 4, 5, 6].map(dow => {
                const dayEntry = currentSchedule.find(d => d.day_of_week === dow);
                const isAssignedToThis = dayEntry && dayEntry.workout_id === workout?.id;
                const currentName = (dayEntry && dayEntry.day_type === 'workout') 
                  ? (dayEntry.workout_name || 'Other Workout') 
                  : 'Rest Day';

                return `
                  <label class="assign-day-chip ${isAssignedToThis ? 'is-checked' : ''}">
                    <input type="checkbox" name="assign_day_${dow}" value="1" ${isAssignedToThis ? 'checked' : ''} onchange="this.parentElement.classList.toggle('is-checked', this.checked)">
                    <div class="assign-day-chip-content">
                      <div class="assign-day-chip-title">
                        <strong>${DAY_SHORT_MON[dow]}</strong>
                        <span>${DAY_NAMES_MON[dow]}</span>
                      </div>
                      <div class="assign-day-chip-sub">
                        ${isAssignedToThis ? '<span style="color:#FF5D5D; font-weight:600;">Assigned here</span>' : `<span style="color:var(--text-dim);">${currentName}</span>`}
                      </div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="split-modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeAssignRoutineToDaysModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Apply Schedule</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ─── Screen 2: My Split & Weekly Planner ────────────────────────────────────

function renderSplitView() {
  const currentTab = state.splitSubTab || 'schedule'; // 'schedule' | 'workouts'
  const currentSplit = state.selectedSplitDetail || state.splits.find(s => s.id === state.selectedSplitId) || state.splits[0];

  const exercisePickerModalHtml = renderExercisePickerModalHtml();
  const assignDaysModalHtml = renderAssignRoutineToDaysModalHtml(currentSplit);

  if (!currentSplit) {
    return `
      <div class="view-header">
        <h1 class="view-title">My Training Split</h1>
        <p class="view-subtitle">Create your first training split and configure your weekly schedule.</p>
      </div>
      <div class="card" style="padding:32px; text-align:center;">
        <button class="btn btn-primary" onclick="openCreateSplitModal()">+ Create Training Split</button>
      </div>
      ${exercisePickerModalHtml}
      ${assignDaysModalHtml}`;
  }

  const isActive = currentSplit.is_active === 1;

  // Split tabs bar
  const splitTabsHtml = state.splits.map(s => `
    <button class="split-tab-btn ${s.id === currentSplit.id ? 'active' : ''}" 
            onclick="handleSavedSplitCardClick(${s.id}, event)" 
            ondblclick="openEditSplitModal(${s.id})"
            title="Click to select · Double click to edit">
      <span>${s.name}</span>
      ${s.id === currentSplit.id ? '<span class="schedule-today-pill" style="font-size:9px; padding:1px 5px;">Active</span>' : ''}
    </button>
  `).join('');

  // Sub-tabs: 7-Day Weekly Schedule vs Routines & Exercise Library Builder
  const subTabsHtml = `
    <div class="split-subtabs-nav">
      <button class="split-subtab-btn ${currentTab === 'schedule' ? 'active' : ''}" onclick="setSplitSubTab('schedule')">
        ${renderIcon('calendar', 'cx-icon cx-icon-inline')} 7-Day Weekly Schedule
      </button>
      <button class="split-subtab-btn ${currentTab === 'workouts' ? 'active' : ''}" onclick="setSplitSubTab('workouts')">
        ${renderIcon('dumbbell', 'cx-icon cx-icon-inline')} Routines & Exercise Library (${state.workouts.length})
      </button>
    </div>`;

  if (currentTab === 'workouts') {
    return `
      <div class="split-screen">
        <div class="view-header">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
            <div>
              <h1 class="view-title">Routines & Exercise Library</h1>
              <p class="view-subtitle">Build custom calisthenics routines with the exercise library, then assign them to week days.</p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="switchView('library')">${renderIcon('bookOpen', 'cx-icon cx-icon-xs cx-icon-inline')} Movement Encyclopedia</button>
              <button class="btn btn-primary btn-sm" onclick="openCreateWorkoutModal()">+ New Routine</button>
            </div>
          </div>
        </div>

        ${subTabsHtml}
        ${renderEditViewInner()}
        ${exercisePickerModalHtml}
        ${assignDaysModalHtml}
      </div>`;
  }

  // Schedule Grid (7 days Monday-Sunday, Section 12 Spec)
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const scheduleDays = currentSplit.schedule || [];

  // Monday of current calendar week
  const now = new Date();
  const currentDow = (now.getDay() + 6) % 7;
  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() - currentDow);
  mondayThisWeek.setHours(0, 0, 0, 0);

  const completedDowSet = new Set();
  (state.workoutSessions || []).forEach(s => {
    const dDate = new Date(s.completed_at || s.started_at);
    if (dDate >= mondayThisWeek) {
      completedDowSet.add((dDate.getDay() + 6) % 7);
    }
  });

  const dayCardsHtml = scheduleDays.map((d, idx) => {
    const isToday = d.day_of_week === todayDow;
    const isPast = d.day_of_week < todayDow;
    const isWorkout = d.day_type === 'workout' && d.workout_id;
    const hasCompleted = completedDowSet.has(d.day_of_week);

    let statusType = 'upcoming';
    let statusTitle = 'Upcoming';
    if (hasCompleted) {
      statusType = 'done';
      statusTitle = 'Completed this week';
    } else if (isToday) {
      statusType = 'today';
      statusTitle = "Today's Target";
    } else if (!isWorkout) {
      statusType = 'rest';
      statusTitle = 'Rest & Recovery';
    } else if (isPast) {
      statusType = 'missed';
      statusTitle = 'Rest / Missed';
    }

    const typeBadge = isWorkout
      ? `<span class="badge badge-reps">Workout</span>`
      : `<span class="badge badge-hold">Rest Day</span>`;

    const titleStr = isWorkout ? (d.workout_name || 'Workout') : 'Rest & Recovery';

    let actionBtnHtml = '';
    if (isToday) {
      if (isWorkout) {
        actionBtnHtml = `<button class="btn-start-today" onclick="startWorkoutFromId(${d.workout_id})">${renderIcon('zap', 'cx-icon cx-icon-xs cx-icon-inline')} Start Today</button>`;
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
          <div class="schedule-day-name-wrap">
            <span class="schedule-day-name">${d.day_name}</span>
            ${isToday ? '<span class="schedule-today-pill">TODAY</span>' : ''}
          </div>
          <div class="schedule-header-right">
            ${typeBadge}
            <span class="schedule-status-dot status-${statusType}" title="${statusTitle}"></span>
          </div>
        </div>
        <div class="schedule-workout-info">
          <div class="schedule-workout-title">${titleStr}</div>
        </div>
        <div class="schedule-day-actions">
          ${actionBtnHtml}
        </div>
      </div>`;
  }).join('');

  // Day editor modal (Desktop) & Bottom Sheet (Mobile)
  let dayEditorHtml = '';
  let dayEditorMobileSheetHtml = '';
  if (state.editingDayIndex !== null) {
    const editingDay = scheduleDays.find(d => d.day_of_week === state.editingDayIndex) || { day_of_week: state.editingDayIndex, day_name: DAY_NAMES_MON[state.editingDayIndex] || DAY_NAMES[state.editingDayIndex], day_type: 'workout' };
    const workoutOpts = state.workouts.map(w => `
      <option value="${w.id}" ${w.id === editingDay.workout_id ? 'selected' : ''}>
        ${w.name} (${w.exercise_count || 0} exercises)
      </option>
    `).join('');

    // Desktop Centered Modal
    dayEditorHtml = `
      <div class="day-editor-backdrop desktop-day-editor-modal" onclick="if(event.target === this) closeDayEditor()">
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
                <button type="button" class="btn btn-secondary btn-sm" onclick="closeDayEditor(); setSplitSubTab('workouts'); openCreateWorkoutModal();">+ 📚 Build New Routine</button>
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

    // Mobile Native iOS Bottom Sheet
    const isCurrentRest = editingDay.day_type === 'rest' || !editingDay.workout_id;
    dayEditorMobileSheetHtml = `
      <div id="split-bottom-sheet-backdrop" class="split-sheet-backdrop mobile-day-editor-sheet" onclick="if(event.target === this) closeMobileBottomSheet()">
        <div id="split-bottom-sheet" class="split-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-day-title">
          <div class="split-sheet-drag-handle-wrap" id="split-sheet-drag-handle" onclick="closeMobileBottomSheet()">
            <div class="split-sheet-drag-handle"></div>
          </div>

          <div class="split-sheet-header">
            <div>
              <h2 id="sheet-day-title" class="split-sheet-title">${editingDay.day_name}</h2>
              <p class="split-sheet-subtitle">Select assigned workout routine or rest day</p>
            </div>
            <button class="split-sheet-close-btn" onclick="closeMobileBottomSheet()" aria-label="Close">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="split-sheet-body">
            <!-- Rest Day Option -->
            <div class="split-sheet-option ${isCurrentRest ? 'is-selected' : ''}" 
                 onclick="assignMobileScheduleDay(${currentSplit.id}, ${editingDay.day_of_week}, 'rest', null)"
                 role="button" tabindex="0">
              <div class="split-sheet-opt-left">
                <div class="split-sheet-opt-icon icon-rest">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
                <div class="split-sheet-opt-info">
                  <span class="split-sheet-opt-name">Rest Day</span>
                  <span class="split-sheet-opt-desc">Rest & Recovery</span>
                </div>
              </div>
              <div class="split-sheet-opt-right">
                ${isCurrentRest 
                  ? `<span class="split-sheet-check-icon">
                       <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF5D5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                     </span>`
                  : `<span class="split-sheet-arrow-icon">
                       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                     </span>`
                }
              </div>
            </div>

            <!-- Saved Workouts Options -->
            ${state.workouts.map(w => {
              const isSelected = !isCurrentRest && editingDay.workout_id === w.id;
              return `
                <div class="split-sheet-option ${isSelected ? 'is-selected' : ''}"
                     onclick="assignMobileScheduleDay(${currentSplit.id}, ${editingDay.day_of_week}, 'workout', ${w.id})"
                     role="button" tabindex="0">
                  <div class="split-sheet-opt-left">
                    <div class="split-sheet-opt-icon icon-workout">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M2 9v6"/><path d="M22 9v6"/><path d="M6 12h12"/></svg>
                    </div>
                    <div class="split-sheet-opt-info">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="split-sheet-opt-name">${w.name}</span>
                        <button type="button" class="split-sheet-edit-inline-btn" title="Customize Routine with Exercise Library" onclick="event.stopPropagation(); selectWorkoutAndEditRoutine(${w.id});">
                          ✏️ Edit
                        </button>
                      </div>
                      <span class="split-sheet-opt-desc">${w.exercise_count || 0} exercises</span>
                    </div>
                  </div>
                  <div class="split-sheet-opt-right">
                    ${isSelected 
                      ? `<span class="split-sheet-check-icon">
                           <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF5D5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                         </span>`
                      : `<span class="split-sheet-arrow-icon">
                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                         </span>`
                    }
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Secondary Action: + Build New Routine -->
            <button class="split-sheet-new-workout-btn" onclick="closeMobileBottomSheet(); openCreateWorkoutModal();">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ 📚 Build New Routine from Exercise Library</span>
            </button>
          </div>
        </div>
      </div>
    `;

    setTimeout(initBottomSheetTouch, 0);
  }

  // Edit Split Modal (Window/Screen)
  let editSplitModalHtml = '';
  if (state.showEditSplitModal && state.editingSplitId) {
    const editingSplit = (state.selectedSplitDetail && state.selectedSplitDetail.id === state.editingSplitId)
      ? state.selectedSplitDetail
      : (state.splits.find(s => s.id === state.editingSplitId) || currentSplit);

    const editScheduleDays = editingSplit.schedule || [];
    const isEditSplitActive = editingSplit.is_active === 1;

    editSplitModalHtml = `
      <div class="split-modal-backdrop" id="split-edit-screen" onclick="if(event.target === this) closeEditSplitModal()">
        <div class="split-modal-container">
          <div class="split-modal-header">
            <div style="display:flex; align-items:center; gap:12px;">
              <button class="settings-back-btn split-back-btn" type="button" onclick="closeEditSplitModal()" title="Back" aria-label="Back">
                ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
              </button>
              <div>
                <div class="split-modal-title-row">
                  <h2 class="split-modal-title">Edit Training Split</h2>
                </div>
                <p class="split-modal-subtitle">Update split name and 7-day weekly schedule.</p>
              </div>
            </div>
            <button class="split-modal-close-btn desktop-only-close-btn" type="button" onclick="closeEditSplitModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
          </div>

          <form onsubmit="handleUpdateSplit(event, ${editingSplit.id})">
            <div class="split-modal-body">
              <div class="form-group" style="margin-bottom:18px;">
                <label class="form-label">Split Name</label>
                <input class="form-input" type="text" name="name" id="edit-split-name" value="${escapeHtml(editingSplit.name || '')}" required placeholder="e.g. 5-Day PPL Split">
              </div>

              <div class="split-modal-section-title">7-DAY WEEKLY SCHEDULE (MONDAY – SUNDAY)</div>
              <div class="split-schedule-builder-list">
                ${renderModalScheduleRows('edit', editScheduleDays, state.workouts)}
              </div>

              ${renderModalSplitRoutinesSection(editScheduleDays)}
            </div>

            <div class="split-modal-footer">
              <div>
                ${state.splits.length > 1 
                  ? `<button type="button" class="btn btn-danger btn-sm" onclick="closeEditSplitModal(); handleDeleteSplit(${editingSplit.id}, '${editingSplit.name}')">${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Delete Split</button>` 
                  : ''}
              </div>
              <div style="display:flex; gap:10px;">
                <button type="button" class="btn btn-secondary" onclick="closeEditSplitModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Save Changes</button>
              </div>
            </div>
          </form>
        </div>
      </div>`;
  }

  // Create Split Modal / Screen
  let createSplitModalHtml = '';
  if (state.showCreateSplitModal) {
    createSplitModalHtml = `
      <div class="split-modal-backdrop" id="split-create-screen" onclick="if(event.target === this) closeCreateSplitModal()">
        <div class="split-modal-container">
          <div class="split-modal-header">
            <div style="display:flex; align-items:center; gap:12px;">
              <button class="settings-back-btn split-back-btn" type="button" onclick="closeCreateSplitModal()" title="Back" aria-label="Back">
                ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
              </button>
              <div>
                <h2 class="split-modal-title">Create New Training Split</h2>
                <p class="split-modal-subtitle">Pick a starter preset or customize your 7-day weekly schedule from scratch.</p>
              </div>
            </div>
            <button class="split-modal-close-btn desktop-only-close-btn" type="button" onclick="closeCreateSplitModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
          </div>

          <form onsubmit="handleCreateSplit(event)">
            <div class="split-modal-body">
              <div class="split-preset-section">
                <label class="form-label" style="margin-bottom:8px;">Quick Starter Templates</label>
                <div class="split-preset-chips-grid">
                  <button type="button" class="split-preset-chip active" data-preset="5day_ppl" onclick="applyCreateSplitPreset('5day_ppl')">
                    <strong>5-Day PPL</strong>
                    <span>Push / Pull / Legs + 2 Rest</span>
                  </button>
                  <button type="button" class="split-preset-chip" data-preset="4day_ul" onclick="applyCreateSplitPreset('4day_ul')">
                    <strong>4-Day Upper/Lower</strong>
                    <span>2 Upper + 2 Lower + 3 Rest</span>
                  </button>
                  <button type="button" class="split-preset-chip" data-preset="3day_fb" onclick="applyCreateSplitPreset('3day_fb')">
                    <strong>3-Day Full Body</strong>
                    <span>Alternating Days + 4 Rest</span>
                  </button>
                  <button type="button" class="split-preset-chip" data-preset="6day_ppl" onclick="applyCreateSplitPreset('6day_ppl')">
                    <strong>6-Day PPL</strong>
                    <span>High Volume + 1 Rest</span>
                  </button>
                  <button type="button" class="split-preset-chip" data-preset="custom" onclick="applyCreateSplitPreset('custom')">
                    <strong>Custom / Blank</strong>
                    <span>Build from scratch</span>
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:18px;">
                <label class="form-label">Split Name</label>
                <input class="form-input" type="text" name="name" id="create-split-name" value="Aesthetic 5-Day PPL" required placeholder="e.g. Upper / Lower 4-Day">
              </div>

              <div class="split-modal-section-title">7-DAY WEEKLY SCHEDULE (MONDAY – SUNDAY)</div>
              <div class="split-schedule-builder-list">
                ${renderModalScheduleRows('create', [], state.workouts)}
              </div>

              ${renderModalSplitRoutinesSection([])}
            </div>

            <div class="split-modal-footer">
              <div></div>
              <div style="display:flex; gap:10px;">
                <button type="button" class="btn btn-secondary" onclick="closeCreateSplitModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${renderIcon('plus', 'cx-icon cx-icon-xs cx-icon-inline')} Create Split</button>
              </div>
            </div>
          </form>
        </div>
      </div>`;
  }

  const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Mobile Week Schedule Rows (Monday -> Sunday)
  const dayCardsMobileHtml = [0, 1, 2, 3, 4, 5, 6].map(dow => {
    const d = scheduleDays.find(sd => sd.day_of_week === dow) || {
      day_of_week: dow,
      day_name: DAY_NAMES_MON[dow],
      day_type: (dow === 5 || dow === 6) ? 'rest' : 'workout',
      workout_name: (dow === 5 || dow === 6) ? null : 'Workout'
    };
    const isToday = d.day_of_week === todayDow;
    const isWorkout = d.day_type === 'workout' && d.workout_id;
    const workoutName = isWorkout ? (d.workout_name || 'Workout') : 'Rest & Recovery';

    return `
      <div class="split-mobile-day-row ${isToday ? 'is-today' : ''} ${!isWorkout ? 'is-rest' : ''}" onclick="openDayEditor(${d.day_of_week})">
        <div class="split-mobile-day-left">
          <span class="split-mobile-day-name">${d.day_name}</span>
          ${isToday ? '<span class="split-mobile-today-badge">TODAY</span>' : ''}
        </div>
        <div class="split-mobile-day-right">
          <span class="split-mobile-workout-name ${!isWorkout ? 'is-rest-label' : ''}">${workoutName}</span>
          <span class="split-mobile-chevron">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Mobile Saved Splits Cards List with Click (Select) & Double-Click/Tap (Edit)
  const savedSplitsMobileHtml = state.splits.map(s => {
    const isSplitActive = s.id === currentSplit.id;
    const sDays = s.schedule || [];
    const workoutCount = sDays.filter(d => d.day_type === 'workout' && d.workout_id).length;
    let shortDesc = '';
    if (s.name.includes('5-Day')) {
      shortDesc = '5-Day PPL Split';
    } else if (s.name.includes('6-Day') || s.name.includes('PPL')) {
      shortDesc = '6 workouts / week';
    } else if (workoutCount > 0) {
      shortDesc = `${workoutCount} workouts / week`;
    } else if (s.description) {
      shortDesc = s.description.split('.')[0];
    } else {
      shortDesc = 'Custom training split';
    }

    return `
      <div class="split-mobile-saved-card ${isSplitActive ? 'is-active-split' : ''}" 
           onclick="handleSavedSplitCardClick(${s.id}, event)" 
           ondblclick="openEditSplitModal(${s.id})"
           title="Tap to select · Double-tap to edit">
        <div class="split-mobile-saved-info">
          <div class="split-mobile-saved-name">${s.name}</div>
          <div class="split-mobile-saved-desc">${shortDesc}</div>
        </div>
        <div class="split-mobile-saved-action">
          <button class="split-mobile-edit-btn" title="Edit Split" type="button" onclick="event.stopPropagation(); openEditSplitModal(${s.id})">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          ${isSplitActive 
            ? `<span class="split-mobile-active-check" title="Active Split">
                 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF5D5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
               </span>` 
            : `<span class="split-mobile-inactive-chevron">
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
               </span>`
          }
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="split-screen">
      <!-- Mobile Split Layout (< 1024px) -->
      <div class="split-mobile-view">
        <div class="split-mobile-header">
          <h1 class="split-mobile-title">My Split</h1>
          <p class="split-mobile-subtitle">Your weekly training plan</p>
        </div>

        <div class="split-mobile-section">
          <div class="split-mobile-section-header">
            <span class="split-mobile-section-title">WEEK SCHEDULE</span>
          </div>
          <div class="split-mobile-schedule-list">
            ${dayCardsMobileHtml}
          </div>
        </div>

        <div class="split-mobile-section" style="margin-top:28px;">
          <div class="split-mobile-section-header">
            <span class="split-mobile-section-title">SAVED SPLITS</span>
            <button class="btn-mobile-new-split" onclick="openCreateSplitModal()">+ New Split</button>
          </div>
          <div class="split-mobile-saved-list">
            ${savedSplitsMobileHtml}
          </div>
        </div>
      </div>

      <!-- Desktop Split Layout (>= 1024px) -->
      <div class="split-desktop-view">
        <div class="view-header">
          <div class="split-hub-header">
            <div>
              <h1 class="view-title">My Training Split</h1>
              <p class="view-subtitle">7-Day weekly planner from Monday to Sunday.</p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              ${!isActive ? `<button class="btn btn-secondary btn-sm" onclick="activateSplit(${currentSplit.id})">${renderIcon('star', 'cx-icon cx-icon-xs cx-icon-inline cx-gold')} Set as Active Split</button>` : `<span class="split-active-badge">${renderIcon('star', 'cx-icon cx-icon-xs cx-icon-inline')} Active Program</span>`}
              <button class="btn-new-split" onclick="openCreateSplitModal()">${renderIcon('plus', 'cx-icon cx-icon-xs cx-icon-inline')} + New Split</button>
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
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="openEditSplitModal(${currentSplit.id})">${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Edit Split</button>
              ${state.splits.length > 1 ? `<button class="btn btn-danger btn-sm" onclick="handleDeleteSplit(${currentSplit.id}, '${currentSplit.name}')">Delete Split</button>` : ''}
            </div>
          </div>
          <div class="card-body">
            <p style="color:var(--text-muted); font-size:13px; margin:0;">
              ${currentSplit.description || 'Custom weekly split configuration.'}
              ${isActive ? ' Currently powering the Home screen.' : ''}
            </p>
          </div>
        </div>
      </div>

      ${dayEditorHtml}
      ${dayEditorMobileSheetHtml}
      ${editSplitModalHtml}
      ${createSplitModalHtml}
      ${renderRoutineEditorModalHtml()}
      ${renderCreateWorkoutModalHtml()}
      ${renderAddExerciseSheetHtml()}
      ${exercisePickerModalHtml || ''}
      ${assignDaysModalHtml || ''}
      <div id="modal-day-picker-root"></div>
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

function toggleBuilderSection(phase) {
  syncWorkoutEditorFormToState();
  if (!state.builderSections) {
    state.builderSections = { warmup: false, main: true, cooldown: false };
  }
  state.builderSections[phase] = !state.builderSections[phase];
  render();
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
      <button type="button" class="builder-icon-btn btn-remove-slot" title="Remove" onclick="removeWorkoutExerciseSlot('${phase}', ${idx})">
        ${renderIcon('x', 'cx-icon cx-icon-xs')}
      </button>
    </div>
  `;

  let extraFieldsHtml = '';
  if (phase === 'main') {
    extraFieldsHtml = `
      <details style="margin-top:6px;">
        <summary style="font-size:11.5px; color:var(--phase-train, #FF5D5D); cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
          Advanced Parameters (Tempo, Superset, Notes) ${renderIcon('chevronDown', 'cx-icon cx-icon-xs')}
        </summary>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-top:8px;">
          <div class="form-group">
            <label class="form-label" style="font-size:10.5px;">Tempo <span class="opt">opt</span></label>
            <input class="form-input mono" type="text" id="slot-${phase}-tempo-${idx}" value="${ex.tempo || ''}" placeholder="3010" style="padding:5px 8px; font-size:12.5px;">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10.5px;">Superset # <span class="opt">opt</span></label>
            <input class="form-input mono" type="number" id="slot-${phase}-ss-${idx}" value="${ex.superset_group || ''}" placeholder="1, 2" min="1" style="padding:5px 8px; font-size:12.5px;">
          </div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <label class="form-label" style="font-size:10.5px;">Coaching Notes <span class="opt">opt</span></label>
          <input class="form-input" type="text" id="slot-${phase}-notes-${idx}" value="${ex.notes || ''}" placeholder="e.g. Full protraction at top, core braced" style="font-size:12px; padding:6px 10px;">
        </div>
      </details>
    `;
  } else {
    extraFieldsHtml = `
      <div class="form-group" style="margin-top:4px;">
        <input class="form-input" type="text" id="slot-${phase}-notes-${idx}" value="${ex.notes || ''}" placeholder="Coaching cue (e.g. Focus on joint lubrication / deep nasal breath)" style="font-size:11.5px; padding:4px 8px;">
      </div>
    `;
  }

  return `
    <div class="builder-slot-card" id="builder-slot-${phase}-${idx}">
      <div class="builder-slot-header">
        <div class="builder-slot-title-wrap">
          <span class="builder-drag-handle" title="Drag to reorder">${renderIcon('grip', 'cx-icon cx-icon-xs')}</span>
          <span class="builder-slot-idx">#${String(idx + 1).padStart(2, '0')}</span>
          <span class="builder-slot-name">${ex.exercise_name}</span>
          <span class="builder-slot-type-badge">${isHold ? 'Duration' : 'Reps'}</span>
        </div>
        ${controlsHtml}
      </div>

      <div class="builder-slot-params-row">
        <div class="builder-param-item">
          <span class="builder-param-label">Sets</span>
          <div class="stepper-group">
            <button type="button" class="stepper-btn" onclick="adjustPhaseSlotSets('${phase}', ${idx}, -1)">-</button>
            <span class="stepper-val mono" id="slot-${phase}-sets-${idx}">${setsVal}</span>
            <button type="button" class="stepper-btn" onclick="adjustPhaseSlotSets('${phase}', ${idx}, 1)">+</button>
          </div>
        </div>

        <div class="builder-param-item">
          <span class="builder-param-label">${isHold ? 'Hold (sec)' : 'Target Reps'}</span>
          <input class="builder-param-input" type="number" id="slot-${phase}-target-${idx}" value="${targetVal}" min="1">
        </div>

        <div class="builder-param-item">
          <span class="builder-param-label">Rest (sec)</span>
          <input class="builder-param-input" type="number" id="slot-${phase}-rest-${idx}" value="${restVal}" min="0" step="5">
        </div>
      </div>

      ${extraFieldsHtml}
    </div>
  `;
}

function renderPhaseBuilderSection(phase, exercises) {
  if (!state.builderSections) {
    state.builderSections = { warmup: false, main: true, cooldown: false };
  }
  const isExpanded = !!state.builderSections[phase];

  const isPrep = phase === 'warmup';
  const isTrain = phase === 'main';
  const isRecover = phase === 'cooldown';

  const badgeClass = isPrep ? 'badge-prep' : (isTrain ? 'badge-train' : 'badge-recover');
  const badgeLabel = isPrep ? 'PREP' : (isTrain ? 'TRAIN' : 'RECOVER');
  const title = isPrep ? 'Warm-up & Mobility' : (isTrain ? 'Main Workout Progressions' : 'Cool-down & Stretching');
  const phaseIcon = isPrep
    ? renderIcon('flame', 'cx-icon cx-icon-sm')
    : (isTrain
        ? renderIcon('zap', 'cx-icon cx-icon-sm')
        : renderIcon('sparkles', 'cx-icon cx-icon-sm'));

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
        <button type="button" class="builder-template-chip ${isRec ? 'is-recommended' : ''}" onclick="event.stopPropagation(); applyBuilderStarterTemplate('${phase}', '${t.id}')" title="${t.description}">
          ${isRec ? renderIcon('sparkles', 'cx-icon cx-icon-xs cx-icon-inline') : ''}
          ${t.name}
          ${isRec ? '<span class="builder-rec-badge">Intent Match</span>' : ''}
        </button>
      `;
    }).join('');

    templatesHtml = `
      <div style="margin-top:10px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">
            Intent-Based Starter Templates:
          </span>
          <span style="font-size:11px; color:#FF8A3D;">
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
      <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:11px;" onclick="event.stopPropagation(); clearBuilderPhase('${phase}')">
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
    <div class="builder-accordion-panel phase-${isPrep ? 'prep' : (isTrain ? 'train' : 'recover')} ${isExpanded ? 'is-expanded' : ''}">
      <div class="builder-accordion-header" onclick="toggleBuilderSection('${phase}')" role="button" aria-expanded="${isExpanded}">
        <div class="builder-header-left">
          <div class="builder-phase-icon-wrap">
            ${phaseIcon}
          </div>
          <span class="builder-phase-badge ${badgeClass}">${badgeLabel}</span>
          <h4 class="builder-phase-title">${title}</h4>
          <span class="builder-phase-count-badge">${countLabel}</span>
        </div>
        <div class="builder-header-right">
          ${actionsHtml}
          <span class="builder-accordion-chevron">${renderIcon('chevronDown', 'cx-icon cx-icon-sm')}</span>
        </div>
      </div>

      <div class="builder-accordion-body">
        <p class="builder-phase-sub">${sub}</p>
        ${templatesHtml}

        <div style="margin-top:14px;">
          ${slotsHtml}
        </div>

        <div class="builder-add-row" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn btn-primary btn-sm" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;" onclick="openAddExerciseSheet('${phase}')">
            ${renderIcon('plus', 'cx-icon cx-icon-xs cx-icon-inline')} + Add Exercise
          </button>
          <div style="display:inline-flex; gap:6px; align-items:center; flex:1; min-width:200px;">
            <select class="form-input form-select" id="add-${phase}-exercise-id" style="flex:1; min-width:140px; font-size:12px; padding:6px 10px;">
              ${selectOpts}
            </select>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addExerciseSlotToWorkout('${phase}')">Quick Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditViewInner() {
  const selectedWorkout = state.selectedWorkoutDetail || state.workouts.find(w => w.id === state.selectedWorkoutId) || state.workouts[0];

  const workoutsListHtml = state.workouts.map(w => `
    <div class="workout-summary-card ${selectedWorkout && selectedWorkout.id === w.id ? 'is-selected' : ''}">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:8px;">
          <h3 style="font-size:17px; font-weight:700; color:#F2F2F0; margin:0;">${w.name}</h3>
          <span class="badge badge-reps">${w.exercise_count || 0} exercises</span>
        </div>
        <p style="color:#8A8A93; font-size:12.5px; margin:0; line-height:1.4;">${w.description || 'Reusable workout template'}</p>
        <div class="workout-phase-counts">
          <span class="phase-count-pill">Total Sets: <strong>${w.total_sets || 0}</strong></span>
          <span class="phase-count-pill"><span class="phase-dot dot-prep"></span>Prep: <strong>${w.warmup_sets || 0}</strong></span>
          <span class="phase-count-pill"><span class="phase-dot dot-train"></span>Train: <strong>${w.main_sets || w.total_sets || 0}</strong></span>
          <span class="phase-count-pill"><span class="phase-dot dot-recover"></span>Recover: <strong>${w.cooldown_sets || 0}</strong></span>
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="selectWorkoutForEditing(${w.id})">${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="openAssignRoutineToDaysModal(${w.id})">${renderIcon('calendar', 'cx-icon cx-icon-xs cx-icon-inline')} Assign to Week</button>
        <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${w.id})">${renderIcon('copy', 'cx-icon cx-icon-xs cx-icon-inline')} Duplicate</button>
        <button class="btn-test-run" onclick="startWorkoutFromId(${w.id})">${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Test Run</button>
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
      <div class="card" style="margin-top:28px;">
        <div class="card-header" style="justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="card-title">Editing Routine: ${selectedWorkout.name}</span>
            <button type="button" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px;" onclick="openAssignRoutineToDaysModal(${selectedWorkout.id})">
              ${renderIcon('calendar', 'cx-icon cx-icon-xs cx-icon-inline')} 📅 Assign to Week Days
            </button>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="handleDuplicateWorkout(${selectedWorkout.id})">${renderIcon('copy', 'cx-icon cx-icon-xs cx-icon-inline')} Duplicate</button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteWorkout(${selectedWorkout.id}, '${selectedWorkout.name}')">${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Delete</button>
          </div>
        </div>

        <div class="card-body" style="padding-bottom:0;">
          <form onsubmit="handleSaveWorkout(event, ${selectedWorkout.id})">
            <div class="form-row" style="margin-bottom:20px;">
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

            <hr class="builder-section-divider divider-prep" />

            <!-- TRAIN: Main Workout Section -->
            ${renderPhaseBuilderSection('main', exercises)}

            <hr class="builder-section-divider divider-train" />

            <!-- RECOVER: Cool-down Section -->
            ${renderPhaseBuilderSection('cooldown', exercises)}

            <hr class="builder-section-divider divider-recover" />

            <!-- Workout Target Muscle Activation Map -->
            <div class="builder-muscle-map-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:13px; font-weight:800; color:#F2F2F0; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; gap:8px;">
                  ${renderIcon('target', 'cx-icon cx-icon-xs cx-icon-inline')} Workout Target Muscle Activation Map
                </span>
                <span class="badge badge-reps" style="font-size:11px;">${workoutMuscles.primary.length} Primary Targets</span>
              </div>
              ${(typeof window !== 'undefined' && window.MuscleMap)
                ? window.MuscleMap.render({ primaryMuscles: workoutMuscles.primary, secondaryMuscles: workoutMuscles.secondary, size: 'md', view: 'both', showLegend: true })
                : ''}
            </div>

            <!-- Sticky Bottom Save Bar -->
            <div class="builder-sticky-save-bar">
              <button type="button" class="btn btn-secondary" onclick="startWorkoutFromId(${selectedWorkout.id})">
                ${renderIcon('zap', 'cx-icon cx-icon-xs cx-icon-inline')} Test Run Runner ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}
              </button>
              <button type="submit" class="btn-save-workout">
                ${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Save Workout Changes
              </button>
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

const SPLIT_STARTER_PRESETS = {
  '5day_ppl': {
    name: 'Aesthetic 5-Day PPL',
    description: 'Push A -> Pull A -> Legs -> Push B -> Pull B (2 rest days)',
    days: ['push_a', 'pull_a', 'legs', 'push_b', 'pull_b', 'rest', 'rest']
  },
  '6day_ppl': {
    name: 'Complete 6-Day PPL A/B',
    description: '6 days training (Push A -> Pull A -> Legs A -> Push B -> Pull B -> Legs B -> Rest)',
    days: ['push_a', 'pull_a', 'legs_a', 'push_b', 'pull_b', 'legs_b', 'rest']
  },
  '4day_ul': {
    name: 'Upper / Lower 4-Day',
    description: '4 workout days, 3 rest days (Upper & Lower body strength frequency)',
    days: ['push_a', 'legs', 'rest', 'pull_a', 'legs', 'rest', 'rest']
  },
  '3day_fb': {
    name: 'Full Body 3-Day Frequency',
    description: '3 full body sessions with alternating active recovery days',
    days: ['push_a', 'rest', 'pull_a', 'rest', 'legs', 'rest', 'rest']
  },
  'custom': {
    name: 'Custom Training Split',
    description: 'Custom weekly schedule configuration',
    days: ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']
  }
};

function findWorkoutForPresetKey(key) {
  if (key === 'rest' || !key || !Array.isArray(state.workouts) || state.workouts.length === 0) return null;
  const lowerKey = key.toLowerCase().replace(/_/g, ' ');
  const exactOrMatch = state.workouts.find(w => {
    const wName = (w.name || '').toLowerCase();
    if (lowerKey === 'push a') return wName.includes('push a');
    if (lowerKey === 'push b') return wName.includes('push b');
    if (lowerKey === 'pull a') return wName.includes('pull a');
    if (lowerKey === 'pull b') return wName.includes('pull b');
    if (lowerKey === 'legs a') return wName.includes('legs a');
    if (lowerKey === 'legs b') return wName.includes('legs b');
    if (lowerKey === 'legs') return wName.includes('leg');
    if (lowerKey.includes('push')) return wName.includes('push');
    if (lowerKey.includes('pull')) return wName.includes('pull');
    return false;
  });
  return exactOrMatch ? exactOrMatch.id : (state.workouts[0]?.id || null);
}

function applyCreateSplitPreset(presetKey) {
  state.activeCreateSplitPreset = presetKey;
  const preset = SPLIT_STARTER_PRESETS[presetKey];
  if (!preset) return;

  const nameInput = document.getElementById('create-split-name');
  const descInput = document.getElementById('create-split-desc');
  if (nameInput) nameInput.value = preset.name;
  if (descInput) descInput.value = preset.description;

  document.querySelectorAll('.split-preset-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.preset === presetKey);
  });

  preset.days.forEach((key, dow) => {
    const isRest = (key === 'rest');
    const typeInput = document.getElementById(`create-day-type-${dow}`);
    const workoutInput = document.getElementById(`create-workout-id-${dow}`);
    const row = document.getElementById(`create-day-row-${dow}`);
    const label = document.getElementById(`create-day-name-${dow}`);

    if (isRest) {
      if (typeInput) typeInput.value = 'rest';
      if (workoutInput) workoutInput.value = '';
      if (row) row.classList.add('is-rest');
      if (label) {
        label.textContent = 'Rest & Recovery';
        label.classList.add('is-rest-label');
      }
    } else {
      const wId = findWorkoutForPresetKey(key);
      const workout = state.workouts.find(w => w.id === wId);
      if (typeInput) typeInput.value = 'workout';
      if (workoutInput) workoutInput.value = wId || '';
      if (row) row.classList.remove('is-rest');
      if (label) {
        label.textContent = workout ? workout.name : 'Workout';
        label.classList.remove('is-rest-label');
      }
    }
  });
}

function renderModalScheduleRows(prefix, scheduleDays = [], workouts = []) {
  const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const defaultKeys = ['push_a', 'pull_a', 'legs', 'push_b', 'pull_b', 'rest', 'rest'];

  return [0, 1, 2, 3, 4, 5, 6].map(dow => {
    let d = Array.isArray(scheduleDays) ? scheduleDays.find(sd => sd.day_of_week === dow) : null;
    let isRest = true;
    let selectedWorkoutId = null;

    if (d) {
      isRest = d.day_type === 'rest' || !d.workout_id;
      selectedWorkoutId = isRest ? null : d.workout_id;
    } else if (prefix === 'create') {
      const presetKey = defaultKeys[dow];
      isRest = (presetKey === 'rest');
      selectedWorkoutId = isRest ? null : findWorkoutForPresetKey(presetKey);
    } else {
      isRest = true;
      selectedWorkoutId = null;
    }

    const assignedWorkout = workouts.find(w => w.id === selectedWorkoutId);
    if (!assignedWorkout) {
      isRest = true;
      selectedWorkoutId = null;
    }
    const workoutName = isRest ? 'Rest & Recovery' : (assignedWorkout ? assignedWorkout.name : 'Workout');

    return `
      <div class="split-mobile-day-row modal-compact-day-row ${isRest ? 'is-rest' : ''}" 
           id="${prefix}-day-row-${dow}" 
           onclick="openModalDaySheet('${prefix}', ${dow})">
        <div class="split-mobile-day-left">
          <span class="split-mobile-day-name">${DAY_NAMES_MON[dow]}</span>
        </div>
        <div class="split-mobile-day-right">
          <span class="split-mobile-workout-name ${isRest ? 'is-rest-label' : ''}" id="${prefix}-day-name-${dow}">
            ${escapeHtml(workoutName)}
          </span>
          <span class="split-mobile-chevron">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
        <input type="hidden" name="day_type_${dow}" id="${prefix}-day-type-${dow}" value="${isRest ? 'rest' : 'workout'}">
        <input type="hidden" name="workout_id_${dow}" id="${prefix}-workout-id-${dow}" value="${selectedWorkoutId || ''}">
      </div>
    `;
  }).join('');
}

function renderModalSplitRoutinesSection(scheduleDays = []) {
  const DAY_SHORT_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const workouts = state.workouts || [];

  if (workouts.length === 0) {
    return `
      <div class="split-modal-section-header" style="display:flex; justify-content:space-between; align-items:center; margin-top:28px; margin-bottom:10px;">
        <span class="split-modal-section-title" style="margin:0;">SPLIT ROUTINES (0)</span>
        <button type="button" class="btn-mobile-new-split" onclick="openCreateWorkoutModal()">+ New Routine</button>
      </div>
      <div style="padding:16px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:12px; text-align:center;">
        <p style="font-size:12.5px; color:var(--text-muted); margin:0 0 10px;">No routines created yet.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="openCreateWorkoutModal()">+ 📚 Build First Routine</button>
      </div>
    `;
  }

  const assignedWorkouts = [];
  const otherWorkouts = [];

  workouts.forEach(w => {
    const days = scheduleDays.filter(d => d.day_type === 'workout' && d.workout_id === w.id);
    if (days.length > 0) {
      const daysLabel = days.map(d => DAY_SHORT_MON[d.day_of_week]).join(', ');
      assignedWorkouts.push({ workout: w, daysLabel });
    } else {
      otherWorkouts.push({ workout: w, daysLabel: '' });
    }
  });

  const allCards = [...assignedWorkouts, ...otherWorkouts];

  return `
    <div class="split-modal-section-header" style="display:flex; justify-content:space-between; align-items:center; margin-top:28px; margin-bottom:10px;">
      <span class="split-modal-section-title" style="margin:0;">SPLIT ROUTINES (${allCards.length})</span>
      <button type="button" class="btn-mobile-new-split" onclick="openCreateWorkoutModal()">+ New Routine</button>
    </div>

    <div class="split-modal-routines-list" style="display:flex; flex-direction:column; gap:8px;">
      ${allCards.map(item => {
        const w = item.workout;
        const daysLabel = item.daysLabel;
        const count = w.exercise_count || (w.exercises ? w.exercises.length : 0);
        return `
          <div class="split-mobile-day-row modal-routine-card" onclick="selectWorkoutAndEditRoutine(${w.id})">
            <div class="split-mobile-day-left">
              <div class="split-sheet-opt-icon icon-workout" style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:rgba(255, 93, 93, 0.12); color:#FF5D5D; flex-shrink:0;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M2 9v6"/><path d="M22 9v6"/><path d="M6 12h12"/></svg>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                <span style="font-size:14px; font-weight:600; color:#FFFFFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(w.name)}</span>
                <span style="font-size:11.5px; color:var(--text-muted);">${count} exercises ${daysLabel ? `<strong style="color:#FF8A3D; font-weight:600;">· ${daysLabel}</strong>` : ''}</span>
              </div>
            </div>
            <div class="split-mobile-day-right">
              <button type="button" class="btn btn-secondary btn-sm" style="font-size:11.5px; padding:4px 10px; border-radius:6px; font-weight:600; color:#D1D1D6;" onclick="event.stopPropagation(); selectWorkoutAndEditRoutine(${w.id});">
                ✏️ Edit
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Bottom Sheet for Day Routine Selection in Split Modals ───────────────────

function openModalDaySheet(prefix, dow) {
  state.modalDayPicker = { prefix, dow };
  const root = document.getElementById('modal-day-picker-root');
  if (!root) return;
  root.innerHTML = renderModalDayPickerSheetHtml(prefix, dow);
  setTimeout(initBottomSheetTouch, 0);
}

function closeModalDaySheet() {
  state.modalDayPicker = null;
  const root = document.getElementById('modal-day-picker-root');
  if (root) root.innerHTML = '';
}

function selectModalDayRoutine(prefix, dow, type, workoutId) {
  const typeInput = document.getElementById(`${prefix}-day-type-${dow}`);
  const workoutInput = document.getElementById(`${prefix}-workout-id-${dow}`);
  const row = document.getElementById(`${prefix}-day-row-${dow}`);
  const label = document.getElementById(`${prefix}-day-name-${dow}`);

  const isRest = type === 'rest' || !workoutId;

  if (typeInput) typeInput.value = isRest ? 'rest' : 'workout';
  if (workoutInput) workoutInput.value = isRest ? '' : workoutId;

  if (row) {
    row.classList.toggle('is-rest', isRest);
  }

  if (label) {
    if (isRest) {
      label.textContent = 'Rest & Recovery';
      label.classList.add('is-rest-label');
    } else {
      const w = state.workouts.find(w => w.id === workoutId);
      label.textContent = w ? w.name : 'Workout';
      label.classList.remove('is-rest-label');
    }
  }

  closeModalDaySheet();
}

function renderModalDayPickerSheetHtml(prefix, dow) {
  const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayName = DAY_NAMES_MON[dow] || 'Day';

  const typeInput = document.getElementById(`${prefix}-day-type-${dow}`);
  const workoutInput = document.getElementById(`${prefix}-workout-id-${dow}`);
  const currentType = typeInput ? typeInput.value : 'rest';
  const currentWorkoutId = workoutInput && workoutInput.value ? parseInt(workoutInput.value, 10) : null;
  const isCurrentRest = currentType === 'rest' || !currentWorkoutId;

  return `
    <div id="split-bottom-sheet-backdrop" class="split-sheet-backdrop" style="z-index:1200;" onclick="if(event.target === this) closeModalDaySheet()">
      <div id="split-bottom-sheet" class="split-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-sheet-day-title">
        <div class="split-sheet-drag-handle-wrap" id="split-sheet-drag-handle" onclick="closeModalDaySheet()">
          <div class="split-sheet-drag-handle"></div>
        </div>

        <div class="split-sheet-header">
          <div>
            <h2 id="modal-sheet-day-title" class="split-sheet-title">${dayName}</h2>
            <p class="split-sheet-subtitle">Select assigned workout routine or rest day</p>
          </div>
          <button class="split-sheet-close-btn" type="button" onclick="closeModalDaySheet()" aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="split-sheet-body">
          <!-- Rest Day Option -->
          <div class="split-sheet-option ${isCurrentRest ? 'is-selected' : ''}" 
               onclick="selectModalDayRoutine('${prefix}', ${dow}, 'rest', null)"
               role="button" tabindex="0">
            <div class="split-sheet-opt-left">
              <div class="split-sheet-opt-icon icon-rest">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              </div>
              <div class="split-sheet-opt-info">
                <span class="split-sheet-opt-name">Rest Day</span>
                <span class="split-sheet-opt-desc">Rest & Recovery</span>
              </div>
            </div>
            <div class="split-sheet-opt-right">
              ${isCurrentRest 
                ? `<span class="split-sheet-check-icon">
                     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF5D5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                   </span>`
                : `<span class="split-sheet-arrow-icon">
                     <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                   </span>`
              }
            </div>
          </div>

          <!-- Saved Workouts Options -->
          ${state.workouts.map(w => {
            const isSelected = !isCurrentRest && currentWorkoutId === w.id;
            return `
              <div class="split-sheet-option ${isSelected ? 'is-selected' : ''}"
                   onclick="selectModalDayRoutine('${prefix}', ${dow}, 'workout', ${w.id})"
                   role="button" tabindex="0">
                <div class="split-sheet-opt-left">
                  <div class="split-sheet-opt-icon icon-workout">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M2 9v6"/><path d="M22 9v6"/><path d="M6 12h12"/></svg>
                  </div>
                  <div class="split-sheet-opt-info">
                    <span class="split-sheet-opt-name">${escapeHtml(w.name)}</span>
                    <span class="split-sheet-opt-desc">${w.exercise_count || (w.exercises ? w.exercises.length : 0)} exercises</span>
                  </div>
                </div>
                <div class="split-sheet-opt-right">
                  ${isSelected 
                    ? `<span class="split-sheet-check-icon">
                         <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF5D5D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                       </span>`
                    : `<span class="split-sheet-arrow-icon">
                         <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                       </span>`
                  }
                </div>
              </div>
            `;
          }).join('')}

          <!-- Secondary Action: + Build New Routine -->
          <button class="split-sheet-new-workout-btn" type="button" onclick="closeModalDaySheet(); selectWorkoutAndEditRoutine(${state.workouts[0]?.id || 1});">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>+ 📚 Build New Routine from Exercise Library</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Double Tap / Click Tracking for Saved Split Cards ─────────────────────────
let lastSplitCardTapTime = 0;
let lastSplitCardTapId = null;

function handleSavedSplitCardClick(splitId, event) {
  const now = Date.now();
  if (lastSplitCardTapId === splitId && (now - lastSplitCardTapTime) < 380) {
    // Double tap/click detected!
    lastSplitCardTapTime = 0;
    lastSplitCardTapId = null;
    openEditSplitModal(splitId);
  } else {
    lastSplitCardTapTime = now;
    lastSplitCardTapId = splitId;
    selectSplit(splitId);
  }
}

// ─── Edit Split Modal Functions ───────────────────────────────────────────────
async function openEditSplitModal(splitId) {
  state.editingSplitId = splitId;
  state.showEditSplitModal = true;
  if (!state.selectedSplitDetail || state.selectedSplitDetail.id !== splitId) {
    await loadSplitDetail(splitId);
  }
  render();
}

function closeEditSplitModal() {
  state.showEditSplitModal = false;
  state.editingSplitId = null;
  render();
}

async function handleUpdateSplit(event, splitId) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);

  const editingSplit = state.splits.find(s => s.id === splitId) || {};
  const name = (data.get('name') || '').trim();
  const description = editingSplit.description || '';
  const isActive = editingSplit.is_active !== undefined ? editingSplit.is_active : 1;

  if (!name) {
    showToast('Split name is required', true);
    return;
  }

  // Gather 7 days
  const scheduleDays = [];
  for (let dow = 0; dow < 7; dow++) {
    const dayType = data.get(`day_type_${dow}`) || 'rest';
    const workoutIdRaw = data.get(`workout_id_${dow}`);
    const workoutId = (dayType === 'workout' && workoutIdRaw) ? parseInt(workoutIdRaw, 10) : null;
    scheduleDays.push({
      day_of_week: dow,
      day_type: dayType,
      workout_id: workoutId
    });
  }

  try {
    await API.updateSplit(splitId, {
      name,
      description,
      is_active: isActive
    });

    if (API.updateSplitSchedule) {
      await API.updateSplitSchedule(splitId, scheduleDays);
    } else {
      for (const d of scheduleDays) {
        await API.updateScheduleDay(splitId, d.day_of_week, {
          day_type: d.day_type,
          workout_id: d.workout_id
        });
      }
    }

    state.showEditSplitModal = false;
    state.editingSplitId = null;
    showToast(`Updated Split "${name}"`);
    await loadSplits();
    await loadSplitDetail(splitId);
    await loadTodayResolved();
    render();
  } catch (e) {
    showToast(`Error updating split: ${e.message}`, true);
  }
}

// ─── Create Split Modal Functions ─────────────────────────────────────────────
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

  const name = (data.get('name') || '').trim();
  const description = '';
  const isActive = 1;

  if (!name) {
    showToast('Split name is required', true);
    return;
  }

  // Gather 7 days
  const scheduleDays = [];
  for (let dow = 0; dow < 7; dow++) {
    const dayType = data.get(`day_type_${dow}`) || 'rest';
    const workoutIdRaw = data.get(`workout_id_${dow}`);
    const workoutId = (dayType === 'workout' && workoutIdRaw) ? parseInt(workoutIdRaw, 10) : null;
    scheduleDays.push({
      day_of_week: dow,
      day_type: dayType,
      workout_id: workoutId
    });
  }

  const payload = {
    name,
    description,
    is_active: isActive,
    schedule: scheduleDays
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
  if (state.splits && state.splits.length > 0) {
    state.splits.forEach(s => {
      s.is_active = (s.id === splitId) ? 1 : 0;
    });
  }
  await loadSplitDetail(splitId);
  render();
  try {
    if (typeof API !== 'undefined' && API.activateSplit) {
      await API.activateSplit(splitId);
      if (typeof loadSplits === 'function') await loadSplits();
      if (typeof loadTodayResolved === 'function') await loadTodayResolved();
      render();
    }
  } catch (e) {
    console.warn('Split activation error:', e);
  }
}

async function activateSplit(splitId) {
  const prevSplits = JSON.parse(JSON.stringify(state.splits || []));
  const prevActive = state.activeSplit ? JSON.parse(JSON.stringify(state.activeSplit)) : null;

  if (typeof triggerHaptic === 'function') triggerHaptic('medium');

  await optimisticMutate({
    optimistic: () => {
      if (state.splits) {
        state.splits.forEach(s => { s.is_active = (s.id === splitId) ? 1 : 0; });
        state.activeSplit = state.splits.find(s => s.id === splitId) || state.activeSplit;
      }
      render();
      return { prevSplits, prevActive };
    },
    action: async () => {
      await API.activateSplit(splitId);
      await loadSplits();
      await loadTodayResolved();
      render();
    },
    rollback: (saved) => {
      if (saved) {
        state.splits = saved.prevSplits;
        state.activeSplit = saved.prevActive;
        render();
      }
    },
    successMsg: 'Split set as Active',
    errorMsg: 'Could not activate split.'
  });
}

async function handleDeleteSplit(splitId, splitName) {
  if (!confirm(`Are you sure you want to delete "${splitName}"?\nCompleted workout sessions and logs will NOT be deleted.`)) return;

  const prevSplits = JSON.parse(JSON.stringify(state.splits || []));
  const prevSelectedId = state.selectedSplitId;

  if (typeof triggerHaptic === 'function') triggerHaptic('medium');

  await optimisticMutate({
    optimistic: () => {
      state.splits = (state.splits || []).filter(s => s.id !== splitId);
      if (state.selectedSplitId === splitId) {
        state.selectedSplitId = state.splits[0]?.id || null;
      }
      render();
      return { prevSplits, prevSelectedId };
    },
    action: async () => {
      await API.deleteSplit(splitId);
      await loadSplits();
      await loadTodayResolved();
      render();
    },
    rollback: (saved) => {
      if (saved) {
        state.splits = saved.prevSplits;
        state.selectedSplitId = saved.prevSelectedId;
        render();
      }
    },
    successMsg: `Deleted split "${splitName}"`,
    errorMsg: `Failed to delete split "${splitName}".`
  });
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

async function assignMobileScheduleDay(splitId, dayIndex, dayType, workoutId = null) {
  const sheet = document.getElementById('split-bottom-sheet');
  const backdrop = document.getElementById('split-bottom-sheet-backdrop');
  if (sheet) sheet.classList.add('is-closing');
  if (backdrop) backdrop.classList.add('is-closing');

  try {
    await API.updateScheduleDay(splitId, dayIndex, {
      day_type: dayType,
      workout_id: workoutId
    });
    const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = DAY_NAMES_MON[dayIndex] || 'Day';
    const assignedName = dayType === 'rest' 
      ? 'Rest & Recovery' 
      : (state.workouts.find(w => w.id === workoutId)?.name || 'Workout');
    showToast(`${dayName} set to ${assignedName}`);
    await loadSplitDetail(splitId);
    await loadTodayResolved();
    state.editingDayIndex = null;
    render();
  } catch (e) {
    showToast(`Error updating schedule: ${e.message}`, true);
    state.editingDayIndex = null;
    render();
  }
}

function closeMobileBottomSheet() {
  const sheet = document.getElementById('split-bottom-sheet');
  const backdrop = document.getElementById('split-bottom-sheet-backdrop');
  if (sheet) sheet.classList.add('is-closing');
  if (backdrop) backdrop.classList.add('is-closing');
  setTimeout(() => {
    state.editingDayIndex = null;
    render();
  }, 220);
}

function initBottomSheetTouch() {
  const sheet = document.getElementById('split-bottom-sheet');
  if (!sheet) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const handleTouchStart = (e) => {
    const isAtTop = sheet.querySelector('.split-sheet-body')?.scrollTop === 0;
    const isHandle = e.target.closest('.split-sheet-drag-handle-wrap') || e.target.closest('.split-sheet-header');
    if (isAtTop || isHandle) {
      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    if (deltaY > 0) {
      sheet.style.transform = `translateY(${deltaY}px)`;
      sheet.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    const deltaY = currentY - startY;
    if (deltaY > 65) {
      closeMobileBottomSheet();
    } else {
      sheet.style.transform = '';
      sheet.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1.15)';
    }
  };

  sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
  sheet.addEventListener('touchmove', handleTouchMove, { passive: true });
  sheet.addEventListener('touchend', handleTouchEnd, { passive: true });
}

if (typeof window !== 'undefined' && !window.__splitSheetKeydownAttached) {
  window.__splitSheetKeydownAttached = true;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.editingDayIndex !== null) {
      if (window.innerWidth < 1024) {
        closeMobileBottomSheet();
      } else {
        closeDayEditor();
      }
    }
  });
}


async function selectWorkoutForEditing(workoutId) {
  state.selectedWorkoutId = workoutId;
  await loadWorkoutDetail(workoutId);
  render();
}

function openCreateWorkoutModal() {
  const newRoutineId = Date.now();
  const draftRoutine = {
    id: newRoutineId,
    name: 'New routine',
    description: '',
    progression_type: 'linear',
    exclude_progression: false,
    is_draft: true,
    exercises: []
  };
  if (!state.workouts) state.workouts = [];
  state.workouts.unshift(draftRoutine);
  state.selectedWorkoutId = newRoutineId;
  state.selectedWorkoutDetail = draftRoutine;
  state.editingRoutineId = newRoutineId;
  state.showRoutineEditorModal = true;
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
  if (typeof triggerHaptic === 'function') triggerHaptic('light');
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

  const prevWorkouts = JSON.parse(JSON.stringify(state.workouts || []));
  const prevSelectedId = state.selectedWorkoutId;

  if (typeof triggerHaptic === 'function') triggerHaptic('medium');

  await optimisticMutate({
    optimistic: () => {
      state.workouts = (state.workouts || []).filter(w => w.id !== workoutId);
      if (state.selectedWorkoutId === workoutId) {
        state.selectedWorkoutId = state.workouts[0]?.id || null;
      }
      render();
      return { prevWorkouts, prevSelectedId };
    },
    action: async () => {
      await API.deleteWorkout(workoutId);
      await loadWorkouts();
      if (state.selectedWorkoutId) {
        await loadWorkoutDetail(state.selectedWorkoutId);
      } else {
        state.selectedWorkoutDetail = null;
      }
      render();
    },
    rollback: (saved) => {
      if (saved) {
        state.workouts = saved.prevWorkouts;
        state.selectedWorkoutId = saved.prevSelectedId;
        render();
      }
    },
    successMsg: `Deleted workout: ${workoutName || ''}`,
    errorMsg: `Failed to delete workout.`
  });
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

// ─── Exercise Library Picker & Routine Flow Helpers ───────────────────────────

function openExerciseLibraryPicker(phase = 'main') {
  syncWorkoutEditorFormToState();
  state.exercisePickerPhase = phase;
  state.showExercisePickerModal = true;
  state.exercisePickerSearch = '';
  state.exercisePickerFilter = 'All';
  render();
}

function closeExerciseLibraryPicker() {
  state.showExercisePickerModal = false;
  render();
}

function setExercisePickerFilter(filter) {
  state.exercisePickerFilter = filter;
  const container = document.getElementById('exercise-picker-cards-grid');
  if (container) {
    container.innerHTML = renderExercisePickerGridHtml();
  }
  document.querySelectorAll('.library-chip').forEach(el => {
    el.classList.toggle('active', el.textContent.trim() === filter);
  });
}

function handlePickerSearch(query) {
  state.exercisePickerSearch = query;
  const container = document.getElementById('exercise-picker-cards-grid');
  if (container) {
    container.innerHTML = renderExercisePickerGridHtml();
  }
}

function renderExercisePickerGridHtml() {
  const exercises = state.exercises || [];
  const filter = state.exercisePickerFilter || 'All';
  const query = (state.exercisePickerSearch || '').toLowerCase().trim();

  const filtered = exercises.filter(ex => {
    if (filter !== 'All') {
      const pattern = (ex.movement_pattern || '').toLowerCase();
      const day = (ex.day || '').toLowerCase();
      const name = (ex.name || '').toLowerCase();

      if (filter === 'Push' && !pattern.includes('push') && !day.includes('push')) return false;
      if (filter === 'Pull' && !pattern.includes('pull') && !day.includes('pull')) return false;
      if (filter === 'Legs' && !pattern.includes('leg') && !pattern.includes('squat') && !day.includes('leg')) return false;
      if (filter === 'Core' && !pattern.includes('core') && !day.includes('core') && !name.includes('plank') && !name.includes('hollow')) return false;
      if (filter === 'Skill' && !pattern.includes('skill') && !day.includes('skill') && !name.includes('handstand') && !name.includes('lever') && !name.includes('planche')) return false;
      if (filter === 'Isometric' && ex.type !== 'duration') return false;
      if (filter === 'In Profile') {
        const req = typeof getExerciseRequiredEquipment === 'function' ? getExerciseRequiredEquipment(ex.name, ex.movement_pattern) : 'floor';
        const profile = typeof getEquipmentProfile === 'function' ? getEquipmentProfile() : [];
        if (req !== 'floor' && !profile.includes(req)) return false;
      }
    }
    if (query) {
      const matchName = (ex.name || '').toLowerCase().includes(query);
      const matchPattern = (ex.movement_pattern || '').toLowerCase().includes(query);
      const matchDay = (ex.day || '').toLowerCase().includes(query);
      return matchName || matchPattern || matchDay;
    }
    return true;
  });

  if (filtered.length === 0) {
    return `
      <div class="library-empty-state" style="grid-column: 1 / -1; padding: 32px 16px; text-align:center;">
        <p style="color:var(--text-muted); font-size:13px; margin:0;">No movements matched "${escapeHtml(query)}" in category "${filter}".</p>
      </div>`;
  }

  const phase = state.exercisePickerPhase || 'main';

  return filtered.map(ex => {
    const isHold = ex.type === 'duration';
    const pattern = ex.movement_pattern || 'general';
    let patternLabel = pattern.replace(/_/g, ' ');
    if (pattern.includes('push')) patternLabel = 'Push';
    else if (pattern.includes('pull')) patternLabel = 'Pull';
    else if (pattern.includes('squat') || pattern.includes('leg')) patternLabel = 'Legs';
    else if (pattern.includes('core')) patternLabel = 'Core';
    else if (pattern.includes('skill')) patternLabel = 'Skill';

    const reqEquipment = typeof getExerciseRequiredEquipment === 'function' ? getExerciseRequiredEquipment(ex.name, ex.movement_pattern) : 'floor';
    const currentProfile = typeof getEquipmentProfile === 'function' ? getEquipmentProfile() : ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor'];
    const hasEquipment = reqEquipment === 'floor' || currentProfile.includes(reqEquipment);
    const equipmentNames = {
      pullup_bar: 'Pull-up Bar',
      rings: 'Rings',
      dip_bars: 'Dip Station',
      parallettes: 'Parallettes',
      resistance_bands: 'Bands',
      weight_vest: 'Weight Vest',
      ab_wheel: 'Ab Wheel',
      floor: 'Bodyweight'
    };
    const reqEquipmentName = equipmentNames[reqEquipment] || reqEquipment;

    return `
      <div class="exercise-picker-card" onclick="addExerciseFromPicker(${ex.id}, '${phase}')">
        <div class="exercise-picker-card-info">
          <div class="exercise-picker-card-name">${escapeHtml(ex.name)}</div>
          <div class="exercise-picker-card-tags">
            <span class="badge-pattern" style="font-size:9.5px; padding:1px 6px;">${patternLabel}</span>
            <span class="badge-type" style="font-size:9.5px; padding:1px 6px;">${isHold ? 'Hold (Secs)' : 'Reps Target'}</span>
            ${!hasEquipment ? `<span class="badge-muscle" style="font-size:9.5px; padding:1px 6px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3);">⚠️ Needs ${escapeHtml(reqEquipmentName)}</span>` : ''}
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="padding:4px 12px; font-size:11.5px; font-weight:700;" onclick="event.stopPropagation(); addExerciseFromPicker(${ex.id}, '${phase}')">
          + Add
        </button>
      </div>`;
  }).join('');
}

function addExerciseFromPicker(exerciseId, phase = 'main') {
  syncWorkoutEditorFormToState();
  const ex = getExercise(exerciseId);
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
    reps: isHold ? null : (ex.default_reps || 10),
    duration_sec: isHold ? (ex.default_duration_sec || 30) : null,
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
  const phaseLabel = phase === 'warmup' ? 'Warm-up' : (phase === 'cooldown' ? 'Cool-down' : 'Main Workout');
  showToast(`Added "${ex.name}" to ${phaseLabel}`);
  state.showExercisePickerModal = false;
  render();
}

function openAssignRoutineToDaysModal(workoutId) {
  state.assignRoutineWorkoutId = workoutId;
  state.showAssignDaysModal = true;
  render();
}

function closeAssignRoutineToDaysModal() {
  state.showAssignDaysModal = false;
  state.assignRoutineWorkoutId = null;
  render();
}

async function handleSaveAssignRoutineToDays(event, workoutId) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);

  const currentSplit = state.selectedSplitDetail || state.splits.find(s => s.id === state.selectedSplitId) || state.splits[0];
  if (!currentSplit) return;

  const currentDays = currentSplit.schedule || [];
  const scheduleDays = [];

  for (let dow = 0; dow < 7; dow++) {
    const isChecked = !!data.get(`assign_day_${dow}`);
    const existing = currentDays.find(d => d.day_of_week === dow);
    if (isChecked) {
      scheduleDays.push({
        day_of_week: dow,
        day_type: 'workout',
        workout_id: workoutId
      });
    } else if (existing && existing.workout_id === workoutId) {
      scheduleDays.push({
        day_of_week: dow,
        day_type: 'rest',
        workout_id: null
      });
    } else if (existing) {
      scheduleDays.push({
        day_of_week: dow,
        day_type: existing.day_type,
        workout_id: existing.workout_id
      });
    } else {
      scheduleDays.push({
        day_of_week: dow,
        day_type: (dow === 5 || dow === 6) ? 'rest' : 'workout',
        workout_id: (dow === 5 || dow === 6) ? null : workoutId
      });
    }
  }

  try {
    if (API.updateSplitSchedule) {
      await API.updateSplitSchedule(currentSplit.id, scheduleDays);
    } else {
      for (const d of scheduleDays) {
        await API.updateScheduleDay(currentSplit.id, d.day_of_week, {
          day_type: d.day_type,
          workout_id: d.workout_id
        });
      }
    }

    state.showAssignDaysModal = false;
    state.assignRoutineWorkoutId = null;
    const w = state.workouts.find(w => w.id === workoutId);
    showToast(`Assigned "${w ? w.name : 'Routine'}" to weekly schedule!`);
    await loadSplitDetail(currentSplit.id);
    await loadTodayResolved();
    state.splitSubTab = 'schedule';
    render();
  } catch (e) {
    showToast(`Error assigning routine: ${e.message}`, true);
  }
}

const ROUTINE_LIB_CATEGORIES = [
  { id: 'all', label: 'All Movements' },
  { id: 'push', label: '💪 Push (Chest/Shoulders/Arms)' },
  { id: 'pull', label: '🔥 Pull (Back/Biceps)' },
  { id: 'legs', label: '🦵 Legs (Quads/Hams/Calves)' },
  { id: 'core', label: '🛡️ Core & Abs' },
  { id: 'skills', label: '⚡ Static Skills & Holds' },
  { id: 'mobility', label: '🧘 Mobility & Stretches' }
];

const MUSCLE_GROUPS_DEF = [
  {
    id: 'push',
    title: '💪 Push Movements (Chest, Shoulders & Triceps)',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('push') || p.includes('dip') || p.includes('chest') || d.includes('push') || n.includes('push') || n.includes('dip');
    }
  },
  {
    id: 'pull',
    title: '🔥 Pull Movements (Back, Lats, Biceps & Forearms)',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('pull') || p.includes('row') || p.includes('chin') || d.includes('pull') || n.includes('pull') || n.includes('chin') || n.includes('row') || n.includes('muscle');
    }
  },
  {
    id: 'legs',
    title: '🦵 Legs Movements (Quads, Hamstrings, Glutes & Calves)',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('leg') || p.includes('squat') || p.includes('hinge') || p.includes('calf') || p.includes('lunge') || d.includes('leg') || n.includes('squat') || n.includes('lunge') || n.includes('calf') || n.includes('nordic') || n.includes('pistol');
    }
  },
  {
    id: 'core',
    title: '🛡️ Core & Abdominals (Abs, Obliques & Lower Back)',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('core') || p.includes('ab') || p.includes('hanging') || d.includes('core') || n.includes('plank') || n.includes('hollow') || n.includes('dragon') || n.includes('l-sit') || n.includes('leg raise') || n.includes('rollout');
    }
  },
  {
    id: 'skills',
    title: '⚡ Static Skills & Isometric Holds',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('skill') || p.includes('isometric') || p.includes('hold') || p.includes('lever') || p.includes('planche') || p.includes('handstand') || d.includes('skill') || n.includes('handstand') || n.includes('planche') || n.includes('front lever') || n.includes('back lever') || n.includes('human flag');
    }
  },
  {
    id: 'mobility',
    title: '🧘 Mobility, Joint Prep & Stretching',
    match: (ex) => {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      return p.includes('mobility') || p.includes('stretch') || p.includes('warmup') || p.includes('cooldown') || d.includes('mobility') || d.includes('stretch') || n.includes('stretch') || n.includes('wrist') || n.includes('dislocate') || n.includes('cat-cow') || n.includes('pigeon');
    }
  }
];

async function selectWorkoutAndEditRoutine(workoutId) {
  closeDayEditor();
  closeMobileBottomSheet();
  closeModalDaySheet();
  await openRoutineEditorModal(workoutId);
}

async function openRoutineEditorModal(workoutId) {
  state.editingRoutineId = workoutId;
  state.showRoutineEditorModal = true;
  state.selectedWorkoutId = workoutId;
  await loadWorkoutDetail(workoutId);
  render();
}

function closeRoutineEditorModal() {
  state.showRoutineEditorModal = false;
  state.editingRoutineId = null;
  render();
}



function addExerciseToCurrentRoutine(exerciseId, phase = 'main') {
  syncWorkoutEditorFormToState();
  const ex = (state.exercises || []).find(e => e.id === exerciseId);
  if (!ex) return;

  if (!state.selectedWorkoutDetail) return;
  if (!state.selectedWorkoutDetail.exercises) state.selectedWorkoutDetail.exercises = [];

  const isHold = ex.type === 'duration';
  const defaultSets = (phase === 'main') ? (isHold ? 3 : 4) : (phase === 'warmup' ? 2 : 2);
  const defaultReps = !isHold ? 10 : null;
  const defaultHold = isHold ? 30 : null;
  const defaultRest = (phase === 'main') ? 90 : (phase === 'warmup' ? 45 : 30);

  const newSlot = {
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_type: ex.type,
    phase: phase,
    sets: defaultSets,
    target_reps: defaultReps,
    hold_seconds: defaultHold,
    rest_seconds: defaultRest,
    target_tempo: (phase === 'main' && !isHold) ? '3-0-1-0' : null,
    order_in_workout: state.selectedWorkoutDetail.exercises.length + 1
  };

  state.selectedWorkoutDetail.exercises.push(newSlot);

  if (!state.builderSections) state.builderSections = {};
  state.builderSections[phase] = true;

  showToast(`Added "${ex.name}" to ${phase.toUpperCase()} phase!`);
  render();
}

function setRoutineLibCategoryFilter(catId) {
  state.routineLibCategoryFilter = catId;
  render();
}

function handleRoutineLibSearch(query) {
  state.routineLibSearch = query;
  const container = document.querySelector('.routine-library-groups-container');
  if (container) {
    container.innerHTML = renderGroupedExerciseLibraryHtml();
  }
}

function renderRoutineLibCategoryChips() {
  const activeCategory = state.routineLibCategoryFilter || 'all';
  return ROUTINE_LIB_CATEGORIES.map(cat => `
    <button type="button" 
            class="routine-lib-cat-chip ${activeCategory === cat.id ? 'active' : ''}" 
            onclick="setRoutineLibCategoryFilter('${cat.id}')">
      ${cat.label}
    </button>
  `).join('');
}

function renderGroupedExerciseLibraryHtml() {
  const allExercises = state.exercises || [];
  const query = (state.routineLibSearch || '').trim().toLowerCase();
  const activeCategory = state.routineLibCategoryFilter || 'all';

  const visibleGroups = MUSCLE_GROUPS_DEF.filter(g => activeCategory === 'all' || activeCategory === g.id);

  let totalShown = 0;
  const groupsHtml = visibleGroups.map(group => {
    let groupExercises = allExercises.filter(ex => group.match(ex));

    if (query) {
      groupExercises = groupExercises.filter(ex => {
        const name = (ex.name || '').toLowerCase();
        const pattern = (ex.movement_pattern || '').toLowerCase();
        const day = (ex.day || '').toLowerCase();
        return name.includes(query) || pattern.includes(query) || day.includes(query);
      });
    }

    if (groupExercises.length === 0) return '';
    totalShown += groupExercises.length;

    return `
      <div class="routine-lib-group-card">
        <div class="routine-lib-group-header">
          <span class="routine-lib-group-title">${group.title}</span>
          <span class="routine-lib-group-count">${groupExercises.length} movements</span>
        </div>
        <div>
          ${groupExercises.map(ex => `
            <div class="routine-lib-card">
              <div style="min-width:0; flex:1;">
                <div style="font-size:13.5px; font-weight:600; color:#FFFFFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(ex.name)}
                </div>
                <div style="display:flex; gap:6px; align-items:center; margin-top:3px; flex-wrap:wrap;">
                  <span class="badge" style="font-size:10px; padding:1px 6px; background:rgba(255,255,255,0.06); color:#A1A1AA;">
                    ${ex.type === 'duration' ? '⏱️ Hold' : '🔢 Reps'}
                  </span>
                  ${ex.movement_pattern ? `<span class="badge" style="font-size:10px; padding:1px 6px; background:rgba(255,138,61,0.1); color:#FF8A3D;">${escapeHtml(ex.movement_pattern.replace(/_/g, ' '))}</span>` : ''}
                </div>
              </div>
              
              <div style="display:flex; gap:6px; flex-shrink:0;">
                <button type="button" class="btn-quick-add-phase btn-add-prep" onclick="addExerciseToCurrentRoutine(${ex.id}, 'warmup')" title="Add to Warm-up phase">
                  + Prep
                </button>
                <button type="button" class="btn-quick-add-phase btn-add-train" onclick="addExerciseToCurrentRoutine(${ex.id}, 'main')" title="Add to Main Workout phase">
                  + Train
                </button>
                <button type="button" class="btn-quick-add-phase btn-add-recover" onclick="addExerciseToCurrentRoutine(${ex.id}, 'cooldown')" title="Add to Cool-down phase">
                  + Recover
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  if (!groupsHtml) {
    return `
      <div style="padding:24px; text-align:center; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:12px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">No exercises found matching "${escapeHtml(query)}".</p>
      </div>
    `;
  }

  return groupsHtml;
}

function renderCreateWorkoutModalHtml() {
  if (!state.showCreateWorkoutModal) return '';

  return `
    <div class="split-modal-backdrop" id="routine-create-screen" onclick="if(event.target === this) closeCreateWorkoutModal()">
      <div class="split-modal-container" style="max-width:560px;">
        <div class="split-modal-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="settings-back-btn split-back-btn" type="button" onclick="closeCreateWorkoutModal()" title="Back" aria-label="Back">
              ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
            </button>
            <div>
              <h2 class="split-modal-title">Create New Routine</h2>
              <p class="split-modal-subtitle">Pick starter phases and add exercises from library.</p>
            </div>
          </div>
          <button class="split-modal-close-btn desktop-only-close-btn" type="button" onclick="closeCreateWorkoutModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <form onsubmit="handleCreateWorkout(event)">
          <div class="split-modal-body">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Routine Name</label>
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
          </div>

          <div class="split-modal-footer">
            <div></div>
            <div style="display:flex; gap:10px;">
              <button type="button" class="btn btn-secondary" onclick="closeCreateWorkoutModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Routine & Add Movements</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

function updateRoutineTitle(name) {
  if (state.selectedWorkoutDetail) {
    state.selectedWorkoutDetail.name = name;
  }
  const w = (state.workouts || []).find(w => w.id === state.editingRoutineId);
  if (w) w.name = name;
}

function toggleExcludeProgression(checked) {
  if (state.selectedWorkoutDetail) {
    state.selectedWorkoutDetail.exclude_progression = !!checked;
  }
  const w = (state.workouts || []).find(w => w.id === state.editingRoutineId);
  if (w) w.exclude_progression = !!checked;
  render();
}

function moveExerciseOrder(idx, delta) {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  const list = state.selectedWorkoutDetail.exercises;
  const targetIdx = idx + delta;
  if (targetIdx < 0 || targetIdx >= list.length) return;

  const temp = list[idx];
  list[idx] = list[targetIdx];
  list[targetIdx] = temp;

  list.forEach((ex, i) => {
    ex.order_in_workout = i + 1;
    ex.order_index = i + 1;
  });

  render();
}

function removeExerciseFromRoutine(idx) {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  const list = state.selectedWorkoutDetail.exercises;
  const removed = list.splice(idx, 1)[0];
  list.forEach((ex, i) => {
    ex.order_in_workout = i + 1;
    ex.order_index = i + 1;
  });
  showToast(`Removed "${removed.exercise_name || removed.name || 'exercise'}"`);
  render();
}

function toggleExerciseSuperset(idx) {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  const list = state.selectedWorkoutDetail.exercises;
  if (list[idx]) {
    list[idx].is_superset = !list[idx].is_superset;
    render();
  }
}

async function handleDeleteWorkoutFromEditor(workoutId) {
  if (!confirm('Are you sure you want to delete this routine?')) return;
  try {
    if (typeof API !== 'undefined' && API.deleteWorkout) {
      await API.deleteWorkout(workoutId);
    }
    state.workouts = (state.workouts || []).filter(w => w.id !== workoutId);
    state.showRoutineEditorModal = false;
    state.editingRoutineId = null;
    showToast('Routine deleted');
    if (typeof loadWorkouts === 'function') await loadWorkouts();
    if (typeof loadSplits === 'function') await loadSplits();
    render();
  } catch (e) {
    showToast(`Error deleting routine: ${e.message}`, true);
  }
}

function renderWhatThisSessionHitsHtml(exercises) {
  const pSet = new Set();
  const sSet = new Set();
  const tagsSet = new Set();

  (exercises || []).forEach(ex => {
    const exName = ex.exercise_name || ex.name || '';
    const pattern = ex.movement_pattern || '';
    if (typeof window !== 'undefined' && window.MuscleMap) {
      const m = window.MuscleMap.getExerciseMuscles(exName, pattern);
      (m.primary || []).forEach(k => { pSet.add(k); tagsSet.add(k); });
      (m.secondary || []).forEach(k => { sSet.add(k); tagsSet.add(k); });
    }
  });

  pSet.forEach(k => sSet.delete(k));
  const pList = Array.from(pSet);
  const sList = Array.from(sSet);

  const anatomySvg = (typeof window !== 'undefined' && window.MuscleMap)
    ? window.MuscleMap.renderDualMuscleBodySvg(pList.length ? { primary: pList, secondary: sList } : null)
    : '';

  const pills = Array.from(tagsSet).slice(0, 6).map(k => {
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<span class="session-hit-pill">${label}</span>`;
  }).join('');

  return `
    <div class="session-hits-card">
      <div class="session-hits-title">What this session hits</div>
      <div class="session-hits-visual">
        ${anatomySvg}
      </div>
      <div class="session-hits-pills">
        ${pills || '<span class="session-hit-pill">Full Body</span>'}
      </div>
    </div>
  `;
}

function getExercisePhase(ex) {
  if (ex.phase && ['warmup', 'main', 'cooldown'].includes(ex.phase)) {
    return ex.phase;
  }
  const name = (ex.exercise_name || ex.name || '').toLowerCase();
  const pattern = (ex.movement_pattern || '').toLowerCase();
  const day = (ex.day || '').toLowerCase();

  if (pattern.includes('warmup') || pattern.includes('mobility') || name.includes('swing') || name.includes('circle') || name.includes('activation') || name.includes('high knee') || name.includes('prep') || day.includes('mobility')) {
    return 'warmup';
  }
  if (pattern.includes('stretch') || pattern.includes('cooldown') || name.includes('stretch') || name.includes('pose') || name.includes('pigeon') || name.includes('hang') || name.includes('decompress')) {
    return 'cooldown';
  }
  return 'main';
}

function toggleRoutinePhaseAccordion(phase) {
  if (!state.routinePhaseOpen) {
    state.routinePhaseOpen = { warmup: true, main: true, cooldown: true };
  }
  state.routinePhaseOpen[phase] = !state.routinePhaseOpen[phase];
  render();
}

function moveExerciseInPhase(phase, indexInPhase, delta) {
  if (!state.selectedWorkoutDetail || !state.selectedWorkoutDetail.exercises) return;
  const allExercises = state.selectedWorkoutDetail.exercises;

  // Filter exercises for this phase
  const phaseExercises = allExercises.filter(ex => getExercisePhase(ex) === phase);
  const targetPhaseIndex = indexInPhase + delta;
  if (targetPhaseIndex < 0 || targetPhaseIndex >= phaseExercises.length) return;

  const currentEx = phaseExercises[indexInPhase];
  const targetEx = phaseExercises[targetPhaseIndex];

  // Find their real indices in allExercises
  const currentRealIdx = allExercises.indexOf(currentEx);
  const targetRealIdx = allExercises.indexOf(targetEx);

  if (currentRealIdx !== -1 && targetRealIdx !== -1) {
    allExercises[currentRealIdx] = targetEx;
    allExercises[targetRealIdx] = currentEx;

    allExercises.forEach((ex, i) => {
      ex.order_in_workout = i + 1;
      ex.order_index = i + 1;
    });

    render();
  }
}

function renderPhaseAccordionGroupHtml(phaseKey, title, icon, phaseExercises, allExercises) {
  if (!state.routinePhaseOpen) {
    state.routinePhaseOpen = { warmup: true, main: true, cooldown: true };
  }
  const isOpen = state.routinePhaseOpen[phaseKey] !== false;
  const count = phaseExercises.length;
  const totalSets = phaseExercises.reduce((sum, ex) => sum + (ex.sets || 1), 0);

  return `
    <div class="routine-phase-accordion phase-${phaseKey}">
      <div class="routine-phase-header" onclick="toggleRoutinePhaseAccordion('${phaseKey}')">
        <div class="routine-phase-title-wrap">
          <span class="routine-phase-icon">${icon}</span>
          <span class="routine-phase-name">${title}</span>
          <span class="routine-phase-badge">${count} movements · ${totalSets} sets</span>
        </div>
        <div class="routine-phase-controls" onclick="event.stopPropagation()">
          <button type="button" class="routine-phase-add-btn" onclick="openAddExerciseSheet('${phaseKey}')" title="Add movement to ${title}">
            + Add
          </button>
          <button type="button" class="routine-phase-chevron-btn ${isOpen ? 'open' : ''}" onclick="toggleRoutinePhaseAccordion('${phaseKey}')" title="Toggle section">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      ${isOpen ? `
        <div class="routine-phase-body">
          ${count === 0 ? `
            <div class="routine-phase-empty">
              <span>No ${title.toLowerCase()} exercises added yet.</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openAddExerciseSheet('${phaseKey}')" style="margin-top:4px; font-size:12px;">
                + Add ${title} Movements
              </button>
            </div>
          ` : phaseExercises.map((ex, pIdx) => {
            const realIdx = allExercises.indexOf(ex);
            const pattern = ex.movement_pattern || ex.exercise_name || ex.name;
            const thumbHtml = (typeof window !== 'undefined' && window.ExerciseAnimation)
              ? window.ExerciseAnimation.render(pattern, { size: 'sm', interactive: false })
              : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FF5D5D" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>`;

            const setsVal = ex.sets || 3;
            const repsVal = ex.target_reps || ex.reps || (ex.hold_seconds ? `${ex.hold_seconds}s` : '10');

            const reqEquipment = typeof getExerciseRequiredEquipment === 'function' ? getExerciseRequiredEquipment(ex.exercise_name || ex.name, ex.movement_pattern) : 'floor';
            const currentProfile = typeof getEquipmentProfile === 'function' ? getEquipmentProfile() : ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor'];
            const hasEquipment = reqEquipment === 'floor' || currentProfile.includes(reqEquipment);
            const equipmentNames = {
              pullup_bar: 'Pull-up Bar',
              rings: 'Rings',
              dip_bars: 'Dip Station',
              parallettes: 'Parallettes',
              resistance_bands: 'Bands',
              weight_vest: 'Weight Vest',
              ab_wheel: 'Ab Wheel',
              floor: 'Bodyweight'
            };
            const reqEquipmentName = equipmentNames[reqEquipment] || reqEquipment;

            return `
              <div class="routine-ex-item-card">
                <div class="routine-ex-item-thumb">
                  ${thumbHtml}
                </div>
                <div class="routine-ex-item-info" onclick="openExerciseConfigurator(${ex.exercise_id || ex.id || 1})">
                  <div class="routine-ex-item-name">${escapeHtml(ex.exercise_name || ex.name)}</div>
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;">
                    <span class="routine-ex-item-sets-reps">${setsVal} × ${repsVal}</span>
                    ${!hasEquipment ? `<span class="badge-muscle" style="font-size:9.5px; padding:1px 6px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3);" title="Unavailable in active equipment profile">⚠️ Needs ${escapeHtml(reqEquipmentName)}</span>` : ''}
                  </div>
                </div>
                <div class="routine-ex-item-controls">
                  <button type="button" class="btn-superset-link ${ex.is_superset ? 'active' : ''}" title="Superset with exercise above" onclick="toggleExerciseSuperset(${realIdx})">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  <div class="routine-ex-arrows-col">
                    <button type="button" class="btn-order-arrow up" title="Move Up" onclick="moveExerciseInPhase('${phaseKey}', ${pIdx}, -1)">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button type="button" class="btn-order-arrow down" title="Move Down" onclick="moveExerciseInPhase('${phaseKey}', ${pIdx}, 1)">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                  <button type="button" class="btn-remove-ex" title="Remove" onclick="removeExerciseFromRoutine(${realIdx})">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderRoutineEditorModalHtml() {
  if (!state.showRoutineEditorModal || !state.editingRoutineId) return '';

  const workout = (state.selectedWorkoutDetail && state.selectedWorkoutDetail.id === state.editingRoutineId)
    ? state.selectedWorkoutDetail
    : (state.workouts.find(w => w.id === state.editingRoutineId) || state.workouts[0]);

  if (!workout) return '';

  const exercises = workout.exercises || [];

  const warmupExercises = exercises.filter(ex => getExercisePhase(ex) === 'warmup');
  const mainExercises = exercises.filter(ex => getExercisePhase(ex) === 'main');
  const cooldownExercises = exercises.filter(ex => getExercisePhase(ex) === 'cooldown');

  // Explicitly tag phases
  warmupExercises.forEach(e => e.phase = 'warmup');
  mainExercises.forEach(e => e.phase = 'main');
  cooldownExercises.forEach(e => e.phase = 'cooldown');

  return `
    <div class="routine-editor-view" id="routine-editor-screen">
      <!-- Header (Screenshot 1) -->
      <div class="routine-editor-nav">
        <button class="settings-back-btn split-back-btn" type="button" onclick="closeRoutineEditorModal()" title="Back" aria-label="Back">
          ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
        </button>
        <input type="text" 
               class="routine-title-input" 
               value="${escapeHtml(workout.name || 'New routine')}" 
               placeholder="New routine"
               oninput="updateRoutineTitle(this.value)">
        <button class="routine-avatar-btn" type="button" title="View Muscle Anatomy">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="5" r="3"/>
            <path d="M6.5 9h11L19 14l-3 1-1 7h-6l-1-7-3-1 1.5-5z"/>
          </svg>
        </button>
      </div>

      <div class="routine-editor-body">
        <!-- Progression Settings Card (Screenshot 1) -->
        <div class="routine-settings-card">
          <div class="routine-settings-row">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="routine-settings-icon-box progression">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <div class="routine-settings-label">Progression</div>
            </div>
            <div class="routine-settings-val">
              <span>Linear progression</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          <div class="routine-settings-row">
            <div style="display:flex; align-items:flex-start; gap:12px; flex:1;">
              <div class="routine-settings-icon-box pause" style="margin-top:2px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" stroke-width="3"><line x1="6" y1="4" x2="6" y2="20"/><line x1="14" y1="4" x2="14" y2="20"/></svg>
              </div>
              <div>
                <div class="routine-settings-label">Exclude from automatic progression</div>
                <div class="routine-settings-sub">Use for planned deloads. Workouts stay in history and statistics.</div>
              </div>
            </div>
            <label class="switch" style="margin-left:8px;">
              <input type="checkbox" onchange="toggleExcludeProgression(this.checked)" ${workout.exclude_progression ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
          </div>
        </div>

        <div class="routine-settings-caption">
          Applies to every exercise in this routine that does not set its own rule.
        </div>

        <!-- Collapsible Phase Groups (Warm-up, Main Workout, Cool-down) -->
        <div class="routine-phase-groups-container" style="display:flex; flex-direction:column; gap:4px;">
          ${renderPhaseAccordionGroupHtml('warmup', 'Warm-up', '🔥', warmupExercises, exercises)}
          ${renderPhaseAccordionGroupHtml('main', 'Main Workout', '⚡', mainExercises, exercises)}
          ${renderPhaseAccordionGroupHtml('cooldown', 'Cool-down', '🧘', cooldownExercises, exercises)}
        </div>

        <!-- "What this session hits" Section (Screenshot 2) -->
        ${renderWhatThisSessionHitsHtml(exercises)}

        <div class="superset-help-caption">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Tap the link button on an exercise to superset it with the one above — you'll do them back-to-back.</span>
        </div>

        <!-- Action Buttons (Screenshot 2) -->
        <div class="routine-editor-bottom-actions">
          <button type="button" class="btn-add-ex-main" onclick="openAddExerciseSheet('main')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add exercise
          </button>
          <button type="button" class="btn-delete-routine" onclick="handleDeleteWorkoutFromEditor(${workout.id})">
            Delete routine
          </button>
        </div>
      </div>
    </div>
  `;
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

// ─── Add Exercise & Configurator Bottom Sheet (Exact UI matching Screenshot 1, 2, 3) ───

const ADD_EX_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'back', label: 'Back' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'chest', label: 'Chest' },
  { id: 'legs', label: 'Legs' },
  { id: 'abs', label: 'Abs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'skills', label: 'Skills & Holds' }
];

const ADD_EX_PHASES = [
  { id: 'all', label: 'All Phases' },
  { id: 'warmup', label: '🔥 Warm-up' },
  { id: 'main', label: '⚡ Main-workout' },
  { id: 'cooldown', label: '🧘 Cooldown' }
];

function setAddExPhaseFilter(phaseId) {
  state.addExercisePhaseFilter = phaseId;
  if (phaseId !== 'all') {
    state.configExercisePhase = phaseId;
    state.addExercisePhase = phaseId;
  }
  render();
}

function openAddExerciseSheet(phase = 'main') {
  state.showAddExerciseSheet = true;
  state.addExercisePhase = phase;
  state.addExercisePhaseFilter = phase || 'all';
  state.configExercisePhase = phase || 'main';
  state.selectedExerciseForConfig = null;
  state.addExerciseCategory = 'all';
  state.addExerciseSearch = '';
  render();
}

function closeAddExerciseSheet() {
  state.showAddExerciseSheet = false;
  state.selectedExerciseForConfig = null;
  render();
}

function openExerciseConfigurator(exerciseId) {
  const ex = (state.exercises || []).find(e => e.id === exerciseId);
  if (!ex) return;

  state.selectedExerciseForConfig = ex;
  state.configExerciseType = ex.type || 'reps';
  state.configExerciseSets = ex.default_sets || 3;
  state.configExerciseReps = ex.default_reps || (ex.type === 'reps' ? 10 : null);
  state.configExerciseDuration = ex.default_duration_sec || (ex.type === 'duration' ? 30 : null);
  state.configExerciseRest = ex.default_rest_sec || 90;
  state.configExercisePhase = state.addExercisePhaseFilter !== 'all' ? state.addExercisePhaseFilter : (state.addExercisePhase || 'main');
  state.configAnimationPaused = false;
  render();
}

function closeExerciseConfigurator() {
  state.selectedExerciseForConfig = null;
  render();
}

function toggleConfigType(type) {
  state.configExerciseType = type;
  if (type === 'reps' && !state.configExerciseReps) {
    state.configExerciseReps = 10;
  }
  if (type === 'duration' && !state.configExerciseDuration) {
    state.configExerciseDuration = 30;
  }
  render();
}

function adjustConfigSets(delta) {
  state.configExerciseSets = Math.max(1, (state.configExerciseSets || 3) + delta);
  render();
}

function adjustConfigReps(delta) {
  if (state.configExerciseType === 'reps') {
    state.configExerciseReps = Math.max(1, (state.configExerciseReps || 10) + delta);
  } else {
    state.configExerciseDuration = Math.max(5, (state.configExerciseDuration || 30) + (delta * 5));
  }
  render();
}

function toggleConfigAnimationPause() {
  state.configAnimationPaused = !state.configAnimationPaused;
  if (typeof window !== 'undefined' && window.ExerciseAnimation) {
    if (state.configAnimationPaused) {
      window.ExerciseAnimation.pauseAll();
    } else {
      window.ExerciseAnimation.resumeAll();
    }
  }
  render();
}

function submitAddConfiguredExercise() {
  syncWorkoutEditorFormToState();
  const ex = state.selectedExerciseForConfig;
  if (!ex) return;

  if (!state.selectedWorkoutDetail) return;
  if (!state.selectedWorkoutDetail.exercises) state.selectedWorkoutDetail.exercises = [];

  const phase = state.configExercisePhase || state.addExercisePhase || 'main';
  const isHold = state.configExerciseType === 'duration';
  const sets = state.configExerciseSets || 3;
  const reps = !isHold ? (state.configExerciseReps || 10) : null;
  const duration = isHold ? (state.configExerciseDuration || 30) : null;
  const rest = state.configExerciseRest || (phase === 'main' ? 90 : (phase === 'warmup' ? 45 : 30));

  const newSlot = {
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_type: state.configExerciseType,
    phase: phase,
    sets: sets,
    target_reps: reps,
    hold_seconds: duration,
    rest_seconds: rest,
    target_tempo: (phase === 'main' && !isHold) ? '3-0-1-0' : null,
    order_in_workout: state.selectedWorkoutDetail.exercises.length + 1
  };

  state.selectedWorkoutDetail.exercises.push(newSlot);

  if (!state.builderSections) state.builderSections = {};
  state.builderSections[phase] = true;

  state.showAddExerciseSheet = false;
  state.selectedExerciseForConfig = null;

  showToast(`Added ${sets} sets of "${ex.name}" to ${phase.toUpperCase()}!`);
  render();
}

function setConfigExercisePhase(phase) {
  state.configExercisePhase = phase;
  render();
}

function setAddExCategory(catId) {
  state.addExerciseCategory = catId;
  render();
}

function handleAddExSearch(val) {
  state.addExerciseSearch = val;
  render();
}

function openCreateCustomExerciseModal() {
  const name = prompt('Enter exercise name:');
  if (!name || !name.trim()) return;
  const pattern = prompt('Enter muscle category (e.g. Chest, Back, Legs, Abs, Shoulders):', 'Abs') || 'Abs';

  const newId = 1000 + Math.floor(Math.random() * 9000);
  const newEx = {
    id: newId,
    name: name.trim(),
    movement_pattern: pattern.toLowerCase().trim(),
    day: pattern.trim(),
    type: 'reps',
    default_sets: 3,
    default_reps: 10,
    default_rest_sec: 90
  };

  if (!state.exercises) state.exercises = [];
  state.exercises.unshift(newEx);
  
  openExerciseConfigurator(newId);
}

function getExerciseMuscleLabel(ex) {
  if (typeof window !== 'undefined' && window.MuscleMap) {
    const m = window.MuscleMap.getExerciseMuscles(ex.name, ex.movement_pattern);
    if (m && m.primary && m.primary.length > 0) {
      return m.primary.slice(0, 2).map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
    }
  }
  return ex.day || 'Abs';
}

function getExercisePillTags(ex) {
  const tags = [];
  if (typeof window !== 'undefined' && window.MuscleMap) {
    const m = window.MuscleMap.getExerciseMuscles(ex.name, ex.movement_pattern);
    if (m && m.primary) {
      m.primary.forEach(k => tags.push(k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
    }
    tags.push('Body Weight');
    if (m && m.secondary) {
      m.secondary.forEach(k => tags.push(k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
    }
  } else {
    tags.push(ex.day || 'Abs', 'Body Weight');
  }
  return tags.slice(0, 4);
}

function renderAddExerciseSheetHtml() {
  if (!state.showAddExerciseSheet) return '';

  if (state.selectedExerciseForConfig) {
    return renderExerciseConfiguratorSheetHtml();
  }

  const allExercises = state.exercises || [];
  const query = (state.addExerciseSearch || '').trim().toLowerCase();
  const activeCat = state.addExerciseCategory || 'all';
  const activePhase = state.addExercisePhaseFilter || 'all';

  // Get IDs of exercises currently in routine
  const routineExList = (state.selectedWorkoutDetail && state.selectedWorkoutDetail.exercises) || [];
  const chosenExerciseIds = new Set(routineExList.map(e => e.exercise_id || e.id));

  let filtered = allExercises.filter(ex => {
    // 1. Search Query
    if (query) {
      const name = (ex.name || '').toLowerCase();
      const pattern = (ex.movement_pattern || '').toLowerCase();
      const day = (ex.day || '').toLowerCase();
      if (!name.includes(query) && !pattern.includes(query) && !day.includes(query)) return false;
    }

    // 2. Category / Chosen filter
    if (activeCat === 'chosen') {
      if (!chosenExerciseIds.has(ex.id)) return false;
    } else if (activeCat !== 'all') {
      const p = (ex.movement_pattern || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      if (activeCat === 'chest' && !p.includes('push') && !p.includes('chest') && !d.includes('push') && !n.includes('push') && !n.includes('dip')) return false;
      if (activeCat === 'back' && !p.includes('pull') && !p.includes('row') && !p.includes('lat') && !d.includes('pull') && !n.includes('pull') && !n.includes('chin') && !n.includes('row')) return false;
      if (activeCat === 'legs' && !p.includes('leg') && !p.includes('squat') && !p.includes('hinge') && !d.includes('leg') && !n.includes('squat') && !n.includes('lunge')) return false;
      if (activeCat === 'abs' && !p.includes('core') && !p.includes('ab') && !d.includes('core') && !n.includes('sit') && !n.includes('plank') && !n.includes('dragon') && !n.includes('hollow') && !n.includes('leg raise')) return false;
      if (activeCat === 'shoulders' && !p.includes('vertical') && !p.includes('delt') && !p.includes('pike') && !n.includes('pike') && !n.includes('handstand')) return false;
      if (activeCat === 'arms' && !p.includes('dip') && !p.includes('chin') && !p.includes('curl') && !p.includes('triceps') && !n.includes('dip') && !n.includes('chin')) return false;
      if (activeCat === 'skills' && !p.includes('skill') && !p.includes('hold') && !p.includes('planche') && !p.includes('lever') && !n.includes('planche') && !n.includes('lever') && !n.includes('handstand')) return false;
      if (activeCat === 'cardio' && !p.includes('cardio') && !p.includes('jump') && !p.includes('climber') && !n.includes('jump') && !n.includes('burpee') && !n.includes('bike')) return false;
    }

    // 3. Phase Filter (Warm-up, Main-workout, Cooldown)
    if (activePhase !== 'all') {
      const p = (ex.movement_pattern || '').toLowerCase();
      const n = (ex.name || '').toLowerCase();
      const d = (ex.day || '').toLowerCase();
      if (activePhase === 'warmup') {
        const isWarmup = p.includes('warmup') || p.includes('mobility') || p.includes('prep') || p.includes('stretch') || n.includes('circle') || n.includes('dislocate') || n.includes('cat') || n.includes('world') || n.includes('wrist') || n.includes('prep') || d.includes('mobility');
        if (!isWarmup) return false;
      } else if (activePhase === 'main') {
        const isMain = p.includes('push') || p.includes('pull') || p.includes('squat') || p.includes('dip') || p.includes('core') || p.includes('hinge') || p.includes('handstand') || p.includes('planche') || p.includes('lever') || n.includes('push') || n.includes('pull') || n.includes('dip') || n.includes('squat') || n.includes('sit-up') || n.includes('bend') || n.includes('air bike') || n.includes('toucher');
        if (!isMain) return false;
      } else if (activePhase === 'cooldown') {
        const isCooldown = p.includes('cooldown') || p.includes('stretch') || p.includes('mobility') || n.includes('stretch') || n.includes('pigeon') || n.includes('child') || n.includes('cobra') || n.includes('hang') || n.includes('decompression');
        if (!isCooldown) return false;
      }
    }

    return true;
  });

  return `
    <div class="add-ex-sheet-backdrop" onclick="if(event.target === this) closeAddExerciseSheet()">
      <div class="add-ex-sheet-container">
        <div class="add-ex-sheet-handle"></div>
        
        <div class="add-ex-sheet-header">
          <h2 class="add-ex-sheet-title">Add exercise</h2>
          <button type="button" class="btn-icon-close" onclick="closeAddExerciseSheet()" style="background:rgba(255,255,255,0.06); border:none; border-radius:50%; width:30px; height:30px; color:#8E8E93; cursor:pointer; font-size:16px;">✕</button>
        </div>

        <div class="add-ex-search-box">
          <svg class="add-ex-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" 
                 class="add-ex-search-input" 
                 placeholder="Search ${allExercises.length} exercises..." 
                 value="${escapeHtml(state.addExerciseSearch || '')}"
                 oninput="handleAddExSearch(this.value)">
        </div>

        <!-- Row 1: Chosen & Muscle Groups (Screenshot 3) -->
        <div class="add-ex-filter-pills-row">
          <button type="button" 
                  class="add-ex-filter-pill ${activeCat === 'chosen' ? 'active' : ''}" 
                  style="${activeCat === 'chosen' ? 'background:#FF5D5D; color:#FFF;' : 'background:rgba(255,255,255,0.06);'}"
                  onclick="setAddExCategory('chosen')">
            ★ Chosen (${chosenExerciseIds.size})
          </button>
          ${ADD_EX_CATEGORIES.map(cat => `
            <button type="button" 
                    class="add-ex-filter-pill ${activeCat === cat.id ? 'active' : ''}" 
                    onclick="setAddExCategory('${cat.id}')">
              ${cat.label}
            </button>
          `).join('')}
        </div>

        <!-- Row 2: Phase Filters (Warm-up, Main-workout, Cooldown) -->
        <div class="add-ex-filter-pills-row" style="margin-bottom:8px;">
          ${ADD_EX_PHASES.map(ph => {
            const isPhActive = activePhase === ph.id;
            let customStyle = '';
            if (isPhActive) {
              if (ph.id === 'warmup') customStyle = 'background:#FFB300; border-color:#FFB300; color:#000; font-weight:700;';
              else if (ph.id === 'cooldown') customStyle = 'background:#00C9A7; border-color:#00C9A7; color:#000; font-weight:700;';
              else customStyle = 'background:#FF5D5D; border-color:#FF5D5D; color:#FFF; font-weight:700;';
            }
            return `
              <button type="button" 
                      class="add-ex-filter-pill ${isPhActive ? 'active' : ''}" 
                      style="${customStyle}"
                      onclick="setAddExPhaseFilter('${ph.id}')">
                ${ph.label}
              </button>
            `;
          }).join('')}
        </div>

        <div class="add-ex-list-scroll">
          <div class="add-ex-custom-card" onclick="openCreateCustomExerciseModal()">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="add-ex-custom-icon">✨</div>
              <div>
                <div style="font-size:15px; font-weight:600; color:#FFFFFF;">Create your own exercise</div>
                <div style="font-size:12px; color:#8E8E93;">name + body part, custom sets/reps</div>
              </div>
            </div>
            <div class="add-ex-item-plus-btn">+</div>
          </div>

          ${filtered.map(ex => {
            const pattern = ex.movement_pattern || ex.name;
            const thumbHtml = (typeof window !== 'undefined' && window.ExerciseAnimation)
              ? window.ExerciseAnimation.render(pattern, { size: 'sm', interactive: false })
              : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FF5D5D" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>`;

            const muscleLabel = getExerciseMuscleLabel(ex);
            const isChosen = chosenExerciseIds.has(ex.id);

            return `
              <div class="add-ex-item-card" onclick="openExerciseConfigurator(${ex.id})">
                <div class="add-ex-item-thumb">
                  ${thumbHtml}
                </div>
                <div class="add-ex-item-info">
                  <div class="add-ex-item-name">${escapeHtml(ex.name)}</div>
                  <div class="add-ex-item-meta">${muscleLabel} · Body Weight</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${isChosen ? `<span style="background:rgba(255,93,93,0.2); color:#FF5D5D; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">★</span>` : ''}
                  <button type="button" class="add-ex-item-plus-btn" onclick="event.stopPropagation(); openExerciseConfigurator(${ex.id})">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderExerciseConfiguratorSheetHtml() {
  const ex = state.selectedExerciseForConfig;
  if (!ex) return '';

  const pattern = ex.movement_pattern || ex.name;
  const isHold = state.configExerciseType === 'duration';
  const sets = state.configExerciseSets || 3;
  const val = isHold ? (state.configExerciseDuration || 30) : (state.configExerciseReps || 10);
  const isPaused = !!state.configAnimationPaused;

  const visualHtml = (typeof window !== 'undefined' && window.ExerciseAnimation)
    ? window.ExerciseAnimation.render(pattern, { size: 'lg', isPaused, interactive: true })
    : `<div style="padding:40px; text-align:center; color:#FF5D5D; font-size:18px; font-weight:700;">${escapeHtml(ex.name)}</div>`;

  const tags = getExercisePillTags(ex);

  return `
    <div class="add-ex-sheet-backdrop" onclick="if(event.target === this) closeAddExerciseSheet()">
      <div class="add-ex-sheet-container">
        <div class="add-ex-sheet-handle"></div>
        
        <div class="add-ex-sheet-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <button type="button" class="btn-icon-back" onclick="closeExerciseConfigurator()" style="background:none; border:none; color:#FFFFFF; font-size:20px; cursor:pointer; padding:0;">←</button>
            <h2 class="add-ex-sheet-title">${escapeHtml(ex.name)}</h2>
          </div>
          <button type="button" class="btn-icon-close" onclick="closeAddExerciseSheet()" style="background:rgba(255,255,255,0.06); border:none; border-radius:50%; width:30px; height:30px; color:#8E8E93; cursor:pointer; font-size:16px;">✕</button>
        </div>

        <div class="add-ex-config-body">
          <div class="add-ex-visual-showcase" onclick="toggleConfigAnimationPause()">
            ${visualHtml}
            <div class="add-ex-pause-btn">
              ${isPaused ? '▶ resume' : '|| tap to pause'}
            </div>
          </div>

          <div class="add-ex-tag-pills">
            ${tags.map(t => `<span class="add-ex-tag-pill">${t}</span>`).join('')}
          </div>

          <div class="add-ex-type-segment">
            <button type="button" 
                    class="add-ex-type-btn ${!isHold ? 'active' : ''}" 
                    onclick="toggleConfigType('reps')">
              Reps
            </button>
            <button type="button" 
                    class="add-ex-type-btn ${isHold ? 'active' : ''}" 
                    onclick="toggleConfigType('duration')">
              Time
            </button>
          </div>

          <div class="add-ex-steppers-grid">
            <div class="add-ex-stepper-col">
              <span class="add-ex-stepper-label">Sets</span>
              <div class="add-ex-stepper-box">
                <button type="button" class="add-ex-stepper-btn" onclick="adjustConfigSets(-1)">−</button>
                <span class="add-ex-stepper-val">${sets}</span>
                <button type="button" class="add-ex-stepper-btn" onclick="adjustConfigSets(1)">+</button>
              </div>
            </div>

            <div class="add-ex-stepper-col">
              <span class="add-ex-stepper-label">${isHold ? 'Secs' : 'Reps'}</span>
              <div class="add-ex-stepper-box">
                <button type="button" class="add-ex-stepper-btn" onclick="adjustConfigReps(-1)">−</button>
                <span class="add-ex-stepper-val">${val}</span>
                <button type="button" class="add-ex-stepper-btn" onclick="adjustConfigReps(1)">+</button>
              </div>
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <span class="add-ex-stepper-label" style="display:block; margin-bottom:8px;">Add into Phase</span>
            <div style="display:flex; gap:8px;">
              <button type="button" 
                      class="btn-quick-add-phase btn-add-prep ${state.configExercisePhase === 'warmup' ? 'is-active-phase' : ''}" 
                      style="flex:1; padding:8px 0; text-align:center; font-size:12px; ${state.configExercisePhase === 'warmup' ? 'background:#FFB300; color:#000;' : ''}"
                      onclick="setConfigExercisePhase('warmup')">
                🔥 Warm-up
              </button>
              <button type="button" 
                      class="btn-quick-add-phase btn-add-train ${state.configExercisePhase === 'main' ? 'is-active-phase' : ''}" 
                      style="flex:1; padding:8px 0; text-align:center; font-size:12px; ${state.configExercisePhase === 'main' ? 'background:#FF5D5D; color:#FFF;' : ''}"
                      onclick="setConfigExercisePhase('main')">
                ⚡ Main
              </button>
              <button type="button" 
                      class="btn-quick-add-phase btn-add-recover ${state.configExercisePhase === 'cooldown' ? 'is-active-phase' : ''}" 
                      style="flex:1; padding:8px 0; text-align:center; font-size:12px; ${state.configExercisePhase === 'cooldown' ? 'background:#00C9A7; color:#000;' : ''}"
                      onclick="setConfigExercisePhase('cooldown')">
                🧘 Cool-down
              </button>
            </div>
          </div>

          <button type="button" class="add-ex-submit-btn" onclick="submitAddConfiguredExercise()">
            Add to routine
          </button>
        </div>
      </div>
    </div>
  `;
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
  window.toggleBuilderSection = toggleBuilderSection;

  // Routine Editor & Reordering Handlers (Screenshot 1, 2)
  window.openRoutineEditorModal = openRoutineEditorModal;
  window.closeRoutineEditorModal = closeRoutineEditorModal;
  window.renderRoutineEditorModalHtml = renderRoutineEditorModalHtml;
  window.updateRoutineTitle = updateRoutineTitle;
  window.toggleExcludeProgression = toggleExcludeProgression;
  window.moveExerciseOrder = moveExerciseOrder;
  window.moveExerciseInPhase = moveExerciseInPhase;
  window.toggleRoutinePhaseAccordion = toggleRoutinePhaseAccordion;
  window.getExercisePhase = getExercisePhase;
  window.removeExerciseFromRoutine = removeExerciseFromRoutine;
  window.toggleExerciseSuperset = toggleExerciseSuperset;
  window.handleDeleteWorkoutFromEditor = handleDeleteWorkoutFromEditor;
  window.renderWhatThisSessionHitsHtml = renderWhatThisSessionHitsHtml;
  window.renderCreateWorkoutModalHtml = renderCreateWorkoutModalHtml;
  window.renderRoutineLibCategoryChips = renderRoutineLibCategoryChips;
  window.renderGroupedExerciseLibraryHtml = renderGroupedExerciseLibraryHtml;
  window.setRoutineLibCategoryFilter = setRoutineLibCategoryFilter;
  window.handleRoutineLibSearch = handleRoutineLibSearch;
  window.addExerciseToCurrentRoutine = addExerciseToCurrentRoutine;

  // Add Exercise Bottom Sheet & Configurator Handlers (Screenshot 1, 2, 3)
  window.openAddExerciseSheet = openAddExerciseSheet;
  window.closeAddExerciseSheet = closeAddExerciseSheet;
  window.openExerciseConfigurator = openExerciseConfigurator;
  window.closeExerciseConfigurator = closeExerciseConfigurator;
  window.toggleConfigType = toggleConfigType;
  window.adjustConfigSets = adjustConfigSets;
  window.adjustConfigReps = adjustConfigReps;
  window.toggleConfigAnimationPause = toggleConfigAnimationPause;
  window.submitAddConfiguredExercise = submitAddConfiguredExercise;
  window.setConfigExercisePhase = setConfigExercisePhase;
  window.setAddExCategory = setAddExCategory;
  window.setAddExPhaseFilter = setAddExPhaseFilter;
  window.handleAddExSearch = handleAddExSearch;
  window.openCreateCustomExerciseModal = openCreateCustomExerciseModal;
  window.renderAddExerciseSheetHtml = renderAddExerciseSheetHtml;
  window.renderExerciseConfiguratorSheetHtml = renderExerciseConfiguratorSheetHtml;

  // Split & Schedule Modal Handlers
  window.openEditSplitModal = openEditSplitModal;
  window.closeEditSplitModal = closeEditSplitModal;
  window.handleUpdateSplit = handleUpdateSplit;
  window.openCreateSplitModal = openCreateSplitModal;
  window.closeCreateSplitModal = closeCreateSplitModal;
  window.handleCreateSplit = handleCreateSplit;
  window.handleSavedSplitCardClick = handleSavedSplitCardClick;
  window.applyCreateSplitPreset = applyCreateSplitPreset;
  window.selectSplit = selectSplit;
  window.activateSplit = activateSplit;
  window.handleDeleteSplit = handleDeleteSplit;
  window.openDayEditor = openDayEditor;
  window.closeDayEditor = closeDayEditor;
  window.handleSaveScheduleDay = handleSaveScheduleDay;
  window.openModalDaySheet = openModalDaySheet;
  window.closeModalDaySheet = closeModalDaySheet;
  window.selectModalDayRoutine = selectModalDayRoutine;
  window.renderModalDayPickerSheetHtml = renderModalDayPickerSheetHtml;
  window.renderModalSplitRoutinesSection = renderModalSplitRoutinesSection;

  // Exercise Library Picker & Routine Assigner
  window.openExerciseLibraryPicker = openExerciseLibraryPicker;
  window.closeExerciseLibraryPicker = closeExerciseLibraryPicker;
  window.setExercisePickerFilter = setExercisePickerFilter;
  window.handlePickerSearch = handlePickerSearch;
  window.addExerciseFromPicker = addExerciseFromPicker;
  window.openAssignRoutineToDaysModal = openAssignRoutineToDaysModal;
  window.closeAssignRoutineToDaysModal = closeAssignRoutineToDaysModal;
  window.handleSaveAssignRoutineToDays = handleSaveAssignRoutineToDays;
  window.selectWorkoutAndEditRoutine = selectWorkoutAndEditRoutine;
  window.setSplitSubTab = setSplitSubTab;
}


