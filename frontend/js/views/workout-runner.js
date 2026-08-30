/**
 * CalistheniX — Live Workout Session Tracker & Runner
 */

function startWorkoutFromResolved() {
  if (!state.todayResolved || state.todayResolved.status !== 'workout' || !state.todayResolved.workout) {
    showToast('No workout scheduled for today.', true);
    return;
  }
  const w = state.todayResolved.workout;
  startWorkoutFromData(w.name, w.exercises, w.id);
}

async function startWorkoutFromId(workoutId) {
  try {
    const w = await API.getWorkoutDetail(workoutId);
    if (!w || !w.exercises || !w.exercises.length) {
      showToast(`No exercises found in workout "${w?.name || workoutId}"`, true);
      return;
    }
    startWorkoutFromData(w.name, w.exercises, w.id);
  } catch (e) {
    showToast(`Failed to start workout: ${e.message}`, true);
  }
}

let _runnerStageTab = 'motion'; // 'motion' | 'muscles'

// ─── Auto-Advance & Grace Period Management for Timed Movements ─────────────
let _autoAdvanceTimer = null;
let _autoAdvanceCountdown = 0;
let _autoAdvanceCallback = null;
let _autoAdvancePhase = null;

function cancelAutoAdvance(showNotification = true) {
  if (_autoAdvanceTimer) {
    clearInterval(_autoAdvanceTimer);
    _autoAdvanceTimer = null;
  }
  const wasActive = _autoAdvanceCountdown > 0;
  _autoAdvanceCountdown = 0;
  _autoAdvanceCallback = null;
  _autoAdvancePhase = null;

  const card = document.getElementById('runner-auto-advance-card');
  if (card) {
    card.remove();
  }
  if (wasActive && showNotification && typeof showToast === 'function') {
    showToast('Auto-advance cancelled — Movement kept active');
  }
}

function triggerTimedAutoAdvance(actionCallback, phaseName = 'timed') {
  cancelAutoAdvance(false);
  _autoAdvanceCountdown = 3;
  _autoAdvanceCallback = actionCallback;
  _autoAdvancePhase = phaseName;

  renderAutoAdvanceBanner();

  _autoAdvanceTimer = setInterval(() => {
    _autoAdvanceCountdown -= 1;
    if (_autoAdvanceCountdown <= 0) {
      clearInterval(_autoAdvanceTimer);
      _autoAdvanceTimer = null;
      const cb = _autoAdvanceCallback;
      _autoAdvanceCountdown = 0;
      _autoAdvanceCallback = null;
      _autoAdvancePhase = null;
      const card = document.getElementById('runner-auto-advance-card');
      if (card) card.remove();
      if (typeof cb === 'function') {
        cb();
      }
    } else {
      updateAutoAdvanceBanner();
    }
  }, 1000);
}

function renderAutoAdvanceBanner() {
  const existing = document.getElementById('runner-auto-advance-card');
  if (existing) existing.remove();

  const container = document.querySelector('.runner-prep-stage') || document.querySelector('.runner-active-card');
  if (!container) return;

  const banner = document.createElement('div');
  banner.id = 'runner-auto-advance-card';
  banner.className = 'runner-auto-advance-card animate-fade-in';
  banner.innerHTML = `
    <div class="runner-auto-advance-content">
      <span class="runner-auto-advance-pulse"></span>
      <div class="runner-auto-advance-text">
        <span>Advancing in <strong class="mono" id="auto-advance-seconds-left">${_autoAdvanceCountdown}s</strong>...</span>
      </div>
    </div>
    <button class="runner-auto-advance-undo-btn" type="button" onclick="cancelAutoAdvance()">
      ${renderIcon('rotateCcw', 'cx-icon cx-icon-xs cx-icon-inline')} Undo
    </button>
  `;

  const primaryBtn = container.querySelector('.runner-prep-primary-btn') || container.querySelector('.runner-complete-action-btn');
  if (primaryBtn) {
    primaryBtn.parentNode.insertBefore(banner, primaryBtn);
  } else {
    container.appendChild(banner);
  }
}

function updateAutoAdvanceBanner() {
  const numEl = document.getElementById('auto-advance-seconds-left');
  if (numEl) {
    numEl.textContent = `${_autoAdvanceCountdown}s`;
  }
}

function renderAutoAdvanceHtml() {
  if (_autoAdvanceCountdown <= 0) return '';
  return `
    <div class="runner-auto-advance-card animate-fade-in" id="runner-auto-advance-card">
      <div class="runner-auto-advance-content">
        <span class="runner-auto-advance-pulse"></span>
        <div class="runner-auto-advance-text">
          <span>Advancing in <strong class="mono" id="auto-advance-seconds-left">${_autoAdvanceCountdown}s</strong>...</span>
        </div>
      </div>
      <button class="runner-auto-advance-undo-btn" type="button" onclick="cancelAutoAdvance()">
        ${renderIcon('rotateCcw', 'cx-icon cx-icon-xs cx-icon-inline')} Undo
      </button>
    </div>
  `;
}

function setRunnerStageTab(tab) {
  _runnerStageTab = tab;
  render();
}
if (typeof window !== 'undefined') {
  window.setRunnerStageTab = setRunnerStageTab;
  window.cancelAutoAdvance = cancelAutoAdvance;
  window.triggerTimedAutoAdvance = triggerTimedAutoAdvance;
}

// ─── Canonical Phase Model & Helpers ─────────────────────────────────────────

if (typeof WORKOUT_PHASES === 'undefined') {
  globalThis.WORKOUT_PHASES = {
    WARMUP: 'WARMUP',
    MAIN_WORKOUT: 'MAIN_WORKOUT',
    COOLDOWN: 'COOLDOWN',
    COMPLETED: 'COMPLETED',
    WARM_UP: 'WARMUP',
    COOL_DOWN: 'COOLDOWN'
  };
}

function canonicalPhase(phase) {
  if (!phase) return 'main_workout';
  const p = String(phase).toLowerCase().trim().replace(/[-]/g, '_');
  if (p === 'warmup' || p === 'warm_up' || p === 'prepare') return 'warm_up';
  if (p === 'cooldown' || p === 'cool_down' || p === 'recover') return 'cool_down';
  if (p === 'main' || p === 'main_workout' || p === 'train' || p === 'strength') return 'main_workout';
  if (p === 'completed' || p === 'complete') return 'completed';
  return 'main_workout';
}

function isWarmupPhase(phase) {
  return canonicalPhase(phase) === 'warm_up';
}

function isMainPhase(phase) {
  return canonicalPhase(phase) === 'main_workout';
}

function isCooldownPhase(phase) {
  return canonicalPhase(phase) === 'cool_down';
}

function isCompletedPhase(phase) {
  return canonicalPhase(phase) === 'completed';
}

function getWarmupExercises(session) {
  if (!session) return [];
  return (session.warmup || []).filter(e => !e.phase || isWarmupPhase(e.phase));
}

function getMainWorkoutExercises(session) {
  if (!session) return [];
  return (session.exercises || []).filter(e => !e.phase || isMainPhase(e.phase));
}

function getCooldownExercises(session) {
  if (!session) return [];
  return (session.cooldown || []).filter(e => !e.phase || isCooldownPhase(e.phase));
}

// ─── Single Authoritative Source of Truth Session State Engine ──────────────

function getAuthoritativeSessionState(session) {
  if (!session) {
    return {
      isValid: false,
      currentPhase: 'main',
      phaseUpper: 'MAIN_WORKOUT',
      warmup: { list: [], total: 0, completed: 0, skipped: 0, resolved: 0, isDone: true, isSkipped: false, isInProgress: false, activeIdx: 0, pct: 0 },
      main: { list: [], totalExercises: 0, completedExercises: 0, skippedExercises: 0, resolvedExercises: 0, totalSets: 0, completedSets: 0, skippedSets: 0, resolvedSets: 0, isDone: true, isInProgress: false, activeExIdx: 0, activeSetIdx: 0, pct: 0 },
      cooldown: { list: [], total: 0, completed: 0, skipped: 0, resolved: 0, isDone: true, isSkipped: false, isInProgress: false, activeIdx: 0, pct: 0 },
      overall: { totalSets: 0, completedSets: 0, skippedSets: 0, resolvedSets: 0, totalExercises: 0, completedExercises: 0, resolvedExercises: 0, progressPct: 0, resolutionPct: 0, isAllFinished: false },
      activeExercise: null,
      activeSet: null
    };
  }

  // 1. Lists
  const warmupList = getWarmupExercises(session);
  const mainList = getMainWorkoutExercises(session);
  const cooldownList = getCooldownExercises(session);

  // 2. Warm-up
  const warmupTotal = warmupList.length;
  const warmupCompleted = warmupList.filter(w => w.completed).length;
  const warmupSkipped = warmupList.filter(w => w.skipped).length;
  const warmupResolved = warmupCompleted + warmupSkipped;
  const isWarmupSkipped = session.warmupStatus === 'SKIPPED' || session.warmup_status === 'skipped';
  const isWarmupDone = (warmupTotal === 0 && session.warmupStatus !== 'ACTIVE' && session.currentPhase !== 'warmup') || isWarmupSkipped || session.warmupStatus === 'COMPLETED' || session.warmup_status === 'completed' || (warmupTotal > 0 && warmupResolved === warmupTotal);
  const isWarmupInProgress = !isWarmupDone && !isWarmupSkipped && (session.warmupStatus === 'ACTIVE' || session.warmup_status === 'in_progress' || (warmupResolved > 0 && warmupResolved < warmupTotal) || session.currentPhase === 'warmup');
  const warmupPct = warmupTotal > 0 ? Math.round((warmupCompleted / warmupTotal) * 100) : (isWarmupSkipped ? 0 : 100);

  let rawWarmupIdx = session.warmupIndex != null ? session.warmupIndex : (session.warmup_idx != null ? session.warmup_idx : 0);
  const warmupActiveIdx = warmupTotal > 0 ? Math.max(0, Math.min(warmupTotal - 1, rawWarmupIdx)) : 0;

  // 3. Main Workout
  let mainTotalSets = 0;
  let mainCompletedSets = 0;
  let mainSkippedSets = 0;
  let mainCompletedExercises = 0;
  let mainSkippedExercises = 0;
  let mainResolvedExercises = 0;

  mainList.forEach(ex => {
    const sets = ex.sets || [];
    const exTotal = sets.length;
    let exCompleted = 0;
    let exSkipped = 0;

    sets.forEach(s => {
      mainTotalSets++;
      if (s.completed) {
        mainCompletedSets++;
        exCompleted++;
      } else if (s.skipped) {
        mainSkippedSets++;
        exSkipped++;
      }
    });

    if (exTotal > 0 && exCompleted === exTotal) {
      mainCompletedExercises++;
      mainResolvedExercises++;
    } else if (exTotal > 0 && exSkipped === exTotal) {
      mainSkippedExercises++;
      mainResolvedExercises++;
    } else if (exTotal > 0 && (exCompleted + exSkipped) === exTotal) {
      if (exCompleted > 0) mainCompletedExercises++;
      mainResolvedExercises++;
    }
  });

  const mainResolvedSets = mainCompletedSets + mainSkippedSets;
  const isMainDone = mainTotalSets === 0 ? false : (session.mainStatus === 'COMPLETED' || (mainTotalSets > 0 && mainResolvedSets === mainTotalSets));
  const isMainInProgress = !isMainDone && (session.mainStatus === 'ACTIVE' || mainResolvedSets > 0 || session.currentPhase === 'main');
  const mainPct = mainTotalSets > 0 ? Math.round((mainCompletedSets / mainTotalSets) * 100) : 100;

  let rawMainExIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (session.currentExerciseIndex != null ? session.currentExerciseIndex : (_selectedWorkoutExIdx != null ? _selectedWorkoutExIdx : 0));
  const mainActiveExIdx = mainList.length > 0 ? Math.max(0, Math.min(mainList.length - 1, rawMainExIdx)) : 0;

  const currentMainEx = mainList[mainActiveExIdx] || null;
  const currentSets = currentMainEx?.sets || [];
  let rawSetIdx = session.activeSetIndex != null ? session.activeSetIndex : 0;
  if (currentSets.length > 0 && (rawSetIdx < 0 || rawSetIdx >= currentSets.length || currentSets[rawSetIdx]?.completed || currentSets[rawSetIdx]?.skipped)) {
    const firstUnresolvedSetIdx = currentSets.findIndex(s => !s.completed && !s.skipped);
    if (firstUnresolvedSetIdx !== -1) rawSetIdx = firstUnresolvedSetIdx;
    else rawSetIdx = Math.max(0, currentSets.length - 1);
  }
  const mainActiveSetIdx = currentSets.length > 0 ? Math.max(0, Math.min(currentSets.length - 1, rawSetIdx)) : 0;
  const currentMainSet = currentSets[mainActiveSetIdx] || null;

  // 4. Cool-down
  const cooldownTotal = cooldownList.length;
  const cooldownCompleted = cooldownList.filter(c => c.completed).length;
  const cooldownSkipped = cooldownList.filter(c => c.skipped).length;
  const cooldownResolved = cooldownCompleted + cooldownSkipped;
  const isCooldownSkipped = session.cooldownStatus === 'SKIPPED' || session.cooldown_status === 'skipped';
  const isCooldownDone = (cooldownTotal === 0 && session.cooldownStatus !== 'ACTIVE' && session.currentPhase !== 'cooldown') || isCooldownSkipped || session.cooldownStatus === 'COMPLETED' || session.cooldown_status === 'completed' || (cooldownTotal > 0 && cooldownResolved === cooldownTotal);
  const isCooldownInProgress = !isCooldownDone && !isCooldownSkipped && (session.cooldownStatus === 'ACTIVE' || session.cooldown_status === 'in_progress' || (cooldownResolved > 0 && cooldownResolved < cooldownTotal) || session.currentPhase === 'cooldown');
  const cooldownPct = cooldownTotal > 0 ? Math.round((cooldownCompleted / cooldownTotal) * 100) : (isCooldownSkipped ? 0 : 100);

  let rawCooldownIdx = session.cooldownIndex != null ? session.cooldownIndex : (session.cooldown_idx != null ? session.cooldown_idx : 0);
  const cooldownActiveIdx = cooldownTotal > 0 ? Math.max(0, Math.min(cooldownTotal - 1, rawCooldownIdx)) : 0;

  // 5. Overall
  const totalSets = warmupTotal + mainTotalSets + cooldownTotal;
  const completedSets = warmupCompleted + mainCompletedSets + cooldownCompleted;
  const skippedSets = warmupSkipped + mainSkippedSets + cooldownSkipped;
  const resolvedSets = completedSets + skippedSets;

  const totalExercises = warmupTotal + mainList.length + cooldownTotal;
  const completedExercises = warmupCompleted + mainCompletedExercises + cooldownCompleted;
  const resolvedExercises = warmupResolved + mainResolvedExercises + cooldownResolved;

  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;
  const resolutionPct = totalSets > 0 ? Math.round((resolvedSets / totalSets) * 100) : 100;
  const isAllFinished = isWarmupDone && isMainDone && isCooldownDone;

  const currentPhaseRaw = session.currentPhase || (isWarmupPhase(session.phase) ? 'warmup' : (isCooldownPhase(session.phase) ? 'cooldown' : (isCompletedPhase(session.phase) ? 'completed' : 'main')));
  const isTerminalSession = session.status === 'completed' || session.status === 'completed_early' || currentPhaseRaw === 'completed' || isAllFinished;

  let currentPhase = 'main';
  if (isTerminalSession) {
    currentPhase = 'completed';
  } else if (!isWarmupDone && warmupTotal > 0) {
    currentPhase = 'warmup';
  } else if (currentPhaseRaw === 'cooldown') {
    currentPhase = isMainDone ? 'cooldown' : 'main';
  } else if (currentPhaseRaw === 'warmup') {
    currentPhase = 'warmup';
  } else {
    currentPhase = 'main';
  }

  const warmupRemaining = Math.max(0, warmupTotal - warmupCompleted - warmupSkipped);
  const mainRemainingSets = Math.max(0, mainTotalSets - mainCompletedSets - mainSkippedSets);
  const mainRemainingExercises = Math.max(0, mainList.length - mainCompletedExercises - mainSkippedExercises);
  const cooldownRemaining = Math.max(0, cooldownTotal - cooldownCompleted - cooldownSkipped);
  const overallRemainingSets = Math.max(0, totalSets - completedSets - skippedSets);
  const overallRemainingExercises = Math.max(0, totalExercises - completedExercises - (warmupSkipped + mainSkippedExercises + cooldownSkipped));

  return {
    isValid: true,
    currentPhase,
    phaseUpper: currentPhase === 'warmup' ? 'WARMUP' : (currentPhase === 'cooldown' ? 'COOLDOWN' : (currentPhase === 'completed' ? 'COMPLETED' : 'MAIN_WORKOUT')),
    warmup: {
      list: warmupList,
      total: warmupTotal,
      completed: warmupCompleted,
      skipped: warmupSkipped,
      resolved: warmupResolved,
      remaining: warmupRemaining,
      isDone: isWarmupDone,
      isSkipped: isWarmupSkipped,
      isInProgress: isWarmupInProgress,
      activeIdx: warmupActiveIdx,
      pct: warmupPct
    },
    main: {
      list: mainList,
      totalExercises: mainList.length,
      completedExercises: mainCompletedExercises,
      skippedExercises: mainSkippedExercises,
      resolvedExercises: mainResolvedExercises,
      remainingExercises: mainRemainingExercises,
      totalSets: mainTotalSets,
      completedSets: mainCompletedSets,
      skippedSets: mainSkippedSets,
      resolvedSets: mainResolvedSets,
      remainingSets: mainRemainingSets,
      isDone: isMainDone,
      isInProgress: isMainInProgress,
      activeExIdx: mainActiveExIdx,
      activeSetIdx: mainActiveSetIdx,
      pct: mainPct
    },
    cooldown: {
      list: cooldownList,
      total: cooldownTotal,
      completed: cooldownCompleted,
      skipped: cooldownSkipped,
      resolved: cooldownResolved,
      remaining: cooldownRemaining,
      isDone: isCooldownDone,
      isSkipped: isCooldownSkipped,
      isInProgress: isCooldownInProgress,
      activeIdx: cooldownActiveIdx,
      pct: cooldownPct
    },
    overall: {
      totalSets,
      completedSets,
      skippedSets,
      resolvedSets,
      remainingSets: overallRemainingSets,
      totalExercises,
      completedExercises,
      skippedExercises: (warmupSkipped > 0 && warmupTotal === warmupSkipped ? 1 : 0) + mainSkippedExercises + (cooldownSkipped > 0 && cooldownTotal === cooldownSkipped ? 1 : 0),
      resolvedExercises,
      remainingExercises: overallRemainingExercises,
      progressPct,
      resolutionPct,
      isAllFinished
    },
    activeExercise: currentPhase === 'warmup' ? (warmupList[warmupActiveIdx] || null) : (currentPhase === 'cooldown' ? (cooldownList[cooldownActiveIdx] || null) : currentMainEx),
    activeSet: currentMainSet
  };
}

function syncAuthoritativeSessionState(session) {
  if (!session) return;
  const auth = getAuthoritativeSessionState(session);

  // Sync index pointers
  session.warmupIndex = auth.warmup.activeIdx;
  session.warmup_idx = auth.warmup.activeIdx;
  session.activeExerciseIndex = auth.main.activeExIdx;
  session.currentExerciseIndex = auth.main.activeExIdx;
  session.activeSetIndex = auth.main.activeSetIdx;
  _selectedWorkoutExIdx = auth.main.activeExIdx;
  session.cooldownIndex = auth.cooldown.activeIdx;
  session.cooldown_idx = auth.cooldown.activeIdx;

  // Sync status strings
  session.currentPhase = auth.currentPhase;
  session.phase = auth.phaseUpper;

  if (auth.warmup.isDone) {
    if (auth.warmup.isSkipped) {
      session.warmupStatus = 'SKIPPED';
      session.warmup_status = 'skipped';
    } else {
      session.warmupStatus = 'COMPLETED';
      session.warmup_status = 'completed';
    }
  } else if (auth.currentPhase === 'warmup' && (session.phaseState === 'ACTIVE' || session.status === 'in_progress' || auth.warmup.isInProgress)) {
    session.warmupStatus = 'ACTIVE';
    session.warmup_status = 'in_progress';
  } else {
    session.warmupStatus = 'IDLE';
    session.warmup_status = auth.warmup.total > 0 ? 'ready' : 'none';
  }

  if (auth.main.isDone) {
    session.mainStatus = 'COMPLETED';
  } else if (auth.currentPhase === 'main' || auth.main.isInProgress || session.mainStatus === 'ACTIVE') {
    session.mainStatus = 'ACTIVE';
  } else {
    session.mainStatus = 'IDLE';
  }

  if (auth.cooldown.isDone) {
    if (auth.cooldown.isSkipped) {
      session.cooldownStatus = 'SKIPPED';
      session.cooldown_status = 'skipped';
    } else {
      session.cooldownStatus = 'COMPLETED';
      session.cooldown_status = 'completed';
    }
  } else if (auth.currentPhase === 'cooldown' || auth.cooldown.isInProgress || session.cooldownStatus === 'ACTIVE') {
    session.cooldownStatus = 'ACTIVE';
    session.cooldown_status = 'in_progress';
  } else {
    session.cooldownStatus = 'IDLE';
    session.cooldown_status = auth.cooldown.total > 0 ? 'pending' : 'none';
  }
}

// ─── Routine-Specific Warm-up & Cool-down Generators ────────────────────────

// ─── Routine-Specific Warm-up & Cool-down Generators ────────────────────────

