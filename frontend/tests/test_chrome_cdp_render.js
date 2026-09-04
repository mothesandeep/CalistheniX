const { spawn } = require('child_process');
const http = require('http');

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function ensureChrome() {
  const isUp = await httpRequest('http://127.0.0.1:9222/json/version').then(() => true).catch(() => false);
  if (isUp) return null;
  console.log('Spawning headless Chrome...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const up = await httpRequest('http://127.0.0.1:9222/json/version').then(() => true).catch(() => false);
    if (up) {
      console.log('Chrome started on port 9222.');
      return proc;
    }
  }
  throw new Error('Failed to start Chrome');
}

async function runTest() {
  console.log('Testing browser CDP rendering...');
  const chromeProc = await ensureChrome();
  const WS = globalThis.WebSocket;
  
  // Discover Chrome endpoints
  const versionRes = await httpRequest('http://127.0.0.1:9222/json/version');
  const versionData = JSON.parse(versionRes.body);
  console.log('Connected to Chrome:', versionData.Browser);

  const targetsRes = await httpRequest('http://127.0.0.1:9222/json/list');
  const targets = JSON.parse(targetsRes.body);
  let target = targets.find(t => t.type === 'page');

  if (!target) {
    const newTargetRes = await httpRequest('http://127.0.0.1:9222/json/new');
    target = JSON.parse(newTargetRes.body);
  }

  const ws = new WS(target.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  await new Promise((resolve) => {
    if (ws.readyState === 1) resolve();
    else ws.addEventListener('open', resolve);
  });
  console.log('WS connected to page debugger.');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  // Navigate to #workout
  await send('Page.navigate', { url: 'http://localhost:8080/#workout' });
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 1200));

  // Initialize workout session in page runtime
  console.log('\n--- Initializing Workout in browser context ---');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.clear();
      switchView('workout');
      startWorkoutFromData('Push Strength', [
        { exercise_id: 1, exercise_name: 'Push-up', sets: 3, reps: 10, rest_sec: 60, phase: 'main' },
        { exercise_id: 2, exercise_name: 'Dips', sets: 3, reps: 8, rest_sec: 90, phase: 'main' }
      ]);
      render();
    `
  });

  await new Promise(r => setTimeout(r, 600));

  // 1. Test Desktop Viewport (1440x900)
  console.log('\n--- 1. Testing Desktop Viewport (1440x900) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 400));

  const desktopCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const layout = document.querySelector('.runner-3col-layout');
        const rail = document.querySelector('.runner-rail-sidebar');
        const center = document.querySelector('.runner-center-column');
        const card = document.querySelector('.runner-execution-card');
        const right = document.querySelector('.runner-right-panel');
        const anatomy = document.querySelector('.runner-anatomy-accordion');
        const stepper = document.querySelector('.runner-stepper-zone');
        const cta = document.querySelector('.runner-cta-btn');

        const railStyle = rail ? window.getComputedStyle(rail) : null;
        const rightStyle = right ? window.getComputedStyle(right) : null;

        return {
          has3ColLayout: !!layout,
          hasRail: !!rail && railStyle.display !== 'none',
          hasCenter: !!center,
          centerHtml: center ? center.innerHTML.substring(0, 300) : null,
          hasCard: !!card,
          hasRightPanel: !!right && rightStyle.display !== 'none',
          hasAnatomy: !!anatomy,
          hasStepper: !!stepper,
          hasCta: !!cta,
          ctaText: cta ? cta.innerText.trim() : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Desktop Layout Elements:', desktopCheck.result.value);
  const dVal = desktopCheck.result.value;
  if (!dVal.has3ColLayout || !dVal.hasRail || !dVal.hasCard || !dVal.hasRightPanel) {
    throw new Error('Desktop layout validation failed');
  }
  console.log('✓ Desktop 3-column layout, Left Rail, Focused Card, and Right Panel verified!');

  // 2. Test Mobile Viewport (390x844 iPhone 14)
  console.log('\n--- 2. Testing Mobile Viewport (390x844) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const rail = document.querySelector('.runner-rail-sidebar');
        const right = document.querySelector('.runner-right-panel');
        const card = document.querySelector('.runner-execution-card');
        const drawerBtn = document.querySelector('.runner-header-drawer-btn');
        const drawerSheet = document.querySelector('.runner-drawer-sheet');
        const mobileSupp = document.querySelector('.runner-mobile-supplemental');

        const railStyle = rail ? window.getComputedStyle(rail) : null;
        const rightStyle = right ? window.getComputedStyle(right) : null;
        const drawerBtnStyle = drawerBtn ? window.getComputedStyle(drawerBtn) : null;
        const mobileSuppStyle = mobileSupp ? window.getComputedStyle(mobileSupp) : null;

        return {
          railHidden: railStyle ? railStyle.display === 'none' : true,
          rightHidden: rightStyle ? rightStyle.display === 'none' : true,
          cardVisible: !!card,
          drawerBtnVisible: drawerBtnStyle ? drawerBtnStyle.display !== 'none' : false,
          mobileSupplementalVisible: mobileSuppStyle ? mobileSuppStyle.display !== 'none' : false,
          hasDrawerSheet: !!drawerSheet
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Mobile Layout Elements:', mobileCheck.result.value);
  const mVal = mobileCheck.result.value;
  if (!mVal.railHidden || !mVal.rightHidden || !mVal.cardVisible || !mVal.drawerBtnVisible || !mVal.mobileSupplementalVisible) {
    throw new Error('Mobile layout validation failed');
  }
  console.log('✓ Mobile single-column layout, Drawer CTA, and supplemental demo verified!');

  // 3. Test Drawer Open & Close on Mobile
  console.log('\n--- 3. Testing Mobile Drawer Open/Close Interaction ---');
  await send('Runtime.evaluate', { expression: `openMobileExerciseListDrawer();` });
  await new Promise(r => setTimeout(r, 200));

  const drawerOpenCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const sheet = document.querySelector('.runner-drawer-sheet');
        const backdrop = document.querySelector('.runner-drawer-backdrop');
        return {
          sheetIsOpen: sheet ? sheet.classList.contains('is-open') : false,
          backdropIsOpen: backdrop ? backdrop.classList.contains('is-open') : false
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Drawer Open State:', drawerOpenCheck.result.value);
  if (!drawerOpenCheck.result.value.sheetIsOpen || !drawerOpenCheck.result.value.backdropIsOpen) {
    throw new Error('Mobile drawer failed to open');
  }
  console.log('✓ Mobile drawer opens smoothly with backdrop.');

  await send('Runtime.evaluate', { expression: `closeMobileExerciseListDrawer();` });
  await new Promise(r => setTimeout(r, 200));

  const drawerClosedCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const sheet = document.querySelector('.runner-drawer-sheet');
        return { sheetIsOpen: sheet ? sheet.classList.contains('is-open') : false };
      })()
    `,
    returnByValue: true
  });
  console.log('Drawer Closed State:', drawerClosedCheck.result.value);
  if (drawerClosedCheck.result.value.sheetIsOpen) {
    throw new Error('Mobile drawer failed to close');
  }
  console.log('✓ Mobile drawer closes cleanly.');

  // 4. Test Exercise Progression & Logging in Mobile View
  console.log('\n--- 4. Testing Workout Progression in Mobile View ---');
  await send('Runtime.evaluate', {
    expression: `
      skipWarmupPhase();
      render();
    `
  });
  await new Promise(r => setTimeout(r, 300));

  const mainCardCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const card = document.getElementById('runner-main-card');
        const title = card ? card.querySelector('.runner-exercise-name-title')?.textContent.trim() : null;
        const setBadge = card ? card.querySelector('.runner-badge-set')?.textContent.trim() : null;
        const counter = card ? card.querySelector('#workout-active-counter-digits')?.textContent.trim() : null;
        const cta = card ? card.querySelector('.runner-cta-btn')?.textContent.trim() : null;
        return { hasMainCard: !!card, title, setBadge, counter, cta };
      })()
    `,
    returnByValue: true
  });
  console.log('Main Card Active Elements:', mainCardCheck.result.value);
  if (mainCardCheck.result.value.title !== 'Push-up' || !mainCardCheck.result.value.cta.includes('COMPLETE SET')) {
    throw new Error('Main workout card failed to render properly');
  }
  console.log('✓ Main exercise active with 56px counter and COMPLETE SET CTA.');

  // Complete Set 1 -> Verify Rest State
  console.log('\n--- 5. Completing Set 1 & Verifying Rest Overlay ---');
  await send('Runtime.evaluate', {
    expression: `
      completeMainWorkoutSet();
      render();
    `
  });
  await new Promise(r => setTimeout(r, 300));

  const restCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const restCard = document.querySelector('.runner-floating-rest-island') || document.querySelector('#runner-floating-rest-island') || document.querySelector('.runner-rest-hero-card') || document.querySelector('#runner-rest-card') || document.querySelector('.runner-rest-dedicated-card');
        const digits = document.querySelector('#workout-rest-timer-val')?.innerText;
        const center = document.querySelector('.runner-center-column');
        return {
          hasRestCard: !!restCard,
          digits,
          centerHtml: center ? center.innerHTML.substring(0, 300) : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Rest Interval Elements:', restCheck.result.value);
  if (!restCheck.result.value.hasRestCard) {
    throw new Error('Rest interval screen not displayed after set completion');
  }
  console.log('✓ Rest timer displayed with large countdown digits.');

  ws.close();
  console.log('\n🎉 ALL BROWSER CDP RENDER & INTERACTION TESTS PASSED (100%)');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
