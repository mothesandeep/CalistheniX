const WS = globalThis.WebSocket;
const fs = require('fs');

async function captureMobileScreenshot() {
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });
  await send('Page.navigate', { url: 'http://localhost:8080/#home' });
  await new Promise(r => setTimeout(r, 600));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  fs.writeFileSync('/Users/sandeep/.gemini/antigravity-ide/brain/207da271-1f2a-44f3-9195-6f819d53a8af/mobile_home_reference_rebuilt.png', buffer);
  console.log('Saved screenshot to /Users/sandeep/.gemini/antigravity-ide/brain/207da271-1f2a-44f3-9195-6f819d53a8af/mobile_home_reference_rebuilt.png');
  ws.close();
}

captureMobileScreenshot().catch(console.error);
