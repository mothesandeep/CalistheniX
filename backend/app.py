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
except ImportError:
    from config import Config
    from db import get_db, get_db_connection, DB_PATH
    from utils import _parse_int
    from routes.splits import splits_bp
    from routes.workouts import workouts_bp
    from routes.exercises import exercises_bp


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


# ── Today Resolver Endpoint (Custom Split Model) ───────────────────────────────

@app.route('/today', methods=['GET'])
@app.route('/api/today-workout', methods=['GET'])
def get_today_resolved():
    """Resolve today's workout based on active training split and current day of week."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        now = datetime.now()
        day_of_week = now.weekday()  # 0=Monday .. 6=Sunday
        day_name = DAY_NAMES[day_of_week]

        if not active_split:
            return jsonify({
                'status': 'no_split',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'message': 'No training split configured'
            }), 200

        split_id = active_split['id']
        split_name = active_split['name']

        sched = conn.execute(
            'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
            (split_id, day_of_week)
        ).fetchone()

        if not sched or sched['day_type'] == 'rest' or not sched['workout_id']:
            # Search for next scheduled workout
            next_workout = None
            for offset in range(1, 8):
                next_day_idx = (day_of_week + offset) % 7
                next_sched = conn.execute(
                    'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
                    (split_id, next_day_idx)
                ).fetchone()
                if next_sched and next_sched['day_type'] == 'workout' and next_sched['workout_id']:
                    w = conn.execute('SELECT * FROM workouts WHERE id = ?', (next_sched['workout_id'],)).fetchone()
                    if w:
                        next_workout = {
                            'day_of_week': next_day_idx,
                            'day_name': DAY_NAMES[next_day_idx],
                            'workout_id': w['id'],
                            'workout_name': w['name']
                        }
                        break

            return jsonify({
                'status': 'rest',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'split_id': split_id,
                'split_name': split_name,
                'message': 'Rest Day — Recovery & Adaptations',
                'next_workout': next_workout
            }), 200

        workout_id = sched['workout_id']
        workout = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not workout:
            return jsonify({
                'status': 'rest',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'split_id': split_id,
                'split_name': split_name,
                'message': 'Assigned workout was not found',
                'next_workout': None
            }), 200

        rows = conn.execute('''
            SELECT we.*, e.name as exercise_name, e.type as exercise_type,
                   e.progression_target_reps, e.progression_target_duration
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.order_index ASC, we.id ASC
        ''', (workout_id,)).fetchall()

        exercises = []
        for r in rows:
            last_log = conn.execute('''
                SELECT reps, duration_sec, weight_kg, rpe, timestamp
                FROM logs
                WHERE exercise_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (r['exercise_id'],)).fetchone()

            exercises.append({
                'id': r['id'],
                'workout_id': r['workout_id'],
                'exercise_id': r['exercise_id'],
                'exercise_name': r['exercise_name'],
                'exercise_type': r['exercise_type'],
                'order_index': r['order_index'],
                'sets': r['sets'],
                'reps': r['reps'],
                'duration_sec': r['duration_sec'],
                'rest_sec': r['rest_sec'],
                'tempo': r['tempo'],
                'superset_group': r['superset_group'],
                'notes': r['notes'],
                'last_log': dict(last_log) if last_log else None
            })

        total_sets = sum(e['sets'] for e in exercises)

        return jsonify({
            'status': 'workout',
            'day_of_week': day_of_week,
            'day_name': day_name,
            'split_id': split_id,
            'split_name': split_name,
            'workout': {
                'id': workout['id'],
                'name': workout['name'],
                'description': workout['description'],
                'total_sets': total_sets,
                'exercises': exercises
            }
        }), 200


# ── Log endpoints ─────────────────────────────────────────────────────────────


@app.route('/exercises/<int:exercise_id>/logs', methods=['GET'])
def get_exercise_logs(exercise_id):
    """Return all raw log rows for one exercise, ordered by timestamp ascending
    (oldest first — convenient for trend charting on the client)."""
    with get_db() as conn:
        ex = conn.execute('SELECT id FROM exercises WHERE id = ?', (exercise_id,)).fetchone()
        if ex is None:
            return jsonify({'error': f'exercise {exercise_id} not found'}), 404

        rows = conn.execute(
            'SELECT * FROM logs WHERE exercise_id = ? ORDER BY timestamp ASC',
            (exercise_id,)
        ).fetchall()
        return jsonify([dict(r) for r in rows])


@app.route('/logs', methods=['POST'])
def create_log():
    """Persist a single log entry.

    Required fields: exercise_id, timestamp, client_uuid.
    Type-aware field requirement:
      - exercises.type = 'reps'     → reps must be provided
      - exercises.type = 'duration' → duration_sec must be provided
    client_uuid is UNIQUE — duplicate submissions are silently ignored
    and the existing row is returned (idempotent offline-sync replay).
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['exercise_id', 'timestamp', 'client_uuid']
    missing  = [f for f in required if not body.get(f)]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    with get_db() as conn:
        # Look up exercise to enforce type-aware field requirement
        ex = conn.execute(
            'SELECT type FROM exercises WHERE id = ?', (body['exercise_id'],)
        ).fetchone()
        if ex is None:
            return jsonify({'error': f"exercise {body['exercise_id']} not found"}), 404

        ex_type = ex['type']
        if ex_type == 'duration' and body.get('duration_sec') is None:
            return jsonify({'error': 'duration_sec is required for duration-type exercises'}), 400
        if ex_type == 'reps' and body.get('reps') is None:
            return jsonify({'error': 'reps is required for reps-type exercises'}), 400

        try:
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT INTO logs
                       (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    body['exercise_id'],
                    body['timestamp'],
                    body.get('reps'),
                    body.get('weight_kg'),
                    body.get('duration_sec'),
                    body.get('rpe'),
                    body['client_uuid'],
                    body.get('session_uuid')
                )
            )
            conn.commit()
            new_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            # client_uuid already exists — silent no-op, return existing row
            row = conn.execute(
                'SELECT * FROM logs WHERE client_uuid = ?', (body['client_uuid'],)
            ).fetchone()
            return jsonify(dict(row)), 200

        row = conn.execute('SELECT * FROM logs WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


@app.route('/export', methods=['GET'])
def export_all_logs():
    """Full JSON dump of all workout_sessions, logs, and exercise catalogs.
    This is the backup safety net — comprehensive and versioned."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                l.id,
                l.client_uuid,
                l.session_uuid,
                l.timestamp,
                l.reps,
                l.weight_kg,
                l.duration_sec,
                l.rpe,
                e.id          AS exercise_id,
                e.name        AS exercise_name,
                e.type        AS exercise_type,
                e.day         AS exercise_day
            FROM   logs l
            JOIN   exercises e ON e.id = l.exercise_id
            ORDER  BY l.timestamp ASC
            '''
        ).fetchall()

        sessions = conn.execute(
            'SELECT * FROM workout_sessions ORDER BY completed_at ASC'
        ).fetchall()

        exercises = conn.execute(
            'SELECT * FROM exercises ORDER BY id ASC'
        ).fetchall()

        splits = conn.execute('SELECT * FROM training_splits ORDER BY id ASC').fetchall()
        schedules = conn.execute('SELECT * FROM weekly_schedules ORDER BY split_id ASC, day_of_week ASC').fetchall()
        workouts = conn.execute('SELECT * FROM workouts ORDER BY id ASC').fetchall()
        workout_exercises = conn.execute('SELECT * FROM workout_exercises ORDER BY workout_id ASC, order_index ASC').fetchall()

        if request.args.get('format') == 'legacy':
            return jsonify([dict(r) for r in rows]), 200

        return jsonify({
            'export_version': '2.1',
            'exported_at': datetime.now(timezone.utc).isoformat(),
            'logs': [dict(r) for r in rows],
            'workout_sessions': [dict(s) for s in sessions],
            'exercises': [dict(e) for e in exercises],
            'training_splits': [dict(s) for s in splits],
            'weekly_schedules': [dict(ws) for ws in schedules],
            'workouts': [dict(w) for w in workouts],
            'workout_exercises': [dict(we) for we in workout_exercises]
        }), 200


# ── Dashboard aggregation helpers ────────────────────────────────────────────

def compute_exercise_progress(ex_type, logs):
    """Group raw log rows by calendar day and compute daily progress metric."""
    if not logs:
        return []

    by_date = {}
    for log in logs:
        ts = log.get('timestamp') or ''
        date_str = str(ts)[:10]
        if not date_str:
            continue
        if date_str not in by_date:
            by_date[date_str] = []
        by_date[date_str].append(log)

    sorted_dates = sorted(by_date.keys())
    points = []
    for d in sorted_dates:
        day_logs = by_date[d]
        if ex_type == 'duration':
            metric = max((l.get('duration_sec') or 0) for l in day_logs)
        else:
            metric = sum(
                ((l.get('reps') or 0) * l['weight_kg']) if l.get('weight_kg') else (l.get('reps') or 0)
                for l in day_logs
            )
        points.append({'date': d, 'metric': metric})
    return points


def compute_exercise_stats(points, today):
    """Compute current, 2wk_ago, and pct_change for an exercise.
    Requires at least 2 logged sessions in the last 2 weeks (or comparing against <= 14d ago)."""
    if not points or len(points) < 2:
        return None

    cutoff_14 = (today - timedelta(days=14)).isoformat()
    points_in_2wk = [p for p in points if p['date'] >= cutoff_14]
    past_points = [p for p in points if p['date'] <= cutoff_14]

    if past_points:
        past = past_points[-1]['metric']
    elif len(points_in_2wk) >= 2:
        past = points_in_2wk[0]['metric']
    else:
        return None

    current = points[-1]['metric']

    if past is not None and past > 0:
        pct = round((current - past) / past * 100)
        return {
            'current': current,
            'past': past,
            'pct': pct
        }
    return None


@app.route('/dashboard/summary', methods=['GET'])
@app.route('/api/stats-summary', methods=['GET'])
def get_dashboard_summary():
    """Return summary statistics for the dashboard view."""
    with get_db() as conn:
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()
        sessions = conn.execute("SELECT * FROM workout_sessions WHERE status = 'completed' ORDER BY completed_at ASC").fetchall()

    logs_list = [dict(r) for r in logs]
    sessions_list = [dict(r) for r in sessions]
    ex_map = {e['id']: dict(e) for e in exercises}

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()
    today_str_utc = today_utc.isoformat()
    today_str_local = today_local.isoformat()

    # Collect all distinct dates with at least one log or completed workout session
    logged_dates = set()
    for l in logs_list:
        ts = str(l.get('timestamp') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    for s in sessions_list:
        ts = str(s.get('completed_at') or s.get('started_at') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    # Choose anchor date for today (match local or UTC if logged today)
    if today_str_local in logged_dates:
        today = today_local
    elif today_str_utc in logged_dates:
        today = today_utc
    else:
        today = today_local
    today_str = today.isoformat()

    # 1. streak_days: count consecutive calendar days with >=1 log or session entry.
    # If athlete logged today, count backwards from today; if not yet today, count from yesterday.
    streak_days = 0
    if today_str in logged_dates or today_str_utc in logged_dates or today_str_local in logged_dates:
        curr = today
        while curr.isoformat() in logged_dates:
            streak_days += 1
            curr -= timedelta(days=1)
    else:
        yesterday_local = today_local - timedelta(days=1)
        yesterday_utc = today_utc - timedelta(days=1)
        if yesterday_local.isoformat() in logged_dates:
            curr = yesterday_local
            while curr.isoformat() in logged_dates:
                streak_days += 1
                curr -= timedelta(days=1)
        elif yesterday_utc.isoformat() in logged_dates:
            curr = yesterday_utc
            while curr.isoformat() in logged_dates:
                streak_days += 1
                curr -= timedelta(days=1)

    # 2. week_sessions: count distinct calendar days with >=1 log/session in last 7 days (today - 6 days to today)
    cutoff_7 = (today - timedelta(days=6)).isoformat()
    week_sessions = len([d for d in logged_dates if cutoff_7 <= d <= max(today_str, today_str_utc, today_str_local)])

    # 3. week_sets: total count of completed sets from logs and workout_sessions in last 7 days
    max_today_str = max(today_str, today_str_utc, today_str_local)
    week_sets_logs = sum(1 for l in logs_list if cutoff_7 <= str(l.get('timestamp') or '')[:10] <= max_today_str)
    week_sets_sessions = sum(int(s.get('completed_sets') or s.get('total_sets') or 0) for s in sessions_list if cutoff_7 <= str(s.get('completed_at') or s.get('started_at') or '')[:10] <= max_today_str)
    week_sets = max(week_sets_logs, week_sets_sessions, week_sets_logs + week_sets_sessions)

    # 4. top_movers: array of up to 3 objects { exercise_id, exercise_name, metric_current, metric_2wk_ago, pct_change }
    logs_by_ex = {}
    for l in logs_list:
        eid = l['exercise_id']
        if eid not in logs_by_ex:
            logs_by_ex[eid] = []
        logs_by_ex[eid].append(l)

    movers = []
    for eid, ex_logs in logs_by_ex.items():
        ex = ex_map.get(eid)
        if not ex:
            continue
        points = compute_exercise_progress(ex['type'], ex_logs)
        stats = compute_exercise_stats(points, today)
        if stats and stats['pct'] is not None:
            movers.append({
                'exercise_id': eid,
                'exercise_name': ex['name'],
                'metric_current': stats['current'],
                'metric_2wk_ago': stats['past'],
                'pct_change': stats['pct']
            })

    # Sort by absolute pct_change descending
    movers.sort(key=lambda m: abs(m['pct_change']), reverse=True)
    top_movers = movers[:3]

    return jsonify({
        'streak_days': streak_days,
        'week_sessions': week_sessions,
        'week_sets': week_sets,
        'top_movers': top_movers
    })


@app.route('/api/weekly-progress', methods=['GET'])
def get_weekly_progress():
    """Return weekly workout completion and 7-day status."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        schedule = []
        if active_split:
            rows = conn.execute(
                '''
                SELECT s.day_of_week, s.day_type, s.workout_id, w.name as workout_name
                FROM weekly_schedules s
                LEFT JOIN workouts w ON s.workout_id = w.id
                WHERE s.split_id = ?
                ORDER BY s.day_of_week ASC
                ''', (active_split['id'],)
            ).fetchall()
            schedule = [dict(r) for r in rows]

        planned_count = len([d for d in schedule if d.get('day_type') == 'workout']) or 4
        today = datetime.now(timezone.utc).date()
        cutoff_7 = (today - timedelta(days=6)).isoformat()
        logs = conn.execute(
            'SELECT DISTINCT SUBSTR(timestamp, 1, 10) as dt FROM logs WHERE timestamp >= ?',
            (cutoff_7,)
        ).fetchall()
        done_count = len(logs)
        pct = min(100, int((done_count / max(1, planned_count)) * 100))

        return jsonify({
            'planned_workouts': planned_count,
            'completed_workouts': done_count,
            'completion_pct': pct,
            'schedule': schedule
        })


@app.route('/api/muscle-focus', methods=['GET'])
def get_muscle_focus():
    """Return muscle targets for today's resolved workout."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        day_of_week = datetime.now().weekday()
        if not active_split:
            return jsonify({'muscle_label': 'Full Body Mobility', 'front': ['abs', 'quads'], 'back': ['glutes', 'calves']})

        sched = conn.execute(
            'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
            (active_split['id'], day_of_week)
        ).fetchone()

        if not sched or sched['day_type'] == 'rest' or not sched['workout_id']:
            return jsonify({'muscle_label': 'Active Recovery & Mobility', 'front': ['abs'], 'back': ['lower_back', 'calves']})

        workout = conn.execute('SELECT * FROM workouts WHERE id = ?', (sched['workout_id'],)).fetchone()
        desc = workout['description'] if workout else ''
        name = workout['name'] if workout else ''
        text = f"{name} {desc}".lower()

        front = []
        back = []
        labels = []
        if any(w in text for w in ['push', 'dip', 'press', 'chest']):
            front.extend(['chest', 'shoulders', 'triceps', 'abs'])
            labels.append('Chest, Shoulders, Triceps')
        if any(w in text for w in ['pull', 'chin', 'row', 'back', 'lever']):
            back.extend(['lats', 'upper_back', 'biceps'])
            front.append('biceps')
            labels.append('Back, Biceps, Lats')
        if any(w in text for w in ['leg', 'squat', 'lunge', 'calf']):
            front.append('quads')
            back.extend(['glutes', 'hamstrings', 'calves'])
            labels.append('Legs, Glutes, Calves')

        if not labels:
            labels.append('Full Body Conditioning')
            front.extend(['chest', 'abs', 'shoulders'])
            back.extend(['upper_back', 'lats'])

        return jsonify({
            'workout_name': name,
            'muscle_label': ', '.join(labels),
            'front': list(set(front)),
            'back': list(set(back))
        })


@app.route('/api/exercise-progress', methods=['GET'])
def get_exercise_progress_api():
    """Return top mover progressions for the dashboard."""
    with get_db() as conn:
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()

    logs_list = [dict(r) for r in logs]
    ex_map = {e['id']: dict(e) for e in exercises}
    today = datetime.now(timezone.utc).date()

    logs_by_ex = {}
    for l in logs_list:
        eid = l['exercise_id']
        logs_by_ex.setdefault(eid, []).append(l)

    movers = []
    for eid, ex_logs in logs_by_ex.items():
        ex = ex_map.get(eid)
        if not ex:
            continue
        points = compute_exercise_progress(ex['type'], ex_logs)
        stats = compute_exercise_stats(points, today)
        if stats and stats['pct'] is not None:
            movers.append({
                'exercise_id': eid,
                'exercise_name': ex['name'],
                'current_reps': stats['current'],
                'past_reps': stats['past'],
                'pct_change': stats['pct']
            })

    movers.sort(key=lambda m: abs(m['pct_change']), reverse=True)
    return jsonify(movers[:4])


@app.route('/api/upcoming-workouts', methods=['GET'])
def get_upcoming_workouts():
    """Return next 3 days of workouts from active split."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        if not active_split:
            return jsonify([])

        today_dow = datetime.now().weekday()
        upcoming = []
        for offset in range(1, 4):
            day_idx = (today_dow + offset) % 7
            sched = conn.execute(
                '''
                SELECT s.day_of_week, s.day_type, s.workout_id, w.name as workout_name, w.description as workout_desc
                FROM weekly_schedules s
                LEFT JOIN workouts w ON s.workout_id = w.id
                WHERE s.split_id = ? AND s.day_of_week = ?
                ''', (active_split['id'], day_idx)
            ).fetchone()

            is_workout = sched and sched['day_type'] == 'workout' and sched['workout_id']
            upcoming.append({
                'day_offset': offset,
                'day_of_week': day_idx,
                'day_name': DAY_NAMES[day_idx],
                'is_workout': bool(is_workout),
                'workout_id': sched['workout_id'] if is_workout else None,
                'workout_name': sched['workout_name'] if is_workout else 'Rest & Recovery',
                'description': sched['workout_desc'] if is_workout else 'Active Recovery & Mobility'
            })

        return jsonify(upcoming)


@app.route('/import', methods=['POST'])
def import_logs():
    """Import and merge a JSON backup dump.
    Idempotent: uses client_uuid and session_uuid to skip already-existing entries.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    if isinstance(body, list):
        log_items = body
        session_items = []
    elif isinstance(body, dict):
        log_items = body.get('logs', [])
        session_items = body.get('workout_sessions', [])
    else:
        return jsonify({'error': 'Expected a JSON object or array'}), 400

    if not isinstance(log_items, list) or not isinstance(session_items, list):
        return jsonify({'error': 'Invalid backup format'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        imported_logs = 0
        skipped_logs = 0
        imported_sessions = 0
        skipped_sessions = 0

        # 1. Import workout sessions
        for s in session_items:
            if not isinstance(s, dict):
                continue
            sess_uuid = s.get('session_uuid') or s.get('id')
            routine_name = s.get('routine_name') or s.get('routine')
            started_at = s.get('started_at') or s.get('startTime')
            if not sess_uuid or not routine_name or not started_at:
                continue
            try:
                cursor.execute(
                    '''
                    INSERT INTO workout_sessions
                        (session_uuid, routine_name, level, started_at, completed_at, duration_sec, total_sets, completed_sets, status, raw_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        sess_uuid,
                        routine_name,
                        s.get('level', 1),
                        str(started_at),
                        str(s.get('completed_at') or started_at),
                        s.get('duration_sec', 0),
                        s.get('total_sets', 0),
                        s.get('completed_sets', 0),
                        s.get('status', 'completed'),
                        s.get('raw_json') or json.dumps(s)
                    )
                )
                imported_sessions += 1
            except sqlite3.IntegrityError:
                skipped_sessions += 1

        # 2. Import log entries
        for item in log_items:
            if not isinstance(item, dict):
                continue
            ex_id = item.get('exercise_id')
            ts = item.get('timestamp')
            uuid_str = item.get('client_uuid') or item.get('uuid')
            session_uuid = item.get('session_uuid')

            if not ex_id or not ts or not uuid_str:
                continue

            try:
                cursor.execute(
                    '''INSERT INTO logs (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (
                        ex_id,
                        ts,
                        item.get('reps'),
                        item.get('weight_kg'),
                        item.get('duration_sec'),
                        item.get('rpe'),
                        uuid_str,
                        session_uuid
                    )
                )
                imported_logs += 1
            except sqlite3.IntegrityError:
                skipped_logs += 1

        # 3. Import workouts & workout_exercises if present
        workout_items = body.get('workouts', []) if isinstance(body, dict) else []
        for w in workout_items:
            if not isinstance(w, dict) or not w.get('name'):
                continue
            w_id = w.get('id')
            existing = None
            if w_id:
                existing = conn.execute('SELECT id FROM workouts WHERE id = ?', (w_id,)).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO workouts (id, name, description) VALUES (?, ?, ?)',
                    (w_id, w['name'], w.get('description', ''))
                )
            else:
                cursor.execute(
                    'UPDATE workouts SET name = ?, description = ? WHERE id = ?',
                    (w['name'], w.get('description', ''), existing['id'])
                )

        we_items = body.get('workout_exercises', []) if isinstance(body, dict) else []
        for we in we_items:
            if not isinstance(we, dict) or not we.get('workout_id') or not we.get('exercise_id'):
                continue
            we_id = we.get('id')
            existing = None
            if we_id:
                existing = conn.execute('SELECT id FROM workout_exercises WHERE id = ?', (we_id,)).fetchone()
            if not existing:
                try:
                    cursor.execute('''
                        INSERT INTO workout_exercises
                            (id, workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        we_id,
                        we['workout_id'],
                        we['exercise_id'],
                        we.get('order_index', 1),
                        we.get('sets', 3),
                        we.get('reps'),
                        we.get('duration_sec'),
                        we.get('rest_sec', 90),
                        we.get('tempo'),
                        we.get('superset_group'),
                        we.get('notes')
                    ))
                except sqlite3.IntegrityError:
                    pass

        # 4. Import training_splits & weekly_schedules if present
        split_items = body.get('training_splits', []) if isinstance(body, dict) else []
        for sp in split_items:
            if not isinstance(sp, dict) or not sp.get('name'):
                continue
            sp_id = sp.get('id')
            existing = None
            if sp_id:
                existing = conn.execute('SELECT id FROM training_splits WHERE id = ?', (sp_id,)).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO training_splits (id, name, description, is_active) VALUES (?, ?, ?, ?)',
                    (sp_id, sp['name'], sp.get('description', ''), sp.get('is_active', 0))
                )

        ws_items = body.get('weekly_schedules', []) if isinstance(body, dict) else []
        for ws in ws_items:
            if not isinstance(ws, dict) or 'split_id' not in ws or 'day_of_week' not in ws:
                continue
            cursor.execute('''
                INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(split_id, day_of_week) DO UPDATE SET
                    day_type = excluded.day_type,
                    workout_id = excluded.workout_id
            ''', (ws['split_id'], ws['day_of_week'], ws.get('day_type', 'workout'), ws.get('workout_id')))

        conn.commit()
        return jsonify({
            'status': 'success',
            'imported_logs': imported_logs,
            'skipped_logs': skipped_logs,
            'imported_sessions': imported_sessions,
            'skipped_sessions': skipped_sessions,
            'imported_workouts': len(workout_items),
            'imported_splits': len(split_items),
            'total_processed': len(log_items) + len(session_items)
        }), 200


@app.route('/dashboard/records', methods=['GET'])
@app.route('/api/recent-prs', methods=['GET'])
def get_personal_records():
    """Return all-time Personal Records (PRs) across all exercises with dynamic relative date labels."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                e.id                AS exercise_id,
                e.name              AS exercise_name,
                e.type              AS exercise_type,
                MAX(l.reps)         AS max_reps,
                MAX(l.duration_sec) AS max_duration_sec,
                MAX(l.weight_kg)    AS max_weight_kg,
                MAX(l.timestamp)    AS last_achieved_at,
                COUNT(l.id)         AS total_logs
            FROM exercises e
            JOIN logs l ON l.exercise_id = e.id
            GROUP BY e.id, e.name, e.type
            ORDER BY last_achieved_at DESC, total_logs DESC
            '''
        ).fetchall()

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()
    today_str_utc = today_utc.isoformat()
    today_str_local = today_local.isoformat()
    yesterday_str_utc = (today_utc - timedelta(days=1)).isoformat()
    yesterday_str_local = (today_local - timedelta(days=1)).isoformat()

    results = []
    for r in rows:
        d = dict(r)
        ts = str(d.get('last_achieved_at') or '')
        ts_date = ts[:10]
        if ts_date in (today_str_utc, today_str_local):
            d['date_label'] = 'Today'
        elif ts_date in (yesterday_str_utc, yesterday_str_local):
            d['date_label'] = 'Yesterday'
        elif len(ts_date) == 10:
            try:
                dt_obj = datetime.strptime(ts_date, '%Y-%m-%d').date()
                diff_days = (today_local - dt_obj).days
                if 1 < diff_days <= 6:
                    d['date_label'] = f'{diff_days} days ago'
                else:
                    d['date_label'] = dt_obj.strftime('%d %b')
            except Exception:
                d['date_label'] = ts_date
        else:
            d['date_label'] = 'Recent'
        results.append(d)

    return jsonify(results)


@app.route('/dashboard/activity', methods=['GET'])
def get_activity_heatmap():
    """Return day-by-day training volume and sets for the last 30 days."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                SUBSTR(timestamp, 1, 10) AS date,
                COUNT(id)                AS total_sets,
                SUM(COALESCE(reps, 0))   AS total_reps,
                SUM(COALESCE(duration_sec, 0)) AS total_duration_sec
            FROM logs
            WHERE timestamp >= date('now', '-30 days')
            GROUP BY SUBSTR(timestamp, 1, 10)
            ORDER BY date ASC
            '''
        ).fetchall()
        return jsonify([dict(r) for r in rows])


