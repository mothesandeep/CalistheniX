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
  pullup: '<path d="M4 4h16"/><path d="M6 4v5"/><path d="M18 4v5"/><circle cx="12" cy="11" r="2.5"/><path d="M9 16c1.5 1 4.5 1 6 0"/><path d="M12 13.5V20"/>',
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
  award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  pauseCircle: '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>',
  playCircle: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>',
  dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95l1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95Z"/><path d="m3 3 1 1a3.5 3.5 0 0 0 4.95 0l.7-.7a3.5 3.5 0 0 0 0-4.95l-1-1a3.5 3.5 0 0 0-4.95 0l-.7.7a3.5 3.5 0 0 0 0 4.95Z"/>',
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
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
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
const ROUTINES = ['Push A', 'Push B', 'Pull A', 'Pull B', 'Legs (Combined)', 'Legs A', 'Legs B'];

/**
 * 5-Day Split rolling cycle (Push A → Pull A → Legs (Combined) → Push B → Pull B → Rest → Rest).
 */
const CYCLE = [
  'Push A',          // day 1
  'Pull A',          // day 2
  'Legs (Combined)', // day 3
  'Push B',          // day 4
  'Pull B',          // day 5
  'Rest',            // day 6
  'Rest',            // day 7
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
const LS_WEIGHT_UNIT_KEY  = 'cx_weight_unit';
const LS_DEFAULT_REST_KEY = 'cx_default_rest_sec';
const LS_REST_PAUSE_KEY   = 'cx_rest_pause_sec';
const LS_KEEP_AWAKE_KEY   = 'cx_keep_screen_awake';
const LS_FLASH_SCREEN_KEY = 'cx_flash_screen';
const LS_EFFORT_MODE_KEY  = 'cx_effort_mode';
const LS_THEME_KEY        = 'cx_theme';
const LS_ACCENT_COLOR_KEY = 'cx_accent_color';
const LS_BODY_MODEL_KEY   = 'cx_body_diagram_model';
const LS_LANGUAGE_KEY     = 'cx_language';
const LS_EQUIPMENT_KEY    = 'cx_equipment_profile';
const LS_EQUIPMENT_PROFILES_KEY = 'cx_equipment_profiles';
const LS_ACTIVE_EQUIPMENT_PROFILE_ID_KEY = 'cx_active_equipment_profile_id';

const SETTINGS_DEFAULTS = {
  weight_unit: 'kg',
  default_rest_sec: 90,
  rest_pause_sec: 15,
  keep_screen_awake: true,
  flash_screen: false,
  effort_mode: 'RIR', // 'Off' | 'RIR' | 'RPE'
  theme: 'dark', // 'dark' | 'light' | 'system'
  accent_color: '#FF5D5D',
  body_diagram_model: 'male', // 'male' | 'female'
  language: 'en',
  equipment: ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor']
};

const LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語'
};

const EQUIPMENT_CATALOG = [
  { id: 'pullup_bar', name: 'Pull-up Bar', desc: 'Doorway, wall or ceiling mounted pull-up bar' },
  { id: 'rings', name: 'Gymnastic Rings', desc: 'Wooden or composite rings with adjustable straps' },
  { id: 'dip_bars', name: 'Dip Station / Parallel Bars', desc: 'Parallel bars for dips and leg raises' },
  { id: 'parallettes', name: 'Low Parallettes', desc: 'Floor push-up and L-sit training bars' },
  { id: 'resistance_bands', name: 'Resistance Bands', desc: 'Loop and pull-up assist bands' },
  { id: 'weight_vest', name: 'Weight Vest / Dip Belt', desc: 'External loading for progressive overload' },
  { id: 'ab_wheel', name: 'Ab Wheel / Roller', desc: 'Core extension rollout wheel' },
  { id: 'floor', name: 'Floor & Wall Only', desc: 'Zero equipment bodyweight foundation' }
];

