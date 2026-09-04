/**
 * CalistheniX — Comprehensive Mobile Settings Redesign QA Test
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 RUNNING COMPREHENSIVE MOBILE SETTINGS REDESIGN AUDIT & QA\n');

// 1. Audit settings.css
console.log('1. Auditing settings.css for Mobile & Desktop isolation...');
const settingsCss = fs.readFileSync('frontend/css/components/settings.css', 'utf8');

assert.ok(settingsCss.includes('.settings-modal-backdrop'), 'settings-modal-backdrop must exist');
assert.ok(settingsCss.includes('@media (min-width: 1024px)'), 'Desktop media query isolation must exist');
assert.ok(settingsCss.includes('@media (max-width: 1023px)'), 'Mobile media query isolation must exist');
assert.ok(settingsCss.includes('.settings-mobile-container'), 'settings-mobile-container must exist');
assert.ok(settingsCss.includes('.settings-mobile-header'), 'settings-mobile-header must exist');
assert.ok(settingsCss.includes('.settings-back-btn'), 'settings-back-btn must exist');
assert.ok(settingsCss.includes('.settings-mobile-title'), 'settings-mobile-title must exist');
assert.ok(settingsCss.includes('.settings-group'), 'settings-group must exist');
assert.ok(settingsCss.includes('.settings-group-label'), 'settings-group-label must exist');
assert.ok(settingsCss.includes('.settings-card'), 'settings-card must exist');
assert.ok(settingsCss.includes('.settings-row'), 'settings-row must exist');
assert.ok(settingsCss.includes('.cx-switch'), 'cx-switch toggle switch styles must exist');
assert.ok(settingsCss.includes('.cx-segmented'), 'cx-segmented segmented control styles must exist');
assert.ok(settingsCss.includes('.settings-swatches-grid'), 'settings-swatches-grid must exist');
assert.ok(settingsCss.includes('.settings-swatch'), 'settings-swatch must exist');
assert.ok(settingsCss.includes('.settings-sheet'), 'settings-sheet bottom sheet modal styles must exist');
console.log('  ✓ settings.css has complete native mobile architecture and desktop modal isolation.');

// 2. Audit settings.js code structure
console.log('\n2. Auditing settings.js functionality...');
const settingsJs = fs.readFileSync('frontend/js/views/settings.js', 'utf8');

assert.ok(settingsJs.includes('function openSettingsModal()'), 'openSettingsModal exists');
assert.ok(settingsJs.includes('function closeSettingsModal()'), 'closeSettingsModal exists');
assert.ok(settingsJs.includes('renderMobileSettingsView'), 'renderMobileSettingsView exists');
assert.ok(settingsJs.includes('renderDesktopSettingsModal'), 'renderDesktopSettingsModal exists');
assert.ok(settingsJs.includes('resetDemoData'), 'resetDemoData exists');
assert.ok(settingsJs.includes('confirmResetEverything'), 'confirmResetEverything exists');
assert.ok(settingsJs.includes('executeResetEverything'), 'executeResetEverything exists');
assert.ok(settingsJs.includes('getWeightUnit'), 'getWeightUnit exists');
assert.ok(settingsJs.includes('setWeightUnit'), 'setWeightUnit exists');
assert.ok(settingsJs.includes('getDefaultRestSec'), 'getDefaultRestSec exists');
assert.ok(settingsJs.includes('setDefaultRestSec'), 'setDefaultRestSec exists');
assert.ok(settingsJs.includes('getRestPauseSec'), 'getRestPauseSec exists');
assert.ok(settingsJs.includes('setRestPauseSec'), 'setRestPauseSec exists');
assert.ok(settingsJs.includes('isKeepScreenAwake'), 'isKeepScreenAwake exists');
assert.ok(settingsJs.includes('toggleKeepScreenAwake'), 'toggleKeepScreenAwake exists');
assert.ok(settingsJs.includes('isSoundsEnabled'), 'isSoundsEnabled exists');
assert.ok(settingsJs.includes('toggleSounds'), 'toggleSounds exists');
assert.ok(settingsJs.includes('isFlashScreenEnabled'), 'isFlashScreenEnabled exists');
assert.ok(settingsJs.includes('toggleFlashScreen'), 'toggleFlashScreen exists');
assert.ok(settingsJs.includes('getEffortMode'), 'getEffortMode exists');
assert.ok(settingsJs.includes('setEffortMode'), 'setEffortMode exists');
assert.ok(settingsJs.includes('getAppTheme'), 'getAppTheme exists');
assert.ok(settingsJs.includes('setAppTheme'), 'setAppTheme exists');
assert.ok(settingsJs.includes('getAccentColor'), 'getAccentColor exists');
assert.ok(settingsJs.includes('setAccentColor'), 'setAccentColor exists');
assert.ok(settingsJs.includes('getBodyDiagramModel'), 'getBodyDiagramModel exists');
assert.ok(settingsJs.includes('setBodyDiagramModel'), 'setBodyDiagramModel exists');
assert.ok(settingsJs.includes('getEquipmentProfile'), 'getEquipmentProfile exists');
assert.ok(settingsJs.includes('toggleEquipmentItem'), 'toggleEquipmentItem exists');
assert.ok(settingsJs.includes('openRestPickerModal'), 'openRestPickerModal exists');
assert.ok(settingsJs.includes('openEquipmentModal'), 'openEquipmentModal exists');
assert.ok(settingsJs.includes('openLanguageModal'), 'openLanguageModal exists');
console.log('  ✓ settings.js contains all required state getters, setters, pickers, and view dispatchers.');

// 3. Functional Simulation & Unit Verification in Mock DOM
console.log('\n3. Simulating settings interactions in mock DOM...');

const mockStorage = {};
const mockLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i) => Object.keys(mockStorage)[i] || null
};

const mockDocElement = {
  styleMap: {},
  style: {
    setProperty: (k, v) => { mockDocElement.styleMap[k] = v; },
    getPropertyValue: (k) => mockDocElement.styleMap[k] || ''
  },
  attrs: {},
  setAttribute: (k, v) => { mockDocElement.attrs[k] = v; },
  getAttribute: (k) => mockDocElement.attrs[k] || null
};

const mockElements = {
  'settings-modal-root': { innerHTML: '', id: 'settings-modal-root' }
};

const mockDocument = {
  documentElement: mockDocElement,
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => {
    if (sel === '.settings-modal-backdrop' && mockElements['settings-modal-root'].innerHTML) {
      return { innerHTML: mockElements['settings-modal-root'].innerHTML };
    }
    return null;
  },
  querySelectorAll: (sel) => [],
  createElement: (tag) => {
    const el = { id: '', className: '', innerHTML: '', style: {}, appendChild: () => {}, querySelectorAll: () => [] };
    return el;
  },
  body: {
    appendChild: (el) => { if (el.id) mockElements[el.id] = el; },
    removeChild: (el) => { if (el.id) delete mockElements[el.id]; },
    style: {}
  }
};

const mockWindow = {
  innerWidth: 390,
  location: { hash: '#home' },
  localStorage: mockLocalStorage,
  document: mockDocument,
  dispatchEvent: () => {}
};

// Create sandbox
const vm = require('vm');
const constantsJs = fs.readFileSync('frontend/js/core/constants.js', 'utf8');

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockLocalStorage,
  state: { view: 'home', weightHistory: [] },
  showToast: () => {},
  loadDashboardSummary: async () => {},
  loadExercises: async () => {},
  switchView: () => {},
  render: () => {},
  console: console
};

vm.createContext(sandbox);

// Execute constants.js
vm.runInContext(constantsJs, sandbox);
// Execute audio.js helpers mock
vm.runInContext(`
  function isMuted() { return localStorage.getItem('cx_muted') === '1'; }
  function toggleMute() {
    const next = isMuted() ? '0' : '1';
    if (next === '1') localStorage.setItem('cx_muted', '1');
    else localStorage.removeItem('cx_muted');
  }
  function isAudioCuesEnabled() { return localStorage.getItem('calisthenix_audio_cues') !== '0'; }
  function toggleAudioCues() {}
  function isAutoAdvanceEnabled() { return localStorage.getItem('calisthenix_auto_advance') !== '0'; }
  function toggleAutoAdvance() {}
  function cueTimerComplete() {}
`, sandbox);

// Execute settings.js
vm.runInContext(settingsJs, sandbox);

// Test Mobile Settings View Rendering
console.log('  Testing Mobile Settings screen rendering (width = 390)...');
sandbox.window.innerWidth = 390;
sandbox.openSettingsModal();

const mobileHtml = mockElements['settings-modal-root'].innerHTML;
assert.ok(mobileHtml.includes('settings-mobile-container'), 'settings-mobile-container must be rendered');
assert.ok(mobileHtml.includes('Demo'), 'Demo section label exists');
assert.ok(mobileHtml.includes("You're in the demo"), 'Demo mode status row exists');
assert.ok(mobileHtml.includes('Reset demo data'), 'Reset demo data row exists');
assert.ok(mobileHtml.includes('Reset everything'), 'Reset everything row exists');
assert.ok(mobileHtml.includes('Import backup'), 'Import backup row exists');
assert.ok(mobileHtml.includes('Export backup'), 'Export backup row exists');
assert.ok(mobileHtml.includes('General'), 'General section label exists');
assert.ok(mobileHtml.includes('Language'), 'Language row exists');
assert.ok(mobileHtml.includes('Weight unit'), 'Weight unit row exists');
assert.ok(mobileHtml.includes('During a workout'), 'Workout section label exists');
assert.ok(mobileHtml.includes('Rest timer'), 'Rest timer row exists');
assert.ok(mobileHtml.includes('Rest-pause rest'), 'Rest-pause rest row exists');
assert.ok(mobileHtml.includes('Keep screen awake'), 'Keep screen awake row exists');
assert.ok(mobileHtml.includes('Sounds'), 'Sounds row exists');
assert.ok(mobileHtml.includes('Flash screen when timer ends'), 'Flash screen row exists');
assert.ok(mobileHtml.includes('Effort per set'), 'Effort per set row exists');
assert.ok(mobileHtml.includes('Appearance'), 'Appearance section label exists');
assert.ok(mobileHtml.includes('Theme'), 'Theme row exists');
assert.ok(mobileHtml.includes('Body diagram'), 'Body diagram row exists');
assert.ok(mobileHtml.includes('Accent color'), 'Accent color section exists');
assert.ok(mobileHtml.includes('Equipment') || mobileHtml.includes('Home Calisthenics') || mobileHtml.includes('Add equipment profile'), 'Equipment profile row exists');
assert.ok(mobileHtml.includes('CalistheniX v2.4.0'), 'CalistheniX version footer exists');
console.log('  ✓ Mobile Settings renders all 6 sections with rich grouped rows.');

// Test Desktop Settings Modal Rendering
console.log('  Testing Desktop Settings modal rendering (width = 1200)...');
sandbox.window.innerWidth = 1200;
sandbox.openSettingsModal();
const desktopHtml = mockElements['settings-modal-root'].innerHTML;
assert.ok(desktopHtml.includes('Settings & Preferences'), 'Desktop modal title exists');
assert.ok(desktopHtml.includes('Weight unit'), 'Desktop weight unit row exists');
assert.ok(desktopHtml.includes('Rest timer'), 'Desktop rest timer row exists');
assert.ok(desktopHtml.includes('Sounds'), 'Desktop sounds row exists');
assert.ok(desktopHtml.includes('Accent color'), 'Desktop accent color exists');
console.log('  ✓ Desktop Settings modal renders unified rich grouped sections on widescreen.');

// Test Controls & Persistence
console.log('  Testing settings persistence and interactive methods...');
sandbox.window.innerWidth = 390;

// Weight unit
sandbox.setWeightUnit('lb');
assert.strictEqual(sandbox.getWeightUnit(), 'lb');
assert.strictEqual(mockStorage['cx_weight_unit'], 'lb');
sandbox.setWeightUnit('kg');
assert.strictEqual(sandbox.getWeightUnit(), 'kg');

// Rest timers
sandbox.setDefaultRestSec(120);
assert.strictEqual(sandbox.getDefaultRestSec(), 120);
assert.strictEqual(mockStorage['cx_default_rest_sec'], '120');

sandbox.setRestPauseSec(20);
assert.strictEqual(sandbox.getRestPauseSec(), 20);
assert.strictEqual(mockStorage['cx_rest_pause_sec'], '20');

// Toggles
const prevAwake = sandbox.isKeepScreenAwake();
sandbox.toggleKeepScreenAwake();
assert.strictEqual(sandbox.isKeepScreenAwake(), !prevAwake);

const prevFlash = sandbox.isFlashScreenEnabled();
sandbox.toggleFlashScreen();
assert.strictEqual(sandbox.isFlashScreenEnabled(), !prevFlash);

// Effort Mode
sandbox.setEffortMode('RPE');
assert.strictEqual(sandbox.getEffortMode(), 'RPE');
assert.strictEqual(mockStorage['cx_effort_mode'], 'RPE');

// Theme
sandbox.setAppTheme('light');
assert.strictEqual(sandbox.getAppTheme(), 'light');
assert.strictEqual(mockDocElement.attrs['data-theme'], 'light');

// Accent Color
sandbox.setAccentColor('#35D8B0');
assert.strictEqual(sandbox.getAccentColor(), '#35D8B0');
assert.strictEqual(mockDocElement.styleMap['--accent'], '#35D8B0');
assert.strictEqual(mockDocElement.styleMap['--phase-train'], '#35D8B0');

// Body diagram model
sandbox.setBodyDiagramModel('female');
assert.strictEqual(sandbox.getBodyDiagramModel(), 'female');
assert.strictEqual(mockStorage['cx_body_diagram_model'], 'female');

// Equipment profile
assert.ok(Array.isArray(sandbox.getEquipmentProfile()));
sandbox.toggleEquipmentItem('weight_vest');
assert.ok(sandbox.getEquipmentProfile().includes('weight_vest'));

// Language
sandbox.setAppLanguage('es');
assert.strictEqual(sandbox.getAppLanguage(), 'es');

// Reset Everything Confirmation & Execution
console.log('  Testing Reset Everything confirmation modal and safe wipe...');
sandbox.confirmResetEverything();
const sheetHtml = mockElements['settings-sheet-root']?.innerHTML || '';
assert.ok(sheetHtml.includes('Reset Everything'), 'Confirmation sheet title must exist');
assert.ok(sheetHtml.includes('Yes, Reset Everything'), 'Destructive confirmation CTA button must exist');
assert.ok(sheetHtml.includes('Cancel'), 'Cancel button must exist');

// Reset Demo Data isolation
console.log('  Testing Demo Reset isolation (does not wipe custom routines/exercises)...');
mockStorage['calisthenix_custom_split'] = JSON.stringify({ name: 'My Pro Split' });
sandbox.resetDemoData();
assert.strictEqual(mockStorage['calisthenix_custom_split'], JSON.stringify({ name: 'My Pro Split' }), 'Demo reset must not delete user splits/exercises');

// Pickers & Modals
console.log('  Testing Duration and Option sheets...');
sandbox.openRestPickerModal('main');
assert.ok(mockElements['settings-sheet-root']?.innerHTML.includes('Rest Timer Duration'), 'Rest Timer Duration sheet opens');
sandbox.setDefaultRestSec(180);
assert.strictEqual(sandbox.getDefaultRestSec(), 180);

sandbox.openRestPickerModal('rest_pause');
assert.ok(mockElements['settings-sheet-root']?.innerHTML.includes('Rest-Pause Rest Duration'), 'Rest-Pause sheet opens');
sandbox.setRestPauseSec(30);
assert.strictEqual(sandbox.getRestPauseSec(), 30);

sandbox.openLanguageModal();
assert.ok(mockElements['settings-sheet-root']?.innerHTML.includes('Select Language'), 'Language sheet opens');
sandbox.setAppLanguage('fr');
assert.strictEqual(sandbox.getAppLanguage(), 'fr');

sandbox.openEquipmentModal();
assert.ok(mockElements['settings-sheet-root']?.innerHTML.includes('Équipement') || mockElements['settings-sheet-root']?.innerHTML.includes('Equipment'), 'Equipment profile sheet opens');

// Back button / Close modal
sandbox.openSettingsModal();
assert.ok(mockElements['settings-modal-root'].innerHTML.length > 0);
sandbox.closeSettingsModal();
assert.strictEqual(mockElements['settings-modal-root'].innerHTML, '');
console.log('  ✓ All controls persist to localStorage and update application state reactively.');

console.log('\n🎉 ALL MOBILE SETTINGS AUDIT TESTS PASSED 100%!\n');
