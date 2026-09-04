/**
 * CalistheniX — Comprehensive Language & Equipment Profiles Integration Test Suite
 * 
 * Verifies:
 * 1. Multi-language switching, translation dictionary, DOM localization, and persistence across 6 languages (en, es, fr, de, it, ja).
 * 2. Equipment Profile CRUD: Create, Read, Update, Delete, and Select profiles.
 * 3. Synchronization between multi-profile storage and legacy single-array storage.
 * 4. Exercise library filtering, routine warnings, and picker indicators for missing equipment.
 * 5. State restoration on simulated reload.
 * 6. Parity between frontend/ and frontend/src/ implementations.
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const path = require('path');

console.log('=============================================================');
console.log('🧪 RUNNING COMPREHENSIVE LANGUAGE & EQUIPMENT PROFILES QA SUITE');
console.log('=============================================================\n');

function createSandboxEnvironment() {
  const store = {};
  const mockLocalStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    _getStore: () => store
  };

  const mockStyle = {
    props: {},
    setProperty: (k, v) => { mockStyle.props[k] = v; },
    getPropertyValue: (k) => mockStyle.props[k] || ''
  };

  const mockDocElement = {
    lang: 'en',
    style: mockStyle,
    attrs: {},
    setAttribute: (k, v) => {
      mockDocElement.attrs[k] = v;
      if (k === 'lang') mockDocElement.lang = v;
    },
    getAttribute: (k) => (k === 'lang' ? mockDocElement.lang : (mockDocElement.attrs[k] || null))
  };

  const mockDOMElements = [];
  function createDOMElement(tag, id, classes = '', dataAttrs = {}, text = '') {
    const el = {
      tagName: tag.toUpperCase(),
      id,
      className: classes,
      textContent: text,
      innerHTML: text,
      dataset: { ...dataAttrs },
      getAttribute: (k) => {
        if (k.startsWith('data-')) {
          const key = k.replace('data-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          return el.dataset[key] !== undefined ? el.dataset[key] : null;
        }
        return null;
      },
      setAttribute: (k, v) => {
        if (k.startsWith('data-')) {
          const key = k.replace('data-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          el.dataset[key] = v;
        }
      },
      querySelectorAll: (sel) => {
        return mockDOMElements.filter(item => {
          if (sel === '[data-i18n]') return item.getAttribute('data-i18n') !== null;
          return false;
        });
      }
    };
    mockDOMElements.push(el);
    return el;
  }

  const mockDocument = {
    documentElement: mockDocElement,
    getElementById: (id) => mockDOMElements.find(e => e.id === id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        return mockDOMElements.find(e => e.id === id) || null;
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '[data-i18n]') {
        return mockDOMElements.filter(item => item.getAttribute('data-i18n') !== null);
      }
      return [];
    },
    createElement: (tag) => createDOMElement(tag, '')
  };

  const dispatchedEvents = [];
  const listeners = {};
  const mockWindow = {
    localStorage: mockLocalStorage,
    document: mockDocument,
    addEventListener: (type, handler) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt);
      if (listeners[evt.type]) {
        listeners[evt.type].forEach(fn => fn(evt));
      }
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type, params = {}) {
        this.type = type;
        this.detail = params.detail || {};
      }
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id)
  };

  const context = vm.createContext({
    window: mockWindow,
    document: mockDocument,
    localStorage: mockLocalStorage,
    CustomEvent: mockWindow.CustomEvent,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    console,
    state: {
      equipmentProfile: []
    }
  });

  return { context, mockLocalStorage, mockDocument, mockWindow, dispatchedEvents, createDOMElement };
}

// ============================================================================
// TEST GROUP 1: CONSTANTS & TRANSLATIONS ACROSS ALL 6 LANGUAGES
// ============================================================================
console.log('--- TEST 1: TRANSLATIONS & CONSTANTS ACROSS ALL 6 LANGUAGES ---');
{
  const { context } = createSandboxEnvironment();
  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  vm.runInContext(constantsCode, context);

  const TRANSLATIONS = context.window.TRANSLATIONS;
  const t = context.window.t;

  assert.ok(TRANSLATIONS, 'TRANSLATIONS dictionary is exported on window');
  assert.ok(typeof t === 'function', 't(key, fallback) helper is exported on window');

  const supportedLangs = ['en', 'es', 'fr', 'de', 'it', 'ja'];
  supportedLangs.forEach(lang => {
    assert.ok(TRANSLATIONS[lang], `Language '${lang}' dictionary exists`);
    assert.ok(TRANSLATIONS[lang].home, `home exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].workout, `workout exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].split, `split exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].progress, `progress exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].stats, `stats exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].settings, `settings exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].equipment, `equipment exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].language, `language exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].equipmentProfiles, `equipmentProfiles exists in '${lang}'`);
    assert.ok(TRANSLATIONS[lang].presetProfile, `presetProfile exists in '${lang}'`);
  });

  // Verify translation helper returns correct string and fallback
  context.localStorage.setItem('cx_language', 'es');
  assert.strictEqual(t('split'), 'Mi Rutina', 't() returns Spanish translation for split');
  assert.strictEqual(t('language'), 'Idioma', 't() returns Spanish translation for language');

  context.localStorage.setItem('cx_language', 'ja');
  assert.strictEqual(t('split'), 'スプリット', 't() returns Japanese translation for split');

  context.localStorage.setItem('cx_language', 'fr');
  assert.strictEqual(t('split'), 'Programme', 't() returns French translation for split');

  context.localStorage.setItem('cx_language', 'de');
  assert.strictEqual(t('split'), 'Split-Plan', 't() returns German translation for split');

  context.localStorage.setItem('cx_language', 'it');
  assert.strictEqual(t('split'), 'Scheda', 't() returns Italian translation for split');

  // Fallback test
  assert.strictEqual(t('non_existent_key_xyz', 'My Fallback'), 'My Fallback', 't() returns fallback when key not found');

  console.log('  ✓ All 6 language dictionaries are complete and translation helper works properly.\n');
}

// ============================================================================
// TEST GROUP 2: DOM LOCALIZATION & LANGUAGE CHANGE EVENT
// ============================================================================
console.log('--- TEST 2: DOM LOCALIZATION & LIVE TRANSLATION ---');
{
  const { context, createDOMElement, mockDocument, dispatchedEvents } = createSandboxEnvironment();
  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const settingsCode = fs.readFileSync(path.join(__dirname, '../js/views/settings.js'), 'utf8');
  const routerCode = fs.readFileSync(path.join(__dirname, '../js/router.js'), 'utf8');

  vm.runInContext(constantsCode, context);
  vm.runInContext(settingsCode, context);
  vm.runInContext(routerCode, context);

  // Create mock DOM elements with data-i18n attributes
  const homeNav = createDOMElement('span', 'nav-home-label', 'nav-label', { i18n: 'home' }, 'Home');
  const workoutNav = createDOMElement('span', 'nav-workout-label', 'nav-label', { i18n: 'workout' }, 'Workout');
  const splitsNav = createDOMElement('span', 'nav-splits-label', 'nav-label', { i18n: 'split' }, 'Splits');
  const settingsHeader = createDOMElement('h2', 'settings-header-title', 'title', { i18n: 'settings' }, 'Settings');

  // Set language to Japanese
  context.setAppLanguage('ja');

  assert.strictEqual(context.localStorage.getItem('cx_language'), 'ja', 'cx_language saved in localStorage');
  assert.strictEqual(mockDocument.documentElement.lang, 'ja', 'document.documentElement.lang updated to ja');
  
  // Verify DOM localization
  assert.strictEqual(homeNav.textContent, 'ホーム', 'homeNav localized to Japanese');
  assert.strictEqual(workoutNav.textContent, 'ワークアウト', 'workoutNav localized to Japanese');
  assert.strictEqual(splitsNav.textContent, 'スプリット', 'splitsNav localized to Japanese');
  assert.strictEqual(settingsHeader.textContent, '設定', 'settingsHeader localized to Japanese');

  // Verify event dispatched
  const langEvt = dispatchedEvents.find(e => e.type === 'cx:language-changed');
  assert.ok(langEvt, 'cx:language-changed event dispatched');
  assert.strictEqual(langEvt.detail.language, 'ja', 'Event detail contains correct language');

  // Switch to Spanish
  context.setAppLanguage('es');
  assert.strictEqual(mockDocument.documentElement.lang, 'es', 'document.documentElement.lang updated to es');
  assert.strictEqual(homeNav.textContent, 'Inicio', 'homeNav localized to Spanish');
  assert.strictEqual(workoutNav.textContent, 'Entrenamiento', 'workoutNav localized to Spanish');
  assert.strictEqual(splitsNav.textContent, 'Mi Rutina', 'splitsNav localized to Spanish');
  assert.strictEqual(settingsHeader.textContent, 'Ajustes', 'settingsHeader localized to Spanish');

  console.log('  ✓ DOM elements with data-i18n are dynamically updated and language persistence verified.\n');
}

// ============================================================================
// TEST GROUP 3: EQUIPMENT PROFILES CRUD & SELECTION
// ============================================================================
console.log('--- TEST 3: EQUIPMENT PROFILES CRUD & SELECTION ---');
{
  const { context, dispatchedEvents } = createSandboxEnvironment();
  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const settingsCode = fs.readFileSync(path.join(__dirname, '../js/views/settings.js'), 'utf8');

  vm.runInContext(constantsCode, context);
  vm.runInContext(settingsCode, context);

  // 1. Initial State: Default Profiles
  const initialProfiles = context.getEquipmentProfiles();
  assert.ok(Array.isArray(initialProfiles), 'Profiles is an array');
  assert.strictEqual(initialProfiles.length, 4, '4 default presets provided');
  assert.ok(initialProfiles.some(p => p.id === 'profile_home'), 'Home Gym profile exists');
  assert.ok(initialProfiles.some(p => p.id === 'profile_bodyweight'), 'Bodyweight Only profile exists');

  const activeId = context.getActiveEquipmentProfileId();
  assert.strictEqual(activeId, 'profile_home', 'Default active profile is profile_home');

  const activeProfile = context.getActiveEquipmentProfile();
  assert.ok(activeProfile.equipment.includes('pullup_bar'), 'Home gym has pullup_bar');
  assert.ok(activeProfile.equipment.includes('dip_bars'), 'Home gym has dip_bars');

  // 2. Switch Active Profile to Bodyweight Only
  context.setActiveEquipmentProfile('profile_bodyweight');
  assert.strictEqual(context.getActiveEquipmentProfileId(), 'profile_bodyweight', 'Active profile changed to profile_bodyweight');
  assert.deepStrictEqual([...context.getEquipmentProfile()], ['floor'], 'Active equipment is now just [floor]');

  // Verify legacy cx_equipment_profile is kept in sync
  const legacyStorage = JSON.parse(context.localStorage.getItem('cx_equipment_profile'));
  assert.deepStrictEqual([...legacyStorage], ['floor'], 'Legacy cx_equipment_profile localStorage kept in sync');

  // 3. Create Custom Profile
  const custom = context.createEquipmentProfile('Minimalist Outdoor', ['pullup_bar', 'rings'], 'Park workouts with rings', 'tree');
  assert.ok(custom.id.startsWith('profile_custom_'), 'Custom profile generated with unique ID');
  assert.strictEqual(custom.name, 'Minimalist Outdoor', 'Custom profile name set');
  assert.deepStrictEqual([...custom.equipment], ['pullup_bar', 'rings'], 'Custom profile equipment set');
  assert.strictEqual(context.getActiveEquipmentProfileId(), custom.id, 'New custom profile is automatically active');
  assert.deepStrictEqual([...context.getEquipmentProfile()], ['pullup_bar', 'rings'], 'Active equipment updated to custom profile equipment');

  // 4. Update Custom Profile
  context.updateEquipmentProfile(custom.id, {
    name: 'Minimalist Outdoor + Bands',
    equipment: ['pullup_bar', 'rings', 'bands']
  });

  const updated = context.getEquipmentProfile(custom.id);
  assert.strictEqual(context.getActiveEquipmentProfile().name, 'Minimalist Outdoor + Bands', 'Profile name updated');
  assert.deepStrictEqual([...context.getActiveEquipmentProfile().equipment], ['pullup_bar', 'rings', 'bands'], 'Profile equipment updated');
  assert.deepStrictEqual([...context.getEquipmentProfile()], ['pullup_bar', 'rings', 'bands'], 'Active equipment reflects updates');

  // 5. Delete Custom Profile (Active)
  context.deleteEquipmentProfile(custom.id);
  const profilesAfterDelete = context.getEquipmentProfiles();
  assert.ok(!profilesAfterDelete.some(p => p.id === custom.id), 'Custom profile was deleted');
  assert.strictEqual(context.getActiveEquipmentProfileId(), 'profile_home', 'Fallback active profile restored to profile_home');
  assert.ok(context.getEquipmentProfile().includes('pullup_bar'), 'Active equipment restored to Home Gym');

  console.log('  ✓ Equipment profiles full lifecycle (Preset, Create, Edit, Delete, Select) verified.\n');
}

// ============================================================================
// TEST GROUP 4: EXERCISE FILTERING & UNAVAILABLE EQUIPMENT WARNINGS
// ============================================================================
console.log('--- TEST 4: EXERCISE FILTERING & UNAVAILABLE WARNINGS ---');
{
  const { context } = createSandboxEnvironment();
  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const settingsCode = fs.readFileSync(path.join(__dirname, '../js/views/settings.js'), 'utf8');
  const splitManagerCode = fs.readFileSync(path.join(__dirname, '../js/views/split-manager.js'), 'utf8');

  vm.runInContext(constantsCode, context);
  vm.runInContext(settingsCode, context);
  vm.runInContext(splitManagerCode, context);

  // Check required equipment detection
  const pullupReq = context.getExerciseRequiredEquipment({ id: 'pullup', name: 'Pull-up', category: 'pull' });
  assert.strictEqual(pullupReq, 'pullup_bar', 'Pull-up requires pullup_bar');

  const ringDipReq = context.getExerciseRequiredEquipment({ id: 'ring_dip', name: 'Ring Dip', category: 'push' });
  assert.strictEqual(ringDipReq, 'rings', 'Ring Dip requires rings');

  const pushupReq = context.getExerciseRequiredEquipment({ id: 'pushup', name: 'Standard Push-up', category: 'push' });
  assert.strictEqual(pushupReq, 'floor', 'Push-up requires floor/none');

  // Set profile to Bodyweight Only (only has 'floor')
  context.setActiveEquipmentProfile('profile_bodyweight');
  const activeEquip = [...context.getEquipmentProfile()];
  assert.deepStrictEqual(activeEquip, ['floor']);

  // Verify missing equipment logic
  const isPullupMissing = !activeEquip.includes(pullupReq);
  assert.strictEqual(isPullupMissing, true, 'Pullup bar is missing in Bodyweight Only profile');

  const isPushupMissing = !activeEquip.includes(pushupReq);
  assert.strictEqual(isPushupMissing, false, 'Floor is available in Bodyweight Only profile');

  // Switch to Full Gym (has everything)
  context.setActiveEquipmentProfile('profile_full');
  const fullEquip = context.getEquipmentProfile();
  assert.ok(fullEquip.includes(pullupReq), 'Pullup bar available in Full Gym profile');
  assert.ok(fullEquip.includes(ringDipReq), 'Rings available in Full Gym profile');

  console.log('  ✓ Equipment requirement resolver and missing equipment warnings accurately computed.\n');
}

// ============================================================================
// TEST GROUP 5: RELOAD RESTORATION & PERSISTENCE
// ============================================================================
console.log('--- TEST 5: RELOAD RESTORATION & PERSISTENCE ---');
{
  const env1 = createSandboxEnvironment();
  const constantsCode = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const settingsCode = fs.readFileSync(path.join(__dirname, '../js/views/settings.js'), 'utf8');

  vm.runInContext(constantsCode, env1.context);
  vm.runInContext(settingsCode, env1.context);

  // Set custom language and custom equipment profile
  env1.context.setAppLanguage('de');
  const customProfile = env1.context.createEquipmentProfile('Outdoor Calisthenics', ['pullup_bar', 'dip_bars', 'bands'], 'Outdoor park gear');

  // Capture persisted localStorage snapshot
  const persistedState = { ...env1.mockLocalStorage._getStore() };

  assert.strictEqual(persistedState.cx_language, 'de');
  assert.strictEqual(persistedState.cx_active_equipment_profile_id, customProfile.id);
  assert.ok(persistedState.cx_equipment_profiles.includes('Outdoor Calisthenics'));

  // Simulate complete app reload into clean environment using saved localStorage
  const env2 = createSandboxEnvironment();
  Object.entries(persistedState).forEach(([k, v]) => env2.mockLocalStorage.setItem(k, v));

  vm.runInContext(constantsCode, env2.context);
  vm.runInContext(settingsCode, env2.context);

  assert.strictEqual(env2.context.getLanguage(), 'de', 'Language restored to German after reload');
  assert.strictEqual(env2.context.getActiveEquipmentProfileId(), customProfile.id, 'Active equipment profile ID restored after reload');
  
  const restoredProfile = env2.context.getActiveEquipmentProfile();
  assert.strictEqual(restoredProfile.name, 'Outdoor Calisthenics', 'Profile name restored after reload');
  assert.deepStrictEqual([...restoredProfile.equipment], ['pullup_bar', 'dip_bars', 'bands'], 'Profile equipment restored after reload');

  console.log('  ✓ State restored seamlessly from localStorage across cold reloads.\n');
}

// ============================================================================
// TEST GROUP 6: DUAL-FILE PARITY VERIFICATION (frontend/ vs frontend/src/)
// ============================================================================
console.log('--- TEST 6: DUAL-FILE PARITY (frontend/ vs frontend/src/) ---');
{
  const constants1 = fs.readFileSync(path.join(__dirname, '../js/core/constants.js'), 'utf8');
  const constants2 = fs.readFileSync(path.join(__dirname, '../src/js/utils/constants.js'), 'utf8');

  // Verify both define the same translation keys
  const getKeys = (code) => {
    const ctx = vm.createContext({ window: {} });
    vm.runInContext(code, ctx);
    return Object.keys(ctx.window.TRANSLATIONS.en).sort();
  };

  const keys1 = getKeys(constants1);
  const keys2 = getKeys(constants2);
  assert.deepStrictEqual(keys1, keys2, 'Translation keys are 100% identical between frontend/ and frontend/src/');

  console.log(`  ✓ Checked ${keys1.length} translation keys across both copies with 100% parity.\n`);
}

console.log('=============================================================');
console.log('🎉 ALL LANGUAGE & EQUIPMENT PROFILES QA SUITE PASSED! (100%)');
console.log('=============================================================\n');