@app.route('/workout_sessions', methods=['GET'])
def get_workout_sessions():
    """Return all completed workout sessions, ordered newest first."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT id, session_uuid, routine_name, level, started_at, completed_at,
                   duration_sec, total_sets, completed_sets, status
            FROM workout_sessions
            ORDER BY completed_at DESC, started_at DESC
            '''
        ).fetchall()
        return jsonify([dict(r) for r in rows]), 200


@app.route('/workout_sessions/<string:session_uuid>', methods=['GET'])
def get_workout_session_detail(session_uuid):
    """Return detailed session information including raw JSON snapshot and associated logs."""
    with get_db() as conn:
        row = conn.execute(
            'SELECT * FROM workout_sessions WHERE session_uuid = ?', (session_uuid,)
        ).fetchone()
        if not row:
            return jsonify({'error': 'workout session not found'}), 404

        session_dict = dict(row)
        if session_dict.get('raw_json'):
            try:
                session_dict['snapshot'] = json.loads(session_dict['raw_json'])
            except Exception:
                session_dict['snapshot'] = None

        logs = conn.execute(
            '''
            SELECT l.*, e.name AS exercise_name, e.type AS exercise_type
            FROM logs l
            JOIN exercises e ON e.id = l.exercise_id
            WHERE l.session_uuid = ?
            ORDER BY l.id ASC
            ''',
            (session_uuid,)
        ).fetchall()
        session_dict['logs'] = [dict(l) for l in logs]

        return jsonify(session_dict), 200


@app.route('/workout_sessions', methods=['POST'])
def create_or_sync_workout_session():
    """Create or idempotently sync a workout session and its completed sets."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    session_uuid = body.get('id') or body.get('session_uuid')
    routine_name = body.get('routine') or body.get('routine_name')
    level = body.get('level', 1)
    started_at = body.get('started_at') or body.get('startTime')
    completed_at = body.get('completed_at') or datetime.now(timezone.utc).isoformat()
    duration_sec = body.get('duration_sec') or body.get('duration', 0)
    status = body.get('status', 'completed')

    if not session_uuid or not routine_name or not started_at:
        return jsonify({'error': 'session_uuid, routine_name, and started_at are required'}), 400

    exercises = body.get('exercises', [])
    total_sets = 0
    completed_sets = 0
    raw_logs_to_insert = []

    for ex in exercises:
        ex_id = ex.get('exercise_id') or ex.get('id')
        ex_type = ex.get('exercise_type') or ex.get('type', 'reps')
        for s in ex.get('sets', []):
            total_sets += 1
            if s.get('completed'):
                completed_sets += 1
                raw_logs_to_insert.append({
                    'exercise_id': ex_id,
                    'timestamp': s.get('completedAt') or completed_at,
                    'reps': s.get('actual_val') if ex_type == 'reps' else None,
                    'duration_sec': s.get('actual_val') if ex_type == 'duration' else None,
                    'weight_kg': s.get('weight_kg'),
                    'rpe': s.get('rpe'),
                    'client_uuid': s.get('client_uuid') or f"{session_uuid}_{ex_id}_{s.get('set_num', total_sets)}"
                })

    raw_json_str = json.dumps(body)

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                '''
                INSERT INTO workout_sessions
                    (session_uuid, routine_name, level, started_at, completed_at, duration_sec, total_sets, completed_sets, status, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    session_uuid,
                    routine_name,
                    level,
                    str(started_at),
                    str(completed_at),
                    duration_sec,
                    total_sets,
                    completed_sets,
                    status,
                    raw_json_str
                )
            )
            conn.commit()
            created = True
        except sqlite3.IntegrityError:
            cursor.execute(
                '''
                UPDATE workout_sessions
                SET completed_at = ?, duration_sec = ?, total_sets = ?, completed_sets = ?, status = ?, raw_json = ?
                WHERE session_uuid = ?
                ''',
                (str(completed_at), duration_sec, total_sets, completed_sets, status, raw_json_str, session_uuid)
            )
            conn.commit()
            created = False

        for log_data in raw_logs_to_insert:
            try:
                cursor.execute(
                    '''
                    INSERT INTO logs (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        log_data['exercise_id'],
                        str(log_data['timestamp']),
                        log_data.get('reps'),
                        log_data.get('weight_kg'),
                        log_data.get('duration_sec'),
                        log_data.get('rpe'),
                        log_data['client_uuid'],
                        session_uuid
                    )
                )
                conn.commit()
            except sqlite3.IntegrityError:
                pass

        row = conn.execute('SELECT * FROM workout_sessions WHERE session_uuid = ?', (session_uuid,)).fetchone()
        return jsonify(dict(row)), (201 if created else 200)


if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=Config.PORT)