const DEFAULT_EQUIPMENT_PROFILES = [
  {
    id: 'profile_home',
    name: 'Home Calisthenics',
    desc: 'Pull-up bar, rings, dips, parallettes & bands',
    icon: 'home',
    isPreset: true,
    equipment: ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor']
  },
  {
    id: 'profile_full',
    name: 'Full Gym & Calisthenics Park',
    desc: 'Complete equipment catalog with weighted calisthenics',
    icon: 'dumbbell',
    isPreset: true,
    equipment: ['pullup_bar', 'rings', 'dip_bars', 'parallettes', 'resistance_bands', 'weight_vest', 'ab_wheel', 'floor']
  },
  {
    id: 'profile_park',
    name: 'Outdoor Calisthenics Park',
    desc: 'High bars, parallel dip bars & rings',
    icon: 'park',
    isPreset: true,
    equipment: ['pullup_bar', 'dip_bars', 'rings', 'floor']
  },
  {
    id: 'profile_bodyweight',
    name: 'Bodyweight Only / Travel',
    desc: 'Zero equipment bodyweight & floor foundation',
    icon: 'travel',
    isPreset: true,
    equipment: ['floor']
  }
];

const ACCENT_SWATCHES = [
  { hex: '#10B981', name: 'Emerald Green' },
  { hex: '#3B82F6', name: 'Electric Blue' },
  { hex: '#FF8A3D', name: 'Warmup Amber' },
  { hex: '#A855F7', name: 'Cyber Purple' },
  { hex: '#EC4899', name: 'Neon Pink' },
  { hex: '#FF5D5D', name: 'Train Coral' },
  { hex: '#35D8B0', name: 'Recover Teal' },
  { hex: '#FFB800', name: 'Electric Yellow' }
];

