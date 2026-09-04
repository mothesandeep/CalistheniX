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

function getMainExercises() {
  const all = state.exercises || [];
  const filtered = all.filter(isMainExercise);
  return filtered.length > 0 ? filtered : all;
}

// ─── Screen 5: Progress & Insights View ─────────────────────────────────────

function renderProgressView() {
  const mainExercises = getMainExercises();
  let selectedExId = state.historyExerciseId;
  let ex = mainExercises.find(e => e.id === selectedExId);
  if (!ex) {
    ex = mainExercises[0] || (typeof getExercise === 'function' ? getExercise(selectedExId) : null);
    selectedExId = ex?.id || null;
    state.historyExerciseId = selectedExId;
  }

  const exOptionsHtml = mainExercises.map(e => `
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
    <div style="background:var(--phase-prep-dim); border:1px solid var(--phase-prep); border-radius:var(--radius); padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
      <span style="color:var(--phase-prep);">${renderIcon('lightbulb', 'cx-icon cx-icon-lg')}</span>
      <div style="font-size:13px; color:var(--text); line-height:1.4;">${insightText}</div>
    </div>`;

  const chartHtml = points.length > 0
    ? `<div class="chart-wrap" style="height:240px; position:relative;"><canvas id="history-canvas"></canvas></div>`
    : `<div class="empty-state">
        <div class="empty-state-icon">
          <svg class="cx-icon cx-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><polyline points="7 14 12 9 16 13 21 7"/></svg>
        </div>
        <div class="empty-state-title">No Workout Logs Recorded</div>
        <div class="empty-state-message">No workout logs recorded yet for ${escapeHtml(ex?.name || 'this exercise')}. Complete a session to visualize overload and trendlines.</div>
        <div class="empty-state-actions">
          <button class="btn btn-primary btn-sm" onclick="switchView('workout')">Start Workout</button>
        </div>
      </div>`;

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

  const mainExercises = getMainExercises();
  let selectedExId = state.historyExerciseId;
  let ex = mainExercises.find(e => e.id === selectedExId) || mainExercises[0] || (typeof getExercise === 'function' ? getExercise(selectedExId) : null);
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

  const compStyles = window.getComputedStyle(document.documentElement);
  const strokeColor = compStyles.getPropertyValue('--phase-train').trim() || '#FF5D5D';
  const gridColor = compStyles.getPropertyValue('--border').trim() || 'rgba(255, 255, 255, 0.08)';
  const tickColor = compStyles.getPropertyValue('--text-muted').trim() || '#8b92a5';
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const tooltipBg = compStyles.getPropertyValue('--surface-elevated').trim() || (isLight ? '#ffffff' : '#14151b');
  const tooltipBorder = compStyles.getPropertyValue('--border').trim() || 'rgba(255, 255, 255, 0.12)';
  const tooltipTitle = compStyles.getPropertyValue('--text').trim() || '#f8fafc';
  const tooltipBody = compStyles.getPropertyValue('--text-secondary').trim() || '#cbd5e1';
  const pointBorder = compStyles.getPropertyValue('--surface').trim() || '#ffffff';

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, strokeColor.startsWith('#') ? `${strokeColor}33` : 'rgba(255, 93, 93, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 93, 93, 0.0)');

  // Dotted Crosshair Plugin for Chart.js (Horizontal & Vertical Guidelines)
  const crosshairPlugin = {
    id: 'cxDottedCrosshair',
    afterDraw: (chart) => {
      if (chart.tooltip?._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const cCtx = chart.ctx;
        const x = activePoint.element.x;
        const y = activePoint.element.y;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        const leftX = chart.scales.x.left;
        const rightX = chart.scales.x.right;

        cCtx.save();
        cCtx.beginPath();
        cCtx.setLineDash([3, 3]);
        cCtx.lineWidth = 1.2;
        cCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';

        // Vertical dotted crosshair line
        cCtx.moveTo(x, topY);
        cCtx.lineTo(x, bottomY);

        // Horizontal dotted crosshair line
        cCtx.moveTo(leftX, y);
        cCtx.lineTo(rightX, y);

        cCtx.stroke();

        // Glowing outer indicator circle
        cCtx.beginPath();
        cCtx.arc(x, y, 9, 0, 2 * Math.PI);
        cCtx.fillStyle = strokeColor.startsWith('#') ? `${strokeColor}33` : 'rgba(255, 93, 93, 0.2)';
        cCtx.fill();

        cCtx.restore();
      }
    }
  };

  _chartInstance = new Chart(canvas, {
    type: 'line',
    plugins: [crosshairPlugin],
    data: {
      labels: labels,
      datasets: [{
        label: mode === 'best' ? (isHold ? 'Best Hold (sec)' : 'Best Reps') : (isHold ? 'Total Hold (sec)' : 'Volume'),
        data: dataValues,
        borderColor: strokeColor,
        borderWidth: 2.8,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: strokeColor,
        pointBorderColor: pointBorder,
        pointBorderWidth: 2,
        pointRadius: 4.5,
        pointHoverRadius: 6.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 11, family: 'Inter, sans-serif' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 11, family: 'JetBrains Mono, monospace' }, precision: 0, padding: 8 },
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

  window.addEventListener('cx:theme-changed', () => {
    if (document.getElementById('history-canvas')) {
      buildHistoryChart();
    }
  });
}



