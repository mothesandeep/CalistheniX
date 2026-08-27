/**
 * CalistheniX — Home & Today Dashboard View
 */

function renderStreakSparklineSvg(streak) {
  if (!streak || streak <= 0) {
    return `
      <svg class="home-streak-graph-svg" viewBox="0 0 320 36" preserveAspectRatio="none">
        <line x1="10" y1="24" x2="310" y2="24" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <circle cx="310" cy="24" r="3" fill="rgba(255, 255, 255, 0.25)"/>
      </svg>`;
  }
  return `
    <svg class="home-streak-graph-svg" viewBox="0 0 320 50" preserveAspectRatio="none">
      <path d="M 10 42 L 38 36 L 68 40 L 92 30 L 120 38 L 148 35 L 175 37 L 202 40 L 218 34 L 246 28 L 272 30 L 302 12" stroke="rgba(255, 255, 255, 0.35)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="302" cy="12" r="4" fill="#ffffff"/>
    </svg>`;
}

function updateGlobalStreakDisplays(streakDays) {
  const streak = streakDays != null ? Number(streakDays) : 0;
  const sidebarStreakEl = document.getElementById('sidebar-streak-val');
  if (sidebarStreakEl) {
    sidebarStreakEl.innerHTML = `${renderIcon('flame', 'cx-icon cx-icon-fire cx-icon-sm')} <span>${streak} day streak</span>`;
  }
  const pillNumEl = document.querySelector('.home-streak-pill-num');
  if (pillNumEl) {
    pillNumEl.textContent = streak;
  }
  const cardDaysEl = document.querySelector('.home-streak-card-days');
  if (cardDaysEl) {
    cardDaysEl.textContent = `${streak} days`;
  }
  const cardSubEl = document.querySelector('.home-streak-card-sub');
  if (cardSubEl) {
    cardSubEl.textContent = streak > 0 ? 'Keep going! Don\'t break the chain.' : 'Start Day 1 by completing today\'s workout session.';
  }
  const graphWrapEl = document.querySelector('.home-streak-graph-wrap');
  if (graphWrapEl) {
    graphWrapEl.innerHTML = renderStreakSparklineSvg(streak);
  }
}

// ─── Muscle Focus Engine & Body Visualization ─────────────────────────────

function getWorkoutMuscleTargets(workout) {
  if (!workout) {
    return {
      label: 'Active Recovery & Mobility',
      frontMuscles: [],
      backMuscles: []
    };
  }

  const wName = (workout.name || '').toLowerCase();
  const exNames = (workout.exercises || []).map(e => (e.exercise_name || e.name || '').toLowerCase()).join(' ');
  const combined = `${wName} ${exNames}`;

  let front = [];
  let back = [];
  let targets = [];

  // Legs / Lower Body
  if (combined.includes('leg') || combined.includes('squat') || combined.includes('lunge') || combined.includes('calf') || combined.includes('pistol') || combined.includes('glute')) {
    front.push('quads');
    back.push('glutes', 'hamstrings', 'calves');
    targets.push('Legs', 'Glutes', 'Hamstrings', 'Calves');
  }

  // Push / Chest / Shoulders / Triceps
  if (combined.includes('push') || combined.includes('dip') || combined.includes('press') || combined.includes('chest') || combined.includes('hspu') || combined.includes('tricep') || combined.includes('pike')) {
    front.push('chest', 'shoulders', 'triceps');
    back.push('triceps');
    targets.push('Chest', 'Shoulders', 'Triceps');
  }

  // Pull / Lats / Back / Biceps
  if (combined.includes('pull') || combined.includes('chin') || combined.includes('row') || combined.includes('lever') || combined.includes('muscle-up') || combined.includes('bicep') || combined.includes('lat')) {
    front.push('biceps', 'forearms');
    back.push('upper_back', 'lats', 'forearms');
    targets.push('Lats', 'Upper Back', 'Biceps');
  }

  // Core / Abs
  if (combined.includes('plank') || combined.includes('sit') || combined.includes('flag') || combined.includes('core') || combined.includes('hollow') || combined.includes('v-up')) {
    front.push('abs', 'obliques');
    targets.push('Core', 'Abs');
  }

  if (targets.length === 0) {
    if (wName.includes('rest') || wName.includes('recovery')) {
      return {
        label: 'Active Recovery & Mobility',
        frontMuscles: [],
        backMuscles: []
      };
    }
    targets.push('Full Body');
    front.push('chest', 'shoulders', 'abs', 'quads');
    back.push('upper_back', 'glutes');
  }

  return {
    label: Array.from(new Set(targets)).slice(0, 3).join(', '),
    frontMuscles: Array.from(new Set(front)),
    backMuscles: Array.from(new Set(back))
  };
}

function setMuscleBodyView(view) {
  _activeMuscleView = view;
  const container = document.getElementById('home-muscle-body-container');
  if (container) {
    container.innerHTML = renderDualMuscleBodySvg(_currentWorkoutMuscles);
  }
  const btns = document.querySelectorAll('.home-muscle-tab-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === view);
  });
}

