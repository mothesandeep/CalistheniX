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

function renderBodyWeightSparklineSvg(history, targetKg = 77) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return '';
  }

  const width = 360;
  const height = 135;
  const padLeft = 38;
  const padRight = 18;
  const padTop = 14;
  const padBottom = 24;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const weights = history.map(h => Number(h.weight));
  const dataMin = Math.min(...weights, targetKg);
  const dataMax = Math.max(...weights, targetKg);
  const minY = Math.min(76.5, Math.floor(dataMin - 0.5));
  const maxY = Math.max(83.5, Math.ceil(dataMax + 0.5));
  const kgRange = Math.max(1, maxY - minY);

  const coords = history.map((item, idx) => {
    const x = padLeft + (history.length === 1 ? plotWidth / 2 : (idx / (history.length - 1)) * plotWidth);
    const norm = (Number(item.weight) - minY) / kgRange;
    const y = padTop + (1 - norm) * plotHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...item };
  });

  // Store for global pointer / touch / drag handlers
  if (typeof window !== 'undefined') {
    window._weightGraphCoords = coords;
  }

  // Calculate smooth cubic spline path
  let lineD = '';
  if (coords.length === 1) {
    lineD = `M ${coords[0].x - 10} ${coords[0].y} L ${coords[0].x + 10} ${coords[0].y}`;
  } else {
    lineD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      lineD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const areaD = `${lineD} L ${lastCoord.x.toFixed(1)} ${(height - padBottom).toFixed(1)} L ${firstCoord.x.toFixed(1)} ${(height - padBottom).toFixed(1)} Z`;

  // Horizontal Grid Lines (82.5, 80, 77.5)
  const gridValues = [82.5, 80.0, 77.5];
  const gridLinesHtml = gridValues.map(gVal => {
    const norm = (gVal - minY) / kgRange;
    const y = padTop + (1 - norm) * plotHeight;
    return `
      <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="2,3" />
      <text x="${padLeft - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" fill="#717182" font-size="9" font-family="var(--sans)" font-weight="600">${gVal % 1 === 0 ? gVal : gVal.toFixed(1)}</text>
    `;
  }).join('');

  // Vertical Subtle Grid Lines
  const vGridCols = [0.28, 0.50, 0.72];
  const vGridLinesHtml = vGridCols.map(pct => {
    const x = padLeft + plotWidth * pct;
    return `<line x1="${x.toFixed(1)}" y1="${padTop}" x2="${x.toFixed(1)}" y2="${height - padBottom}" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-dasharray="2,3" />`;
  }).join('');

  // Target dashed line Y
  const targetNorm = (targetKg - minY) / kgRange;
  const targetY = Math.round((padTop + (1 - targetNorm) * plotHeight) * 10) / 10;

  // Small dots along curve
  const curveDotsHtml = coords.map((c, i) => {
    if (i === coords.length - 1) return '';
    return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2" fill="#FFB800" opacity="0.85" />`;
  }).join('');

  // Interactive point hit areas
  const hitAreasHtml = coords.map((c, i) => {
    return `
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="14" fill="transparent" class="weight-graph-hitarea" 
        data-date="${c.date}" data-weight="${c.weight}"
        onclick="selectWeightPointByIndex(${i})"
        onmouseenter="selectWeightPointByIndex(${i})" />
    `;
  }).join('');

  return `
    <div class="home-mobile-chart-wrap home-mobile-weight-chart-wrap" 
      style="position:relative; touch-action:pan-y;"
      onpointermove="handleWeightGraphPointer(event)"
      onpointerdown="handleWeightGraphPointer(event)"
      onpointerleave="handleWeightGraphPointerLeave()"
      ontouchmove="handleWeightGraphPointer(event)"
      ontouchstart="handleWeightGraphPointer(event)"
      ontouchend="handleWeightGraphPointerLeave()">
      <svg class="home-mobile-metric-svg home-mobile-weight-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFB800" stop-opacity="0.30" />
            <stop offset="50%" stop-color="#FFB800" stop-opacity="0.10" />
            <stop offset="100%" stop-color="#FFB800" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Horizontal & Vertical Grid Lines -->
        ${vGridLinesHtml}
        ${gridLinesHtml}

        <!-- Dashed Target Weight Line -->
        <line x1="${padLeft}" y1="${targetY.toFixed(1)}" x2="${width - padRight}" y2="${targetY.toFixed(1)}" stroke="#FFB800" stroke-width="2" stroke-dasharray="6,4" />
        <text x="${width - padRight}" y="${(targetY - 5).toFixed(1)}" text-anchor="end" fill="#FFB800" font-size="10.5" font-family="var(--font-heading, var(--sans))" font-weight="800">${targetKg}</text>

        <!-- Area Gradient Fill -->
        <path d="${areaD}" fill="url(#weightAreaGrad)" />

        <!-- Smooth Curve Line -->
        <path d="${lineD}" fill="none" stroke="#FFB800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Curve Inner Dots -->
        ${curveDotsHtml}

        <!-- Interactive Guide Line (Shown on drag/hover) -->
        <line id="weight-interactive-vline" x1="0" y1="${padTop}" x2="0" y2="${height - padBottom}" stroke="rgba(255, 255, 255, 0.32)" stroke-width="1.2" stroke-dasharray="3,3" style="display:none;" />

        <!-- Interactive Highlight Dot -->
        <circle id="weight-interactive-dot" cx="0" cy="0" r="5.5" fill="#141418" stroke="#FFB800" stroke-width="3" style="display:none;" />

        <!-- Highlighted Latest Point -->
        <circle id="weight-latest-dot" cx="${lastCoord.x.toFixed(1)}" cy="${lastCoord.y.toFixed(1)}" r="5" fill="#FFB800" stroke="#141418" stroke-width="2" class="weight-graph-latest-dot" />

        <!-- Hit areas for direct point clicks -->
        ${hitAreasHtml}

        <!-- X-Axis Month Labels -->
        <text x="${(padLeft + plotWidth * 0.28).toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="#717182" font-size="10.5" font-family="var(--sans)" font-weight="600">Jul</text>
        <text x="${(padLeft + plotWidth * 0.72).toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="#717182" font-size="10.5" font-family="var(--sans)" font-weight="600">Aug</text>
      </svg>

      <!-- Floating Interactive Tooltip -->
      <div id="weight-tooltip" class="weight-tooltip" style="display:none;" aria-live="polite"></div>
    </div>
  `;
}

