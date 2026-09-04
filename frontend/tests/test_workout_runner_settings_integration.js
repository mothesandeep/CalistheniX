/**
 * CalistheniX — Comprehensive "During a Workout" Settings Integration Test Suite
 *
 * Tests the live, reactive control of all 6 workout settings on the Workout Runner:
 * 1. Rest timer (default rest duration, mid-workout updates, set completion countdown)
 * 2. Rest-pause rest (stepper intervals, dynamic labels, delta adjustments)
 * 3. Keep screen awake (wakeLock request/release lifecycle during workout states and toggles)
 * 4. Sounds (mute/unmute toggling, cue audio suppression, Web Audio oscillator safety)
 * 5. Flash screen when timer ends (DOM flash overlay generation on cueTimerComplete/cueRestEnd)
 * 6. Effort per set (Off / RIR / RPE live toggling, drawer labels, options rendering, and set data updates)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ─── Setup Deterministic DOM & Browser Sandbox ────────────────────────────────

function createWorkoutSettingsSandbox() {
  const listeners = {};
  const storage = {};

  const documentElement = {
    attributes: {},
    style: {
      properties: {},
      setProperty(k, v) { this.properties[k] = v; },
      getPropertyValue(k) { return this.properties[k] || ''; }
    },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] || null; }
  };

  const elements = {};
  const appRoot = {
    id: 'app-root',
    innerHTML: '',
    children: [],
    style: {},
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {}
    }
  };

  const body = {
    children: [],
    appendChild(child) {
      this.children.push(child);
      if (child.id) elements[child.id] = child;
      return child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      if (child.id) delete elements[child.id];
      return child;
    },
    querySelectorAll(selector) {
      if (selector === '.cx-screen-flash-overlay') {
        return this.children.filter(c => c.className && c.className.includes('cx-screen-flash-overlay'));
      }
      return [];
    }
  };

  const doc = {
    documentElement,
    body,
    getElementById(id) {
      if (id === 'app-root') return appRoot;
      return elements[id] || null;
    },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        style: {},
        attributes: {},
        innerHTML: '',
        textContent: '',
        parentNode: null,
        children: [],
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(' '); },
          remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(' '); },
          toggle(c, force) {
            if (force === undefined) {
              if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
            } else if (force) {
              this.classes.add(c);
            } else {
              this.classes.delete(c);
            }
            el.className = Array.from(this.classes).join(' ');
          },
          contains(c) { return this.classes.has(c); }
        },
        setAttribute(k, v) { this.attributes[k] = v; },
        getAttribute(k) { return this.attributes[k] || null; },
        appendChild(child) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) this.children.splice(idx, 1);
          child.parentNode = null;
          return child;
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        remove() {
          if (this.parentNode && this.parentNode.removeChild) {
            this.parentNode.removeChild(this);
          }
        }
      };
      return el;
    },
    querySelectorAll: (selector) => {
      if (selector === '.cx-screen-flash-overlay') {
        return body.querySelectorAll(selector);
      }
      return [];
    },
    querySelector: () => null,
    addEventListener: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }
  };

  const localStorageMock = {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    _storage: storage
  };

  let wakeLockActive = false;
  const navigatorMock = {
    wakeLock: {
      request: async (type) => {
        wakeLockActive = true;
        return {
          type,
          released: false,
          release: () => {
            wakeLockActive = false;
            return Promise.resolve();
          },
          addEventListener: () => {}
        };
      }
    },
    vibrate: (pattern) => true
  };

  let oscNodesCreated = 0;
  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    createOscillator() {
      oscNodesCreated++;
      return {
        type: 'sine',
        frequency: { value: 440 },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {}
      };
    }
    async resume() { this.state = 'running'; }
  }

  const sandbox = {
    window: null,
    document: doc,
    localStorage: localStorageMock,
    navigator: navigatorMock,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: (fn) => 1,
    clearInterval: () => {},
    Date: Date,
    Math: Math,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    CustomEvent: class {
      constructor(name, params) {
        this.type = name;
        this.detail = params?.detail;
      }
    },
    dispatchEvent: (evt) => {
      const name = evt.type;
      if (listeners[name]) {
        listeners[name].forEach(fn => fn(evt));
      }
    },
    addEventListener: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    scrollTo: () => {},
    scrollY: 0,
    location: { hash: '' },
    removeEventListener: () => {},
    _listeners: listeners,
    _getWakeLockActive: () => wakeLockActive,
    _getOscCount: () => oscNodesCreated
  };

  sandbox.window = sandbox;
  return sandbox;
}

function loadCalisthenixRunnerEnvironment(sandbox) {
  const ctx = vm.createContext(sandbox);

  const files = [
    'frontend/js/core/constants.js',
    'frontend/js/core/utils.js',
    'frontend/js/core/audio.js',
    'frontend/js/core/storage.js',
    'frontend/js/core/state.js',
    'frontend/js/views/settings.js',
    'frontend/js/views/workout-runner.js',
    'frontend/js/router.js'
  ];

  for (const f of files) {
    const code = fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }

  return ctx;
}

// ─── Integration Test Suite ───────────────────────────────────────────────────

async function runAllTests() {
  console.log('=============================================================');
  console.log('🧪 RUNNING "DURING A WORKOUT" SETTINGS WORKOUT RUNNER INTEGRATION');
  console.log('=============================================================\n');

  // ─── 1. REST TIMER SETTING ───────────────────────────────────────────────────
  console.log('--- TEST 1: REST TIMER SETTING CONTROLS WORKOUT RUNNER ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);

    // Default is 90s
    assert.strictEqual(ctx.getDefaultRestSec(), 90, 'Initial default rest is 90s');

    // Change to 120s
    ctx.setDefaultRestSec(120);
    assert.strictEqual(ctx.getDefaultRestSec(), 120, 'Getter returns 120s after change');
    assert.strictEqual(ctx.localStorage.getItem('cx_default_rest_sec'), '120', 'Persisted to localStorage');

    // Start workout session
    ctx.startWorkoutFromData('Test Workout', [
      { exercise_id: 'pull_up', exercise_name: 'Pull-up', exercise_type: 'reps', sets: 3, target_val: 10 }
    ]);

    let session = ctx.getActiveSession();
    assert.ok(session, 'Workout session active');
    assert.strictEqual(session.exercises[0].rest_sec, 120, 'Exercise uses selected 120s rest timer');
    assert.strictEqual(session.restTimer.durationSec, 120, 'Session restTimer configured with 120s');

    // Verify UI badge renders 120s
    const cardHtml = ctx.renderMainWorkoutCardView(session);
    assert.ok(cardHtml.includes('⏱ Rest: 120s'), 'Card badge renders selected 120s rest');

    // Dynamic live change during workout without reload
    ctx.setDefaultRestSec(60);
    session = ctx.getActiveSession();
    assert.strictEqual(session.exercises[0].rest_sec, 60, 'Live rest change immediately updates active workout exercise');

    const updatedCardHtml = ctx.renderMainWorkoutCardView(session);
    assert.ok(updatedCardHtml.includes('⏱ Rest: 60s'), 'Card badge immediately reflects live 60s change');

    console.log('  ✓ Rest timer setting accurately controls workout runner and updates live without reload.');
  }

  // ─── 2. REST-PAUSE REST SETTING ──────────────────────────────────────────────
  console.log('\n--- TEST 2: REST-PAUSE REST SETTING CONTROLS STEPPERS & ADJUSTMENTS ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);

    assert.strictEqual(ctx.getRestPauseSec(), 15, 'Default rest-pause rest is 15s');

    ctx.startWorkoutFromData('Test Workout', [
      { exercise_id: 'dip', exercise_name: 'Dip', exercise_type: 'reps', sets: 3, target_val: 10 }
    ]);

    let session = ctx.getActiveSession();
    let barHtml = ctx.renderWorkoutFloatingRestBar(session);
    assert.ok(barHtml.includes('− 15s') && barHtml.includes('+ 15s'), 'Stepper buttons render 15s buttons');
    assert.ok(barHtml.includes('adjustWorkoutRest(-15)') && barHtml.includes('adjustWorkoutRest(15)'), 'Stepper onclick calls 15s delta');

    // Change rest-pause setting to 25s
    ctx.setRestPauseSec(25);
    assert.strictEqual(ctx.getRestPauseSec(), 25, 'Getter returns 25s');
    assert.strictEqual(ctx.localStorage.getItem('cx_rest_pause_sec'), '25', 'Persisted to localStorage');

    // Check that floating rest bar immediately reflects 25s
    barHtml = ctx.renderWorkoutFloatingRestBar(session);
    assert.ok(barHtml.includes('− 25s') && barHtml.includes('+ 25s'), 'Stepper buttons dynamically updated to 25s');
    assert.ok(barHtml.includes('adjustWorkoutRest(-25)') && barHtml.includes('adjustWorkoutRest(25)'), 'Stepper onclick dynamically updated to 25s');

    // Test rest adjustment execution with 25s
    ctx.startWorkoutRest(60);
    assert.strictEqual(ctx.getWorkoutRestState().remaining, 60, 'Rest starts at 60s');
    ctx.adjustWorkoutRest(25);
    assert.strictEqual(ctx.getWorkoutRestState().remaining, 85, 'Rest increases by 25s');
    ctx.adjustWorkoutRest(-25);
    assert.strictEqual(ctx.getWorkoutRestState().remaining, 60, 'Rest decreases by 25s');

    console.log('  ✓ Rest-pause rest setting directly controls stepper durations and delta calculations.');
  }

  // ─── 3. KEEP SCREEN AWAKE SETTING ────────────────────────────────────────────
  console.log('\n--- TEST 3: KEEP SCREEN AWAKE CONTROLS SCREEN WAKE LOCK API ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);
    const tick = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

    assert.strictEqual(ctx.isKeepScreenAwake(), true, 'Default keep screen awake is true');

    // Start workout
    ctx.startWorkoutFromData('Awake Test', [
      { exercise_id: 'pushup', exercise_name: 'Push-up', exercise_type: 'reps', sets: 3, target_val: 10 }
    ]);
    ctx.ensureSessionStarted();
    await tick();
    assert.strictEqual(sb._getWakeLockActive(), true, 'Wake lock acquired on workout start');

    // Pause workout
    ctx.pauseWorkoutSession();
    await tick();
    assert.strictEqual(sb._getWakeLockActive(), false, 'Wake lock released on workout pause');

    // Resume workout
    ctx.resumeWorkoutSession();
    await tick();
    assert.strictEqual(sb._getWakeLockActive(), true, 'Wake lock reacquired on workout resume');

    // Toggle off setting during active workout
    ctx.toggleKeepScreenAwake();
    await tick();
    assert.strictEqual(ctx.isKeepScreenAwake(), false, 'Setting toggled to false');
    assert.strictEqual(ctx.localStorage.getItem('cx_keep_screen_awake'), '0', 'Persisted to localStorage');
    assert.strictEqual(sb._getWakeLockActive(), false, 'Wake lock immediately released when setting turned off');

    // When setting is off, starting or resuming does not acquire wake lock
    ctx.pauseWorkoutSession();
    await tick();
    ctx.resumeWorkoutSession();
    await tick();
    assert.strictEqual(sb._getWakeLockActive(), false, 'Wake lock not acquired when setting is disabled');

    // Toggle back on
    ctx.toggleKeepScreenAwake();
    await tick();
    assert.strictEqual(ctx.isKeepScreenAwake(), true, 'Setting toggled back to true');
    assert.strictEqual(sb._getWakeLockActive(), true, 'Wake lock immediately reacquired when setting re-enabled');

    console.log('  ✓ Keep screen awake directly acquires/releases wake lock across session states and live toggles.');
  }

  // ─── 4. SOUNDS SETTING ───────────────────────────────────────────────────────
  console.log('\n--- TEST 4: SOUNDS SETTING CONTROLS WORKOUT AUDIO & MUTE BEHAVIOR ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);

    assert.strictEqual(ctx.isSoundsEnabled(), true, 'Sounds enabled by default');
    const initialOscCount = sb._getOscCount();

    // Trigger countdown tick and timer complete
    ctx.cueCountdownTick(3);
    ctx.cueSetComplete();
    const soundOscCount = sb._getOscCount();
    assert.ok(soundOscCount > initialOscCount, 'Audio oscillator nodes generated when sounds enabled');

    // Toggle sounds OFF
    ctx.toggleSounds();
    assert.strictEqual(ctx.isSoundsEnabled(), false, 'Sounds disabled after toggle');
    assert.strictEqual(ctx.isMuted(), true, 'isMuted returns true');
    assert.strictEqual(ctx.localStorage.getItem('cx_muted'), '1', 'cx_muted persisted');

    // Trigger cues while muted -> no audio nodes generated
    const mutedOscCountBefore = sb._getOscCount();
    ctx.cueCountdownTick(2);
    ctx.cueTimerComplete();
    ctx.cueRestEnd();
    ctx.cueSetComplete();
    ctx.cueExerciseComplete();
    const mutedOscCountAfter = sb._getOscCount();
    assert.strictEqual(mutedOscCountBefore, mutedOscCountAfter, 'Zero audio oscillators created while sounds disabled');

    // Toggle sounds back ON
    ctx.toggleSounds();
    assert.strictEqual(ctx.isSoundsEnabled(), true, 'Sounds re-enabled');
    ctx.cueSetComplete();
    assert.ok(sb._getOscCount() > mutedOscCountAfter, 'Audio playback resumes immediately upon unmuting');

    console.log('  ✓ Sounds setting cleanly silences all timer and workout audio cues without reload.');
  }

  // ─── 5. FLASH SCREEN WHEN TIMER ENDS SETTING ─────────────────────────────────
  console.log('\n--- TEST 5: FLASH SCREEN WHEN TIMER ENDS CONTROLS SCREEN FLASH OVERLAYS ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);

    assert.strictEqual(ctx.isFlashScreenEnabled(), false, 'Flash screen is disabled by default');

    // Trigger cueTimerComplete and cueRestEnd with flash disabled
    ctx.cueTimerComplete();
    ctx.cueRestEnd();
    assert.strictEqual(sb.document.body.children.length, 0, 'No flash overlay created when setting is off');

    // Enable flash screen
    ctx.toggleFlashScreen();
    assert.strictEqual(ctx.isFlashScreenEnabled(), true, 'Flash screen enabled');
    assert.strictEqual(ctx.localStorage.getItem('cx_flash_screen'), '1', 'Persisted to localStorage');

    // Trigger rest end -> flash overlay created
    ctx.cueRestEnd();
    const flashElements = sb.document.body.querySelectorAll('.cx-screen-flash-overlay');
    assert.ok(flashElements.length > 0, 'Flash overlay element dynamically attached to document.body');

    // Toggle flash screen back OFF
    ctx.toggleFlashScreen();
    assert.strictEqual(ctx.isFlashScreenEnabled(), false, 'Flash screen disabled');

    console.log('  ✓ Flash screen setting dynamically controls visual overlay on timer completion.');
  }

  // ─── 6. EFFORT PER SET SETTING (Off / RIR / RPE) ──────────────────────────────
  console.log('\n--- TEST 6: EFFORT PER SET SETTING (Off / RIR / RPE) CONTROLS WORKOUT LOGGING ---');
  {
    const sb = createWorkoutSettingsSandbox();
    const ctx = loadCalisthenixRunnerEnvironment(sb);

    ctx.startWorkoutFromData('Effort Test', [
      { exercise_id: 'pullup', exercise_name: 'Pull-up', exercise_type: 'reps', sets: 3, target_val: 10 }
    ]);
    let session = ctx.getActiveSession();

    // 1. Default RIR Mode
    assert.strictEqual(ctx.getEffortMode(), 'RIR', 'Default effort mode is RIR');
    let cardHtml = ctx.renderMainWorkoutCardView(session);
    assert.ok(cardHtml.includes('+ Weight / RIR'), 'Drawer link shows "+ Weight / RIR"');
    assert.ok(cardHtml.includes('RIR (Reps in Reserve)'), 'RIR label rendered');
    assert.ok(cardHtml.includes('RIR 0 (Failure / 0 left)'), 'RIR options rendered');

    // Select RIR in workout runner
    ctx.updateWorkoutSetRPE(0, 0, 10);
    session = ctx.getActiveSession();
    assert.strictEqual(session.exercises[0].sets[0].rpe, 10, 'Set RIR/RPE value stored correctly');

    // 2. Switch to RPE Mode
    ctx.setEffortMode('RPE');
    assert.strictEqual(ctx.getEffortMode(), 'RPE', 'Effort mode switched to RPE');
    assert.strictEqual(ctx.localStorage.getItem('cx_effort_mode'), 'RPE', 'Persisted to localStorage');

    session = ctx.getActiveSession();
    cardHtml = ctx.renderMainWorkoutCardView(session);
    assert.ok(cardHtml.includes('+ Weight / RPE'), 'Drawer link shows "+ Weight / RPE"');
    assert.ok(cardHtml.includes('RPE (Effort)'), 'RPE label rendered');
    assert.ok(cardHtml.includes('RPE 10 (Max Effort / Failure)'), 'RPE 10 option rendered');

    // 3. Switch to Off Mode
    ctx.setEffortMode('Off');
    assert.strictEqual(ctx.getEffortMode(), 'Off', 'Effort mode switched to Off');
    assert.strictEqual(ctx.localStorage.getItem('cx_effort_mode'), 'Off', 'Persisted to localStorage');

    session = ctx.getActiveSession();
    cardHtml = ctx.renderMainWorkoutCardView(session);
    assert.ok(cardHtml.includes('+ Weight') && !cardHtml.includes('+ Weight / RPE') && !cardHtml.includes('+ Weight / RIR'), 'Drawer link shows only "+ Weight"');
    assert.ok(!cardHtml.includes('RPE (Effort)') && !cardHtml.includes('RIR (Reps in Reserve)'), 'Effort dropdown omitted when Off');
    assert.ok(cardHtml.includes('grid-template-columns:1fr;'), 'Grid switches to single-column weight layout when Off');

    console.log('  ✓ Effort per set (Off / RIR / RPE) seamlessly controls workout runner drawer and inputs.');
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL 6 "DURING A WORKOUT" SETTINGS FULLY VERIFIED! 100% PASS');
  console.log('=============================================================\n');
}

runAllTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

