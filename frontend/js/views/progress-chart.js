/**
 * CalistheniX — Progress & Analytics Chart View
 */

function computeProgress(ex, logs, mode = 'best') {
  if (!ex || !logs || !logs.length) return [];

  // Group raw log rows by calendar day (ISO timestamp, slice to YYYY-MM-DD)
  const byDate = {};
  for (const log of logs) {
    const date = (log.timestamp || '').slice(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayLogs]) => {
      let metric;
      if (ex.type === 'duration') {
        if (mode === 'volume') {
          // Total hold duration in the session (sum in seconds)
          metric = dayLogs.reduce((sum, l) => sum + (l.duration_sec || 0), 0);
        } else {
          // Best (max) hold duration in the session, in seconds.
          metric = Math.max(...dayLogs.map(l => l.duration_sec ?? 0));
        }
      } else {
        if (mode === 'volume') {
          // Estimated volume: sum of reps × weight_kg across all sets (or reps if bodyweight)
          metric = dayLogs.reduce((sum, l) => {
            const vol = l.weight_kg ? (l.reps || 0) * l.weight_kg : (l.reps || 0);
            return sum + vol;
          }, 0);
        } else {
          // Best set: max reps in the session
          metric = Math.max(...dayLogs.map(l => l.reps ?? 0));
        }
      }
      return { date, metric };
    });
}

// Derive the three numbers shown in the stat row above the chart.
function computeStats(points) {
  if (!points.length) return null;

  const current = points[points.length - 1].metric;

  // Value from the session closest to (but not after) 14 days ago.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const pastPoints = points.filter(p => p.date <= cutoff);
  const past = pastPoints.length ? pastPoints[pastPoints.length - 1].metric : null;

  const pct = (past !== null && past > 0)
    ? Math.round((current - past) / past * 100)
    : null;

  return { current, past, pct };
}

// Parse a <form> into a payload object, coercing numeric fields and
// converting empty strings to null on nullable fields.

// ─── Screen 5: Progress & Insights View ─────────────────────────────────────

