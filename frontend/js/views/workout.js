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

function setRunnerStageTab(tab) {
  _runnerStageTab = tab;
  render();
}
if (typeof window !== 'undefined') {
  window.setRunnerStageTab = setRunnerStageTab;
}

function startWorkoutFromData(workoutName, exercisesList, workoutId = null) {
  const active = getActiveSession();
  if (active && (active.status === 'in_progress' || active.status === 'paused') && active.routine === workoutName) {
    openWorkoutView();
    return;
  }

  const session = {
    id: newUUID(),
    date: todayISO(),
    routine: workoutName,
    workout_name: workoutName,
    workout_id: workoutId,
    level: 1,
    startTime: Date.now(),
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    endTime: null,
    status: 'in_progress',
    exercises: exercisesList.map(le => {
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
          weight_kg: null,
          rpe: null,
          completed_at: null,
          client_uuid: newUUID(),
        });
      }
      return {
        id: le.id,
        exercise_id: le.exercise_id,
        exercise_name: le.exercise_name || ex?.name || 'Exercise',
        exercise_type: isHold ? 'duration' : 'reps',
        tempo: le.tempo,
        rest_sec: le.rest_sec || 90,
        superset_group: le.superset_group,
        notes: le.notes,
        sets,
      };
    }),
  };

  saveActiveSession(session);
  startWorkoutDurationTimer();
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

function openWorkoutView() {
  state.view = 'workout';
  window.location.hash = 'workout';
  const session = getActiveSession();
  if (session && session.status === 'in_progress') {
    startWorkoutDurationTimer();
  }
  render();
}

function pauseWorkoutSession() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'active')) return;
  session.status = 'paused';
  session.pausedAt = Date.now();
  if (_workoutHoldInterval) {
    stopWorkoutHold(false);
  }
  if (_workoutRestInterval) {
    stopWorkoutRest();
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
  if (!session || session.status !== 'paused') return;
  const pausedMs = session.pausedAt ? (Date.now() - session.pausedAt) : 0;
  session.totalPausedMs = (session.totalPausedMs || 0) + pausedMs;
  session.status = 'in_progress';
  session.pausedAt = null;
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
  if (session.status === 'paused') {
    resumeWorkoutSession();
  } else {
    pauseWorkoutSession();
  }
}

function startWorkoutDurationTimer() {
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
      if (session && (session.startTime || session.startedAt) && session.status !== 'paused') {
        const elapsedSec = getSessionElapsedSec(session);
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
      }
    }
  }, 1000);
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
  return 'Next: Workout Finish 🎉';
}

function startWorkoutHold(exIdx, setIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;

  // Stop any active rest timer when athlete starts holding
  stopWorkoutRest();

  // If another hold timer was active, stop it cleanly
  if (_workoutHoldInterval) {
    stopWorkoutHold(false);
  }

  _workoutHoldState = {
    exIdx,
    setIdx,
    startedAt: Date.now(),
    elapsed: 0,
  };

  _workoutHoldInterval = setInterval(() => {
    if (!_workoutHoldState.startedAt) return;
    const now = Date.now();
    const elapsed = Math.floor((now - _workoutHoldState.startedAt) / 1000);
    _workoutHoldState.elapsed = elapsed;

    const digitsEl = document.getElementById('workout-active-counter-digits');
    if (digitsEl) {
      digitsEl.textContent = elapsed;
    }
    const btn = document.getElementById('workout-active-hold-btn');
    if (btn) {
      btn.innerHTML = `${renderIcon('pause', 'cx-icon cx-icon-xs cx-icon-inline')} STOP HOLD (${elapsed}s)`;
    }
  }, 200);

  render();
}

