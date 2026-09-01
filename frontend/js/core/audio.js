/**
 * CalistheniX — Audio, Haptics & Screen Wake Lock System
 *
 * All sounds generated dynamically via Web Audio API OscillatorNode — zero external audio files.
 */

function isMuted() { return localStorage.getItem(LS_MUTE_KEY) === '1'; }

function toggleMute() {
  const next = isMuted() ? null : '1';
  if (next) localStorage.setItem(LS_MUTE_KEY, next);
  else      localStorage.removeItem(LS_MUTE_KEY);
  // Update mute button icon in-place without a full re-render.
  document.querySelectorAll('.btn-mute').forEach(btn => {
    btn.innerHTML = next ? renderIcon('volumeMute', 'cx-icon') : renderIcon('volume', 'cx-icon');
    btn.title       = next ? 'Unmute' : 'Mute';
  });
}

function isAudioCuesEnabled() {
  if (isMuted()) return false;
  return localStorage.getItem(LS_AUDIO_CUES_KEY) !== '0';
}

function toggleAudioCues() {
  const current = isAudioCuesEnabled();
  localStorage.setItem(LS_AUDIO_CUES_KEY, current ? '0' : '1');
  return !current;
}

function setAudioCuesEnabled(enabled) {
  localStorage.setItem(LS_AUDIO_CUES_KEY, enabled ? '1' : '0');
}

function isAutoAdvanceEnabled() {
  return localStorage.getItem(LS_AUTO_ADVANCE_KEY) !== '0';
}

function toggleAutoAdvance() {
  const current = isAutoAdvanceEnabled();
  localStorage.setItem(LS_AUTO_ADVANCE_KEY, current ? '0' : '1');
  return !current;
}

function setAutoAdvanceEnabled(enabled) {
  localStorage.setItem(LS_AUTO_ADVANCE_KEY, enabled ? '1' : '0');
}

// Lazy AudioContext with iOS WebKit gesture unlocker
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        _audioCtx = new AudioCtxClass();
      }
    } catch {
      _audioCtx = null;
    }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

// Global user-gesture audio unlock for iOS Safari autoplay restrictions
function setupAudioUnlock() {
  const unlock = () => {
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

// ─── Screen Wake Lock API System ──────────────────────────────────────────
let _screenWakeLock = null;

async function acquireScreenWakeLock() {
  if (typeof isKeepScreenAwake === 'function' && !isKeepScreenAwake()) {
    return;
  }
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
    try {
      if (!_screenWakeLock || _screenWakeLock.released) {
        _screenWakeLock = await navigator.wakeLock.request('screen');
        _screenWakeLock.addEventListener('release', () => {
          _screenWakeLock = null;
        });
      }
    } catch {
      _screenWakeLock = null;
    }
  }
}

async function releaseScreenWakeLock() {
  if (_screenWakeLock) {
    try {
      if (!_screenWakeLock.released && typeof _screenWakeLock.release === 'function') {
        await _screenWakeLock.release();
      }
    } catch {}
    _screenWakeLock = null;
  }
}

function isScreenWakeLockActive() {
  return !(!_screenWakeLock || _screenWakeLock.released);
}

function triggerScreenFlash() {
  if (typeof isFlashScreenEnabled === 'function' && isFlashScreenEnabled()) {
    if (typeof document === 'undefined') return;
    const flashEl = document.createElement('div');
    flashEl.className = 'cx-screen-flash-overlay';
    flashEl.style.position = 'fixed';
    flashEl.style.top = '0';
    flashEl.style.left = '0';
    flashEl.style.width = '100vw';
    flashEl.style.height = '100vh';
    flashEl.style.backgroundColor = 'rgba(255, 255, 255, 0.45)';
    flashEl.style.zIndex = '999999';
    flashEl.style.pointerEvents = 'none';
    flashEl.style.transition = 'opacity 250ms ease-out';
    document.body.appendChild(flashEl);
    setTimeout(() => {
      flashEl.style.opacity = '0';
      setTimeout(() => { if (flashEl.parentNode) flashEl.parentNode.removeChild(flashEl); }, 280);
    }, 120);
  }
}

// Auto-reacquire wake lock when tab returns to foreground if workout is in progress
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const session = typeof getActiveSession === 'function' ? getActiveSession() : null;
      if (session && (session.status === 'in_progress' || session.status === 'active')) {
        if (typeof state !== 'undefined' && state.view === 'workout') {
          await acquireScreenWakeLock();
        }
      }
    }
  });
}

// Play a synthesised beep with full feature-detection and silent degradation.
function beep(freq = 880, durationMs = 80, volume = 0.4, type = 'sine') {
  if (isMuted() || !isAudioCuesEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {}
}

// Safe haptic pulse with iOS Safari feature-detection
function vibrate(pattern = 200) {
  if (isMuted()) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// ── Named cues ───────────────────────────────────────────────────────────────
function cueCountdownTick(secondsRemaining = 3) {
  if (!isAudioCuesEnabled()) return;
  beep(740, 75, 0.42, 'sine');
  vibrate(35);
}

function cueTimerComplete() {
  if (!isAudioCuesEnabled()) return;
  beep(523.25, 80, 0.45, 'sine');
  setTimeout(() => beep(659.25, 90, 0.5, 'sine'), 85);
  setTimeout(() => beep(783.99, 100, 0.55, 'sine'), 180);
  setTimeout(() => beep(1046.50, 260, 0.65, 'sine'), 285);
  vibrate([60, 40, 100, 40, 160]);
  triggerScreenFlash();
}

function cueRestEnd() {
  beep(880, 120, 0.55, 'sine');
  vibrate(200);
  triggerScreenFlash();
}

function cueTick() {
  beep(660, 60, 0.2, 'sine');
}

function cueHoldSave() {
  beep(1047, 100, 0.4, 'sine');
  vibrate(150);
}

function cueSetComplete() {
  beep(587.33, 60, 0.45, 'sine');
  setTimeout(() => beep(880, 90, 0.5, 'sine'), 65);
  vibrate([40, 30, 60]);
}

function cueExerciseComplete() {
  beep(880,  90, 0.5, 'sine');
  setTimeout(() => beep(1174, 120, 0.5, 'sine'), 130);
  vibrate([80, 60, 120]);
}

if (typeof window !== 'undefined') {
  window.isMuted = isMuted;
  window.toggleMute = toggleMute;
  window.isAudioCuesEnabled = isAudioCuesEnabled;
  window.toggleAudioCues = toggleAudioCues;
  window.setAudioCuesEnabled = setAudioCuesEnabled;
  window.isAutoAdvanceEnabled = isAutoAdvanceEnabled;
  window.toggleAutoAdvance = toggleAutoAdvance;
  window.setAutoAdvanceEnabled = setAutoAdvanceEnabled;
  window.getAudioCtx = getAudioCtx;
  window.setupAudioUnlock = setupAudioUnlock;
  window.acquireScreenWakeLock = acquireScreenWakeLock;
  window.releaseScreenWakeLock = releaseScreenWakeLock;
  window.isScreenWakeLockActive = isScreenWakeLockActive;
  window.beep = beep;
  window.vibrate = vibrate;
  window.cueCountdownTick = cueCountdownTick;
  window.cueTimerComplete = cueTimerComplete;
  window.cueRestEnd = cueRestEnd;
  window.cueTick = cueTick;
  window.cueHoldSave = cueHoldSave;
  window.cueSetComplete = cueSetComplete;
  window.cueExerciseComplete = cueExerciseComplete;
}
