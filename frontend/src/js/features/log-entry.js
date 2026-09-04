/**
 * CalistheniX — Individual Exercise Log Entry View & Timers
 */

function openLogView(exerciseId, returnView = 'home', exerciseConfig = null) {
  stopRest();
  stopTimer();
  state.logExerciseId = exerciseId;
  state.logReturnView = returnView;
  state.logElapsed    = 0;
  // Guided session: reset set counter when starting a fresh exercise session.
  if (exerciseConfig) {
    state.sessionSet       = 1;
    state.sessionTotalSets = exerciseConfig.sets || null;
    state.sessionRestSec   = exerciseConfig.rest_sec || null;
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
    if (state.logElapsed > 0) {
      cueHoldSave();
      saveLog({ duration_sec: state.logElapsed });
    }
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
  lsWriteLog(entry);          // immediate localStorage write
  lsSyncPending();            // trigger background sync
  state.logElapsed = 0;
  stopTimer();

  // ── Guided session flow ───────────────────────────────────────────────────
  if (state.sessionTotalSets !== null) {
    const isLastSet = state.sessionSet >= state.sessionTotalSets;
    if (isLastSet) {
      cueExerciseComplete();
      showToast('Exercise complete');
      state.view = state.logReturnView;
      window.location.hash = state.logReturnView;
      render();
    } else {
      showToast('Set saved');
      startRestCountdown(state.sessionRestSec || 90);
    }
  } else {
    showToast('Saved');
    render();
  }
}

// ── Rest countdown ────────────────────────────────────────────────────────────
function startRestCountdown(sec) {
  stopRest();
  state.restActive    = true;
  state.restRemaining = sec;
  render();
  state.restIntervalId = setInterval(() => {
    state.restRemaining--;
    const el = document.getElementById('rest-countdown');
    if (el) el.textContent = fmtSecs(state.restRemaining);
    if (state.restRemaining > 0 && state.restRemaining <= 3) cueTick();
    if (state.restRemaining <= 0) {
      cueRestEnd();
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

function buildRpeRow() {
  const row = document.getElementById('rpe-row');
  const hidden = document.getElementById('rpe-hidden');
  const descEl = document.getElementById('rpe-desc-text');
  if (!row || !hidden) return;
  row.innerHTML = '';
  const effortMode = typeof getEffortMode === 'function' ? getEffortMode() : 'RIR';
  if (effortMode === 'Off') {
    const parent = row.closest('.log-effort-container');
    if (parent) parent.style.display = 'none';
    return;
  }

  if (effortMode === 'RIR') {
    const rirOptions = [
      { val: 10, rir: 0, label: 'RIR 0 (Failure)' },
      { val: 9, rir: 1, label: 'RIR 1 (1 in reserve)' },
      { val: 8, rir: 2, label: 'RIR 2 (2 in reserve)' },
      { val: 7, rir: 3, label: 'RIR 3 (3 in reserve)' },
      { val: 6, rir: '4+', label: 'RIR 4+ (Easy)' }
    ];
    rirOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rpe-btn ${hidden.value == opt.val ? 'rpe-active' : ''}`;
      btn.textContent = `RIR ${opt.rir}`;
      btn.title = opt.label;
      btn.onclick = () => {
        hidden.value = opt.val;
        row.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('rpe-active'));
        btn.classList.add('rpe-active');
        if (descEl) descEl.textContent = opt.label;
      };
      row.appendChild(btn);
    });
    if (descEl) descEl.textContent = 'RIR 2 (2 in reserve)';
  } else {
    for (let i = 6; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rpe-btn ${hidden.value == i ? 'rpe-active' : ''}`;
      btn.textContent = `RPE ${i}`;
      btn.title = RPE_DESCRIPTIONS[i] || `RPE ${i}`;
      btn.onclick = () => {
        hidden.value = i;
        row.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('rpe-active'));
        btn.classList.add('rpe-active');
        if (descEl) descEl.textContent = `RPE ${i}: ${RPE_DESCRIPTIONS[i] || ''}`;
      };
      row.appendChild(btn);
    }
    if (descEl) descEl.textContent = `RPE 8: ${RPE_DESCRIPTIONS[8] || ''}`;
  }
}

function renderLogView() {
  const ex = getExercise(state.logExerciseId);
  const exName = ex ? ex.name : 'Log Exercise';
  const isHold = ex ? ex.type === 'duration' : false;
  const effortMode = typeof getEffortMode === 'function' ? getEffortMode() : 'RIR';
  const weightUnit = typeof getWeightUnit === 'function' ? getWeightUnit() : 'kg';

  return `
    <div class="log-screen">
      <div class="log-topbar">
        <button class="btn-back" onclick="switchView('${state.logReturnView || 'home'}')">← Back</button>
      </div>

      <div class="today-hero-card" style="margin-bottom:20px;">
        <span class="today-hero-tag">${isHold ? 'ISOMETRIC HOLD' : 'REPETITIONS'}</span>
        <h1 class="today-hero-title">${exName}</h1>
        <p style="color:var(--text-muted); font-size:13px; margin:4px 0 0 0;">
          ${state.sessionTotalSets ? `Set ${state.sessionSet} of ${state.sessionTotalSets}` : 'Log current performance'}
        </p>
      </div>

      ${isHold ? `
        <div class="card" style="text-align:center; padding:32px 16px;">
          <div id="timer-display" class="mono" style="font-size:48px; font-weight:800; color:var(--accent-light); margin-bottom:16px;">
            ${fmtSecs(state.logElapsed || 0)}
          </div>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button id="timer-btn" class="btn btn-primary" onclick="toggleTimer()">
              ${state.logTimer ? 'Stop & Save' : 'Start Hold'}
            </button>
          </div>
        </div>
      ` : `
        <div class="card">
          <form onsubmit="handleSaveReps(event)" style="padding:16px; display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Reps Completed</label>
              <input type="number" name="reps" class="form-input" min="1" max="999" placeholder="e.g. 10" required autofocus />
            </div>
            <div>
              <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Added Weight (${weightUnit}, optional)</label>
              <input type="number" name="weight_kg" step="0.5" class="form-input" placeholder="0 ${weightUnit}" />
            </div>
            ${effortMode !== 'Off' ? `
              <div class="log-effort-container">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">${effortMode === 'RPE' ? 'RPE (Rating of Perceived Exertion)' : 'RIR (Reps In Reserve)'}</label>
                <input type="hidden" id="rpe-hidden" name="rpe" value="8" />
                <div id="rpe-row" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;"></div>
                <div id="rpe-desc-text" style="font-size:12px; color:var(--text-muted);"></div>
              </div>
            ` : '<input type="hidden" id="rpe-hidden" name="rpe" value="" />'}
            <button type="submit" class="btn btn-primary" style="margin-top:8px;">
              Save Set
            </button>
          </form>
        </div>
      `}
    </div>`;
}

if (typeof window !== 'undefined') {
  window.openLogView = openLogView;
  window.startTimer = startTimer;
  window.stopTimer = stopTimer;
  window.toggleTimer = toggleTimer;
  window.saveLog = saveLog;
  window.startRestCountdown = startRestCountdown;
  window.stopRest = stopRest;
  window.advanceSet = advanceSet;
  window.handleSaveReps = handleSaveReps;
  window.buildRpeRow = buildRpeRow;
  window.renderLogView = renderLogView;
}
