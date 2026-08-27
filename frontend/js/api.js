/**
 * CalistheniX — Dedicated API Client Module
 * 
 * Provides dedicated functions for every backend REST endpoint.
 * Works seamlessly in vanilla browser environments and attaches
 * both individual functions and the `window.API` namespace.
 */

const API_BASE = 'http://127.0.0.1:5001';

/**
 * Generic JSON fetch wrapper with error handling.
 * @param {string} method - HTTP Method (GET, POST, PUT, DELETE)
 * @param {string} path - Endpoint path (e.g. '/today')
 * @param {object|null} body - Optional JSON payload
 * @returns {Promise<any>}
 */
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Today & Dashboard Endpoints ─────────────────────────────────────────────

async function getTodayWorkout() {
  return await api('GET', '/today');
}

async function getDashboardSummary() {
  return await api('GET', '/dashboard/summary');
}

async function getDashboardRecords() {
  return await api('GET', '/dashboard/records');
}

async function getDashboardActivity() {
  return await api('GET', '/dashboard/activity');
}

async function getWeeklyProgress() {
  return await api('GET', '/api/weekly-progress');
}

async function getMuscleFocus() {
  return await api('GET', '/api/muscle-focus');
}

async function getUpcomingWorkouts() {
  return await api('GET', '/api/upcoming-workouts');
}

// ─── Splits & Schedules Endpoints ────────────────────────────────────────────

async function getSplits() {
  return await api('GET', '/splits');
}

async function getSplitDetail(splitId) {
  return await api('GET', `/splits/${splitId}`);
}

async function createSplit(payload) {
  return await api('POST', '/splits', payload);
}

async function updateSplit(splitId, payload) {
  return await api('PUT', `/splits/${splitId}`, payload);
}

async function activateSplit(splitId) {
  return await api('PUT', `/splits/${splitId}`, { is_active: 1 });
}

async function updateScheduleDay(splitId, dayIndex, payload) {
  return await api('PUT', `/splits/${splitId}/schedule/${dayIndex}`, payload);
}

async function deleteSplit(splitId) {
  return await api('DELETE', `/splits/${splitId}`);
}

// ─── Workouts Endpoints ──────────────────────────────────────────────────────

async function getWorkouts() {
  return await api('GET', '/workouts');
}

async function getWorkoutDetail(workoutId) {
  return await api('GET', `/workouts/${workoutId}`);
}

async function createWorkout(payload) {
  return await api('POST', '/workouts', payload);
}

async function updateWorkout(workoutId, payload) {
  return await api('PUT', `/workouts/${workoutId}`, payload);
}

async function duplicateWorkout(workoutId) {
  return await api('POST', `/workouts/${workoutId}/duplicate`);
}

async function deleteWorkout(workoutId) {
  return await api('DELETE', `/workouts/${workoutId}`);
}

// ─── Exercises & Routines Endpoints ──────────────────────────────────────────

async function getExercises() {
  return await api('GET', '/exercises');
}

async function createExercise(payload) {
  return await api('POST', '/exercises', payload);
}

async function getExerciseLogs(exerciseId) {
  return await api('GET', `/exercises/${exerciseId}/logs`);
}

async function getProgressionStatus(exerciseId) {
  return await api('GET', `/exercises/${exerciseId}/progression-status`);
}

async function promoteProgression(exerciseId, nextId) {
  return await api('POST', `/exercises/${exerciseId}/promote`, { next_id: nextId });
}

async function getRoutineLevels(routineName) {
  return await api('GET', `/routines/${encodeURIComponent(routineName)}/levels`);
}

async function createRoutineLevel(payload) {
  return await api('POST', '/routine_levels', payload);
}

async function addLevelExercise(levelId, payload) {
  return await api('POST', `/routine_levels/${levelId}/exercises`, payload);
}

async function updateLevelExercise(leId, payload) {
  return await api('PUT', `/level_exercises/${leId}`, payload);
}

async function deleteLevelExercise(leId) {
  return await api('DELETE', `/level_exercises/${leId}`);
}

// ─── Workout Sessions & Logs Endpoints ───────────────────────────────────────

async function getWorkoutSessions() {
  return await api('GET', '/workout_sessions');
}

async function getWorkoutSessionDetail(sessionUuid) {
  return await api('GET', `/workout_sessions/${sessionUuid}`);
}

async function createWorkoutSession(sessionPayload) {
  return await api('POST', '/workout_sessions', sessionPayload);
}

async function createLog(logPayload) {
  return await api('POST', '/logs', logPayload);
}

// ─── Export / Import Backup Endpoints ─────────────────────────────────────────

async function getExportData() {
  return await api('GET', '/export');
}

async function importBackupData(backupJson) {
  return await api('POST', '/import', backupJson);
}

// ─── Namespace Export ────────────────────────────────────────────────────────

const API = {
  api,
  API_BASE,
  // Today & Dashboard
  getTodayWorkout,
  getDashboardSummary,
  getDashboardRecords,
  getDashboardActivity,
  getWeeklyProgress,
  getMuscleFocus,
  getUpcomingWorkouts,
  // Splits
  getSplits,
  getSplitDetail,
  createSplit,
  updateSplit,
  activateSplit,
  updateScheduleDay,
  deleteSplit,
  // Workouts
  getWorkouts,
  getWorkoutDetail,
  createWorkout,
  updateWorkout,
  duplicateWorkout,
  deleteWorkout,
  // Exercises
  getExercises,
  createExercise,
  getExerciseLogs,
  getProgressionStatus,
  promoteProgression,
  getRoutineLevels,
  createRoutineLevel,
  addLevelExercise,
  updateLevelExercise,
  deleteLevelExercise,
  // Sessions & Logs
  getWorkoutSessions,
  getWorkoutSessionDetail,
  createWorkoutSession,
  createLog,
  // Backup
  getExportData,
  importBackupData
};

if (typeof window !== 'undefined') {
  window.API = API;
}
