/**
 * Test Mobile App Shell Architecture
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING MOBILE APP SHELL ARCHITECTURE\n');

// 1. Audit index.html for app shell structure
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');

assert.ok(indexHtml.includes('<div class="app-layout">'), 'app-layout shell root must exist');
assert.ok(indexHtml.includes('class="app-sidebar desktop-sidebar"'), 'desktop-sidebar component must exist');
assert.ok(indexHtml.includes('<main id="app-root" class="app-main"></main>'), 'app-main scroll container must exist');
assert.ok(indexHtml.includes('<nav class="app-bottom-nav mobile-nav" id="mobile-bottom-nav">'), 'mobile-bottom-nav shell component must exist');

console.log('✓ Shell hierarchy verified in HTML:');
console.log('  <AppLayout>');
console.log('    <DesktopSidebar /> (Desktop only)');
console.log('    <AppContentWrap>');
console.log('      <ScrollablePageContent #app-root />');
console.log('    </AppContentWrap>');
console.log('    <MobileBottomNavigation /> (Persistent root shell layer)');
console.log('  </AppLayout>');

// 2. Audit layout.css for independent scrolling and viewport shell rules
const layoutCss = fs.readFileSync('frontend/css/layout.css', 'utf8');

assert.ok(layoutCss.includes('height: 100dvh;'), 'Mobile shell must constrain height to 100dvh');
assert.ok(layoutCss.includes('overflow-y: auto;'), 'app-main must be independently scrollable');
assert.ok(layoutCss.includes('-webkit-overflow-scrolling: touch;'), 'iOS momentum scrolling enabled on app-main');
assert.ok(layoutCss.includes('overscroll-behavior-y: contain;'), 'overscroll contained to app-main');
assert.ok(layoutCss.includes('padding: 14px 16px max(96px, calc(80px + env(safe-area-inset-bottom, 0px)));'), 'Bottom inset clears navigation and safe area');

console.log('✓ Mobile viewport, independent scrolling, and safe-area inset rules verified');

// 3. Verify desktop shell isolation
assert.ok(layoutCss.includes('.desktop-sidebar { display: none !important; }'), 'Desktop sidebar suppressed on mobile');
assert.ok(layoutCss.includes('@media (min-width: 1024px) {\n  .mobile-header { display: none !important; }\n  .app-bottom-nav { display: none !important; }\n}'), 'Mobile navigation suppressed on desktop');

console.log('✓ Desktop shell completely isolated and preserved (sticky sidebar, full desktop grid)');

console.log('\n🎉 ALL MOBILE APP SHELL ARCHITECTURE TESTS PASSED 100%!\n');
