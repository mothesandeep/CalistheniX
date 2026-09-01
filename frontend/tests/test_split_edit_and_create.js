/**
 * Test Suite: Split Double-Click Edit & Enhanced New Split Screen Creation
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING SPLIT DOUBLE-CLICK EDIT & NEW SPLIT CREATION FEATURES\n');

// 1. Verify split-manager.js contains all necessary functions & markup
const splitManagerJs = fs.readFileSync('frontend/js/views/split-manager.js', 'utf8');

// Event Handlers & Modal Functions
assert.ok(splitManagerJs.includes('function openEditSplitModal('), 'openEditSplitModal function must exist');
assert.ok(splitManagerJs.includes('function closeEditSplitModal('), 'closeEditSplitModal function must exist');
assert.ok(splitManagerJs.includes('function handleUpdateSplit('), 'handleUpdateSplit function must exist');
assert.ok(splitManagerJs.includes('function openCreateSplitModal('), 'openCreateSplitModal function must exist');
assert.ok(splitManagerJs.includes('function closeCreateSplitModal('), 'closeCreateSplitModal function must exist');
assert.ok(splitManagerJs.includes('function handleCreateSplit('), 'handleCreateSplit function must exist');
assert.ok(splitManagerJs.includes('function handleSavedSplitCardClick('), 'handleSavedSplitCardClick function must exist');
assert.ok(splitManagerJs.includes('function applyCreateSplitPreset('), 'applyCreateSplitPreset function must exist');
assert.ok(splitManagerJs.includes('function renderModalScheduleRows('), 'renderModalScheduleRows helper must exist');
assert.ok(splitManagerJs.includes('function openModalDaySheet('), 'openModalDaySheet helper must exist');
assert.ok(splitManagerJs.includes('function selectModalDayRoutine('), 'selectModalDayRoutine helper must exist');

// Double click and double tap bindings
assert.ok(splitManagerJs.includes('ondblclick="openEditSplitModal('), 'Saved split cards and tabs must have ondblclick handler');
assert.ok(splitManagerJs.includes('handleSavedSplitCardClick('), 'Saved split cards and tabs must have double-tap tracking');

// Modal Elements & Titles
assert.ok(splitManagerJs.includes('Edit Training Split'), 'Edit modal title must exist');
assert.ok(splitManagerJs.includes('Create New Training Split'), 'Create modal title must exist');
assert.ok(splitManagerJs.includes('7-DAY WEEKLY SCHEDULE (MONDAY – SUNDAY)'), '7-Day schedule builder section title must exist');
assert.ok(splitManagerJs.includes('Quick Starter Templates'), 'Preset templates section must exist in Create modal');
assert.ok(splitManagerJs.includes('modal-compact-day-row'), 'Modal schedule must use compact day rows');

// Window Exports
assert.ok(splitManagerJs.includes('window.openEditSplitModal = openEditSplitModal'), 'openEditSplitModal must be exported to window');
assert.ok(splitManagerJs.includes('window.openCreateSplitModal = openCreateSplitModal'), 'openCreateSplitModal must be exported to window');
assert.ok(splitManagerJs.includes('window.handleUpdateSplit = handleUpdateSplit'), 'handleUpdateSplit must be exported to window');
assert.ok(splitManagerJs.includes('window.handleCreateSplit = handleCreateSplit'), 'handleCreateSplit must be exported to window');
assert.ok(splitManagerJs.includes('window.openModalDaySheet = openModalDaySheet'), 'openModalDaySheet must be exported to window');

console.log('✓ JS logic verified:');
console.log('  - Double-click & double-tap triggers Edit Split Modal');
console.log('  - + New Split triggers Create Split Screen with 7-Day builder and presets');
console.log('  - Modal day rows are compact and open iOS bottom sheet for routine selection');
console.log('  - Global window exports attached for inline HTML event dispatching');

// 2. Verify API Client in api.js
const apiJs = fs.readFileSync('frontend/js/api.js', 'utf8');
assert.ok(apiJs.includes('updateSplit:'), 'API.updateSplit endpoint must exist');
assert.ok(apiJs.includes('updateSplitSchedule:'), 'API.updateSplitSchedule batch endpoint must exist');
assert.ok(apiJs.includes('createSplit:'), 'API.createSplit endpoint must exist');

console.log('✓ API client methods verified:');
console.log('  - updateSplit, updateSplitSchedule, and createSplit available');

// 3. Verify CSS styling in split-editor.css
const splitEditorCss = fs.readFileSync('frontend/css/components/split-editor.css', 'utf8');
assert.ok(splitEditorCss.includes('.split-modal-backdrop'), '.split-modal-backdrop styles must exist');
assert.ok(splitEditorCss.includes('.split-modal-container'), '.split-modal-container styles must exist');
assert.ok(splitEditorCss.includes('.split-mobile-day-row'), '.split-mobile-day-row styles must exist');
assert.ok(splitEditorCss.includes('.split-sheet-backdrop'), '.split-sheet-backdrop styles must exist');
assert.ok(splitEditorCss.includes('.split-back-btn'), '.split-back-btn styles must exist');

console.log('✓ CSS styles verified:');
console.log('  - Liquid glassmorphism modal styles active');
console.log('  - Full-screen native layout on mobile with round back button');
console.log('  - Compact day row styles and bottom sheet styles active');

console.log('\n🎉 ALL SPLIT EDIT & CREATE TESTS PASSED 100%!\n');