function renderProgressView() {
  const selectedExId = state.historyExerciseId || (state.exercises[0]?.id ?? null);
  const ex = getExercise(selectedExId);

  const exOptionsHtml = state.exercises.map(e => `
    <option value="${e.id}" ${e.id === selectedExId ? 'selected' : ''}>
      ${e.name} (${e.type === 'duration' ? 'Hold' : 'Reps'})
    </option>
  `).join('');

  const mode = state.historyMetricMode || 'best';
  const points = computeProgress(ex, state.historyLogs || [], mode);
  const stats = computeStats(points);
  const isHold = ex?.type === 'duration';
  const unit = isHold ? 's' : (mode === 'volume' ? ' vol' : ' reps');

  let statCardsHtml = '';
  if (stats) {
    const { current, past, pct } = stats;
    const pctStr = pct !== null ? `${pct >= 0 ? '+' : ''}${pct}%` : '—';

    statCardsHtml = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:20px;">
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Current</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:var(--text); margin-top:2px;">${current}${unit}</div>
        </div>
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">2 Wks Ago</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:var(--text); margin-top:2px;">${past !== null ? past + unit : '—'}</div>
        </div>
        <div class="card" style="padding:14px; text-align:center;">
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">4-Wk Trend</span>
          <div class="mono" style="font-size:22px; font-weight:800; color:${pct >= 0 ? '#22c55e' : 'var(--text-muted)'}; margin-top:2px;">${pctStr}</div>
        </div>
      </div>`;
  }

  // Natural Language Insight Box
  let insightText = 'Log a few more workouts to unlock explainable performance insights.';
  if (stats && stats.pct !== null) {
    if (stats.pct > 0) {
      insightText = `Great progress! Your ${mode === 'best' ? 'best performance' : 'training volume'} improved by +${stats.pct}% over the last 2 weeks.`;
    } else if (stats.pct === 0) {
      insightText = `Consistent baseline! Performance is stable across your recorded sessions.`;
    } else {
      insightText = `Volume adjusted down by ${stats.pct}% — recovery is an essential part of supercompensation.`;
    }
  }

  const insightBoxHtml = `
    <div style="background:rgba(124,106,247,0.08); border:1px solid rgba(124,106,247,0.25); border-radius:var(--radius); padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
      <span>${renderIcon('lightbulb', 'cx-icon cx-icon-lg cx-icon-gold')}</span>
      <div style="font-size:13px; color:var(--text);">${insightText}</div>
    </div>`;

  const chartHtml = points.length > 0
    ? `<div class="chart-wrap" style="height:240px; position:relative;"><canvas id="history-canvas"></canvas></div>`
    : `<div class="empty-state">No workout logs recorded yet for ${ex?.name || 'this exercise'}. Complete a session to see performance trends.</div>`;

  return `
    <div class="progress-screen">
      <div class="view-header">
        <h1 class="view-title">Progress & Insights</h1>
        <p class="view-subtitle">Track progressive overload, performance trends, and personal bests.</p>
      </div>

      <div class="card" style="padding:16px; margin-bottom:20px;">
        <label class="form-label" style="margin-bottom:6px;">Select Exercise to Analyze</label>
        <select class="form-input form-select" onchange="openHistoryView(parseInt(this.value, 10))">
          ${exOptionsHtml}
        </select>
      </div>

      ${insightBoxHtml}
      ${statCardsHtml}

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="justify-content:space-between; align-items:center;">
          <span class="card-title">${ex?.name || 'Movement'} Trend</span>
          <div class="metric-toggle-group">
            <button class="metric-toggle-btn ${mode === 'best' ? 'active' : ''}" onclick="setHistoryMetricMode('best')">
              ${isHold ? 'Best Hold' : 'Best Set'}
            </button>
            <button class="metric-toggle-btn ${mode === 'volume' ? 'active' : ''}" onclick="setHistoryMetricMode('volume')">
              ${isHold ? 'Total Hold' : 'Total Volume'}
            </button>
          </div>
        </div>
        <div class="card-body">
          ${chartHtml}
        </div>
      </div>

      ${typeof renderPersonalRecordsCard === 'function' ? renderPersonalRecordsCard(state.dashboardRecords) : ''}
    </div>`;
}

async function openHistoryView(exerciseId) {
  state.historyExerciseId = exerciseId;
  state.view = 'progress';
  window.location.hash = `history-${exerciseId}`;
  try {
    state.historyLogs = await API.getExerciseLogs(exerciseId);
  } catch (e) {
    state.historyLogs = [];
  }
  render();
}

function setHistoryMetricMode(mode) {
  state.historyMetricMode = mode;
  render();
}

function buildHistoryChart() {
  const canvas = document.getElementById('history-canvas');
  if (!canvas || !window.Chart) return;

  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }

  const selectedExId = state.historyExerciseId || (state.exercises[0]?.id ?? null);
  const ex = getExercise(selectedExId);
  if (!ex) return;

  const mode = state.historyMetricMode || 'best';
  const points = computeProgress(ex, state.historyLogs || [], mode);
  if (!points.length) return;

  const isHold = ex.type === 'duration';
  const labels = points.map(p => {
    const d = new Date(p.date);
    return isNaN(d.getTime()) ? p.date : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });
  const dataValues = points.map(p => p.metric);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(124, 106, 247, 0.45)');
  gradient.addColorStop(1, 'rgba(124, 106, 247, 0.0)');

  _chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: mode === 'best' ? (isHold ? 'Best Hold (sec)' : 'Best Reps') : (isHold ? 'Total Hold (sec)' : 'Volume'),
        data: dataValues,
        borderColor: '#7c6af7',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#181e2e',
          borderColor: '#2e3852',
          borderWidth: 1,
          titleColor: '#e8edf8',
          bodyColor: '#a1adc7',
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(46, 56, 82, 0.4)' },
          ticks: { color: '#6e7d9c', font: { size: 11, family: 'Inter' } }
        },
        y: {
          grid: { color: 'rgba(46, 56, 82, 0.4)' },
          ticks: { color: '#6e7d9c', font: { size: 11, family: 'Inter' }, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.openHistoryView = openHistoryView;
  window.setHistoryMetricMode = setHistoryMetricMode;
  window.buildHistoryChart = buildHistoryChart;
}



