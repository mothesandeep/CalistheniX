import sqlite3
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

DB_PATH = 'tracker.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable FK enforcement for this connection (SQLite requires it per-connection)
    cursor.execute('PRAGMA foreign_keys = ON')

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

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS progressions (
        id INTEGER PRIMARY KEY AUTOINCREMENT
    )
    ''')

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

    conn.commit()
    conn.close()

    # Add notes column if it was missing from an older schema (safe on re-run).
    _migrate_notes_column()
    # Add progression columns to exercises if missing (safe on re-run).
    _migrate_progression_columns()


def _migrate_notes_column():
    """Add `notes` TEXT nullable column to level_exercises if not already present."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cols = [row[1] for row in cursor.execute('PRAGMA table_info(level_exercises)').fetchall()]
    if 'notes' not in cols:
        cursor.execute('ALTER TABLE level_exercises ADD COLUMN notes TEXT')
        conn.commit()
    conn.close()


def _migrate_progression_columns():
    """Add three progression tracking columns to exercises if not already present."""
    conn = sqlite3.connect(DB_PATH)
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
    conn.close()


# ── PPL A/B seed data ─────────────────────────────────────────────────────────
# Structured as a list of (routine_name, exercises_list) where each exercise is:
#   (name, ex_type, sets, reps_or_none, duration_sec_or_none, rest_sec, notes_or_none)
# All levels are 1 (no L1-L5 progression tiers in this plan).

_SEED_VERSION = 'ppl-ab-v1'  # bump to re-seed without deleting the DB

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


def reseed_data():
    """Clear exercises/routine_levels/level_exercises and repopulate with _SEED.
    Logs are NOT touched. Idempotent: checks seed version stored in DB first."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = OFF')  # allow truncation with FKs

    # Use progressions table as a simple key-value store for the seed version tag.
    cursor.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
    row = cursor.execute("SELECT value FROM meta WHERE key = 'seed_version'").fetchone()
    if row and row['value'] == _SEED_VERSION:
        conn.close()
        return  # already at current seed — skip

    # ── Clear dependent tables in safe order ──────────────────────────────────
    cursor.execute('DELETE FROM level_exercises')
    cursor.execute('DELETE FROM routine_levels')
    cursor.execute('DELETE FROM exercises')
    # Reset autoincrement counters so IDs start fresh
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('exercises','routine_levels','level_exercises')")

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
                # Update day to the first occurrence; backend can serve cross-day.
                pass

    # ── Insert routine_levels and level_exercises ─────────────────────────────
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

    # ── Stamp seed version ────────────────────────────────────────────────────
    cursor.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_version', ?)",
        (_SEED_VERSION,)
    )

    cursor.execute('PRAGMA foreign_keys = ON')
    conn.commit()
    conn.close()


# Always run init_db — all statements use CREATE TABLE IF NOT EXISTS,
# so this is safe against an already-initialised DB and picks up new tables
# without requiring a manual migration step.
init_db()
reseed_data()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


# ── Existing endpoints (unchanged) ───────────────────────────────────────────

@app.route('/exercises', methods=['GET'])
def get_exercises():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM exercises').fetchall()
    conn.close()
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

    conn = get_db_connection()
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
    conn.close()
    return jsonify(dict(row)), 201


# ── New endpoints ─────────────────────────────────────────────────────────────

@app.route('/routines/<string:name>/levels', methods=['GET'])
def get_routine_levels(name):
    """Return all levels for a routine, each with its ordered exercise list."""
    conn = get_db_connection()

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

    conn.close()
    return jsonify(result)


@app.route('/routine_levels/<int:level_id>/exercises', methods=['POST'])
def add_level_exercise(level_id):
    """Add one exercise entry to a routine level."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['exercise_id', 'order_index', 'sets', 'rest_sec']
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    # At least one of reps or duration_sec must be provided
    if body.get('reps') is None and body.get('duration_sec') is None:
        return jsonify({'error': 'Provide either reps or duration_sec (or both)'}), 400

    conn = get_db_connection()

    # Verify the routine_level exists
    lvl = conn.execute(
        'SELECT id FROM routine_levels WHERE id = ?', (level_id,)
    ).fetchone()
    if lvl is None:
        conn.close()
        return jsonify({'error': f'routine_level {level_id} not found'}), 404

    cursor = conn.cursor()
    cursor.execute(
        '''
        INSERT INTO level_exercises
            (routine_level_id, exercise_id, order_index, sets,
             reps, duration_sec, tempo, rest_sec, superset_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            level_id,
            body['exercise_id'],
            body['order_index'],
            body['sets'],
            body.get('reps'),
            body.get('duration_sec'),
            body.get('tempo'),
            body['rest_sec'],
            body.get('superset_group'),
        )
    )
    conn.commit()
    new_id = cursor.lastrowid

    row = conn.execute(
        'SELECT * FROM level_exercises WHERE id = ?', (new_id,)
    ).fetchone()
    conn.close()

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

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO routine_levels (routine_name, level) VALUES (?, ?)',
            (routine_name, level)
        )
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        # UNIQUE(routine_name, level) conflict — return the existing row
        row = conn.execute(
            'SELECT * FROM routine_levels WHERE routine_name = ? AND level = ?',
            (routine_name, level)
        ).fetchone()
        conn.close()
        return jsonify(dict(row)), 200

    row = conn.execute('SELECT * FROM routine_levels WHERE id = ?', (new_id,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201


@app.route('/level_exercises/<int:le_id>', methods=['PUT'])
def update_level_exercise(le_id):
    """Update any subset of fields on a level_exercise row."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    conn = get_db_connection()
    row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({'error': f'level_exercise {le_id} not found'}), 404

    # Merge incoming fields onto existing values
    updated = dict(row)
    mutable = ['exercise_id', 'order_index', 'sets', 'reps', 'duration_sec',
               'tempo', 'rest_sec', 'superset_group']
    for field in mutable:
        if field in body:
            updated[field] = body[field]

    conn.execute(
        '''UPDATE level_exercises
           SET exercise_id = ?, order_index = ?, sets = ?,
               reps = ?, duration_sec = ?, tempo = ?,
               rest_sec = ?, superset_group = ?
           WHERE id = ?''',
        (updated['exercise_id'], updated['order_index'], updated['sets'],
         updated['reps'], updated['duration_sec'], updated['tempo'],
         updated['rest_sec'], updated['superset_group'], le_id)
    )
    conn.commit()
    row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
    conn.close()
    return jsonify(dict(row))


@app.route('/level_exercises/<int:le_id>', methods=['DELETE'])
def delete_level_exercise(le_id):
    """Remove a single level_exercise row."""
    conn = get_db_connection()
    row = conn.execute('SELECT id FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({'error': f'level_exercise {le_id} not found'}), 404

    conn.execute('DELETE FROM level_exercises WHERE id = ?', (le_id,))
    conn.commit()
    conn.close()
    return '', 204


@app.route('/exercises/<int:exercise_id>/logs', methods=['GET'])
def get_exercise_logs(exercise_id):
    """Return all raw log rows for one exercise, ordered by timestamp ascending
    (oldest first — convenient for trend charting on the client)."""
    conn = get_db_connection()
    ex = conn.execute('SELECT id FROM exercises WHERE id = ?', (exercise_id,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({'error': f'exercise {exercise_id} not found'}), 404

    rows = conn.execute(
        'SELECT * FROM logs WHERE exercise_id = ? ORDER BY timestamp ASC',
        (exercise_id,)
    ).fetchall()
    conn.close()
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

    conn = get_db_connection()

    # Look up exercise to enforce type-aware field requirement
    ex = conn.execute(
        'SELECT type FROM exercises WHERE id = ?', (body['exercise_id'],)
    ).fetchone()
    if ex is None:
        conn.close()
        return jsonify({'error': f"exercise {body['exercise_id']} not found"}), 404

    ex_type = ex['type']
    if ex_type == 'duration' and body.get('duration_sec') is None:
        conn.close()
        return jsonify({'error': 'duration_sec is required for duration-type exercises'}), 400
    if ex_type == 'reps' and body.get('reps') is None:
        conn.close()
        return jsonify({'error': 'reps is required for reps-type exercises'}), 400

    try:
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO logs
                   (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (
                body['exercise_id'],
                body['timestamp'],
                body.get('reps'),
                body.get('weight_kg'),
                body.get('duration_sec'),
                body.get('rpe'),
                body['client_uuid'],
            )
        )
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        # client_uuid already exists — silent no-op, return existing row
        row = conn.execute(
            'SELECT * FROM logs WHERE client_uuid = ?', (body['client_uuid'],)
        ).fetchone()
        conn.close()
        return jsonify(dict(row)), 200

    row = conn.execute('SELECT * FROM logs WHERE id = ?', (new_id,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201


@app.route('/export', methods=['GET'])
def export_all_logs():
    """Full JSON dump of all logs joined with exercise name and type.
    Ordered by exercise name then timestamp for readable output.
    This is the backup safety net from architecture.md §1 — keep it simple."""
    conn = get_db_connection()
    rows = conn.execute(
        '''
        SELECT
            l.id,
            l.client_uuid,
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
        ORDER  BY e.name ASC, l.timestamp ASC
        '''
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


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
def get_dashboard_summary():
    """Return summary statistics for the dashboard view."""
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
    exercises = conn.execute('SELECT * FROM exercises').fetchall()
    conn.close()

    logs_list = [dict(r) for r in logs]
    ex_map = {e['id']: dict(e) for e in exercises}

    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()

    # Collect all distinct dates with at least one log
    logged_dates = set()
    for l in logs_list:
        ts = str(l.get('timestamp') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    # 1. streak_days: count consecutive calendar days (up to today) with >=1 log entry.
    # Break on first day with zero logs going backwards from today.
    streak_days = 0
    curr = today
    while curr.isoformat() in logged_dates:
        streak_days += 1
        curr -= timedelta(days=1)

    # 2. week_sessions: count distinct calendar days with >=1 log in last 7 days (today - 6 days to today)
    cutoff_7 = (today - timedelta(days=6)).isoformat()
    week_sessions = len([d for d in logged_dates if cutoff_7 <= d <= today_str])

    # 3. week_sets: total count of log rows in last 7 days
    week_sets = sum(1 for l in logs_list if cutoff_7 <= str(l.get('timestamp') or '')[:10] <= today_str)

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


@app.route('/exercises/<int:ex_id>/progression-status', methods=['GET'])
def get_progression_status(ex_id):
    """Return whether this exercise is ready to progress to next_id.

    Logic:
      - Fetch the last N calendar-day sessions (N = progression_sessions_needed).
      - Per session use the *best* set (max reps or max duration_sec).
      - If all N sessions meet or exceed the target, return ready=True with next_id info.
      - If no target is set, return no_target=True.
    """
    conn = get_db_connection()

    ex = conn.execute('SELECT * FROM exercises WHERE id = ?', (ex_id,)).fetchone()
    if ex is None:
        conn.close()
        return jsonify({'error': 'exercise not found'}), 404

    ex = dict(ex)
    target_reps     = ex.get('progression_target_reps')
    target_dur      = ex.get('progression_target_duration')
    sessions_needed = ex.get('progression_sessions_needed') or 2

    # No target configured yet — nothing to evaluate.
    if target_reps is None and target_dur is None:
        conn.close()
        return jsonify({'ready': False, 'no_target': True})

    # Pull all logs for this exercise, ordered newest first.
    logs = conn.execute(
        'SELECT * FROM logs WHERE exercise_id = ? ORDER BY timestamp DESC',
        (ex_id,)
    ).fetchall()
    logs = [dict(r) for r in logs]

    # Group by calendar date (local — use the date portion of ISO timestamp).
    by_date = {}
    for log in logs:
        ts = str(log.get('timestamp') or '')
        date_str = ts[:10] if len(ts) >= 10 else None
        if not date_str:
            continue
        by_date.setdefault(date_str, []).append(log)

    # Most-recent sessions first.
    sorted_dates = sorted(by_date.keys(), reverse=True)

    sessions_at_target = 0
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

    ready = (len(sorted_dates) >= sessions_needed and
             sessions_at_target >= sessions_needed)

    result = {
        'ready': ready,
        'sessions_at_target': sessions_at_target,
        'sessions_needed': sessions_needed,
    }

    if ready and ex.get('next_id'):
        next_ex = conn.execute(
            'SELECT id, name FROM exercises WHERE id = ?', (ex['next_id'],)
        ).fetchone()
        if next_ex:
            result['next_exercise'] = dict(next_ex)

    conn.close()
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, port=5001)

