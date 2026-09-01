/**
 * CalistheniX — Settings, Backup Data, Calendar & Biomechanics Modal
 */

// ─── Settings State & Persistence Helpers ────────────────────────────────────
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

function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16)
    };
  }
  return null;
}

function initThemeAndAccent() {
  if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
  const savedAccent = localStorage.getItem('cx_accent_color') || '#FF5D5D';
  document.documentElement.style.setProperty('--accent', savedAccent);
  document.documentElement.style.setProperty('--phase-train', savedAccent);
  document.documentElement.style.setProperty('--phase-accent', savedAccent);
  const rgb = hexToRgb(savedAccent);
  if (rgb) {
    document.documentElement.style.setProperty('--phase-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty('--phase-train-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  const savedTheme = localStorage.getItem('cx_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}
initThemeAndAccent();

function getWeightUnit() {
  if (typeof localStorage === 'undefined') return 'kg';
  return localStorage.getItem('cx_weight_unit') || 'kg';
}

function setWeightUnit(unit) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_weight_unit', unit);
  if (typeof state !== 'undefined') state.weightUnit = unit;
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getDefaultRestSec() {
  if (typeof localStorage === 'undefined') return 90;
  const v = parseInt(localStorage.getItem('cx_default_rest_sec'), 10);
  return !isNaN(v) && v > 0 ? v : 90;
}

function setDefaultRestSec(sec) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_default_rest_sec', String(sec));
  closeSettingsSheet();
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getRestPauseSec() {
  if (typeof localStorage === 'undefined') return 15;
  const v = parseInt(localStorage.getItem('cx_rest_pause_sec'), 10);
  return !isNaN(v) && v > 0 ? v : 15;
}

function setRestPauseSec(sec) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_rest_pause_sec', String(sec));
  closeSettingsSheet();
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function isKeepScreenAwake() {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('cx_keep_screen_awake') !== '0';
}

function toggleKeepScreenAwake() {
  if (typeof localStorage === 'undefined') return;
  const current = isKeepScreenAwake();
  localStorage.setItem('cx_keep_screen_awake', current ? '0' : '1');
}

function isSoundsEnabled() {
  return !isMuted();
}

function toggleSounds() {
  toggleMute();
}

function isFlashScreenEnabled() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('cx_flash_screen') === '1';
}

function toggleFlashScreen() {
  if (typeof localStorage === 'undefined') return;
  const current = isFlashScreenEnabled();
  localStorage.setItem('cx_flash_screen', current ? '0' : '1');
}

function getEffortMode() {
  if (typeof localStorage === 'undefined') return 'RIR';
  return localStorage.getItem('cx_effort_mode') || 'RIR';
}

function setEffortMode(mode) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_effort_mode', mode);
  if (typeof state !== 'undefined') state.effortMode = mode;
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getAppTheme() {
  if (typeof localStorage === 'undefined') return 'dark';
  return localStorage.getItem('cx_theme') || 'dark';
}

function setAppTheme(theme) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getAccentColor() {
  if (typeof localStorage === 'undefined') return '#FF5D5D';
  return localStorage.getItem('cx_accent_color') || '#FF5D5D';
}

function setAccentColor(colorHex) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_accent_color', colorHex);
  document.documentElement.style.setProperty('--accent', colorHex);
  document.documentElement.style.setProperty('--phase-train', colorHex);
  document.documentElement.style.setProperty('--phase-accent', colorHex);
  const rgb = hexToRgb(colorHex);
  if (rgb) {
    document.documentElement.style.setProperty('--phase-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty('--phase-train-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getBodyDiagramModel() {
  if (typeof localStorage === 'undefined') return 'male';
  return localStorage.getItem('cx_body_diagram_model') || 'male';
}

function setBodyDiagramModel(model) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_body_diagram_model', model);
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function getEquipmentProfile() {
  if (typeof localStorage === 'undefined') return SETTINGS_DEFAULTS.equipment;
  const raw = localStorage.getItem('cx_equipment_profile');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return SETTINGS_DEFAULTS.equipment;
}

function toggleEquipmentItem(id) {
  if (typeof localStorage === 'undefined') return;
  const current = getEquipmentProfile();
  let updated;
  if (current.includes(id)) {
    updated = current.filter(item => item !== id);
  } else {
    updated = [...current, id];
  }
  localStorage.setItem('cx_equipment_profile', JSON.stringify(updated));
  renderEquipmentSheet();
}

function getAppLanguage() {
  if (typeof localStorage === 'undefined') return 'en';
  return localStorage.getItem('cx_language') || 'en';
}

function setAppLanguage(lang) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('cx_language', lang);
  closeSettingsSheet();
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

const CANONICAL_DEFAULT_WEIGHT_HISTORY = [
  { date: '2026-07-01', weight: 82.4 },
  { date: '2026-07-05', weight: 82.1 },
  { date: '2026-07-10', weight: 81.8 },
  { date: '2026-07-16', weight: 81.5 },
  { date: '2026-07-23', weight: 80.7 },
  { date: '2026-07-29', weight: 80.4 },
  { date: '2026-08-04', weight: 80.1 },
  { date: '2026-08-10', weight: 79.8 },
  { date: '2026-08-16', weight: 79.5 },
  { date: '2026-08-23', weight: 79.1 },
  { date: '2026-08-27', weight: 78.4 },
  { date: '2026-08-31', weight: 78.3 }
];

async function resetDemoData() {
  const defaultHistory = (typeof DEFAULT_WEIGHT_HISTORY !== 'undefined') ? DEFAULT_WEIGHT_HISTORY : CANONICAL_DEFAULT_WEIGHT_HISTORY;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cx_weight_history', JSON.stringify(defaultHistory));
    localStorage.setItem('cx_target_weight', '77');
    if (typeof state !== 'undefined') {
      state.weightHistory = [...defaultHistory];
      state.targetWeight = 77.0;
    }
  }
  if (typeof showToast === 'function') {
    showToast('Demo data reset to initial defaults');
  }
  if (typeof loadDashboardSummary === 'function') {
    await loadDashboardSummary();
  }
  if (document.getElementById('settings-mobile-screen') || document.querySelector('.settings-modal-backdrop')) {
    openSettingsModal();
  }
}

function confirmResetEverything() {
  let sheetRoot = document.getElementById('settings-sheet-root');
  if (!sheetRoot) {
    sheetRoot = document.createElement('div');
    sheetRoot.id = 'settings-sheet-root';
    document.body.appendChild(sheetRoot);
  }

  sheetRoot.innerHTML = `
    <div class="settings-sheet-backdrop" onclick="if(event.target === this) closeSettingsSheet()">
      <div class="settings-sheet" style="max-width:440px;">
        <div class="settings-sheet-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#FF5D5D;">${renderIcon('alert', 'cx-icon cx-icon-inline')}</span>
            <h3 class="settings-sheet-title" style="color:#FF5D5D;">Reset Everything</h3>
          </div>
          <button class="nav-btn-icon" onclick="closeSettingsSheet()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>

        <p style="font-size:13px; color:var(--text-muted); line-height:1.5; margin:0;">
          This will permanently wipe all local workout logs, custom routine splits, body weight history, and active sessions on this browser.
        </p>

        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          <button class="btn btn-danger" style="width:100%; justify-content:center; padding:12px; font-weight:700;" onclick="executeResetEverything()">
            ${renderIcon('trash', 'cx-icon cx-icon-xs cx-icon-inline')} Yes, Reset Everything
          </button>
          <button class="btn btn-secondary" style="width:100%; justify-content:center; padding:11px;" onclick="closeSettingsSheet()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

async function executeResetEverything() {
  closeSettingsSheet();
  if (typeof localStorage !== 'undefined') {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('cx_') || k.startsWith('calisthenix_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    if (typeof state !== 'undefined') {
      state.weightHistory = [...DEFAULT_WEIGHT_HISTORY];
      state.targetWeight = 77.0;
      state.todayLogs = {};
      state.activeSession = null;
    }
  }

  closeSettingsModal();
  if (typeof showToast === 'function') {
    showToast('All local data and preferences reset');
  }
  if (typeof loadDashboardSummary === 'function') {
    await loadDashboardSummary();
  }
  if (typeof loadExercises === 'function') {
    await loadExercises();
  }
  if (typeof switchView === 'function') {
    switchView('home');
  } else if (typeof render === 'function') {
    render();
  }
}

function closeSettingsSheet() {
  const sheetRoot = document.getElementById('settings-sheet-root');
  if (sheetRoot) sheetRoot.innerHTML = '';
}

function openRestPickerModal(type = 'main') {
  let sheetRoot = document.getElementById('settings-sheet-root');
  if (!sheetRoot) {
    sheetRoot = document.createElement('div');
    sheetRoot.id = 'settings-sheet-root';
    document.body.appendChild(sheetRoot);
  }

  const isMain = type === 'main';
  const currentVal = isMain ? getDefaultRestSec() : getRestPauseSec();
  const options = isMain 
    ? [30, 45, 60, 90, 120, 150, 180, 240, 300]
    : [10, 15, 20, 25, 30, 45];

  const title = isMain ? 'Rest Timer Duration' : 'Rest-Pause Rest Duration';

  const optionsHtml = options.map(sec => {
    const isAct = sec === currentVal;
    return `
      <div class="settings-sheet-option ${isAct ? 'active' : ''}" onclick="${isMain ? `setDefaultRestSec(${sec})` : `setRestPauseSec(${sec})`}">
        <span>${sec} seconds</span>
        ${isAct ? `<span style="color:var(--accent); font-weight:700;">${renderIcon('check', 'cx-icon cx-icon-xs')}</span>` : ''}
      </div>
    `;
  }).join('');

  sheetRoot.innerHTML = `
    <div class="settings-sheet-backdrop" onclick="if(event.target === this) closeSettingsSheet()">
      <div class="settings-sheet">
        <div class="settings-sheet-header">
          <h3 class="settings-sheet-title">${title}</h3>
          <button class="nav-btn-icon" onclick="closeSettingsSheet()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>
        <div class="settings-sheet-options">
          ${optionsHtml}
        </div>
      </div>
    </div>
  `;
}

function openLanguageModal() {
  let sheetRoot = document.getElementById('settings-sheet-root');
  if (!sheetRoot) {
    sheetRoot = document.createElement('div');
    sheetRoot.id = 'settings-sheet-root';
    document.body.appendChild(sheetRoot);
  }

  const currentLang = getAppLanguage();
  const optionsHtml = Object.entries(LANGUAGES).map(([code, name]) => {
    const isAct = code === currentLang;
    return `
      <div class="settings-sheet-option ${isAct ? 'active' : ''}" onclick="setAppLanguage('${code}')">
        <span>${name}</span>
        ${isAct ? `<span style="color:var(--accent); font-weight:700;">${renderIcon('check', 'cx-icon cx-icon-xs')}</span>` : ''}
      </div>
    `;
  }).join('');

  sheetRoot.innerHTML = `
    <div class="settings-sheet-backdrop" onclick="if(event.target === this) closeSettingsSheet()">
      <div class="settings-sheet">
        <div class="settings-sheet-header">
          <h3 class="settings-sheet-title">Select Language</h3>
          <button class="nav-btn-icon" onclick="closeSettingsSheet()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>
        <div class="settings-sheet-options">
          ${optionsHtml}
        </div>
      </div>
    </div>
  `;
}

function openEquipmentModal() {
  let sheetRoot = document.getElementById('settings-sheet-root');
  if (!sheetRoot) {
    sheetRoot = document.createElement('div');
    sheetRoot.id = 'settings-sheet-root';
    document.body.appendChild(sheetRoot);
  }
  renderEquipmentSheet();
}

function renderEquipmentSheet() {
  const sheetRoot = document.getElementById('settings-sheet-root');
  if (!sheetRoot) return;

  const currentProfile = getEquipmentProfile();
  const itemsHtml = EQUIPMENT_CATALOG.map(item => {
    const hasItem = currentProfile.includes(item.id);
    return `
      <div class="settings-sheet-option ${hasItem ? 'active' : ''}" onclick="toggleEquipmentItem('${item.id}')">
        <div>
          <div style="font-weight:600;">${item.name}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${item.desc}</div>
        </div>
        <span style="color:${hasItem ? 'var(--accent)' : 'var(--text-dim)'};">
          ${hasItem ? renderIcon('check', 'cx-icon cx-icon-sm') : '<span style="display:inline-block; width:16px; height:16px; border:1px solid rgba(255,255,255,0.2); border-radius:4px;"></span>'}
        </span>
      </div>
    `;
  }).join('');

  sheetRoot.innerHTML = `
    <div class="settings-sheet-backdrop" onclick="if(event.target === this) closeSettingsSheet()">
      <div class="settings-sheet">
        <div class="settings-sheet-header">
          <div>
            <h3 class="settings-sheet-title">Manage Equipment Profile</h3>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Select the equipment available in your training space</div>
          </div>
          <button class="nav-btn-icon" onclick="closeSettingsSheet()">${renderIcon('x', 'cx-icon cx-icon-xs')}</button>
        </div>
        <div class="settings-sheet-options">
          ${itemsHtml}
        </div>
        <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:6px;" onclick="closeSettingsSheet()">
          Done
        </button>
      </div>
    </div>
  `;
}

// ─── Desktop vs Mobile View Dispatchers ──────────────────────────────────────
// ─── Shared Grouped Settings Content Generator ──────────────────────────────
function renderSettingsGroupedSections() {
  const weightUnit = getWeightUnit();
  const defRest = getDefaultRestSec();
  const restPause = getRestPauseSec();
  const keepAwake = isKeepScreenAwake();
  const sounds = isSoundsEnabled();
  const flashScreen = isFlashScreenEnabled();
  const effortMode = getEffortMode();
  const theme = getAppTheme();
  const accent = getAccentColor();
  const bodyModel = getBodyDiagramModel();
  const langName = LANGUAGES[getAppLanguage()] || 'English';

  const swatchesHtml = ACCENT_SWATCHES.map(s => {
    const isAct = accent.toLowerCase() === s.hex.toLowerCase();
    return `<div class="settings-swatch ${isAct ? 'active' : ''}" style="background:${s.hex};" onclick="setAccentColor('${s.hex}')" title="${s.name}"></div>`;
  }).join('');

  return `
    <!-- 1. DEMO / DATA Section -->
    <section class="settings-group">
      <div class="settings-group-label">Demo</div>
      <div class="settings-card">
        <!-- Demo status -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-gold">${renderIcon('sparkles')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">You're in the demo</span>
              <span class="settings-row-subtitle">Example data, stored only in this browser — change anything you like.</span>
            </div>
          </div>
        </div>

        <!-- Reset demo data -->
        <div class="settings-row is-clickable" onclick="resetDemoData()">
          <div class="settings-row-left">
            <div class="settings-icon-box box-blue">${renderIcon('refresh')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Reset demo data</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>

        <!-- Import backup -->
        <label class="settings-row is-clickable" style="margin:0; cursor:pointer;">
          <div class="settings-row-left">
            <div class="settings-icon-box box-blue">${renderIcon('upload')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Import backup</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
          <input type="file" accept=".json" style="display:none;" onchange="importData(this); openSettingsModal();">
        </label>

        <!-- Export backup -->
        <div class="settings-row is-clickable" onclick="exportData()">
          <div class="settings-row-left">
            <div class="settings-icon-box box-blue">${renderIcon('download')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Export backup (JSON)</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>

        <!-- Reset everything -->
        <div class="settings-row is-clickable" onclick="confirmResetEverything()">
          <div class="settings-row-left">
            <div class="settings-icon-box box-red">${renderIcon('trash')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title is-danger">Reset everything</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. GENERAL Section -->
    <section class="settings-group">
      <div class="settings-group-label">General</div>
      <div class="settings-card">
        <!-- Language -->
        <div class="settings-row is-clickable" onclick="openLanguageModal()">
          <div class="settings-row-left">
            <div class="settings-icon-box box-blue">${renderIcon('globe')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Language</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-value-label">${langName}</span>
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>

        <!-- Weight unit -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-teal">${renderIcon('scale')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Weight unit</span>
            </div>
          </div>
          <div class="settings-row-right">
            <div class="cx-segmented">
              <button class="cx-seg-btn ${weightUnit === 'kg' ? 'active' : ''}" onclick="setWeightUnit('kg')">kg</button>
              <button class="cx-seg-btn ${weightUnit === 'lb' ? 'active' : ''}" onclick="setWeightUnit('lb')">lb</button>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-group-caption">
        Note: switching units only changes the label — logged numbers are not converted.
      </div>
    </section>

    <!-- 3. WORKOUT Section -->
    <section class="settings-group">
      <div class="settings-group-label">During a workout</div>
      <div class="settings-card">
        <!-- Rest timer -->
        <div class="settings-row is-clickable" onclick="openRestPickerModal('main')">
          <div class="settings-row-left">
            <div class="settings-icon-box box-amber">${renderIcon('timer')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Rest timer</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-value-label">${defRest}s</span>
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>

        <!-- Rest-pause rest -->
        <div class="settings-row is-clickable" onclick="openRestPickerModal('rest_pause')">
          <div class="settings-row-left">
            <div class="settings-icon-box box-gold">${renderIcon('zap')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Rest-pause rest</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-value-label">${restPause}s</span>
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>

        <!-- Keep screen awake -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-gold">${renderIcon('sun')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Keep screen awake</span>
            </div>
          </div>
          <div class="settings-row-right">
            <label class="cx-switch">
              <input type="checkbox" ${keepAwake ? 'checked' : ''} onchange="toggleKeepScreenAwake()">
              <span class="cx-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Sounds -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-pink">${renderIcon('bell')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Sounds</span>
            </div>
          </div>
          <div class="settings-row-right">
            <label class="cx-switch">
              <input type="checkbox" ${sounds ? 'checked' : ''} onchange="toggleSounds()">
              <span class="cx-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Flash screen when timer ends -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-gold">${renderIcon('sun')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Flash screen when timer ends</span>
            </div>
          </div>
          <div class="settings-row-right">
            <label class="cx-switch">
              <input type="checkbox" ${flashScreen ? 'checked' : ''} onchange="toggleFlashScreen()">
              <span class="cx-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Effort per set -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-purple">${renderIcon('target')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Effort per set</span>
            </div>
          </div>
          <div class="settings-row-right">
            <div class="cx-segmented">
              <button class="cx-seg-btn ${effortMode === 'Off' ? 'active' : ''}" onclick="setEffortMode('Off')">Off</button>
              <button class="cx-seg-btn ${effortMode === 'RIR' ? 'active' : ''}" onclick="setEffortMode('RIR')">RIR</button>
              <button class="cx-seg-btn ${effortMode === 'RPE' ? 'active' : ''}" onclick="setEffortMode('RPE')">RPE</button>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-group-caption">
        The screen stays on while a workout is running, so you don't have to unlock your device between sets.
      </div>
    </section>

    <!-- 4. EQUIPMENT Section -->
    <section class="settings-group">
      <div class="settings-group-label">Equipment</div>
      <div class="settings-card">
        <div class="settings-row is-clickable" onclick="openEquipmentModal()">
          <div class="settings-row-left">
            <div class="settings-icon-box box-gold">${renderIcon('plus')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Add equipment profile</span>
            </div>
          </div>
          <div class="settings-row-right">
            <span class="settings-chevron">${renderIcon('chevronRight', 'cx-icon cx-icon-xs')}</span>
          </div>
        </div>
      </div>
      <div class="settings-group-caption">
        Filters the exercise library and picker, and flags routine exercises that need something you don't have in the active profile.
      </div>
    </section>

    <!-- 5. APPEARANCE Section -->
    <section class="settings-group">
      <div class="settings-group-label">Appearance</div>
      <div class="settings-card">
        <!-- Theme -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-purple">${renderIcon('moon')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Theme</span>
            </div>
          </div>
          <div class="settings-row-right">
            <div class="cx-segmented">
              <button class="cx-seg-btn ${theme === 'dark' ? 'active' : ''}" onclick="setAppTheme('dark')">
                ${renderIcon('moon', 'cx-icon cx-icon-xs')} Dark
              </button>
              <button class="cx-seg-btn ${theme === 'light' ? 'active' : ''}" onclick="setAppTheme('light')">
                ${renderIcon('sun', 'cx-icon cx-icon-xs')} Light
              </button>
              <button class="cx-seg-btn ${theme === 'system' ? 'active' : ''}" onclick="setAppTheme('system')">
                ${renderIcon('settings', 'cx-icon cx-icon-xs')} System
              </button>
            </div>
          </div>
        </div>

        <!-- Body diagram -->
        <div class="settings-row">
          <div class="settings-row-left">
            <div class="settings-icon-box box-teal">${renderIcon('user')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">Body diagram</span>
            </div>
          </div>
          <div class="settings-row-right">
            <div class="cx-segmented">
              <button class="cx-seg-btn ${bodyModel === 'male' ? 'active' : ''}" onclick="setBodyDiagramModel('male')">Male</button>
              <button class="cx-seg-btn ${bodyModel === 'female' ? 'active' : ''}" onclick="setBodyDiagramModel('female')">Female</button>
            </div>
          </div>
        </div>

        <!-- Accent color -->
        <div style="padding: 10px 14px 4px;">
          <span class="settings-row-title">Accent color</span>
        </div>
        <div class="settings-swatches-grid">
          ${swatchesHtml}
        </div>
      </div>
    </section>

    <!-- 6. Tip & About Section -->
    <section class="settings-group">
      <div class="settings-group-label">Tip</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-left" style="align-items:flex-start;">
            <div class="settings-icon-box box-gold" style="margin-top:2px;">${renderIcon('lightbulb')}</div>
            <div class="settings-row-text">
              <span class="settings-row-title">In Safari: Share → Add to Home Screen</span>
              <span class="settings-row-subtitle">to install CalistheniX as a standalone app. Guest data stays on this device — export a backup now and then!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── Desktop vs Mobile View Dispatchers ──────────────────────────────────────
function renderDesktopSettingsModal() {
  const sectionsHtml = renderSettingsGroupedSections();

  return `
    <div class="settings-modal-backdrop" onclick="if(event.target === this) closeSettingsModal()">
      <div class="settings-modal" onclick="event.stopPropagation()">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text, #ffffff); display:flex; align-items:center; gap:8px; margin:0; letter-spacing:-0.02em;">
              ${renderIcon('settings', 'cx-icon cx-icon-inline')} Settings & Preferences
            </h2>
            <div style="font-size:12.5px; color:var(--text-muted, #8b8b9e); margin-top:3px;">
              Manage your local training preferences, rest timers, audio cues, and display theme.
            </div>
          </div>
          <button class="nav-btn-icon" onclick="closeSettingsModal()" title="Close" style="cursor:pointer;">
            ${renderIcon('x', 'cx-icon')}
          </button>
        </div>

        <!-- Scrollable Grouped Sections Body -->
        <div style="display:flex; flex-direction:column; gap:16px; margin:4px 0;">
          ${sectionsHtml}
        </div>

        <!-- Footer Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06); margin-top:4px;">
          <div style="font-size:11.5px; color:var(--text-dim, #5a5a70);">
            <strong>CalistheniX v2.4.0</strong> · 100% Local-First
          </div>
          <button class="btn btn-primary" onclick="closeSettingsModal()" style="padding:8px 22px; font-weight:600;">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMobileSettingsView() {
  const sectionsHtml = renderSettingsGroupedSections();

  return `
    <div class="settings-modal-backdrop" id="settings-mobile-screen">
      <div class="settings-mobile-container">
        <!-- Header -->
        <header class="settings-mobile-header">
          <button class="settings-back-btn" onclick="closeSettingsModal()" title="Back" aria-label="Back">
            ${renderIcon('chevronLeft', 'cx-icon cx-icon-sm')}
          </button>
          <h1 class="settings-mobile-title">Settings</h1>
        </header>

        <!-- Grouped Sections -->
        ${sectionsHtml}

        <!-- App Footer Metadata -->
        <footer class="settings-app-footer">
          <div><strong>CalistheniX v2.4.0</strong> · Free & Local-First</div>
          <div>All training history & biomechanics are stored 100% locally on this device.</div>
        </footer>
      </div>
    </div>
  `;
}

function openSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;

  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    root.innerHTML = renderDesktopSettingsModal();
  } else {
    root.innerHTML = renderMobileSettingsView();
  }
}

function closeSettingsModal() {
  const root = document.getElementById('settings-modal-root');
  if (root) root.innerHTML = '';
  closeSettingsSheet();
}

// ─── Muscle Focus Engine & Body Visualization (Phase.md Section 20) ───────────
function openNotifModal() {
  const root = document.getElementById('settings-modal-root');
  if (!root) return;

  const resolved = state.todayResolved;
  const isWorkout = resolved && resolved.status === 'workout';
  const workoutName = resolved?.workout?.name || 'Scheduled Workout';

  root.innerHTML = `
    <div class="settings-modal-backdrop" onclick="closeSettingsModal()">
      <div class="settings-modal" onclick="event.stopPropagation()" style="max-width:420px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:17px; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:8px;">
            <span>${renderIcon('bell', 'cx-icon cx-icon-inline')} Notifications</span>
          </h2>
          <button class="btn btn-sm btn-secondary" onclick="closeSettingsModal()">${renderIcon('x', 'cx-icon')}</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span>${renderIcon('zap', 'cx-icon cx-icon-lg cx-icon-accent')}</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">${isWorkout ? `Today's Workout: ${workoutName}` : 'Rest & Recovery Day'}</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${isWorkout ? 'Ready when you are. Step up and claim your strength.' : 'Hydrate, stretch, and prepare for tomorrow.'}</div>
            </div>
          </div>

          <div style="background:var(--surface-2); border:1px solid var(--border); padding:12px 14px; border-radius:var(--radius); display:flex; gap:12px; align-items:flex-start;">
            <span>${renderIcon('flame', 'cx-icon cx-icon-lg cx-icon-fire')}</span>
            <div>
              <strong style="color:#ffffff; font-size:13px;">Active Streak Check</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Consistency drives progressive overload. Keep your training chain unbroken.</div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button class="btn btn-primary" onclick="closeNotifModal()">Got It</button>
        </div>
      </div>
    </div>`;
}

function closeNotifModal() {
  closeSettingsModal();
}

// ─── 3D Parallax and Motion Handlers ─────────────────────────────────────────

// ─── Biomechanics & Technique Form Guide Modal (Calendar view moved to views/calendar.js) ─

let _guideSelectedMuscle = 'chest';
let _guideView = 'front'; // 'front' | 'back' | 'both'
let _guideCategory = 'all'; // 'all' | 'upper' | 'core' | 'lower'

const MUSCLE_ANATOMY_GUIDE = {
  chest: {
    key: 'chest',
    name: 'Chest / Pectorals',
    latin: 'Pectoralis Major & Minor',
    view: 'front',
    category: 'upper',
    movement_pattern: 'push_horizontal',
    function: 'Horizontal shoulder adduction, shoulder flexion, and internal rotation during pushing movements.',
    cue: 'Keep shoulder blades retracted and depressed; push the ground away with intentional chest contraction.',
    exercises: ['Standard Push-ups', 'Diamond Push-ups', 'Archer Push-ups', 'Decline Push-ups', 'Triceps Dips']
  },
  front_delts: {
    key: 'front_delts',
    name: 'Front Deltoids',
    latin: 'Anterior Deltoid',
    view: 'front',
    category: 'upper',
    movement_pattern: 'push_vertical',
    function: 'Shoulder flexion and overhead vertical pressing power; essential for handstands and pike push-ups.',
    cue: 'Keep forearms perpendicular to the floor and maintain slight external shoulder torque.',
    exercises: ['Pike Push-ups', 'Pike Push-ups Elevated', 'Handstand Push-up Progression', 'Standard Push-ups']
  },
  side_delts: {
    key: 'side_delts',
    name: 'Side Deltoids',
    latin: 'Lateral Deltoid',
    view: 'front',
    category: 'upper',
    movement_pattern: 'isolation_lateral',
    function: 'Shoulder abduction; creates lateral shoulder width, aesthetic frame, and upper V-taper symmetry.',
    cue: 'Lead the movement with elbows slightly higher than hands with a slight torso lean.',
    exercises: ['Lateral Raise', 'Pike Push-ups', 'Wall Angels', 'Archer Push-ups']
  },
  rear_delts: {
    key: 'rear_delts',
    name: 'Rear Deltoids',
    latin: 'Posterior Deltoid',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_horizontal',
    function: 'Horizontal shoulder abduction and external rotation; vital for posture and shoulder health.',
    cue: 'Pull elbows wide and squeeze shoulder blades back without excessively shrugging traps.',
    exercises: ['Face Pulls', 'Prone Y-raises', 'Pull-ups Wide Grip', 'Inverted Rows', 'Wall Angels']
  },
  biceps: {
    key: 'biceps',
    name: 'Biceps Brachii',
    latin: 'Biceps Brachii & Brachialis',
    view: 'front',
    category: 'upper',
    movement_pattern: 'pull_vertical',
    function: 'Elbow flexion and forearm supination; heavily recruited in underhand pulling and front levers.',
    cue: 'Achieve a full dead-hang stretch at the bottom and pull chin cleanly over the bar.',
    exercises: ['Chin-ups', 'Close-Grip Chin-ups', 'Commando Pull-ups', 'Negative Pull-ups', 'Biceps Curls']
  },
  triceps: {
    key: 'triceps',
    name: 'Triceps Brachii',
    latin: 'Triceps Brachii (Long, Lateral, Medial)',
    view: 'back',
    category: 'upper',
    movement_pattern: 'push_dip',
    function: 'Elbow extension and lockout force across all pushing, dipping, and handstand progressions.',
    cue: 'Squeeze triceps hard at lockout without locking out elbow joint aggressively.',
    exercises: ['Triceps Dips', 'Diamond Push-ups', 'Handstand Push-up Progression', 'Standard Push-ups']
  },
  forearms: {
    key: 'forearms',
    name: 'Forearms & Grip',
    latin: 'Flexor & Extensor Carpi Complex',
    view: 'both',
    category: 'upper',
    movement_pattern: 'hanging',
    function: 'Crush grip strength, wrist stabilization, and endurance on pull-up bars and rings.',
    cue: 'Wrap thumb securely around bar and squeeze with maximum grip tension throughout each rep.',
    exercises: ['Dead Hang', 'Pull-ups', 'Chin-ups', 'Hanging Knee Raises', 'L-sit Hang']
  },
  abs: {
    key: 'abs',
    name: 'Abs (Rectus Abdominis)',
    latin: 'Rectus Abdominis (6-Pack)',
    view: 'front',
    category: 'core',
    movement_pattern: 'core',
    function: 'Spinal flexion, pelvic stabilization, and anti-extension core rigidity in hollow body holds.',
    cue: 'Lock in posterior pelvic tilt (tuck tailbone under) and pull belly button firmly toward spine.',
    exercises: ['Hanging Leg Raises', 'Hanging Knee Raises', 'Hollow Body Hold', 'Plank', 'L-sit Hang']
  },
  obliques: {
    key: 'obliques',
    name: 'Obliques & Serratus',
    latin: 'Internal/External Obliques & Serratus',
    view: 'front',
    category: 'core',
    movement_pattern: 'core',
    function: 'Lateral trunk flexion, rotational power, and ribcage stabilization during asymmetrical holds.',
    cue: 'Keep hips stacked vertically during side planks; rotate with control from thoracic spine.',
    exercises: ['Side Plank', 'Russian Twists', 'Hanging Leg Raises', 'L-sit Hang', 'Archer Push-ups']
  },
  lats: {
    key: 'lats',
    name: 'Lats (V-Taper)',
    latin: 'Latissimus Dorsi',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_vertical',
    function: 'Shoulder adduction, extension, and scapular depression in vertical pulling.',
    cue: 'Drive elbows down and back toward your back pockets rather than pulling with the hands.',
    exercises: ['Pull-ups Wide Grip', 'Pull-ups', 'Chin-ups', 'Dead Hang', 'Negative Pull-ups']
  },
  traps: {
    key: 'traps',
    name: 'Trapezius',
    latin: 'Trapezius (Upper, Middle, Lower)',
    view: 'back',
    category: 'upper',
    movement_pattern: 'pull_horizontal',
    function: 'Scapular elevation, retraction, upward rotation, and upper spine structural stability.',
    cue: 'Retract scapulae smoothly; avoid tense upper neck shrugging during pulling movements.',
    exercises: ['Scapular Pulls', 'Prone Y-raises', 'Face Pulls', 'Pike Push-ups Elevated', 'Wall Angels']
  },
  lower_back: {
    key: 'lower_back',
    name: 'Lower Back',
    latin: 'Erector Spinae Group',
    view: 'back',
    category: 'core',
    movement_pattern: 'hinge',
    function: 'Spinal extension, posture retention, and posterior chain core endurance.',
    cue: 'Maintain neutral lumbar alignment and brace transverse abdominis simultaneously.',
    exercises: ['Single-leg Glute Bridges', 'Glute Bridges Single Leg', 'Russian Twists', 'Superman Hold']
  },
  glutes: {
    key: 'glutes',
    name: 'Gluteus Maximus',
    latin: 'Gluteus Maximus & Medius',
    view: 'back',
    category: 'lower',
    movement_pattern: 'squat',
    function: 'Hip extension, abduction, external rotation, and explosive single-leg drive.',
    cue: 'Push forcefully through mid-foot and heel, squeezing glutes hard at the top of each rep.',
    exercises: ['Bulgarian Split Squats', 'Single-leg Glute Bridges', 'Walking Lunges', 'Pistol Squats']
  },
  quads: {
    key: 'quads',
    name: 'Quadriceps',
    latin: 'Rectus Femoris, Vastus Lateralis/Medialis',
    view: 'front',
    category: 'lower',
    movement_pattern: 'squat',
    function: 'Knee extension and eccentric deceleration in squats, lunges, and wall sits.',
    cue: 'Keep knee tracking over second toe; maintain tall upright chest posture.',
    exercises: ['Pistol Squat Progression', 'Bulgarian Split Squats', 'Jump Squats', 'Wall Sit', 'Walking Lunges']
  },
  hamstrings: {
    key: 'hamstrings',
    name: 'Hamstrings',
    latin: 'Biceps Femoris & Semitendinosus',
    view: 'back',
    category: 'lower',
    movement_pattern: 'hinge',
    function: 'Knee flexion, hip extension, and decelerating forward lunge momentum.',
    cue: 'Control the eccentric descent to feel loaded hamstring tension before driving upward.',
    exercises: ['Single-leg Glute Bridges', 'Glute Bridges Single Leg', 'Bulgarian Split Squats', 'Walking Lunges']
  },
  calves: {
    key: 'calves',
    name: 'Calves & Tibialis',
    latin: 'Gastrocnemius, Soleus & Tibialis Anterior',
    view: 'both',
    category: 'lower',
    movement_pattern: 'isolation_calf',
    function: 'Ankle plantarflexion and dorsiflexion for balance, sprint propulsion, and jump landings.',
    cue: 'Full stretch at the bottom followed by a 1-second squeeze at the apex on balls of feet.',
    exercises: ['Calf Raises', 'Standing Calf Raises', 'Jump Squats', 'Pistol Squats', 'Walking Lunges']
  }
};

function getExercisesForMuscle(muscleKey) {
  const normKey = (muscleKey || '').toLowerCase().replace(/[- ]/g, '_');
  const allDbExercises = (typeof state !== 'undefined' && Array.isArray(state.exercises) && state.exercises.length)
    ? state.exercises
    : [];

  const results = [];
  const seenNames = new Set();

  // 1. Query database exercises
  allDbExercises.forEach(ex => {
    const exName = ex.name || ex.exercise_name || '';
    const pattern = ex.movement_pattern || '';
    const m = (typeof window !== 'undefined' && window.MuscleMap)
      ? window.MuscleMap.getExerciseMuscles(exName, pattern)
      : { primary: [], secondary: [] };

    const p = (m.primary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
    const s = (m.secondary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));

    const isPrimary = p.includes(normKey) || (normKey === 'chest' && p.some(k => k.includes('chest'))) || (normKey === 'core' && (p.includes('abs') || p.includes('obliques')));
    const isSecondary = s.includes(normKey) || (normKey === 'chest' && s.some(k => k.includes('chest'))) || (normKey === 'core' && (s.includes('abs') || s.includes('obliques')));

    if (isPrimary || isSecondary) {
      results.push({
        id: ex.id,
        name: exName,
        day: ex.day || 'Custom Split',
        type: ex.type === 'duration' ? 'Hold Time' : 'Reps Target',
        pattern: ex.movement_pattern ? ex.movement_pattern.replace(/_/g, ' ') : '',
        role: isPrimary ? 'primary' : 'secondary',
        roleLabel: isPrimary ? 'Primary' : 'Stabilizer'
      });
      seenNames.add(exName.toLowerCase());
    }
  });

  // 2. Supplement from static map if any are missing
  if (typeof window !== 'undefined' && window.MuscleMap && window.MuscleMap.EXERCISE_MUSCLE_MAP) {
    Object.entries(window.MuscleMap.EXERCISE_MUSCLE_MAP).forEach(([exName, mapping]) => {
      if (!seenNames.has(exName.toLowerCase())) {
        const p = (mapping.primary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
        const s = (mapping.secondary || []).map(k => k.toLowerCase().replace(/[- ]/g, '_'));
        const isPrimary = p.includes(normKey);
        const isSecondary = s.includes(normKey);
        if (isPrimary || isSecondary) {
          results.push({
            id: null,
            name: exName,
            day: 'Catalog',
            type: 'Reps Target',
            pattern: '',
            role: isPrimary ? 'primary' : 'secondary',
            roleLabel: isPrimary ? 'Primary' : 'Stabilizer'
          });
          seenNames.add(exName.toLowerCase());
        }
      }
    });
  }

  // Sort: Primary agonists first, then by routine day
  results.sort((a, b) => {
    if (a.role === 'primary' && b.role !== 'primary') return -1;
    if (a.role !== 'primary' && b.role === 'primary') return 1;
    return a.day.localeCompare(b.day);
  });

  return results;
}

function selectGuideMuscle(muscleKey) {
  _guideSelectedMuscle = muscleKey;
  const muscleData = MUSCLE_ANATOMY_GUIDE[muscleKey];

  if (muscleData) {
    // Automatically switch view if selected muscle is not visible in current view
    if (_guideView !== 'both') {
      if (muscleData.view === 'front' && _guideView !== 'front') {
        _guideView = 'front';
      } else if (muscleData.view === 'back' && _guideView !== 'back') {
        _guideView = 'back';
      }
    }
  }

  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function setGuideView(view) {
  _guideView = view;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function setGuideCategory(cat) {
  _guideCategory = cat;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody && _biomechanicsTab === 'anatomy') {
    modalBody.innerHTML = renderBiomechanicsTabContent('anatomy');
    bindGuideSvgInteractions();
  }
}

function bindGuideSvgInteractions() {
  const container = document.getElementById('bio-guide-svg-stage');
  if (!container) return;

  const parts = container.querySelectorAll('.muscle, .cx-muscle-part, [data-muscle]');
  parts.forEach(p => {
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      const raw = p.dataset.muscle || p.id || '';
      if (MUSCLE_ANATOMY_GUIDE[raw]) {
        selectGuideMuscle(raw);
        return;
      }
      const norm = raw.replace(/_left|_right|_lateral|_medial|_upper|_mid|_lower|_front|_back/g, '');
      if (MUSCLE_ANATOMY_GUIDE[norm]) {
        selectGuideMuscle(norm);
        return;
      }
      if (raw.includes('front_delt')) selectGuideMuscle('front_delts');
      else if (raw.includes('side_delt')) selectGuideMuscle('side_delts');
      else if (raw.includes('rear_delt')) selectGuideMuscle('rear_delts');
      else if (raw.includes('delt')) selectGuideMuscle('front_delts');
      else if (raw.includes('trap')) selectGuideMuscle('traps');
      else if (raw.includes('chest') || raw.includes('pec')) selectGuideMuscle('chest');
      else if (raw.includes('bicep')) selectGuideMuscle('biceps');
      else if (raw.includes('tricep')) selectGuideMuscle('triceps');
      else if (raw.includes('forearm')) selectGuideMuscle('forearms');
      else if (raw.includes('lat')) selectGuideMuscle('lats');
      else if (raw.includes('lower_back') || raw.includes('erector')) selectGuideMuscle('lower_back');
      else if (raw.includes('glute')) selectGuideMuscle('glutes');
      else if (raw.includes('quad')) selectGuideMuscle('quads');
      else if (raw.includes('hamstring')) selectGuideMuscle('hamstrings');
      else if (raw.includes('calf') || raw.includes('calves') || raw.includes('tibialis')) selectGuideMuscle('calves');
      else if (raw.includes('ab') || raw.includes('core')) selectGuideMuscle('abs');
      else if (raw.includes('oblique')) selectGuideMuscle('obliques');
    });
  });
}

function setBiomechanicsTab(tab) {
  _biomechanicsTab = tab;
  const modalBody = document.getElementById('biomechanics-modal-body');
  if (modalBody) {
    modalBody.innerHTML = renderBiomechanicsTabContent(tab);
    if (tab === 'anatomy') {
      bindGuideSvgInteractions();
    }
  }
  document.querySelectorAll('.bio-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function renderBiomechanicsTabContent(tab) {
  if (tab === 'anatomy') {
    const selected = MUSCLE_ANATOMY_GUIDE[_guideSelectedMuscle] || MUSCLE_ANATOMY_GUIDE.chest;
    const activeMuscles = [selected.key];

    // Filter muscle chips based on category
    const allMuscles = Object.values(MUSCLE_ANATOMY_GUIDE);
    const filteredMuscles = allMuscles.filter(m => {
      if (_guideCategory === 'all') return true;
      return m.category === _guideCategory;
    });

    // Generate chips HTML
    const chipsHtml = filteredMuscles.map(m => {
      const isAct = m.key === selected.key;
      return `
        <button class="bio-muscle-chip ${isAct ? 'active' : ''}" onclick="selectGuideMuscle('${m.key}')" title="Click to view ${m.name}">
          <span class="bio-chip-dot"></span>
          <span>${m.name}</span>
        </button>
      `;
    }).join('');

    // Generate SVG Diagram based on current view
    let svgHtml = '';
    if (typeof window !== 'undefined' && window.MuscleMap) {
      if (_guideView === 'front') {
        svgHtml = `
          <div style="width:100%; max-width:210px; height:310px; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Anterior (Front View)</span>
            ${window.MuscleMap.renderFrontSVG(activeMuscles, [])}
          </div>`;
      } else if (_guideView === 'back') {
        svgHtml = `
          <div style="width:100%; max-width:210px; height:310px; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Posterior (Back View)</span>
            ${window.MuscleMap.renderBackSVG(activeMuscles, [])}
          </div>`;
      } else {
        svgHtml = `
          <div style="display:flex; justify-content:center; align-items:center; gap:16px; width:100%; height:310px;">
            <div style="width:48%; max-width:130px; display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:9px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:2px;">Front</span>
              ${window.MuscleMap.renderFrontSVG(activeMuscles, [])}
            </div>
            <div style="width:48%; max-width:130px; display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:9px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:2px;">Back</span>
              ${window.MuscleMap.renderBackSVG(activeMuscles, [])}
            </div>
          </div>`;
      }
    }

    // Database exercises targeting this muscle
    const dbExercises = getExercisesForMuscle(selected.key);
    const dbExListHtml = dbExercises.length ? dbExercises.map(ex => `
      <div class="bio-ex-item" title="${ex.name} (${ex.day})">
        <div class="bio-ex-info">
          <span class="bio-ex-name">${ex.name}</span>
          <div class="bio-ex-meta">
            <span class="bio-ex-split-tag">${ex.day}</span>
            <span>·</span>
            <span>${ex.type}</span>
            ${ex.pattern ? `<span>·</span><span style="text-transform:capitalize;">${ex.pattern}</span>` : ''}
          </div>
        </div>
        <span class="bio-ex-role ${ex.role}">
          <span style="width:5px; height:5px; border-radius:50%; background:currentColor;"></span>
          ${ex.roleLabel}
        </span>
      </div>
    `).join('') : `
      <div style="padding:14px; text-align:center; color:var(--text-muted); font-size:12px; background:rgba(255,255,255,0.02); border-radius:8px;">
        No specific exercises assigned in current split for this group.
      </div>
    `;

    return `
      <div class="bio-guide-container">
        <!-- Controls: View Switcher & Category Filter -->
        <div class="bio-guide-controls-row">
          <div class="bio-guide-view-tabs" role="tablist" aria-label="Anatomical View Selection">
            <button class="bio-guide-view-btn ${_guideView === 'front' ? 'active' : ''}" onclick="setGuideView('front')">
              Front (Anterior)
            </button>
            <button class="bio-guide-view-btn ${_guideView === 'back' ? 'active' : ''}" onclick="setGuideView('back')">
              Back (Posterior)
            </button>
            <button class="bio-guide-view-btn ${_guideView === 'both' ? 'active' : ''}" onclick="setGuideView('both')">
              Both Views
            </button>
          </div>

          <div class="prs-filter-pills" style="margin:0;">
            <button class="prs-filter-btn ${_guideCategory === 'all' ? 'active' : ''}" onclick="setGuideCategory('all')">All</button>
            <button class="prs-filter-btn ${_guideCategory === 'upper' ? 'active' : ''}" onclick="setGuideCategory('upper')">Upper Body</button>
            <button class="prs-filter-btn ${_guideCategory === 'core' ? 'active' : ''}" onclick="setGuideCategory('core')">Core</button>
            <button class="prs-filter-btn ${_guideCategory === 'lower' ? 'active' : ''}" onclick="setGuideCategory('lower')">Lower Body</button>
          </div>
        </div>

        <!-- Selectable Muscle Chips / Pills List -->
        <div class="bio-chips-wrapper" role="region" aria-label="Selectable Muscle Groups">
          ${chipsHtml}
        </div>

        <!-- Main Grid: SVG Figure on Left + Biomechanics Info & DB Exercises on Right -->
        <div class="bio-guide-main-grid">
          <!-- Diagram Stage (Clickable Vector Anatomy) -->
          <div class="bio-diagram-card" id="bio-guide-svg-stage" title="Click any muscle directly on the diagram to inspect">
            ${svgHtml}
            <div style="font-size:11px; color:var(--text-dim); margin-top:8px; display:flex; align-items:center; gap:5px;">
              <svg class="cx-icon cx-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Tip: Click any muscle in diagram to inspect</span>
            </div>
          </div>

          <!-- Biomechanics Detail & Exercise Discovery Card -->
          <div class="bio-details-card">
            <div class="bio-detail-header">
              <div>
                <h3 class="bio-detail-title">${selected.name}</h3>
                <span class="bio-detail-latin">${selected.latin}</span>
              </div>
              <span class="bio-detail-badge">${selected.view.toUpperCase()} VIEW · ${selected.category.toUpperCase()}</span>
            </div>

            <div>
              <div class="bio-field-label">Anatomical Action & Movement Biomechanics</div>
              <p class="bio-field-text">${selected.function}</p>
            </div>

            <div>
              <div class="bio-field-label">Mind-Muscle Coaching Cue</div>
              <p class="bio-field-text" style="color:var(--accent); font-weight:500;">
                "${selected.cue}"
              </p>
            </div>

            <!-- Targeted Exercises in CalistheniX Database -->
            <div class="bio-db-ex-section">
              <div class="bio-db-ex-header">
                <span class="bio-field-label" style="margin:0;">Targeting Exercises in Database (${dbExercises.length})</span>
                <span style="font-size:11px; color:var(--text-dim);">Live Routine Integration</span>
              </div>
              <div class="bio-ex-list">
                ${dbExListHtml}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else if (tab === 'stages') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Step-by-step movement stages breakdown: Maintain a strict plank from head to heels, descend under control to a full hover, and push explosively through the palms while keeping elbows tucked.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/movement-stages.svg" alt="Exercise Form Execution Stages" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else if (tab === 'tempo') {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Biomechanical tempo and posture analysis: Slower eccentric lowering (3–4s) builds maximum tendon strength and hypertrophic tension, while avoiding sagging hips or compromised spinal alignment.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/tempo-guide.svg" alt="Tempo & Posture Standards" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  } else {
    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0;">
          Hand placement & grip width comparison: Adjusting your grip alters the primary torque vector between chest pectoralis major, anterior deltoids, and triceps brachii.
        </p>
        <div class="card" style="padding:12px; background:var(--surface-2); text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <img src="assets/grip-guide.svg" alt="Hand Placement Grip Width Guide" style="width:100%; max-height:420px; object-fit:contain; border-radius:var(--radius);" />
        </div>
      </div>`;
  }
}

function openBiomechanicsModal(initialTab = 'anatomy', selectedMuscle = null) {
  if (selectedMuscle && MUSCLE_ANATOMY_GUIDE[selectedMuscle]) {
    _guideSelectedMuscle = selectedMuscle;
    const mData = MUSCLE_ANATOMY_GUIDE[selectedMuscle];
    if (mData && mData.view !== 'both') {
      _guideView = mData.view;
    }
  }

  _biomechanicsTab = initialTab || 'anatomy';

  let modal = document.getElementById('biomechanics-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'biomechanics-modal';
    modal.className = 'modal-backdrop';
    modal.onclick = (e) => {
      if (e.target === modal) closeBiomechanicsModal();
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:860px; width:94%;" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <span style="font-size:11px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.1em;">Calisthenics Biomechanics</span>
          <h2 class="modal-title" style="margin-top:2px;">Anatomy & Technique Explorer</h2>
        </div>
        <button class="modal-close-btn" onclick="closeBiomechanicsModal()" title="Close">${renderIcon('x', 'cx-icon')}</button>
      </div>

      <div class="prs-filter-pills" style="margin:16px 0 14px;">
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'anatomy' ? 'active' : ''}" data-tab="anatomy" onclick="setBiomechanicsTab('anatomy')">Targeted Anatomy Explorer</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'stages' ? 'active' : ''}" data-tab="stages" onclick="setBiomechanicsTab('stages')">Movement Stages</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'tempo' ? 'active' : ''}" data-tab="tempo" onclick="setBiomechanicsTab('tempo')">Tempo & Posture</button>
        <button class="prs-filter-btn bio-tab-btn ${_biomechanicsTab === 'grip' ? 'active' : ''}" data-tab="grip" onclick="setBiomechanicsTab('grip')">Grip & Placement</button>
      </div>

      <div id="biomechanics-modal-body" style="max-height:72vh; overflow-y:auto; padding-right:4px;">
        ${renderBiomechanicsTabContent(_biomechanicsTab)}
      </div>
    </div>`;

  modal.style.display = 'flex';
  if (document.body && document.body.style) document.body.style.overflow = 'hidden';

  if (_biomechanicsTab === 'anatomy') {
    bindGuideSvgInteractions();
  }
}

function closeBiomechanicsModal() {
  const modal = document.getElementById('biomechanics-modal');
  if (modal) modal.style.display = 'none';
  if (document.body && document.body.style) document.body.style.overflow = '';
}

// Global exports for window access
if (typeof window !== 'undefined') {
  window.openBiomechanicsModal = openBiomechanicsModal;
  window.closeBiomechanicsModal = closeBiomechanicsModal;
  window.selectGuideMuscle = selectGuideMuscle;
  window.setGuideView = setGuideView;
  window.setGuideCategory = setGuideCategory;
  window.getExercisesForMuscle = getExercisesForMuscle;
  window.MUSCLE_ANATOMY_GUIDE = MUSCLE_ANATOMY_GUIDE;
}


// ─── Data Export (Phase 1 F6) ────────────────────────────────────────────────
async function exportData() {
  try {
    const data = await API.getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calisthenix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export downloaded');
  } catch (e) {
    showToast(`Export failed: ${e.message}`, true);
  }
}

async function importData(inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const jsonContent = JSON.parse(e.target.result);
      const res = await API.importBackupData(jsonContent);
      showToast(`Import successful! ${res.imported_logs || 0} sets & ${res.imported_sessions || 0} sessions restored.`);
      await loadDashboardSummary();
      await loadExercises();
      render();
    } catch (err) {
      showToast(`Import error: ${err.message}`, true);
    } finally {
      inputEl.value = '';
    }
  };
  reader.readAsText(file);
}


function onCustomTypeChange(sel) {
  const isHold = sel.value === 'duration';
  const label = document.getElementById('custom-prog-target-label');
  const input = document.getElementById('custom-prog-target-input');
  if (!label || !input) return;
  if (isHold) {
    label.innerHTML   = 'Progression Target Hold (sec) <span class="opt">opt</span>';
    input.name        = 'progression_target_duration';
    input.placeholder = 'e.g. 30';
  } else {
    label.innerHTML   = 'Progression Target Reps <span class="opt">opt</span>';
    input.name        = 'progression_target_reps';
    input.placeholder = 'e.g. 15';
  }
}

async function handleCreateCustomExercise(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const type = data.get('type');
  const payload = {
    name: (data.get('name') || '').trim(),
    day:  data.get('day'),
    type: type,
    progression_sessions_needed: parseInt(data.get('progression_sessions_needed'), 10) || 2,
  };
  if (type === 'duration') {
    const dur = parseInt(data.get('progression_target_duration'), 10);
    if (!isNaN(dur)) payload.progression_target_duration = dur;
  } else {
    const reps = parseInt(data.get('progression_target_reps'), 10);
    if (!isNaN(reps)) payload.progression_target_reps = reps;
  }

  try {
    const newEx = await API.createExercise(payload);
    await loadExercises();
    showToast(`Created "${newEx.name}"`);
    form.reset();
    render();
  } catch (e) {
    showToast(`Error: ${e.message}`, true);
  }
}

// ─── Global window exports for settings & preferences ────────────────────────
if (typeof window !== 'undefined') {
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.getWeightUnit = getWeightUnit;
  window.setWeightUnit = setWeightUnit;
  window.getDefaultRestSec = getDefaultRestSec;
  window.setDefaultRestSec = setDefaultRestSec;
  window.getRestPauseSec = getRestPauseSec;
  window.setRestPauseSec = setRestPauseSec;
  window.isKeepScreenAwake = isKeepScreenAwake;
  window.toggleKeepScreenAwake = toggleKeepScreenAwake;
  window.isSoundsEnabled = isSoundsEnabled;
  window.toggleSounds = toggleSounds;
  window.isFlashScreenEnabled = isFlashScreenEnabled;
  window.toggleFlashScreen = toggleFlashScreen;
  window.getEffortMode = getEffortMode;
  window.setEffortMode = setEffortMode;
  window.getAppTheme = getAppTheme;
  window.setAppTheme = setAppTheme;
  window.getAccentColor = getAccentColor;
  window.setAccentColor = setAccentColor;
  window.getBodyDiagramModel = getBodyDiagramModel;
  window.setBodyDiagramModel = setBodyDiagramModel;
  window.getEquipmentProfile = getEquipmentProfile;
  window.toggleEquipmentItem = toggleEquipmentItem;
  window.getAppLanguage = getAppLanguage;
  window.setAppLanguage = setAppLanguage;
  window.resetDemoData = resetDemoData;
  window.confirmResetEverything = confirmResetEverything;
  window.executeResetEverything = executeResetEverything;
  window.closeSettingsSheet = closeSettingsSheet;
  window.openRestPickerModal = openRestPickerModal;
  window.openLanguageModal = openLanguageModal;
  window.openEquipmentModal = openEquipmentModal;
  window.renderEquipmentSheet = renderEquipmentSheet;
  window.exportData = exportData;
  window.importData = importData;
}
