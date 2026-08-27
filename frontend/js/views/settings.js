/**
 * CalistheniX — Settings, Backup Data, Calendar & Biomechanics Modal
 */

function openSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;
  const muted = isMuted();

  root.innerHTML = `
    <div class="settings-modal-backdrop" onclick="if(event.target === this) closeSettingsModal()">
      <div class="settings-modal">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:18px; font-weight:700; color:var(--text);">Settings & Data</h2>
          <button class="nav-btn-icon" onclick="closeSettingsModal()">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Audio & Haptic Cues</strong>
              <div style="font-size:12px; color:var(--text-muted);">Ticks during rest countdown and PR fanfare</div>
            </div>
            <button class="btn btn-sm ${muted ? 'btn-secondary' : 'btn-primary'}" onclick="toggleMute(); openSettingsModal();">
              ${muted ? `${renderIcon('volumeMute', 'cx-icon cx-icon-inline')} Muted` : `${renderIcon('volume', 'cx-icon cx-icon-inline')} Enabled`}
            </button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Backup Export</strong>
              <div style="font-size:12px; color:var(--text-muted);">Save complete JSON bundle (v2.1) of splits, workouts & logs</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="exportData()">${renderIcon('download', 'cx-icon cx-icon-inline')} Export JSON</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:12px 16px; border-radius:var(--radius);">
            <div>
              <strong style="color:var(--text); font-size:14px;">Restore Backup</strong>
              <div style="font-size:12px; color:var(--text-muted);">Merge or restore from an existing JSON backup</div>
            </div>
            <label class="btn btn-sm btn-secondary" style="cursor:pointer; margin:0;">
              ${renderIcon('upload', 'cx-icon cx-icon-inline')} Import
              <input type="file" accept=".json" style="display:none;" onchange="importData(this); closeSettingsModal();">
            </label>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button class="btn btn-primary" onclick="closeSettingsModal()">Done</button>
        </div>
      </div>
    </div>`;
}

function closeSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (root) root.innerHTML = '';
}

