/**
 * CalistheniX — Workout History & Session Logs View
 */

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
      showToast('Exercise complete');
      state.view = state.logReturnView;
      window.location.hash = state.logReturnView;
      render();
    } else {
      // More sets remain — show rest countdown, then advance.
      showToast('Set saved');
      startRestCountdown(state.sessionRestSec || 90);
    }
  } else {
    // Unguided (opened outside routine context) — original behaviour.
    showToast('Saved');
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


// ─── Phase 4: Unified Workout Session History Log ───────────────────────────

async function loadWorkoutSessions() {
  try {
    state.workoutSessions = await API.getWorkoutSessions();
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
        const durMin = Math.round((s.duration_sec || 0) / 60);

        return `
          <div class="history-session-card" onclick="openSessionDetailView('${s.session_uuid}')">
            <div class="history-session-top">
              <div>
                <h3 class="history-session-title">${s.routine_name} <span style="font-size:12px; font-weight:400; color:var(--text-muted);">· Level ${s.level}</span></h3>
                <span class="history-session-date mono">${dateStr}</span>
              </div>
              <span style="font-size:12px; font-weight:600; color:#10b981; display:flex; align-items:center; gap:4px;">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Finished</span>
            </div>
            <div class="history-session-metrics">
              <div class="history-metric-badge"><span>Duration:</span> <strong>${durMin} min</strong></div>
              <div class="history-metric-badge"><span>Sets Done:</span> <strong>${s.completed_sets}/${s.total_sets || s.completed_sets}</strong></div>
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
              <span style="font-size:15px; font-weight:600; color:var(--text);">${ex.name}</span>
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
            <h1 class="today-hero-title">${detail.routine_name} <span style="font-size:14px; font-weight:400; color:var(--text-muted);">· Level ${detail.level}</span></h1>
            <p style="color:var(--text-muted); font-size:13px; margin:4px 0 0 0;">${dateStr}</p>
          </div>
          <span class="today-status-badge today-status-done">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Finished</span>
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


