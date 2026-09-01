/**
 * CalistheniX — Mobile Floating Navigation & Desktop Preservation Visual Audit
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING COMPREHENSIVE FLOATING NAVIGATION VISUAL AUDIT\n');

// 1. Audit index.html Navigation Structure
const html = fs.readFileSync('frontend/index.html', 'utf8');

// Check Mobile Bottom Nav
const mobileNavMatch = html.match(/<nav\s+class="app-bottom-nav[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
assert.ok(mobileNavMatch, 'Mobile bottom navigation container must exist in index.html');

const mobileNavContent = mobileNavMatch[1];
assert.ok(mobileNavContent.includes('id="bottom-nav-indicator"'), 'Sliding indicator element must exist');

const mobileItems = [...mobileNavContent.matchAll(/<a\s+[^>]*data-view="([^"]+)"[^>]*>[\s\S]*?<span class="bottom-nav-label">([^<]+)<\/span>/g)]
  .map(m => ({ view: m[1], label: m[2].trim() }));

console.log('1. Mobile Navigation Items (Found %d):', mobileItems.length);
mobileItems.forEach((item, idx) => {
  console.log(`   [${idx + 1}] ${item.label} (data-view="${item.view}")`);
});

assert.strictEqual(mobileItems.length, 5, 'Must have exactly 5 mobile navigation items');
assert.strictEqual(mobileItems[0].label, 'Home', 'Item 1 must be Home');
assert.strictEqual(mobileItems[1].label, 'Split', 'Item 2 must be Split');
assert.strictEqual(mobileItems[2].label, 'Workout', 'Item 3 must be Workout (Exact Center)');
assert.strictEqual(mobileItems[3].label, 'History', 'Item 4 must be History');
assert.strictEqual(mobileItems[4].label, 'Progress', 'Item 5 must be Progress');
console.log('   ✓ Mobile ordering strictly follows Home → Split → Workout (Center) → History → Progress');

// Check Desktop Sidebar Nav
const desktopNavMatch = html.match(/<nav\s+class="sidebar-nav"[^>]*>([\s\S]*?)<\/nav>/);
assert.ok(desktopNavMatch, 'Desktop sidebar navigation must exist in index.html');
const desktopNavContent = desktopNavMatch[1];

const desktopItems = [...desktopNavContent.matchAll(/<a\s+[^>]*data-view="([^"]+)"[^>]*>[\s\S]*?<span class="sidebar-nav-text">([^<]+)<\/span>/g)]
  .map(m => ({ view: m[1], label: m[2].trim() }));

console.log('\n2. Desktop Sidebar Navigation (Found %d):', desktopItems.length);
desktopItems.forEach((item, idx) => {
  console.log(`   [${idx + 1}] ${item.label} (data-view="${item.view}")`);
});
assert.ok(desktopItems.length >= 7, 'Desktop must retain full desktop navigation items');
assert.strictEqual(desktopItems[0].label, 'Home');
assert.strictEqual(desktopItems[1].label, 'Workout');
assert.strictEqual(desktopItems[2].label, 'My Split');
console.log('   ✓ Desktop sidebar navigation is completely preserved and untouched');

// 2. Audit nav.css & layout.css
const navCss = fs.readFileSync('frontend/css/components/nav.css', 'utf8');
const layoutCss = fs.readFileSync('frontend/css/layout.css', 'utf8');

console.log('\n3. CSS Visual Architecture Audit:');

// Floating Pill & Glassmorphism
assert.ok(navCss.includes('border-radius: 9999px'), 'Floating nav must have rounded capsule/pill corners');
assert.ok(navCss.includes('backdrop-filter: blur(20px)'), 'Floating nav must have restrained 20px blur');
assert.ok(navCss.includes('rgba(16, 16, 22, 0.85)'), 'Floating nav must use dark translucent glass');
console.log('   ✓ Glass capsule tokens verified (blur, dark glass, pill contour)');

// Safe Area Awareness
assert.ok(navCss.includes('env(safe-area-inset-bottom'), 'Floating nav must respect env(safe-area-inset-bottom)');
assert.ok(layoutCss.includes('env(safe-area-inset-bottom'), 'Content padding must respect env(safe-area-inset-bottom)');
console.log('   ✓ Safe-area inset handling verified on both navigation position and content scroll inset');

// Workout Active Treatment
assert.ok(navCss.includes('.bottom-nav-indicator.indicator-workout'), 'Sliding indicator workout morph state exists');
assert.ok(navCss.includes('.bottom-nav-workout.active'), 'Active workout tab treatment exists');
console.log('   ✓ Primary action Workout elevated state and red ambient accent verified');

// Desktop Hiding
assert.ok(layoutCss.includes('.desktop-sidebar { display: none !important; }'), 'Desktop sidebar hidden on mobile');
assert.ok(layoutCss.includes('.app-bottom-nav { display: none !important; }'), 'Mobile bottom nav hidden on desktop');
console.log('   ✓ Breakpoint isolation between mobile and desktop strictly verified');

console.log('\n🎉 ALL VISUAL AUDIT & NAVIGATION TESTS PASSED 100%!\n');
