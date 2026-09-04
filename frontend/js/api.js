/**
 * CalistheniX — High-Performance API Client Module
 * 
 * Features:
 * - In-Memory Stale-While-Revalidate (SWR) Cache for Instant Rendering (0ms latency)
 * - In-Flight Request Deduplication to Prevent Redundant Network Roundtrips
 * - Automatic Cache Invalidation on Mutations (POST, PUT, DELETE)
 * - Fetch Priority Control (Low Priority Background Prefetching)
 * - Dedicated Endpoint Methods with Batch Log Ingestion
 */

const API_BASE = 'http://127.0.0.1:5001';

(function() {
  'use strict';

  // SWR In-Memory Cache and In-Flight Request Tracking
  const _cache = new Map();
  const _inFlight = new Map();

  // Default Time-To-Live (TTL) configuration in milliseconds
  const TTL_CONFIG = {
    '/exercises': 300_000,          // 5 minutes
    '/splits': 60_000,              // 1 minute
    '/workouts': 60_000,            // 1 minute
    '/today': 30_000,               // 30 seconds
    '/dashboard': 30_000,           // 30 seconds
    '/workout_sessions': 30_000,    // 30 seconds
    default: 20_000                 // 20 seconds
  };

  function getTTL(path) {
    for (const [key, ttl] of Object.entries(TTL_CONFIG)) {
      if (key !== 'default' && path.startsWith(key)) return ttl;
    }
    return TTL_CONFIG.default;
  }

  /**
   * Invalidate cached entries matching a pattern, or clear all if no pattern is given.
   * @param {string|RegExp|null} pattern
   */
  function invalidateCache(pattern = null) {
    if (!pattern) {
      _cache.clear();
      return;
    }
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    for (const key of _cache.keys()) {
      if (regex.test(key)) {
        _cache.delete(key);
      }
    }
  }

  /**
   * Core JSON fetch wrapper with SWR caching, deduplication, and error handling.
   * @param {string} method - HTTP Method (GET, POST, PUT, DELETE)
   * @param {string} path - Endpoint path (e.g. '/today')
   * @param {object|null} body - Optional JSON payload
   * @param {object} options - Fetch options { forceFresh, swr, priority }
   * @returns {Promise<any>}
   */
  async function api(method, path, body = null, options = {}) {
    const isGet = method.toUpperCase() === 'GET';
    const cacheKey = `GET:${path}`;
    const forceFresh = !!options.forceFresh;
    const enableSwr = options.swr !== false;
    const priority = options.priority || 'auto';

    // ── 1. SWR Cache Hit Handling ───────────────────────────────────────────
    if (isGet && !forceFresh) {
      const cached = _cache.get(cacheKey);
      if (cached) {
        const isExpired = Date.now() > cached.expiresAt;
        if (!isExpired) {
          return cached.data;
        }
        if (enableSwr) {
          // Serve stale data immediately, trigger background revalidation
          revalidateInBackground(path, priority);
          return cached.data;
        }
      }
    }

    // ── 2. In-Flight Request Deduplication ──────────────────────────────────
    if (isGet && _inFlight.has(cacheKey)) {
      return _inFlight.get(cacheKey);
    }

    // ── 3. Execute Network Request ─────────────────────────────────────────
    const fetchPromise = (async () => {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (priority && priority !== 'auto' && 'priority' in Request.prototype) {
        opts.priority = priority;
      }

      if (body !== null) {
        opts.body = JSON.stringify(body);
      }

      try {
        const res = await fetch(`${API_BASE}${path}`, opts);
        if (res.status === 204) return null;
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        // Cache successful GET responses
        if (isGet) {
          const ttl = getTTL(path);
          _cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl
          });
        } else {
          // Invalidate related cache entries on mutation
          handleMutationCacheInvalidation(path);
        }

        return data;
      } finally {
        if (isGet) {
          _inFlight.delete(cacheKey);
        }
      }
    })();

    if (isGet) {
      _inFlight.set(cacheKey, fetchPromise);
    }

    return fetchPromise;
  }

  /**
   * Background revalidation for SWR cache.
   */
  function revalidateInBackground(path, priority = 'low') {
    const cacheKey = `GET:${path}`;
    if (_inFlight.has(cacheKey)) return;

    api('GET', path, null, { forceFresh: true, swr: false, priority })
      .then(freshData => {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('cx:cache-updated', {
            detail: { path, data: freshData }
          }));
        }
      })
      .catch(() => {});
  }

  /**
   * Automatically clears dependent caches on data writes.
   */
  function handleMutationCacheInvalidation(path) {
    if (path.includes('/splits')) {
      invalidateCache(/\/splits|\/today|\/dashboard/);
    } else if (path.includes('/workouts')) {
      invalidateCache(/\/workouts|\/splits|\/today|\/dashboard/);
    } else if (path.includes('/exercises') || path.includes('/routines') || path.includes('/level_exercises')) {
      invalidateCache(/\/exercises|\/workouts|\/splits|\/today|\/dashboard/);
    } else if (path.includes('/logs') || path.includes('/workout_sessions')) {
      invalidateCache(/\/workout_sessions|\/dashboard|\/today|\/exercises/);
    } else if (path.includes('/import')) {
      invalidateCache();
    }
  }

  /**
   * Prefetch a URL with low network priority to warm the cache.
   */
  function prefetch(path) {
    const cacheKey = `GET:${path}`;
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return;
    if (_inFlight.has(cacheKey)) return;

    api('GET', path, null, { swr: true, priority: 'low' }).catch(() => {});
  }

  const API = {
    api,
    API_BASE,
    prefetch,
    invalidateCache,
    cache: _cache,

    // ─── Today & Dashboard Endpoints ───────────────────────────────────────────
    getTodayWorkout: async (opts) => await api('GET', '/today', null, opts),
    getDashboardSummary: async (opts) => await api('GET', '/dashboard/summary', null, opts),
    getDashboardRecords: async (opts) => await api('GET', '/dashboard/records', null, opts),
    getDashboardActivity: async (opts) => await api('GET', '/dashboard/activity', null, opts),

    // ─── Splits & Schedules Endpoints ──────────────────────────────────────────
    getSplits: async (opts) => await api('GET', '/splits', null, opts),
    getSplitDetail: async (splitId, opts) => await api('GET', `/splits/${splitId}`, null, opts),
    createSplit: async (payload) => await api('POST', '/splits', payload),
    updateSplit: async (splitId, payload) => await api('PUT', `/splits/${splitId}`, payload),
    activateSplit: async (splitId) => await api('PUT', `/splits/${splitId}`, { is_active: 1 }),
    updateSplitSchedule: async (splitId, days) => await api('PUT', `/splits/${splitId}/schedule`, { days }),
    updateScheduleDay: async (splitId, dayIndex, payload) => await api('PUT', `/splits/${splitId}/schedule/${dayIndex}`, payload),
    deleteSplit: async (splitId) => await api('DELETE', `/splits/${splitId}`),

    // ─── Workouts Endpoints ────────────────────────────────────────────────────
    getWorkouts: async (opts) => await api('GET', '/workouts', null, opts),
    getWorkoutDetail: async (workoutId, opts) => await api('GET', `/workouts/${workoutId}`, null, opts),
    createWorkout: async (payload) => await api('POST', '/workouts', payload),
    updateWorkout: async (workoutId, payload) => await api('PUT', `/workouts/${workoutId}`, payload),
    duplicateWorkout: async (workoutId) => await api('POST', `/workouts/${workoutId}/duplicate`),
    deleteWorkout: async (workoutId) => await api('DELETE', `/workouts/${workoutId}`),

    // ─── Exercises & Routines Endpoints ────────────────────────────────────────
    getExercises: async (opts) => await api('GET', '/exercises', null, opts),
    createExercise: async (payload) => await api('POST', '/exercises', payload),
    getExerciseLogs: async (exerciseId, opts) => await api('GET', `/exercises/${exerciseId}/logs`, null, opts),
    getProgressionStatus: async (exerciseId, opts) => await api('GET', `/exercises/${exerciseId}/progression-status`, null, opts),
    promoteProgression: async (exerciseId, nextId) => await api('POST', `/exercises/${exerciseId}/promote`, { next_id: nextId }),
    getRoutineLevels: async (routineName, opts) => await api('GET', `/routines/${encodeURIComponent(routineName)}/levels`, null, opts),
    createRoutineLevel: async (payload) => await api('POST', '/routine_levels', payload),
    addLevelExercise: async (levelId, payload) => await api('POST', `/routine_levels/${levelId}/exercises`, payload),
    updateLevelExercise: async (leId, payload) => await api('PUT', `/level_exercises/${leId}`, payload),
    deleteLevelExercise: async (leId) => await api('DELETE', `/level_exercises/${leId}`),

    // ─── Workout Sessions & Logs Endpoints ─────────────────────────────────────
    getWorkoutSessions: async (opts) => await api('GET', '/workout_sessions', null, opts),
    getWorkoutSessionDetail: async (sessionUuid, opts) => await api('GET', `/workout_sessions/${sessionUuid}`, null, opts),
    createWorkoutSession: async (sessionPayload) => await api('POST', '/workout_sessions', sessionPayload),
    createLog: async (logPayload) => await api('POST', '/logs', logPayload),
    createLogsBatch: async (logsArray) => await api('POST', '/logs/batch', logsArray),

    // ─── Export / Import Backup Endpoints ───────────────────────────────────────
    getExportData: async (opts) => await api('GET', '/export', null, opts),
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
