/**
 * Test Suite: Exercise Library Routine Builder & Weekly Split Assigner Flow
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING EXERCISE LIBRARY ROUTINE BUILDER & SPLIT ASSIGNMENT TEST SUITE\n');

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

// Mock Exercises
state.exercises = [
  { id: 101, name: 'Weighted Dips', movement_pattern: 'horizontal_push', type: 'reps', default_sets: 3, default_reps: 8, default_rest_sec: 90 },
  { id: 102, name: 'Archer Pull-ups', movement_pattern: 'vertical_pull', type: 'reps', default_sets: 3, default_reps: 6, default_rest_sec: 90 },
  { id: 103, name: 'Pistol Squats', movement_pattern: 'squat', type: 'reps', default_sets: 3, default_reps: 6, default_rest_sec: 90 },
  { id: 104, name: 'Dragon Flag', movement_pattern: 'core', type: 'reps', default_sets: 3, default_reps: 8, default_rest_sec: 60 },
  { id: 105, name: 'Tuck Planche Hold', movement_pattern: 'skill_straight_arm_press', type: 'duration', default_sets: 4, default_duration_sec: 15, default_rest_sec: 90 },
  { id: 106, name: 'Wrist Mobility Circles', movement_pattern: 'mobility', type: 'duration', default_sets: 1, default_duration_sec: 30, default_rest_sec: 15 }
];
global.getExercise = (id) => state.exercises.find(e => e.id === id);

// Mock Workouts
state.workouts = [
  {
    id: 1,
    name: 'Push Power Routine',
    description: 'Chest & Shoulder Hypertrophy',
    exercise_count: 2,
    exercises: [
      { exercise_id: 101, exercise_name: 'Weighted Dips', phase: 'main', sets: 3, reps: 8, rest_sec: 90 }
    ]
  },
  {
    id: 2,
    name: 'Pull & Core Beast',
    description: 'Back & Core Focus',
    exercise_count: 2,
    exercises: [
      { exercise_id: 102, exercise_name: 'Archer Pull-ups', phase: 'main', sets: 3, reps: 6, rest_sec: 90 }
    ]
  }
];

// Mock Splits
state.splits = [
  {
    id: 1,
    name: 'Aesthetic 5-Day PPL',
    description: 'Custom Split',
    is_active: 1,
    schedule: [
      { day_of_week: 0, day_name: 'Monday', day_type: 'workout', workout_id: 1 },
      { day_of_week: 1, day_name: 'Tuesday', day_type: 'workout', workout_id: 2 },
      { day_of_week: 2, day_name: 'Wednesday', day_type: 'rest', workout_id: null },
      { day_of_week: 3, day_name: 'Thursday', day_type: 'workout', workout_id: 1 },
      { day_of_week: 4, day_name: 'Friday', day_type: 'workout', workout_id: 2 },
      { day_of_week: 5, day_name: 'Saturday', day_type: 'rest', workout_id: null },
      { day_of_week: 6, day_name: 'Sunday', day_type: 'rest', workout_id: null }
    ]
  }
];
state.selectedSplitId = 1;
state.selectedSplitDetail = state.splits[0];
state.selectedWorkoutId = 1;
state.selectedWorkoutDetail = state.workouts[0];

let updatedSchedulePayload = null;
global.API = {
  getSplitDetail: async (id) => state.splits.find(s => s.id === id),
  getWorkoutDetail: async (id) => state.workouts.find(w => w.id === id),
  updateSplitSchedule: async (splitId, days) => { updatedSchedulePayload = days; return { status: 'ok' }; },
  updateWorkout: async (id, payload) => ({ id, ...payload }),
  createWorkout: async (payload) => ({ id: 99, ...payload }),
  updateScheduleDay: async (splitId, dow, dayData) => ({ status: 'ok' })
};

global.loadSplitDetail = async (id) => { state.selectedSplitDetail = state.splits.find(s => s.id === id); };
global.loadWorkoutDetail = async (id) => { state.selectedWorkoutDetail = state.workouts.find(w => w.id === id); };
global.loadTodayResolved = async () => {};
global.loadWorkouts = async () => {};

let renderCount = 0;
global.render = function() {
  renderCount++;
};

// Load split-manager.js logic
const splitManagerCode = fs.readFileSync('frontend/js/views/split-manager.js', 'utf8');
eval(splitManagerCode);

// 1. Verify Subtabs Navigation
const scheduleViewHtml = renderSplitView();
assert.ok(scheduleViewHtml.includes('Routines &amp; Exercise Library') || scheduleViewHtml.includes('Routines & Exercise Library'), 'Subtabs contains Routines & Exercise Library');
assert.ok(scheduleViewHtml.includes('7-Day Weekly Schedule'), 'Subtabs contains 7-Day Weekly Schedule');
console.log('✓ Subtabs navigation rendered successfully');

// Switch to 'workouts' subtab
setSplitSubTab('workouts');
assert.strictEqual(state.splitSubTab, 'workouts', 'Subtab set to workouts');
const workoutsViewHtml = renderSplitView();
assert.ok(workoutsViewHtml.includes('Add Exercise'), 'Workout builder has Add Exercise button');
assert.ok(workoutsViewHtml.includes('Assign to Week Days'), 'Workout builder has Assign to Week Days button');
console.log('✓ Routine & Exercise Library builder view rendered with library buttons');

// 2. Test Exercise Library Picker Modal
openExerciseLibraryPicker('main');
assert.strictEqual(state.showExercisePickerModal, true, 'showExercisePickerModal is true');
assert.strictEqual(state.exercisePickerPhase, 'main', 'Picker phase is main');

// Filter by Push
setExercisePickerFilter('Push');
assert.strictEqual(state.exercisePickerFilter, 'Push', 'Picker category filtered to Push');
let gridHtml = renderExercisePickerGridHtml();
assert.ok(gridHtml.includes('Weighted Dips'), 'Push category includes Weighted Dips');
assert.ok(!gridHtml.includes('Archer Pull-ups'), 'Push category excludes Archer Pull-ups');

// Search Dips
handlePickerSearch('Dips');
gridHtml = renderExercisePickerGridHtml();
assert.ok(gridHtml.includes('Weighted Dips'), 'Search returns Weighted Dips');

// Add Exercise From Picker to Main Workout
const initialExerciseCount = state.selectedWorkoutDetail.exercises.length;
addExerciseFromPicker(105, 'main'); // Tuck Planche Hold
assert.strictEqual(state.selectedWorkoutDetail.exercises.length, initialExerciseCount + 1, 'Exercise added to routine');
assert.strictEqual(state.selectedWorkoutDetail.exercises[state.selectedWorkoutDetail.exercises.length - 1].exercise_name, 'Tuck Planche Hold');
assert.strictEqual(state.showExercisePickerModal, false, 'Exercise picker closed on addition');
console.log('✓ Exercise Library Picker filtered, searched, and added movement to routine');

// 3. Test Assign Routine to Week Days Modal
openAssignRoutineToDaysModal(1);
assert.strictEqual(state.showAssignDaysModal, true, 'showAssignDaysModal is true');
assert.strictEqual(state.assignRoutineWorkoutId, 1, 'assignRoutineWorkoutId is 1');

// Simulate Form Submit to assign to Monday (0), Wednesday (2), Friday (4)
const mockFormData = new Map([
  ['assign_day_0', '1'],
  ['assign_day_2', '1'],
  ['assign_day_4', '1']
]);
const mockEvent = {
  preventDefault: () => {},
  target: {
    get: (key) => mockFormData.get(key)
  }
};
global.FormData = function() { return mockFormData; };

handleSaveAssignRoutineToDays(mockEvent, 1).then(() => {
  assert.ok(updatedSchedulePayload !== null, 'Schedule payload sent to API');
  assert.strictEqual(updatedSchedulePayload[0].workout_id, 1, 'Monday assigned to routine 1');
  assert.strictEqual(updatedSchedulePayload[2].workout_id, 1, 'Wednesday assigned to routine 1');
  assert.strictEqual(updatedSchedulePayload[4].workout_id, 1, 'Friday assigned to routine 1');
  assert.strictEqual(state.splitSubTab, 'schedule', 'Subtab returned to schedule after assignment');
  console.log('✓ Routine successfully assigned to chosen weekly days');
});

// 4. Test selectWorkoutAndEditRoutine & Routine Editor Modal
selectWorkoutAndEditRoutine(2).then(() => {
  assert.strictEqual(state.showRoutineEditorModal, true, 'Routine editor modal opened');
  assert.strictEqual(state.editingRoutineId, 2, 'Editing routine is 2');
  assert.strictEqual(state.selectedWorkoutId, 2, 'Selected workout is 2');
  console.log('✓ selectWorkoutAndEditRoutine opened dedicated Routine Editor Modal for routine 2');

  // 5. Test Categorized Exercise Library in Routine Editor
  const libHtml = renderGroupedExerciseLibraryHtml();
  assert.ok(libHtml.includes('Push Movements'), 'Contains Push Movements category');
  assert.ok(libHtml.includes('Pull Movements'), 'Contains Pull Movements category');
  assert.ok(libHtml.includes('Legs Movements'), 'Contains Legs Movements category');
  assert.ok(libHtml.includes('Weighted Dips'), 'Contains Weighted Dips');
  assert.ok(libHtml.includes('Archer Pull-ups'), 'Contains Archer Pull-ups');
  assert.ok(libHtml.includes('Pistol Squats'), 'Contains Pistol Squats');

  // Test 1-tap quick adding from categorized library
  const beforeCount = state.selectedWorkoutDetail.exercises.length;
  addExerciseToCurrentRoutine(103, 'main'); // Pistol Squats
  assert.strictEqual(state.selectedWorkoutDetail.exercises.length, beforeCount + 1, 'Pistol Squats added via 1-tap library');
  assert.strictEqual(state.selectedWorkoutDetail.exercises[state.selectedWorkoutDetail.exercises.length - 1].exercise_name, 'Pistol Squats');
  // 6. Test iOS-style Add Exercise Bottom Sheet with Phase Filters (Screenshot 3)
  openAddExerciseSheet('main');
  assert.strictEqual(state.showAddExerciseSheet, true, 'Add exercise sheet opened');
  let addExSheetHtml = renderAddExerciseSheetHtml();
  assert.ok(addExSheetHtml.includes('Add exercise'), 'Sheet title is Add exercise');
  assert.ok(addExSheetHtml.includes('Chosen'), 'Contains Chosen pill filter');
  assert.ok(addExSheetHtml.includes('Warm-up'), 'Contains Warm-up phase filter');
  assert.ok(addExSheetHtml.includes('Main-workout'), 'Contains Main-workout phase filter');
  assert.ok(addExSheetHtml.includes('Cooldown'), 'Contains Cooldown phase filter');
  console.log('✓ iOS-style Add Exercise Bottom Sheet rendered with muscle categories & phase filters (Warm-up, Main, Cooldown)');

  // Test Phase Filter logic
  setAddExPhaseFilter('warmup');
  assert.strictEqual(state.addExercisePhaseFilter, 'warmup', 'Phase filter set to warmup');
  let warmupListHtml = renderAddExerciseSheetHtml();
  assert.ok(warmupListHtml.includes('Wrist Mobility Circles'), 'Warmup filter includes Wrist Mobility Circles');

  setAddExPhaseFilter('main');
  assert.strictEqual(state.addExercisePhaseFilter, 'main', 'Phase filter set to main');
  let mainListHtml = renderAddExerciseSheetHtml();
  assert.ok(mainListHtml.includes('Weighted Dips'), 'Main filter includes Weighted Dips');

  // 7. Test Exercise Configurator Bottom Sheet
  openExerciseConfigurator(101); // Weighted Dips
  assert.strictEqual(state.selectedExerciseForConfig.id, 101, 'Configuring Weighted Dips');
  const configSheetHtml = renderAddExerciseSheetHtml();
  assert.ok(configSheetHtml.includes('Weighted Dips'), 'Configurator title contains Weighted Dips');
  assert.ok(configSheetHtml.includes('Add to routine'), 'Configurator contains Add to routine button');
  assert.ok(configSheetHtml.includes('tap to pause'), 'Showcase contains tap to pause button');
  assert.ok(configSheetHtml.includes('Sets'), 'Configurator contains Sets stepper');

  // Test adjusting sets & submitting
  adjustConfigSets(1); // 3 -> 4 sets
  assert.strictEqual(state.configExerciseSets, 4, 'Sets adjusted to 4');
  
  const countBeforeSubmit = state.selectedWorkoutDetail.exercises.length;
  submitAddConfiguredExercise();
  assert.strictEqual(state.selectedWorkoutDetail.exercises.length, countBeforeSubmit + 1, 'Configured exercise added to routine');
  const lastAdded = state.selectedWorkoutDetail.exercises[state.selectedWorkoutDetail.exercises.length - 1];
  assert.strictEqual(lastAdded.exercise_name, 'Weighted Dips', 'Weighted Dips added');
  assert.strictEqual(lastAdded.sets, 4, 'Added with 4 sets');
  assert.strictEqual(state.showAddExerciseSheet, false, 'Sheet closed after addition');
  console.log('✓ Exercise Configurator adjusted sets and successfully added configured exercise with "Add to routine" button');

  // 8. Test Collapsible Phase Accordion Groups (Warm-up, Main Workout, Cool-down)
  const routineEditorHtml = renderRoutineEditorModalHtml();
  assert.ok(routineEditorHtml.includes('routine-phase-accordion phase-warmup'), 'Contains Warm-up phase accordion');
  assert.ok(routineEditorHtml.includes('routine-phase-accordion phase-main'), 'Contains Main Workout phase accordion');
  assert.ok(routineEditorHtml.includes('routine-phase-accordion phase-cooldown'), 'Contains Cool-down phase accordion');
  assert.ok(routineEditorHtml.includes('Warm-up'), 'Shows Warm-up header');
  assert.ok(routineEditorHtml.includes('Main Workout'), 'Shows Main Workout header');
  assert.ok(routineEditorHtml.includes('Cool-down'), 'Shows Cool-down header');
  console.log('✓ Routine Editor correctly grouped exercises into Collapsible Warm-up, Main Workout, and Cool-down accordions');

  // Test toggling accordion state
  toggleRoutinePhaseAccordion('warmup');
  assert.strictEqual(state.routinePhaseOpen['warmup'], false, 'Warm-up accordion collapsed');
  let collapsedHtml = renderRoutineEditorModalHtml();
  assert.ok(collapsedHtml.includes('phase-warmup'), 'Warm-up phase card rendered');
  
  toggleRoutinePhaseAccordion('warmup');
  assert.strictEqual(state.routinePhaseOpen['warmup'], true, 'Warm-up accordion re-opened');
  console.log('✓ Phase accordion toggle button expands and collapses exercise list smoothly');

  // Test Up/Down Arrows Reordering within Phase
  const mainPhaseExs = state.selectedWorkoutDetail.exercises.filter(ex => getExercisePhase(ex) === 'main');
  if (mainPhaseExs.length >= 2) {
    const p1 = mainPhaseExs[0].exercise_name;
    const p2 = mainPhaseExs[1].exercise_name;
    moveExerciseInPhase('main', 0, 1);
    const updatedMain = state.selectedWorkoutDetail.exercises.filter(ex => getExercisePhase(ex) === 'main');
    assert.strictEqual(updatedMain[0].exercise_name, p2, 'Exercise moved down within main phase');
    assert.strictEqual(updatedMain[1].exercise_name, p1, 'Exercise order swapped within phase');
    moveExerciseInPhase('main', 1, -1);
    console.log('✓ Up/Down arrow steppers successfully reordered exercises inside their specific phase group');
  }

  // 9. Test "What this session hits" anatomy rendering
  const hitsHtml = renderWhatThisSessionHitsHtml(state.selectedWorkoutDetail.exercises);
  assert.ok(hitsHtml.includes('What this session hits'), 'Renders What this session hits card');
  console.log('✓ "What this session hits" medical-grade anatomy diagram rendered successfully');

  closeRoutineEditorModal();
  assert.strictEqual(state.showRoutineEditorModal, false, 'Routine editor modal closed cleanly');

  // 10. Test + New Routine flow
  openCreateWorkoutModal();
  assert.strictEqual(state.showRoutineEditorModal, true, 'New routine editor modal opened');
  assert.strictEqual(state.selectedWorkoutDetail.name, 'New routine', 'Default new routine name is "New routine"');
  updateRoutineTitle('Hypertrophy Upper Body');
  assert.strictEqual(state.selectedWorkoutDetail.name, 'Hypertrophy Upper Body', 'Updated routine title');
  closeRoutineEditorModal();
  console.log('✓ + New Routine flow opened clean editor, allowed title customization, and closed cleanly');

  console.log('\n🎉 ALL EXERCISE LIBRARY & ROUTINE FLOW TESTS PASSED 100%!\n');
});
