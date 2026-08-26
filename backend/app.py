import sqlite3
import json
import os
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tracker.db')

def get_db_connection():
    """Create and return a raw SQLite database connection with row factory and FK enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

@contextmanager
def get_db():
    """Context manager for SQLite connections.
    Guarantees conn.close() is called on block exit, normal return, or exception."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def _parse_int(val, field_name, min_val=None, allow_none=False):
    """Parse and validate integer fields from request payload.
    Returns (parsed_int, error_message). On error, parsed_int is None."""
    if val is None:
        if allow_none:
            return None, None
        return None, f"'{field_name}' is required"
    if isinstance(val, bool):
        return None, f"'{field_name}' must be an integer, not a boolean"
    try:
        parsed = int(val)
    except (ValueError, TypeError):
        return None, f"'{field_name}' must be a valid integer"
    if min_val is not None and parsed < min_val:
        return None, f"'{field_name}' must be at least {min_val}"
    return parsed, None


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


# ── Training Splits API ────────────────────────────────────────────────────────

@app.route('/splits', methods=['GET'])
def get_splits():
    """List all training splits with schedule overview."""
    with get_db() as conn:
        splits = conn.execute('SELECT * FROM training_splits ORDER BY is_active DESC, id ASC').fetchall()
        result = []
        for s in splits:
            s_dict = dict(s)
            sched_rows = conn.execute('''
                SELECT ws.day_of_week, ws.day_type, ws.workout_id, w.name as workout_name
                FROM weekly_schedules ws
                LEFT JOIN workouts w ON ws.workout_id = w.id
                WHERE ws.split_id = ?
                ORDER BY ws.day_of_week ASC
            ''', (s['id'],)).fetchall()

            schedule = []
            workout_days = 0
            rest_days = 0
            for row in sched_rows:
                dow = row['day_of_week']
                day_type = row['day_type']
                if day_type == 'workout' and row['workout_id']:
                    workout_days += 1
                else:
                    rest_days += 1
                schedule.append({
                    'day_of_week': dow,
                    'day_name': DAY_NAMES[dow],
                    'day_type': day_type,
                    'workout_id': row['workout_id'],
                    'workout_name': row['workout_name']
                })

            s_dict['workout_days'] = workout_days
            s_dict['rest_days'] = rest_days
            s_dict['schedule'] = schedule
            result.append(s_dict)

        return jsonify(result), 200


