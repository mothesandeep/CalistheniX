"""
Canonical seed data for the CalistheniX database.

Contains:
  - WARMUP_COOLDOWN_EXERCISES : catalog entries for all mobility/stretch exercises
  - _SEED                     : main training exercises per routine (Push A/B, Pull A/B, Legs A/B)
  - DEFAULT_WORKOUT_PHASES    : warmup + cooldown exercise assignments per routine
  - _SEED_VERSION             : idempotency tag (reseed only if version differs)
"""

# ── Seed version tag ──────────────────────────────────────────────────────────
# Increment this whenever _SEED or DEFAULT_WORKOUT_PHASES changes so that
# reseed_data() knows to re-run.
SEED_VERSION = 'aesthetic-physique-ppl-v1'

# ── Warmup & Cooldown Exercise Catalog ───────────────────────────────────────
# Each tuple: (name, type, default_value, movement_pattern, description_notes)
WARMUP_COOLDOWN_EXERCISES = [
    # Warm-up Dynamic Movements & Mobility
    ('Wrist Circles',                'duration', 30, 'mobility_wrist',      'Warm-up: Circular wrist rotations clockwise & counter-clockwise'),
    ('Wrist Preparation',            'duration', 30, 'mobility_wrist',      'Warm-up: Palm, finger, and wrist joint loading preparation'),
    ('Wrist Rocks',                  'duration', 30, 'mobility_wrist',      'Warm-up: Forward and lateral wrist rocking on hands & knees'),
    ('Arm Circles',                  'duration', 40, 'mobility_shoulder',   'Warm-up: 20 sec forward + 20 sec backward arm circles'),
    ('Arm Swings',                   'duration', 30, 'mobility_shoulder',   'Warm-up: Dynamic horizontal and overhead arm swings'),
    ('Shoulder Rolls',               'reps',     15, 'mobility_shoulder',   'Warm-up: 15 reps controlled shoulder rolls'),
    ('Shoulder Dislocates',          'reps',     10, 'mobility_shoulder',   'Warm-up: 10 reps with towel/band or slow arm circles'),
    ('Wall Slides',                  'reps',     10, 'mobility_shoulder',   'Warm-up: 10 reps overhead slides against wall'),
    ('Shoulder CARs',                'duration', 30, 'mobility_shoulder',   'Warm-up: Controlled Articular Rotations for shoulder capsule mobility'),
    ('Shoulder Activation',          'duration', 30, 'mobility_shoulder',   'Warm-up: Banded or active isometric shoulder prep'),
    ('Shoulder Mobility',            'duration', 30, 'mobility_shoulder',   'Warm-up: Dynamic overhead reaching and thoracic extension'),
    ('Scapular Activation',          'reps',     10, 'pull_vertical',       'Warm-up: Hanging scapular depressions and activations'),
    ('Light General Activation',     'duration', 60, 'mobility_full',       'Warm-up: Dynamic heart rate and CNS activation'),
    ('Jumping Jacks',                'duration', 60, 'mobility_full',       'Warm-up: 1 min (raise heart rate)'),
    ('Dead Hang',                    'duration', 30, 'hold_isometric',      'Warm-up: Grip and shoulder joint decompression hold'),
    ('Dead Hang (Activation)',       'duration', 20, 'hold_isometric',      'Warm-up: 15-20 sec light activation hang'),
    ('Scapular Elevation',           'reps',     10, 'push_vertical',       'Warm-up: Overhead active scapular shrugging & elevation'),
    ('Scapular Push-ups',            'reps',     10, 'push_horizontal',     'Warm-up: Scapular protraction & retraction on floor'),
    ('Scapular Protraction',         'duration', 20, 'push_horizontal',     'Warm-up: Locked-arm planche protraction push hold'),
    ('Scapular Pulls',               'reps',      8, 'pull_vertical',       'Warm-up: Hanging scapular depressions and activations'),
    ('Slow Push-up',                 'reps',      8, 'push_horizontal',     'Warm-up: 8 reps bodyweight, controlled activation'),
    ('Slow Pike Push-up',            'reps',      8, 'push_incline',        'Warm-up: 8 reps controlled shoulder activation'),
    ('Incline Push-up Prep',         'reps',      8, 'push_horizontal',     'Warm-up: Light elevated pushing movement prep'),
    ('Incline Row Prep',             'reps',      8, 'pull_horizontal',     'Warm-up: Light bodyweight rowing movement prep'),
    ('Planche Lean Prep',            'duration', 20, 'planche',             'Warm-up: Forward shoulder lean with full protraction'),
    ('Wall-Facing Handstand Prep',   'duration', 20, 'handstand',           'Warm-up: Chest-to-wall active alignment hold'),
    ('Hollow Body Activation',       'duration', 20, 'core',                'Warm-up: Posterior pelvic tilt core engagement'),
    ('Leg Swings',                   'duration', 40, 'mobility_hip',        'Warm-up: 10 each direction/leg dynamic hip swings'),
    ('Hip Circles',                  'duration', 30, 'mobility_hip',        'Warm-up: 10 each direction hip circles'),
    ('Ankle Circles',                'duration', 30, 'mobility_ankle',      'Warm-up: 10 each direction/ankle circular rotations'),
    ('Ankle Rotations',              'duration', 30, 'mobility_ankle',      'Warm-up: 10 each direction/ankle circular rotations'),
    ('Deep Squat Hold',              'duration', 30, 'mobility_hip',        'Warm-up: Deep bodyweight squat hold with upright chest'),
    ('Bodyweight Squats',            'reps',     15, 'squat',               'Warm-up: 15 reps smooth bodyweight squats no load'),
    ('Light Jump Squats',            'reps',      5, 'squat',               'Warm-up: 5 reps explosive activation, not fatigue'),
    ('Walking High Knees',           'duration', 30, 'mobility_full',       'Warm-up: 30 sec dynamic knee raises'),
    ('Glute Bridges (Activation)',   'reps',     10, 'hinge',               'Warm-up: 10 reps glute activation'),
    ('Hip 90/90 Transitions',        'duration', 30, 'mobility_hip',        'Warm-up: Dynamic internal/external hip rotation switches'),
    ('Cat-Cow Stretch',              'duration', 30, 'mobility_spine',      'Warm-up: Thoracic and lumbar segmental articulation'),
    ('Band/Towel Pull-Aparts',       'reps',     15, 'mobility_shoulder',   'Warm-up: 15 reps rear delt & rhomboid prep'),
    ('Wall Angels (Activation)',     'reps',     10, 'pull_horizontal',     'Warm-up: 10 reps light posture activation'),
    ("World's Greatest Stretch",     'duration', 30, 'mobility_full',       'Warm-up: Lunge + thoracic rotation + hamstring opener'),

    # Cool-down & Static Stretching
    ('Doorway Chest Stretch',        'duration', 60, 'stretch_chest',       'Cool-down: 30 sec each side wall/doorway stretch'),
    ('Chest Stretch',                'duration', 60, 'stretch_chest',       'Cool-down: Wall/doorway pectoral static decompression'),
    ('Lat Stretch',                  'duration', 60, 'stretch_lat',         'Cool-down: 30 sec each side latissimus dorsi stretch'),
    ('Cross-Body Shoulder Stretch',  'duration', 60, 'stretch_shoulder',    'Cool-down: 30 sec each side posterior deltoid stretch'),
    ('Shoulder Cross-body Stretch',  'duration', 60, 'stretch_shoulder',    'Cool-down: 30 sec each side cross-body deltoid stretch'),
    ('Shoulder Stretch',             'duration', 60, 'stretch_shoulder',    'Cool-down: Overhead and posterior shoulder stretch'),
    ('Wrist/Forearm Stretch',        'duration', 30, 'stretch_wrist',       'Cool-down: Wall-supported wrist and forearm elongation'),
    ('Wrist Stretch',                'duration', 40, 'stretch_wrist',       'Cool-down: 20 sec each direction wrist flexor/extensor stretch'),
    ('Overhead Triceps Stretch',     'duration', 60, 'stretch_triceps',     'Cool-down: 30 sec each side overhead triceps and lat stretch'),
    ('Biceps & Forearm Stretch',     'duration', 60, 'stretch_biceps',      'Cool-down: 30 sec each side palm up against wall'),
    ('Biceps Stretch',               'duration', 60, 'stretch_biceps',      'Cool-down: 30 sec each side biceps static stretch'),
    ('Reverse Wrist Stretch',        'duration', 40, 'stretch_wrist',       'Cool-down: 20 sec each direction kneeling palms-up wrist release'),
    ('Eagle Arms Stretch',           'duration', 30, 'stretch_upper_back',  'Cool-down: Intertwined forearm stretch for upper back & rhomboids'),
    ('Upper Back Stretch',           'duration', 45, 'stretch_upper_back',  'Cool-down: 45 sec reach forward, round back'),
    ('Passive Dead Hang',            'duration', 30, 'stretch_spine',       'Cool-down: 20-30 sec passive relaxing decompression of spine'),
    ('Passive Hang',                 'duration', 30, 'stretch_spine',       'Cool-down: 20-30 sec light decompression hang'),
    ('Quad Stretch',                 'duration', 60, 'stretch_quad',        'Cool-down: 30 sec each side standing heel to glute'),
    ('Hip Flexor Stretch',           'duration', 60, 'stretch_hip',         'Cool-down: 30 sec each side kneeling lunge'),
    ('Hamstring Stretch',            'duration', 60, 'stretch_hamstring',   'Cool-down: 30 sec each side seated or standing hamstring fold'),
    ('Pigeon Pose',                  'duration', 60, 'stretch_glute',       'Cool-down: 30 sec each side deep gluteus medius opening'),
    ('Glute Stretch / Pigeon Pose',  'duration', 60, 'stretch_glute',       'Cool-down: 30 sec each side glute stretch'),
    ('Standing Calf Stretch',        'duration', 60, 'stretch_calf',        'Cool-down: 30 sec each side wall-assisted calf stretch'),
    ('Calf Stretch',                 'duration', 60, 'stretch_calf',        'Cool-down: 30 sec each side calf stretch'),
    ('Butterfly Stretch',            'duration', 30, 'stretch_hip',         'Cool-down: Seated groin and adductor static stretch'),
    ("Child's Pose",                 'duration', 45, 'stretch_spine',       'Cool-down: 45 sec kneeling spinal decompression and breathing'),
    ('Puppy Pose',                   'duration', 30, 'stretch_spine',       'Cool-down: Thoracic extension and anterior shoulder stretch'),
    ('Seated Forward Fold',          'duration', 30, 'stretch_hamstring',   'Cool-down: Posterior chain and lower back decompression'),
    ('Supine Spinal Twist',          'duration', 30, 'stretch_spine',       'Cool-down: Lying rotational lumbar and thoracic release'),
    ('Cobra Pose',                   'duration', 30, 'stretch_core',        'Cool-down: Gentle prone abdominal and hip flexor stretch'),
    ('Deep Breathing',               'duration', 60, 'stretch_spine',       'Cool-down: 1 min slow nasal diaphragmatic breaths'),
    ('Neck Stretch',                 'duration', 40, 'stretch_spine',       'Cool-down: 20 sec each side gentle neck tilt'),
    ('Lower Back Stretch',           'duration', 30, 'stretch_spine',       'Cool-down: 30 sec knees to chest lower back release'),
]

