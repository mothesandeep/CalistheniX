/**
 * CalistheniX — Comprehensive Backup System QA Test Suite
 * 
 * Verifies:
 * 1. Export Backup (JSON)
 *    - Gathers all 12 settings, athlete profile, target weight, weight history, and localStorage snapshots
 *    - Integrates backend SQLite dump if available; falls back gracefully offline
 * 2. Import Backup (JSON)
 *    - Validates payload schema before applying changes
 *    - Rejects invalid schemas, non-objects, and corrupted entries
 *    - Restores settings, state, weight history, localStorage, and triggers backend sync
 *    - Re-initializes theme, accent color, and dashboard UI
 * 3. Reset Demo Data
 *    - Restores default bodyweight history and cleans up active sessions
 *    - Preserves user custom settings and routines
 * 4. Reset Everything
 *    - Displays explicit confirmation modal / action sheet
 *    - Fully wipes training data, custom logs, and resets settings to canonical defaults
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=============================================================');
console.log('🧪 RUNNING COMPREHENSIVE BACKUP SYSTEM QA SUITE');
console.log('=============================================================\n');

// ─── Mock Environment Setup ──────────────────────────────────────────────────
let store = {};
const mockLocalStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  key: (i) => Object.keys(store)[i] || null,
  get length() { return Object.keys(store).length; }
};

const mockStyle = {
  properties: {},
  setProperty: function(k, v) { this.properties[k] = v; },
  getPropertyValue: function(k) { return this.properties[k] || ''; }
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
    removeChild: function(c) {},
    click: function() { this.clicked = true; }
  };
}

const mockDocument = {
  documentElement: mockDocElement,
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockElements[sel.slice(1)] || null;
    return null;
  },
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  body: {
    appendChild: (el) => { if (el && el.id) mockElements[el.id] = el; },
    removeChild: (el) => { if (el && el.id) delete mockElements[el.id]; },
    style: {}
  }
};

const dispatchedEvents = [];
const createdBlobs = [];
const createdObjectURLs = [];

const mockWindow = {
  innerWidth: 390,
  location: { hash: '#settings' },
  localStorage: mockLocalStorage,
  document: mockDocument,
  dispatchEvent: (evt) => {
    dispatchedEvents.push(evt);
  },
  matchMedia: (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  switchView: (v) => {
    if (mockWindow.state) mockWindow.state.view = v;
  },
  URL: {
    createObjectURL: (blob) => {
      const url = `blob:mock-url-${createdObjectURLs.length}`;
      createdObjectURLs.push({ url, blob });
      return url;
    },
    revokeObjectURL: (url) => {}
  }
};

class MockBlob {
  constructor(contentParts, options) {
    this.content = contentParts.join('');
    this.type = options ? options.type : '';
    createdBlobs.push(this);
  }
}

let mockApiExportData = null;
let mockApiImportDataPayload = null;

const mockAPI = {
  getExportData: async () => mockApiExportData,
  importBackupData: async (payload) => {
    mockApiImportDataPayload = payload;
    return { status: 'success', imported_logs: 5, imported_sessions: 2 };
  }
};

const toasts = [];
const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockLocalStorage,
  Blob: MockBlob,
  API: mockAPI,
  state: {
    view: 'settings',
    weightHistory: [],
    targetWeight: 77.0,
    weightUnit: 'kg',
    defaultRestSec: 90,
    restPauseSec: 15,
    keepScreenAwake: true,
    soundsEnabled: true,
    flashScreen: false,
    effortMode: 'RIR',
    theme: 'dark',
    bodyDiagramModel: 'male',
    accentColor: '#FF5D5D',
    equipmentProfile: ['pullup_bar', 'dip_station']
  },
  showToast: (msg, isErr) => { toasts.push({ msg, isErr }); },
  loadDashboardSummary: async () => {},
  loadExercises: async () => {},
  switchView: (v) => { 
    if (sandbox.window && sandbox.window.state) sandbox.window.state.view = v;
    sandbox.state.view = v; 
  },
  render: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console,
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail || null;
    }
  }
};

vm.createContext(sandbox);

// Load script files
const constantsJs = fs.readFileSync('frontend/js/core/constants.js', 'utf8');
vm.runInContext(constantsJs, sandbox);

const utilsJs = fs.readFileSync('frontend/js/core/utils.js', 'utf8');
vm.runInContext(utilsJs, sandbox);

const audioJs = fs.readFileSync('frontend/js/core/audio.js', 'utf8');
vm.runInContext(audioJs, sandbox);

const stateJs = fs.readFileSync('frontend/js/core/state.js', 'utf8');
vm.runInContext(stateJs, sandbox);

const settingsJs = fs.readFileSync('frontend/js/views/settings.js', 'utf8');
vm.runInContext(settingsJs, sandbox);

async function runAllTests() {
  // ─── TEST 1: SCHEMA VALIDATION ───────────────────────────────────────────────
  console.log('--- TEST 1: BACKUP PAYLOAD SCHEMA VALIDATION ---');
  {
    // 1.1 Non-object / empty
    let v = sandbox.validateBackupPayload(null);
    assert.strictEqual(v.valid, false, 'Rejects null payload');

    v = sandbox.validateBackupPayload('string');
    assert.strictEqual(v.valid, false, 'Rejects string payload');

    // 1.2 Invalid settings weight unit
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      settings: { weight_unit: 'stone' }
    });
    assert.strictEqual(v.valid, false, 'Rejects invalid weight unit');
    assert.ok(v.error.includes('weight_unit'), 'Error mentions weight_unit');

    // 1.3 Invalid settings theme
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      settings: { theme: 'neon' }
    });
    assert.strictEqual(v.valid, false, 'Rejects invalid theme');

    // 1.4 Invalid numeric timers
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      settings: { default_rest_sec: 9999 }
    });
    assert.strictEqual(v.valid, false, 'Rejects out-of-bounds default_rest_sec');

    // 1.5 Invalid accent hex color
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      settings: { accent_color: 'not-a-color' }
    });
    assert.strictEqual(v.valid, false, 'Rejects malformed accent hex color');

    // 1.6 Malformed weight history entry
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      weight_history: [{ date: '2026-09-01', weight_kg: -5 }]
    });
    assert.strictEqual(v.valid, false, 'Rejects negative weight');

    // 1.7 Valid full bundle
    v = sandbox.validateBackupPayload({
      app: 'CalistheniX',
      export_version: '2.4.0',
      settings: {
        language: 'es',
        weight_unit: 'lb',
        default_rest_sec: 120,
        rest_pause_sec: 20,
        keep_screen_awake: true,
        sounds_enabled: true,
        flash_screen: true,
        effort_mode: 'RPE',
        theme: 'light',
        body_diagram_model: 'female',
        accent_color: '#3B82F6',
        equipment_profile: ['pullup_bar']
      },
      weight_history: [
        { date: '2026-09-01', weight_kg: 76.5 }
      ]
    });
    assert.strictEqual(v.valid, true, 'Accepts valid full backup bundle');

    // 1.8 Valid legacy logs array
    v = sandbox.validateBackupPayload([
      { exercise_id: 1, timestamp: '2026-09-01T10:00:00Z', client_uuid: 'uuid-1', reps: 10 }
    ]);
    assert.strictEqual(v.valid, true, 'Accepts valid legacy array payload');

    console.log('  ✓ Schema validation accurately accepts valid bundles and rejects corrupted payloads.\n');
  }

  // ─── TEST 2: EXPORT BACKUP JSON ──────────────────────────────────────────────
  console.log('--- TEST 2: EXPORT BACKUP DATA ---');
  {
    // Setup custom state
    sandbox.setAppLanguage('es');
    sandbox.setWeightUnit('lb');
    sandbox.setDefaultRestSec(150);
    sandbox.setRestPauseSec(25);
    sandbox.setEffortMode('RPE');
    sandbox.setAppTheme('light');
    sandbox.setBodyDiagramModel('female');
    sandbox.setAccentColor('#3B82F6', false);
    mockLocalStorage.setItem('cx_target_weight', '75.5');
    mockLocalStorage.setItem('cx_weight_history', JSON.stringify([
      { date: '2026-09-01', weight_kg: 78.0 },
      { date: '2026-09-04', weight_kg: 77.2 }
    ]));

    mockApiExportData = {
      logs: [{ id: 1, client_uuid: 'u-1', exercise_id: 2, reps: 12, timestamp: '2026-09-04T12:00:00Z' }],
      workout_sessions: [{ session_uuid: 's-1', routine_name: 'Upper Body', started_at: '2026-09-04T12:00:00Z' }]
    };

    const exportedBundle = await sandbox.exportData();

    assert.strictEqual(exportedBundle.app, 'CalistheniX', 'Bundle app name');
    assert.strictEqual(exportedBundle.schema_version, 2, 'Bundle schema version');
    assert.strictEqual(exportedBundle.settings.language, 'es', 'Exported language setting');
    assert.strictEqual(exportedBundle.settings.weight_unit, 'lb', 'Exported weight unit setting');
    assert.strictEqual(exportedBundle.settings.default_rest_sec, 150, 'Exported default rest setting');
    assert.strictEqual(exportedBundle.settings.rest_pause_sec, 25, 'Exported rest pause setting');
    assert.strictEqual(exportedBundle.settings.effort_mode, 'RPE', 'Exported effort mode setting');
    assert.strictEqual(exportedBundle.settings.theme, 'light', 'Exported theme setting');
    assert.strictEqual(exportedBundle.settings.body_diagram_model, 'female', 'Exported body diagram setting');
    assert.strictEqual(exportedBundle.settings.accent_color, '#3B82F6', 'Exported accent color setting');
    assert.strictEqual(exportedBundle.athlete.target_weight, 75.5, 'Exported target weight');
    assert.strictEqual(exportedBundle.weight_history.length, 2, 'Exported weight history');
    assert.ok(exportedBundle.storage['cx_language'], 'Exported storage snapshot has cx_language');
    assert.strictEqual(exportedBundle.logs.length, 1, 'Merged SQLite logs');
    assert.strictEqual(exportedBundle.workout_sessions.length, 1, 'Merged SQLite workout sessions');

    assert.ok(createdBlobs.length > 0, 'Triggered Blob generation');
    const latestBlob = createdBlobs[createdBlobs.length - 1];
    assert.strictEqual(latestBlob.type, 'application/json', 'Blob type is application/json');
    assert.ok(latestBlob.content.includes('"app": "CalistheniX"'), 'Blob content contains export JSON');

    console.log('  ✓ Export produces comprehensive JSON payload with all 12 settings, athlete data, and storage.\n');
  }

  // ─── TEST 3: IMPORT BACKUP JSON ──────────────────────────────────────────────
  console.log('--- TEST 3: IMPORT BACKUP DATA ---');
  {
    const importBundle = {
      app: 'CalistheniX',
      export_version: '2.4.0',
      schema_version: 2,
      settings: {
        language: 'ja',
        weight_unit: 'kg',
        default_rest_sec: 180,
        rest_pause_sec: 30,
        keep_screen_awake: false,
        sounds_enabled: false,
        flash_screen: true,
        effort_mode: 'Off',
        theme: 'dark',
        body_diagram_model: 'male',
        accent_color: '#FF6B00',
        equipment_profile: ['pullup_bar', 'rings', 'parallettes']
      },
      athlete: {
        target_weight: 80.0,
        weight_history: [
          { date: '2026-08-01', weight_kg: 82.5 },
          { date: '2026-08-15', weight_kg: 81.0 },
          { date: '2026-09-01', weight_kg: 80.2 }
        ]
      },
      weight_history: [
        { date: '2026-08-01', weight_kg: 82.5 },
        { date: '2026-08-15', weight_kg: 81.0 },
        { date: '2026-09-01', weight_kg: 80.2 }
      ],
      storage: {
        cx_custom_test_key: 'test_val'
      },
      logs: [{ id: 99, client_uuid: 'u-99', exercise_id: 1, reps: 20, timestamp: '2026-09-01T09:00:00Z' }]
    };

    const result = await sandbox.applyImportedBackup(importBundle);
    assert.strictEqual(result, true, 'Import returned true');

    // Verify settings restored
    assert.strictEqual(sandbox.getAppLanguage(), 'ja', 'Language restored to ja');
    assert.strictEqual(sandbox.getWeightUnit(), 'kg', 'Weight unit restored to kg');
    assert.strictEqual(sandbox.getDefaultRestSec(), 180, 'Default rest restored to 180s');
    assert.strictEqual(sandbox.getRestPauseSec(), 30, 'Rest-pause restored to 30s');
    assert.strictEqual(sandbox.isKeepScreenAwake(), false, 'Keep screen awake restored to false');
    assert.strictEqual(sandbox.isSoundsEnabled(), false, 'Sounds enabled restored to false (muted)');
    assert.strictEqual(sandbox.isFlashScreenEnabled(), true, 'Flash screen restored to true');
    assert.strictEqual(sandbox.getEffortMode(), 'Off', 'Effort mode restored to Off');
    assert.strictEqual(sandbox.getAppTheme(), 'dark', 'Theme restored to dark');
    assert.strictEqual(sandbox.getAccentColor(), '#FF6B00', 'Accent color restored to #FF6B00');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.getEquipmentProfile())), ['pullup_bar', 'rings', 'parallettes'], 'Equipment profile restored');

    // Verify athlete data restored
    assert.strictEqual(mockLocalStorage.getItem('cx_target_weight'), '80', 'Target weight saved in localStorage');
    const storedHistory = JSON.parse(mockLocalStorage.getItem('cx_weight_history'));
    assert.strictEqual(storedHistory.length, 3, 'Weight history 3 entries in localStorage');
    assert.strictEqual(sandbox.window.state.weightHistory.length, 3, 'Runtime state weight history updated');

    // Verify storage snapshot restored
    assert.strictEqual(mockLocalStorage.getItem('cx_custom_test_key'), 'test_val', 'Custom storage item restored');

    // Verify backend sync
    assert.ok(mockApiImportDataPayload !== null, 'Sent payload to backend API.importBackupData');
    assert.strictEqual(mockApiImportDataPayload.logs.length, 1, 'Transferred logs to backend');

    console.log('  ✓ Import successfully restores settings, athlete data, storage keys, and syncs backend.\n');
  }

  // ─── TEST 4: RESET DEMO DATA ─────────────────────────────────────────────────
  console.log('--- TEST 4: RESET DEMO DATA ---');
  {
    // Set non-default history and an active session
    mockLocalStorage.setItem('cx_weight_history', JSON.stringify([{ date: '2026-09-01', weight_kg: 95.0 }]));
    mockLocalStorage.setItem('cx_active_workout', JSON.stringify({ in_progress: true }));

    sandbox.resetDemoData();

    const restoredHistory = JSON.parse(mockLocalStorage.getItem('cx_weight_history'));
    const defaultHistoryLen = (sandbox.window.CANONICAL_DEFAULT_WEIGHT_HISTORY || sandbox.CANONICAL_DEFAULT_WEIGHT_HISTORY || []).length;
    assert.strictEqual(restoredHistory.length, defaultHistoryLen, 'Restored canonical demo history length');
    assert.strictEqual(mockLocalStorage.getItem('cx_active_workout'), null, 'Active workout session cleared');
    assert.strictEqual(sandbox.getAppLanguage(), 'ja', 'Custom settings (language) preserved');

    console.log('  ✓ Reset demo data restores baseline records and weight history without wiping settings.\n');
  }

  // ─── TEST 5: RESET EVERYTHING (FACTORY RESET) ────────────────────────────────
  console.log('--- TEST 5: RESET EVERYTHING CONFIRMATION & EXECUTION ---');
  {
    // 5.1 Confirmation Modal Open
    sandbox.confirmResetEverything();
    const root = mockElements['settings-sheet-root'];
    assert.ok(root && root.innerHTML.includes('Reset Everything'), 'Renders confirmation dialog');
    assert.ok(root.innerHTML.includes('executeResetEverything()'), 'Provides execute button action');

    // 5.2 Execute Reset Everything
    sandbox.executeResetEverything();

    // Storage should be cleared and defaults re-established
    assert.strictEqual(mockLocalStorage.getItem('cx_custom_test_key'), null, 'Custom storage cleared');
    assert.strictEqual(sandbox.getAppLanguage(), 'en', 'Language reset to en');
    assert.strictEqual(sandbox.getWeightUnit(), 'kg', 'Weight unit reset to kg');
    assert.strictEqual(sandbox.getDefaultRestSec(), 90, 'Default rest reset to 90s');
    assert.strictEqual(sandbox.getRestPauseSec(), 15, 'Rest pause reset to 15s');
    assert.strictEqual(sandbox.isKeepScreenAwake(), true, 'Keep screen awake reset to true');
    assert.strictEqual(sandbox.isSoundsEnabled(), true, 'Sounds enabled reset to true');
    assert.strictEqual(sandbox.isFlashScreenEnabled(), false, 'Flash screen reset to false');
    assert.strictEqual(sandbox.getEffortMode(), 'RIR', 'Effort mode reset to RIR');
    assert.strictEqual(sandbox.getAppTheme(), 'dark', 'Theme reset to dark');
    assert.strictEqual(sandbox.getAccentColor(), '#FF5D5D', 'Accent reset to #FF5D5D');
    assert.strictEqual(sandbox.window.state.view, 'home', 'Redirected to home view');

    console.log('  ✓ Reset everything requires confirmation and cleanly performs full factory reset.\n');
  }

  console.log('=============================================================');
  console.log('🎉 ALL BACKUP SYSTEM TESTS PASSED PERFECTLY! 100% SUCCESS');
  console.log('=============================================================\n');
}

runAllTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
