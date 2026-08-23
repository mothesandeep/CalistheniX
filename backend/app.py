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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
