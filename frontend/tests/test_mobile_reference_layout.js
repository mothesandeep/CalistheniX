/**
 * Verification of Mobile Reference Layout & Structural Invariance Across Weeks
 */

const WS = globalThis.WebSocket;
const assert = require('assert');

async function testMobileReferenceLayout() {
  console.log('🧪 TESTING REFERENCE-DRIVEN MOBILE HOME UI & WEEK INVARIANCE\n');

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

  // Navigate & Hard Reload
  await send('Page.navigate', { url: 'http://localhost:8080/#home' });
  await new Promise(r => setTimeout(r, 400));
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 800));

  // 1. Header Validation
  console.log('1. Auditing Reference Header (Branding, Formatted Date, Circular Settings)...');
  const headerCheck = await evaluate(`(() => {
    const header = document.querySelector('.home-mobile-header');
    const brand = header ? header.querySelector('.home-mobile-brand-title .app-logo') : null;
    const dateSub = header ? header.querySelector('.home-mobile-date-sub') : null;
    const gearBtn = header ? header.querySelector('.home-mobile-gear-btn') : null;

    return {
      hasHeader: !!header,
      brandText: brand ? brand.textContent.trim() : null,
      dateSubText: dateSub ? dateSub.textContent.trim() : null,
      hasGearBtn: !!gearBtn,
      gearBtnBorderRadius: gearBtn ? window.getComputedStyle(gearBtn).borderRadius : null
    };
  })()`);

  assert.ok(headerCheck.hasHeader, 'Mobile header must exist');
  assert.strictEqual(headerCheck.brandText, 'CalistheniX', 'Brand must be CalistheniX with red X');
  assert.ok(headerCheck.dateSubText && headerCheck.dateSubText.length > 5, `Date subtitle present: "${headerCheck.dateSubText}"`);
  assert.ok(headerCheck.hasGearBtn, 'Circular gear settings button must exist');
  assert.strictEqual(headerCheck.gearBtnBorderRadius, '50%', 'Gear button must be circular (50%)');
  console.log(`✓ Reference Header Verified (${headerCheck.brandText} · ${headerCheck.dateSubText})`);

  // 2. Card 1 Validation (Combined Weekly Navigator + Inset Workout Row)
  console.log('\n2. Auditing Card 1 (Weekly Navigator + 7 Day Columns + Inset Workout Row)...');
  const card1Check = await evaluate(`(() => {
    const card = document.querySelector('.home-mobile-week-card');
    const navBar = card ? card.querySelector('.home-mobile-week-nav-bar') : null;
    const rangeText = navBar ? navBar.querySelector('.home-mobile-week-range-text')?.textContent.trim() : null;
    const dayCols = card ? card.querySelectorAll('.home-mobile-day-col') : [];
    const dayCodes = Array.from(dayCols).map(col => col.querySelector('.home-mobile-day-code')?.textContent.trim());
    const inset = card ? card.querySelector('.home-mobile-workout-inset') : null;
    const insetTag = inset ? inset.querySelector('.home-mobile-workout-tag')?.textContent.trim() : null;
    const insetTitle = inset ? inset.querySelector('.home-mobile-workout-title')?.textContent.trim() : null;
    const insetPill = inset ? inset.querySelector('.home-mobile-workout-pill')?.textContent.trim() : null;

    return {
      hasCard1: !!card,
      hasNavBar: !!navBar,
      rangeText,
      dayColCount: dayCols.length,
      dayCodes,
      hasInset: !!inset,
      insetTag,
      insetTitle,
      insetPill
    };
  })()`);

  assert.ok(card1Check.hasCard1, 'Card 1 must exist');
  assert.ok(card1Check.hasNavBar, 'Week nav bar must exist');
  assert.strictEqual(card1Check.dayColCount, 7, 'Card 1 must have exactly 7 day columns');
  assert.deepStrictEqual(card1Check.dayCodes, ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'], 'Day codes must be MO..SU');
  assert.ok(card1Check.hasInset, 'Inset workout row must exist within Card 1');
  assert.ok(card1Check.insetTag, 'Inset tag present');
  assert.ok(card1Check.insetTitle, 'Inset title present');
  assert.ok(card1Check.insetPill, 'Inset action pill present');
  console.log(`✓ Card 1 Verified: Range "${card1Check.rangeText}", Workout: "${card1Check.insetTitle}" [${card1Check.insetPill}]`);

  // 3. Card 2 Validation (Body Weight Metric Card)
  console.log('\n3. Auditing Card 2 (Body Weight Metric Card + SVG Chart)...');
  const card2Check = await evaluate(`(() => {
    const card = document.querySelector('.home-mobile-metric-card');
    const title = card ? card.querySelector('.home-mobile-metric-title')?.textContent.trim() : null;
    const bigNum = card ? card.querySelector('.home-mobile-metric-big-num')?.textContent.trim() : null;
    const unit = card ? card.querySelector('.home-mobile-metric-unit')?.textContent.trim() : null;
    const goalLine = card ? card.querySelector('.home-mobile-metric-goal-subtext')?.textContent.trim() : null;
    const svgChart = card ? card.querySelector('.home-mobile-metric-svg') : null;
    const logBtn = card ? card.querySelector('.home-mobile-log-link')?.textContent.trim() : null;
    const axisLabels = card ? (
      card.querySelectorAll('.home-mobile-chart-axis span').length > 0 
        ? Array.from(card.querySelectorAll('.home-mobile-chart-axis span')).map(s => s.textContent.trim())
        : Array.from(card.querySelectorAll('svg text')).map(s => s.textContent.trim())
    ) : [];

    return {
      hasCard2: !!card,
      title,
      bigNum,
      unit,
      goalLine,
      hasSvgChart: !!svgChart,
      axisLabels,
      logBtn
    };
  })()`);

  assert.ok(card2Check.hasCard2, 'Card 2 must exist');
  assert.strictEqual(card2Check.title, 'Body weight', 'Card 2 title must be Body weight');
  assert.ok(card2Check.bigNum, 'Big number present');
  assert.strictEqual(card2Check.unit, 'kg', 'Unit must be kg');
  assert.ok(card2Check.hasSvgChart, 'SVG area sparkline chart must exist');
  assert.ok(card2Check.axisLabels.length >= 2, 'Axis labels present');
  assert.strictEqual(card2Check.logBtn, '+ Log', '+ Log button present');
  console.log(`✓ Card 2 Verified: ${card2Check.bigNum} ${card2Check.unit} (${card2Check.goalLine})`);

  // 4. Card 3 Validation (Streak & Consistency Card)
  console.log('\n4. Auditing Card 3 (Streak & Consistency Card)...');
  const card3Check = await evaluate(`(() => {
    const card = document.querySelector('.home-mobile-streak-ref-card');
    const flame = card ? card.querySelector('.home-mobile-streak-flame-icon')?.textContent.trim() : null;
    const heading = card ? card.querySelector('.home-mobile-streak-heading')?.textContent.trim() : null;
    const subline = card ? card.querySelector('.home-mobile-streak-subline')?.textContent.trim() : null;
    const calBtn = card ? card.querySelector('.home-mobile-streak-cal-btn') : null;

    return {
      hasCard3: !!card,
      flame,
      heading,
      subline,
      hasCalBtn: !!calBtn
    };
  })()`);

  assert.ok(card3Check.hasCard3, 'Card 3 must exist');
  assert.strictEqual(card3Check.flame, '🔥', 'Flame icon present');
  assert.ok(card3Check.heading && card3Check.heading.includes('day streak'), 'Heading contains day streak');
  assert.ok(card3Check.subline && card3Check.subline.includes('this week'), 'Subline contains this week');
  assert.ok(card3Check.hasCalBtn, 'Calendar button present');
  console.log(`✓ Card 3 Verified: ${card3Check.heading} · ${card3Check.subline}`);

  // 5. Card 4 Validation (Up Next Workouts Card)
  console.log('\n5. Auditing Card 4 (Up Next Card)...');
  const card4Check = await evaluate(`(() => {
    const card = document.querySelector('.home-mobile-upnext-ref-card');
    const rows = card ? card.querySelectorAll('.home-mobile-upnext-row') : [];

    return {
      hasCard4: !!card,
      rowCount: rows.length
    };
  })()`);

  assert.ok(card4Check.hasCard4, 'Card 4 must exist');
  assert.ok(card4Check.rowCount >= 1, 'Card 4 has upcoming rows');
  console.log(`✓ Card 4 Verified: ${card4Check.rowCount} upcoming workouts displayed`);

  // 6. Structural Invariance Across Weeks Audit
  console.log('\n6. Auditing Structural Invariance Across Weeks (Aug 24–30, Aug 31–Sep 6, Sep 7–13)...');
  const weekOffsets = [-2, -1, 0, 1, 2];
  for (const offset of weekOffsets) {
    await evaluate(`shiftHomeWeek(${offset} - state.homeWeekOffset)`);
    await new Promise(r => setTimeout(r, 150));

    const structCheck = await evaluate(`(() => {
      const mobileView = document.querySelector('.home-mobile-view');
      const cards = mobileView ? mobileView.querySelectorAll('.home-mobile-section-card') : [];
      const card1 = document.querySelector('.home-mobile-week-card');
      const card2 = document.querySelector('.home-mobile-metric-card');
      const card3 = document.querySelector('.home-mobile-streak-ref-card');
      const card4 = document.querySelector('.home-mobile-upnext-ref-card');
      const dayCols = card1 ? card1.querySelectorAll('.home-mobile-day-col') : [];
      const inset = card1 ? card1.querySelector('.home-mobile-workout-inset') : null;
      const rangeText = card1 ? card1.querySelector('.home-mobile-week-range-text')?.textContent.trim() : null;

      return {
        cardCount: cards.length,
        hasCard1: !!card1,
        hasCard2: !!card2,
        hasCard3: !!card3,
        hasCard4: !!card4,
        dayColsLength: dayCols.length,
        hasInset: !!inset,
        rangeText
      };
    })()`);

    assert.strictEqual(structCheck.cardCount, 4, `Must always have exactly 4 cards at offset ${offset}`);
    assert.ok(structCheck.hasCard1, `Card 1 exists at offset ${offset}`);
    assert.ok(structCheck.hasCard2, `Card 2 exists at offset ${offset}`);
    assert.ok(structCheck.hasCard3, `Card 3 exists at offset ${offset}`);
    assert.ok(structCheck.hasCard4, `Card 4 exists at offset ${offset}`);
    assert.strictEqual(structCheck.dayColsLength, 7, `7 day columns at offset ${offset}`);
    assert.ok(structCheck.hasInset, `Inset workout row exists at offset ${offset}`);

    console.log(`  ✓ Offset ${offset >= 0 ? '+' : ''}${offset} (${structCheck.rangeText}): Structure 100% invariant (4 Cards, 7 Columns, Inset Row)`);
  }

  // Reset to current week
  await evaluate(`resetHomeWeek()`);

  ws.close();
  console.log('\n🎉 ALL REFERENCE-DRIVEN MOBILE HOME UI & INVARIANCE AUDITS PASSED 100%!\n');
}

testMobileReferenceLayout().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