# ── Main Training Exercises per Routine ──────────────────────────────────────
# Each inner tuple: (name, type, sets, reps, duration_sec, rest_sec, notes)
SEED = [
    ('Push A', [
        ('Diamond Push-ups',      'reps',     4, 15, None, 90, 'Your strong point — track progress (12-15 reps)'),
        ('Wide Push-ups',         'reps',     3, 15, None, 75, 'Chest width (15 reps)'),
        ('Decline Push-ups',      'reps',     3, 12, None, 75, 'Upper chest (feet elevated, 10-12 reps)'),
        ('Pike Push-ups',         'reps',     3, 10, None, 75, 'Front delt (10 reps)'),
        ('Triceps Dips',          'reps',     3, 15, None, 60, 'Arm definition (12-15 reps)'),
        ('Plank',                 'duration', 3, None, 45, 30, 'Daily core slot (45 sec hold)'),
    ]),
    ('Push B', [
        ('Pike Push-ups Elevated',         'reps',     4, 12, None, 90,  'Side/front delt (feet elevated, 10-12 reps)'),
        ('Handstand Push-up Progression',  'reps',     3,  8, None, 120, 'Wall-assisted — build carefully (5-8 reps)'),
        ('Diamond Push-ups',               'reps',     3, 12, None, 75,  'Triceps focus (12 reps)'),
        ('Archer Push-ups',                'reps',     3,  8, None, 75,  'Unilateral + chest detail (8/side)'),
        ('Lateral Raise',                  'reps',     3, 15, None, 45,  'Water bottles — key for V-taper (15 reps)'),
        ('Hollow Body Hold',               'duration', 3, None, 30, 30,  'Daily core slot (20-30 sec)'),
    ]),
    ('Pull A', [
        ('Dead Hang',            'duration', 2, None, 45, 45,  'Decompression and grip strength hold (30-45 sec)'),
        ('Pull-ups Wide Grip',   'reps',     4,    6, None, 120, 'Primary width builder (max 5-6 currently)'),
        ('Chin-ups',             'reps',     3,    6, None, 120, 'Underhand — bicep + lat (max reps)'),
        ('Negative Pull-ups',    'reps',     3,    5, None,  90, 'Slow 5-sec descent — builds beyond current max'),
        ('Scapular Pulls',       'reps',     3,   10, None,  60, 'Strict scapular depression (10 reps)'),
        ('Hanging Knee Raises',  'reps',     3,   15, None,  45, "Daily core slot — uses the hang you're already in (12-15 reps)"),
    ]),
    ('Pull B', [
        ('Pull-ups Close Grip', 'reps',     4,    6, None, 120, 'Thickness focus (max reps 5-6)'),
        ('Commando Pull-ups',   'reps',     3,    8, None, 100, 'Side-to-side lat variation (6-8 reps)'),
        ('Face Pulls',          'reps',     3,   15, None,  60, "Band/towel-resisted — critical for posture, don't skip"),
        ('Prone Y-raises',      'reps',     3,   15, None,  60, 'Face down, arms in Y — rear delt + upper back (15 reps)'),
        ('Wall Angels',         'reps',     3,   12, None,  45, 'Posture correction drill (12 reps)'),
        ('L-sit Hang',          'duration', 3, None, 20,  45,   'Daily core slot (or tucked knees, 15-20 sec)'),
    ]),
    ('Legs A', [
        ('Bulgarian Split Squats',    'reps',     3, 12, None, 75, 'Chair support — quad + glute (12/leg)'),
        ('Walking Lunges',            'reps',     3, 16, None, 75, '8 reps per leg (16 total)'),
        ('Glute Bridges Single Leg',  'reps',     3, 15, None, 60, 'Posterior chain (15/leg)'),
        ('Calf Raises',               'reps',     4, 20, None, 45, 'Slow tempo (20 reps)'),
        ('Side Plank',                'duration', 3, None, 30, 30, 'Daily core slot — obliques (30 sec/side)'),
    ]),
    ('Legs B', [
        ('Pistol Squat Progression',     'reps',     3,  8, None, 90, 'Assisted/box — bottleneck exercise, priority (6-8/leg)'),
        ('Jump Squats',                  'reps',     3, 15, None, 75, 'Explosive / power element (15 reps)'),
        ('Single-leg Glute Bridge Hold', 'duration', 3, None, 20, 45, 'Isometric variation (20 sec/leg)'),
        ('Wall Sit',                     'duration', 3, None, 40, 45, 'Quad endurance (30-40 sec)'),
        ('Hanging Leg Raises',           'reps',     3, 12, None, 60, 'Straight leg, loft slab — core carryover from leg work (10-12 reps)'),
        ('Russian Twists',               'reps',     3, 20, None, 30, 'Daily core slot — rotational/oblique work (10/side)'),
    ]),
]

