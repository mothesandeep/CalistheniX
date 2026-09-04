/**
 * CalistheniX — Personal Records (PRs) View
 */

function checkAndCelebratePR(exerciseId, val, weightKg = null) {
  if (!val || val <= 0) return;
  const ex = typeof getExercise === 'function' ? getExercise(exerciseId) : null;
  const records = (typeof state !== 'undefined' && state.dashboardRecords) ? state.dashboardRecords : [];
  const rec = records.find(r => r.exercise_id === exerciseId || (r.exercise_name && ex && r.exercise_name.toLowerCase() === ex.name.toLowerCase()));
  if (!rec) return;

  const isHold = ex?.type === 'duration';
  let isNewPR = false;
  let prMsg = '';

  if (isHold) {
    if (rec.max_duration_sec && val > rec.max_duration_sec) {
      isNewPR = true;
      prMsg = `NEW PR: ${ex?.name || 'Exercise'} · ${val}s hold (beat previous ${rec.max_duration_sec}s)`;
    }
  } else {
    if (rec.max_reps && val > rec.max_reps) {
      isNewPR = true;
      prMsg = `NEW PR: ${ex?.name || 'Exercise'} · ${val} reps (beat previous ${rec.max_reps} reps)`;
    }
  }

  const numWeight = weightKg !== null && weightKg !== '' ? Number(weightKg) : 0;
  if (numWeight > 0 && rec.max_weight_kg !== null && rec.max_weight_kg !== undefined && numWeight > rec.max_weight_kg) {
    isNewPR = true;
    prMsg = `NEW WEIGHT PR: ${ex?.name || 'Exercise'} · +${numWeight}kg (beat previous +${rec.max_weight_kg}kg)`;
  }

  if (isNewPR) {
    cueExerciseComplete();
    showToast(prMsg);
  }
}

