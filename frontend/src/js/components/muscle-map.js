/* ============================================================
   muscleMap.js — Interactive High-Precision Anatomical Muscle Engine
   Medical-grade vector anatomy representation (Anterior & Posterior)
   Engineered for CalistheniX bodyweight & gymnastic progression tracking.
   ============================================================ */

(function () {
  'use strict';

  // ─── Canonical Muscle Groups Catalog ───────────────────────────────────────
  const EXERCISE_MUSCLE_MAP = {
    // ── PUSH EXERCISES ──
    'Diamond Push-ups': {
      primary: ['triceps', 'chest', 'lower_chest'],
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
      secondary: ['upper_chest', 'traps', 'upper_traps', 'core']
    },
    'Pike Push-ups Elevated': {
      primary: ['front_delts', 'side_delts', 'triceps'],
      secondary: ['upper_chest', 'traps', 'upper_traps', 'core']
    },
    'Handstand Push-up Progression': {
      primary: ['front_delts', 'side_delts', 'triceps'],
      secondary: ['traps', 'upper_traps', 'upper_chest', 'core']
    },
    'Triceps Dips': {
      primary: ['triceps', 'lower_chest', 'chest'],
      secondary: ['front_delts', 'core']
    },
    'Dips': {
      primary: ['triceps', 'chest', 'lower_chest'],
      secondary: ['front_delts', 'core']
    },
    'Standard Push-ups': {
      primary: ['chest', 'triceps'],
      secondary: ['front_delts', 'abs', 'core']
    },
    'Wide Push-ups': {
      primary: ['chest', 'upper_chest'],
      secondary: ['front_delts', 'triceps', 'core']
    },
    'Lateral Raise': {
      primary: ['side_delts'],
      secondary: ['upper_traps', 'traps', 'forearms']
    },

    // ── PULL EXERCISES ──
    'Pull-ups Wide Grip': {
      primary: ['lats', 'upper_back'],
      secondary: ['biceps', 'rear_delts', 'forearms', 'core']
    },
    'Pull-ups Close Grip': {
      primary: ['lats', 'biceps'],
      secondary: ['upper_back', 'forearms', 'core']
    },
    'Commando Pull-ups': {
      primary: ['lats', 'biceps', 'upper_back'],
      secondary: ['forearms', 'core', 'obliques']
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
      primary: ['mid_traps', 'upper_traps', 'traps', 'lats'],
      secondary: ['forearms']
    },
    'Face Pulls': {
      primary: ['rear_delts', 'mid_traps', 'traps'],
      secondary: ['side_delts', 'upper_traps']
    },
    'Prone Y-raises': {
      primary: ['mid_traps', 'traps', 'rear_delts'],
      secondary: ['lower_back']
    },
    'Wall Angels': {
      primary: ['upper_back', 'mid_traps', 'rear_delts'],
      secondary: ['upper_traps', 'traps']
    },
    'Biceps Curls': {
      primary: ['biceps'],
      secondary: ['forearms']
    },
    'Dead Hang': {
      primary: ['forearms', 'lats'],
      secondary: ['upper_traps', 'traps', 'shoulders']
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
      primary: ['abs', 'obliques', 'core'],
      secondary: ['front_delts', 'quads', 'glutes']
    },
    'Side Plank': {
      primary: ['obliques', 'core'],
      secondary: ['abs', 'glutes', 'side_delts']
    },
    'Hanging Knee Raises': {
      primary: ['abs', 'obliques', 'core'],
      secondary: ['forearms', 'lats']
    },
    'Hanging Leg Raises': {
      primary: ['abs', 'obliques', 'core'],
      secondary: ['forearms', 'lats', 'quads']
    },
    'L-sit Hang': {
      primary: ['abs', 'obliques', 'core'],
      secondary: ['forearms', 'lats', 'quads']
    },
    'Hollow Body Hold': {
      primary: ['abs', 'obliques', 'core'],
      secondary: ['quads', 'lower_back']
    },
    'Russian Twists': {
      primary: ['obliques', 'abs', 'core'],
      secondary: ['lower_back']
    }
  };

  const PATTERN_DEFAULT_MUSCLES = {
    push_horizontal: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
    push_archer: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'forearms', 'obliques'] },
    push_incline: { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['upper_chest', 'upper_traps', 'abs'] },
    push_vertical: { primary: ['front_delts', 'side_delts', 'triceps'], secondary: ['upper_traps', 'upper_chest', 'abs'] },
    push_dip: { primary: ['triceps', 'chest', 'lower_chest'], secondary: ['front_delts', 'abs'] },
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

  function resolveMuscles(input) {
    if (!input) {
      return { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'], label: 'Full Body' };
    }

    if (typeof input === 'object' && (Array.isArray(input.primary) || Array.isArray(input.secondary))) {
      const p = (input.primary || []).map(normalizeMuscleKey);
      const s = (input.secondary || []).map(normalizeMuscleKey);
      return { primary: Array.from(new Set(p)), secondary: Array.from(new Set(s)), label: input.label || formatMuscleNames(p) };
    }

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

      pSet.forEach(k => sSet.delete(k));
      const pList = Array.from(pSet);
      const sList = Array.from(sSet);
      return {
        primary: pList,
        secondary: sList,
        label: labels.length ? labels.join(' · ') : formatMuscleNames(pList)
      };
    }

    if (Array.isArray(input)) {
      const p = input.map(normalizeMuscleKey);
      return { primary: p, secondary: [], label: formatMuscleNames(p) };
    }

    if (typeof input === 'string') {
      const str = input.trim();
      if (PATTERN_DEFAULT_MUSCLES[str]) {
        const m = PATTERN_DEFAULT_MUSCLES[str];
        return { primary: m.primary, secondary: m.secondary, label: formatMuscleNames(m.primary) };
      }
      if (EXERCISE_MUSCLE_MAP[str]) {
        const m = EXERCISE_MUSCLE_MAP[str];
        return { primary: m.primary, secondary: m.secondary, label: formatMuscleNames(m.primary) };
      }
      if (str.includes(',')) {
        const list = str.split(',').map(normalizeMuscleKey).filter(Boolean);
        return { primary: list, secondary: [], label: formatMuscleNames(list) };
      }
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
        if (target === 'chest' && (item.includes('chest') || item === 'upper_chest' || item === 'lower_chest')) return true;
        if (target.includes('delt') && (item === 'shoulders' || item.includes('delt'))) return true;
        if (target === 'shoulders' && target.includes('delt')) return true;
        if (target.includes('trap') && (item === 'traps' || item.includes('trap'))) return true;
        if (target === 'traps' && item.includes('trap')) return true;
        if ((target === 'abs' || target === 'obliques') && item === 'core') return true;
        if (target === 'core' && (item === 'abs' || item === 'obliques')) return true;
        if (target === 'calves' && item === 'tibialis') return true;
        if (target === 'tibialis' && item === 'calves') return true;
        if (target === 'upper_back' && (item === 'lats' || item === 'traps' || item === 'upper_back')) return true;
        if (target === 'lats' && item === 'upper_back') return true;
        return false;
      });
    };

    if (isMatch(p)) return 'primary';
    if (isMatch(s)) return 'secondary';
    return 'inactive';
  }

  function highlightMuscles(input, container = null) {
    const root = container || (typeof document !== 'undefined' ? document : null);
    if (!root) return { primary: [], secondary: [], label: '', updatedCount: 0 };

    const resolved = resolveMuscles(input);
    const p = resolved.primary || [];
    const s = resolved.secondary || [];

    const elements = root.querySelectorAll('.muscle, .cx-muscle-part, [data-muscle]');
    let count = 0;

    elements.forEach(el => {
      const muscleKey = el.dataset.muscle || el.id || '';
      const status = getMuscleStatus(muscleKey, p, s);

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
        el.dataset.active = 'inactive';
      }
    });

    return {
      primary: p,
      secondary: s,
      label: resolved.label || '',
      updatedCount: count
    };
  }

  // ─── High-Definition Vector Geometry Renderers ─────────────────────────────

  function renderMaleFrontBody(getClass) {
    return `
      <!-- 1. HEAD & NECK -->
      <g id="head_neck_group" class="neutral-group">
        <path d="M 100 14 C 91 14 86 21 86 31 C 86 40 92 48 100 48 C 108 48 114 40 114 31 C 114 21 109 14 100 14 Z" class="neutral-joint" data-name="Head" />
        <path d="M 94 47 L 91 59 L 98 62 L 98 48 Z" class="neutral-joint" data-name="Neck Left" />
        <path d="M 106 47 L 109 59 L 102 62 L 102 48 Z" class="neutral-joint" data-name="Neck Right" />
      </g>

      <!-- 2. TRAPEZIUS (Anterior Upper Traps) -->
      <g id="traps_front_group">
        <path id="traps_front_left" class="${getClass('upper_traps')}" data-muscle="traps" data-name="Upper Trapezius (Left)"
              d="M 91 50 C 85 53 79 58 74 64 C 77 66 84 66 91 63 C 92 58 92 53 91 50 Z" />
        <path id="traps_front_right" class="${getClass('upper_traps')}" data-muscle="traps" data-name="Upper Trapezius (Right)"
              d="M 109 50 C 115 53 121 58 126 64 C 123 66 116 66 109 63 C 108 58 108 53 109 50 Z" />
      </g>

      <!-- 3. SHOULDERS (Deltoids - Anterior & Lateral) -->
      <g id="shoulders_front_group">
        <path id="front_delts_left" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Anterior Deltoid (Left)"
              d="M 74 65 C 67 67 61 73 59 81 C 60 88 66 93 72 95 C 75 88 77 78 77 70 C 76 67 75 66 74 65 Z" />
        <path id="front_delts_right" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Anterior Deltoid (Right)"
              d="M 126 65 C 133 67 139 73 141 81 C 140 88 134 93 128 95 C 125 88 123 78 123 70 C 124 67 125 66 126 65 Z" />
        <path id="side_delts_left" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Lateral Deltoid (Left)"
              d="M 58 80 C 50 86 46 95 48 104 C 52 106 56 105 60 100 C 59 93 57 86 58 80 Z" />
        <path id="side_delts_right" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Lateral Deltoid (Right)"
              d="M 142 80 C 150 86 154 95 152 104 C 148 106 144 105 140 100 C 141 93 143 86 142 80 Z" />
      </g>

      <!-- 4. CHEST (Pectoralis Major) -->
      <g id="chest_front_group">
        <path id="upper_chest_left" class="${getClass('upper_chest')}" data-muscle="upper_chest" data-name="Upper Pectoralis (Left)"
              d="M 98 64 C 90 64 80 68 76 75 C 80 81 88 83 98 83 C 98 76 98 70 98 64 Z" />
        <path id="upper_chest_right" class="${getClass('upper_chest')}" data-muscle="upper_chest" data-name="Upper Pectoralis (Right)"
              d="M 102 64 C 110 64 120 68 124 75 C 120 81 112 83 102 83 C 102 76 102 70 102 64 Z" />
        <path id="chest_left" class="${getClass('chest')}" data-muscle="chest" data-name="Pectoralis Major (Left)"
              d="M 98 85 C 88 85 78 83 74 77 C 72 85 76 95 84 98 C 91 99 97 97 98 92 Z" />
        <path id="chest_right" class="${getClass('chest')}" data-muscle="chest" data-name="Pectoralis Major (Right)"
              d="M 102 85 C 112 85 122 83 126 77 C 128 85 124 95 116 98 C 109 99 103 97 102 92 Z" />
      </g>

      <!-- 5. ARMS: BICEPS & BRACHIALIS -->
      <g id="biceps_front_group">
        <path id="biceps_left" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps Brachii (Left)"
              d="M 64 97 C 58 100 56 111 58 121 C 61 125 66 126 70 119 C 72 113 71 103 64 97 Z" />
        <path id="biceps_right" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps Brachii (Right)"
              d="M 136 97 C 142 100 144 111 142 121 C 139 125 134 126 130 119 C 128 113 129 103 136 97 Z" />
        <path d="M 57 114 C 54 118 54 125 56 130 C 58 128 59 123 58 118 Z" class="neutral-joint" data-name="Brachialis Left" />
        <path d="M 143 114 C 146 118 146 125 144 130 C 142 128 141 123 142 118 Z" class="neutral-joint" data-name="Brachialis Right" />
      </g>

      <!-- 6. FOREARMS -->
      <g id="forearms_front_group">
        <path id="forearms_left" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms & Flexors (Left)"
              d="M 57 127 C 51 131 45 144 42 159 C 41 166 45 170 50 168 C 55 161 61 147 63 135 C 63 129 60 126 57 127 Z" />
        <path id="forearms_right" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms & Flexors (Right)"
              d="M 143 127 C 149 131 155 144 158 159 C 159 166 155 170 150 168 C 145 161 139 147 137 135 C 137 129 140 126 143 127 Z" />
      </g>

      <!-- HANDS & WRISTS -->
      <g id="hands_front_group" class="neutral-group">
        <path d="M 41 169 C 36 174 31 183 28 192 C 27 197 31 199 34 195 C 38 188 43 181 46 174 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 159 169 C 164 174 169 183 172 192 C 173 197 169 199 166 195 C 162 188 157 181 154 174 Z" class="neutral-joint" data-name="Hand (Right)" />
      </g>

      <!-- 7. ABDOMINALS -->
      <g id="abs_front_group">
        <path id="abs_upper_left" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abdominals (Left)"
              d="M 90 100 L 98 99 L 98 111 L 90 111 Z" />
        <path id="abs_upper_right" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abdominals (Right)"
              d="M 102 99 L 110 100 L 110 111 L 102 111 Z" />
        <path id="abs_mid_left" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abdominals (Left)"
              d="M 90 113 L 98 113 L 98 126 L 90 125 Z" />
        <path id="abs_mid_right" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abdominals (Right)"
              d="M 102 113 L 110 113 L 110 125 L 102 126 Z" />
        <path id="abs_lower_left" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abdominals (Left)"
              d="M 91 128 L 98 128 L 98 143 L 92 139 Z" />
        <path id="abs_lower_right" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abdominals (Right)"
              d="M 102 128 L 109 128 L 108 139 L 102 143 Z" />
      </g>

      <!-- 8. OBLIQUES & CORE -->
      <g id="obliques_front_group">
        <path id="obliques_left" class="${getClass('obliques')}" data-muscle="obliques" data-name="External Obliques (Left)"
              d="M 87 101 C 80 104 76 115 75 128 C 75 137 79 149 89 154 C 88 146 87 135 87 126 C 87 116 88 107 87 101 Z" />
        <path id="obliques_right" class="${getClass('obliques')}" data-muscle="obliques" data-name="External Obliques (Right)"
              d="M 113 101 C 120 104 124 115 125 128 C 125 137 121 149 111 154 C 112 146 113 135 113 126 C 113 116 112 107 113 101 Z" />
        <path id="core_pelvic" class="${getClass('core')}" data-muscle="core" data-name="Pelvic Core"
              d="M 91 145 L 100 160 L 109 145 C 103 148 97 148 91 145 Z" />
      </g>

      <!-- 9. QUADRICEPS -->
      <g id="quads_front_group">
        <path id="quads_left_lateral" class="${getClass('quads')}" data-muscle="quads" data-name="Vastus Lateralis (Left)"
              d="M 88 157 C 78 165 71 180 68 200 C 65 217 68 233 76 242 C 81 241 86 226 88 211 C 90 195 91 174 88 157 Z" />
        <path id="quads_left_medial" class="${getClass('quads')}" data-muscle="quads" data-name="Rectus Femoris & Medialis (Left)"
              d="M 89 162 C 92 178 92 198 90 218 C 88 231 92 241 96 238 C 98 228 99 206 98 184 C 97 168 93 161 89 162 Z" />
        <path id="quads_right_lateral" class="${getClass('quads')}" data-muscle="quads" data-name="Vastus Lateralis (Right)"
              d="M 112 157 C 122 165 129 180 132 200 C 135 217 132 233 124 242 C 119 241 114 226 112 211 C 110 195 109 174 112 157 Z" />
        <path id="quads_right_medial" class="${getClass('quads')}" data-muscle="quads" data-name="Rectus Femoris & Medialis (Right)"
              d="M 111 162 C 108 178 108 198 110 218 C 112 231 108 241 104 238 C 102 228 101 206 102 184 C 103 168 107 161 111 162 Z" />
      </g>

      <!-- KNEES / PATELLA -->
      <g id="knees_front_group" class="neutral-group">
        <circle cx="81" cy="248" r="5" class="neutral-joint" data-name="Knee Patella (Left)" />
        <circle cx="119" cy="248" r="5" class="neutral-joint" data-name="Knee Patella (Right)" />
      </g>

      <!-- 10. LOWER LEGS (Calves & Tibialis) -->
      <g id="calves_front_group">
        <path id="calves_front_left" class="${getClass('calves')}" data-muscle="calves" data-name="Tibialis & Calves (Left)"
              d="M 77 256 C 71 267 70 286 72 303 C 74 315 79 324 81 330 C 84 321 86 303 86 285 C 85 272 83 260 77 256 Z" />
        <path id="calves_front_right" class="${getClass('calves')}" data-muscle="calves" data-name="Tibialis & Calves (Right)"
              d="M 123 256 C 129 267 130 286 128 303 C 126 315 121 324 119 330 C 116 321 114 303 114 285 C 115 272 117 260 123 256 Z" />
      </g>

      <!-- FEET & ANKLES -->
      <g id="feet_front_group" class="neutral-group">
        <path d="M 79 333 C 76 341 73 350 71 357 C 75 358 84 358 87 355 C 88 348 86 337 84 333 Z" class="neutral-joint" data-name="Foot (Left)" />
        <path d="M 121 333 C 124 341 127 350 129 357 C 125 358 116 358 113 355 C 112 348 114 337 116 333 Z" class="neutral-joint" data-name="Foot (Right)" />
      </g>
    `;
  }

  function renderFemaleFrontBody(getClass) {
    return `
      <!-- 1. HEAD & NECK -->
      <g id="head_neck_group_f" class="neutral-group">
        <path d="M 100 16 C 92 16 87 23 87 31 C 87 39 92 46 100 46 C 108 46 113 39 113 31 C 113 23 108 16 100 16 Z" class="neutral-joint" data-name="Head" />
        <path d="M 95 46 L 93 57 L 98 59 L 98 47 Z" class="neutral-joint" data-name="Neck Left" />
        <path d="M 105 46 L 107 57 L 102 59 L 102 47 Z" class="neutral-joint" data-name="Neck Right" />
      </g>

      <!-- 2. TRAPEZIUS (Anterior Upper Traps - Female Taper) -->
      <g id="traps_front_group_f">
        <path id="traps_front_left_f" class="${getClass('upper_traps')}" data-muscle="traps" data-name="Upper Trapezius (Left)"
              d="M 92 48 C 87 51 82 56 77 62 C 80 64 86 64 92 61 Z" />
        <path id="traps_front_right_f" class="${getClass('upper_traps')}" data-muscle="traps" data-name="Upper Trapezius (Right)"
              d="M 108 48 C 113 51 118 56 123 62 C 120 64 114 64 108 61 Z" />
      </g>

      <!-- 3. SHOULDERS (Deltoids - Female Athletic Contours) -->
      <g id="shoulders_front_group_f">
        <path id="front_delts_left_f" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Anterior Deltoid (Left)"
              d="M 77 63 C 71 65 66 71 64 79 C 65 85 70 90 75 91 C 77 85 79 76 79 68 Z" />
        <path id="front_delts_right_f" class="${getClass('front_delts')}" data-muscle="front_delts" data-name="Anterior Deltoid (Right)"
              d="M 123 63 C 129 65 134 71 136 79 C 135 85 130 90 125 91 C 123 85 121 76 121 68 Z" />
        <path id="side_delts_left_f" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Lateral Deltoid (Left)"
              d="M 63 78 C 56 84 53 92 54 100 C 58 102 61 101 64 96 C 64 90 63 84 63 78 Z" />
        <path id="side_delts_right_f" class="${getClass('side_delts')}" data-muscle="side_delts" data-name="Lateral Deltoid (Right)"
              d="M 137 78 C 144 84 147 92 146 100 C 142 102 139 101 136 96 C 136 90 137 84 137 78 Z" />
      </g>

      <!-- 4. CHEST (Pectoralis Major - Female Athletic Profile) -->
      <g id="chest_front_group_f">
        <path id="upper_chest_left_f" class="${getClass('upper_chest')}" data-muscle="upper_chest" data-name="Upper Pectoralis (Left)"
              d="M 98 62 C 91 62 83 66 79 72 C 83 77 89 79 98 79 Z" />
        <path id="upper_chest_right_f" class="${getClass('upper_chest')}" data-muscle="upper_chest" data-name="Upper Pectoralis (Right)"
              d="M 102 62 C 109 62 117 66 121 72 C 117 77 111 79 102 79 Z" />
        <path id="chest_left_f" class="${getClass('chest')}" data-muscle="chest" data-name="Pectoralis Major (Left)"
              d="M 98 81 C 89 81 80 80 76 74 C 74 82 77 93 85 96 C 91 97 97 95 98 89 Z" />
        <path id="chest_right_f" class="${getClass('chest')}" data-muscle="chest" data-name="Pectoralis Major (Right)"
              d="M 102 81 C 111 81 120 80 124 74 C 126 82 123 93 115 96 C 109 97 103 95 102 89 Z" />
      </g>

      <!-- 5. ARMS: BICEPS & BRACHIALIS -->
      <g id="biceps_front_group_f">
        <path id="biceps_left_f" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps Brachii (Left)"
              d="M 68 94 C 63 97 61 107 63 116 C 66 120 70 121 73 115 C 75 109 74 100 68 94 Z" />
        <path id="biceps_right_f" class="${getClass('biceps')}" data-muscle="biceps" data-name="Biceps Brachii (Right)"
              d="M 132 94 C 137 97 139 107 137 116 C 134 120 130 121 127 115 C 125 109 126 100 132 94 Z" />
        <path d="M 61 111 C 59 115 59 121 61 125 C 63 123 64 119 63 115 Z" class="neutral-joint" data-name="Brachialis Left" />
        <path d="M 139 111 C 141 115 141 121 139 125 C 137 123 136 119 137 115 Z" class="neutral-joint" data-name="Brachialis Right" />
      </g>

      <!-- 6. FOREARMS -->
      <g id="forearms_front_group_f">
        <path id="forearms_left_f" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms & Flexors (Left)"
              d="M 62 123 C 57 127 52 139 50 153 C 49 159 53 162 57 161 C 61 155 66 142 67 131 Z" />
        <path id="forearms_right_f" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearms & Flexors (Right)"
              d="M 138 123 C 143 127 148 139 150 153 C 151 159 147 162 143 161 C 139 155 134 142 133 131 Z" />
      </g>

      <!-- HANDS & WRISTS -->
      <g id="hands_front_group_f" class="neutral-group">
        <path d="M 49 163 C 45 168 41 176 39 184 C 38 188 41 190 44 187 C 47 181 51 174 53 167 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 151 163 C 155 168 159 176 161 184 C 162 188 159 190 156 187 C 153 181 149 174 147 167 Z" class="neutral-joint" data-name="Hand (Right)" />
      </g>

      <!-- 7. ABDOMINALS (Female Athletic 6-Pack) -->
      <g id="abs_front_group_f">
        <path id="abs_upper_left_f" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abdominals (Left)"
              d="M 92 97 L 98 97 L 98 108 L 92 108 Z" />
        <path id="abs_upper_right_f" class="${getClass('abs')}" data-muscle="abs" data-name="Upper Abdominals (Right)"
              d="M 102 97 L 108 97 L 108 108 L 102 108 Z" />
        <path id="abs_mid_left_f" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abdominals (Left)"
              d="M 92 110 L 98 110 L 98 122 L 92 121 Z" />
        <path id="abs_mid_right_f" class="${getClass('abs')}" data-muscle="abs" data-name="Mid Abdominals (Right)"
              d="M 102 110 L 108 110 L 108 121 L 102 122 Z" />
        <path id="abs_lower_left_f" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abdominals (Left)"
              d="M 92 124 L 98 124 L 98 138 L 93 135 Z" />
        <path id="abs_lower_right_f" class="${getClass('abs')}" data-muscle="abs" data-name="Lower Abdominals (Right)"
              d="M 102 124 L 108 124 L 107 135 L 102 138 Z" />
      </g>

      <!-- 8. OBLIQUES & WAIST (Tapered Hourglass Profile) -->
      <g id="obliques_front_group_f">
        <path id="obliques_left_f" class="${getClass('obliques')}" data-muscle="obliques" data-name="External Obliques (Left)"
              d="M 88 98 C 82 102 79 112 78 124 C 77 134 81 145 90 150 C 89 142 88 132 88 123 Z" />
        <path id="obliques_right_f" class="${getClass('obliques')}" data-muscle="obliques" data-name="External Obliques (Right)"
              d="M 112 98 C 118 102 121 112 122 124 C 123 134 119 145 110 150 C 111 142 112 132 112 123 Z" />
        <path id="core_pelvic_f" class="${getClass('core')}" data-muscle="core" data-name="Pelvic Core"
              d="M 92 141 L 100 155 L 108 141 C 103 144 97 144 92 141 Z" />
      </g>

      <!-- 9. QUADRICEPS (Athletic Pelvic Taper into Quads) -->
      <g id="quads_front_group_f">
        <path id="quads_left_lateral_f" class="${getClass('quads')}" data-muscle="quads" data-name="Vastus Lateralis (Left)"
              d="M 87 153 C 74 162 67 178 65 198 C 63 215 66 230 75 240 C 79 239 84 224 86 209 C 88 193 89 172 87 153 Z" />
        <path id="quads_left_medial_f" class="${getClass('quads')}" data-muscle="quads" data-name="Rectus Femoris & Medialis (Left)"
              d="M 88 158 C 91 174 91 194 89 214 C 87 227 91 237 95 234 C 97 224 98 202 97 180 C 96 164 92 157 88 158 Z" />
        <path id="quads_right_lateral_f" class="${getClass('quads')}" data-muscle="quads" data-name="Vastus Lateralis (Right)"
              d="M 113 153 C 126 162 133 178 135 198 C 137 215 134 230 125 240 C 121 239 116 224 114 209 C 112 193 111 172 113 153 Z" />
        <path id="quads_right_medial_f" class="${getClass('quads')}" data-muscle="quads" data-name="Rectus Femoris & Medialis (Right)"
              d="M 112 158 C 109 174 109 194 111 214 C 113 227 109 237 105 234 C 103 224 102 202 103 180 C 104 164 108 157 112 158 Z" />
      </g>

      <!-- KNEES / PATELLA -->
      <g id="knees_front_group_f" class="neutral-group">
        <circle cx="80" cy="247" r="4.5" class="neutral-joint" data-name="Knee Patella (Left)" />
        <circle cx="120" cy="247" r="4.5" class="neutral-joint" data-name="Knee Patella (Right)" />
      </g>

      <!-- 10. LOWER LEGS (Calves & Tibialis) -->
      <g id="calves_front_group_f">
        <path id="calves_front_left_f" class="${getClass('calves')}" data-muscle="calves" data-name="Tibialis & Calves (Left)"
              d="M 76 254 C 71 265 70 284 72 301 C 74 313 79 322 81 328 C 84 319 86 301 86 283 C 85 270 83 258 76 254 Z" />
        <path id="calves_front_right_f" class="${getClass('calves')}" data-muscle="calves" data-name="Tibialis & Calves (Right)"
              d="M 124 254 C 129 265 130 284 128 301 C 126 313 121 322 119 328 C 116 319 114 301 114 283 C 115 270 117 258 124 254 Z" />
      </g>

      <!-- FEET & ANKLES -->
      <g id="feet_front_group_f" class="neutral-group">
        <path d="M 78 331 C 75 339 72 348 70 355 C 74 356 83 356 86 353 C 87 346 85 335 83 331 Z" class="neutral-joint" data-name="Foot (Left)" />
        <path d="M 122 331 C 125 339 128 348 130 355 C 126 356 117 356 114 353 C 113 346 115 335 117 331 Z" class="neutral-joint" data-name="Foot (Right)" />
      </g>
    `;
  }

  function renderMaleBackBody(getClass) {
    return `
      <!-- 1. HEAD & OCCIPUT -->
      <g id="head_neck_back_group" class="neutral-group">
        <path d="M 100 14 C 91 14 86 21 86 31 C 86 40 92 48 100 48 C 108 48 114 40 114 31 C 114 21 109 14 100 14 Z" class="neutral-joint" data-name="Head (Posterior)" />
        <path d="M 95 47 L 105 47 L 107 55 L 93 55 Z" class="neutral-joint" data-name="Cervical Spine" />
      </g>

      <!-- 2. TRAPEZIUS -->
      <g id="traps_back_group">
        <path id="traps_back" class="${getClass('traps')}" data-muscle="traps" data-name="Trapezius (Diamond Back)"
              d="M 94 50 L 100 49 L 106 50 L 120 62 L 107 88 L 100 102 L 93 88 L 80 62 Z" />
      </g>

      <!-- 3. REAR DELTOIDS & UPPER BACK -->
      <g id="rear_delts_group">
        <path id="rear_delts_left" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Posterior Deltoid (Left)"
              d="M 78 62 C 69 64 61 72 59 82 C 58 90 61 97 68 99 C 72 92 76 83 80 75 C 81 70 80 64 78 62 Z" />
        <path id="rear_delts_right" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Posterior Deltoid (Right)"
              d="M 122 62 C 131 64 139 72 141 82 C 142 90 139 97 132 99 C 128 92 124 83 120 75 C 119 70 120 64 122 62 Z" />
        <path id="upper_back_left" class="${getClass('upper_back')}" data-muscle="upper_back" data-name="Infraspinatus & Teres (Left)"
              d="M 79 76 C 72 82 70 92 72 100 C 76 102 82 101 88 95 C 86 88 83 81 79 76 Z" />
        <path id="upper_back_right" class="${getClass('upper_back')}" data-muscle="upper_back" data-name="Infraspinatus & Teres (Right)"
              d="M 121 76 C 128 82 130 92 128 100 C 124 102 118 101 112 95 C 114 88 117 81 121 76 Z" />
      </g>

      <!-- 4. TRICEPS BRACHII -->
      <g id="triceps_group">
        <path id="triceps_left" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps Brachii (Left)"
              d="M 63 95 C 56 100 54 112 56 126 C 61 128 66 128 70 121 C 72 112 70 102 63 95 Z" />
        <path id="triceps_right" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps Brachii (Right)"
              d="M 137 95 C 144 100 146 112 144 126 C 139 128 134 128 130 121 C 128 112 130 102 137 95 Z" />
      </g>

      <!-- 5. FOREARMS (Posterior) -->
      <g id="forearms_back_group">
        <path id="forearms_back_left" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Left)"
              d="M 56 129 C 49 135 44 148 41 161 C 40 168 44 171 49 169 C 54 162 60 148 62 136 C 62 130 59 128 56 129 Z" />
        <path id="forearms_back_right" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Right)"
              d="M 144 129 C 151 135 156 148 159 161 C 160 168 156 171 151 169 C 146 162 140 148 138 136 C 138 130 141 128 144 129 Z" />
      </g>

      <!-- HANDS (Posterior) -->
      <g id="hands_back_group" class="neutral-group">
        <path d="M 40 170 C 35 175 30 184 27 193 C 26 198 30 200 33 196 C 37 189 42 182 45 175 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 160 170 C 165 175 170 184 173 193 C 174 198 170 200 167 196 C 163 189 158 182 155 175 Z" class="neutral-joint" data-name="Hand (Right)" />
      </g>

      <!-- 6. LATISSIMUS DORSI (Lats) -->
      <g id="lats_group">
        <path id="lats_left" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Left)"
              d="M 80 84 C 72 93 68 108 70 123 C 71 136 81 147 91 150 C 91 138 91 121 95 106 C 90 97 85 90 80 84 Z" />
        <path id="lats_right" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Right)"
              d="M 120 84 C 128 93 132 108 130 123 C 129 136 119 147 109 150 C 109 138 109 121 105 106 C 110 97 115 90 120 84 Z" />
      </g>

      <!-- 7. LOWER BACK -->
      <g id="lower_back_group">
        <path id="lower_back_left" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back / Erector Spinae (Left)"
              d="M 93 108 L 99 108 L 98 152 L 92 152 Z" />
        <path id="lower_back_right" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back / Erector Spinae (Right)"
              d="M 101 108 L 107 108 L 108 152 L 102 152 Z" />
      </g>

      <!-- 8. GLUTEAL COMPLEX -->
      <g id="glutes_group">
        <path id="glutes_left" class="${getClass('glutes')}" data-muscle="glutes" data-name="Gluteus Maximus (Left)"
              d="M 91 154 C 80 158 72 171 71 187 C 70 200 79 211 93 211 C 98 204 99 189 99 163 C 96 158 94 155 91 154 Z" />
        <path id="glutes_right" class="${getClass('glutes')}" data-muscle="glutes" data-name="Gluteus Maximus (Right)"
              d="M 109 154 C 120 158 128 171 129 187 C 130 200 121 211 107 211 C 102 204 101 189 101 163 C 104 158 106 155 109 154 Z" />
      </g>

      <!-- 9. HAMSTRINGS -->
      <g id="hamstrings_group">
        <path id="hamstrings_left_outer" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Biceps Femoris (Left)"
              d="M 73 213 C 69 224 69 239 71 250 C 74 254 81 254 84 250 C 84 238 83 224 81 213 Z" />
        <path id="hamstrings_left_inner" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Semitendinosus (Left)"
              d="M 85 213 C 86 224 87 238 88 250 C 91 253 96 252 97 247 C 96 235 95 222 93 213 Z" />
        <path id="hamstrings_right_outer" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Biceps Femoris (Right)"
              d="M 127 213 C 131 224 131 239 129 250 C 126 254 119 254 116 250 C 116 238 117 224 119 213 Z" />
        <path id="hamstrings_right_inner" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Semitendinosus (Right)"
              d="M 115 213 C 114 224 113 238 112 250 C 109 253 104 252 103 247 C 104 235 105 222 107 213 Z" />
      </g>

      <!-- KNEES (Posterior) -->
      <g id="knees_back_group" class="neutral-group">
        <circle cx="82" cy="257" r="4" class="neutral-joint" data-name="Popliteal Fossa (Left)" />
        <circle cx="118" cy="257" r="4" class="neutral-joint" data-name="Popliteal Fossa (Right)" />
      </g>

      <!-- 10. CALVES: GASTROCNEMIUS & SOLEUS -->
      <g id="calves_back_group">
        <path id="calves_back_left" class="${getClass('calves')}" data-muscle="calves" data-name="Gastrocnemius & Soleus (Left)"
              d="M 74 262 C 67 273 66 289 70 302 C 73 313 79 320 81 327 C 83 317 85 302 85 284 C 84 272 80 264 74 262 Z" />
        <path id="calves_back_right" class="${getClass('calves')}" data-muscle="calves" data-name="Gastrocnemius & Soleus (Right)"
              d="M 126 262 C 133 273 134 289 130 302 C 127 313 121 320 119 327 C 117 317 115 302 115 284 C 116 272 120 264 126 262 Z" />
      </g>

      <!-- ACHILLES & HEELS -->
      <g id="feet_back_group" class="neutral-group">
        <path d="M 78 328 C 76 336 73 345 72 352 C 76 353 83 353 85 350 C 86 343 84 332 82 328 Z" class="neutral-joint" data-name="Heel & Achilles (Left)" />
        <path d="M 122 328 C 124 336 127 345 128 352 C 124 353 117 353 115 350 C 114 343 116 332 118 328 Z" class="neutral-joint" data-name="Heel & Achilles (Right)" />
      </g>
    `;
  }

  function renderFemaleBackBody(getClass) {
    return `
      <!-- 1. HEAD & OCCIPUT -->
      <g id="head_neck_back_group_f" class="neutral-group">
        <path d="M 100 16 C 92 16 87 23 87 31 C 87 39 92 46 100 46 C 108 46 113 39 113 31 C 113 23 108 16 100 16 Z" class="neutral-joint" data-name="Head (Posterior)" />
        <path d="M 95 46 L 105 46 L 106 54 L 94 54 Z" class="neutral-joint" data-name="Cervical Spine" />
      </g>

      <!-- 2. TRAPEZIUS -->
      <g id="traps_back_group_f">
        <path id="traps_back_f" class="${getClass('traps')}" data-muscle="traps" data-name="Trapezius (Diamond Back)"
              d="M 95 49 L 100 48 L 105 49 L 117 61 L 106 86 L 100 99 L 94 86 L 83 61 Z" />
      </g>

      <!-- 3. REAR DELTOIDS & UPPER BACK -->
      <g id="rear_delts_group_f">
        <path id="rear_delts_left_f" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Posterior Deltoid (Left)"
              d="M 80 61 C 72 63 65 70 63 80 C 62 87 65 94 71 96 C 74 89 78 81 81 74 Z" />
        <path id="rear_delts_right_f" class="${getClass('rear_delts')}" data-muscle="rear_delts" data-name="Posterior Deltoid (Right)"
              d="M 120 61 C 128 63 135 70 137 80 C 138 87 135 94 129 96 C 126 89 122 81 119 74 Z" />
        <path id="upper_back_left_f" class="${getClass('upper_back')}" data-muscle="upper_back" data-name="Infraspinatus & Teres (Left)"
              d="M 81 74 C 75 80 73 89 75 97 C 78 99 84 98 89 93 Z" />
        <path id="upper_back_right_f" class="${getClass('upper_back')}" data-muscle="upper_back" data-name="Infraspinatus & Teres (Right)"
              d="M 119 74 C 125 80 127 89 125 97 C 122 99 116 98 111 93 Z" />
      </g>

      <!-- 4. TRICEPS BRACHII -->
      <g id="triceps_group_f">
        <path id="triceps_left_f" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps Brachii (Left)"
              d="M 67 93 C 61 97 59 108 61 121 C 65 123 69 123 72 117 C 74 109 72 99 67 93 Z" />
        <path id="triceps_right_f" class="${getClass('triceps')}" data-muscle="triceps" data-name="Triceps Brachii (Right)"
              d="M 133 93 C 139 97 141 108 139 121 C 135 123 131 123 128 117 C 126 109 128 99 133 93 Z" />
      </g>

      <!-- 5. FOREARMS (Posterior) -->
      <g id="forearms_back_group_f">
        <path id="forearms_back_left_f" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Left)"
              d="M 61 125 C 55 131 51 143 49 156 C 48 162 52 165 56 163 C 60 157 65 143 66 132 Z" />
        <path id="forearms_back_right_f" class="${getClass('forearms')}" data-muscle="forearms" data-name="Forearm Extensors (Right)"
              d="M 139 125 C 145 131 149 143 151 156 C 152 162 148 165 144 163 C 140 157 135 143 134 132 Z" />
      </g>

      <!-- HANDS (Posterior) -->
      <g id="hands_back_group_f" class="neutral-group">
        <path d="M 48 164 C 44 169 40 177 38 185 C 37 189 40 191 43 188 C 46 182 50 175 52 168 Z" class="neutral-joint" data-name="Hand (Left)" />
        <path d="M 152 164 C 156 169 160 177 162 185 C 163 189 160 191 157 188 C 154 182 150 175 148 168 Z" class="neutral-joint" data-name="Hand (Right)" />
      </g>

      <!-- 6. LATISSIMUS DORSI (Lats - Female Silhouette) -->
      <g id="lats_group_f">
        <path id="lats_left_f" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Left)"
              d="M 81 83 C 74 91 70 105 72 120 C 73 132 82 143 91 146 C 91 135 91 119 95 104 Z" />
        <path id="lats_right_f" class="${getClass('lats')}" data-muscle="lats" data-name="Latissimus Dorsi (Right)"
              d="M 119 83 C 126 91 130 105 128 120 C 127 132 118 143 109 146 C 109 135 109 119 105 104 Z" />
      </g>

      <!-- 7. LOWER BACK -->
      <g id="lower_back_group_f">
        <path id="lower_back_left_f" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back / Erector Spinae (Left)"
              d="M 94 106 L 99 106 L 98 148 L 93 148 Z" />
        <path id="lower_back_right_f" class="${getClass('lower_back')}" data-muscle="lower_back" data-name="Lower Back / Erector Spinae (Right)"
              d="M 101 106 L 106 106 L 107 148 L 102 148 Z" />
      </g>

      <!-- 8. GLUTEAL COMPLEX (Defined Female Glute Curves) -->
      <g id="glutes_group_f">
        <path id="glutes_left_f" class="${getClass('glutes')}" data-muscle="glutes" data-name="Gluteus Maximus (Left)"
              d="M 91 151 C 77 156 68 170 67 187 C 66 201 76 213 92 213 C 97 206 98 190 98 162 Z" />
        <path id="glutes_right_f" class="${getClass('glutes')}" data-muscle="glutes" data-name="Gluteus Maximus (Right)"
              d="M 109 151 C 123 156 132 170 133 187 C 134 201 124 213 108 213 C 103 206 102 190 102 162 Z" />
      </g>

      <!-- 9. HAMSTRINGS -->
      <g id="hamstrings_group_f">
        <path id="hamstrings_left_outer_f" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Biceps Femoris (Left)"
              d="M 72 214 C 68 225 68 239 70 250 C 73 254 79 254 82 250 C 82 238 81 224 80 214 Z" />
        <path id="hamstrings_left_inner_f" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Semitendinosus (Left)"
              d="M 83 214 C 84 225 85 238 86 250 C 89 253 93 252 94 247 C 93 235 92 222 91 214 Z" />
        <path id="hamstrings_right_outer_f" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Biceps Femoris (Right)"
              d="M 128 214 C 132 225 132 239 130 250 C 127 254 121 254 118 250 C 118 238 119 224 120 214 Z" />
        <path id="hamstrings_right_inner_f" class="${getClass('hamstrings')}" data-muscle="hamstrings" data-name="Semitendinosus (Right)"
              d="M 117 214 C 116 225 115 238 114 250 C 111 253 107 252 106 247 C 107 235 108 222 109 214 Z" />
      </g>

      <!-- KNEES (Posterior) -->
      <g id="knees_back_group_f" class="neutral-group">
        <circle cx="81" cy="256" r="3.8" class="neutral-joint" data-name="Popliteal Fossa (Left)" />
        <circle cx="119" cy="256" r="3.8" class="neutral-joint" data-name="Popliteal Fossa (Right)" />
      </g>

      <!-- 10. CALVES: GASTROCNEMIUS & SOLEUS -->
      <g id="calves_back_group_f">
        <path id="calves_back_left_f" class="${getClass('calves')}" data-muscle="calves" data-name="Gastrocnemius & Soleus (Left)"
              d="M 73 260 C 67 271 66 287 70 300 C 73 311 79 318 81 325 C 83 315 85 300 85 282 C 84 270 80 262 73 260 Z" />
        <path id="calves_back_right_f" class="${getClass('calves')}" data-muscle="calves" data-name="Gastrocnemius & Soleus (Right)"
              d="M 127 260 C 133 271 134 287 130 300 C 127 311 121 318 119 325 C 117 315 115 300 115 282 C 116 270 120 262 127 260 Z" />
      </g>

      <!-- ACHILLES & HEELS -->
      <g id="feet_back_group_f" class="neutral-group">
        <path d="M 77 326 C 75 334 72 343 71 350 C 75 351 82 351 84 348 C 85 341 83 330 81 326 Z" class="neutral-joint" data-name="Heel & Achilles (Left)" />
        <path d="M 123 326 C 125 334 128 343 129 350 C 125 351 118 351 116 348 C 115 341 117 330 119 326 Z" class="neutral-joint" data-name="Heel & Achilles (Right)" />
      </g>
    `;
  }

  function renderFrontSVG(primary = [], secondary = [], options = {}) {
    const model = options.model || (typeof getBodyDiagramModel === 'function' ? getBodyDiagramModel() : (typeof state !== 'undefined' && state.bodyDiagramModel ? state.bodyDiagramModel : (typeof localStorage !== 'undefined' && localStorage.getItem('cx_body_diagram_model')) || 'male'));
    const getClass = (m) => {
      const st = getMuscleStatus(m, primary, secondary);
      return `cx-muscle-part muscle ${m} is-${st} ${st === 'primary' ? 'active' : ''}`;
    };

    const isFemale = model === 'female';
    const bodyContent = isFemale ? renderFemaleFrontBody(getClass) : renderMaleFrontBody(getClass);

    return `
      <svg class="cx-muscle-svg cx-anatomical-svg front-view model-${model}" data-body-model="${model}" viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Anterior Front Muscle Map (${model})">
        <defs>
          <filter id="cx-front-coral-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#ef4444" flood-opacity="0.8" />
          </filter>
          <filter id="cx-front-amber-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.75" />
          </filter>
        </defs>

        <!-- Underlay Full Body Silhouette -->
        <g class="cx-body-underlay" opacity="0.15">
          <ellipse cx="100" cy="30" rx="14" ry="17" fill="#60a5fa" />
        </g>

        ${bodyContent}
      </svg>
    `;
  }

  function renderBackSVG(primary = [], secondary = [], options = {}) {
    const model = options.model || (typeof getBodyDiagramModel === 'function' ? getBodyDiagramModel() : (typeof state !== 'undefined' && state.bodyDiagramModel ? state.bodyDiagramModel : (typeof localStorage !== 'undefined' && localStorage.getItem('cx_body_diagram_model')) || 'male'));
    const getClass = (m) => {
      const st = getMuscleStatus(m, primary, secondary);
      return `cx-muscle-part muscle ${m} is-${st} ${st === 'primary' ? 'active' : ''}`;
    };

    const isFemale = model === 'female';
    const bodyContent = isFemale ? renderFemaleBackBody(getClass) : renderMaleBackBody(getClass);

    return `
      <svg class="cx-muscle-svg cx-anatomical-svg back-view model-${model}" data-body-model="${model}" viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Posterior Back Muscle Map (${model})">
        <defs>
          <filter id="cx-back-coral-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#ef4444" flood-opacity="0.8" />
          </filter>
          <filter id="cx-back-amber-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.75" />
          </filter>
        </defs>

        <!-- Underlay Full Body Silhouette -->
        <g class="cx-body-underlay" opacity="0.15">
          <ellipse cx="100" cy="30" rx="14" ry="17" fill="#60a5fa" />
        </g>

        ${bodyContent}
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
      <div style="display:flex; justify-content:center; align-items:center; gap:14px; width:100%; padding:4px 0;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:48%; max-width:130px; height:165px;">
          <span style="font-size:9.5px; font-weight:700; color:var(--text-dim, #94a3b8); text-transform:uppercase; letter-spacing:0.08em;">Anterior (Front)</span>
          ${frontSvg}
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:48%; max-width:130px; height:165px;">
          <span style="font-size:9.5px; font-weight:700; color:var(--text-dim, #94a3b8); text-transform:uppercase; letter-spacing:0.08em;">Posterior (Back)</span>
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

