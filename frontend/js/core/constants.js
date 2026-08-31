/**
 * CalistheniX — Core Constants
 *
 * Centralises all shared data constants previously scattered across state.js,
 * home.js, and split.js.
 *
 * Load order: must be first among core/ files in index.html.
 */

// ─── SVG Icon System ──────────────────────────────────────────────────────────
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  pullup: '<path d="M3 4h18"/><path d="M6 4v5"/><path d="M18 4v5"/><path d="M9 13v7"/><path d="M15 13v7"/><path d="M9 13h6"/>',
  rings: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><line x1="7" y1="3" x2="7" y2="11.5"/><line x1="17" y1="3" x2="17" y2="11.5"/>',
  tempo: '<path d="m14 3-5 18h10l-5-18z"/><line x1="12" y1="3" x2="8" y2="12"/><circle cx="8" cy="12" r="1.5"/>',
  rpe: '<path d="M12 4a9 9 0 0 0-9 9 9 9 0 0 0 13.5 7.8M21 13a9 9 0 0 0-3.5-7.1"/><line x1="12" y1="13" x2="16" y2="9"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  calendarDays: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  history: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>',
  trendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>',
  dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95l1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95Z"/><path d="m3 3 1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95L8.65-2.65a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95Z"/>',
  barChart: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/><line x1="2" x2="22" y1="20" y2="20"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  moreVertical: '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
  chevronUp: '<polyline points="18 15 12 9 6 15"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M12 2v3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volumeMute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  grip: '<circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/>',
};

/**
 * Render an SVG icon from the ICONS map.
 * @param {string} name - Key in ICONS
 * @param {string} cls  - CSS class string (default: 'cx-icon')
 */
function renderIcon(name, cls = 'cx-icon') {
  const body = ICONS[name] || '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

// ─── Training routine / cycle constants ───────────────────────────────────────
const ROUTINES = ['Push A', 'Push B', 'Pull A', 'Pull B', 'Legs A', 'Legs B'];
const LEVELS   = [1, 2, 3, 4, 5];

/**
 * Rolling 7-day cycle (not tied to weekday).
 * Day 1: Push A | Day 2: Pull A | Day 3: Legs A
 * Day 4: Push B | Day 5: Pull B | Day 6: Legs B | Day 7: Rest
 */
const CYCLE = [
  'Push A',  // day 1
  'Pull A',  // day 2
  'Legs A',  // day 3
  'Push B',  // day 4
  'Pull B',  // day 5
  'Legs B',  // day 6
  'Rest',    // day 7
];

// ─── Calendar constants ───────────────────────────────────────────────────────
// NOTE: Frontend uses Sunday-first order to match JS Date.getDay() (0 = Sunday).
// Backend uses Monday-first. This is intentional — do not "fix" either side.
const DAY_NAMES   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── RPE Scale ────────────────────────────────────────────────────────────────
const RPE_DESCRIPTIONS = {
  1:   'Very light recovery (5+ reps in reserve)',
  2:   'Light warmup (5+ reps in reserve)',
  3:   'Light warmup (4+ reps in reserve)',
  4:   'Moderate warmup (4 reps in reserve)',
  5:   'Moderate warmup (3-4 reps in reserve)',
  6:   'Comfortable effort (~4 reps in reserve)',
  7:   'Moderate effort (~3 reps in reserve)',
  7.5: 'Solid working set (~2-3 reps in reserve)',
  8:   'Challenging effort (2 reps in reserve)',
  8.5: 'Heavy working set (1-2 reps in reserve)',
  9:   'Near maximal effort (1 rep in reserve)',
  9.5: 'Extremely hard (maybe 1 grindy rep left)',
  10:  'Maximal effort / Absolute failure (0 reps in reserve)'
};

// ─── LocalStorage key constants ───────────────────────────────────────────────
const LS_CYCLE_KEY        = 'cx_cycle_start';
const LS_PREFIX           = 'cx_pending_';          // log entry sync queue
const LS_MUTE_KEY         = 'cx_muted';             // '1' = muted
const LS_SESSION_PREFIX   = 'cx_pending_session_';  // session sync queue
const LS_AUDIO_CUES_KEY   = 'calisthenix_audio_cues';
const LS_AUTO_ADVANCE_KEY = 'calisthenix_auto_advance';
const LS_ACTIVE_SESSION   = 'cx_active_session';

// ─── Workout State Machine Constants ─────────────────────────────────────────
const WORKOUT_PHASES = {
  WARMUP: 'WARMUP',
  MAIN_WORKOUT: 'MAIN_WORKOUT',
  COOLDOWN: 'COOLDOWN',
  COMPLETED: 'COMPLETED',
  // Backward-compatibility aliases
  WARM_UP: 'WARMUP',
  COOL_DOWN: 'COOLDOWN',
};

const PHASE_STATES = {
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
};

const MAIN_WORKOUT_STATES = {
  EXERCISE_READY: 'EXERCISE_READY',
  SET_ACTIVE: 'SET_ACTIVE',
  RESTING: 'RESTING',
  SET_COMPLETED: 'SET_COMPLETED',
  EXERCISE_COMPLETED: 'EXERCISE_COMPLETED',
};

if (typeof window !== 'undefined') {
  window.ICONS           = ICONS;
  window.renderIcon      = renderIcon;
  window.ROUTINES        = ROUTINES;
  window.LEVELS          = LEVELS;
  window.CYCLE           = CYCLE;
  window.DAY_NAMES       = DAY_NAMES;
  window.MONTH_NAMES     = MONTH_NAMES;
  window.RPE_DESCRIPTIONS = RPE_DESCRIPTIONS;
  window.WORKOUT_PHASES  = WORKOUT_PHASES;
  window.PHASE_STATES    = PHASE_STATES;
  window.MAIN_WORKOUT_STATES = MAIN_WORKOUT_STATES;
}