function getDefaultWarmupForRoutine(workoutName) {
  const name = (workoutName || '').toLowerCase();
  if (name.includes('push a')) {
    return [
      { exercise_name: 'Arm Circles', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 20 sec forward + 20 sec backward', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Shoulder Rolls', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps controlled shoulder rolls', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Jumping Jacks', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Warm-up: 1 min (raise heart rate)', target_val: 60, duration_text: '1 min', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Scapular Push-ups', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: Scapular protraction & retraction on floor', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Shoulder Dislocates', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps with towel/band or slow arm circles', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Slow Push-up', duration_sec: null, reps: 8, exercise_type: 'reps', notes: 'Warm-up: 8 reps bodyweight, controlled activation', target_val: 8, duration_text: '8 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else if (name.includes('push b')) {
    return [
      { exercise_name: 'Arm Circles', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 20 sec forward + 20 sec backward', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Shoulder Rolls', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps controlled shoulder rolls', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Wall Slides', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps overhead slides against wall', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Scapular Push-ups', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps protraction & retraction', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Slow Pike Push-up', duration_sec: null, reps: 8, exercise_type: 'reps', notes: 'Warm-up: 8 reps controlled shoulder activation', target_val: 8, duration_text: '8 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else if (name.includes('pull a')) {
    return [
      { exercise_name: 'Arm Circles', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 20 sec forward + 20 sec backward', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Cat-Cow Stretch', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps thoracic and lumbar articulation', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Band/Towel Pull-Aparts', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps rear delt & rhomboid prep', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Scapular Pulls', duration_sec: null, reps: 8, exercise_type: 'reps', notes: 'Warm-up: 8 reps light hang scapular activations', target_val: 8, duration_text: '8 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Dead Hang (Activation)', duration_sec: 20, reps: null, exercise_type: 'duration', notes: 'Warm-up: 15-20 sec light activation hang', target_val: 20, duration_text: '20 sec', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else if (name.includes('pull b') || name.includes('pull')) {
    return [
      { exercise_name: 'Arm Circles', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 20 sec forward + 20 sec backward', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Cat-Cow Stretch', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps thoracic and lumbar articulation', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Band/Towel Pull-Aparts', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps rear delt & rhomboid prep', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Wall Angels (Activation)', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps light posture activation', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Dead Hang (Activation)', duration_sec: 20, reps: null, exercise_type: 'duration', notes: 'Warm-up: 15-20 sec light activation hang', target_val: 20, duration_text: '20 sec', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else if (name.includes('legs a')) {
    return [
      { exercise_name: 'Leg Swings', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction/leg swings', target_val: 40, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Hip Circles', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction hip circles', target_val: 30, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Bodyweight Squats', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps slow, controlled no load', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Ankle Circles', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction/ankle', target_val: 30, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Walking High Knees', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 30 sec dynamic knee raises', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Glute Bridges (Activation)', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps glute activation', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else if (name.includes('legs b') || name.includes('leg')) {
    return [
      { exercise_name: 'Leg Swings', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction/leg swings', target_val: 40, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Hip Circles', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction hip circles', target_val: 30, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Bodyweight Squats', duration_sec: null, reps: 15, exercise_type: 'reps', notes: 'Warm-up: 15 reps slow, controlled no load', target_val: 15, duration_text: '15 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Ankle Circles', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 10 each direction/ankle', target_val: 30, duration_text: '10 each side', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Walking High Knees', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: 30 sec dynamic knee raises', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Light Jump Squats', duration_sec: null, reps: 5, exercise_type: 'reps', notes: 'Warm-up: 5 reps explosive activation, not fatigue', target_val: 5, duration_text: '5 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  } else {
    return [
      { exercise_name: 'Arm Circles', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Warm-up: 20 sec forward + 20 sec backward', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Cat-Cow Stretch', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: 10 reps thoracic and lumbar articulation', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Scapular Push-ups', duration_sec: null, reps: 10, exercise_type: 'reps', notes: 'Warm-up: Protraction and retraction mechanics', target_val: 10, duration_text: '10 reps', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP },
      { exercise_name: 'Walking High Knees', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Warm-up: Dynamic heart rate and CNS activation', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.WARM_UP }
    ];
  }
}

function getDefaultCooldownForRoutine(workoutName) {
  const name = (workoutName || '').toLowerCase();
  if (name.includes('push a')) {
    return [
      { exercise_name: 'Doorway Chest Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side wall/doorway stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Overhead Triceps Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side overhead stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Cross-Body Shoulder Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side posterior deltoid stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Child\'s Pose', duration_sec: 45, reps: null, exercise_type: 'duration', notes: 'Cool-down: 45 sec spinal decompression and breathing', target_val: 45, duration_text: '45 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Deep Breathing', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 1 min slow nasal diaphragmatic breaths', target_val: 60, duration_text: '1 min', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else if (name.includes('push b') || name.includes('push')) {
    return [
      { exercise_name: 'Doorway Chest Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side wall stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Cross-Body Shoulder Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side deltoid stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Overhead Triceps Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side triceps stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Reverse Wrist Stretch', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Cool-down: 20 sec each direction wrist relief', target_val: 40, duration_text: '20s each direction', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Child\'s Pose', duration_sec: 45, reps: null, exercise_type: 'duration', notes: 'Cool-down: 45 sec spinal decompression', target_val: 45, duration_text: '45 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else if (name.includes('pull a')) {
    return [
      { exercise_name: 'Passive Dead Hang', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Cool-down: 20-30 sec light spine decompression', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Lat Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side latissimus stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Biceps & Forearm Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side palm up against wall', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Upper Back Stretch', duration_sec: 45, reps: null, exercise_type: 'duration', notes: 'Cool-down: 45 sec reach forward, round back', target_val: 45, duration_text: '45 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Deep Breathing', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 1 min diaphragmatic recovery', target_val: 60, duration_text: '1 min', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else if (name.includes('pull b') || name.includes('pull')) {
    return [
      { exercise_name: 'Passive Dead Hang', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Cool-down: 20-30 sec passive relaxing decompression', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Lat Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side side-reach stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Cross-Body Shoulder Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side rear delt stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Upper Back Stretch', duration_sec: 45, reps: null, exercise_type: 'duration', notes: 'Cool-down: 45 sec reach forward, round back', target_val: 45, duration_text: '45 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Neck Stretch', duration_sec: 40, reps: null, exercise_type: 'duration', notes: 'Cool-down: 20 sec each side gentle neck tilt', target_val: 40, duration_text: '20s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else if (name.includes('legs a')) {
    return [
      { exercise_name: 'Quad Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side standing heel to glute', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Hamstring Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side forward fold', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Standing Calf Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side against wall', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Hip Flexor Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side lunge position', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Pigeon Pose', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side glute stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else if (name.includes('legs b') || name.includes('leg')) {
    return [
      { exercise_name: 'Quad Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side standing heel to glute', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Hamstring Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side forward fold', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Standing Calf Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side against wall', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Hip Flexor Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side lunge position', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Pigeon Pose', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side glute stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Child\'s Pose', duration_sec: 30, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec lower back knees-to-chest/child\'s pose', target_val: 30, duration_text: '30 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  } else {
    return [
      { exercise_name: 'Doorway Chest Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side wall/doorway stretch', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Hamstring Stretch', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 30 sec each side forward fold', target_val: 60, duration_text: '30s each side', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Child\'s Pose', duration_sec: 45, reps: null, exercise_type: 'duration', notes: 'Cool-down: 45 sec kneeling spinal decompression', target_val: 45, duration_text: '45 sec', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN },
      { exercise_name: 'Deep Breathing', duration_sec: 60, reps: null, exercise_type: 'duration', notes: 'Cool-down: 1 min diaphragmatic recovery', target_val: 60, duration_text: '1 min', est_duration: '1 min', phase: WORKOUT_PHASES.COOL_DOWN }
    ];
  }
}

function startWorkoutFromData(workoutName, exercisesList, workoutId = null) {
  const active = getActiveSession();
  if (active && (active.status === 'in_progress' || active.status === 'paused' || active.phaseState === 'ACTIVE' || active.phaseState === 'PAUSED') && active.routine === workoutName) {
    // ── SESSION REPAIR: backfill missing warmup / cooldown arrays ────────────
    // Stale sessions (created before default generators were added) may have
    // empty warmup/cooldown arrays. Repair them here before opening the view.
    let sessionChanged = false;
    if ((!active.warmup || active.warmup.length === 0) && workoutName) {
      const defaultWarmup = getDefaultWarmupForRoutine(workoutName);
      if (defaultWarmup.length > 0) {
        active.warmup = defaultWarmup.map((le, idx) => ({
          id: le.id || (idx + 1),
          exercise_id: null,
          exercise_name: le.exercise_name || 'Warm-up Movement',
          exercise_type: le.exercise_type || 'duration',
          phase: 'warm_up',
          target_val: le.target_val || le.duration_sec || le.reps || 30,
          actual_val: le.exercise_type === 'reps' ? (le.reps || le.target_val || 10) : 0,
          duration_sec: le.duration_sec || null,
          reps: le.reps || null,
          duration_text: le.duration_text || '',
          est_duration: le.est_duration || '1 min',
          rest_sec: le.rest_sec || 10,
          notes: le.notes || '',
          completed: false,
          completed_at: null,
          skipped: false,
          skipped_at: null,
          client_uuid: newUUID()
        }));
        if (active.warmup_status === 'none') active.warmup_status = 'ready';
        if (active.warmupStatus === 'SKIPPED') active.warmupStatus = 'IDLE';
        sessionChanged = true;
      }
    }
    if ((!active.cooldown || active.cooldown.length === 0) && workoutName) {
      const defaultCooldown = getDefaultCooldownForRoutine(workoutName);
      if (defaultCooldown.length > 0) {
        active.cooldown = defaultCooldown.map((le, idx) => ({
          id: le.id || (idx + 1),
          exercise_id: null,
          exercise_name: le.exercise_name || 'Cool-down Stretch',
          exercise_type: le.exercise_type || 'duration',
          phase: 'cool_down',
          target_val: le.target_val || le.duration_sec || 30,
          actual_val: 0,
          duration_sec: le.duration_sec || null,
          reps: le.reps || null,
          duration_text: le.duration_text || '',
          est_duration: le.est_duration || '1 min',
          rest_sec: le.rest_sec || 10,
          notes: le.notes || '',
          completed: false,
          completed_at: null,
          skipped: false,
          skipped_at: null,
          client_uuid: newUUID()
        }));
        if (active.cooldown_status === 'none') active.cooldown_status = 'pending';
        if (active.cooldownStatus === 'SKIPPED') active.cooldownStatus = 'IDLE';
        sessionChanged = true;
      }
    }
    if (sessionChanged) saveActiveSession(active);
    // ── END SESSION REPAIR ───────────────────────────────────────────────────
    openWorkoutView();
    return;
  }

  const rawList = exercisesList || [];

  // Strict phase filtering at data initialization
  let warmupRaw = rawList.filter(le => le.phase && isWarmupPhase(le.phase));
  let mainRaw = rawList.filter(le => isMainPhase(le.phase));
  let cooldownRaw = rawList.filter(le => le.phase && isCooldownPhase(le.phase));

  // If rawList is an unsegmented array without phase markers, treat all items as main workout exercises
  if (warmupRaw.length === 0 && mainRaw.length === 0 && cooldownRaw.length === 0) {
    mainRaw = rawList.map(item => ({ ...item, phase: 'main_workout' }));
  }

  // Ensure Warm-up routine
  if (warmupRaw.length === 0) {
    warmupRaw = getDefaultWarmupForRoutine(workoutName);
  }

  // Ensure Cool-down routine
  if (cooldownRaw.length === 0) {
    cooldownRaw = getDefaultCooldownForRoutine(workoutName);
  }

  const warmup = warmupRaw.map((le, idx) => {
    const ex = (le.exercise_id ? getExercise(le.exercise_id) : null)
      || (typeof state !== 'undefined' && state.exercises ? state.exercises.find(e => e.name.toLowerCase() === (le.exercise_name || '').toLowerCase()) : null);
    const resolvedId = ex ? ex.id : (le.exercise_id || null);
    const isHold = (le.exercise_type || ex?.type) === 'duration';
    const targetVal = isHold ? (le.duration_sec || le.target_val || 30) : (le.reps || le.target_val || 10);
    return {
      id: le.id || (idx + 1),
      exercise_id: resolvedId,
      exercise_name: le.exercise_name || ex?.name || 'Warm-up Movement',
      exercise_type: isHold ? 'duration' : 'reps',
      phase: 'warm_up',
      target_val: targetVal,
      actual_val: isHold ? 0 : targetVal,
      duration_sec: isHold ? targetVal : null,
      reps: isHold ? null : targetVal,
      duration_text: le.duration_text || (isHold ? `${targetVal} sec` : `${targetVal} reps`),
      est_duration: le.est_duration || (isHold ? (targetVal >= 60 ? `${Math.round(targetVal/60)} min` : `${targetVal}s`) : '~ 1 min'),
      rest_sec: le.rest_sec || 10,
      notes: le.notes || '',
      completed: false,
      completed_at: null,
      skipped: false,
      skipped_at: null,
      client_uuid: newUUID()
    };
  });

  const exercises = mainRaw.map(le => {
    const ex = getExercise(le.exercise_id);
    const isHold = (le.exercise_type || ex?.type) === 'duration';
    const targetVal = isHold ? (le.duration_sec || 30) : (le.reps || 10);
    const setCount = le.sets || 3;
    const sets = [];
    for (let s = 1; s <= setCount; s++) {
      sets.push({
        set_num: s,
        target_val: targetVal,
        actual_val: isHold ? 0 : targetVal,
        completed: false,
        skipped: false,
        weight_kg: null,
        rpe: null,
        completed_at: null,
        skipped_at: null,
        client_uuid: newUUID(),
      });
    }
    return {
      id: le.id,
      exercise_id: le.exercise_id,
      exercise_name: le.exercise_name || ex?.name || 'Exercise',
      exercise_type: isHold ? 'duration' : 'reps',
      phase: 'main_workout',
      tempo: le.tempo,
      rest_sec: le.rest_sec || 90,
      superset_group: le.superset_group,
      notes: le.notes,
      duration_text: `${setCount} sets × ${targetVal}${isHold ? 's hold' : ' reps'}`,
      est_duration: `${Math.round((setCount * ((le.rest_sec || 90) + (isHold ? targetVal : 40))) / 60)} min`,
      sets,
    };
  });

  const cooldown = cooldownRaw.map((le, idx) => {
    const ex = (le.exercise_id ? getExercise(le.exercise_id) : null)
      || (typeof state !== 'undefined' && state.exercises ? state.exercises.find(e => e.name.toLowerCase() === (le.exercise_name || '').toLowerCase()) : null);
    const resolvedId = ex ? ex.id : (le.exercise_id || null);
    const isHold = (le.exercise_type || ex?.type) === 'duration';
    const targetVal = isHold ? (le.duration_sec || le.target_val || 30) : (le.reps || le.target_val || 10);
    return {
      id: le.id || (idx + 1),
      exercise_id: resolvedId,
      exercise_name: le.exercise_name || ex?.name || 'Cool-down Stretch',
      exercise_type: isHold ? 'duration' : 'reps',
      phase: 'cool_down',
      target_val: targetVal,
      actual_val: isHold ? 0 : targetVal,
      duration_sec: isHold ? targetVal : null,
      reps: isHold ? null : targetVal,
      duration_text: le.duration_text || (isHold ? `${targetVal} sec` : `${targetVal} reps`),
      est_duration: le.est_duration || (isHold ? (targetVal >= 60 ? `${Math.round(targetVal/60)} min` : `${targetVal}s`) : '~ 1 min'),
      rest_sec: le.rest_sec || 10,
      notes: le.notes || '',
      completed: false,
      completed_at: null,
      skipped: false,
      skipped_at: null,
      client_uuid: newUUID()
    };
  });

  const hasWarmup = warmup.length > 0;
  const hasCooldown = cooldown.length > 0;
  const initialPhase = hasWarmup ? (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.WARMUP : 'WARMUP') : (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.MAIN_WORKOUT : 'MAIN_WORKOUT');
  const initialPhaseCompat = hasWarmup ? 'warmup' : 'main';

  const session = {
    id: newUUID(),
    date: todayISO(),
    routine: workoutName,
    workout_name: workoutName,
    workout_id: workoutId,
    level: 1,

    // Authoritative Deterministic State Machine Core
    phase: initialPhase,
    currentPhase: initialPhaseCompat,
    phaseState: (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE'),
    status: 'ready',

    warmupStatus: hasWarmup ? (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') : (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.SKIPPED : 'SKIPPED'),
    warmup_status: hasWarmup ? 'ready' : 'none',
    mainStatus: (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE'),
    cooldownStatus: hasCooldown ? (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') : (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.SKIPPED : 'SKIPPED'),
    cooldown_status: hasCooldown ? 'pending' : 'none',

    mainWorkoutSubState: (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.EXERCISE_READY : 'EXERCISE_READY'),
    activeExerciseIndex: 0,
    activeSetIndex: 0,
    warmupIndex: 0,
    warmup_idx: 0,
    cooldownIndex: 0,
    cooldown_idx: 0,

    sessionTimer: {
      startedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      elapsedSec: 0
    },
    movementTimer: {
      isRunning: false,
      durationSec: warmup[0]?.duration_sec || 30,
      remainingSec: warmup[0]?.duration_sec || 30,
      startedAt: null,
      pausedAt: null
    },
    holdTimer: {
      isRunning: false,
      exIdx: null,
      setIdx: null,
      targetSec: 30,
      elapsedSec: 0,
      startedAt: null,
      pausedAt: null
    },
    restTimer: {
      isRunning: false,
      durationSec: 90,
      remainingSec: 0,
      startedAt: null,
      pausedAt: null,
      nextInfo: '',
      feedback: ''
    },
    phaseTimer: {
      isRunning: false,
      duration: warmup[0]?.duration_sec || 30,
      remaining: warmup[0]?.duration_sec || 30,
      startedAt: null,
      pausedMs: 0
    },

    startTime: null,
    startedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    endTime: null,
    completed_at: null,

    warmup,
    exercises,
    cooldown
  };

  _selectedWorkoutExIdx = 0;
  saveActiveSession(session);
  openWorkoutView();
}

// Fallback compatibility wrapper for any legacy calls
async function startWorkoutSession(routineName, levelNum = 1) {
  const matchingWorkout = state.workouts.find(w => w.name.toLowerCase() === routineName.toLowerCase());
  if (matchingWorkout) {
    return startWorkoutFromId(matchingWorkout.id);
  }

  let exercises = [];
  try {
    const levels = await API.getRoutineLevels(routineName);
    const lvl = levels.find(l => l.level === levelNum) || levels[0];
    if (lvl) exercises = lvl.exercises;
  } catch (e) {
    // fallback
  }

  if (exercises.length) {
    startWorkoutFromData(routineName, exercises);
    return;
  }

  const exList = state.exercises.filter(e => e.day === routineName);
  if (exList.length) {
    startWorkoutFromData(routineName, exList.map((e, i) => ({
      exercise_id: e.id,
      exercise_name: e.name,
      exercise_type: e.type,
      sets: 3,
      reps: e.type === 'reps' ? 10 : null,
      duration_sec: e.type === 'duration' ? 30 : null,
      rest_sec: 90
    })));
    return;
  }

  showToast(`Could not launch ${routineName}`, true);
}

function ensureSessionStarted(session) {
  if (!session) session = getActiveSession();
  if (!session) return;
  const isIdle = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') || session.status === 'ready' || !session.startTime;
  if (isIdle) {
    const now = Date.now();
    session.startTime = now;
    session.startedAt = now;
    if (!session.sessionTimer) {
      session.sessionTimer = { startedAt: now, pausedAt: null, totalPausedMs: 0, elapsedSec: 0 };
    } else {
      session.sessionTimer.startedAt = now;
    }
    session.status = 'in_progress';
    session.phaseState = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');

    if (isWarmupPhase(session.phase) || session.currentPhase === 'warmup') {
      session.warmupStatus = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');
      session.warmup_status = 'in_progress';
    } else if (isMainPhase(session.phase) || session.currentPhase === 'main') {
      session.mainStatus = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');
      session.mainWorkoutSubState = (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.SET_ACTIVE : 'SET_ACTIVE');
    }

    saveActiveSession(session);
    startWorkoutDurationTimer();
  }
}

function openWorkoutView() {
  state.view = 'workout';
  if (typeof window !== 'undefined' && window.location) {
    window.location.hash = 'workout';
  }
  const session = getActiveSession();
  if (session && (session.status === 'in_progress' || session.status === 'active' || session.phaseState === 'ACTIVE') && (session.startTime || session.startedAt)) {
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    startWorkoutDurationTimer();

    // Rehydrate rest timer if active
    if (session.restTimer && session.restTimer.isRunning && session.restTimer.remainingSec > 0 && !_workoutRestInterval && (session.status !== 'paused' && session.phaseState !== 'PAUSED')) {
      startWorkoutRest(session.restTimer.remainingSec, session.restTimer.nextInfo || '', session.restTimer.feedback || '');
    }
  }
  render();
}

function pauseWorkoutSession() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'active' && session.phaseState !== 'ACTIVE')) return;
  cancelAutoAdvance(false);
  const now = Date.now();
  session.status = 'paused';
  session.phaseState = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.PAUSED : 'PAUSED');
  session.pausedAt = now;
  if (!session.sessionTimer) session.sessionTimer = { startedAt: session.startTime || now, pausedAt: now, totalPausedMs: session.totalPausedMs || 0, elapsedSec: 0 };
  else session.sessionTimer.pausedAt = now;

  // Freeze Movement Timer
  if (session.movementTimer && session.movementTimer.isRunning) {
    session.movementTimer.isRunning = false;
    session.movementTimer.pausedAt = now;
  }
  if (session.phaseTimer && session.phaseTimer.isRunning) {
    session.phaseTimer.isRunning = false;
    session.phaseTimer.pausedAt = now;
  }

  // Freeze Hold Timer
  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
  }
  if (session.holdTimer && session.holdTimer.isRunning) {
    session.holdTimer.isRunning = false;
    session.holdTimer.pausedAt = now;
  }

  // Freeze Rest Timer
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
  }
  if (session.restTimer && session.restTimer.isRunning) {
    session.restTimer.isRunning = false;
    session.restTimer.pausedAt = now;
  }

  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }

  if (typeof releaseScreenWakeLock === 'function') {
    releaseScreenWakeLock();
  }
  saveActiveSession(session);
  if (typeof window !== 'undefined' && window.ExerciseAnimation) {
    window.ExerciseAnimation.pauseAll();
  }
  render();
}

function resumeWorkoutSession() {
  const session = getActiveSession();
  if (!session) return;
  const isIdle = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') || session.status === 'ready' || !session.startTime;
  if (isIdle) {
    ensureSessionStarted(session);
    render();
    return;
  }
  const isPaused = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.PAUSED : 'PAUSED') || session.status === 'paused';
  if (!isPaused) return;

  const now = Date.now();
  const pausedMs = session.pausedAt ? (now - session.pausedAt) : 0;
  session.totalPausedMs = (session.totalPausedMs || 0) + pausedMs;
  if (!session.sessionTimer) session.sessionTimer = { startedAt: session.startTime || now, pausedAt: null, totalPausedMs: session.totalPausedMs, elapsedSec: 0 };
  else {
    session.sessionTimer.totalPausedMs = session.totalPausedMs;
    session.sessionTimer.pausedAt = null;
  }
  session.status = 'in_progress';
  session.phaseState = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');
  session.pausedAt = null;

  // Resume Movement Timer
  if (session.movementTimer && session.movementTimer.pausedAt) {
    const mtPausedDelta = now - session.movementTimer.pausedAt;
    session.movementTimer.startedAt = (session.movementTimer.startedAt || now) + mtPausedDelta;
    session.movementTimer.pausedAt = null;
    session.movementTimer.isRunning = true;
  }
  if (session.phaseTimer && session.phaseTimer.pausedAt) {
    const ptPausedDelta = now - session.phaseTimer.pausedAt;
    session.phaseTimer.startedAt = (session.phaseTimer.startedAt || now) + ptPausedDelta;
    session.phaseTimer.pausedAt = null;
    session.phaseTimer.isRunning = true;
  }

  // Resume Hold Timer
  if (session.holdTimer && session.holdTimer.pausedAt) {
    const htPausedDelta = now - session.holdTimer.pausedAt;
    session.holdTimer.startedAt = (session.holdTimer.startedAt || now) + htPausedDelta;
    session.holdTimer.pausedAt = null;
    session.holdTimer.isRunning = true;
    _workoutHoldState.startedAt = session.holdTimer.startedAt;

    _workoutHoldInterval = setInterval(() => {
      if (!_workoutHoldState.startedAt) return;
      const curNow = Date.now();
      const elapsed = Math.floor((curNow - _workoutHoldState.startedAt) / 1000);
      _workoutHoldState.elapsed = elapsed;
      if (session.holdTimer) session.holdTimer.elapsedSec = elapsed;

      const remaining = _workoutHoldState.targetVal - elapsed;
      if (remaining >= 1 && remaining <= 3 && !_workoutHoldState.beepsPlayed[remaining]) {
        _workoutHoldState.beepsPlayed[remaining] = true;
        cueCountdownTick(remaining);
      } else if (remaining === 0 && !_workoutHoldState.beepsPlayed[0]) {
        _workoutHoldState.beepsPlayed[0] = true;
        cueTimerComplete();
        if (isAutoAdvanceEnabled()) {
          triggerTimedAutoAdvance(() => stopWorkoutHold(true), 'main');
        }
      }

      const digitsEl = document.getElementById('workout-active-counter-digits');
      if (digitsEl) digitsEl.textContent = elapsed;
      const btn = document.getElementById('workout-active-hold-btn');
      if (btn) btn.innerHTML = `${renderIcon('pause', 'cx-icon cx-icon-xs cx-icon-inline')} STOP HOLD (${elapsed}s)`;
    }, 200);
  }

  // Resume Rest Timer
  if (session.restTimer && session.restTimer.pausedAt) {
    const rtPausedDelta = now - session.restTimer.pausedAt;
    session.restTimer.startedAt = (session.restTimer.startedAt || now) + rtPausedDelta;
    session.restTimer.pausedAt = null;
    session.restTimer.isRunning = true;
    _workoutRestState.active = true;

    _workoutRestInterval = setInterval(() => {
      if (!_workoutRestState.active) return;
      _workoutRestState.remaining--;
      if (session.restTimer) session.restTimer.remainingSec = _workoutRestState.remaining;

      const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;
      if (isLast3s) cueTick();

      if (typeof document !== 'undefined') {
        const cardEl = document.getElementById('workout-rest-card-container');
        const timerEl = document.getElementById('workout-rest-timer-val');
        const barEl = document.getElementById('workout-rest-timer-bar');
        if (cardEl) {
          if (isLast3s) cardEl.classList.add('is-pulse-alert');
          else cardEl.classList.remove('is-pulse-alert');
        }
        if (timerEl) {
          timerEl.textContent = fmtSecs(Math.max(0, _workoutRestState.remaining));
          if (isLast3s) timerEl.classList.add('pulse-digits');
          else timerEl.classList.remove('pulse-digits');
        }
        if (barEl && _workoutRestState.total > 0) {
          const pct = Math.max(0, Math.min(100, (_workoutRestState.remaining / _workoutRestState.total) * 100));
          barEl.style.width = `${pct}%`;
        }
      }

      if (_workoutRestState.remaining <= 0) {
        cueRestEnd();
        stopWorkoutRest();
      }
    }, 1000);
  }

  saveActiveSession(session);
  startWorkoutDurationTimer();
  if (typeof acquireScreenWakeLock === 'function') {
    acquireScreenWakeLock();
  }
  if (typeof window !== 'undefined' && window.ExerciseAnimation) {
    window.ExerciseAnimation.resumeAll();
  }
  render();
}

function togglePauseWorkoutSession() {
  const session = getActiveSession();
  if (!session) return;
  const isIdle = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') || session.status === 'ready' || !session.startTime;
  if (isIdle) {
    ensureSessionStarted(session);
    render();
    return;
  }
  const isPaused = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.PAUSED : 'PAUSED') || session.status === 'paused';
  if (isPaused) {
    resumeWorkoutSession();
  } else {
    pauseWorkoutSession();
  }
}

function startWorkoutDurationTimer() {
  const currentSession = getActiveSession();
  if (!currentSession || !currentSession.startTime || currentSession.status === 'ready' || currentSession.phaseState === 'IDLE') {
    return;
  }
  if (typeof acquireScreenWakeLock === 'function') {
    acquireScreenWakeLock();
  }
  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }
  _workoutTimerInterval = setInterval(() => {
    if (state.view === 'workout') {
      const session = getActiveSession();
      if (session) {
        const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready' && session.phaseState !== 'IDLE';
        const isPaused = isStarted && (session.status === 'paused' || session.phaseState === 'PAUSED');
        if (isPaused) return;

        const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;
        if (session.sessionTimer) session.sessionTimer.elapsedSec = elapsedSec;

        const valEl = document.getElementById('workout-elapsed-val');
        if (valEl) {
          valEl.textContent = fmtSecs(elapsedSec);
        } else {
          const timerEl = document.getElementById('workout-elapsed-time');
          if (timerEl) {
            const span = timerEl.querySelector('.runner-timer-text') || timerEl.querySelector('span');
            if (span) {
              span.textContent = fmtSecs(elapsedSec);
            }
          }
        }

        // Live Warm-up / Cool-down Phase Timer Countdown Tick
        const isWarm = isWarmupPhase(session.phase) || session.currentPhase === 'warmup';
        const isCool = isCooldownPhase(session.phase) || session.currentPhase === 'cooldown';
        const timerObj = session.movementTimer || session.phaseTimer;

        if ((isWarm || isCool) && timerObj && timerObj.isRunning) {
          const pt = timerObj;
          const duration = pt.durationSec || pt.duration || 30;
          const elapsed = Math.floor((Date.now() - pt.startedAt) / 1000);
          const remaining = Math.max(0, duration - elapsed);
          const prevRemaining = pt.remainingSec != null ? pt.remainingSec : pt.remaining;
          pt.remaining = remaining;
          if (pt.remainingSec != null) pt.remainingSec = remaining;
          if (session.phaseTimer) {
            session.phaseTimer.remaining = remaining;
            session.phaseTimer.isRunning = true;
          }

          // Sound cues for 3, 2, 1 seconds remaining
          if (remaining >= 1 && remaining <= 3 && prevRemaining !== remaining) {
            cueCountdownTick(remaining);
          }

          const digitsEl = document.getElementById('runner-phase-timer-digits');
          if (digitsEl) {
            digitsEl.innerHTML = `${remaining} <span class="runner-digits-unit-label">SEC</span>`;
          }

          // Update SVG Radial Progress Ring
          const circleEl = document.getElementById('runner-radial-progress-circle');
          if (circleEl && duration > 0) {
            const fraction = Math.max(0, Math.min(1, remaining / duration));
            const offset = (440 * (1 - fraction)).toFixed(1);
            circleEl.style.strokeDashoffset = `${offset}`;
            if (remaining <= 3 && remaining > 0) {
              circleEl.classList.add('is-warning');
            } else {
              circleEl.classList.remove('is-warning');
            }
          }

          const barEl = document.getElementById('runner-phase-timer-bar');
          if (barEl && duration > 0) {
            const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));
            barEl.style.width = `${pct}%`;
          }

          if (remaining <= 0) {
            pt.isRunning = false;
            pt.remaining = 0;
            if (pt.remainingSec != null) pt.remainingSec = 0;
            if (session.phaseTimer) session.phaseTimer.isRunning = false;
            saveActiveSession(session);
            cueTimerComplete();
            const btnEl = document.getElementById('runner-phase-timer-toggle-btn');
            if (btnEl) {
              btnEl.innerHTML = `${renderIcon('rotateCcw', 'cx-icon cx-icon-xs cx-icon-inline')} Restart Timer`;
            }
            render();
          }
        }
      }
    }
  }, 1000);
}

function fmtDurationMinSec(sec) {
  if (!sec || isNaN(sec)) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Warm-up & Cool-down Phase Control Actions ───────────────────────────────

function selectWarmupMovement(idx) {
  let session = getActiveSession();
  if (!session || !session.warmup || !session.warmup[idx]) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const currentIdx = session.warmupIndex != null ? session.warmupIndex : (session.warmup_idx != null ? session.warmup_idx : 0);

  // Next movement becomes available only after completion or explicit skip
  if (idx > currentIdx) {
    const cur = session.warmup[currentIdx];
    if (cur && !cur.completed && !cur.skipped) {
      showToast('Complete or skip the current movement first to proceed.');
      return;
    }
  }

  session.currentPhase = 'warmup';
  session.phase = (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.WARMUP : 'WARMUP');
  session.warmupStatus = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');
  session.warmup_status = 'in_progress';
  session.warmupIndex = idx;
  session.warmup_idx = idx;
  const curEx = session.warmup[idx];
  const dur = curEx?.duration_sec || 30;
  const isHold = curEx?.exercise_type === 'duration';

  session.movementTimer = {
    isRunning: isHold,
    durationSec: dur,
    remainingSec: dur,
    startedAt: isHold ? Date.now() : null,
    pausedAt: null
  };
  session.phaseTimer = {
    isRunning: isHold,
    duration: dur,
    remaining: dur,
    startedAt: isHold ? Date.now() : null,
    pausedMs: 0
  };

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function selectCooldownStretch(idx) {
  let session = getActiveSession();
  if (!session || !session.cooldown || !session.cooldown[idx]) return;
  cancelAutoAdvance(false);

  const lockStatus = getPhaseLockStatus(session, 'cooldown');
  if (lockStatus.isLocked) {
    showToast(lockStatus.lockReason);
    return;
  }

  ensureSessionStarted(session);
  session = getActiveSession();

  session.currentPhase = 'cooldown';
  session.phase = (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.COOLDOWN : 'COOLDOWN');
  session.cooldownStatus = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.ACTIVE : 'ACTIVE');
  session.cooldown_status = 'in_progress';
  session.cooldownIndex = idx;
  session.cooldown_idx = idx;
  const curEx = session.cooldown[idx];
  const dur = curEx?.duration_sec || 30;
  const isHold = curEx?.exercise_type === 'duration';

  session.movementTimer = {
    isRunning: false,
    durationSec: dur,
    remainingSec: dur,
    startedAt: null,
    pausedAt: null
  };
  session.phaseTimer = {
    isRunning: false,
    duration: dur,
    remaining: dur,
    startedAt: null,
    pausedMs: 0
  };

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function togglePhaseTimer() {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  const isIdle = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.IDLE : 'IDLE') || session.status === 'ready' || !session.startTime;
  if (isIdle) {
    ensureSessionStarted(session);
    session = getActiveSession();
  }
  const isPaused = session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.PAUSED : 'PAUSED') || session.status === 'paused';
  if (isPaused) {
    resumeWorkoutSession();
    session = getActiveSession();
  }

  if (!session.movementTimer) {
    session.movementTimer = { isRunning: false, remainingSec: 0, durationSec: 0, startedAt: null, pausedAt: null };
  }
  if (!session.phaseTimer) {
    session.phaseTimer = { isRunning: false, remaining: 0, duration: 0, startedAt: null, pausedMs: 0 };
  }

  const isWarm = isWarmupPhase(session.phase) || session.currentPhase === 'warmup';
  const curIdx = isWarm ? (session.warmupIndex || session.warmup_idx || 0) : (session.cooldownIndex || session.cooldown_idx || 0);
  const curList = isWarm ? session.warmup : session.cooldown;
  const curEx = curList ? curList[curIdx] : null;
  const defaultDuration = curEx ? (curEx.duration_sec || 30) : 30;

  const mt = session.movementTimer;
  if (mt.isRunning) {
    mt.isRunning = false;
    mt.pausedAt = Date.now();
    session.phaseTimer.isRunning = false;
    session.phaseTimer.pausedAt = mt.pausedAt;
  } else {
    if (!mt.durationSec || mt.durationSec <= 0 || (mt.remainingSec != null && mt.remainingSec <= 0)) {
      mt.durationSec = defaultDuration;
      mt.remainingSec = defaultDuration;
    }
    mt.startedAt = Date.now() - ((mt.durationSec - (mt.remainingSec || mt.durationSec)) * 1000);
    mt.pausedAt = null;
    mt.isRunning = true;

    session.phaseTimer.duration = mt.durationSec;
    session.phaseTimer.remaining = mt.remainingSec;
    session.phaseTimer.startedAt = mt.startedAt;
    session.phaseTimer.pausedAt = null;
    session.phaseTimer.isRunning = true;
  }
  saveActiveSession(session);
  render();
}

function adjustPhaseTimer(delta) {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);

  const isWarm = isWarmupPhase(session.phase) || session.currentPhase === 'warmup';
  const curIdx = isWarm ? (session.warmupIndex || session.warmup_idx || 0) : (session.cooldownIndex || session.cooldown_idx || 0);
  const curList = isWarm ? session.warmup : session.cooldown;
  const curEx = curList ? curList[curIdx] : null;
  if (!curEx) return;

  const isHold = curEx.exercise_type === 'duration';

  if (!isHold) {
    curEx.reps = Math.max(1, (curEx.reps || 10) + delta);
    saveActiveSession(session);
    render();
    return;
  }

  const mt = session.movementTimer || session.phaseTimer;
  const isActivelyRunning = mt && mt.isRunning && !session.pausedAt && session.status !== 'paused' && session.phaseState !== 'PAUSED';

  if (isActivelyRunning) {
    const duration = mt.durationSec || mt.duration || 30;
    const elapsed = Math.floor((Date.now() - mt.startedAt) / 1000);
    const currentRemaining = Math.max(0, duration - elapsed);
    const newRemaining = Math.max(0, currentRemaining + delta);

    if (newRemaining <= 0) {
      if (session.movementTimer) {
        session.movementTimer.isRunning = false;
        session.movementTimer.remainingSec = 0;
      }
      if (session.phaseTimer) {
        session.phaseTimer.isRunning = false;
        session.phaseTimer.remaining = 0;
      }
      saveActiveSession(session);
      cueTimerComplete();
      render();

      if (isAutoAdvanceEnabled()) {
        triggerTimedAutoAdvance(isWarm ? advanceWarmupMovement : advanceCooldownStretch, session.currentPhase);
      }
      return;
    }

    if (session.movementTimer) {
      session.movementTimer.durationSec = newRemaining;
      session.movementTimer.remainingSec = newRemaining;
      session.movementTimer.startedAt = Date.now();
    }
    if (session.phaseTimer) {
      session.phaseTimer.duration = newRemaining;
      session.phaseTimer.remaining = newRemaining;
      session.phaseTimer.startedAt = Date.now();
    }
    saveActiveSession(session);

    // Instant DOM updates
    const digitsEl = document.getElementById('runner-phase-timer-digits');
    if (digitsEl) {
      digitsEl.innerHTML = `${newRemaining} <span class="runner-digits-unit-label">SEC</span>`;
    }
    const circleEl = document.getElementById('runner-radial-progress-circle');
    if (circleEl) {
      const baseDuration = curEx.duration_sec || duration || 30;
      const fraction = Math.max(0, Math.min(1, newRemaining / baseDuration));
      const offset = (440 * (1 - fraction)).toFixed(1);
      circleEl.style.strokeDashoffset = `${offset}`;
      if (newRemaining <= 3 && newRemaining > 0) {
        circleEl.classList.add('is-warning');
      } else {
        circleEl.classList.remove('is-warning');
      }
    }
    const barEl = document.getElementById('runner-phase-timer-bar');
    if (barEl) {
      const baseDuration = curEx.duration_sec || duration || 30;
      const pct = Math.max(0, Math.min(100, (newRemaining / baseDuration) * 100));
      barEl.style.width = `${pct}%`;
    }
    return;
  }

  // Pre-start / reset adjustment
  const newTarget = Math.max(5, (curEx.duration_sec || 30) + delta);
  curEx.duration_sec = newTarget;
  session.movementTimer = { isRunning: false, remainingSec: newTarget, durationSec: newTarget, startedAt: null, pausedAt: null };
  session.phaseTimer = { isRunning: false, remaining: newTarget, duration: newTarget, startedAt: null, pausedMs: 0 };
  saveActiveSession(session);
  render();
}

function advanceWarmupMovement() {
  let session = getActiveSession();
  if (!session || !session.warmup) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();
  const isPaused = session.phaseState === 'PAUSED' || session.status === 'paused';
  if (isPaused) {
    session.status = 'in_progress';
    session.phaseState = 'ACTIVE';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }

  const curIdx = session.warmupIndex != null ? session.warmupIndex : (session.warmup_idx || 0);
  const curEx = session.warmup[curIdx];
  if (curEx) {
    curEx.completed = true;
    curEx.completed_at = new Date().toISOString();
    curEx.skipped = false;
    curEx.skipped_at = null;
  }
  cueSetComplete();

  if (curIdx + 1 < session.warmup.length) {
    session.warmupIndex = curIdx + 1;
    session.warmup_idx = curIdx + 1;
    const nextEx = session.warmup[session.warmupIndex];
    const dur = nextEx?.duration_sec || 30;
    const isHold = nextEx?.exercise_type === 'duration';

    session.movementTimer = { isRunning: isHold, durationSec: dur, remainingSec: dur, startedAt: isHold ? Date.now() : null, pausedAt: null };
    session.phaseTimer = { isRunning: isHold, duration: dur, remaining: dur, startedAt: isHold ? Date.now() : null, pausedMs: 0 };

    // Check if rest is configured between warm-up exercises
    if (curEx && curEx.rest_sec && curEx.rest_sec > 0) {
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      startWorkoutRest(curEx.rest_sec, `Next: ${nextEx.exercise_name}`, 'Warm-up movement completed.');
      return;
    }

    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  } else {
    // All warm-up movements completed -> Mark WARMUP completed and show Warm-Up Complete state
    const now = Date.now();
    session.warmupStatus = 'COMPLETED';
    session.warmup_status = 'completed';
    session.warmup_completed_at = new Date(now).toISOString();
    session.warmup_duration_sec = Math.max(0, Math.round((now - (session.startTime || now)) / 1000));

    session.movementTimer = { isRunning: false, durationSec: 0, remainingSec: 0, startedAt: null, pausedAt: null };
    session.phaseTimer = { isRunning: false, duration: 0, remaining: 0, startedAt: null, pausedMs: 0 };

    cueExerciseComplete();
    showToast('Warm-Up Complete! You\'re ready for the main workout.');
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  }
}

function skipWarmupExercise() {
  let session = getActiveSession();
  if (!session || !session.warmup) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const idx = session.warmupIndex != null ? session.warmupIndex : (session.warmup_idx || 0);
  const cur = session.warmup[idx];
  if (cur) {
    cur.skipped = true;
    cur.completed = false;
    cur.completed_at = null;
    cur.skipped_at = new Date().toISOString();
  }

  if (idx + 1 < session.warmup.length) {
    session.warmupIndex = idx + 1;
    session.warmup_idx = idx + 1;
    const next = session.warmup[idx + 1];
    const dur = next?.duration_sec || 30;
    const isHold = next?.exercise_type === 'duration';
    session.movementTimer = { isRunning: isHold, durationSec: dur, remainingSec: dur, startedAt: isHold ? Date.now() : null, pausedAt: null };
    session.phaseTimer = { isRunning: isHold, duration: dur, remaining: dur, startedAt: isHold ? Date.now() : null, pausedMs: 0 };
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  } else {
    // Final warm-up movement skipped -> complete warm-up
    const now = Date.now();
    session.warmupStatus = 'COMPLETED';
    session.warmup_status = 'completed';
    session.warmup_completed_at = new Date(now).toISOString();
    session.movementTimer = { isRunning: false, durationSec: 0, remainingSec: 0, startedAt: null, pausedAt: null };
    session.phaseTimer = { isRunning: false, duration: 0, remaining: 0, startedAt: null, pausedMs: 0 };
    cueExerciseComplete();
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  }
}

function completeWarmupExercise() {
  advanceWarmupMovement();
}

function handleWarmupNextClick() {
  const session = getActiveSession();
  if (!session || !session.warmup) return;
  const idx = session.warmupIndex != null ? session.warmupIndex : (session.warmup_idx || 0);
  const curEx = session.warmup[idx];

  // Next Movement becomes available only after completion or explicit skip
  if (!curEx || (!curEx.completed && !curEx.skipped)) {
    showToast('Complete or skip the current movement first to proceed.');
    return;
  }

  if (idx + 1 < session.warmup.length) {
    selectWarmupMovement(idx + 1);
  } else {
    if (session.warmup.every(w => w.completed || w.skipped)) {
      session.warmupStatus = 'COMPLETED';
      session.warmup_status = 'completed';
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      render();
    }
  }
}

function adjustWarmupItemReps(idx, delta) {
  let session = getActiveSession();
  if (!session || !session.warmup || !session.warmup[idx]) return;
  ensureSessionStarted(session);
  session = getActiveSession();
  const cur = session.warmup[idx];
  const target = Number(cur.reps || 10);
  const curVal = Number(cur.actual_val !== null && cur.actual_val !== undefined ? cur.actual_val : target);
  cur.actual_val = Math.max(0, curVal + delta);
  saveActiveSession(session);
  render();
}

function startMainWorkoutFromWarmup() {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const now = Date.now();
  session.main_started_at = now;
  session.phase = 'MAIN_WORKOUT';
  session.currentPhase = 'main';
  session.phaseState = 'ACTIVE';
  session.mainStatus = 'ACTIVE';
  session.mainWorkoutSubState = 'SET_ACTIVE';

  session.activeExerciseIndex = 0;
  session.currentExerciseIndex = 0;
  session.activeSetIndex = 0;
  _selectedWorkoutExIdx = 0;

  if (session.exercises && session.exercises[0]) {
    const nextEx = session.exercises[0];
    const nextCat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name) : null;
    const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
    setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
  }

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function skipWarmupPhase() {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  const isPaused = session.phaseState === 'PAUSED' || session.status === 'paused';
  if (isPaused) {
    session.status = 'in_progress';
    session.phaseState = 'ACTIVE';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const now = Date.now();
  session.warmupStatus = 'SKIPPED';
  session.warmup_status = 'skipped';
  session.warmup_completed_at = new Date(now).toISOString();
  session.warmup_duration_sec = Math.max(0, Math.round((now - (session.startTime || now)) / 1000));
  session.main_started_at = now;

  session.phase = 'MAIN_WORKOUT';
  session.currentPhase = 'main';
  session.phaseState = 'ACTIVE';
  session.mainStatus = 'ACTIVE';
  session.mainWorkoutSubState = 'SET_ACTIVE';

  session.activeExerciseIndex = 0;
  session.currentExerciseIndex = 0;
  session.activeSetIndex = 0;
  _selectedWorkoutExIdx = 0;

  session.movementTimer = { isRunning: false, durationSec: 0, remainingSec: 0, startedAt: null, pausedAt: null };
  session.phaseTimer = { isRunning: false, duration: 0, remaining: 0, startedAt: null, pausedMs: 0 };

  showToast('Skipped Warm-up — Entering Main Workout');
  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function startMainWorkoutSet() {
  let session = getActiveSession();
  if (!session || !session.exercises) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const exIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx || 0);
  const curEx = session.exercises[exIdx];
  if (!curEx || !curEx.sets) return;

  const sIdx = curEx.sets.findIndex(s => !s.completed && !s.skipped);
  const activeSetIdx = session.activeSetIndex != null && curEx.sets[session.activeSetIndex] && !curEx.sets[session.activeSetIndex].completed && !curEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (sIdx !== -1 ? sIdx : 0);

  session.activeSetIndex = activeSetIdx;
  session.mainWorkoutSubState = 'SET_ACTIVE';

  const isHold = curEx.exercise_type === 'duration';
  if (isHold) {
    saveActiveSession(session);
    startWorkoutHold(exIdx, activeSetIdx);
    return;
  }

  saveActiveSession(session);
  render();
}

function adjustCurrentSetReps(delta) {
  let session = getActiveSession();
  if (!session || !session.exercises) return;
  ensureSessionStarted(session);
  session = getActiveSession();

  const exIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx || 0);
  const curEx = session.exercises[exIdx];
  if (!curEx || !curEx.sets) return;

  const sIdx = curEx.sets.findIndex(s => !s.completed && !s.skipped);
  const activeSetIdx = session.activeSetIndex != null && curEx.sets[session.activeSetIndex] && !curEx.sets[session.activeSetIndex].completed && !curEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (sIdx !== -1 ? sIdx : (curEx.sets.length - 1));

  const curSet = curEx.sets[activeSetIdx];
  if (!curSet) return;

  const target = Number(curSet.target_val || 10);
  const curVal = Number(curSet.actual_val !== null && curSet.actual_val !== undefined ? curSet.actual_val : target);
  curSet.actual_val = Math.max(0, curVal + delta);
  saveActiveSession(session);
  render();
}

function completeMainWorkoutSet() {
  let session = getActiveSession();
  if (!session || !session.exercises) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const exIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx || 0);
  const curEx = session.exercises[exIdx];
  if (!curEx || !curEx.sets) return;

  const sIdx = curEx.sets.findIndex(s => !s.completed && !s.skipped);
  const activeSetIdx = session.activeSetIndex != null && curEx.sets[session.activeSetIndex] && !curEx.sets[session.activeSetIndex].completed && !curEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (sIdx !== -1 ? sIdx : (curEx.sets.length - 1));

  const curSet = curEx.sets[activeSetIdx];
  if (!curSet) return;

  const isHold = curEx.exercise_type === 'duration';
  if (isHold && _workoutHoldState.exIdx === exIdx && _workoutHoldState.setIdx === activeSetIdx) {
    stopWorkoutHold(true);
    return;
  }

  // 1. Save performance immediately
  const targetVal = Number(curSet.target_val || 10);
  const finalVal = Number(curSet.actual_val !== null && curSet.actual_val !== undefined ? curSet.actual_val : targetVal);
  curSet.actual_val = finalVal;
  curSet.completed = true;
  curSet.completed_at = new Date().toISOString();
  curSet.skipped = false;
  curSet.skipped_at = null;

  cueSetComplete();
  if (typeof checkAndCelebratePR === 'function') {
    checkAndCelebratePR(curEx.exercise_id, finalVal, curSet.weight_kg);
  }

  // 2. Check if current exercise and entire main workout are completed
  const isExDone = curEx.sets.every(s => s.completed || s.skipped);
  const hasCompletedSets = curEx.sets.some(s => s.completed);
  curEx.completed = isExDone && hasCompletedSets;
  curEx.skipped = isExDone && !hasCompletedSets;
  if (curEx.completed) {
    curEx.completed_at = new Date().toISOString();
    cueExerciseComplete();
  }

  const isEntireMainWorkoutDone = session.exercises.every(ex => ex.sets && ex.sets.every(s => s.completed || s.skipped));

  if (isEntireMainWorkoutDone) {
    const now = Date.now();
    session.mainStatus = 'COMPLETED';
    session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
    session.main_completed_at = new Date(now).toISOString();
    session.main_duration_sec = Math.max(0, Math.round((now - (session.main_started_at || session.startTime || now)) / 1000));
    cueExerciseComplete();
    showToast('Main Workout Complete! Ready for Cool Down');
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
    return;
  }

  if (isExDone) {
    // Advance to next uncompleted exercise
    const nextUncompletedIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed && !s.skipped));
    const nextIdx = nextUncompletedIdx !== -1 ? nextUncompletedIdx : session.exercises.findIndex(ex => ex.sets.some(s => !s.completed && !s.skipped));
    if (nextIdx !== -1) {
      session.activeExerciseIndex = nextIdx;
      session.currentExerciseIndex = nextIdx;
      _selectedWorkoutExIdx = nextIdx;
      const nextEx = session.exercises[nextIdx];
      const nextFirstUnresolved = nextEx.sets ? nextEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
      session.activeSetIndex = nextFirstUnresolved !== -1 ? nextFirstUnresolved : 0;
      const nextCat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name) : null;
      const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
      setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
    }
  } else {
    // Current exercise has more sets -> advance activeSetIndex
    const nextSetIdx = curEx.sets.findIndex((s, i) => i > activeSetIdx && !s.completed && !s.skipped);
    if (nextSetIdx !== -1) {
      session.activeSetIndex = nextSetIdx;
    }
  }

  // 3. Trigger Rest Countdown if rest_sec is configured
  const restSec = curEx.rest_sec || 90;
  if (restSec > 0) {
    session.mainWorkoutSubState = 'RESTING';
    const nextInfo = getNextSetDescription(session, exIdx, activeSetIdx);
    const feedback = generateSetCompletionFeedback(session, exIdx, activeSetIdx, finalVal);
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    startWorkoutRest(restSec, nextInfo, feedback);
  } else {
    session.mainWorkoutSubState = 'SET_ACTIVE';
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  }
}

function openSkipMainWorkoutSetModal() {
  let modal = document.getElementById('skip-set-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skip-set-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'skip-set-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeSkipMainWorkoutSetModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:340px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <h2 class="modal-title" id="skip-set-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Skip this set?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        This set will be marked as skipped and will not count toward completed sets.
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1;" type="button" onclick="closeSkipMainWorkoutSetModal()">
          Cancel
        </button>
        <button class="btn btn-danger" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#ef4444; color:#ffffff; border:none; box-shadow:0 4px 14px rgba(239,68,68,0.4);" type="button" onclick="confirmSkipMainWorkoutSet()">
          Skip Set
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeSkipMainWorkoutSetModal() {
  const modal = document.getElementById('skip-set-modal');
  if (modal) modal.remove();
}

function confirmSkipMainWorkoutSet() {
  closeSkipMainWorkoutSetModal();
  skipMainWorkoutSet();
}

function skipMainWorkoutSet() {
  let session = getActiveSession();
  if (!session || !session.exercises) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const exIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx || 0);
  const curEx = session.exercises[exIdx];
  if (!curEx || !curEx.sets) return;

  const sIdx = curEx.sets.findIndex(s => !s.completed && !s.skipped);
  const activeSetIdx = session.activeSetIndex != null && curEx.sets[session.activeSetIndex] && !curEx.sets[session.activeSetIndex].completed && !curEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (sIdx !== -1 ? sIdx : (curEx.sets.length - 1));

  const curSet = curEx.sets[activeSetIdx];
  if (curSet) {
    curSet.skipped = true;
    curSet.completed = false;
    curSet.completed_at = null;
    curSet.skipped_at = new Date().toISOString();
  }

  // Check if current exercise has more sets
  const nextSetIdx = curEx.sets.findIndex((s, i) => i > activeSetIdx && !s.completed && !s.skipped);
  if (nextSetIdx !== -1) {
    session.activeSetIndex = nextSetIdx;
    session.mainWorkoutSubState = 'SET_ACTIVE';
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
    return;
  }

  // Current exercise completed -> mark exercise completed or skipped and advance to next uncompleted exercise
  const hasCompletedSets = curEx.sets.some(s => s.completed);
  curEx.completed = curEx.sets.every(s => s.completed || s.skipped) && hasCompletedSets;
  curEx.skipped = curEx.sets.every(s => s.completed || s.skipped) && !hasCompletedSets;
  curEx.completed_at = curEx.completed ? new Date().toISOString() : null;
  curEx.skipped_at = curEx.skipped ? new Date().toISOString() : null;
  const nextExIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed && !s.skipped));
  if (nextExIdx !== -1) {
    session.activeExerciseIndex = nextExIdx;
    session.currentExerciseIndex = nextExIdx;
    _selectedWorkoutExIdx = nextExIdx;
    session.mainWorkoutSubState = 'SET_ACTIVE';
    const nextEx = session.exercises[nextExIdx];
    const nextFirstUnresolved = nextEx.sets ? nextEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
    session.activeSetIndex = nextFirstUnresolved !== -1 ? nextFirstUnresolved : 0;
    const nextCat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name) : null;
    const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
    setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
    return;
  }

  const anyUnresolvedIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed && !s.skipped));
  if (anyUnresolvedIdx !== -1) {
    session.activeExerciseIndex = anyUnresolvedIdx;
    session.currentExerciseIndex = anyUnresolvedIdx;
    _selectedWorkoutExIdx = anyUnresolvedIdx;
    const anyEx = session.exercises[anyUnresolvedIdx];
    const anyFirstUnresolved = anyEx.sets ? anyEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
    session.activeSetIndex = anyFirstUnresolved !== -1 ? anyFirstUnresolved : 0;
    session.mainWorkoutSubState = 'SET_ACTIVE';
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
    return;
  }

  // All exercises in main workout done -> mark COMPLETED and show Main Workout Complete view
  const now = Date.now();
  session.mainStatus = 'COMPLETED';
  session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
  session.main_completed_at = new Date(now).toISOString();
  session.main_duration_sec = Math.max(0, Math.round((now - (session.main_started_at || session.startTime || now)) / 1000));
  cueExerciseComplete();
  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function startCoolDownFromMain() {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  stopWorkoutRest();
  ensureSessionStarted(session);
  session = getActiveSession();

  const now = Date.now();
  session.cooldown_started_at = now;
  session.phase = 'COOLDOWN';
  session.currentPhase = 'cooldown';
  session.phaseState = 'ACTIVE';
  session.cooldownStatus = 'ACTIVE';
  session.cooldown_status = 'in_progress';
  session.cooldownIndex = 0;
  session.cooldown_idx = 0;

  const curCd = session.cooldown && session.cooldown[0];
  const isHoldCd = curCd?.exercise_type === 'duration';
  const dur = curCd?.duration_sec || 30;

  session.movementTimer = {
    isRunning: isHoldCd,
    durationSec: dur,
    remainingSec: dur,
    startedAt: isHoldCd ? Date.now() : null,
    pausedAt: null
  };
  session.phaseTimer = {
    isRunning: isHoldCd,
    duration: dur,
    remaining: dur,
    startedAt: isHoldCd ? Date.now() : null,
    pausedMs: 0
  };

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function advanceCooldownStretch() {
  let session = getActiveSession();
  if (!session || !session.cooldown) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();
  const isPaused = session.phaseState === 'PAUSED' || session.status === 'paused';
  if (isPaused) {
    session.status = 'in_progress';
    session.phaseState = 'ACTIVE';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }

  const curIdx = session.cooldownIndex != null ? session.cooldownIndex : (session.cooldown_idx || 0);
  const curEx = session.cooldown[curIdx];
  if (curEx) {
    curEx.completed = true;
    curEx.completed_at = new Date().toISOString();
    curEx.skipped = false;
    curEx.skipped_at = null;
  }
  cueSetComplete();

  if (curIdx + 1 < session.cooldown.length) {
    session.cooldownIndex = curIdx + 1;
    session.cooldown_idx = curIdx + 1;
    const nextEx = session.cooldown[session.cooldownIndex];
    const dur = nextEx?.duration_sec || 30;
    session.movementTimer = { isRunning: false, durationSec: dur, remainingSec: dur, startedAt: null, pausedAt: null };
    session.phaseTimer = { isRunning: false, duration: dur, remaining: dur, startedAt: null, pausedMs: 0 };
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  } else {
    // All cooldown exercises completed -> finish workout
    const now = Date.now();
    session.cooldownStatus = 'COMPLETED';
    session.cooldown_status = 'completed';
    session.cooldown_completed_at = new Date(now).toISOString();
    if (session.cooldown_started_at) {
      session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
    }
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    finishWorkoutSession();
  }
}

function skipCooldownPhase() {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  const isPaused = session.phaseState === 'PAUSED' || session.status === 'paused';
  if (isPaused) {
    session.status = 'in_progress';
    session.phaseState = 'ACTIVE';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const now = Date.now();
  session.cooldownStatus = 'SKIPPED';
  session.cooldown_status = 'skipped';
  session.cooldown_completed_at = new Date(now).toISOString();
  if (session.cooldown_started_at) {
    session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
  }
  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  finishWorkoutSession();
}

function skipCooldownExercise() {
  let session = getActiveSession();
  if (!session || !session.cooldown) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const idx = session.cooldownIndex != null ? session.cooldownIndex : (session.cooldown_idx || 0);
  const cur = session.cooldown[idx];
  if (cur) {
    cur.skipped = true;
    cur.completed = false;
    cur.completed_at = null;
    cur.skipped_at = new Date().toISOString();
  }
  if (idx + 1 < session.cooldown.length) {
    session.cooldownIndex = idx + 1;
    session.cooldown_idx = idx + 1;
    const next = session.cooldown[idx + 1];
    const dur = next?.duration_sec || 30;
    session.movementTimer = { isRunning: false, durationSec: dur, remainingSec: dur, startedAt: null, pausedAt: null };
    session.phaseTimer = { isRunning: false, duration: dur, remaining: dur, startedAt: null, pausedMs: 0 };
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    render();
  } else {
    const now = Date.now();
    session.cooldownStatus = 'COMPLETED';
    session.cooldown_status = 'completed';
    session.cooldown_completed_at = new Date(now).toISOString();
    if (session.cooldown_started_at) {
      session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
    }
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
    finishWorkoutSession();
  }
}

function completeCooldownExercise() {
  advanceCooldownStretch();
}

function openSkipWarmupExerciseModal() {
  let modal = document.getElementById('skip-warmup-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skip-warmup-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'skip-warmup-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeSkipWarmupExerciseModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:340px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <h2 class="modal-title" id="skip-warmup-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Skip this exercise?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        You can continue with the next warm-up movement.
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1;" type="button" onclick="closeSkipWarmupExerciseModal()">
          Cancel
        </button>
        <button class="btn btn-danger" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#ef4444; color:#ffffff; border:none; box-shadow:0 4px 14px rgba(239,68,68,0.4);" type="button" onclick="confirmSkipWarmupExercise()">
          Skip Exercise
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeSkipWarmupExerciseModal() {
  const modal = document.getElementById('skip-warmup-modal');
  if (modal) modal.remove();
}

function confirmSkipWarmupExercise() {
  closeSkipWarmupExerciseModal();
  skipWarmupExercise();
}

function openExitWarmupModal() {
  let modal = document.getElementById('exit-warmup-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'exit-warmup-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'exit-warmup-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeExitWarmupModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:340px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <h2 class="modal-title" id="exit-warmup-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Exit Warm-Up?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        Your workout session progress will be lost.
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1;" type="button" onclick="closeExitWarmupModal()">
          Cancel
        </button>
        <button class="btn btn-danger" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#ef4444; color:#ffffff; border:none; box-shadow:0 4px 14px rgba(239,68,68,0.4);" type="button" onclick="confirmExitWarmup()">
          Exit
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeExitWarmupModal() {
  const modal = document.getElementById('exit-warmup-modal');
  if (modal) modal.remove();
}

function confirmExitWarmup() {
  closeExitWarmupModal();
  confirmDiscardWorkout();
}

function renderWarmupCompleteView(session) {
  const warmupList = getWarmupExercises(session);
  const completedCount = warmupList.filter(w => w.completed).length;
  const totalCount = warmupList.length;
  const isStarted = !!(session.startTime || session.startedAt);
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;
  const mainList = getMainWorkoutExercises(session);
  const nextFirstEx = mainList && mainList.length > 0 ? mainList[0] : null;

  return `
    <div class="runner-phase-transition-container animate-card-reveal">
      <div class="runner-phase-transition-card">
        <div class="runner-transition-top-line"></div>
        <div class="runner-transition-badge-wrap">
          <span class="runner-transition-fire-icon">🔥</span>
        </div>
        <h2 class="runner-transition-title">Warm-Up Complete</h2>
        <p class="runner-transition-sub">Warm-Up complete. You're ready for the main workout. Your body is primed and muscles are activated.</p>

        <div class="runner-transition-chips-row">
          <div class="runner-transition-chip">
            <span class="runner-chip-icon">✓</span>
            <span>${completedCount} / ${totalCount} movements</span>
          </div>
          <div class="runner-transition-chip">
            <span class="runner-chip-icon">⏱</span>
            <span>${fmtSecs(elapsedSec)}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-hero runner-transition-cta-btn" type="button" onclick="startMainWorkoutFromWarmup()">
          <span>Start Main Workout</span>
          ${renderIcon('arrowRight', 'cx-icon cx-icon-sm cx-icon-inline')}
        </button>
      </div>

      ${nextFirstEx ? `
        <div class="runner-transition-upcoming-box">
          <span class="runner-upcoming-tag">UP NEXT · EXERCISE 1</span>
          <div class="runner-upcoming-row">
            <span class="runner-upcoming-name">${nextFirstEx.exercise_name}</span>
            <span class="runner-upcoming-sets mono">${nextFirstEx.sets ? nextFirstEx.sets.length : 3} sets · ${nextFirstEx.target_val || 15} reps</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderMainWorkoutCompleteView(session) {
  const mainList = getMainWorkoutExercises(session);
  const totalSets = mainList.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);
  const completedSets = mainList.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.completed).length : 0), 0);
  const isStarted = !!(session.startTime || session.startedAt);
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;
  const cooldownList = getCooldownExercises(session);
  const nextCooldownEx = cooldownList && cooldownList.length > 0 ? cooldownList[0] : null;

  return `
    <div class="runner-phase-transition-container animate-card-reveal">
      <div class="runner-phase-transition-card">
        <div class="runner-transition-top-line"></div>
        <div class="runner-transition-badge-wrap">
          <span class="runner-transition-fire-icon">⚡</span>
        </div>
        <h2 class="runner-transition-title">Main Workout Complete</h2>
        <p class="runner-transition-sub">All strength and skill sets completed. Move into cool-down for recovery.</p>

        <div class="runner-transition-chips-row">
          <div class="runner-transition-chip">
            <span class="runner-chip-icon">✓</span>
            <span>${completedSets} / ${totalSets} sets</span>
          </div>
          <div class="runner-transition-chip">
            <span class="runner-chip-icon">⏱</span>
            <span>${fmtSecs(elapsedSec)}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-hero runner-transition-cta-btn" type="button" onclick="startCoolDownFromMain()">
          <span>Start Cool Down</span>
          ${renderIcon('arrowRight', 'cx-icon cx-icon-sm cx-icon-inline')}
        </button>
      </div>

      ${nextCooldownEx ? `
        <div class="runner-transition-upcoming-box">
          <span class="runner-upcoming-tag">UP NEXT · RECOVERY</span>
          <div class="runner-upcoming-row">
            <span class="runner-upcoming-name">${nextCooldownEx.exercise_name}</span>
            <span class="runner-upcoming-sets mono">${nextCooldownEx.duration_sec || 30}s hold</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function openExitWorkoutModal() {
  let modal = document.getElementById('exit-workout-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'exit-workout-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'exit-modal-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeExitWorkoutModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:360px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <div style="width:44px; height:44px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
        ${renderIcon('alertTriangle', 'cx-icon cx-icon-md')}
      </div>
      <h2 class="modal-title" id="exit-modal-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Exit Workout?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        Your current workout progress will be saved, but this session will end.
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" id="exit-modal-continue-btn" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; cursor:pointer;" type="button" onclick="closeExitWorkoutModal()">
          Continue Workout
        </button>
        <button class="btn btn-danger" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#ef4444; color:#ffffff; border:none; box-shadow:0 4px 14px rgba(239,68,68,0.4); cursor:pointer;" type="button" onclick="confirmExitWorkout()">
          Exit Workout
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  const continueBtn = document.getElementById('exit-modal-continue-btn');
  if (continueBtn) continueBtn.focus();
}

function closeExitWorkoutModal() {
  const modal = document.getElementById('exit-workout-modal');
  if (modal) modal.remove();
}

async function confirmExitWorkout() {
  closeExitWorkoutModal();
  const session = getActiveSession();
  if (!session) {
    state.view = 'dashboard';
    window.location.hash = 'dashboard';
    render();
    return;
  }

  // 1. Clear all active intervals
  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0, targetVal: 30, beepsPlayed: {} };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, completed: false, remaining: 0, total: 0, nextInfo: '', feedback: '' };
  }
  if (_workoutPhaseTimerInterval) {
    clearInterval(_workoutPhaseTimerInterval);
    _workoutPhaseTimerInterval = null;
  }
  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }
  if (typeof releaseScreenWakeLock === 'function') {
    releaseScreenWakeLock();
  }

  // 2. Mark session state as abandoned / incomplete
  const durationSec = getSessionElapsedSec(session);
  const now = Date.now();
  session.endTime = now;
  session.completed_at = null;
  session.duration_sec = durationSec;
  session.status = 'abandoned';
  session.phaseState = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.SKIPPED : 'SKIPPED');

  let completedSets = 0;
  let totalSets = 0;

  // 3. Log any sets that were completed before exit
  if (session.warmup) {
    for (const wEx of session.warmup) {
      if (wEx.completed) {
        const isHold = wEx.exercise_type === 'duration';
        const actual = Number(wEx.actual_val || (isHold ? wEx.duration_sec || 30 : wEx.reps || 10));
        lsWriteLog({
          exercise_id: wEx.exercise_id,
          timestamp: wEx.completed_at || new Date().toISOString(),
          session_uuid: session.id,
          client_uuid: wEx.client_uuid || newUUID(),
          phase: 'warmup',
          duration_sec: isHold ? actual : null,
          reps: isHold ? null : actual,
          sets: 1
        });
      }
    }
  }

  if (session.exercises) {
    for (const ex of session.exercises) {
      const isHold = ex.exercise_type === 'duration';
      if (ex.sets) {
        for (const set of ex.sets) {
          totalSets++;
          if (set.completed) {
            completedSets++;
            const actual = Number(set.actual_val || (isHold ? 0 : set.target_val));
            lsWriteLog({
              exercise_id: ex.exercise_id,
              timestamp: set.completed_at || new Date().toISOString(),
              session_uuid: session.id,
              client_uuid: set.client_uuid || newUUID(),
              phase: 'main',
              duration_sec: isHold ? actual : null,
              reps: isHold ? null : actual,
              weight_kg: set.weight_kg != null ? Number(set.weight_kg) : null,
              rpe: set.rpe != null ? Number(set.rpe) : null
            });
          }
        }
      }
    }
  }

  // 4. Assemble snapshot and persist to backend / local storage
  const assembledSnapshotExercises = [];
  if (session.warmup) {
    session.warmup.forEach(w => assembledSnapshotExercises.push({
      exercise_id: w.exercise_id,
      exercise_name: w.exercise_name,
      phase: 'warmup',
      exercise_type: w.exercise_type,
      skipped: !!w.skipped,
      sets: [{ set_num: 1, target_val: w.target_val, actual_val: w.actual_val, completed: !!w.completed, skipped: !!w.skipped }]
    }));
  }
  if (session.exercises) {
    session.exercises.forEach(m => {
      assembledSnapshotExercises.push({
        exercise_id: m.exercise_id,
        exercise_name: m.exercise_name,
        phase: 'main',
        exercise_type: m.exercise_type,
        skipped: !!m.skipped,
        sets: (m.sets || []).map(s => ({
          set_num: s.set_num,
          target_val: s.target_val,
          actual_val: s.actual_val,
          completed: !!s.completed,
          skipped: !!s.skipped,
          weight_kg: s.weight_kg,
          rpe: s.rpe
        }))
      });
    });
  }

  const sessionPayload = {
    id: session.id,
    routine: session.routine || session.workout_name,
    workout_id: session.workout_id,
    started_at: new Date(session.startTime || session.startedAt || now).toISOString(),
    completed_at: null,
    duration_sec: durationSec,
    status: 'abandoned',
    is_completed: false,
    warmup_status: session.warmup_status || 'none',
    cooldown_status: session.cooldown_status || 'none',
    exercises: assembledSnapshotExercises
  };

  saveActiveSession(null);
  lsSyncPending();

  try {
    await API.createWorkoutSession(sessionPayload);
  } catch (e) {
    localStorage.setItem(`${LS_SESSION_PREFIX}${session.id}`, JSON.stringify(sessionPayload));
  }

  showToast(`Workout exited · Progress saved as incomplete (${completedSets}/${totalSets} sets)`);
  state.view = 'dashboard';
  window.location.hash = 'dashboard';
  if (typeof loadDashboardSummary === 'function') {
    await loadDashboardSummary();
  }
  render();
}

function getWorkoutSessionSummaryMetrics(session) {
  if (!session) {
    return {
      workoutName: 'Workout',
      durationSec: 0,
      durationFormatted: '00:00',
      exercisesCompleted: 0,
      totalExercises: 0,
      setsCompleted: 0,
      setsSkipped: 0,
      totalSets: 0,
      completionPercentage: 0,
      volumeKg: 0,
      volumeText: 'Bodyweight',
      calories: 0,
      completedSummary: '0 sets',
      skippedSummary: 'None',
      bestPerformance: null
    };
  }

  const auth = getAuthoritativeSessionState(session);
  const workoutName = session.routine || session.workout_name || 'Workout Session';
  const durationSec = session.duration_sec != null ? session.duration_sec : getSessionElapsedSec(session);
  const durationFormatted = fmtSecs(durationSec);

  let totalVolumeKg = 0;
  let totalReps = 0;
  let totalHoldSec = 0;
  let maxWeightKg = 0;
  let maxWeightEx = '';
  let maxReps = 0;
  let maxRepsEx = '';
  let maxHoldSec = 0;
  let maxHoldEx = '';

  // 1. Warm-up
  auth.warmup.list.forEach(w => {
    if (w.completed) {
      const isHold = w.exercise_type === 'duration';
      const actual = Number(w.actual_val !== null && w.actual_val !== undefined ? w.actual_val : (w.duration_sec || w.reps || (isHold ? 30 : 10)));
      if (isHold) totalHoldSec += actual;
      else totalReps += actual;
    }
  });

  // 2. Main Workout
  auth.main.list.forEach(ex => {
    const isHold = ex.exercise_type === 'duration';
    (ex.sets || []).forEach(s => {
      if (s.completed) {
        const actual = Number(s.actual_val !== null && s.actual_val !== undefined ? s.actual_val : (isHold ? 0 : s.target_val || 10));
        const weight = s.weight_kg != null && s.weight_kg !== '' ? Number(s.weight_kg) : 0;

        if (isHold) {
          totalHoldSec += actual;
          if (actual > maxHoldSec) {
            maxHoldSec = actual;
            maxHoldEx = ex.exercise_name;
          }
        } else {
          totalReps += actual;
          if (actual > maxReps) {
            maxReps = actual;
            maxRepsEx = ex.exercise_name;
          }
        }

        if (weight > 0) {
          totalVolumeKg += (actual * weight);
          if (weight > maxWeightKg) {
            maxWeightKg = weight;
            maxWeightEx = `${ex.exercise_name} (${actual} reps @ ${weight}kg)`;
          }
        }
      }
    });
  });

  // 3. Cool Down
  auth.cooldown.list.forEach(c => {
    if (c.completed) {
      const isHold = c.exercise_type === 'duration';
      const actual = Number(c.actual_val !== null && c.actual_val !== undefined ? c.actual_val : (c.duration_sec || c.reps || (isHold ? 30 : 10)));
      if (isHold) totalHoldSec += actual;
      else totalReps += actual;
    }
  });

  const exercisesCompleted = auth.overall.completedExercises;
  const totalExercises = auth.overall.totalExercises;
  const setsCompleted = auth.overall.completedSets;
  const setsSkipped = auth.overall.skippedSets;
  const totalSets = auth.overall.totalSets;
  const completionPercentage = totalSets > 0 ? Math.round((setsCompleted / totalSets) * 100) : 100;
  const volumeText = totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()} kg` : 'Bodyweight';
  const calories = Math.max(15, Math.round((durationSec / 60) * 6.5 + (totalReps * 0.18) + (totalVolumeKg > 0 ? totalVolumeKg * 0.012 : 0) + (totalHoldSec * 0.08)));

  const completedSummary = `${setsCompleted} of ${totalSets} sets (${exercisesCompleted} exercises)`;
  const skippedSummary = setsSkipped > 0 ? `${setsSkipped} sets skipped` : 'None';

  let bestPerformance = null;
  if (maxWeightKg > 0 && maxWeightEx) {
    bestPerformance = maxWeightEx;
  } else if (maxReps > 0 && maxRepsEx) {
    bestPerformance = `${maxRepsEx}: ${maxReps} reps`;
  } else if (maxHoldSec > 0 && maxHoldEx) {
    bestPerformance = `${maxHoldEx}: ${maxHoldSec}s hold`;
  }

  return {
    workoutName,
    durationSec,
    durationFormatted,
    exercisesCompleted,
    totalExercises,
    setsCompleted,
    setsSkipped,
    totalSets,
    completionPercentage,
    volumeKg: totalVolumeKg,
    volumeText,
    calories,
    completedSummary,
    skippedSummary,
    bestPerformance
  };
}

function renderWorkoutCompleteModal(summaryData) {
  if (typeof document === 'undefined' || !document.createElement || !document.getElementById) return;
  let modal = document.getElementById('workout-complete-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'workout-complete-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'workout-complete-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeWorkoutCompleteModal();
    };
    if (document.body && document.body.appendChild) {
      document.body.appendChild(modal);
    }
  }

  const s = summaryData || {};
  modal.innerHTML = `
    <div class="runner-complete-modal-card" onclick="event.stopPropagation()">
      <div class="runner-complete-icon-wrap">
        ${renderIcon('award', 'cx-icon cx-icon-lg')}
      </div>
      <span class="runner-complete-kicker">SESSION TERMINATED · FINISHED</span>
      <h1 class="runner-complete-title" id="workout-complete-title">WORKOUT COMPLETE</h1>
      <h2 class="runner-complete-subtitle">${s.workoutName || 'Workout'}</h2>

      <div class="runner-complete-metrics-grid">
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Duration</span>
          <span class="runner-complete-metric-val mono">${s.durationFormatted || '00:00'}</span>
        </div>
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Exercises</span>
          <span class="runner-complete-metric-val mono">${s.exercisesCompleted || 0}/${s.totalExercises || 0}</span>
        </div>
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Sets Done</span>
          <span class="runner-complete-metric-val mono" style="color:#10b981;">${s.setsCompleted || 0}</span>
        </div>
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Sets Skipped</span>
          <span class="runner-complete-metric-val mono" style="color:${s.setsSkipped > 0 ? '#f59e0b' : '#8a8d9f'};">${s.setsSkipped || 0}</span>
        </div>
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Volume</span>
          <span class="runner-complete-metric-val mono">${s.volumeText || 'Bodyweight'}</span>
        </div>
        <div class="runner-complete-metric-item">
          <span class="runner-complete-metric-label">Calories</span>
          <span class="runner-complete-metric-val mono" style="color:#f97316;">${s.calories || 0} kcal</span>
        </div>
        <div class="runner-complete-metric-item" style="grid-column: span 3; padding-top:4px;">
          <span class="runner-complete-metric-label">Completion: ${s.completionPercentage || 0}%</span>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; margin-top:2px;">
            <div style="width:${s.completionPercentage || 0}%; height:100%; background:linear-gradient(90deg, #7c5cfc, #10b981); border-radius:3px;"></div>
          </div>
        </div>
      </div>

      <div class="runner-complete-summary-box">
        <div class="runner-complete-summary-row">
          <span class="runner-complete-summary-title">Completed:</span>
          <span class="runner-complete-summary-value">${s.completedSummary || '0 sets'}</span>
        </div>
        <div class="runner-complete-summary-row">
          <span class="runner-complete-summary-title">Skipped:</span>
          <span class="runner-complete-summary-value">${s.skippedSummary || 'None'}</span>
        </div>
        ${s.bestPerformance ? `
          <div class="runner-complete-summary-row is-pr">
            <span class="runner-complete-summary-title">🏆 Best Performance / PR:</span>
            <span class="runner-complete-summary-value" style="color:#facc15;">${s.bestPerformance}</span>
          </div>
        ` : ''}
      </div>

      <div class="runner-complete-actions">
        <button class="runner-complete-btn-secondary" type="button" onclick="handleViewSummaryClick()">
          View Workout Summary
        </button>
        <button class="runner-complete-btn-primary" type="button" onclick="handleDoneWorkoutClick()">
          Done
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function renderWorkoutCompleteView(session, summaryData) {
  const s = summaryData || getWorkoutSessionSummaryMetrics(session);
  return `
    <div class="runner-complete-screen animate-fade-in" id="workout-complete-container">
      <div class="runner-complete-modal-card" style="box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        <div class="runner-complete-icon-wrap">
          ${renderIcon('award', 'cx-icon cx-icon-lg')}
        </div>
        <span class="runner-complete-kicker">SESSION TERMINATED · FINISHED</span>
        <h1 class="runner-complete-title">WORKOUT COMPLETE</h1>
        <h2 class="runner-complete-subtitle">${s.workoutName || 'Workout'}</h2>

        <div class="runner-complete-metrics-grid">
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Duration</span>
            <span class="runner-complete-metric-val mono">${s.durationFormatted || '00:00'}</span>
          </div>
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Exercises</span>
            <span class="runner-complete-metric-val mono">${s.exercisesCompleted || 0}/${s.totalExercises || 0}</span>
          </div>
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Sets Done</span>
            <span class="runner-complete-metric-val mono" style="color:#10b981;">${s.setsCompleted || 0}</span>
          </div>
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Sets Skipped</span>
            <span class="runner-complete-metric-val mono" style="color:${s.setsSkipped > 0 ? '#f59e0b' : '#8a8d9f'};">${s.setsSkipped || 0}</span>
          </div>
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Volume</span>
            <span class="runner-complete-metric-val mono">${s.volumeText || 'Bodyweight'}</span>
          </div>
          <div class="runner-complete-metric-item">
            <span class="runner-complete-metric-label">Calories</span>
            <span class="runner-complete-metric-val mono" style="color:#f97316;">${s.calories || 0} kcal</span>
          </div>
          <div class="runner-complete-metric-item" style="grid-column: span 3; padding-top:4px;">
            <span class="runner-complete-metric-label">Completion: ${s.completionPercentage || 0}%</span>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; margin-top:2px;">
              <div style="width:${s.completionPercentage || 0}%; height:100%; background:linear-gradient(90deg, #7c5cfc, #10b981); border-radius:3px;"></div>
            </div>
          </div>
        </div>

        <div class="runner-complete-summary-box">
          <div class="runner-complete-summary-row">
            <span class="runner-complete-summary-title">Completed:</span>
            <span class="runner-complete-summary-value">${s.completedSummary || '0 sets'}</span>
          </div>
          <div class="runner-complete-summary-row">
            <span class="runner-complete-summary-title">Skipped:</span>
            <span class="runner-complete-summary-value">${s.skippedSummary || 'None'}</span>
          </div>
          ${s.bestPerformance ? `
            <div class="runner-complete-summary-row is-pr">
              <span class="runner-complete-summary-title">🏆 Best Performance / PR:</span>
              <span class="runner-complete-summary-value" style="color:#facc15;">${s.bestPerformance}</span>
            </div>
          ` : ''}
        </div>

        <div class="runner-complete-actions">
          <button class="runner-complete-btn-secondary" type="button" onclick="handleViewSummaryClick()">
            View Workout Summary
          </button>
          <button class="runner-complete-btn-primary" type="button" onclick="handleDoneWorkoutClick()">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

function closeWorkoutCompleteModal() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const modal = document.getElementById('workout-complete-modal');
  if (modal && modal.remove) modal.remove();
}

async function finalizeAndPersistCompletedSession() {
  const session = getActiveSession();
  if (!session) return;

  const durationSec = session.duration_sec != null ? session.duration_sec : getSessionElapsedSec(session);
  const isEarly = session.status === 'completed_early' || session.is_early_finish;
  const now = Date.now();

  const sessionPayload = {
    id: session.id,
    routine: session.routine || session.workout_name,
    workout_id: session.workout_id,
    started_at: new Date(session.startTime || session.startedAt || now).toISOString(),
    completed_at: isEarly ? null : (session.completed_at || new Date(now).toISOString()),
    duration_sec: durationSec,
    warmup_duration_sec: session.warmup_duration_sec || 0,
    main_duration_sec: session.main_duration_sec || durationSec,
    cooldown_duration_sec: session.cooldown_duration_sec || 0,
    warmup_status: session.warmup_status || 'none',
    cooldown_status: session.cooldown_status || 'none',
    status: isEarly ? 'completed_early' : 'completed',
    is_completed: !isEarly,
    is_early_finish: !!isEarly,
    exercises: session.exercisesSnapshot || []
  };

  const prefix = typeof LS_SESSION_PREFIX !== 'undefined' ? LS_SESSION_PREFIX : 'cx_session_';
  try {
    localStorage.setItem(`${prefix}${session.id}`, JSON.stringify(sessionPayload));
  } catch (e) {}

  try {
    if (typeof API !== 'undefined' && API.createWorkoutSession) {
      await API.createWorkoutSession(sessionPayload);
    }
  } catch (e) {
    console.warn('API session sync failed:', e);
  }

  if (typeof lsSyncPending === 'function') {
    lsSyncPending();
  }

  saveActiveSession(null);
}

async function handleViewSummaryClick() {
  closeWorkoutCompleteModal();
  await finalizeAndPersistCompletedSession();
  if (typeof openHistoryListView === 'function') {
    await openHistoryListView();
  } else {
    state.view = 'history_list';
    window.location.hash = 'history';
    if (typeof loadWorkoutSessions === 'function') {
      await loadWorkoutSessions();
    }
    render();
  }
}

async function handleDoneWorkoutClick() {
  closeWorkoutCompleteModal();
  await finalizeAndPersistCompletedSession();
  state.view = 'dashboard';
  window.location.hash = 'dashboard';
  if (typeof loadDashboardSummary === 'function') {
    await loadDashboardSummary();
  }
  render();
}

// ─── Workout Hold & Rest Timer Management ────────────────────────────────────

function getNextSetDescription(session, exIdx, setIdx) {
  if (!session || !session.exercises) return '';
  const currentEx = session.exercises[exIdx];
  if (!currentEx) return '';

  // 1. Check for remaining uncompleted set in current exercise
  const nextSetInCur = currentEx.sets.findIndex((s, i) => i > setIdx && !s.completed);
  if (nextSetInCur !== -1) {
    return `Next: Set ${nextSetInCur + 1} · ${currentEx.exercise_name}`;
  }

  // 2. Check for next uncompleted exercise downstream
  const nextExIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed));
  if (nextExIdx !== -1) {
    const nextEx = session.exercises[nextExIdx];
    const nextSetIdx = nextEx.sets.findIndex(s => !s.completed);
    const setNum = nextSetIdx !== -1 ? nextSetIdx + 1 : 1;
    return `Next: Set ${setNum} · ${nextEx.exercise_name}`;
  }

  // 3. Check for any uncompleted exercise earlier in the session
  const anyExIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));
  if (anyExIdx !== -1) {
    const anyEx = session.exercises[anyExIdx];
    const anySetIdx = anyEx.sets.findIndex(s => !s.completed);
    const setNum = anySetIdx !== -1 ? anySetIdx + 1 : 1;
    return `Next: Set ${setNum} · ${anyEx.exercise_name}`;
  }

  // 4. All sets across all exercises are complete
  if (session.cooldown && session.cooldown.length > 0 && session.cooldown_status !== 'completed' && session.cooldown_status !== 'skipped') {
    return 'Next: Cool-down Recovery';
  }
  return 'Next: Complete Session';
}

function startWorkoutHold(exIdx, setIdx) {
  let session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;

  // Stop any active rest timer when athlete starts holding
  stopWorkoutRest();
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  // If another hold timer was active, stop it cleanly
  if (_workoutHoldInterval) {
    stopWorkoutHold(false);
  }

  const ex = session.exercises[exIdx];
  const set = ex.sets[setIdx];
  const targetVal = Number(set.target_val || ex.duration_sec || 30);
  const now = Date.now();

  session.activeExerciseIndex = exIdx;
  session.activeSetIndex = setIdx;
  _selectedWorkoutExIdx = exIdx;
  session.mainWorkoutSubState = (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.SET_ACTIVE : 'SET_ACTIVE');

  session.holdTimer = {
    isRunning: true,
    exIdx,
    setIdx,
    targetSec: targetVal,
    elapsedSec: 0,
    startedAt: now,
    pausedAt: null
  };

  _workoutHoldState = {
    exIdx,
    setIdx,
    targetVal,
    startedAt: now,
    elapsed: 0,
    beepsPlayed: {},
  };

  _workoutHoldInterval = setInterval(() => {
    if (!_workoutHoldState.startedAt) return;
    const curNow = Date.now();
    const elapsed = Math.floor((curNow - _workoutHoldState.startedAt) / 1000);
    _workoutHoldState.elapsed = elapsed;
    const curSess = getActiveSession();
    if (curSess && curSess.holdTimer) {
      curSess.holdTimer.elapsedSec = elapsed;
    }

    const remaining = _workoutHoldState.targetVal - elapsed;
    if (remaining >= 1 && remaining <= 3 && !_workoutHoldState.beepsPlayed[remaining]) {
      _workoutHoldState.beepsPlayed[remaining] = true;
      cueCountdownTick(remaining);
    } else if (remaining === 0 && !_workoutHoldState.beepsPlayed[0]) {
      _workoutHoldState.beepsPlayed[0] = true;
      cueTimerComplete();
      if (isAutoAdvanceEnabled()) {
        triggerTimedAutoAdvance(() => stopWorkoutHold(true), 'main');
      }
    }

    const digitsEl = document.getElementById('workout-active-counter-digits');
    if (digitsEl) {
      digitsEl.textContent = elapsed;
    }
    const btn = document.getElementById('workout-active-hold-btn');
    if (btn) {
      btn.innerHTML = `${renderIcon('pause', 'cx-icon cx-icon-xs cx-icon-inline')} STOP HOLD (${elapsed}s)`;
    }
  }, 200);

  saveActiveSession(session);
  render();
}

function stopWorkoutHold(saveAndComplete = true) {
  cancelAutoAdvance(false);
  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
  }

  const { exIdx, setIdx, startedAt } = _workoutHoldState;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0, targetVal: 30, beepsPlayed: {} };

  const session = getActiveSession();
  if (session && session.holdTimer) {
    session.holdTimer = { isRunning: false, exIdx: null, setIdx: null, targetSec: 30, elapsedSec: 0, startedAt: null, pausedAt: null };
  }

  if (saveAndComplete && exIdx !== null && setIdx !== null && session && session.exercises[exIdx] && session.exercises[exIdx].sets[setIdx]) {
    const set = session.exercises[exIdx].sets[setIdx];
    const finalVal = Math.max(elapsed, 1);
    set.actual_val = finalVal;
    set.completed = true;
    set.completed_at = new Date().toISOString();
    set.skipped = false;
    set.skipped_at = null;

    cueHoldSave();
    if (typeof checkAndCelebratePR === 'function') {
      checkAndCelebratePR(session.exercises[exIdx].exercise_id, finalVal, set.weight_kg);
    }

    const currentEx = session.exercises[exIdx];
    const isExDone = currentEx.sets.every(s => s.completed || s.skipped);
    currentEx.completed = isExDone;
    if (isExDone) {
      currentEx.completed_at = new Date().toISOString();
      cueExerciseComplete();
    } else {
      cueSetComplete();
    }

    const isEntireMainWorkoutDone = session.exercises.every(ex => ex.sets && ex.sets.every(s => s.completed || s.skipped));

    if (isEntireMainWorkoutDone) {
      const now = Date.now();
      session.mainStatus = 'COMPLETED';
      session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
      session.main_completed_at = new Date(now).toISOString();
      session.main_duration_sec = Math.max(0, Math.round((now - (session.main_started_at || session.startTime || now)) / 1000));

      cueExerciseComplete();
      showToast('Main Workout Complete! Ready for Cool Down');
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      render();
      return;
    }

    if (isExDone) {
      session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
      const nextUncompletedIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed && !s.skipped));
      let nextIdx = -1;
      if (nextUncompletedIdx !== -1) {
        nextIdx = nextUncompletedIdx;
      } else {
        const anyUncompletedIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed && !s.skipped));
        if (anyUncompletedIdx !== -1) {
          nextIdx = anyUncompletedIdx;
        }
      }
      if (nextIdx !== -1) {
        session.activeExerciseIndex = nextIdx;
        session.currentExerciseIndex = nextIdx;
        _selectedWorkoutExIdx = nextIdx;
        const nextEx = session.exercises[nextIdx];
        const nextFirstUnresolved = nextEx.sets ? nextEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
        session.activeSetIndex = nextFirstUnresolved !== -1 ? nextFirstUnresolved : 0;
        const nextCat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name) : null;
        const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
        setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
      }
    } else {
      const nextSetIdx = currentEx.sets.findIndex((s, i) => i > setIdx && !s.completed && !s.skipped);
      if (nextSetIdx !== -1) {
        session.activeSetIndex = nextSetIdx;
      }
      session.mainWorkoutSubState = 'SET_COMPLETED';
    }

    // Trigger Rest Countdown
    const restSec = currentEx.rest_sec || 90;
    if (restSec > 0) {
      session.mainWorkoutSubState = 'RESTING';
      const nextInfo = getNextSetDescription(session, exIdx, setIdx);
      const feedback = generateSetCompletionFeedback(session, exIdx, setIdx, finalVal);
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      startWorkoutRest(restSec, nextInfo, feedback);
      return;
    }
  }

  if (session) {
    syncAuthoritativeSessionState(session);
    saveActiveSession(session);
  }
  render();
}

function generateSetCompletionFeedback(session, exIdx, setIdx, actualVal) {
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return 'Solid set logged.';
  const currentEx = session.exercises[exIdx];
  const set = currentEx.sets[setIdx];
  const targetVal = set.target_val;
  const isHold = currentEx.exercise_type === 'duration';
  const unit = isHold ? 's' : ' reps';
  const remainingSets = currentEx.sets.filter((s, idx) => idx > setIdx && !s.completed).length;
  const diff = actualVal - targetVal;

  if (diff > 0) {
    if (remainingSets > 0) {
      return `+${diff} over target (${actualVal}${unit}) · ${remainingSets} sets remaining`;
    } else {
      return `+${diff} over target (${actualVal}${unit}) · All sets complete for ${currentEx.exercise_name}`;
    }
  } else if (diff === 0) {
    if (remainingSets > 0) {
      return `Target matched (${actualVal}${unit}) · ${remainingSets} sets remaining`;
    } else {
      return `Target matched (${actualVal}${unit}) · ${currentEx.exercise_name} complete`;
    }
  } else {
    if (remainingSets > 0) {
      return `Logged (${actualVal}/${targetVal}${unit}) · ${remainingSets} sets remaining`;
    } else {
      return `Logged (${actualVal}/${targetVal}${unit}) · ${currentEx.exercise_name} complete`;
    }
  }
}

function startWorkoutRest(sec, nextInfo = '', feedback = '') {
  // 1. Clean up any existing intervals and hold state before starting a new rest timer
  stopWorkoutHold(false);
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
  }

  if (!sec || sec <= 0) return;

  let session = getActiveSession();
  if (session) {
    ensureSessionStarted(session);
    session = getActiveSession();
    session.mainWorkoutSubState = (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.RESTING : 'RESTING');
    session.restTimer = {
      isRunning: true,
      durationSec: sec,
      remainingSec: sec,
      startedAt: Date.now(),
      pausedAt: null,
      nextInfo,
      feedback
    };
    saveActiveSession(session);
  }

  _workoutRestState = {
    active: true,
    completed: false,
    remaining: sec,
    total: sec,
    nextInfo: nextInfo,
    feedback: feedback,
  };

  _workoutRestInterval = setInterval(() => {
    const curSess = getActiveSession();
    if (curSess && (curSess.phaseState === 'PAUSED' || curSess.status === 'paused')) {
      return; // Freeze rest countdown while globally paused
    }

    if (!_workoutRestState.active) return;
    _workoutRestState.remaining--;

    if (curSess && curSess.restTimer) {
      curSess.restTimer.remainingSec = Math.max(0, _workoutRestState.remaining);
    }

    const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;
    if (isLast3s) {
      cueTick();
    }

    if (_workoutRestState.remaining <= 0) {
      _workoutRestState.remaining = 0;
      _workoutRestState.completed = true;
      if (_workoutRestInterval) {
        clearInterval(_workoutRestInterval);
        _workoutRestInterval = null;
      }
      if (curSess && curSess.restTimer) {
        curSess.restTimer.isRunning = false;
        curSess.restTimer.remainingSec = 0;
        saveActiveSession(curSess);
      }
      cueRestEnd();
      render();
      return;
    }

    if (typeof document !== 'undefined') {
      const timerEl = document.getElementById('workout-rest-timer-val');
      if (timerEl) {
        timerEl.textContent = fmtSecs(Math.max(0, _workoutRestState.remaining));
        if (isLast3s) timerEl.classList.add('pulse-digits');
        else timerEl.classList.remove('pulse-digits');
      }
      const dialCircleEl = document.getElementById('workout-rest-dial-circle');
      if (dialCircleEl && _workoutRestState.total > 0) {
        const fraction = Math.max(0, Math.min(1, _workoutRestState.remaining / _workoutRestState.total));
        const dashOffset = (351.8 * (1 - fraction)).toFixed(1);
        dialCircleEl.style.strokeDashoffset = `${dashOffset}`;
      }
    }
  }, 1000);

  render();
}

function stopWorkoutRest() {
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
  }
  _workoutRestState.active = false;
  _workoutRestState.completed = false;

  const session = getActiveSession();
  if (session) {
    if (session.restTimer) {
      session.restTimer.isRunning = false;
      session.restTimer.remainingSec = 0;
    }
    if (session.phase === (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.MAIN_WORKOUT : 'MAIN_WORKOUT') || session.currentPhase === 'main') {
      session.mainWorkoutSubState = (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.SET_ACTIVE : 'SET_ACTIVE');
      const curExIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx || 0);
      const curEx = session.exercises ? session.exercises[curExIdx] : null;
      if (curEx && curEx.sets) {
        const nextSetIdx = curEx.sets.findIndex(s => !s.completed && !s.skipped);
        if (nextSetIdx !== -1) {
          session.activeSetIndex = nextSetIdx;
        } else {
          const nextExIdx = session.exercises.findIndex((ex, idx) => idx > curExIdx && ex.sets.some(s => !s.completed && !s.skipped));
          if (nextExIdx !== -1) {
            session.activeExerciseIndex = nextExIdx;
            session.activeSetIndex = 0;
            _selectedWorkoutExIdx = nextExIdx;
          }
        }
      }
    }
    saveActiveSession(session);
  }

  render();
}

function adjustWorkoutRest(deltaSec) {
  if (!_workoutRestState.active && !_workoutRestState.completed) return;
  const currentRemaining = _workoutRestState.remaining || 0;
  const newRemaining = currentRemaining + deltaSec;

  if (newRemaining <= 0) {
    _workoutRestState.remaining = 0;
    _workoutRestState.completed = true;
    if (_workoutRestInterval) {
      clearInterval(_workoutRestInterval);
      _workoutRestInterval = null;
    }
    const session = getActiveSession();
    if (session && session.restTimer) {
      session.restTimer.isRunning = false;
      session.restTimer.remainingSec = 0;
      saveActiveSession(session);
    }
    cueRestEnd();
    render();
    return;
  }

  _workoutRestState.remaining = newRemaining;
  _workoutRestState.total = Math.max(_workoutRestState.total, newRemaining);
  _workoutRestState.completed = false;
  _workoutRestState.active = true;

  const session = getActiveSession();
  if (session && session.restTimer) {
    session.restTimer.remainingSec = newRemaining;
    session.restTimer.durationSec = _workoutRestState.total;
    session.restTimer.isRunning = true;
    saveActiveSession(session);
  }

  // Ensure interval is running if not paused
  const isPaused = session && (session.phaseState === 'PAUSED' || session.status === 'paused');
  if (!_workoutRestInterval && !isPaused) {
    _workoutRestInterval = setInterval(() => {
      const curSess = getActiveSession();
      if (curSess && (curSess.phaseState === 'PAUSED' || curSess.status === 'paused')) return;
      if (!_workoutRestState.active) return;
      _workoutRestState.remaining--;
      if (curSess && curSess.restTimer) curSess.restTimer.remainingSec = Math.max(0, _workoutRestState.remaining);

      const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;
      if (isLast3s) cueTick();

      if (_workoutRestState.remaining <= 0) {
        _workoutRestState.remaining = 0;
        _workoutRestState.completed = true;
        if (_workoutRestInterval) {
          clearInterval(_workoutRestInterval);
          _workoutRestInterval = null;
        }
        if (curSess && curSess.restTimer) {
          curSess.restTimer.isRunning = false;
          curSess.restTimer.remainingSec = 0;
          saveActiveSession(curSess);
        }
        cueRestEnd();
        render();
        return;
      }

      if (typeof document !== 'undefined') {
        const timerEl = document.getElementById('workout-rest-timer-val');
        if (timerEl) {
          timerEl.textContent = fmtSecs(Math.max(0, _workoutRestState.remaining));
          if (isLast3s) timerEl.classList.add('pulse-digits');
          else timerEl.classList.remove('pulse-digits');
        }
        const dialCircleEl = document.getElementById('workout-rest-dial-circle');
        if (dialCircleEl && _workoutRestState.total > 0) {
          const fraction = Math.max(0, Math.min(1, _workoutRestState.remaining / _workoutRestState.total));
          const dashOffset = (351.8 * (1 - fraction)).toFixed(1);
          dialCircleEl.style.strokeDashoffset = `${dashOffset}`;
        }
      }
    }, 1000);
  }

  render();
}

function renderWorkoutRestView(session) {
  const mainList = getMainWorkoutExercises(session);
  const exIdx = session.activeExerciseIndex != null && session.activeExerciseIndex < mainList.length
    ? session.activeExerciseIndex
    : (_selectedWorkoutExIdx != null && _selectedWorkoutExIdx < mainList.length ? _selectedWorkoutExIdx : 0);
  const currentEx = mainList[exIdx] || { exercise_name: 'Main Exercise', sets: [{ target_val: 10, actual_val: 10, completed: false }] };
  const totalExCount = mainList.length;

  const curSetIdx = currentEx.sets ? currentEx.sets.findIndex(s => !s.completed && !s.skipped) : -1;
  const activeSetIdx = session.activeSetIndex != null && currentEx.sets && currentEx.sets[session.activeSetIndex] && !currentEx.sets[session.activeSetIndex].completed && !currentEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (curSetIdx !== -1 ? curSetIdx : (currentEx.sets ? currentEx.sets.length - 1 : 0));
  const totalSets = currentEx.sets ? currentEx.sets.length : 1;

  const remaining = _workoutRestState.remaining != null ? _workoutRestState.remaining : (session.restTimer ? session.restTimer.remainingSec : 0);
  const total = _workoutRestState.total > 0 ? _workoutRestState.total : (session.restTimer?.durationSec || 90);
  const isRestComplete = _workoutRestState.completed || remaining <= 0;
  const isWarning = remaining <= 10 && remaining > 0;

  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;

  const depletingPct = total > 0 ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100))) : 0;
  const nextInfo = _workoutRestState.nextInfo || getNextSetDescription(session, exIdx, activeSetIdx);

  const completedMainSetsInEx = currentEx.sets ? currentEx.sets.filter(s => s.completed).length : 0;

  return `
    <div class="runner-active-exercise-card runner-rest-morph-card runner-rest-dedicated-card animate-card-reveal">
      <!-- Mobile Top Bar Controls -->
      <div class="runner-card-top-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <button class="runner-card-back-btn" onclick="openExitWorkoutModal()" aria-label="Exit Workout" title="Exit Workout">
          ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
        </button>
        <div class="runner-card-title-group" style="text-align:center;">
          <span class="runner-card-phase-badge">REST INTERVAL</span>
          <h2 class="runner-card-title" style="font-size:14px; font-weight:700;">EXERCISE ${exIdx + 1} OF ${totalExCount}</h2>
        </div>
        <div class="runner-card-top-right" style="display:flex; align-items:center; gap:8px;">
          <span class="runner-card-timer mono" id="workout-elapsed-val">${fmtSecs(elapsedSec)}</span>
          <button class="runner-card-pause-btn ${isPaused ? 'is-paused' : ''}" type="button" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Workout' : 'Pause Workout'}" aria-label="${isPaused ? 'Resume Workout' : 'Pause Workout'}">
            ${renderIcon(isPaused ? 'play' : 'pause', 'cx-icon cx-icon-xs')}
          </button>
          <button class="runner-card-finish-btn" type="button" onclick="requestFinishWorkout()" title="Finish Workout">
            Finish
          </button>
        </div>
      </div>

      <!-- Top Rest Header -->
      <div class="runner-card-top-header-row">
        <div class="runner-card-header-left">
          <span class="runner-badge-phase-pill phase-rest">${isRestComplete ? 'Rest Complete' : 'REST'}</span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" onclick="stopWorkoutRest()" title="Skip rest countdown">
          Skip Rest
        </button>
      </div>

      <!-- Depleting 4px Progress Bar -->
      <div class="runner-rest-depleting-track">
        <div class="runner-rest-depleting-fill ${isWarning ? 'is-warning' : ''}" style="width: ${depletingPct}%;"></div>
      </div>

      <!-- Hero Monospace Countdown (56px) -->
      <div class="runner-rest-hero-countdown">
        <span class="runner-rest-hero-digits mono-hero ${isWarning ? 'pulse-digits' : ''}" id="workout-rest-timer-val">
          ${isRestComplete ? '0' : remaining}
        </span>
        <span class="runner-rest-hero-unit">${isRestComplete ? 'READY FOR NEXT SET' : 'SECONDS REMAINING'}</span>
      </div>

      <!-- Next Set Context Preview Zone -->
      <div class="runner-rest-next-preview-card">
        <span class="runner-rest-next-tag">NEXT SET</span>
        <div class="runner-rest-next-name">Next: Set ${activeSetIdx + 1} · ${currentEx.exercise_name}</div>
        <div class="runner-rest-next-meta">Exercise ${exIdx + 1} of ${totalExCount} · ${completedMainSetsInEx} of ${totalSets} sets completed</div>
      </div>

      <!-- Quick Rest Adjust Steppers (-15s / +15s) -->
      ${!isRestComplete ? `
        <div class="runner-rest-adjust-row">
          <button class="btn btn-secondary btn-sm" type="button" onclick="adjustWorkoutRest(-15)">-15 sec</button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="togglePauseWorkoutSession()">
            ${renderIcon('pause', 'cx-icon cx-icon-xs cx-icon-inline')} Pause
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="adjustWorkoutRest(15)">+15 sec</button>
        </div>
      ` : `
        <div class="runner-cta-zone" style="margin-top: 16px;">
          <button class="btn btn-primary btn-hero runner-cta-btn" type="button" onclick="startMainWorkoutSet()">
            <span>Start Set</span>
            ${renderIcon('arrowRight', 'cx-icon cx-icon-sm cx-icon-inline')}
          </button>
        </div>
      `}
    </div>
  `;
}

function adjustWorkoutSetActual(exIdx, setIdx, delta) {
  let session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  ensureSessionStarted(session);
  session = getActiveSession();
  const set = session.exercises[exIdx].sets[setIdx];
  const cur = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
  set.actual_val = Math.max(0, cur + delta);
  saveActiveSession(session);
  render();
}

function setWorkoutSetActualDirect(exIdx, setIdx, exactVal) {
  let session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  ensureSessionStarted(session);
  session = getActiveSession();
  const num = Number(exactVal);
  if (isNaN(num) || num < 0) return;
  session.exercises[exIdx].sets[setIdx].actual_val = num;
  saveActiveSession(session);

  if (typeof beep === 'function') beep(740, 40, 0.25, 'sine');
  if (typeof vibrate === 'function') vibrate(30);

  render();
}

function updateWorkoutSetWeight(exIdx, setIdx, val) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const num = parseFloat(val);
  session.exercises[exIdx].sets[setIdx].weight_kg = isNaN(num) || num <= 0 ? null : num;
  saveActiveSession(session);
  render();
}

function updateWorkoutSetRPE(exIdx, setIdx, val) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const num = parseInt(val, 10);
  session.exercises[exIdx].sets[setIdx].rpe = isNaN(num) || num <= 0 ? null : num;
  saveActiveSession(session);
}

function handleCompleteSetClick(event, exIdx, setIdx) {
  const btn = event.currentTarget || (event.target && event.target.closest ? event.target.closest('.runner-complete-action-btn') : null);
  if (btn) {
    btn.classList.add('btn-pop');
  }
  setTimeout(() => {
    toggleWorkoutSet(exIdx, setIdx);
  }, 100);
}

function toggleWorkoutSet(exIdx, setIdx) {
  let session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const set = session.exercises[exIdx].sets[setIdx];
  const willBeCompleted = !set.completed;
  set.completed = willBeCompleted;
  set.completed_at = willBeCompleted ? new Date().toISOString() : null;
  if (willBeCompleted) {
    set.skipped = false;
    set.skipped_at = null;
  } else {
    set.skipped = false;
    set.skipped_at = null;
  }

  session.activeExerciseIndex = exIdx;
  session.currentExerciseIndex = exIdx;
  session.activeSetIndex = setIdx;
  _selectedWorkoutExIdx = exIdx;

  const currentEx = session.exercises[exIdx];
  const isExDone = currentEx.sets.every(s => s.completed || s.skipped);
  const hasCompletedSets = currentEx.sets.some(s => s.completed);
  currentEx.completed = isExDone && hasCompletedSets;
  currentEx.skipped = isExDone && !hasCompletedSets;
  currentEx.completed_at = currentEx.completed ? new Date().toISOString() : null;
  currentEx.skipped_at = currentEx.skipped ? new Date().toISOString() : null;

  if (currentEx.completed) {
    cueExerciseComplete();
  } else if (willBeCompleted) {
    cueSetComplete();
  }

  if (willBeCompleted) {
    const actualVal = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
    if (typeof checkAndCelebratePR === 'function') {
      checkAndCelebratePR(session.exercises[exIdx].exercise_id, actualVal, set.weight_kg);
    }

    // Check entire main workout completion
    const isEntireMainWorkoutDone = session.exercises.every(ex => ex.sets && ex.sets.every(s => s.completed || s.skipped));
    if (isEntireMainWorkoutDone) {
      const now = Date.now();
      session.mainStatus = 'COMPLETED';
      session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
      session.main_completed_at = new Date(now).toISOString();
      session.main_duration_sec = Math.max(0, Math.round((now - (session.main_started_at || session.startTime || now)) / 1000));

      if (session.cooldown && session.cooldown.length > 0 && session.cooldownStatus !== 'SKIPPED' && session.cooldown_status !== 'skipped' && session.cooldown_status !== 'completed' && session.cooldownStatus !== 'COMPLETED') {
        stopWorkoutRest();
        session.cooldown_started_at = now;
        session.phase = 'COOLDOWN';
        session.currentPhase = 'cooldown';
        session.cooldownStatus = 'ACTIVE';
        session.cooldown_status = 'in_progress';
        session.cooldownIndex = 0;
        session.cooldown_idx = 0;
        const curCd = session.cooldown[0];
        const isHoldCd = curCd?.exercise_type === 'duration';
        const dur = curCd?.duration_sec || 30;
        session.movementTimer = {
          isRunning: isHoldCd,
          durationSec: dur,
          remainingSec: dur,
          startedAt: isHoldCd ? Date.now() : null,
          pausedAt: null
        };
        session.phaseTimer = {
          isRunning: isHoldCd,
          duration: dur,
          remaining: dur,
          startedAt: isHoldCd ? Date.now() : null,
          pausedMs: 0
        };
        cueExerciseComplete();
        showToast('Main Workout Complete! Entering Cool-down');
        syncAuthoritativeSessionState(session);
        saveActiveSession(session);
        render();
        return;
      }

      cueExerciseComplete();
      showToast('Main Workout Complete! Ready for Cool Down');
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      render();
      return;
    }

    if (isExDone) {
      session.mainWorkoutSubState = 'EXERCISE_COMPLETED';
      const nextUncompletedIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed && !s.skipped));
      let nextIdx = -1;
      if (nextUncompletedIdx !== -1) {
        nextIdx = nextUncompletedIdx;
      } else {
        const anyUncompletedIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed && !s.skipped));
        if (anyUncompletedIdx !== -1) {
          nextIdx = anyUncompletedIdx;
        }
      }
      if (nextIdx !== -1) {
        session.activeExerciseIndex = nextIdx;
        session.currentExerciseIndex = nextIdx;
        _selectedWorkoutExIdx = nextIdx;
        const nextEx = session.exercises[nextIdx];
        const nextFirstUnresolved = nextEx.sets ? nextEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
        session.activeSetIndex = nextFirstUnresolved !== -1 ? nextFirstUnresolved : 0;
        const nextCat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name) : null;
        const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
        setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
      }
    } else {
      const nextSetIdx = currentEx.sets.findIndex((s, i) => i > setIdx && !s.completed && !s.skipped);
      if (nextSetIdx !== -1) {
        session.activeSetIndex = nextSetIdx;
      }
      session.mainWorkoutSubState = 'SET_COMPLETED';
    }

    // Start Rest Timer for this exercise with contextual feedback
    const restSec = currentEx.rest_sec || 90;
    if (restSec > 0) {
      session.mainWorkoutSubState = 'RESTING';
      const nextInfo = getNextSetDescription(session, exIdx, setIdx);
      const feedback = generateSetCompletionFeedback(session, exIdx, setIdx, actualVal);
      syncAuthoritativeSessionState(session);
      saveActiveSession(session);
      startWorkoutRest(restSec, nextInfo, feedback);
      return;
    }
  } else {
    // Unchecking set
    const currentEx = session.exercises[exIdx];
    currentEx.completed = false;
    currentEx.completed_at = null;
    session.mainStatus = 'ACTIVE';
    session.main_completed_at = null;
    stopWorkoutRest();
    session.mainWorkoutSubState = 'SET_ACTIVE';
  }

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

async function finishWorkoutSession(isEarly = false) {
  const session = getActiveSession();
  if (!session) return;

  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0, targetVal: 30, beepsPlayed: {} };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, completed: false, remaining: 0, total: 0, nextInfo: '', feedback: '' };
  }
  if (_workoutPhaseTimerInterval) {
    clearInterval(_workoutPhaseTimerInterval);
    _workoutPhaseTimerInterval = null;
  }
  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }
  if (typeof releaseScreenWakeLock === 'function') {
    releaseScreenWakeLock();
  }

  let totalSets = 0;
  let completedSets = 0;
  let totalReps = 0;
  let totalHoldSec = 0;

  const durationSec = getSessionElapsedSec(session);
  const now = Date.now();
  session.endTime = now;
  session.completed_at = isEarly ? null : new Date(now).toISOString();
  session.duration_sec = durationSec;
  session.status = isEarly ? 'completed_early' : 'completed';
  session.is_early_finish = !!isEarly;
  session.phase = (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.COMPLETED : 'COMPLETED');
  session.phaseState = (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.COMPLETED : 'COMPLETED');
  session.currentPhase = 'completed';

  // 1. Log Warm-up items if completed
  if (session.warmup && session.warmup.length > 0) {
    if (session.warmup_status === 'completed' || session.warmupStatus === 'COMPLETED' || session.warmup.some(w => w.completed)) {
      for (const wEx of session.warmup) {
        if (wEx.completed) {
          const isHold = wEx.exercise_type === 'duration';
          const actual = (wEx.actual_val !== null && wEx.actual_val !== undefined && wEx.actual_val !== '')
            ? Number(wEx.actual_val)
            : (wEx.duration_sec || wEx.reps || (isHold ? 30 : 10));

          const logPayload = {
            exercise_id: wEx.exercise_id,
            timestamp: wEx.completed_at || session.completed_at || new Date().toISOString(),
            session_uuid: session.id,
            client_uuid: wEx.client_uuid || newUUID(),
            phase: 'warmup',
            duration_sec: isHold ? actual : null,
            reps: isHold ? null : actual,
            sets: 1
          };
          if (isHold) totalHoldSec += actual;
          else totalReps += actual;
          lsWriteLog(logPayload);
        }
      }
    }
  }

  // 2. Log Main workout sets
  if (session.exercises) {
    for (const ex of session.exercises) {
      const isHold = ex.exercise_type === 'duration';
      if (ex.sets) {
        for (const set of ex.sets) {
          totalSets++;
          if (set.completed) {
            completedSets++;
            const actual = (set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '')
              ? Number(set.actual_val)
              : (isHold ? 0 : set.target_val);

            const logPayload = {
              exercise_id: ex.exercise_id,
              timestamp: set.completed_at || session.completed_at || new Date().toISOString(),
              session_uuid: session.id,
              client_uuid: set.client_uuid || newUUID(),
              phase: 'main',
            };

            if (isHold) {
              totalHoldSec += actual;
              logPayload.duration_sec = actual;
            } else {
              totalReps += actual;
              logPayload.reps = actual;
            }

            if (set.weight_kg != null && set.weight_kg !== '') logPayload.weight_kg = Number(set.weight_kg);
            if (set.rpe != null && set.rpe !== '') logPayload.rpe = Number(set.rpe);

            lsWriteLog(logPayload);
          }
        }
      }
    }
  }

  // 3. Log Cool-down items if completed
  if (session.cooldown && session.cooldown.length > 0) {
    if (session.cooldown_status === 'completed' || session.cooldownStatus === 'COMPLETED' || session.cooldown.some(c => c.completed)) {
      for (const cEx of session.cooldown) {
        if (cEx.completed) {
          const isHold = cEx.exercise_type === 'duration';
          const actual = (cEx.actual_val !== null && cEx.actual_val !== undefined && cEx.actual_val !== '')
            ? Number(cEx.actual_val)
            : (cEx.duration_sec || cEx.reps || (isHold ? 30 : 10));

          const logPayload = {
            exercise_id: cEx.exercise_id,
            timestamp: cEx.completed_at || session.completed_at || new Date().toISOString(),
            session_uuid: session.id,
            client_uuid: cEx.client_uuid || newUUID(),
            phase: 'cooldown',
            duration_sec: isHold ? actual : null,
            reps: isHold ? null : actual,
            sets: 1
          };
          if (isHold) totalHoldSec += actual;
          else totalReps += actual;
          lsWriteLog(logPayload);
        }
      }
    }
  }

  session.total_sets = totalSets;
  session.completed_sets = completedSets;

  // Assemble full exercise snapshot for backend persistence
  const assembledSnapshotExercises = [];
  if (session.warmup && session.warmup.length > 0) {
    session.warmup.forEach(w => assembledSnapshotExercises.push({
      exercise_id: w.exercise_id,
      exercise_name: w.exercise_name,
      phase: 'warmup',
      exercise_type: w.exercise_type,
      skipped: !!w.skipped,
      sets: [{ set_num: 1, target_val: w.target_val, actual_val: w.actual_val, completed: !!w.completed, skipped: !!w.skipped }]
    }));
  }
  if (session.exercises) {
    session.exercises.forEach(m => {
      const isExSkipped = !!m.skipped || (m.sets && m.sets.every(s => s.skipped && !s.completed));
      assembledSnapshotExercises.push({
        exercise_id: m.exercise_id,
        exercise_name: m.exercise_name,
        phase: 'main',
        exercise_type: m.exercise_type,
        skipped: isExSkipped,
        sets: (m.sets || []).map(s => ({
          set_num: s.set_num,
          target_val: s.target_val,
          actual_val: s.actual_val,
          completed: !!s.completed,
          skipped: !!s.skipped,
          weight_kg: s.weight_kg,
          rpe: s.rpe
        }))
      });
    });
  }
  if (session.cooldown && session.cooldown.length > 0) {
    session.cooldown.forEach(c => assembledSnapshotExercises.push({
      exercise_id: c.exercise_id,
      exercise_name: c.exercise_name,
      phase: 'cooldown',
      exercise_type: c.exercise_type,
      skipped: !!c.skipped,
      sets: [{ set_num: 1, target_val: c.target_val, actual_val: c.actual_val, completed: !!c.completed, skipped: !!c.skipped }]
    }));
  }

  if (session.cooldown_started_at && (!session.cooldown_duration_sec || session.cooldown_duration_sec === 0)) {
    session.cooldown_duration_sec = Math.max(0, Math.min(durationSec, Math.round((now - session.cooldown_started_at) / 1000)));
  }
  const warmupDur = session.warmup_duration_sec || 0;
  const cooldownDur = session.cooldown_duration_sec || 0;
  if (!session.main_duration_sec || session.main_duration_sec === 0) {
    session.main_duration_sec = Math.max(0, durationSec - warmupDur - cooldownDur);
  }
  session.main_duration_sec = Math.min(session.main_duration_sec, durationSec);

  const sessionPayload = {
    id: session.id,
    routine: session.routine || session.workout_name,
    workout_id: session.workout_id,
    started_at: new Date(session.startTime || session.startedAt || now).toISOString(),
    completed_at: isEarly ? null : session.completed_at,
    duration_sec: durationSec,
    warmup_duration_sec: session.warmup_duration_sec || 0,
    main_duration_sec: session.main_duration_sec || durationSec,
    cooldown_duration_sec: session.cooldown_duration_sec || 0,
    warmup_status: session.warmup_status || 'none',
    cooldown_status: session.cooldown_status || 'none',
    status: isEarly ? 'completed_early' : 'completed',
    is_completed: !isEarly,
    is_early_finish: !!isEarly,
    exercises: assembledSnapshotExercises
  };

  session.exercisesSnapshot = assembledSnapshotExercises;
  syncAuthoritativeSessionState(session);
  const summaryData = getWorkoutSessionSummaryMetrics(session);
  session.summaryData = summaryData;

  // Persist locally immediately so refresh never loses the completed session
  const prefix = typeof LS_SESSION_PREFIX !== 'undefined' ? LS_SESSION_PREFIX : 'cx_session_';
  try {
    localStorage.setItem(`${prefix}${session.id}`, JSON.stringify(sessionPayload));
  } catch (e) {}

  saveActiveSession(session);
  if (typeof lsSyncPending === 'function') {
    lsSyncPending();
  }

  let summaryParts = [`${completedSets}/${totalSets} sets`];
  if (session.warmup && session.warmup.length > 0) {
    summaryParts.push(session.warmup_status === 'completed' ? 'Warm-up completed' : 'Warm-up skipped');
  }
  if (session.cooldown && session.cooldown.length > 0) {
    summaryParts.push(session.cooldown_status === 'completed' ? 'Cool-down completed' : 'Cool-down skipped');
  }

  if (isEarly) {
    showToast(`Workout Finished Early · ${summaryParts.join(' · ')} (${Math.round(durationSec / 60)}m)`);
  } else {
    showToast(`Workout Complete · ${summaryParts.join(' · ')} (${Math.round(durationSec / 60)}m)`);
  }

  renderWorkoutCompleteModal(summaryData);
  render();
}

function openDiscardWorkoutModal() {
  let modal = document.getElementById('discard-workout-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'discard-workout-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'discard-modal-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeDiscardWorkoutModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" onclick="event.stopPropagation()">
      <div class="modal-header discard-modal-header">
        <div class="discard-modal-title-group">
          <div class="discard-modal-icon-wrap">
            ${renderIcon('alert', 'cx-icon cx-icon-sm')}
          </div>
          <h2 class="modal-title" id="discard-modal-title">Discard this workout?</h2>
        </div>
        <button class="modal-close-btn" onclick="closeDiscardWorkoutModal()" aria-label="Cancel and close dialog" title="Close">
          ${renderIcon('x', 'cx-icon')}
        </button>
      </div>

      <div class="discard-modal-body">
        <p class="discard-modal-desc">
          Your logged sets from this session will be lost.
        </p>
      </div>

      <div class="discard-modal-actions">
        <button class="discard-modal-btn discard-modal-keep-btn" id="discard-modal-keep-btn" type="button" onclick="closeDiscardWorkoutModal()">
          Keep Workout
        </button>
        <button class="discard-modal-btn discard-modal-danger-btn" type="button" onclick="confirmDiscardWorkout()">
          Discard
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  const keepBtn = document.getElementById('discard-modal-keep-btn');
  if (keepBtn) {
    setTimeout(() => keepBtn.focus(), 50);
  }

  if (window._discardModalKeyHandler) {
    window.removeEventListener('keydown', window._discardModalKeyHandler);
  }
  window._discardModalKeyHandler = (e) => {
    if (e.key === 'Escape') {
      closeDiscardWorkoutModal();
    }
  };
  window.addEventListener('keydown', window._discardModalKeyHandler);
}

function closeDiscardWorkoutModal() {
  const modal = document.getElementById('discard-workout-modal');
  if (modal) {
    modal.remove();
  }
  if (window._discardModalKeyHandler) {
    window.removeEventListener('keydown', window._discardModalKeyHandler);
    window._discardModalKeyHandler = null;
  }
}

function confirmDiscardWorkout() {
  closeDiscardWorkoutModal();
  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0, targetVal: 30, beepsPlayed: {} };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, completed: false, remaining: 0, total: 0, nextInfo: '', feedback: '' };
  }
  if (_workoutPhaseTimerInterval) {
    clearInterval(_workoutPhaseTimerInterval);
    _workoutPhaseTimerInterval = null;
  }
  saveActiveSession(null);
  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }
  if (typeof releaseScreenWakeLock === 'function') {
    releaseScreenWakeLock();
  }
  showToast('Workout discarded');
  state.view = 'dashboard';
  window.location.hash = 'dashboard';
  render();
}

// ─── Finish Workout Confirmation Modal ──────────────────────────────────────

function requestFinishWorkout() {
  const session = getActiveSession();
  if (!session) return;

  const model = getWorkoutPhaseModel(session);
  const isAllDone = model && model.overall && model.overall.isCompleted;

  if (isAllDone) {
    finishWorkoutSession(false);
  } else {
    openConfirmFinishWorkoutModal(model);
  }
}

function openConfirmFinishWorkoutModal(model) {
  let modal = document.getElementById('confirm-finish-workout-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm-finish-workout-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-finish-modal-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeConfirmFinishWorkoutModal();
    };
    document.body.appendChild(modal);
  }

  const completedSets = model ? model.overall.completedSets : 0;
  const totalSets = model ? model.overall.totalSets : 0;

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:360px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <div style="width:44px; height:44px; border-radius:50%; background:rgba(124, 92, 252, 0.15); color:#a29bfe; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
        ${renderIcon('alertTriangle', 'cx-icon cx-icon-md')}
      </div>
      <h2 class="modal-title" id="confirm-finish-modal-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Finish Workout Early?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        ${completedSets} of ${totalSets} sets completed.
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" id="confirm-finish-continue-btn" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; cursor:pointer;" type="button" onclick="closeConfirmFinishWorkoutModal()">
          Continue Workout
        </button>
        <button class="btn" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#7c5cfc; color:#ffffff; border:none; box-shadow:0 4px 14px rgba(124,92,252,0.4); cursor:pointer;" type="button" onclick="confirmFinishAnyway()">
          Finish Anyway
        </button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
  const continueBtn = document.getElementById('confirm-finish-continue-btn');
  if (continueBtn) continueBtn.focus();
}

function closeConfirmFinishWorkoutModal() {
  const modal = document.getElementById('confirm-finish-workout-modal');
  if (modal) {
    modal.remove();
  }
}

function confirmFinishAnyway() {
  closeConfirmFinishWorkoutModal();
  finishWorkoutSession(true);
}


async function promoteProgression(exerciseId, nextId) {
  if (!confirm('Advance this exercise to the next progression tier in your routine levels?')) return;
  const leRows = state.levelExercises.filter(le => le.exercise_id === exerciseId);
  try {
    for (const le of leRows) {
      await API.updateLevelExercise(le.id, { exercise_id: nextId });
    }
    await loadLevel();
    await loadExercises();
    showToast('Progression advanced in Routine!');
    render();
  } catch (e) {
    showToast(`Promotion error: ${e.message}`, true);
  }
}

// ─── Phase: Athlete-First Workout Runner (Priority P0) ──────────────────────



function getExerciseContextualTip(ex) {
  if (!ex) return 'Focus on steady breathing and controlled movement through full range of motion.';

  const rawName = (ex.exercise_name || ex.name || '').toLowerCase().trim();
  if (EXERCISE_COACHING_TIPS[rawName]) {
    return EXERCISE_COACHING_TIPS[rawName];
  }

  // Check partial key matches
  for (const [key, tip] of Object.entries(EXERCISE_COACHING_TIPS)) {
    if (rawName.includes(key) || key.includes(rawName)) {
      return tip;
    }
  }

  // Check category keywords
  if (rawName.includes('split squat')) return 'Keep the front knee tracking naturally and drive through the mid-foot.';
  if (rawName.includes('lunge')) return 'Keep your torso controlled and take consistent stride lengths.';
  if (rawName.includes('plank')) return 'Brace your core and keep your hips aligned with your shoulders.';
  if (rawName.includes('pull-up') || rawName.includes('chin-up')) return 'Initiate the pull with your shoulder blades and drive your elbows down.';
  if (rawName.includes('push-up')) return 'Keep your core braced and lower with controlled elbow alignment.';
  if (rawName.includes('dip')) return 'Depress your shoulders away from your ears and control your descent depth.';
  if (rawName.includes('squat')) return 'Keep your chest tall and drive evenly through the mid-foot on each ascent.';
  if (rawName.includes('bridge')) return 'Drive through your heels and squeeze your glutes at full extension.';
  if (rawName.includes('hang')) return 'Relax your shoulders and breathe deeply to maintain a solid, steady grip.';
  if (rawName.includes('raise')) return 'Control the tempo on the way down and avoid using momentum to lift.';

  // If notes provide guidance
  if (ex.notes && typeof ex.notes === 'string' && ex.notes.trim().length > 8) {
    return ex.notes.trim().replace(/^Note:\s*/i, '');
  }

  // Neutral contextual fallbacks
  if (ex.exercise_type === 'duration' || ex.type === 'duration') {
    return 'Maintain consistent muscle tension and breathe rhythmically throughout the hold.';
  }
  return 'Maintain controlled tempo and focus on clean range of motion through each rep.';
}

function renderExerciseIllustrationSvg(ex) {
  const rawName = (ex?.exercise_name || ex?.name || '').toLowerCase().trim();
  const label = ex?.exercise_name || ex?.name || 'Exercise';

  // Base SVG wrapper attributes with unified 64x64 viewbox and consistent 2px stroke
  const svgOpen = `<svg class="runner-illustration-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label} form illustration">`;
  const svgClose = `</svg>`;

  // 1. Bulgarian Split Squat / Split Stance
  if (rawName.includes('split squat') || rawName.includes('bulgarian')) {
    return `${svgOpen}
      <line x1="6" y1="56" x2="58" y2="56" stroke="rgba(255,255,255,0.2)"/>
      <rect x="44" y="42" width="12" height="14" rx="2" stroke="rgba(255,255,255,0.3)"/>
      <circle cx="26" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="26" y1="20" x2="26" y2="36" stroke="#ffffff"/>
      <line x1="26" y1="25" x2="34" y2="32" stroke="rgba(255,255,255,0.6)"/>
      <polyline points="26,36 40,40 46,42" stroke="rgba(255,255,255,0.7)"/>
      <polyline points="26,36 18,44 19,56" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="19" cy="56" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 2. Lunges / Walking Lunges
  if (rawName.includes('lunge')) {
    return `${svgOpen}
      <line x1="6" y1="56" x2="58" y2="56" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="28" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="28" y1="20" x2="28" y2="36" stroke="#ffffff"/>
      <polyline points="28,36 18,44 18,56" stroke="var(--accent)" stroke-width="2.5"/>
      <polyline points="28,36 42,42 46,56" stroke="rgba(255,255,255,0.7)"/>
      <circle cx="18" cy="56" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 3. Pike Push-ups / Handstands / HSPU
  if (rawName.includes('pike') || rawName.includes('handstand') || rawName.includes('hspu')) {
    return `${svgOpen}
      <line x1="6" y1="56" x2="58" y2="56" stroke="rgba(255,255,255,0.2)"/>
      <line x1="22" y1="56" x2="22" y2="40" stroke="rgba(255,255,255,0.7)"/>
      <circle cx="22" cy="46" r="3.5" stroke="#ffffff"/>
      <polyline points="22,40 32,18 48,56" stroke="#ffffff"/>
      <circle cx="22" cy="38" r="4" fill="rgba(124,92,252,0.25)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 4. Push-ups / Diamond / Decline / Archer / Push Variations
  if (rawName.includes('push-up') || rawName.includes('pushup') || rawName.includes('press')) {
    return `${svgOpen}
      <line x1="6" y1="54" x2="58" y2="54" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="16" cy="30" r="3.5" stroke="#ffffff"/>
      <line x1="16" y1="34" x2="50" y2="50" stroke="#ffffff"/>
      <polyline points="22,37 26,46 24,54" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="24" cy="54" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 5. Dips / Triceps Dips / Ring Dips
  if (rawName.includes('dip')) {
    return `${svgOpen}
      <line x1="14" y1="36" x2="14" y2="56" stroke="rgba(255,255,255,0.3)"/>
      <line x1="50" y1="36" x2="50" y2="56" stroke="rgba(255,255,255,0.3)"/>
      <circle cx="32" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="32" y1="20" x2="32" y2="38" stroke="#ffffff"/>
      <polyline points="14,36 22,28 32,24" stroke="var(--accent)" stroke-width="2.2"/>
      <polyline points="50,36 42,28 32,24" stroke="var(--accent)" stroke-width="2.2"/>
      <polyline points="32,38 36,46 42,46" stroke="rgba(255,255,255,0.7)"/>
    ${svgClose}`;
  }

  // 6. Pull-ups / Chin-ups / Dead Hang
  if (rawName.includes('pull-up') || rawName.includes('pullup') || rawName.includes('chin') || rawName.includes('hang')) {
    return `${svgOpen}
      <line x1="8" y1="12" x2="56" y2="12" stroke="rgba(255,255,255,0.3)"/>
      <circle cx="22" cy="12" r="2" fill="var(--accent)" stroke="var(--accent)"/>
      <circle cx="42" cy="12" r="2" fill="var(--accent)" stroke="var(--accent)"/>
      <line x1="22" y1="12" x2="28" y2="22" stroke="rgba(255,255,255,0.7)"/>
      <line x1="42" y1="12" x2="36" y2="22" stroke="rgba(255,255,255,0.7)"/>
      <circle cx="32" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="32" y1="20" x2="32" y2="38" stroke="#ffffff"/>
      <path d="M26,26 Q32,23 38,26" stroke="var(--accent)" stroke-width="2"/>
      <line x1="32" y1="38" x2="30" y2="54" stroke="rgba(255,255,255,0.6)"/>
      <line x1="32" y1="38" x2="34" y2="54" stroke="rgba(255,255,255,0.6)"/>
    ${svgClose}`;
  }

  // 7. Rows / Inverted Rows / Australian Pull-ups / Face Pulls / Y-raises
  if (rawName.includes('row') || rawName.includes('face pull') || rawName.includes('raise') || rawName.includes('angel')) {
    return `${svgOpen}
      <line x1="16" y1="18" x2="48" y2="18" stroke="rgba(255,255,255,0.3)"/>
      <circle cx="20" cy="24" r="3.5" stroke="#ffffff"/>
      <line x1="24" y1="28" x2="52" y2="50" stroke="#ffffff"/>
      <polyline points="32,18 28,28" stroke="var(--accent)" stroke-width="2.5"/>
      <line x1="10" y1="54" x2="56" y2="54" stroke="rgba(255,255,255,0.2)"/>
    ${svgClose}`;
  }

  // 8. Squats / Jump Squats / Pistol Squats / Wall Sit
  if (rawName.includes('squat') || rawName.includes('wall sit')) {
    return `${svgOpen}
      <line x1="6" y1="56" x2="58" y2="56" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="28" cy="20" r="3.5" stroke="#ffffff"/>
      <line x1="28" y1="24" x2="24" y2="38" stroke="#ffffff"/>
      <line x1="28" y1="26" x2="44" y2="24" stroke="rgba(255,255,255,0.6)"/>
      <polyline points="24,38 36,40 32,56" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="32" cy="56" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 9. Glute Bridge / Single Leg Bridge / Hip Thrust
  if (rawName.includes('bridge') || rawName.includes('thrust')) {
    return `${svgOpen}
      <line x1="6" y1="54" x2="58" y2="54" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="14" cy="50" r="3.5" stroke="#ffffff"/>
      <line x1="17" y1="50" x2="34" y2="32" stroke="var(--accent)" stroke-width="2.5"/>
      <polyline points="34,32 46,42 44,54" stroke="var(--accent)" stroke-width="2.2"/>
      <circle cx="34" cy="32" r="3.5" fill="rgba(124,92,252,0.3)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 10. Plank / Side Plank / Superman / Hollow Body
  if (rawName.includes('plank') || rawName.includes('superman') || rawName.includes('hollow') || rawName.includes('flag')) {
    return `${svgOpen}
      <line x1="6" y1="52" x2="58" y2="52" stroke="rgba(255,255,255,0.2)"/>
      <polyline points="18,52 18,44 24,44" stroke="rgba(255,255,255,0.7)"/>
      <circle cx="16" cy="38" r="3.5" stroke="#ffffff"/>
      <line x1="20" y1="44" x2="52" y2="50" stroke="var(--accent)" stroke-width="2.5"/>
      <rect x="28" y="41" width="10" height="5" rx="1.5" fill="rgba(124,92,252,0.3)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 11. L-Sit / Leg Raises / Knee Raises
  if (rawName.includes('l-sit') || rawName.includes('sit') || rawName.includes('raise') || rawName.includes('knee')) {
    return `${svgOpen}
      <circle cx="22" cy="18" r="3.5" stroke="#ffffff"/>
      <line x1="22" y1="22" x2="22" y2="42" stroke="#ffffff"/>
      <line x1="22" y1="26" x2="26" y2="48" stroke="rgba(255,255,255,0.6)"/>
      <line x1="16" y1="48" x2="34" y2="48" stroke="rgba(255,255,255,0.3)"/>
      <line x1="22" y1="42" x2="48" y2="42" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="48" cy="42" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 12. Calf Raises / Lower Leg
  if (rawName.includes('calf')) {
    return `${svgOpen}
      <line x1="10" y1="56" x2="54" y2="56" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="32" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="32" y1="20" x2="32" y2="38" stroke="#ffffff"/>
      <line x1="32" y1="38" x2="30" y2="52" stroke="var(--accent)" stroke-width="2.2"/>
      <line x1="32" y1="38" x2="34" y2="52" stroke="var(--accent)" stroke-width="2.2"/>
      <polyline points="28,46 32,42 36,46" stroke="var(--accent)" stroke-width="1.8"/>
    ${svgClose}`;
  }

  // 13. Wrist Mobility & Wrist Prep
  if (rawName.includes('wrist')) {
    return `${svgOpen}
      <line x1="8" y1="54" x2="56" y2="54" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="44" cy="34" r="9" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 2"/>
      <polyline points="14,54 22,42 32,42 44,34" stroke="var(--accent)" stroke-width="2.2"/>
      <circle cx="44" cy="34" r="3" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 14. Shoulder Mobility / Arm Circles / CARs
  if (rawName.includes('circle') || rawName.includes('swing') || rawName.includes('cars') || rawName.includes('shoulder')) {
    return `${svgOpen}
      <circle cx="32" cy="16" r="3.5" stroke="#ffffff"/>
      <line x1="32" y1="20" x2="32" y2="38" stroke="#ffffff"/>
      <circle cx="32" cy="26" r="14" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>
      <line x1="32" y1="26" x2="44" y2="16" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="44" cy="16" r="2.5" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 15. Stretches / Recovery / Cobra / Child's Pose
  if (rawName.includes('stretch') || rawName.includes('pose') || rawName.includes('cobra') || rawName.includes('child')) {
    return `${svgOpen}
      <line x1="6" y1="54" x2="58" y2="54" stroke="rgba(255,255,255,0.2)"/>
      <circle cx="18" cy="24" r="3.5" stroke="#ffffff"/>
      <path d="M 18 28 Q 28 44 48 54" stroke="var(--accent)" stroke-width="2.5"/>
      <line x1="22" y1="36" x2="22" y2="54" stroke="#ffffff"/>
      <circle cx="22" cy="54" r="2" fill="var(--accent)" stroke="var(--accent)"/>
    ${svgClose}`;
  }

  // 16. Graceful Universal Calisthenics Silhouette Fallback
  return `${svgOpen}
    <circle cx="32" cy="18" r="4" stroke="#ffffff"/>
    <line x1="32" y1="22" x2="32" y2="38" stroke="#ffffff"/>
    <line x1="32" y1="26" x2="20" y2="34" stroke="rgba(255,255,255,0.7)"/>
    <line x1="32" y1="26" x2="44" y2="34" stroke="var(--accent)" stroke-width="2.2"/>
    <line x1="32" y1="38" x2="24" y2="54" stroke="rgba(255,255,255,0.7)"/>
    <line x1="32" y1="38" x2="40" y2="54" stroke="var(--accent)" stroke-width="2.2"/>
    <circle cx="32" cy="28" r="3" fill="rgba(124,92,252,0.3)" stroke="var(--accent)"/>
  ${svgClose}`;
}

// ─── SVG Wireframes & Illustrations for Phase Cards ──────────────────────────

function renderPhaseWireframeSvg(phase, cls = 'cx-phase-svg') {
  if (phase === 'warmup') {
    // Dynamic runner / dynamic mobility line-art figure
    return `
      <svg class="${cls}" viewBox="0 0 64 64" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="38" cy="14" r="5" stroke="#a29bfe" fill="rgba(162, 155, 254, 0.2)" />
        <path d="M35 19 L28 32 L38 38 L32 52" stroke="#a29bfe" />
        <path d="M28 32 L16 40 L10 36" stroke="#a29bfe" />
        <path d="M38 38 L48 46 L54 44" stroke="#a29bfe" />
        <path d="M32 23 L22 20 L16 26" stroke="#a29bfe" />
        <path d="M32 23 L44 26 L50 20" stroke="#a29bfe" />
        <path d="M10 20 L6 20" stroke="rgba(162, 155, 254, 0.4)" stroke-dasharray="2 2" />
        <path d="M12 28 L6 28" stroke="rgba(162, 155, 254, 0.4)" stroke-dasharray="2 2" />
        <path d="M14 48 L8 48" stroke="rgba(162, 155, 254, 0.4)" stroke-dasharray="2 2" />
      </svg>
    `;
  } else if (phase === 'cooldown') {
    // Lotus / yoga meditation line-art figure
    return `
      <svg class="${cls}" viewBox="0 0 64 64" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="32" cy="14" r="5" stroke="#a29bfe" fill="rgba(162, 155, 254, 0.2)" />
        <path d="M32 19 L32 38" stroke="#a29bfe" />
        <path d="M32 25 L20 32 L18 42 L24 46" stroke="#a29bfe" />
        <path d="M32 25 L44 32 L46 42 L40 46" stroke="#a29bfe" />
        <path d="M32 38 L20 44 L16 52 L32 52 L48 52 L44 44 L32 38" stroke="#a29bfe" />
        <path d="M18 20 C18 10 46 10 46 20" stroke="rgba(162, 155, 254, 0.4)" stroke-dasharray="3 3" />
      </svg>
    `;
  } else {
    // Pull-up bar calisthenics line-art figure
    return `
      <svg class="${cls}" viewBox="0 0 64 64" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="12" x2="56" y2="12" stroke="#a29bfe" stroke-width="3" />
        <circle cx="32" cy="22" r="5" stroke="#a29bfe" fill="rgba(162, 155, 254, 0.2)" />
        <path d="M22 12 L24 22 L32 27 L40 22 L42 12" stroke="#a29bfe" />
        <path d="M32 27 L32 44" stroke="#a29bfe" />
        <path d="M32 44 L26 56 L20 54" stroke="#a29bfe" />
        <path d="M32 44 L38 56 L44 54" stroke="#a29bfe" />
      </svg>
    `;
  }
}

function renderExerciseThumbnailSvg(ex) {
  const name = (ex.exercise_name || ex.name || '').toLowerCase();
  if (name.includes('circle') || name.includes('arm swing')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="11" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="14.5" x2="22" y2="28" stroke="#a29bfe" />
        <line x1="10" y1="18" x2="34" y2="18" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="16" y2="40" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="28" y2="40" stroke="#a29bfe" />
        <path d="M7 14 A4 4 0 1 1 7 22" stroke="rgba(162, 155, 254, 0.6)" stroke-dasharray="2 2" />
        <path d="M37 14 A4 4 0 1 1 37 22" stroke="rgba(162, 155, 254, 0.6)" stroke-dasharray="2 2" />
      </svg>
    `;
  } else if (name.includes('shoulder') || name.includes('pass through') || name.includes('car')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="12" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="15.5" x2="22" y2="28" stroke="#a29bfe" />
        <path d="M12 5 L16 18 L22 19 L28 18 L32 5" stroke="#a29bfe" />
        <line x1="10" y1="5" x2="34" y2="5" stroke="#c4b5fd" stroke-width="2.5" />
        <line x1="22" y1="28" x2="17" y2="40" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="27" y2="40" stroke="#a29bfe" />
      </svg>
    `;
  } else if (name.includes('push') || name.includes('plank') || name.includes('scapular push')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="34" cy="18" r="3.5" stroke="#a29bfe" />
        <line x1="10" y1="32" x2="31" y2="22" stroke="#a29bfe" />
        <line x1="28" y1="23" x2="29" y2="34" stroke="#a29bfe" />
        <line x1="10" y1="32" x2="8" y2="34" stroke="#a29bfe" />
        <line x1="6" y1="36" x2="38" y2="36" stroke="rgba(255,255,255,0.15)" />
      </svg>
    `;
  } else if (name.includes('wrist') || name.includes('forearm')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="11" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="14.5" x2="22" y2="28" stroke="#a29bfe" />
        <path d="M22 18 L16 23 L20 27" stroke="#a29bfe" />
        <path d="M22 18 L28 23 L24 27" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="18" y2="40" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="26" y2="40" stroke="#a29bfe" />
      </svg>
    `;
  } else if (name.includes('jump') || name.includes('knee') || name.includes('running') || name.includes('skip')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="24" cy="10" r="3.5" stroke="#a29bfe" />
        <path d="M22 13.5 L19 22 L24 27 L18 36" stroke="#a29bfe" />
        <path d="M19 22 L14 26 L10 24" stroke="#a29bfe" />
        <path d="M24 27 L32 23 L34 30" stroke="#a29bfe" />
        <path d="M20 16 L28 17 L32 13" stroke="#a29bfe" />
      </svg>
    `;
  } else if (name.includes('pull') || name.includes('chin') || name.includes('hang')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="8" x2="36" y2="8" stroke="#c4b5fd" stroke-width="2.5" />
        <circle cx="22" cy="16" r="3.5" stroke="#a29bfe" />
        <path d="M15 8 L17 15 L22 19 L27 15 L29 8" stroke="#a29bfe" />
        <line x1="22" y1="19" x2="22" y2="30" stroke="#a29bfe" />
        <line x1="22" y1="30" x2="18" y2="40" stroke="#a29bfe" />
        <line x1="22" y1="30" x2="26" y2="40" stroke="#a29bfe" />
      </svg>
    `;
  } else if (name.includes('squat') || name.includes('lunge') || name.includes('leg')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="10" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="13.5" x2="22" y2="24" stroke="#a29bfe" />
        <path d="M22 17 L16 19 L12 24" stroke="#a29bfe" />
        <path d="M22 17 L28 19 L32 24" stroke="#a29bfe" />
        <path d="M22 24 L16 30 L16 38" stroke="#a29bfe" />
        <path d="M22 24 L28 30 L28 38" stroke="#a29bfe" />
      </svg>
    `;
  } else if (name.includes('stretch') || name.includes('pose') || name.includes('lat') || name.includes('chest')) {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="11" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="14.5" x2="22" y2="27" stroke="#a29bfe" />
        <path d="M22 18 L14 14 L10 20" stroke="#a29bfe" />
        <path d="M22 18 L30 22 L34 16" stroke="#a29bfe" />
        <path d="M22 27 L16 33 L12 40" stroke="#a29bfe" />
        <path d="M22 27 L28 33 L32 40" stroke="#a29bfe" />
      </svg>
    `;
  } else {
    return `
      <svg viewBox="0 0 44 44" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22" cy="11" r="3.5" stroke="#a29bfe" />
        <line x1="22" y1="14.5" x2="22" y2="28" stroke="#a29bfe" />
        <line x1="14" y1="19" x2="30" y2="19" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="17" y2="40" stroke="#a29bfe" />
        <line x1="22" y1="28" x2="27" y2="40" stroke="#a29bfe" />
      </svg>
    `;
  }
}

// ─── High-Fidelity Animated Exercise Motion Engine ───────────────────────────

function renderAnimatedExerciseSvg(ex) {
  const name = (ex.exercise_name || ex.name || '').toLowerCase();

  // 1. Leg Swings / Leg Mobility
  if (name.includes('swing') || name.includes('hip circle') || name.includes('ankle')) {
    return `
      <div class="cx-anim-container cx-anim-legswing-stage">
        <svg viewBox="0 0 200 160" class="cx-anim-svg" aria-label="Leg Swing Animation">
          <!-- Floor and reflection -->
          <ellipse cx="100" cy="148" rx="60" ry="6" fill="rgba(124, 92, 252, 0.15)" />
          <line x1="30" y1="148" x2="170" y2="148" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-dasharray="4 4" />

          <!-- Kinetic Arc Trail -->
          <path d="M70 120 Q100 142 130 115" class="cx-anim-motion-arc" fill="none" stroke="rgba(124,92,252,0.5)" stroke-width="2" stroke-dasharray="3 3" />
          
          <!-- Athlete Body -->
          <g class="cx-anim-body-group">
            <!-- Head & Torso -->
            <circle cx="96" cy="40" r="10" fill="#c4b5fd" />
            <line x1="96" y1="50" x2="96" y2="92" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />

            <!-- Arms for balance -->
            <path d="M72 62 L96 58 L120 62" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" fill="none" />

            <!-- Support Leg (Ground Contact) -->
            <line x1="96" y1="92" x2="94" y2="146" stroke="#e2e8f0" stroke-width="5.5" stroke-linecap="round" />
            <line x1="94" y1="146" x2="104" y2="146" stroke="#c4b5fd" stroke-width="4" stroke-linecap="round" />

            <!-- Swinging Leg (Animated) -->
            <g class="cx-swinging-leg">
              <line x1="96" y1="92" x2="98" y2="122" stroke="#a78bfa" stroke-width="5" stroke-linecap="round" />
              <line x1="98" y1="122" x2="102" y2="144" stroke="#7c5cfc" stroke-width="4.5" stroke-linecap="round" />
              <circle cx="98" cy="122" r="3.5" fill="#c4b5fd" />
            </g>
          </g>

          <!-- Velocity Pulse Rings -->
          <circle cx="100" cy="130" r="14" class="cx-anim-pulse-ring" fill="none" stroke="rgba(124,92,252,0.4)" stroke-width="1.5" />
        </svg>
      </div>
    `;
  }

  // 2. Squats / Jump Squats / High Knees / Lunges
  if (name.includes('squat') || name.includes('lunge') || name.includes('knee') || name.includes('jump')) {
    return `
      <div class="cx-anim-container cx-anim-squat-stage">
        <svg viewBox="0 0 200 160" class="cx-anim-svg" aria-label="Squat Animation">
          <!-- Floor grid -->
          <ellipse cx="100" cy="148" rx="65" ry="7" fill="rgba(124, 92, 252, 0.18)" />
          <line x1="30" y1="148" x2="170" y2="148" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />

          <!-- Dynamic Vertical Trajectory Line -->
          <line x1="100" y1="30" x2="100" y2="135" stroke="rgba(124,92,252,0.25)" stroke-width="1" stroke-dasharray="2 3" />

          <!-- Animated Squatting Athlete -->
          <g class="cx-anim-squat-figure">
            <!-- Head -->
            <circle cx="100" cy="38" r="10" fill="#c4b5fd" />
            <!-- Spine / Torso -->
            <line x1="100" y1="48" x2="100" y2="88" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />

            <!-- Arms extended for counter-balance -->
            <path d="M100 55 L75 62 L60 62" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" fill="none" />

            <!-- Left Leg (Hip -> Knee -> Ankle) -->
            <polyline points="100,88 82,112 86,146" stroke="#a78bfa" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <!-- Right Leg (Hip -> Knee -> Ankle) -->
            <polyline points="100,88 118,112 114,146" stroke="#7c5cfc" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />

            <!-- Feet -->
            <line x1="86" y1="146" x2="76" y2="146" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
            <line x1="114" y1="146" x2="124" y2="146" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />

            <!-- Quad Joint Contraction Points -->
            <circle cx="82" cy="112" r="3.5" fill="#facc15" />
            <circle cx="118" cy="112" r="3.5" fill="#facc15" />
          </g>
        </svg>
      </div>
    `;
  }

  // 3. Push-ups / Diamond / Decline / Pike
  if (name.includes('push') || name.includes('plank') || name.includes('dip')) {
    return `
      <div class="cx-anim-container cx-anim-pushup-stage">
        <svg viewBox="0 0 200 160" class="cx-anim-svg" aria-label="Push-up Animation">
          <!-- Floor surface -->
          <ellipse cx="100" cy="138" rx="80" ry="7" fill="rgba(124, 92, 252, 0.15)" />
          <line x1="20" y1="138" x2="180" y2="138" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />

          <!-- Push-up Figure -->
          <g class="cx-anim-pushup-figure">
            <!-- Head -->
            <circle cx="150" cy="66" r="9" fill="#c4b5fd" />

            <!-- Spine / Rigid Body Alignment (Plank Line) -->
            <line x1="45" y1="126" x2="142" y2="74" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />

            <!-- Arms & Elbow Joint (Flexing) -->
            <polyline points="135,78 142,106 138,138" stroke="#a78bfa" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <!-- Hands on Floor -->
            <line x1="134" y1="138" x2="144" y2="138" stroke="#c4b5fd" stroke-width="4" stroke-linecap="round" />

            <!-- Feet on Floor -->
            <circle cx="45" cy="126" r="4" fill="#a78bfa" />
            <line x1="42" y1="138" x2="48" y2="128" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />

            <!-- Chest / Triceps Contraction Glow -->
            <circle cx="135" cy="80" r="5" fill="#facc15" class="cx-anim-joint-glow" />
            <circle cx="142" cy="106" r="3.5" fill="#7c5cfc" />
          </g>
        </svg>
      </div>
    `;
  }

  // 4. Pull-ups / Chin-ups / Dead Hang / Scapular Pulls / Rows
  if (name.includes('pull') || name.includes('chin') || name.includes('hang') || name.includes('row')) {
    return `
      <div class="cx-anim-container cx-anim-pullup-stage">
        <svg viewBox="0 0 200 160" class="cx-anim-svg" aria-label="Pull-up Animation">
          <!-- Overhead Bar -->
          <rect x="25" y="20" width="150" height="5" rx="2.5" fill="#7c5cfc" />
          <circle cx="35" cy="22.5" r="4" fill="#c4b5fd" />
          <circle cx="165" cy="22.5" r="4" fill="#c4b5fd" />

          <!-- Hanging & Pulling Athlete -->
          <g class="cx-anim-pullup-figure">
            <!-- Hands on Bar -->
            <ellipse cx="80" cy="22.5" rx="3.5" ry="2.5" fill="#c4b5fd" />
            <ellipse cx="120" cy="22.5" rx="3.5" ry="2.5" fill="#c4b5fd" />

            <!-- Head -->
            <circle cx="100" cy="48" r="9" fill="#c4b5fd" />

            <!-- Arms pulling up -->
            <path d="M80 22.5 L86 44 L96 56" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <path d="M120 22.5 L114 44 L104 56" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />

            <!-- Torso / Back Lat Flare -->
            <line x1="100" y1="56" x2="100" y2="102" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" />

            <!-- Legs straight in hollow body -->
            <line x1="100" y1="102" x2="98" y2="142" stroke="#a78bfa" stroke-width="5" stroke-linecap="round" />
            <line x1="100" y1="102" x2="102" y2="142" stroke="#7c5cfc" stroke-width="5" stroke-linecap="round" />

            <!-- Lat Engagement Glow Rings -->
            <circle cx="90" cy="64" r="4" fill="#facc15" class="cx-anim-joint-glow" />
            <circle cx="110" cy="64" r="4" fill="#facc15" class="cx-anim-joint-glow" />
          </g>
        </svg>
      </div>
    `;
  }

  // 5. Default Mobility / Circles / Stretches
  return `
    <div class="cx-anim-container cx-anim-mobility-stage">
      <svg viewBox="0 0 200 160" class="cx-anim-svg" aria-label="Mobility Animation">
        <!-- Ambient Orbitals -->
        <circle cx="100" cy="75" r="55" fill="none" stroke="rgba(124, 92, 252, 0.15)" stroke-width="1.5" stroke-dasharray="4 6" />
        <circle cx="100" cy="75" r="38" fill="none" stroke="rgba(124, 92, 252, 0.25)" stroke-width="1" stroke-dasharray="2 4" class="cx-anim-orbit-ring" />

        <!-- Standing Mobility Figure -->
        <g class="cx-anim-mobility-figure">
          <!-- Head -->
          <circle cx="100" cy="38" r="9.5" fill="#c4b5fd" />
          <!-- Torso -->
          <line x1="100" y1="48" x2="100" y2="92" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" />

          <!-- Dynamic Rotating Arms -->
          <g class="cx-anim-arm-rotator">
            <path d="M72 65 L100 58 L128 65" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" fill="none" />
            <circle cx="72" cy="65" r="3.5" fill="#facc15" />
            <circle cx="128" cy="65" r="3.5" fill="#facc15" />
          </g>

          <!-- Legs -->
          <line x1="100" y1="92" x2="90" y2="142" stroke="#a78bfa" stroke-width="5" stroke-linecap="round" />
          <line x1="100" y1="92" x2="110" y2="142" stroke="#7c5cfc" stroke-width="5" stroke-linecap="round" />
          <line x1="90" y1="142" x2="80" y2="142" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
          <line x1="110" y1="142" x2="120" y2="142" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
        </g>
      </svg>
    </div>
  `;
}

// ─── Right Column: Visual Motion Stage & Muscle Focus Cards ──────────────────

function renderExerciseVisualStageCard(currentEx, activePhase) {
  if (!currentEx) return '';
  const animSvg = renderAnimatedExerciseSvg(currentEx);
  const formTip = getExerciseContextualTip(currentEx) || 'Maintain full range of motion and smooth breathing cadence.';
  const tempoText = currentEx.exercise_type === 'duration'
    ? 'Constant Isometric Tension'
    : '2s Eccentric · 1s Pause · 1s Explosive';

  const categoryLabel = activePhase === 'warmup'
    ? 'Dynamic Mobility'
    : (activePhase === 'cooldown' ? 'Restorative Recovery' : 'Hypertrophy & Strength');

  return `
    <div class="runner-visual-motion-card animate-card-reveal">
      <div class="runner-visual-card-header">
        <div class="runner-visual-card-tag-group">
          <span class="runner-visual-pulse-dot"></span>
          <span class="runner-visual-card-tag">EXERCISE MOTION & TEMPO</span>
        </div>
        <span class="runner-visual-badge-category">${categoryLabel}</span>
      </div>

      <!-- Animated Stage Vector Graphic -->
      <div class="runner-motion-graphic-stage">
        <div class="runner-motion-stage-ambient-glow"></div>
        ${animSvg}
        <div class="runner-motion-stage-floor-reflection"></div>
      </div>

      <!-- Movement Info & Tempo Bar -->
      <div class="runner-motion-footer-bar">
        <div class="runner-tempo-row">
          <span class="runner-tempo-label">${renderIcon('activity', 'cx-icon cx-icon-xs cx-icon-accent')} TEMPO CADENCE</span>
          <span class="runner-tempo-val mono">${tempoText}</span>
        </div>
        <div class="runner-motion-form-tip">
          <span class="runner-tip-lead">Form Cue:</span> ${formTip}
        </div>
      </div>
    </div>
  `;
}

function renderExerciseMuscleFocusCard(currentEx, activePhase) {
  if (!currentEx) return '';
  const muscleMapObj = (typeof window !== 'undefined' && window.MuscleMap)
    ? window.MuscleMap.resolveMuscles({ name: currentEx.exercise_name })
    : { primary: ['Chest', 'Triceps'], secondary: ['Front Delts', 'Core'] };

  const isBackFocused = (muscleMapObj.primary || []).some(m =>
    ['lats', 'traps', 'upper_back', 'lower_back', 'rear_delts', 'glutes', 'hamstrings'].includes(String(m).toLowerCase())
  );

  const frontSvg = (typeof window !== 'undefined' && window.MuscleMap)
    ? window.MuscleMap.renderFrontSVG(muscleMapObj.primary, muscleMapObj.secondary)
    : '';
  const backSvg = (typeof window !== 'undefined' && window.MuscleMap)
    ? window.MuscleMap.renderBackSVG(muscleMapObj.primary, muscleMapObj.secondary)
    : '';

  const formatMuscleName = (m) => String(m).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const primaryList = (muscleMapObj.primary || []).map(formatMuscleName);
  const secondaryList = (muscleMapObj.secondary || []).map(formatMuscleName);

  return `
    <div class="runner-muscle-anatomy-card animate-card-reveal">
      <div class="runner-visual-card-header">
        <div class="runner-visual-card-tag-group">
          <span class="runner-anatomy-icon">${renderIcon('crosshair', 'cx-icon cx-icon-xs cx-icon-accent')}</span>
          <span class="runner-visual-card-tag">ANATOMICAL ENGAGEMENT</span>
        </div>
        <span class="runner-anatomy-badge-focus">${isBackFocused ? 'Posterior Chain' : 'Anterior Chain'}</span>
      </div>

      <!-- Dual Vector Anatomy Views (Front & Back) -->
      <div class="runner-anatomy-dual-view">
        <div class="runner-anatomy-figure-box ${!isBackFocused ? 'is-dominant' : ''}">
          <span class="runner-anatomy-figure-lbl">ANTERIOR (FRONT)</span>
          <div class="runner-anatomy-svg-wrap">
            ${frontSvg}
          </div>
        </div>
        <div class="runner-anatomy-figure-box ${isBackFocused ? 'is-dominant' : ''}">
          <span class="runner-anatomy-figure-lbl">POSTERIOR (BACK)</span>
          <div class="runner-anatomy-svg-wrap">
            ${backSvg}
          </div>
        </div>
      </div>

      <!-- Targeted Muscle Chips & Biomechanics Legend -->
      <div class="runner-anatomy-legend-zone">
        <div class="runner-legend-group">
          <span class="runner-legend-title">Primary Drivers</span>
          <div class="runner-legend-chips">
            ${primaryList.length > 0 ? primaryList.map(m => `
              <span class="runner-muscle-pill primary-pill">
                <span class="runner-pill-dot primary-dot"></span>
                <span>${m}</span>
              </span>
            `).join('') : '<span class="runner-muscle-pill primary-pill">Full Body Focus</span>'}
          </div>
        </div>

        ${secondaryList.length > 0 ? `
          <div class="runner-legend-group" style="margin-top: 6px;">
            <span class="runner-legend-title">Secondary Stabilizers</span>
            <div class="runner-legend-chips">
              ${secondaryList.slice(0, 4).map(m => `
                <span class="runner-muscle-pill secondary-pill">
                  <span class="runner-pill-dot secondary-dot"></span>
                  <span>${m}</span>
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ─── Phase Navigation & Control Handlers ─────────────────────────────────────

function getPhaseLockStatus(session, targetPhase) {
  if (!session) {
    return { isLocked: false, status: 'available', lockReason: '' };
  }

  const auth = getAuthoritativeSessionState(session);
  const isWarmupResolved = auth.warmup.isDone || auth.warmup.isSkipped || auth.warmup.total === 0;
  const isMainDone = auth.main.isDone || auth.main.totalSets === 0;
  const isCooldownResolved = auth.cooldown.isDone || auth.cooldown.isSkipped || auth.cooldown.total === 0;

  const currentPhaseRaw = auth.currentPhase;
  const target = targetPhase === 'warmup' ? 'warmup' : (targetPhase === 'cooldown' ? 'cooldown' : 'main');

  if (target === 'warmup') {
    const isActive = currentPhaseRaw === 'warmup';
    const status = isActive ? 'active' : (isWarmupResolved ? 'completed' : 'available');
    return {
      isLocked: false,
      status,
      lockReason: '',
      isWarmupResolved,
      isMainDone,
      isCooldownResolved
    };
  }

  if (target === 'main') {
    const isActive = currentPhaseRaw === 'main';
    if (!isWarmupResolved) {
      return {
        isLocked: true,
        status: 'locked',
        lockReason: 'Complete or skip Warm-Up first to unlock Main Workout.',
        isWarmupResolved,
        isMainDone,
        isCooldownResolved
      };
    }
    const status = isActive ? 'active' : (isMainDone ? 'completed' : 'available');
    return {
      isLocked: false,
      status,
      lockReason: '',
      isWarmupResolved,
      isMainDone,
      isCooldownResolved
    };
  }

  if (target === 'cooldown') {
    const isActive = currentPhaseRaw === 'cooldown';
    if (!isWarmupResolved) {
      return {
        isLocked: true,
        status: 'locked',
        lockReason: 'Complete the Warm-Up and Main Workout first.',
        isWarmupResolved,
        isMainDone,
        isCooldownResolved
      };
    }
    if (!isMainDone) {
      return {
        isLocked: true,
        status: 'locked',
        lockReason: 'Complete the Main Workout first.',
        isWarmupResolved,
        isMainDone,
        isCooldownResolved
      };
    }
    const status = isActive ? 'active' : (isCooldownResolved ? 'completed' : 'available');
    return {
      isLocked: false,
      status,
      lockReason: '',
      isWarmupResolved,
      isMainDone,
      isCooldownResolved
    };
  }

  return { isLocked: false, status: 'available', lockReason: '' };
}

function openSkipWarmupPhaseModal() {
  if (typeof document === 'undefined' || !document.createElement || !document.getElementById) return;
  let modal = document.getElementById('skip-warmup-phase-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skip-warmup-phase-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'skip-warmup-modal-title');
    modal.onclick = (e) => {
      if (e.target === modal) closeSkipWarmupPhaseModal();
    };
    if (document.body && document.body.appendChild) {
      document.body.appendChild(modal);
    }
  }

  modal.innerHTML = `
    <div class="modal-card discard-modal-card" style="max-width:360px; text-align:center; padding:24px 20px; background:#131422; border:1px solid rgba(139,92,246,0.25); border-radius:20px;" onclick="event.stopPropagation()">
      <div style="width:44px; height:44px; border-radius:50%; background:rgba(234,179,8,0.15); color:#facc15; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
        ${renderIcon('alertTriangle', 'cx-icon cx-icon-md')}
      </div>
      <h2 class="modal-title" id="skip-warmup-modal-title" style="font-size:19px; font-weight:800; color:#ffffff; margin-bottom:8px;">Skip Warm-Up?</h2>
      <p class="discard-modal-desc" style="font-size:13px; color:#8a8d9f; margin-bottom:22px; line-height:1.4;">
        Are you sure you want to skip the Warm-Up phase and start the Main Workout?
      </p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary" id="skip-warmup-cancel-btn" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; cursor:pointer;" type="button" onclick="closeSkipWarmupPhaseModal()">
          Cancel
        </button>
        <button class="btn" style="flex:1; padding:11px; font-size:13.5px; font-weight:700; border-radius:12px; background:#eab308; color:#000000; border:none; box-shadow:0 4px 14px rgba(234,179,8,0.35); cursor:pointer;" type="button" onclick="confirmSkipWarmupPhase()">
          Skip Warm-Up
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  const cancelBtn = document.getElementById('skip-warmup-cancel-btn');
  if (cancelBtn && cancelBtn.focus) cancelBtn.focus();
}

function closeSkipWarmupPhaseModal() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const modal = document.getElementById('skip-warmup-phase-modal');
  if (modal && modal.remove) {
    modal.remove();
  }
}

function confirmSkipWarmupPhase() {
  closeSkipWarmupPhaseModal();
  skipWarmupPhase();
}

function renderWorkoutSegmentedTabs(session, currentPhase) {
  if (!session) return '';
  const currentShort = isWarmupPhase(currentPhase || session.phase) ? 'warmup'
    : (isCooldownPhase(currentPhase || session.phase) ? 'cooldown' : 'main');

  const warmupLock = getPhaseLockStatus(session, 'warmup');
  const mainLock = getPhaseLockStatus(session, 'main');
  const cooldownLock = getPhaseLockStatus(session, 'cooldown');

  const isWarmupActive = currentShort === 'warmup';
  const isMainActive = currentShort === 'main';
  const isCooldownActive = currentShort === 'cooldown';

  const isWarmupDone = warmupLock.status === 'completed';
  const isMainDone = mainLock.status === 'completed';
  const isCooldownDone = cooldownLock.status === 'completed';

  const warmupClasses = `runner-phase-pill-btn phase-warmup runner-segmented-tab-btn ${isWarmupActive ? 'is-active' : ''} ${isWarmupDone ? 'is-done' : ''}`.replace(/\s+/g, ' ').trim();
  const mainClasses = `runner-phase-pill-btn phase-main runner-segmented-tab-btn ${isMainActive ? 'is-active' : ''} ${isMainDone ? 'is-done' : ''} ${mainLock.isLocked ? 'is-locked' : ''}`.replace(/\s+/g, ' ').trim();
  const cooldownClasses = `runner-phase-pill-btn phase-cooldown runner-segmented-tab-btn ${isCooldownActive ? 'is-active' : ''} ${isCooldownDone ? 'is-done' : ''} ${cooldownLock.isLocked ? 'is-locked' : ''}`.replace(/\s+/g, ' ').trim();

  return `
    <div class="runner-phase-pill-group runner-segmented-tabs" role="tablist" aria-label="Workout Phase Navigation">
      <button class="${warmupClasses}" type="button" role="tab" aria-selected="${isWarmupActive}" onclick="setWorkoutPhase('warmup')" title="${warmupLock.isLocked ? warmupLock.lockReason : 'Warm-Up Phase'}">
        <span class="runner-phase-dot">${isWarmupDone ? '✓' : '⚡'}</span>
        <span class="runner-phase-label">Warm-Up</span>
      </button>

      <span class="runner-phase-connector">→</span>

      <button class="${mainClasses}" type="button" role="tab" aria-selected="${isMainActive}" onclick="setWorkoutPhase('main')" title="${mainLock.isLocked ? mainLock.lockReason : 'Main Workout Phase'}">
        <span class="runner-phase-dot">${isMainDone ? '✓' : (mainLock.isLocked ? '🔒' : '◎')}</span>
        <span class="runner-phase-label">Train</span>
      </button>

      <span class="runner-phase-connector">→</span>

      <button class="${cooldownClasses}" type="button" role="tab" aria-selected="${isCooldownActive}" onclick="setWorkoutPhase('cooldown')" title="${cooldownLock.isLocked ? cooldownLock.lockReason : 'Cool Down Phase'}">
        <span class="runner-phase-dot">${isCooldownDone ? '✓' : (cooldownLock.isLocked ? '🔒' : '❄')}</span>
        <span class="runner-phase-label">Cool Down</span>
      </button>
    </div>
  `;
}

function setWorkoutPhase(phase) {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);

  const rawShort = isWarmupPhase(phase) ? 'warmup' : (isCooldownPhase(phase) ? 'cooldown' : (isCompletedPhase(phase) ? 'completed' : 'main'));

  if (rawShort !== 'completed') {
    const lockStatus = getPhaseLockStatus(session, rawShort);
    if (lockStatus.isLocked) {
      showToast(lockStatus.lockReason);
      if (rawShort === 'main' && !lockStatus.isWarmupResolved) {
        openSkipWarmupPhaseModal();
      }
      return;
    }
  }

  const wp = typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES : { WARMUP: 'WARMUP', MAIN_WORKOUT: 'MAIN_WORKOUT', COOLDOWN: 'COOLDOWN', COMPLETED: 'COMPLETED' };
  const normalized = isWarmupPhase(phase) ? wp.WARMUP
    : (isCooldownPhase(phase) ? wp.COOLDOWN
    : (isCompletedPhase(phase) ? wp.COMPLETED : wp.MAIN_WORKOUT));

  const now = Date.now();
  if (normalized === wp.MAIN_WORKOUT && !session.main_started_at) {
    session.main_started_at = now;
  } else if (normalized === wp.COOLDOWN && !session.cooldown_started_at) {
    session.cooldown_started_at = now;
  }

  if (normalized === wp.MAIN_WORKOUT && session.phaseTimer) {
    session.phaseTimer.isRunning = false;
  }

  session.currentPhase = rawShort;
  session.phase = normalized;
  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function toggleWarmupItemComplete(idx) {
  const session = getActiveSession();
  if (!session || !session.warmup || !session.warmup[idx]) return;
  ensureSessionStarted(session);
  const item = session.warmup[idx];
  const willBeCompleted = !item.completed;
  item.completed = willBeCompleted;
  item.completed_at = willBeCompleted ? new Date().toISOString() : null;
  if (willBeCompleted) {
    item.skipped = false;
    item.skipped_at = null;
  }

  session.warmupIndex = idx;
  session.warmup_idx = idx;

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function toggleCooldownItemComplete(idx) {
  const session = getActiveSession();
  if (!session || !session.cooldown || !session.cooldown[idx]) return;
  ensureSessionStarted(session);
  const item = session.cooldown[idx];
  const willBeCompleted = !item.completed;
  item.completed = willBeCompleted;
  item.completed_at = willBeCompleted ? new Date().toISOString() : null;
  if (willBeCompleted) {
    item.skipped = false;
    item.skipped_at = null;
  }

  session.cooldownIndex = idx;
  session.cooldown_idx = idx;

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function toggleMainExerciseComplete(exIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises || !session.exercises[exIdx]) return;
  ensureSessionStarted(session);
  const ex = session.exercises[exIdx];
  const allCompleted = ex.sets.every(s => s.completed);
  const willBeCompleted = !allCompleted;
  ex.sets.forEach(s => {
    s.completed = willBeCompleted;
    s.completed_at = willBeCompleted ? new Date().toISOString() : null;
    if (willBeCompleted) {
      s.skipped = false;
      s.skipped_at = null;
    }
  });
  ex.completed = willBeCompleted;
  ex.completed_at = willBeCompleted ? new Date().toISOString() : null;
  session.activeExerciseIndex = exIdx;
  session.currentExerciseIndex = exIdx;
  _selectedWorkoutExIdx = exIdx;

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function startPhaseAutoRunner(phase) {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);

  const rawShort = isWarmupPhase(phase) ? 'warmup' : (isCooldownPhase(phase) ? 'cooldown' : (isCompletedPhase(phase) ? 'completed' : 'main'));
  if (rawShort !== 'completed') {
    const lockStatus = getPhaseLockStatus(session, rawShort);
    if (lockStatus.isLocked) {
      showToast(lockStatus.lockReason);
      if (rawShort === 'main' && !lockStatus.isWarmupResolved) {
        openSkipWarmupPhaseModal();
      }
      return;
    }
  }

  ensureSessionStarted(session);

  const now = Date.now();
  if (phase === 'main' && !session.main_started_at) {
    session.main_started_at = now;
  } else if (phase === 'cooldown' && !session.cooldown_started_at) {
    session.cooldown_started_at = now;
  }

  session.currentPhase = phase;
  session.phase = (phase === 'warmup') ? 'WARMUP' : ((phase === 'main') ? 'MAIN_WORKOUT' : ((phase === 'cooldown') ? 'COOLDOWN' : phase));
  session.phaseState = 'ACTIVE';

  if (phase === 'warmup') {
    session.warmupStatus = 'ACTIVE';
    session.warmup_status = 'in_progress';
    const list = session.warmup || [];
    const firstUncompleted = list.findIndex(w => !w.completed && !w.skipped);
    const startIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
    session.warmupIndex = startIdx;
    session.warmup_idx = startIdx;
    const cur = list[startIdx];
    const isHold = cur?.exercise_type === 'duration';

    session.movementTimer = {
      isRunning: isHold,
      durationSec: cur?.duration_sec || 30,
      remainingSec: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedAt: null
    };
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'cooldown') {
    session.cooldownStatus = 'ACTIVE';
    session.cooldown_status = 'in_progress';
    const list = session.cooldown || [];
    const firstUncompleted = list.findIndex(c => !c.completed && !c.skipped);
    const startIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
    session.cooldownIndex = startIdx;
    session.cooldown_idx = startIdx;
    const cur = list[startIdx];
    const isHold = cur?.exercise_type === 'duration';

    session.movementTimer = {
      isRunning: isHold,
      durationSec: cur?.duration_sec || 30,
      remainingSec: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedAt: null
    };
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'main') {
    session.mainStatus = 'ACTIVE';
    const list = session.exercises || [];
    const firstUncompleted = list.findIndex(ex => ex.sets && ex.sets.some(s => !s.completed && !s.skipped));
    const activeIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
    session.activeExerciseIndex = activeIdx;
    session.currentExerciseIndex = activeIdx;
    _selectedWorkoutExIdx = activeIdx;
    const curEx = list[activeIdx];
    const firstUnresolvedSet = curEx && curEx.sets ? curEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
    session.activeSetIndex = firstUnresolvedSet !== -1 ? firstUnresolvedSet : 0;
    if (session.exercises && session.exercises[activeIdx]) {
      const ex = session.exercises[activeIdx];
      const cat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === ex.exercise_id || e.name === ex.exercise_name) : null;
      const pattern = cat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(ex.exercise_name) : 'push');
      setCurrentMovementPattern(pattern, ex.exercise_id, ex.exercise_name);
    }
  }

  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function selectExerciseToExecute(phase, idx) {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);

  const rawShort = isWarmupPhase(phase) ? 'warmup' : (isCooldownPhase(phase) ? 'cooldown' : (isCompletedPhase(phase) ? 'completed' : 'main'));
  if (rawShort !== 'completed') {
    const lockStatus = getPhaseLockStatus(session, rawShort);
    if (lockStatus.isLocked) {
      showToast(lockStatus.lockReason);
      if (rawShort === 'main' && !lockStatus.isWarmupResolved) {
        openSkipWarmupPhaseModal();
      }
      return;
    }
  }

  ensureSessionStarted(session);

  const now = Date.now();
  if (phase === 'main' && !session.main_started_at) {
    session.main_started_at = now;
  } else if (phase === 'cooldown' && !session.cooldown_started_at) {
    session.cooldown_started_at = now;
  }

  session.currentPhase = phase;
  session.phase = phase === 'warmup' ? 'WARMUP' : (phase === 'cooldown' ? 'COOLDOWN' : 'MAIN_WORKOUT');
  if (phase === 'warmup') {
    session.warmupIndex = idx;
    session.warmup_idx = idx;
    const cur = (session.warmup || [])[idx];
    const isHold = cur?.exercise_type === 'duration';
    session.movementTimer = {
      isRunning: isHold,
      durationSec: cur?.duration_sec || 30,
      remainingSec: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedAt: null
    };
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'cooldown') {
    session.cooldownIndex = idx;
    session.cooldown_idx = idx;
    const cur = (session.cooldown || [])[idx];
    const isHold = cur?.exercise_type === 'duration';
    session.movementTimer = {
      isRunning: isHold,
      durationSec: cur?.duration_sec || 30,
      remainingSec: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedAt: null
    };
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'main') {
    session.activeExerciseIndex = idx;
    session.currentExerciseIndex = idx;
    _selectedWorkoutExIdx = idx;
    const curEx = (session.exercises || [])[idx];
    const firstUnresolvedSet = curEx && curEx.sets ? curEx.sets.findIndex(s => !s.completed && !s.skipped) : 0;
    session.activeSetIndex = firstUnresolvedSet !== -1 ? firstUnresolvedSet : 0;
    if (session.exercises && session.exercises[idx]) {
      const ex = session.exercises[idx];
      const cat = (typeof state !== 'undefined' && state.exercises) ? state.exercises.find(e => e.id === ex.exercise_id || e.name === ex.exercise_name) : null;
      const pattern = cat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(ex.exercise_name) : 'push');
      setCurrentMovementPattern(pattern, ex.exercise_id, ex.exercise_name);
    }
  }
  syncAuthoritativeSessionState(session);
  saveActiveSession(session);
  render();
}

function selectWorkoutQueueExercise(exIdx) {
  selectExerciseToExecute('main', exIdx);
}

// ─── Top Sticky Header Bar Renderer (Section 3 & 6 Spec) ─────────────────────

function renderWorkoutTopHeader(session) {
  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;
  const currentPhase = session.currentPhase || 'warmup';
  const phaseLabel = currentPhase === 'warmup' ? 'Warm-Up Phase' : (currentPhase === 'cooldown' ? 'Cool Down Phase' : 'Main Training');

  return `
    <header class="runner-sticky-header">
      <div class="runner-header-left">
        <button class="runner-header-back-btn" onclick="openDiscardWorkoutModal()" aria-label="Exit workout" title="Exit Workout">
          ${renderIcon('arrowLeft', 'cx-icon cx-icon-md')}
        </button>
        <div class="runner-header-title-zone">
          <div class="runner-header-title-row">
            <h1 class="runner-header-title">${session.routine || session.workout_name || 'Workout'}</h1>
            <span class="runner-header-difficulty-badge">${session.level ? `Level ${session.level}` : 'Level 1'}</span>
          </div>
          <span class="runner-header-subtitle">${phaseLabel}</span>
        </div>
      </div>

      <!-- Segmented Phase Navigation Tabs (Section 6 Spec) -->
      <div class="runner-header-phase-tabs">
        ${renderWorkoutSegmentedTabs(session, currentPhase)}
      </div>

      <div class="runner-header-right">
        <div class="runner-header-timer-pill mono ${isPaused ? 'is-paused' : ''}" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Timer' : 'Pause Timer'}">
          <span class="runner-timer-digits" id="workout-elapsed-val">${fmtSecs(elapsedSec)}</span>
          <button class="runner-timer-pause-btn" type="button" aria-label="${isPaused ? 'Resume' : 'Pause'}">
            ${renderIcon(isPaused ? 'play' : 'pause', 'cx-icon cx-icon-xs')}
          </button>
        </div>

        <button class="runner-header-gear-btn" onclick="openSettingsModal()" title="Workout Options & Settings" aria-label="Settings">
          ${renderIcon('settings', 'cx-icon cx-icon-sm')}
        </button>

        <button class="runner-header-end-btn" onclick="requestFinishWorkout()" title="Finish session">
          <span>End Session</span>
        </button>
      </div>
    </header>
  `;
}

// ─── Workout Phase Model & Structure Calculator ─────────────────────────────

function getWorkoutPhaseModel(session) {
  if (!session) return null;
  const auth = getAuthoritativeSessionState(session);

  let warmupEstSec = 0;
  auth.warmup.list.forEach(w => {
    warmupEstSec += (w.duration_sec || (w.reps ? w.reps * 3 : 30)) + (w.rest_sec || 10);
  });
  const warmupEstMin = Math.max(3, Math.round(warmupEstSec / 60));
  const warmupDurationText = auth.warmup.total > 0 ? `${Math.max(3, warmupEstMin - 1)}–${warmupEstMin + 2} min` : '5–8 min';

  const warmUp = {
    id: 'warmup',
    stepNumber: 1,
    title: 'WARM-UP',
    tabLabel: 'Warm-Up',
    description: 'Prepare your body and activate muscles.',
    estimatedDuration: warmupDurationText,
    estimatedDurationMin: warmupEstMin,
    exercises: auth.warmup.list,
    totalCount: auth.warmup.total,
    completedCount: auth.warmup.completed,
    skippedCount: auth.warmup.skipped,
    resolvedCount: auth.warmup.resolved,
    totalSets: auth.warmup.total,
    completedSets: auth.warmup.completed,
    skippedSets: auth.warmup.skipped,
    progressLabel: `${auth.warmup.completed} / ${auth.warmup.total} completed${auth.warmup.isDone ? (auth.warmup.isSkipped ? ' (Skipped)' : ' ✓') : ''}`,
    isCompleted: auth.warmup.isDone,
    isSkipped: auth.warmup.isSkipped,
    isInProgress: auth.warmup.isInProgress,
    isPending: !auth.warmup.isDone && !auth.warmup.isInProgress && !auth.warmup.isSkipped,
    completionState: auth.warmup.isDone ? (auth.warmup.isSkipped ? 'skipped' : 'completed') : (auth.warmup.isInProgress ? 'in_progress' : 'ready'),
    progress: auth.warmup.pct,
    wireframeKey: 'warmup'
  };

  let mainEstSec = 0;
  auth.main.list.forEach(ex => {
    const isH = ex.exercise_type === 'duration';
    (ex.sets || []).forEach(s => {
      mainEstSec += (isH ? (s.target_val || 30) : (s.target_val || 10) * 3) + (ex.rest_sec || 90);
    });
  });
  const mainEstMin = Math.max(15, Math.round(mainEstSec / 60));
  const mainDurationText = auth.main.totalSets > 0 ? `${Math.max(15, mainEstMin - 5)}–${mainEstMin + 5} min` : '20–30 min';

  const mainWorkout = {
    id: 'main',
    stepNumber: 2,
    title: 'MAIN WORKOUT',
    tabLabel: 'Main Workout',
    description: 'Build strength and skill with focused sets.',
    estimatedDuration: mainDurationText,
    estimatedDurationMin: mainEstMin,
    exercises: auth.main.list,
    totalCount: auth.main.totalExercises,
    completedCount: auth.main.completedExercises,
    skippedCount: auth.main.skippedExercises,
    resolvedCount: auth.main.resolvedExercises,
    totalSets: auth.main.totalSets,
    completedSets: auth.main.completedSets,
    skippedSets: auth.main.skippedSets,
    progressLabel: `${auth.main.completedSets} / ${auth.main.totalSets} sets${auth.main.isDone ? ' ✓' : ''}`,
    isCompleted: auth.main.isDone,
    isInProgress: auth.main.isInProgress,
    isPending: !auth.main.isDone && !auth.main.isInProgress,
    completionState: auth.main.isDone ? 'completed' : (auth.main.isInProgress ? 'in_progress' : 'ready'),
    progress: auth.main.pct,
    wireframeKey: 'main'
  };

  let cooldownEstSec = 0;
  auth.cooldown.list.forEach(c => {
    cooldownEstSec += (c.duration_sec || (c.reps ? c.reps * 3 : 30)) + (c.rest_sec || 10);
  });
  const cooldownEstMin = Math.max(3, Math.round(cooldownEstSec / 60));
  const cooldownDurationText = auth.cooldown.total > 0 ? `${Math.max(3, cooldownEstMin - 1)}–${cooldownEstMin + 2} min` : '5–8 min';

  const coolDown = {
    id: 'cooldown',
    stepNumber: 3,
    title: 'COOL DOWN',
    tabLabel: 'Cool Down',
    description: 'Relax, recover and improve flexibility.',
    estimatedDuration: cooldownDurationText,
    estimatedDurationMin: cooldownEstMin,
    exercises: auth.cooldown.list,
    totalCount: auth.cooldown.total,
    completedCount: auth.cooldown.completed,
    skippedCount: auth.cooldown.skipped,
    resolvedCount: auth.cooldown.resolved,
    totalSets: auth.cooldown.total,
    completedSets: auth.cooldown.completed,
    skippedSets: auth.cooldown.skipped,
    progressLabel: `${auth.cooldown.completed} / ${auth.cooldown.total} completed${auth.cooldown.isDone ? (auth.cooldown.isSkipped ? ' (Skipped)' : ' ✓') : ''}`,
    isCompleted: auth.cooldown.isDone,
    isSkipped: auth.cooldown.isSkipped,
    isInProgress: auth.cooldown.isInProgress,
    isPending: !auth.cooldown.isDone && !auth.cooldown.isInProgress && !auth.cooldown.isSkipped,
    completionState: auth.cooldown.isDone ? (auth.cooldown.isSkipped ? 'skipped' : 'completed') : (auth.cooldown.isInProgress ? 'in_progress' : 'pending'),
    progress: auth.cooldown.pct,
    wireframeKey: 'cooldown'
  };

  return {
    warmUp,
    mainWorkout,
    coolDown,
    phases: [warmUp, mainWorkout, coolDown],
    overall: {
      totalExercises: auth.overall.totalExercises,
      completedExercises: auth.overall.completedExercises,
      resolvedExercises: auth.overall.resolvedExercises,
      totalSets: auth.overall.totalSets,
      completedSets: auth.overall.completedSets,
      skippedSets: auth.overall.skippedSets,
      resolvedSets: auth.overall.resolvedSets,
      progressPct: auth.overall.progressPct,
      resolutionPct: auth.overall.resolutionPct,
      isCompleted: auth.overall.isAllFinished
    }
  };
}

// ─── Left Sidebar: Workout Structure Stepper ─────────────────────────────────

function renderWorkoutStructureSidebar(session, activePhase) {
  const model = getWorkoutPhaseModel(session);
  if (!model) return '';

  const { phases, overall } = model;
  const remainingSets = overall.remainingSets != null ? overall.remainingSets : Math.max(0, overall.totalSets - overall.completedSets - overall.skippedSets);

  return `
    <aside class="runner-structure-sidebar">
      <div class="runner-structure-header">
        <span class="runner-structure-title">OVERALL PROGRESS</span>
        <span class="runner-structure-sets-counter mono">${overall.completedSets} / ${overall.totalSets} sets · ${overall.progressPct}%</span>
      </div>

      <div class="runner-progress-breakdown-row mono" style="display:flex; justify-content:space-between; font-size:11px; color:#8a8d9f; margin-bottom:12px; padding:0 2px;">
        <span style="color:#10b981;">✓ ${overall.completedSets} Done</span>
        ${overall.skippedSets > 0 ? `<span style="color:#eab308;">⏭ ${overall.skippedSets} Skipped</span>` : ''}
        <span style="color:#cbd5e1;">⏳ ${remainingSets} Remaining</span>
      </div>

      <div class="runner-timeline-container">
        ${phases.map((phase) => {
          const isActive = activePhase === phase.id;
          const isDone = phase.isCompleted;
          const lockStatus = getPhaseLockStatus(session, phase.id);
          const isLocked = lockStatus.isLocked;
          const badgeText = isDone ? renderIcon('check', 'cx-icon cx-icon-xs') : (isLocked ? renderIcon('lock', 'cx-icon cx-icon-xxs') : phase.stepNumber);

          return `
            <div class="runner-timeline-step-wrapper ${isActive ? 'is-active' : ''} ${isDone ? 'is-completed' : ''} ${isLocked ? 'is-locked' : ''}">
              <div class="runner-timeline-step-badge">
                ${badgeText}
              </div>
              <div class="runner-timeline-card ${isLocked ? 'is-locked' : ''}" onclick="setWorkoutPhase('${phase.id}')" title="${isLocked ? lockStatus.lockReason : `Switch to ${phase.title} Phase`}">
                <div class="runner-timeline-card-top">
                  <span class="runner-timeline-card-title">${isLocked ? `<span class="runner-tab-icon-inline">${renderIcon('lock', 'cx-icon cx-icon-xxs')}</span>` : ''}${phase.title}</span>
                  <div class="runner-timeline-card-art">
                    ${renderPhaseWireframeSvg(phase.wireframeKey)}
                  </div>
                </div>
                <div class="runner-timeline-card-time">${isLocked ? `<span style="color:#eab308; font-size:11px;">🔒 Locked</span> · ` : ''}${phase.estimatedDuration}</div>
                <p class="runner-timeline-card-desc">${isLocked ? `<span style="color:#8a8d9f;">${lockStatus.lockReason}</span>` : phase.description}</p>
                <div class="runner-timeline-card-progress-wrap">
                  <span class="runner-timeline-card-progress-label">${phase.progressLabel}</span>
                  <div class="runner-timeline-card-bar-track">
                    <div class="runner-timeline-card-bar-fill" style="width: ${phase.progress}%;"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Motivation / Consistency Widget -->
      <div class="runner-motivation-card">
        <div class="runner-motivation-icon-badge">
          ${renderIcon('sparkles', 'cx-icon cx-icon-sm')}
        </div>
        <div class="runner-motivation-content">
          <span class="runner-motivation-title">Stay Consistent</span>
          <span class="runner-motivation-text">Consistency today, strength tomorrow.</span>
        </div>
      </div>
    </aside>
  `;
}

// ─── Right Column: Phase Workspace & Interactive Exercises ──────────────────

function renderWorkoutPhaseWorkspace(session, activePhase) {
  const model = getWorkoutPhaseModel(session);
  const curPhaseObj = model ? model.phases.find(p => p.id === activePhase) : null;

  let heroTitle = 'WARM-UP';
  let heroSub = '5–8 min · Prepare your body';
  let heroBtnText = 'Start All Warm-Up';
  let heroPhaseKey = 'warmup';
  let heroActionFn = `startPhaseAutoRunner('warmup')`;

  if (activePhase === 'warmup') {
    if (curPhaseObj && curPhaseObj.isCompleted) {
      heroTitle = '✓ WARM-UP COMPLETE';
      heroSub = `${curPhaseObj.completedCount}/${curPhaseObj.totalCount} completed · Ready for Main Training`;
      heroBtnText = 'Proceed to Main Workout';
      heroActionFn = `setWorkoutPhase('main')`;
    }
  } else if (activePhase === 'main') {
    heroTitle = 'MAIN WORKOUT';
    heroSub = '20–30 min · Build strength & skill';
    heroBtnText = 'Start Main Workout';
    heroPhaseKey = 'main';
    heroActionFn = `startPhaseAutoRunner('main')`;
    if (curPhaseObj && curPhaseObj.isCompleted) {
      heroTitle = '✓ MAIN WORKOUT COMPLETE';
      heroSub = `${curPhaseObj.completedSets}/${curPhaseObj.totalSets} sets completed · Proceed to Cool Down`;
      heroBtnText = 'Proceed to Cool Down';
      heroActionFn = `setWorkoutPhase('cooldown')`;
    }
  } else if (activePhase === 'cooldown') {
    heroTitle = 'COOL DOWN';
    heroSub = '5–8 min · Relax, recover and improve flexibility.';
    heroBtnText = 'Start All Cool Down';
    heroPhaseKey = 'cooldown';
    heroActionFn = `startPhaseAutoRunner('cooldown')`;
    if (curPhaseObj && curPhaseObj.isCompleted) {
      heroTitle = '✓ COOL DOWN COMPLETE';
      heroSub = `${curPhaseObj.completedCount}/${curPhaseObj.totalCount} stretches completed · Great session!`;
      heroBtnText = 'Finish & Log Workout';
      heroActionFn = `finishWorkoutSession()`;
    }
  }

  // 1. Rest timer banner if active
  const restProgressPct = _workoutRestState.total > 0
    ? Math.max(0, Math.min(100, (_workoutRestState.remaining / _workoutRestState.total) * 100))
    : 0;
  const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;
  const restCountdownHtml = _workoutRestState.active ? `
    <div class="runner-rest-card ${isLast3s ? 'is-pulse-alert' : ''}" id="workout-rest-card-container" role="region" aria-label="Rest Timer" style="margin-bottom:18px;">
      <div class="runner-rest-top">
        <div class="runner-rest-info">
          <span class="runner-rest-tag">${renderIcon('timer', 'cx-icon cx-icon-inline cx-icon-xs')} REST</span>
          <span class="runner-rest-digits mono ${isLast3s ? 'pulse-digits' : ''}" id="workout-rest-timer-val">${fmtSecs(_workoutRestState.remaining)}</span>
          ${_workoutRestState.nextInfo ? `<span class="runner-rest-next">${_workoutRestState.nextInfo}</span>` : ''}
        </div>
        <div class="runner-rest-controls">
          <button class="runner-rest-btn" type="button" onclick="adjustWorkoutRest(-15)">-15s</button>
          <button class="runner-rest-btn" type="button" onclick="adjustWorkoutRest(15)">+15s</button>
          <button class="runner-rest-skip-btn" type="button" onclick="stopWorkoutRest()">
            ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Skip Rest
          </button>
        </div>
      </div>
      <div class="runner-rest-bar-track">
        <div class="runner-rest-bar-fill" id="workout-rest-timer-bar" style="width: ${restProgressPct}%;"></div>
      </div>
    </div>` : '';

  // 2. Focused Mobile Card Runner View
  let activeCardRunnerHtml = '';
  if (activePhase === 'warmup') {
    const list = getWarmupExercises(session);
    if (list.length === 0) {
      activeCardRunnerHtml = `
        <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(124, 92, 252, 0.1); color: #a29bfe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
          </div>
          <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Warm-up unavailable</h3>
          <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No warm-up exercises are configured for this workout. The main workout can still continue.</p>
          <button class="btn btn-secondary" type="button" onclick="setWorkoutPhase('main')" style="font-size: 13px; padding: 8px 18px;">
            Proceed to Main Workout →
          </button>
        </div>
      `;
    } else if (session.warmupStatus === 'COMPLETED' || session.warmup_status === 'completed' || list.every(w => w.completed || w.skipped)) {
      activeCardRunnerHtml = renderWarmupCompleteView(session);
    } else {
      activeCardRunnerHtml = renderWarmupCardView(session);
    }
  } else if (activePhase === 'cooldown') {
    const list = getCooldownExercises(session);
    if (list.length === 0) {
      activeCardRunnerHtml = `
        <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(124, 92, 252, 0.1); color: #a29bfe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
          </div>
          <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Cool-down unavailable</h3>
          <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No cool-down stretches are configured for this workout.</p>
          <button class="btn btn-primary" type="button" onclick="requestFinishWorkout()" style="font-size: 13px; padding: 8px 18px;">
            Finish Workout
          </button>
        </div>
      `;
    } else {
      activeCardRunnerHtml = renderCooldownCardView(session);
    }
  } else {
    const list = getMainWorkoutExercises(session);
    if (list.length > 0 && list.every(ex => ex.sets && ex.sets.every(s => s.completed || s.skipped))) {
      activeCardRunnerHtml = renderMainWorkoutCompleteView(session);
    } else {
      activeCardRunnerHtml = renderMainWorkoutCardView(session);
    }
  }

  // 3. Exercise items list rendering
  let exercisesStackHtml = '';

  if (activePhase === 'warmup') {
    const list = getWarmupExercises(session);
    if (list.length === 0) {
      exercisesStackHtml = `
        <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(124, 92, 252, 0.1); color: #a29bfe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
          </div>
          <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Warm-up unavailable</h3>
          <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No warm-up exercises are configured for this workout. The main workout can still continue.</p>
          <button class="btn btn-secondary" type="button" onclick="setWorkoutPhase('main')" style="font-size: 13px; padding: 8px 18px;">
            Proceed to Main Workout →
          </button>
        </div>
      `;
    } else {
      exercisesStackHtml = list.map((item, idx) => {
        const isCurrent = session.warmup_idx === idx;
        const isCompleted = !!item.completed;
        const isSkipped = !!item.skipped;
        const isDone = isCompleted || isSkipped;
        const isHold = item.exercise_type === 'duration';
        const pt = session.phaseTimer || {};
        const isRunning = isCurrent && pt.isRunning;
        const targetVal = isHold ? (item.duration_sec || 30) : (item.reps || 10);
        const displayVal = isRunning ? (pt.remaining != null ? pt.remaining : targetVal) : targetVal;

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isCompleted ? 'is-completed' : (isSkipped ? 'is-skipped' : '')}" id="warmup-card-${idx}">
            <div class="runner-runner-ex-card-left" onclick="selectExerciseToExecute('warmup', ${idx})" style="cursor:pointer;">
              <div class="runner-ex-thumb-box">
                ${renderExerciseThumbnailSvg(item)}
              </div>
              <div class="runner-ex-text-group">
                <span class="runner-ex-name-label">${item.exercise_name}</span>
                <span class="runner-ex-sub-label">${item.duration_text || (isHold ? `${targetVal} sec` : `${targetVal} reps`)}</span>
              </div>
            </div>

            <div class="runner-ex-card-right">
              <span class="runner-ex-duration-tag">
                ${renderIcon('timer', 'cx-icon cx-icon-xs')}
                <span>${item.est_duration || '1 min'}</span>
              </span>

              <button class="runner-ex-action-btn ${isRunning ? 'is-active-btn' : (isCompleted ? 'is-done-btn' : (isSkipped ? 'is-skipped-btn' : ''))}" type="button" onclick="selectExerciseToExecute('warmup', ${idx})">
                ${isRunning ? (pt.isRunning ? 'Pause' : 'Resume') : (isCompleted ? '✓ Completed' : (isSkipped ? '⏭ Skipped' : 'Start'))}
              </button>

              <button class="runner-ex-checkbox-btn ${isCompleted ? 'is-checked' : (isSkipped ? 'is-skipped' : '')}" type="button" onclick="toggleWarmupItemComplete(${idx})" title="${isCompleted ? 'Mark uncompleted' : (isSkipped ? 'Skipped - click to complete' : 'Mark completed')}">
                ${isCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : (isSkipped ? renderIcon('skipForward', 'cx-icon cx-icon-xs') : '')}
              </button>
            </div>
          </div>

          ${isCurrent ? `
            <div class="runner-prep-stage" style="margin: -2px 0 14px; border-radius: 0 0 14px 14px; border-top: none;">
              <div class="runner-prep-timer-card">
                <div class="runner-radial-timer-container">
                  <svg class="runner-radial-ring-svg" width="140" height="140" viewBox="0 0 160 160">
                    <circle class="runner-radial-track" cx="80" cy="80" r="70" />
                    <circle class="runner-radial-progress warmup" id="runner-radial-progress-circle" cx="80" cy="80" r="70" stroke-dasharray="440" stroke-dashoffset="${(440 * (1 - (isHold && pt.duration > 0 ? (displayVal / pt.duration) : 1))).toFixed(1)}" transform="rotate(-90 80 80)" />
                  </svg>
                  <div class="runner-radial-timer-inner">
                    <div class="runner-prep-digits mono ${isRunning ? 'is-pulse' : ''}" id="runner-phase-timer-digits">
                      ${displayVal} <span class="runner-digits-unit-label">${isHold ? 'SEC' : 'REPS'}</span>
                    </div>
                    <span class="runner-prep-digits-unit">${isHold ? 'Countdown Timer' : 'Target Count'}</span>
                  </div>
                </div>

                <div class="runner-prep-timer-controls">
                  <button class="runner-prep-timer-btn" type="button" onclick="adjustPhaseTimer(-5)">-5s</button>
                  ${isHold ? `
                    <button class="runner-prep-timer-btn" id="runner-phase-timer-toggle-btn" type="button" style="color:var(--text); border-color:var(--accent);" onclick="togglePhaseTimer()">
                      ${renderIcon(isRunning ? 'pause' : 'play', 'cx-icon cx-icon-xs cx-icon-inline')} ${isRunning ? 'Pause' : 'Start'}
                    </button>
                  ` : ''}
                  <button class="runner-prep-timer-btn" type="button" onclick="adjustPhaseTimer(5)">+5s</button>
                </div>
              </div>

              ${renderAutoAdvanceHtml()}

              <button class="runner-prep-primary-btn" type="button" onclick="advanceWarmupMovement()">
                ${renderIcon('check', 'cx-icon cx-icon-inline cx-icon-md')} ${idx >= list.length - 1 ? 'Complete Warm-up & Enter Main Workout' : 'Complete Movement & Next'}
              </button>
            </div>
          ` : ''}
        `;
      }).join('');
    }
  } else if (activePhase === 'cooldown') {
    const list = getCooldownExercises(session);
    if (list.length === 0) {
      exercisesStackHtml = `
        <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(124, 92, 252, 0.1); color: #a29bfe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
          </div>
          <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Cool-down unavailable</h3>
          <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No cool-down stretches are configured for this workout.</p>
          <button class="btn btn-primary" type="button" onclick="requestFinishWorkout()" style="font-size: 13px; padding: 8px 18px;">
            Finish Workout
          </button>
        </div>
      `;
    } else {
      exercisesStackHtml = list.map((item, idx) => {
        const isCurrent = session.cooldown_idx === idx;
        const isCompleted = !!item.completed;
        const isSkipped = !!item.skipped;
        const isDone = isCompleted || isSkipped;
        const isHold = item.exercise_type === 'duration';
        const pt = session.phaseTimer || {};
        const isRunning = isCurrent && pt.isRunning;
        const targetVal = isHold ? (item.duration_sec || 30) : (item.reps || 10);
        const displayVal = isRunning ? (pt.remaining != null ? pt.remaining : targetVal) : targetVal;

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isCompleted ? 'is-completed' : (isSkipped ? 'is-skipped' : '')}" id="cooldown-card-${idx}">
            <div class="runner-runner-ex-card-left" onclick="selectExerciseToExecute('cooldown', ${idx})" style="cursor:pointer;">
              <div class="runner-ex-thumb-box">
                ${renderExerciseThumbnailSvg(item)}
              </div>
              <div class="runner-ex-text-group">
                <span class="runner-ex-name-label">${item.exercise_name}</span>
                <span class="runner-ex-sub-label">${item.duration_text || (isHold ? `${targetVal} sec` : `${targetVal} reps`)}</span>
              </div>
            </div>

            <div class="runner-ex-card-right">
              <span class="runner-ex-duration-tag">
                ${renderIcon('timer', 'cx-icon cx-icon-xs')}
                <span>${item.est_duration || '1 min'}</span>
              </span>

              <button class="runner-ex-action-btn ${isRunning ? 'is-active-btn' : (isCompleted ? 'is-done-btn' : (isSkipped ? 'is-skipped-btn' : ''))}" type="button" onclick="selectExerciseToExecute('cooldown', ${idx})">
                ${isRunning ? (pt.isRunning ? 'Pause' : 'Resume') : (isCompleted ? '✓ Completed' : (isSkipped ? '⏭ Skipped' : 'Start'))}
              </button>

              <button class="runner-ex-checkbox-btn ${isCompleted ? 'is-checked' : (isSkipped ? 'is-skipped' : '')}" type="button" onclick="toggleCooldownItemComplete(${idx})" title="${isCompleted ? 'Mark uncompleted' : (isSkipped ? 'Skipped - click to complete' : 'Mark completed')}">
                ${isCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : (isSkipped ? renderIcon('skipForward', 'cx-icon cx-icon-xs') : '')}
              </button>
            </div>
          </div>

          ${isCurrent ? `
            <div class="runner-prep-stage" style="margin: -2px 0 14px; border-radius: 0 0 14px 14px; border-top: none;">
              <div class="runner-prep-timer-card">
                <div class="runner-radial-timer-container">
                  <svg class="runner-radial-ring-svg" width="140" height="140" viewBox="0 0 160 160">
                    <circle class="runner-radial-track" cx="80" cy="80" r="70" />
                    <circle class="runner-radial-progress cooldown" id="runner-radial-progress-circle" cx="80" cy="80" r="70" stroke-dasharray="440" stroke-dashoffset="${(440 * (1 - (isHold && pt.duration > 0 ? (displayVal / pt.duration) : 1))).toFixed(1)}" transform="rotate(-90 80 80)" />
                  </svg>
                  <div class="runner-radial-timer-inner">
                    <div class="runner-prep-digits mono ${isRunning ? 'is-pulse' : ''}" id="runner-phase-timer-digits">
                      ${displayVal} <span class="runner-digits-unit-label">SEC</span>
                    </div>
                    <span class="runner-prep-digits-unit">Stretch Hold Countdown</span>
                  </div>
                </div>

                <div class="runner-prep-timer-controls">
                  <button class="runner-prep-timer-btn" type="button" onclick="adjustPhaseTimer(-5)">-5s</button>
                  <button class="runner-prep-timer-btn" id="runner-phase-timer-toggle-btn" type="button" style="color:var(--text); border-color:var(--accent);" onclick="togglePhaseTimer()">
                    ${renderIcon(isRunning ? 'pause' : 'play', 'cx-icon cx-icon-xs cx-icon-inline')} ${isRunning ? 'Pause' : 'Start'}
                  </button>
                  <button class="runner-prep-timer-btn" type="button" onclick="adjustPhaseTimer(5)">+5s</button>
                </div>
              </div>

              ${renderAutoAdvanceHtml()}

              <button class="runner-prep-primary-btn" type="button" onclick="advanceCooldownStretch()">
                ${renderIcon('check', 'cx-icon cx-icon-inline cx-icon-md')} ${idx >= list.length - 1 ? 'Finish Workout Session' : 'Next Stretch'}
              </button>
            </div>
          ` : ''}
        `;
      }).join('');
    }
  } else {
    // Main Workout Phase
    const list = getMainWorkoutExercises(session);
    if (list.length === 0) {
      exercisesStackHtml = `
        <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: 14px; margin-bottom: 20px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #f87171; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
          </div>
          <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">No Exercises Configured</h3>
          <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No main exercises could be loaded for this workout session.</p>
          <button class="btn btn-secondary" type="button" onclick="openDiscardWorkoutModal()" style="font-size: 13px; padding: 8px 18px;">
            Return to Dashboard
          </button>
        </div>
      `;
    } else {
      let activeExIdx = session.activeExerciseIndex != null ? session.activeExerciseIndex : (_selectedWorkoutExIdx != null ? _selectedWorkoutExIdx : 0);
      if (activeExIdx < 0 || activeExIdx >= list.length) activeExIdx = 0;

      exercisesStackHtml = list.map((ex, exIdx) => {
        const isCurrent = exIdx === activeExIdx;
        const totalSets = ex.sets ? ex.sets.length : 0;
        const doneCount = ex.sets ? ex.sets.filter(s => s.completed).length : 0;
        const skippedCount = ex.sets ? ex.sets.filter(s => s.skipped).length : 0;
        const isAllCompleted = totalSets > 0 && doneCount === totalSets;
        const isAllSkipped = totalSets > 0 && skippedCount === totalSets;
        const isFullyResolved = totalSets > 0 && (doneCount + skippedCount) === totalSets;
        const isPartiallyCompleted = isFullyResolved && doneCount > 0 && !isAllCompleted;
        const isHold = ex.exercise_type === 'duration';

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isAllCompleted ? 'is-completed' : (isAllSkipped ? 'is-skipped' : (isPartiallyCompleted ? 'is-resolved' : ''))}" id="main-card-${exIdx}">
            <div class="runner-runner-ex-card-left" onclick="selectExerciseToExecute('main', ${exIdx})" style="cursor:pointer;">
              <div class="runner-ex-thumb-box">
                ${renderExerciseThumbnailSvg(ex)}
              </div>
              <div class="runner-ex-text-group">
                <span class="runner-ex-name-label">${ex.exercise_name}</span>
                <span class="runner-ex-sub-label">${totalSets} sets × ${ex.sets[0]?.target_val || 10}${isHold ? 's hold' : ' reps'} · ${ex.rest_sec || 90}s rest</span>
              </div>
            </div>

            <div class="runner-ex-card-right">
              <span class="runner-ex-duration-tag">
                <span class="mono">${doneCount}/${totalSets} sets${skippedCount > 0 ? ` (${skippedCount} skp)` : ''}</span>
              </span>

              <button class="runner-ex-action-btn ${isCurrent ? 'is-active-btn' : ''}" type="button" onclick="selectExerciseToExecute('main', ${exIdx})">
                ${isCurrent ? 'Active' : (isFullyResolved ? 'Review' : 'Start')}
              </button>

              <button class="runner-ex-checkbox-btn ${isAllCompleted ? 'is-checked' : (isAllSkipped ? 'is-skipped' : (isPartiallyCompleted ? 'is-partial' : ''))}" type="button" onclick="toggleMainExerciseComplete(${exIdx})" title="${isFullyResolved ? 'Mark uncompleted' : 'Mark all sets completed'}">
                ${isAllCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : (isAllSkipped ? renderIcon('skipForward', 'cx-icon cx-icon-xs') : (isPartiallyCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : ''))}
              </button>
            </div>
          </div>

          ${isCurrent ? `
            <div class="card" style="margin: -2px 0 16px; border-radius: 0 0 14px 14px; border-top: none; background: rgba(22, 23, 36, 0.7); padding: 18px 20px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div>
                  <span style="font-size:12px; font-weight:700; color:#cbd5e1; text-transform:uppercase; letter-spacing:0.05em;">Exercise ${exIdx + 1} of ${list.length}</span>
                  <span style="font-size:11px; color:#8a8d9f; margin-left:8px;">SETS & PROGRESSION</span>
                </div>
                <span class="runner-pattern-badge">${(ex.notes || (isHold ? 'Isometric Hold' : 'Bodyweight')).toUpperCase()}</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px;">
                ${ex.sets.map((s, sIdx) => {
                  const sCompleted = s.completed;
                  const sSkipped = s.skipped;
                  const isThisHold = isHold && _workoutHoldState.exIdx === exIdx && _workoutHoldState.setIdx === sIdx;
                  const currentActual = s.actual_val !== null && s.actual_val !== undefined ? s.actual_val : s.target_val;

                  return `
                    <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.03); border:1px solid ${sCompleted ? 'rgba(16,185,129,0.3)' : (sSkipped ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.06)')}; border-radius:10px; padding:10px 14px;">
                      <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <span class="mono" style="font-weight:700; font-size:13px; color:${sCompleted ? '#10b981' : (sSkipped ? '#eab308' : '#a29bfe')};">SET ${s.set_num}${sSkipped ? ' (SKIPPED)' : ''}</span>
                          <span style="font-size:12px; color:#8a8d9f;">Target: <strong>${s.target_val}${isHold ? 's' : ' reps'}</strong></span>
                          ${s.weight_kg ? `<span class="runner-weight-pill mono">+${s.weight_kg}kg</span>` : ''}
                          ${s.rpe ? `<span class="mono" style="font-size:11px; color:#a29bfe;">RPE ${s.rpe}</span>` : ''}
                        </div>

                        <div style="display:flex; align-items:center; gap:12px;">
                          ${!isHold ? `
                            <div style="display:flex; align-items:center; gap:6px;">
                              <button class="btn btn-secondary" style="padding:2px 8px; font-size:12px;" onclick="adjustWorkoutSetActual(${exIdx}, ${sIdx}, -1)">-</button>
                              <span class="mono" style="font-weight:700; font-size:13px; min-width:24px; text-align:center;">${currentActual}</span>
                              <button class="btn btn-secondary" style="padding:2px 8px; font-size:12px;" onclick="adjustWorkoutSetActual(${exIdx}, ${sIdx}, 1)">+</button>
                            </div>
                          ` : `
                            <button class="btn ${isThisHold ? 'btn-danger' : 'btn-secondary'}" style="padding:4px 10px; font-size:12px;" onclick="${isThisHold ? 'stopWorkoutHold(true)' : `startWorkoutHold(${exIdx}, ${sIdx})`}">
                              ${renderIcon(isThisHold ? 'pause' : 'play', 'cx-icon cx-icon-xs cx-icon-inline')} ${isThisHold ? `${_workoutHoldState.elapsed}s Stop` : 'Hold'}
                            </button>
                          `}

                          <button class="runner-ex-checkbox-btn ${sCompleted ? 'is-checked' : (sSkipped ? 'is-skipped' : '')}" style="width:26px; height:26px; min-width:26px;" onclick="toggleWorkoutSet(${exIdx}, ${sIdx})" title="${sCompleted ? 'Mark uncompleted' : (sSkipped ? 'Skipped - click to complete' : 'Toggle set complete')}">
                            ${sCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : (sSkipped ? renderIcon('skipForward', 'cx-icon cx-icon-xs') : '')}
                          </button>
                        </div>
                      </div>

                      <details style="margin-top:2px;">
                        <summary style="font-size:11px; color:#8a8d9f; cursor:pointer; list-style:none; display:flex; align-items:center; gap:4px;">
                          <span>+ Set details (weight, RPE)</span>
                        </summary>
                        <div style="display:flex; gap:10px; margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.05);">
                          <div style="flex:1;">
                            <label style="font-size:10.5px; color:#8a8d9f; display:block; margin-bottom:3px;">Weight (+kg)</label>
                            <input type="number" min="0" step="0.5" placeholder="0 kg" value="${s.weight_kg || ''}" onchange="updateWorkoutSetWeight(${exIdx}, ${sIdx}, this.value)" class="form-input mono" style="padding:4px 8px; font-size:12px; height:28px;">
                          </div>
                          <div style="flex:1;">
                            <label style="font-size:10.5px; color:#8a8d9f; display:block; margin-bottom:3px;">RPE (Effort)</label>
                            <select onchange="updateWorkoutSetRPE(${exIdx}, ${sIdx}, this.value)" class="form-input form-select mono" style="padding:4px 8px; font-size:12px; height:28px;">
                              <option value="">RPE</option>
                              <option value="6" ${s.rpe == 6 ? 'selected' : ''}>RPE 6</option>
                              <option value="7" ${s.rpe == 7 ? 'selected' : ''}>RPE 7</option>
                              <option value="8" ${s.rpe == 8 ? 'selected' : ''}>RPE 8</option>
                              <option value="9" ${s.rpe == 9 ? 'selected' : ''}>RPE 9</option>
                              <option value="10" ${s.rpe == 10 ? 'selected' : ''}>RPE 10</option>
                            </select>
                          </div>
                        </div>
                      </details>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Form Cue Strip -->
              <div style="margin-top:14px; padding:10px 14px; border-radius:8px; background:rgba(124,92,252,0.06); border:1px solid rgba(124,92,252,0.18); display:flex; align-items:center; gap:10px;">
                <span style="color:#a29bfe;">${renderIcon('lightbulb', 'cx-icon cx-icon-xs')}</span>
                <span style="font-size:12px; color:#cbd5e1;"><strong>Form Focus:</strong> ${getExerciseContextualTip(ex)}</span>
              </div>
            </div>
          ` : ''}
        `;
      }).join('');
    }
  }

  // Educational benefits footer
  let benefitTitle = 'Why Warm-Up?';
  let benefitDesc = 'Elevates core temperature, lubricates joints, activates the nervous system, and prevents injury.';
  let benefitAvatarSvg = renderPhaseWireframeSvg('warmup');
  let benefitPills = [
    { icon: renderIcon('shieldCheck', 'cx-icon cx-icon-xs'), label: 'Joint Mobility' },
    { icon: renderIcon('zap', 'cx-icon cx-icon-xs'), label: 'CNS Activation' },
    { icon: renderIcon('award', 'cx-icon cx-icon-xs'), label: 'Better Range' }
  ];

  if (activePhase === 'main') {
    benefitTitle = 'Main Workout Focus';
    benefitDesc = 'Follow target reps and rest intervals for progressive overload. Log every completed set accurately.';
    benefitAvatarSvg = renderPhaseWireframeSvg('main');
    benefitPills = [
      { icon: renderIcon('target', 'cx-icon cx-icon-xs'), label: 'SETS & PROGRESSION' },
      { icon: renderIcon('trendingUp', 'cx-icon cx-icon-xs'), label: 'Progressive Overload' },
      { icon: renderIcon('activity', 'cx-icon cx-icon-xs'), label: 'Volume Tracking' }
    ];
  } else if (activePhase === 'cooldown') {
    benefitTitle = 'Why Cool Down?';
    benefitDesc = 'Brings heart rate back to resting levels, prevents blood pooling, restores muscle length, and kickstarts recovery.';
    benefitAvatarSvg = renderPhaseWireframeSvg('cooldown');
    benefitPills = [
      { icon: renderIcon('heart', 'cx-icon cx-icon-xs'), label: 'Lower Heart Rate' },
      { icon: renderIcon('sparkles', 'cx-icon cx-icon-xs'), label: 'Faster Recovery' },
      { icon: renderIcon('layers', 'cx-icon cx-icon-xs'), label: 'Flexibility Gain' }
    ];
  }

  if (activePhase === 'warmup') {
    let list = getWarmupExercises(session);
    // ── AUTO-REPAIR: if the session's warmup array is empty, inject defaults ──
    // This guards against stale sessions that were stored before the default
    // warm-up generators were introduced, and against any other edge case where
    // getWarmupExercises() returns an empty list despite the phase being warmup.
    if (!session.warmup) {
      const routineName = session.routine || session.workout_name || '';
      const defaultWarmup = getDefaultWarmupForRoutine(routineName);
      if (defaultWarmup.length > 0) {
        session.warmup = defaultWarmup.map((le, idx) => ({
          id: le.id || (idx + 1),
          exercise_id: null,
          exercise_name: le.exercise_name || 'Warm-up Movement',
          exercise_type: le.exercise_type || 'duration',
          phase: 'warm_up',
          target_val: le.target_val || le.duration_sec || le.reps || 30,
          actual_val: le.exercise_type === 'reps' ? (le.reps || le.target_val || 10) : 0,
          duration_sec: le.duration_sec || null,
          reps: le.reps || null,
          duration_text: le.duration_text || '',
          est_duration: le.est_duration || '1 min',
          rest_sec: le.rest_sec || 10,
          notes: le.notes || '',
          completed: false,
          completed_at: null,
          skipped: false,
          skipped_at: null,
          client_uuid: newUUID()
        }));
        if (!session.warmup_status || session.warmup_status === 'none') {
          session.warmup_status = 'ready';
        }
        if (session.warmupStatus === 'SKIPPED' || !session.warmupStatus) {
          session.warmupStatus = 'IDLE';
        }
        saveActiveSession(session);
        list = getWarmupExercises(session);
      }
    }
    // ── END AUTO-REPAIR ───────────────────────────────────────────────────────
    if (list.length === 0) {
      // Truly no warm-up possible (no defaults available) → allow skip to main
      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Warm-up Unavailable">
          ${renderWorkoutSegmentedTabs(session, activePhase)}
          <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(124, 92, 252, 0.1); color: #a29bfe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
            </div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Warm-up unavailable</h3>
            <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No warm-up exercises are configured for this workout. The main workout can still continue.</p>
            <button class="btn btn-secondary" type="button" onclick="setWorkoutPhase('main')" style="font-size: 13px; padding: 8px 18px;">
              Proceed to Main Workout →
            </button>
          </div>
        </main>
      `;
    }

    const isWarmupDone = session.warmupStatus === 'COMPLETED' || session.warmup_status === 'completed' || (list.length > 0 && list.every(w => w.completed || w.skipped));
    const isWarmupActive = !isWarmupDone && (session.warmupStatus === 'ACTIVE' || session.warmup_status === 'in_progress' || (session.phaseState === 'ACTIVE' && isWarmupPhase(session.phase)));

    if (isWarmupDone) {
      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Warm-Up Complete">
          ${renderWarmupCompleteView(session)}
        </main>
      `;
    }

    if (isWarmupActive) {
      let activeWmIdx = session.warmupIndex != null && session.warmupIndex < list.length
        ? session.warmupIndex
        : (session.warmup_idx != null && session.warmup_idx < list.length ? session.warmup_idx : 0);

      const currentItem = list[activeWmIdx] || list[0];

      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Active Warm-Up">
          <!-- Horizontal Warmup Movement Queue Pill Strip -->
          <div class="runner-queue-selector-strip" style="display:flex; gap:8px; overflow-x:auto; padding:4px 2px 14px; scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:12px;">
            ${list.map((item, i) => {
              const isCur = i === activeWmIdx;
              const isDone = !!item.completed;
              const isSkipped = !!item.skipped;
              const badgeIcon = isDone ? '✓' : (isSkipped ? '⏭' : `${i + 1}.`);
              const pillColor = isCur ? '#ffffff' : (isDone ? '#10b981' : (isSkipped ? '#eab308' : '#8a8d9f'));
              return `
                <button type="button" id="warmup-card-${i}" onclick="selectWarmupMovement(${i})" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; border:1px solid ${isCur ? 'rgba(124,92,252,0.6)' : 'rgba(255,255,255,0.08)'}; background:${isCur ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.03)'}; color:${pillColor}; cursor:pointer;">
                  <span>${badgeIcon}</span>
                  <span>${item.exercise_name}</span>
                </button>
              `;
            }).join('')}
          </div>

          <div class="runner-stage-dual-grid">
            <div class="runner-stage-col-card">
              ${renderWarmupCardView(session)}
            </div>
            <div class="runner-stage-col-visuals">
              ${renderExerciseVisualStageCard(currentItem, 'warmup')}
              ${renderExerciseMuscleFocusCard(currentItem, 'warmup')}
            </div>
          </div>
        </main>
      `;
    }

    // Warm-Up Overview state (IDLE / not started)
    return `
      <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Warm-Up Overview">
        <div class="runner-phase-hero-banner">
          <div class="runner-phase-hero-left">
            <div class="runner-phase-hero-icon-avatar">
              ${renderPhaseWireframeSvg('warmup')}
            </div>
            <div class="runner-phase-hero-info">
              <h2 class="runner-phase-hero-title">WARM-UP</h2>
              <span class="runner-phase-hero-sub">5–8 min · Prepare your body and activate muscles.</span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button class="runner-phase-hero-action-btn" type="button" onclick="startPhaseAutoRunner('warmup')">
              ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')}
              <span>Start All Warm-Up</span>
            </button>
            <button class="btn btn-outline" type="button" onclick="openSkipWarmupPhaseModal()" style="padding:10px 14px; font-size:12.5px; font-weight:700; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#8a8d9f; cursor:pointer;" title="Skip Warm-Up Phase">
              Skip Warm-Up
            </button>
          </div>
        </div>

        <div class="runner-exercise-stack">
          ${list.map((item, idx) => `
            <div class="runner-exercise-item-card" id="warmup-card-${idx}">
              <div class="runner-runner-ex-card-left" onclick="selectWarmupMovement(${idx})" style="cursor:pointer;">
                <div class="runner-ex-thumb-box">
                  ${renderExerciseThumbnailSvg(item)}
                </div>
                <div class="runner-ex-text-group">
                  <span class="runner-ex-name-label">${item.exercise_name}</span>
                  <span class="runner-ex-sub-label">${item.exercise_type === 'duration' ? `${item.duration_sec || 30} sec` : `${item.reps || 10} reps`}</span>
                </div>
              </div>

              <div class="runner-ex-card-right">
                <span class="runner-ex-duration-tag">
                  ${renderIcon('timer', 'cx-icon cx-icon-xs')}
                  <span>${item.est_duration || '1 min'}</span>
                </span>

                <button class="runner-ex-action-btn" type="button" onclick="selectWarmupMovement(${idx})">
                  Start
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Educational / Benefits Footer Card -->
        <div class="runner-phase-benefits-card">
          <div class="runner-benefits-left">
            <div class="runner-benefits-avatar">
              ${benefitAvatarSvg}
            </div>
            <div class="runner-benefits-text">
              <h3 class="runner-benefits-title">${benefitTitle}</h3>
              <p class="runner-benefits-desc">${benefitDesc}</p>
            </div>
          </div>

          <div class="runner-benefits-columns">
            ${benefitPills.map(p => `
              <div class="runner-benefit-pill-item">
                <div class="runner-benefit-pill-icon">${p.icon}</div>
                <span class="runner-benefit-pill-label">${p.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    `;
  }

  if (activePhase === 'main') {
    const list = getMainWorkoutExercises(session);
    const isMainDone = session.mainStatus === 'COMPLETED' || (list.length > 0 && list.every(ex => ex.sets && ex.sets.every(s => s.completed || s.skipped)));

    if (isMainDone) {
      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Main Workout Complete">
          ${renderMainWorkoutCompleteView(session)}
        </main>
      `;
    }

    // Active Main Workout Tracker
    let activeExIdx = session.activeExerciseIndex != null && session.activeExerciseIndex < list.length
      ? session.activeExerciseIndex
      : (_selectedWorkoutExIdx != null && _selectedWorkoutExIdx < list.length ? _selectedWorkoutExIdx : 0);

    const currentEx = list[activeExIdx] || list[0];

    return `
      <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Main Workout Tracker">
        <!-- Horizontal Exercise Queue Pill Strip -->
        <div class="runner-queue-selector-strip" style="display:flex; gap:8px; overflow-x:auto; padding:4px 2px 14px; scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:12px;">
          ${list.map((ex, i) => {
            const isCur = i === activeExIdx;
            const totalSets = ex.sets ? ex.sets.length : 0;
            const setsDone = ex.sets ? ex.sets.filter(s => s.completed).length : 0;
            const setsSkipped = ex.sets ? ex.sets.filter(s => s.skipped).length : 0;
            const isAllCompleted = totalSets > 0 && setsDone === totalSets;
            const isAllSkipped = totalSets > 0 && setsSkipped === totalSets;
            const isFullyResolved = totalSets > 0 && (setsDone + setsSkipped) === totalSets;
            const badgeIcon = isAllCompleted ? '✓' : (isAllSkipped ? '⏭' : (isFullyResolved ? '✓' : `${i + 1}.`));
            const pillColor = isCur ? '#ffffff' : (isAllCompleted ? '#10b981' : (isAllSkipped ? '#eab308' : (isFullyResolved ? '#10b981' : '#8a8d9f')));
            return `
              <button type="button" id="main-card-${i}" onclick="selectExerciseToExecute('main', ${i})" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; border:1px solid ${isCur ? 'rgba(124,92,252,0.6)' : 'rgba(255,255,255,0.08)'}; background:${isCur ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.03)'}; color:${pillColor}; cursor:pointer;">
                <span>${badgeIcon}</span>
                <span>${ex.exercise_name}</span>
                <span class="mono" style="font-size:11px; opacity:0.75;">(${setsDone}/${totalSets}${setsSkipped > 0 ? ` · ${setsSkipped} skp` : ''})</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="runner-stage-dual-grid">
          <div class="runner-stage-col-card">
            ${(session.mainWorkoutSubState === (typeof MAIN_WORKOUT_STATES !== 'undefined' ? MAIN_WORKOUT_STATES.RESTING : 'RESTING') || _workoutRestState.active || (session.restTimer && session.restTimer.isRunning)) ? renderWorkoutRestView(session) : renderMainWorkoutCardView(session)}
          </div>
          <div class="runner-stage-col-visuals">
            ${renderExerciseVisualStageCard(currentEx, 'main')}
            ${renderExerciseMuscleFocusCard(currentEx, 'main')}
          </div>
        </div>
      </main>
    `;
  }

  if (activePhase === 'cooldown') {
    const list = getCooldownExercises(session);
    if (list.length === 0) {
      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Cool-down Unavailable">
          <div class="card" style="padding: 28px 24px; text-align: center; background: rgba(22, 23, 36, 0.5); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 14px; margin-bottom: 20px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              ${renderIcon('alertCircle', 'cx-icon cx-icon-md')}
            </div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Cool-down unavailable</h3>
            <p style="font-size: 13px; color: #8a8d9f; max-width: 400px; margin: 0 auto 16px; line-height: 1.4;">No cool-down stretches configured. You can finish your workout now.</p>
            <button class="btn btn-primary" type="button" onclick="requestFinishWorkout()" style="font-size: 13px; padding: 8px 18px;">
              Finish Workout Session
            </button>
          </div>
        </main>
      `;
    }

    const isCooldownDone = session.cooldownStatus === 'COMPLETED' || session.cooldown_status === 'completed' || (list.length > 0 && list.every(c => c.completed || c.skipped));
    const isCooldownActive = !isCooldownDone && (session.cooldownStatus === 'ACTIVE' || session.cooldown_status === 'in_progress' || (session.phaseState === 'ACTIVE' && isCooldownPhase(session.phase)));

    if (isCooldownDone) {
      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Cool Down Complete">
          ${renderWorkoutCompleteView(session, session.summaryData || getWorkoutSessionSummaryMetrics(session))}
        </main>
      `;
    }

    if (isCooldownActive) {
      let activeCdIdx = session.cooldownIndex != null && session.cooldownIndex < list.length
        ? session.cooldownIndex
        : (session.cooldown_idx != null && session.cooldown_idx < list.length ? session.cooldown_idx : 0);

      const currentStretch = list[activeCdIdx] || list[0];

      return `
        <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Cool Down Tracker">
          <!-- Horizontal Exercise Queue Pill Strip -->
          <div class="runner-queue-selector-strip" style="display:flex; gap:8px; overflow-x:auto; padding:4px 2px 14px; scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:12px;">
            ${list.map((stretch, i) => {
              const isCur = i === activeCdIdx;
              const isDone = !!stretch.completed;
              const isSkipped = !!stretch.skipped;
              const badgeIcon = isDone ? '✓' : (isSkipped ? '⏭' : `${i + 1}.`);
              const pillColor = isCur ? '#ffffff' : (isDone ? '#10b981' : (isSkipped ? '#eab308' : '#8a8d9f'));
              return `
                <button type="button" id="cooldown-card-${i}" onclick="selectCooldownStretch(${i})" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; border:1px solid ${isCur ? 'rgba(124,92,252,0.6)' : 'rgba(255,255,255,0.08)'}; background:${isCur ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.03)'}; color:${pillColor}; cursor:pointer;">
                  <span>${badgeIcon}</span>
                  <span>${stretch.exercise_name}</span>
                </button>
              `;
            }).join('')}
          </div>

          <div class="runner-stage-dual-grid">
            <div class="runner-stage-col-card">
              ${renderCooldownCardView(session)}
            </div>
            <div class="runner-stage-col-visuals">
              ${renderExerciseVisualStageCard(currentStretch, 'cooldown')}
              ${renderExerciseMuscleFocusCard(currentStretch, 'cooldown')}
            </div>
          </div>
        </main>
      `;
    }

    // Cool Down Overview state (IDLE / not started)
    return `
      <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="Cool Down Overview">
        ${renderWorkoutSegmentedTabs(session, activePhase)}

        <div class="runner-phase-hero-banner">
          <div class="runner-phase-hero-left">
            <div class="runner-phase-hero-icon-avatar">
              ${renderPhaseWireframeSvg('cooldown')}
            </div>
            <div class="runner-phase-hero-info">
              <h2 class="runner-phase-hero-title">${heroTitle}</h2>
              <span class="runner-phase-hero-sub">${heroSub}</span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button class="runner-phase-hero-action-btn" type="button" onclick="startPhaseAutoRunner('cooldown')">
              ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')}
              <span>Start All Cool Down</span>
            </button>
            <button class="btn btn-outline" type="button" onclick="skipCooldownPhase()" style="padding:10px 14px; font-size:12.5px; font-weight:700; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#8a8d9f; cursor:pointer;" title="Skip Cool Down Phase">
              Skip Cool Down
            </button>
          </div>
        </div>

        <div class="runner-exercise-stack">
          ${list.map((item, idx) => `
            <div class="runner-exercise-item-card" id="cooldown-card-${idx}">
              <div class="runner-runner-ex-card-left" onclick="selectCooldownStretch(${idx})" style="cursor:pointer;">
                <div class="runner-ex-thumb-box">
                  ${renderExerciseThumbnailSvg(item)}
                </div>
                <div class="runner-ex-text-group">
                  <span class="runner-ex-name-label">${item.exercise_name}</span>
                  <span class="runner-ex-sub-label">${item.exercise_type === 'duration' ? `${item.duration_sec || 30} sec` : `${item.reps || 10} reps`}</span>
                </div>
              </div>

              <div class="runner-ex-card-right">
                <span class="runner-ex-duration-tag">
                  ${renderIcon('timer', 'cx-icon cx-icon-xs')}
                  <span>${item.est_duration || '1 min'}</span>
                </span>

                <button class="runner-ex-action-btn" type="button" onclick="selectCooldownStretch(${idx})">
                  Start
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Educational / Benefits Footer Card -->
        <div class="runner-phase-benefits-card">
          <div class="runner-benefits-left">
            <div class="runner-benefits-avatar">
              ${benefitAvatarSvg}
            </div>
            <div class="runner-benefits-text">
              <h3 class="runner-benefits-title">${benefitTitle}</h3>
              <p class="runner-benefits-desc">${benefitDesc}</p>
            </div>
          </div>

          <div class="runner-benefits-columns">
            ${benefitPills.map(p => `
              <div class="runner-benefit-pill-item">
                <div class="runner-benefit-pill-icon">${p.icon}</div>
                <span class="runner-benefit-pill-label">${p.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    `;
  }

  return `
    <main class="runner-phase-workspace animate-fade-in" id="runner-phase-workspace" role="region" aria-label="${curPhaseObj ? curPhaseObj.title : 'Workout'} Workspace">
      <!-- Segmented Phase Tabs -->
      ${renderWorkoutSegmentedTabs(session, activePhase)}

      <!-- Phase Hero Banner -->
      <div class="runner-phase-hero-banner">
        <div class="runner-phase-hero-left">
          <div class="runner-phase-hero-icon-avatar">
            ${renderPhaseWireframeSvg(heroPhaseKey)}
          </div>
          <div class="runner-phase-hero-info">
            <h2 class="runner-phase-hero-title">${heroTitle}</h2>
            <span class="runner-phase-hero-sub">${heroSub}</span>
          </div>
        </div>

        <button class="runner-phase-hero-action-btn" type="button" onclick="${heroActionFn}">
          ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')}
          <span>${heroBtnText}</span>
        </button>
      </div>

      ${restCountdownHtml}

      <!-- Focused Mobile-Card Live Runner Stage -->
      <div class="runner-focused-card-stage" style="margin-bottom: 20px;">
        ${activeCardRunnerHtml}
      </div>

      <!-- Exercise Cards Stack -->
      <div class="runner-exercise-stack">
        ${exercisesStackHtml}
      </div>

      <!-- Educational / Benefits Footer Card -->
      <div class="runner-phase-benefits-card">
        <div class="runner-benefits-left">
          <div class="runner-benefits-avatar">
            ${benefitAvatarSvg}
          </div>
          <div class="runner-benefits-text">
            <h3 class="runner-benefits-title">${benefitTitle}</h3>
            <p class="runner-benefits-desc">${benefitDesc}</p>
          </div>
        </div>

        <div class="runner-benefits-columns">
          ${benefitPills.map(p => `
            <div class="runner-benefit-pill-item">
              <div class="runner-benefit-pill-icon">${p.icon}</div>
              <span class="runner-benefit-pill-label">${p.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </main>
  `;
}

// ─── Focused Mobile Card Renderers (Wireframe Specification) ─────────────────

function renderWarmupCardView(session) {
  const warmupList = getWarmupExercises(session);
  const idx = session.warmupIndex != null && session.warmupIndex < warmupList.length
    ? session.warmupIndex
    : (session.warmup_idx != null && session.warmup_idx < warmupList.length ? session.warmup_idx : 0);
  const currentEx = warmupList[idx] || { exercise_name: 'Warm-up Movement', duration_sec: 30, target_val: 30, reps: null };
  const totalCount = warmupList.length;
  const isHold = currentEx.exercise_type === 'duration';
  const targetVal = isHold ? (currentEx.duration_sec || 30) : (currentEx.reps || 10);
  const currentActual = isHold ? null : Number(currentEx.actual_val !== null && currentEx.actual_val !== undefined ? currentEx.actual_val : targetVal);
  const targetText = isHold ? `${targetVal}s hold` : `${targetVal} reps`;

  const pt = session.phaseTimer || session.movementTimer || {};
  const isRunning = pt.isRunning;
  const remaining = pt.remaining != null ? pt.remaining : (pt.remainingSec != null ? pt.remainingSec : targetVal);
  const totalDuration = pt.duration || pt.durationSec || targetVal || 30;
  const displayVal = isHold ? remaining : currentActual;

  const completedCount = warmupList.filter(w => w.completed).length;
  const skippedCount = warmupList.filter(w => w.skipped).length;
  const remainingCount = Math.max(0, totalCount - completedCount - skippedCount);
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isNearComplete = pct >= 80;

  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;

  const setDotsHtml = warmupList.map((w, w_i) => {
    const isDone = w.completed;
    const isSkipped = w.skipped;
    const isCur = w_i === idx;
    let dotClass = 'pending';
    if (isDone) dotClass = 'done';
    else if (isSkipped) dotClass = 'skipped';
    else if (isCur) dotClass = 'active';
    return `<span class="runner-set-dot ${dotClass}" title="Movement ${w_i + 1}: ${w.exercise_name}"></span>`;
  }).join('');

  const isMovementResolved = !!(currentEx.completed || currentEx.skipped);
  const timerActionLabel = isRunning ? 'Pause Timer' : (remaining <= 0 ? 'Restart Timer' : (remaining < totalDuration ? 'Resume Timer' : 'Start Timer'));
  const stepperUnitLabel = remaining <= 0 ? 'TIME COMPLETE · TAP MARK COMPLETE' : (isRunning ? 'SECONDS LEFT' : (remaining < totalDuration ? 'PAUSED · TAP TO RESUME' : 'SECONDS · TAP TO START'));

  return `
    <div class="runner-session-view-wrapper runner-active-exercise-card animate-card-reveal">
      <!-- Mobile Top Bar Controls -->
      <div class="runner-card-top-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <button class="runner-card-back-btn" onclick="openExitWorkoutModal()" aria-label="Exit Workout" title="Exit Workout">
          ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
        </button>
        <div class="runner-card-title-group" style="text-align:center;">
          <span class="runner-card-phase-badge">WARM-UP</span>
          <h2 class="runner-card-title" style="font-size:14px; font-weight:700;">MOVEMENT ${idx + 1} OF ${totalCount}</h2>
        </div>
        <div class="runner-card-top-right" style="display:flex; align-items:center; gap:8px;">
          <span class="runner-card-timer mono" id="workout-elapsed-val">${fmtSecs(elapsedSec)}</span>
          <button class="runner-card-pause-btn ${isPaused ? 'is-paused' : ''}" type="button" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Workout' : 'Pause Workout'}" aria-label="${isPaused ? 'Resume Workout' : 'Pause Workout'}">
            ${renderIcon(isPaused ? 'play' : 'pause', 'cx-icon cx-icon-xs')}
          </button>
          <button class="runner-card-finish-btn" type="button" onclick="requestFinishWorkout()" title="Finish Workout">
            Finish
          </button>
        </div>
      </div>

      <!-- Section 4: 3px Full-width Gradient Progress Bar & Stats -->
      <div class="runner-progress-header-zone">
        <div class="runner-progress-meta-row">
          <span class="runner-progress-exercise-count">Exercise ${idx + 1} of ${totalCount}</span>
          <span class="runner-progress-percentage mono ${isNearComplete ? 'is-gold' : ''}">${pct}% · ${completedCount} Completed${skippedCount > 0 ? ` · ${skippedCount} Skipped` : ''} · ${remainingCount} Remaining</span>
        </div>
        <div class="runner-progress-bar-3px">
          <div class="runner-progress-bar-fill-3px ${pct === 100 ? 'is-complete' : ''}" style="width: ${pct}%;"></div>
        </div>
      </div>

      <!-- Header Row (Phase badge, Set dots, Biomechanics) -->
      <div class="runner-card-top-header-row">
        <div class="runner-card-header-left">
          <span class="runner-badge-phase-pill phase-warmup">WARM-UP PHASE</span>
          <div class="runner-set-dots-group">
            ${setDotsHtml}
          </div>
        </div>
        <button class="runner-muscle-map-btn" type="button" onclick="openBiomechanicsModal()" title="View Muscle Map" aria-label="Muscle Map">
          ${renderIcon('activity', 'cx-icon cx-icon-xs')}
        </button>
      </div>

      <!-- Exercise Name & Focus -->
      <div class="runner-exercise-name-zone">
        <h2 class="runner-exercise-name-title">${currentEx.exercise_name}</h2>
        <span class="runner-exercise-muscles-text">Mobility & Activation · Movement ${idx + 1} of ${totalCount}</span>
      </div>

      <!-- Target Row -->
      <div class="runner-target-pills-row">
        <div class="runner-target-pill target-goal">
          <span class="runner-pill-lbl">Target</span>
          <span class="runner-pill-val mono">${targetText}</span>
        </div>
        <div class="runner-target-pill target-last">
          <span class="runner-pill-lbl">Focus</span>
          <span class="runner-pill-val mono">Joint Prep · Activation</span>
        </div>
      </div>

      <!-- Centered Stepper / Timer Display -->
      <div class="runner-stepper-zone">
        ${isHold ? `
          <button class="stepper-btn" type="button" onclick="adjustPhaseTimer(-5)" aria-label="Decrease time">−5s</button>
          <div class="runner-stepper-display" onclick="togglePhaseTimer()" style="cursor:pointer;" title="${isRunning ? 'Pause Timer' : 'Start Timer'}">
            <span class="runner-stepper-number mono" id="runner-phase-timer-digits">${displayVal}</span>
            <span class="runner-stepper-unit">${stepperUnitLabel}</span>
          </div>
          <button class="stepper-btn" type="button" onclick="adjustPhaseTimer(5)" aria-label="Increase time">+5s</button>
        ` : `
          <button class="stepper-btn" type="button" onclick="adjustWarmupItemReps(${idx}, -1)" aria-label="Decrease reps">−</button>
          <div class="runner-stepper-display">
            <span class="runner-stepper-number mono" id="workout-active-counter-digits">${displayVal}</span>
            <span class="runner-stepper-unit">REPS</span>
          </div>
          <button class="stepper-btn" type="button" onclick="adjustWarmupItemReps(${idx}, 1)" aria-label="Increase reps">+</button>
        `}
      </div>

      <!-- Quick Shortcut Actions -->
      <div class="runner-shortcut-pills-row">
        ${isHold ? `
          <button class="runner-shortcut-pill target-pill" type="button" onclick="togglePhaseTimer()">
            <span>${renderIcon(isRunning ? 'pause' : 'play', 'cx-icon cx-icon-xs cx-icon-inline')} ${timerActionLabel}</span>
          </button>
        ` : `
          <button class="runner-shortcut-pill target-pill" type="button" onclick="adjustWarmupItemReps(${idx}, 0)">
            <span>◎ Target · ${targetVal} reps</span>
          </button>
        `}
      </div>

      <!-- Auto advance banner if active -->
      ${renderAutoAdvanceHtml()}

      <!-- Primary CTA Zone -->
      <div class="runner-cta-zone">
        <button class="btn btn-primary btn-hero runner-cta-btn" type="button" onclick="advanceWarmupMovement()">
          <span>MARK COMPLETE</span>
          ${renderIcon('check', 'cx-icon cx-icon-sm cx-icon-inline')}
        </button>

        <div class="runner-cta-sub-row">
          <button class="btn btn-ghost btn-sm" type="button" onclick="openSkipWarmupExerciseModal()">Skip Movement</button>
          <span class="runner-sub-sep">·</span>
          <button class="btn btn-ghost btn-sm ${isMovementResolved ? 'btn-accent-link' : ''}" type="button" onclick="handleWarmupNextClick()" style="${isMovementResolved ? '' : 'opacity:0.6;'}" title="${isMovementResolved ? 'Proceed to Next Movement' : 'Complete or skip this movement first'}">Next Movement →</button>
        </div>
      </div>
    </div>
  `;
}

function setWorkoutSetActualDirect(val) {
  const session = getActiveSession();
  if (!session) return;
  const mainList = getMainWorkoutExercises(session);
  const exIdx = session.activeExerciseIndex != null && session.activeExerciseIndex < mainList.length ? session.activeExerciseIndex : 0;
  const currentEx = mainList[exIdx];
  if (!currentEx || !currentEx.sets) return;
  const setIdx = session.activeSetIndex != null && currentEx.sets[session.activeSetIndex] ? session.activeSetIndex : 0;
  if (currentEx.sets[setIdx]) {
    currentEx.sets[setIdx].actual_val = Math.max(1, Number(val));
    saveActiveSession(session);
    render();
  }
}
window.setWorkoutSetActualDirect = setWorkoutSetActualDirect;

function toggleSetDetailsDrawer() {
  const drawer = document.getElementById('runner-set-details-drawer');
  if (drawer) {
    drawer.style.display = (drawer.style.display === 'none' || !drawer.style.display) ? 'block' : 'none';
  }
}
window.toggleSetDetailsDrawer = toggleSetDetailsDrawer;

function renderMainWorkoutCardView(session) {
  const mainList = getMainWorkoutExercises(session);
  const exIdx = session.activeExerciseIndex != null && session.activeExerciseIndex < mainList.length
    ? session.activeExerciseIndex
    : (_selectedWorkoutExIdx != null && _selectedWorkoutExIdx < mainList.length ? _selectedWorkoutExIdx : 0);
  const currentEx = mainList[exIdx] || { exercise_name: 'Main Exercise', sets: [{ target_val: 10, actual_val: 10, completed: false }] };
  const totalExCount = mainList.length;

  const curSetIdx = currentEx.sets ? currentEx.sets.findIndex(s => !s.completed && !s.skipped) : -1;
  const activeSetIdx = session.activeSetIndex != null && currentEx.sets && currentEx.sets[session.activeSetIndex] && !currentEx.sets[session.activeSetIndex].completed && !currentEx.sets[session.activeSetIndex].skipped
    ? session.activeSetIndex
    : (curSetIdx !== -1 ? curSetIdx : (currentEx.sets ? currentEx.sets.length - 1 : 0));
  const currentSet = currentEx.sets && currentEx.sets[activeSetIdx] ? currentEx.sets[activeSetIdx] : { target_val: 10, actual_val: 10, completed: false, set_num: 1 };
  const totalSets = currentEx.sets ? currentEx.sets.length : 1;

  const isHold = currentEx.exercise_type === 'duration';
  const targetVal = Number(currentSet.target_val || 10);
  const currentActual = Number(currentSet.actual_val !== null && currentSet.actual_val !== undefined ? currentSet.actual_val : targetVal);

  const isHolding = !!(session.holdTimer && session.holdTimer.isRunning && session.holdTimer.exIdx === exIdx && session.holdTimer.setIdx === activeSetIdx);
  const displayVal = isHold && isHolding ? (session.holdTimer.elapsedSec || _workoutHoldState.elapsed || 0) : currentActual;

  const setDotsHtml = (currentEx.sets || []).map((s, s_i) => {
    const isDone = s.completed;
    const isSkipped = s.skipped;
    const isCur = s_i === activeSetIdx;
    let dotClass = 'pending';
    if (isDone) dotClass = 'done';
    else if (isSkipped) dotClass = 'skipped';
    else if (isCur) dotClass = 'active';
    return `<span class="runner-set-dot ${dotClass}" title="Set ${s_i + 1}: ${isDone ? 'Completed' : (isSkipped ? 'Skipped' : (isCur ? 'Current' : 'Upcoming'))}"></span>`;
  }).join('');

  const allMainSets = mainList.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);
  const allMainCompletedSets = mainList.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.completed).length : 0), 0);
  const allMainSkippedSets = mainList.reduce((acc, ex) => acc + (ex.sets ? ex.sets.filter(s => s.skipped).length : 0), 0);
  const allMainRemainingSets = Math.max(0, allMainSets - allMainCompletedSets - allMainSkippedSets);
  const pct = allMainSets > 0 ? Math.round((allMainCompletedSets / allMainSets) * 100) : 0;
  const isNearComplete = pct >= 80;

  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;

  const muscleMapObj = (typeof window !== 'undefined' && window.MuscleMap) ? window.MuscleMap.resolveMuscles({ name: currentEx.exercise_name }) : { primary: ['Chest', 'Triceps'], secondary: ['Core'] };
  const muscleListStr = (muscleMapObj.primary && muscleMapObj.primary.length > 0)
    ? [...muscleMapObj.primary, ...(muscleMapObj.secondary || [])].slice(0, 3).map(m => m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')).join(' · ')
    : 'Chest · Triceps · Core';

  const lastReps = targetVal > 5 ? targetVal + 2 : targetVal;
  const formTip = getExerciseContextualTip(currentEx);

  return `
    <div class="runner-session-view-wrapper runner-active-exercise-card animate-card-reveal">
      <!-- Mobile Top Bar Controls -->
      <div class="runner-card-top-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <button class="runner-card-back-btn" onclick="openExitWorkoutModal()" aria-label="Exit Workout" title="Exit Workout">
          ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
        </button>
        <div class="runner-card-title-group" style="text-align:center;">
          <span class="runner-card-phase-badge">MAIN WORKOUT</span>
          <h2 class="runner-card-title" style="font-size:14px; font-weight:700;">EXERCISE ${exIdx + 1} OF ${totalExCount}</h2>
        </div>
        <div class="runner-card-top-right" style="display:flex; align-items:center; gap:8px;">
          <span class="runner-card-timer mono" id="workout-elapsed-val">${fmtSecs(elapsedSec)}</span>
          <button class="runner-card-pause-btn ${isPaused ? 'is-paused' : ''}" type="button" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Workout' : 'Pause Workout'}" aria-label="${isPaused ? 'Resume Workout' : 'Pause Workout'}">
            ${renderIcon(isPaused ? 'play' : 'pause', 'cx-icon cx-icon-xs')}
          </button>
          <button class="runner-card-finish-btn" type="button" onclick="requestFinishWorkout()" title="Finish Workout">
            Finish
          </button>
        </div>
      </div>

      <!-- Section 4: 3px Full-width Gradient Progress Bar & Stats -->
      <div class="runner-progress-header-zone">
        <div class="runner-progress-meta-row">
          <span class="runner-progress-exercise-count">Exercise ${exIdx + 1} of ${totalExCount}</span>
          <span class="runner-progress-percentage mono ${isNearComplete ? 'is-gold' : ''}">${pct}% · ${allMainCompletedSets} Completed${allMainSkippedSets > 0 ? ` · ${allMainSkippedSets} Skipped` : ''} · ${allMainRemainingSets} Remaining</span>
        </div>
        <div class="runner-progress-bar-3px">
          <div class="runner-progress-bar-fill-3px ${pct === 100 ? 'is-complete' : ''}" style="width: ${pct}%;"></div>
        </div>
      </div>

      <!-- Section 5: Header Row (Phase badge, Set dots, Muscle Map) -->
      <div class="runner-card-top-header-row">
        <div class="runner-card-header-left">
          <span class="runner-badge-phase-pill phase-main">MAIN WORKOUT</span>
          <div class="runner-set-dots-group">
            ${setDotsHtml}
          </div>
        </div>
        <button class="runner-muscle-map-btn" type="button" onclick="openBiomechanicsModal()" title="View Muscle Map & Anatomy" aria-label="Muscle Map">
          ${renderIcon('activity', 'cx-icon cx-icon-xs')}
        </button>
      </div>

      <!-- Exercise Name & Muscles -->
      <div class="runner-exercise-name-zone">
        <h2 class="runner-exercise-name-title">${currentEx.exercise_name}</h2>
        <div class="runner-card-badges-row" style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="runner-badge-set mono" style="font-size:12px; color:#a29bfe;">Set ${activeSetIdx + 1} / ${totalSets}</span>
          <span class="runner-badge-target mono" style="font-size:12px; color:#cbd5e1;">Target: <strong>${targetVal} ${isHold ? 'sec' : 'reps'}</strong></span>
          <span class="runner-badge-rest mono" style="font-size:12px; color:#cbd5e1;">Rest: <strong>${currentEx.rest_sec || 90}s</strong></span>
        </div>
        <span class="runner-exercise-muscles-text" style="margin-top:4px;">${muscleListStr}</span>
      </div>

      <!-- Target Row (2 columns) -->
      <div class="runner-target-pills-row">
        <div class="runner-target-pill target-goal">
          <span class="runner-pill-lbl">Target</span>
          <span class="runner-pill-val mono">${targetVal} ${isHold ? 'sec' : 'reps'}</span>
        </div>
        <div class="runner-target-pill target-last">
          <span class="runner-pill-lbl">Last</span>
          <span class="runner-pill-val mono">${lastReps} ${isHold ? 'sec' : 'reps'} · 2d ago</span>
        </div>
      </div>

      <!-- Centered 56px Stepper Quantity Counter -->
      <div class="runner-stepper-zone">
        <button class="stepper-btn" type="button" onclick="${isHold ? 'adjustPhaseTimer(-5)' : 'adjustCurrentSetReps(-1)'}" aria-label="Decrease reps">−</button>
        <div class="runner-stepper-display">
          <span class="runner-stepper-number mono" id="workout-active-counter-digits">${displayVal}</span>
          <span class="runner-stepper-unit">${isHold ? 'SECONDS HOLD' : 'REPS'}</span>
        </div>
        <button class="stepper-btn" type="button" onclick="${isHold ? 'adjustPhaseTimer(5)' : 'adjustCurrentSetReps(1)'}" aria-label="Increase reps">+</button>
      </div>

      <!-- Shortcut Quick-Fill Pills -->
      <div class="runner-shortcut-pills-row">
        <button class="runner-shortcut-pill history-pill" type="button" onclick="${isHold ? `setWorkoutSetActualDirect(${lastReps})` : `setWorkoutSetActualDirect(${lastReps})`}">
          <span>↩ Same as last · ${lastReps}</span>
        </button>
        <button class="runner-shortcut-pill target-pill" type="button" onclick="${isHold ? `setWorkoutSetActualDirect(${targetVal})` : `setWorkoutSetActualDirect(${targetVal})`}">
          <span>◎ Target · ${targetVal}</span>
        </button>
      </div>

      <!-- Primary CTA Zone (56px Gradient Button) -->
      <div class="runner-cta-zone">
        ${isHold ? `
          <button class="btn btn-primary btn-hero runner-cta-btn" id="workout-active-hold-btn" type="button" onclick="${isHolding ? 'stopWorkoutHold(true)' : `startWorkoutHold(${exIdx}, ${activeSetIdx})`}">
            ${renderIcon(isHolding ? 'pause' : 'play', 'cx-icon cx-icon-sm cx-icon-inline')}
            <span>${isHolding ? `STOP HOLD (${displayVal}s)` : `START HOLD (${targetVal}s)`}</span>
          </button>
        ` : `
          <button class="btn btn-primary btn-hero runner-cta-btn" type="button" onclick="completeMainWorkoutSet()">
            <span>${session.mainWorkoutSubState === 'EXERCISE_READY' ? 'START' : 'COMPLETE SET'}</span>
            ${renderIcon('arrowRight', 'cx-icon cx-icon-sm cx-icon-inline')}
          </button>
        `}

        <div class="runner-cta-sub-row">
          <button class="btn btn-ghost btn-sm" type="button" onclick="openSkipMainWorkoutSetModal()">Skip Set</button>
          <span class="runner-sub-sep">·</span>
          <button class="btn btn-ghost btn-sm btn-accent-link" type="button" onclick="toggleSetDetailsDrawer()">Add Details</button>
        </div>

        <!-- Collapsible Set Details Accordion -->
        <div class="runner-set-details-drawer" id="runner-set-details-drawer" style="display:none;">
          <div class="runner-details-grid">
            <div class="runner-detail-field">
              <label class="runner-field-label">Weight (+kg)</label>
              <input type="number" min="0" step="0.5" placeholder="0 kg" value="${currentSet.weight_kg || ''}" onchange="updateWorkoutSetWeight(${exIdx}, ${activeSetIdx}, this.value)" class="form-input mono">
            </div>
            <div class="runner-detail-field">
              <label class="runner-field-label">RPE (Effort)</label>
              <select onchange="updateWorkoutSetRPE(${exIdx}, ${activeSetIdx}, this.value)" class="form-input form-select mono">
                <option value="">RPE</option>
                <option value="6" ${currentSet.rpe == 6 ? 'selected' : ''}>RPE 6</option>
                <option value="7" ${currentSet.rpe == 7 ? 'selected' : ''}>RPE 7</option>
                <option value="8" ${currentSet.rpe == 8 ? 'selected' : ''}>RPE 8</option>
                <option value="9" ${currentSet.rpe == 9 ? 'selected' : ''}>RPE 9</option>
                <option value="10" ${currentSet.rpe == 10 ? 'selected' : ''}>RPE 10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="runner-coaching-tip-row">
        ${renderIcon('lightbulb', 'cx-icon cx-icon-xs cx-icon-accent')}
        <span><strong>Form Focus:</strong> ${formTip || 'Maintain full range of motion.'}</span>
      </div>
    </div>
  `;
}

function renderCooldownCardView(session) {
  const cooldownList = getCooldownExercises(session);
  const idx = session.cooldownIndex != null && session.cooldownIndex < cooldownList.length
    ? session.cooldownIndex
    : (session.cooldown_idx != null && session.cooldown_idx < cooldownList.length ? session.cooldown_idx : 0);
  const currentStretch = cooldownList[idx] || { exercise_name: 'Cool-down Stretch', duration_sec: 30, target_val: 30 };
  const totalCount = cooldownList.length;
  const isHold = currentStretch.exercise_type === 'duration';
  const targetVal = isHold ? (currentStretch.duration_sec || 30) : (currentStretch.reps || 10);
  const targetText = isHold ? `${targetVal}s` : `${targetVal} reps`;

  const pt = session.phaseTimer || session.movementTimer || {};
  const isRunning = pt.isRunning;
  const remaining = pt.remaining != null ? pt.remaining : (pt.remainingSec != null ? pt.remainingSec : targetVal);
  const totalDuration = pt.duration || pt.durationSec || targetVal || 30;
  const progressFraction = totalDuration > 0 ? Math.max(0, Math.min(1, remaining / totalDuration)) : 1;
  const dashOffset = (427.2 * (1 - progressFraction)).toFixed(1);

  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;

  const muscleMapObj = (typeof window !== 'undefined' && window.MuscleMap) ? window.MuscleMap.resolveMuscles({ name: currentStretch.exercise_name }) : { primary: ['lower_back', 'lats'], secondary: ['glutes'] };
  const visualSvg = (typeof window !== 'undefined' && window.MuscleMap) ? window.MuscleMap.renderBackSVG(muscleMapObj.primary, muscleMapObj.secondary) : renderExerciseThumbnailSvg(currentStretch);

  const completedCount = cooldownList.filter(c => c.completed).length;
  const skippedCount = cooldownList.filter(c => c.skipped).length;
  const remainingCount = Math.max(0, totalCount - completedCount - skippedCount);
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return `
    <div class="runner-session-view-wrapper animate-fade-in">
      <div class="runner-session-card">
        <!-- Top Bar -->
        <div class="runner-card-top-bar">
          <button class="runner-card-back-btn" onclick="openExitWorkoutModal()" aria-label="Exit Workout" title="Exit Workout">
            ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
          </button>
          <div class="runner-card-title-group">
            <span class="runner-card-phase-badge">COOL DOWN PHASE</span>
            <h2 class="runner-card-title">STRETCH ${idx + 1} OF ${totalCount}</h2>
          </div>
          <div class="runner-card-top-right">
            <span class="runner-card-timer mono" id="workout-elapsed-val">${fmtSecs(elapsedSec)}</span>
            <button class="runner-card-pause-btn ${isPaused ? 'is-paused' : ''}" type="button" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Workout' : 'Pause Workout'}" aria-label="${isPaused ? 'Resume Workout' : 'Pause Workout'}">
              ${renderIcon(isPaused ? 'play' : 'pause', 'cx-icon cx-icon-xs')}
            </button>
            <button class="runner-card-finish-btn" type="button" onclick="requestFinishWorkout()" title="Finish Workout">
              Finish
            </button>
          </div>
        </div>

        <!-- Progress Indicator -->
        <div class="runner-card-progress-section">
          <div class="runner-card-progress-label">
            <span>Exercise ${idx + 1} of ${totalCount}</span>
            <span class="mono">${pct}% · ${completedCount} Completed${skippedCount > 0 ? ` · ${skippedCount} Skipped` : ''} · ${remainingCount} Remaining</span>
          </div>
          <div class="runner-card-progress-track">
            <div class="runner-card-progress-fill" style="width:${pct}%;"></div>
          </div>
        </div>

        <!-- Flow Progression Strip -->
        <div class="runner-card-flow-strip">
          <div class="runner-flow-step">
            <span class="runner-flow-label">Stretch</span>
            <span class="runner-flow-val mono">${idx + 1} / ${totalCount}</span>
          </div>
          <div class="runner-flow-arrow">→</div>
          <div class="runner-flow-step is-target">
            <span class="runner-flow-label">Target</span>
            <span class="runner-flow-val mono">${targetText}</span>
          </div>
          <div class="runner-flow-arrow">→</div>
          <div class="runner-flow-step is-actual">
            <span class="runner-flow-label">Remaining</span>
            <span class="runner-flow-val mono">${remaining}s</span>
          </div>
          <div class="runner-flow-arrow">→</div>
          <div class="runner-flow-step is-rest">
            <span class="runner-flow-label">Phase</span>
            <span class="runner-flow-val mono">Recovery</span>
          </div>
        </div>

        <!-- Exercise Header -->
        <div class="runner-card-exercise-header">
          <h1 class="runner-card-ex-name">${currentStretch.exercise_name}</h1>
          <div class="runner-card-badges-row">
            <span class="runner-badge-set mono">STRETCH ${idx + 1} / ${totalCount}</span>
            <span class="runner-badge-target mono">Target: <strong>${targetText}</strong></span>
            <span class="runner-badge-rest mono">Recovery</span>
          </div>
        </div>

        <!-- Center Stage Grid -->
        <div class="runner-card-stage-grid">
          <div class="runner-card-stage-visual" id="runner-visual-stage">
            ${visualSvg}
          </div>

          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; width:100%;">
            <div class="runner-card-stage-dial">
              <svg class="runner-dial-svg" viewBox="0 0 160 160">
                <circle class="runner-dial-track" cx="80" cy="80" r="68" />
                <circle class="runner-dial-progress" id="runner-radial-progress-circle" cx="80" cy="80" r="68" stroke-dasharray="427.2" stroke-dashoffset="${(427.2 * (1 - progressFraction)).toFixed(1)}" />
              </svg>
              <div class="runner-dial-center-content">
                <span class="runner-dial-number mono" id="runner-phase-timer-digits">${remaining}</span>
                <span class="runner-dial-subtext">SEC LEFT</span>
              </div>
            </div>

            <div class="runner-card-stepper-row">
              <button class="runner-card-stepper-btn" type="button" onclick="adjustPhaseTimer(-5)" aria-label="Decrease time">-5s</button>
              <button class="runner-card-btn runner-card-btn-skip" type="button" onclick="togglePhaseTimer()" style="max-width:120px; padding:10px 16px;">
                ${renderIcon(isRunning ? 'pause' : 'play', 'cx-icon cx-icon-xs cx-icon-inline')} ${isRunning ? 'Pause' : 'Start'}
              </button>
              <button class="runner-card-stepper-btn" type="button" onclick="adjustPhaseTimer(5)" aria-label="Increase time">+5s</button>
            </div>
          </div>
        </div>

        <!-- Auto advance banner if active -->
        ${renderAutoAdvanceHtml()}

        <!-- Bottom Action Controls -->
        <div class="runner-card-controls-row" style="margin-top:4px;">
          <button class="runner-card-btn runner-card-btn-skip" type="button" onclick="skipCooldownExercise()" title="Skip this stretch">
            ${renderIcon('rotateCcw', 'cx-icon cx-icon-xs cx-icon-inline')} Skip
          </button>
          <button class="runner-card-btn runner-card-btn-done" type="button" onclick="completeCooldownExercise()" title="Mark stretch complete">
            ${renderIcon('check', 'cx-icon cx-icon-sm cx-icon-inline')} Done
          </button>
          <button class="runner-card-btn runner-card-btn-next" type="button" onclick="completeCooldownExercise()" title="Move to next stretch">
            Next ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Main Workout Screen Dispatcher ──────────────────────────────────────────

function renderActiveWorkoutView() {
  const session = getActiveSession();
  if (!session) {
    const todayWorkout = state.todayResolved?.workout;
    return `
      <div class="runner-screen-widescreen">
        <div class="view-header" style="margin-bottom:24px;">
          <h1 class="view-title">Active Workout Runner</h1>
          <p class="view-subtitle">Live athlete-first set tracker with structured Warm-up, Main Workout, and Cool-down.</p>
        </div>
        <div class="card" style="padding:60px 24px; text-align:center; max-width:680px; margin:0 auto;">
          <span style="display:block; margin-bottom:16px;">${renderIcon('zap', 'cx-icon cx-icon-2xl cx-icon-accent')}</span>
          <h2 style="font-size:20px; font-weight:800; color:#ffffff; margin-bottom:8px;">No active workout in progress</h2>
          <p style="color:var(--text-muted); font-size:14px; max-width:420px; margin:0 auto 24px; line-height:1.5;">
            ${todayWorkout ? `Today's scheduled workout is <strong>${todayWorkout.name}</strong> (${todayWorkout.total_sets || 15} sets).` : 'Start a training session from your weekly split.'}
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" style="padding:10px 24px; font-size:14px;" onclick="startWorkoutFromResolved()">
              ${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Today's Workout ${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}
            </button>
            <button class="btn btn-secondary" style="padding:10px 20px; font-size:14px;" onclick="switchView('split')">
              ${renderIcon('calendar', 'cx-icon cx-icon-inline')} View My Split
            </button>
          </div>
        </div>
      </div>`;
  }

  // Check if session has reached a valid terminal state
  const isTerminal = session.status === 'completed' || session.status === 'completed_early' ||
    session.phase === (typeof WORKOUT_PHASES !== 'undefined' ? WORKOUT_PHASES.COMPLETED : 'COMPLETED') ||
    session.phaseState === (typeof PHASE_STATES !== 'undefined' ? PHASE_STATES.COMPLETED : 'COMPLETED');

  if (isTerminal) {
    const summaryData = session.summaryData || getWorkoutSessionSummaryMetrics(session);
    return renderWorkoutCompleteView(session, summaryData);
  }

  if (session.status !== 'in_progress' && session.status !== 'paused' && session.status !== 'ready') {
    const todayWorkout = state.todayResolved?.workout;
    return `
      <div class="runner-screen-widescreen">
        <div class="view-header" style="margin-bottom:24px;">
          <h1 class="view-title">Active Workout Runner</h1>
          <p class="view-subtitle">Live athlete-first set tracker with structured Warm-up, Main Workout, and Cool-down.</p>
        </div>
        <div class="card" style="padding:60px 24px; text-align:center; max-width:680px; margin:0 auto;">
          <span style="display:block; margin-bottom:16px;">${renderIcon('zap', 'cx-icon cx-icon-2xl cx-icon-accent')}</span>
          <h2 style="font-size:20px; font-weight:800; color:#ffffff; margin-bottom:8px;">No active workout in progress</h2>
          <p style="color:var(--text-muted); font-size:14px; max-width:420px; margin:0 auto 24px; line-height:1.5;">
            ${todayWorkout ? `Today's scheduled workout is <strong>${todayWorkout.name}</strong> (${todayWorkout.total_sets || 15} sets).` : 'Start a training session from your weekly split.'}
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" style="padding:10px 24px; font-size:14px;" onclick="startWorkoutFromResolved()">
              ${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Today's Workout ${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}
            </button>
            <button class="btn btn-secondary" style="padding:10px 20px; font-size:14px;" onclick="switchView('split')">
              ${renderIcon('calendar', 'cx-icon cx-icon-inline')} View My Split
            </button>
          </div>
        </div>
      </div>`;
  }

  const activePhase = session.currentPhase || 'warmup';

  return `
    <div class="runner-screen-widescreen">
      ${renderWorkoutTopHeader(session)}
      <div class="runner-layout-grid">
        ${renderWorkoutStructureSidebar(session, activePhase)}
        ${renderWorkoutPhaseWorkspace(session, activePhase)}
      </div>
    </div>
  `;
}

// ─── Global Window Exports ───────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.startWorkoutFromResolved = startWorkoutFromResolved;
  window.startWorkoutFromId = startWorkoutFromId;
  window.startWorkoutFromData = startWorkoutFromData;
  window.startWorkoutSession = startWorkoutSession;
  window.openWorkoutView = openWorkoutView;
  window.pauseWorkoutSession = pauseWorkoutSession;
  window.resumeWorkoutSession = resumeWorkoutSession;
  window.togglePauseWorkoutSession = togglePauseWorkoutSession;
  window.setWorkoutPhase = setWorkoutPhase;
  window.toggleWarmupItemComplete = toggleWarmupItemComplete;
  window.toggleCooldownItemComplete = toggleCooldownItemComplete;
  window.toggleMainExerciseComplete = toggleMainExerciseComplete;
  window.startPhaseAutoRunner = startPhaseAutoRunner;
  window.selectExerciseToExecute = selectExerciseToExecute;
  window.togglePhaseTimer = togglePhaseTimer;
  window.adjustPhaseTimer = adjustPhaseTimer;
  window.selectWarmupMovement = selectWarmupMovement;
  window.selectCooldownStretch = selectCooldownStretch;
  window.advanceWarmupMovement = advanceWarmupMovement;
  window.skipWarmupPhase = skipWarmupPhase;
  window.advanceCooldownStretch = advanceCooldownStretch;
  window.skipCooldownPhase = skipCooldownPhase;
  window.finishWorkoutSession = finishWorkoutSession;
  window.toggleWorkoutSet = toggleWorkoutSet;
  window.handleCompleteSetClick = handleCompleteSetClick;
  window.adjustWorkoutSetActual = adjustWorkoutSetActual;
  window.setWorkoutSetActualDirect = setWorkoutSetActualDirect;
  window.updateWorkoutSetWeight = updateWorkoutSetWeight;
  window.updateWorkoutSetRPE = updateWorkoutSetRPE;
  window.startWorkoutHold = startWorkoutHold;
  window.stopWorkoutHold = stopWorkoutHold;
  window.startWorkoutRest = startWorkoutRest;
  window.stopWorkoutRest = stopWorkoutRest;
  window.adjustWorkoutRest = adjustWorkoutRest;
  window.selectWorkoutQueueExercise = selectWorkoutQueueExercise;
  window.getWorkoutPhaseModel = getWorkoutPhaseModel;
  window.requestFinishWorkout = requestFinishWorkout;
  window.getWorkoutRestState = () => _workoutRestState;
  window.getWorkoutHoldState = () => _workoutHoldState;
  window.openConfirmFinishWorkoutModal = openConfirmFinishWorkoutModal;
  window.closeConfirmFinishWorkoutModal = closeConfirmFinishWorkoutModal;
  window.confirmFinishAnyway = confirmFinishAnyway;
  window.openDiscardWorkoutModal = openDiscardWorkoutModal;
  window.closeDiscardWorkoutModal = closeDiscardWorkoutModal;
  window.confirmDiscardWorkout = confirmDiscardWorkout;
  window.skipWarmupExercise = skipWarmupExercise;
  window.completeWarmupExercise = completeWarmupExercise;
  window.openSkipWarmupExerciseModal = openSkipWarmupExerciseModal;
  window.closeSkipWarmupExerciseModal = closeSkipWarmupExerciseModal;
  window.confirmSkipWarmupExercise = confirmSkipWarmupExercise;
  window.openExitWarmupModal = openExitWarmupModal;
  window.closeExitWarmupModal = closeExitWarmupModal;
  window.confirmExitWarmup = confirmExitWarmup;
  window.renderWarmupCompleteView = renderWarmupCompleteView;
  window.renderMainWorkoutCompleteView = renderMainWorkoutCompleteView;
  window.startMainWorkoutFromWarmup = startMainWorkoutFromWarmup;
  window.startCoolDownFromMain = startCoolDownFromMain;
  window.handleWarmupNextClick = handleWarmupNextClick;
  window.adjustWarmupItemReps = adjustWarmupItemReps;
  window.adjustCurrentSetReps = adjustCurrentSetReps;
  window.startMainWorkoutSet = startMainWorkoutSet;
  window.completeMainWorkoutSet = completeMainWorkoutSet;
  window.openSkipMainWorkoutSetModal = openSkipMainWorkoutSetModal;
  window.closeSkipMainWorkoutSetModal = closeSkipMainWorkoutSetModal;
  window.confirmSkipMainWorkoutSet = confirmSkipMainWorkoutSet;
  window.skipMainWorkoutSet = skipMainWorkoutSet;
  window.skipCooldownExercise = skipCooldownExercise;
  window.completeCooldownExercise = completeCooldownExercise;
  window.openExitWorkoutModal = openExitWorkoutModal;
  window.closeExitWorkoutModal = closeExitWorkoutModal;
  window.confirmExitWorkout = confirmExitWorkout;
  window.getWorkoutSessionSummaryMetrics = getWorkoutSessionSummaryMetrics;
  window.renderWorkoutCompleteView = renderWorkoutCompleteView;
  window.finalizeAndPersistCompletedSession = finalizeAndPersistCompletedSession;
  window.renderWorkoutCompleteModal = renderWorkoutCompleteModal;
  window.closeWorkoutCompleteModal = closeWorkoutCompleteModal;
  window.handleViewSummaryClick = handleViewSummaryClick;
  window.handleDoneWorkoutClick = handleDoneWorkoutClick;
  window.renderWarmupCardView = renderWarmupCardView;
  window.renderMainWorkoutCardView = renderMainWorkoutCardView;
  window.renderWorkoutRestView = renderWorkoutRestView;
  window.renderCooldownCardView = renderCooldownCardView;
  window.getPhaseLockStatus = getPhaseLockStatus;
  window.openSkipWarmupPhaseModal = openSkipWarmupPhaseModal;
  window.closeSkipWarmupPhaseModal = closeSkipWarmupPhaseModal;
  window.confirmSkipWarmupPhase = confirmSkipWarmupPhase;
  window.renderWorkoutSegmentedTabs = renderWorkoutSegmentedTabs;
}