const TRANSLATIONS = {
  en: {
    home: 'Home', workout: 'Workout', split: 'My Split', stats: 'Stats', progress: 'Progress', prs: 'PRs',
    calendar: 'Calendar', library: 'Library', settings: 'Settings', profile: 'Profile', backup: 'Backup',
    rest: 'Rest', weight: 'Weight', reps: 'Reps', hold: 'Hold', set: 'Set', sets: 'Sets', done: 'Done',
    start: 'Start Workout', next: 'Next', previous: 'Previous', pause: 'Pause', resume: 'Resume',
    finish: 'Finish Workout', skip: 'Skip', complete: 'Complete', completeSet: 'Complete Set',
    markComplete: 'Mark Complete', streak: 'Day Streak', weekSessions: 'Weekly Sessions',
    todayWorkout: "Today's Workout", restDay: 'Rest & Recovery Day', warmup: 'Warm-up',
    mainWorkout: 'Main Workout', cooldown: 'Cool-down', prep: 'Prep', train: 'Train', recover: 'Recover',
    exercises: 'Exercises', moveUp: 'Move Up', moveDown: 'Move Down', remove: 'Remove',
    effort: 'Effort per set', theme: 'Theme', dark: 'Dark', light: 'Light', system: 'System',
    bodyDiagram: 'Body diagram', male: 'Male', female: 'Female', accentColor: 'Accent color',
    language: 'Language', selectLanguage: 'Select Language', weightUnit: 'Weight unit',
    equipment: 'Equipment', equipmentProfiles: 'Equipment Profiles', activeProfile: 'Active Profile',
    addEquipmentProfile: 'Add equipment profile', manageEquipment: 'Manage Equipment Profiles',
    createProfile: 'Create Profile', newProfile: 'New Profile', editProfile: 'Edit Profile',
    deleteProfile: 'Delete Profile', profileName: 'Profile Name', selectEquipment: 'Select Equipment',
    presetProfile: 'Preset', customProfile: 'Custom', needsEquipment: 'Needs',
    unavailableEquipment: 'Unavailable on active profile', inProfile: 'In Profile', allEquipment: 'All Movements',
    searchMovements: 'Search movements...', save: 'Save', cancel: 'Cancel', close: 'Close',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening'
  },
  es: {
    home: 'Inicio', workout: 'Entrenamiento', split: 'Mi Rutina', stats: 'Estadísticas', progress: 'Progreso', prs: 'Récords',
    calendar: 'Calendario', library: 'Biblioteca', settings: 'Ajustes', profile: 'Perfil', backup: 'Copia de Seguridad',
    rest: 'Descanso', weight: 'Peso', reps: 'Reps', hold: 'Mantener', set: 'Serie', sets: 'Series', done: 'Hecho',
    start: 'Comenzar Entrenamiento', next: 'Siguiente', previous: 'Anterior', pause: 'Pausar', resume: 'Reanudar',
    finish: 'Finalizar Entrenamiento', skip: 'Saltar', complete: 'Completar', completeSet: 'Completar Serie',
    markComplete: 'Marcar Completo', streak: 'Racha de Días', weekSessions: 'Sesiones Semanales',
    todayWorkout: 'Entrenamiento de Hoy', restDay: 'Día de Descanso y Recuperación', warmup: 'Calentamiento',
    mainWorkout: 'Entrenamiento Principal', cooldown: 'Enfriamiento', prep: 'Prep', train: 'Entrenar', recover: 'Recuperar',
    exercises: 'Ejercicios', moveUp: 'Subir', moveDown: 'Bajar', remove: 'Eliminar',
    effort: 'Esfuerzo por serie', theme: 'Tema', dark: 'Oscuro', light: 'Claro', system: 'Sistema',
    bodyDiagram: 'Diagrama corporal', male: 'Hombre', female: 'Mujer', accentColor: 'Color de acento',
    language: 'Idioma', selectLanguage: 'Seleccionar Idioma', weightUnit: 'Unidad de peso',
    equipment: 'Equipamiento', equipmentProfiles: 'Perfiles de Equipamiento', activeProfile: 'Perfil Activo',
    addEquipmentProfile: 'Añadir perfil de equipamiento', manageEquipment: 'Gestionar Perfiles de Equipamiento',
    createProfile: 'Crear Perfil', newProfile: 'Nuevo Perfil', editProfile: 'Editar Perfil',
    deleteProfile: 'Eliminar Perfil', profileName: 'Nombre del Perfil', selectEquipment: 'Seleccionar Equipamiento',
    presetProfile: 'Predefinido', customProfile: 'Personalizado', needsEquipment: 'Requiere',
    unavailableEquipment: 'No disponible en el perfil activo', inProfile: 'En Perfil', allEquipment: 'Todos los Movimientos',
    searchMovements: 'Buscar movimientos...', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
    goodMorning: 'Buenos días', goodAfternoon: 'Buenas tardes', goodEvening: 'Buenas noches'
  },
  fr: {
    home: 'Accueil', workout: 'Entraînement', split: 'Programme', stats: 'Stats', progress: 'Progrès', prs: 'Records',
    calendar: 'Calendrier', library: 'Bibliothèque', settings: 'Paramètres', profile: 'Profil', backup: 'Sauvegarde',
    rest: 'Repos', weight: 'Poids', reps: 'Reps', hold: 'Maintien', set: 'Série', sets: 'Séries', done: 'Terminé',
    start: 'Démarrer Entraînement', next: 'Suivant', previous: 'Précédent', pause: 'Pause', resume: 'Reprendre',
    finish: 'Terminer Entraînement', skip: 'Passer', complete: 'Compléter', completeSet: 'Terminer Série',
    markComplete: 'Marquer Terminé', streak: 'Série de Jours', weekSessions: 'Séances Semaine',
    todayWorkout: "Entraînement d'aujourd'hui", restDay: 'Jour de Repos et Récupération', warmup: 'Échauffement',
    mainWorkout: 'Entraînement Principal', cooldown: 'Retour au Calme', prep: 'Prép', train: 'Train', recover: 'Récup',
    exercises: 'Exercices', moveUp: 'Monter', moveDown: 'Descendre', remove: 'Supprimer',
    effort: 'Effort par série', theme: 'Thème', dark: 'Sombre', light: 'Clair', system: 'Système',
    bodyDiagram: 'Diagramme corporel', male: 'Homme', female: 'Femme', accentColor: "Couleur d'accent",
    language: 'Langue', selectLanguage: 'Sélectionner la Langue', weightUnit: 'Unité de poids',
    equipment: 'Équipement', equipmentProfiles: "Profils d'Équipement", activeProfile: 'Profil Actif',
    addEquipmentProfile: "Ajouter un profil d'équipement", manageEquipment: "Gérer les Profils d'Équipement",
    createProfile: 'Créer Profil', newProfile: 'Nouveau Profil', editProfile: 'Modifier Profil',
    deleteProfile: 'Supprimer Profil', profileName: 'Nom du Profil', selectEquipment: "Sélectionner l'Équipement",
    presetProfile: 'Prédéfini', customProfile: 'Personnalisé', needsEquipment: 'Nécessite',
    unavailableEquipment: 'Indisponible dans le profil actif', inProfile: 'Dans le Profil', allEquipment: 'Tous les Mouvements',
    searchMovements: 'Rechercher des mouvements...', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer',
    goodMorning: 'Bonjour', goodAfternoon: 'Bon après-midi', goodEvening: 'Bonsoir'
  },
  de: {
    home: 'Start', workout: 'Training', split: 'Split-Plan', stats: 'Statistiken', progress: 'Fortschritt', prs: 'Bestleistungen',
    calendar: 'Kalender', library: 'Übungen', settings: 'Einstellungen', profile: 'Profil', backup: 'Sicherung',
    rest: 'Pause', weight: 'Gewicht', reps: 'Wdh', hold: 'Halten', set: 'Satz', sets: 'Sätze', done: 'Fertig',
    start: 'Training Starten', next: 'Weiter', previous: 'Zurück', pause: 'Pause', resume: 'Fortsetzen',
    finish: 'Training Beenden', skip: 'Überspringen', complete: 'Abschließen', completeSet: 'Satz Abschließen',
    markComplete: 'Als Fertig Markieren', streak: 'Tage-Streak', weekSessions: 'Wochensitzungen',
    todayWorkout: 'Heutiges Training', restDay: 'Ruhetag & Erholung', warmup: 'Aufwärmen',
    mainWorkout: 'Haupttraining', cooldown: 'Abkühlen', prep: 'Vorbereitung', train: 'Training', recover: 'Erholung',
    exercises: 'Übungen', moveUp: 'Nach Oben', moveDown: 'Nach Unten', remove: 'Entfernen',
    effort: 'Anstrengung pro Satz', theme: 'Design', dark: 'Dunkel', light: 'Hell', system: 'System',
    bodyDiagram: 'Körperdiagramm', male: 'Männlich', female: 'Weiblich', accentColor: 'Akzentfarbe',
    language: 'Sprache', selectLanguage: 'Sprache Auswählen', weightUnit: 'Gewichtseinheit',
    equipment: 'Ausrüstung', equipmentProfiles: 'Ausrüstungsprofile', activeProfile: 'Aktives Profil',
    addEquipmentProfile: 'Ausrüstungsprofil hinzufügen', manageEquipment: 'Ausrüstungsprofile Verwalten',
    createProfile: 'Profil Erstellen', newProfile: 'Neues Profil', editProfile: 'Profil Bearbeiten',
    deleteProfile: 'Profil Löschen', profileName: 'Profilname', selectEquipment: 'Ausrüstung Auswählen',
    presetProfile: 'Vorlage', customProfile: 'Benutzerdefiniert', needsEquipment: 'Benötigt',
    unavailableEquipment: 'Nicht verfügbar im aktiven Profil', inProfile: 'Im Profil', allEquipment: 'Alle Übungen',
    searchMovements: 'Übungen suchen...', save: 'Speichern', cancel: 'Abbrechen', close: 'Schließen',
    goodMorning: 'Guten Morgen', goodAfternoon: 'Guten Tag', goodEvening: 'Guten Abend'
  },
  it: {
    home: 'Home', workout: 'Allenamento', split: 'Scheda', stats: 'Statistiche', progress: 'Progressi', prs: 'Record',
    calendar: 'Calendario', library: 'Libreria', settings: 'Impostazioni', profile: 'Profilo', backup: 'Backup',
    rest: 'Riposo', weight: 'Peso', reps: 'Rip', hold: 'Tenuta', set: 'Serie', sets: 'Serie', done: 'Fatto',
    start: 'Inizia Allenamento', next: 'Avanti', previous: 'Indietro', pause: 'Pausa', resume: 'Riprendi',
    finish: 'Termina Allenamento', skip: 'Salta', complete: 'Completa', completeSet: 'Completa Serie',
    markComplete: 'Segna Completato', streak: 'Giorni di Fila', weekSessions: 'Sessioni Settimanali',
    todayWorkout: 'Allenamento di Oggi', restDay: 'Giorno di Riposo', warmup: 'Riscaldamento',
    mainWorkout: 'Allenamento Principale', cooldown: 'Defaticamento', prep: 'Prep', train: 'Allena', recover: 'Recupera',
    exercises: 'Esercizi', moveUp: 'Sposta Su', moveDown: 'Sposta Giù', remove: 'Rimuovi',
    effort: 'Sforzo per serie', theme: 'Tema', dark: 'Scuro', light: 'Chiaro', system: 'Sistema',
    bodyDiagram: 'Diagramma corporeo', male: 'Uomo', female: 'Donna', accentColor: 'Colore accento',
    language: 'Lingua', selectLanguage: 'Seleziona Lingua', weightUnit: 'Unità di peso',
    equipment: 'Attrezzatura', equipmentProfiles: 'Profili Attrezzatura', activeProfile: 'Profilo Attivo',
    addEquipmentProfile: 'Aggiungi profilo attrezzatura', manageEquipment: 'Gestisci Profili Attrezzatura',
    createProfile: 'Crea Profilo', newProfile: 'Nuovo Profilo', editProfile: 'Modifica Profilo',
    deleteProfile: 'Elimina Profilo', profileName: 'Nome Profilo', selectEquipment: 'Seleziona Attrezzatura',
    presetProfile: 'Predefinito', customProfile: 'Personalizzato', needsEquipment: 'Richiede',
    unavailableEquipment: 'Non disponibile nel profilo attivo', inProfile: 'Nel Profilo', allEquipment: 'Tutti i Movimenti',
    searchMovements: 'Cerca movimenti...', save: 'Salva', cancel: 'Annulla', close: 'Chiudi',
    goodMorning: 'Buongiorno', goodAfternoon: 'Buon pomeriggio', goodEvening: 'Buonasera'
  },
  ja: {
    home: 'ホーム', workout: 'ワークアウト', split: 'スプリット', stats: '統計', progress: '進捗', prs: '記録',
    calendar: 'カレンダー', library: 'ライブラリ', settings: '設定', profile: 'プロフィール', backup: 'バックアップ',
    rest: '休憩', weight: '重量', reps: '回数', hold: 'キープ', set: 'セット', sets: 'セット', done: '完了',
    start: 'ワークアウト開始', next: '次へ', previous: '前へ', pause: '一時停止', resume: '再開',
    finish: 'ワークアウト終了', skip: 'スキップ', complete: '完了', completeSet: 'セット完了',
    markComplete: '完了にする', streak: '継続日数', weekSessions: '週間セッション',
    todayWorkout: '今日のトレーニング', restDay: '休養・回復日', warmup: 'ウォームアップ',
    mainWorkout: 'メインワークアウト', cooldown: 'クールダウン', prep: '準備', train: '鍛錬', recover: '回復',
    exercises: '種目', moveUp: '上へ', moveDown: '下へ', remove: '削除',
    effort: 'セット毎の負荷', theme: 'テーマ', dark: 'ダーク', light: 'ライト', system: 'システム',
    bodyDiagram: '身体図モデル', male: '男性', female: '女性', accentColor: 'アクセントカラー',
    language: '言語', selectLanguage: '言語を選択', weightUnit: '重量単位',
    equipment: '器具', equipmentProfiles: '器具プロファイル', activeProfile: '使用中プロファイル',
    addEquipmentProfile: '器具プロファイルを追加', manageEquipment: '器具プロファイルの管理',
    createProfile: 'プロファイル作成', newProfile: '新規プロファイル', editProfile: 'プロファイル編集',
    deleteProfile: 'プロファイル削除', profileName: 'プロファイル名', selectEquipment: '器具を選択',
    presetProfile: 'プリセット', customProfile: 'カスタム', needsEquipment: '必要器具',
    unavailableEquipment: '現在のプロファイルにありません', inProfile: '器具対応のみ', allEquipment: '全種目',
    searchMovements: '種目を検索...', save: '保存', cancel: 'キャンセル', close: '閉じる',
    goodMorning: 'おはようございます', goodAfternoon: 'こんにちは', goodEvening: 'こんばんは'
  }
};