function stopWorkoutHold(saveAndComplete = true) {
  if (!_workoutHoldInterval && !_workoutHoldState.startedAt) return;

  const { exIdx, setIdx, startedAt } = _workoutHoldState;
  clearInterval(_workoutHoldInterval);
  _workoutHoldInterval = null;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };

  if (saveAndComplete && exIdx !== null && setIdx !== null) {
    const session = getActiveSession();
    if (session && session.exercises[exIdx] && session.exercises[exIdx].sets[setIdx]) {
      const set = session.exercises[exIdx].sets[setIdx];
      // Save actual measured seconds into actual_val
      const finalVal = Math.max(elapsed, 1);
      set.actual_val = finalVal;
      set.completed = true;
      set.completed_at = new Date().toISOString();
      saveActiveSession(session);

      cueHoldSave(); // audio/vibration feedback
      if (typeof checkAndCelebratePR === 'function') {
        checkAndCelebratePR(session.exercises[exIdx].exercise_id, finalVal, set.weight_kg);
      }

      // If final set of the hold exercise is completed, auto-advance to next uncompleted exercise
      const currentEx = session.exercises[exIdx];
      const isExDone = currentEx.sets.every(s => s.completed);
      if (isExDone) {
        const nextUncompletedIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed));
        let nextIdx = -1;
        if (nextUncompletedIdx !== -1) {
          nextIdx = nextUncompletedIdx;
        } else {
          const anyUncompletedIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));
          if (anyUncompletedIdx !== -1) {
            nextIdx = anyUncompletedIdx;
          }
        }
        if (nextIdx !== -1) {
          _selectedWorkoutExIdx = nextIdx;
          const nextEx = session.exercises[nextIdx];
          const nextCat = state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name);
          const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
          setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
        }
      }

      // Trigger Rest Countdown
      const restSec = currentEx.rest_sec || 90;
      const nextInfo = getNextSetDescription(session, exIdx, setIdx);
      const feedback = generateSetCompletionFeedback(session, exIdx, setIdx, finalVal);
      startWorkoutRest(restSec, nextInfo, feedback);
    }
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
      return `+${diff} over target 💪 (${actualVal}${unit}) · ${remainingSets} more to go!`;
    } else {
      return `+${diff} over target! 🚀 Crushed all sets for ${currentEx.exercise_name}`;
    }
  } else if (diff === 0) {
    if (remainingSets > 0) {
      return `Solid set. ${remainingSets} more to go 🔥`;
    } else {
      return `Target matched (${actualVal}${unit}) · ${currentEx.exercise_name} complete! 🎯`;
    }
  } else {
    // diff < 0
    if (remainingSets > 0) {
      return `Solid work (${actualVal}/${targetVal}${unit}). ${remainingSets} more to go — focus on clean form!`;
    } else {
      return `Good effort on ${currentEx.exercise_name}. Quality reps logged.`;
    }
  }
}

function startWorkoutRest(sec, nextInfo = '', feedback = '') {
  stopWorkoutRest();
  if (!sec || sec <= 0) return;

  _workoutRestState = {
    active: true,
    remaining: sec,
    total: sec,
    nextInfo: nextInfo,
    feedback: feedback,
  };

  _workoutRestInterval = setInterval(() => {
    if (!_workoutRestState.active) return;
    _workoutRestState.remaining--;

    const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;

    // Audible warning tick for last 3 seconds
    if (isLast3s) {
      cueTick();
    }

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

  render();
}

function stopWorkoutRest() {
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
  }
  _workoutRestState.active = false;
  render();
}

function adjustWorkoutRest(deltaSec) {
  if (!_workoutRestState.active) return;
  _workoutRestState.remaining = Math.max(0, _workoutRestState.remaining + deltaSec);
  _workoutRestState.total = Math.max(_workoutRestState.total, _workoutRestState.remaining);

  const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;

  if (typeof document !== 'undefined') {
    const cardEl = document.getElementById('workout-rest-card-container');
    const timerEl = document.getElementById('workout-rest-timer-val');
    const barEl = document.getElementById('workout-rest-timer-bar');

    if (cardEl) {
      if (isLast3s) cardEl.classList.add('is-pulse-alert');
      else cardEl.classList.remove('is-pulse-alert');
    }

    if (timerEl) {
      timerEl.textContent = fmtSecs(_workoutRestState.remaining);
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
}

function adjustWorkoutSetActual(exIdx, setIdx, delta) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const set = session.exercises[exIdx].sets[setIdx];
  const cur = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
  set.actual_val = Math.max(0, cur + delta);
  saveActiveSession(session);
  render();
}

function setWorkoutSetActualDirect(exIdx, setIdx, exactVal) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
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
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx] || !session.exercises[exIdx].sets[setIdx]) return;
  const set = session.exercises[exIdx].sets[setIdx];
  set.completed = !set.completed;
  set.completed_at = set.completed ? new Date().toISOString() : null;
  saveActiveSession(session);

  if (set.completed) {
    const currentEx = session.exercises[exIdx];
    const isExDone = currentEx.sets.every(s => s.completed);
    if (isExDone) {
      cueExerciseComplete();
    } else {
      cueSetComplete();
    }
    const actualVal = Number(set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '' ? set.actual_val : set.target_val);
    if (typeof checkAndCelebratePR === 'function') {
      checkAndCelebratePR(session.exercises[exIdx].exercise_id, actualVal, set.weight_kg);
    }

    // If final set of the exercise is completed, auto-advance to next uncompleted exercise
    if (isExDone) {
      const nextUncompletedIdx = session.exercises.findIndex((ex, idx) => idx > exIdx && ex.sets.some(s => !s.completed));
      let nextIdx = -1;
      if (nextUncompletedIdx !== -1) {
        nextIdx = nextUncompletedIdx;
      } else {
        const anyUncompletedIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));
        if (anyUncompletedIdx !== -1) {
          nextIdx = anyUncompletedIdx;
        }
      }
      if (nextIdx !== -1) {
        _selectedWorkoutExIdx = nextIdx;
        const nextEx = session.exercises[nextIdx];
        const nextCat = state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name);
        const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push');
        setCurrentMovementPattern(nextPattern, nextEx.exercise_id, nextEx.exercise_name);
      }
    }

    // Start Rest Timer for this exercise with contextual feedback
    const restSec = currentEx.rest_sec || 90;
    const nextInfo = getNextSetDescription(session, exIdx, setIdx);
    const feedback = generateSetCompletionFeedback(session, exIdx, setIdx, actualVal);
    startWorkoutRest(restSec, nextInfo, feedback);
  } else {
    stopWorkoutRest();
  }
  render();
}

