/**
 * CalistheniX — Exercise Library & Progression Encyclopedia View
 */

let _librarySearchQuery = '';
let _libraryActiveFilter = 'All';
let _selectedExerciseForModal = null;

function renderExerciseLibraryView() {
  const exercises = state.exercises || [];
  
  // Filtering
  const filtered = exercises.filter(ex => {
    // Category / Filter chip check
    if (_libraryActiveFilter !== 'All') {
      const filterLower = _libraryActiveFilter.toLowerCase();
      const pattern = (ex.movement_pattern || '').toLowerCase();
      const day = (ex.day || '').toLowerCase();
      const name = (ex.name || '').toLowerCase();
      
      if (_libraryActiveFilter === 'Push' && !pattern.includes('push') && !day.includes('push')) return false;
      if (_libraryActiveFilter === 'Pull' && !pattern.includes('pull') && !day.includes('pull')) return false;
      if (_libraryActiveFilter === 'Legs' && !pattern.includes('leg') && !pattern.includes('squat') && !day.includes('leg')) return false;
      if (_libraryActiveFilter === 'Core' && !pattern.includes('core') && !day.includes('core') && !name.includes('plank') && !name.includes('hollow')) return false;
      if (_libraryActiveFilter === 'Skill' && !pattern.includes('skill') && !day.includes('skill') && !name.includes('handstand') && !name.includes('lever') && !name.includes('planche')) return false;
      if (_libraryActiveFilter === 'Isometric' && ex.type !== 'duration') return false;
      if (_libraryActiveFilter === 'In Profile') {
        const req = typeof getExerciseRequiredEquipment === 'function' ? getExerciseRequiredEquipment(ex.name, ex.movement_pattern) : 'floor';
        const profile = typeof getEquipmentProfile === 'function' ? getEquipmentProfile() : [];
        if (req !== 'floor' && !profile.includes(req)) return false;
      }
    }

    // Search query check
    if (_librarySearchQuery.trim()) {
      const q = _librarySearchQuery.toLowerCase().trim();
      const matchName = (ex.name || '').toLowerCase().includes(q);
      const matchPattern = (ex.movement_pattern || '').toLowerCase().includes(q);
      const matchDay = (ex.day || '').toLowerCase().includes(q);
      return matchName || matchPattern || matchDay;
    }

    return true;
  });

  const filterChips = ['All', 'In Profile', 'Push', 'Pull', 'Legs', 'Core', 'Skill', 'Isometric'];

  return `
    <div class="library-view-wrap">
      <div class="library-header-card">
        <div class="library-header-title-group">
          <h1>
            <svg class="cx-icon cx-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
            Exercise Library
          </h1>
          <p class="library-header-subtitle">Progression chains, movement tempos & calisthenics biomechanics catalog</p>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="library-count-badge">${exercises.length} Movements</span>
          <button class="btn btn-primary btn-sm" onclick="openAddCustomExerciseModal()">
            <svg class="cx-icon cx-icon-xs cx-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Custom Exercise
          </button>
        </div>
      </div>

      <div class="library-search-section">
        <div class="library-search-box">
          <span class="library-search-icon">
            <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input 
            type="text" 
            class="library-search-input" 
            placeholder="Search movements (e.g. Muscle-up, Planche, Dips, Handstand)..." 
            value="${escapeHtml(_librarySearchQuery)}" 
            oninput="handleLibrarySearch(this.value)"
          />
        </div>

        <div class="library-filter-chips">
          ${filterChips.map(chip => `
            <div 
              class="library-chip ${chip === _libraryActiveFilter ? 'active' : ''}" 
              onclick="setLibraryFilter('${chip}')"
            >
              ${chip}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="library-cards-grid">
        ${(!exercises || exercises.length === 0) ? `
          <div class="skeleton-exercise-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="cx-skeleton skeleton-text skeleton-title" style="width: 55%; margin: 0;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 55px;"></div>
            </div>
            <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 40%; margin-top: 8px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 60px;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 70px;"></div>
            </div>
          </div>
          <div class="skeleton-exercise-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="cx-skeleton skeleton-text skeleton-title" style="width: 50%; margin: 0;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 55px;"></div>
            </div>
            <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 35%; margin-top: 8px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 65px;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 65px;"></div>
            </div>
          </div>
          <div class="skeleton-exercise-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="cx-skeleton skeleton-text skeleton-title" style="width: 60%; margin: 0;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 55px;"></div>
            </div>
            <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 45%; margin-top: 8px;"></div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 70px;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 60px;"></div>
            </div>
          </div>
        ` : (filtered.length === 0 ? `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">
              <svg class="cx-icon cx-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <div class="empty-state-title">No Movements Found</div>
            <div class="empty-state-message">No movements matched "${escapeHtml(_librarySearchQuery)}" in category "${_libraryActiveFilter}".</div>
            <div class="empty-state-actions">
              <button class="btn btn-secondary btn-sm" onclick="clearLibraryFilters()">Clear Filters</button>
            </div>
          </div>
        ` : filtered.map(ex => renderExerciseCatalogCard(ex)).join(''))}
      </div>
    </div>
  `;
}

function renderExerciseCatalogCard(ex) {
  const prereq = ex.prerequisite_id ? state.exercises.find(e => e.id === ex.prerequisite_id) : null;
  const nextEx = ex.next_id ? state.exercises.find(e => e.id === ex.next_id) : null;
  
  // Compute muscle tags based on movement pattern and name
  const pattern = ex.movement_pattern || 'general';
  const isIsometric = ex.type === 'duration';

  let patternLabel = pattern.replace(/_/g, ' ');
  if (pattern.includes('push')) patternLabel = 'Push';
  else if (pattern.includes('pull')) patternLabel = 'Pull';
  else if (pattern.includes('squat') || pattern.includes('leg')) patternLabel = 'Legs';
  else if (pattern.includes('core')) patternLabel = 'Core';
  else if (pattern.includes('skill')) patternLabel = 'Skill';

  let muscles = [];
  if (patternLabel === 'Push') muscles = ['Chest', 'Shoulders', 'Triceps'];
  else if (patternLabel === 'Pull') muscles = ['Lats', 'Upper Back', 'Biceps'];
  else if (patternLabel === 'Legs') muscles = ['Quads', 'Glutes', 'Hamstrings'];
  else if (patternLabel === 'Core') muscles = ['Abs', 'Obliques', 'Lower Back'];
  else if (patternLabel === 'Skill') muscles = ['Shoulders', 'Core', 'Stabilizers'];
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
    <div class="library-card" id="ex-card-${ex.id}">
      <div class="library-card-top">
        <h3 class="library-card-title">${escapeHtml(ex.name)}</h3>
      </div>

      <div class="library-badges-row">
        <span class="badge-pattern">${escapeHtml(patternLabel)}</span>
        <span class="badge-type">${isIsometric ? 'Hold (Secs)' : 'Reps Target'}</span>
        ${muscles.slice(0, 2).map(m => `<span class="badge-muscle">${escapeHtml(m)}</span>`).join('')}
        ${!hasEquipment ? `<span class="badge-muscle" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3);" title="Missing required equipment from active profile">⚠️ Needs ${escapeHtml(reqEquipmentName)}</span>` : ''}
      </div>

      ${(prereq || nextEx) ? `
        <div class="progression-chain-box">
          ${prereq ? `
            <div class="progression-chain-row">
              <span>Requires:</span>
              <button class="progression-link-btn" onclick="filterByExerciseName('${escapeHtml(prereq.name)}')">
                ${escapeHtml(prereq.name)}
              </button>
            </div>
          ` : ''}
          ${nextEx ? `
            <div class="progression-chain-row">
              <span>Next Step:</span>
              <button class="progression-link-btn" onclick="filterByExerciseName('${escapeHtml(nextEx.name)}')">
                ${escapeHtml(nextEx.name)} &rarr;
              </button>
            </div>
          ` : ''}
        </div>
      ` : `
        <div class="progression-chain-box" style="opacity:0.6;">
          <span>Standalone Movement · ${ex.day || 'General'}</span>
        </div>
      `}

      <div class="library-card-actions">
        <button class="btn-card-action" onclick="previewExerciseDetails(${ex.id})">
          <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Form & Muscles
        </button>
        <button class="btn-card-action btn-card-action-primary" onclick="openAddToWorkoutModal(${ex.id})">
          <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add to Routine
        </button>
      </div>
    </div>
  `;
}

function handleLibrarySearch(val) {
  _librarySearchQuery = val;
  render();
}

function setLibraryFilter(filter) {
  _libraryActiveFilter = filter;
  render();
}

function clearLibraryFilters() {
  _librarySearchQuery = '';
  _libraryActiveFilter = 'All';
  render();
}

function filterByExerciseName(name) {
  _librarySearchQuery = name;
  _libraryActiveFilter = 'All';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Modal: Preview Form & Muscle Map ─────────────────────────────────────────
function previewExerciseDetails(exerciseId) {
  const ex = state.exercises.find(e => e.id === exerciseId);
  if (!ex) return;

  const modalRoot = document.getElementById('settings-modal-root');
  if (!modalRoot) return;

  const pattern = ex.movement_pattern || 'general';
  let primaryMuscles = ['chest'];
  let secondaryMuscles = ['triceps'];

  if (pattern.includes('pull')) {
    primaryMuscles = ['lats', 'upper_back'];
    secondaryMuscles = ['biceps', 'forearms'];
  } else if (pattern.includes('squat') || pattern.includes('leg')) {
    primaryMuscles = ['quads', 'glutes'];
    secondaryMuscles = ['hamstrings', 'calves'];
  } else if (pattern.includes('core')) {
    primaryMuscles = ['abs', 'obliques'];
    secondaryMuscles = ['lower_back'];
  } else if (pattern.includes('push')) {
    primaryMuscles = ['chest', 'shoulders'];
    secondaryMuscles = ['triceps'];
  }

  const muscleMapSvg = (typeof window.MuscleMap !== 'undefined' && window.MuscleMap.render)
    ? window.MuscleMap.render({ primaryMuscles, secondaryMuscles, size: 'md', view: 'both', showLegend: true })
    : '<div style="padding:20px; color:var(--text-muted);">Muscle Map loaded</div>';

  modalRoot.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeLibraryDetailModal()">
      <div class="settings-modal-card" style="max-width:560px;" onclick="event.stopPropagation()">
        <div class="settings-modal-header">
          <div>
            <h2 style="margin:0; font-size:1.25rem; color:var(--text-primary);">${escapeHtml(ex.name)}</h2>
            <p style="margin:4px 0 0; font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(ex.day || 'Calisthenics Movement')} · ${ex.type === 'duration' ? 'Isometric Hold' : 'Dynamic Reps'}</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="closeLibraryDetailModal()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>

        <div style="padding:20px; display:flex; flex-direction:column; gap:20px; max-height:75vh; overflow-y:auto;">
          <div>
            <h4 style="font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary); margin-bottom:8px;">Target Muscle Activation</h4>
            <div style="display:flex; justify-content:center; background:var(--bg-canvas); border-radius:12px; padding:16px; border:1px solid var(--border-subtle);">
              ${muscleMapSvg}
            </div>
          </div>

          <div style="background:var(--bg-card); border-radius:12px; padding:14px; border:1px solid var(--border-subtle);">
            <h4 style="font-size:0.85rem; margin-bottom:6px; color:var(--accent-warmup);">Progression Target Benchmark</h4>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">
              Standard progression milestone: <strong>${ex.progression_target_reps ? ex.progression_target_reps + ' reps' : (ex.progression_target_duration ? ex.progression_target_duration + 's hold' : '3 sets of 8-12')}</strong> across ${ex.progression_sessions_needed || 2} consecutive workouts before promoting to next variation.
            </p>
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" style="flex:1;" onclick="closeLibraryDetailModal(); openAddToWorkoutModal(${ex.id});">
              + Add to Routine
            </button>
            <button class="btn btn-secondary" style="flex:1;" onclick="closeLibraryDetailModal()">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeLibraryDetailModal() {
  const modalRoot = document.getElementById('settings-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
}

// ─── Modal: Add Exercise to Workout / Routine ─────────────────────────────────
function openAddToWorkoutModal(exerciseId) {
  const ex = state.exercises.find(e => e.id === exerciseId);
  if (!ex) return;

  const workouts = state.workouts || [];
  const modalRoot = document.getElementById('settings-modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeLibraryDetailModal()">
      <div class="settings-modal-card" style="max-width:460px;" onclick="event.stopPropagation()">
        <div class="settings-modal-header">
          <h3 style="margin:0; font-size:1.15rem; color:var(--text-primary);">Add "${escapeHtml(ex.name)}" to Routine</h3>
          <button class="btn btn-secondary btn-sm" onclick="closeLibraryDetailModal()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>

        <form id="add-to-workout-form" onsubmit="handleAddToWorkoutSubmit(event, ${ex.id})" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">Select Workout Template</label>
            <select id="target-workout-select" class="form-input" style="width:100%;">
              ${workouts.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">Target Phase</label>
            <select id="target-phase-select" class="form-input" style="width:100%;">
              <option value="main">Phase 2: Main Workout</option>
              <option value="warmup">Phase 1: Warm-up</option>
              <option value="cooldown">Phase 3: Cool-down</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Sets</label>
              <input type="number" id="target-sets-input" class="form-input" value="3" min="1" max="10" />
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">${ex.type === 'duration' ? 'Hold (Secs)' : 'Reps'}</label>
              <input type="number" id="target-reps-input" class="form-input" value="${ex.type === 'duration' ? '20' : '10'}" min="1" max="500" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:8px;">
            Confirm & Add Exercise
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handleAddToWorkoutSubmit(e, exerciseId) {
  e.preventDefault();
  const workoutId = parseInt(document.getElementById('target-workout-select')?.value, 10);
  const phase = document.getElementById('target-phase-select')?.value || 'main';
  const sets = parseInt(document.getElementById('target-sets-input')?.value, 10) || 3;
  const repsVal = parseInt(document.getElementById('target-reps-input')?.value, 10) || 10;
  const ex = state.exercises.find(x => x.id === exerciseId);

  if (!workoutId || !ex) return;

  try {
    const payload = {
      workout_id: workoutId,
      exercise_id: exerciseId,
      phase: phase,
      sets: sets,
      reps: ex.type === 'reps' ? repsVal : null,
      duration_sec: ex.type === 'duration' ? repsVal : null,
      rest_sec: 90
    };

    await API.api('POST', `/workouts/${workoutId}/exercises`, payload);
    closeLibraryDetailModal();
    showToast(`Added ${ex.name} to routine!`, 'success');
    if (typeof loadWorkouts === 'function') await loadWorkouts();
  } catch (err) {
    console.error('Failed to add exercise to workout:', err);
    showToast('Failed to add exercise: ' + err.message, 'error');
  }
}

// ─── Modal: Create Custom Exercise ────────────────────────────────────────────
function openAddCustomExerciseModal() {
  const modalRoot = document.getElementById('settings-modal-root');
  if (!modalRoot) return;

  const exercises = state.exercises || [];

  modalRoot.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeLibraryDetailModal()">
      <div class="settings-modal-card" style="max-width:500px;" onclick="event.stopPropagation()">
        <div class="settings-modal-header">
          <h3 style="margin:0; font-size:1.2rem; color:var(--text-primary);">Create Custom Exercise</h3>
          <button class="btn btn-secondary btn-sm" onclick="closeLibraryDetailModal()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>

        <form onsubmit="handleCreateCustomExercise(event)" style="padding:20px; display:flex; flex-direction:column; gap:14px; max-height:75vh; overflow-y:auto;">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Movement Name *</label>
            <input type="text" id="custom-ex-name" class="form-input" required placeholder="e.g. Ring Archer Push-ups" style="width:100%;" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Category / Day</label>
              <select id="custom-ex-day" class="form-input" style="width:100%;">
                <option value="Push">Push</option>
                <option value="Pull">Pull</option>
                <option value="Legs">Legs</option>
                <option value="Core">Core</option>
                <option value="Skills">Skills / Mobility</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Measurement Type</label>
              <select id="custom-ex-type" class="form-input" style="width:100%;">
                <option value="reps">Reps Target</option>
                <option value="duration">Isometric Hold (Secs)</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Movement Pattern</label>
            <select id="custom-ex-pattern" class="form-input" style="width:100%;">
              <option value="push_horizontal">Horizontal Push (Push-ups, Dips)</option>
              <option value="push_vertical">Vertical Push (Handstand, Overhead)</option>
              <option value="pull_vertical">Vertical Pull (Pull-ups, Chin-ups)</option>
              <option value="pull_horizontal">Horizontal Pull (Rows, Front Lever)</option>
              <option value="squat">Legs / Squat (Pistols, Lunges)</option>
              <option value="hinge">Posterior / Hinge (Nordics, Extensions)</option>
              <option value="core">Core / Compression (L-Sit, Dragon Flag)</option>
              <option value="skill">Skill / Isometric (Planche, Lever)</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Prerequisite (Optional)</label>
              <select id="custom-ex-prereq" class="form-input" style="width:100%;">
                <option value="">None</option>
                ${exercises.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Next Progression Step</label>
              <select id="custom-ex-next" class="form-input" style="width:100%;">
                <option value="">None</option>
                ${exercises.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:8px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">
              Save to Library
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeLibraryDetailModal()">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleCreateCustomExercise(e) {
  e.preventDefault();
  const name = document.getElementById('custom-ex-name')?.value.trim();
  const day = document.getElementById('custom-ex-day')?.value;
  const type = document.getElementById('custom-ex-type')?.value;
  const pattern = document.getElementById('custom-ex-pattern')?.value;
  const prereqVal = document.getElementById('custom-ex-prereq')?.value;
  const nextVal = document.getElementById('custom-ex-next')?.value;

  if (!name) return;

  const payload = {
    name: name,
    day: day,
    type: type,
    movement_pattern: pattern,
    prerequisite_id: prereqVal ? parseInt(prereqVal, 10) : null,
    next_id: nextVal ? parseInt(nextVal, 10) : null
  };

  try {
    const created = await API.createExercise(payload);
    closeLibraryDetailModal();
    showToast(`Created exercise "${name}"!`, 'success');
    
    // Refresh exercise catalog
    if (typeof loadExercises === 'function') {
      await loadExercises();
    } else {
      state.exercises.push(created);
    }
    render();
  } catch (err) {
    console.error('Failed to create exercise:', err);
    showToast('Failed to create exercise: ' + err.message, 'error');
  }
}