// ─── Muscle Focus Engine & Body Visualization (Phase.md Section 20) ───────────
function openNotifModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;

  const resolved = state.todayResolved;
  const isWorkout = resolved && resolved.status === 'workout';
  const workoutName = resolved?.workout?.name || 'Scheduled Workout';

  root.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeSettingsModal()">
      <div class="settings-modal" onclick="event.stopPropagation()" style="max-width:420px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:17px; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:8px;">
            <span>${renderIcon('bell', 'cx-icon cx-icon-inline')} Notifications</span>
          </h2>
          <button class="btn btn-sm btn-secondary" onclick="closeSettingsModal()">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span>${renderIcon('zap', 'cx-icon cx-icon-lg cx-icon-accent')}</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">${isWorkout ? `Today's Workout: ${workoutName}` : 'Rest & Recovery Day'}</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${isWorkout ? 'Ready when you are. Step up and claim your strength.' : 'Hydrate, stretch, and prepare for tomorrow.'}</div>
            </div>
          </div>

          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span>${renderIcon('flame', 'cx-icon cx-icon-lg cx-icon-fire')}</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">Active Streak Check</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Consistency drives progressive overload. Keep your training chain unbroken.</div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button class="btn btn-primary" onclick="closeNotifModal()">Got It</button>
        </div>
      </div>
    </div>`;
}

function closeNotifModal() {
  closeSettingsModal();
}

// ─── 3D Parallax and Motion Handlers ─────────────────────────────────────────

// ─── Dedicated Training Calendar View ───────────────────────────────────────
function prevCalendarMonth() {
  if (state.calendarMonth === 0) {
    state.calendarMonth = 11;
    state.calendarYear -= 1;
  } else {
    state.calendarMonth -= 1;
  }
  render();
}

function nextCalendarMonth() {
  if (state.calendarMonth === 11) {
    state.calendarMonth = 0;
    state.calendarYear += 1;
  } else {
    state.calendarMonth += 1;
  }
  render();
}

function resetCalendarMonth() {
  const now = new Date();
  state.calendarYear = now.getFullYear();
  state.calendarMonth = now.getMonth();
  state.selectedCalendarDate = todayISO();
  render();
}

function selectCalendarDate(dateStr) {
  state.selectedCalendarDate = dateStr;
  render();
}

function renderCalendarView() {
  const year = state.calendarYear ?? new Date().getFullYear();
  const month = state.calendarMonth ?? new Date().getMonth();
  const todayStr = todayISO();
  const selectedDateStr = state.selectedCalendarDate || todayStr;

  const monthName = MONTH_NAMES[month];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const calendarCells = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr: dateStr
    });
  }

  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      dayNum: d,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  const sessionsByDate = {};
  (state.workoutSessions || []).forEach(s => {
    const datePart = (s.completed_at || s.started_at || '').substring(0, 10);
    if (datePart) {
      if (!sessionsByDate[datePart]) sessionsByDate[datePart] = [];
      sessionsByDate[datePart].push(s);
    }
  });

  const activeSplit = (state.splits || []).find(s => s.is_active === 1) || (state.splits || [])[0];
  const scheduleMap = {};
  if (activeSplit && activeSplit.schedule) {
    activeSplit.schedule.forEach(item => {
      scheduleMap[item.day_of_week] = item;
    });
  }

  let monthlyCompletedCount = 0;
  Object.keys(sessionsByDate).forEach(dStr => {
    if (dStr.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      monthlyCompletedCount += sessionsByDate[dStr].length;
    }
  });

  const cellsHtml = calendarCells.map(cell => {
    if (!cell.isCurrentMonth || !cell.dateStr) {
      return `<div class="calendar-day-cell other-month"><span class="calendar-day-num">${cell.dayNum}</span></div>`;
    }

    const dObj = new Date(cell.dateStr + 'T12:00:00');
    let dayOfWeek = dObj.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const isToday = cell.dateStr === todayStr;
    const isSelected = cell.dateStr === selectedDateStr;
    const completedList = sessionsByDate[cell.dateStr] || [];
    const hasCompleted = completedList.length > 0;
    const sched = scheduleMap[dayOfWeek];

    let badgeHtml = '';
    if (hasCompleted) {
      const topSession = completedList[0];
      badgeHtml = `<div class="calendar-day-badge calendar-day-badge-done">
                     ${renderIcon('check', 'cx-icon cx-icon-xs')} ${topSession.routine_name}
                   </div>`;
    } else if (sched) {
      if (sched.day_type === 'workout' && sched.workout_name) {
        badgeHtml = `<div class="calendar-day-badge calendar-day-badge-workout">${sched.workout_name}</div>`;
      } else {
        badgeHtml = `<div class="calendar-day-badge calendar-day-badge-rest">Rest</div>`;
      }
    }

    return `
      <div class="calendar-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasCompleted ? 'has-completed' : ''}" onclick="selectCalendarDate('${cell.dateStr}')">
        <div class="calendar-day-top">
          <span class="calendar-day-num">${cell.dayNum}</span>
          ${isToday ? `<span class="calendar-day-today-tag">TODAY</span>` : ''}
        </div>
        ${badgeHtml}
      </div>`;
  }).join('');

  const selDateObj = new Date(selectedDateStr + 'T12:00:00');
  const selDateFormatted = isNaN(selDateObj.getTime())
    ? selectedDateStr
    : selDateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let selDayOfWeek = selDateObj.getDay() - 1;
  if (selDayOfWeek === -1) selDayOfWeek = 6;
  const selSched = scheduleMap[selDayOfWeek];
  const selCompleted = sessionsByDate[selectedDateStr] || [];

  let selectedDayContent = '';
  if (selCompleted.length > 0) {
    selectedDayContent = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${selCompleted.map(s => `
          <div style="background:var(--surface-2); border:1px solid rgba(34,197,94,0.3); border-radius:var(--radius); padding:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h3 style="font-size:16px; font-weight:700; color:#ffffff;">${s.routine_name}</h3>
                <span class="badge badge-reps">Level ${s.level}</span>
                <span style="font-size:12px; font-weight:600; color:#10b981; display:flex; align-items:center; gap:4px;">${renderIcon('check', 'cx-icon cx-icon-xs cx-icon-inline')} Finished</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                Duration: ${Math.round((s.duration_sec || 0) / 60)} mins · Total Sets: ${s.completed_sets || 0} completed
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="openSessionDetailView('${s.session_uuid}')">
              View Breakdown ${renderIcon('arrowRight', 'cx-icon cx-icon-xs')}
            </button>
          </div>
        `).join('')}
      </div>`;
  } else if (selSched && selSched.day_type === 'workout' && selSched.workout_id) {
    const workout = (state.workouts || []).find(w => w.id === selSched.workout_id);
    selectedDayContent = `
      <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge" style="background:rgba(139,92,246,0.2); color:var(--accent);">${renderIcon('calendar', 'cx-icon cx-icon-xs cx-icon-inline')} Programmed</span>
            <h3 style="font-size:16px; font-weight:700; color:#ffffff;">${selSched.workout_name || 'Assigned Workout'}</h3>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">
            ${workout?.description || 'Daily calisthenics training session'} · ${workout?.exercises?.length || 6} exercises programmed
          </div>
        </div>
        <button class="btn btn-primary" onclick="startWorkoutFromId(${selSched.workout_id})">
          ${renderIcon('zap', 'cx-icon cx-icon-inline')} Start This Workout ${renderIcon('arrowRight', 'cx-icon cx-icon-sm')}
        </button>
      </div>`;
  } else {
    selectedDayContent = `
      <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; display:flex; align-items:center; gap:14px;">
        <span style="width:40px; height:40px; border-radius:50%; background:rgba(124,124,158,0.12); display:flex; align-items:center; justify-content:center;">
          ${renderIcon('moon', 'cx-icon cx-icon-muted')}
        </span>
        <div>
          <h4 style="font-size:14px; font-weight:700; color:#ffffff;">Rest & Active Recovery</h4>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Muscular adaptations and central nervous system recovery day. Focus on hydration and mobility.</p>
        </div>
      </div>`;
  }

  return `
    <div class="calendar-container">
      <div class="view-header">
        <h1 class="view-title">Training Calendar & Consistency</h1>
        <p class="view-subtitle">Track your training frequency, completed sessions, and scheduled weekly split.</p>
      </div>

      <div class="prs-stats-strip">
        <div class="home-metric-card">
          <div class="home-metric-top">
            <span class="home-metric-lbl">Monthly Workouts</span>
            <div class="home-metric-icon">${renderIcon('calendar', 'cx-icon cx-icon-lg cx-icon-accent')}</div>
          </div>
          <div class="home-metric-val">${monthlyCompletedCount}</div>
          <div class="home-metric-sub">Sessions completed in ${monthName}</div>
        </div>

        <div class="home-metric-card">
          <div class="home-metric-top">
            <span class="home-metric-lbl">Current Streak</span>
            <div class="home-metric-icon">${renderIcon('flame', 'cx-icon cx-icon-lg cx-icon-fire')}</div>
          </div>
          <div class="home-metric-val">${state.dashboardSummary?.streak_days || 0} Days</div>
          <div class="home-metric-sub">Daily training momentum</div>
        </div>

        <div class="home-metric-card">
          <div class="home-metric-top">
            <span class="home-metric-lbl">Active Split</span>
            <div class="home-metric-icon">${renderIcon('dumbbell', 'cx-icon cx-icon-lg cx-icon-cyan')}</div>
          </div>
          <div class="home-metric-val" style="font-size:18px;">${activeSplit?.name || 'Push Pull Legs'}</div>
          <div class="home-metric-sub">${activeSplit?.workout_days || 6} workout days / week</div>
        </div>

        <div class="home-metric-card">
          <div class="home-metric-top">
            <span class="home-metric-lbl">Total Volume</span>
            <div class="home-metric-icon">${renderIcon('trendingUp', 'cx-icon cx-icon-lg cx-icon-success')}</div>
          </div>
          <div class="home-metric-val">${state.dashboardSummary?.week_sets || 0} Sets</div>
          <div class="home-metric-sub">This week's volume</div>
        </div>
      </div>

      <div class="calendar-month-bar">
        <div class="calendar-month-title">
          ${renderIcon('calendar', 'cx-icon cx-icon-accent')}
          <span>${monthName} ${year}</span>
        </div>
        <div class="calendar-month-nav">
          <button class="btn btn-secondary btn-sm" onclick="prevCalendarMonth()">${renderIcon('chevronLeft', 'cx-icon cx-icon-xs cx-icon-inline')} Prev</button>
          <button class="btn btn-secondary btn-sm" onclick="resetCalendarMonth()">Today</button>
          <button class="btn btn-secondary btn-sm" onclick="nextCalendarMonth()">Next ${renderIcon('chevronRight', 'cx-icon cx-icon-xs cx-icon-inline')}</button>
        </div>
      </div>

      <div class="calendar-grid-card">
        <div class="calendar-weekdays-row">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>
        <div class="calendar-days-grid">
          ${cellsHtml}
        </div>
      </div>

      <div class="calendar-selected-day-card">
        <div class="calendar-selected-header">
          <div>
            <span style="font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase;">Selected Day</span>
            <h2 style="font-size:18px; font-weight:700; color:#ffffff; margin-top:2px;">${selDateFormatted}</h2>
          </div>
        </div>
        ${selectedDayContent}
      </div>
    </div>`;
}


