/**
 * CalistheniX — Workout History & Session Logs View
 */

async function loadWorkoutSessions() {
  try {
    state.workoutSessions = await API.getWorkoutSessions();
  } catch (e) {
    state.workoutSessions = [];
  }

  // Merge any local sessions stored in localStorage if not already present in state.workoutSessions
  try {
    const existingUuids = new Set((state.workoutSessions || []).map(s => s.session_uuid || s.id));
    const prefix = typeof LS_SESSION_PREFIX !== 'undefined' ? LS_SESSION_PREFIX : 'cx_session_';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const item = JSON.parse(localStorage.getItem(k));
        const sessId = item?.id || item?.session_uuid;
        if (item && sessId && !existingUuids.has(sessId) && (item.is_completed || item.status === 'completed' || item.status === 'completed_early')) {
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
            status: item.status || 'completed'
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
    state.selectedSessionDetail = await API.getWorkoutSessionDetail(sessionUuid);
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
           <button class="btn btn-primary" onclick="switchView('home')">Start Today's Workout ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}</button>
         </div>
       </div>`
    : sessions.map(s => {
        const d = new Date(s.completed_at || s.started_at);
        const dateStr = isNaN(d.getTime())
          ? (s.completed_at || s.started_at)
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        const totalMin = Math.round((s.duration_sec || 0) / 60);
        const mainDur = s.main_duration_sec != null ? s.main_duration_sec : s.duration_sec;
        const mainMin = Math.round((mainDur || 0) / 60);
        const warmupMin = Math.round((s.warmup_duration_sec || 0) / 60);
        const cooldownMin = Math.round((s.cooldown_duration_sec || 0) / 60);

        let phasePills = '';
        if (s.warmup_status === 'completed') {
          phasePills += `<span class="history-phase-badge badge-prep" title="Warm-up Completed (${warmupMin}m)">${renderIcon('check', 'cx-icon cx-icon-xs')} Prep ${warmupMin > 0 ? `${warmupMin}m` : 'Done'}</span>`;
        } else if (s.warmup_status === 'skipped') {
          phasePills += `<span class="history-phase-badge badge-prep" style="opacity:0.65;" title="Warm-up Skipped">Prep Skipped</span>`;
        }

        if (s.cooldown_status === 'completed') {
          phasePills += `<span class="history-phase-badge badge-recover" title="Cool-down Completed (${cooldownMin}m)">${renderIcon('check', 'cx-icon cx-icon-xs')} Recover ${cooldownMin > 0 ? `${cooldownMin}m` : 'Done'}</span>`;
        } else if (s.cooldown_status === 'skipped') {
          phasePills += `<span class="history-phase-badge badge-recover" style="opacity:0.65;" title="Cool-down Skipped">Recover Skipped</span>`;
        }

        return `
          <div class="history-session-card" onclick="openSessionDetailView('${s.session_uuid || s.id}')">
            <div class="history-session-top">
              <div>
                <h3 class="history-session-title">${s.routine_name || s.routine || 'Workout'} <span style="font-size:12px; font-weight:400; color:var(--text-muted);">· Level ${s.level || 1}</span></h3>
                <span class="history-session-date mono">${dateStr}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                ${phasePills}
                <span style="font-size:12px; font-weight:600; color:#10b981; display:flex; align-items:center; gap:4px;">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Finished</span>
              </div>
            </div>
            <div class="history-session-metrics">
              <div class="history-metric-badge"><span>Session:</span> <strong>${totalMin} min</strong></div>
              <div class="history-metric-badge"><span>Training:</span> <strong>${mainMin} min</strong></div>
              <div class="history-metric-badge"><span>Sets:</span> <strong>${s.completed_sets}/${s.total_sets || s.completed_sets}</strong></div>
              <div style="margin-left:auto; color:var(--accent); font-size:13px; font-weight:600;">
                View Breakdown ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}
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

  const totalMin = Math.round((detail.duration_sec || 0) / 60);
  const mainDur = detail.main_duration_sec != null ? detail.main_duration_sec : detail.duration_sec;
  const mainMin = Math.round((mainDur || 0) / 60);
  const warmupMin = Math.round((detail.warmup_duration_sec || 0) / 60);
  const cooldownMin = Math.round((detail.cooldown_duration_sec || 0) / 60);

  const warmupStatus = detail.warmup_status || 'none';
  const cooldownStatus = detail.cooldown_status || 'none';

  let warmupSubText = 'Not configured';
  if (warmupStatus === 'completed') warmupSubText = 'Completed';
  else if (warmupStatus === 'skipped') warmupSubText = 'Skipped';

  let cooldownSubText = 'Not configured';
  if (cooldownStatus === 'completed') cooldownSubText = 'Completed';
  else if (cooldownStatus === 'skipped') cooldownSubText = 'Skipped';

  // Group logs by phase and exercise
  const phases = {
    warmup: {},
    main: {},
    cooldown: {}
  };

  (detail.logs || []).forEach(l => {
    const phaseKey = l.phase && phases[l.phase] ? l.phase : 'main';
    if (!phases[phaseKey][l.exercise_id]) {
      phases[phaseKey][l.exercise_id] = {
        name: l.exercise_name || `Exercise #${l.exercise_id}`,
        type: l.exercise_type || 'reps',
        phase: phaseKey,
        sets: []
      };
    }
    phases[phaseKey][l.exercise_id].sets.push(l);
  });

  const renderPhaseExBoxes = (exGroup) => {
    const exList = Object.values(exGroup);
    if (exList.length === 0) return '';

    return exList.map(ex => {
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
            <span style="font-size:15px; font-weight:600; color:var(--text);">${ex.name}</span>
            <span class="mono" style="font-size:12px; color:var(--text-muted);">${ex.sets.length} sets logged</span>
          </div>
          <div style="display:grid; grid-template-columns:48px 1fr 1fr 1fr; gap:8px; font-size:11px; color:var(--text-muted); padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); text-transform:uppercase; letter-spacing:0.05em;">
            <span>Set</span><span>Performance</span><span>Weight</span><span>RPE</span>
          </div>
          ${setRows}
        </div>`;
    }).join('');
  };

  const warmupHtml = Object.keys(phases.warmup).length > 0 ? `
    <div class="history-phase-divider-title">
      <span class="history-phase-badge badge-prep">${renderIcon('zap', 'cx-icon cx-icon-xs')} PREP · WARM-UP</span>
      <span style="font-size:12px; color:var(--text-muted);">${warmupMin} min · ${warmupSubText}</span>
    </div>
    ${renderPhaseExBoxes(phases.warmup)}
  ` : '';

  const mainHtml = `
    <div class="history-phase-divider-title">
      <span class="history-phase-badge badge-train">${renderIcon('activity', 'cx-icon cx-icon-xs')} TRAINING · MAIN WORKOUT</span>
      <span style="font-size:12px; color:var(--text-muted);">${mainMin} min · ${detail.completed_sets}/${detail.total_sets || detail.completed_sets} sets</span>
    </div>
    ${renderPhaseExBoxes(phases.main) || '<div class="empty-state">No main sets recorded.</div>'}
  `;

  const cooldownHtml = Object.keys(phases.cooldown).length > 0 ? `
    <div class="history-phase-divider-title">
      <span class="history-phase-badge badge-recover">${renderIcon('award', 'cx-icon cx-icon-xs')} RECOVERY · COOL-DOWN & STRETCH</span>
      <span style="font-size:12px; color:var(--text-muted);">${cooldownMin} min · ${cooldownSubText}</span>
    </div>
    ${renderPhaseExBoxes(phases.cooldown)}
  ` : '';

  return `
    <div class="history-screen">
      <div class="log-topbar">
        <button class="btn-back" onclick="openHistoryListView()">← Back to History</button>
      </div>

      <div class="today-hero-card" style="margin-bottom:20px;">
        <div class="today-hero-header">
          <div>
            <span class="today-hero-tag">COMPLETED WORKOUT SESSION</span>
            <h1 class="today-hero-title">${detail.routine_name} <span style="font-size:14px; font-weight:400; color:var(--text-muted);">· Level ${detail.level}</span></h1>
            <p style="color:var(--text-muted); font-size:13px; margin:4px 0 0 0;">${dateStr}</p>
          </div>
          <span class="today-status-badge today-status-done">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Finished</span>
        </div>

        <!-- 4-Box Tri-Phase Summary Grid -->
        <div class="history-summary-grid">
          <div class="history-summary-card card-total">
            <span class="history-summary-label">Total Session</span>
            <span class="history-summary-value">${totalMin} min</span>
            <span class="history-summary-sub">Full duration</span>
          </div>

          <div class="history-summary-card card-prep">
            <span class="history-summary-label" style="color:#f5a623;">Prep</span>
            <span class="history-summary-value" style="color:#f5a623;">${warmupMin} min</span>
            <span class="history-summary-sub">${warmupSubText}</span>
          </div>

          <div class="history-summary-card card-train">
            <span class="history-summary-label" style="color:var(--accent-light);">Training</span>
            <span class="history-summary-value" style="color:var(--accent-light);">${mainMin} min</span>
            <span class="history-summary-sub">${detail.completed_sets}/${detail.total_sets || detail.completed_sets} sets</span>
          </div>

          <div class="history-summary-card card-recover">
            <span class="history-summary-label" style="color:#2ed573;">Recovery</span>
            <span class="history-summary-value" style="color:#2ed573;">${cooldownMin} min</span>
            <span class="history-summary-sub">${cooldownSubText}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Recorded Exercises & Sets by Phase</span>
        </div>
        <div class="card-body" style="padding:16px;">
          ${warmupHtml}
          ${mainHtml}
          ${cooldownHtml}
        </div>
      </div>
    </div>`;
}

if (typeof window !== 'undefined') {
  window.loadWorkoutSessions = loadWorkoutSessions;
  window.openHistoryListView = openHistoryListView;
  window.openSessionDetailView = openSessionDetailView;
  window.renderHistoryListView = renderHistoryListView;
  window.renderSessionDetailView = renderSessionDetailView;
}
