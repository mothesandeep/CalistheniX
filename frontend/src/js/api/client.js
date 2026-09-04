/**
 * CalistheniX — Dedicated API Client Module
 * 
 * Provides dedicated functions for every backend REST endpoint,
 * cleanly scoped under the `window.API` namespace to prevent
 * naming collisions with UI event handlers.
 */

const API_BASE = 'http://127.0.0.1:5001';

(function() {
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

  const API = {
    api,
    API_BASE,

    // ─── Today & Dashboard Endpoints ───────────────────────────────────────────
    getTodayWorkout: async () => await api('GET', '/today'),
    getDashboardSummary: async () => await api('GET', '/dashboard/summary'),
    getDashboardRecords: async () => await api('GET', '/dashboard/records'),
    getDashboardActivity: async () => await api('GET', '/dashboard/activity'),

    // ─── Splits & Schedules Endpoints ──────────────────────────────────────────
    getSplits: async () => await api('GET', '/splits'),
    getSplitDetail: async (splitId) => await api('GET', `/splits/${splitId}`),
    createSplit: async (payload) => await api('POST', '/splits', payload),
    updateSplit: async (splitId, payload) => await api('PUT', `/splits/${splitId}`, payload),
    activateSplit: async (splitId) => await api('PUT', `/splits/${splitId}`, { is_active: 1 }),
    updateSplitSchedule: async (splitId, days) => await api('PUT', `/splits/${splitId}/schedule`, { days }),
    updateScheduleDay: async (splitId, dayIndex, payload) => await api('PUT', `/splits/${splitId}/schedule/${dayIndex}`, payload),
    deleteSplit: async (splitId) => await api('DELETE', `/splits/${splitId}`),

    // ─── Workouts Endpoints ────────────────────────────────────────────────────
    getWorkouts: async () => await api('GET', '/workouts'),
    getWorkoutDetail: async (workoutId) => await api('GET', `/workouts/${workoutId}`),
    createWorkout: async (payload) => await api('POST', '/workouts', payload),
    updateWorkout: async (workoutId, payload) => await api('PUT', `/workouts/${workoutId}`, payload),
    duplicateWorkout: async (workoutId) => await api('POST', `/workouts/${workoutId}/duplicate`),
    deleteWorkout: async (workoutId) => await api('DELETE', `/workouts/${workoutId}`),

    // ─── Exercises & Routines Endpoints ────────────────────────────────────────
    getExercises: async () => await api('GET', '/exercises'),
    createExercise: async (payload) => await api('POST', '/exercises', payload),
    getExerciseLogs: async (exerciseId) => await api('GET', `/exercises/${exerciseId}/logs`),
    getProgressionStatus: async (exerciseId) => await api('GET', `/exercises/${exerciseId}/progression-status`),
    promoteProgression: async (exerciseId, nextId) => await api('POST', `/exercises/${exerciseId}/promote`, { next_id: nextId }),
    getRoutineLevels: async (routineName) => await api('GET', `/routines/${encodeURIComponent(routineName)}/levels`),
    createRoutineLevel: async (payload) => await api('POST', '/routine_levels', payload),
    addLevelExercise: async (levelId, payload) => await api('POST', `/routine_levels/${levelId}/exercises`, payload),
    updateLevelExercise: async (leId, payload) => await api('PUT', `/level_exercises/${leId}`, payload),
    deleteLevelExercise: async (leId) => await api('DELETE', `/level_exercises/${leId}`),

    // ─── Workout Sessions & Logs Endpoints ─────────────────────────────────────
    getWorkoutSessions: async () => await api('GET', '/workout_sessions'),
    getWorkoutSessionDetail: async (sessionUuid) => await api('GET', `/workout_sessions/${sessionUuid}`),
    createWorkoutSession: async (sessionPayload) => await api('POST', '/workout_sessions', sessionPayload),
    createLog: async (logPayload) => await api('POST', '/logs', logPayload),

    // ─── Export / Import Backup Endpoints ───────────────────────────────────────
    getExportData: async () => await api('GET', '/export'),
    importBackupData: async (backupJson) => await api('POST', '/import', backupJson)
  };

  if (typeof window !== 'undefined') {
    window.API = API;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.API = API;
  }
  if (typeof global !== 'undefined') {
    global.API = API;
  }
})();
var API = (typeof globalThis !== 'undefined' && globalThis.API) || (typeof window !== 'undefined' && window.API) || API;