// ─── Biomechanics & Technique Form Guide Modal ──────────────────────────────

let _guideSelectedMuscle = 'chest';
let _guideView = 'front'; // 'front' | 'back' | 'both'
let _guideCategory = 'all'; // 'all' | 'upper' | 'core' | 'lower'

const MUSCLE_ANATOMY_GUIDE = {
  chest: {
    key: 'chest',
    name: 'Chest / Pectorals',
    latin: 'Pectoralis Major & Minor',
    view: 'front',
    category: 'upper',
    movement_pattern: 'push_horizontal',
    function: 'Horizontal shoulder adduction, shoulder flexion, and internal rotation during pushing movements.',
    cue: 'Keep shoulder blades retracted and depressed; push the ground away with intentional chest contraction.',
    exercises: ['Standard Push-ups', 'Diamond Push-ups', 'Archer Push-ups', 'Decline Push-ups', 'Triceps Dips']
  },
  front_delts: {
    key: 'front_delts',
    name: 'Front Deltoids',
    latin: 'Anterior Deltoid',
    view: 'front',
    category: 'upper',
    movement_pattern: 'push_vertical',
    function: 'Shoulder flexion and overhead vertical pressing power; essential for handstands and pike push-ups.',
    cue: 'Keep forearms perpendicular to the floor and maintain slight external shoulder torque.',
    exercises: ['Pike Push-ups', 'Pike Push-ups Elevated', 'Handstand Push-up Progression', 'Standard Push-ups']
  },
  side_delts: {
    key: 'side_delts',
    name: 'Side Deltoids',
    latin: 'Lateral Deltoid',
    view: 'front',
    category: 'upper',
    movement_pattern: 'isolation_lateral',
    function: 'Shoulder abduction; creates lateral shoulder width, aesthetic frame, and upper V-taper symmetry.',
    cue: 'Lead the movement with elbows slightly higher than hands with a slight torso lean.',
    exercises: ['Lateral Raise', 'Pike Push-ups', 'Wall Angels', 'Archer Push-ups']
  },
  rear_delts: {
    key: 'rear_delts',
    name: 'Rear Deltoids',
    latin: 'Posterior Deltoid',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_horizontal',
    function: 'Horizontal shoulder abduction and external rotation; vital for posture and shoulder health.',
    cue: 'Pull elbows wide and squeeze shoulder blades back without excessively shrugging traps.',
    exercises: ['Face Pulls', 'Prone Y-raises', 'Pull-ups Wide Grip', 'Inverted Rows', 'Wall Angels']
  },
  biceps: {
    key: 'biceps',
    name: 'Biceps Brachii',
    latin: 'Biceps Brachii & Brachialis',
    view: 'front',
    category: 'upper',
    movement_pattern: 'pull_vertical',
    function: 'Elbow flexion and forearm supination; heavily recruited in underhand pulling and front levers.',
    cue: 'Achieve a full dead-hang stretch at the bottom and pull chin cleanly over the bar.',
    exercises: ['Chin-ups', 'Close-Grip Chin-ups', 'Commando Pull-ups', 'Negative Pull-ups', 'Biceps Curls']
  },
  triceps: {
    key: 'triceps',
    name: 'Triceps Brachii',
    latin: 'Triceps Brachii (Long, Lateral, Medial)',
    view: 'back',
    category: 'upper',
    movement_pattern: 'push_dip',
    function: 'Elbow extension and lockout force across all pushing, dipping, and handstand progressions.',
    cue: 'Squeeze triceps hard at lockout without locking out elbow joint aggressively.',
    exercises: ['Triceps Dips', 'Diamond Push-ups', 'Handstand Push-up Progression', 'Standard Push-ups']
  },
  forearms: {
    key: 'forearms',
    name: 'Forearms & Grip',
    latin: 'Flexor & Extensor Carpi Complex',
    view: 'both',
    category: 'upper',
    movement_pattern: 'hanging',
    function: 'Crush grip strength, wrist stabilization, and endurance on pull-up bars and rings.',
    cue: 'Wrap thumb securely around bar and squeeze with maximum grip tension throughout each rep.',
    exercises: ['Dead Hang', 'Pull-ups', 'Chin-ups', 'Hanging Knee Raises', 'L-sit Hang']
  },
  abs: {
    key: 'abs',
    name: 'Abs (Rectus Abdominis)',
    latin: 'Rectus Abdominis (6-Pack)',
    view: 'front',
    category: 'core',
    movement_pattern: 'core',
    function: 'Spinal flexion, pelvic stabilization, and anti-extension core rigidity in hollow body holds.',
    cue: 'Lock in posterior pelvic tilt (tuck tailbone under) and pull belly button firmly toward spine.',
    exercises: ['Hanging Leg Raises', 'Hanging Knee Raises', 'Hollow Body Hold', 'Plank', 'L-sit Hang']
  },
  obliques: {
    key: 'obliques',
    name: 'Obliques & Serratus',
    latin: 'Internal/External Obliques & Serratus',
    view: 'front',
    category: 'core',
    movement_pattern: 'core',
    function: 'Lateral trunk flexion, rotational power, and ribcage stabilization during asymmetrical holds.',
    cue: 'Keep hips stacked vertically during side planks; rotate with control from thoracic spine.',
    exercises: ['Side Plank', 'Russian Twists', 'Hanging Leg Raises', 'L-sit Hang', 'Archer Push-ups']
  },
  lats: {
    key: 'lats',
    name: 'Lats (V-Taper)',
    latin: 'Latissimus Dorsi',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_vertical',
    function: 'Shoulder adduction, extension, and scapular depression in vertical pulling.',
    cue: 'Drive elbows down and back toward your back pockets rather than pulling with the hands.',
    exercises: ['Pull-ups Wide Grip', 'Pull-ups', 'Chin-ups', 'Dead Hang', 'Negative Pull-ups']
  },
  traps: {
    key: 'traps',
    name: 'Trapezius',
    latin: 'Trapezius (Upper, Middle, Lower)',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_horizontal',
    function: 'Scapular elevation, retraction, upward rotation, and upper spine structural stability.',
    cue: 'Retract scapulae smoothly; avoid tense upper neck shrugging during pulling movements.',
    exercises: ['Scapular Pulls', 'Prone Y-raises', 'Face Pulls', 'Pike Push-ups Elevated', 'Wall Angels']
  },
  lower_back: {
    key: 'lower_back',
    name: 'Lower Back',
    latin: 'Erector Spinae Group',
    view: 'back',
    category: 'core',
    movement_pattern: 'hinge',
    function: 'Spinal extension, posture retention, and posterior chain core endurance.',
    cue: 'Maintain neutral lumbar alignment and brace transverse abdominis simultaneously.',
    exercises: ['Single-leg Glute Bridges', 'Glute Bridges Single Leg', 'Russian Twists', 'Superman Hold']
  },
  glutes: {
    key: 'glutes',
    name: 'Gluteus Maximus',
    latin: 'Gluteus Maximus & Medius',
    view: 'back',
    category: 'lower',
    movement_pattern: 'squat',
    function: 'Hip extension, abduction, external rotation, and explosive single-leg drive.',
    cue: 'Push forcefully through mid-foot and heel, squeezing glutes hard at the top of each rep.',
    exercises: ['Bulgarian Split Squats', 'Single-leg Glute Bridges', 'Walking Lunges', 'Pistol Squats']
  },
  quads: {
    key: 'quads',
    name: 'Quadriceps',
    latin: 'Rectus Femoris, Vastus Lateralis/Medialis',
    view: 'front',
    category: 'lower',
    movement_pattern: 'squat',
    function: 'Knee extension and eccentric deceleration in squats, lunges, and wall sits.',
    cue: 'Keep knee tracking over second toe; maintain tall upright chest posture.',
    exercises: ['Pistol Squat Progression', 'Bulgarian Split Squats', 'Jump Squats', 'Wall Sit', 'Walking Lunges']
  },
  hamstrings: {
    key: 'hamstrings',
    name: 'Hamstrings',
    latin: 'Biceps Femoris & Semitendinosus',
    view: 'back',
    category: 'lower',
    movement_pattern: 'hinge',
    function: 'Knee flexion, hip extension, and decelerating forward lunge momentum.',
    cue: 'Control the eccentric descent to feel loaded hamstring tension before driving upward.',
    exercises: ['Single-leg Glute Bridges', 'Glute Bridges Single Leg', 'Bulgarian Split Squats', 'Walking Lunges']
  },
  calves: {
    key: 'calves',
    name: 'Calves & Tibialis',
    latin: 'Gastrocnemius, Soleus & Tibialis Anterior',
    view: 'both',
    category: 'lower',
    movement_pattern: 'isolation_calf',
    function: 'Ankle plantarflexion and dorsiflexion for balance, sprint propulsion, and jump landings.',
    cue: 'Full stretch at the bottom followed by a 1-second squeeze at the apex on balls of feet.',
    exercises: ['Calf Raises', 'Standing Calf Raises', 'Jump Squats', 'Pistol Squats', 'Walking Lunges']
  }
};

