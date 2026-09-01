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
      (v === 'calendar' && activeView === 'calendar') ||
      (v === 'library' && activeView === 'library');

    el.classList.toggle('active', !!isActive);
  });

  updateBottomNavIndicator();

  const root = document.getElementById('app-root');
  if (!root) return;

  switch (state.view) {
    case 'home':
    case 'dashboard':
      root.innerHTML = renderHomeView();
      break;
    case 'workout':
      root.innerHTML = renderActiveWorkoutView();
      const currentActiveSession = getActiveSession();
      if (currentActiveSession && currentActiveSession.status === 'in_progress' && typeof startWorkoutDurationTimer === 'function') {
        startWorkoutDurationTimer();
      }
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
    case 'library':
      root.innerHTML = renderExerciseLibraryView();
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
  render();
}

function switchView(view) {
  // Normalize aliases
  if (view === 'history') view = 'history_list';
  if (view === 'dashboard') view = 'home';

  state.view = view;
  state.editingId = null;
  state.logExerciseId = null;
  state.historyExerciseId = null;

  // Clean up any open modal backdrops or sheets that might linger in DOM
  const modalRoot = document.getElementById('settings-modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
  
  const lingeringBackdrops = document.querySelectorAll('.split-sheet-backdrop, .day-editor-backdrop, .settings-modal-backdrop');
  lingeringBackdrops.forEach(el => el.remove());

  stopTimer();
  stopRest();
  if (typeof cleanupAllWorkoutTimers === 'function') {
    cleanupAllWorkoutTimers();
  }
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }

  const targetHash = (view === 'history_list') ? 'history' : view;
  if (window.location.hash !== '#' + targetHash) {
    window.location.hash = targetHash;
  }

  if (view === 'workout') {
    const s = getActiveSession();
    if (s && s.status === 'in_progress' && typeof startWorkoutDurationTimer === 'function') {
      startWorkoutDurationTimer();
    }
  } else if (view === 'home' || view === 'prs') {
    loadDashboardSummary().then(render);
    if (typeof loadTodayLogs === 'function') loadTodayLogs();
  } else if (view === 'split') {
    if (typeof loadSplitDetail === 'function') {
      loadSplitDetail(state.selectedSplitId || 1).then(render);
    }
  } else if (view === 'history_list' || view === 'calendar') {
    if (typeof loadWorkoutSessions === 'function') {
      loadWorkoutSessions().then(render);
    }
  } else if (view === 'progress') {
    if (typeof loadDashboardSummary === 'function') {
      loadDashboardSummary().then(render);
    }
  } else if (view === 'library') {
    if (typeof loadExercises === 'function') {
      loadExercises().then(render);
    }
  }

  render();
}

// Navigate back from log screen; refresh today's last-log values if returning home.
async function goBack() {
  stopRest();
  stopTimer();
  if (typeof cleanupAllWorkoutTimers === 'function') {
    cleanupAllWorkoutTimers();
  }
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
  if (hash === 'editor' || hash === 'workouts') {
    state.view = 'split';
    state.splitActiveSubTab = 'workouts';
    return;
  }
  if (hash === 'library') {
    state.view = 'library';
    return;
  }
  const validViews = ['home', 'dashboard', 'workout', 'split', 'routine', 'edit', 'log', 'history', 'history_list', 'session_detail', 'progress', 'prs', 'calendar', 'library'];
  state.view = validViews.includes(hash) ? hash : 'home';
}

window.addEventListener('hashchange', async () => {
  applyHash();
  state.editingId = null;
  if (state.view === 'home' || state.view === 'dashboard' || state.view === 'prs') {
    loadDashboardSummary().then(render);
  } else if (state.view === 'calendar' || state.view === 'history_list') {
    loadWorkoutSessions().then(render);
  } else if (state.view === 'split') {
    if (typeof loadSplitDetail === 'function') loadSplitDetail(state.selectedSplitId || 1).then(render);
  }
  render();
});

// ─── Mobile Bottom Navigation Dynamic Sliding Indicator ───────────────────────
function updateBottomNavIndicator() {
  const nav = document.querySelector('.app-bottom-nav');
  const indicator = document.getElementById('bottom-nav-indicator');
  if (!nav || !indicator) return;

  const activeItem = nav.querySelector('.bottom-nav-item.active');
  if (!activeItem) {
    indicator.style.opacity = '0';
    return;
  }

  const navRect = nav.getBoundingClientRect();
  const itemRect = activeItem.getBoundingClientRect();

  if (navRect.width === 0 || itemRect.width === 0) {
    return;
  }

  const left = itemRect.left - navRect.left;
  const top = itemRect.top - navRect.top;
  const width = itemRect.width;
  const height = itemRect.height;

  indicator.style.width = `${width}px`;
  indicator.style.height = `${height}px`;
  indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  indicator.style.opacity = '1';

  if (activeItem.classList.contains('bottom-nav-workout')) {
    indicator.classList.add('indicator-workout');
  } else {
    indicator.classList.remove('indicator-workout');
  }
}

// ─── Persistent Mobile Bottom Navigation Click Handling ───────────────────────
function initMobileBottomNavInteractions() {
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav || nav._interactionsBound) return;
  nav._interactionsBound = true;

  nav.addEventListener('click', (e) => {
    const item = e.target.closest('.bottom-nav-item');
    if (!item) return;
    const view = item.dataset.view;
    if (view) {
      e.preventDefault();
      switchView(view);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  });
}

window.addEventListener('resize', () => {
  requestAnimationFrame(updateBottomNavIndicator);
});

// Run initial indicator sync and attach persistent nav handlers
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMobileBottomNavInteractions();
      setTimeout(updateBottomNavIndicator, 50);
    });
  } else {
    initMobileBottomNavInteractions();
    setTimeout(updateBottomNavIndicator, 50);
  }
}