function t(key, fallback = '') {
  let lang = 'en';
  try {
    if (typeof localStorage !== 'undefined') {
      lang = localStorage.getItem('cx_language') || 'en';
    } else if (typeof state !== 'undefined' && state.language) {
      lang = state.language;
    }
  } catch {}
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || fallback || key;
}

function getExerciseRequiredEquipment(exerciseOrName, movementPattern = '') {
  let name = '';
  let pat = '';
  if (typeof exerciseOrName === 'string') {
    name = exerciseOrName;
    pat = movementPattern;
  } else if (exerciseOrName && typeof exerciseOrName === 'object') {
    name = exerciseOrName.name || exerciseOrName.id || '';
    pat = exerciseOrName.pattern || exerciseOrName.movement_pattern || exerciseOrName.category || movementPattern || '';
  }
  name = String(name).toLowerCase();
  pat = String(pat).toLowerCase();
  if (name.includes('ring') || pat.includes('ring')) return 'rings';
  if (name.includes('parallette') || name.includes('low bar')) return 'parallettes';
  if (name.includes('dip') || name.includes('parallel bar')) return 'dip_bars';
  if (name.includes('pull-up') || name.includes('chin-up') || name.includes('dead hang') || name.includes('hanging') || name.includes('muscle-up')) return 'pullup_bar';
  if (name.includes('band') || name.includes('assisted')) return 'resistance_bands';
  if (name.includes('weighted') || name.includes('vest') || name.includes('belt')) return 'weight_vest';
  if (name.includes('wheel') || name.includes('roller')) return 'ab_wheel';
  return 'floor';
}

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
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
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
  window.CYCLE           = CYCLE;
  window.DAY_NAMES       = DAY_NAMES;
  window.MONTH_NAMES     = MONTH_NAMES;
  window.RPE_DESCRIPTIONS = RPE_DESCRIPTIONS;
  window.WORKOUT_PHASES  = WORKOUT_PHASES;
  window.PHASE_STATES    = PHASE_STATES;
  window.MAIN_WORKOUT_STATES = MAIN_WORKOUT_STATES;
  window.SETTINGS_DEFAULTS = SETTINGS_DEFAULTS;
  window.LANGUAGES       = LANGUAGES;
  window.EQUIPMENT_CATALOG = EQUIPMENT_CATALOG;
  window.DEFAULT_EQUIPMENT_PROFILES = DEFAULT_EQUIPMENT_PROFILES;
  window.ACCENT_SWATCHES = ACCENT_SWATCHES;
  window.TRANSLATIONS    = TRANSLATIONS;
  window.t               = t;
  window.translate       = t;
  window.LS_EQUIPMENT_PROFILES_KEY = LS_EQUIPMENT_PROFILES_KEY;
  window.LS_ACTIVE_EQUIPMENT_PROFILE_ID_KEY = LS_ACTIVE_EQUIPMENT_PROFILE_ID_KEY;
  window.getExerciseRequiredEquipment = getExerciseRequiredEquipment;
}
