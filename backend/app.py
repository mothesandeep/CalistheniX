import sqlite3
import json
import os
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from backend.config import Config
    from backend.db import get_db, get_db_connection, DB_PATH
    from backend.utils import _parse_int
    from backend.routes.splits import splits_bp
    from backend.routes.workouts import workouts_bp
    from backend.routes.exercises import exercises_bp
    from backend.routes.sessions import sessions_bp
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.backup import backup_bp
except ImportError:
    from config import Config
    from db import get_db, get_db_connection, DB_PATH
    from utils import _parse_int
    from routes.splits import splits_bp
    from routes.workouts import workouts_bp
    from routes.exercises import exercises_bp
    from routes.sessions import sessions_bp
    from routes.dashboard import dashboard_bp
    from routes.backup import backup_bp


def create_app(config_class=Config):
    """Application factory creating and configuring Flask app instance."""
    flask_app = Flask(__name__)
    if isinstance(config_class, type) or hasattr(config_class, '__dict__'):
        flask_app.config.from_object(config_class)
    elif isinstance(config_class, dict):
        flask_app.config.from_mapping(config_class)

    cors_origins = flask_app.config.get('CORS_ORIGINS', '*')
    CORS(flask_app, resources={r"/*": {"origins": cors_origins}})

    # Register Route Blueprints
    flask_app.register_blueprint(splits_bp)
    flask_app.register_blueprint(workouts_bp)
    flask_app.register_blueprint(exercises_bp)
    flask_app.register_blueprint(sessions_bp)
    flask_app.register_blueprint(dashboard_bp)
    flask_app.register_blueprint(backup_bp)

    return flask_app


# Default application instance for backward compatibility and test runners
app = create_app()



