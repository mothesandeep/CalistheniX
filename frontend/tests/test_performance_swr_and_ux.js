/**
 * CalistheniX — Performance, SWR Caching & UX Micro-Interactions Test Suite
 */

const assert = require('assert');

// Mock browser environment
global.window = global;
global.document = {
  getElementById: (id) => {
    if (id === 'toast') {
      return {
        className: 'toast toast-hidden',
        textContent: '',
        innerHTML: ''
      };
    }
    return null;
  },
  addEventListener: () => {},
  querySelectorAll: () => []
};

const navMock = {
  vibrate: (pattern) => {
    global._lastVibrated = pattern;
    return true;
  }
};
global.window.navigator = navMock;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: navMock,
    configurable: true,
    writable: true
  });
} catch (e) {
  try {
    globalThis.navigator.vibrate = navMock.vibrate;
  } catch (e2) {}
}

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; },
  key(i) { return Object.keys(this._store)[i] || null; },
  get length() { return Object.keys(this._store).length; }
};

global.state = {
  exercises: [{ id: 1, name: 'Diamond Push-ups' }],
  splits: [{ id: 1, name: 'PPL', is_active: 1 }],
  activeSplit: { id: 1, name: 'PPL', is_active: 1 }
};

// Load utils and api
require('../js/core/utils.js');
require('../js/api.js');
require('../js/core/prefetch.js');

async function runTests() {
  console.log('=============================================================');
  console.log('PERFORMANCE, SWR CACHING & UX AUDIT TEST SUITE');
  console.log('=============================================================');

  // Test 1: Optimistic Mutate Success
  console.log('\n--- 1. Testing Optimistic Mutation (Success Path) ---');
  let stateValue = 10;
  const result = await optimisticMutate({
    optimistic: () => {
      const prev = stateValue;
      stateValue = 20; // instantly update
      return prev;
    },
    action: async () => {
      return 'server_ok';
    },
    rollback: (prev) => {
      stateValue = prev;
    },
    successMsg: 'Value updated'
  });
  assert.strictEqual(result, 'server_ok');
  assert.strictEqual(stateValue, 20);
  console.log('  ✓ 1. Passed: Optimistic mutation executed and preserved on server success.');

  // Test 2: Optimistic Mutate Rollback on Failure
  console.log('\n--- 2. Testing Optimistic Mutation (Rollback on Network Failure) ---');
  let rolledBack = false;
  try {
    await optimisticMutate({
      optimistic: () => {
        const prev = stateValue;
        stateValue = 99; // speculative update
        return prev;
      },
      action: async () => {
        throw new Error('Network timeout (504)');
      },
      rollback: (prev) => {
        stateValue = prev;
        rolledBack = true;
      },
      errorMsg: 'Network error rollback'
    });
    assert.fail('Should have thrown');
  } catch (e) {
    assert.strictEqual(stateValue, 20, 'State must revert to previous value');
    assert.strictEqual(rolledBack, true, 'Rollback callback must be invoked');
  }
  console.log('  ✓ 2. Passed: State gracefully rolled back on rejection.');

  // Test 3: Haptic Feedback Trigger
  console.log('\n--- 3. Testing Tactile Haptics ---');
  triggerHaptic('success');
  assert.deepStrictEqual(global._lastVibrated, [15, 30, 20]);
  triggerHaptic('light');
  assert.strictEqual(global._lastVibrated, 10);
  console.log('  ✓ 3. Passed: Haptic vibrations dispatched cleanly.');

  // Test 4: SWR Cache Invalidation
  console.log('\n--- 4. Testing API SWR Cache & Invalidation ---');
  assert.ok(API.cache instanceof Map);
  API.cache.set('GET:/exercises', {
    data: [{ id: 1, name: 'Test' }],
    timestamp: Date.now(),
    expiresAt: Date.now() + 60000
  });
  assert.strictEqual(API.cache.has('GET:/exercises'), true);
  API.invalidateCache('/exercises');
  assert.strictEqual(API.cache.has('GET:/exercises'), false);
  console.log('  ✓ 4. Passed: API cache stores and invalidates keys correctly.');

  // Test 5: Intent-Based Prefetcher
  console.log('\n--- 5. Testing Intent-Based Prefetcher ---');
  assert.ok(typeof IntentPrefetcher.prefetchViewIntent === 'function');
  assert.ok(typeof IntentPrefetcher.prefetchExerciseIntent === 'function');
  assert.ok(typeof IntentPrefetcher.prefetchSplitIntent === 'function');
  IntentPrefetcher.prefetchViewIntent('stats');
  IntentPrefetcher.prefetchExerciseIntent(1);
  console.log('  ✓ 5. Passed: Intent prefetcher methods warm cache without exceptions.');

  console.log('\n=============================================================');
  console.log('🎉 ALL PERFORMANCE, SWR & UX AUDIT TESTS PASSED 100%!');
  console.log('=============================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
