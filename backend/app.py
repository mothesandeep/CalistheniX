import sqlite3
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

    # One row per (routine_name, level) pair — e.g. ('Push', 1), ('Pull', 3)
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
        FOREIGN KEY(routine_level_id) REFERENCES routine_levels(id),
        FOREIGN KEY(exercise_id)      REFERENCES exercises(id)
    )
    ''')

    conn.commit()
    conn.close()

# Always run init_db — all statements use CREATE TABLE IF NOT EXISTS,
# so this is safe against an already-initialised DB and picks up new tables
# without requiring a manual migration step.
init_db()


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


if __name__ == '__main__':
    app.run(debug=True, port=5001)