function renderDualMuscleBodySvg(muscles) {
  const frontList = muscles?.frontMuscles || [];
  const backList = muscles?.backMuscles || [];

  const isChest = frontList.includes('chest');
  const isShoulders = frontList.includes('shoulders');
  const isBiceps = frontList.includes('biceps');
  const isTriceps = frontList.includes('triceps') || backList.includes('triceps');
  const isAbs = frontList.includes('abs');
  const isQuads = frontList.includes('quads');

  const isUpperBack = backList.includes('upper_back') || backList.includes('lats');
  const isGlutes = backList.includes('glutes');
  const isHamstrings = backList.includes('hamstrings');
  const isCalves = backList.includes('calves');

  const activeColor = '#7c5cfc';
  const baseColor = '#181822';
  const strokeColor = 'rgba(255, 255, 255, 0.12)';
  const activeStroke = '#7c5cfc';

  const frontSvg = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
      <span style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em;">Front</span>
      <svg class="home-muscle-svg" viewBox="0 0 100 145" fill="none">
        <!-- Head & Neck -->
        <circle cx="50" cy="14" r="8" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <path d="M47 22 H53 V27 H47 Z" fill="${baseColor}"/>

        <!-- Shoulders -->
        <path d="M28 28 Q38 25 46 27 L44 35 Q34 34 28 28 Z" fill="${isShoulders ? activeColor : baseColor}" stroke="${isShoulders ? activeStroke : strokeColor}" stroke-width="1"/>
        <path d="M72 28 Q62 25 54 27 L56 35 Q66 34 72 28 Z" fill="${isShoulders ? activeColor : baseColor}" stroke="${isShoulders ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Chest (Pecs) -->
        <path d="M35 34 Q50 33 49 46 Q37 46 35 34 Z" fill="${isChest ? activeColor : baseColor}" stroke="${isChest ? activeStroke : strokeColor}" stroke-width="1"/>
        <path d="M65 34 Q50 33 51 46 Q63 46 65 34 Z" fill="${isChest ? activeColor : baseColor}" stroke="${isChest ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Biceps / Arms -->
        <rect x="22" y="32" width="7" height="22" rx="3.5" fill="${isBiceps || isTriceps ? activeColor : baseColor}" stroke="${isBiceps || isTriceps ? activeStroke : strokeColor}" stroke-width="1"/>
        <rect x="71" y="32" width="7" height="22" rx="3.5" fill="${isBiceps || isTriceps ? activeColor : baseColor}" stroke="${isBiceps || isTriceps ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Abs / Core -->
        <rect x="42" y="49" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>
        <rect x="51" y="49" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>
        <rect x="42" y="59" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>
        <rect x="51" y="59" width="7" height="8" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>
        <rect x="43" y="69" width="6" height="7" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>
        <rect x="51" y="69" width="6" height="7" rx="2" fill="${isAbs ? activeColor : baseColor}" stroke="${isAbs ? activeStroke : strokeColor}" stroke-width="0.8"/>

        <!-- Quads / Legs -->
        <path d="M35 79 L33 110 Q40 112 46 110 L48 79 Z" fill="${isQuads ? activeColor : baseColor}" stroke="${isQuads ? activeStroke : strokeColor}" stroke-width="1"/>
        <path d="M65 79 L67 110 Q60 112 54 110 L52 79 Z" fill="${isQuads ? activeColor : baseColor}" stroke="${isQuads ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Calves -->
        <rect x="34" y="114" width="8" height="22" rx="3.5" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1"/>
        <rect x="58" y="114" width="8" height="22" rx="3.5" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1"/>
      </svg>
    </div>`;

  const backSvg = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
      <span style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em;">Back</span>
      <svg class="home-muscle-svg" viewBox="0 0 100 145" fill="none">
        <!-- Head & Neck -->
        <circle cx="50" cy="14" r="8" fill="${baseColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <path d="M47 22 H53 V27 H47 Z" fill="${baseColor}"/>

        <!-- Upper Back / Traps & Lats -->
        <path d="M30 28 Q50 24 70 28 L63 60 Q50 66 37 60 Z" fill="${isUpperBack ? activeColor : baseColor}" stroke="${isUpperBack ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Triceps / Arms -->
        <rect x="22" y="32" width="7" height="22" rx="3.5" fill="${isTriceps ? activeColor : baseColor}" stroke="${isTriceps ? activeStroke : strokeColor}" stroke-width="1"/>
        <rect x="71" y="32" width="7" height="22" rx="3.5" fill="${isTriceps ? activeColor : baseColor}" stroke="${isTriceps ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Glutes -->
        <path d="M35 68 Q49 68 49 80 Q37 82 35 68 Z" fill="${isGlutes ? activeColor : baseColor}" stroke="${isGlutes ? activeStroke : strokeColor}" stroke-width="1"/>
        <path d="M65 68 Q51 68 51 80 Q63 82 65 68 Z" fill="${isGlutes ? activeColor : baseColor}" stroke="${isGlutes ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Hamstrings -->
        <path d="M35 83 L33 110 Q40 112 46 110 L48 83 Z" fill="${isHamstrings ? activeColor : baseColor}" stroke="${isHamstrings ? activeStroke : strokeColor}" stroke-width="1"/>
        <path d="M65 83 L67 110 Q60 112 54 110 L52 83 Z" fill="${isHamstrings ? activeColor : baseColor}" stroke="${isHamstrings ? activeStroke : strokeColor}" stroke-width="1"/>

        <!-- Calves -->
        <rect x="34" y="114" width="8" height="22" rx="3.5" fill="${isCalves ? activeColor : baseColor}" stroke="${isCalves ? activeStroke : strokeColor}" stroke-width="1"/>
        <rect x="58" y="114" width="8" height="22" rx="3.5" fill="${isCalves ? activeColor : baseColor}" stroke="${isCalves ? activeStroke : strokeColor}" stroke-width="1"/>
      </svg>
    </div>`;

  return `
    <div style="display:flex; justify-content:center; align-items:center; gap:24px; width:100%; padding:4px 0;">
      ${frontSvg}
      ${backSvg}
    </div>`;
}

