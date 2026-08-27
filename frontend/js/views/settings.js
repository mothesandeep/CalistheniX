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
let _activeMuscleView = 'front';
let _currentWorkoutMuscles = { label: 'Legs, Glutes, Core', frontMuscles: ['quads', 'abs'], backMuscles: ['glutes', 'calves'] };


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
let _biomechanicsTab = 'anatomy'; // 'anatomy' | 'stages' | 'tempo' | 'grip'

function setBiomechanicsTab(tab) {
  _biomechanicsTab = tab;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody) {
    modalBody.innerHTML = renderBiomechanicsTabContent(tab);
  }
  document.querySelectorAll('.bio-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function renderBiomechanicsTabContent(tab) {
  if (tab === 'anatomy') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Targeted muscle groups with dynamic anatomical activation. Highlighted regions indicate primary agonists and secondary stabilizers for each training split.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px;">
          <div class="card" style="padding:18px; text-align:center; background:var(--surface-2);">
            <span style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; margin-bottom:12px; display:block;">Upper Body (Push & Pull)</span>
            ${renderDualMuscleBodySvg({ label: 'Chest, Back, Arms', frontMuscles: ['chest', 'shoulders', 'biceps', 'triceps', 'abs'], backMuscles: ['upper_back', 'lats', 'triceps'] })}
          </div>
          <div class="card" style="padding:18px; text-align:center; background:var(--surface-2);">
            <span style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; margin-bottom:12px; display:block;">Lower Body (Legs & Posterior)</span>
            ${renderDualMuscleBodySvg({ label: 'Quads, Glutes, Calves', frontMuscles: ['quads', 'abs'], backMuscles: ['glutes', 'hamstrings', 'calves'] })}
          </div>
        </div>
      </div>`;
  } else if (tab === 'stages') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Step-by-step movement stages breakdown: Maintain a strict plank from head to heels, descend under control to a full hover, and push explosively through the palms while keeping elbows tucked.
        </p>
        <div class="card" style="padding:16px; background:var(--surface-2); text-align:center;">
          <img src="assets/pushup_form.jpg" alt="Exercise Form Execution Stages" style="width:100%; max-height:360px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else if (tab === 'tempo') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Biomechanical tempo and posture analysis: Slower eccentric lowering (3–4s) builds maximum tendon strength and hypertrophic tension, while avoiding sagging hips or compromised spinal alignment.
        </p>
        <div class="card" style="padding:16px; background:var(--surface-2); text-align:center;">
          <img src="assets/tempo_guide.jpg" alt="Tempo & Posture Standards" style="width:100%; max-height:360px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Hand placement & grip width comparison: Adjusting your grip alters the primary torque vector between chest pectoralis major, anterior deltoids, and triceps brachii.
        </p>
        <div class="card" style="padding:16px; background:var(--surface-2); text-align:center;">
          <img src="assets/grip_guide.jpg" alt="Hand Placement Grip Width Guide" style="width:100%; max-height:360px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  }
}

function openBiomechanicsModal() {
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
    <div class="modal-card" style="max-width:820px; width:92%;" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <span style="font-size:11px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.1em;">Calisthenics Biomechanics</span>
          <h2 class="modal-title" style="margin-top:2px;">Anatomy & Technique Guide</h2>
        </div>
        <button class="modal-close-btn" onclick="closeBiomechanicsModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
      </div>

      <div class="prs-filter-pills" style="margin:16px 0 14px;">
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'anatomy' ? 'active' : ''}" data-tab="anatomy" onclick="setBiomechanicsTab('anatomy')">Targeted Anatomy</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'stages' ? 'active' : ''}" data-tab="stages" onclick="setBiomechanicsTab('stages')">Movement Stages</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'tempo' ? 'active' : ''}" data-tab="tempo" onclick="setBiomechanicsTab('tempo')">Tempo & Posture</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'grip' ? 'active' : ''}" data-tab="grip" onclick="setBiomechanicsTab('grip')">Grip & Placement</button>
      </div>

      <div id="biomechanics-modal-body" style="max-height:68vh; overflow-y:auto; padding-right:6px;">
        ${renderBiomechanicsTabContent(_biomechanicsTab)}
      </div>
    </div>`;

  modal.style.display = 'flex';
  if (document.body && document.body.style) document.body.style.overflow = 'hidden';
}

function closeBiomechanicsModal() {
  const modal = document.getElementById('biomechanics-modal');
  if (modal) modal.style.display = 'none';
  if (document.body && document.body.style) document.body.style.overflow = '';
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

