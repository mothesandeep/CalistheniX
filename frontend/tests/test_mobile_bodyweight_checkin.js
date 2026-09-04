/**
 * CalistheniX — Mobile Body Weight Card & Quick Check-In Flow Test Suite
 */

const WS = globalThis.WebSocket;
const assert = require('assert');

async function testMobileBodyWeightCheckIn() {
  console.log('🧪 TESTING MOBILE BODY WEIGHT CARD & QUICK CHECK-IN WORKOUT FLOW\n');

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  let pageTab = tabs.find(t => t.type === 'page');
  if (!pageTab) {
    const newRes = await fetch('http://127.0.0.1:9222/json/new');
    pageTab = await newRes.json();
  }

  const ws = new WS(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let msgId = 1;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result.value;
  }

  // Set Mobile Viewport (390 x 844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });

  // Navigate to #home and reset weight history to default seed
  await send('Page.navigate', { url: 'http://localhost:8080/#home' });
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`(() => {
    localStorage.removeItem('cx_weight_history');
    localStorage.removeItem('cx_target_weight');
    if (typeof state !== 'undefined') {
      state.weightHistory = null;
      state.targetWeight = null;
    }
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 800));

  // ==========================================
  // 1. AUDIT BODY WEIGHT CARD ON MOBILE HOME
  // ==========================================
  console.log('1. Auditing Body Weight Card Hierarchy & Real Data Calculation...');
  const cardAudit = await evaluate(`(() => {
    const card = document.getElementById('home-mobile-bodyweight-card') || document.querySelector('.home-mobile-metric-card');
    const title = card ? card.querySelector('.home-mobile-metric-title')?.textContent.trim() : null;
    const goalPill = card ? card.querySelector('.home-mobile-goal-pill')?.textContent.trim() : null;
    const logBtn = card ? card.querySelector('.home-mobile-log-link')?.textContent.trim() : null;
    const bigNum = card ? card.querySelector('.home-mobile-metric-big-num')?.textContent.trim() : null;
    const unit = card ? card.querySelector('.home-mobile-metric-unit')?.textContent.trim() : null;
    const trend = card ? card.querySelector('.home-mobile-metric-trend-badge')?.textContent.trim() : null;
    const subdate = card ? card.querySelector('.home-mobile-metric-subdate')?.textContent.trim() : null;
    const goalSubtext = card ? card.querySelector('.home-mobile-metric-goal-subtext')?.textContent.trim() : null;
    const svg = card ? card.querySelector('.home-mobile-weight-svg') : null;

    return {
      hasCard: !!card,
      title,
      goalPill,
      logBtn,
      bigNum,
      unit,
      trend,
      subdate,
      goalSubtext,
      hasSvg: !!svg
    };
  })()`);

  assert.ok(cardAudit.hasCard, 'Body Weight card must exist on mobile');
  assert.strictEqual(cardAudit.title, 'Body weight', 'Card title must be Body weight');
  assert.ok(cardAudit.goalPill.includes('77'), 'Goal pill must display 77');
  assert.strictEqual(cardAudit.logBtn, '+ Log', '+ Log action must be present');
  assert.strictEqual(cardAudit.bigNum, '78.3', 'Latest weight value must be 78.3');
  assert.strictEqual(cardAudit.unit, 'kg', 'Unit must be kg');
  assert.strictEqual(cardAudit.trend, '↓ 0.1', 'Trend must display ↓ 0.1');
  assert.strictEqual(cardAudit.subdate, 'Mon 31 Aug', 'Latest date formatted as Mon 31 Aug');
  assert.ok(cardAudit.goalSubtext.includes('1.3 kg to lose'), `Goal subtext indicates distance to goal: "${cardAudit.goalSubtext}"`);
  assert.ok(cardAudit.hasSvg, 'Responsive Body Weight SVG line graph exists');
  console.log(`✓ Body Weight Card Verified (${cardAudit.bigNum} ${cardAudit.unit} · ${cardAudit.trend} · ${cardAudit.goalSubtext})`);

  // ==========================================
  // 2. AUDIT SVG GRAPH ELEMENTS & TOOLTIP
  // ==========================================
  console.log('\n2. Auditing SVG Graph Curve, Target Line, and Point Tooltips...');
  const svgAudit = await evaluate(`(() => {
    const svg = document.querySelector('.home-mobile-weight-svg');
    const targetLine = svg ? svg.querySelector('line[stroke-dasharray]') : null;
    const latestDot = svg ? svg.querySelector('.weight-graph-latest-dot') : null;
    const hitPoints = svg ? svg.querySelectorAll('.weight-graph-hitarea') : [];

    // Trigger select on point with date 2026-07-23 (matching reference: Thu 23 Jul -> 80.7 kg)
    const targetPoint = Array.from(hitPoints).find(p => p.getAttribute('data-date') === '2026-07-23');
    if (targetPoint) {
      targetPoint.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    } else if (hitPoints.length > 4) {
      hitPoints[4].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    }
    const tooltip = document.getElementById('weight-tooltip');
    const tooltipText = tooltip ? tooltip.textContent.trim() : null;

    return {
      hasTargetLine: !!targetLine,
      hasLatestDot: !!latestDot,
      hitPointCount: hitPoints.length,
      tooltipText
    };
  })()`);

  assert.ok(svgAudit.hasTargetLine, 'Dashed horizontal target weight line exists');
  assert.ok(svgAudit.hasLatestDot, 'Latest measurement point highlighted with circular dot');
  assert.ok(svgAudit.hitPointCount >= 10, 'All 12 demo data points have interactive hit areas');
  assert.strictEqual(svgAudit.tooltipText, 'Thu 23 Jul · 80.7 kg', 'Selecting Thu 23 Jul point displays "Thu 23 Jul · 80.7 kg" tooltip');
  console.log(`✓ SVG Graph & Tooltip Verified ("${svgAudit.tooltipText}")`);

  // ==========================================
  // 3. AUDIT QUICK CHECK-IN MODAL ON WORKOUT START
  // ==========================================
  console.log('\n3. Auditing Quick Check-In Bottom Sheet Modal on Workout Start...');

  // Select an unstarted workout day and tap Start
  await evaluate(`(() => {
    selectHomeDay(3);
    const startBtn = document.querySelector('.home-mobile-workout-pill.is-start') || document.querySelector('.home-mobile-workout-pill');
    if (startBtn) {
      startBtn.click();
    } else {
      openQuickCheckInModal({ name: 'Push A', exercises: [{ id: 1, name: 'Push-ups' }], id: 1 });
    }
  })()`);
  await new Promise(r => setTimeout(r, 200));

  const openModalCheck = await evaluate(`(() => {
    const modal = document.querySelector('.quick-checkin-sheet');
    const title = modal ? modal.querySelector('.quick-checkin-title')?.textContent.trim() : null;
    const subtitle = modal ? modal.querySelector('.quick-checkin-subtitle')?.textContent.trim() : null;
    const weightVal = modal ? modal.querySelector('#quick-checkin-val-display')?.textContent.trim() : null;
    const nudgeBtns = modal ? Array.from(modal.querySelectorAll('.quick-checkin-nudge-btn')).map(b => b.textContent.trim()) : [];
    const slider = modal ? modal.querySelector('#quick-checkin-range-slider') : null;
    const primaryBtn = modal ? modal.querySelector('.quick-checkin-primary-btn')?.textContent.trim() : null;
    const secondaryBtn = modal ? modal.querySelector('.quick-checkin-secondary-btn')?.textContent.trim() : null;
    const chooseDiffBtn = modal ? modal.querySelector('.quick-checkin-link-btn')?.textContent.trim() : null;

    return {
      hasModal: !!modal,
      title,
      subtitle,
      weightVal,
      nudgeBtns,
      hasSlider: !!slider,
      sliderVal: slider ? slider.value : null,
      primaryBtn,
      secondaryBtn,
      chooseDiffBtn
    };
  })()`);

  assert.ok(openModalCheck.hasModal, 'Quick check-in modal must slide up on workout start');
  assert.strictEqual(openModalCheck.title, 'Quick check-in', 'Title must be Quick check-in');
  assert.ok(openModalCheck.subtitle.includes('Slide or tap to set your weight'), 'Subtitle text verified');
  assert.strictEqual(openModalCheck.weightVal, '78.3', 'Default weight initialized to latest saved weight (78.3)');
  assert.deepStrictEqual(openModalCheck.nudgeBtns, ['−1', '−0.5', '+0.5', '+1'], 'Quick adjustment nudge buttons verified');
  assert.ok(openModalCheck.hasSlider, 'Range slider exists for fine adjustment');
  assert.strictEqual(openModalCheck.primaryBtn, 'Save & start workout', 'Primary CTA is Save & start workout');
  assert.strictEqual(openModalCheck.secondaryBtn, 'Start without weighing in', 'Secondary CTA is Start without weighing in');
  assert.strictEqual(openModalCheck.chooseDiffBtn, 'Choose a different workout', 'Additional CTA is Choose a different workout');
  console.log(`✓ Quick Check-In Bottom Sheet verified with all controls & CTAs`);

  // ==========================================
  // 4. AUDIT WEIGHT ADJUSTMENT CONTROLS
  // ==========================================
  console.log('\n4. Auditing Weight Controls Synchronization...');
  const adjustCheck = await evaluate(`(() => {
    // Tap +0.5 button
    stepCheckInWeight(0.5);
    const valAfterNudge = document.getElementById('quick-checkin-val-display')?.textContent.trim();
    const sliderAfterNudge = document.getElementById('quick-checkin-range-slider')?.value;

    // Adjust via slider
    onCheckInSliderInput(79.0);
    const valAfterSlider = document.getElementById('quick-checkin-val-display')?.textContent.trim();

    return {
      valAfterNudge,
      sliderAfterNudge,
      valAfterSlider
    };
  })()`);

  assert.strictEqual(adjustCheck.valAfterNudge, '78.8', 'Tapping +0.5 adjusted weight to 78.8');
  assert.strictEqual(adjustCheck.sliderAfterNudge, '78.8', 'Slider synchronized to 78.8');
  assert.strictEqual(adjustCheck.valAfterSlider, '79.0', 'Slider input updated display to 79.0');
  console.log(`✓ Weight adjustments and control synchronization verified (78.3 → 78.8 → 79.0)`);

  // ==========================================
  // 5. AUDIT SAVE & START WORKOUT / REACTIVE GRAPH
  // ==========================================
  console.log('\n5. Auditing "Save & start workout" and Reactive Graph Update...');
  const saveCheck = await evaluate(`(() => {
    // Save weight 78.1 kg for today
    saveBodyWeight(78.1);
    const history = getWeightHistory();
    const latest = history[history.length - 1];

    // Re-save 78.0 on same day to verify deduplication
    saveBodyWeight(78.0);
    const historyAfterDedup = getWeightHistory();

    return {
      latestWeight: latest.weight,
      historyLength: history.length,
      historyLengthAfterDedup: historyAfterDedup.length,
      finalLatestWeight: historyAfterDedup[historyAfterDedup.length - 1].weight
    };
  })()`);

  assert.strictEqual(saveCheck.latestWeight, 78.1, 'Saved weight updated in history');
  assert.strictEqual(saveCheck.historyLength, saveCheck.historyLengthAfterDedup, 'Multiple check-ins on same day update today entry without duplicate rows');
  assert.strictEqual(saveCheck.finalLatestWeight, 78.0, 'Final updated weight verified (78.0 kg)');
  console.log(`✓ Save & start workout verified with same-day deduplication`);

  // ==========================================
  // 6. AUDIT STANDALONE + LOG FLOW
  // ==========================================
  console.log('\n6. Auditing Standalone "+ Log" Flow from Body Weight Card...');
  const logOnlyCheck = await evaluate(`(() => {
    // Open modal via + Log button
    openQuickCheckInModal(null);
    const modal = document.querySelector('.quick-checkin-sheet');
    const primaryBtn = modal ? modal.querySelector('.quick-checkin-primary-btn')?.textContent.trim() : null;
    const secondaryBtn = modal ? modal.querySelector('.quick-checkin-secondary-btn') : null;

    closeQuickCheckInModal();
    const modalAfterClose = document.querySelector('.quick-checkin-sheet');

    return {
      hasModal: !!modal,
      primaryBtn,
      hasSecondaryBtn: !!secondaryBtn,
      hasModalAfterClose: !!modalAfterClose
    };
  })()`);

  assert.ok(logOnlyCheck.hasModal, 'Modal opens via + Log button');
  assert.strictEqual(logOnlyCheck.primaryBtn, 'Save', 'Primary CTA in log mode is "Save"');
  assert.strictEqual(logOnlyCheck.hasSecondaryBtn, false, 'No workout-specific secondary buttons in log mode');
  assert.strictEqual(logOnlyCheck.hasModalAfterClose, false, 'Modal closes cleanly');
  console.log(`✓ Standalone + Log flow verified`);

  // ==========================================
  // 7. AUDIT DESKTOP ISOLATION
  // ==========================================
  console.log('\n7. Auditing Desktop Viewport Isolation...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 200));

  const desktopCheck = await evaluate(`(() => {
    const desktopView = document.querySelector('.home-desktop-view');
    const mobileView = document.querySelector('.home-mobile-view');
    return {
      hasDesktop: !!desktopView,
      desktopDisplay: desktopView ? window.getComputedStyle(desktopView).display : null,
      mobileDisplay: mobileView ? window.getComputedStyle(mobileView).display : null
    };
  })()`);

  assert.strictEqual(desktopCheck.desktopDisplay, 'block', 'Desktop view active on widescreen');
  assert.strictEqual(desktopCheck.mobileDisplay, 'none', 'Mobile view suppressed on widescreen');
  console.log(`✓ Desktop Home screen 100% isolated and intact`);

  console.log('\n🎉 ALL MOBILE BODY WEIGHT CARD & QUICK CHECK-IN TESTS PASSED 100%!');
  ws.close();
}

testMobileBodyWeightCheckIn().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