function handleWeightGraphPointer(evt) {
  const coords = window._weightGraphCoords;
  if (!coords || coords.length === 0) return;
  const container = document.querySelector('.home-mobile-weight-chart-wrap');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const clientX = evt.touches && evt.touches[0] ? evt.touches[0].clientX : evt.clientX;
  if (clientX == null) return;
  const relX = clientX - rect.left;
  const svgX = (relX / rect.width) * 360;

  // Find closest coordinate
  let closest = coords[0];
  let minDist = Math.abs(coords[0].x - svgX);
  for (let i = 1; i < coords.length; i++) {
    const dist = Math.abs(coords[i].x - svgX);
    if (dist < minDist) {
      minDist = dist;
      closest = coords[i];
    }
  }

  updateWeightGraphHighlight(closest, rect);
}

function selectWeightPointByIndex(idx) {
  const coords = window._weightGraphCoords;
  if (!coords || !coords[idx]) return;
  const container = document.querySelector('.home-mobile-weight-chart-wrap');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  updateWeightGraphHighlight(coords[idx], rect);
}

function updateWeightGraphHighlight(point, rect) {
  const vline = document.getElementById('weight-interactive-vline');
  const dot = document.getElementById('weight-interactive-dot');
  const latestDot = document.getElementById('weight-latest-dot');
  const tooltip = document.getElementById('weight-tooltip');
  const coords = window._weightGraphCoords || [];
  const isLatest = coords.length > 0 && coords[coords.length - 1] === point;

  if (vline) {
    vline.setAttribute('x1', point.x);
    vline.setAttribute('x2', point.x);
    vline.style.display = 'block';
  }
  if (dot) {
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    dot.style.display = 'block';
  }
  if (latestDot) {
    latestDot.style.opacity = isLatest ? '1' : '0.4';
  }

  if (tooltip) {
    const formatted = typeof formatWeightPointDate === 'function' ? formatWeightPointDate(point.date) : point.date;
    tooltip.innerHTML = `${formatted} · <strong>${Number(point.weight).toFixed(1)} kg</strong>`;
    tooltip.style.display = 'block';
    const tipPixelX = (point.x / 360) * rect.width;
    tooltip.style.left = `${Math.max(65, Math.min(rect.width - 65, tipPixelX))}px`;
    const tipPixelY = (point.y / 135) * rect.height;
    tooltip.style.top = `${Math.max(0, tipPixelY - 36)}px`;
  }
}

function handleWeightGraphPointerLeave() {
  setTimeout(() => {
    const vline = document.getElementById('weight-interactive-vline');
    const dot = document.getElementById('weight-interactive-dot');
    const latestDot = document.getElementById('weight-latest-dot');
    const tooltip = document.getElementById('weight-tooltip');
    if (vline) vline.style.display = 'none';
    if (dot) dot.style.display = 'none';
    if (latestDot) latestDot.style.opacity = '1';
    if (tooltip) tooltip.style.display = 'none';
  }, 1800);
}

function showWeightTooltip(evt, dateStr, weight) {
  const coords = window._weightGraphCoords;
  if (coords) {
    const found = coords.find(c => (c.date || '').substring(0, 10) === (dateStr || '').substring(0, 10));
    if (found) {
      const container = document.querySelector('.home-mobile-weight-chart-wrap');
      if (container) {
        updateWeightGraphHighlight(found, container.getBoundingClientRect());
        return;
      }
    }
  }
}

function hideWeightTooltip() {
  handleWeightGraphPointerLeave();
}