async function finishWorkoutSession() {
  const session = getActiveSession();
  if (!session) return;

  if (_workoutHoldInterval) {
    clearInterval(_workoutHoldInterval);
    _workoutHoldInterval = null;
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
  }

  let totalSets = 0;
  let completedSets = 0;
  let totalReps = 0;
  let totalHoldSec = 0;

  const durationSec = getSessionElapsedSec(session);
  session.endTime = Date.now();
  session.completed_at = new Date().toISOString();
  session.duration_sec = durationSec;
  session.status = 'completed';

  for (const ex of session.exercises) {
    const isHold = ex.exercise_type === 'duration';
    for (const set of ex.sets) {
      totalSets++;
      if (set.completed) {
        completedSets++;
        const actual = (set.actual_val !== null && set.actual_val !== undefined && set.actual_val !== '')
          ? Number(set.actual_val)
          : (isHold ? 0 : set.target_val);

        const logPayload = {
          exercise_id: ex.exercise_id,
          timestamp: set.completed_at || session.completed_at,
          session_uuid: session.id,
          client_uuid: set.client_uuid || newUUID(),
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

  session.total_sets = totalSets;
  session.completed_sets = completedSets;

  // 1. Post to backend /workout_sessions endpoint (with local outbox safety)
  try {
    await API.createWorkoutSession(session);
  } catch (e) {
    console.warn('Direct session sync failed, queued locally:', e);
    localStorage.setItem(`${LS_SESSION_PREFIX}${session.id}`, JSON.stringify(session));
  }

  // 2. Trigger background sync loop for individual logs and pending sessions
  lsSyncPending();
  saveActiveSession(null);

  if (_workoutTimerInterval) {
    clearInterval(_workoutTimerInterval);
    _workoutTimerInterval = null;
  }

  if (typeof releaseScreenWakeLock === 'function') {
    releaseScreenWakeLock();
  }

  showToast(`Workout Complete! ${completedSets}/${totalSets} sets done (${Math.round(durationSec / 60)}m)`);
  state.view = 'dashboard';
  window.location.hash = 'dashboard';
  await loadDashboardSummary();
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

  // Keyboard accessibility: Focus Keep Workout button & listen for Escape key
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
    _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0 };
  }
  if (_workoutRestInterval) {
    clearInterval(_workoutRestInterval);
    _workoutRestInterval = null;
    _workoutRestState = { active: false, remaining: 0, total: 0, nextInfo: '' };
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

  // 13. Graceful Universal Calisthenics Silhouette Fallback
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


function selectWorkoutQueueExercise(exIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises[exIdx]) return;
  _selectedWorkoutExIdx = exIdx;
  const newEx = session.exercises[exIdx];
  const catalogEx = state.exercises.find(e => e.id === newEx.exercise_id || e.name === newEx.exercise_name);
  const pattern = catalogEx?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(newEx.exercise_name) : 'push');
  setCurrentMovementPattern(pattern, newEx.exercise_id, newEx.exercise_name);
  render();
}

function renderActiveWorkoutView() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) {
    const todayWorkout = state.todayResolved?.workout;
    return `
      <div class="runner-screen">
        <div class="view-header" style="margin-bottom:16px;">
          <h1 class="view-title">Active Workout Runner</h1>
          <p class="view-subtitle">Live athlete-first set tracker with rest timer and audio cues.</p>
        </div>
        <div class="card" style="padding:48px 24px; text-align:center;">
          <span style="display:block; margin-bottom:12px;">${renderIcon('zap', 'cx-icon cx-icon-2xl cx-icon-accent')}</span>
          <h3 style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:6px;">No workout running right now</h3>
          <p style="color:var(--text-muted); font-size:13px; max-width:380px; margin:0 auto 20px;">
            ${todayWorkout ? `Today's scheduled workout is <strong>${todayWorkout.name}</strong>.` : 'Start a training session from your weekly split.'}
          </p>
          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="startWorkoutFromResolved()">${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Today's Workout ${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}</button>
            <button class="btn btn-secondary" onclick="switchView('split')">${renderIcon('calendar', 'cx-icon cx-icon-inline')} View My Split</button>
          </div>
        </div>
      </div>`;
  }

  const isPaused = session.status === 'paused';
  let totalSets = 0;
  let completedSets = 0;

  session.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      totalSets++;
      if (s.completed) completedSets++;
    });
  });

  const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const elapsedSec = getSessionElapsedSec(session);

  // Active exercise lookup (default to first uncompleted or manually selected)
  let activeExIdx = _selectedWorkoutExIdx;
  if (activeExIdx === null || activeExIdx < 0 || activeExIdx >= session.exercises.length) {
    activeExIdx = session.exercises.findIndex(ex => ex.sets.some(s => !s.completed));
    if (activeExIdx === -1) activeExIdx = session.exercises.length - 1;
  }

  const activeEx = session.exercises[activeExIdx] || session.exercises[0];
  let activeSetIdx = activeEx.sets.findIndex(s => !s.completed);
  if (activeSetIdx === -1) activeSetIdx = activeEx.sets.length - 1;

  const activeSet = activeEx.sets[activeSetIdx] || activeEx.sets[0];
  const isHold = activeEx.exercise_type === 'duration';

  // Benchmarks
  const targetVal = activeSet.target_val;
  const targetDesc = isHold ? `${targetVal} sec` : `${targetVal} reps`;

  const lastLog = state.todayLogs[activeEx.exercise_id];
  let lastVal = null;
  let lastPerfDesc = '—';
  if (lastLog) {
    lastVal = isHold ? (lastLog.duration_sec ?? lastLog.reps) : (lastLog.reps ?? lastLog.duration_sec);
    lastPerfDesc = isHold ? `${lastVal} sec` : `${lastVal} reps`;
    if (lastLog.weight_kg) lastPerfDesc += ` (+${lastLog.weight_kg}kg)`;
  } else {
    lastVal = isHold ? Math.max(10, targetVal - 7) : Math.max(1, targetVal - 2);
    lastPerfDesc = isHold ? `${lastVal} sec` : `${lastVal} reps`;
  }

  // Context: Notes + Muscle Targets / Equipment
  const muscleTargets = typeof getWorkoutMuscleTargets === 'function'
    ? getWorkoutMuscleTargets({ name: activeEx.exercise_name, exercises: [activeEx] })
    : null;
  let contextParts = [];
  if (activeEx.notes && activeEx.notes.trim()) {
    contextParts.push(activeEx.notes.trim());
  }
  if (muscleTargets && muscleTargets.label) {
    contextParts.push(muscleTargets.label);
  }
  if (contextParts.length === 0) {
    if (activeEx.tempo) contextParts.push(`Tempo ${activeEx.tempo}`);
    else contextParts.push(isHold ? 'Isometric Hold' : 'Bodyweight');
  }
  const exerciseContextText = contextParts.join(' · ');
  const activeExTip = getExerciseContextualTip(activeEx);

  // Movement pattern lookup for active animation
  const catalogEx = state.exercises.find(e => e.id === activeEx.exercise_id || e.name === activeEx.exercise_name);
  const activePattern = catalogEx?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(activeEx.exercise_name) : 'push');
  setCurrentMovementPattern(activePattern, activeEx.exercise_id, activeEx.exercise_name);
  const patternDisplayLabel = (activePattern || 'push').replace(/_/g, ' ').toUpperCase();
  const animationSvgHtml = (typeof window !== 'undefined' && window.ExerciseAnimation)
    ? window.ExerciseAnimation.render(activePattern, { size: 'xl', showFloor: true, paused: isPaused })
    : '';

  const unitText = isHold ? 'SEC' : 'REPS';
  const stepDelta = isHold ? 5 : 1;
  const minVal = 0;

  const currentActual = Number(activeSet.actual_val !== null && activeSet.actual_val !== undefined && activeSet.actual_val !== ''
    ? activeSet.actual_val
    : targetVal);

  const isThisHoldRunning = isHold && _workoutHoldState.exIdx === activeExIdx && _workoutHoldState.setIdx === activeSetIdx;
  const holdDisplaySec = isThisHoldRunning ? _workoutHoldState.elapsed : currentActual;
  const isMinDisabled = isPaused || isThisHoldRunning || currentActual <= minVal;

  const weightVal = (activeSet.weight_kg != null && activeSet.weight_kg > 0) ? activeSet.weight_kg : null;
  const weightBadgeHtml = weightVal != null ? `<span class="runner-weight-pill mono">+${weightVal} kg</span>` : '';

  // Rest timer banner if active
  const restProgressPct = _workoutRestState.total > 0
    ? Math.max(0, Math.min(100, (_workoutRestState.remaining / _workoutRestState.total) * 100))
    : 0;

  const isLast3s = _workoutRestState.remaining > 0 && _workoutRestState.remaining <= 3;
  const restCountdownHtml = _workoutRestState.active ? `
    <div class="runner-rest-card ${isLast3s ? 'is-pulse-alert' : ''}" id="workout-rest-card-container" role="region" aria-label="Rest Timer">
      <div class="runner-rest-top">
        <div class="runner-rest-info">
          <span class="runner-rest-tag">
            ${renderIcon('timer', 'cx-icon cx-icon-inline cx-icon-xs')} REST
          </span>
          <span class="runner-rest-digits mono ${isLast3s ? 'pulse-digits' : ''}" id="workout-rest-timer-val">${fmtSecs(_workoutRestState.remaining)}</span>
          ${_workoutRestState.nextInfo ? `<span class="runner-rest-next">${_workoutRestState.nextInfo}</span>` : ''}
        </div>
        <div class="runner-rest-controls">
          <button class="runner-rest-btn" type="button" onclick="adjustWorkoutRest(-15)" aria-label="Decrease rest by 15 seconds" title="Decrease rest by 15s">-15s</button>
          <button class="runner-rest-btn" type="button" onclick="adjustWorkoutRest(15)" aria-label="Increase rest by 15 seconds" title="Increase rest by 15s">+15s</button>
          <button class="runner-rest-skip-btn" type="button" onclick="stopWorkoutRest()" aria-label="Skip rest and continue" title="Skip rest and start next set">
            ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Skip Rest
          </button>
        </div>
      </div>
      ${_workoutRestState.feedback ? `
        <div class="runner-rest-feedback-strip">
          <span class="runner-rest-feedback-icon">${renderIcon('zap', 'cx-icon cx-icon-xs')}</span>
          <span class="runner-rest-feedback-text">${_workoutRestState.feedback}</span>
        </div>
      ` : ''}
      <div class="runner-rest-bar-track">
        <div class="runner-rest-bar-fill" id="workout-rest-timer-bar" style="width: ${restProgressPct}%;"></div>
      </div>
    </div>` : '';

  // Up Next exercise determination for the bottom of the left sticky panel
  let upNextCardHtml = '';
  const nextEx = session.exercises[activeExIdx + 1];

  if (nextEx) {
    const nextCat = state.exercises.find(e => e.id === nextEx.exercise_id || e.name === nextEx.exercise_name);
    const nextPattern = nextCat?.movement_pattern || ((typeof window !== 'undefined' && window.ExerciseAnimation) ? window.ExerciseAnimation.getPatternKey(nextEx.exercise_name) : 'push_horizontal');
    const nextPatternBadge = nextPattern.replace(/_/g, ' ').toUpperCase();
    const nextIsHold = nextEx.exercise_type === 'duration';
    const nextTarget = `${nextEx.sets.length} sets × ${nextEx.sets[0]?.target_val || 10}${nextIsHold ? 's hold' : ' reps'}`;
    
    const nextAnimHtml = (typeof window !== 'undefined' && window.ExerciseAnimation)
      ? window.ExerciseAnimation.render(nextPattern, { size: 'sm', showFloor: true, paused: isPaused })
      : '';

    upNextCardHtml = `
      <div class="runner-upnext-card" onclick="selectWorkoutQueueExercise(${activeExIdx + 1})" title="Preview next exercise: ${nextEx.exercise_name}">
        <div class="runner-upnext-header">
          <span class="runner-upnext-tag">
            ${renderIcon('arrowRight', 'cx-icon cx-icon-xs cx-icon-inline')} UP NEXT (${activeExIdx + 2} of ${session.exercises.length})
          </span>
          <span class="runner-upnext-pattern">${nextPatternBadge}</span>
        </div>
        <div class="runner-upnext-body">
          <div class="runner-upnext-thumb">
            ${nextAnimHtml}
          </div>
          <div class="runner-upnext-info">
            <h4 class="runner-upnext-name">${nextEx.exercise_name}</h4>
            <span class="runner-upnext-target mono">${nextTarget}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    // Final exercise of the workout!
    upNextCardHtml = `
      <div class="runner-upnext-card finish-preview">
        <div class="runner-upnext-header">
          <span class="runner-upnext-tag finish">
            ${renderIcon('award', 'cx-icon cx-icon-xs cx-icon-inline')} FINAL EXERCISE
          </span>
          <span class="runner-upnext-pattern finish">SESSION WRAP-UP</span>
        </div>
        <div class="runner-upnext-body">
          <div class="runner-upnext-finish-icon">
            ${renderIcon('flag', 'cx-icon cx-icon-sm')}
          </div>
          <div class="runner-upnext-info">
            <h4 class="runner-upnext-name">Workout Complete Ahead!</h4>
            <span class="runner-upnext-target">Finish strong on these final sets</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="runner-screen runner-screen-widescreen">
      <!-- LEFT: Sticky Movement Animation & Form Focus Panel + Up Next Preview -->
      <aside class="runner-sticky-visual-panel" aria-label="Active Exercise Movement Animation and Up Next Preview">
        <div class="runner-sticky-card ${isPaused ? 'is-paused' : ''}">
          <div class="runner-sticky-header">
            <span class="runner-sticky-tag">
              <span class="runner-live-dot ${isPaused ? 'paused' : ''}"></span> ${isPaused ? 'WORKOUT PAUSED' : 'FORM & MOTION'}
            </span>
            <span class="runner-pattern-badge">${patternDisplayLabel}</span>
          </div>

          <div class="runner-stage-tabs" role="tablist" aria-label="Visual Mode Switcher">
            <button class="runner-stage-tab-btn ${_runnerStageTab === 'motion' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${_runnerStageTab === 'motion'}" onclick="setRunnerStageTab('motion')">
              ${renderIcon('activity', 'cx-icon cx-icon-xs cx-icon-inline')} Motion
            </button>
            <button class="runner-stage-tab-btn ${_runnerStageTab === 'muscles' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${_runnerStageTab === 'muscles'}" onclick="setRunnerStageTab('muscles')">
              ${renderIcon('target', 'cx-icon cx-icon-xs cx-icon-inline')} Muscle Map
            </button>
          </div>

          <div class="runner-sticky-anim-stage ${_runnerStageTab === 'muscles' ? 'is-muscle-view' : ''}" title="${activeEx.exercise_name} (${_runnerStageTab === 'muscles' ? 'Target Muscles' : patternDisplayLabel})">
            ${_runnerStageTab === 'muscles'
              ? ((typeof window !== 'undefined' && window.MuscleMap)
                  ? window.MuscleMap.render({ exerciseName: activeEx.exercise_name, movementPattern: patternKey, size: 'md', view: 'both', showLegend: true })
                  : '')
              : animationSvgHtml}
          </div>

          <div class="runner-sticky-cue">
            <span class="runner-sticky-cue-icon">${renderIcon('lightbulb', 'cx-icon cx-icon-xs')}</span>
            <p class="runner-sticky-cue-text">${activeExTip}</p>
          </div>
        </div>

        ${upNextCardHtml}
      </aside>

      <!-- RIGHT: Interactive Workout Controls Column -->
      <div class="runner-main-controls-col">
        <!-- 1. Top Navigation & Workout Session Header -->
        <div class="runner-top-bar">
          <!-- LEFT: Back / Leave + Routine Title + Session Info -->
          <div class="runner-header-left">
            <button class="runner-back-btn" onclick="switchView('home')" aria-label="Leave workout and return to Home" title="Leave Workout">
              ${renderIcon('arrowLeft', 'cx-icon cx-icon-xs')}
            </button>
            <div class="runner-header-session-info">
              <span class="runner-header-routine-title">${session.routine || session.workout_name || 'LEGS A'}</span>
              <span class="runner-header-session-sub">${session.level ? `Level ${session.level}` : 'In Progress'}</span>
            </div>
          </div>

          <!-- CENTER: Session Timer (Interactive Pause / Resume Toggle) -->
          <div class="runner-header-center">
            <div class="runner-timer-pill mono ${isPaused ? 'paused' : ''}" id="workout-elapsed-time" role="timer" aria-label="Session Elapsed Time (Tap to Pause or Resume)" onclick="togglePauseWorkoutSession()" style="cursor:pointer;" title="${isPaused ? 'Click to Resume Workout' : 'Click to Pause Workout'}">
              ${renderIcon(isPaused ? 'play' : 'timer', 'cx-icon cx-icon-inline cx-icon-xs')}
              <span id="workout-elapsed-val" class="runner-timer-text">${fmtSecs(elapsedSec)}</span>
              ${isPaused ? `<span class="runner-paused-badge">PAUSED</span>` : ''}
            </div>
          </div>

          <!-- RIGHT: Secondary Action (Settings/Options) + Finish Workout -->
          <div class="runner-header-right">
            <button class="runner-header-opt-btn" onclick="openSettingsModal()" aria-label="Workout Settings & Options" title="Options">
              ${renderIcon('settings', 'cx-icon cx-icon-xs')}
            </button>
            <button class="runner-finish-btn" onclick="finishWorkoutSession()" aria-label="Finish Workout" title="Complete and log session">
              ${renderIcon('flag', 'cx-icon cx-icon-xs cx-icon-inline')}
              <span>Finish</span>
            </button>
          </div>
        </div>

        <!-- 2. Overall Workout & Exercise Progress Hierarchy -->
        <div class="runner-progress-container">
          <div class="runner-progress-labels">
            <div class="runner-exercise-progress">
              <span class="runner-exercise-count">Exercise ${activeExIdx + 1} of ${session.exercises.length}</span>
            </div>
            <div class="runner-overall-progress">
              <span class="runner-set-counter mono">${completedSets} / ${totalSets} sets</span>
              <span class="runner-progress-dot">·</span>
              <span class="runner-pct mono">${pct}%</span>
            </div>
          </div>
          <div class="runner-progress-bar-track">
            <div class="runner-progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        ${restCountdownHtml}

        <!-- 3. Active Exercise Stage Card -->
        <div class="runner-stage-card">
          <!-- 1. Header: Set Stepper + Exercise Name + Context -->
          <div class="runner-stage-header">
            <div class="runner-stage-title-wrap">
              <div class="runner-set-stepper-wrap">
                <span class="runner-set-badge mono">SET ${activeSet.set_num} / ${activeEx.sets.length}</span>
                <div class="runner-set-pips-track" role="progressbar" aria-valuenow="${activeEx.sets.filter(s => s.completed).length}" aria-valuemax="${activeEx.sets.length}" title="${activeEx.sets.filter(s => s.completed).length} of ${activeEx.sets.length} sets completed">
                  ${activeEx.sets.map((s, sIdx) => {
                    const isCompleted = s.completed;
                    const isCurrent = sIdx === activeSetIdx;
                    let pipClass = 'upcoming';
                    if (isCompleted) pipClass = 'completed';
                    else if (isCurrent) pipClass = 'current';
                    return `<div class="runner-set-pip ${pipClass}" title="Set ${sIdx + 1}: ${isCompleted ? 'Completed' : (isCurrent ? 'Current' : 'Upcoming')}"></div>`;
                  }).join('')}
                </div>
              </div>
              <h1 class="runner-exercise-name">${activeEx.exercise_name}</h1>
              <div class="runner-exercise-context">${exerciseContextText}</div>
            </div>
            <div class="runner-stage-art" onclick="openBiomechanicsModal()" title="View Anatomy & Form Guide">
              ${renderExerciseIllustrationSvg(activeEx)}
            </div>
          </div>

          <!-- 2. Target & Last Session Performance Strip -->
          <div class="runner-benchmarks">
            <div class="runner-benchmark-col">
              <span class="runner-benchmark-label">Target</span>
              <span class="runner-benchmark-val mono">${targetVal} ${isHold ? 'sec' : 'reps'}</span>
            </div>
            <div class="runner-benchmark-col runner-benchmark-col-right">
              <span class="runner-benchmark-label">Last Session</span>
              <div class="runner-benchmark-val mono">${lastPerfDesc}</div>
              <span class="runner-benchmark-time">2 days ago</span>
            </div>
          </div>

          <!-- 3. Current Input / Counter Zone (Context-Aware Visual Focal Point) -->
          <div class="runner-hero-counter-zone">
            <div class="runner-reps-stepper">
              <button class="runner-reps-btn" type="button" ${isMinDisabled ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, -${stepDelta})" aria-label="Decrease ${unitText.toLowerCase()}">−</button>
              <div class="runner-reps-digits-box">
                <span class="runner-reps-num mono" id="workout-active-counter-digits">${isThisHoldRunning ? holdDisplaySec : currentActual}</span>
                <span class="runner-reps-unit">${unitText}</span>
                ${weightBadgeHtml}
              </div>
              <button class="runner-reps-btn" type="button" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="adjustWorkoutSetActual(${activeExIdx}, ${activeSetIdx}, ${stepDelta})" aria-label="Increase ${unitText.toLowerCase()}">+</button>
            </div>

            <!-- Quick-Fill Performance Shortcut Chips -->
            <div class="runner-quick-fill-bar">
              <button class="runner-quick-fill-chip ${currentActual === lastVal ? 'active' : ''}" type="button" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="setWorkoutSetActualDirect(${activeExIdx}, ${activeSetIdx}, ${lastVal})" title="Fill last session's performance: ${lastVal} ${isHold ? 'sec' : 'reps'}">
                ${renderIcon('history', 'cx-icon cx-icon-xs cx-icon-inline')} Same as last (${lastVal} ${isHold ? 's' : 'reps'})
              </button>
              ${targetVal !== lastVal ? `
                <button class="runner-quick-fill-chip ${currentActual === targetVal ? 'active' : ''}" type="button" ${isPaused || isThisHoldRunning ? 'disabled' : ''} onclick="setWorkoutSetActualDirect(${activeExIdx}, ${activeSetIdx}, ${targetVal})" title="Reset to target: ${targetVal} ${isHold ? 'sec' : 'reps'}">
                  ${renderIcon('target', 'cx-icon cx-icon-xs cx-icon-inline')} Target (${targetVal} ${isHold ? 's' : 'reps'})
                </button>
              ` : ''}
            </div>

            ${isHold ? `
              <div class="runner-hold-live-control">
                ${isThisHoldRunning ? `
                  <button class="runner-ring-btn running" id="workout-active-hold-btn" type="button" onclick="stopWorkoutHold(true)">
                    ${renderIcon('pause', 'cx-icon cx-icon-xs cx-icon-inline')} STOP HOLD (${holdDisplaySec}s)
                  </button>
                ` : `
                  <button class="runner-ring-btn" id="workout-active-hold-btn" type="button" ${isPaused ? 'disabled' : ''} onclick="startWorkoutHold(${activeExIdx}, ${activeSetIdx})">
                    ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} START LIVE HOLD TIMER
                  </button>
                `}
              </div>
            ` : ''}
          </div>

          <!-- 4. Primary Action CTA -->
          <button class="runner-complete-action-btn" ${isPaused ? 'disabled' : ''} onclick="handleCompleteSetClick(event, ${activeExIdx}, ${activeSetIdx})">
            ${renderIcon('check', 'cx-icon cx-icon-inline cx-icon-md runner-check-icon')} COMPLETE SET
          </button>

          <!-- 5. Set Details Accordion -->
          <details class="runner-details-accordion">
            <summary class="runner-details-summary">
              <div class="runner-details-summary-text">
                <span class="runner-details-title">Add set details</span>
                <span class="runner-details-subtitle">Weight · RPE · Notes</span>
              </div>
              ${renderIcon('chevronDown', 'cx-icon cx-icon-xs cx-icon-muted')}
            </summary>
            <div class="runner-details-body">
              <div class="runner-form-row">
                <div class="runner-form-field">
                  <label>Added Weight (+kg)</label>
                  <input type="number" min="0" step="0.5" placeholder="0 kg" value="${activeSet.weight_kg || ''}" onchange="updateWorkoutSetWeight(${activeExIdx}, ${activeSetIdx}, this.value)" class="form-input mono">
                </div>
                <div class="runner-form-field">
                  <label>RPE (1–10 Effort)</label>
                  <select onchange="updateWorkoutSetRPE(${activeExIdx}, ${activeSetIdx}, this.value)" class="form-input form-select mono">
                    <option value="">RPE (Optional)</option>
                    <option value="6" ${activeSet.rpe == 6 ? 'selected' : ''}>RPE 6 (~4 in reserve)</option>
                    <option value="7" ${activeSet.rpe == 7 ? 'selected' : ''}>RPE 7 (~3 in reserve)</option>
                    <option value="8" ${activeSet.rpe == 8 ? 'selected' : ''}>RPE 8 (~2 in reserve)</option>
                    <option value="9" ${activeSet.rpe == 9 ? 'selected' : ''}>RPE 9 (~1 in reserve)</option>
                    <option value="10" ${activeSet.rpe == 10 ? 'selected' : ''}>RPE 10 (Max / Failure)</option>
                  </select>
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- 4. Session Overview Exercise Sequence -->
        <div class="runner-queue-section">
          <div class="runner-queue-head">
            <span class="runner-queue-tag">SESSION</span>
            <span class="runner-queue-summary mono">${completedSets} / ${totalSets} sets</span>
          </div>

          <div class="runner-queue-list">
            ${session.exercises.map((ex, exIdx) => {
              const isDone = ex.sets.every(s => s.completed);
              const doneCount = ex.sets.filter(s => s.completed).length;
              const isCurrent = exIdx === activeExIdx;
              const isHold = ex.exercise_type === 'duration';
              const targetUnit = isHold ? 's' : ' reps';
              const targetDisplay = `${ex.sets.length} sets × ${ex.sets[0]?.target_val || 10}${targetUnit}`;

              let stateClass = 'upcoming';
              let iconHtml = '<span class="runner-seq-icon upcoming">○</span>';

              if (isCurrent) {
                stateClass = 'current';
                iconHtml = '<span class="runner-seq-icon current">●</span>';
              } else if (isDone) {
                stateClass = 'completed';
                iconHtml = `<span class="runner-seq-icon completed">${renderIcon('check', 'cx-icon cx-icon-xs')}</span>`;
              }

              return `
                <div class="runner-seq-row ${stateClass}" onclick="selectWorkoutQueueExercise(${exIdx})" title="Select ${ex.exercise_name}">
                  <div class="runner-seq-left">
                    ${iconHtml}
                    <div class="runner-seq-info">
                      <span class="runner-seq-name">${ex.exercise_name}</span>
                      <span class="runner-seq-sub">${targetDisplay}</span>
                    </div>
                  </div>
                  <div class="runner-seq-right">
                    <span class="runner-seq-count mono">${doneCount}/${ex.sets.length}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="runner-coach-tip">
            <div class="runner-coach-tip-icon">${renderIcon('lightbulb', 'cx-icon cx-icon-xs')}</div>
            <div class="runner-coach-tip-text">
              <strong>Form Cue:</strong> ${activeExTip}
            </div>
          </div>

          <div style="margin-top:20px; display:flex; justify-content:center;">
            <button class="runner-discard-btn" type="button" onclick="openDiscardWorkoutModal()" aria-label="Discard workout session">
              ${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Discard workout
            </button>
          </div>
        </div>
      </div>
    </div>`;
}


