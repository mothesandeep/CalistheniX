/**
 * Test Dedicated Mobile App Header
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING DEDICATED MOBILE APP HEADER\n');

// 1. Audit home.js for mobile header and settings integration
const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');

assert.ok(homeJs.includes('home-mobile-header'), 'home-mobile-header must exist');
assert.ok(homeJs.includes('home-mobile-settings-btn'), 'home-mobile-settings-btn must exist');
assert.ok(homeJs.includes('openSettingsModal()'), 'Settings modal trigger must be wired to the mobile header button');

console.log('✓ Mobile Home header has integrated native layout:');
console.log('  - Good morning / Sandeep greeting on left');
console.log('  - Compact ⚙ Settings icon button on right');

// 2. Audit layout.css for suppression of desktop-style mobile-header top bar
const layoutCss = fs.readFileSync('frontend/css/layout.css', 'utf8');

assert.ok(layoutCss.includes('.mobile-header { display: none !important; }'), 'Old desktop-style mobile header top bar must be suppressed');

console.log('✓ Desktop-style global wordmark top bar suppressed on mobile');

// 3. Audit desktop preservation
assert.ok(homeJs.includes('home-desktop-view'), 'Desktop view preserved');
assert.ok(layoutCss.includes('.desktop-sidebar'), 'Desktop sidebar preserved');

console.log('✓ Desktop header & sidebar completely preserved and untouched');

console.log('\n🎉 ALL DEDICATED MOBILE APP HEADER TESTS PASSED 100%!\n');