def init_db():
    with get_db() as conn:
        cursor = conn.cursor()

        # ── Core tables ──────────────────────────────────────────────────────────

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS exercises (
            id                          INTEGER PRIMARY KEY AUTOINCREMENT,
            name                        TEXT NOT NULL,
            day                         TEXT NOT NULL,
            type                        TEXT NOT NULL,
            movement_pattern            TEXT NOT NULL DEFAULT 'push_horizontal',
            prerequisite_id             INTEGER,
            next_id                     INTEGER,
            progression_target_reps     INTEGER,
            progression_target_duration INTEGER,
            progression_sessions_needed INTEGER NOT NULL DEFAULT 2,
            FOREIGN KEY(prerequisite_id) REFERENCES exercises(id),
            FOREIGN KEY(next_id)         REFERENCES exercises(id)
        )
        ''')

        # Note: 'synced' is a client-side-only flag (architecture.md §3) — not stored here.
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise_id   INTEGER NOT NULL,
            timestamp     DATETIME NOT NULL,
            reps          INTEGER,
            weight_kg     REAL,
            duration_sec  INTEGER,
            rpe           INTEGER,
            client_uuid   TEXT UNIQUE NOT NULL,
            session_uuid  TEXT,
            phase         TEXT NOT NULL DEFAULT 'main',
            FOREIGN KEY(exercise_id) REFERENCES exercises(id)
        )
        ''')

        # Clean up legacy unused progressions table if present
        cursor.execute('DROP TABLE IF EXISTS progressions')

        # ── Routine / level tables ────────────────────────────────────────────────

        # One row per (routine_name, level) pair — e.g. ('Push A', 1)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS routine_levels (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            routine_name  TEXT    NOT NULL,
            level         INTEGER NOT NULL,
            UNIQUE(routine_name, level)
        )
        ''')

        # One row per exercise slot within a level.
        # exercises sharing a non-null superset_group value in the same level
        # are treated as a superset in the UI; null = standalone.
        # notes: short per-exercise annotation, e.g. "Your strong point — track progress".
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS level_exercises (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            routine_level_id  INTEGER NOT NULL,
            exercise_id       INTEGER NOT NULL,
            order_index       INTEGER NOT NULL,
            sets              INTEGER NOT NULL,
            reps              INTEGER,
            duration_sec      INTEGER,
            tempo             TEXT,
            rest_sec          INTEGER NOT NULL,
            superset_group    INTEGER,
            notes             TEXT,
            phase             TEXT NOT NULL DEFAULT 'main',
            FOREIGN KEY(routine_level_id) REFERENCES routine_levels(id),
            FOREIGN KEY(exercise_id)      REFERENCES exercises(id)
        )
        ''')

        # ── Workout Sessions table (Phase 1 Foundation & Tri-Phase Lifecycle) ─────
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS workout_sessions (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            session_uuid          TEXT UNIQUE NOT NULL,
            routine_name          TEXT NOT NULL,
            level                 INTEGER NOT NULL DEFAULT 1,
            started_at            DATETIME NOT NULL,
            completed_at          DATETIME,
            duration_sec          INTEGER DEFAULT 0,
            warmup_duration_sec   INTEGER DEFAULT 0,
            main_duration_sec     INTEGER DEFAULT 0,
            cooldown_duration_sec INTEGER DEFAULT 0,
            warmup_status         TEXT DEFAULT 'none',
            cooldown_status       TEXT DEFAULT 'none',
            total_sets            INTEGER DEFAULT 0,
            completed_sets        INTEGER DEFAULT 0,
            status                TEXT NOT NULL DEFAULT 'completed',
            raw_json              TEXT
        )
        ''')

        # ── Custom Training Splits & Weekly Schedules (Custom Split Phase) ───────
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_splits (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT,
            is_active   INTEGER NOT NULL DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS workouts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS weekly_schedules (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            split_id    INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            day_type    TEXT NOT NULL DEFAULT 'workout',
            workout_id  INTEGER,
            FOREIGN KEY(split_id) REFERENCES training_splits(id) ON DELETE CASCADE,
            FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE SET NULL,
            UNIQUE(split_id, day_of_week)
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS workout_exercises (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id     INTEGER NOT NULL,
            exercise_id    INTEGER NOT NULL,
            order_index    INTEGER NOT NULL,
            sets           INTEGER NOT NULL DEFAULT 3,
            reps           INTEGER,
            duration_sec   INTEGER,
            rest_sec       INTEGER NOT NULL DEFAULT 90,
            tempo          TEXT,
            superset_group INTEGER,
            notes          TEXT,
            phase          TEXT NOT NULL DEFAULT 'main',
            FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id)
        )
        ''')

        # ── Performance Indexes (Step 5 Database Integrity) ──────────────────────
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_exercise_timestamp ON logs(exercise_id, timestamp DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_session_uuid ON logs(session_uuid)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON workout_sessions(started_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON workout_sessions(completed_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id, order_index)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_weekly_schedules_split_day ON weekly_schedules(split_id, day_of_week)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_level_exercises_level ON level_exercises(routine_level_id, order_index)')

        conn.commit()

    # Add notes column if it was missing from an older schema (safe on re-run).
    _migrate_notes_column()
    # Add progression columns to exercises if missing (safe on re-run).
    _migrate_progression_columns()
    # Add session_uuid column to logs if missing (safe on re-run).
    _migrate_session_uuid_column()
    # Add movement_pattern column to exercises if missing and backfill (safe on re-run).
    _migrate_movement_pattern_column()
    # Add phase column to workout_exercises, level_exercises, and logs if missing (safe on re-run).
    _migrate_phase_columns()
    # Add phase duration and status columns to workout_sessions if missing (safe on re-run).
    _migrate_session_phase_duration_columns()
    # Ensure warmup & cool-down mobility/stretch exercises are present in catalog.
    _ensure_warmup_cooldown_exercises()


def _migrate_session_phase_duration_columns():
    """Add phase duration and status columns to workout_sessions table if missing."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(workout_sessions)').fetchall()]
        migrations = [
            ('warmup_duration_sec',   'ALTER TABLE workout_sessions ADD COLUMN warmup_duration_sec   INTEGER DEFAULT 0'),
            ('main_duration_sec',     'ALTER TABLE workout_sessions ADD COLUMN main_duration_sec     INTEGER DEFAULT 0'),
            ('cooldown_duration_sec', 'ALTER TABLE workout_sessions ADD COLUMN cooldown_duration_sec INTEGER DEFAULT 0'),
            ('warmup_status',         "ALTER TABLE workout_sessions ADD COLUMN warmup_status         TEXT DEFAULT 'none'"),
            ('cooldown_status',       "ALTER TABLE workout_sessions ADD COLUMN cooldown_status       TEXT DEFAULT 'none'"),
        ]
        for col_name, sql in migrations:
            if col_name not in cols:
                cursor.execute(sql)
        conn.commit()


def _migrate_phase_columns():
    """Add `phase` TEXT NOT NULL DEFAULT 'main' column to workout_exercises, level_exercises, and logs tables if missing."""
    with get_db() as conn:
        cursor = conn.cursor()
        for table in ['workout_exercises', 'level_exercises', 'logs']:
            cols = [row[1] for row in cursor.execute(f'PRAGMA table_info({table})').fetchall()]
            if 'phase' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN phase TEXT NOT NULL DEFAULT 'main'")
        conn.commit()


def _migrate_session_uuid_column():
    """Add `session_uuid` TEXT column to logs table if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(logs)').fetchall()]
        if 'session_uuid' not in cols:
            cursor.execute('ALTER TABLE logs ADD COLUMN session_uuid TEXT')
            conn.commit()


def _migrate_notes_column():
    """Add `notes` TEXT nullable column to level_exercises if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(level_exercises)').fetchall()]
        if 'notes' not in cols:
            cursor.execute('ALTER TABLE level_exercises ADD COLUMN notes TEXT')
            conn.commit()


def _migrate_progression_columns():
    """Add three progression tracking columns to exercises if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(exercises)').fetchall()]
        migrations = [
            ('progression_target_reps',     'ALTER TABLE exercises ADD COLUMN progression_target_reps     INTEGER'),
            ('progression_target_duration', 'ALTER TABLE exercises ADD COLUMN progression_target_duration INTEGER'),
            ('progression_sessions_needed', 'ALTER TABLE exercises ADD COLUMN progression_sessions_needed INTEGER NOT NULL DEFAULT 2'),
        ]
        for col_name, sql in migrations:
            if col_name not in cols:
                cursor.execute(sql)
        conn.commit()


def _migrate_movement_pattern_column():
    """Add `movement_pattern` TEXT column to exercises table if missing and backfill existing rows."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(exercises)').fetchall()]
        if 'movement_pattern' not in cols:
            cursor.execute("ALTER TABLE exercises ADD COLUMN movement_pattern TEXT NOT NULL DEFAULT 'push_horizontal'")
            # Update all known canonical exercises to their correct movement pattern
            for name, pattern in EXERCISE_MOVEMENT_PATTERNS.items():
                cursor.execute('UPDATE exercises SET movement_pattern = ? WHERE name = ?', (pattern, name))
            cursor.execute("UPDATE exercises SET movement_pattern = 'push_horizontal' WHERE movement_pattern IS NULL OR movement_pattern = ''")
            conn.commit()


# ── Canonical Movement Pattern Mapping ───────────────────────────────────────
EXERCISE_MOVEMENT_PATTERNS = {
    # Push A & Push B
    'Diamond Push-ups':             'push_horizontal',
    'Wide Push-ups':                'push_horizontal',
    'Decline Push-ups':             'push_horizontal',
    'Pike Push-ups':                'push_incline',
    'Triceps Dips':                 'push_dip',
    'Plank':                        'core',
    'Pike Push-ups Elevated':       'push_incline',
    'Handstand Push-up Progression': 'push_vertical',
    'Archer Push-ups':              'push_archer',
    'Lateral Raise':                'isolation_lateral',
    'Hollow Body Hold':             'core',

    # Pull A & Pull B
    'Dead Hang':                    'hanging',
    'Pull-ups Wide Grip':           'pull_vertical',
    'Chin-ups':                     'pull_vertical',
    'Negative Pull-ups':            'pull_vertical',
    'Scapular Pulls':               'pull_vertical',
    'Hanging Knee Raises':          'core',
    'Pull-ups Close Grip':          'pull_vertical',
    'Commando Pull-ups':            'pull_vertical',
    'Face Pulls':                   'pull_horizontal',
    'Prone Y-raises':               'pull_horizontal',
    'Wall Angels':                  'pull_horizontal',
    'L-sit Hang':                   'core',

    # Legs A & Legs B
    'Bulgarian Split Squats':       'lunge',
    'Walking Lunges':               'lunge',
    'Glute Bridges Single Leg':     'hinge',
    'Calf Raises':                  'isolation_calf',
    'Side Plank':                   'core',
    'Pistol Squat Progression':     'squat',
    'Jump Squats':                  'squat',
    'Single-leg Glute Bridge Hold': 'hold_isometric',
    'Wall Sit':                     'hold_isometric',
    'Hanging Leg Raises':           'core',
    'Russian Twists':               'core',

    # Warm-up Dynamic Movements & Mobility
    'Wrist Circles':                'mobility_wrist',
    'Wrist Preparation':            'mobility_wrist',
    'Wrist Rocks':                  'mobility_wrist',
    'Arm Circles':                  'mobility_shoulder',
    'Arm Swings':                   'mobility_shoulder',
    'Shoulder CARs':                'mobility_shoulder',
    'Shoulder Activation':          'mobility_shoulder',
    'Shoulder Mobility':            'mobility_shoulder',
    'Scapular Elevation':           'push_vertical',
    'Scapular Push-ups':            'push_horizontal',
    'Scapular Protraction':         'push_horizontal',
    'Scapular Pulls':               'pull_vertical',
    'Incline Push-up Prep':         'push_horizontal',
    'Incline Row Prep':             'pull_horizontal',
    'Planche Lean Prep':            'planche',
    'Wall-Facing Handstand Prep':   'handstand',
    'Hollow Body Activation':       'core',
    'Leg Swings':                   'mobility_hip',
    'Ankle Circles':                'mobility_ankle',
    'Deep Squat Hold':              'mobility_hip',
    'Bodyweight Squats':            'squat',
    'Hip 90/90 Transitions':        'mobility_hip',
    'Cat-Cow Stretch':              'mobility_spine',
    'World\'s Greatest Stretch':    'mobility_full',

    # Cool-down & Static Stretching
    'Chest Stretch':                'stretch_chest',
    'Lat Stretch':                  'stretch_lat',
    'Shoulder Stretch':             'stretch_shoulder',
    'Overhead Triceps Stretch':     'stretch_triceps',
    'Biceps & Forearm Stretch':     'stretch_biceps',
    'Reverse Wrist Stretch':        'stretch_wrist',
    'Eagle Arms Stretch':           'stretch_upper_back',
    'Hip Flexor Stretch':           'stretch_hip',
    'Hamstring Stretch':            'stretch_hamstring',
    'Pigeon Pose':                  'stretch_glute',
    'Standing Calf Stretch':        'stretch_calf',
    'Butterfly Stretch':            'stretch_hip',
    'Child\'s Pose':                'stretch_spine',
    'Puppy Pose':                   'stretch_spine',
    'Seated Forward Fold':          'stretch_hamstring',
    'Supine Spinal Twist':          'stretch_spine',
    'Cobra Pose':                   'stretch_core',
    'Dead Hang':                    'hold_isometric',
    'Passive Dead Hang':            'stretch_spine',
    'Scapular Activation':          'pull_vertical',
    'Light General Activation':      'mobility_full',
    'Cross-Body Shoulder Stretch':  'stretch_shoulder',
    'Wrist/Forearm Stretch':        'stretch_wrist',
}

WARMUP_COOLDOWN_EXERCISES = [
    # Warm-up Dynamic Movements & Mobility
    ('Wrist Circles',                'duration', 30, 'mobility_wrist',      'Warm-up: Circular wrist rotations clockwise & counter-clockwise'),
    ('Wrist Preparation',            'duration', 30, 'mobility_wrist',      'Warm-up: Palm, finger, and wrist joint loading preparation'),
    ('Wrist Rocks',                  'duration', 30, 'mobility_wrist',      'Warm-up: Forward and lateral wrist rocking on hands & knees'),
    ('Arm Circles',                  'duration', 30, 'mobility_shoulder',   'Warm-up: Controlled arm swings for shoulder joint lubrication'),
    ('Arm Swings',                   'duration', 30, 'mobility_shoulder',   'Warm-up: Dynamic horizontal and overhead arm swings'),
    ('Shoulder CARs',                'duration', 30, 'mobility_shoulder',   'Warm-up: Controlled Articular Rotations for shoulder capsule mobility'),
    ('Shoulder Activation',          'duration', 30, 'mobility_shoulder',   'Warm-up: Banded or active isometric shoulder prep'),
    ('Shoulder Mobility',            'duration', 30, 'mobility_shoulder',   'Warm-up: Dynamic overhead reaching and thoracic extension'),
    ('Scapular Activation',          'reps',     10, 'pull_vertical',       'Warm-up: Hanging scapular depressions and activations'),
    ('Light General Activation',     'duration', 60, 'mobility_full',       'Warm-up: Dynamic heart rate and CNS activation'),
    ('Dead Hang',                    'duration', 30, 'hold_isometric',      'Warm-up: Grip and shoulder joint decompression hold'),
    ('Scapular Elevation',           'reps',     10, 'push_vertical',       'Warm-up: Overhead active scapular shrugging & elevation'),
    ('Scapular Push-ups',            'reps',     10, 'push_horizontal',     'Warm-up: Scapular protraction & retraction on floor'),
    ('Scapular Protraction',         'duration', 20, 'push_horizontal',     'Warm-up: Locked-arm planche protraction push hold'),
    ('Scapular Pulls',               'reps',      8, 'pull_vertical',       'Warm-up: Hanging scapular depressions and activations'),
    ('Incline Push-up Prep',         'reps',      8, 'push_horizontal',     'Warm-up: Light elevated pushing movement prep'),
    ('Incline Row Prep',             'reps',      8, 'pull_horizontal',     'Warm-up: Light bodyweight rowing movement prep'),
    ('Planche Lean Prep',            'duration', 20, 'planche',             'Warm-up: Forward shoulder lean with full protraction'),
    ('Wall-Facing Handstand Prep',   'duration', 20, 'handstand',           'Warm-up: Chest-to-wall active alignment hold'),
    ('Hollow Body Activation',       'duration', 20, 'core',                'Warm-up: Posterior pelvic tilt core engagement'),
    ('Leg Swings',                   'duration', 30, 'mobility_hip',        'Warm-up: Dynamic forward/backward & lateral hip swings'),
    ('Ankle Circles',                'duration', 30, 'mobility_ankle',      'Warm-up: Controlled circular ankle rotations'),
    ('Deep Squat Hold',              'duration', 30, 'mobility_hip',        'Warm-up: Deep bodyweight squat hold with upright chest'),
    ('Bodyweight Squats',            'reps',     10, 'squat',               'Warm-up: Smooth bodyweight squats to prime hip & knee extensor mechanics'),
    ('Hip 90/90 Transitions',        'duration', 30, 'mobility_hip',        'Warm-up: Dynamic internal/external hip rotation switches'),
    ('Cat-Cow Stretch',              'duration', 30, 'mobility_spine',      'Warm-up: Thoracic and lumbar segmental articulation'),
    ('World\'s Greatest Stretch',    'duration', 30, 'mobility_full',       'Warm-up: Lunge + thoracic rotation + hamstring opener'),

    # Cool-down & Static Stretching
    ('Chest Stretch',                'duration', 30, 'stretch_chest',       'Cool-down: Wall/doorway pectoral static decompression'),
    ('Lat Stretch',                  'duration', 30, 'stretch_lat',         'Cool-down: Hanging or bar-assisted latissimus dorsi stretch'),
    ('Cross-Body Shoulder Stretch',  'duration', 30, 'stretch_shoulder',    'Cool-down: Cross-body posterior capsule and deltoid stretch'),
    ('Shoulder Stretch',             'duration', 30, 'stretch_shoulder',    'Cool-down: Overhead and posterior shoulder stretch'),
    ('Wrist/Forearm Stretch',        'duration', 30, 'stretch_wrist',       'Cool-down: Wall-supported wrist and forearm elongation'),
    ('Overhead Triceps Stretch',     'duration', 30, 'stretch_triceps',     'Cool-down: Overhead triceps and lat static stretch'),
    ('Biceps & Forearm Stretch',     'duration', 30, 'stretch_biceps',      'Cool-down: Wall-supported wrist and biceps elongation'),
    ('Reverse Wrist Stretch',        'duration', 30, 'stretch_wrist',       'Cool-down: Kneeling palms-up gentle wrist extensor release'),
    ('Eagle Arms Stretch',           'duration', 30, 'stretch_upper_back',  'Cool-down: Intertwined forearm stretch for upper back & rhomboids'),
    ('Passive Dead Hang',            'duration', 30, 'stretch_spine',       'Cool-down: Passive relaxing decompression of spine'),
    ('Hip Flexor Stretch',           'duration', 30, 'stretch_hip',         'Cool-down: Kneeling lunge for psoas and rectus femoris elongation'),
    ('Hamstring Stretch',            'duration', 30, 'stretch_hamstring',   'Cool-down: Seated or standing single-leg hamstring stretch'),
    ('Pigeon Pose',                  'duration', 30, 'stretch_glute',       'Cool-down: Deep gluteus medius/piriformis opening'),
    ('Standing Calf Stretch',        'duration', 30, 'stretch_calf',        'Cool-down: Wall-assisted gastrocnemius & soleus stretch'),
    ('Butterfly Stretch',            'duration', 30, 'stretch_hip',         'Cool-down: Seated groin and adductor static stretch'),
    ('Child\'s Pose',                'duration', 30, 'stretch_spine',       'Cool-down: Kneeling spinal decompression and breathing'),
    ('Puppy Pose',                   'duration', 30, 'stretch_spine',       'Cool-down: Thoracic extension and anterior shoulder stretch'),
    ('Seated Forward Fold',          'duration', 30, 'stretch_hamstring',   'Cool-down: Posterior chain and lower back decompression'),
    ('Supine Spinal Twist',          'duration', 30, 'stretch_spine',       'Cool-down: Lying rotational lumbar and thoracic release'),
    ('Cobra Pose',                   'duration', 30, 'stretch_core',        'Cool-down: Gentle prone abdominal and hip flexor stretch'),
]

def _ensure_warmup_cooldown_exercises(conn=None):
    """Ensure canonical warm-up mobility and cool-down stretch exercises exist in the database."""
    if conn is not None:
        _insert_warmup_cooldown_exercises(conn)
    else:
        with get_db() as local_conn:
            _insert_warmup_cooldown_exercises(local_conn)
            local_conn.commit()


def _insert_warmup_cooldown_exercises(conn):
    cursor = conn.cursor()
    for item in WARMUP_COOLDOWN_EXERCISES:
        name = item[0]
        ex_type = item[1]
        default_val = item[2]
        pattern = item[3]

        existing = cursor.execute('SELECT id FROM exercises WHERE name = ?', (name,)).fetchone()
        if not existing:
            dur = default_val if ex_type == 'duration' else None
            reps = default_val if ex_type == 'reps' else None
            cursor.execute(
                '''INSERT INTO exercises
                       (name, day, type, movement_pattern, progression_target_reps, progression_target_duration)
                   VALUES (?, 'Mobility & Stretching', ?, ?, ?, ?)''',
                (name, ex_type, pattern, reps, dur)
            )


_SEED_VERSION = 'custom-split-v11'  # bump to re-seed with clean PULL warmup and cooldown exercises

_SEED = [
    ('Push A', [
        ('Diamond Push-ups',      'reps',     4, 15, None, 90, 'Your strong point — track progress (12-15 reps)'),
        ('Wide Push-ups',         'reps',     3, 15, None, 90, 'Chest width'),
        ('Decline Push-ups',      'reps',     3, 12, None, 90, 'Upper chest (feet elevated, 10-12 reps)'),
        ('Pike Push-ups',         'reps',     3, 10, None, 90, 'Front delt'),
        ('Triceps Dips',          'reps',     3, 15, None, 90, 'Arm definition (12-15 reps)'),
        ('Plank',                 'duration', 3, None, 45, 90, 'Daily core slot'),
    ]),
    ('Push B', [
        ('Pike Push-ups Elevated',         'reps',     4, 12, None, 90, 'Side/front delt (feet elevated, 10-12 reps)'),
        ('Handstand Push-up Progression',  'reps',     3,  8, None, 90, 'Wall-assisted — build carefully (5-8 reps)'),
        ('Diamond Push-ups',               'reps',     3, 12, None, 90, 'Triceps'),
        ('Archer Push-ups',                'reps',     3,  8, None, 90, 'Unilateral + chest detail (8/side)'),
        ('Lateral Raise',                  'reps',     3, 15, None, 90, 'Water bottles — key for V-taper'),
        ('Hollow Body Hold',               'duration', 3, None, 30, 90, 'Daily core slot (20-30 sec)'),
    ]),
    ('Pull A', [
        ('Pull-ups Wide Grip',   'reps',     4,    6, None, 90, 'Primary width builder (max 5-6 currently)'),
        ('Chin-ups',             'reps',     3,    6, None, 90, 'Underhand — bicep + lat (max reps)'),
        ('Inverted Rows',        'reps',     3,   10, None, 90, 'Horizontal pulling & rhomboid engagement'),
        ('Negative Pull-ups',    'reps',     3,    5, None, 90, 'Slow 5-sec descent — builds beyond current max'),
        ('Face Pulls',           'reps',     3,   15, None, 90, 'Band/towel-resisted — rear delt + posture'),
        ('Hanging Knee Raises',  'reps',     3,   15, None, 90, 'Daily core slot — uses the hang you\'re already in (12-15 reps)'),
    ]),
    ('Pull B', [
        ('Pull-ups Close Grip', 'reps',     4,    6, None, 90, 'Thickness focus (max reps)'),
        ('Commando Pull-ups',   'reps',     3,    8, None, 90, 'Side-to-side lat variation (6-8 reps)'),
        ('Face Pulls',          'reps',     3,   15, None, 90, 'Band/towel-resisted — critical for posture, don\'t skip'),
        ('Prone Y-raises',      'reps',     3,   15, None, 90, 'Face down, arms in Y — rear delt + upper back'),
        ('Wall Angels',         'reps',     3,   12, None, 90, 'Posture correction drill'),
        ('L-sit Hang',          'duration', 3, None, 20, 90, 'Daily core slot (or tucked knees, 15-20 sec)'),
    ]),
    ('Legs A', [
        ('Bulgarian Split Squats',    'reps',     3, 12, None, 90, 'Chair support — quad + glute (12/leg)'),
        ('Walking Lunges',            'reps',     3, 16, None, 90, '8 reps per leg'),
        ('Glute Bridges Single Leg',  'reps',     3, 15, None, 90, 'Posterior chain (15/leg)'),
        ('Calf Raises',               'reps',     4, 20, None, 90, 'Slow tempo'),
        ('Side Plank',                'duration', 3, None, 30, 90, 'Daily core slot — obliques (30 sec/side)'),
    ]),
    ('Legs B', [
        ('Pistol Squat Progression',     'reps',     3,  8, None, 90, 'Assisted/box — bottleneck exercise, priority (6-8/leg)'),
        ('Jump Squats',                  'reps',     3, 15, None, 90, 'Explosive / power element'),
        ('Single-leg Glute Bridge Hold', 'duration', 3, None, 20, 90, 'Isometric variation (20 sec/leg)'),
        ('Wall Sit',                     'duration', 3, None, 40, 90, 'Quad endurance (30-40 sec)'),
        ('Hanging Leg Raises',           'reps',     3, 12, None, 90, 'Straight leg, loft slab — core carryover from leg work (10-12 reps)'),
        ('Russian Twists',               'reps',     3, 20, None, 90, 'Daily core slot — rotational/oblique work (10/side)'),
    ]),
]

DEFAULT_WORKOUT_PHASES = {
    'Push A': {
        'warmup': [
            ('Wrist Circles', 'duration', 30, 'Warm-up: Joint lubrication for pressing'),
            ('Arm Circles', 'duration', 30, 'Warm-up: Controlled shoulder circumduction'),
            ('Shoulder CARs', 'duration', 30, 'Warm-up: Rotational mobility for shoulder capsules'),
            ('Scapular Push-ups', 'reps', 10, 'Warm-up: Protraction and retraction mechanics'),
            ('Arm Swings', 'duration', 30, 'Warm-up: Dynamic pectoral and anterior delt opener'),
        ],
        'cooldown': [
            ('Chest Stretch', 'duration', 30, 'Cool-down: Wall/doorway pectoral static decompression'),
            ('Shoulder Stretch', 'duration', 30, 'Cool-down: Cross-body posterior capsule and deltoid stretch'),
            ('Overhead Triceps Stretch', 'duration', 30, 'Cool-down: Overhead triceps and lat static stretch'),
            ('Cobra Pose', 'duration', 30, 'Cool-down: Gentle prone extension for anterior chain'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
        ]
    },
    'Push B': {
        'warmup': [
            ('Wrist Circles', 'duration', 30, 'Warm-up: Joint lubrication for pressing'),
            ('Arm Circles', 'duration', 30, 'Warm-up: Controlled shoulder circumduction'),
            ('Shoulder CARs', 'duration', 30, 'Warm-up: Rotational mobility for shoulder capsules'),
            ('Scapular Push-ups', 'reps', 10, 'Warm-up: Protraction and retraction mechanics'),
            ('Arm Swings', 'duration', 30, 'Warm-up: Dynamic pectoral and anterior delt opener'),
        ],
        'cooldown': [
            ('Chest Stretch', 'duration', 30, 'Cool-down: Wall/doorway pectoral static decompression'),
            ('Shoulder Stretch', 'duration', 30, 'Cool-down: Cross-body posterior capsule and deltoid stretch'),
            ('Overhead Triceps Stretch', 'duration', 30, 'Cool-down: Overhead triceps and lat static stretch'),
            ('Cobra Pose', 'duration', 30, 'Cool-down: Gentle prone extension for anterior chain'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
        ]
    },
    'Pull A': {
        'warmup': [
            ('Wrist Preparation', 'duration', 30, 'Warm-up: Grip and forearm dynamic prep'),
            ('Arm Circles', 'duration', 30, 'Warm-up: Controlled shoulder circumduction'),
            ('Shoulder Mobility', 'duration', 30, 'Warm-up: Dynamic overhead reaching and thoracic extension'),
            ('Scapular Activation', 'reps', 10, 'Warm-up: Hanging scapular depressions and activations'),
            ('Light General Activation', 'duration', 60, 'Warm-up: Dynamic heart rate and CNS activation'),
        ],
        'cooldown': [
            ('Lat Stretch', 'duration', 30, 'Cool-down: Hanging or bar-assisted latissimus dorsi stretch'),
            ('Cross-Body Shoulder Stretch', 'duration', 30, 'Cool-down: Cross-body posterior capsule and deltoid stretch'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
            ('Shoulder Stretch', 'duration', 30, 'Cool-down: Overhead and posterior shoulder stretch'),
            ('Wrist/Forearm Stretch', 'duration', 30, 'Cool-down: Wall-supported wrist and forearm elongation'),
        ]
    },
    'Pull B': {
        'warmup': [
            ('Wrist Preparation', 'duration', 30, 'Warm-up: Grip and forearm dynamic prep'),
            ('Arm Circles', 'duration', 30, 'Warm-up: Controlled shoulder circumduction'),
            ('Shoulder Mobility', 'duration', 30, 'Warm-up: Dynamic overhead reaching and thoracic extension'),
            ('Scapular Activation', 'reps', 10, 'Warm-up: Hanging scapular depressions and activations'),
            ('Light General Activation', 'duration', 60, 'Warm-up: Dynamic heart rate and CNS activation'),
        ],
        'cooldown': [
            ('Lat Stretch', 'duration', 30, 'Cool-down: Hanging or bar-assisted latissimus dorsi stretch'),
            ('Cross-Body Shoulder Stretch', 'duration', 30, 'Cool-down: Cross-body posterior capsule and deltoid stretch'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
            ('Shoulder Stretch', 'duration', 30, 'Cool-down: Overhead and posterior shoulder stretch'),
            ('Wrist/Forearm Stretch', 'duration', 30, 'Cool-down: Wall-supported wrist and forearm elongation'),
        ]
    },
    'Legs A': {
        'warmup': [
            ('Ankle Circles', 'duration', 30, 'Warm-up: Controlled circular ankle rotations'),
            ('Leg Swings', 'duration', 30, 'Warm-up: Dynamic forward/backward & lateral hip swings'),
            ('Deep Squat Hold', 'duration', 30, 'Warm-up: Deep bodyweight squat hold with upright chest'),
            ('Bodyweight Squats', 'reps', 10, 'Warm-up: Smooth bodyweight squats to prime hip & knee mechanics'),
            ('Hip 90/90 Transitions', 'duration', 30, 'Warm-up: Dynamic internal/external hip rotation switches'),
        ],
        'cooldown': [
            ('Hip Flexor Stretch', 'duration', 30, 'Cool-down: Kneeling lunge for psoas and rectus femoris elongation'),
            ('Hamstring Stretch', 'duration', 30, 'Cool-down: Seated or standing single-leg hamstring stretch'),
            ('Pigeon Pose', 'duration', 30, 'Cool-down: Deep gluteus medius/piriformis opening'),
            ('Standing Calf Stretch', 'duration', 30, 'Cool-down: Wall-assisted gastrocnemius & soleus stretch'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
        ]
    },
    'Legs B': {
        'warmup': [
            ('Ankle Circles', 'duration', 30, 'Warm-up: Controlled circular ankle rotations'),
            ('Leg Swings', 'duration', 30, 'Warm-up: Dynamic forward/backward & lateral hip swings'),
            ('Deep Squat Hold', 'duration', 30, 'Warm-up: Deep bodyweight squat hold with upright chest'),
            ('Bodyweight Squats', 'reps', 10, 'Warm-up: Smooth bodyweight squats to prime hip & knee mechanics'),
            ('Hip 90/90 Transitions', 'duration', 30, 'Warm-up: Dynamic internal/external hip rotation switches'),
        ],
        'cooldown': [
            ('Hip Flexor Stretch', 'duration', 30, 'Cool-down: Kneeling lunge for psoas and rectus femoris elongation'),
            ('Hamstring Stretch', 'duration', 30, 'Cool-down: Seated or standing single-leg hamstring stretch'),
            ('Pigeon Pose', 'duration', 30, 'Cool-down: Deep gluteus medius/piriformis opening'),
            ('Standing Calf Stretch', 'duration', 30, 'Cool-down: Wall-assisted gastrocnemius & soleus stretch'),
            ('Child\'s Pose', 'duration', 30, 'Cool-down: Kneeling spinal decompression and breathing'),
        ]
    }
}

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def reseed_data(force=False):
    """Clear exercises/routine_levels/level_exercises and repopulate with _SEED.
    Logs are NOT touched. Idempotent: checks seed version stored in DB first unless force=True."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA foreign_keys = OFF')  # allow truncation with FKs

        # Use meta table as a key-value store for the seed version tag.
        cursor.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        row = cursor.execute("SELECT value FROM meta WHERE key = 'seed_version'").fetchone()
        if not force and row and row['value'] == _SEED_VERSION:
            return  # already at current seed — skip

        # ── Clear dependent tables in safe order ──────────────────────────────────
        cursor.execute('DELETE FROM level_exercises')
        cursor.execute('DELETE FROM routine_levels')
        cursor.execute('DELETE FROM weekly_schedules')
        cursor.execute('DELETE FROM workout_exercises')
        cursor.execute('DELETE FROM workouts')
        cursor.execute('DELETE FROM training_splits')
        cursor.execute('DELETE FROM exercises')
        # Reset autoincrement counters so IDs start fresh
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('exercises','routine_levels','level_exercises','training_splits','workouts','weekly_schedules','workout_exercises')")

        # ── Insert exercises (deduplicate by name — Push B reuses some from Push A) ─
        ex_id_by_name = {}
        for routine_name, exercises in _SEED:
            for (name, ex_type, sets, reps, dur, rest, notes) in exercises:
                if name not in ex_id_by_name:
                    pattern = EXERCISE_MOVEMENT_PATTERNS.get(name)
                    if not pattern:
                        if 'Push' in routine_name:
                            pattern = 'push_horizontal'
                        elif 'Pull' in routine_name:
                            pattern = 'pull_vertical'
                        elif 'Leg' in routine_name:
                            pattern = 'squat'
                        else:
                            pattern = 'push_horizontal'
                    cursor.execute(
                        'INSERT INTO exercises (name, day, type, movement_pattern) VALUES (?, ?, ?, ?)',
                        (name, routine_name, ex_type, pattern)
                    )
                    ex_id_by_name[name] = cursor.lastrowid

        # ── Ensure mobility and stretching exercises exist in catalog ─────────────
        _ensure_warmup_cooldown_exercises(conn)

        # Build full catalog map
        all_ex_rows = cursor.execute('SELECT id, name FROM exercises').fetchall()
        for r in all_ex_rows:
            ex_id_by_name[r['name']] = r['id']

        # ── Insert routine_levels and level_exercises (legacy compatibility) ───────
        for routine_name, exercises in _SEED:
            cursor.execute(
                'INSERT INTO routine_levels (routine_name, level) VALUES (?, 1)',
                (routine_name,)
            )
            rl_id = cursor.lastrowid
            for idx, (name, ex_type, sets, reps, dur, rest, notes) in enumerate(exercises, start=1):
                ex_id = ex_id_by_name[name]
                cursor.execute(
                    '''INSERT INTO level_exercises
                           (routine_level_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)''',
                    (rl_id, ex_id, idx, sets, reps, dur, rest, notes)
                )

        # ── Insert Reusable Workouts & Workout Exercises (Custom Split Model with Warm-up + Cool-down) ───
        workout_ids = {}
        for workout_name, main_exercises in _SEED:
            cursor.execute(
                'INSERT INTO workouts (name, description) VALUES (?, ?)',
                (workout_name, f'Standard {workout_name} workout routine')
            )
            w_id = cursor.lastrowid
            workout_ids[workout_name] = w_id

            order_idx = 1
            # 1. Warm-up Phase
            phases = DEFAULT_WORKOUT_PHASES.get(workout_name, {})
            for (w_name, w_type, w_val, w_notes) in phases.get('warmup', []):
                ex_id = ex_id_by_name.get(w_name)
                if ex_id:
                    is_dur = w_type == 'duration'
                    cursor.execute('''
                        INSERT INTO workout_exercises
                            (workout_id, exercise_id, order_index, sets, reps, duration_sec, tempo, rest_sec, superset_group, notes, phase)
                        VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'warmup')
                    ''', (w_id, ex_id, order_idx, None if is_dur else w_val, w_val if is_dur else None, w_notes))
                    order_idx += 1

            # 2. Main Training Phase
            for (name, ex_type, sets, reps, dur, rest, notes) in main_exercises:
                ex_id = ex_id_by_name[name]
                cursor.execute(
                    '''INSERT INTO workout_exercises
                           (workout_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes, phase)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 'main')''',
                    (w_id, ex_id, order_idx, sets, reps, dur, rest, notes)
                )
                order_idx += 1

            # 3. Cool-down Phase
            for (c_name, c_type, c_val, c_notes) in phases.get('cooldown', []):
                ex_id = ex_id_by_name.get(c_name)
                if ex_id:
                    is_dur = c_type == 'duration'
                    cursor.execute('''
                        INSERT INTO workout_exercises
                            (workout_id, exercise_id, order_index, sets, reps, duration_sec, tempo, rest_sec, superset_group, notes, phase)
                        VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'cooldown')
                    ''', (w_id, ex_id, order_idx, None if is_dur else c_val, c_val if is_dur else None, c_notes))
                    order_idx += 1

        # ── Insert Default Training Split: Pure PPL A/B + Daily Core ───────────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES ('Push Pull Legs (PPL) — Pure A/B + Daily Core', '6 days training, 1 rest — Push A → Pull A → Legs A → Push B → Pull B → Legs B → Rest', 1)'''
        )
        split_id = cursor.lastrowid

        # 7-day schedule: Mon=Push A, Tue=Pull A, Wed=Legs A, Thu=Push B, Fri=Pull B, Sat=Legs B, Sun=Rest
        schedule_map = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs A')),
            (3, 'workout', workout_ids.get('Push B')),
            (4, 'workout', workout_ids.get('Pull B')),
            (5, 'workout', workout_ids.get('Legs B')),
            (6, 'rest', None),
        ]
        for day_idx, day_type, w_id in schedule_map:
            cursor.execute(
                '''INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                   VALUES (?, ?, ?, ?)''',
                (split_id, day_idx, day_type, w_id)
            )

        # ── Ensure mobility and stretching exercises exist in catalog ─────────────
        _ensure_warmup_cooldown_exercises(conn)

        # ── Stamp seed version ────────────────────────────────────────────────────
        cursor.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_version', ?)",
            (_SEED_VERSION,)
        )

        cursor.execute('PRAGMA foreign_keys = ON')
        conn.commit()


# Always run init_db — all statements use CREATE TABLE IF NOT EXISTS,
# so this is safe against an already-initialised DB and picks up new tables
# without requiring a manual migration step.
init_db()
reseed_data()


# ── Root status endpoint ───────────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def root_status():
    """Root endpoint showing API status and available endpoints."""
    return jsonify({
        'service': 'CalistheniX REST API',
        'status': 'online',
        'version': '2.0.0',
        'endpoints': {
            'today': '/today',
            'splits': '/splits',
            'workouts': '/workouts',
            'exercises': '/exercises',
            'workout_sessions': '/workout_sessions',
            'dashboard_summary': '/dashboard/summary',
            'dashboard_records': '/dashboard/records',
            'dashboard_activity': '/dashboard/activity',
            'export': '/export',
            'frontend_ui': 'http://localhost:8080'
        }
    }), 200


if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=Config.PORT)
