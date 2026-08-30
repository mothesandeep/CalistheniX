/**
 * CalistheniX — Dedicated Training Calendar View
 */

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

if (typeof window !== 'undefined') {
  window.prevCalendarMonth = prevCalendarMonth;
  window.nextCalendarMonth = nextCalendarMonth;
  window.resetCalendarMonth = resetCalendarMonth;
  window.selectCalendarDate = selectCalendarDate;
  window.renderCalendarView = renderCalendarView;
}
