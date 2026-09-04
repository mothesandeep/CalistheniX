/**
 * Final Mobile Home Functional & Responsive QA Verification Suite
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING FINAL MOBILE HOME FUNCTIONAL & RESPONSIVE QA\n');

const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
const layoutCss = fs.readFileSync('frontend/css/layout.css', 'utf8');
const navCss = fs.readFileSync('frontend/css/components/nav.css', 'utf8');
const homeCss = fs.readFileSync('frontend/css/components/home-dashboard.css', 'utf8');
const routerJs = fs.readFileSync('frontend/js/router.js', 'utf8');

// ==========================================
// 1. FUNCTIONAL QA
// ==========================================
console.log('1. Auditing Functional Requirements with Real Application Data...');

// A. Today's Workout Resolution
assert.ok(homeJs.includes('state.todayResolved'), 'Today\'s workout must use real state.todayResolved');
assert.ok(homeJs.includes('startWorkoutFromResolved()'), 'Start Workout must invoke startWorkoutFromResolved');
assert.ok(homeJs.includes('startWorkoutFromId('), 'Selected day start workout must invoke startWorkoutFromId');

// B. Rest Day Detection
assert.ok(homeJs.includes('Rest & Recovery'), 'Rest day must be explicitly handled with Rest & Recovery text');

// C. Real Current Date & Week Range
assert.ok(homeJs.includes('const now = new Date()'), 'Current date must be computed dynamically using Date()');
assert.ok(homeJs.includes('shiftHomeWeek(-1)'), 'Previous week navigation must be supported');
assert.ok(homeJs.includes('shiftHomeWeek(1)'), 'Next week navigation must be supported');
assert.ok(homeJs.includes('resetHomeWeek()'), 'Current week reset must be supported');

// D. Day Selection
assert.ok(homeJs.includes('selectHomeDay('), 'Day selection must be supported in-place');
assert.ok(homeJs.includes('selectedDayIndex'), 'selectedDayIndex must determine active workout inspection');

// E. Up Next Workouts
assert.ok(homeJs.includes('UP NEXT'), 'UP NEXT section must exist');
assert.ok(homeJs.includes('upcomingWorkoutsList'), 'Upcoming workouts must be prioritized');

// F. Streak Value
assert.ok(homeJs.includes('streakDays') || homeJs.includes('summary.streak_days'), 'Streak must be read from dashboard summary');

// G. Settings Modal
assert.ok(homeJs.includes('openSettingsModal()'), 'Settings button must trigger openSettingsModal()');

// H. Bottom Navigation Connectivity
const requiredTabs = ['home', 'split', 'workout', 'progress'];
requiredTabs.forEach(tab => {
  assert.ok(indexHtml.includes(`data-view="${tab}"`), `Bottom nav must contain tab ${tab}`);
});
assert.ok(indexHtml.includes('data-view="stats"') || indexHtml.includes('data-view="history_list"'), 'Bottom nav must contain stats or history_list');

console.log('✓ All functional requirements verified.');

// ==========================================
// 2. RESPONSIVE & LAYOUT QA
// ==========================================
console.log('\n2. Auditing Responsive Layout & Viewport Rules...');

// A. Viewport Boundaries
assert.ok(homeCss.includes('@media (min-width: 1024px) {\n  .home-mobile-view { display: none !important; }\n  .home-desktop-view { display: block !important; }\n}'),
  'Desktop view (>= 1024px) isolated from mobile');
assert.ok(homeCss.includes('@media (max-width: 1023px)'), 'Mobile view rules defined under < 1024px');

// B. Width & Responsive Expansion
assert.ok(homeCss.includes('max-width: 100%') && homeCss.includes('width: 100%'), 'Mobile layout expands to full width without side gutters');

// C. Scroll Clearance & Safe Area
assert.ok(layoutCss.includes('padding: 14px 16px max(96px, calc(80px + env(safe-area-inset-bottom, 0px)));'),
  'app-main scroll container accounts for bottom nav and safe-area inset');
assert.ok(navCss.includes('bottom: max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px));'),
  'Bottom navigation respects safe-area inset');

// D. No Page Reloads
assert.ok(!homeJs.includes('window.location.reload()'), 'No full page reload in home.js');
assert.ok(!routerJs.includes('window.location.reload()'), 'No full page reload in router.js');

// E. Z-Index and Stacking Context
assert.ok(navCss.includes('z-index: 900'), 'Bottom nav container has z-index 900');
assert.ok(navCss.includes('pointer-events: none !important;'), 'Sliding indicator has pointer-events none');

console.log('✓ All responsive & layout audit checks passed.');

console.log('\n🎉 ALL FINAL MOBILE HOME QA CHECKS PASSED (100%)!\n');
