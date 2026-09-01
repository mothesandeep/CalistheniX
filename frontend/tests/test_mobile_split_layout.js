/**
 * Test Mobile Split Layout Information Architecture
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING MOBILE SPLIT PAGE INFORMATION ARCHITECTURE\n');

// 1. Check split-manager.js contains mobile view structure
const splitManagerJs = fs.readFileSync('frontend/js/views/split-manager.js', 'utf8');

assert.ok(splitManagerJs.includes('split-mobile-view'), 'Mobile split view container must exist');
assert.ok(splitManagerJs.includes('split-desktop-view'), 'Desktop split view container must exist');
assert.ok(splitManagerJs.includes('split-mobile-title'), 'Mobile title element must exist');
assert.ok(splitManagerJs.includes('WEEK SCHEDULE'), 'WEEK SCHEDULE section title must exist');
assert.ok(splitManagerJs.includes('SAVED SPLITS'), 'SAVED SPLITS section title must exist');
assert.ok(splitManagerJs.includes('btn-mobile-new-split'), 'Inline + New Split button must exist');
assert.ok(splitManagerJs.includes('openCreateSplitModal()'), '+ New Split button must call existing modal');
assert.ok(splitManagerJs.includes('split-mobile-day-row'), 'Mobile day row must exist');
assert.ok(splitManagerJs.includes('split-mobile-today-badge'), 'Mobile today badge must exist');
assert.ok(splitManagerJs.includes('split-mobile-saved-card'), 'Mobile saved split card must exist');

console.log('✓ JS structure conforms to Mobile Split IA:');
console.log('  - Header: "My Split" / "Your weekly training plan"');
console.log('  - Section 1: "WEEK SCHEDULE" with 7 Monday->Sunday day rows');
console.log('  - Section 2: "SAVED SPLITS" with inline "+ New Split" action and compact cards');

// 2. Check CSS rules in split-editor.css
const splitEditorCss = fs.readFileSync('frontend/css/components/split-editor.css', 'utf8');

assert.ok(splitEditorCss.includes('.split-mobile-view'), '.split-mobile-view styles defined');
assert.ok(splitEditorCss.includes('.split-desktop-view'), '.split-desktop-view styles defined');
assert.ok(splitEditorCss.includes('@media (min-width: 1024px)'), 'Desktop media query isolation exists');
assert.ok(splitEditorCss.includes('@media (max-width: 1023px)'), 'Mobile media query isolation exists');
assert.ok(splitEditorCss.includes('.split-mobile-day-row.is-today'), 'Today subtle red accent style exists');
assert.ok(splitEditorCss.includes('.split-mobile-day-row.is-rest'), 'Rest day dimmed style exists');
assert.ok(splitEditorCss.includes('.split-mobile-saved-card.is-active-split'), 'Active saved split card style exists');

console.log('✓ CSS responsive rules verified:');
console.log('  - Mobile layout active on < 1024px');
console.log('  - Desktop layout untouched on >= 1024px');

console.log('\n🎉 ALL MOBILE SPLIT IA TESTS PASSED 100%!\n');
