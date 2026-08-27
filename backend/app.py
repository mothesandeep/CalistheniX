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
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT NOT NULL,
            day              TEXT NOT NULL,
            type             TEXT NOT NULL,
            prerequisite_id  INTEGER,
            next_id          INTEGER,
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
            FOREIGN KEY(routine_level_id) REFERENCES routine_levels(id),
            FOREIGN KEY(exercise_id)      REFERENCES exercises(id)
        )
        ''')

        # ── Workout Sessions table (Phase 1 Foundation) ───────────────────────────
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS workout_sessions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            session_uuid   TEXT UNIQUE NOT NULL,
            routine_name   TEXT NOT NULL,
            level          INTEGER NOT NULL DEFAULT 1,
            started_at     DATETIME NOT NULL,
            completed_at   DATETIME,
            duration_sec   INTEGER DEFAULT 0,
            total_sets     INTEGER DEFAULT 0,
            completed_sets INTEGER DEFAULT 0,
            status         TEXT NOT NULL DEFAULT 'completed',
            raw_json       TEXT
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


# ── PPL A/B seed data ─────────────────────────────────────────────────────────
# Structured as a list of (routine_name, exercises_list) where each exercise is:
#   (name, ex_type, sets, reps_or_none, duration_sec_or_none, rest_sec, notes_or_none)
# All levels are 1 (no L1-L5 progression tiers in this plan).

_SEED_VERSION = 'custom-split-v1'  # bump to re-seed without deleting the DB

_SEED = [
    ('Push A', [
        ('Diamond Push-ups',      'reps',     4, 15, None, 90, 'Your strong point — track progress'),
        ('Wide Push-ups',         'reps',     3, 15, None, 90, 'Chest width'),
        ('Decline Push-ups',      'reps',     3, 12, None, 90, 'Upper chest, feet elevated'),
        ('Pike Push-ups',         'reps',     3, 10, None, 90, 'Front delt'),
        ('Triceps Dips',          'reps',     3, 15, None, 90, 'Arm definition'),
        ('Plank to Push-up',      'reps',     3, 10, None, 90, 'Core + shoulder stability'),
    ]),
    ('Push B', [
        ('Pike Push-ups Elevated',         'reps', 4, 12, None, 90, 'Side/front delt, feet elevated'),
        ('Handstand Push-up Progression',  'reps', 3,  8, None, 90, 'Wall-assisted, build carefully'),
        ('Diamond Push-ups',               'reps', 3, 12, None, 90, 'Triceps'),
        ('Archer Push-ups',                'reps', 3,  8, None, 90, 'Unilateral + chest detail'),
        ('Lateral Raise',                  'reps', 3, 15, None, 90, 'Water bottles, key for V-taper'),
        ('Triceps Dips',                   'reps', 3, 15, None, 90, None),
    ]),
    ('Pull A', [
        ('Dead Hang',          'duration', 2, None, 45, 90, 'Warm-up, grip + shoulder health'),
        ('Pull-ups Wide Grip', 'reps',     4,    6, None, 90, 'Primary width builder'),
        ('Chin-ups',           'reps',     3, None, None, 90, 'Bicep + lat'),
        ('Negative Pull-ups',  'reps',     3,    5, None, 90, 'Slow 5-sec descent, after max sets'),
        ('Scapular Pulls',     'reps',     3,   10, None, 90, 'Pull-up strength foundation'),
        ('Superman Hold',      'duration', 3, None, 20,  90, 'Lower back/posture'),
    ]),
    ('Pull B', [
        ('Pull-ups Close Grip', 'reps',     4, None, None, 90, 'Thickness focus'),
        ('Commando Pull-ups',   'reps',     3,    8, None, 90, 'Side-to-side, lat variation'),
        ('L-sit Hang',          'duration', 3, None, 20,  90, 'Or tucked knees; core + grip + shoulder'),
        ('Face Pulls',          'reps',     3,   15, None, 90, 'Band/towel-resisted, critical for posture, don\'t skip'),
        ('Prone Y-raises',      'reps',     3,   15, None, 90, 'Face down, arms in Y; rear delt + upper back'),
        ('Wall Angels',         'reps',     3,   12, None, 90, 'Posture correction drill'),
    ]),
    ('Legs A', [
        ('Bulgarian Split Squats',    'reps',     3, 12, None, 90, 'Chair support; quad + glute'),
        ('Walking Lunges',            'reps',     3, 16, None, 90, None),
        ('Glute Bridges Single Leg',  'reps',     3, 15, None, 90, 'Posterior chain'),
        ('Calf Raises',               'reps',     4, 20, None, 90, 'Slow tempo'),
        ('Hanging Knee Raises',       'reps',     3, 15, None, 90, 'Loft slab; core + hip flexor'),
        ('Plank',                     'duration', 3, None, 45, 90, None),
    ]),
    ('Legs B', [
        ('Pistol Squat Progression',      'reps',     3,  8, None, 90, 'Assisted/box; bottleneck exercise, priority'),
        ('Jump Squats',                   'reps',     3, 15, None, 90, 'Explosive/power element'),
        ('Single-leg Glute Bridge Hold',  'duration', 3, None, 20, 90, 'Isometric variation'),
        ('Wall Sit',                      'duration', 3, None, 40, 90, 'Quad endurance'),
        ('Hanging Leg Raises',            'reps',     3, 12, None, 90, 'Straight leg, loft slab; harder than knee raises'),
        ('Side Plank',                    'duration', 3, None, 30, 90, 'Obliques'),
    ]),
]

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def reseed_data():
    """Clear exercises/routine_levels/level_exercises and repopulate with _SEED.
    Logs are NOT touched. Idempotent: checks seed version stored in DB first."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA foreign_keys = OFF')  # allow truncation with FKs

        # Use meta table as a key-value store for the seed version tag.
        cursor.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        row = cursor.execute("SELECT value FROM meta WHERE key = 'seed_version'").fetchone()
        if row and row['value'] == _SEED_VERSION:
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
                    cursor.execute(
                        'INSERT INTO exercises (name, day, type) VALUES (?, ?, ?)',
                        (name, routine_name, ex_type)
                    )
                    ex_id_by_name[name] = cursor.lastrowid
                else:
                    # Exercise already inserted (shared across days).
                    pass

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

        # ── Insert Reusable Workouts & Workout Exercises (Custom Split Model) ───────
        workout_ids = {}
        for workout_name, exercises in _SEED:
            cursor.execute(
                'INSERT INTO workouts (name, description) VALUES (?, ?)',
                (workout_name, f'Standard {workout_name} workout routine')
            )
            w_id = cursor.lastrowid
            workout_ids[workout_name] = w_id
            for idx, (name, ex_type, sets, reps, dur, rest, notes) in enumerate(exercises, start=1):
                ex_id = ex_id_by_name[name]
                cursor.execute(
                    '''INSERT INTO workout_exercises
                           (workout_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)''',
                    (w_id, ex_id, idx, sets, reps, dur, rest, notes)
                )

        # ── Insert Default Training Split: Push Pull Legs (PPL) ───────────────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES ('Push Pull Legs (PPL)', 'Classic 6-day PPL cycle with mid-week rest', 1)'''
        )
        split_id = cursor.lastrowid

        # 7-day schedule: Mon=Push A, Tue=Pull A, Wed=Legs A, Thu=Rest, Fri=Push B, Sat=Pull B, Sun=Legs B
        schedule_map = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs A')),
            (3, 'rest', None),
            (4, 'workout', workout_ids.get('Push B')),
            (5, 'workout', workout_ids.get('Pull B')),
            (6, 'workout', workout_ids.get('Legs B')),
        ]
        for day_idx, day_type, w_id in schedule_map:
            cursor.execute(
                '''INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                   VALUES (?, ?, ?, ?)''',
                (split_id, day_idx, day_type, w_id)
            )

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
