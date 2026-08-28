/* ============================================================
   exerciseAnimation.js — Granular Minimalist Line-Art Calisthenics Animations
   Renders smooth looping SVG stick-figures with hardware-accelerated animations
   for exercise cards, detail modals, and workout runner views.
   Supported Granular Movement Patterns:
   - push_horizontal (Diamond, Wide, Decline Push-ups)
   - push_archer (Archer Push-ups: Unilateral side glide)
   - push_incline (Pike Push-ups, Elevated Pike Push-ups)
   - push_vertical (Handstand Push-up Progression)
   - push_dip (Parallel Bars Triceps Dips)
   - pull_vertical (Pull-ups Wide/Close, Chin-ups, Negative Pull-ups)
   - pull_horizontal (Face Pulls, Prone Y-raises, Wall Angels)
   - squat (Air Squats, Pistol Squat Progression, Jump Squats)
   - lunge (Bulgarian Split Squats, Walking Lunges)
   - hinge (Single-leg Glute Bridges, Hip Extension)
   - core (Hanging Knee/Leg Raises, L-sit Hang, Plank, Side Plank)
   - hold_isometric (Wall Sit, Superman Hold, Glute Bridge Hold)
   - hanging (Dead Hang)
   - isolation_lateral (Lateral Raises, Deltoid Abduction)
   - isolation_calf (Calf Raises)
   - isolation_curl (Biceps Curls, Arm Flexion)
   ============================================================ */

