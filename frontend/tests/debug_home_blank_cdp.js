/**
 * Debug CDP script for Home Screen on Mobile Viewport
 */

const WS = globalThis.WebSocket;

async function debugHome() {
  try {
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
      } else if (msg.method === 'Runtime.exceptionThrown' || msg.method === 'Console.messageAdded') {
        console.log('BROWSER LOG:', JSON.stringify(msg));
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

    // 1. Set mobile viewport (390 x 844)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    // 2. Navigate to http://localhost:8080/#home and hard reload
    await send('Page.navigate', { url: 'http://localhost:8080/#home' });
    await new Promise(r => setTimeout(r, 400));
    await send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Inspect DOM and computed styles
    const domCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const appRoot = document.getElementById('app-root');
        const homeMobile = document.querySelector('.home-mobile-view');
        const homeDesktop = document.querySelector('.home-desktop-view');
        const homeContainer = document.querySelector('.home-container');
        const mobileNav = document.getElementById('mobile-bottom-nav');
        const errors = window._caughtErrors || [];

        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          stateView: (typeof state !== 'undefined') ? state.view : 'state not found',
          appRootExists: !!appRoot,
          appRootHtmlLength: appRoot ? appRoot.innerHTML.length : 0,
          appRootInnerHTML: appRoot ? appRoot.innerHTML.substring(0, 500) : '',
          appRootComputedDisplay: appRoot ? window.getComputedStyle(appRoot).display : null,
          appRootComputedVisibility: appRoot ? window.getComputedStyle(appRoot).visibility : null,
          appRootComputedHeight: appRoot ? window.getComputedStyle(appRoot).height : null,
          homeContainerExists: !!homeContainer,
          homeContainerComputedDisplay: homeContainer ? window.getComputedStyle(homeContainer).display : null,
          homeMobileExists: !!homeMobile,
          homeMobileComputedDisplay: homeMobile ? window.getComputedStyle(homeMobile).display : null,
          homeMobileComputedVisibility: homeMobile ? window.getComputedStyle(homeMobile).visibility : null,
          homeMobileComputedOpacity: homeMobile ? window.getComputedStyle(homeMobile).opacity : null,
          homeMobileRect: homeMobile ? homeMobile.getBoundingClientRect() : null,
          homeDesktopComputedDisplay: homeDesktop ? window.getComputedStyle(homeDesktop).display : null,
          mobileNavComputedDisplay: mobileNav ? window.getComputedStyle(mobileNav).display : null,
          mobileNavRect: mobileNav ? mobileNav.getBoundingClientRect() : null,
          caughtErrors: errors
        };
      })()`,
      returnByValue: true
    });

    console.log('HOME DOM & COMPUTED STYLES CHECK:\n', JSON.stringify(domCheck.result.value, null, 2));

    ws.close();
  } catch (err) {
    console.error('Debug script error:', err);
  }
}

debugHome();