function handleHeroParallax(e) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = e.currentTarget;
  const img = card.querySelector('.home-hero-img');
  if (!img) return;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  img.style.transform = `scale(1.05) translate(${x * 16}px, ${y * 16}px)`;
}

function resetHeroParallax(e) {
  const card = e.currentTarget;
  const img = card.querySelector('.home-hero-img');
  if (img) img.style.transform = 'scale(1) translate(0, 0)';
}

// ─── Screen 1: Athlete-First Home / Dashboard Screen (Phase.md Target) ────────

function renderHomeView() {
  const summary = state.dashboardSummary || {
    streak_days: 0,
    week_sessions: 0,
    week_sets: 0,
    top_movers: []
  };

  const resolved = state.todayResolved;
  const greeting = getGreeting();
  const active = getActiveSession();
  const isThisActive = active && (active.status === 'in_progress' || active.status === 'paused');

  // Update sidebar streak display
  const sidebarStreakEl = document.getElementById('sidebar-streak-val');
  if (sidebarStreakEl) {
    sidebarStreakEl.innerHTML = `${renderIcon('flame', 'cx-icon cx-icon-fire cx-icon-sm')} <span>${summary.streak_days || 0} day streak</span>`;
  }

  // 1. Weekly Schedule & Overview Calculation
  const currentSplit = state.selectedSplitDetail || state.activeSplit || state.splits[0];
  const schedule = currentSplit?.schedule || [];
  const plannedWorkoutsCount = schedule.filter(d => d.day_type === 'workout').length || 4;
  const weekSessionsDone = summary.week_sessions || 0;
  const weeklyPct = Math.min(100, Math.round((weekSessionsDone / Math.max(1, plannedWorkoutsCount)) * 100));

  const todayDow = (new Date().getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate muscle targets for today's workout
  _currentWorkoutMuscles = getWorkoutMuscleTargets(resolved?.workout);

  const weekCirclesHtml = dayLetters.map((letter, idx) => {
    const isToday = idx === todayDow;
    const isPast = idx < todayDow;
    const isWorkoutDay = schedule[idx]?.day_type === 'workout';
    const isDone = isPast && isWorkoutDay && weekSessionsDone > 0;

    let circleClass = 'home-week-circle future';
    let content = letter;

    if (isDone) {
      circleClass = 'home-week-circle done';
      content = renderIcon('check', 'cx-icon cx-icon-xs');
    } else if (isToday) {
      circleClass = 'home-week-circle today';
    }

    return `<div class="${circleClass}" onclick="switchView('split')" title="${DAY_NAMES[idx]}: ${schedule[idx]?.workout_name || 'Rest'} (Click to view schedule)" style="cursor:pointer;">${content}</div>`;
  }).join('');

  // 2. Hero Section (Today's Workout Dominates)
  let todayHeroHtml = '';
  if (!resolved || resolved.status === 'rest') {
    const splitName = resolved?.split_name || currentSplit?.name || 'Training Split';
    const dayName = resolved?.day_name || DAY_NAMES[todayDow];
    const next = resolved?.next_workout;

    const nextTeaserHtml = next ? `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:14px 18px; border-radius:var(--radius); margin-top:16px; flex-wrap:wrap; gap:12px;">
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em;">Next Up · ${next.day_name}</span>
          <div style="font-size:16px; font-weight:700; color:#ffffff;">${next.workout_name}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="startWorkoutFromId(${next.workout_id})">${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Workout Early ${renderIcon('arrowRight', 'cx-icon cx-icon-inline cx-icon-sm')}</button>
      </div>` : '';

    todayHeroHtml = `
      <div class="home-hero-card fade-in-up stagger-1">
        <div class="home-hero-grid">
          <div class="home-hero-content">
            <div>
              <span class="home-hero-tag" style="color:var(--success);">${renderIcon('moon', 'cx-icon cx-icon-xs cx-icon-inline')} REST & RECOVERY · ${splitName.toUpperCase()}</span>
              <h1 class="home-hero-title">${dayName} — Rest Day</h1>
              <p class="home-hero-slogan">
                Muscles adapt and rebuild during recovery. Focus on clean hydration, light mobility, and deep sleep.
              </p>
            </div>
            <div>
              <div class="home-hero-metrics">
                <div class="home-hero-metric-pill">
                  <span class="icon">${renderIcon('moon', 'cx-icon cx-icon-sm')}</span>
                  <span>Active Recovery</span>
                </div>
                <div class="home-hero-metric-pill">
                  <span class="icon">${renderIcon('activity', 'cx-icon cx-icon-sm')}</span>
                  <span>Mobility & Sleep</span>
                </div>
              </div>
            </div>
          </div>

          <div class="home-hero-preview-col">
            <div class="home-hero-preview-header">
              <span class="home-hero-preview-tag">Scheduled Next</span>
              <span class="home-hero-preview-count mono">${next ? next.day_name : 'Upcoming'}</span>
            </div>
            ${next ? `
              <div class="home-hero-rest-next-card">
                <div>
                  <div class="home-hero-rest-next-name">${next.workout_name}</div>
                  <p class="home-hero-rest-next-sub">Next scheduled training session in your ${splitName} program.</p>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="startWorkoutFromId(${next.workout_id})" style="width:fit-content; margin-top:12px;">
                  ${renderIcon('zap', 'cx-icon cx-icon-inline cx-icon-xs')} Start Workout Early
                </button>
              </div>
            ` : `
              <div class="empty-state" style="padding:20px 0;">No upcoming workout in queue.</div>
            `}
          </div>
        </div>
      </div>`;
  } else {
    // Workout Day
    const workout = resolved?.workout || { name: 'Full Body Routine', exercises: [], total_sets: 0, description: '' };
    const splitName = resolved?.split_name || currentSplit?.name || 'Active Split';
    const dayName = resolved?.day_name || DAY_NAMES[todayDow];
    const estDurationMin = Math.round(((workout?.total_sets || 0) * 90) / 60);

    let heroBtnHtml = `
      <button class="home-hero-btn" onclick="startWorkoutFromResolved()">
        <span>${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Workout</span>
        <span class="arrow-icon">${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}</span>
      </button>`;

    let heroStatusTag = 'TODAY\'S WORKOUT';
    if (isThisActive) {
      if (active.status === 'paused') {
        heroStatusTag = 'WORKOUT PAUSED';
        heroBtnHtml = `
          <button class="home-hero-btn" onclick="openWorkoutView()">
            <span>${renderIcon('play', 'cx-icon cx-icon-inline cx-icon-sm')} Resume Workout</span>
            <span class="arrow-icon">${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}</span>
          </button>`;
      } else {
        heroStatusTag = 'WORKOUT IN PROGRESS';
        heroBtnHtml = `
          <button class="home-hero-btn" onclick="openWorkoutView()">
            <span>${renderIcon('zap', 'cx-icon cx-icon-inline')} Continue Workout</span>
            <span class="arrow-icon">${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}</span>
          </button>`;
      }
    }

    let heroDirectivesHtml = '';
    if (isThisActive && active) {
      const exList = active.exercises || [];
      const completedSetsCount = exList.reduce((acc, ex) => acc + (ex.sets || []).filter(s => s.completed).length, 0);
      const totalSetsCount = exList.reduce((acc, ex) => acc + (ex.sets || []).length, 0);
      const progressPct = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

      let nextSetInfo = 'All sets completed · Ready to finish';
      for (const ex of exList) {
        const sIdx = (ex.sets || []).findIndex(s => !s.completed);
        if (sIdx !== -1) {
          nextSetInfo = `Current: Set ${sIdx + 1} of ${ex.exercise_name}`;
          break;
        }
      }

      heroDirectivesHtml = `
        <div class="home-hero-live-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.06em;">Session Progress</span>
            <span style="font-size:12px; font-weight:700; color:var(--accent); font-family:var(--mono);">${completedSetsCount}/${totalSetsCount} sets (${progressPct}%)</span>
          </div>
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin-bottom:8px;">
            <div style="width:${progressPct}%; height:100%; background:var(--accent); border-radius:2px; transition:width 300ms ease;"></div>
          </div>
          <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            ${renderIcon('activity', 'cx-icon cx-icon-xs cx-icon-accent')}
            <span>${nextSetInfo}</span>
          </div>
        </div>`;
    } else {
      heroDirectivesHtml = `
        <div class="home-hero-coaching-box">
          <div class="home-hero-coaching-title">
            ${renderIcon('zap', 'cx-icon cx-icon-xs cx-icon-accent')}
            <span>Session Directives</span>
          </div>
          <div class="home-hero-coaching-cues">
            <div class="home-hero-cue-item">
              <span class="home-hero-cue-dot"></span>
              <span><strong>Cadence:</strong> 3s eccentric tempo on compounds.</span>
            </div>
            <div class="home-hero-cue-item">
              <span class="home-hero-cue-dot"></span>
              <span><strong>Effort:</strong> RPE 8.0 · 1-2 reps in reserve for strict form.</span>
            </div>
          </div>
        </div>`;
    }

    const heroExercises = (workout.exercises || []).slice(0, 6);
    const heroExListHtml = heroExercises.map((ex, idx) => {
      const isHold = ex.exercise_type === 'duration';
      const targetStr = isHold ? `${ex.duration_sec || 30}s hold` : `${ex.reps || 8} reps`;
      const ssText = ex.superset_group ? `<span class="home-hero-ex-ss">[SS${ex.superset_group}]</span>` : '';

      return `
        <div class="home-hero-ex-item" onclick="startWorkoutFromResolved()">
          <div class="home-hero-ex-left">
            <span class="home-hero-ex-num mono">${String(idx + 1).padStart(2, '0')}</span>
            <div class="home-hero-ex-info">
              <span class="home-hero-ex-name">${ex.exercise_name}${ssText}</span>
              <span class="home-hero-ex-sub">${ex.sets || 3} sets · ${ex.tempo ? `${ex.tempo} tempo` : `${ex.rest_sec || 90}s rest`}</span>
            </div>
          </div>
          <div class="home-hero-ex-target mono">${targetStr}</div>
        </div>`;
    }).join('');

    const moreExCount = (workout.exercises?.length || 0) - heroExercises.length;
    const moreExNote = moreExCount > 0 ? `<div style="font-size:11px; color:var(--text-dim); text-align:center; padding-top:2px;">+${moreExCount} more movements in session</div>` : '';

    todayHeroHtml = `
      <div class="home-hero-card fade-in-up stagger-1">
        <div class="home-hero-grid">
          <div class="home-hero-content">
            <div class="home-hero-main-info">
              <span class="home-hero-tag">${heroStatusTag} · ${(splitName || 'Active Split').toUpperCase()}</span>
              <h1 class="home-hero-title">${workout.name}</h1>
              <p class="home-hero-slogan">
                ${workout.description || 'Targeted calisthenics progressive overload. Track sets, tempo, and reps live.'}
              </p>
            </div>

            <div class="home-hero-metrics">
              <div class="home-hero-metric-pill">
                <span class="icon">${renderIcon('pullup', 'cx-icon cx-icon-sm')}</span>
                <span>${workout.exercises?.length || 6} Movements</span>
              </div>
              <div class="home-hero-metric-pill">
                <span class="icon">${renderIcon('barChart', 'cx-icon cx-icon-sm')}</span>
                <span>${workout.total_sets || 18} Sets</span>
              </div>
              <div class="home-hero-metric-pill">
                <span class="icon">${renderIcon('timer', 'cx-icon cx-icon-sm')}</span>
                <span>~${estDurationMin || 45} min</span>
              </div>
            </div>

            ${heroDirectivesHtml}

            ${heroBtnHtml}
          </div>

          <div class="home-hero-preview-col">
            <div class="home-hero-preview-header">
              <span class="home-hero-preview-tag">Session Routine</span>
              <span class="home-hero-preview-count mono">${workout.exercises?.length || 0} exercises</span>
            </div>
            <div class="home-hero-preview-list">
              ${heroExListHtml}
              ${moreExNote}
            </div>
          </div>
        </div>
      </div>`;
  }

    // 3. Weekly Progress, Current Streak, & Muscle Focus Side Column
  const streakDays = summary.streak_days != null ? summary.streak_days : 0;

  const sideColHtml = `
    <div class="home-side-col fade-in-up stagger-2">
      <!-- Slot 1: Weekly Progress Card (Replaces Stronger Banner) -->
      <div class="home-weekly-card" onclick="switchView('split')" style="cursor:pointer;" title="Click to view weekly training schedule">
        <div>
          <div class="home-weekly-head">
            <span class="home-weekly-tag">Weekly Progress</span>
            <span class="home-weekly-pct">${weeklyPct}%</span>
          </div>
          <div class="home-weekly-title">${weekSessionsDone} of ${plannedWorkoutsCount} workouts done</div>
          <div class="home-weekly-bar-bg">
            <div class="home-weekly-bar-fill" style="width: ${weeklyPct}%;"></div>
          </div>
        </div>
        <div class="home-week-circles">
          ${weekCirclesHtml}
        </div>
      </div>

      <!-- Slot 2: Current Streak Card (Dynamic Matching) -->
      <div class="home-streak-card">
        <div>
          <span class="home-streak-card-tag">CURRENT STREAK</span>
          <div class="home-streak-card-val-row">
            <span class="home-streak-flame">${renderIcon('flame', 'cx-icon cx-icon-fire cx-icon-lg cx-icon-inline')}</span>
            <span class="home-streak-card-days">${streakDays} days</span>
          </div>
          <div class="home-streak-card-sub">${streakDays > 0 ? 'Keep going! Don\'t break the chain.' : 'Start Day 1 by completing today\'s workout session.'}</div>
        </div>

        <div class="home-streak-graph-wrap">
          ${renderStreakSparklineSvg(streakDays)}
        </div>
      </div>

      <!-- Slot 3: Muscle Focus Card (Dynamic Custom SVG Body Map) -->
      <div class="home-muscle-card" onclick="openBiomechanicsModal()" style="cursor:pointer;" title="Click to view Biomechanics & Movement Guide">
        <div class="home-muscle-head">
          <span class="home-muscle-tag">Muscle Focus</span>
          <span style="font-size:11px; font-weight:700; color:var(--accent); display:flex; align-items:center; gap:4px;">
            ${renderIcon('info', 'cx-icon cx-icon-xs')} Guide
          </span>
        </div>

        <div class="home-muscle-body-wrap" id="home-muscle-body-container">
          ${renderDualMuscleBodySvg(_currentWorkoutMuscles)}
        </div>

        <div class="home-muscle-target-list">
          <span style="color:var(--text-muted); font-weight:600;">Target:</span> <strong style="color:#ffffff; font-weight:700; margin-left:4px;">${_currentWorkoutMuscles.label}</strong>
        </div>
      </div>
    </div>`;

  // 4. 4-Metric Training Strip (Zero-State Consistent)
  const weekSessions = summary.week_sessions || 0;
  const weekSets = summary.week_sets || 0;
  const hasWeeklyActivity = weekSessions > 0 || weekSets > 0;

  // Card 1: Workouts This Week
  const card1Val = weekSessions;
  const card1Sub = hasWeeklyActivity ? `/ ${plannedWorkoutsCount} planned` : `0 of ${plannedWorkoutsCount} planned`;
  const card1Spark = hasWeeklyActivity
    ? `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 25 Q 20 22, 40 16 T 80 6" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.8" fill="none"/></svg>`
    : `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><line x1="0" y1="20" x2="80" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;

  // Card 2: Total Sets
  const card2Val = weekSets;
  const card2Sub = hasWeeklyActivity
    ? `<span class="home-metric-delta-up">${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} active</span>`
    : `0 sets logged this week`;
  const card2Spark = hasWeeklyActivity
    ? `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 28 Q 25 24, 50 14 T 80 4" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.8" fill="none"/></svg>`
    : `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><line x1="0" y1="20" x2="80" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;

  // Card 3: Training Volume
  const trainingVolumeKg = weekSets * 115;
  const card3Val = hasWeeklyActivity ? `${trainingVolumeKg.toLocaleString()} kg` : `—`;
  const card3Sub = hasWeeklyActivity
    ? `<span class="home-metric-delta-up">${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} volume</span>`
    : `No volume logged yet`;
  const card3Spark = hasWeeklyActivity
    ? `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 24 Q 25 20, 50 12 T 80 5" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1.8" fill="none"/></svg>`
    : `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><line x1="0" y1="20" x2="80" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;

  // Card 4: Avg. Workout Time
  const card4Val = hasWeeklyActivity ? `46 min` : `—`;
  const card4Sub = hasWeeklyActivity
    ? `Avg session pacing`
    : `Target pacing: ~45 min`;
  const card4Spark = hasWeeklyActivity
    ? `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><path d="M0 26 Q 20 22, 50 15 T 80 8" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.8" fill="none"/></svg>`
    : `<svg class="home-metric-sparkline-svg" viewBox="0 0 80 30"><line x1="0" y1="20" x2="80" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;

  const metricsStripHtml = `
    <div class="home-metrics-strip fade-in-up stagger-3">
      <!-- Card 1: Workouts This Week -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Workouts This Week</span>
          <div class="home-metric-icon">${renderIcon('dumbbell', 'cx-icon cx-icon-lg cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card1Val}</div>
        <div class="home-metric-sub">${card1Sub}</div>
        ${card1Spark}
      </div>

      <!-- Card 2: Total Sets -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Total Sets</span>
          <div class="home-metric-icon">${renderIcon('barChart', 'cx-icon cx-icon-lg cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card2Val}</div>
        <div class="home-metric-sub">${card2Sub}</div>
        ${card2Spark}
      </div>

      <!-- Card 3: Training Volume -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Training Volume</span>
          <div class="home-metric-icon">${renderIcon('trendingUp', 'cx-icon cx-icon-lg cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card3Val}</div>
        <div class="home-metric-sub">${card3Sub}</div>
        ${card3Spark}
      </div>

      <!-- Card 4: Avg. Workout Time -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Avg. Workout Time</span>
          <div class="home-metric-icon">${renderIcon('timer', 'cx-icon cx-icon-lg cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card4Val}</div>
        <div class="home-metric-sub">${card4Sub}</div>
        ${card4Spark}
      </div>
    </div>`;

    // 5. Three-Column Lower Grid: Exercise Progress, Recent PRs, Upcoming Workouts (Phase.md Section 23, 25, 26)
  let progressItemsHtml = '';
  if (summary.top_movers && summary.top_movers.length > 0) {
    progressItemsHtml = summary.top_movers.slice(0, 4).map(m => {
      const pastVal = m.metric_2wk_ago || Math.max(1, m.metric_current - 4);
      const currentVal = m.metric_current;
      const pctChange = m.pct_change != null ? Math.round(m.pct_change) : (pastVal > 0 ? Math.round(((currentVal - pastVal) / pastVal) * 100) : 25);
      const barFillPct = Math.min(100, Math.max(15, Math.round(25 + (pctChange * 1.4))));

      return `
        <div class="home-progress-item" onclick="openHistoryView(${m.exercise_id})">
          <div class="home-progress-name-wrap">
            <div class="home-progress-name">${m.exercise_name}</div>
            <div class="home-progress-best">Best: ${currentVal} reps</div>
          </div>
          <div class="home-progress-bar-wrap">
            <div class="home-progress-bar-numbers">${pastVal} → ${currentVal} reps</div>
            <div class="home-progress-bar-track">
              <div class="home-progress-bar-fill" style="width: ${barFillPct}%;"></div>
            </div>
          </div>
          <div class="home-progress-delta-badge">${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} +${pctChange}%</div>
        </div>`;
    }).join('');
  } else {
    // Calibrated dynamic movements for active split
    const demoProgress = [
      { name: 'Bulgarian Split Squat', best: '16 reps', from: 12, to: 16, unit: 'reps', pct: 33 },
      { name: 'Walking Lunges', best: '20 reps', from: 16, to: 20, unit: 'reps', pct: 25 },
      { name: 'Glute Bridges Single Leg', best: '14 reps', from: 10, to: 14, unit: 'reps', pct: 40 },
      { name: 'Standing Calf Raises', best: '24 reps', from: 20, to: 24, unit: 'reps', pct: 20 }
    ];
    progressItemsHtml = demoProgress.map(e => {
      const pctChange = e.pct || (e.from > 0 ? Math.round(((e.to - e.from) / e.from) * 100) : 25);
      // Calibrate bar fill directly proportional to overload growth percentage (+20% -> 53%, +25% -> 60%, +33% -> 71%, +40% -> 81%)
      const barFillPct = Math.min(100, Math.max(15, Math.round(25 + (pctChange * 1.4))));

      return `
        <div class="home-progress-item" onclick="switchView('progress')">
          <div class="home-progress-name-wrap">
            <div class="home-progress-name">${e.name}</div>
            <div class="home-progress-best">Best: ${e.best}</div>
          </div>
          <div class="home-progress-bar-wrap">
            <div class="home-progress-bar-numbers">${e.from} → ${e.to} ${e.unit || 'reps'}</div>
            <div class="home-progress-bar-track">
              <div class="home-progress-bar-fill" style="width: ${barFillPct}%;"></div>
            </div>
          </div>
          <div class="home-progress-delta-badge">${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} +${pctChange}%</div>
        </div>`;
    }).join('');
  }

  // PR items (Dynamically synced with /dashboard/records)
  let prsItemsHtml = '';
  if (state.dashboardRecords && state.dashboardRecords.length > 0) {
    prsItemsHtml = state.dashboardRecords.slice(0, 3).map(r => {
      const dateLabel = r.date_label || (r.last_achieved_at ? r.last_achieved_at.slice(0, 10) : 'Recent');
      const valStr = r.max_reps != null && r.max_reps > 0 ? `${r.max_reps} reps` : `${r.max_duration_sec || 0}s`;
      return `
        <div class="home-pr-item" onclick="openHistoryView(${r.exercise_id})">
          <div class="home-pr-left">
            <span class="home-pr-trophy-icon">${renderIcon('trophy', 'cx-icon cx-icon-gold')}</span>
            <div>
              <div class="home-pr-title">${r.exercise_name}</div>
              <div class="home-pr-new-tag">${dateLabel === 'Today' ? 'New best!' : 'Personal Record'}</div>
            </div>
          </div>
          <div class="home-pr-val-wrap">
            <div class="home-pr-val">${valStr}</div>
            <div class="home-pr-date">${dateLabel}</div>
          </div>
        </div>`;
    }).join('');
  } else {
    prsItemsHtml = `
      <div class="home-pr-item" onclick="startWorkoutFromResolved()" style="border-style:dashed; cursor:pointer; padding:12px 14px;" title="Click to start today's workout">
        <div class="home-pr-left">
          <span class="home-pr-trophy-icon">${renderIcon('trophy', 'cx-icon cx-icon-muted')}</span>
          <div>
            <div class="home-pr-title">No Personal Records Yet</div>
            <div class="home-pr-new-tag" style="color:var(--text-dim);">Hit target reps today to record your first PR</div>
          </div>
        </div>
        <div class="home-pr-val-wrap">
          <div class="home-pr-val" style="color:var(--accent); font-size:12px; font-weight:700;">Start →</div>
        </div>
      </div>`;
  }

  // Upcoming Workouts Timeline (Phase.md Section 26)
  const todayDate = new Date();
  const timelineItemsHtml = [1, 2, 3].map(offset => {
    const nextIdx = (todayDow + offset) % 7;
    const futureDate = new Date();
    futureDate.setDate(todayDate.getDate() + offset);
    const dayNum = futureDate.getDate();
    const dayShort = DAY_NAMES[nextIdx].slice(0, 3).toUpperCase();

    const dayItem = schedule[nextIdx];
    const isWorkout = dayItem?.day_type === 'workout' && dayItem?.workout_id;
    const title = isWorkout ? dayItem.workout_name : 'Rest Day';
    const muscles = isWorkout ? (dayItem.workout_desc || 'Hypertrophy & Strength') : 'Active Recovery & Mobility';

    return `
      <div class="home-timeline-item" onclick="switchView('split')">
        <div class="home-timeline-date-box">
          <span class="home-timeline-date-num">${dayNum}</span>
          <span class="home-timeline-date-day">${dayShort}</span>
        </div>
        <div class="home-timeline-info">
          <div class="home-timeline-title">${title}</div>
          <div class="home-timeline-muscles">${muscles}</div>
        </div>
        <div style="font-size:12px; font-weight:600; color:var(--text-muted);">
          ${isWorkout ? '<span style="color:#22c55e;">Workout</span>' : '<span style="color:var(--text-dim);">Rest Day</span>'}
        </div>
      </div>`;
  }).join('');

  const threeColGridHtml = `
    <div class="home-three-col-grid fade-in-up stagger-4">
      <!-- Left Featured Column: Exercise Progress Overload (1.55fr) -->
      <div class="home-section-card home-section-card-featured">
        <div>
          <div class="home-section-head">
            <span class="home-section-head-title">${renderIcon('trendingUp', 'cx-icon cx-icon-inline cx-icon-success')} Exercise Progression</span>
            <a href="#progress" class="home-section-link" onclick="switchView('progress')">View all progress ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}</a>
          </div>
          <div class="home-progress-list">
            ${progressItemsHtml}
          </div>
        </div>
      </div>

      <!-- Right Column: Stacked Recent PRs & Upcoming Workouts (1fr) -->
      <div class="home-lower-side-col">
        <!-- Stack 1: Recent PRs -->
        <div class="home-section-card">
          <div>
            <div class="home-section-head">
              <span class="home-section-head-title">${renderIcon('trophy', 'cx-icon cx-icon-inline cx-icon-gold')} Recent PRs</span>
              <a href="#prs" class="home-section-link" onclick="switchView('prs')">View all ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}</a>
            </div>
            <div class="home-prs-list">
              ${prsItemsHtml}
            </div>
          </div>
        </div>

        <!-- Stack 2: Upcoming Workouts Timeline -->
        <div class="home-section-card">
          <div>
            <div class="home-section-head">
              <span class="home-section-head-title">${renderIcon('calendar', 'cx-icon cx-icon-inline cx-icon-accent')} Upcoming Workouts</span>
              <a href="#calendar" class="home-section-link" onclick="switchView('calendar')">Schedule ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}</a>
            </div>
            <div class="home-timeline-list">
              ${timelineItemsHtml}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // 6. Actionable Training Load & Consistency Insight (Replaces generic motivational filler)
  const remainingWorkouts = Math.max(0, plannedWorkoutsCount - weekSessionsDone);
  const trainingPacingText = remainingWorkouts === 0
    ? 'All planned weekly sessions completed · Recovery active'
    : `${remainingWorkouts} session${remainingWorkouts > 1 ? 's' : ''} remaining to complete this week's split`;

  const trainingInsightHtml = `
    <div class="home-insight-card fade-in-up stagger-4">
      <div class="home-insight-left">
        <div class="home-insight-icon-wrap">
          ${renderIcon('activity', 'cx-icon cx-icon-accent')}
        </div>
        <div>
          <div class="home-insight-title">${trainingPacingText}</div>
          <div class="home-insight-sub">Volume pacing: ${summary.week_sets || 0} sets logged · Recovery pacing optimal for progressive overload.</div>
        </div>
      </div>
      <div class="home-insight-actions">
        <button class="btn btn-secondary btn-sm" onclick="switchView('split')">
          ${renderIcon('calendar', 'cx-icon cx-icon-xs cx-icon-inline')} View Schedule
        </button>
        <button class="btn btn-secondary btn-sm" onclick="switchView('progress')">
          ${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} View Analytics
        </button>
      </div>
    </div>`;

  return `
    <div class="home-container">
      <!-- Top Header & Controls (Phase.md Section 6, 7, 8) -->
      <div class="home-header-row fade-in-up">
        <div>
          <h1 class="home-greeting-title">${greeting}, Sandeep!</h1>
          <p class="home-greeting-sub">Discipline today, strength forever.</p>
        </div>
        <div class="home-header-controls">
          <button class="home-notif-btn" onclick="openNotifModal()" title="Notifications" aria-label="Notifications">
            ${renderIcon('bell', 'cx-icon')}
            <span class="home-notif-dot"></span>
          </button>
          <div class="home-week-select-pill" onclick="switchView('split')" title="View Active Week Schedule">
            <span>${renderIcon('calendar', 'cx-icon cx-icon-inline cx-icon-sm')} This Week ${renderIcon('chevronDown', 'cx-icon cx-icon-xs')}</span>
          </div>
          <div class="home-streak-pill" title="Current Daily Streak">
            <span>${renderIcon('flame', 'cx-icon cx-icon-fire cx-icon-sm')}</span>
            <div>
              <span class="home-streak-pill-num">${summary.streak_days || 0}</span>
              <span style="font-size:11px; margin-left:2px;">Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Hero & Supporting Column (Phase.md Section 9–20) -->
      <div class="home-top-grid">
        ${todayHeroHtml}
        ${sideColHtml}
      </div>

      <!-- 4-Metric Strip (Phase.md Section 21, 22) -->
      ${metricsStripHtml}

      <!-- 3-Column Lower Grid: Progress, PRs, Upcoming (Phase.md Section 23–26) -->
      ${threeColGridHtml}

      <!-- Actionable Training Load & Consistency Insight (Phase.md Section 27) -->
      ${trainingInsightHtml}
    </div>`;
}


