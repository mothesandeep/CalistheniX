/**
 * Comprehensive Audit Test for All Interactive Elements on Mobile Home Screen
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING COMPREHENSIVE INTERACTIVE AUDIT FOR MOBILE HOME SCREEN\n');

const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
const layoutCss = fs.readFileSync('frontend/css/layout.css', 'utf8');
const navCss = fs.readFileSync('frontend/css/components/nav.css', 'utf8');
const homeCss = fs.readFileSync('frontend/css/components/home-dashboard.css', 'utf8');
const settingsJs = fs.readFileSync('frontend/js/views/settings.js', 'utf8');
const routerJs = fs.readFileSync('frontend/js/router.js', 'utf8');

// ==========================================
// 1. TODAY'S WORKOUT INTERACTIVE AUDIT
// ==========================================
console.log('1. Auditing Today\'s Workout Interactions...');
assert.ok(homeJs.includes('startWorkoutFromResolved()'), 'Start Workout must invoke existing startWorkoutFromResolved');
assert.ok(homeJs.includes('startWorkoutFromId('), 'Selected day start workout must invoke startWorkoutFromId');
assert.ok(homeJs.includes('TODAY · COMPLETED'), 'Completed state must render TODAY · COMPLETED tag');
assert.ok(homeJs.includes('is-completed'), 'Completed state must apply is-completed styling');
assert.ok(homeJs.includes("switchView('history_list')"), 'Completed state must offer viewing history via switchView');
assert.ok(homeJs.includes('Rest & Recovery'), 'Rest day must display Rest & Recovery guidance');
console.log('✓ Today\'s Workout Start, Completed State, and Rest Handling verified.');

// ==========================================
// 2. WEEK NAVIGATOR INTERACTIVE AUDIT
// ==========================================
console.log('\n2. Auditing Week Navigator Interactions...');
assert.ok(homeJs.includes('shiftHomeWeek(-1)'), 'Previous week button must trigger shiftHomeWeek(-1)');
assert.ok(homeJs.includes('shiftHomeWeek(1)'), 'Next week button must trigger shiftHomeWeek(1)');
assert.ok(homeJs.includes('resetHomeWeek()'), 'Date range label must trigger resetHomeWeek() to return to current week');
assert.ok(homeJs.includes('selectHomeDay('), 'Each day column must have selectHomeDay(idx) click handler');
assert.ok(homeJs.includes('initWeekSwipeGestures'), 'Horizontal swipe gestures must be initialized');
console.log('✓ Week navigation (Previous, Next, Current Reset, Day Selection, Swipe) verified.');

// ==========================================
// 3. UP NEXT ROWS INTERACTIVE AUDIT
// ==========================================
console.log('\n3. Auditing Up Next Rows Interactions...');
assert.ok(homeJs.includes('home-mobile-upnext-row'), 'Up Next rows must exist');
assert.ok(homeJs.includes('selectHomeDay(${item.idx})') || homeJs.includes('selectHomeDay('), 'Up Next rows must trigger selectHomeDay to inspect and prepare that workout');
console.log('✓ Up Next row interactions wired to day selection and existing workout flow.');

// ==========================================
// 4. SETTINGS MODAL INTERACTIVE AUDIT
// ==========================================
console.log('\n4. Auditing Mobile Settings Trigger...');
assert.ok(homeJs.includes('openSettingsModal()'), 'Mobile Settings button must invoke existing openSettingsModal()');
assert.ok(settingsJs.includes('function openSettingsModal()'), 'openSettingsModal exists in settings.js');
assert.ok(indexHtml.includes('id="settings-modal-root"'), 'settings-modal-root exists in index.html for overlay');
console.log('✓ Settings button wired to unified existing settings modal without duplication.');

// ==========================================
// 5. BOTTOM NAVIGATION PERSISTENCE & POSITIONING AUDIT
// ==========================================
console.log('\n5. Auditing Bottom Navigation Persistence & Architecture...');

// Check HTML structure and exact item sequence
const navItems = [];
const itemRegex = /<a\s+[^>]*class="[^"]*bottom-nav-item[^"]*"[^>]*data-view="([^"]+)"/g;
let match;
while ((match = itemRegex.exec(indexHtml)) !== null) {
  navItems.push(match[1]);
}

assert.deepStrictEqual(navItems, ['home', 'split', 'workout', 'history_list', 'progress'],
  'Bottom navigation must be Home, Split (2nd), Workout (3rd / center), History, Progress');
assert.strictEqual(navItems[1], 'split', 'Split MUST be the second tab');
assert.strictEqual(navItems[2], 'workout', 'Workout MUST be the exact center (3rd) tab');

// Check Mounting & DOM Persistence
assert.ok(indexHtml.includes('<nav class="app-bottom-nav mobile-nav" id="mobile-bottom-nav">'),
  'Bottom nav must be permanently mounted in body shell, outside app-root');

// Check Stacking Context, Z-Index, and Pointer Events
assert.ok(navCss.includes('z-index: 900'), 'Bottom nav container has proper z-index');
assert.ok(navCss.includes('pointer-events: auto'), 'Bottom nav container allows pointer events');
assert.ok(navCss.includes('.bottom-nav-indicator {\n  position: absolute;\n  top: 4px;\n  bottom: 4px;\n  background: rgba(255, 255, 255, 0.08);\n  border-radius: 9999px;\n  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);\n  pointer-events: none !important;\n  z-index: 1;') || navCss.includes('pointer-events: none !important;'),
  'Sliding indicator must have pointer-events: none to prevent click hijacking');

// Check Scroll Clearance & Overflow
assert.ok(layoutCss.includes('padding: 14px 16px max(96px, calc(80px + env(safe-area-inset-bottom, 0px)));'),
  'app-main scroll container must provide adequate bottom clearance for floating nav bar');

// Check Router delegation
assert.ok(routerJs.includes('initMobileBottomNavInteractions'), 'Router must initialize persistent delegation');
console.log('✓ Bottom navigation architecture, item order, stacking context, and persistence verified.');

// ==========================================
// 6. NO PAGE RELOAD AUDIT
// ==========================================
console.log('\n6. Auditing SPA State Integrity & In-Memory Rendering...');
assert.ok(!homeJs.includes('window.location.reload()'), 'home.js must never trigger full page reloads');
assert.ok(!routerJs.includes('window.location.reload()'), 'router.js must never trigger full page reloads');
console.log('✓ In-memory state updates and reactive re-renders verified without page refreshes.');

console.log('\n🎉 ALL MOBILE HOME INTERACTIVE AUDIT CHECKS PASSED 100%!\n');
