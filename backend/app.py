"""
CalistheniX — Flask Application Factory

Responsibilities (and only these):
  - Create and configure the Flask app instance
  - Register all route blueprints
  - Define + call init_db() and reseed_data() on startup
  - Provide the root status endpoint

All heavy data constants live in backend/data/.
All migration helpers live in backend/migrations.py.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS

try:
    from backend.config import Config
    from backend.db import get_db, DB_PATH
    from backend.migrations import run_all_migrations
    from backend.data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
    from backend.data.seed_data import (
        SEED, SEED_VERSION, WARMUP_COOLDOWN_EXERCISES, DEFAULT_WORKOUT_PHASES
    )
    from backend.routes.splits import splits_bp
    from backend.routes.workouts import workouts_bp
    from backend.routes.exercises import exercises_bp
    from backend.routes.sessions import sessions_bp
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.backup import backup_bp
    from backend.routes.legacy import legacy_bp
except ImportError:
    from config import Config
    from db import get_db, DB_PATH
    from migrations import run_all_migrations
    from data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
    from data.seed_data import (
        SEED, SEED_VERSION, WARMUP_COOLDOWN_EXERCISES, DEFAULT_WORKOUT_PHASES
    )
    from routes.splits import splits_bp
    from routes.workouts import workouts_bp
    from routes.exercises import exercises_bp
    from routes.sessions import sessions_bp
    from routes.dashboard import dashboard_bp
    from routes.backup import backup_bp
    from routes.legacy import legacy_bp


# ── Keep the old public name so any code that does
#    `from backend.app import EXERCISE_MOVEMENT_PATTERNS` keeps working.
_SEED_VERSION = SEED_VERSION
_SEED = SEED


def create_app(config_class=Config):
    """Application factory — creates and configures the Flask app instance."""
    flask_app = Flask(__name__)
    if isinstance(config_class, type) or hasattr(config_class, '__dict__'):
        flask_app.config.from_object(config_class)
    elif isinstance(config_class, dict):
        flask_app.config.from_mapping(config_class)

    cors_origins = flask_app.config.get('CORS_ORIGINS', '*')
    CORS(flask_app, resources={r"/*": {"origins": cors_origins}})

    # Register Route Blueprints (both standard paths and /api prefixes)
    flask_app.register_blueprint(splits_bp)
    flask_app.register_blueprint(workouts_bp)
    flask_app.register_blueprint(exercises_bp)
    flask_app.register_blueprint(sessions_bp)
    flask_app.register_blueprint(dashboard_bp)
    flask_app.register_blueprint(backup_bp)
    flask_app.register_blueprint(legacy_bp)   # deprecated but still served

    # Register API-prefixed routes for REST client compatibility
    flask_app.register_blueprint(splits_bp, url_prefix='/api', name='api_splits')
    flask_app.register_blueprint(workouts_bp, url_prefix='/api', name='api_workouts')
    flask_app.register_blueprint(exercises_bp, url_prefix='/api', name='api_exercises')
    flask_app.register_blueprint(sessions_bp, url_prefix='/api', name='api_sessions')
    flask_app.register_blueprint(dashboard_bp, url_prefix='/api', name='api_dashboard')
    flask_app.register_blueprint(backup_bp, url_prefix='/api', name='api_backup')
    flask_app.register_blueprint(legacy_bp, url_prefix='/api', name='api_legacy')

    return flask_app


# Default application instance (used by tests and the dev server below)
app = create_app()


# ── Database initialisation ────────────────────────────────────────────────────

def init_db():
    """Create all tables (idempotent — uses CREATE TABLE IF NOT EXISTS) then run migrations."""
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

        # ── Routine / level tables (legacy — kept for backward compat) ───────────

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS routine_levels (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            routine_name  TEXT    NOT NULL,
            level         INTEGER NOT NULL,
            UNIQUE(routine_name, level)
        )
        ''')

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

        # ── Workout Sessions ──────────────────────────────────────────────────────
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

        # ── Custom Training Splits & Weekly Schedules ─────────────────────────────
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

        # ── Performance Indexes ───────────────────────────────────────────────────
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_exercise_timestamp ON logs(exercise_id, timestamp DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_session_uuid ON logs(session_uuid)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON workout_sessions(started_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON workout_sessions(completed_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id, order_index)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_weekly_schedules_split_day ON weekly_schedules(split_id, day_of_week)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_level_exercises_level ON level_exercises(routine_level_id, order_index)')

        conn.commit()

    # Run column migrations (all idempotent)
    run_all_migrations()
    # Ensure warmup & cooldown mobility/stretch exercises are present in catalog.
    _ensure_warmup_cooldown_exercises()


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
        name, ex_type, default_val, pattern = item[0], item[1], item[2], item[3]
        existing = cursor.execute('SELECT id FROM exercises WHERE name = ?', (name,)).fetchone()
        if not existing:
            dur  = default_val if ex_type == 'duration' else None
            reps = default_val if ex_type == 'reps' else None
            cursor.execute(
                '''INSERT INTO exercises
                       (name, day, type, movement_pattern, progression_target_reps, progression_target_duration)
                   VALUES (?, 'Mobility & Stretching', ?, ?, ?, ?)''',
                (name, ex_type, pattern, reps, dur)
            )


def reseed_data(force=False):
    """Clear exercises/routine_levels/level_exercises and repopulate with SEED data.
    Logs are NOT touched. Idempotent: checks seed version stored in DB first unless force=True."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA foreign_keys = OFF')

        cursor.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        row = cursor.execute("SELECT value FROM meta WHERE key = 'seed_version'").fetchone()
        if not force and row and row['value'] == SEED_VERSION:
            cursor.execute('PRAGMA foreign_keys = ON')
            return  # already at current seed — skip

        # ── Clear dependent tables in safe order ──────────────────────────────────
        for tbl in ['level_exercises', 'routine_levels', 'weekly_schedules',
                    'workout_exercises', 'workouts', 'training_splits', 'exercises']:
            cursor.execute(f'DELETE FROM {tbl}')
        cursor.execute(
            "DELETE FROM sqlite_sequence WHERE name IN "
            "('exercises','routine_levels','level_exercises','training_splits',"
            "'workouts','weekly_schedules','workout_exercises')"
        )

        # ── Insert exercises (deduplicate by name) ─────────────────────────────────
        ex_id_by_name = {}
        for routine_name, exercises in SEED:
            for (name, ex_type, sets, reps, dur, rest, notes) in exercises:
                if name not in ex_id_by_name:
                    pattern = EXERCISE_MOVEMENT_PATTERNS.get(name)
                    if not pattern:
                        if 'Push' in routine_name:   pattern = 'push_horizontal'
                        elif 'Pull' in routine_name: pattern = 'pull_vertical'
                        elif 'Leg' in routine_name:  pattern = 'squat'
                        else:                         pattern = 'push_horizontal'
                    cursor.execute(
                        'INSERT INTO exercises (name, day, type, movement_pattern) VALUES (?, ?, ?, ?)',
                        (name, routine_name, ex_type, pattern)
                    )
                    ex_id_by_name[name] = cursor.lastrowid

        # ── Ensure mobility and stretching exercises exist ────────────────────────
        _ensure_warmup_cooldown_exercises(conn)
        for r in cursor.execute('SELECT id, name FROM exercises').fetchall():
            ex_id_by_name[r['name']] = r['id']

        # ── Insert routine_levels and level_exercises (legacy compat) ─────────────
        for routine_name, exercises in SEED:
            cursor.execute(
                'INSERT INTO routine_levels (routine_name, level) VALUES (?, 1)',
                (routine_name,)
            )
            rl_id = cursor.lastrowid
            for idx, (name, ex_type, sets, reps, dur, rest, notes) in enumerate(exercises, start=1):
                cursor.execute(
                    '''INSERT INTO level_exercises
                           (routine_level_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)''',
                    (rl_id, ex_id_by_name[name], idx, sets, reps, dur, rest, notes)
                )

        # ── Insert Reusable Workouts with warmup / main / cooldown phases ─────────
        workout_ids = {}
        for workout_name, main_exercises in SEED:
            cursor.execute(
                'INSERT INTO workouts (name, description) VALUES (?, ?)',
                (workout_name, f'Standard {workout_name} workout routine')
            )
            w_id = cursor.lastrowid
            workout_ids[workout_name] = w_id

            order_idx = 1
            phases = DEFAULT_WORKOUT_PHASES.get(workout_name, {})

            for (w_name, w_type, w_val, w_notes) in phases.get('warmup', []):
                ex_id = ex_id_by_name.get(w_name)
                if ex_id:
                    is_dur = w_type == 'duration'
                    cursor.execute(
                        '''INSERT INTO workout_exercises
                               (workout_id, exercise_id, order_index, sets, reps, duration_sec,
                                tempo, rest_sec, superset_group, notes, phase)
                           VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'warmup')''',
                        (w_id, ex_id, order_idx, None if is_dur else w_val, w_val if is_dur else None, w_notes)
                    )
                    order_idx += 1

            for (name, ex_type, sets, reps, dur, rest, notes) in main_exercises:
                cursor.execute(
                    '''INSERT INTO workout_exercises
                           (workout_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes, phase)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 'main')''',
                    (w_id, ex_id_by_name[name], order_idx, sets, reps, dur, rest, notes)
                )
                order_idx += 1

            for (c_name, c_type, c_val, c_notes) in phases.get('cooldown', []):
                ex_id = ex_id_by_name.get(c_name)
                if ex_id:
                    is_dur = c_type == 'duration'
                    cursor.execute(
                        '''INSERT INTO workout_exercises
                               (workout_id, exercise_id, order_index, sets, reps, duration_sec,
                                tempo, rest_sec, superset_group, notes, phase)
                           VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'cooldown')''',
                        (w_id, ex_id, order_idx, None if is_dur else c_val, c_val if is_dur else None, c_notes)
                    )
                    order_idx += 1

        # ── Default Training Split: 5-Day Aesthetic Physique Split (Active) ─────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES (?, ?, 1)''',
            (
                'Aesthetic Physique — 5-Day PPL Split',
                '2x Push, 2x Pull, 1x Legs (Combined). Core 5 days/week. 2 rest days (Push A → Pull A → Legs (Combined) → Push B → Pull B → Rest → Rest)'
            )
        )
        split_5day_id = cursor.lastrowid
        schedule_5day = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs (Combined)')),
            (3, 'workout', workout_ids.get('Push B')),
            (4, 'workout', workout_ids.get('Pull B')),
            (5, 'rest',    None),
            (6, 'rest',    None),
        ]
        for day_idx, day_type, w_id in schedule_5day:
            cursor.execute(
                'INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id) VALUES (?, ?, ?, ?)',
                (split_5day_id, day_idx, day_type, w_id)
            )

        # ── Secondary Training Split: Complete 6-Day PPL Plan ──────────────────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES (?, ?, 0)''',
            (
                'Aesthetic Physique — Complete PPL A/B Plan',
                '6 days training (Push A → Pull A → Legs A → Push B → Pull B → Legs B → Rest)'
            )
        )
        split_6day_id = cursor.lastrowid
        schedule_6day = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs A')),
            (3, 'workout', workout_ids.get('Push B')),
            (4, 'workout', workout_ids.get('Pull B')),
            (5, 'workout', workout_ids.get('Legs B')),
            (6, 'rest',    None),
        ]
        for day_idx, day_type, w_id in schedule_6day:
            cursor.execute(
                'INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id) VALUES (?, ?, ?, ?)',
                (split_6day_id, day_idx, day_type, w_id)
            )

        # ── Stamp seed version ────────────────────────────────────────────────────
        cursor.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_version', ?)",
            (SEED_VERSION,)
        )
        cursor.execute('PRAGMA foreign_keys = ON')
        conn.commit()


# ── Startup bootstrap ──────────────────────────────────────────────────────────
# All CREATE TABLE statements use IF NOT EXISTS — safe to run on every import.
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
            'today':              '/today',
            'splits':             '/splits',
            'workouts':           '/workouts',
            'exercises':          '/exercises',
            'workout_sessions':   '/workout_sessions',
            'dashboard_summary':  '/dashboard/summary',
            'dashboard_records':  '/dashboard/records',
            'dashboard_activity': '/dashboard/activity',
            'export':             '/export',
            'frontend_ui':        'http://localhost:8080'
        }
    }), 200


if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=Config.PORT)
