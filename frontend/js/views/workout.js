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

const WORKOUT_PHASES = {
  WARM_UP: 'warm_up',
  MAIN_WORKOUT: 'main_workout',
  COOL_DOWN: 'cool_down'
};

function canonicalPhase(phase) {
  if (!phase) return WORKOUT_PHASES.MAIN_WORKOUT;
  const p = String(phase).toLowerCase().trim().replace(/[-]/g, '_');
  if (p === 'warmup' || p === 'warm_up' || p === 'prepare') return WORKOUT_PHASES.WARM_UP;
  if (p === 'cooldown' || p === 'cool_down' || p === 'recover') return WORKOUT_PHASES.COOL_DOWN;
  if (p === 'main' || p === 'main_workout' || p === 'train' || p === 'strength') return WORKOUT_PHASES.MAIN_WORKOUT;
  return WORKOUT_PHASES.MAIN_WORKOUT;
}

function isWarmupPhase(phase) {
  return canonicalPhase(phase) === WORKOUT_PHASES.WARM_UP;
}

function isMainPhase(phase) {
  return canonicalPhase(phase) === WORKOUT_PHASES.MAIN_WORKOUT;
}

function isCooldownPhase(phase) {
  return canonicalPhase(phase) === WORKOUT_PHASES.COOL_DOWN;
}

function getWarmupExercises(session) {
  if (!session) return [];
  return (session.warmup || []).filter(e => isWarmupPhase(e.phase));
}

function getMainWorkoutExercises(session) {
  if (!session) return [];
  return (session.exercises || []).filter(e => isMainPhase(e.phase));
}

function getCooldownExercises(session) {
  if (!session) return [];
  return (session.cooldown || []).filter(e => isCooldownPhase(e.phase));
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
  if (active && (active.status === 'in_progress' || active.status === 'paused') && active.routine === workoutName) {
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
    mainRaw = rawList.map(item => ({ ...item, phase: WORKOUT_PHASES.MAIN_WORKOUT }));
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
    const ex = getExercise(le.exercise_id);
    const isHold = (le.exercise_type || ex?.type) === 'duration';
    const targetVal = isHold ? (le.duration_sec || le.target_val || 30) : (le.reps || le.target_val || 10);
    return {
      id: le.id || (idx + 1),
      exercise_id: le.exercise_id || null,
      exercise_name: le.exercise_name || ex?.name || 'Warm-up Movement',
      exercise_type: isHold ? 'duration' : 'reps',
      phase: WORKOUT_PHASES.WARM_UP,
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
      phase: WORKOUT_PHASES.MAIN_WORKOUT,
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
    const ex = getExercise(le.exercise_id);
    const isHold = (le.exercise_type || ex?.type) === 'duration';
    const targetVal = isHold ? (le.duration_sec || le.target_val || 30) : (le.reps || le.target_val || 10);
    return {
      id: le.id || (idx + 1),
      exercise_id: le.exercise_id || null,
      exercise_name: le.exercise_name || ex?.name || 'Cool-down Stretch',
      exercise_type: isHold ? 'duration' : 'reps',
      phase: WORKOUT_PHASES.COOL_DOWN,
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
      client_uuid: newUUID()
    };
  });

  const hasWarmup = warmup.length > 0;
  const hasCooldown = cooldown.length > 0;
  const initialPhase = hasWarmup ? 'warmup' : 'main';

  const session = {
    id: newUUID(),
    date: todayISO(),
    routine: workoutName,
    workout_name: workoutName,
    workout_id: workoutId,
    level: 1,
    startTime: null,
    startedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    endTime: null,
    status: 'ready',
    currentPhase: initialPhase,
    warmup,
    warmup_idx: 0,
    warmup_status: hasWarmup ? 'ready' : 'none',
    exercises,
    cooldown,
    cooldown_idx: 0,
    cooldown_status: hasCooldown ? 'pending' : 'none',
    phaseTimer: {
      isRunning: false,
      duration: warmup[0]?.duration_sec || 30,
      remaining: warmup[0]?.duration_sec || 30,
      startedAt: null,
      pausedMs: 0
    }
  };

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
  if (!session.startTime || session.status === 'ready') {
    const now = Date.now();
    session.startTime = now;
    session.startedAt = now;
    session.status = 'in_progress';
    if (session.currentPhase === 'warmup' && session.warmup_status === 'ready') {
      session.warmup_status = 'in_progress';
    }
    saveActiveSession(session);
    startWorkoutDurationTimer();
  }
}

function openWorkoutView() {
  state.view = 'workout';
  window.location.hash = 'workout';
  const session = getActiveSession();
  if (session && (session.status === 'in_progress' || session.status === 'active') && session.startTime) {
    startWorkoutDurationTimer();
  }
  render();
}

