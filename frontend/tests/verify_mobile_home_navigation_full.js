/**
 * Full Browser Navigation & Viewport QA Test
 */

const WS = globalThis.WebSocket;
const assert = require('assert');

async function runFullQA() {
  console.log('🧪 RUNNING FULL BROWSER NAVIGATION & VIEWPORT QA SUITE\n');

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

  // 1. Direct Load /home
  console.log('1. Testing direct load of /#home...');
  await send('Page.navigate', { url: 'http://localhost:8080/#home' });
  await new Promise(r => setTimeout(r, 400));
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 800));

  let homeState = await evaluate(`(() => {
    const mobileView = document.querySelector('.home-mobile-view');
    const header = document.querySelector('.home-mobile-header');
    const todayCard = document.querySelector('.home-mobile-today-card');
    const weekCard = document.querySelector('.home-mobile-week-card');
    const streakCard = document.querySelector('.home-mobile-streak-card');
    const upNextCard = document.querySelector('.home-mobile-upnext-card');
    const nav = document.getElementById('mobile-bottom-nav');

    return {
      isHomeVisible: !!mobileView && window.getComputedStyle(mobileView).display !== 'none',
      hasHeader: !!header,
      hasTodayCard: !!todayCard,
      hasWeekCard: !!weekCard,
      hasStreakCard: !!streakCard,
      hasUpNextCard: !!upNextCard,
      hasNav: !!nav && window.getComputedStyle(nav).display !== 'none',
      todayTitle: todayCard ? todayCard.querySelector('.home-mobile-today-title')?.textContent : null
    };
  })()`);

  assert.ok(homeState.isHomeVisible, 'Mobile Home view must be visible on initial load');
  assert.ok(homeState.hasHeader, 'Mobile Header must exist');
  assert.ok(homeState.hasTodayCard, 'Today card must exist');
  assert.ok(homeState.hasWeekCard, 'Week card must exist');
  assert.ok(homeState.hasStreakCard, 'Streak card must exist');
  assert.ok(homeState.hasUpNextCard, 'Up Next card must exist');
  assert.ok(homeState.hasNav, 'Bottom navigation must be visible');
  console.log(`✓ Direct load /#home rendered successfully! (Today: "${homeState.todayTitle}")`);

  // 2. Click Split → Home
  console.log('\n2. Testing Split → Home navigation...');
  await evaluate(`switchView('split')`);
  await new Promise(r => setTimeout(r, 300));
  let splitState = await evaluate(`state.view === 'split' && (document.querySelector('.view-title')?.textContent.includes('Split') || !!document.querySelector('.split-tab-btn') || !!document.querySelector('.schedule-grid'))`);
  assert.ok(splitState, 'Split view rendered');

  await evaluate(`switchView('home')`);
  await new Promise(r => setTimeout(r, 300));
  let homeFromSplit = await evaluate(`state.view === 'home' && !!document.querySelector('.home-mobile-view')`);
  assert.ok(homeFromSplit, 'Home view restored after Split navigation');
  console.log('✓ Split → Home navigation verified');

  // 3. Click Workout → Home
  console.log('\n3. Testing Workout → Home navigation...');
  await evaluate(`switchView('workout')`);
  await new Promise(r => setTimeout(r, 300));
  let workoutState = await evaluate(`state.view === 'workout'`);
  assert.ok(workoutState, 'Workout view rendered');

  await evaluate(`switchView('home')`);
  await new Promise(r => setTimeout(r, 300));
  let homeFromWorkout = await evaluate(`state.view === 'home' && !!document.querySelector('.home-mobile-view')`);
  assert.ok(homeFromWorkout, 'Home view restored after Workout navigation');
  console.log('✓ Workout → Home navigation verified');

  // 4. Click History → Home
  console.log('\n4. Testing History → Home navigation...');
  await evaluate(`switchView('history_list')`);
  await new Promise(r => setTimeout(r, 300));
  let historyState = await evaluate(`state.view === 'history_list'`);
  assert.ok(historyState, 'History view rendered');

  await evaluate(`switchView('home')`);
  await new Promise(r => setTimeout(r, 300));
  let homeFromHistory = await evaluate(`state.view === 'home' && !!document.querySelector('.home-mobile-view')`);
  assert.ok(homeFromHistory, 'Home view restored after History navigation');
  console.log('✓ History → Home navigation verified');

  // 5. Click Progress → Home
  console.log('\n5. Testing Progress → Home navigation...');
  await evaluate(`switchView('progress')`);
  await new Promise(r => setTimeout(r, 300));
  let progressState = await evaluate(`state.view === 'progress'`);
  assert.ok(progressState, 'Progress view rendered');

  await evaluate(`switchView('home')`);
  await new Promise(r => setTimeout(r, 300));
  let homeFromProgress = await evaluate(`state.view === 'home' && !!document.querySelector('.home-mobile-view')`);
  assert.ok(homeFromProgress, 'Home view restored after Progress navigation');
  console.log('✓ Progress → Home navigation verified');

  // 6. Refresh while on /home
  console.log('\n6. Testing refresh while on /home...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 800));
  let homeAfterReload = await evaluate(`state.view === 'home' && !!document.querySelector('.home-mobile-view')`);
  assert.ok(homeAfterReload, 'Home view remains rendered after full page reload');
  console.log('✓ Refresh on /#home verified');

  // 7. Scroll Home & check bottom navigation clickability
  console.log('\n7. Testing scrolling Home and bottom navigation accessibility...');
  await evaluate(`(() => {
    const appMain = document.querySelector('.app-main');
    if (appMain) appMain.scrollTop = 50;
  })()`);
  await new Promise(r => setTimeout(r, 200));

  let scrollState = await evaluate(`(() => {
    const nav = document.getElementById('mobile-bottom-nav');
    const rect = nav.getBoundingClientRect();
    const appMain = document.querySelector('.app-main');
    return {
      hasScrollContainer: !!appMain,
      navZIndex: window.getComputedStyle(nav).zIndex,
      navPointerEvents: window.getComputedStyle(nav).pointerEvents,
      navVisible: window.getComputedStyle(nav).display === 'flex'
    };
  })()`);
  assert.ok(scrollState.hasScrollContainer, 'app-main scroll container exists');
  assert.strictEqual(scrollState.navZIndex, '900', 'Nav z-index is 900');
  assert.strictEqual(scrollState.navPointerEvents, 'auto', 'Nav pointer events auto');
  assert.ok(scrollState.navVisible, 'Bottom nav is visible');
  console.log('✓ Scroll clearance and navigation persistence verified');

  // 8. Open/Close Settings Modal and verify Home remains active
  console.log('\n8. Testing opening and closing Settings modal...');
  await evaluate(`openSettingsModal()`);
  await new Promise(r => setTimeout(r, 300));
  let modalOpen = await evaluate(`!!document.querySelector('.settings-modal-backdrop')`);
  assert.ok(modalOpen, 'Settings modal opened');

  await evaluate(`closeSettingsModal()`);
  await new Promise(r => setTimeout(r, 300));
  let modalClosed = await evaluate(`!document.querySelector('.settings-modal-backdrop')`);
  assert.ok(modalClosed, 'Settings modal closed');
  let homeAfterModal = await evaluate(`!!document.querySelector('.home-mobile-view')`);
  assert.ok(homeAfterModal, 'Home view intact after modal close');
  console.log('✓ Overlay interaction and DOM cleanup verified');

  // 9. Day selection in Week Navigator
  console.log('\n9. Testing in-place day selection on Week Navigator...');
  await evaluate(`selectHomeDay(2)`); // select Wednesday
  await new Promise(r => setTimeout(r, 200));
  let wednesdaySelected = await evaluate(`(() => {
    const todayCard = document.querySelector('.home-mobile-today-card');
    const dayCol = document.querySelectorAll('.home-mobile-day-col')[2];
    return {
      isSelected: dayCol.classList.contains('is-selected'),
      cardTag: todayCard.querySelector('.home-mobile-today-tag')?.textContent
    };
  })()`);
  assert.ok(wednesdaySelected.isSelected, 'Wednesday selected');
  assert.ok(wednesdaySelected.cardTag.includes('WEDNESDAY'), 'Workout card reflects Wednesday');
  console.log(`✓ Day selection verified! (Card tag: "${wednesdaySelected.cardTag}")`);

  // 10. Switch to Desktop Viewport (1440 x 900)
  console.log('\n10. Testing Desktop Viewport (1440 x 900)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 400));

  let desktopState = await evaluate(`(() => {
    const desktopView = document.querySelector('.home-desktop-view');
    const mobileView = document.querySelector('.home-mobile-view');
    const sidebar = document.querySelector('.desktop-sidebar');
    const metricsStrip = document.querySelector('.home-metrics-strip');
    const lowerGrid = document.querySelector('.home-three-col-grid');

    return {
      isDesktopVisible: !!desktopView && window.getComputedStyle(desktopView).display !== 'none',
      isMobileHidden: !!mobileView && window.getComputedStyle(mobileView).display === 'none',
      isSidebarVisible: !!sidebar && window.getComputedStyle(sidebar).display !== 'none',
      hasMetricsStrip: !!metricsStrip,
      hasLowerGrid: !!lowerGrid
    };
  })()`);

  assert.ok(desktopState.isDesktopVisible, 'Desktop view visible');
  assert.ok(desktopState.isMobileHidden, 'Mobile view hidden on desktop');
  assert.ok(desktopState.isSidebarVisible, 'Desktop sidebar visible');
  assert.ok(desktopState.hasMetricsStrip, '4-Metric strip exists on desktop');
  assert.ok(desktopState.hasLowerGrid, '3-Column lower grid exists on desktop');
  console.log('✓ Desktop viewport (1440x900) verified 100% intact!');

  ws.close();
  console.log('\n🎉 ALL 10 BROWSER NAVIGATION & VIEWPORT QA CHECKS PASSED 100%!\n');
}

runFullQA().catch(err => {
  console.error('QA Test failed:', err);
  process.exit(1);
});
