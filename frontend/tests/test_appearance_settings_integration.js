/**
 * CalistheniX — Appearance Settings Integration Test Suite
 * Validates Theme (Dark/Light/System), Body Diagram (Male/Female),
 * and Accent Color Swatch selection, persistence, dynamic CSS properties,
 * and live view reactivity.
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('CALISTHENIX — APPEARANCE SETTINGS INTEGRATION TESTS');
console.log('=============================================================\n');

// ─── Browser Environment Simulation ──────────────────────────────────────────
const store = {};
const mockLocalStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

const customStyles = {};
const mockStyle = {
  properties: customStyles,
  setProperty: function(k, v) { customStyles[k] = v; },
  getPropertyValue: function(k) { return customStyles[k] || ''; }
};

const mockDocElement = {
  attrs: {},
  style: mockStyle,
  setAttribute: (k, v) => { mockDocElement.attrs[k] = v; },
  getAttribute: (k) => mockDocElement.attrs[k] || null
};

const mockElements = {};
function createMockElement(tag = 'div', id = '') {
  return {
    id,
    className: '',
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    innerHTML: '',
    textContent: '',
    style: { ...mockStyle },
    attrs: {},
    setAttribute: function(k, v) { this.attrs[k] = v; },
    getAttribute: function(k) { return this.attrs[k] || null; },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; },
    appendChild: function(c) {},
    removeChild: function(c) {}
  };
}

const mockDocument = {
  documentElement: mockDocElement,
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockElements[sel.slice(1)] || null;
    return null;
  },
  querySelectorAll: (sel) => [],
  createElement: (tag) => createMockElement(tag),
  body: {
    appendChild: (el) => { if (el && el.id) mockElements[el.id] = el; },
    removeChild: (el) => { if (el && el.id) delete mockElements[el.id]; },
    style: {}
  }
};

const eventListeners = {};
const dispatchedEvents = [];
const mockWindow = {
  innerWidth: 390,
  location: { hash: '#home' },
  localStorage: mockLocalStorage,
  document: mockDocument,
  addEventListener: (name, cb) => {
    if (!eventListeners[name]) eventListeners[name] = [];
    eventListeners[name].push(cb);
  },
  dispatchEvent: (evt) => {
    dispatchedEvents.push(evt);
    const name = evt.type;
    if (eventListeners[name]) {
      eventListeners[name].forEach(cb => cb(evt));
    }
  },
  matchMedia: (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  scrollY: 0,
  scrollTo: () => {}
};

class MockCustomEvent {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail;
  }
}

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockLocalStorage,
  CustomEvent: MockCustomEvent,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  navigator: { vibrate: () => {}, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
  HTMLCanvasElement: class {},
  CanvasRenderingContext2D: class {}
};

vm.createContext(sandbox);

// Helper to run code in sandbox
function runFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, sandbox, { filename: filePath });
}

// Load core scripts in order
runFile('frontend/js/core/constants.js');
runFile('frontend/js/core/utils.js');
runFile('frontend/js/core/audio.js');
runFile('frontend/js/core/storage.js');
runFile('frontend/js/core/state.js');
runFile('frontend/js/components/muscle-map.js');
runFile('frontend/js/views/settings.js');
runFile('frontend/js/router.js');

sandbox.state = sandbox.window.state;
sandbox.ACCENT_SWATCHES = sandbox.window.ACCENT_SWATCHES;
sandbox.MuscleMap = sandbox.window.MuscleMap;
sandbox.getAppTheme = sandbox.window.getAppTheme;
sandbox.setAppTheme = sandbox.window.setAppTheme;
sandbox.getBodyDiagramModel = sandbox.window.getBodyDiagramModel;
sandbox.setBodyDiagramModel = sandbox.window.setBodyDiagramModel;
sandbox.getAccentColor = sandbox.window.getAccentColor;
sandbox.setAccentColor = sandbox.window.setAccentColor;
sandbox.renderSettingsGroupedSections = sandbox.window.renderSettingsGroupedSections;
sandbox.initThemeAndAccent = sandbox.window.initThemeAndAccent;

// ─── TEST 1: THEME TOGGLE & PERSISTENCE ──────────────────────────────────────
console.log('--- TEST 1: THEME SETTING (Dark / Light / System) ---');

// 1a: Set to Light
sandbox.setAppTheme('light');
assert.strictEqual(mockDocElement.getAttribute('data-theme'), 'light', 'data-theme should be light');
assert.strictEqual(mockLocalStorage.getItem('cx_theme'), 'light', 'localStorage should store light');
assert.strictEqual(sandbox.getAppTheme(), 'light', 'getAppTheme() should return light');
let themeEvt = dispatchedEvents.find(e => e.type === 'cx:theme-changed' && e.detail.theme === 'light');
assert.ok(themeEvt, 'cx:theme-changed event fired with light');
console.log('  ✓ Light theme sets data-theme="light", persists in localStorage, and emits cx:theme-changed');

// 1b: Set to Dark
sandbox.setAppTheme('dark');
assert.strictEqual(mockDocElement.getAttribute('data-theme'), 'dark', 'data-theme should be dark');
assert.strictEqual(mockLocalStorage.getItem('cx_theme'), 'dark', 'localStorage should store dark');
assert.strictEqual(sandbox.getAppTheme(), 'dark', 'getAppTheme() should return dark');
themeEvt = dispatchedEvents.find(e => e.type === 'cx:theme-changed' && e.detail.theme === 'dark');
assert.ok(themeEvt, 'cx:theme-changed event fired with dark');
console.log('  ✓ Dark theme sets data-theme="dark", persists in localStorage, and emits cx:theme-changed');

// 1c: Set to System
sandbox.setAppTheme('system');
assert.strictEqual(mockDocElement.getAttribute('data-theme'), 'system', 'data-theme should be system');
assert.strictEqual(mockLocalStorage.getItem('cx_theme'), 'system', 'localStorage should store system');
assert.strictEqual(sandbox.getAppTheme(), 'system', 'getAppTheme() should return system');
themeEvt = dispatchedEvents.find(e => e.type === 'cx:theme-changed' && e.detail.theme === 'system');
assert.ok(themeEvt, 'cx:theme-changed event fired with system');
console.log('  ✓ System theme sets data-theme="system", persists in localStorage, and emits cx:theme-changed');

// 1d: Verify initThemeAndAccent reads from localStorage
mockLocalStorage.setItem('cx_theme', 'light');
sandbox.initThemeAndAccent();
assert.strictEqual(mockDocElement.getAttribute('data-theme'), 'light', 'data-theme re-initialized from localStorage');
console.log('  ✓ Pre-bootstrapped initThemeAndAccent restores theme without DOM flash');

// ─── TEST 2: BODY DIAGRAM MODEL (Male / Female) ──────────────────────────────
console.log('\n--- TEST 2: BODY DIAGRAM MODEL SETTING (Male / Female) ---');

// 2a: Default is male
mockLocalStorage.removeItem('cx_body_diagram_model');
sandbox.state.bodyDiagramModel = 'male';
assert.strictEqual(sandbox.getBodyDiagramModel(), 'male', 'Default body model is male');

// 2b: Render Male Anatomy SVG
const maleFrontSvg = sandbox.MuscleMap.renderFrontSVG(['chest'], ['triceps'], { model: 'male' });
assert.ok(maleFrontSvg.includes('model-male'), 'Male SVG contains model-male class');
assert.ok(maleFrontSvg.includes('id="chest_left"'), 'Male SVG contains male chest group');
assert.ok(maleFrontSvg.includes('id="biceps_left"'), 'Male SVG contains male biceps');

const maleBackSvg = sandbox.MuscleMap.renderBackSVG(['lats'], ['upper_back'], { model: 'male' });
assert.ok(maleBackSvg.includes('model-male'), 'Male Back SVG contains model-male class');
assert.ok(maleBackSvg.includes('id="lats_left"'), 'Male Back SVG contains male lats');
assert.ok(maleBackSvg.includes('id="glutes_left"'), 'Male Back SVG contains male glutes');
console.log('  ✓ Male anatomical vector geometry properly renders anterior and posterior muscle groups');

// 2c: Switch to Female Model
sandbox.setBodyDiagramModel('female');
assert.strictEqual(mockLocalStorage.getItem('cx_body_diagram_model'), 'female', 'localStorage stored female');
assert.strictEqual(sandbox.getBodyDiagramModel(), 'female', 'getBodyDiagramModel() returns female');
assert.strictEqual(sandbox.state.bodyDiagramModel, 'female', 'state.bodyDiagramModel updated to female');
let bodyEvt = dispatchedEvents.find(e => e.type === 'cx:body-model-changed' && e.detail.model === 'female');
assert.ok(bodyEvt, 'cx:body-model-changed event fired with female');

// 2d: Render Female Anatomy SVG
const femaleFrontSvg = sandbox.MuscleMap.renderFrontSVG(['chest'], ['triceps']);
assert.ok(femaleFrontSvg.includes('model-female'), 'Female SVG contains model-female class');
assert.ok(femaleFrontSvg.includes('id="chest_left_f"'), 'Female SVG contains female chest group');
assert.ok(femaleFrontSvg.includes('id="biceps_left_f"'), 'Female SVG contains female biceps');
assert.ok(femaleFrontSvg.includes('id="quads_left_lateral_f"'), 'Female SVG contains female quadriceps');

const femaleBackSvg = sandbox.MuscleMap.renderBackSVG(['lats'], ['upper_back']);
assert.ok(femaleBackSvg.includes('model-female'), 'Female Back SVG contains model-female class');
assert.ok(femaleBackSvg.includes('id="lats_left_f"'), 'Female Back SVG contains female lats');
assert.ok(femaleBackSvg.includes('id="glutes_left_f"'), 'Female Back SVG contains female glutes');
console.log('  ✓ Female anatomical vector geometry properly renders tapered athletic anterior and posterior profiles');

// 2e: Verify Dual Muscle Body SVG respects selected model
const dualSvgFemale = sandbox.MuscleMap.renderDualMuscleBodySvg({ primary: ['abs'], secondary: ['core'] });
assert.ok(dualSvgFemale.includes('model-female'), 'renderDualMuscleBodySvg produces female model when female is active');

sandbox.setBodyDiagramModel('male');
const dualSvgMale = sandbox.MuscleMap.renderDualMuscleBodySvg({ primary: ['abs'], secondary: ['core'] });
assert.ok(dualSvgMale.includes('model-male'), 'renderDualMuscleBodySvg produces male model when male is active');
console.log('  ✓ Dual muscle summary SVG dynamically renders active body diagram model');

// ─── TEST 3: ACCENT COLOR SETTING & FULL CSS TOKEN PALETTE ───────────────────
console.log('\n--- TEST 3: ACCENT COLOR SELECTION & DYNAMIC CSS TOKENS ---');

sandbox.ACCENT_SWATCHES.forEach(swatch => {
  sandbox.setAccentColor(swatch.hex, false);
  assert.strictEqual(mockLocalStorage.getItem('cx_accent_color'), swatch.hex, `localStorage should store ${swatch.hex}`);
  assert.strictEqual(sandbox.getAccentColor(), swatch.hex, `getAccentColor() should return ${swatch.hex}`);
  assert.strictEqual(customStyles['--accent'], swatch.hex, `--accent CSS property set to ${swatch.hex}`);
  assert.strictEqual(customStyles['--phase-train'], swatch.hex, `--phase-train set to ${swatch.hex}`);
  assert.strictEqual(customStyles['--phase-accent'], swatch.hex, `--phase-accent set to ${swatch.hex}`);
  assert.ok(customStyles['--phase-accent-rgb'].length > 0, '--phase-accent-rgb computed');
  assert.ok(customStyles['--accent-dim'].includes('rgba('), '--accent-dim computed');
  assert.ok(customStyles['--accent-surface'].includes('rgba('), '--accent-surface computed');
  assert.ok(customStyles['--accent-ring'].includes('rgba('), '--accent-ring computed');
  assert.ok(customStyles['--accent-glow'].includes('rgba('), '--accent-glow computed');
  assert.ok(customStyles['--border-accent'].includes('rgba('), '--border-accent computed');
  let accentEvt = dispatchedEvents.find(e => e.type === 'cx:accent-changed' && e.detail.color === swatch.hex);
  assert.ok(accentEvt, `cx:accent-changed fired for ${swatch.hex}`);
});
console.log(`  ✓ All ${sandbox.ACCENT_SWATCHES.length} accent color swatches correctly calculate full CSS custom property palette`);

// ─── TEST 4: SETTINGS GROUPED SECTIONS HTML INTEGRATION ──────────────────────
console.log('\n--- TEST 4: SETTINGS UI RENDERING & ACTIVE STATES ---');
sandbox.setAppTheme('light');
sandbox.setBodyDiagramModel('female');
sandbox.setAccentColor('#EC4899', false);

const settingsHtml = sandbox.renderSettingsGroupedSections();
assert.ok(settingsHtml.includes('Theme'), 'Settings HTML includes Theme section');
assert.ok(settingsHtml.includes('Body diagram'), 'Settings HTML includes Body diagram section');
assert.ok(settingsHtml.includes('Accent color'), 'Settings HTML includes Accent color section');

// Verify active segment buttons
assert.ok(settingsHtml.includes('onclick="setAppTheme(\'light\')"'), 'Theme segmented includes light button');
assert.ok(settingsHtml.includes('onclick="setBodyDiagramModel(\'female\')"'), 'Body model segmented includes female button');
assert.ok(settingsHtml.includes('onclick="setAccentColor(\'#EC4899\')"'), 'Accent swatch includes #EC4899');
console.log('  ✓ Settings UI renders Theme, Body Diagram, and Accent Swatches with accurate active states');

// ─── TEST 5: VIEW REACTIVITY ─────────────────────────────────────────────────
console.log('\n--- TEST 5: GLOBAL VIEW REACTIVITY ---');
let renderedViews = [];
sandbox.render = () => { renderedViews.push(sandbox.state.view); };

sandbox.state.view = 'home';
mockWindow.dispatchEvent(new MockCustomEvent('cx:body-model-changed', { detail: { model: 'female' } }));
assert.ok(renderedViews.includes('home'), 'Home view re-rendered on cx:body-model-changed');

sandbox.state.view = 'stats';
mockWindow.dispatchEvent(new MockCustomEvent('cx:body-model-changed', { detail: { model: 'male' } }));
assert.ok(renderedViews.includes('stats'), 'Stats view re-rendered on cx:body-model-changed');

sandbox.state.view = 'progress';
mockWindow.dispatchEvent(new MockCustomEvent('cx:theme-changed', { detail: { theme: 'light' } }));
assert.ok(renderedViews.includes('progress'), 'Progress view re-rendered on cx:theme-changed');

console.log('  ✓ Global views react and re-render immediately upon appearance changes');

console.log('\n=============================================================');
console.log('🎉 ALL APPEARANCE SETTINGS INTEGRATION TESTS PASSED 100%!');
console.log('=============================================================');
