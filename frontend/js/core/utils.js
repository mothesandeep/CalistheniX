/**
 * CalistheniX — Core Utilities & Formatters
 *
 * Shared helpers used across all views and components.
 */

// Return today's ISO date string (YYYY-MM-DD, local calendar day).
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get or initialise the cycle start date in localStorage.
function getCycleStart() {
  let start = localStorage.getItem(LS_CYCLE_KEY);
  if (!start) {
    start = todayISO();
    localStorage.setItem(LS_CYCLE_KEY, start);
  }
  return start;
}

// Days elapsed between two ISO date strings (today minus startDate, floored).
function daysBetween(startISO, endISO) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / msPerDay);
}

// Returns the current cycle day's split name (e.g. 'Push A' or 'Rest').
function getTodayDay() {
  const cycleDay = daysBetween(getCycleStart(), todayISO()) % 7;
  return CYCLE[cycleDay];
}

function getTodayLabel() {
  const d = new Date();
  return `${DAY_NAMES[d.getDay()]} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── UUID generator (crypto.randomUUID with fallback) ─────────────────────────
function newUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Formatters & UI Utilities ───────────────────────────────────────────────
function fmtTarget(le) {
  if (le.type === 'duration') {
    return `${le.duration_sec ?? 30}s hold`;
  }
  return `${le.reps ?? 10} reps`;
}

function fmtTempo(t) { return t || 'Standard'; }
function fmtRest(r)  { return r ? `${r}s rest` : '90s rest'; }

function badge(type) {
  if (type === 'duration') return '<span class="cx-badge cx-badge-gold">Hold</span>';
  return '<span class="cx-badge cx-badge-cyan">Reps</span>';
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Morning';
  if (hr < 18) return 'Afternoon';
  return 'Evening';
}

function fmtSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDurationMinSec(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

let _toastTimer = null;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'} toast-show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.className = 'toast toast-hidden';
  }, 3500);
}

// ─── Session Helpers ─────────────────────────────────────────────────────────
function getExercise(id) {
  if (!id) return null;
  return (typeof state !== 'undefined' && state.exercises) ? (state.exercises.find(e => e.id === Number(id)) || null) : null;
}

function getActiveSession() {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_SESSION);
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof state !== 'undefined') {
      state.activeSession = parsed;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveActiveSession(session) {
  if (!session) {
    localStorage.removeItem(LS_ACTIVE_SESSION);
    if (typeof state !== 'undefined') {
      state.activeSession = null;
    }
  } else {
    localStorage.setItem(LS_ACTIVE_SESSION, JSON.stringify(session));
    if (typeof state !== 'undefined') {
      state.activeSession = session;
    }
  }
}

function getSessionElapsedSec(session) {
  if (!session) return 0;
  const start = session.sessionTimer?.startedAt || session.startTime || session.startedAt;
  if (!start) return 0;

  const now = Date.now();
  let pausedMs = (session.sessionTimer?.totalPausedMs != null)
    ? session.sessionTimer.totalPausedMs
    : (session.totalPausedMs || (session.pausedTotalSec ? session.pausedTotalSec * 1000 : 0));
    
  const isPaused = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.PAUSED : 'PAUSED') || session.status === 'paused';
  const pausedAt = session.sessionTimer?.pausedAt || session.pausedAt;
  if (isPaused && pausedAt) {
    pausedMs += (now - pausedAt);
  }
  const rawElapsedMs = now - start - pausedMs;
  return Math.max(0, Math.floor(rawElapsedMs / 1000));
}


// ─── Shared Timer and Streak Utilities ───────────────────────────────────────
function updateGlobalStreakDisplays(streakDays) {
  const days = Number(streakDays) || 0;
  const els = [
    document.getElementById('nav-streak-counter'),
    document.getElementById('mobile-streak-counter'),
    document.getElementById('runner-streak-counter')
  ].filter(Boolean);
  els.forEach(el => {
    el.textContent = `${days}d`;
  });
}

if (typeof window !== 'undefined') {
  window.todayISO = todayISO;
  window.getCycleStart = getCycleStart;
  window.daysBetween = daysBetween;
  window.getTodayDay = getTodayDay;
  window.getTodayLabel = getTodayLabel;
  window.newUUID = newUUID;
  window.fmtTarget = fmtTarget;
  window.fmtTempo = fmtTempo;
  window.fmtRest = fmtRest;
  window.badge = badge;
  window.getGreeting = getGreeting;
  window.fmtSecs = fmtSecs;
  window.fmtDurationMinSec = fmtDurationMinSec;
  window.showToast = showToast;
  window.getExercise = getExercise;
  window.getActiveSession = getActiveSession;
  window.saveActiveSession = saveActiveSession;
  window.getSessionElapsedSec = getSessionElapsedSec;
  window.updateGlobalStreakDisplays = updateGlobalStreakDisplays;
}