function getExercisesForMuscle(muscleKey) {
  const normKey = (muscleKey || '').toLowerCase().replace(/[- ]/g, '_');
  const allDbExercises = (typeof state !== 'undefined' && Array.isArray(state.exercises) && state.exercises.length)
    ? state.exercises
    : [];

  const results = [];
  const seenNames = new Set();

  // 1. Query database exercises
  allDbExercises.forEach(ex => {
    const exName = ex.name || ex.exercise_name || '';
    const pattern = ex.movement_pattern || '';
    const m = (typeof window !== 'undefined' && window.MuscleMap)
      ? window.MuscleMap.getExerciseMuscles(exName, pattern)
      : { primary: [], secondary: [] };

    const p = (m.primary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
    const s = (m.secondary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));

    const isPrimary = p.includes(normKey) || (normKey === 'chest' && p.some(k => k.includes('chest'))) || (normKey === 'core' && (p.includes('abs') || p.includes('obliques')));
    const isSecondary = s.includes(normKey) || (normKey === 'chest' && s.some(k => k.includes('chest'))) || (normKey === 'core' && (s.includes('abs') || s.includes('obliques')));

    if (isPrimary || isSecondary) {
      results.push({
        id: ex.id,
        name: exName,
        day: ex.day || 'Custom Split',
        type: ex.type === 'duration' ? 'Hold Time' : 'Reps Target',
        pattern: ex.movement_pattern ? ex.movement_pattern.replace(/_/g, ' ') : '',
        role: isPrimary ? 'primary' : 'secondary',
        roleLabel: isPrimary ? 'Primary' : 'Stabilizer'
      });
      seenNames.add(exName.toLowerCase());
    }
  });

  // 2. Supplement from static map if any are missing
  if (typeof window !== 'undefined' && window.MuscleMap && window.MuscleMap.EXERCISE_MUSCLE_MAP) {
    Object.entries(window.MuscleMap.EXERCISE_MUSCLE_MAP).forEach(([exName, mapping]) => {
      if (!seenNames.has(exName.toLowerCase())) {
        const p = (mapping.primary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
        const s = (mapping.secondary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
        const isPrimary = p.includes(normKey);
        const isSecondary = s.includes(normKey);
        if (isPrimary || isSecondary) {
          results.push({
            id: null,
            name: exName,
            day: 'Catalog',
            type: 'Reps Target',
            pattern: '',
            role: isPrimary ? 'primary' : 'secondary',
            roleLabel: isPrimary ? 'Primary' : 'Stabilizer'
          });
          seenNames.add(exName.toLowerCase());
        }
      }
    });
  }

  // Sort: Primary agonists first, then by routine day
  results.sort((a, b) => {
    if (a.role === 'primary' && b.role !== 'primary') return -1;
    if (a.role !== 'primary' && b.role === 'primary') return 1;
    return a.day.localeCompare(b.day);
  });

  return results;
}

function selectGuideMuscle(muscleKey) {
  _guideSelectedMuscle = muscleKey;
  const muscleData = MUSCLE_ANATOMY_GUIDE[muscleKey];

  if (muscleData) {
    // Automatically switch view if selected muscle is not visible in current view
    if (_guideView !== 'both') {
      if (muscleData.view === 'front' && _guideView !== 'front') {
        _guideView = 'front';
      } else if (muscleData.view === 'back' && _guideView !== 'back') {
        _guideView = 'back';
      }
    }
  }

  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function setGuideView(view) {
  _guideView = view;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function setGuideCategory(cat) {
  _guideCategory = cat;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function bindGuideSvgInteractions() {
  const container = document.getElementById('bio-guide-svg-stage');
  if (!container) return;

  const parts = container.querySelectorAll('.muscle, .cx-muscle-part, [data-muscle]');
  parts.forEach(p => {
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = p.dataset.muscle || p.id || '';
      const norm = m.replace(/_left|_right|_lateral|_medial|_upper|_mid|_lower|_front|_back/g, '');
      if (MUSCLE_ANATOMY_GUIDE[norm]) {
        selectGuideMuscle(norm);
      } else if (MUSCLE_ANATOMY_GUIDE[m]) {
        selectGuideMuscle(m);
      }
    });
  });
}

function setBiomechanicsTab(tab) {
  _biomechanicsTab = tab;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody) {
    modalBody.innerHTML = renderBiomechanicsTabContent(tab);
    if (tab === 'anatomy') {
      bindGuideSvgInteractions();
    }
  }
  document.querySelectorAll('.bio-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function renderBiomechanicsTabContent(tab) {
  if (tab === 'anatomy') {
    const selected = MUSCLE_ANATOMY_GUIDE[_guideSelectedMuscle] || MUSCLE_ANATOMY_GUIDE.chest;
    const activeMuscles = [selected.key];

    // Filter muscle chips based on category
    const allMuscles = Object.values(MUSCLE_ANATOMY_GUIDE);
    const filteredMuscles = allMuscles.filter(m => {
      if (_guideCategory === 'all') return true;
      return m.category === _guideCategory;
    });

    // Generate chips HTML
    const chipsHtml = filteredMuscles.map(m => {
      const isAct = m.key === selected.key;
      return `
        <button class="bio-muscle-chip ${isAct ? 'active' : ''}" onclick="selectGuideMuscle('${m.key}')" title="Click to view ${m.name}">
          <span class="bio-chip-dot"></span>
          <span>${m.name}</span>
        </button>
      `;
    }).join('');

    // Generate SVG Diagram based on current view
    let svgHtml = '';
    if (typeof window !== 'undefined' && window.MuscleMap) {
      if (_guideView === 'front') {
        svgHtml = `
          <div style="width:100%; max-width:210px; height:310px; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Anterior (Front View)</span>
            ${window.MuscleMap.renderFrontSVG(activeMuscles, [])}
          </div>`;
      } else if (_guideView === 'back') {
        svgHtml = `
          <div style="width:100%; max-width:210px; height:310px; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Posterior (Back View)</span>
            ${window.MuscleMap.renderBackSVG(activeMuscles, [])}
          </div>`;
      } else {
        svgHtml = `
          <div style="display:flex; justify-content:center; align-items:center; gap:16px; width:100%; height:310px;">
            <div style="width:48%; max-width:130px; display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:9px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:2px;">Front</span>
              ${window.MuscleMap.renderFrontSVG(activeMuscles, [])}
            </div>
            <div style="width:48%; max-width:130px; display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:9px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:2px;">Back</span>
              ${window.MuscleMap.renderBackSVG(activeMuscles, [])}
            </div>
          </div>`;
      }
    }

    // Database exercises targeting this muscle
    const dbExercises = getExercisesForMuscle(selected.key);
    const dbExListHtml = dbExercises.length ? dbExercises.map(ex => `
      <div class="bio-ex-item" title="${ex.name} (${ex.day})">
        <div class="bio-ex-info">
          <span class="bio-ex-name">${ex.name}</span>
          <div class="bio-ex-meta">
            <span class="bio-ex-split-tag">${ex.day}</span>
            <span>·</span>
            <span>${ex.type}</span>
            ${ex.pattern ? `<span>·</span><span style="text-transform:capitalize;">${ex.pattern}</span>` : ''}
          </div>
        </div>
        <span class="bio-ex-role ${ex.role}">
          <span style="width:5px; height:5px; border-radius:50%; background:currentColor;"></span>
          ${ex.roleLabel}
        </span>
      </div>
    `).join('') : `
      <div style="padding:14px; text-align:center; color:var(--text-muted); font-size:12px; background:rgba(255,255,255,0.02); border-radius:8px;">
        No specific exercises assigned in current split for this group.
      </div>
    `;

    return `
      <div class="bio-guide-container">
        <!-- Controls: View Switcher & Category Filter -->
        <div class="bio-guide-controls-row">
          <div class="bio-guide-view-tabs" role="tablist" aria-label="Anatomical View Selection">
            <button class="bio-guide-view-btn ${_guideView === 'front' ? 'active' : ''}" onclick="setGuideView('front')">
              Front (Anterior)
            </button>
            <button class="bio-guide-view-btn ${_guideView === 'back' ? 'active' : ''}" onclick="setGuideView('back')">
              Back (Posterior)
            </button>
            <button class="bio-guide-view-btn ${_guideView === 'both' ? 'active' : ''}" onclick="setGuideView('both')">
              Both Views
            </button>
          </div>

          <div class="prs-filter-pills" style="margin:0;">
            <button class="prs-filter-btn ${_guideCategory === 'all' ? 'active' : ''}" onclick="setGuideCategory('all')">All</button>
            <button class="prs-filter-btn ${_guideCategory === 'upper' ? 'active' : ''}" onclick="setGuideCategory('upper')">Upper Body</button>
            <button class="prs-filter-btn ${_guideCategory === 'core' ? 'active' : ''}" onclick="setGuideCategory('core')">Core</button>
            <button class="prs-filter-btn ${_guideCategory === 'lower' ? 'active' : ''}" onclick="setGuideCategory('lower')">Lower Body</button>
          </div>
        </div>

        <!-- Selectable Muscle Chips / Pills List -->
        <div class="bio-chips-wrapper" role="region" aria-label="Selectable Muscle Groups">
          ${chipsHtml}
        </div>

        <!-- Main Grid: SVG Figure on Left + Biomechanics Info & DB Exercises on Right -->
        <div class="bio-guide-main-grid">
          <!-- Diagram Stage (Clickable Vector Anatomy) -->
          <div class="bio-diagram-card" id="bio-guide-svg-stage" title="Click any muscle directly on the diagram to inspect">
            ${svgHtml}
            <div style="font-size:11px; color:var(--text-dim); margin-top:8px; display:flex; align-items:center; gap:5px;">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Tip: Click any muscle in diagram to inspect</span>
            </div>
          </div>

          <!-- Biomechanics Detail & Exercise Discovery Card -->
          <div class="bio-details-card">
            <div class="bio-detail-header">
              <div>
                <h3 class="bio-detail-title">${selected.name}</h3>
                <span class="bio-detail-latin">${selected.latin}</span>
              </div>
              <span class="bio-detail-badge">${selected.view.toUpperCase()} VIEW · ${selected.category.toUpperCase()}</span>
            </div>

            <div>
              <div class="bio-field-label">Anatomical Action & Movement Biomechanics</div>
              <p class="bio-field-text">${selected.function}</p>
            </div>

            <div>
              <div class="bio-field-label">Mind-Muscle Coaching Cue</div>
              <p class="bio-field-text" style="color:var(--accent); font-weight:500;">
                "${selected.cue}"
              </p>
            </div>

            <!-- Targeted Exercises in CalistheniX Database -->
            <div class="bio-db-ex-section">
              <div class="bio-db-ex-header">
                <span class="bio-field-label" style="margin:0;">Targeting Exercises in Database (${dbExercises.length})</span>
                <span style="font-size:11px; color:var(--text-dim);">Live Routine Integration</span>
              </div>
              <div class="bio-ex-list">
                ${dbExListHtml}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else if (tab === 'stages') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Step-by-step movement stages breakdown: Maintain a strict plank from head to heels, descend under control to a full hover, and push explosively through the palms while keeping elbows tucked.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/movement-stages.svg" alt="Exercise Form Execution Stages" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else if (tab === 'tempo') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Biomechanical tempo and posture analysis: Slower eccentric lowering (3–4s) builds maximum tendon strength and hypertrophic tension, while avoiding sagging hips or compromised spinal alignment.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/tempo-guide.svg" alt="Tempo & Posture Standards" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Hand placement & grip width comparison: Adjusting your grip alters the primary torque vector between chest pectoralis major, anterior deltoids, and triceps brachii.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/grip-guide.svg" alt="Hand Placement Grip Width Guide" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  }
}

function openBiomechanicsModal(initialTab = 'anatomy', selectedMuscle = null) {
  if (selectedMuscle && MUSCLE_ANATOMY_GUIDE[selectedMuscle]) {
    _guideSelectedMuscle = selectedMuscle;
    const mData = MUSCLE_ANATOMY_GUIDE[selectedMuscle];
    if (mData && mData.view !== 'both') {
      _guideView = mData.view;
    }
  }

  _biomechanicsTab = initialTab || 'anatomy';

  let modal = document.getElementById('biomechanics-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'biomechanics-modal';
    modal.className = 'modal-backdrop';
    modal.onclick = (e) => {
      if (e.target === modal) closeBiomechanicsModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:860px; width:94%;" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <span style="font-size:11px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.1em;">Calisthenics Biomechanics</span>
          <h2 class="modal-title" style="margin-top:2px;">Anatomy & Technique Explorer</h2>
        </div>
        <button class="modal-close-btn" onclick="closeBiomechanicsModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
      </div>

      <div class="prs-filter-pills" style="margin:16px 0 14px;">
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'anatomy' ? 'active' : ''}" data-tab="anatomy" onclick="setBiomechanicsTab('anatomy')">Targeted Anatomy Explorer</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'stages' ? 'active' : ''}" data-tab="stages" onclick="setBiomechanicsTab('stages')">Movement Stages</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'tempo' ? 'active' : ''}" data-tab="tempo" onclick="setBiomechanicsTab('tempo')">Tempo & Posture</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'grip' ? 'active' : ''}" data-tab="grip" onclick="setBiomechanicsTab('grip')">Grip & Placement</button>
      </div>

      <div id="biomechanics-modal-body" style="max-height:72vh; overflow-y:auto; padding-right:4px;">
        ${renderBiomechanicsTabContent(_biomechanicsTab)}
      </div>
    </div>`;

  modal.style.display = 'flex';
  if (document.body && document.body.style) document.body.style.overflow = 'hidden';

  if (_biomechanicsTab === 'anatomy') {
    bindGuideSvgInteractions();
  }
}

function closeBiomechanicsModal() {
  const modal = document.getElementById('biomechanics-modal');
  if (modal) modal.style.display = 'none';
  if (document.body && document.body.style) document.body.style.overflow = '';
}

// Global exports for window access
if (typeof window !== 'undefined') {
  window.openBiomechanicsModal = openBiomechanicsModal;
  window.closeBiomechanicsModal = closeBiomechanicsModal;
  window.selectGuideMuscle = selectGuideMuscle;
  window.setGuideView = setGuideView;
  window.setGuideCategory = setGuideCategory;
  window.getExercisesForMuscle = getExercisesForMuscle;
  window.MUSCLE_ANATOMY_GUIDE = MUSCLE_ANATOMY_GUIDE;
}


// ─── Data Export (Phase 1 F6) ────────────────────────────────────────────────
async function exportData() {
  try {
    const data = await API.getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calisthenix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export downloaded');
  } catch (e) {
    showToast(`Export failed: ${e.message}`, true);
  }
}

async function importData(inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const jsonContent = JSON.parse(e.target.result);
      const res = await API.importBackupData(jsonContent);
      showToast(`Import successful! ${res.imported_logs || 0} sets & ${res.imported_sessions || 0} sessions restored.`);
      await loadDashboardSummary();
      await loadExercises();
      render();
    } catch (err) {
      showToast(`Import error: ${err.message}`, true);
    } finally {
      inputEl.value = '';
    }
  };
  reader.readAsText(file);
}


function onCustomTypeChange(sel) {
  const isHold = sel.value === 'duration';
  const label = document.getElementById('custom-prog-target-label');
  const input = document.getElementById('custom-prog-target-input');
  if (!label || !input) return;
  if (isHold) {
    label.innerHTML   = 'Progression Target Hold (sec) <span class="opt">opt</span>';
    input.name        = 'progression_target_duration';
    input.placeholder = 'e.g. 30';
  } else {
    label.innerHTML   = 'Progression Target Reps <span class="opt">opt</span>';
    input.name        = 'progression_target_reps';
    input.placeholder = 'e.g. 15';
  }
}

async function handleCreateCustomExercise(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const type = data.get('type');
  const payload = {
    name: (data.get('name') || '').trim(),
    day:  data.get('day'),
    type: type,
    progression_sessions_needed: parseInt(data.get('progression_sessions_needed'), 10) || 2,
  };
  if (type === 'duration') {
    const dur = parseInt(data.get('progression_target_duration'), 10);
    if (!isNaN(dur)) payload.progression_target_duration = dur;
  } else {
    const reps = parseInt(data.get('progression_target_reps'), 10);
    if (!isNaN(reps)) payload.progression_target_reps = reps;
  }

  try {
    const newEx = await API.createExercise(payload);
    await loadExercises();
    showToast(`Created "${newEx.name}"`);
    form.reset();
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