function renderPersonalRecordsCard(records = []) {
  if (!records || !records.length) return '';
  const topRecords = records.slice(0, 6);
  const rows = topRecords.map(r => {
    const statParts = [];
    if (r.max_reps) statParts.push(`${r.max_reps} reps`);
    if (r.max_duration_sec) statParts.push(`${r.max_duration_sec}s`);
    if (r.max_weight_kg) statParts.push(`+${r.max_weight_kg}kg`);
    const statDesc = statParts.join(' · ') || '—';

    return `
      <div class="pr-row" onclick="openHistoryView(${r.exercise_id})" role="button" tabindex="0">
        <div class="pr-info">
          <span class="pr-trophy">${renderIcon('trophy', 'cx-icon cx-icon-gold')}</span>
          <span class="pr-name">${r.exercise_name}</span>
        </div>
        <div class="mono" style="font-size:13px; font-weight:700; color:#f4f4f5;">
          ${statDesc}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">All-Time Personal Records (PRs)</span>
        <span class="card-count mono">${records.length} exercises</span>
      </div>
      <div class="card-body" style="padding: 6px 18px;">
        <div class="pr-list">
          ${rows}
        </div>
      </div>
    </div>`;
}

// ─── Dedicated PRs (Personal Records) View ──────────────────────────────────
function setPrsFilter(filter) {
  state.prsFilter = filter;
  render();
}

function setPrsSearch(query) {
  state.prsSearchQuery = (query || '').toLowerCase().trim();
  render();
}

function renderPrsView() {
  const records = state.dashboardRecords || [];

  const totalPrs = records.length;
  let maxRepsRecord = null;
  let maxDurationRecord = null;
  let maxWeightRecord = null;

  records.forEach(r => {
    if (r.max_reps && (!maxRepsRecord || r.max_reps > maxRepsRecord.max_reps)) {
      maxRepsRecord = r;
    }
    if (r.max_duration_sec && (!maxDurationRecord || r.max_duration_sec > maxDurationRecord.max_duration_sec)) {
      maxDurationRecord = r;
    }
    if (r.max_weight_kg && (!maxWeightRecord || r.max_weight_kg > maxWeightRecord.max_weight_kg)) {
      maxWeightRecord = r;
    }
  });

  let filtered = records;
  if (state.prsFilter === 'reps') {
    filtered = filtered.filter(r => r.max_reps > 0);
  } else if (state.prsFilter === 'hold') {
    filtered = filtered.filter(r => r.max_duration_sec > 0);
  } else if (state.prsFilter === 'weight') {
    filtered = filtered.filter(r => r.max_weight_kg > 0);
  }

  if (state.prsSearchQuery) {
    filtered = filtered.filter(r => (r.exercise_name || '').toLowerCase().includes(state.prsSearchQuery));
  }

  const statCardsHtml = `
    <div class="prs-stats-strip">
      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Total PRs</span>
          <div class="home-metric-icon">${renderIcon('trophy', 'cx-icon cx-icon-lg cx-icon-gold')}</div>
        </div>
        <div class="home-metric-val">${totalPrs}</div>
        <div class="home-metric-sub">Across active exercises</div>
      </div>

      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Max Rep Record</span>
          <div class="home-metric-icon">${renderIcon('trendingUp', 'cx-icon cx-icon-lg cx-icon-success')}</div>
        </div>
        <div class="home-metric-val">${maxRepsRecord ? `${maxRepsRecord.max_reps} reps` : '—'}</div>
        <div class="home-metric-sub" style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${maxRepsRecord?.exercise_name || 'No rep records'}</div>
      </div>

      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Longest Static Hold</span>
          <div class="home-metric-icon">${renderIcon('timer', 'cx-icon cx-icon-lg cx-icon-accent')}</div>
        </div>
        <div class="home-metric-val">${maxDurationRecord ? `${maxDurationRecord.max_duration_sec}s` : '—'}</div>
        <div class="home-metric-sub" style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${maxDurationRecord?.exercise_name || 'No hold records'}</div>
      </div>

      <div class="home-metric-card">
        <div class="home-metric-top">
          <span class="home-metric-lbl">Top Added Weight</span>
          <div class="home-metric-icon">${renderIcon('dumbbell', 'cx-icon cx-icon-lg cx-icon-fire')}</div>
        </div>
        <div class="home-metric-val">${maxWeightRecord ? `+${maxWeightRecord.max_weight_kg}kg` : '—'}</div>
        <div class="home-metric-sub" style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${maxWeightRecord?.exercise_name || 'Bodyweight'}</div>
      </div>
    </div>`;

  const prGridHtml = filtered.length === 0
    ? `<div class="empty-state">
         <div class="empty-state-icon">
           <svg class="cx-icon cx-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
         </div>
         <div class="empty-state-title">${records.length === 0 ? 'No Personal Records Yet' : 'No Matching Records'}</div>
         <div class="empty-state-message">${records.length === 0 ? 'Complete a workout session to log your first all-time personal best!' : 'No personal records match your selected filter.'}</div>
         <div class="empty-state-actions">
           <button class="btn btn-primary btn-sm" onclick="switchView('workout')">${renderIcon('zap', 'cx-icon cx-icon-inline')} Start Today's Workout</button>
         </div>
       </div>`
    : `<div class="prs-grid">
        ${filtered.map(r => {
          const ex = getExercise(r.exercise_id);
          const isHold = ex?.type === 'duration';

          let primaryVal = '—';
          if (isHold && r.max_duration_sec) {
            primaryVal = `${r.max_duration_sec}s Hold`;
          } else if (r.max_reps) {
            primaryVal = `${r.max_reps} Reps`;
          } else if (r.max_weight_kg) {
            primaryVal = `+${r.max_weight_kg}kg`;
          }

          const subParts = [];
          if (r.max_reps && primaryVal !== `${r.max_reps} Reps`) subParts.push(`${r.max_reps} reps`);
          if (r.max_duration_sec && primaryVal !== `${r.max_duration_sec}s Hold`) subParts.push(`${r.max_duration_sec}s hold`);
          if (r.max_weight_kg && primaryVal !== `+${r.max_weight_kg}kg`) subParts.push(`+${r.max_weight_kg}kg`);
          const subText = subParts.length ? `<span class="mono" style="font-size:12px; color:var(--text-muted);">${subParts.join(' · ')}</span>` : '';

          return `
            <div class="pr-card">
              <div>
                <div class="pr-card-top">
                  <div>
                    <h3 class="pr-card-title">${r.exercise_name}</h3>
                    <span class="pr-card-routine">${ex?.day || 'Calisthenics'} Routine</span>
                  </div>
                  <div class="pr-card-trophy">
                    ${renderIcon('trophy', 'cx-icon cx-icon-sm cx-icon-gold')}
                  </div>
                </div>

                <div class="pr-card-values" style="margin-top:14px;">
                  <div class="pr-card-primary-val">${primaryVal}</div>
                  ${subText ? `<div class="pr-card-sub-vals" style="margin-top:4px;">${subText}</div>` : ''}
                </div>
              </div>

              <div class="pr-card-actions">
                <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="openHistoryView(${r.exercise_id})">
                  ${renderIcon('trendingUp', 'cx-icon cx-icon-xs cx-icon-inline')} Trend
                </button>
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="openLogView(${r.exercise_id})">
                  ${renderIcon('edit', 'cx-icon cx-icon-xs cx-icon-inline')} Log Set
                </button>
              </div>
            </div>`;
        }).join('')}
       </div>`;

  return `
    <div class="prs-container">
      <div class="view-header">
        <h1 class="view-title">Personal Records & Bests</h1>
        <p class="view-subtitle">Track your all-time heaviest weights, highest reps, and longest static holds.</p>
      </div>

      ${statCardsHtml}

      <div class="prs-filter-row">
        <div class="prs-filter-pills">
          <button class="prs-filter-btn ${state.prsFilter === 'all' ? 'active' : ''}" onclick="setPrsFilter('all')">All Records</button>
          <button class="prs-filter-btn ${state.prsFilter === 'reps' ? 'active' : ''}" onclick="setPrsFilter('reps')">Rep Records</button>
          <button class="prs-filter-btn ${state.prsFilter === 'hold' ? 'active' : ''}" onclick="setPrsFilter('hold')">Static Holds</button>
          <button class="prs-filter-btn ${state.prsFilter === 'weight' ? 'active' : ''}" onclick="setPrsFilter('weight')">Weighted (+Kg)</button>
        </div>

        <div style="min-width:220px;">
          <input type="text" class="form-input" style="padding:6px 12px; font-size:12px;" placeholder="Search PR exercise..." value="${state.prsSearchQuery || ''}" oninput="setPrsSearch(this.value)" />
        </div>
      </div>

      ${prGridHtml}
    </div>`;
}