@app.route('/splits', methods=['POST'])
def create_split():
    """Create a new training split with 7-day schedule initialized."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Split name is required'}), 400

    description = body.get('description', '')
    is_active = 1 if body.get('is_active') else 0
    schedule_input = body.get('schedule') or []

    with get_db() as conn:
        cursor = conn.cursor()
        if is_active == 1:
            cursor.execute('UPDATE training_splits SET is_active = 0')

        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES (?, ?, ?)''',
            (name, description, is_active)
        )
        split_id = cursor.lastrowid

        input_map = {item.get('day_of_week'): item for item in schedule_input if isinstance(item, dict)}
        for dow in range(7):
            item = input_map.get(dow, {})
            day_type = item.get('day_type', 'rest')
            w_id = item.get('workout_id') if day_type == 'workout' else None
            cursor.execute(
                '''INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                   VALUES (?, ?, ?, ?)''',
                (split_id, dow, day_type, w_id)
            )

        conn.commit()

        count = conn.execute('SELECT COUNT(*) FROM training_splits WHERE is_active = 1').fetchone()[0]
        if count == 0:
            cursor.execute('UPDATE training_splits SET is_active = 1 WHERE id = ?', (split_id,))
            conn.commit()

        created_split = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        return jsonify(dict(created_split)), 201


@app.route('/splits/<int:split_id>', methods=['GET'])
def get_split_detail(split_id):
    """Get single split details with complete 7-day schedule."""
    with get_db() as conn:
        s = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        if not s:
            return jsonify({'error': 'Split not found'}), 404

        s_dict = dict(s)
        sched_rows = conn.execute('''
            SELECT ws.day_of_week, ws.day_type, ws.workout_id, w.name as workout_name, w.description as workout_desc
            FROM weekly_schedules ws
            LEFT JOIN workouts w ON ws.workout_id = w.id
            WHERE ws.split_id = ?
            ORDER BY ws.day_of_week ASC
        ''', (split_id,)).fetchall()

        schedule = []
        for row in sched_rows:
            dow = row['day_of_week']
            schedule.append({
                'day_of_week': dow,
                'day_name': DAY_NAMES[dow],
                'day_type': row['day_type'],
                'workout_id': row['workout_id'],
                'workout_name': row['workout_name'],
                'workout_desc': row['workout_desc']
            })

        s_dict['schedule'] = schedule
        return jsonify(s_dict), 200


@app.route('/splits/<int:split_id>', methods=['PUT'])
def update_split(split_id):
    """Update split name, description, or activation status."""
    body = request.get_json(silent=True) or {}
    with get_db() as conn:
        s = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        if not s:
            return jsonify({'error': 'Split not found'}), 404

        name = body.get('name', s['name']).strip()
        description = body.get('description', s['description'])
        is_active = body.get('is_active')

        cursor = conn.cursor()
        if is_active == 1:
            cursor.execute('UPDATE training_splits SET is_active = 0')
            cursor.execute(
                'UPDATE training_splits SET name = ?, description = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (name, description, split_id)
            )
        else:
            cursor.execute(
                'UPDATE training_splits SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (name, description, split_id)
            )

        conn.commit()
        updated = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        return jsonify(dict(updated)), 200


@app.route('/splits/<int:split_id>', methods=['DELETE'])
def delete_split(split_id):
    """Delete split safely. If active, another split becomes active."""
    with get_db() as conn:
        s = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        if not s:
            return jsonify({'error': 'Split not found'}), 404

        was_active = s['is_active'] == 1
        cursor = conn.cursor()
        cursor.execute('DELETE FROM weekly_schedules WHERE split_id = ?', (split_id,))
        cursor.execute('DELETE FROM training_splits WHERE id = ?', (split_id,))

        if was_active:
            other = conn.execute('SELECT id FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()
            if other:
                cursor.execute('UPDATE training_splits SET is_active = 1 WHERE id = ?', (other['id'],))

        conn.commit()
        return jsonify({'status': 'deleted', 'id': split_id}), 200


@app.route('/splits/<int:split_id>/schedule', methods=['GET'])
def get_split_schedule(split_id):
    """Get schedule for split."""
    with get_db() as conn:
        rows = conn.execute('''
            SELECT ws.id, ws.split_id, ws.day_of_week, ws.day_type, ws.workout_id,
                   w.name AS workout_name, w.description AS workout_description
            FROM weekly_schedules ws
            LEFT JOIN workouts w ON ws.workout_id = w.id
            WHERE ws.split_id = ?
            ORDER BY ws.day_of_week ASC
        ''', (split_id,)).fetchall()

        schedule = []
        for r in rows:
            dow = r['day_of_week']
            schedule.append({
                'id': r['id'],
                'split_id': r['split_id'],
                'day_of_week': dow,
                'day_name': DAY_NAMES[dow],
                'day_type': r['day_type'],
                'workout_id': r['workout_id'],
                'workout_name': r['workout_name'],
                'workout_description': r['workout_description']
            })

        return jsonify(schedule), 200


@app.route('/splits/<int:split_id>/schedule', methods=['PUT'])
def update_split_schedule_batch(split_id):
    """Batch update 7-day schedule for a split."""
    body = request.get_json(silent=True) or {}
    days = body.get('days') if isinstance(body, dict) else body
    if not isinstance(days, list):
        return jsonify({'error': 'List of days required'}), 400

    with get_db() as conn:
        s = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        if not s:
            return jsonify({'error': 'Split not found'}), 404

        cursor = conn.cursor()
        for item in days:
            if not isinstance(item, dict) or 'day_of_week' not in item:
                continue
            dow = int(item['day_of_week'])
            day_type = item.get('day_type', 'workout')
            w_id = item.get('workout_id') if day_type == 'workout' else None
            cursor.execute('''
                INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(split_id, day_of_week) DO UPDATE SET
                    day_type = excluded.day_type,
                    workout_id = excluded.workout_id
            ''', (split_id, dow, day_type, w_id))

        conn.commit()
        return jsonify({'status': 'updated', 'split_id': split_id}), 200


@app.route('/splits/<int:split_id>/schedule/<int:day_of_week>', methods=['PUT'])
def update_split_schedule_day(split_id, day_of_week):
    """Update single day of a weekly schedule."""
    if day_of_week < 0 or day_of_week > 6:
        return jsonify({'error': 'day_of_week must be between 0 (Monday) and 6 (Sunday)'}), 400

    body = request.get_json(silent=True) or {}
    day_type = body.get('day_type', 'workout')
    workout_id = body.get('workout_id') if day_type == 'workout' else None

    with get_db() as conn:
        s = conn.execute('SELECT * FROM training_splits WHERE id = ?', (split_id,)).fetchone()
        if not s:
            return jsonify({'error': 'Split not found'}), 404

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(split_id, day_of_week) DO UPDATE SET
                day_type = excluded.day_type,
                workout_id = excluded.workout_id
        ''', (split_id, day_of_week, day_type, workout_id))
        conn.commit()

        row = conn.execute('''
            SELECT ws.*, w.name as workout_name
            FROM weekly_schedules ws
            LEFT JOIN workouts w ON ws.workout_id = w.id
            WHERE ws.split_id = ? AND ws.day_of_week = ?
        ''', (split_id, day_of_week)).fetchone()

        res = dict(row)
        res['day_name'] = DAY_NAMES[day_of_week]
        return jsonify(res), 200


# ── Reusable Workouts API ──────────────────────────────────────────────────────

@app.route('/workouts', methods=['GET'])
def get_workouts():
    """List all reusable workouts with exercise count and total sets."""
    with get_db() as conn:
        rows = conn.execute('''
            SELECT w.*,
                   COUNT(we.id) AS exercise_count,
                   COALESCE(SUM(we.sets), 0) AS total_sets
            FROM workouts w
            LEFT JOIN workout_exercises we ON w.id = we.workout_id
            GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at
            ORDER BY w.name ASC
        ''').fetchall()
        return jsonify([dict(r) for r in rows]), 200


@app.route('/workouts', methods=['POST'])
def create_workout():
    """Create a new reusable workout with exercises."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Workout name is required'}), 400

    description = body.get('description', '')
    exercises = body.get('exercises', [])

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO workouts (name, description) VALUES (?, ?)', (name, description))
        workout_id = cursor.lastrowid

        for idx, ex in enumerate(exercises, start=1):
            ex_id = ex.get('exercise_id') or ex.get('id')
            if not ex_id:
                continue
            cursor.execute('''
                INSERT INTO workout_exercises
                    (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                workout_id,
                ex_id,
                ex.get('order_index', idx),
                ex.get('sets', 3),
                ex.get('reps'),
                ex.get('duration_sec'),
                ex.get('rest_sec', 90),
                ex.get('tempo'),
                ex.get('superset_group'),
                ex.get('notes')
            ))

        conn.commit()
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        return jsonify(dict(w)), 201


@app.route('/workouts/<int:workout_id>', methods=['GET'])
def get_workout_detail(workout_id):
    """Get single workout detail with its ordered exercises."""
    with get_db() as conn:
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not w:
            return jsonify({'error': 'Workout not found'}), 404

        w_dict = dict(w)
        rows = conn.execute('''
            SELECT we.*, e.name AS exercise_name, e.type AS exercise_type,
                   e.progression_target_reps, e.progression_target_duration
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.order_index ASC, we.id ASC
        ''', (workout_id,)).fetchall()

        w_dict['exercises'] = [dict(r) for r in rows]
        w_dict['total_sets'] = sum(r['sets'] for r in rows)
        return jsonify(w_dict), 200


@app.route('/workouts/<int:workout_id>', methods=['PUT'])
def update_workout(workout_id):
    """Update workout name, description, and exercise sequence."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Workout name is required'}), 400

    description = body.get('description', '')
    exercises = body.get('exercises')

    with get_db() as conn:
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not w:
            return jsonify({'error': 'Workout not found'}), 404

        cursor = conn.cursor()
        cursor.execute(
            'UPDATE workouts SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (name, description, workout_id)
        )

        if exercises is not None and isinstance(exercises, list):
            cursor.execute('DELETE FROM workout_exercises WHERE workout_id = ?', (workout_id,))
            for idx, ex in enumerate(exercises, start=1):
                ex_id = ex.get('exercise_id') or ex.get('id')
                if not ex_id:
                    continue
                cursor.execute('''
                    INSERT INTO workout_exercises
                        (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    workout_id,
                    ex_id,
                    ex.get('order_index', idx),
                    ex.get('sets', 3),
                    ex.get('reps'),
                    ex.get('duration_sec'),
                    ex.get('rest_sec', 90),
                    ex.get('tempo'),
                    ex.get('superset_group'),
                    ex.get('notes')
                ))

        conn.commit()
        updated_w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        return jsonify(dict(updated_w)), 200


