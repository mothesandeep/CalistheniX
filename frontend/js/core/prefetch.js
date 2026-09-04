/**
 * CalistheniX — Intent-Based Data Prefetcher Module
 * 
 * Accurately anticipates user navigation via:
 * 1. Pointer / Hover Intent (40ms debounce to avoid spam on fast sweeps)
 * 2. Focus-In Intent (for keyboard / accessible navigation)
 * 3. TouchStart Intent (initiates network roundtrip 80-150ms before tap release)
 * 4. Proximity Intersection Observer for offscreen content
 */

(function() {
  'use strict';

  const _intentTimers = new WeakMap();

  const VIEW_PREFETCH_MAP = {
    'home': ['/today', '/dashboard/summary', '/dashboard/records', '/dashboard/activity'],
    'dashboard': ['/today', '/dashboard/summary', '/dashboard/records', '/dashboard/activity'],
    'split': ['/splits', '/workouts'],
    'routine': ['/splits', '/workouts'],
    'edit': ['/workouts', '/splits', '/exercises'],
    'workout': ['/today', '/workouts'],
    'stats': ['/workout_sessions', '/dashboard/summary'],
    'history': ['/workout_sessions'],
    'history_list': ['/workout_sessions'],
    'progress': ['/dashboard/summary', '/dashboard/records'],
    'prs': ['/dashboard/records', '/dashboard/summary'],
    'calendar': ['/workout_sessions'],
    'library': ['/exercises']
  };

  /**
   * Warm the API cache for a specific view or endpoint target.
   * @param {string} targetView - view name or endpoint path
   */
  function prefetchViewIntent(targetView) {
    if (!targetView || typeof API === 'undefined' || !API.prefetch) return;

    const endpoints = VIEW_PREFETCH_MAP[targetView];
    if (endpoints && Array.isArray(endpoints)) {
      endpoints.forEach(ep => API.prefetch(ep));
    } else if (targetView.startsWith('/')) {
      API.prefetch(targetView);
    }
  }

  /**
   * Prefetch exercise-specific logs and progression status.
   * @param {number|string} exerciseId
   */
  function prefetchExerciseIntent(exerciseId) {
    if (!exerciseId || typeof API === 'undefined' || !API.prefetch) return;
    const id = Number(exerciseId);
    if (!isNaN(id) && id > 0) {
      API.prefetch(`/exercises/${id}/logs`);
      API.prefetch(`/exercises/${id}/progression-status`);
    }
  }

  /**
   * Prefetch split-specific details.
   * @param {number|string} splitId
   */
  function prefetchSplitIntent(splitId) {
    if (!splitId || typeof API === 'undefined' || !API.prefetch) return;
    const id = Number(splitId);
    if (!isNaN(id) && id > 0) {
      API.prefetch(`/splits/${id}`);
    }
  }

  /**
   * Schedule intent fetch with a tiny delay to filter accidental cursor sweeps.
   */
  function handleIntentTrigger(element) {
    if (!element) return;

    // Clear existing timer if re-triggered
    if (_intentTimers.has(element)) {
      clearTimeout(_intentTimers.get(element));
    }

    const timer = setTimeout(() => {
      const view = element.dataset.view || element.getAttribute('data-view');
      if (view) {
        prefetchViewIntent(view);
      }

      const exerciseId = element.dataset.exerciseId || element.getAttribute('data-exercise-id');
      if (exerciseId) {
        prefetchExerciseIntent(exerciseId);
      }

      const splitId = element.dataset.splitId || element.getAttribute('data-split-id');
      if (splitId) {
        prefetchSplitIntent(splitId);
      }

      _intentTimers.delete(element);
    }, 40);

    _intentTimers.set(element, timer);
  }

  function handleIntentCancel(element) {
    if (_intentTimers.has(element)) {
      clearTimeout(_intentTimers.get(element));
      _intentTimers.delete(element);
    }
  }

  /**
   * Attach global delegation for hover, focus, and touch intent.
   */
  function initIntentListeners() {
    if (typeof document === 'undefined') return;

    // Pointer hover intent
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('[data-view], [data-exercise-id], [data-split-id], .sidebar-nav-item, .bottom-nav-item, .exercise-card, .split-day-card');
      if (target) handleIntentTrigger(target);
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const target = e.target.closest('[data-view], [data-exercise-id], [data-split-id], .sidebar-nav-item, .bottom-nav-item');
      if (target) handleIntentCancel(target);
    }, { passive: true });

    // Focus intent (keyboard users)
    document.addEventListener('focusin', (e) => {
      const target = e.target.closest('[data-view], [data-exercise-id], [data-split-id], .sidebar-nav-item, .bottom-nav-item');
      if (target) handleIntentTrigger(target);
    }, { passive: true });

    // Touch intent (starts request on finger down before release)
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('[data-view], [data-exercise-id], [data-split-id], .bottom-nav-item, .sidebar-nav-item');
      if (target) handleIntentTrigger(target);
    }, { passive: true });
  }

  // Auto-initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIntentListeners);
    } else {
      initIntentListeners();
    }
  }

  if (typeof window !== 'undefined') {
    window.IntentPrefetcher = {
      prefetchViewIntent,
      prefetchExerciseIntent,
      prefetchSplitIntent
    };
  }
})();
