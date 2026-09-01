const WS = globalThis.WebSocket;
const fs = require('fs');

async function captureGraphScreenshots() {
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.type === 'page');
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });

  // 1. Capture Standard Graph State
  await send('Page.navigate', { url: 'http://localhost:8080/#home' });
  await new Promise(r => setTimeout(r, 600));

  let screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sandeep/.gemini/antigravity-ide/brain/207da271-1f2a-44f3-9195-6f819d53a8af/mobile_home_reference_rebuilt.png', Buffer.from(screenshot.data, 'base64'));
  console.log('1. Saved standard mobile home screenshot');

  // 2. Capture Interactive Point Tooltip State
  await send('Runtime.evaluate', {
    expression: `(() => {
      const hitPoints = document.querySelectorAll('.weight-graph-hitarea');
      const targetPoint = Array.from(hitPoints).find(p => p.getAttribute('data-date') === '2026-07-23') || hitPoints[4];
      if (targetPoint) {
        targetPoint.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 200));

  screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sandeep/.gemini/antigravity-ide/brain/207da271-1f2a-44f3-9195-6f819d53a8af/mobile_graph_interactive_tooltip.png', Buffer.from(screenshot.data, 'base64'));
  console.log('2. Saved interactive tooltip screenshot');

  // 3. Capture Log Body Weight Modal State
  await send('Runtime.evaluate', {
    expression: `openQuickCheckInModal(null)`
  });
  await new Promise(r => setTimeout(r, 300));

  screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sandeep/.gemini/antigravity-ide/brain/207da271-1f2a-44f3-9195-6f819d53a8af/mobile_log_modal_reference.png', Buffer.from(screenshot.data, 'base64'));
  console.log('3. Saved log body weight modal screenshot');

  ws.close();
}

captureGraphScreenshots().catch(console.error);
