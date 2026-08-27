/* ============================================================
   muscleMap.js — Interactive Anatomical Muscle Heatmap (Front & Back)
   Original Minimal Line-Art Vector Anatomy Engine.
   Provides discrete per-muscle highlighting, movement-pattern mapping,
   and dynamic DOM highlight control for CalistheniX.
   ============================================================ */

(function () {
  'use strict';

  // ─── Canonical Muscle Groups Catalog ───────────────────────────────────────
  // Supported muscle identifiers:
  // 'chest', 'upper_chest', 'lower_chest',
  // 'front_delts', 'side_delts', 'rear_delts', 'shoulders',
  // 'biceps', 'triceps', 'forearms',
  // 'lats', 'upper_traps', 'mid_traps', 'traps', 'upper_back', 'lower_back',
  // 'abs', 'obliques', 'core',
  // 'glutes', 'quads', 'hamstrings', 'calves', 'tibialis'

  const EXERCISE_MUSCLE_MAP = {
    // ── PUSH EXERCISES ──
    'Diamond Push-ups': {
      primary: ['triceps', 'chest'],
      secondary: ['front_delts', 'abs', 'core']
    },
    'Decline Push-ups': {
      primary: ['upper_chest', 'front_delts'],
      secondary: ['triceps', 'abs', 'core']
    },
    'Archer Push-ups': {
      primary: ['chest', 'triceps'],
      secondary: ['front_delts', 'forearms', 'obliques', 'core']
    },
    'Pike Push-ups': {
      primary: ['front_delts', 'side_delts', 'triceps'],
      secondary: ['upper_chest', 'upper_traps', 'core']
    },
    'Pike Push-ups Elevated': {
      primary: ['front_delts', 'side_delts', 'triceps'],
      secondary: ['upper_chest', 'upper_traps', 'core']
    },
    'Handstand Push-up Progression': {
      primary: ['front_delts', 'side_delts', 'triceps'],
      secondary: ['upper_traps', 'upper_chest', 'core']
    },
    'Triceps Dips': {
      primary: ['triceps', 'lower_chest'],
      secondary: ['front_delts', 'core']
    },
    'Dips': {
      primary: ['triceps', 'chest'],
      secondary: ['front_delts', 'core']
    },
    'Standard Push-ups': {
      primary: ['chest', 'triceps'],
      secondary: ['front_delts', 'core']
    },
    'Wide Push-ups': {
      primary: ['chest'],
      secondary: ['front_delts', 'triceps', 'core']
    },
    'Lateral Raise': {
      primary: ['side_delts'],
      secondary: ['upper_traps', 'forearms']
    },

    // ── PULL EXERCISES ──
    'Pull-ups Wide Grip': {
      primary: ['lats', 'upper_back'],
      secondary: ['biceps', 'rear_delts', 'forearms', 'core']
    },
    'Close-Grip Chin-ups': {
      primary: ['biceps', 'lats'],
      secondary: ['upper_back', 'forearms', 'core']
    },
    'Pull-ups': {
      primary: ['lats', 'upper_back'],
      secondary: ['biceps', 'rear_delts', 'forearms', 'core']
    },
    'Chin-ups': {
      primary: ['biceps', 'lats'],
      secondary: ['upper_back', 'forearms', 'core']
    },
    'Negative Pull-ups': {
      primary: ['lats', 'biceps'],
      secondary: ['upper_back', 'forearms', 'core']
    },
    'Inverted Rows': {
      primary: ['upper_back', 'mid_traps', 'rear_delts'],
      secondary: ['lats', 'biceps', 'core']
    },
    'Scapular Pulls': {
      primary: ['mid_traps', 'upper_traps', 'lats'],
      secondary: ['forearms']
    },
    'Face Pulls': {
      primary: ['rear_delts', 'mid_traps'],
      secondary: ['side_delts', 'upper_traps']
    },
    'Prone Y-raises': {
      primary: ['mid_traps', 'traps', 'rear_delts'],
      secondary: ['lower_back']
    },
    'Wall Angels': {
      primary: ['upper_back', 'mid_traps', 'rear_delts'],
      secondary: ['upper_traps']
    },
    'Biceps Curls': {
      primary: ['biceps'],
      secondary: ['forearms']
    },
    'Dead Hang': {
      primary: ['forearms', 'lats'],
      secondary: ['upper_traps', 'shoulders']
    },

    // ── LEGS EXERCISES ──
    'Pistol Squat Progression': {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'calves', 'core']
    },
    'Bulgarian Split Squats': {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'calves']
    },
    'Glute Bridges Single Leg': {
      primary: ['glutes', 'hamstrings'],
      secondary: ['lower_back', 'calves']
    },
    'Single-leg Glute Bridge Hold': {
      primary: ['glutes', 'hamstrings'],
      secondary: ['lower_back']
    },
    'Calf Raises': {
      primary: ['calves'],
      secondary: ['tibialis']
    },
    'Air Squats': {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'calves', 'core']
    },
    'Jump Squats': {
      primary: ['quads', 'glutes', 'calves'],
      secondary: ['hamstrings', 'core']
    },
    'Walking Lunges': {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'calves']
    },
    'Wall Sit': {
      primary: ['quads'],
      secondary: ['glutes', 'calves', 'core']
    },

    // ── CORE EXERCISES ──
    'Plank': {
      primary: ['abs', 'obliques'],
      secondary: ['front_delts', 'quads', 'glutes']
    },
    'Side Plank': {
      primary: ['obliques'],
      secondary: ['abs', 'glutes', 'side_delts']
    },
    'Hanging Knee Raises': {
      primary: ['abs', 'obliques'],
      secondary: ['forearms', 'lats']
    },
    'Hanging Leg Raises': {
      primary: ['abs', 'obliques'],
      secondary: ['forearms', 'lats', 'quads']
    },
    'L-sit Hang': {
      primary: ['abs', 'obliques'],
      secondary: ['forearms', 'lats', 'quads']
    },
    'Hollow Body Hold': {
      primary: ['abs', 'obliques'],
      secondary: ['quads', 'lower_back']
    },
    'Russian Twists': {
      primary: ['obliques', 'abs'],
      secondary: ['lower_back']
    }
  };

  const PATTERN_DEFAULT_MUSCLES = {
    push_horizontal: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
    push_archer: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'forearms', 'obliques'] },
    push_incline: { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['upper_chest', 'upper_traps', 'abs'] },
    push_vertical: { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['upper_traps', 'upper_chest', 'abs'] },
    push_dip: { primary: ['triceps', 'chest'], secondary: ['front_delts', 'abs'] },
    pull_vertical: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'rear_delts', 'forearms'] },
    pull_horizontal: { primary: ['upper_back', 'mid_traps', 'rear_delts'], secondary: ['lats', 'biceps'] },
    squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves', 'abs'] },
    lunge: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
    hinge: { primary: ['glutes', 'hamstrings'], secondary: ['lower_back', 'calves'] },
    core: { primary: ['abs', 'obliques'], secondary: ['lower_back'] },
    hold_isometric: { primary: ['quads', 'abs'], secondary: ['glutes', 'lower_back'] },
    hanging: { primary: ['forearms', 'lats'], secondary: ['upper_traps', 'shoulders'] },
    isolation_lateral: { primary: ['side_delts'], secondary: ['upper_traps', 'forearms'] },
    isolation_calf: { primary: ['calves'], secondary: ['tibialis'] },
    isolation_curl: { primary: ['biceps'], secondary: ['forearms'] }
  };

  // ─── Normalizer Helper ──────────────────────────────────────────────────────
  function normalizeMuscleKey(key) {
    if (!key) return '';
    return String(key).toLowerCase().trim().replace(/[- ]/g, '_');
  }

  /**
   * Resolve target muscles from movement_pattern, target_muscles list, exercise name, or workout object.
   * Returns: { primary: string[], secondary: string[], label: string }
   */
  function resolveMuscles(input) {
    if (!input) {
      return { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'], label: 'Full Body' };
    }

    // 1. Direct object format { primary: [...], secondary: [...] }
    if (typeof input === 'object' && (Array.isArray(input.primary) || Array.isArray(input.secondary))) {
      const p = (input.primary || []).map(normalizeMuscleKey);
      const s = (input.secondary || []).map(normalizeMuscleKey);
      return { primary: Array.from(new Set(p)), secondary: Array.from(new Set(s)), label: input.label || formatMuscleNames(p) };
    }

    // 2. Workout Object containing exercises
    if (typeof input === 'object' && (input.exercises || input.name)) {
      const pSet = new Set();
      const sSet = new Set();
      const labels = [];

      if (Array.isArray(input.exercises) && input.exercises.length > 0) {
        input.exercises.forEach(ex => {
          const exName = ex.exercise_name || ex.name || '';
          const pattern = ex.movement_pattern || '';
          const m = getExerciseMuscles(exName, pattern);
          (m.primary || []).forEach(k => pSet.add(normalizeMuscleKey(k)));
          (m.secondary || []).forEach(k => sSet.add(normalizeMuscleKey(k)));
        });
      } else {
        // Fallback to text matching on workout name / description
        const text = `${input.name || ''} ${input.description || ''}`.toLowerCase();
        if (text.includes('push') || text.includes('dip') || text.includes('press') || text.includes('chest')) {
          ['chest', 'front_delts', 'triceps'].forEach(k => pSet.add(k));
          labels.push('Chest, Shoulders, Triceps');
        }
        if (text.includes('pull') || text.includes('chin') || text.includes('row') || text.includes('back') || text.includes('lat')) {
          ['lats', 'upper_back', 'biceps'].forEach(k => pSet.add(k));
          ['forearms', 'rear_delts'].forEach(k => sSet.add(k));
          labels.push('Back, Lats, Biceps');
        }
        if (text.includes('leg') || text.includes('squat') || text.includes('lunge') || text.includes('calf')) {
          ['quads', 'glutes'].forEach(k => pSet.add(k));
          ['hamstrings', 'calves'].forEach(k => sSet.add(k));
          labels.push('Legs, Glutes, Calves');
        }
        if (text.includes('core') || text.includes('abs') || text.includes('plank')) {
          ['abs', 'obliques'].forEach(k => pSet.add(k));
          labels.push('Core & Abs');
        }
      }

      // Remove items from secondary that are already in primary
      pSet.forEach(k => sSet.delete(k));
      const pList = Array.from(pSet);
      const sList = Array.from(sSet);
      return {
        primary: pList,
        secondary: sList,
        label: labels.length ? labels.join(' · ') : formatMuscleNames(pList)
      };
    }

    // 3. Array of muscles passed as target_muscles
    if (Array.isArray(input)) {
      const p = input.map(normalizeMuscleKey);
      return { primary: p, secondary: [], label: formatMuscleNames(p) };
    }

    // 4. String input: movement_pattern OR comma-separated muscle string OR exercise name
    if (typeof input === 'string') {
      const str = input.trim();

      // Check pattern map
      if (PATTERN_DEFAULT_MUSCLES[str]) {
        const m = PATTERN_DEFAULT_MUSCLES[str];
        return { primary: m.primary, secondary: m.secondary, label: formatMuscleNames(m.primary) };
      }

      // Check exercise catalog
      if (EXERCISE_MUSCLE_MAP[str]) {
        const m = EXERCISE_MUSCLE_MAP[str];
        return { primary: m.primary, secondary: m.secondary, label: formatMuscleNames(m.primary) };
      }

      // Check comma-separated string
      if (str.includes(',')) {
        const list = str.split(',').map(normalizeMuscleKey).filter(Boolean);
        return { primary: list, secondary: [], label: formatMuscleNames(list) };
      }

      // Single muscle or fuzzy pattern
      const norm = normalizeMuscleKey(str);
      if (PATTERN_DEFAULT_MUSCLES[norm]) {
        const m = PATTERN_DEFAULT_MUSCLES[norm];
        return { primary: m.primary, secondary: m.secondary, label: formatMuscleNames(m.primary) };
      }

      return { primary: [norm], secondary: [], label: formatMuscleNames([norm]) };
    }

    return { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'], label: 'Full Body' };
  }

  function formatMuscleNames(list = []) {
    if (!list || !list.length) return 'Full Body';
    return list.slice(0, 4).map(m => m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
  }

  function getExerciseMuscles(exerciseName, movementPattern) {
    if (exerciseName && EXERCISE_MUSCLE_MAP[exerciseName.trim()]) {
      return EXERCISE_MUSCLE_MAP[exerciseName.trim()];
    }
    if (movementPattern && PATTERN_DEFAULT_MUSCLES[movementPattern]) {
      return PATTERN_DEFAULT_MUSCLES[movementPattern];
    }
    // Fuzzy matching by name keywords
    if (exerciseName) {
      const n = exerciseName.toLowerCase();
      if (n.includes('push') || n.includes('press')) return PATTERN_DEFAULT_MUSCLES.push_horizontal;
      if (n.includes('pull') || n.includes('chin')) return PATTERN_DEFAULT_MUSCLES.pull_vertical;
      if (n.includes('squat')) return PATTERN_DEFAULT_MUSCLES.squat;
      if (n.includes('lunge')) return PATTERN_DEFAULT_MUSCLES.lunge;
      if (n.includes('dip')) return PATTERN_DEFAULT_MUSCLES.push_dip;
      if (n.includes('plank') || n.includes('hollow') || n.includes('core') || n.includes('twist') || n.includes('raise')) return PATTERN_DEFAULT_MUSCLES.core;
      if (n.includes('curl')) return PATTERN_DEFAULT_MUSCLES.isolation_curl;
      if (n.includes('calf')) return PATTERN_DEFAULT_MUSCLES.isolation_calf;
      if (n.includes('lateral')) return PATTERN_DEFAULT_MUSCLES.isolation_lateral;
    }
    return { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] };
  }

  function getMuscleStatus(muscleKey, primaryList = [], secondaryList = []) {
    const p = (primaryList || []).map(normalizeMuscleKey);
    const s = (secondaryList || []).map(normalizeMuscleKey);
    const target = normalizeMuscleKey(muscleKey);

    const isMatch = (list) => {
      return list.some(item => {
        if (item === target) return true;
        if (target.includes('chest') && item === 'chest') return true;
        if (target.includes('delt') && (item === 'shoulders' || item.includes('delt'))) return true;
        if (target.includes('trap') && (item === 'traps' || item.includes('trap'))) return true;
        if ((target === 'abs' || target === 'obliques') && item === 'core') return true;
        if (target === 'core' && (item === 'abs' || item === 'obliques')) return true;
        if (target === 'calves' && item === 'tibialis') return true;
        if (target === 'tibialis' && item === 'calves') return true;
        if (target === 'upper_back' && (item === 'lats' || item === 'traps')) return true;
        return false;
      });
    };

    if (isMatch(p)) return 'primary';
    if (isMatch(s)) return 'secondary';
    return 'inactive';
  }

  /**
   * ─── Core Function: highlightMuscles ─────────────────────────────────────────
   * Takes movement_pattern OR target_muscles OR workout object, and gives
   * corresponding SVG <path> elements 'active' and 'is-primary'/'is-secondary' classes,
   * keeping all other muscles muted/gray (is-inactive).
   *
   * @param {string|string[]|object} input - movement_pattern, target_muscles, or workout
   * @param {HTMLElement|Document} container - Root element to search for SVGs (default: document)
   * @returns {object} { primary: string[], secondary: string[], label: string, updatedCount: number }
   */
  function highlightMuscles(input, container = null) {
    const root = container || (typeof document !== 'undefined' ? document : null);
    if (!root) return { primary: [], secondary: [], label: '', updatedCount: 0 };

    const resolved = resolveMuscles(input);
    const p = resolved.primary || [];
    const s = resolved.secondary || [];

    // Find all muscle elements in container
    const elements = root.querySelectorAll('.muscle, .cx-muscle-part, [data-muscle]');
    let count = 0;

    elements.forEach(el => {
      const muscleKey = el.dataset.muscle || el.id || '';
      const status = getMuscleStatus(muscleKey, p, s);

      // Reset previous classes
      el.classList.remove('active', 'is-primary', 'is-secondary', 'is-inactive');

      if (status === 'primary') {
        el.classList.add('active', 'is-primary');
        el.dataset.active = 'primary';
        count++;
      } else if (status === 'secondary') {
        el.classList.add('is-secondary');
        el.dataset.active = 'secondary';
        count++;
      } else {
        el.classList.add('is-inactive');
        el.removeAttribute('data-active');
      }
    });

    return {
      primary: p,
      secondary: s,
      label: resolved.label,
      updatedCount: count
    };
  }

  // ─── SVG Geometry Renderers (Minimal Line-Art Silhouette) ───────────────────

  function renderFrontSVG(primary = [], secondary = [], options = {}) {
    const getClass = (m) => {
      const st = getMuscleStatus(m, primary, secondary);
      return `cx-muscle-part muscle ${m} is-${st} ${st === 'primary' ? 'active' : ''}`;
    };

    return `
      <svg class="cx-muscle-svg cx-anatomical-svg front-view" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Anterior Front Muscle Map">
        <defs>
          <filter id="cx-front-glow-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#8b5cf6" flood-opacity="0.85" />
          </filter>
          <filter id="cx-front-glow-secondary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.75" />
          </filter>
        </defs>

        <!-- Neutral Head & Neck -->
        <ellipse cx="100" cy="30" rx="13" ry="16" class="neutral-joint" data-name="Head" />
        <path d="M 93 45 L 107 45 L 109 54 L 91 54 Z" class="neutral-joint" data-name="Neck" />

        <!-- Upper Traps (Clavicular Front) -->
        <path id="traps" class="${getClass('upper_traps')}" data-muscle="traps" data-name="Trapezius (Upper)"
              d="M 91 50 L 100 53 L 109 50 L 118 59 L 109 62 L 100 63 L 91 62 L 82 59 Z" />

        <!-- Shoulders / Deltoids -->
        <path id="front_delts_left" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Front Deltoids (Left)"
              d="M 80 60 C 72 61 64 67 60 77 C 57 84 59 91 65 94 C 68 90 73 81 77 74 C 80 68 81 63 80 60 Z" />
        <path id="front_delts_right" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Front Deltoids (Right)"
              d="M 120 60 C 128 61 136 67 140 77 C 143 84 141 91 135 94 C 132 90 127 81 123 74 C 120 68 119 63 120 60 Z" />
        <path id="side_delts_left" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Side Deltoids (Left)"
              d="M 60 77 C 52 83 48 93 50 102 C 53 105 57 105 61 101 C 58 95 56 86 60 77 Z" />
        <path id="side_delts_right" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Side Deltoids (Right)"
              d="M 140 77 C 148 83 152 93 150 102 C 147 105 143 105 139 101 C 142 95 144 86 140 77 Z" />

        <!-- Chest / Pectorals -->
        <path id="chest_left" class="${getClass('chest')}" data-muscle="chest" data-name="Pectorals (Left)"
              d="M 98 64 C 90 63 81 66 78 74 C 76 81 80 91 88 94 C 94 95 98 93 98 88 Z" />
        <path id="chest_right" class="${getClass('chest')}" data-muscle="chest" data-name="Pectorals (Right)"
              d="M 102 64 C 110 63 119 66 122 74 C 124 81 120 91 112 94 C 106 95 102 93 102 88 Z" />

        <!-- Biceps -->
        <path id="biceps_left" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps (Left)"
              d="M 65 95 C 59 98 57 109 59 118 C 62 121 67 122 71 116 C 73 110 72 101 65 95 Z" />
        <path id="biceps_right" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps (Right)"
              d="M 135 95 C 141 98 143 109 141 118 C 138 121 133 122 129 116 C 127 110 128 101 135 95 Z" />

        <!-- Forearms (Flexors) -->
        <path id="forearms_left" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms (Left)"
              d="M 58 122 C 52 126 47 138 44 151 C 43 158 47 162 52 160 C 56 154 62 141 64 130 C 64 124 61 121 58 122 Z" />
        <path id="forearms_right" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms (Right)"
              d="M 142 122 C 148 126 153 138 156 151 C 157 158 153 162 148 160 C 144 154 138 141 136 130 C 136 124 139 121 142 122 Z" />

        <!-- Hands (Neutral) -->
        <path d="M 43 161 C 38 166 33 174 30 182 C 29 186 33 188 36 184 C 40 178 45 172 47 166 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 157 161 C 162 166 167 174 170 182 C 171 186 167 188 164 184 C 160 178 155 172 153 166 Z" class="neutral-joint" data-name="Hand (Right)" />

        <!-- Abs (6-Pack Rectus Abdominis) -->
        <path id="abs_upper_left" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abs (Left)" d="M 91 96 L 98 95 L 98 106 L 91 106 Z" />
        <path id="abs_upper_right" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abs (Right)" d="M 102 95 L 109 96 L 109 106 L 102 106 Z" />
        <path id="abs_mid_left" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abs (Left)" d="M 91 108 L 98 108 L 98 120 L 91 119 Z" />
        <path id="abs_mid_right" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abs (Right)" d="M 102 108 L 109 108 L 109 119 L 102 120 Z" />
        <path id="abs_lower_left" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abs (Left)" d="M 92 122 L 98 122 L 98 135 L 93 132 Z" />
        <path id="abs_lower_right" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abs (Right)" d="M 102 122 L 108 122 L 107 132 L 102 135 Z" />

        <!-- Obliques & Deep Pelvic Core -->
        <path id="obliques_left" class="${getClass('obliques')}" data-muscle="obliques" data-name="Obliques (Left)"
              d="M 88 96 C 82 99 78 110 77 121 C 77 129 81 140 90 144 C 89 137 88 127 88 119 C 88 110 89 102 88 96 Z" />
        <path id="obliques_right" class="${getClass('obliques')}" data-muscle="obliques" data-name="Obliques (Right)"
              d="M 112 96 C 118 99 122 110 123 121 C 123 129 119 140 110 144 C 111 137 112 127 112 119 C 112 110 111 102 112 96 Z" />
        <path id="core_pelvic" class="${getClass('core')}" data-muscle="core" data-name="Pelvic Core"
              d="M 92 137 L 100 151 L 108 137 C 102 140 98 140 92 137 Z" />

        <!-- Quadriceps (Front Thighs) -->
        <path id="quads_left_lateral" class="${getClass('quads')}" data-muscle="quads" data-name="Quads Lateral (Left)"
              d="M 89 147 C 80 155 73 169 70 187 C 67 202 70 217 77 224 C 82 223 87 209 89 195 C 91 181 92 162 89 147 Z" />
        <path id="quads_left_medial" class="${getClass('quads')}" data-muscle="quads" data-name="Quads Teardrop (Left)"
              d="M 90 152 C 92 167 92 185 90 203 C 89 215 92 223 95 221 C 97 212 98 192 97 172 C 96 157 93 151 90 152 Z" />
        <path id="quads_right_lateral" class="${getClass('quads')}" data-muscle="quads" data-name="Quads Lateral (Right)"
              d="M 111 147 C 120 155 127 169 130 187 C 133 202 130 217 123 224 C 118 223 113 209 111 195 C 109 181 108 162 111 147 Z" />
        <path id="quads_right_medial" class="${getClass('quads')}" data-muscle="quads" data-name="Quads Teardrop (Right)"
              d="M 110 152 C 108 167 108 185 110 203 C 111 215 108 223 105 221 C 103 212 102 192 103 172 C 104 157 107 151 110 152 Z" />

        <!-- Knees (Neutral) -->
        <circle cx="82" cy="229" r="4.5" class="neutral-joint" data-name="Knee (Left)" />
        <circle cx="118" cy="229" r="4.5" class="neutral-joint" data-name="Knee (Right)" />

        <!-- Shins & Front Calves / Tibialis -->
        <path id="calves_front_left" class="${getClass('calves')}" data-muscle="calves" data-name="Calves / Tibialis (Left)"
              d="M 78 235 C 73 245 72 262 74 277 C 76 287 80 295 82 300 C 84 292 86 277 86 261 C 85 249 83 239 78 235 Z" />
        <path id="calves_front_right" class="${getClass('calves')}" data-muscle="calves" data-name="Calves / Tibialis (Right)"
              d="M 122 235 C 127 245 128 262 126 277 C 124 287 120 295 118 300 C 116 292 114 277 114 261 C 115 249 117 239 122 235 Z" />

        <!-- Feet (Neutral) -->
        <path d="M 80 302 C 77 309 74 317 72 323 C 76 324 84 324 87 321 C 88 315 86 305 84 302 Z" class="neutral-joint" data-name="Foot (Left)" />
        <path d="M 120 302 C 123 309 126 317 128 323 C 124 324 116 324 113 321 C 112 315 114 305 116 302 Z" class="neutral-joint" data-name="Foot (Right)" />
      </svg>
    `;
  }

  function renderBackSVG(primary = [], secondary = [], options = {}) {
    const getClass = (m) => {
      const st = getMuscleStatus(m, primary, secondary);
      return `cx-muscle-part muscle ${m} is-${st} ${st === 'primary' ? 'active' : ''}`;
    };

    return `
      <svg class="cx-muscle-svg cx-anatomical-svg back-view" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Posterior Back Muscle Map">
        <defs>
          <filter id="cx-back-glow-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#8b5cf6" flood-opacity="0.85" />
          </filter>
          <filter id="cx-back-glow-secondary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.75" />
          </filter>
        </defs>

        <!-- Neutral Head & Occipital -->
        <ellipse cx="100" cy="30" rx="13" ry="16" class="neutral-joint" data-name="Head (Posterior)" />
        <path d="M 93 45 L 107 45 L 109 52 L 91 52 Z" class="neutral-joint" data-name="Neck" />

        <!-- Trapezius (Diamond Back) -->
        <path id="traps_back" class="${getClass('traps')}" data-muscle="traps" data-name="Trapezius (Diamond Back)"
              d="M 94 50 L 100 49 L 106 50 L 118 60 L 106 84 L 100 94 L 94 84 L 82 60 Z" />

        <!-- Rear Deltoids -->
        <path id="rear_delts_left" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Rear Deltoids (Left)"
              d="M 80 60 C 72 62 64 69 61 78 C 59 85 62 92 68 94 C 72 88 76 80 80 73 C 82 68 81 62 80 60 Z" />
        <path id="rear_delts_right" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Rear Deltoids (Right)"
              d="M 120 60 C 128 62 136 69 139 78 C 141 85 138 92 132 94 C 128 88 124 80 120 73 C 118 68 119 62 120 60 Z" />

        <!-- Triceps (Lateral & Long Heads) -->
        <path id="triceps_left" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps (Left)"
              d="M 64 92 C 58 96 56 108 58 120 C 62 122 67 122 70 116 C 72 108 70 98 64 92 Z" />
        <path id="triceps_right" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps (Right)"
              d="M 136 92 C 142 96 144 108 142 120 C 138 122 133 122 130 116 C 128 108 130 98 136 92 Z" />

        <!-- Forearms (Extensors / Posterior) -->
        <path id="forearms_back_left" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Left)"
              d="M 57 123 C 51 128 46 140 43 152 C 42 159 46 162 51 160 C 55 154 61 141 63 130 C 63 124 60 122 57 123 Z" />
        <path id="forearms_back_right" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Right)"
              d="M 143 123 C 149 128 154 140 157 152 C 158 159 154 162 149 160 C 145 154 139 141 137 130 C 137 124 140 122 143 123 Z" />

        <!-- Hands (Neutral Posterior) -->
        <path d="M 42 161 C 37 166 32 174 29 182 C 28 186 32 188 35 184 C 39 178 44 172 46 166 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 158 161 C 163 166 168 174 171 182 C 172 186 168 188 165 184 C 161 178 156 172 154 166 Z" class="neutral-joint" data-name="Hand (Right)" />

        <!-- Latissimus Dorsi (Lats / V-Taper) -->
        <path id="lats_left" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Left)"
              d="M 81 80 C 74 88 70 102 72 116 C 73 128 82 138 92 141 C 92 130 92 114 96 100 C 91 92 86 85 81 80 Z" />
        <path id="lats_right" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Right)"
              d="M 119 80 C 126 88 130 102 128 116 C 127 128 118 138 108 141 C 108 130 108 114 104 100 C 109 92 114 85 119 80 Z" />

        <!-- Lower Back (Erector Spinae) -->
        <path id="lower_back_left" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back (Left)"
              d="M 94 102 L 99 102 L 98 142 L 93 142 Z" />
        <path id="lower_back_right" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back (Right)"
              d="M 101 102 L 106 102 L 107 142 L 102 142 Z" />

        <!-- Gluteus Maximus (Glutes) -->
        <path id="glutes_left" class="${getClass('glutes')}" data-muscle="glutes" data-name="Glutes (Left)"
              d="M 91 144 C 81 148 74 160 73 174 C 72 186 80 196 93 196 C 98 190 99 176 99 152 C 96 148 94 145 91 144 Z" />
        <path id="glutes_right" class="${getClass('glutes')}" data-muscle="glutes" data-name="Glutes (Right)"
              d="M 109 144 C 119 148 126 160 127 174 C 128 186 120 196 107 196 C 102 190 101 176 101 152 C 104 148 106 145 109 144 Z" />

        <!-- Hamstrings (Posterior Thighs) -->
        <path id="hamstrings_left_outer" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Hamstrings Outer (Left)"
              d="M 75 198 C 71 208 71 222 73 232 C 76 236 83 236 86 232 C 86 221 85 208 83 198 Z" />
        <path id="hamstrings_left_inner" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Hamstrings Inner (Left)"
              d="M 86 198 C 87 208 88 221 89 232 C 92 235 97 234 98 229 C 97 218 96 206 94 198 Z" />
        <path id="hamstrings_right_outer" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Hamstrings Outer (Right)"
              d="M 125 198 C 129 208 129 222 127 232 C 124 236 117 236 114 232 C 114 221 115 208 117 198 Z" />
        <path id="hamstrings_right_inner" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Hamstrings Inner (Right)"
              d="M 114 198 C 113 208 112 221 111 232 C 108 235 103 234 102 229 C 103 218 104 206 106 198 Z" />

        <!-- Knee Joint Posterior (Neutral) -->
        <circle cx="83" cy="238" r="3.5" class="neutral-joint" data-name="Knee Joint (Left)" />
        <circle cx="117" cy="238" r="3.5" class="neutral-joint" data-name="Knee Joint (Right)" />

        <!-- Calves (Posterior) -->
        <path id="calves_back_left" class="${getClass('calves')}" data-muscle="calves" data-name="Calves (Left)"
              d="M 75 242 C 69 252 68 266 72 278 C 75 288 80 294 82 300 C 84 291 86 278 86 262 C 85 251 81 244 75 242 Z" />
        <path id="calves_back_right" class="${getClass('calves')}" data-muscle="calves" data-name="Calves (Right)"
              d="M 125 242 C 131 252 132 266 128 278 C 125 288 120 294 118 300 C 116 291 114 278 114 262 C 115 251 119 244 125 242 Z" />

        <!-- Heels / Feet (Neutral) -->
        <path d="M 79 301 C 77 308 74 316 73 322 C 77 323 84 323 86 320 C 87 314 85 304 83 301 Z" class="neutral-joint" data-name="Heel (Left)" />
        <path d="M 121 301 C 123 308 126 316 127 322 C 123 323 116 323 114 320 C 113 314 115 304 117 301 Z" class="neutral-joint" data-name="Heel (Right)" />
      </svg>
    `;
  }

  function render(options = {}) {
    const resolved = resolveMuscles(options.exerciseName || options.movementPattern || options.targetMuscles || {
      primary: options.primaryMuscles,
      secondary: options.secondaryMuscles
    });

    const primary = resolved.primary || [];
    const secondary = resolved.secondary || [];
    const view = options.view || 'both';
    const size = options.size || 'md';
    const showLegend = options.showLegend !== false;
    const title = options.title || (options.exerciseName ? `${options.exerciseName} Target Muscles` : 'Muscle Activation Heatmap');

    const frontSvg = renderFrontSVG(primary, secondary, options);
    const backSvg = renderBackSVG(primary, secondary, options);

    const legendHtml = showLegend ? `
      <div class="cx-muscle-legend">
        <div class="cx-muscle-legend-item primary">
          <span class="cx-muscle-legend-dot primary"></span>
          <span class="cx-muscle-legend-label">Primary: <strong>${primary.length ? formatMuscleNames(primary) : 'None'}</strong></span>
        </div>
        ${secondary.length ? `
        <div class="cx-muscle-legend-item secondary">
          <span class="cx-muscle-legend-dot secondary"></span>
          <span class="cx-muscle-legend-label">Secondary: <strong>${formatMuscleNames(secondary)}</strong></span>
        </div>` : ''}
      </div>
    ` : '';

    return `
      <div class="cx-muscle-map-wrapper size-${size}" role="region" aria-label="${title}">
        <div class="cx-muscle-map-dual view-${view}">
          ${(view === 'both' || view === 'front') ? `
          <div class="cx-muscle-figure-col">
            <span class="cx-muscle-view-label">ANTERIOR (FRONT)</span>
            <div class="cx-muscle-figure-card">
              ${frontSvg}
            </div>
          </div>` : ''}

          ${(view === 'both' || view === 'back') ? `
          <div class="cx-muscle-figure-col">
            <span class="cx-muscle-view-label">POSTERIOR (BACK)</span>
            <div class="cx-muscle-figure-card">
              ${backSvg}
            </div>
          </div>` : ''}
        </div>
        ${legendHtml}
      </div>
    `;
  }

  function renderDualMuscleBodySvg(workoutOrMuscles) {
    const resolved = resolveMuscles(workoutOrMuscles);
    const frontSvg = renderFrontSVG(resolved.primary, resolved.secondary);
    const backSvg = renderBackSVG(resolved.primary, resolved.secondary);

    return `
      <div style="display:flex; justify-content:center; align-items:center; gap:16px; width:100%; padding:4px 0;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:48%; max-width:130px; height:160px;">
          <span style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em;">Anterior (Front)</span>
          ${frontSvg}
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:48%; max-width:130px; height:160px;">
          <span style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em;">Posterior (Back)</span>
          ${backSvg}
        </div>
      </div>
    `;
  }

  // ─── Export ─────────────────────────────────────────────────────────────────
  const MuscleMap = {
    render,
    renderFrontSVG,
    renderBackSVG,
    renderDualMuscleBodySvg,
    highlightMuscles,
    resolveMuscles,
    getExerciseMuscles,
    getWorkoutMuscles: resolveMuscles,
    EXERCISE_MUSCLE_MAP,
    PATTERN_DEFAULT_MUSCLES
  };

  if (typeof window !== 'undefined') {
    window.MuscleMap = MuscleMap;
    window.highlightMuscles = highlightMuscles;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.MuscleMap = MuscleMap;
    globalThis.highlightMuscles = highlightMuscles;
  }
  if (typeof global !== 'undefined') {
    global.MuscleMap = MuscleMap;
    global.highlightMuscles = highlightMuscles;
  }
})();