# ── Default warmup + cooldown per routine ────────────────────────────────────
DEFAULT_WORKOUT_PHASES = {
    'Push A': {
        'warmup': [
            ('Arm Circles',          'duration', 40, 'Warm-up: 20 sec forward + 20 sec backward'),
            ('Shoulder Rolls',       'reps',     15, 'Warm-up: 15 reps controlled shoulder rolls'),
            ('Jumping Jacks',        'duration', 60, 'Warm-up: 1 min (raise heart rate)'),
            ('Scapular Push-ups',    'reps',     10, 'Warm-up: Scapular protraction & retraction on floor'),
            ('Shoulder Dislocates',  'reps',     10, 'Warm-up: 10 reps with towel/band or slow arm circles'),
            ('Slow Push-up',         'reps',      8, 'Warm-up: 8 reps bodyweight, controlled activation'),
        ],
        'cooldown': [
            ('Doorway Chest Stretch',       'duration', 60, 'Cool-down: 30 sec each side wall/doorway stretch'),
            ('Overhead Triceps Stretch',    'duration', 60, 'Cool-down: 30 sec each side overhead stretch'),
            ('Cross-Body Shoulder Stretch', 'duration', 60, 'Cool-down: 30 sec each side posterior deltoid stretch'),
            ("Child's Pose",               'duration', 45, 'Cool-down: 45 sec spinal decompression and breathing'),
            ('Deep Breathing',             'duration', 60, 'Cool-down: 1 min slow nasal diaphragmatic breaths'),
        ]
    },
    'Push B': {
        'warmup': [
            ('Arm Circles',        'duration', 40, 'Warm-up: 20 sec forward + 20 sec backward'),
            ('Shoulder Rolls',     'reps',     15, 'Warm-up: 15 reps controlled shoulder rolls'),
            ('Wall Slides',        'reps',     10, 'Warm-up: 10 reps overhead slides against wall'),
            ('Scapular Push-ups',  'reps',     10, 'Warm-up: 10 reps protraction & retraction'),
            ('Slow Pike Push-up',  'reps',      8, 'Warm-up: 8 reps controlled shoulder activation'),
        ],
        'cooldown': [
            ('Doorway Chest Stretch',       'duration', 60, 'Cool-down: 30 sec each side wall stretch'),
            ('Cross-Body Shoulder Stretch', 'duration', 60, 'Cool-down: 30 sec each side deltoid stretch'),
            ('Overhead Triceps Stretch',    'duration', 60, 'Cool-down: 30 sec each side triceps stretch'),
            ('Reverse Wrist Stretch',       'duration', 40, 'Cool-down: 20 sec each direction wrist relief'),
            ("Child's Pose",               'duration', 45, 'Cool-down: 45 sec spinal decompression'),
        ]
    },
    'Pull A': {
        'warmup': [
            ('Arm Circles',            'duration', 40, 'Warm-up: 20 sec forward + 20 sec backward'),
            ('Cat-Cow Stretch',        'reps',     10, 'Warm-up: 10 reps thoracic and lumbar articulation'),
            ('Band/Towel Pull-Aparts', 'reps',     15, 'Warm-up: 15 reps rear delt & rhomboid prep'),
            ('Scapular Pulls',         'reps',      8, 'Warm-up: 8 reps light hang scapular activations'),
            ('Dead Hang (Activation)', 'duration', 20, 'Warm-up: 15-20 sec light activation hang'),
        ],
        'cooldown': [
            ('Passive Dead Hang',      'duration', 30, 'Cool-down: 20-30 sec light spine decompression'),
            ('Lat Stretch',            'duration', 60, 'Cool-down: 30 sec each side latissimus stretch'),
            ('Biceps & Forearm Stretch', 'duration', 60, 'Cool-down: 30 sec each side palm up against wall'),
            ('Upper Back Stretch',     'duration', 45, 'Cool-down: 45 sec reach forward, round back'),
            ('Deep Breathing',         'duration', 60, 'Cool-down: 1 min diaphragmatic recovery'),
        ]
    },
    'Pull B': {
        'warmup': [
            ('Arm Circles',              'duration', 40, 'Warm-up: 20 sec forward + 20 sec backward'),
            ('Cat-Cow Stretch',          'reps',     10, 'Warm-up: 10 reps thoracic and lumbar articulation'),
            ('Band/Towel Pull-Aparts',   'reps',     15, 'Warm-up: 15 reps rear delt & rhomboid prep'),
            ('Wall Angels (Activation)', 'reps',     10, 'Warm-up: 10 reps light posture activation'),
            ('Dead Hang (Activation)',   'duration', 20, 'Warm-up: 15-20 sec light activation hang'),
        ],
        'cooldown': [
            ('Passive Dead Hang',           'duration', 30, 'Cool-down: 20-30 sec passive relaxing decompression'),
            ('Lat Stretch',                 'duration', 60, 'Cool-down: 30 sec each side side-reach stretch'),
            ('Cross-Body Shoulder Stretch', 'duration', 60, 'Cool-down: 30 sec each side rear delt stretch'),
            ('Upper Back Stretch',          'duration', 45, 'Cool-down: 45 sec reach forward, round back'),
            ('Neck Stretch',                'duration', 40, 'Cool-down: 20 sec each side gentle neck tilt'),
        ]
    },
    'Legs A': {
        'warmup': [
            ('Leg Swings',                 'duration', 40, 'Warm-up: 10 each direction/leg swings'),
            ('Hip Circles',                'duration', 30, 'Warm-up: 10 each direction hip circles'),
            ('Bodyweight Squats',          'reps',     15, 'Warm-up: 15 reps slow, controlled no load'),
            ('Ankle Circles',              'duration', 30, 'Warm-up: 10 each direction/ankle'),
            ('Walking High Knees',         'duration', 30, 'Warm-up: 30 sec dynamic knee raises'),
            ('Glute Bridges (Activation)', 'reps',     10, 'Warm-up: 10 reps glute activation'),
        ],
        'cooldown': [
            ('Quad Stretch',           'duration', 60, 'Cool-down: 30 sec each side standing heel to glute'),
            ('Hamstring Stretch',      'duration', 60, 'Cool-down: 30 sec each side forward fold'),
            ('Standing Calf Stretch',  'duration', 60, 'Cool-down: 30 sec each side against wall'),
            ('Hip Flexor Stretch',     'duration', 60, 'Cool-down: 30 sec each side lunge position'),
            ('Pigeon Pose',            'duration', 60, 'Cool-down: 30 sec each side glute stretch'),
        ]
    },
    'Legs B': {
        'warmup': [
            ('Leg Swings',          'duration', 40, 'Warm-up: 10 each direction/leg swings'),
            ('Hip Circles',         'duration', 30, 'Warm-up: 10 each direction hip circles'),
            ('Bodyweight Squats',   'reps',     15, 'Warm-up: 15 reps slow, controlled no load'),
            ('Ankle Circles',       'duration', 30, 'Warm-up: 10 each direction/ankle'),
            ('Walking High Knees',  'duration', 30, 'Warm-up: 30 sec dynamic knee raises'),
            ('Light Jump Squats',   'reps',      5, 'Warm-up: 5 reps explosive activation, not fatigue'),
        ],
        'cooldown': [
            ('Quad Stretch',          'duration', 60, 'Cool-down: 30 sec each side standing heel to glute'),
            ('Hamstring Stretch',     'duration', 60, 'Cool-down: 30 sec each side forward fold'),
            ('Standing Calf Stretch', 'duration', 60, 'Cool-down: 30 sec each side against wall'),
            ('Hip Flexor Stretch',    'duration', 60, 'Cool-down: 30 sec each side lunge position'),
            ('Pigeon Pose',           'duration', 60, 'Cool-down: 30 sec each side glute stretch'),
            ("Child's Pose",          'duration', 30, "Cool-down: 30 sec lower back knees-to-chest/child's pose"),
        ]
    }
}
