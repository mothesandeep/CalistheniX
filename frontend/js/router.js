/**
 * CalistheniX — View Router & Main UI Dispatcher
 */

// ─── Main Router & Dispatcher ────────────────────────────────────────────────
function render() {
  const activeView = state.view;
  const prevScrollY = (activeView === 'workout') ? window.scrollY : null;

  document.querySelectorAll('.nav-link, .bottom-nav-item, .sidebar-nav-item').forEach(el => {
    const v = el.dataset.view;
    const isActive = (v === activeView) ||
      (v === 'home' && (activeView === 'home' || activeView === 'dashboard')) ||
      (v === 'split' && (activeView === 'split' || activeView === 'routine' || activeView === 'edit')) ||
      (v === 'history_list' && (activeView === 'history_list' || activeView === 'session_detail')) ||
      (v === 'progress' && (activeView === 'progress' || activeView === 'history')) ||
      (v === 'prs' && activeView === 'prs') ||
      (v === 'calendar' && activeView === 'calendar');

    el.classList.toggle('active', !!isActive);
  });

  const root = document.getElementById('app-root');
  if (!root) return;

  switch (state.view) {
    case 'home':
    case 'dashboard':
      root.innerHTML = renderHomeView();
      break;
    case 'workout':
      root.innerHTML = renderActiveWorkoutView();
      break;
    case 'split':
    case 'routine':
    case 'edit':
      root.innerHTML = renderSplitView();
      break;
    case 'history_list':
      root.innerHTML = renderHistoryListView();
      break;
    case 'session_detail':
      root.innerHTML = renderSessionDetailView();
      break;
    case 'progress':
    case 'history':
      root.innerHTML = renderProgressView();
      if (window.Chart) buildHistoryChart();
      break;
    case 'prs':
      root.innerHTML = renderPrsView();
      break;
    case 'calendar':
      root.innerHTML = renderCalendarView();
      break;
    case 'log':
      root.innerHTML = renderLogView();
      if (!state.restActive) buildRpeRow();
      break;
    default:
      root.innerHTML = renderHomeView();
  }

  if (prevScrollY !== null && activeView === 'workout') {
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  }
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
  stopRest();
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
  window.location.hash = view;
  if (view === 'dashboard' || view === 'prs') {
    loadDashboardSummary().then(render);
  } else if (view === 'calendar') {
    loadWorkoutSessions().then(render);
  }
  render();
}

// Navigate back from log screen; refresh today's last-log values if returning home.
async function goBack() {
  stopRest();
  stopTimer();
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
  // Reset session state so re-opening starts fresh.
  state.sessionSet       = 1;
  state.sessionTotalSets = null;
  state.sessionRestSec   = null;
  const to = state.logReturnView || 'home';
  state.view = to;
  window.location.hash = to;
  if (to === 'home') await loadTodayLogs(); // pull fresh last-log after saving a set
  render();
}

const RPE_DESCRIPTIONS = {
  1: 'Very light recovery (5+ reps in reserve)',
  2: 'Light warmup (5+ reps in reserve)',
  3: 'Light warmup (4+ reps in reserve)',
  4: 'Moderate warmup (4 reps in reserve)',
  5: 'Moderate warmup (3-4 reps in reserve)',
  6: 'Comfortable effort (~4 reps in reserve)',
  7: 'Moderate effort (~3 reps in reserve)',
  8: 'Target Overload zone (~2 reps in reserve)',
  9: 'Heavy effort / Near failure (1 rep in reserve)',
  10: 'Max effort / Absolute technical failure (0 in reserve)'
};

// Build the RPE 1-10 tap buttons after the log form is in the DOM.

// ─── Hash-based routing ───────────────────────────────────────────────────────
function applyHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (hash === 'settings') {
    openSettingsModal();
    return;
  }
  if (hash.startsWith('log-')) {
    const id = parseInt(hash.replace('log-', ''), 10);
    if (!isNaN(id)) { state.view = 'log'; state.logExerciseId = id; return; }
  }
  if (hash.startsWith('session-')) {
    const sessUuid = hash.replace('session-', '');
    if (sessUuid) {
      openSessionDetailView(sessUuid);
      return;
    }
  }
  if (hash === 'history') {
    state.view = 'history_list';
    loadWorkoutSessions().then(render);
    return;
  }
  if (hash === 'progress') {
    state.view = 'progress';
    return;
  }
  if (hash.startsWith('history-')) {
    const id = parseInt(hash.replace('history-', ''), 10);
    if (!isNaN(id)) {
      state.view = 'progress';
      state.historyExerciseId = id;
      if (state.exercises.length) openHistoryView(id);
      return;
    }
  }
  const validViews = ['home', 'dashboard', 'workout', 'split', 'routine', 'edit', 'log', 'history', 'history_list', 'session_detail', 'progress', 'prs', 'calendar'];
  state.view = validViews.includes(hash) ? hash : 'home';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  if (state.view === 'home' || state.view === 'dashboard' || state.view === 'prs') {
    loadDashboardSummary().then(render);
  } else if (state.view === 'calendar') {
    loadWorkoutSessions().then(render);
  }
  render();
});

// Updates the reps/duration field in the custom exercise creation form.