@app.route('/workouts/<int:workout_id>/duplicate', methods=['POST'])
def duplicate_workout(workout_id):
    """Duplicate a workout into an independent copy."""
    with get_db() as conn:
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not w:
            return jsonify({'error': 'Workout not found'}), 404

        new_name = f"{w['name']} (Copy)"
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO workouts (name, description) VALUES (?, ?)',
            (new_name, w['description'])
        )
        new_workout_id = cursor.lastrowid

        exs = conn.execute('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC', (workout_id,)).fetchall()
        for e in exs:
            cursor.execute('''
                INSERT INTO workout_exercises
                    (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                new_workout_id,
                e['exercise_id'],
                e['order_index'],
                e['sets'],
                e['reps'],
                e['duration_sec'],
                e['rest_sec'],
                e['tempo'],
                e['superset_group'],
                e['notes']
            ))

        conn.commit()
        dup = conn.execute('SELECT * FROM workouts WHERE id = ?', (new_workout_id,)).fetchone()
        return jsonify(dict(dup)), 201


@app.route('/workouts/<int:workout_id>', methods=['DELETE'])
def delete_workout(workout_id):
    """Delete a workout safely, clearing schedule references to rest without deleting history."""
    with get_db() as conn:
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not w:
            return jsonify({'error': 'Workout not found'}), 404

        cursor = conn.cursor()
        cursor.execute("UPDATE weekly_schedules SET day_type = 'rest', workout_id = NULL WHERE workout_id = ?", (workout_id,))
        cursor.execute('DELETE FROM workout_exercises WHERE workout_id = ?', (workout_id,))
        cursor.execute('DELETE FROM workouts WHERE id = ?', (workout_id,))
        conn.commit()
        return jsonify({'status': 'deleted', 'id': workout_id}), 200


# ── Existing endpoints ──────────────────────────────────────────────────────────

@app.route('/exercises', methods=['GET'])
def get_exercises():
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM exercises').fetchall()
        return jsonify([dict(r) for r in rows])


@app.route('/exercises', methods=['POST'])
def create_exercise():
    """Create a new custom exercise in the global catalog."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    name    = body.get('name')
    day     = body.get('day')
    ex_type = body.get('type')

    if not name or not day or not ex_type:
        return jsonify({'error': 'name, day, and type are required'}), 400
    if ex_type not in ('reps', 'duration'):
        return jsonify({'error': "type must be 'reps' or 'duration'"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO exercises
                   (name, day, type, prerequisite_id, next_id, progression_target_reps, progression_target_duration, progression_sessions_needed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                name.strip(),
                day.strip(),
                ex_type.strip(),
                body.get('prerequisite_id'),
                body.get('next_id'),
                body.get('progression_target_reps'),
                body.get('progression_target_duration'),
                body.get('progression_sessions_needed', 2)
            )
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute('SELECT * FROM exercises WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


# ── Routine / Level endpoints ─────────────────────────────────────────────────

@app.route('/routines/<string:name>/levels', methods=['GET'])
def get_routine_levels(name):
    """Return all levels for a routine, each with its ordered exercise list."""
    with get_db() as conn:
        levels = conn.execute(
            'SELECT * FROM routine_levels WHERE routine_name = ? ORDER BY level',
            (name,)
        ).fetchall()

        result = []
        for lvl in levels:
            exercises = conn.execute(
                '''
                SELECT le.*, e.name AS exercise_name, e.type AS exercise_type
                FROM   level_exercises le
                JOIN   exercises e ON e.id = le.exercise_id
                WHERE  le.routine_level_id = ?
                ORDER  BY le.order_index
                ''',
                (lvl['id'],)
            ).fetchall()

            result.append({
                **dict(lvl),
                'exercises': [dict(ex) for ex in exercises],
            })

        return jsonify(result)


@app.route('/routine_levels/<int:level_id>/exercises', methods=['POST'])
def add_level_exercise(level_id):
    """Add one exercise entry to a routine level."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['exercise_id', 'order_index', 'sets', 'rest_sec']
    missing = [f for f in required if f not in body or body[f] is None]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    # Validate integer inputs
    exercise_id, err = _parse_int(body.get('exercise_id'), 'exercise_id', min_val=1)
    if err:
        return jsonify({'error': err}), 400

    order_index, err = _parse_int(body.get('order_index'), 'order_index', min_val=1)
    if err:
        return jsonify({'error': err}), 400

    sets, err = _parse_int(body.get('sets'), 'sets', min_val=1)
    if err:
        return jsonify({'error': err}), 400

    rest_sec, err = _parse_int(body.get('rest_sec'), 'rest_sec', min_val=0)
    if err:
        return jsonify({'error': err}), 400

    reps, err = _parse_int(body.get('reps'), 'reps', min_val=0, allow_none=True)
    if err:
        return jsonify({'error': err}), 400

    duration_sec, err = _parse_int(body.get('duration_sec'), 'duration_sec', min_val=0, allow_none=True)
    if err:
        return jsonify({'error': err}), 400

    superset_group, err = _parse_int(body.get('superset_group'), 'superset_group', min_val=1, allow_none=True)
    if err:
        return jsonify({'error': err}), 400

    # At least one of reps or duration_sec must be provided
    if reps is None and duration_sec is None:
        return jsonify({'error': 'Provide either reps or duration_sec (or both)'}), 400

    tempo = body.get('tempo')
    notes = body.get('notes')

    with get_db() as conn:
        # Verify the routine_level exists
        lvl = conn.execute(
            'SELECT id FROM routine_levels WHERE id = ?', (level_id,)
        ).fetchone()
        if lvl is None:
            return jsonify({'error': f'routine_level {level_id} not found'}), 404

        # Verify the exercise exists
        ex = conn.execute(
            'SELECT id FROM exercises WHERE id = ?', (exercise_id,)
        ).fetchone()
        if ex is None:
            return jsonify({'error': f'exercise {exercise_id} not found'}), 404

        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO level_exercises
                (routine_level_id, exercise_id, order_index, sets,
                 reps, duration_sec, tempo, rest_sec, superset_group, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                level_id,
                exercise_id,
                order_index,
                sets,
                reps,
                duration_sec,
                tempo,
                rest_sec,
                superset_group,
                notes,
            )
        )
        conn.commit()
        new_id = cursor.lastrowid

        row = conn.execute(
            'SELECT * FROM level_exercises WHERE id = ?', (new_id,)
        ).fetchone()
        return jsonify(dict(row)), 201


@app.route('/routine_levels', methods=['POST'])
def create_routine_level():
    """Create a new (routine_name, level) pair. Idempotent: returns existing row on conflict."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    routine_name = body.get('routine_name')
    level = body.get('level')
    if not routine_name or level is None:
        return jsonify({'error': 'routine_name and level are required'}), 400

    level_val, err = _parse_int(level, 'level', min_val=1)
    if err:
        return jsonify({'error': err}), 400

    with get_db() as conn:
        try:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO routine_levels (routine_name, level) VALUES (?, ?)',
                (routine_name, level_val)
            )
            conn.commit()
            new_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            # UNIQUE(routine_name, level) conflict — return the existing row
            row = conn.execute(
                'SELECT * FROM routine_levels WHERE routine_name = ? AND level = ?',
                (routine_name, level_val)
            ).fetchone()
            return jsonify(dict(row)), 200

        row = conn.execute('SELECT * FROM routine_levels WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


@app.route('/level_exercises/<int:le_id>', methods=['PUT'])
def update_level_exercise(le_id):
    """Update any subset of fields on a level_exercise row."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    # Validate integer fields if present in request body
    int_fields = {
        'exercise_id': (1, False),
        'order_index': (1, False),
        'sets': (1, False),
        'rest_sec': (0, False),
        'reps': (0, True),
        'duration_sec': (0, True),
        'superset_group': (1, True),
    }

    validated_fields = {}
    for field, (min_val, allow_none) in int_fields.items():
        if field in body:
            parsed, err = _parse_int(body[field], field, min_val=min_val, allow_none=allow_none)
            if err:
                return jsonify({'error': err}), 400
            validated_fields[field] = parsed

    with get_db() as conn:
        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        if row is None:
            return jsonify({'error': f'level_exercise {le_id} not found'}), 404

        # Merge incoming fields onto existing values
        updated = dict(row)
        for field in ['exercise_id', 'order_index', 'sets', 'reps', 'duration_sec', 'rest_sec', 'superset_group']:
            if field in validated_fields:
                updated[field] = validated_fields[field]

        if 'tempo' in body:
            updated['tempo'] = body['tempo']
        if 'notes' in body:
            updated['notes'] = body['notes']

        # If exercise_id changed, verify that the new exercise exists
        if 'exercise_id' in validated_fields:
            ex = conn.execute('SELECT id FROM exercises WHERE id = ?', (updated['exercise_id'],)).fetchone()
            if ex is None:
                return jsonify({'error': f"exercise {updated['exercise_id']} not found"}), 404

        conn.execute(
            '''UPDATE level_exercises
               SET exercise_id = ?, order_index = ?, sets = ?,
                   reps = ?, duration_sec = ?, tempo = ?,
                   rest_sec = ?, superset_group = ?, notes = ?
               WHERE id = ?''',
            (updated['exercise_id'], updated['order_index'], updated['sets'],
             updated['reps'], updated['duration_sec'], updated['tempo'],
             updated['rest_sec'], updated['superset_group'], updated.get('notes'), le_id)
        )
        conn.commit()
        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        return jsonify(dict(row))


@app.route('/level_exercises/<int:le_id>', methods=['DELETE'])
def delete_level_exercise(le_id):
    """Remove a single level_exercise row."""
    with get_db() as conn:
        row = conn.execute('SELECT id FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        if row is None:
            return jsonify({'error': f'level_exercise {le_id} not found'}), 404

        conn.execute('DELETE FROM level_exercises WHERE id = ?', (le_id,))
        conn.commit()
        return '', 204


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

    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()

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

    # 1. streak_days: count consecutive calendar days with >=1 log or session entry.
    # If athlete logged today, count backwards from today; if not yet today, count from yesterday.
    streak_days = 0
    if today_str in logged_dates:
        curr = today
        while curr.isoformat() in logged_dates:
            streak_days += 1
            curr -= timedelta(days=1)
    else:
        yesterday = today - timedelta(days=1)
        if yesterday.isoformat() in logged_dates:
            curr = yesterday
            while curr.isoformat() in logged_dates:
                streak_days += 1
                curr -= timedelta(days=1)

    # 2. week_sessions: count distinct calendar days with >=1 log/session in last 7 days (today - 6 days to today)
    cutoff_7 = (today - timedelta(days=6)).isoformat()
    week_sessions = len([d for d in logged_dates if cutoff_7 <= d <= today_str])

    # 3. week_sets: total count of completed sets from logs and workout_sessions in last 7 days
    week_sets_logs = sum(1 for l in logs_list if cutoff_7 <= str(l.get('timestamp') or '')[:10] <= today_str)
    week_sets_sessions = sum(int(s.get('completed_sets') or s.get('total_sets') or 0) for s in sessions_list if cutoff_7 <= str(s.get('completed_at') or s.get('started_at') or '')[:10] <= today_str)
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


@app.route('/exercises/<int:ex_id>/progression-status', methods=['GET'])
def get_progression_status(ex_id):
    """Return weighted progression readiness score and status for an exercise.

    Scoring Logic:
      - Hit Rate (60% weight): sessions_at_target / sessions_needed
      - RPE Signal (40% weight):
          - avg_rpe <= 7: full credit (40%)
          - avg_rpe >= 9: partial credit (down to 0%) and forces status to "almost_ready"
          - 7 < avg_rpe < 9: linear interpolation
      - Fallback: if RPE is null, score relies strictly on hit rate.
      - Status:
          - "ready": readiness_pct >= 90 AND avg_rpe <= 8.5 (or null) AND hold_or_reps_met
          - "almost_ready": readiness_pct >= 60 (or forced due to RPE >= 9)
          - "not_ready": readiness_pct < 60
    """
    with get_db() as conn:
        ex = conn.execute('SELECT * FROM exercises WHERE id = ?', (ex_id,)).fetchone()
        if ex is None:
            return jsonify({'error': 'exercise not found'}), 404

        ex = dict(ex)
        target_reps     = ex.get('progression_target_reps')
        target_dur      = ex.get('progression_target_duration')
        sessions_needed = ex.get('progression_sessions_needed') or 2

        # No target configured yet — return baseline not_ready response
        if target_reps is None and target_dur is None:
            return jsonify({
                'readiness_pct': 0,
                'status': 'not_ready',
                'criteria': {
                    'hold_or_reps_met': False,
                    'sessions_completed': 0,
                    'sessions_needed': sessions_needed,
                    'avg_rpe': None
                },
                'next_exercise': None,
                'no_target': True
            }), 200

        # Pull all logs for this exercise, ordered newest first
        logs = conn.execute(
            'SELECT * FROM logs WHERE exercise_id = ? ORDER BY timestamp DESC',
            (ex_id,)
        ).fetchall()
        logs = [dict(r) for r in logs]

        # Group by calendar date (local — using date portion of ISO timestamp)
        by_date = {}
        for log in logs:
            ts = str(log.get('timestamp') or '')
            date_str = ts[:10] if len(ts) >= 10 else None
            if not date_str:
                continue
            by_date.setdefault(date_str, []).append(log)

        # Most-recent sessions first
        sorted_dates = sorted(by_date.keys(), reverse=True)
        sessions_completed = len(sorted_dates)

        sessions_at_target = 0
        evaluated_rpes = []

        for date_str in sorted_dates[:sessions_needed]:
            day_logs = by_date[date_str]
            if ex['type'] == 'duration':
                best = max((l.get('duration_sec') or 0) for l in day_logs)
                meets = best >= target_dur if target_dur is not None else False
            else:
                best = max((l.get('reps') or 0) for l in day_logs)
                meets = best >= target_reps if target_reps is not None else False

            if meets:
                sessions_at_target += 1
                for l in day_logs:
                    if l.get('rpe') is not None:
                        try:
                            evaluated_rpes.append(float(l['rpe']))
                        except (ValueError, TypeError):
                            pass
            else:
                for l in day_logs:
                    if l.get('rpe') is not None:
                        try:
                            evaluated_rpes.append(float(l['rpe']))
                        except (ValueError, TypeError):
                            pass

        hold_or_reps_met = (sessions_completed >= sessions_needed and sessions_at_target >= sessions_needed)
        hit_rate = min(1.0, sessions_at_target / sessions_needed) if sessions_needed > 0 else 0.0

        avg_rpe = None
        if evaluated_rpes:
            avg_rpe = round(sum(evaluated_rpes) / len(evaluated_rpes), 1)

        if avg_rpe is None:
            # Fallback on hit-rate only when user hasn't logged RPE
            readiness_pct = int(round(hit_rate * 100))
            readiness_pct = max(0, min(100, readiness_pct))
            if readiness_pct >= 90 and hold_or_reps_met:
                status = 'ready'
            elif readiness_pct >= 60:
                status = 'almost_ready'
            else:
                status = 'not_ready'
        else:
            # 60% Hit-rate weight
            hit_score = hit_rate * 60.0

            # 40% RPE signal weight
            if avg_rpe <= 7.0:
                rpe_credit = 40.0
            elif avg_rpe >= 9.0:
                rpe_credit = max(0.0, 10.0 - (avg_rpe - 9.0) * 10.0)
            else:
                rpe_credit = 40.0 - ((avg_rpe - 7.0) / 2.0) * 30.0

            rpe_score = rpe_credit * hit_rate
            readiness_pct = int(round(hit_score + rpe_score))
            readiness_pct = max(0, min(100, readiness_pct))

            # Status determination with RPE fatigue guard
            if avg_rpe >= 9.0:
                # High fatigue forces status to almost_ready even if hit-rate is 100%
                status = 'almost_ready' if readiness_pct >= 60 else 'not_ready'
            elif readiness_pct >= 90 and avg_rpe <= 8.5 and hold_or_reps_met:
                status = 'ready'
            elif readiness_pct >= 60:
                status = 'almost_ready'
            else:
                status = 'not_ready'

        next_exercise = None
        if ex.get('next_id'):
            next_ex = conn.execute(
                'SELECT id, name FROM exercises WHERE id = ?', (ex['next_id'],)
            ).fetchone()
            if next_ex:
                next_exercise = dict(next_ex)

        result = {
            'readiness_pct': readiness_pct,
            'status': status,
            'criteria': {
                'hold_or_reps_met': hold_or_reps_met,
                'sessions_completed': sessions_completed,
                'sessions_needed': sessions_needed,
                'avg_rpe': avg_rpe
            },
            'next_exercise': next_exercise,
            'no_target': False
        }

        return jsonify(result), 200


@app.route('/exercises/<int:ex_id>/promote', methods=['POST'])
def promote_exercise_progression(ex_id):
    """Promote an exercise to its configured next progression step across all routine levels."""
    with get_db() as conn:
        ex = conn.execute('SELECT * FROM exercises WHERE id = ?', (ex_id,)).fetchone()
        if not ex:
            return jsonify({'error': 'Exercise not found'}), 404

        next_id = ex['next_id']
        if not next_id:
            return jsonify({'error': 'No next progression configured for this exercise'}), 400

        next_ex = conn.execute('SELECT * FROM exercises WHERE id = ?', (next_id,)).fetchone()
        if not next_ex:
            return jsonify({'error': 'Next exercise not found in catalog'}), 404

        cursor = conn.cursor()
        cursor.execute(
            'UPDATE level_exercises SET exercise_id = ? WHERE exercise_id = ?',
            (next_id, ex_id)
        )
        updated_count = cursor.rowcount
        conn.commit()

        return jsonify({
            'status': 'promoted',
            'previous_exercise': dict(ex),
            'next_exercise': dict(next_ex),
            'updated_routine_slots': updated_count
        }), 200


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
    """Return all-time Personal Records (PRs) across all exercises."""
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
                COUNT(l.id)         AS total_logs
            FROM exercises e
            JOIN logs l ON l.exercise_id = e.id
            GROUP BY e.id, e.name, e.type
            ORDER BY total_logs DESC
            '''
        ).fetchall()
        return jsonify([dict(r) for r in rows])


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
    debug = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    app.run(debug=debug, port=5001)