function pauseWorkoutSession() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'active')) return;
  cancelAutoAdvance(false);
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
  if (session.phaseTimer && session.phaseTimer.isRunning) {
    session.phaseTimer.isRunning = false;
    session.phaseTimer.pausedAt = Date.now();
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
  if (!session.startTime || session.status === 'ready') {
    ensureSessionStarted(session);
    render();
    return;
  }
  if (session.status !== 'paused') return;
  const pausedMs = session.pausedAt ? (Date.now() - session.pausedAt) : 0;
  session.totalPausedMs = (session.totalPausedMs || 0) + pausedMs;
  session.status = 'in_progress';
  session.pausedAt = null;
  if (session.phaseTimer && session.phaseTimer.pausedAt) {
    const ptPausedDelta = Date.now() - session.phaseTimer.pausedAt;
    session.phaseTimer.startedAt = (session.phaseTimer.startedAt || Date.now()) + ptPausedDelta;
    session.phaseTimer.pausedAt = null;
    session.phaseTimer.isRunning = true;
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
  if (!session.startTime || session.status === 'ready') {
    ensureSessionStarted(session);
    render();
    return;
  }
  if (session.status === 'paused') {
    resumeWorkoutSession();
  } else {
    pauseWorkoutSession();
  }
}

function startWorkoutDurationTimer() {
  const currentSession = getActiveSession();
  if (!currentSession || !currentSession.startTime || currentSession.status === 'ready') {
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
        const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
        const isPaused = isStarted && session.status === 'paused';
        const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;
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
        if ((session.currentPhase === 'warmup' || session.currentPhase === 'cooldown') && session.phaseTimer && session.phaseTimer.isRunning) {
          const pt = session.phaseTimer;
          const elapsed = Math.floor((Date.now() - pt.startedAt) / 1000);
          const remaining = Math.max(0, pt.duration - elapsed);
          const prevRemaining = pt.remaining;
          pt.remaining = remaining;

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
          if (circleEl && pt.duration > 0) {
            const fraction = Math.max(0, Math.min(1, remaining / pt.duration));
            const offset = (440 * (1 - fraction)).toFixed(1);
            circleEl.style.strokeDashoffset = `${offset}`;
            if (remaining <= 3 && remaining > 0) {
              circleEl.classList.add('is-warning');
            } else {
              circleEl.classList.remove('is-warning');
            }
          }

          const barEl = document.getElementById('runner-phase-timer-bar');
          if (barEl && pt.duration > 0) {
            const pct = Math.max(0, Math.min(100, (remaining / pt.duration) * 100));
            barEl.style.width = `${pct}%`;
          }

          if (remaining <= 0) {
            pt.isRunning = false;
            pt.remaining = 0;
            saveActiveSession(session);
            cueTimerComplete();
            const btnEl = document.getElementById('runner-phase-timer-toggle-btn');
            if (btnEl) {
              btnEl.innerHTML = `${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Restart Timer`;
            }

            // Auto-advance with 3s grace period for timed movements
            if (isAutoAdvanceEnabled()) {
              triggerTimedAutoAdvance(session.currentPhase === 'warmup' ? advanceWarmupMovement : advanceCooldownStretch, session.currentPhase);
            }
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

  const currentIdx = session.warmup_idx != null ? session.warmup_idx : 0;
  if (idx > currentIdx) {
    for (let i = currentIdx; i < idx; i++) {
      const w = session.warmup[i];
      if (w && !w.completed) {
        w.skipped = true;
        w.completed = false;
        w.skipped_at = new Date().toISOString();
      }
    }
  }

  session.warmup_idx = idx;
  if (session.phaseTimer) {
    session.phaseTimer.isRunning = false;
    session.phaseTimer.startedAt = null;
    session.phaseTimer.pausedAt = null;
    const curEx = session.warmup[idx];
    session.phaseTimer.duration = curEx?.duration_sec || 30;
    session.phaseTimer.remaining = session.phaseTimer.duration;
  }
  saveActiveSession(session);
  render();
}

function selectCooldownStretch(idx) {
  let session = getActiveSession();
  if (!session || !session.cooldown || !session.cooldown[idx]) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();

  const currentIdx = session.cooldown_idx != null ? session.cooldown_idx : 0;
  if (idx > currentIdx) {
    for (let i = currentIdx; i < idx; i++) {
      const c = session.cooldown[i];
      if (c && !c.completed) {
        c.skipped = true;
        c.completed = false;
        c.skipped_at = new Date().toISOString();
      }
    }
  }

  session.cooldown_idx = idx;
  if (session.phaseTimer) {
    session.phaseTimer.isRunning = false;
    session.phaseTimer.startedAt = null;
    session.phaseTimer.pausedAt = null;
    const curEx = session.cooldown[idx];
    session.phaseTimer.duration = curEx?.duration_sec || 30;
    session.phaseTimer.remaining = session.phaseTimer.duration;
  }
  saveActiveSession(session);
  render();
}

function togglePhaseTimer() {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  if (!session.startTime || session.status === 'ready') {
    ensureSessionStarted(session);
    session = getActiveSession();
  }
  if (session.status === 'paused') {
    resumeWorkoutSession();
    session = getActiveSession();
  }
  if (!session.phaseTimer) {
    session.phaseTimer = { isRunning: false, remaining: 0, duration: 0, startedAt: null, pausedMs: 0 };
  }
  const pt = session.phaseTimer;
  if (pt.isRunning) {
    pt.isRunning = false;
    pt.pausedAt = Date.now();
  } else {
    const curEx = session.currentPhase === 'warmup' ? session.warmup[session.warmup_idx] : session.cooldown[session.cooldown_idx];
    const defaultDuration = curEx ? (curEx.duration_sec || 30) : 30;
    if (!pt.duration || pt.duration <= 0 || (pt.remaining != null && pt.remaining <= 0)) {
      pt.duration = defaultDuration;
      pt.remaining = defaultDuration;
    }
    pt.startedAt = Date.now() - ((pt.duration - (pt.remaining || pt.duration)) * 1000);
    pt.pausedAt = null;
    pt.isRunning = true;
  }
  saveActiveSession(session);
  render();
}

function adjustPhaseTimer(delta) {
  let session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);

  const curEx = session.currentPhase === 'warmup' ? session.warmup[session.warmup_idx] : session.cooldown[session.cooldown_idx];
  if (!curEx) return;

  const isHold = curEx.exercise_type === 'duration';

  if (!isHold) {
    curEx.reps = Math.max(1, (curEx.reps || 10) + delta);
    saveActiveSession(session);
    render();
    return;
  }

  const pt = session.phaseTimer;
  const isActivelyRunning = pt && pt.isRunning && !session.pausedAt && session.status !== 'paused';

  if (isActivelyRunning) {
    // 1. Actively running: add/subtract from current remaining time
    const elapsed = Math.floor((Date.now() - pt.startedAt) / 1000);
    const currentRemaining = Math.max(0, pt.duration - elapsed);
    const newRemaining = Math.max(0, currentRemaining + delta);

    if (newRemaining <= 0) {
      // Reached floor of 0: trigger completion immediately
      pt.isRunning = false;
      pt.remaining = 0;
      saveActiveSession(session);
      cueTimerComplete();
      render();

      if (isAutoAdvanceEnabled()) {
        triggerTimedAutoAdvance(session.currentPhase === 'warmup' ? advanceWarmupMovement : advanceCooldownStretch, session.currentPhase);
      }
      return;
    }

    pt.duration = newRemaining;
    pt.remaining = newRemaining;
    pt.startedAt = Date.now();
    saveActiveSession(session);

    // Instant DOM updates
    const digitsEl = document.getElementById('runner-phase-timer-digits');
    if (digitsEl) {
      digitsEl.innerHTML = `${newRemaining} <span class="runner-digits-unit-label">SEC</span>`;
    }
    const circleEl = document.getElementById('runner-radial-progress-circle');
    if (circleEl) {
      const baseDuration = curEx.duration_sec || pt.duration || 30;
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
      const baseDuration = curEx.duration_sec || pt.duration || 30;
      const pct = Math.max(0, Math.min(100, (newRemaining / baseDuration) * 100));
      barEl.style.width = `${pct}%`;
    }
    return;
  }

  // 2. Pre-start or reset state: adjust target duration
  const newTarget = Math.max(5, (curEx.duration_sec || 30) + delta);
  curEx.duration_sec = newTarget;
  if (!session.phaseTimer) {
    session.phaseTimer = { isRunning: false, remaining: newTarget, duration: newTarget, startedAt: null, pausedMs: 0 };
  } else {
    session.phaseTimer.duration = newTarget;
    session.phaseTimer.remaining = newTarget;
    session.phaseTimer.isRunning = false;
    session.phaseTimer.startedAt = null;
  }
  saveActiveSession(session);
  render();
}

function advanceWarmupMovement() {
  let session = getActiveSession();
  if (!session || !session.warmup || session.warmup_idx == null) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();
  if (session.status === 'paused') {
    session.status = 'in_progress';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const curEx = session.warmup[session.warmup_idx];
  if (curEx) {
    curEx.completed = true;
    curEx.completed_at = new Date().toISOString();
  }
  cueSetComplete();

  if (session.warmup_idx + 1 < session.warmup.length) {
    session.warmup_idx += 1;
    if (session.phaseTimer) {
      session.phaseTimer.isRunning = false;
      session.phaseTimer.startedAt = null;
      session.phaseTimer.pausedAt = null;
      const nextEx = session.warmup[session.warmup_idx];
      session.phaseTimer.duration = nextEx?.duration_sec || 30;
      session.phaseTimer.remaining = session.phaseTimer.duration;
    }
    saveActiveSession(session);
    render();
  } else {
    const now = Date.now();
    session.warmup_status = 'completed';
    session.warmup_completed_at = new Date(now).toISOString();
    session.warmup_duration_sec = Math.max(0, Math.round((now - (session.startTime || now)) / 1000));

    const completedCount = session.warmup.filter(w => w.completed).length;
    const durationText = fmtDurationMinSec(session.warmup_duration_sec);

    session.breather = {
      fromPhase: 'warmup',
      toPhase: 'main',
      title: 'Warm-up Complete!',
      nextTitle: 'Ready for Main Training?',
      summaryText: `${completedCount}/${session.warmup.length} warm-up movements completed in ${durationText}`,
      ctaText: 'Start Training',
      icon: 'zap',
      accentColor: '#8b5cf6',
      accentGlow: 'rgba(139, 92, 246, 0.18)'
    };

    if (session.phaseTimer) {
      session.phaseTimer.isRunning = false;
    }

    cueExerciseComplete();
    showToast('Warm-up Complete! Ready for Main Workout');
    saveActiveSession(session);
    render();
  }
}

function skipWarmupPhase() {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  if (session.status === 'paused') {
    session.status = 'in_progress';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const now = Date.now();
  session.warmup_status = 'skipped';
  session.warmup_completed_at = new Date(now).toISOString();
  session.warmup_duration_sec = Math.max(0, Math.round((now - (session.startTime || now)) / 1000));
  session.main_started_at = now;

  session.currentPhase = 'main';
  session.phase = 'main';
  session.currentExerciseIndex = 0;
  _selectedWorkoutExIdx = 0;
  if (session.phaseTimer) {
    session.phaseTimer.isRunning = false;
  }
  showToast('Skipped Warm-up — Entering Main Workout');
  saveActiveSession(session);
  render();
}

function advanceCooldownStretch() {
  let session = getActiveSession();
  if (!session || !session.cooldown || session.cooldown_idx == null) return;
  cancelAutoAdvance(false);
  ensureSessionStarted(session);
  session = getActiveSession();
  if (session.status === 'paused') {
    session.status = 'in_progress';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const curEx = session.cooldown[session.cooldown_idx];
  if (curEx) {
    curEx.completed = true;
    curEx.completed_at = new Date().toISOString();
  }
  cueSetComplete();

  if (session.cooldown_idx + 1 < session.cooldown.length) {
    session.cooldown_idx += 1;
    if (session.phaseTimer) {
      session.phaseTimer.isRunning = false;
      session.phaseTimer.startedAt = null;
      session.phaseTimer.pausedAt = null;
      const nextEx = session.cooldown[session.cooldown_idx];
      session.phaseTimer.duration = nextEx?.duration_sec || 30;
      session.phaseTimer.remaining = session.phaseTimer.duration;
    }
    saveActiveSession(session);
    render();
  } else {
    const now = Date.now();
    session.cooldown_status = 'completed';
    session.cooldown_completed_at = new Date(now).toISOString();
    if (session.cooldown_started_at) {
      session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
    }
    saveActiveSession(session);
    finishWorkoutSession();
  }
}

function skipCooldownPhase() {
  const session = getActiveSession();
  if (!session) return;
  cancelAutoAdvance(false);
  if (session.status === 'paused') {
    session.status = 'in_progress';
    session.pausedAt = null;
    startWorkoutDurationTimer();
  }
  const now = Date.now();
  session.cooldown_status = 'skipped';
  session.cooldown_completed_at = new Date(now).toISOString();
  if (session.cooldown_started_at) {
    session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
  }
  saveActiveSession(session);
  finishWorkoutSession();
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

  _workoutHoldState = {
    exIdx,
    setIdx,
    targetVal,
    startedAt: Date.now(),
    elapsed: 0,
    beepsPlayed: {},
  };

  _workoutHoldInterval = setInterval(() => {
    if (!_workoutHoldState.startedAt) return;
    const now = Date.now();
    const elapsed = Math.floor((now - _workoutHoldState.startedAt) / 1000);
    _workoutHoldState.elapsed = elapsed;

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

  render();
}

function stopWorkoutHold(saveAndComplete = true) {
  cancelAutoAdvance(false);
  if (!_workoutHoldInterval && !_workoutHoldState.startedAt) return;

  const { exIdx, setIdx, startedAt } = _workoutHoldState;
  clearInterval(_workoutHoldInterval);
  _workoutHoldInterval = null;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  _workoutHoldState = { exIdx: null, setIdx: null, startedAt: null, elapsed: 0, targetVal: 30, beepsPlayed: {} };

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
    // diff < 0
    if (remainingSets > 0) {
      return `Logged (${actualVal}/${targetVal}${unit}) · ${remainingSets} sets remaining`;
    } else {
      return `Logged (${actualVal}/${targetVal}${unit}) · ${currentEx.exercise_name} complete`;
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

    // If all exercises and sets are completed in the main workout:
    const isEntireMainWorkoutDone = session.exercises.every(ex => ex.sets.every(s => s.completed));
    if (isEntireMainWorkoutDone) {
      const now = Date.now();
      session.main_completed_at = new Date(now).toISOString();
      session.main_duration_sec = Math.max(0, Math.round((now - (session.main_started_at || session.startTime || now)) / 1000));

      if (session.cooldown && session.cooldown.length > 0 && session.cooldown_status !== 'skipped' && session.cooldown_status !== 'completed') {
        stopWorkoutRest();
        const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
        const completedSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
        const durationText = fmtDurationMinSec(session.main_duration_sec);

        session.breather = {
          fromPhase: 'main',
          toPhase: 'cooldown',
          title: 'Main Workout Complete!',
          nextTitle: 'Ready for Cool-down & Recovery?',
          summaryText: `${completedSets}/${totalSets} sets completed across ${session.exercises.length} exercises in ${durationText}`,
          ctaText: 'Start Cool-down',
          icon: 'award',
          accentColor: '#10b981',
          accentGlow: 'rgba(16, 185, 129, 0.18)'
        };

        cueExerciseComplete();
        showToast('Main Workout Complete! Ready for Cool-down');
        saveActiveSession(session);
        render();
        return;
      }
    }

    // If final set of this exercise is completed, auto-advance to next uncompleted exercise
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

  // 1. Log Warm-up items if completed
  if (session.warmup && session.warmup.length > 0) {
    if (session.warmup_status === 'completed' || session.warmup.some(w => w.completed)) {
      for (const wEx of session.warmup) {
        if (wEx.completed) {
          const isHold = wEx.exercise_type === 'duration';
          const actual = (wEx.actual_val !== null && wEx.actual_val !== undefined && wEx.actual_val !== '')
            ? Number(wEx.actual_val)
            : (wEx.duration_sec || wEx.reps || (isHold ? 30 : 10));

          const logPayload = {
            exercise_id: wEx.exercise_id,
            timestamp: wEx.completed_at || session.completed_at,
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

  // 3. Log Cool-down items if completed
  if (session.cooldown && session.cooldown.length > 0) {
    if (session.cooldown_status === 'completed' || session.cooldown.some(c => c.completed)) {
      for (const cEx of session.cooldown) {
        if (cEx.completed) {
          const isHold = cEx.exercise_type === 'duration';
          const actual = (cEx.actual_val !== null && cEx.actual_val !== undefined && cEx.actual_val !== '')
            ? Number(cEx.actual_val)
            : (cEx.duration_sec || cEx.reps || (isHold ? 30 : 10));

          const logPayload = {
            exercise_id: cEx.exercise_id,
            timestamp: cEx.completed_at || session.completed_at,
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
  session.exercises.forEach(m => {
    const isExSkipped = !!m.skipped || (m.sets.every(s => s.skipped && !s.completed));
    assembledSnapshotExercises.push({
      exercise_id: m.exercise_id,
      exercise_name: m.exercise_name,
      phase: 'main',
      exercise_type: m.exercise_type,
      skipped: isExSkipped,
      sets: m.sets.map(s => ({
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

  const now = Date.now();
  if (session.cooldown_started_at && (!session.cooldown_duration_sec || session.cooldown_duration_sec === 0)) {
    session.cooldown_duration_sec = Math.max(0, Math.round((now - session.cooldown_started_at) / 1000));
  }
  if (!session.main_duration_sec || session.main_duration_sec === 0) {
    session.main_duration_sec = Math.max(0, durationSec - (session.warmup_duration_sec || 0) - (session.cooldown_duration_sec || 0));
  }

  const sessionPayload = {
    id: session.id,
    routine: session.routine || session.workout_name,
    workout_id: session.workout_id,
    started_at: new Date(session.startTime || session.startedAt).toISOString(),
    completed_at: session.completed_at,
    duration_sec: durationSec,
    warmup_duration_sec: session.warmup_duration_sec || 0,
    main_duration_sec: session.main_duration_sec || durationSec,
    cooldown_duration_sec: session.cooldown_duration_sec || 0,
    warmup_status: session.warmup_status || 'none',
    cooldown_status: session.cooldown_status || 'none',
    exercises: assembledSnapshotExercises
  };

  // 1. Post to backend /workout_sessions endpoint (with local outbox safety)
  try {
    await API.createWorkoutSession(sessionPayload);
  } catch (e) {
    console.warn('Direct session sync failed, queued locally:', e);
    localStorage.setItem(`${LS_SESSION_PREFIX}${session.id}`, JSON.stringify(sessionPayload));
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

  let summaryParts = [`${completedSets}/${totalSets} main sets`];
  if (session.warmup && session.warmup.length > 0) {
    summaryParts.push(session.warmup_status === 'completed' ? 'Warm-up completed' : 'Warm-up skipped');
  }
  if (session.cooldown && session.cooldown.length > 0) {
    summaryParts.push(session.cooldown_status === 'completed' ? 'Cool-down completed' : 'Cool-down skipped');
  }

  showToast(`Workout Complete · ${summaryParts.join(' · ')} (${Math.round(durationSec / 60)}m)`);
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

// ─── Finish Workout Confirmation Modal ──────────────────────────────────────

function requestFinishWorkout() {
  const session = getActiveSession();
  if (!session) return;

  const model = getWorkoutPhaseModel(session);
  const isAllDone = model && model.overall.isCompleted;

  if (isAllDone) {
    finishWorkoutSession();
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
    <div class="modal-card discard-modal-card" onclick="event.stopPropagation()">
      <div class="modal-header discard-modal-header">
        <div class="discard-modal-title-group">
          <div class="discard-modal-icon-wrap" style="background: rgba(124, 92, 252, 0.15); color: #a29bfe;">
            ${renderIcon('alertTriangle', 'cx-icon cx-icon-md')}
          </div>
          <h2 class="modal-title" id="confirm-finish-modal-title">Finish workout?</h2>
        </div>
        <button class="modal-close-btn" onclick="closeConfirmFinishWorkoutModal()" aria-label="Cancel and close dialog" title="Close">
          ${renderIcon('x', 'cx-icon cx-icon-sm')}
        </button>
      </div>
      <div class="discard-modal-body">
        <p class="discard-modal-desc">
          You still have incomplete exercises (${completedSets}/${totalSets} sets completed).
        </p>
      </div>
      <div class="discard-modal-actions">
        <button class="discard-modal-btn discard-modal-keep-btn" id="confirm-finish-continue-btn" type="button" onclick="closeConfirmFinishWorkoutModal()">
          ${renderIcon('play', 'cx-icon cx-icon-xs cx-icon-inline')} Continue Workout
        </button>
        <button class="discard-modal-btn" style="background: #7c5cfc; color: #ffffff; border: none; font-weight: 700; border-radius: 8px; padding: 10px 18px; cursor: pointer; transition: all 0.2s ease;" type="button" onclick="confirmFinishAnyway()">
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
  finishWorkoutSession();
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

// ─── Phase Navigation & Control Handlers ─────────────────────────────────────

function setWorkoutPhase(phase) {
  const session = getActiveSession();
  if (!session) return;
  session.currentPhase = phase;
  saveActiveSession(session);
  render();
}

function toggleWarmupItemComplete(idx) {
  const session = getActiveSession();
  if (!session || !session.warmup || !session.warmup[idx]) return;
  ensureSessionStarted(session);
  const item = session.warmup[idx];
  item.completed = !item.completed;
  item.completed_at = item.completed ? new Date().toISOString() : null;

  const allDone = session.warmup.every(w => w.completed);
  if (allDone) {
    session.warmup_status = 'completed';
  } else if (session.warmup.some(w => w.completed)) {
    session.warmup_status = 'in_progress';
  }
  saveActiveSession(session);
  render();
}

function toggleCooldownItemComplete(idx) {
  const session = getActiveSession();
  if (!session || !session.cooldown || !session.cooldown[idx]) return;
  ensureSessionStarted(session);
  const item = session.cooldown[idx];
  item.completed = !item.completed;
  item.completed_at = item.completed ? new Date().toISOString() : null;

  const allDone = session.cooldown.every(c => c.completed);
  if (allDone) {
    session.cooldown_status = 'completed';
  } else if (session.cooldown.some(c => c.completed)) {
    session.cooldown_status = 'in_progress';
  }
  saveActiveSession(session);
  render();
}

function toggleMainExerciseComplete(exIdx) {
  const session = getActiveSession();
  if (!session || !session.exercises || !session.exercises[exIdx]) return;
  ensureSessionStarted(session);
  const ex = session.exercises[exIdx];
  const allCompleted = ex.sets.every(s => s.completed);
  ex.sets.forEach(s => {
    s.completed = !allCompleted;
    s.completed_at = !allCompleted ? new Date().toISOString() : null;
  });
  saveActiveSession(session);
  render();
}

function startPhaseAutoRunner(phase) {
  const session = getActiveSession();
  if (!session) return;
  ensureSessionStarted(session);
  session.currentPhase = phase;

  if (phase === 'warmup') {
    const list = session.warmup || [];
    const firstUncompleted = list.findIndex(w => !w.completed);
    const startIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
    session.warmup_idx = startIdx;
    const cur = list[startIdx];
    const isHold = cur?.exercise_type === 'duration';

    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'cooldown') {
    const list = session.cooldown || [];
    const firstUncompleted = list.findIndex(c => !c.completed);
    const startIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
    session.cooldown_idx = startIdx;
    const cur = list[startIdx];
    const isHold = cur?.exercise_type === 'duration';

    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'main') {
    const list = session.exercises || [];
    const firstUncompleted = list.findIndex(ex => ex.sets && ex.sets.some(s => !s.completed));
    _selectedWorkoutExIdx = firstUncompleted !== -1 ? firstUncompleted : 0;
  }

  saveActiveSession(session);
  render();
}

function selectExerciseToExecute(phase, idx) {
  const session = getActiveSession();
  if (!session) return;
  ensureSessionStarted(session);
  session.currentPhase = phase;
  if (phase === 'warmup') {
    session.warmup_idx = idx;
    const cur = session.warmup[idx];
    const isHold = cur?.exercise_type === 'duration';
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'cooldown') {
    session.cooldown_idx = idx;
    const cur = session.cooldown[idx];
    const isHold = cur?.exercise_type === 'duration';
    session.phaseTimer = {
      isRunning: isHold,
      duration: cur?.duration_sec || 30,
      remaining: cur?.duration_sec || 30,
      startedAt: isHold ? Date.now() : null,
      pausedMs: 0
    };
  } else if (phase === 'main') {
    _selectedWorkoutExIdx = idx;
  }
  saveActiveSession(session);
  render();
}

function selectWorkoutQueueExercise(exIdx) {
  selectExerciseToExecute('main', exIdx);
}

// ─── Top Header Bar Renderer ────────────────────────────────────────────────

function renderWorkoutTopHeader(session) {
  const isStarted = !!(session.startTime || session.startedAt) && session.status !== 'ready';
  const isPaused = isStarted && session.status === 'paused';
  const elapsedSec = isStarted ? getSessionElapsedSec(session) : 0;

  return `
    <div class="runner-top-bar-redesign">
      <button class="runner-back-link" onclick="openDiscardWorkoutModal()" aria-label="Back to dashboard" title="Exit Workout">
        ${renderIcon('arrowLeft', 'cx-icon cx-icon-sm')}
        <span>Back to dashboard</span>
      </button>

      <div class="runner-header-title-group">
        <h1 class="runner-header-main-title">${session.routine || session.workout_name || 'WORKOUT'}</h1>
        <span class="runner-header-main-sub">${session.level ? `Level ${session.level}` : 'Level 1'}</span>
      </div>

      <div class="runner-header-actions-right">
        <div class="runner-session-timer-pill mono ${isPaused ? 'is-paused' : ''}" id="workout-elapsed-time" onclick="togglePauseWorkoutSession()" title="${isPaused ? 'Resume Timer' : 'Pause Timer'}">
          ${renderIcon('timer', 'cx-icon cx-icon-xs')}
          <span>Session <strong id="workout-elapsed-val">${fmtSecs(elapsedSec)}</strong></span>
          ${isPaused ? `<span class="runner-paused-badge">PAUSED</span>` : ''}
        </div>

        <button class="runner-settings-icon-btn" onclick="openSettingsModal()" title="Settings & Options" aria-label="Settings">
          ${renderIcon('settings', 'cx-icon cx-icon-xs')}
        </button>

        <button class="runner-finish-workout-btn" onclick="requestFinishWorkout()" title="Finish and save workout">
          <span>Finish Workout</span>
        </button>
      </div>
    </div>
  `;
}

// ─── Workout Phase Model & Structure Calculator ─────────────────────────────

function getWorkoutPhaseModel(session) {
  if (!session) return null;

  // 1. Warm-Up Phase
  const warmupList = getWarmupExercises(session);
  const warmupCompletedCount = warmupList.filter(w => w.completed).length;
  const warmupTotalCount = warmupList.length;
  const isWarmupDone = warmupTotalCount > 0 && warmupCompletedCount === warmupTotalCount;
  const isWarmupSkipped = session.warmup_status === 'skipped';
  const isWarmupInProgress = session.warmup_status === 'in_progress' || (warmupCompletedCount > 0 && !isWarmupDone);
  const warmupPct = warmupTotalCount > 0 ? Math.round((warmupCompletedCount / warmupTotalCount) * 100) : 0;

  let warmupEstSec = 0;
  warmupList.forEach(w => {
    warmupEstSec += (w.duration_sec || (w.reps ? w.reps * 3 : 30)) + (w.rest_sec || 10);
  });
  const warmupEstMin = Math.max(3, Math.round(warmupEstSec / 60));
  const warmupDurationText = warmupTotalCount > 0 ? `${Math.max(3, warmupEstMin - 1)}–${warmupEstMin + 2} min` : '5–8 min';

  const warmUp = {
    id: 'warmup',
    stepNumber: 1,
    title: 'WARM-UP',
    tabLabel: 'Warm-Up',
    description: 'Prepare your body and activate muscles.',
    estimatedDuration: warmupDurationText,
    estimatedDurationMin: warmupEstMin,
    exercises: warmupList,
    totalCount: warmupTotalCount,
    completedCount: warmupCompletedCount,
    totalSets: warmupTotalCount,
    completedSets: warmupCompletedCount,
    progressLabel: `${warmupCompletedCount} / ${warmupTotalCount} completed${isWarmupDone ? ' ✓' : ''}`,
    isCompleted: isWarmupDone,
    isSkipped: isWarmupSkipped,
    isInProgress: isWarmupInProgress,
    isPending: !isWarmupDone && !isWarmupInProgress && !isWarmupSkipped,
    completionState: isWarmupDone ? 'completed' : (isWarmupSkipped ? 'skipped' : (isWarmupInProgress ? 'in_progress' : 'ready')),
    progress: warmupPct,
    wireframeKey: 'warmup'
  };

  // 2. Main Workout Phase
  const mainList = getMainWorkoutExercises(session);
  let mainTotalSets = 0;
  let mainCompletedSets = 0;
  let mainCompletedCount = 0;
  let mainEstSec = 0;

  mainList.forEach(ex => {
    const isExDone = ex.sets && ex.sets.length > 0 && ex.sets.every(s => s.completed);
    if (isExDone) mainCompletedCount++;
    (ex.sets || []).forEach(s => {
      mainTotalSets++;
      if (s.completed) mainCompletedSets++;
      const isH = ex.exercise_type === 'duration';
      mainEstSec += (isH ? (s.target_val || 30) : (s.target_val || 10) * 3) + (ex.rest_sec || 90);
    });
  });

  const mainTotalCount = mainList.length;
  const isMainDone = mainTotalSets > 0 && mainCompletedSets === mainTotalSets;
  const isMainInProgress = mainCompletedSets > 0 && !isMainDone;
  const mainPct = mainTotalSets > 0 ? Math.round((mainCompletedSets / mainTotalSets) * 100) : 0;
  const mainEstMin = Math.max(15, Math.round(mainEstSec / 60));
  const mainDurationText = mainTotalSets > 0 ? `${Math.max(15, mainEstMin - 5)}–${mainEstMin + 5} min` : '20–30 min';

  const mainWorkout = {
    id: 'main',
    stepNumber: 2,
    title: 'MAIN WORKOUT',
    tabLabel: 'Main Workout',
    description: 'Build strength and skill with focused sets.',
    estimatedDuration: mainDurationText,
    estimatedDurationMin: mainEstMin,
    exercises: mainList,
    totalCount: mainTotalCount,
    completedCount: mainCompletedCount,
    totalSets: mainTotalSets,
    completedSets: mainCompletedSets,
    progressLabel: `${mainCompletedSets} / ${mainTotalSets} sets${isMainDone ? ' ✓' : ''}`,
    isCompleted: isMainDone,
    isInProgress: isMainInProgress,
    isPending: !isMainDone && !isMainInProgress,
    completionState: isMainDone ? 'completed' : (isMainInProgress ? 'in_progress' : 'ready'),
    progress: mainPct,
    wireframeKey: 'main'
  };

  // 3. Cool-Down Phase
  const cooldownList = getCooldownExercises(session);
  const cooldownCompletedCount = cooldownList.filter(c => c.completed).length;
  const cooldownTotalCount = cooldownList.length;
  const isCooldownDone = cooldownTotalCount > 0 && cooldownCompletedCount === cooldownTotalCount;
  const isCooldownSkipped = session.cooldown_status === 'skipped';
  const isCooldownInProgress = session.cooldown_status === 'in_progress' || (cooldownCompletedCount > 0 && !isCooldownDone);
  const cooldownPct = cooldownTotalCount > 0 ? Math.round((cooldownCompletedCount / cooldownTotalCount) * 100) : 0;

  let cooldownEstSec = 0;
  cooldownList.forEach(c => {
    cooldownEstSec += (c.duration_sec || (c.reps ? c.reps * 3 : 30)) + (c.rest_sec || 10);
  });
  const cooldownEstMin = Math.max(3, Math.round(cooldownEstSec / 60));
  const cooldownDurationText = cooldownTotalCount > 0 ? `${Math.max(3, cooldownEstMin - 1)}–${cooldownEstMin + 2} min` : '5–8 min';

  const coolDown = {
    id: 'cooldown',
    stepNumber: 3,
    title: 'COOL DOWN',
    tabLabel: 'Cool Down',
    description: 'Relax, recover and improve flexibility.',
    estimatedDuration: cooldownDurationText,
    estimatedDurationMin: cooldownEstMin,
    exercises: cooldownList,
    totalCount: cooldownTotalCount,
    completedCount: cooldownCompletedCount,
    totalSets: cooldownTotalCount,
    completedSets: cooldownCompletedCount,
    progressLabel: `${cooldownCompletedCount} / ${cooldownTotalCount} completed${isCooldownDone ? ' ✓' : ''}`,
    isCompleted: isCooldownDone,
    isSkipped: isCooldownSkipped,
    isInProgress: isCooldownInProgress,
    isPending: !isCooldownDone && !isCooldownInProgress && !isCooldownSkipped,
    completionState: isCooldownDone ? 'completed' : (isCooldownSkipped ? 'skipped' : (isCooldownInProgress ? 'in_progress' : 'pending')),
    progress: cooldownPct,
    wireframeKey: 'cooldown'
  };

  const overallTotalExercises = warmupTotalCount + mainTotalCount + cooldownTotalCount;
  const overallCompletedExercises = warmupCompletedCount + mainCompletedCount + cooldownCompletedCount;
  const overallTotalSets = warmupTotalCount + mainTotalSets + cooldownTotalCount;
  const overallCompletedSets = warmupCompletedCount + mainCompletedSets + cooldownCompletedCount;
  const overallProgressPct = overallTotalSets > 0 ? Math.round((overallCompletedSets / overallTotalSets) * 100) : 0;
  const isOverallCompleted = isWarmupDone && isMainDone && isCooldownDone;

  return {
    warmUp,
    mainWorkout,
    coolDown,
    phases: [warmUp, mainWorkout, coolDown],
    overall: {
      totalExercises: overallTotalExercises,
      completedExercises: overallCompletedExercises,
      totalSets: overallTotalSets,
      completedSets: overallCompletedSets,
      progressPct: overallProgressPct,
      isCompleted: isOverallCompleted
    }
  };
}

// ─── Left Sidebar: Workout Structure Stepper ─────────────────────────────────

function renderWorkoutStructureSidebar(session, activePhase) {
  const model = getWorkoutPhaseModel(session);
  if (!model) return '';

  const { phases, overall } = model;

  return `
    <aside class="runner-structure-sidebar">
      <div class="runner-structure-header">
        <span class="runner-structure-title">OVERALL PROGRESS</span>
        <span class="runner-structure-sets-counter mono">${overall.completedSets} / ${overall.totalSets} sets · ${overall.progressPct}%</span>
      </div>

      <div class="runner-timeline-container">
        ${phases.map((phase) => {
          const isActive = activePhase === phase.id;
          const isDone = phase.isCompleted;
          const badgeText = isDone ? renderIcon('check', 'cx-icon cx-icon-xs') : phase.stepNumber;

          return `
            <div class="runner-timeline-step-wrapper ${isActive ? 'is-active' : ''} ${isDone ? 'is-completed' : ''}">
              <div class="runner-timeline-step-badge">
                ${badgeText}
              </div>
              <div class="runner-timeline-card" onclick="setWorkoutPhase('${phase.id}')" title="Switch to ${phase.title} Phase">
                <div class="runner-timeline-card-top">
                  <span class="runner-timeline-card-title">${phase.title}</span>
                  <div class="runner-timeline-card-art">
                    ${renderPhaseWireframeSvg(phase.wireframeKey)}
                  </div>
                </div>
                <div class="runner-timeline-card-time">${phase.estimatedDuration}</div>
                <p class="runner-timeline-card-desc">${phase.description}</p>
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

  // 2. Exercise items list rendering
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
        const isDone = item.completed;
        const isHold = item.exercise_type === 'duration';
        const pt = session.phaseTimer || {};
        const isRunning = isCurrent && pt.isRunning;
        const targetVal = isHold ? (item.duration_sec || 30) : (item.reps || 10);
        const displayVal = isRunning ? (pt.remaining != null ? pt.remaining : targetVal) : targetVal;

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isDone ? 'is-completed' : ''}" id="warmup-card-${idx}">
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

              <button class="runner-ex-action-btn ${isRunning ? 'is-active-btn' : (isDone ? 'is-done-btn' : '')}" type="button" onclick="selectExerciseToExecute('warmup', ${idx})">
                ${isRunning ? (pt.isRunning ? 'Pause' : 'Resume') : (isDone ? '✓ Completed' : 'Start')}
              </button>

              <button class="runner-ex-checkbox-btn ${isDone ? 'is-checked' : ''}" type="button" onclick="toggleWarmupItemComplete(${idx})" title="${isDone ? 'Mark uncompleted' : 'Mark completed'}">
                ${isDone ? renderIcon('check', 'cx-icon cx-icon-xs') : ''}
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
        const isDone = item.completed;
        const isHold = item.exercise_type === 'duration';
        const pt = session.phaseTimer || {};
        const isRunning = isCurrent && pt.isRunning;
        const targetVal = isHold ? (item.duration_sec || 30) : (item.reps || 10);
        const displayVal = isRunning ? (pt.remaining != null ? pt.remaining : targetVal) : targetVal;

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isDone ? 'is-completed' : ''}" id="cooldown-card-${idx}">
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

              <button class="runner-ex-action-btn ${isRunning ? 'is-active-btn' : (isDone ? 'is-done-btn' : '')}" type="button" onclick="selectExerciseToExecute('cooldown', ${idx})">
                ${isRunning ? (pt.isRunning ? 'Pause' : 'Resume') : (isDone ? '✓ Completed' : 'Start')}
              </button>

              <button class="runner-ex-checkbox-btn ${isDone ? 'is-checked' : ''}" type="button" onclick="toggleCooldownItemComplete(${idx})" title="${isDone ? 'Mark uncompleted' : 'Mark completed'}">
                ${isDone ? renderIcon('check', 'cx-icon cx-icon-xs') : ''}
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
      let activeExIdx = _selectedWorkoutExIdx != null ? _selectedWorkoutExIdx : 0;
      if (activeExIdx < 0 || activeExIdx >= list.length) activeExIdx = 0;

      exercisesStackHtml = list.map((ex, exIdx) => {
        const isCurrent = exIdx === activeExIdx;
        const isDone = ex.sets && ex.sets.every(s => s.completed);
        const isHold = ex.exercise_type === 'duration';
        const doneCount = ex.sets.filter(s => s.completed).length;

        return `
          <div class="runner-exercise-item-card ${isCurrent ? 'is-selected' : ''} ${isDone ? 'is-completed' : ''}" id="main-card-${exIdx}">
            <div class="runner-runner-ex-card-left" onclick="selectExerciseToExecute('main', ${exIdx})" style="cursor:pointer;">
              <div class="runner-ex-thumb-box">
                ${renderExerciseThumbnailSvg(ex)}
              </div>
              <div class="runner-ex-text-group">
                <span class="runner-ex-name-label">${ex.exercise_name}</span>
                <span class="runner-ex-sub-label">${ex.sets.length} sets × ${ex.sets[0]?.target_val || 10}${isHold ? 's hold' : ' reps'} · ${ex.rest_sec || 90}s rest</span>
              </div>
            </div>

            <div class="runner-ex-card-right">
              <span class="runner-ex-duration-tag">
                <span class="mono">${doneCount}/${ex.sets.length} sets</span>
              </span>

              <button class="runner-ex-action-btn ${isCurrent ? 'is-active-btn' : ''}" type="button" onclick="selectExerciseToExecute('main', ${exIdx})">
                ${isCurrent ? 'Active' : (isDone ? 'Review' : 'Start')}
              </button>

              <button class="runner-ex-checkbox-btn ${isDone ? 'is-checked' : ''}" type="button" onclick="toggleMainExerciseComplete(${exIdx})" title="${isDone ? 'Mark uncompleted' : 'Mark all sets completed'}">
                ${isDone ? renderIcon('check', 'cx-icon cx-icon-xs') : ''}
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
                  const isThisHold = isHold && _workoutHoldState.exIdx === exIdx && _workoutHoldState.setIdx === sIdx;
                  const currentActual = s.actual_val !== null && s.actual_val !== undefined ? s.actual_val : s.target_val;

                  return `
                    <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.03); border:1px solid ${sCompleted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}; border-radius:10px; padding:10px 14px;">
                      <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <span class="mono" style="font-weight:700; font-size:13px; color:${sCompleted ? '#10b981' : '#a29bfe'};">SET ${s.set_num}</span>
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

                          <button class="runner-ex-checkbox-btn ${sCompleted ? 'is-checked' : ''}" style="width:26px; height:26px; min-width:26px;" onclick="toggleWorkoutSet(${exIdx}, ${sIdx})" title="Toggle set complete">
                            ${sCompleted ? renderIcon('check', 'cx-icon cx-icon-xs') : ''}
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

  // 3. Educational / Benefits card rendering
  let benefitTitle = 'Why Warm-Up?';
  let benefitDesc = 'Improves performance, prevents injury, and prepares your mind.';
  let benefitAvatarSvg = renderIcon('zap', 'cx-icon cx-icon-md');
  let benefitPills = [
    { label: 'Increase Mobility', icon: renderIcon('activity', 'cx-icon cx-icon-sm') },
    { label: 'Activate Muscles', icon: renderIcon('flame', 'cx-icon cx-icon-sm') },
    { label: 'Reduce Injury Risk', icon: renderIcon('target', 'cx-icon cx-icon-sm') }
  ];

  if (activePhase === 'main') {
    benefitTitle = 'Main Workout Focus';
    benefitDesc = 'Execute progressive overload with controlled tempo and maximum focus.';
    benefitAvatarSvg = renderIcon('flame', 'cx-icon cx-icon-md');
    benefitPills = [
      { label: 'Progressive Overload', icon: renderIcon('trendingUp', 'cx-icon cx-icon-sm') },
      { label: 'Clean Technique', icon: renderIcon('target', 'cx-icon cx-icon-sm') },
      { label: 'Tracked Rest Periods', icon: renderIcon('timer', 'cx-icon cx-icon-sm') }
    ];
  } else if (activePhase === 'cooldown') {
    benefitTitle = 'Why Cool Down?';
    benefitDesc = 'Promotes muscular recovery, restores resting heart rate, and enhances flexibility.';
    benefitAvatarSvg = renderIcon('sparkles', 'cx-icon cx-icon-md');
    benefitPills = [
      { label: 'Decompress Spine', icon: renderIcon('activity', 'cx-icon cx-icon-sm') },
      { label: 'Regulate Heart Rate', icon: renderIcon('zap', 'cx-icon cx-icon-sm') },
      { label: 'Faster Recovery', icon: renderIcon('refresh', 'cx-icon cx-icon-sm') }
    ];
  }

  return `
    <main class="runner-phase-workspace">
      <!-- Segmented Phase Tabs -->
      <div class="runner-segmented-tabs-bar" role="tablist" aria-label="Workout Phase Tabs">
        <button class="runner-segmented-tab-btn ${activePhase === 'warmup' ? 'is-active' : ''}" type="button" role="tab" onclick="setWorkoutPhase('warmup')">Warm-Up</button>
        <button class="runner-segmented-tab-btn ${activePhase === 'main' ? 'is-active' : ''}" type="button" role="tab" onclick="setWorkoutPhase('main')">Main Workout</button>
        <button class="runner-segmented-tab-btn ${activePhase === 'cooldown' ? 'is-active' : ''}" type="button" role="tab" onclick="setWorkoutPhase('cooldown')">Cool Down</button>
      </div>

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

// ─── Main Workout Screen Dispatcher ──────────────────────────────────────────

function renderActiveWorkoutView() {
  const session = getActiveSession();
  if (!session || (session.status !== 'in_progress' && session.status !== 'paused' && session.status !== 'ready')) {
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
}