function renderWeeklyVolumeSparklineSvg(weekSets, goalSets) {
  return renderBodyWeightSparklineSvg(typeof getWeightHistory === 'function' ? getWeightHistory() : [], 77);
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
      primary: ['abs'],
      secondary: ['lower_back', 'calves'],
      frontMuscles: ['abs'],
      backMuscles: ['lower_back', 'calves']
    };
  }

  if (typeof window !== 'undefined' && window.MuscleMap) {
    const resolved = window.MuscleMap.resolveMuscles(workout);
    return {
      label: resolved.label || 'Full Body',
      primary: resolved.primary || [],
      secondary: resolved.secondary || [],
      frontMuscles: resolved.primary || [],
      backMuscles: resolved.secondary || []
    };
  }

  return {
    label: 'Full Body',
    primary: ['chest', 'triceps'],
    secondary: ['front_delts', 'abs'],
    frontMuscles: ['chest', 'triceps'],
    backMuscles: ['traps']
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
  if (typeof window !== 'undefined' && window.MuscleMap) {
    return window.MuscleMap.renderDualMuscleBodySvg(muscles || _currentWorkoutMuscles);
  }

  return `
    <div style="display:flex; justify-content:center; align-items:center; gap:24px; width:100%; padding:4px 0;">
      <span>Muscle Map</span>
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

  // 1. Weekly Schedule & Interactive Navigator Calculation
  state.homeWeekOffset = state.homeWeekOffset || 0;
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7; // 0=Monday .. 6=Sunday

  // Compute Monday & Sunday of the active navigated week
  const weekMonday = new Date(now);
  weekMonday.setDate(now.getDate() - todayDow + (state.homeWeekOffset * 7));
  weekMonday.setHours(0, 0, 0, 0);

  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);

  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNamesShort[weekMonday.getMonth()];
  const endMonth = monthNamesShort[weekSunday.getMonth()];
  const startDay = weekMonday.getDate();
  const endDay = weekSunday.getDate();

  const weekLabel = (startMonth === endMonth)
    ? `${startMonth} ${startDay}–${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  const isCurrentNavWeek = (state.homeWeekOffset === 0);

  const currentSplit = state.selectedSplitDetail || state.activeSplit || state.splits[0];
  const schedule = currentSplit?.schedule || [];
  const plannedWorkoutsCount = schedule.filter(d => d.day_type === 'workout').length || 4;
  const weekSessionsDone = summary.week_sessions || 0;

  let completedCountInNavWeek = 0;
  if (state.homeWeekOffset < 0) {
    completedCountInNavWeek = plannedWorkoutsCount;
  } else if (state.homeWeekOffset === 0) {
    completedCountInNavWeek = weekSessionsDone;
  } else {
    completedCountInNavWeek = 0;
  }
  const navWeeklyPct = Math.min(100, Math.round((completedCountInNavWeek / Math.max(1, plannedWorkoutsCount)) * 100));

  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNamesShort = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Calculate muscle targets for today's workout
  _currentWorkoutMuscles = getWorkoutMuscleTargets(resolved?.workout);

  const weekCirclesHtml = dayLetters.map((letter, idx) => {
    const isToday = isCurrentNavWeek && (idx === todayDow);
    const isPast = (state.homeWeekOffset < 0) || (isCurrentNavWeek && idx < todayDow);
    const isWorkoutDay = schedule[idx]?.day_type === 'workout';
    const isDone = isPast && isWorkoutDay && (state.homeWeekOffset < 0 || weekSessionsDone > 0);

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
      const isPaused = active.status === 'paused' || active.phaseState === 'PAUSED';
      if (isPaused) {
        heroStatusTag = 'WORKOUT PAUSED';
        heroBtnHtml = `
          <button class="home-hero-btn" onclick="openWorkoutView()">
            <span>${renderIcon('playCircle', 'cx-icon cx-icon-inline cx-icon-sm')} Resume Workout</span>
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

    const mainWorkoutExercises = (workout.main && workout.main.length > 0)
      ? workout.main
      : (workout.exercises || []).filter(e => !e.phase || e.phase === 'main' || e.phase === 'main_workout');
    const heroExercises = mainWorkoutExercises.slice(0, 6);
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

    const moreExCount = mainWorkoutExercises.length - heroExercises.length;
    const moreExNote = moreExCount > 0 ? `<div style="font-size:11px; color:var(--text-dim); text-align:center; padding-top:2px;">+${moreExCount} more exercises in main session</div>` : '';

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
            <span class="home-weekly-tag">Weekly Progress · ${weekLabel}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="home-week-nav-arrow-desktop" onclick="event.stopPropagation(); shiftHomeWeek(-1)" title="Previous week">‹</button>
              <button class="home-week-nav-arrow-desktop" onclick="event.stopPropagation(); shiftHomeWeek(1)" title="Next week">›</button>
              <span class="home-weekly-pct">${navWeeklyPct}%</span>
            </div>
          </div>
          <div class="home-weekly-title">${completedCountInNavWeek} of ${plannedWorkoutsCount} workouts done</div>
          <div class="home-weekly-bar-bg">
            <div class="home-weekly-bar-fill" style="width: ${navWeeklyPct}%;"></div>
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
          <span class="home-metric-lbl">Workouts this week</span>
          <div class="home-metric-icon">${renderIcon('dumbbell', 'cx-icon cx-icon-md cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card1Val}</div>
        <div class="home-metric-sub">${card1Sub}</div>
        ${card1Spark}
      </div>

      <!-- Card 2: Total Sets -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Total sets</span>
          <div class="home-metric-icon">${renderIcon('barChart', 'cx-icon cx-icon-md cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card2Val}</div>
        <div class="home-metric-sub">${card2Sub}</div>
        ${card2Spark}
      </div>

      <!-- Card 3: Training Volume -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Training volume</span>
          <div class="home-metric-icon">${renderIcon('trendingUp', 'cx-icon cx-icon-md cx-icon-muted')}</div>
        </div>
        <div class="home-metric-val">${card3Val}</div>
        <div class="home-metric-sub">${card3Sub}</div>
        ${card3Spark}
      </div>

      <!-- Card 4: Avg. Workout Time -->
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Avg. workout time</span>
          <div class="home-metric-icon">${renderIcon('timer', 'cx-icon cx-icon-md cx-icon-muted')}</div>
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
            <div class="home-pr-new-tag" style="color:var(--text-dim);">Complete workout sets to establish your personal records</div>
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

  // ─── Mobile Simplified Home View (< 1024px) ──────────────────────────
  const selectedDayIndex = (state.selectedHomeDayIndex !== undefined && state.selectedHomeDayIndex !== null)
    ? state.selectedHomeDayIndex
    : (isCurrentNavWeek ? todayDow : 0);

  // Selected day details & completion tracking
  const selectedScheduleItem = schedule[selectedDayIndex];
  const isSelectedWorkout = selectedScheduleItem?.day_type === 'workout' && selectedScheduleItem?.workout_id;
  const isSelectedToday = (isCurrentNavWeek && selectedDayIndex === todayDow);

  const selectedDayDate = new Date(weekMonday);
  selectedDayDate.setDate(weekMonday.getDate() + selectedDayIndex);
  const selectedDayIsoStr = `${selectedDayDate.getFullYear()}-${String(selectedDayDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDayDate.getDate()).padStart(2, '0')}`;

  let selectedDayCompletedSession = null;
  if (state.workoutSessions && state.workoutSessions.length > 0) {
    selectedDayCompletedSession = state.workoutSessions.find(s => {
      const sDate = (s.completed_at || s.started_at || s.created_at || '').substring(0, 10);
      return sDate === selectedDayIsoStr && (s.status === 'completed' || s.completed_sets > 0);
    });
  }
  if (!selectedDayCompletedSession && state.dashboardActivity && state.dashboardActivity.length > 0) {
    const act = state.dashboardActivity.find(a => {
      const aDate = (a.date || a.session_date || a.created_at || '').substring(0, 10);
      return aDate === selectedDayIsoStr;
    });
    if (act) selectedDayCompletedSession = act;
  }

  const isSelectedDayDone = !!selectedDayCompletedSession || (state.homeWeekOffset < 0 && isSelectedWorkout);

  // 1. Mobile Header (Reference: openGym branding + Tuesday 1 September date + circular Settings gear)
  const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const headerDateStr = `${FULL_DAYS[now.getDay()]} ${now.getDate()} ${FULL_MONTHS[now.getMonth()]}`;

  const mobileHeaderHtml = `
    <div class="home-mobile-header">
      <div class="home-mobile-brand-group">
        <div class="home-mobile-brand-title">
          <span class="app-logo">Calisthen<span class="logo-x">i</span><span class="logo-x-accent">X</span></span>
        </div>
        <div class="home-mobile-date-sub">${headerDateStr}</div>
        <span class="sr-only" style="display:none;">Good ${greeting.toLowerCase()} Sandeep</span>
      </div>
      <button class="home-mobile-gear-btn home-mobile-settings-btn" onclick="openSettingsModal()" title="Settings & Preferences" aria-label="Settings">
        <span class="sr-only" style="display:none;">Settings</span>
        <svg class="cx-icon cx-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
  `;

  const DAY_NAMES_MON = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_CODES_2 = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  // Card 1 — 7 Day Columns
  const mobileWeekDaysHtml = DAY_CODES_2.map((code, idx) => {
    const dayDate = new Date(weekMonday);
    dayDate.setDate(weekMonday.getDate() + idx);
    const dateNum = dayDate.getDate();
    const dayIsoStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

    const isToday = isCurrentNavWeek && (idx === todayDow);
    const isPast = (state.homeWeekOffset < 0) || (isCurrentNavWeek && idx < todayDow);
    const isFuture = (state.homeWeekOffset > 0) || (isCurrentNavWeek && idx > todayDow);
    const isWorkoutDay = schedule[idx]?.day_type === 'workout' && schedule[idx]?.workout_id;
    const isSelected = (idx === selectedDayIndex);

    let isDone = false;
    if (state.workoutSessions && state.workoutSessions.length > 0) {
      isDone = state.workoutSessions.some(s => {
        const sDate = (s.completed_at || s.started_at || s.created_at || '').substring(0, 10);
        return sDate === dayIsoStr && (s.status === 'completed' || s.completed_sets > 0);
      });
    }
    if (!isDone && state.dashboardActivity && state.dashboardActivity.length > 0) {
      isDone = state.dashboardActivity.some(a => {
        const aDate = (a.date || a.session_date || a.created_at || '').substring(0, 10);
        return aDate === dayIsoStr;
      });
    }
    if (!isDone && state.homeWeekOffset < 0 && isWorkoutDay) {
      isDone = true;
    }

    let dotClass = '';
    let stateSymbol = '○';
    if (isDone) {
      dotClass = 'dot-done';
      stateSymbol = '✓';
    } else if (isToday) {
      dotClass = 'dot-today';
      stateSymbol = '●';
    } else if (isWorkoutDay && isFuture) {
      dotClass = 'dot-future';
      stateSymbol = '○';
    } else if (isWorkoutDay) {
      dotClass = 'dot-workout';
      stateSymbol = '○';
    } else {
      dotClass = 'dot-rest';
      stateSymbol = '—';
    }

    return `
      <div class="home-mobile-day-col ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : 'is-past'} ${isDone ? 'is-done' : ''} ${isWorkoutDay ? 'is-workout' : 'is-rest'}" onclick="selectHomeDay(${idx})" title="${DAY_NAMES_MON[idx]}: ${schedule[idx]?.workout_name || 'Rest'}">
        <span class="home-mobile-day-code home-mobile-day-name">${code}</span>
        <span class="home-mobile-day-num-wrap">
          <span class="home-mobile-day-num">${dateNum}</span>
        </span>
        <span class="home-mobile-day-dot ${dotClass}" aria-label="${stateSymbol}"><span class="home-mobile-day-symbol sr-only" style="display:none;">${stateSymbol}</span></span>
      </div>
    `;
  }).join('');

  // Inset Workout Details in Card 1
  let mobileTodayTag = 'TODAY';
  if (!isSelectedToday) {
    const selDayName = schedule[selectedDayIndex]?.day_name || DAY_NAMES_MON[selectedDayIndex];
    mobileTodayTag = (isCurrentNavWeek) ? selDayName.toUpperCase() : `${selDayName.toUpperCase()}`;
  } else if (isThisActive) {
    mobileTodayTag = 'TODAY';
  } else if (isSelectedDayDone) {
    mobileTodayTag = 'TODAY · COMPLETED';
  }

  let cardTitle = 'Rest & Recovery';
  let pillAction = `switchView('split')`;
  let pillLabel = 'Rest';
  let pillClass = 'is-rest';
  const isCardRest = !isSelectedWorkout;

  const isWorkoutPaused = isThisActive && (active?.status === 'paused' || active?.phaseState === 'PAUSED');

  if (isSelectedWorkout) {
    let workoutObj = (isSelectedToday && resolved?.workout) ? resolved.workout : null;
    if (!workoutObj && state.workouts && state.workouts.length > 0) {
      workoutObj = state.workouts.find(w => w.id === selectedScheduleItem.workout_id);
    }
    const baseName = workoutObj?.name || selectedScheduleItem.workout_name || 'Workout Session';

    if (isSelectedDayDone) {
      cardTitle = `${baseName} — Completed`;
      pillAction = `switchView('history_list')`;
      pillLabel = 'View';
      pillClass = 'is-done is-view';
    } else if (isSelectedToday && isThisActive) {
      if (isWorkoutPaused) {
        cardTitle = `${baseName} — Paused`;
        pillAction = `openWorkoutView()`;
        pillLabel = 'Resume';
        pillClass = 'is-resume is-paused';
        mobileTodayTag = 'TODAY · PAUSED';
      } else {
        cardTitle = `${baseName} — In Progress`;
        pillAction = `openWorkoutView()`;
        pillLabel = 'Resume';
        pillClass = 'is-resume is-active';
        mobileTodayTag = 'TODAY · IN PROGRESS';
      }
    } else if (isSelectedToday) {
      cardTitle = baseName;
      pillAction = `startWorkoutFromResolved()`;
      pillLabel = 'Start';
      pillClass = 'is-start';
    } else {
      cardTitle = baseName;
      pillAction = `startWorkoutFromId(${selectedScheduleItem.workout_id})`;
      pillLabel = 'Start';
      pillClass = 'is-start';
    }
  }

  // Determine dynamic badge icon & state classes
  let workoutBadgeIcon = 'zap';
  let badgeStateClass = '';

  if (isCardRest) {
    workoutBadgeIcon = 'moon';
    badgeStateClass = 'is-rest';
  } else if (isSelectedDayDone) {
    workoutBadgeIcon = 'check';
    badgeStateClass = 'is-completed';
  } else if (isSelectedToday && isThisActive) {
    if (isWorkoutPaused) {
      workoutBadgeIcon = 'pauseCircle';
      badgeStateClass = 'is-paused';
    } else {
      workoutBadgeIcon = 'playCircle';
      badgeStateClass = 'is-in-progress';
    }
  } else {
    // Determine movement icon from routine name
    const lowerName = (cardTitle || selectedScheduleItem?.workout_name || '').toLowerCase();
    if (lowerName.includes('pull')) {
      workoutBadgeIcon = 'pullup';
    } else if (lowerName.includes('push')) {
      workoutBadgeIcon = 'zap';
    } else if (lowerName.includes('leg')) {
      workoutBadgeIcon = 'flame';
    } else if (lowerName.includes('skill') || lowerName.includes('handstand')) {
      workoutBadgeIcon = 'rings';
    } else {
      workoutBadgeIcon = 'zap';
    }
  }

  const displayWeekTitle = isCurrentNavWeek ? 'This week' : weekLabel;

  // CARD 1: Combined Weekly Navigator + Embedded Workout Row
  const mobileWeekCardHtml = `
    <div class="home-mobile-section-card home-mobile-week-card" id="home-mobile-week-card">
      <div class="home-mobile-week-nav-bar home-mobile-week-nav-head">
        <span class="home-mobile-section-title sr-only" style="display:none;">THIS WEEK</span>
        <button class="home-mobile-week-arrow-btn home-week-nav-arrow" onclick="shiftHomeWeek(-1)" aria-label="Previous week" title="Previous week">‹</button>
        <span class="home-mobile-week-range-text home-mobile-week-range-btn ${isCurrentNavWeek ? 'is-current' : ''}" onclick="resetHomeWeek()" title="${isCurrentNavWeek ? 'Current week' : 'Click to reset to current week'}">
          ${displayWeekTitle}
        </span>
        <button class="home-mobile-week-arrow-btn home-week-nav-arrow" onclick="shiftHomeWeek(1)" aria-label="Next week" title="Next week">›</button>
      </div>

      <div class="home-mobile-week-days-grid home-mobile-week-slider" id="home-mobile-week-slider">
        <div class="home-mobile-week-days" style="display:contents;">
          ${mobileWeekDaysHtml}
        </div>
      </div>

      <div class="home-mobile-workout-inset home-mobile-today-card ${badgeStateClass}">
        <div class="home-mobile-workout-badge">
          ${renderIcon(workoutBadgeIcon, 'cx-icon cx-icon-sm')}
        </div>
        <div class="home-mobile-workout-meta">
          <span class="home-mobile-workout-tag home-mobile-today-tag">${mobileTodayTag}</span>
          <span class="home-mobile-workout-title home-mobile-today-title">${cardTitle}</span>
        </div>
        <div class="home-mobile-workout-cta">
          <button class="home-mobile-workout-pill home-mobile-start-btn ${pillClass}" onclick="${pillAction}"><span class="home-mobile-btn-text-short">${pillLabel}</span><span class="sr-only" style="display:none;">Start Workout →</span></button>
        </div>
      </div>
    </div>
  `;

  // CARD 2: Body Weight Progress Card
  const weightHistory = typeof getWeightHistory === 'function' ? getWeightHistory() : [];
  const targetKg = typeof getTargetWeight === 'function' ? getTargetWeight() : 77;
  const weightUnit = typeof getWeightUnit === 'function' ? getWeightUnit() : 'kg';
  const hasWeightData = Array.isArray(weightHistory) && weightHistory.length > 0;

  let latestWeight = 78.3;
  let diffText = '↓ 0.1';
  let diffClass = 'trend-down';
  let formattedLatestDate = 'Mon 31 Aug';
  let goalSubtext = `1.3 ${weightUnit} to lose`;

  if (hasWeightData) {
    const latestEntry = weightHistory[weightHistory.length - 1];
    latestWeight = Number(latestEntry.weight);
    formattedLatestDate = typeof formatWeightPointDate === 'function' ? formatWeightPointDate(latestEntry.date) : latestEntry.date;

    if (weightHistory.length > 1) {
      const prevEntry = weightHistory[weightHistory.length - 2];
      const diff = Math.round((latestWeight - Number(prevEntry.weight)) * 10) / 10;
      if (diff < -0.05) {
        diffText = `↓ ${Math.abs(diff).toFixed(1)}`;
        diffClass = 'trend-down';
      } else if (diff > 0.05) {
        diffText = `↑ ${diff.toFixed(1)}`;
        diffClass = 'trend-up';
      } else {
        diffText = `— 0.0`;
        diffClass = 'trend-neutral';
      }
    } else {
      diffText = '— 0.0';
      diffClass = 'trend-neutral';
    }

    const diffToGoal = Math.round((latestWeight - targetKg) * 10) / 10;
    if (diffToGoal > 0.05) {
      goalSubtext = `${diffToGoal.toFixed(1)} ${weightUnit} to lose`;
    } else if (diffToGoal < -0.05) {
      goalSubtext = `${Math.abs(diffToGoal).toFixed(1)} ${weightUnit} to gain`;
    } else {
      goalSubtext = 'Target goal reached!';
    }
  }

  const mobileBodyWeightCardHtml = `
    <div class="home-mobile-section-card home-mobile-metric-card" id="home-mobile-bodyweight-card">
      <div class="home-mobile-metric-header">
        <span class="home-mobile-metric-title">Body weight</span>
        <div class="home-mobile-metric-header-right">
          <span class="home-mobile-goal-pill" onclick="promptSetTargetWeight()" title="Click to edit goal">${renderIcon('target', 'cx-icon cx-icon-xs cx-icon-inline')} ${targetKg}</span>
          <button class="home-mobile-log-link" onclick="openQuickCheckInModal(null)">+ Log</button>
        </div>
      </div>

      ${hasWeightData ? `
        <div class="home-mobile-metric-hero-row">
          <div class="home-mobile-metric-stat-group">
            <span class="home-mobile-metric-big-num mono">${latestWeight.toFixed(1)}</span>
            <span class="home-mobile-metric-unit">${weightUnit}</span>
            <span class="home-mobile-metric-trend-badge ${diffClass}">${diffText}</span>
          </div>
          <span class="home-mobile-metric-subdate">${formattedLatestDate}</span>
        </div>

        <div class="home-mobile-metric-goal-subtext">
          <span class="home-mobile-goal-dot">${renderIcon('target', 'cx-icon cx-icon-xs')}</span>
          <span>Goal ${targetKg} ${weightUnit} · ${goalSubtext}</span>
        </div>

        ${renderBodyWeightSparklineSvg(weightHistory, targetKg)}
      ` : `
        <div class="home-mobile-empty-weight-wrap">
          <p class="home-mobile-empty-weight-text">No weight data yet</p>
          <button class="btn btn-sm btn-primary home-mobile-log-weight-btn" onclick="openQuickCheckInModal(null)">
            + Log weight
          </button>
        </div>
      `}
    </div>
  `;

  // CARD 3: Streak & Consistency Card
  const totalWorkoutsCount = (state.workoutSessions && state.workoutSessions.length > 0)
    ? state.workoutSessions.filter(s => s.status === 'completed' || s.completed_sets > 0).length
    : (summary.streak_days || 12);

  const mobileStreakCardHtml = `
    <div class="home-mobile-section-card home-mobile-streak-card home-mobile-streak-ref-card" onclick="switchView('history_list')">
      <span class="home-mobile-section-title sr-only" style="display:none;">CURRENT STREAK</span>
      <div class="home-mobile-streak-left">
        <span class="home-mobile-streak-flame-icon home-mobile-streak-flame">${renderIcon('flame', 'cx-icon cx-icon-sm cx-icon-flame')}</span>
        <div class="home-mobile-streak-text-group home-mobile-streak-val">
          <div class="home-mobile-streak-heading home-mobile-streak-num">${streakDays} day streak</div>
          <div class="home-mobile-streak-subline">${weekSessionsDone} / ${plannedWorkoutsCount} this week · ${totalWorkoutsCount} workouts total</div>
        </div>
      </div>
      <button class="home-mobile-streak-cal-btn" onclick="event.stopPropagation(); switchView('history_list')" title="View Training History">
        ${renderIcon('calendar', 'cx-icon cx-icon-sm')}
      </button>
    </div>
  `;

  // CARD 4: Up Next Workouts Card
  const DAY_NAMES_3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const upcomingWorkoutsList = [];
  const upcomingChronological = [];
  for (let offset = 1; offset <= 6; offset++) {
    const nextIdx = (selectedDayIndex + offset) % 7;
    const dayShort = DAY_NAMES_3[nextIdx];
    const dayItem = schedule[nextIdx];
    const isWorkout = dayItem?.day_type === 'workout' && dayItem?.workout_id;
    const entry = {
      idx: nextIdx,
      dayShort,
      title: isWorkout ? dayItem.workout_name : 'Rest Day',
      isWorkout
    };
    upcomingChronological.push(entry);
    if (isWorkout) {
      upcomingWorkoutsList.push(entry);
    }
  }

  const itemsToShow = upcomingWorkoutsList.length >= 2
    ? upcomingWorkoutsList.slice(0, 3)
    : (upcomingWorkoutsList.length === 1
        ? [upcomingWorkoutsList[0], ...upcomingChronological.filter(e => !e.isWorkout).slice(0, 1)]
        : upcomingChronological.slice(0, 2));

  const mobileUpcomingRowsHtml = itemsToShow.map(item => `
    <div class="home-mobile-upnext-row" onclick="selectHomeDay(${item.idx})" title="${item.dayShort}: ${item.title} (Tap to view)">
      <span class="home-mobile-upnext-day">${item.dayShort}</span>
      <span class="home-mobile-upnext-title ${!item.isWorkout ? 'is-rest' : ''}">${item.title}</span>
      <span class="home-mobile-upnext-arrow">→</span>
    </div>
  `).join('');

  const mobileUpNextCardHtml = `
    <div class="home-mobile-section-card home-mobile-upnext-card home-mobile-upnext-ref-card">
      <div class="home-mobile-section-header">
        <span class="home-mobile-section-title">UP NEXT</span>
      </div>
      <div class="home-mobile-upnext-list">
        ${mobileUpcomingRowsHtml}
      </div>
    </div>
  `;

  // Initialize swipe gestures after DOM paint
  if (typeof setTimeout !== 'undefined') {
    setTimeout(() => {
      if (typeof initWeekSwipeGestures === 'function') initWeekSwipeGestures();
    }, 50);
  }

  return `
    <div class="home-container">
      <!-- Mobile Home View (< 1024px) -->
      <div class="home-mobile-view">
        ${mobileHeaderHtml}
        ${mobileWeekCardHtml}
        ${mobileBodyWeightCardHtml}
        ${mobileStreakCardHtml}
        ${mobileUpNextCardHtml}
      </div>

      <!-- Desktop Home View (>= 1024px) -->
      <div class="home-desktop-view">
        <!-- Top Header & Controls (Section 10 Spec) -->
        <div class="home-header-row fade-in-up">
          <div class="home-greeting-group">
            <span class="home-greeting-lead">Good ${greeting.toLowerCase()}</span>
            <h1 class="home-greeting-name">Sandeep</h1>
          </div>
          <div class="home-header-controls">
            <button class="home-notif-btn" onclick="openNotifModal()" title="Notifications" aria-label="Notifications">
              ${renderIcon('bell', 'cx-icon cx-icon-sm')}
              <span class="home-notif-dot"></span>
            </button>
            <div class="home-week-select-pill" onclick="shiftHomeWeek(1)" title="Click to navigate next week">
              <span>${isCurrentNavWeek ? 'This Week' : weekLabel} ${renderIcon('chevronDown', 'cx-icon cx-icon-xs')}</span>
            </div>
            <div class="home-streak-pill-compact" title="Current Daily Streak">
              <span>${renderIcon('flame', 'cx-icon cx-icon-fire cx-icon-sm')}</span>
              <span class="home-streak-pill-num">${summary.streak_days || 0}</span>
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
      </div>
    </div>`;
}

// ─── Global Interactive Week Navigator Helpers ───────────────────────────────
window.selectHomeDay = function(dayIndex) {
  state.selectedHomeDayIndex = dayIndex;
  if (typeof render === 'function') {
    render();
  }
};

window.shiftHomeWeek = function(direction, animClass = null) {
  state.homeWeekOffset = (state.homeWeekOffset || 0) + direction;
  if (state.homeWeekOffset === 0) {
    const now = new Date();
    state.selectedHomeDayIndex = (now.getDay() + 6) % 7;
  } else {
    state.selectedHomeDayIndex = 0;
  }
  const anim = animClass || (direction > 0 ? 'slide-left' : 'slide-right');
  if (typeof render === 'function') {
    render();
  }
  const slider = document.getElementById('home-mobile-week-slider');
  if (slider) {
    slider.classList.add(anim);
    setTimeout(() => slider.classList.remove(anim), 300);
  }
  setTimeout(initWeekSwipeGestures, 50);
};

window.resetHomeWeek = function() {
  if (state.homeWeekOffset === 0 && (state.selectedHomeDayIndex === null || state.selectedHomeDayIndex === ((new Date().getDay() + 6) % 7))) return;
  const anim = (state.homeWeekOffset || 0) > 0 ? 'slide-right' : 'slide-left';
  state.homeWeekOffset = 0;
  const now = new Date();
  state.selectedHomeDayIndex = (now.getDay() + 6) % 7;
  if (typeof render === 'function') {
    render();
  }
  const slider = document.getElementById('home-mobile-week-slider');
  if (slider) {
    slider.classList.add(anim);
    setTimeout(() => slider.classList.remove(anim), 300);
  }
  setTimeout(initWeekSwipeGestures, 50);
};

window.initWeekSwipeGestures = function() {
  const container = document.getElementById('home-mobile-week-card');
  if (!container || container._swipeInitialized) return;
  container._swipeInitialized = true;

  let startX = 0;
  let startY = 0;
  let isSwiping = false;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isSwiping || e.changedTouches.length !== 1) return;
    isSwiping = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        shiftHomeWeek(1, 'slide-left');
      } else {
        shiftHomeWeek(-1, 'slide-right');
      }
    }
  }, { passive: true });
};

// ─── Quick Check-In Bottom Sheet Modal Controller ───────────────────────────
let _pendingCheckInWorkout = null;
let _currentCheckInWeight = 78.3;

function openQuickCheckInModal(workoutData = null) {
  _pendingCheckInWorkout = workoutData;
  const history = typeof getWeightHistory === 'function' ? getWeightHistory() : [];
  const latestWeight = history && history.length > 0 ? Number(history[history.length - 1].weight) : (typeof getTargetWeight === 'function' ? getTargetWeight() : 78.3);
  _currentCheckInWeight = latestWeight || 78.3;

  const root = document.getElementById('quick-checkin-modal-root');
  if (!root) return;

  const isWorkoutFlow = !!workoutData;
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const formattedToday = `Today, ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;

  const recentHistory = history.slice(-4).reverse();
  const recentHtml = (!isWorkoutFlow && recentHistory.length > 0) ? `
    <div class="quick-checkin-recent-section" id="quick-checkin-recent-section">
      <span class="quick-checkin-recent-header">Recent weigh-ins</span>
      <div class="quick-checkin-recent-list">
        ${recentHistory.map(item => `
          <div class="quick-checkin-recent-item">
            <span class="quick-checkin-recent-date">${formatWeightPointDate(item.date)}</span>
            <div class="quick-checkin-recent-right">
              <span class="quick-checkin-recent-weight mono">${Number(item.weight).toFixed(1)} kg</span>
              <button class="quick-checkin-delete-btn" onclick="event.stopPropagation(); deleteBodyWeight('${item.date}')" title="Delete entry" aria-label="Delete weigh-in">
                ${renderIcon('trash', 'cx-icon cx-icon-xs')}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  root.innerHTML = `
    <div class="quick-checkin-backdrop animate-fade-in" onclick="if(event.target === this) closeQuickCheckInModal()">
      <div class="quick-checkin-sheet animate-slide-up">
        <!-- Drag Handle -->
        <div class="quick-checkin-handle-bar" onclick="closeQuickCheckInModal()">
          <div class="quick-checkin-handle"></div>
        </div>

        <!-- Header -->
        <div class="quick-checkin-header">
          <h3 class="quick-checkin-title">${isWorkoutFlow ? 'Quick check-in' : 'Log body weight'}</h3>
          <button class="quick-checkin-close-btn" onclick="closeQuickCheckInModal()" aria-label="Close">
            ${renderIcon('x', 'cx-icon cx-icon-sm')}
          </button>
        </div>

        <!-- Subtitle -->
        <p class="quick-checkin-subtitle">
          ${isWorkoutFlow 
            ? 'Slide or tap to set your weight — tracked before every workout so your curve stays honest.' 
            : formattedToday}
        </p>

        <!-- Weight Hero Input -->
        <div class="quick-checkin-weight-row">
          <button class="quick-checkin-step-btn" onclick="stepCheckInWeight(-0.1)" aria-label="Decrease weight by 0.1 kg">−</button>
          <div class="quick-checkin-weight-display">
            <span class="quick-checkin-weight-val mono" id="quick-checkin-val-display">${_currentCheckInWeight.toFixed(1)}</span>
            <span class="quick-checkin-weight-unit">${typeof getWeightUnit === 'function' ? getWeightUnit() : 'kg'}</span>
          </div>
          <button class="quick-checkin-step-btn" onclick="stepCheckInWeight(0.1)" aria-label="Increase weight by 0.1 kg">+</button>
        </div>

        <!-- Quick Adjustment Pills -->
        <div class="quick-checkin-nudge-pills">
          <button class="quick-checkin-nudge-btn" onclick="stepCheckInWeight(-1.0)">−1</button>
          <button class="quick-checkin-nudge-btn" onclick="stepCheckInWeight(-0.5)">−0.5</button>
          <button class="quick-checkin-nudge-btn" onclick="stepCheckInWeight(0.5)">+0.5</button>
          <button class="quick-checkin-nudge-btn" onclick="stepCheckInWeight(1.0)">+1</button>
        </div>

        <!-- Range Slider for Fine Adjustment -->
        <div class="quick-checkin-slider-wrap">
          <input type="range" min="40" max="150" step="0.1" value="${_currentCheckInWeight}" class="quick-checkin-slider" id="quick-checkin-range-slider" oninput="onCheckInSliderInput(this.value)">
          <div class="quick-checkin-slider-labels">
            <span>40 kg</span>
            <span>150 kg</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="quick-checkin-actions">
          <button class="btn quick-checkin-primary-btn" onclick="submitQuickCheckIn(true)">
            ${isWorkoutFlow ? 'Save & start workout' : 'Save'}
          </button>
          ${isWorkoutFlow ? `
            <button class="btn quick-checkin-secondary-btn" onclick="submitQuickCheckIn(false)">
              Start without weighing in
            </button>
            <button class="quick-checkin-link-btn" onclick="chooseDifferentWorkoutFromCheckIn()">
              Choose a different workout
            </button>
          ` : ''}
        </div>

        <!-- Recent Weigh-ins (in Log mode) -->
        ${recentHtml}
      </div>
    </div>
  `;
}

function closeQuickCheckInModal() {
  const root = document.getElementById('quick-checkin-modal-root');
  if (root) {
    root.innerHTML = '';
  }
  _pendingCheckInWorkout = null;
}

function stepCheckInWeight(delta) {
  _currentCheckInWeight = Math.max(35, Math.min(200, Math.round((_currentCheckInWeight + delta) * 10) / 10));
  const valEl = document.getElementById('quick-checkin-val-display');
  if (valEl) valEl.textContent = _currentCheckInWeight.toFixed(1);
  const sliderEl = document.getElementById('quick-checkin-range-slider');
  if (sliderEl) sliderEl.value = _currentCheckInWeight;
}

function onCheckInSliderInput(val) {
  _currentCheckInWeight = Math.round(Number(val) * 10) / 10;
  const valEl = document.getElementById('quick-checkin-val-display');
  if (valEl) valEl.textContent = _currentCheckInWeight.toFixed(1);
}

function submitQuickCheckIn(saveWeight = true) {
  const pending = _pendingCheckInWorkout;
  const loggedWeight = _currentCheckInWeight;

  if (saveWeight && typeof saveBodyWeight === 'function') {
    saveBodyWeight(loggedWeight);
    if (typeof showToast === 'function') {
      showToast(`Weight saved: ${loggedWeight.toFixed(1)} kg`);
    }
  }

  closeQuickCheckInModal();

  if (pending) {
    // Start the selected workout without looping back to check-in modal
    if (typeof startWorkoutFromData === 'function') {
      startWorkoutFromData(pending.name, pending.exercises, pending.id);
    }
  } else {
    // If opened via "+ Log", re-render Home view to immediately refresh Body Weight card and graph
    if (typeof render === 'function') {
      render();
    }
  }
}

function chooseDifferentWorkoutFromCheckIn() {
  closeQuickCheckInModal();
  if (typeof switchView === 'function') {
    switchView('split');
  }
}

function promptSetTargetWeight() {
  const cur = typeof getTargetWeight === 'function' ? getTargetWeight() : 77;
  const res = prompt('Enter your target body weight (kg):', cur);
  if (res && !isNaN(Number(res)) && Number(res) > 0) {
    if (typeof setTargetWeight === 'function') setTargetWeight(Number(res));
    if (typeof showToast === 'function') showToast(`Goal updated to ${Number(res)} kg`);
    if (typeof render === 'function') render();
  }
}

if (typeof window !== 'undefined') {
  window.openQuickCheckInModal = openQuickCheckInModal;
  window.closeQuickCheckInModal = closeQuickCheckInModal;
  window.stepCheckInWeight = stepCheckInWeight;
  window.onCheckInSliderInput = onCheckInSliderInput;
  window.submitQuickCheckIn = submitQuickCheckIn;
  window.chooseDifferentWorkoutFromCheckIn = chooseDifferentWorkoutFromCheckIn;
  window.promptSetTargetWeight = promptSetTargetWeight;
  window.handleWeightGraphPointer = handleWeightGraphPointer;
  window.selectWeightPointByIndex = selectWeightPointByIndex;
  window.handleWeightGraphPointerLeave = handleWeightGraphPointerLeave;
}


