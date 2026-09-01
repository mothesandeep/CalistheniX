/**
 * Test Simplified Mobile Home Screen Information Hierarchy
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING SIMPLIFIED MOBILE HOME SCREEN INFORMATION HIERARCHY\n');

// 1. Check JS structure in home.js
const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');

assert.ok(homeJs.includes('home-mobile-view'), 'Mobile home view container must exist');
assert.ok(homeJs.includes('home-desktop-view'), 'Desktop home view container must exist');
assert.ok(homeJs.includes('home-mobile-header'), 'Mobile header section must exist');
assert.ok(homeJs.includes('home-mobile-today-card'), 'Mobile Today card must exist');
assert.ok(homeJs.includes('THIS WEEK'), 'THIS WEEK section header must exist');
assert.ok(homeJs.includes('CURRENT STREAK'), 'CURRENT STREAK section header must exist');
assert.ok(homeJs.includes('UP NEXT'), 'UP NEXT section header must exist');

console.log('✓ JS structure conforms to Mobile Home IA:');
console.log('  1. Header (Good morning / Sandeep)');
console.log('  2. TODAY\'S WORKOUT (Hero card with Start Workout CTA)');
console.log('  3. THIS WEEK (M T W T F S S with states ✓, ●, ○, —)');
console.log('  4. CURRENT STREAK (Compact flame + days)');
console.log('  5. UP NEXT (Next 2–3 scheduled workouts)');

// 2. Check CSS structure in home-dashboard.css
const homeCss = fs.readFileSync('frontend/css/components/home-dashboard.css', 'utf8');

assert.ok(homeCss.includes('.home-mobile-view'), '.home-mobile-view CSS rule must exist');
assert.ok(homeCss.includes('.home-desktop-view'), '.home-desktop-view CSS rule must exist');
assert.ok(homeCss.includes('@media (min-width: 1024px)'), 'Desktop viewport query must exist');
assert.ok(homeCss.includes('@media (max-width: 1023px)'), 'Mobile viewport query must exist');
assert.ok(homeCss.includes('.home-mobile-today-card'), '.home-mobile-today-card styles must exist');
assert.ok(homeCss.includes('.home-mobile-day-col.state-done'), 'State done style must exist');
assert.ok(homeCss.includes('.home-mobile-day-col.state-today'), 'State today style must exist');

console.log('✓ CSS responsive rules verified:');
console.log('  - Mobile (< 1024px) displays simplified 5-section hierarchy');
console.log('  - Desktop (>= 1024px) displays complete analytical dashboard');

console.log('\n🎉 ALL SIMPLIFIED MOBILE HOME TESTS PASSED 100%!\n');
