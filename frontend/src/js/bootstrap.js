/* ============================================================
   CalistheniX — Core App Bootstrap & Entry Point
   Initializes data loaders, event bindings, and PWA setup.
   ============================================================ */

async function loadExercises() {
  state.exercises = await API.getExercises();
}

async function loadTodayResolved() {
  try {
    const data = await API.getTodayWorkout();
    state.todayResolved = data;
  } catch (e) {
    state.todayResolved = null;
  }
}

async function loadDashboardSummary() {
  try {
    const [sum, rec, act] = await Promise.allSettled([
      API.getDashboardSummary(),
      API.getDashboardRecords(),
      API.getDashboardActivity()
    ]);
    state.dashboardSummary  = sum.status === 'fulfilled' ? sum.value : { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
    state.dashboardRecords  = rec.status === 'fulfilled' ? rec.value : [];
    state.dashboardActivity = act.status === 'fulfilled' ? act.value : [];
  } catch (e) {
    state.dashboardSummary  = { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
    state.dashboardRecords  = [];
    state.dashboardActivity = [];
  }
  updateGlobalStreakDisplays(state.dashboardSummary?.streak_days);
}

async function loadTodayLogs() {
  const todayDay = getTodayDay();
  if (todayDay === 'Rest') { state.todayLogs = {}; return; }
  const dayExercises = state.exercises.filter(e => e.day === todayDay);
  const results = await Promise.allSettled(
    dayExercises.map(ex =>
      API.getExerciseLogs(ex.id)
        .then(logs => ({ id: ex.id, log: logs.length ? logs[logs.length - 1] : null }))
    )
  );
  state.todayLogs = {};
  for (const r of results) {
    if (r.status === 'fulfilled') state.todayLogs[r.value.id] = r.value.log;
  }
}

async function init() {
  setupAudioUnlock();
  if (typeof initThemeAndAccent === 'function') {
    initThemeAndAccent();
  }

  // Restore in-progress active workout session from crash recovery
  const savedActive = getActiveSession();
  if (savedActive && savedActive.status === 'in_progress') {
    state.activeSession = savedActive;
    if (typeof startWorkoutDurationTimer === 'function') {
      startWorkoutDurationTimer();
    }
  }

  // Restore mute preference from localStorage
  const muted = isMuted();
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.innerHTML = muted ? renderIcon('muted') : renderIcon('volume');
    muteBtn.title = muted ? 'Unmute sounds' : 'Mute sounds';
  }

  // Auto-initialize demo data on fresh app launch if no user data exists
  if (typeof shouldInitializeDemoData === 'function' && shouldInitializeDemoData()) {
    try {
      await initializeDemoData();
    } catch (e) {
      console.warn('Demo initialization error:', e);
    }
  }

  window.addEventListener('hashchange', applyHash);
  applyHash();
  if (typeof loadWorkoutSessions === 'function') {
    await loadWorkoutSessions();
  }
  render();

  // Load core catalog asynchronously
  try {
    await loadExercises();
    await loadTodayResolved();
    await loadSplits();
    await loadWorkouts();
    if (typeof loadWorkoutSessions === 'function') {
      await loadWorkoutSessions();
    }
    render();
  } catch (e) {
    console.warn('Initial data load error:', e);
  }

  startSyncLoop();
  loadDashboardSummary().then(render);
  loadTodayLogs().then(render);
  if (typeof loadWorkoutSessions === 'function') {
    loadWorkoutSessions().then(render);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        reg.update();
        console.log('CalistheniX SW Registered:', reg.scope);
      })
      .catch(err => console.warn('CalistheniX SW registration failed:', err));
  });
}