(function () {
  'use strict';

  /**
   * Normalize input pattern name or exercise name to canonical granular key.
   */
  function normalizePattern(pattern) {
    if (!pattern || typeof pattern !== 'string') return 'push_horizontal';
    const raw = pattern.toLowerCase().trim();
    const p = raw.replace(/[-_]/g, ' ');

    // ─── Warm-up & Mobility Movement Patterns ────────────────
    if (raw === 'mobility_wrist' || (p.includes('wrist') && !p.includes('stretch'))) {
      return 'mobility_wrist';
    }
    if (raw === 'mobility_shoulder' || p.includes('shoulder car') || p.includes('shoulder mobility') || p.includes('arm circle') || p.includes('arm swing') || p.includes('shoulder activation')) {
      return 'mobility_shoulder';
    }
    if (raw === 'mobility_spine' || p.includes('cat cow') || p.includes('cat-cow') || p.includes('spine mobility')) {
      return 'mobility_spine';
    }
    if (raw === 'mobility_full' || p.includes('greatest stretch') || p.includes('full body prep') || p.includes('world')) {
      return 'mobility_full';
    }
    if (raw === 'mobility_ankle' || (p.includes('ankle') && !p.includes('calf'))) {
      return 'mobility_ankle';
    }
    if (raw === 'mobility_hip' || p.includes('90/90') || p.includes('90 90') || p.includes('leg swing') || p.includes('deep squat hold') || p.includes('squat hold') || p.includes('hip mobility')) {
      return 'mobility_hip';
    }
    if (raw === 'planche' || p.includes('planche')) {
      return 'planche';
    }
    if (raw === 'handstand' || p.includes('handstand prep') || p.includes('wall-facing') || p.includes('wall facing')) {
      return 'handstand';
    }

    // ─── Cool-down & Static Stretching Patterns ──────────────
    if (raw === 'stretch_chest' || (p.includes('chest') && p.includes('stretch')) || p.includes('doorway')) {
      return 'stretch_chest';
    }
    if (raw === 'stretch_lat' || (p.includes('lat') && p.includes('stretch'))) {
      return 'stretch_lat';
    }
    if (raw === 'stretch_shoulder' || (p.includes('shoulder') && p.includes('stretch')) || p.includes('cross body')) {
      return 'stretch_shoulder';
    }
    if (raw === 'stretch_triceps' || (p.includes('tricep') && p.includes('stretch')) || p.includes('overhead triceps')) {
      return 'stretch_triceps';
    }
    if (raw === 'stretch_biceps' || (p.includes('bicep') && p.includes('stretch')) || p.includes('forearm stretch')) {
      return 'stretch_biceps';
    }
    if (raw === 'stretch_wrist' || (p.includes('wrist') && p.includes('stretch')) || p.includes('reverse wrist')) {
      return 'stretch_wrist';
    }
    if (raw === 'stretch_upper_back' || p.includes('eagle arm') || p.includes('upper back stretch') || p.includes('rhomboid')) {
      return 'stretch_upper_back';
    }
    if (raw === 'stretch_hip' || (p.includes('hip') && p.includes('stretch')) || p.includes('hip flexor') || p.includes('butterfly') || p.includes('psoas')) {
      return 'stretch_hip';
    }
    if (raw === 'stretch_hamstring' || p.includes('hamstring') || p.includes('forward fold') || p.includes('seated fold')) {
      return 'stretch_hamstring';
    }
    if (raw === 'stretch_glute' || p.includes('pigeon') || p.includes('glute stretch') || p.includes('piriformis')) {
      return 'stretch_glute';
    }
    if (raw === 'stretch_calf' || (p.includes('calf') && p.includes('stretch'))) {
      return 'stretch_calf';
    }
    if (raw === 'stretch_spine' || p.includes('child') || p.includes('puppy') || p.includes('spinal twist') || p.includes('twist')) {
      return 'stretch_spine';
    }
    if (raw === 'stretch_core' || p.includes('cobra') || (p.includes('core') && p.includes('stretch')) || p.includes('ab stretch')) {
      return 'stretch_core';
    }

    // ─── Main Strength Movement Patterns ─────────────────────
    if (raw === 'push_archer' || p.includes('archer')) {
      return 'push_archer';
    }
    if (raw === 'push_dip' || p.includes('dip')) {
      return 'push_dip';
    }
    if (raw === 'push_incline' || p.includes('incline') || p.includes('pike')) {
      return 'push_incline';
    }
    if (raw === 'push_vertical' || p.includes('vertical push') || p.includes('push vertical') || p.includes('handstand') || p.includes('hspu')) {
      return 'push_vertical';
    }
    if (raw === 'pull_horizontal' || p.includes('horizontal pull') || p.includes('pull horizontal') || p.includes('face pull') || p.includes('prone') || p.includes('angel') || p.includes('row')) {
      return 'pull_horizontal';
    }
    if (raw === 'pull_vertical' || p.includes('vertical pull') || p.includes('pull vertical') || p.includes('pull') || p.includes('chin')) {
      return 'pull_vertical';
    }
    if (raw === 'hold_isometric' || p.includes('wall sit') || p.includes('isometric') || p.includes('superman') || p.includes('bridge hold') || p.includes('hold')) {
      return 'hold_isometric';
    }
    if (raw === 'core' || p.includes('leg raise') || p.includes('knee raise') || p.includes('l sit') || p.includes('l-sit') || p.includes('plank') || p.includes('crunch') || p.includes('hollow')) {
      return 'core';
    }
    if (raw === 'hanging' || p.includes('dead hang') || p.includes('hanging')) {
      return 'hanging';
    }
    if (raw === 'lunge' || p.includes('lunge') || p.includes('split squat') || p.includes('bulgarian') || p.includes('step up')) {
      return 'lunge';
    }
    if (raw === 'squat' || p.includes('squat') || p.includes('pistol')) {
      return 'squat';
    }
    if (raw === 'hinge' || p.includes('bridge') || p.includes('thrust') || p.includes('deadlift') || p.includes('hinge')) {
      return 'hinge';
    }
    if (raw === 'isolation_lateral' || p.includes('lateral') || p.includes('deltoid')) {
      return 'isolation_lateral';
    }
    if (raw === 'isolation_curl' || p.includes('curl') || p.includes('bicep')) {
      return 'isolation_curl';
    }
    if (raw === 'isolation_calf' || p.includes('calf')) {
      return 'isolation_calf';
    }
    if (p.includes('isolation') || p.includes('raise')) {
      return 'isolation_lateral';
    }
    if (raw === 'push_horizontal' || p.includes('push horizontal') || p.includes('push up') || p.includes('pushup') || p.includes('push') || p.includes('press')) {
      return 'push_horizontal';
    }

    return 'push_horizontal';
  }

  /**
   * Return size dimensions in pixels based on token or number.
   */
  function resolveDimensions(size) {
    if (typeof size === 'number') {
      return { width: size, height: Math.round(size * 0.85) };
    }
    switch (size) {
      case 'xs':
        return { width: 48, height: 40 };
      case 'sm':
        return { width: 72, height: 60 };
      case 'lg':
        return { width: 140, height: 118 };
      case 'xl':
        return { width: 180, height: 152 };
      case 'md':
      default:
        return { width: 100, height: 84 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. PUSH_HORIZONTAL: Push-Up Horizontal Floor Press
  // ─────────────────────────────────────────────────────────────
  function renderPushHorizontalSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-push-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Horizontal push animation">
        <defs>
          <linearGradient id="cx-floor-fade-push-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-push-h" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="60" cy="65" r="36" fill="url(#cx-glow-push-h)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="url(#cx-floor-fade-push-h)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <ellipse class="cx-anim-shadow" cx="54" cy="88" rx="26" ry="2.5" fill="${accent}" opacity="0.15">
          <animate attributeName="rx" values="26; 34; 34; 26" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="opacity" values="0.15; 0.32; 0.32; 0.15" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </ellipse>

        <g class="cx-push-body-group">
          <line class="cx-anim-bone" x1="18" y1="86" x2="82" y2="54" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
            <animate attributeName="x2" values="82; 79; 79; 82" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
            <animate attributeName="y2" values="54; 76; 76; 54" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          </line>

          <circle class="cx-anim-head" cx="94" cy="48" r="6" fill="${accent}">
            <animate attributeName="cx" values="94; 92; 92; 94" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
            <animate attributeName="cy" values="48; 72; 72; 48" keyTimes="0; 0.48; 0.56; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          </circle>
        </g>

        <path class="cx-anim-bone" d="M 82 54 L 85 70 L 88 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 82 54 L 85 70 L 88 86;
                    M 79 76 L 63 71 L 88 86;
                    M 79 76 L 63 71 L 88 86;
                    M 82 54 L 85 70 L 88 86"
            keyTimes="0; 0.48; 0.56; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <circle class="cx-anim-joint" cx="88" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="18" cy="86" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PUSH_ARCHER: Archer Push-Up (Unilateral Side Glide)
  // ─────────────────────────────────────────────────────────────
  function renderPushArcherSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-archer-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Archer push-up animation">
        <defs>
          <linearGradient id="cx-floor-fade-archer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-archer" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="62" r="34" fill="url(#cx-glow-archer)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="url(#cx-floor-fade-archer)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <!-- Wide Hand Anchors (x=24 and x=96) & Feet (x=60) -->
        <circle class="cx-anim-joint" cx="24" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="96" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="60" cy="86" r="2.5" fill="${accent}" />

        <!-- Spine from Feet to Shoulders (Glides towards left hand) -->
        <line class="cx-anim-bone cx-archer-spine" x1="60" y1="86" x2="60" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="60; 36; 36; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="52; 74; 74; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <!-- Head glides with upper torso -->
        <circle class="cx-anim-head cx-archer-head" cx="60" cy="42" r="6" fill="${accent}">
          <animate attributeName="cx" values="60; 34; 34; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="42; 68; 68; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Left Working Arm (Bends deeply into unilateral press) -->
        <path class="cx-anim-bone cx-archer-arm-l" d="M 60 52 L 40 68 L 24 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 60 52 L 40 68 L 24 86;
                    M 36 74 L 18 78 L 24 86;
                    M 36 74 L 18 78 L 24 86;
                    M 60 52 L 40 68 L 24 86"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Right Straight Arm (Extends straight across floor to anchor x=96) -->
        <line class="cx-anim-bone cx-archer-arm-r" x1="60" y1="52" x2="96" y2="86" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x1" values="60; 36; 36; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y1" values="52; 74; 74; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PUSH_INCLINE: Pike Push-Up (Inverted V Angled Shoulder Press)
  // ─────────────────────────────────────────────────────────────
  function renderPushInclineSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-pike-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Incline pike push animation">
        <defs>
          <linearGradient id="cx-floor-fade-pike" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-pike" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="56" cy="55" r="34" fill="url(#cx-glow-pike)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="url(#cx-floor-fade-pike)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <circle class="cx-anim-joint" cx="36" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="90" cy="86" r="2.5" fill="${accent}" />

        <line class="cx-anim-bone cx-pike-legs" x1="90" y1="86" x2="60" y2="40" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="60; 58; 58; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="40; 44; 44; 40" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <line class="cx-anim-bone cx-pike-torso" x1="60" y1="40" x2="42" y2="60" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="60; 58; 58; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y1" values="40; 44; 44; 40" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="42; 32; 32; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="60; 72; 72; 60" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <circle class="cx-anim-head cx-pike-head" cx="36" cy="52" r="6" fill="${accent}">
          <animate attributeName="cx" values="36; 24; 24; 36" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="52; 76; 76; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <path class="cx-anim-bone cx-pike-arm" d="M 42 60 L 38 72 L 36 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 42 60 L 38 72 L 36 86;
                    M 32 72 L 46 76 L 36 86;
                    M 32 72 L 46 76 L 36 86;
                    M 42 60 L 38 72 L 36 86"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. PUSH_VERTICAL: Handstand Push-Up (Vertical Overhead Press)
  // ─────────────────────────────────────────────────────────────
  function renderPushVerticalSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hspu-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Vertical push handstand animation">
        <defs>
          <linearGradient id="cx-floor-fade-vpush" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-vpush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="65" r="35" fill="url(#cx-glow-vpush)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="14" y1="96" x2="86" y2="96" stroke="url(#cx-floor-fade-vpush)" stroke-width="2.5" stroke-linecap="round" />
        ` : ''}

        <circle class="cx-anim-joint" cx="50" cy="96" r="3" fill="${accent}" />

        <line class="cx-anim-bone cx-hspu-legs" x1="50" y1="16" x2="50" y2="44" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="16; 34; 34; 16" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="44; 62; 62; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <line class="cx-anim-bone cx-hspu-torso" x1="50" y1="44" x2="50" y2="70" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="44; 62; 62; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="70; 84; 84; 70" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <circle class="cx-anim-head cx-hspu-head" cx="50" cy="78" r="6" fill="${accent}">
          <animate attributeName="cy" values="78; 90; 90; 78" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <path class="cx-anim-bone cx-hspu-arms" d="M 50 70 L 50 84 L 50 96" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 70 L 50 84 L 50 96;
                    M 50 84 L 34 86 L 50 96;
                    M 50 84 L 34 86 L 50 96;
                    M 50 70 L 50 84 L 50 96"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PUSH_DIP: Parallel Bar Triceps Dips (Downward Vertical Push)
  // ─────────────────────────────────────────────────────────────
  function renderPushDipSVG(options = {}) {
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-dip-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Triceps dip animation">
        <defs>
          <radialGradient id="cx-glow-dip" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="60" r="34" fill="url(#cx-glow-dip)" class="cx-anim-ambient-glow" />

        <!-- Parallel Dip Bars (Left & Right) -->
        <line class="cx-anim-bar" x1="16" y1="56" x2="38" y2="56" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.5" />
        <line class="cx-anim-bar" x1="62" y1="56" x2="84" y2="56" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.5" />
        <circle class="cx-anim-joint" cx="34" cy="56" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="66" cy="56" r="2.5" fill="${accent}" />

        <!-- Head -->
        <circle class="cx-anim-head cx-dip-head" cx="50" cy="22" r="6" fill="${accent}">
          <animate attributeName="cy" values="22; 46; 46; 22" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Torso (Shoulder -> Hips) -->
        <line class="cx-anim-bone cx-dip-torso" x1="50" y1="32" x2="50" y2="66" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="32; 56; 56; 32" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="66; 90; 90; 66" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <!-- Knees Bent Backward -->
        <path class="cx-anim-bone cx-dip-legs" d="M 50 66 L 42 84 L 38 98" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 66 L 42 84 L 38 98;
                    M 50 90 L 42 106 L 38 116;
                    M 50 90 L 42 106 L 38 116;
                    M 50 66 L 42 84 L 38 98"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Left Arm: Shoulder -> Flared Elbow -> Fixed Hand at (34, 56) -->
        <path class="cx-anim-bone cx-dip-arm-l" d="M 50 32 L 36 44 L 34 56" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 32 L 36 44 L 34 56;
                    M 50 56 L 24 44 L 34 56;
                    M 50 56 L 24 44 L 34 56;
                    M 50 32 L 36 44 L 34 56"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Right Arm: Shoulder -> Flared Elbow -> Fixed Hand at (66, 56) -->
        <path class="cx-anim-bone cx-dip-arm-r" d="M 50 32 L 64 44 L 66 56" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 32 L 64 44 L 66 56;
                    M 50 56 L 76 44 L 66 56;
                    M 50 56 L 76 44 L 66 56;
                    M 50 32 L 64 44 L 66 56"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. PULL_VERTICAL: Pull-Up / Chin-Up Vertical Bar Pull
  // ─────────────────────────────────────────────────────────────
  function renderPullVerticalSVG(options = {}) {
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-pull-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Vertical pull movement animation">
        <defs>
          <linearGradient id="cx-bar-fade-vpull" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.1" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.1" />
          </linearGradient>
          <radialGradient id="cx-glow-vpull" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="35" r="32" fill="url(#cx-glow-vpull)" class="cx-anim-ambient-glow" />

        <line class="cx-anim-bar" x1="14" y1="18" x2="86" y2="18" stroke="url(#cx-bar-fade-vpull)" stroke-width="3" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="50" cy="18" r="3" fill="${accent}" />

        <path class="cx-anim-bone cx-pull-arms" d="M 50 40 L 50 29 L 50 18" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 40 L 50 29 L 50 18;
                    M 50 22 L 34 26 L 50 18;
                    M 50 22 L 34 26 L 50 18;
                    M 50 40 L 50 29 L 50 18"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <line class="cx-anim-bone cx-pull-torso" x1="50" y1="40" x2="50" y2="72" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="40; 22; 22; 40" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="72; 54; 54; 72" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <circle class="cx-anim-head cx-pull-head" cx="50" cy="30" r="6" fill="${accent}">
          <animate attributeName="cy" values="30; 10; 10; 30" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <path class="cx-anim-bone cx-pull-legs" d="M 50 72 L 52 94 L 52 114" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 72 L 52 94 L 52 114;
                    M 50 54 L 54 76 L 54 96;
                    M 50 54 L 54 76 L 54 96;
                    M 50 72 L 52 94 L 52 114"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. PULL_HORIZONTAL: Face Pull / Horizontal Scapular Row
  // ─────────────────────────────────────────────────────────────
  function renderPullHorizontalSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-row-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Horizontal pull rowing animation">
        <defs>
          <linearGradient id="cx-floor-fade-hpull" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-hpull" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="55" cy="50" r="32" fill="url(#cx-glow-hpull)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="url(#cx-floor-fade-hpull)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <circle class="cx-anim-joint" cx="16" cy="46" r="3" fill="${accent}" />
        <circle class="cx-anim-joint" cx="88" cy="86" r="2.5" fill="${accent}" />

        <line class="cx-anim-bone" x1="88" y1="86" x2="42" y2="44" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="42; 34; 34; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="44; 36; 36; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <circle class="cx-anim-head" cx="34" cy="36" r="6" fill="${accent}">
          <animate attributeName="cx" values="34; 26; 26; 34" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="36; 28; 28; 36" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <path class="cx-anim-bone" d="M 42 44 L 28 45 L 16 46" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 42 44 L 28 45 L 16 46;
                    M 34 36 L 46 26 L 16 46;
                    M 34 36 L 46 26 L 16 46;
                    M 42 44 L 28 45 L 16 46"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. SQUAT: Air Squat / Pistol Squats
  // ─────────────────────────────────────────────────────────────
  function renderSquatSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-squat-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Squat movement animation">
        <defs>
          <linearGradient id="cx-floor-fade-squat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-squat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="70" r="38" fill="url(#cx-glow-squat)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="14" y1="108" x2="86" y2="108" stroke="url(#cx-floor-fade-squat)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <ellipse class="cx-anim-shadow cx-squat-shadow" cx="50" cy="110" rx="18" ry="2.5" fill="${accent}" opacity="0.18">
          <animate attributeName="rx" values="18; 25; 25; 18" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="opacity" values="0.18; 0.36; 0.36; 0.18" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </ellipse>

        <path class="cx-anim-bone cx-squat-legs" d="M 48 108 L 48 78 L 48 48" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 48 108 L 48 78 L 48 48;
                    M 48 108 L 64 82 L 30 78;
                    M 48 108 L 64 82 L 30 78;
                    M 48 108 L 48 78 L 48 48"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <line class="cx-anim-bone cx-squat-torso" x1="48" y1="48" x2="48" y2="24" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="48; 30; 30; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y1" values="48; 78; 78; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="x2" values="48; 46; 46; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="24; 48; 48; 24" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <circle class="cx-anim-head cx-squat-head" cx="48" cy="14" r="6" fill="${accent}">
          <animate attributeName="cx" values="48; 48; 48; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="14; 38; 38; 14" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <path class="cx-anim-bone cx-squat-arms" d="M 48 24 L 48 38 L 48 52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 48 24 L 48 38 L 48 52;
                    M 46 48 L 64 48 L 80 48;
                    M 46 48 L 64 48 L 80 48;
                    M 48 24 L 48 38 L 48 52"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <circle class="cx-anim-joint cx-squat-foot-anchor" cx="48" cy="108" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 9. LUNGE: Split Squat / Walking Lunges
  // ─────────────────────────────────────────────────────────────
  function renderLungeSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-lunge-svg" viewBox="0 0 110 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Lunge movement animation">
        <defs>
          <linearGradient id="cx-floor-fade-lunge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-lunge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="70" r="36" fill="url(#cx-glow-lunge)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="108" x2="100" y2="108" stroke="url(#cx-floor-fade-lunge)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <ellipse class="cx-anim-shadow" cx="72" cy="110" rx="14" ry="2.2" fill="${accent}" opacity="0.2" />
        <ellipse class="cx-anim-shadow" cx="24" cy="110" rx="12" ry="2.2" fill="${accent}" opacity="0.2" />

        <path class="cx-anim-bone cx-lunge-front-leg" d="M 72 108 L 68 78 L 48 52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 72 108 L 68 78 L 48 52;
                    M 72 108 L 72 76 L 48 76;
                    M 72 108 L 72 76 L 48 76;
                    M 72 108 L 68 78 L 48 52"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <path class="cx-anim-bone cx-lunge-back-leg" d="M 48 52 L 34 76 L 24 108" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 48 52 L 34 76 L 24 108;
                    M 48 76 L 28 102 L 24 108;
                    M 48 76 L 28 102 L 24 108;
                    M 48 52 L 34 76 L 24 108"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <line class="cx-anim-bone cx-lunge-torso" x1="48" y1="52" x2="48" y2="26" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="52; 76; 76; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="26; 50; 50; 26" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <circle class="cx-anim-head cx-lunge-head" cx="48" cy="16" r="6" fill="${accent}">
          <animate attributeName="cy" values="16; 40; 40; 16" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <path class="cx-anim-bone cx-lunge-arms" d="M 48 26 L 38 38 L 32 48" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 48 26 L 38 38 L 32 48;
                    M 48 50 L 38 62 L 32 72;
                    M 48 50 L 38 62 L 32 72;
                    M 48 26 L 38 38 L 32 48"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <circle class="cx-anim-joint" cx="72" cy="108" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="24" cy="108" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 10. HINGE: Supine Glute Bridge / Pelvic Extension
  // ─────────────────────────────────────────────────────────────
  function renderHingeSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hinge-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hinge movement animation">
        <defs>
          <linearGradient id="cx-floor-fade-hinge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-hinge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="60" cy="62" r="32" fill="url(#cx-glow-hinge)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="url(#cx-floor-fade-hinge)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <circle class="cx-anim-head" cx="18" cy="80" r="5.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="30" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="92" cy="86" r="2.5" fill="${accent}" />

        <line class="cx-anim-bone cx-hinge-torso" x1="30" y1="86" x2="58" y2="86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="58; 58; 58; 58" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="86; 52; 52; 86" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <path class="cx-anim-bone cx-hinge-legs" d="M 58 86 L 76 68 L 92 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 58 86 L 76 68 L 92 86;
                    M 58 52 L 84 52 L 92 86;
                    M 58 52 L 84 52 L 92 86;
                    M 58 86 L 76 68 L 92 86"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <line class="cx-anim-bone" x1="30" y1="86" x2="54" y2="86" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 11. CORE: Hanging Leg / Knee Raise / L-Sit
  // ─────────────────────────────────────────────────────────────
  function renderCoreSVG(options = {}) {
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-core-svg" viewBox="0 0 110 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Core movement animation">
        <defs>
          <linearGradient id="cx-bar-fade-core" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.1" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.1" />
          </linearGradient>
          <radialGradient id="cx-glow-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="48" cy="64" r="30" fill="url(#cx-glow-core)" class="cx-anim-ambient-glow" />

        <line class="cx-anim-bar" x1="14" y1="16" x2="86" y2="16" stroke="url(#cx-bar-fade-core)" stroke-width="3" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="42" cy="16" r="3" fill="${accent}" />

        <line class="cx-anim-bone" x1="42" y1="16" x2="42" y2="34" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-head" cx="42" cy="24" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="42" y1="34" x2="42" y2="66" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />

        <path class="cx-anim-bone cx-core-legs" d="M 42 66 L 42 88 L 42 112" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 42 66 L 42 88 L 42 112;
                    M 42 66 L 68 66 L 94 66;
                    M 42 66 L 68 66 L 94 66;
                    M 42 66 L 42 88 L 42 112"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 12. HOLD_ISOMETRIC: Wall Sit / Static Endurance Hold
  // ─────────────────────────────────────────────────────────────
  function renderHoldIsometricSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.8s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hold-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Isometric hold animation">
        <defs>
          <linearGradient id="cx-wall-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.1" />
            <stop offset="30%" stop-color="${accent}" stop-opacity="0.7" />
            <stop offset="90%" stop-color="${accent}" stop-opacity="0.7" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.1" />
          </linearGradient>
          <radialGradient id="cx-glow-hold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="48" cy="74" r="32" fill="url(#cx-glow-hold)" class="cx-anim-ambient-glow">
          <animate attributeName="r" values="30; 36; 30" dur="${dur}" repeatCount="indefinite" ease="ease-in-out" />
          <animate attributeName="opacity" values="0.6; 1; 0.6" dur="${dur}" repeatCount="indefinite" ease="ease-in-out" />
        </circle>

        <line class="cx-anim-wall" x1="28" y1="20" x2="28" y2="110" stroke="url(#cx-wall-fade)" stroke-width="2.5" stroke-linecap="round" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="14" y1="108" x2="86" y2="108" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.35" />
        ` : ''}

        <line class="cx-anim-bone" x1="30" y1="48" x2="30" y2="78" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-head" cx="30" cy="38" r="6" fill="${accent}">
          <animate attributeName="cy" values="38; 37.2; 38" dur="${dur}" repeatCount="indefinite" ease="ease-in-out" />
        </circle>

        <path class="cx-anim-bone" d="M 30 78 L 62 78 L 62 108" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <path class="cx-anim-bone" d="M 30 48 L 46 56 L 36 64" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <circle class="cx-anim-joint" cx="62" cy="108" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="62" cy="78" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 13. HANGING: Dead Hang / Traction Hang
  // ─────────────────────────────────────────────────────────────
  function renderHangingSVG(options = {}) {
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hanging-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hanging movement animation">
        <defs>
          <linearGradient id="cx-bar-fade-hang" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.1" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.8" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.1" />
          </linearGradient>
          <radialGradient id="cx-glow-hang" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="55" r="34" fill="url(#cx-glow-hang)" class="cx-anim-ambient-glow" />

        <line class="cx-anim-bar" x1="14" y1="16" x2="86" y2="16" stroke="url(#cx-bar-fade-hang)" stroke-width="3" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="50" cy="16" r="3" fill="${accent}" />

        <line class="cx-anim-bone cx-hang-arms" x1="50" y1="16" x2="50" y2="38" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y2" values="38; 33; 33; 38" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <circle class="cx-anim-head cx-hang-head" cx="50" cy="28" r="6" fill="${accent}">
          <animate attributeName="cy" values="28; 23; 23; 28" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <line class="cx-anim-bone cx-hang-torso" x1="50" y1="38" x2="50" y2="70" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="38; 33; 33; 38" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="70; 65; 65; 70" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <path class="cx-anim-bone cx-hang-legs" d="M 50 70 L 50 92 L 50 114" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 70 L 50 92 L 50 114;
                    M 50 65 L 50 87 L 50 109;
                    M 50 65 L 50 87 L 50 109;
                    M 50 70 L 50 92 L 50 114"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 14. ISOLATION_LATERAL: Standing Lateral Deltoid Raise (Two Arms Abducting)
  // ─────────────────────────────────────────────────────────────
  function renderIsolationLateralSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-latraise-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Lateral raise animation">
        <defs>
          <linearGradient id="cx-floor-fade-lat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-lat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="60" cy="36" r="30" fill="url(#cx-glow-lat)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="16" y1="88" x2="104" y2="88" stroke="url(#cx-floor-fade-lat)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <!-- Head & Neck -->
        <circle class="cx-anim-head" cx="60" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="60" y1="24" x2="60" y2="30" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Clavicle / Shoulder Girdle -->
        <line class="cx-anim-bone" x1="46" y1="30" x2="74" y2="30" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="46" cy="30" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="74" cy="30" r="2.5" fill="${accent}" />

        <!-- Torso & Standing Legs -->
        <line class="cx-anim-bone" x1="60" y1="30" x2="60" y2="56" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <path class="cx-anim-bone" d="M 50 88 L 56 56 L 64 56 L 70 88" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- LEFT ARM: Shoulder (46, 30) -> Elbow -> Hand with Dumbbell -->
        <path class="cx-anim-bone cx-lat-arm-l" d="M 46 30 L 44 48 L 44 64" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 46 30 L 44 48 L 44 64;
                    M 46 30 L 28 29 L 14 28;
                    M 46 30 L 28 29 L 14 28;
                    M 46 30 L 44 48 L 44 64"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- RIGHT ARM: Shoulder (74, 30) -> Elbow -> Hand with Dumbbell -->
        <path class="cx-anim-bone cx-lat-arm-r" d="M 74 30 L 76 48 L 76 64" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 74 30 L 76 48 L 76 64;
                    M 74 30 L 92 29 L 106 28;
                    M 74 30 L 92 29 L 106 28;
                    M 74 30 L 76 48 L 76 64"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Left Dumbbell / Hand Weight -->
        <circle class="cx-anim-joint" cx="44" cy="64" r="3.5" fill="${accent}">
          <animate attributeName="cx" values="44; 14; 14; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="64; 28; 28; 64" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Right Dumbbell / Hand Weight -->
        <circle class="cx-anim-joint" cx="76" cy="64" r="3.5" fill="${accent}">
          <animate attributeName="cx" values="76; 106; 106; 76" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="64; 28; 28; 64" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 15. ISOLATION_CALF: Calf Raises (Plantarflexion Extension)
  // ─────────────────────────────────────────────────────────────
  function renderIsolationCalfSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.2s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-isolation-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Calf raise animation">
        <defs>
          <linearGradient id="cx-floor-fade-iso" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-iso" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="70" r="36" fill="url(#cx-glow-iso)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="14" y1="108" x2="86" y2="108" stroke="url(#cx-floor-fade-iso)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <ellipse class="cx-anim-shadow" cx="50" cy="110" rx="16" ry="2.2" fill="${accent}" opacity="0.18">
          <animate attributeName="rx" values="16; 11; 11; 16" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </ellipse>

        <path class="cx-anim-bone cx-iso-body" d="M 48 108 L 48 78 L 48 48 L 48 24" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 48 108 L 48 78 L 48 48 L 48 24;
                    M 50 96 L 50 66 L 50 36 L 50 12;
                    M 50 96 L 50 66 L 50 36 L 50 12;
                    M 48 108 L 48 78 L 48 48 L 48 24"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <circle class="cx-anim-head cx-iso-head" cx="48" cy="14" r="6" fill="${accent}">
          <animate attributeName="cy" values="14; 2; 2; 14" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <line class="cx-anim-bone" x1="48" y1="24" x2="48" y2="52" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.65">
          <animate attributeName="y1" values="24; 12; 12; 24" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="52; 40; 40; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <circle class="cx-anim-joint" cx="54" cy="108" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 16. ISOLATION_CURL: Standing Biceps Curl (Forearm Pivoting at Elbow)
  // ─────────────────────────────────────────────────────────────
  function renderIsolationCurlSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.3s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-curl-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Biceps curl animation">
        <defs>
          <linearGradient id="cx-floor-fade-curl" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0" />
            <stop offset="25%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="75%" stop-color="${accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="cx-glow-curl" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="32" fill="url(#cx-glow-curl)" class="cx-anim-ambient-glow" />

        ${showFloor ? `
        <line class="cx-anim-floor" x1="14" y1="108" x2="86" y2="108" stroke="url(#cx-floor-fade-curl)" stroke-width="2" stroke-linecap="round" />
        ` : ''}

        <circle class="cx-anim-head" cx="48" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="48" y1="28" x2="48" y2="60" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />

        <path class="cx-anim-bone" d="M 48 60 L 48 84 L 48 108" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-joint" cx="48" cy="108" r="2.5" fill="${accent}" />

        <line class="cx-anim-bone" x1="48" y1="28" x2="48" y2="54" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="48" cy="54" r="2.5" fill="${accent}" />

        <path class="cx-anim-bone" d="M 48 54 L 48 80" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="d"
            values="M 48 54 L 48 80;
                    M 48 54 L 62 34;
                    M 48 54 L 62 34;
                    M 48 54 L 48 80"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <circle class="cx-anim-joint" cx="48" cy="80" r="3.5" fill="${accent}">
          <animate attributeName="cx" values="48; 62; 62; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="80; 34; 34; 80" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 17. MOBILITY_WRIST: Circular Wrist Joint Articulation Orbit
  // ─────────────────────────────────────────────────────────────
  function renderMobilityWristSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.0s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-wrist-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wrist mobility circular rotation animation">
        <defs>
          <radialGradient id="cx-glow-wrist" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="76" cy="50" r="28" fill="url(#cx-glow-wrist)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Kneeling Base & Torso -->
        <circle class="cx-anim-joint" cx="42" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="64" cy="86" r="2.5" fill="${accent}" />
        <path class="cx-anim-bone" d="M 42 86 L 54 66 L 64 86" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <line class="cx-anim-bone" x1="54" y1="66" x2="48" y2="40" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-head" cx="48" cy="28" r="5.5" fill="${accent}" />

        <!-- Arm extending forward to wrist pivot -->
        <path class="cx-anim-bone" d="M 48 40 L 64 50 L 76 50" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-joint" cx="76" cy="50" r="3" fill="${accent}" />

        <!-- Orbital Guide Circle for wrist rotation -->
        <circle cx="76" cy="50" r="12" stroke="${accent}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="3 3" />

        <!-- Articulating Hand segment orbiting 360 degrees -->
        <line class="cx-anim-bone" x1="76" y1="50" x2="88" y2="50" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="88; 76; 64; 76; 88" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="50; 62; 50; 38; 50" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-joint" cx="88" cy="50" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="88; 76; 64; 76; 88" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="50; 62; 50; 38; 50" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 18. MOBILITY_SHOULDER: 360 Shoulder Circumduction & CARs
  // ─────────────────────────────────────────────────────────────
  function renderMobilityShoulderSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-shoulder-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Shoulder mobility circumduction animation">
        <defs>
          <radialGradient id="cx-glow-sh" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="30" r="32" fill="url(#cx-glow-sh)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="15" y1="88" x2="105" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Standing Legs & Torso -->
        <line class="cx-anim-bone" x1="42" y1="88" x2="50" y2="60" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="58" y1="88" x2="50" y2="60" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="60" x2="50" y2="28" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-head" cx="50" cy="16" r="6" fill="${accent}" />
        <circle class="cx-anim-joint" cx="50" cy="28" r="3" fill="${accent}" />

        <!-- Shoulder Circular Motion Trail -->
        <circle cx="50" cy="28" r="22" stroke="${accent}" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="3 3" />

        <!-- Left Arm Resting -->
        <line class="cx-anim-bone" x1="50" y1="28" x2="36" y2="52" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" opacity="0.6" />

        <!-- Right Arm Rotating 360 Degrees -->
        <line class="cx-anim-bone" x1="50" y1="28" x2="72" y2="28" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="72; 50; 28; 50; 72" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="28; 50; 28; 6; 28" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-joint" cx="72" cy="28" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="72; 50; 28; 50; 72" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="28; 50; 28; 6; 28" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 19. MOBILITY_HIP: Pendulum Leg Swings & Hip Capsule Opener
  // ─────────────────────────────────────────────────────────────
  function renderMobilityHipSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hip-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hip mobility leg swing animation">
        <defs>
          <radialGradient id="cx-glow-hip" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="55" r="30" fill="url(#cx-glow-hip)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="88" x2="110" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Support Leg & Torso -->
        <circle class="cx-anim-head" cx="48" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="48" y1="28" x2="48" y2="58" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="48" y1="58" x2="48" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="48" cy="88" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="48" cy="58" r="3" fill="${accent}" />

        <!-- Arms Balancer -->
        <path class="cx-anim-bone" d="M 48 34 L 36 50 M 48 34 L 60 48" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" opacity="0.65" />

        <!-- Swing Trajectory Arc -->
        <path d="M 22 76 Q 48 88 74 76" stroke="${accent}" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="3 3" fill="none" />

        <!-- Dynamic Leg Pendulum Swing -->
        <line class="cx-anim-bone" x1="48" y1="58" x2="22" y2="76" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="22; 48; 74; 48; 22" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
          <animate attributeName="y2" values="76; 88; 76; 88; 76" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
        </line>
        <circle class="cx-anim-joint" cx="22" cy="76" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="22; 48; 74; 48; 22" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
          <animate attributeName="cy" values="76; 88; 76; 88; 76" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 20. MOBILITY_ANKLE: Ankle Rotation Circles
  // ─────────────────────────────────────────────────────────────
  function renderMobilityAnkleSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.2s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-ankle-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Ankle mobility circular rotation animation">
        <defs>
          <radialGradient id="cx-glow-ankle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="70" cy="74" r="26" fill="url(#cx-glow-ankle)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="12" y1="88" x2="108" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Support Body -->
        <circle class="cx-anim-head" cx="42" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="42" y1="28" x2="42" y2="58" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="42" y1="58" x2="38" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="38" cy="88" r="2.5" fill="${accent}" />

        <!-- Elevated Knee & Ankle -->
        <path class="cx-anim-bone" d="M 42 58 L 56 68 L 68 76" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-joint" cx="68" cy="76" r="3" fill="${accent}" />

        <!-- Foot Orbit Guide -->
        <circle cx="68" cy="76" r="10" stroke="${accent}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="2.5 2.5" />

        <!-- Foot Articulating Orbit -->
        <line class="cx-anim-bone" x1="68" y1="76" x2="78" y2="76" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="78; 68; 58; 68; 78" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="76; 86; 76; 66; 76" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-joint" cx="78" cy="76" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="78; 68; 58; 68; 78" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="76; 86; 76; 66; 76" keyTimes="0; 0.25; 0.5; 0.75; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 21. MOBILITY_SPINE: Cat-Cow Spinal Articulation
  // ─────────────────────────────────────────────────────────────
  function renderMobilitySpineSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.8s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-catcow-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Cat-cow spinal mobility animation">
        <defs>
          <radialGradient id="cx-glow-spine" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="56" cy="52" r="32" fill="url(#cx-glow-spine)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Hands and Knees Anchors -->
        <circle class="cx-anim-joint" cx="30" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="82" cy="86" r="2.5" fill="${accent}" />
        <line class="cx-anim-bone" x1="30" y1="86" x2="30" y2="54" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="82" y1="86" x2="82" y2="54" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />

        <!-- Dynamic Articulating Spine (Cow extension to Cat flexion) -->
        <path class="cx-anim-bone" d="M 30 54 Q 56 66 82 54" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" fill="none">
          <animate attributeName="d"
            values="M 30 54 Q 56 66 82 54;
                    M 30 54 Q 56 36 82 54;
                    M 30 54 Q 56 36 82 54;
                    M 30 54 Q 56 66 82 54"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Tilting Head -->
        <circle class="cx-anim-head" cx="18" cy="42" r="5.5" fill="${accent}">
          <animate attributeName="cy" values="42; 62; 62; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
        <line class="cx-anim-bone" x1="30" y1="54" x2="18" y2="42" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="y2" values="42; 62; 62; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 22. MOBILITY_FULL: World's Greatest Stretch / Thoracic Reach
  // ─────────────────────────────────────────────────────────────
  function renderMobilityFullSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.7s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-world-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Thoracic rotation mobility animation">
        <defs>
          <radialGradient id="cx-glow-w" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="55" cy="50" r="32" fill="url(#cx-glow-w)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Runner Lunge Base -->
        <circle class="cx-anim-joint" cx="32" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="96" cy="86" r="2.5" fill="${accent}" />
        <path class="cx-anim-bone" d="M 32 86 L 32 62 L 56 64 L 96 86" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-head" cx="44" cy="46" r="5.5" fill="${accent}" />

        <!-- Grounded Hand Anchor -->
        <line class="cx-anim-bone" x1="44" y1="54" x2="24" y2="86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="24" cy="86" r="2.5" fill="${accent}" />

        <!-- Dynamic Sky-Reaching Thoracic Arm -->
        <line class="cx-anim-bone" x1="44" y1="54" x2="28" y2="82" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="28; 54; 54; 28" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="82; 18; 18; 82" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-joint" cx="28" cy="82" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="28; 54; 54; 28" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="82; 18; 18; 82" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 23. PLANCHE: Planche Lean Protraction Prep
  // ─────────────────────────────────────────────────────────────
  function renderPlancheSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-planche-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Planche lean prep animation">
        <defs>
          <radialGradient id="cx-glow-planche" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="64" cy="54" r="34" fill="url(#cx-glow-planche)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Feet & Hand Anchors -->
        <circle class="cx-anim-joint" cx="18" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="64" cy="86" r="2.5" fill="${accent}" />

        <!-- Straight Plank Body Leaning Forward past Hands -->
        <line class="cx-anim-bone" x1="18" y1="86" x2="64" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="64; 82; 82; 64" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="52; 50; 50; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-head" cx="74" cy="46" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="74; 92; 92; 74" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="cy" values="46; 44; 44; 46" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Straight Locked Arm Leaning Forward (Angle changes) -->
        <line class="cx-anim-bone" x1="64" y1="86" x2="64" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="64; 82; 82; 64" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="52; 50; 50; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 24. HANDSTAND: Wall-Facing Handstand Alignment
  // ─────────────────────────────────────────────────────────────
  function renderHandstandSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-hs-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wall-facing handstand prep animation">
        <defs>
          <radialGradient id="cx-glow-hs" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="60" r="36" fill="url(#cx-glow-hs)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="108" x2="90" y2="108" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Wall Alignment Guide -->
        <line x1="68" y1="10" x2="68" y2="108" stroke="${accent}" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />

        <!-- Straight Inverted Body with Scapular Elevation Pulse -->
        <circle class="cx-anim-joint" cx="50" cy="108" r="2.5" fill="${accent}" />
        <line class="cx-anim-bone" x1="50" y1="108" x2="50" y2="80" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y2" values="80; 74; 74; 80" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <line class="cx-anim-bone" x1="50" y1="80" x2="50" y2="20" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y1" values="80; 74; 74; 80" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="20; 14; 14; 20" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-head" cx="50" cy="88" r="5.5" fill="${accent}">
          <animate attributeName="cy" values="88; 82; 82; 88" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
        <circle class="cx-anim-joint" cx="50" cy="20" r="2.5" fill="${accent}">
          <animate attributeName="cy" values="20; 14; 14; 20" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 25. STRETCH_CHEST: Pectoral Wall/Doorway Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchChestSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-chest-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pectoral chest stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-ch" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="46" r="30" fill="url(#cx-glow-str-ch)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="12" y1="88" x2="108" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Vertical Wall Anchor -->
        <line x1="20" y1="16" x2="20" y2="88" stroke="${accent}" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round" />

        <!-- Anchored Arm on Wall -->
        <circle class="cx-anim-joint" cx="20" cy="42" r="3" fill="${accent}" />
        <line class="cx-anim-bone" x1="20" y1="42" x2="52" y2="38" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="52; 60; 60; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>

        <!-- Torso Rotating Forward/Outward Opening Pectoral -->
        <line class="cx-anim-bone" x1="52" y1="38" x2="52" y2="66" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="52; 60; 60; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="x2" values="52; 58; 58; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-head" cx="52" cy="24" r="6" fill="${accent}">
          <animate attributeName="cx" values="52; 62; 62; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Standing Legs -->
        <line class="cx-anim-bone" x1="52" y1="66" x2="44" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x1" values="52; 58; 58; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <line class="cx-anim-bone" x1="52" y1="66" x2="68" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x1" values="52; 58; 58; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 26. STRETCH_SHOULDER: Cross-Body Posterior Deltoid Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchShoulderSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-sh-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Cross-body shoulder stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-sh" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="42" r="30" fill="url(#cx-glow-str-sh)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="14" y1="88" x2="106" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Standing Base -->
        <circle class="cx-anim-head" cx="50" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="50" y1="28" x2="50" y2="60" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="60" x2="42" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="60" x2="58" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Cross-body Right Arm -->
        <line class="cx-anim-bone" x1="50" y1="32" x2="22" y2="34" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="22; 16; 16; 22" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-joint" cx="22" cy="34" r="2.5" fill="${accent}">
          <animate attributeName="cx" values="22; 16; 16; 22" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </circle>

        <!-- Hooking Left Forearm Pulling Across -->
        <path class="cx-anim-bone" d="M 50 32 L 34 50 L 32 24" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 32 L 34 50 L 32 24;
                    M 50 32 L 30 50 L 26 24;
                    M 50 32 L 30 50 L 26 24;
                    M 50 32 L 34 50 L 32 24"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 27. STRETCH_TRICEPS: Overhead Triceps & Lat Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchTricepsSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-tri-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Overhead triceps stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-tri" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="30" r="28" fill="url(#cx-glow-str-tri)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="14" y1="88" x2="106" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Standing Legs & Torso -->
        <circle class="cx-anim-head" cx="50" cy="22" r="5.5" fill="${accent}" />
        <line class="cx-anim-bone" x1="50" y1="32" x2="50" y2="62" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="62" x2="42" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="62" x2="58" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Right Elbow Pointed Straight Up Behind Head -->
        <path class="cx-anim-bone" d="M 50 32 L 44 8 L 52 28" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-joint" cx="44" cy="8" r="3" fill="${accent}">
          <animate attributeName="cx" values="44; 48; 48; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Left Arm Reaching Over to Gently Pull Right Elbow -->
        <path class="cx-anim-bone" d="M 50 32 L 64 16 L 44 8" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 32 L 64 16 L 44 8;
                    M 50 32 L 64 14 L 48 8;
                    M 50 32 L 64 14 L 48 8;
                    M 50 32 L 64 16 L 44 8"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 28. STRETCH_LAT: Latissimus Dorsi & Flank Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchLatSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-lat-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Latissimus dorsi side stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-lat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="56" cy="40" r="32" fill="url(#cx-glow-str-lat)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="14" y1="88" x2="106" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Standing Base -->
        <line class="cx-anim-bone" x1="44" y1="88" x2="50" y2="64" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="58" y1="88" x2="50" y2="64" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Side-Bending Torso Arc -->
        <path class="cx-anim-bone" d="M 50 64 Q 54 44 68 34" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" fill="none">
          <animate attributeName="d"
            values="M 50 64 Q 54 44 68 34;
                    M 50 64 Q 58 42 76 30;
                    M 50 64 Q 58 42 76 30;
                    M 50 64 Q 54 44 68 34"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
        <circle class="cx-anim-head" cx="74" cy="26" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="74; 82; 82; 74" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="26; 22; 22; 26" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Left Arm Reaching Overhead into Side Arc -->
        <path class="cx-anim-bone" d="M 68 34 Q 76 18 88 16" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" fill="none">
          <animate attributeName="d"
            values="M 68 34 Q 76 18 88 16;
                    M 76 30 Q 86 14 96 12;
                    M 76 30 Q 86 14 96 12;
                    M 68 34 Q 76 18 88 16"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 29. STRETCH_BICEPS: Biceps & Anterior Shoulder Wall Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchBicepsSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-bi-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Biceps and forearm stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-bi" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="44" cy="46" r="30" fill="url(#cx-glow-str-bi)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="12" y1="88" x2="108" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Wall Anchor Behind -->
        <line x1="18" y1="18" x2="18" y2="88" stroke="${accent}" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="18" cy="50" r="3" fill="${accent}" />

        <!-- Straight Backward Arm Opening Biceps -->
        <line class="cx-anim-bone" x1="18" y1="50" x2="56" y2="34" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="56; 64; 64; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>

        <!-- Torso & Legs -->
        <line class="cx-anim-bone" x1="56" y1="34" x2="56" y2="64" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="56; 64; 64; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="56; 62; 62; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-head" cx="56" cy="22" r="6" fill="${accent}">
          <animate attributeName="cx" values="56; 64; 64; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
        <line class="cx-anim-bone" x1="56" y1="64" x2="48" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="56" y1="64" x2="68" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 30. STRETCH_WRIST: Reverse Palms-Down Wrist Flexor Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchWristSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-wri-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Reverse wrist extensor stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-wri" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="56" cy="60" r="30" fill="url(#cx-glow-str-wri)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="12" y1="86" x2="108" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Kneeling Base & Backward Rocking Motion -->
        <circle class="cx-anim-joint" cx="42" cy="86" r="3" fill="${accent}" />
        <circle class="cx-anim-joint" cx="78" cy="86" r="2.5" fill="${accent}" />

        <!-- Arms to Reversed Hands (Fingers facing knees) -->
        <line class="cx-anim-bone" x1="42" y1="86" x2="48" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="48; 54; 54; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <line class="cx-anim-bone" x1="48" y1="52" x2="74" y2="58" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="48; 54; 54; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="74; 82; 82; 74" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-head" cx="42" cy="40" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="42; 48; 48; 42" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
        <line class="cx-anim-bone" x1="74" y1="58" x2="78" y2="86" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x1" values="74; 82; 82; 74" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 31. STRETCH_UPPER_BACK: Eagle Arms Rhomboid & Trapezius Opener
  // ─────────────────────────────────────────────────────────────
  function renderStretchUpperBackSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.4s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-ub-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Eagle arms rhomboid stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-ub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="34" r="30" fill="url(#cx-glow-str-ub)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="14" y1="88" x2="106" y2="88" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Standing Base -->
        <circle class="cx-anim-head" cx="50" cy="18" r="6" fill="${accent}" />
        <line class="cx-anim-bone" x1="50" y1="28" x2="50" y2="60" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="60" x2="42" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        <line class="cx-anim-bone" x1="50" y1="60" x2="58" y2="88" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Intertwined Forearms Lifting Upward -->
        <path class="cx-anim-bone" d="M 50 32 L 40 44 L 50 44 L 50 18" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 50 32 L 40 44 L 50 44 L 50 18;
                    M 50 30 L 38 38 L 50 38 L 50 12;
                    M 50 30 L 38 38 L 50 38 L 50 12;
                    M 50 32 L 40 44 L 50 44 L 50 18"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 32. STRETCH_HIP: Hip Flexor & Psoas Kneeling Lunge Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchHipSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-hip-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hip flexor lunge stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-hip" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="54" cy="54" r="32" fill="url(#cx-glow-str-hip)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Half-kneeling Lunge Base -->
        <circle class="cx-anim-joint" cx="30" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="78" cy="86" r="2.5" fill="${accent}" />
        <path class="cx-anim-bone" d="M 30 86 L 30 62 L 56 62 L 78 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <animate attributeName="d"
            values="M 30 86 L 30 62 L 56 62 L 78 86;
                    M 30 86 L 26 62 L 46 62 L 78 86;
                    M 30 86 L 26 62 L 46 62 L 78 86;
                    M 30 86 L 30 62 L 56 62 L 78 86"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>

        <!-- Upright Torso sinking forward into stretch -->
        <line class="cx-anim-bone" x1="56" y1="62" x2="56" y2="30" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="56; 46; 46; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="56; 46; 46; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-head" cx="56" cy="20" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="56; 46; 46; 56" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 33. STRETCH_HAMSTRING: Seated/Standing Forward Fold Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchHamstringSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-ham-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hamstring forward fold stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-ham" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="32" fill="url(#cx-glow-str-ham)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Seated Flat Straight Legs along Floor -->
        <circle class="cx-anim-joint" cx="28" cy="86" r="3" fill="${accent}" />
        <line class="cx-anim-bone" x1="28" y1="86" x2="96" y2="86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="96" cy="86" r="2.5" fill="${accent}" />

        <!-- Torso Hinging Forward to Touch Toes -->
        <line class="cx-anim-bone" x1="28" y1="86" x2="58" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="58; 68; 68; 58" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="52; 70; 70; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-head" cx="66" cy="44" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="66; 78; 78; 66" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="44; 66; 66; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Arms Reaching for Feet -->
        <line class="cx-anim-bone" x1="58" y1="52" x2="86" y2="78" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x1" values="58; 68; 68; 58" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y1" values="52; 70; 70; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="86; 96; 96; 86" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="y2" values="78; 84; 84; 78" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 34. STRETCH_GLUTE: Pigeon Pose Glute & Piriformis Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchGluteSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-glt-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pigeon pose glute stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-glt" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="56" cy="62" r="32" fill="url(#cx-glow-str-glt)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Front Bent Knee + Rear Leg Base -->
        <circle class="cx-anim-joint" cx="36" cy="86" r="3" fill="${accent}" />
        <path class="cx-anim-bone" d="M 48 86 L 36 86 L 54 74 L 102 86" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Torso Sinking Down into Glute Stretch -->
        <line class="cx-anim-bone" x1="54" y1="74" x2="38" y2="52" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x2" values="38; 32; 32; 38" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
          <animate attributeName="y2" values="52; 66; 66; 52" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </line>
        <circle class="cx-anim-head" cx="30" cy="44" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="30; 24; 24; 30" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="44; 60; 60; 44" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 35. STRETCH_CALF: Wall-Assisted Calf & Achilles Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchCalfSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.5s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-calf-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Standing calf stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-calf" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="52" cy="56" r="32" fill="url(#cx-glow-str-calf)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Wall Forward -->
        <line x1="90" y1="18" x2="90" y2="86" stroke="${accent}" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round" />
        <circle class="cx-anim-joint" cx="90" cy="48" r="2.5" fill="${accent}" />

        <!-- Front Bent Leg + Rear Straight Leg Driving Heel -->
        <path class="cx-anim-bone" d="M 64 86 L 62 66 L 46 62 L 20 86" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle class="cx-anim-joint" cx="20" cy="86" r="3" fill="${accent}" />
        <circle class="cx-anim-joint" cx="64" cy="86" r="2.5" fill="${accent}" />

        <!-- Torso Leaning Forward into Wall -->
        <line class="cx-anim-bone" x1="46" y1="62" x2="68" y2="44" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="46; 48; 48; 46" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="68; 74; 74; 68" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-head" cx="74" cy="38" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="74; 80; 80; 74" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Arms on Wall -->
        <line class="cx-anim-bone" x1="68" y1="44" x2="90" y2="48" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="x1" values="68; 74; 74; 68" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 36. STRETCH_SPINE: Child's Pose Spinal Decompression
  // ─────────────────────────────────────────────────────────────
  function renderStretchSpineSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.8s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-child-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Child pose spinal decompression stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-child" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="54" cy="68" r="30" fill="url(#cx-glow-str-child)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Kneeling on Heels Folded -->
        <circle class="cx-anim-joint" cx="92" cy="86" r="2.5" fill="${accent}" />
        <circle class="cx-anim-joint" cx="68" cy="86" r="2.5" fill="${accent}" />
        <path class="cx-anim-bone" d="M 92 86 L 82 74 L 68 86" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Torso Relaxed Forward Flat to Thighs -->
        <line class="cx-anim-bone" x1="82" y1="74" x2="42" y2="80" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y2" values="80; 84; 84; 80" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-head" cx="34" cy="80" r="5" fill="${accent}">
          <animate attributeName="cy" values="80; 84; 84; 80" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Arms Extended Straight Forward on Floor -->
        <line class="cx-anim-bone" x1="42" y1="80" x2="14" y2="86" stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <animate attributeName="x2" values="14; 10; 10; 14" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-joint" cx="14" cy="86" r="2" fill="${accent}">
          <animate attributeName="cx" values="14; 10; 10; 14" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 37. STRETCH_CORE: Cobra Pose Prone Abdominal Stretch
  // ─────────────────────────────────────────────────────────────
  function renderStretchCoreSVG(options = {}) {
    const showFloor = options.showFloor !== false;
    const dur = options.speed || '2.6s';
    const accent = options.accentColor || 'var(--accent, #7c5cfc)';

    return `
      <svg class="cx-anim-svg cx-anim-str-cobra-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Cobra pose anterior abdominal stretch animation">
        <defs>
          <radialGradient id="cx-glow-str-cbr" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="56" r="32" fill="url(#cx-glow-str-cbr)" class="cx-anim-ambient-glow" />
        ${showFloor ? `<line class="cx-anim-floor" x1="10" y1="86" x2="110" y2="86" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />` : ''}

        <!-- Legs Flat on Floor -->
        <circle class="cx-anim-joint" cx="64" cy="86" r="2.5" fill="${accent}" />
        <line class="cx-anim-bone" x1="64" y1="86" x2="102" y2="86" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

        <!-- Arched Upward Spine -->
        <path class="cx-anim-bone" d="M 64 86 Q 52 68 38 48" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" fill="none">
          <animate attributeName="d"
            values="M 64 86 Q 52 68 38 48;
                    M 64 86 Q 50 64 36 38;
                    M 64 86 Q 50 64 36 38;
                    M 64 86 Q 52 68 38 48"
            keyTimes="0; 0.48; 0.58; 1"
            dur="${dur}"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95" />
        </path>
        <circle class="cx-anim-head" cx="34" cy="36" r="5.5" fill="${accent}">
          <animate attributeName="cx" values="34; 30; 30; 34" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="cy" values="36; 26; 26; 36" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </circle>

        <!-- Arms on Floor Supporting Chest -->
        <line class="cx-anim-bone" x1="38" y1="86" x2="38" y2="48" stroke="${accent}" stroke-width="3.5" stroke-linecap="round">
          <animate attributeName="y2" values="48; 38; 38; 48" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="x2" values="38; 36; 36; 38" keyTimes="0; 0.48; 0.58; 1" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle class="cx-anim-joint" cx="38" cy="86" r="2.5" fill="${accent}" />
      </svg>
    `;
  }

  /**
   * Main Component API
   */
  const ExerciseAnimation = {
    /**
     * Return normalized canonical granular pattern key.
     */
    getPatternKey(pattern) {
      return normalizePattern(pattern);
    },

    /**
     * Render HTML string for the movement animation.
     * @param {string} movementPattern
     * @param {Object} options - { size: 'sm'|'md'|'lg'|'xl'|number, className: '', showFloor: true, speed: '2.4s', label: '', paused: boolean }
     * @returns {string} HTML string
     */
    render(movementPattern, options = {}) {
      const patternKey = normalizePattern(movementPattern);
      const dims = resolveDimensions(options.size || 'md');
      const extraClass = options.className ? ` ${options.className}` : '';
      const isPaused = !!options.paused;
      const pausedClass = isPaused ? ' cx-anim-paused' : '';
      const labelHtml = options.label
        ? `<span class="cx-anim-label">${options.label}</span>`
        : '';

      let svgContent = '';
      switch (patternKey) {
        // ── Warm-up & Mobility Patterns ─────────────────
        case 'mobility_wrist':
          svgContent = renderMobilityWristSVG(options);
          break;
        case 'mobility_shoulder':
          svgContent = renderMobilityShoulderSVG(options);
          break;
        case 'mobility_hip':
          svgContent = renderMobilityHipSVG(options);
          break;
        case 'mobility_ankle':
          svgContent = renderMobilityAnkleSVG(options);
          break;
        case 'mobility_spine':
          svgContent = renderMobilitySpineSVG(options);
          break;
        case 'mobility_full':
          svgContent = renderMobilityFullSVG(options);
          break;
        case 'planche':
          svgContent = renderPlancheSVG(options);
          break;
        case 'handstand':
          svgContent = renderHandstandSVG(options);
          break;

        // ── Cool-down & Static Stretch Patterns ─────────
        case 'stretch_chest':
          svgContent = renderStretchChestSVG(options);
          break;
        case 'stretch_lat':
          svgContent = renderStretchLatSVG(options);
          break;
        case 'stretch_shoulder':
          svgContent = renderStretchShoulderSVG(options);
          break;
        case 'stretch_triceps':
          svgContent = renderStretchTricepsSVG(options);
          break;
        case 'stretch_biceps':
          svgContent = renderStretchBicepsSVG(options);
          break;
        case 'stretch_wrist':
          svgContent = renderStretchWristSVG(options);
          break;
        case 'stretch_upper_back':
          svgContent = renderStretchUpperBackSVG(options);
          break;
        case 'stretch_hip':
          svgContent = renderStretchHipSVG(options);
          break;
        case 'stretch_hamstring':
          svgContent = renderStretchHamstringSVG(options);
          break;
        case 'stretch_glute':
          svgContent = renderStretchGluteSVG(options);
          break;
        case 'stretch_calf':
          svgContent = renderStretchCalfSVG(options);
          break;
        case 'stretch_spine':
          svgContent = renderStretchSpineSVG(options);
          break;
        case 'stretch_core':
          svgContent = renderStretchCoreSVG(options);
          break;

        // ── Main Strength Movement Patterns ─────────────
        case 'push_archer':
          svgContent = renderPushArcherSVG(options);
          break;
        case 'push_dip':
          svgContent = renderPushDipSVG(options);
          break;
        case 'push_incline':
          svgContent = renderPushInclineSVG(options);
          break;
        case 'push_vertical':
          svgContent = renderPushVerticalSVG(options);
          break;
        case 'pull_horizontal':
          svgContent = renderPullHorizontalSVG(options);
          break;
        case 'pull_vertical':
          svgContent = renderPullVerticalSVG(options);
          break;
        case 'squat':
          svgContent = renderSquatSVG(options);
          break;
        case 'lunge':
          svgContent = renderLungeSVG(options);
          break;
        case 'hinge':
          svgContent = renderHingeSVG(options);
          break;
        case 'core':
          svgContent = renderCoreSVG(options);
          break;
        case 'hold_isometric':
          svgContent = renderHoldIsometricSVG(options);
          break;
        case 'hanging':
          svgContent = renderHangingSVG(options);
          break;
        case 'isolation_lateral':
          svgContent = renderIsolationLateralSVG(options);
          break;
        case 'isolation_curl':
          svgContent = renderIsolationCurlSVG(options);
          break;
        case 'isolation_calf':
          svgContent = renderIsolationCalfSVG(options);
          break;
        case 'push_horizontal':
        default:
          svgContent = renderPushHorizontalSVG(options);
          break;
      }

      return `
        <div class="cx-exercise-animation cx-anim-${patternKey}${extraClass}${pausedClass}"
             style="width: ${dims.width}px; height: ${dims.height}px;"
             data-movement-pattern="${patternKey}"
             data-anim-paused="${isPaused}"
             role="img"
             aria-label="${patternKey} pattern stick-figure animation">
          ${svgContent}
          ${isPaused ? `
            <div class="cx-anim-pause-overlay">
              <span class="cx-anim-pause-badge">PAUSED</span>
            </div>
          ` : ''}
          ${labelHtml}
        </div>
      `.trim();
    },

    /**
     * Pause all SVG animations currently active in the DOM.
     */
    pauseAll() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.cx-exercise-animation').forEach(el => {
        el.classList.add('cx-anim-paused');
      });
      document.querySelectorAll('.cx-anim-svg').forEach(svg => {
        if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
      });
    },

    /**
     * Resume all SVG animations currently active in the DOM.
     */
    resumeAll() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.cx-exercise-animation').forEach(el => {
        el.classList.remove('cx-anim-paused');
      });
      document.querySelectorAll('.cx-anim-svg').forEach(svg => {
        if (typeof svg.unpauseAnimations === 'function') svg.unpauseAnimations();
      });
    },

    /**
     * Render DOM element instance directly.
     */
    renderElement(movementPattern, options = {}) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.render(movementPattern, options);
      return wrapper.firstElementChild;
    }
  };

  // Expose globally for vanilla JS CalistheniX application
  window.ExerciseAnimation = ExerciseAnimation;

  // Backward compatibility convenience helper
  window.renderExerciseAnimation = (pattern, options) => ExerciseAnimation.render(pattern, options);

})();
