/**
 * CalistheniX — Workout History & Session Logs View (100% Real Data Driven)
 */

function getWorkoutIconSvg(routineName) {
  const name = (routineName || '').toLowerCase();
  if (name.includes('leg') || name.includes('squat') || name.includes('lower')) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 4h10l1 16h-3.5l-2.5-10-2.5 10H6z"/>
      </svg>
    `;
  }
  if (name.includes('pull') || name.includes('back') || name.includes('chin') || name.includes('row')) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16M7 4v6a5 5 0 0 0 10 0V4M12 15v5"/>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/>
    </svg>
  `;
}

function formatWorkoutDuration(durationSec) {
  if (!durationSec || durationSec <= 0) return '1 min';
  const mins = Math.round(durationSec / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatWorkoutDate(dateStr) {
  if (!dateStr) return 'Recent';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${daysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`;
}

async function loadWorkoutSessions() {
  try {
    state.workoutSessions = await API.getWorkoutSessions();
  } catch (e) {
    state.workoutSessions = [];
  }

  // Merge any local sessions stored in localStorage
  try {
    const existingUuids = new Set((state.workoutSessions || []).map(s => s.session_uuid || s.id));
    const prefix = typeof LS_SESSION_PREFIX !== 'undefined' ? LS_SESSION_PREFIX : 'cx_session_';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('cx_session_') || k.startsWith('cx_pending_session_'))) {
        const item = JSON.parse(localStorage.getItem(k));
        const sessId = item?.id || item?.session_uuid;
        if (item && sessId && !existingUuids.has(sessId) && (item.is_completed || item.status === 'completed' || item.status === 'completed_early' || (item.completed_sets && item.completed_sets > 0))) {
          state.workoutSessions = state.workoutSessions || [];
          state.workoutSessions.push({
            session_uuid: sessId,
            routine_name: item.routine || item.routine_name || 'Workout',
            level: item.level || 1,
            started_at: item.started_at || item.startTime,
            completed_at: item.completed_at || item.endTime || new Date().toISOString(),
            duration_sec: item.duration_sec || item.duration || 0,
            total_sets: item.total_sets || (item.exercises ? item.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0) : 0),
            completed_sets: item.completed_sets || (item.exercises ? item.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.completed).length : 0), 0) : 0),
            warmup_status: item.warmup_status || 'none',
            cooldown_status: item.cooldown_status || 'none',
            warmup_duration_sec: item.warmup_duration_sec || 0,
            cooldown_duration_sec: item.cooldown_duration_sec || 0,
            main_duration_sec: item.main_duration_sec || 0,
            status: item.status || 'completed',
            exercises: item.exercises || []
          });
          existingUuids.add(sessId);
        }
      }
    }

    if (state.workoutSessions && state.workoutSessions.length > 0) {
      state.workoutSessions.sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at));
    }
  } catch (err) {}
}

async function openHistoryListView() {
  state.view = 'history_list';
  if (typeof window !== 'undefined' && window.location) window.location.hash = 'history_list';
  await loadWorkoutSessions();
  if (typeof render === 'function') render();
}

async function openSessionDetailView(sessionUuid) {
  state.previousView = (state.view && state.view !== 'session_detail') ? state.view : (state.previousView || 'stats');
  state.selectedSessionUuid = sessionUuid;
  state.selectedSessionDetail = null;
  state.view = 'session_detail';
  if (typeof window !== 'undefined' && window.location) window.location.hash = `session-${sessionUuid}`;

  // First check local sessions cache so UI renders instantaneously
  const allSessions = typeof getCompletedSessions === 'function' ? getCompletedSessions() : (state.workoutSessions || []);
  const localSess = allSessions.find(s => (s.session_uuid || s.id) === sessionUuid);
  if (localSess) {
    state.selectedSessionDetail = localSess;
  }

  if (typeof render === 'function') render();

  try {
    if (typeof API !== 'undefined' && API.getWorkoutSessionDetail) {
      const serverDetail = await API.getWorkoutSessionDetail(sessionUuid);
      if (serverDetail) {
        state.selectedSessionDetail = serverDetail;
        if (typeof render === 'function') render();
      }
    }
  } catch (e) {
    // If offline, fallback to localSession
  }
}

function closeSessionDetailView() {
  if (state.previousView === 'history_list') {
    openHistoryListView();
  } else {
    if (typeof switchView === 'function') {
      switchView('stats');
    } else {
      state.view = 'stats';
      if (typeof render === 'function') render();
    }
  }
}

function renderHistoryListView() {
  const allWorkouts = typeof getCompletedSessions === 'function' ? getCompletedSessions() : (state.workoutSessions || []);
  const totalCount = allWorkouts.length;

  let maxVolume = 0;
  allWorkouts.forEach(s => {
    const v = typeof calculateSessionVolume === 'function' ? calculateSessionVolume(s) : (s.volume_kg || 0);
    if (v > maxVolume) maxVolume = v;
  });

  let cardsHtml = '';
  if (state.workoutSessions === null) {
    cardsHtml = `
      <div class="skeleton-session-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="cx-skeleton skeleton-text skeleton-title" style="width: 45%;"></div>
          <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 65px;"></div>
        </div>
        <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 35%;"></div>
        <div class="cx-skeleton skeleton-text" style="width: 60%; height: 12px;"></div>
      </div>
      <div class="skeleton-session-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="cx-skeleton skeleton-text skeleton-title" style="width: 50%;"></div>
          <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 65px;"></div>
        </div>
        <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 30%;"></div>
        <div class="cx-skeleton skeleton-text" style="width: 55%; height: 12px;"></div>
      </div>
      <div class="skeleton-session-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="cx-skeleton skeleton-text skeleton-title" style="width: 40%;"></div>
          <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 65px;"></div>
        </div>
        <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 38%;"></div>
        <div class="cx-skeleton skeleton-text" style="width: 50%; height: 12px;"></div>
      </div>
    `;
  } else if (allWorkouts.length > 0) {
    cardsHtml = allWorkouts.map(w => {
      const title = w.routine_name || w.routine || 'Workout';
      const dateStr = typeof formatWorkoutDate === 'function' ? formatWorkoutDate(w.completed_at || w.started_at) : (w.completed_at || w.started_at || 'Recent');
      const durStr = typeof formatWorkoutDuration === 'function' ? formatWorkoutDuration(w.duration_sec) : `${Math.round((w.duration_sec || 0)/60)} min`;
      const sets = w.completed_sets != null ? w.completed_sets : (w.total_sets || 0);
      const vol = typeof calculateSessionVolume === 'function' ? calculateSessionVolume(w) : (w.volume_kg || 0);
      const volStr = vol > 0 ? (vol >= 1000 ? `${vol.toLocaleString('en-US')} kg` : `${vol} kg`) : '0 kg';
      const iconSvg = typeof getWorkoutIconSvg === 'function' ? getWorkoutIconSvg(title) : '';
      const prCount = typeof countSessionPRs === 'function' ? countSessionPRs(w) : (w.pr_count || 0);

      // Extract unique exercise names
      const logs = typeof extractSessionLogs === 'function' ? extractSessionLogs(w) : (w.logs || []);
      const exNames = Array.from(new Set(logs.map(l => l.exercise_name).filter(Boolean)));
      let exSummary = '';
      if (exNames.length > 0) {
        if (exNames.length <= 2) {
          exSummary = exNames.join(', ');
        } else {
          exSummary = `${exNames.slice(0, 2).join(', ')} +${exNames.length - 2} more`;
        }
      }

      const subParts = [dateStr, durStr, `${sets} sets`];
      if (vol > 0) subParts.push(volStr);
      const subLine = subParts.join(' · ');

      let badgeHtml = '';
      if (prCount > 0) {
        badgeHtml = `
          <div class="workout-pr-pill" title="${prCount} Personal Records Broken">
            <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"/>
              <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2Z"/>
            </svg>
            <span>${prCount} PR${prCount > 1 ? 's' : ''}</span>
          </div>
        `;
      } else if (vol > 0 && vol === maxVolume && allWorkouts.length > 1) {
        badgeHtml = `
          <div class="workout-pr-pill" style="background:rgba(56, 189, 248, 0.15); border-color:rgba(56, 189, 248, 0.35); color:#38bdf8;" title="Top Session Volume Record">
            <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>Top Vol</span>
          </div>
        `;
      }

      return `
        <div class="workout-history-card" onclick="openSessionDetailView('${w.session_uuid || w.id}')" title="View breakdown for ${title} (${dateStr})">
          <div class="workout-card-left">
            <div class="workout-card-icon-badge">
              ${iconSvg}
            </div>
            <div class="workout-card-info">
              <div class="workout-card-title">${title}</div>
              <div class="workout-card-sub">${subLine}</div>
              ${exSummary ? `<div style="font-size:11.5px; color:#64748b; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px;">${exSummary}</div>` : ''}
            </div>
          </div>
          <div class="workout-card-right">
            ${badgeHtml}
            <div class="workout-card-arrow">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    cardsHtml = `
      <div style="background:#14141c; border:1px dashed rgba(255,255,255,0.06); border-radius:18px; padding:36px 20px; text-align:center; margin-top:8px;">
        <p style="color:#94a3b8; font-size:14px; margin:0 0 16px;">No workout sessions logged yet.</p>
        <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="switchView('workout')">Start Today's Workout</button>
          <button class="btn btn-secondary btn-sm" onclick="openLogPastWorkoutModal()">+ Log a Past Workout</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="history-full-screen">
      <!-- Top Navigation Row with Back Button -->
      <div class="history-top-nav-row">
        <button class="history-round-back-btn" onclick="switchView('stats')" title="Back to Stats" aria-label="Back">
          <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 class="history-full-title">History</h1>
          <div class="history-full-subtitle">${totalCount} workouts</div>
        </div>
      </div>

      <!-- Log a past workout button -->
      <button class="history-log-past-trigger" onclick="openLogPastWorkoutModal()">
        <span>+</span>
        <span>Log a past workout</span>
      </button>

      <!-- Workout Sessions List -->
      <div class="history-workout-cards-list">
        ${cardsHtml}
      </div>

      ${renderLogPastWorkoutModal()}
    </div>
  `;
}

// ─── Modal for Logging Past Workouts ──────────────────────────────────────────
let _showPastWorkoutModal = false;

function openLogPastWorkoutModal() {
  _showPastWorkoutModal = true;
  if (typeof render === 'function') render();
}

function closeLogPastWorkoutModal(e) {
  if (e) e.stopPropagation();
  _showPastWorkoutModal = false;
  if (typeof render === 'function') render();
}

async function submitPastWorkoutLog() {
  const routineInput = document.getElementById('past-routine-name-field');
  const dateInput = document.getElementById('past-workout-date-field');
  const durInput = document.getElementById('past-workout-duration-field');
  const setsInput = document.getElementById('past-workout-sets-field');
  const volInput = document.getElementById('past-workout-volume-field');

  const routine = routineInput?.value || 'Push Day';
  const date = dateInput?.value || new Date().toISOString().slice(0, 10);
  const durMin = parseInt(durInput?.value || '45', 10);
  const sets = parseInt(setsInput?.value || '16', 10);
  const volKg = parseFloat(volInput?.value || '0') || 0;

  const newSession = {
    session_uuid: `past-${Date.now()}`,
    routine_name: routine,
    started_at: `${date}T17:00:00Z`,
    completed_at: `${date}T${17 + Math.floor(durMin / 60)}:${durMin % 60}:00Z`,
    duration_sec: durMin * 60,
    total_sets: sets,
    completed_sets: sets,
    volume_kg: volKg,
    pr_count: 0,
    status: 'completed',
    is_completed: true,
    warmup_status: 'none',
    cooldown_status: 'none',
    exercises: []
  };

  state.workoutSessions = state.workoutSessions || [];
  state.workoutSessions.unshift(newSession);
  localStorage.setItem(`cx_session_${newSession.session_uuid}`, JSON.stringify(newSession));

  try {
    if (typeof API !== 'undefined' && API.createWorkoutSession) {
      await API.createWorkoutSession(newSession);
    }
  } catch (e) {}

  showToast(`Logged workout: ${routine}`);
  _showPastWorkoutModal = false;
  if (typeof render === 'function') render();
}

function renderLogPastWorkoutModal() {
  if (!_showPastWorkoutModal) return '';

  const todayStr = new Date().toISOString().slice(0, 10);

  return `
    <div class="stats-picker-backdrop" onclick="closeLogPastWorkoutModal(event)">
      <div class="stats-picker-sheet" onclick="event.stopPropagation()">
        <div class="stats-picker-header">
          <span class="stats-picker-title">Log a Past Workout</span>
          <button class="btn-icon" onclick="closeLogPastWorkoutModal()">
            <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Workout Name</label>
            <select id="past-routine-name-field" class="form-input form-select" style="background:#1c1c27; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px; padding:10px 12px; width:100%;">
              <option value="Push Day">Push Day</option>
              <option value="Pull Day">Pull Day</option>
              <option value="Leg Day">Leg Day</option>
              <option value="Full Body">Full Body</option>
              <option value="Core & Skills">Core & Skills</option>
            </select>
          </div>

          <div>
            <label style="font-size:12px; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Date</label>
            <input type="date" id="past-workout-date-field" class="form-input" value="${todayStr}" style="background:#1c1c27; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px; padding:10px 12px; width:100%;" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:12px; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Duration (min)</label>
              <input type="number" id="past-workout-duration-field" class="form-input" value="45" style="background:#1c1c27; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px; padding:10px 12px; width:100%;" />
            </div>
            <div>
              <label style="font-size:12px; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Total Sets</label>
              <input type="number" id="past-workout-sets-field" class="form-input" value="16" style="background:#1c1c27; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px; padding:10px 12px; width:100%;" />
            </div>
          </div>

          <div>
            <label style="font-size:12px; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Added Weight / Total Volume (kg, optional)</label>
            <input type="number" id="past-workout-volume-field" class="form-input" placeholder="0" style="background:#1c1c27; border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:10px; padding:10px 12px; width:100%;" />
          </div>

          <button class="btn btn-primary" style="width:100%; padding:14px; margin-top:8px;" onclick="submitPastWorkoutLog()">
            Save Past Workout
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSessionDetailView() {
  const detail = state.selectedSessionDetail;
  if (!detail) {
    return `
      <div class="history-full-screen">
        <div class="history-top-nav-row">
          <button class="history-round-back-btn" onclick="closeSessionDetailView()">
            <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 class="history-full-title">Session Breakdown</h1>
          </div>
        </div>
        <div class="history-skeleton-detail" style="margin-top: 16px;">
          <div class="skeleton-card" style="margin-bottom: 16px;">
            <div class="cx-skeleton skeleton-text skeleton-title" style="width: 50%;"></div>
            <div class="cx-skeleton skeleton-text skeleton-subtitle" style="width: 30%;"></div>
            <div style="display: flex; gap: 12px; margin-top: 8px;">
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 80px;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 80px;"></div>
              <div class="cx-skeleton skeleton-text skeleton-badge" style="width: 80px;"></div>
            </div>
          </div>
          <div class="skeleton-card" style="margin-bottom: 12px;">
            <div class="cx-skeleton skeleton-text" style="width: 40%; height: 18px;"></div>
            <div class="cx-skeleton skeleton-text" style="width: 100%; height: 28px; margin-top: 8px;"></div>
          </div>
          <div class="skeleton-card">
            <div class="cx-skeleton skeleton-text" style="width: 40%; height: 18px;"></div>
            <div class="cx-skeleton skeleton-text" style="width: 100%; height: 28px; margin-top: 8px;"></div>
          </div>
        </div>
      </div>`;
  }

  const d = new Date(detail.completed_at || detail.started_at);
  const dateStr = isNaN(d.getTime())
    ? (detail.completed_at || detail.started_at)
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const totalMin = Math.round((detail.duration_sec || 0) / 60) || 1;
  const vol = typeof calculateSessionVolume === 'function' ? calculateSessionVolume(detail) : (detail.volume_kg || 0);
  const volStr = vol > 0 ? (vol >= 1000 ? `${vol.toLocaleString('en-US')} kg` : `${vol} kg`) : '0 kg';
  const prCount = typeof countSessionPRs === 'function' ? countSessionPRs(detail) : (detail.pr_count || 0);
  const setsCount = detail.completed_sets != null ? detail.completed_sets : (detail.total_sets || 0);

  const logs = typeof extractSessionLogs === 'function' ? extractSessionLogs(detail) : (detail.logs || []);

  // Group logs by exercise
  const exerciseGroups = new Map();
  logs.forEach(l => {
    const name = l.exercise_name || 'Exercise';
    if (!exerciseGroups.has(name)) {
      exerciseGroups.set(name, {
        name,
        phase: l.phase || 'main',
        sets: []
      });
    }
    exerciseGroups.get(name).sets.push(l);
  });

  let exercisesHtml = '';
  if (exerciseGroups.size > 0) {
    exercisesHtml = Array.from(exerciseGroups.values()).map(group => {
      const setRowsHtml = group.sets.map((s, idx) => {
        const weightText = s.weight_kg ? `+${s.weight_kg} kg` : 'Bodyweight';
        const perfText = s.reps != null ? `${s.reps} reps` : (s.duration_sec ? `${s.duration_sec}s` : 'Done');
        const effortText = s.rir != null ? `RIR ${s.rir}` : (s.rpe != null ? `RPE ${s.rpe}` : '');
        const isPr = s.is_pr || s.pr_type;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-family:var(--mono);">SET ${s.set_index || idx + 1}</span>
              <span style="font-size:13px; font-weight:600; color:#e2e8f0;">${weightText}</span>
              ${isPr ? `
                <span class="workout-pr-pill" style="padding:1px 6px; font-size:10px;">
                  <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px;">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"/>
                    <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2Z"/>
                  </svg>
                  <span>PR</span>
                </span>
              ` : ''}
            </div>
            <div style="text-align:right;">
              <span style="font-family:var(--mono); font-weight:700; color:#ff5d5d; font-size:14px;">${perfText}</span>
              ${effortText ? `<span style="font-size:11px; color:#94a3b8; margin-left:6px;">(${effortText})</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="background:#14141c; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:14px 16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:700; font-size:15px; color:#ffffff;">${group.name}</div>
            <span style="font-size:11px; color:#94a3b8; text-transform:uppercase; font-weight:600; letter-spacing:0.04em;">${group.sets.length} sets</span>
          </div>
          <div>
            ${setRowsHtml}
          </div>
        </div>
      `;
    }).join('');
  } else {
    exercisesHtml = `<div style="padding:28px 16px; text-align:center; color:#94a3b8; background:#14141c; border-radius:16px; border:1px dashed rgba(255,255,255,0.06);">No individual exercise set logs recorded for this workout.</div>`;
  }

  return `
    <div class="history-full-screen">
      <div class="history-top-nav-row">
        <button class="history-round-back-btn" onclick="closeSessionDetailView()" title="Back" aria-label="Back">
          <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 class="history-full-title">${detail.routine_name || detail.routine || 'Workout'}</h1>
          <div class="history-full-subtitle">${dateStr}</div>
        </div>
      </div>

      <!-- Quick stats row -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin:16px 0 20px;">
        <div style="background:#14141c; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:12px 10px; text-align:center;">
          <div style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase;">Duration</div>
          <div style="font-size:17px; font-weight:700; color:#fff; font-family:var(--mono); margin-top:2px;">${totalMin}m</div>
        </div>
        <div style="background:#14141c; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:12px 10px; text-align:center;">
          <div style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase;">Total Sets</div>
          <div style="font-size:17px; font-weight:700; color:#fff; font-family:var(--mono); margin-top:2px;">${setsCount}</div>
        </div>
        <div style="background:#14141c; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:12px 10px; text-align:center;">
          <div style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase;">Volume</div>
          <div style="font-size:17px; font-weight:700; color:#ff5d5d; font-family:var(--mono); margin-top:2px;">${volStr}</div>
        </div>
      </div>

      ${prCount > 0 ? `
        <div style="background:rgba(234, 179, 8, 0.1); border:1px solid rgba(234, 179, 8, 0.25); border-radius:12px; padding:10px 14px; margin-bottom:16px; display:flex; align-items:center; gap:8px; color:#facc15; font-size:13px; font-weight:600;">
          <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; color:#facc15;">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"/>
            <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2Z"/>
          </svg>
          <span>${prCount} Personal Record${prCount > 1 ? 's' : ''} achieved in this session!</span>
        </div>
      ` : ''}

      <div>
        <h3 style="font-size:13px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:12px;">Exercise Breakdown</h3>
        ${exercisesHtml}
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.openHistoryListView = openHistoryListView;
  window.openSessionDetailView = openSessionDetailView;
  window.closeSessionDetailView = closeSessionDetailView;
  window.loadWorkoutSessions = loadWorkoutSessions;
  window.renderHistoryListView = renderHistoryListView;
  window.renderSessionDetailView = renderSessionDetailView;
  window.getWorkoutIconSvg = getWorkoutIconSvg;
  window.openLogPastWorkoutModal = openLogPastWorkoutModal;
  window.closeLogPastWorkoutModal = closeLogPastWorkoutModal;
  window.submitPastWorkoutLog = submitPastWorkoutLog;
}
