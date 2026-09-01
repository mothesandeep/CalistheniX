/**
 * DOM & State Lifecycle Simulation Test for Split Modals
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING DOM & STATE LIFECYCLE SIMULATION FOR SPLITS\n');

// Mock browser environment
global.window = global;
global.addEventListener = () => {};
global.window.addEventListener = () => {};
global.document = {
  elements: {},
  getElementById(id) {
    return this.elements[id] || null;
  },
  querySelectorAll(sel) {
    return Object.values(this.elements);
  }
};

global.todayISO = () => new Date().toISOString().slice(0, 10);

// Load state and icons
const stateCode = fs.readFileSync('frontend/js/core/state.js', 'utf8');
eval(stateCode);

function renderIcon(name, cls) {
  return `<i class="${name} ${cls}"></i>`;
}
global.renderIcon = renderIcon;
global.escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.showToast = (msg) => console.log(`  [Toast]: ${msg}`);

// Mock API
global.API = {
  getSplitDetail: async (id) => ({
    id,
    name: 'Aesthetic Physique — 5-Day PPL Split',
    description: '5-Day PPL routine',
    is_active: 1,
    schedule: [
      { day_of_week: 0, day_name: 'Monday', day_type: 'workout', workout_id: 1 },
      { day_of_week: 1, day_name: 'Tuesday', day_type: 'workout', workout_id: 3 },
      { day_of_week: 2, day_name: 'Wednesday', day_type: 'workout', workout_id: 5 },
      { day_of_week: 3, day_name: 'Thursday', day_type: 'workout', workout_id: 2 },
      { day_of_week: 4, day_name: 'Friday', day_type: 'workout', workout_id: 4 },
      { day_of_week: 5, day_name: 'Saturday', day_type: 'rest', workout_id: null },
      { day_of_week: 6, day_name: 'Sunday', day_type: 'rest', workout_id: null }
    ]
  }),
  createSplit: async (payload) => ({ id: 99, ...payload }),
  updateSplit: async (id, payload) => ({ id, ...payload }),
  updateSplitSchedule: async (id, days) => ({ status: 'ok' })
};

// Setup initial state
state.splits = [
  {
    id: 1,
    name: 'Aesthetic Physique — 5-Day PPL Split',
    description: '5-Day PPL routine',
    is_active: 1,
    schedule: [
      { day_of_week: 0, day_name: 'Monday', day_type: 'workout', workout_id: 1 },
      { day_of_week: 1, day_name: 'Tuesday', day_type: 'workout', workout_id: 3 },
      { day_of_week: 2, day_name: 'Wednesday', day_type: 'workout', workout_id: 5 },
      { day_of_week: 3, day_name: 'Thursday', day_type: 'workout', workout_id: 2 },
      { day_of_week: 4, day_name: 'Friday', day_type: 'workout', workout_id: 4 },
      { day_of_week: 5, day_name: 'Saturday', day_type: 'rest', workout_id: null },
      { day_of_week: 6, day_name: 'Sunday', day_type: 'rest', workout_id: null }
    ]
  },
  {
    id: 2,
    name: 'Upper / Lower 4-Day',
    description: '4 day strength plan',
    is_active: 0,
    schedule: []
  }
];
state.workouts = [
  { id: 1, name: 'Push A', exercise_count: 17 },
  { id: 2, name: 'Push B', exercise_count: 16 },
  { id: 3, name: 'Pull A', exercise_count: 16 },
  { id: 4, name: 'Pull B', exercise_count: 16 },
  { id: 5, name: 'Legs (Combined)', exercise_count: 20 }
];
state.selectedSplitId = 1;
state.selectedSplitDetail = state.splits[0];

let renderCount = 0;
global.render = function() {
  renderCount++;
};

// Load split-manager.js logic
const splitManagerCode = fs.readFileSync('frontend/js/views/split-manager.js', 'utf8');
eval(splitManagerCode);

// 1. Test Split View rendering
const initialHtml = renderSplitView();
assert.ok(initialHtml.includes('split-mobile-view'), 'Mobile view rendered');
assert.ok(initialHtml.includes('SAVED SPLITS'), 'Saved splits section rendered');
assert.ok(initialHtml.includes('btn-mobile-new-split'), '+ New Split button rendered');
assert.ok(initialHtml.includes('ondblclick="openEditSplitModal(1)"'), 'Double click handler attached to card 1');
console.log('✓ Initial split view HTML contains saved splits and double-click triggers');

// 2. Test opening Create Split modal
openCreateSplitModal();
assert.strictEqual(state.showCreateSplitModal, true, 'state.showCreateSplitModal is true');
const createModalHtml = renderSplitView();
assert.ok(createModalHtml.includes('Create New Training Split'), 'Create modal rendered');
assert.ok(createModalHtml.includes('Quick Starter Templates'), 'Starter presets rendered');
assert.ok(createModalHtml.includes('7-DAY WEEKLY SCHEDULE (MONDAY – SUNDAY)'), '7-day schedule builder rendered');
console.log('✓ Create New Split screen rendered with presets & 7-day schedule planner');

// 3. Test closing Create Split modal
closeCreateSplitModal();
assert.strictEqual(state.showCreateSplitModal, false, 'state.showCreateSplitModal reset to false');
console.log('✓ Create Split modal closed successfully');

// 4. Test opening Edit Split modal (simulating double click on split 1)
openEditSplitModal(1);
assert.strictEqual(state.showEditSplitModal, true, 'state.showEditSplitModal is true');
assert.strictEqual(state.editingSplitId, 1, 'state.editingSplitId is 1');
const editModalHtml = renderSplitView();
assert.ok(editModalHtml.includes('Edit Training Split'), 'Edit modal rendered');
assert.ok(editModalHtml.includes('value="Aesthetic Physique — 5-Day PPL Split"'), 'Split name prefilled');
assert.ok(editModalHtml.includes('Active Program'), 'Active status pill rendered');
assert.ok(editModalHtml.includes('Save Changes'), 'Save Changes button rendered');
console.log('✓ Edit Training Split window opened with split details & schedule');

// 5. Test closing Edit Split modal
closeEditSplitModal();
assert.strictEqual(state.showEditSplitModal, false, 'state.showEditSplitModal reset to false');
assert.strictEqual(state.editingSplitId, null, 'state.editingSplitId reset to null');
console.log('✓ Edit Split modal closed successfully');

// 6. Test double-tap detection helper
// First tap (selects)
handleSavedSplitCardClick(2, { stopPropagation: () => {} });
assert.strictEqual(state.selectedSplitId, 2, 'First tap selected split 2');
assert.strictEqual(state.showEditSplitModal, false, 'Edit modal not opened on single tap');

// Second tap within 300ms (double tap!)
handleSavedSplitCardClick(2, { stopPropagation: () => {} });
assert.strictEqual(state.showEditSplitModal, true, 'Double tap set showEditSplitModal to true');
assert.strictEqual(state.editingSplitId, 2, 'Double tap opened edit modal for split 2');
console.log('✓ Double-tap detection verified for touch devices');

// 7. Test Bottom Sheet Day Picker in Edit Modal
const sheetHtml = renderModalDayPickerSheetHtml('edit', 0); // Monday
assert.ok(sheetHtml.includes('Monday'), 'Sheet header includes day name Monday');
assert.ok(sheetHtml.includes('Rest Day'), 'Sheet contains Rest Day option');
assert.ok(sheetHtml.includes('Push A'), 'Sheet contains saved Push A workout');
assert.ok(sheetHtml.includes('Push B'), 'Sheet contains saved Push B workout');
assert.ok(sheetHtml.includes('Build New Routine from Exercise Library'), 'Sheet contains build routine action');

// Test Mock DOM manipulation with selectModalDayRoutine
const mockTypeInput = { value: 'rest' };
const mockWorkoutInput = { value: '' };
const mockRow = { classList: { toggle: () => {} } };
const mockLabel = { textContent: '', classList: { add: () => {}, remove: () => {} } };
document.elements['edit-day-type-0'] = mockTypeInput;
document.elements['edit-workout-id-0'] = mockWorkoutInput;
document.elements['edit-day-row-0'] = mockRow;
document.elements['edit-day-name-0'] = mockLabel;

selectModalDayRoutine('edit', 0, 'workout', 1);
assert.strictEqual(mockTypeInput.value, 'workout', 'Day type set to workout');
assert.strictEqual(mockWorkoutInput.value, 1, 'Workout id set to 1');
assert.strictEqual(mockLabel.textContent, 'Push A', 'Label updated to Push A');
console.log('✓ Bottom sheet day picker rendered and successfully updated routine assignment');

console.log('\n🎉 ALL DOM SIMULATION & STATE TESTS PASSED 100%!\n');
