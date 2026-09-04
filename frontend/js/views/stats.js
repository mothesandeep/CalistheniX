/**
 * CalistheniX — High-Fidelity Stats & Analytics Hub View (100% Real Data)
 * 
 * Connected to:
 * - state.workoutSessions & localStorage (cx_pending_session_*, cx_session_*)
 * - state.dashboardSummary (streak_days, week_sessions, week_sets)
 * - state.weightHistory & getWeightHistory() / getTargetWeight()
 * - state.exercises & API.getExerciseLogs(exerciseId)
 * 
 * Zero mock/hardcoded values. Displays elegant empty states when data is not yet recorded.
 */

(function () {
  'use strict';

  // ─── Local View State ───────────────────────────────────────────────────────
  const statsLocalState = {
    muscleTab: 'balance',      // 'balance' | 'fatigue' | 'strength'
    musclePeriod: 'week',      // 'week' | '30d' | '90d' | 'all'
    effortPeriod: '90d',       // '30d' | '90d' | '1Y' | 'all'
    weightPeriod: '3M',        // '1M' | '3M' | '1Y' | 'all'
    exerciseId: null,          // exercise id or null
    exerciseMetric: 'top_set', // 'top_set' | '1rm' | 'effort'
    showPicker: false,
    showWeightModal: false,
    selectedMuscleHighlight: null,
    exerciseLogsCache: {}
  };

  const MUSCLE_GROUP_ALIASES = {
    'Traps': ['traps', 'upper_traps', 'mid_traps'],
    'Shoulders': ['front_delts', 'side_delts', 'rear_delts', 'shoulders'],
    'Chest': ['chest', 'upper_chest', 'lower_chest'],
    'Upper back': ['upper_back', 'lats', 'mid_traps', 'rear_delts'],
    'Serratus': ['serratus', 'obliques', 'chest'],
    'Biceps': ['biceps'],
    'Triceps': ['triceps'],
    'Forearms': ['forearms'],
    'Abs': ['abs', 'core'],
    'Obliques': ['obliques', 'core'],
    'Lower back': ['lower_back'],
    'Glutes': ['glutes'],
    'Quads': ['quads'],
    'Hamstrings': ['hamstrings'],
    'Adductors': ['adductors', 'quads', 'glutes'],
    'Hip flexors': ['hip_flexors', 'abs', 'quads', 'core'],
    'Calves': ['calves'],
    'Shins': ['tibialis', 'calves']
  };

  function isGroupTrained(groupName, setCounts) {
    const keys = MUSCLE_GROUP_ALIASES[groupName] || [groupName.toLowerCase().replace(/\s+/g, '_')];
    return keys.some(k => (setCounts[k] || 0) > 0);
  }

  function isMainExercise(e) {
    if (!e || !e.name) return false;
    const day = (e.day || '').toLowerCase();
    const pattern = (e.movement_pattern || '').toLowerCase();
    const phase = (e.phase || '').toLowerCase();
    const name = e.name.toLowerCase();

    if (day.includes('mobility') || day.includes('stretch')) return false;
    if (phase === 'warmup' || phase === 'cooldown') return false;
    if (pattern.startsWith('mobility') || pattern.startsWith('stretch')) return false;
    if (name.includes('circle') || name.includes('rotation') || name.includes('stretch') || name.includes('arm swings') || name.includes('leg swings') || name.includes('cat-cow') || name.includes('pull-apart')) {
      return false;
    }
    return true;
  }

  function getAllSelectableExercises() {
    const map = new Map();
    (state.exercises || []).forEach(e => {
      if (e && e.name && isMainExercise(e)) {
        map.set(e.name.toLowerCase().trim(), {
          id: e.id,
          name: e.name,
          type: e.type || 'reps'
        });
      }
    });

    const sessions = getCompletedSessions();
    sessions.forEach(sess => {
      const logs = extractSessionLogs(sess);
      logs.forEach(l => {
        if (l.exercise_name) {
          const logPhase = (l.phase || '').toLowerCase();
          if (logPhase === 'warmup' || logPhase === 'cooldown') return;
          if (!isMainExercise({ name: l.exercise_name, phase: l.phase, type: l.exercise_type })) return;
          const k = l.exercise_name.toLowerCase().trim();
          if (!map.has(k)) {
            map.set(k, {
              id: l.exercise_id || k,
              name: l.exercise_name,
              type: l.exercise_type || 'reps'
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // ─── Data Extraction Helpers ────────────────────────────────────────────────
  function getCompletedSessions() {
    const rawSessions = (state.workoutSessions || []).slice();
    const existingUuids = new Set(rawSessions.map(s => s.session_uuid || s.id));
    const prefix = typeof LS_SESSION_PREFIX !== 'undefined' ? LS_SESSION_PREFIX : 'cx_session_';
    
    // Check active session with completed sets
    const active = (typeof state !== 'undefined' && state.activeSession) ? state.activeSession : (typeof getActiveSession === 'function' ? getActiveSession() : null);
    if (active && (active.id || active.session_uuid)) {
      const activeId = active.id || active.session_uuid;
      const completedSetsCount = active.exercises ? active.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.completed).length : 0), 0) : (active.completed_sets || 0);
      if (completedSetsCount > 0 && !existingUuids.has(activeId)) {
        rawSessions.push({
          session_uuid: activeId,
          routine_name: active.routine_name || active.routine || 'In-Progress Workout',
          level: active.level || 1,
          started_at: active.started_at || active.startTime || new Date().toISOString(),
          completed_at: active.completed_at || new Date().toISOString(),
          duration_sec: active.duration_sec || active.duration || 0,
          total_sets: active.exercises ? active.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0) : (active.total_sets || completedSetsCount),
          completed_sets: completedSetsCount,
          warmup_status: active.warmup_status || 'none',
          cooldown_status: active.cooldown_status || 'none',
          status: 'in_progress',
          exercises: active.exercises || []
        });
        existingUuids.add(activeId);
      }
    }

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cx_session_') || k.startsWith('cx_pending_session_'))) {
          try {
            const item = JSON.parse(localStorage.getItem(k));
            const sessId = item?.id || item?.session_uuid;
            if (item && sessId && !existingUuids.has(sessId) && (item.is_completed || item.status === 'completed' || item.status === 'completed_early' || (item.completed_sets && item.completed_sets > 0))) {
              rawSessions.push({
                session_uuid: sessId,
                routine_name: item.routine || item.routine_name || 'Workout',
                level: item.level || 1,
                started_at: item.started_at || item.startTime,
                completed_at: item.completed_at || item.endTime || new Date().toISOString(),
                duration_sec: item.duration_sec || item.duration || 0,
                total_sets: item.total_sets || (item.exercises ? item.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0) : 0),
                completed_sets: item.completed_sets || (item.exercises ? item.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.completed).length : 0), 0) : 0),
                warmup_status: item.warmup_status || 'none',
                cooldown_status: item.cooldown_status || 'none',
                status: item.status || 'completed',
                exercises: item.exercises || []
              });
              existingUuids.add(sessId);
            }
          } catch (e) {}
        }
      }
    }

    return rawSessions
      .filter(s => s.status === 'completed' || s.is_completed || (s.completed_sets && s.completed_sets > 0) || s.status === 'completed_early' || s.status === 'in_progress')
      .sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at));
  }

  function extractSessionLogs(session) {
    if (!session) return [];
    if (Array.isArray(session.logs) && session.logs.length > 0) {
      return session.logs;
    }
    let exercises = session.exercises;
    if (!exercises && session.raw_json) {
      try {
        const parsed = typeof session.raw_json === 'string' ? JSON.parse(session.raw_json) : session.raw_json;
        exercises = parsed?.exercises || parsed?.snapshot?.exercises || [];
      } catch (e) {}
    }
    if (!exercises && session.snapshot) {
      exercises = session.snapshot.exercises || [];
    }
    if (!Array.isArray(exercises)) return [];

    const logs = [];
    exercises.forEach(ex => {
      const exName = ex.exercise_name || ex.name || 'Exercise';
      const exId = ex.exercise_id || ex.id;
      const exType = ex.exercise_type || ex.type || 'reps';
      const phase = ex.phase || 'main';
      (ex.sets || []).forEach((s, setIdx) => {
        if (session.status === 'in_progress' && s.completed !== true) {
          return;
        }
        if (s.completed !== false) {
          logs.push({
            exercise_id: exId,
            exercise_name: exName,
            exercise_type: exType,
            phase: phase,
            set_index: setIdx + 1,
            reps: s.reps != null ? Number(s.reps) : (s.actual_val != null && exType === 'reps' ? Number(s.actual_val) : null),
            weight_kg: s.weight_kg != null ? Number(s.weight_kg) : (s.weight != null ? Number(s.weight) : null),
            duration_sec: s.duration_sec != null ? Number(s.duration_sec) : (s.duration != null ? Number(s.duration) : (s.actual_val != null && (exType === 'duration' || exType === 'hold' || exType === 'isometric') ? Number(s.actual_val) : null)),
            rpe: s.rpe != null ? Number(s.rpe) : null,
            rir: s.rir != null ? Number(s.rir) : (s.rpe != null ? Math.max(0, 10 - Number(s.rpe)) : null),
            is_pr: !!(s.is_pr || s.pr_type),
            pr_type: s.pr_type || null
          });
        }
      });
    });
    return logs;
  }

  function calculateSessionVolume(session) {
    const logs = extractSessionLogs(session);
    if (logs.length === 0) {
      return session.volume_kg || 0;
    }
    let totalVol = 0;
    logs.forEach(l => {
      const w = l.weight_kg || 0;
      const r = l.reps || 1;
      totalVol += (w * r);
    });
    return Math.round(totalVol * 10) / 10;
  }

  function countSessionPRs(session) {
    if (session.pr_count != null) return session.pr_count;
    if (Array.isArray(session.prs)) return session.prs.length;
    const logs = extractSessionLogs(session);
    let count = 0;
    logs.forEach(l => {
      if (l.is_pr || l.pr_type) count++;
    });
    return count;
  }

  function formatWorkoutDuration(durationSec) {
    if (!durationSec || durationSec <= 0) return '1 min';
    const mins = Math.round(durationSec / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatWorkoutDate(dateStr) {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${daysShort[d.getDay()]} ${d.getDate()} ${monthsShort[d.getMonth()]}`;
  }

  function getWorkoutIconSvg(routineName) {
    const name = (routineName || '').toLowerCase();
    if (name.includes('leg') || name.includes('squat') || name.includes('lower')) {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 4h10l1 16h-3.5l-2.5-10-2.5 10H6z"/>
        </svg>
      `;
    }
    if (name.includes('pull') || name.includes('back') || name.includes('chin') || name.includes('row')) {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16M7 4v6a5 5 0 0 0 10 0V4M12 15v5"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/>
      </svg>
    `;
  }

  function getPeriodCutoffDate(period) {
    const now = Date.now();
    if (period === 'week' || period === '7d' || period === '1M') {
      const days = period === '1M' ? 30 : 7;
      return new Date(now - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    if (period === '30d' || period === '3M') {
      const days = period === '3M' ? 90 : 30;
      return new Date(now - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    if (period === '90d') {
      return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    if (period === '1Y') {
      return new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    return null;
  }

  // ─── 1. Header & Navigation ────────────────────────────────────────────────
  function renderHeader() {
    return `
      <div class="stats-header-row">
        <div>
          <h1 class="stats-title">Stats</h1>
          <div class="stats-subtitle">Progress & history</div>
        </div>
        <button class="stats-history-icon-btn" onclick="openHistoryListView()" title="View Full Workout History Log" aria-label="History Log">
          <svg class="cx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <polyline points="12 7 12 12 15 15"/>
          </svg>
        </button>
      </div>
    `;
  }

  function calculateWeekStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    
    // Group workout dates by ISO week key (e.g. "2026-W36")
    const weekSet = new Set();
    sessions.forEach(s => {
      const dStr = s.completed_at || s.started_at;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = temp.getUTCDay() || 7;
          temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
          weekSet.add(`${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`);
        }
      }
    });

    if (weekSet.size === 0) return 0;

    const getWeekKeyForDate = (dateObj) => {
      const temp = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
      return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    let checkDate = new Date();
    let currentWeekKey = getWeekKeyForDate(checkDate);
    
    // If no workout in current week yet, check if there was one last week to keep streak alive
    if (!weekSet.has(currentWeekKey)) {
      checkDate.setDate(checkDate.getDate() - 7);
      const prevWeekKey = getWeekKeyForDate(checkDate);
      if (!weekSet.has(prevWeekKey)) {
        return 0;
      }
    }

    let streak = 0;
    while (true) {
      const wKey = getWeekKeyForDate(checkDate);
      if (weekSet.has(wKey)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  }

  // ─── 2. 2x2 Metric Cards Grid ──────────────────────────────────────────────
  function renderMetricsGrid() {
    const sessions = getCompletedSessions();
    const workoutsCount = sessions.length;

    // This month workouts count
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const thisMonthCount = sessions.filter(s => {
      const d = new Date(s.completed_at || s.started_at);
      return !isNaN(d.getTime()) && d.getFullYear() === curYear && d.getMonth() === curMonth;
    }).length;

    // Real consecutive week streak
    const streakWeeks = calculateWeekStreak(sessions);

    // Weight 30d change (defensively sorted chronologically)
    const weightHistory = (typeof getWeightHistory === 'function' ? getWeightHistory() : []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    let weightDiffStr = '—';
    let weightDiffClass = '';
    if (weightHistory.length >= 2) {
      const latest = weightHistory[weightHistory.length - 1].weight;
      const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const pastPoints = weightHistory.filter(h => (h.date || '').slice(0, 10) <= cutoff30d);
      const past = pastPoints.length ? pastPoints[pastPoints.length - 1].weight : weightHistory[0].weight;
      const diff = Math.round((latest - past) * 10) / 10;
      weightDiffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
      weightDiffClass = diff < 0 ? 'val-red' : (diff > 0 ? 'val-green' : '');
    } else if (weightHistory.length === 1) {
      weightDiffStr = '0.0 kg';
    }

    return `
      <div class="stats-metrics-grid">
        <!-- Card 1: Workouts -->
        <div class="stats-metric-card" onclick="openHistoryListView()" style="cursor:pointer;" title="View all workouts">
          <div class="stats-metric-top">
            <svg class="stats-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/>
            </svg>
            <span>Workouts</span>
          </div>
          <div class="stats-metric-val">${workoutsCount}</div>
        </div>

        <!-- Card 2: This month -->
        <div class="stats-metric-card">
          <div class="stats-metric-top">
            <svg class="stats-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>This month</span>
          </div>
          <div class="stats-metric-val">${thisMonthCount}</div>
        </div>

        <!-- Card 3: Week streak -->
        <div class="stats-metric-card">
          <div class="stats-metric-top">
            <svg class="stats-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            <span>Week streak</span>
          </div>
          <div class="stats-metric-val">${streakWeeks}</div>
        </div>

        <!-- Card 4: Weight 30d -->
        <div class="stats-metric-card">
          <div class="stats-metric-top">
            <svg class="stats-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <polyline points="9 11 12 14 15 11"/>
            </svg>
            <span>Weight 30d</span>
          </div>
          <div class="stats-metric-val ${weightDiffClass}">${weightDiffStr}</div>
        </div>
      </div>
    `;
  }

  // ─── 3. Activity 12-Month Heatmap ──────────────────────────────────────────
  function renderActivityHeatmap() {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat

    const sessions = getCompletedSessions();
    const sessionMinsMap = {};

    sessions.forEach(s => {
      const d = (s.completed_at || s.started_at || '').slice(0, 10);
      if (d) {
        const mins = s.duration_sec ? Math.round(s.duration_sec / 60) : (s.completed_sets ? s.completed_sets * 2 : 15);
        sessionMinsMap[d] = (sessionMinsMap[d] || 0) + mins;
      }
    });

    const weeks = [];
    const totalWeeks = 32;
    const monthLabels = [];

    // Current week's Sunday
    const currentWeekSunday = new Date(now);
    currentWeekSunday.setDate(now.getDate() - dayOfWeek);
    // Start date is Sunday 31 weeks prior
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - (totalWeeks - 1) * 7);

    let lastMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + (w * 7) + d);
        const iso = cur.toISOString().slice(0, 10);
        const isFuture = iso > todayIso;
        const mins = isFuture ? 0 : (sessionMinsMap[iso] || 0);
        let level = 0;
        if (mins > 0) {
          if (mins < 20) level = 1;
          else if (mins < 40) level = 2;
          else if (mins < 60) level = 3;
          else if (mins < 80) level = 4;
          else level = 5;
        }
        days.push({
          date: iso,
          month: cur.getMonth(),
          isToday: iso === todayIso,
          isFuture,
          level,
          mins
        });
      }

      const dayForMonth = days[0];
      if (dayForMonth && dayForMonth.month !== lastMonth) {
        const isFirstWeek = lastMonth === -1;
        lastMonth = dayForMonth.month;
        const mName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dayForMonth.month];
        if (isFirstWeek) {
          const checkTwoWeeks = new Date(startDate);
          checkTwoWeeks.setDate(startDate.getDate() + 14);
          if (checkTwoWeeks.getMonth() === dayForMonth.month) {
            monthLabels.push({ weekIdx: w, name: mName });
          }
        } else if (totalWeeks - w >= 2) {
          monthLabels.push({ weekIdx: w, name: mName });
        }
      }

      weeks.push(days);
    }

    const matrixColsHtml = weeks.map(week => {
      const cellsHtml = week.map(day => `
        <div class="stats-heatmap-cell level-${day.level} ${day.isToday ? 'is-today' : ''} ${day.isFuture ? 'is-future' : ''}"
             title="${day.date}: ${day.mins > 0 ? `${day.mins} mins trained` : (day.isFuture ? 'Upcoming' : 'Rest day')}"
             onclick="showToast('${day.date}: ${day.mins > 0 ? `${day.mins} mins trained` : (day.isFuture ? 'Upcoming' : 'Rest day')}')">
        </div>
      `).join('');
      return `<div class="stats-heatmap-col">${cellsHtml}</div>`;
    }).join('');

    const monthsHtml = monthLabels.map((m) => {
      const pct = ((m.weekIdx / totalWeeks) * 100).toFixed(2);
      return `<span style="position:absolute; left:${pct}%; transform:translateX(0);">${m.name}</span>`;
    }).join('');

    return `
      <div class="stats-section-card">
        <div class="stats-card-header-row">
          <div class="stats-card-title-group">
            <span class="stats-card-title">Activity — last 12 months <span style="color:#717182; font-weight:500;">· by time trained</span></span>
          </div>
        </div>

        <div class="stats-heatmap-scroll-wrap">
          <div class="stats-heatmap-grid-inner">
            <div class="stats-heatmap-months-row" style="position:relative; height:18px; margin-bottom:2px;">
              ${monthsHtml}
            </div>
            <div class="stats-heatmap-matrix">
              ${matrixColsHtml}
            </div>
          </div>
        </div>

        <div class="stats-heatmap-legend-row">
          <span>Less time</span>
          <div class="stats-legend-scale">
            <span class="stats-legend-dot" style="background:#22222e;"></span>
            <span class="stats-legend-dot" style="background:#6b2121;"></span>
            <span class="stats-legend-dot" style="background:#b91c1c;"></span>
            <span class="stats-legend-dot" style="background:#ef4444;"></span>
            <span class="stats-legend-dot" style="background:#ff5d5d;"></span>
          </div>
          <span>More time</span>
        </div>
      </div>
    `;
  }

  // ─── 4. Muscle Balance / Anatomical View ────────────────────────────────────
  function renderMuscleBalanceCard() {
    const curTab = statsLocalState.muscleTab;
    const curPeriod = statsLocalState.musclePeriod;
    const cutoff = getPeriodCutoffDate(curPeriod);

    const sessions = getCompletedSessions();
    const muscleSetCounts = {};
    Object.keys(MUSCLE_GROUP_ALIASES).forEach(m => {
      MUSCLE_GROUP_ALIASES[m].forEach(k => muscleSetCounts[k] = 0);
    });

    let subTitle = 'Muscle balance · by sets worked';
    if (curTab === 'fatigue') {
      subTitle = 'Muscle fatigue · recovery & load density';
    } else if (curTab === 'strength') {
      subTitle = 'Strength focus · peak load & intensity';
    }

    sessions.forEach(sess => {
      const dateStr = (sess.completed_at || sess.started_at || '').slice(0, 10);
      if (cutoff && (!dateStr || dateStr < cutoff)) return;

      const daysAgo = dateStr ? Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 3600 * 1000)) : 0;
      const logs = extractSessionLogs(sess);
      
      logs.forEach(l => {
        const exName = l.exercise_name || '';
        let resolved = null;
        if (typeof window !== 'undefined' && window.MuscleMap && window.MuscleMap.resolveMuscles) {
          resolved = window.MuscleMap.resolveMuscles(exName);
        }
        if (resolved) {
          let multiplier = 1;
          if (curTab === 'fatigue') {
            const recencyFactor = Math.max(0.5, 2 - (daysAgo * 0.15));
            const rpeFactor = (l.rpe != null && l.rpe >= 8) ? 1.4 : 1.0;
            multiplier = recencyFactor * rpeFactor;
          } else if (curTab === 'strength') {
            multiplier = l.weight_kg ? (1 + l.weight_kg / 20) : (l.reps ? Math.min(2.5, 1 + l.reps / 15) : 1);
          }

          (resolved.primary || []).forEach(m => {
            const key = m.toLowerCase().replace(/\s+/g, '_');
            muscleSetCounts[key] = (muscleSetCounts[key] || 0) + (1 * multiplier);
          });
          (resolved.secondary || []).forEach(m => {
            const key = m.toLowerCase().replace(/\s+/g, '_');
            muscleSetCounts[key] = (muscleSetCounts[key] || 0) + (0.5 * multiplier);
          });
        }
      });
    });

    // Determine primary & secondary active muscles
    const sortedMuscles = Object.entries(muscleSetCounts)
      .filter(([, cnt]) => cnt > 0)
      .sort(([, a], [, b]) => b - a);

    let primaryMuscles = sortedMuscles.slice(0, 4).map(([m]) => m);
    let secondaryMuscles = sortedMuscles.slice(4, 8).map(([m]) => m);

    // Apply focused highlight if user clicked on an untrained muscle chip
    if (statsLocalState.selectedMuscleHighlight) {
      const aliasKeys = MUSCLE_GROUP_ALIASES[statsLocalState.selectedMuscleHighlight] || [statsLocalState.selectedMuscleHighlight.toLowerCase().replace(/\s+/g, '_')];
      aliasKeys.forEach(k => {
        if (!primaryMuscles.includes(k)) primaryMuscles.unshift(k);
      });
    }

    let frontSvg = '';
    let backSvg = '';

    if (typeof window !== 'undefined' && window.MuscleMap) {
      frontSvg = window.MuscleMap.renderFrontSVG(primaryMuscles, secondaryMuscles);
      backSvg = window.MuscleMap.renderBackSVG(primaryMuscles, secondaryMuscles);
    }

    // Find untrained muscles in this period
    const untrainedList = Object.keys(MUSCLE_GROUP_ALIASES).filter(m => !isGroupTrained(m, muscleSetCounts));

    const untrainedChipsHtml = untrainedList.length > 0
      ? untrainedList.map(m => `
          <button class="stats-chip-tag ${statsLocalState.selectedMuscleHighlight === m ? 'active' : ''}" onclick="selectStatsMuscleChip('${m}')">
            ${m}
          </button>
        `).join('')
      : `<div style="font-size:13px; color:#10b981; font-weight:600; display:flex; align-items:center; gap:6px;"><svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; color:#10b981;"><polyline points="20 6 9 17 4 12"/></svg><span>All muscle groups trained in this period!</span></div>`;

    return `
      <div class="stats-section-card">
        <!-- Top Segmented Bar -->
        <div class="stats-segmented-bar">
          <button class="stats-segmented-item ${curTab === 'balance' ? 'active' : ''}" onclick="setStatsMuscleTab('balance')">Muscle balance</button>
          <button class="stats-segmented-item ${curTab === 'fatigue' ? 'active' : ''}" onclick="setStatsMuscleTab('fatigue')">Fatigue</button>
          <button class="stats-segmented-item ${curTab === 'strength' ? 'active' : ''}" onclick="setStatsMuscleTab('strength')">Strength</button>
        </div>

        <div class="stats-card-header-row" style="margin-top:2px;">
          <div class="stats-card-title-group">
            <span class="stats-card-subtitle">${subTitle}</span>
          </div>
          <div class="stats-pill-tabs">
            <button class="stats-pill-tab ${curPeriod === 'week' ? 'active' : ''}" onclick="setStatsMusclePeriod('week')">Week</button>
            <button class="stats-pill-tab ${curPeriod === '30d' ? 'active' : ''}" onclick="setStatsMusclePeriod('30d')">30d</button>
            <button class="stats-pill-tab ${curPeriod === '90d' ? 'active' : ''}" onclick="setStatsMusclePeriod('90d')">90d</button>
            <button class="stats-pill-tab ${curPeriod === 'all' ? 'active' : ''}" onclick="setStatsMusclePeriod('all')">All</button>
          </div>
        </div>

        <!-- Dual Anatomy View -->
        <div class="stats-anatomy-dual-wrap">
          <div class="stats-anatomy-col">
            <div class="stats-anatomy-svg-card">
              ${frontSvg}
            </div>
          </div>
          <div class="stats-anatomy-col">
            <div class="stats-anatomy-svg-card">
              ${backSvg}
            </div>
          </div>
        </div>

        <div class="stats-heatmap-legend-row" style="margin-top:-8px; justify-content:flex-end;">
          <span>Less</span>
          <div class="stats-legend-scale">
            <span class="stats-legend-dot" style="background:#22222e;"></span>
            <span class="stats-legend-dot" style="background:#6b2121;"></span>
            <span class="stats-legend-dot" style="background:#b91c1c;"></span>
            <span class="stats-legend-dot" style="background:#ef4444;"></span>
            <span class="stats-legend-dot" style="background:#ff5d5d;"></span>
          </div>
          <span>More</span>
        </div>

        <!-- Not trained section -->
        <div class="stats-untrained-group">
          <div class="stats-untrained-title">Not trained in this period</div>
          <div class="stats-chips-cloud">
            ${untrainedChipsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // ─── 5. Effort · How Close to Failure Card ─────────────────────────────────
  function renderEffortCard() {
    const curPeriod = statsLocalState.effortPeriod;
    const cutoff = getPeriodCutoffDate(curPeriod);
    const sessions = getCompletedSessions();

    let totalFinishedSets = 0;
    let ratedSetsCount = 0;
    let sumRir = 0;
    const rirDist = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
    const weeklyMap = {};

    sessions.forEach(sess => {
      const dateStr = (sess.completed_at || sess.started_at || '').slice(0, 10);
      if (cutoff && (!dateStr || dateStr < cutoff)) return;

      const logs = extractSessionLogs(sess);
      totalFinishedSets += (sess.completed_sets != null ? sess.completed_sets : logs.length);

      logs.forEach(l => {
        const rir = l.rir != null ? Number(l.rir) : (l.rpe != null ? Math.max(0, 10 - Number(l.rpe)) : null);
        if (rir !== null && !isNaN(rir)) {
          ratedSetsCount++;
          sumRir += rir;
          if (rir <= 0) rirDist[0]++;
          else if (rir === 1) rirDist[1]++;
          else if (rir === 2) rirDist[2]++;
          else if (rir === 3) rirDist[3]++;
          else rirDist['4+']++;

          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const weekKey = `${d.getFullYear()}-${Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
              if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { sumRir: 0, count: 0, date: dateStr };
              weeklyMap[weekKey].sumRir += rir;
              weeklyMap[weekKey].count++;
            }
          }
        }
      });
    });

    const avgRir = ratedSetsCount > 0 ? (sumRir / ratedSetsCount).toFixed(0) + ' RIR' : '—';
    const hardCount = rirDist[0] + rirDist[1] + rirDist[2] + rirDist[3];
    const pctHard = ratedSetsCount > 0 ? Math.round((hardCount / ratedSetsCount) * 100) + '%' : '—';
    const setsRatedSub = `${ratedSetsCount} of ${totalFinishedSets} finished sets rated`;

    // Calculate max count for bar percentage scaling
    const maxBarCount = Math.max(1, ...Object.values(rirDist));
    const distData = [
      { rir: 'RIR 0', count: rirDist[0], pct: ratedSetsCount > 0 ? Math.round((rirDist[0] / ratedSetsCount) * 100) : 0, barPct: Math.round((rirDist[0] / maxBarCount) * 100) },
      { rir: 'RIR 1', count: rirDist[1], pct: ratedSetsCount > 0 ? Math.round((rirDist[1] / ratedSetsCount) * 100) : 0, barPct: Math.round((rirDist[1] / maxBarCount) * 100) },
      { rir: 'RIR 2', count: rirDist[2], pct: ratedSetsCount > 0 ? Math.round((rirDist[2] / ratedSetsCount) * 100) : 0, barPct: Math.round((rirDist[2] / maxBarCount) * 100) },
      { rir: 'RIR 3', count: rirDist[3], pct: ratedSetsCount > 0 ? Math.round((rirDist[3] / ratedSetsCount) * 100) : 0, barPct: Math.round((rirDist[3] / maxBarCount) * 100) },
      { rir: 'RIR 4+', count: rirDist['4+'], pct: ratedSetsCount > 0 ? Math.round((rirDist['4+'] / ratedSetsCount) * 100) : 0, barPct: Math.round((rirDist['4+'] / maxBarCount) * 100) }
    ];

    const distBarsHtml = distData.map(d => `
      <div class="stats-rir-dist-row">
        <span class="stats-rir-dist-name">${d.rir}</span>
        <div class="stats-rir-bar-track">
          <div class="stats-rir-bar-fill" style="width: ${d.barPct}%;"></div>
        </div>
        <span class="stats-rir-dist-count">${d.count} · ${d.pct}%</span>
      </div>
    `).join('');

    // Weekly Line Chart SVG
    const weeklyPoints = Object.values(weeklyMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    let sparklineSvg = '';

    if (weeklyPoints.length >= 2) {
      const width = 340;
      const height = 120;
      const padL = 34;
      const padR = 20;
      const padT = 16;
      const padB = 25;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      const coords = weeklyPoints.map((p, idx) => {
        const x = padL + (idx / (weeklyPoints.length - 1)) * plotW;
        const avg = p.sumRir / p.count;
        const norm = Math.max(0, Math.min(1, avg / 6)); // 0 to 6 RIR scale
        const y = padT + norm * plotH;
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...p };
      });

      if (typeof window !== 'undefined') {
        window._statsEffortCoords = coords;
      }

      let lineD = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const mx = (p1.x + p2.x) / 2;
        lineD += ` C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
      }
      const areaD = `${lineD} L ${coords[coords.length - 1].x} ${height - padB} L ${coords[0].x} ${height - padB} Z`;

      // Horizontal Grid Lines for Effort (RIR 2, 4, 6)
      const rirTicks = [2, 4, 6];
      const rirGridHtml = rirTicks.map(rVal => {
        const y = padT + (rVal / 6) * plotH;
        return `
          <line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)" font-weight="500">${rVal}</text>
        `;
      }).join('');

      sparklineSvg = `
        <div class="stats-chart-interactive-box" style="position:relative; width:100%; height:100%; touch-action:pan-y;"
          onpointermove="handleStatsEffortPointer(event)"
          onpointerdown="handleStatsEffortPointer(event)"
          onpointerleave="handleStatsEffortPointerLeave()"
          ontouchmove="handleStatsEffortPointer(event)"
          ontouchstart="handleStatsEffortPointer(event)"
          ontouchend="handleStatsEffortPointerLeave()">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
            <defs>
              <linearGradient id="effortGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#facc15" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#facc15" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            ${rirGridHtml}
            <path d="${areaD}" fill="url(#effortGrad)" />
            <path d="${lineD}" stroke="#facc15" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="4.5" fill="#facc15" />

            <!-- Interactive Crosshair Lines (Smooth Hover) -->
            <line id="stats-effort-vline" x1="0" y1="${padT}" x2="0" y2="${height - padB}" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <line id="stats-effort-hline" x1="${padL}" y1="0" x2="${width - padR}" y2="0" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <circle id="stats-effort-glow" cx="0" cy="0" r="10" fill="rgba(250, 204, 21, 0.22)" style="display:none;" />
            <circle id="stats-effort-dot" cx="0" cy="0" r="4.5" fill="#141418" stroke="#facc15" stroke-width="2.5" style="display:none;" />
          </svg>
          <div id="stats-effort-tooltip" class="stats-graph-tooltip cx-graph-tooltip" style="display:none;" aria-live="polite"></div>
        </div>
      `;
    } else if (weeklyPoints.length === 1) {
      const width = 340;
      const height = 120;
      const padL = 34;
      const padR = 20;
      const padT = 16;
      const padB = 25;
      const plotH = height - padT - padB;
      const p = weeklyPoints[0];
      const avg = Math.round((p.sumRir / p.count) * 10) / 10;
      const norm = Math.max(0, Math.min(1, avg / 6));
      const y = padT + norm * plotH;
      const x = width / 2;

      sparklineSvg = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
          <line x1="${padL}" y1="${padT + plotH * 0.33}" x2="${width - padR}" y2="${padT + plotH * 0.33}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <line x1="${padL}" y1="${padT + plotH * 0.66}" x2="${width - padR}" y2="${padT + plotH * 0.66}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <text x="${padL - 6}" y="${padT + plotH * 0.33 + 3.5}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)">2</text>
          <text x="${padL - 6}" y="${padT + plotH * 0.66 + 3.5}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)">4</text>
          <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="rgba(250, 204, 21, 0.25)" stroke-width="1.5" stroke-dasharray="4,4" />
          <circle cx="${x}" cy="${y}" r="5.5" fill="#facc15" />
          <circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#facc15" stroke-width="1" opacity="0.4" />
          <text x="${x}" y="${y - 10}" text-anchor="middle" fill="#facc15" font-size="10.5" font-weight="700">RIR ${avg}</text>
          <text x="${x}" y="${height - 8}" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-weight="500">${p.date || 'Recent'}</text>
        </svg>
      `;
    } else {
      sparklineSvg = `
        <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); font-size:12px; border:1px dashed var(--border); border-radius:var(--radius-sm); padding:12px; text-align:center;">
          <span style="font-weight:600; color:var(--text);">No effort data in this period.</span>
          <span style="font-size:11px; color:var(--text-muted); margin-top:3px;">Log sets with RPE or RIR to visualize weekly effort trends.</span>
        </div>
      `;
    }

    return `
      <div class="stats-section-card">
        <div class="stats-card-header-row">
          <div class="stats-card-title-group">
            <span class="stats-card-title">Effort <span style="color:#717182; font-weight:500;">· how close to failure</span></span>
          </div>
          <div class="stats-pill-tabs">
            <button class="stats-pill-tab ${curPeriod === '30d' ? 'active' : ''}" onclick="setStatsEffortPeriod('30d')">30d</button>
            <button class="stats-pill-tab ${curPeriod === '90d' ? 'active' : ''}" onclick="setStatsEffortPeriod('90d')">90d</button>
            <button class="stats-pill-tab ${curPeriod === '1Y' ? 'active' : ''}" onclick="setStatsEffortPeriod('1Y')">1Y</button>
            <button class="stats-pill-tab ${curPeriod === 'all' ? 'active' : ''}" onclick="setStatsEffortPeriod('all')">All</button>
          </div>
        </div>

        <div class="stats-effort-big-row">
          <div class="stats-effort-stat-block">
            <div class="stats-effort-val">${avgRir}</div>
            <div class="stats-effort-label">average effort</div>
          </div>
          <div class="stats-effort-stat-block" style="align-items:flex-end;">
            <div class="stats-effort-val yellow-text">${pctHard}</div>
            <div class="stats-effort-label">at RIR 3 or harder</div>
          </div>
        </div>

        <div class="stats-effort-rated-sub">${setsRatedSub}</div>

        <div class="stats-chart-section-title">Week by week</div>
        <div class="stats-effort-sparkline-wrap">
          ${sparklineSvg}
        </div>

        <div class="stats-chart-section-title">Where the sets land</div>
        <div class="stats-rir-dist-list">
          ${distBarsHtml}
        </div>

        <div class="stats-footnote-box">
          Most working sets belong close to failure without living there — half at the floor and half at the top average out to a healthy-looking middle.
        </div>
      </div>
    `;
  }

  // ─── 6. Body Weight Card ───────────────────────────────────────────────────
  function renderWeightCard() {
    const curPeriod = statsLocalState.weightPeriod;
    const targetKg = typeof getTargetWeight === 'function' ? getTargetWeight() : 77;
    const history = typeof getWeightHistory === 'function' ? getWeightHistory() : [];

    let filtered = history.slice();
    const cutoff = getPeriodCutoffDate(curPeriod);
    if (cutoff) {
      filtered = filtered.filter(h => h.date && h.date.slice(0, 10) >= cutoff);
    }

    let weightChartContent = '';

    if (filtered.length >= 2) {
      const width = 340;
      const height = 140;
      const padL = 38;
      const padR = 24;
      const padT = 16;
      const padB = 25;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      const weights = filtered.map(f => Number(f.weight));
      const dataMin = Math.min(...weights);
      const dataMax = Math.max(...weights);
      const scale = (typeof calculateNiceGraphScale === 'function')
        ? calculateNiceGraphScale(dataMin, dataMax, targetKg, 4)
        : { min: Math.floor(dataMin - 1), max: Math.ceil(dataMax + 1), range: Math.max(1, dataMax - dataMin + 2), ticks: [Math.floor(dataMin), Math.ceil(dataMax)] };

      const coords = filtered.map((item, idx) => {
        const x = padL + (idx / (filtered.length - 1)) * plotW;
        const norm = (Number(item.weight) - scale.min) / scale.range;
        const y = padT + (1 - norm) * plotH;
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...item };
      });

      if (typeof window !== 'undefined') {
        window._statsWeightCoords = coords;
      }

      let lineD = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const mx = (p1.x + p2.x) / 2;
        lineD += ` C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
      }

      const firstCoord = coords[0];
      const lastCoord = coords[coords.length - 1];
      const areaD = `${lineD} L ${lastCoord.x} ${height - padB} L ${firstCoord.x} ${height - padB} Z`;

      // Dynamic Grid Lines with Clean Y-Axis Numbers
      const gridLinesHtml = scale.ticks.map(tVal => {
        const norm = (tVal - scale.min) / scale.range;
        const y = padT + (1 - norm) * plotH;
        return `
          <line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)" font-weight="500">${tVal % 1 === 0 ? tVal : tVal.toFixed(1)}</text>
        `;
      }).join('');

      const targetNorm = (targetKg - scale.min) / scale.range;
      const targetY = Math.round((padT + (1 - targetNorm) * plotH) * 10) / 10;
      const isTargetVisible = targetY >= padT - 5 && targetY <= height - padB + 5;

      weightChartContent = `
        <div class="stats-chart-interactive-box" style="position:relative; width:100%; height:100%; touch-action:pan-y;"
          onpointermove="handleStatsWeightPointer(event)"
          onpointerdown="handleStatsWeightPointer(event)"
          onpointerleave="handleStatsWeightPointerLeave()"
          ontouchmove="handleStatsWeightPointer(event)"
          ontouchstart="handleStatsWeightPointer(event)"
          ontouchend="handleStatsWeightPointerLeave()">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
            <defs>
              <linearGradient id="weightGradCoral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            ${gridLinesHtml}

            <!-- Dashed Target Weight Line & Non-colliding Pill Badge -->
            ${isTargetVisible ? `
              <line x1="${padL}" y1="${targetY}" x2="${width - padR}" y2="${targetY}" stroke="#eab308" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.85" />
              <g class="target-badge-g">
                <rect x="${width - padR - 28}" y="${(targetY - 8).toFixed(1)}" width="28" height="16" rx="4" fill="rgba(14, 14, 18, 0.9)" stroke="rgba(234, 179, 8, 0.35)" stroke-width="0.8"/>
                <text x="${width - padR - 14}" y="${(targetY + 3.5).toFixed(1)}" text-anchor="middle" fill="#eab308" font-size="9" font-family="var(--mono, monospace)" font-weight="700">${targetKg}</text>
              </g>
            ` : ''}

            <path d="${areaD}" fill="url(#weightGradCoral)" />
            <path d="${lineD}" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${lastCoord.x}" cy="${lastCoord.y}" r="4.5" fill="#ff5d5d" />

            <!-- Interactive Crosshair Lines (Smooth Hover) -->
            <line id="stats-weight-vline" x1="0" y1="${padT}" x2="0" y2="${height - padB}" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <line id="stats-weight-hline" x1="${padL}" y1="0" x2="${width - padR}" y2="0" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <circle id="stats-weight-glow" cx="0" cy="0" r="10" fill="rgba(239, 68, 68, 0.22)" style="display:none;" />
            <circle id="stats-weight-dot" cx="0" cy="0" r="4.5" fill="#141418" stroke="#ef4444" stroke-width="2.5" style="display:none;" />
          </svg>
          <div id="stats-weight-tooltip" class="stats-graph-tooltip cx-graph-tooltip" style="display:none;" aria-live="polite"></div>
        </div>
      `;
    } else if (filtered.length === 1) {
      const width = 340;
      const height = 140;
      const padL = 38;
      const padR = 24;
      const padT = 16;
      const padB = 25;
      const plotH = height - padT - padB;
      const wVal = Number(filtered[0].weight);
      const dataMin = Math.min(wVal, targetKg);
      const dataMax = Math.max(wVal, targetKg);
      const scale = (typeof calculateNiceGraphScale === 'function')
        ? calculateNiceGraphScale(dataMin, dataMax, targetKg, 4)
        : { min: Math.floor(dataMin - 1), max: Math.ceil(dataMax + 1), range: Math.max(1, dataMax - dataMin + 2), ticks: [Math.floor(dataMin), Math.ceil(dataMax)] };

      const norm = (wVal - scale.min) / scale.range;
      const y = Math.round((padT + (1 - norm) * plotH) * 10) / 10;
      const x = width / 2;

      const targetNorm = (targetKg - scale.min) / scale.range;
      const targetY = Math.round((padT + (1 - targetNorm) * plotH) * 10) / 10;

      weightChartContent = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
          <line x1="${padL}" y1="${padT}" x2="${width - padR}" y2="${padT}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />

          <text x="${padL - 6}" y="${padT + 3.5}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)">${scale.max}</text>
          <text x="${padL - 6}" y="${padT + plotH + 3.5}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)">${scale.min}</text>

          <line x1="${padL}" y1="${targetY}" x2="${width - padR}" y2="${targetY}" stroke="#eab308" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.85" />
          <text x="${width - padR + 2}" y="${targetY + 3.5}" fill="#eab308" font-size="9" font-weight="700">${targetKg}</text>

          <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="rgba(239, 68, 68, 0.25)" stroke-width="1.5" stroke-dasharray="4,4" />
          <circle cx="${x}" cy="${y}" r="5.5" fill="#ef4444" />
          <circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#ef4444" stroke-width="1" opacity="0.4" />
          <text x="${x}" y="${y - 10}" text-anchor="middle" fill="#ef4444" font-size="10.5" font-weight="700">${wVal.toFixed(1)} kg</text>
          <text x="${x}" y="${height - 6}" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-weight="500">${filtered[0].date || 'Latest'}</text>
        </svg>
      `;
    } else {
      weightChartContent = `
        <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); font-size:12.5px; border:1px dashed var(--border); border-radius:var(--radius-sm); padding:16px; text-align:center;">
          <span style="font-weight:600; color:var(--text);">No body weight logs in this period.</span>
          <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="openStatsWeightModal()">+ Log Today's Weight</button>
        </div>
      `;
    }

    return `
      <div class="stats-section-card">
        <div class="stats-card-header-row">
          <div class="stats-card-title-group">
            <span class="stats-card-title">Body weight</span>
          </div>
          <div class="stats-weight-header-right">
            <div class="stats-weight-target-badge" title="Target Weight: ${targetKg} kg">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; color:#eab308;">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <span>${targetKg}</span>
            </div>
            <button class="stats-weight-log-btn" onclick="openStatsWeightModal()">
              <span>+</span>
              <span>Log</span>
            </button>
          </div>
        </div>

        <div class="stats-pill-tabs" style="margin-top: -4px;">
          <button class="stats-pill-tab ${curPeriod === '1M' ? 'active' : ''}" onclick="setStatsWeightPeriod('1M')">1M</button>
          <button class="stats-pill-tab ${curPeriod === '3M' ? 'active' : ''}" onclick="setStatsWeightPeriod('3M')">3M</button>
          <button class="stats-pill-tab ${curPeriod === '1Y' ? 'active' : ''}" onclick="setStatsWeightPeriod('1Y')">1Y</button>
          <button class="stats-pill-tab ${curPeriod === 'all' ? 'active' : ''}" onclick="setStatsWeightPeriod('all')">All</button>
        </div>

        <div class="stats-weight-chart-wrap">
          ${weightChartContent}
        </div>
      </div>
    `;
  }

  // ─── 7. Exercise Progress Card ─────────────────────────────────────────────
  function renderExerciseProgressCard() {
    const curMetric = statsLocalState.exerciseMetric;
    const exercises = getAllSelectableExercises();

    // Choose active exercise: state selected or first available
    let activeEx = null;
    if (statsLocalState.exerciseId) {
      activeEx = exercises.find(e => e.id === statsLocalState.exerciseId || (statsLocalState.exerciseName && e.name.toLowerCase() === statsLocalState.exerciseName.toLowerCase()));
    }
    if (!activeEx && exercises.length > 0) {
      activeEx = exercises[0];
      statsLocalState.exerciseId = activeEx.id;
      statsLocalState.exerciseName = activeEx.name;
    }

    const exName = activeEx ? activeEx.name : 'Select Exercise';
    const exId = activeEx ? activeEx.id : null;

    // Aggregate real logs from completed sessions for this exercise
    const sessions = getCompletedSessions();
    const exLogsByDate = {};

    sessions.forEach(sess => {
      const dateStr = (sess.completed_at || sess.started_at || '').slice(0, 10);
      const logs = extractSessionLogs(sess);
      logs.forEach(l => {
        if ((exId && l.exercise_id === exId) || (exName && l.exercise_name && l.exercise_name.toLowerCase() === exName.toLowerCase())) {
          if (!exLogsByDate[dateStr]) exLogsByDate[dateStr] = [];
          exLogsByDate[dateStr].push(l);
        }
      });
    });

    const dates = Object.keys(exLogsByDate).sort((a, b) => new Date(b) - new Date(a));
    let bestTopVal = '—';
    let bestTopNum = 0;
    let best1rmVal = '—';
    let best1rmNum = 0;
    let totalRirSum = 0;
    let totalRirCount = 0;

    // Performance table rows
    let tableRowsHtml = '';
    const chartPoints = [];

    if (dates.length > 0) {
      dates.forEach(dStr => {
        const sets = exLogsByDate[dStr];
        let dayMax = 0;
        let day1rm = 0;
        let dayRirSum = 0;
        let dayRirCount = 0;

        sets.forEach(s => {
          const w = s.weight_kg || 0;
          const r = s.reps || (s.duration_sec || 0);
          const topVal = w > 0 ? w : r;
          if (topVal > dayMax) dayMax = topVal;
          if (topVal > bestTopNum) {
            bestTopNum = topVal;
            bestTopVal = w > 0 ? `${w} kg` : (s.reps ? `${s.reps} reps` : `${s.duration_sec}s`);
          }
          // Estimated 1RM
          if (w > 0 && r > 0) {
            const e1rm = Math.round(w * (36 / (37 - Math.min(36, r))) * 10) / 10;
            if (e1rm > day1rm) day1rm = e1rm;
            if (e1rm > best1rmNum) {
              best1rmNum = e1rm;
              best1rmVal = `${e1rm} kg`;
            }
          } else if (r > 0) {
            if (r > best1rmNum) {
              best1rmNum = r;
              best1rmVal = `${r} reps`;
            }
          }
          if (s.rir != null) {
            dayRirSum += Number(s.rir);
            dayRirCount++;
            totalRirSum += Number(s.rir);
            totalRirCount++;
          }
        });

        chartPoints.push({
          date: dStr,
          top_set: dayMax,
          '1rm': day1rm || dayMax,
          effort: dayRirCount > 0 ? Math.round((dayRirSum / dayRirCount) * 10) / 10 : 0
        });
      });

      // Render top 5 historical sessions for table
      tableRowsHtml = dates.slice(0, 5).map(dStr => {
        const d = new Date(dStr);
        const dayName = !isNaN(d.getTime()) ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() : dStr;
        const monthName = !isNaN(d.getTime()) ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] : '';
        const sets = exLogsByDate[dStr];

        const setsHtml = sets.map(s => {
          const val = s.weight_kg ? `${s.weight_kg}kg×${s.reps || 1}` : (s.reps ? `${s.reps} reps` : `${s.duration_sec || 0}s`);
          const rirText = s.rir != null ? `(RIR ${s.rir})` : (s.rpe != null ? `(RPE ${s.rpe})` : '');
          return `${val} <span class="rir-tag">${rirText}</span>`;
        }).join('  ');

        return `
          <div class="stats-exercise-history-row">
            <div class="stats-exercise-history-date">
              <span>${dayName}</span>
              <span>${monthName}</span>
            </div>
            <div class="stats-exercise-history-sets">
              ${setsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    const overallAvgRir = totalRirCount > 0 ? (totalRirSum / totalRirCount).toFixed(1) + ' RIR' : '—';

    let bestTagHtml = '';
    if (curMetric === '1rm') {
      bestTagHtml = `Estimated 1RM trend · Peak: <strong>${best1rmVal}</strong>`;
    } else if (curMetric === 'effort') {
      bestTagHtml = `Average effort per workout · Average: <strong>${overallAvgRir}</strong>`;
    } else {
      bestTagHtml = `Best set weight per workout · Best: <strong>${bestTopVal}</strong>`;
    }

    // Chart SVG
    let chartSvg = '';
    const pointsChronological = chartPoints.slice().reverse();

    if (pointsChronological.length >= 2) {
      const width = 340;
      const height = 135;
      const padL = 36;
      const padR = 20;
      const padT = 16;
      const padB = 25;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      const vals = pointsChronological.map(p => p[curMetric] != null ? p[curMetric] : (p.top_set || 0));
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const scale = (typeof calculateNiceGraphScale === 'function')
        ? calculateNiceGraphScale(minVal, maxVal, null, 4)
        : { min: minVal, max: maxVal, range: Math.max(1, maxVal - minVal), ticks: [minVal, maxVal] };

      const coords = pointsChronological.map((p, idx) => {
        const x = padL + (idx / (pointsChronological.length - 1)) * plotW;
        const v = p[curMetric] != null ? p[curMetric] : (p.top_set || 0);
        const norm = (v - scale.min) / scale.range;
        const y = padT + (1 - norm) * plotH;
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...p };
      });

      if (typeof window !== 'undefined') {
        window._statsExerciseCoords = coords;
      }

      let lineD = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const mx = (p1.x + p2.x) / 2;
        lineD += ` C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
      }
      const areaD = `${lineD} L ${coords[coords.length - 1].x} ${height - padB} L ${coords[0].x} ${height - padB} Z`;

      // Dynamic Grid Lines with Clean Labels
      const gridLinesHtml = scale.ticks.map(tVal => {
        const norm = (tVal - scale.min) / scale.range;
        const y = padT + (1 - norm) * plotH;
        const labelStr = curMetric === 'effort' ? `RIR ${tVal}` : `${tVal}`;
        return `
          <line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" fill="#8E8E9F" font-size="9" font-family="var(--mono, monospace)" font-weight="500">${labelStr}</text>
        `;
      }).join('');

      chartSvg = `
        <div class="stats-chart-interactive-box" style="position:relative; width:100%; height:100%; touch-action:pan-y;"
          onpointermove="handleStatsExercisePointer(event)"
          onpointerdown="handleStatsExercisePointer(event)"
          onpointerleave="handleStatsExercisePointerLeave()"
          ontouchmove="handleStatsExercisePointer(event)"
          ontouchstart="handleStatsExercisePointer(event)"
          ontouchend="handleStatsExercisePointerLeave()">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
            <defs>
              <linearGradient id="exProgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            ${gridLinesHtml}
            <path d="${areaD}" fill="url(#exProgGrad)" />
            <path d="${lineD}" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#38bdf8" />`).join('')}

            <!-- Interactive Crosshair Lines (Smooth Hover) -->
            <line id="stats-ex-vline" x1="0" y1="${padT}" x2="0" y2="${height - padB}" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <line id="stats-ex-hline" x1="${padL}" y1="0" x2="${width - padR}" y2="0" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />
            <circle id="stats-ex-glow" cx="0" cy="0" r="10" fill="rgba(56, 189, 248, 0.22)" style="display:none;" />
            <circle id="stats-ex-dot" cx="0" cy="0" r="4.5" fill="#141418" stroke="#38bdf8" stroke-width="2.5" style="display:none;" />
          </svg>
          <div id="stats-exercise-tooltip" class="stats-graph-tooltip cx-graph-tooltip" style="display:none;" aria-live="polite"></div>
        </div>
      `;
    } else if (pointsChronological.length === 1) {
      const width = 340;
      const height = 135;
      const padL = 36;
      const padR = 20;
      const padT = 16;
      const padB = 25;
      const plotH = height - padT - padB;
      const p = pointsChronological[0];
      const v = p[curMetric] != null ? p[curMetric] : (p.top_set || 0);
      const x = width / 2;
      const y = padT + plotH / 2;
      const valLabel = curMetric === 'effort' ? `RIR ${v}` : `${v} kg`;

      chartSvg = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
          <line x1="${padL}" y1="${padT}" x2="${width - padR}" y2="${padT}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="2,3" />
          <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1.5" stroke-dasharray="4,4" />
          <circle cx="${x}" cy="${y}" r="5.5" fill="#38bdf8" />
          <circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.4" />
          <text x="${x}" y="${y - 10}" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="700">${valLabel}</text>
          <text x="${x}" y="${height - 6}" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-weight="500">${p.date || 'Initial Milestone'}</text>
        </svg>
      `;
    } else {
      chartSvg = `
        <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); font-size:12.5px; border:1px dashed var(--border); border-radius:var(--radius-sm); padding:16px; text-align:center;">
          <span style="font-weight:600; color:var(--text);">No workout logs recorded yet for ${exName}.</span>
          <span style="font-size:11px; color:var(--text-muted); margin-top:4px;">Complete a session with this exercise to track progress.</span>
        </div>
      `;
    }

    return `
      <div class="stats-section-card">
        <div class="stats-card-header-row">
          <div class="stats-card-title-group">
            <span class="stats-card-subtitle">Exercise progress</span>
          </div>
        </div>

        <button class="stats-exercise-select-btn" onclick="openStatsExercisePicker()">
          <div>
            <span style="display:block; font-size:11.5px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Exercise</span>
            <span>${exName}</span>
          </div>
          <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <div class="stats-pill-tabs">
          <button class="stats-pill-tab ${curMetric === 'top_set' ? 'active' : ''}" onclick="setStatsExMetric('top_set')">Top set</button>
          <button class="stats-pill-tab ${curMetric === '1rm' ? 'active' : ''}" onclick="setStatsExMetric('1rm')">Est. 1RM</button>
          <button class="stats-pill-tab ${curMetric === 'effort' ? 'active' : ''}" onclick="setStatsExMetric('effort')">Effort</button>
        </div>

        <div class="stats-exercise-chart-wrap">
          ${chartSvg}
        </div>

        ${tableRowsHtml ? `
          <div class="stats-exercise-history-table">
            ${tableRowsHtml}
          </div>
        ` : ''}

        <div class="stats-exercise-best-tag">
          ${bestTagHtml}
        </div>

        <div class="stats-footnote-box">
          A fuller dot means less left in the tank — the same weight at a lower RIR is progress the line alone does not show.
        </div>
      </div>
    `;
  }

  // ─── 8. Recent Workouts Section (100% Real Data Driven) ───────────────────
  function renderRecentWorkoutsSection() {
    const sessions = getCompletedSessions();
    const totalCount = sessions.length;
    const recentList = sessions.slice(0, 6);

    // Calculate max volume for volume PR identification
    let maxVolume = 0;
    sessions.forEach(s => {
      const v = calculateSessionVolume(s);
      if (v > maxVolume) maxVolume = v;
    });

    let cardsHtml = '';
    if (recentList.length > 0) {
      cardsHtml = recentList.map(w => {
        const title = w.routine_name || w.routine || 'Workout';
        const dateStr = formatWorkoutDate(w.completed_at || w.started_at);
        const durStr = formatWorkoutDuration(w.duration_sec);
        const sets = w.completed_sets != null ? w.completed_sets : (w.total_sets || 0);
        const vol = calculateSessionVolume(w);
        const volStr = vol > 0 ? (vol >= 1000 ? `${vol.toLocaleString('en-US')} kg` : `${vol} kg`) : '0 kg';
        const iconSvg = getWorkoutIconSvg(title);
        const prCount = countSessionPRs(w);

        // Extract unique exercise names
        const logs = extractSessionLogs(w);
        const exNames = Array.from(new Set(logs.map(l => l.exercise_name).filter(Boolean)));
        let exSummary = '';
        if (exNames.length > 0) {
          if (exNames.length <= 2) {
            exSummary = exNames.join(', ');
          } else {
            exSummary = `${exNames.slice(0, 2).join(', ')} +${exNames.length - 2} more`;
          }
        }

        // Subtitle line
        const subParts = [dateStr, durStr, `${sets} sets`];
        if (vol > 0) subParts.push(volStr);
        const subLine = subParts.join(' · ');

        // Real data ranking badges ONLY (never mock)
        let badgeHtml = '';
        if (prCount > 0) {
          badgeHtml = `
            <div class="workout-pr-pill" title="${prCount} Personal Records Achieved">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"/>
                <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2Z"/>
              </svg>
              <span>${prCount} PR${prCount > 1 ? 's' : ''}</span>
            </div>
          `;
        } else if (vol > 0 && vol === maxVolume && sessions.length > 1) {
          badgeHtml = `
            <div class="workout-pr-pill" style="background:rgba(56, 189, 248, 0.15); border-color:rgba(56, 189, 248, 0.35); color:#38bdf8;" title="Personal Record Session Volume">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>Top Vol</span>
            </div>
          `;
        }

        return `
          <div class="workout-history-card" onclick="openSessionDetailView('${w.session_uuid || w.id}')" title="View breakdown for ${title} (${dateStr})">
            <div class="workout-card-left">
              <div class="workout-card-icon-badge">
                ${iconSvg}
              </div>
              <div class="workout-card-info">
                <div class="workout-card-title">${title}</div>
                <div class="workout-card-sub">${subLine}</div>
                ${exSummary ? `<div style="font-size:11.5px; color:#64748b; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px;">${exSummary}</div>` : ''}
              </div>
            </div>
            <div class="workout-card-right">
              ${badgeHtml}
              <div class="workout-card-arrow">
                <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      cardsHtml = `
        <div class="empty-state" style="padding: 28px 16px;">
          <div class="empty-state-icon">
            <svg class="cx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="empty-state-title">No Completed Workouts Yet</div>
          <div class="empty-state-message">Complete your first session to track volume, set counts, and muscle recovery.</div>
          <div class="empty-state-actions">
            <button class="btn btn-primary btn-sm" onclick="switchView('workout')">
              Start Workout
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="recent-workouts-section">
        <div class="recent-workouts-header">
          <span class="recent-workouts-title">Recent workouts</span>
          <button class="recent-workouts-all-btn" onclick="openHistoryListView()">
            <span>All ${totalCount}</span>
            <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <div class="recent-workouts-list">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // ─── Exercise Picker Modal ─────────────────────────────────────────────────
  function renderExercisePickerModal() {
    if (!statsLocalState.showPicker) return '';

    const list = getAllSelectableExercises();

    const itemsHtml = list.length > 0 ? list.map(e => `
      <div class="stats-picker-item ${statsLocalState.exerciseId === e.id || (statsLocalState.exerciseName && statsLocalState.exerciseName.toLowerCase() === e.name.toLowerCase()) ? 'active' : ''}" onclick="selectStatsExercise(${typeof e.id === 'number' ? e.id : `'${e.id}'`}, '${e.name.replace(/'/g, "\\'")}')">
        <span>${e.name}</span>
        <span style="font-size:12px; color:#94a3b8; text-transform:capitalize;">${e.type || 'reps'}</span>
      </div>
    `).join('') : `<div style="padding:16px; color:#94a3b8;">No exercises in library.</div>`;

    return `
      <div class="stats-picker-backdrop" onclick="closeStatsExercisePicker(event)">
        <div class="stats-picker-sheet" onclick="event.stopPropagation()">
          <div class="stats-picker-header">
            <span class="stats-picker-title">Select Exercise</span>
            <button class="btn-icon" onclick="closeStatsExercisePicker()">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="stats-picker-list">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Body Weight Quick Log Modal ───────────────────────────────────────────
  function renderWeightModal() {
    if (!statsLocalState.showWeightModal) return '';

    const history = typeof getWeightHistory === 'function' ? getWeightHistory() : [];
    const latest = history.length > 0 ? history[history.length - 1].weight : (typeof state !== 'undefined' && state.latestWeight ? state.latestWeight : 75.0);

    return `
      <div class="stats-picker-backdrop" onclick="closeStatsWeightModal(event)">
        <div class="stats-picker-sheet" onclick="event.stopPropagation()">
          <div class="stats-picker-header">
            <span class="stats-picker-title">Log Body Weight</span>
            <button class="btn-icon" onclick="closeStatsWeightModal()">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="stats-weight-modal-body">
            <label style="font-size:12px; font-weight:600; color:#94a3b8;">Today's Weight</label>
            <div class="stats-weight-input-row">
              <input type="number" step="0.1" id="stats-weight-input-field" class="stats-weight-input" value="${latest}" placeholder="75.0" autofocus />
              <span class="stats-weight-unit">kg</span>
            </div>

            <button class="btn btn-primary" style="width:100%; padding:14px; margin-top:8px;" onclick="submitStatsWeightLog()">
              Save Weight Entry
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Main View Renderer ────────────────────────────────────────────────────
  function renderStatsView() {
    return `
      <div class="stats-screen">
        ${renderHeader()}
        <div class="stats-dashboard-grid">
          <div class="stats-col-main">
            ${renderMetricsGrid()}
            ${renderActivityHeatmap()}
            ${renderMuscleBalanceCard()}
            ${renderEffortCard()}
          </div>
          <div class="stats-col-side">
            ${renderWeightCard()}
            ${renderExerciseProgressCard()}
            ${renderRecentWorkoutsSection()}
          </div>
        </div>
        ${renderExercisePickerModal()}
        ${renderWeightModal()}
      </div>
    `;
  }

  // ─── Global Event Handlers ─────────────────────────────────────────────────
  function setStatsMuscleTab(tab) {
    statsLocalState.muscleTab = tab;
    if (typeof render === 'function') render();
  }

  function setStatsMusclePeriod(period) {
    statsLocalState.musclePeriod = period;
    if (typeof render === 'function') render();
  }

  function setStatsEffortPeriod(period) {
    statsLocalState.effortPeriod = period;
    if (typeof render === 'function') render();
  }

  function setStatsWeightPeriod(period) {
    statsLocalState.weightPeriod = period;
    if (typeof render === 'function') render();
  }

  function setStatsExMetric(metric) {
    statsLocalState.exerciseMetric = metric;
    if (typeof render === 'function') render();
  }

  function selectStatsMuscleChip(muscleName) {
    statsLocalState.selectedMuscleHighlight = muscleName;
    showToast(`Focused: ${muscleName}`);
    if (typeof render === 'function') render();
    setTimeout(() => {
      statsLocalState.selectedMuscleHighlight = null;
    }, 4000);
  }

  function openStatsExercisePicker() {
    statsLocalState.showPicker = true;
    if (typeof render === 'function') render();
  }

  function closeStatsExercisePicker(e) {
    if (e) e.stopPropagation();
    statsLocalState.showPicker = false;
    if (typeof render === 'function') render();
  }

  function selectStatsExercise(id, name) {
    statsLocalState.exerciseId = id;
    if (name) statsLocalState.exerciseName = name;
    statsLocalState.showPicker = false;
    if (typeof render === 'function') render();
  }

  function openStatsWeightModal() {
    statsLocalState.showWeightModal = true;
    if (typeof render === 'function') render();
    setTimeout(() => {
      const el = document.getElementById('stats-weight-input-field');
      if (el) el.focus();
    }, 50);
  }

  function closeStatsWeightModal(e) {
    if (e) e.stopPropagation();
    statsLocalState.showWeightModal = false;
    if (typeof render === 'function') render();
  }

  function submitStatsWeightLog() {
    const input = document.getElementById('stats-weight-input-field');
    const val = input ? parseFloat(input.value) : null;
    if (val && !isNaN(val) && val > 0) {
      if (typeof saveBodyWeight === 'function') {
        saveBodyWeight(val);
      }
      showToast(`Logged weight: ${val} kg`);
      statsLocalState.showWeightModal = false;
      if (typeof render === 'function') render();
    } else {
      showToast('Please enter a valid weight in kg', true);
    }
  }

  // ─── Stats Interactive Graph Handlers (Smooth Hover Crosshairs) ───────────
  let _statsWeightLeaveTimer = null;
  function handleStatsWeightPointer(evt) {
    if (_statsWeightLeaveTimer) {
      clearTimeout(_statsWeightLeaveTimer);
      _statsWeightLeaveTimer = null;
    }
    const coords = window._statsWeightCoords;
    if (!coords || !coords.length) return;
    const container = document.querySelector('.stats-weight-chart-wrap');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = evt.touches && evt.touches[0] ? evt.touches[0].clientX : evt.clientX;
    if (clientX == null) return;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * 340;

    let closest = coords[0];
    let minDist = Math.abs(coords[0].x - svgX);
    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = coords[i];
      }
    }

    const vline = document.getElementById('stats-weight-vline');
    const hline = document.getElementById('stats-weight-hline');
    const glow = document.getElementById('stats-weight-glow');
    const dot = document.getElementById('stats-weight-dot');
    const tooltip = document.getElementById('stats-weight-tooltip');

    if (vline) {
      vline.setAttribute('x1', closest.x);
      vline.setAttribute('x2', closest.x);
      vline.style.display = 'block';
    }
    if (hline) {
      hline.setAttribute('y1', closest.y);
      hline.setAttribute('y2', closest.y);
      hline.style.display = 'block';
    }
    if (glow) {
      glow.setAttribute('cx', closest.x);
      glow.setAttribute('cy', closest.y);
      glow.style.display = 'block';
    }
    if (dot) {
      dot.setAttribute('cx', closest.x);
      dot.setAttribute('cy', closest.y);
      dot.style.display = 'block';
    }
    if (tooltip) {
      const dateFormatted = typeof formatWeightPointDate === 'function' ? formatWeightPointDate(closest.date) : (closest.date || '');
      tooltip.innerHTML = `<span class="weight-tip-date">${dateFormatted}</span> <span class="weight-tip-sep">·</span> <strong class="weight-tip-val mono">${Number(closest.weight).toFixed(1)} kg</strong>`;
      tooltip.style.display = 'flex';
      const tipPixelX = (closest.x / 340) * rect.width;
      tooltip.style.left = `${Math.max(68, Math.min(rect.width - 68, tipPixelX))}px`;
      const tipPixelY = (closest.y / 140) * rect.height;
      tooltip.style.top = `${Math.max(2, tipPixelY - 38)}px`;
    }
  }

  function handleStatsWeightPointerLeave() {
    if (_statsWeightLeaveTimer) clearTimeout(_statsWeightLeaveTimer);
    _statsWeightLeaveTimer = setTimeout(() => {
      const vline = document.getElementById('stats-weight-vline');
      const hline = document.getElementById('stats-weight-hline');
      const glow = document.getElementById('stats-weight-glow');
      const dot = document.getElementById('stats-weight-dot');
      const tooltip = document.getElementById('stats-weight-tooltip');
      if (vline) vline.style.display = 'none';
      if (hline) hline.style.display = 'none';
      if (glow) glow.style.display = 'none';
      if (dot) dot.style.display = 'none';
      if (tooltip) tooltip.style.display = 'none';
    }, 1000);
  }

  let _statsEffortLeaveTimer = null;
  function handleStatsEffortPointer(evt) {
    if (_statsEffortLeaveTimer) {
      clearTimeout(_statsEffortLeaveTimer);
      _statsEffortLeaveTimer = null;
    }
    const coords = window._statsEffortCoords;
    if (!coords || !coords.length) return;
    const container = document.querySelector('.stats-effort-sparkline-wrap');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = evt.touches && evt.touches[0] ? evt.touches[0].clientX : evt.clientX;
    if (clientX == null) return;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * 340;

    let closest = coords[0];
    let minDist = Math.abs(coords[0].x - svgX);
    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = coords[i];
      }
    }

    const vline = document.getElementById('stats-effort-vline');
    const hline = document.getElementById('stats-effort-hline');
    const glow = document.getElementById('stats-effort-glow');
    const dot = document.getElementById('stats-effort-dot');
    const tooltip = document.getElementById('stats-effort-tooltip');
    const avg = closest.count > 0 ? (closest.sumRir / closest.count).toFixed(1) : '—';

    if (vline) {
      vline.setAttribute('x1', closest.x);
      vline.setAttribute('x2', closest.x);
      vline.style.display = 'block';
    }
    if (hline) {
      hline.setAttribute('y1', closest.y);
      hline.setAttribute('y2', closest.y);
      hline.style.display = 'block';
    }
    if (glow) {
      glow.setAttribute('cx', closest.x);
      glow.setAttribute('cy', closest.y);
      glow.style.display = 'block';
    }
    if (dot) {
      dot.setAttribute('cx', closest.x);
      dot.setAttribute('cy', closest.y);
      dot.style.display = 'block';
    }
    if (tooltip) {
      tooltip.innerHTML = `<span>${closest.date || 'Week'}</span> <span class="tip-sep">·</span> <strong>RIR ${avg}</strong> <span style="opacity:0.75; font-size:11px;">(${closest.count} sets)</span>`;
      tooltip.style.display = 'flex';
      const tipPixelX = (closest.x / 340) * rect.width;
      tooltip.style.left = `${Math.max(72, Math.min(rect.width - 72, tipPixelX))}px`;
      const tipPixelY = (closest.y / 120) * rect.height;
      tooltip.style.top = `${Math.max(2, tipPixelY - 38)}px`;
    }
  }

  function handleStatsEffortPointerLeave() {
    if (_statsEffortLeaveTimer) clearTimeout(_statsEffortLeaveTimer);
    _statsEffortLeaveTimer = setTimeout(() => {
      const vline = document.getElementById('stats-effort-vline');
      const hline = document.getElementById('stats-effort-hline');
      const glow = document.getElementById('stats-effort-glow');
      const dot = document.getElementById('stats-effort-dot');
      const tooltip = document.getElementById('stats-effort-tooltip');
      if (vline) vline.style.display = 'none';
      if (hline) hline.style.display = 'none';
      if (glow) glow.style.display = 'none';
      if (dot) dot.style.display = 'none';
      if (tooltip) tooltip.style.display = 'none';
    }, 1000);
  }

  let _statsExLeaveTimer = null;
  function handleStatsExercisePointer(evt) {
    if (_statsExLeaveTimer) {
      clearTimeout(_statsExLeaveTimer);
      _statsExLeaveTimer = null;
    }
    const coords = window._statsExerciseCoords;
    if (!coords || !coords.length) return;
    const container = document.querySelector('.stats-exercise-chart-wrap');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = evt.touches && evt.touches[0] ? evt.touches[0].clientX : evt.clientX;
    if (clientX == null) return;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * 340;

    let closest = coords[0];
    let minDist = Math.abs(coords[0].x - svgX);
    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = coords[i];
      }
    }

    const vline = document.getElementById('stats-ex-vline');
    const hline = document.getElementById('stats-ex-hline');
    const glow = document.getElementById('stats-ex-glow');
    const dot = document.getElementById('stats-ex-dot');
    const tooltip = document.getElementById('stats-exercise-tooltip');
    const curMetric = statsLocalState.exerciseMetric;
    const val = closest[curMetric] != null ? closest[curMetric] : (closest.top_set || 0);
    const valText = curMetric === 'effort' ? `RIR ${val}` : `${val} kg`;

    if (vline) {
      vline.setAttribute('x1', closest.x);
      vline.setAttribute('x2', closest.x);
      vline.style.display = 'block';
    }
    if (hline) {
      hline.setAttribute('y1', closest.y);
      hline.setAttribute('y2', closest.y);
      hline.style.display = 'block';
    }
    if (glow) {
      glow.setAttribute('cx', closest.x);
      glow.setAttribute('cy', closest.y);
      glow.style.display = 'block';
    }
    if (dot) {
      dot.setAttribute('cx', closest.x);
      dot.setAttribute('cy', closest.y);
      dot.style.display = 'block';
    }
    if (tooltip) {
      tooltip.innerHTML = `<span>${closest.date || ''}</span> <span class="tip-sep">·</span> <strong class="mono">${valText}</strong>`;
      tooltip.style.display = 'flex';
      const tipPixelX = (closest.x / 340) * rect.width;
      tooltip.style.left = `${Math.max(68, Math.min(rect.width - 68, tipPixelX))}px`;
      const tipPixelY = (closest.y / 135) * rect.height;
      tooltip.style.top = `${Math.max(2, tipPixelY - 38)}px`;
    }
  }

  function handleStatsExercisePointerLeave() {
    if (_statsExLeaveTimer) clearTimeout(_statsExLeaveTimer);
    _statsExLeaveTimer = setTimeout(() => {
      const vline = document.getElementById('stats-ex-vline');
      const hline = document.getElementById('stats-ex-hline');
      const glow = document.getElementById('stats-ex-glow');
      const dot = document.getElementById('stats-ex-dot');
      const tooltip = document.getElementById('stats-exercise-tooltip');
      if (vline) vline.style.display = 'none';
      if (hline) hline.style.display = 'none';
      if (glow) glow.style.display = 'none';
      if (dot) dot.style.display = 'none';
      if (tooltip) tooltip.style.display = 'none';
    }, 1000);
  }

  // ─── Export to Window Namespace ─────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    window.renderStatsView = renderStatsView;
    window.setStatsMuscleTab = setStatsMuscleTab;
    window.setStatsMusclePeriod = setStatsMusclePeriod;
    window.setStatsEffortPeriod = setStatsEffortPeriod;
    window.setStatsWeightPeriod = setStatsWeightPeriod;
    window.setStatsExMetric = setStatsExMetric;
    window.selectStatsMuscleChip = selectStatsMuscleChip;
    window.openStatsExercisePicker = openStatsExercisePicker;
    window.closeStatsExercisePicker = closeStatsExercisePicker;
    window.selectStatsExercise = selectStatsExercise;
    window.openStatsWeightModal = openStatsWeightModal;
    window.closeStatsWeightModal = closeStatsWeightModal;
    window.submitStatsWeightLog = submitStatsWeightLog;
    window.handleStatsWeightPointer = handleStatsWeightPointer;
    window.handleStatsWeightPointerLeave = handleStatsWeightPointerLeave;
    window.handleStatsEffortPointer = handleStatsEffortPointer;
    window.handleStatsEffortPointerLeave = handleStatsEffortPointerLeave;
    window.handleStatsExercisePointer = handleStatsExercisePointer;
    window.handleStatsExercisePointerLeave = handleStatsExercisePointerLeave;
    window.getCompletedSessions = getCompletedSessions;
    window.extractSessionLogs = extractSessionLogs;
    window.calculateSessionVolume = calculateSessionVolume;
    window.countSessionPRs = countSessionPRs;
    window.calculateWeekStreak = calculateWeekStreak;
    window.getPeriodCutoffDate = getPeriodCutoffDate;
  }
})();
