"""
DEPRECATED legacy routes — pre-split architecture (routine_levels / level_exercises).

These endpoints are kept for backward compatibility with any external client or
old test that still calls them.  New code should use the /workouts and /splits
endpoints instead.  This module will be removed in a future release.
"""
import sqlite3
from flask import Blueprint, jsonify, request

try:
    from backend.app.db.connection import get_db
    from backend.app.utils.validators import _parse_int
except ImportError:
    from db import get_db
    from validators import _parse_int

legacy_bp = Blueprint('legacy', __name__)


@legacy_bp.route('/routines/<string:name>/levels', methods=['GET'])
def get_routine_levels(name):
    """[DEPRECATED] Return all levels for a routine with ordered exercise list.
    Use GET /workouts instead."""
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


@legacy_bp.route('/routine_levels/<int:level_id>/exercises', methods=['POST'])
def add_level_exercise(level_id):
    """[DEPRECATED] Add one exercise entry to a routine level.
    Use PUT /workouts/<id> instead."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['exercise_id', 'order_index', 'sets', 'rest_sec']
    missing = [f for f in required if f not in body or body[f] is None]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    exercise_id, err = _parse_int(body.get('exercise_id'), 'exercise_id', min_val=1)
    if err: return jsonify({'error': err}), 400
    order_index, err = _parse_int(body.get('order_index'), 'order_index', min_val=1)
    if err: return jsonify({'error': err}), 400
    sets, err = _parse_int(body.get('sets'), 'sets', min_val=1)
    if err: return jsonify({'error': err}), 400
    rest_sec, err = _parse_int(body.get('rest_sec'), 'rest_sec', min_val=0)
    if err: return jsonify({'error': err}), 400
    reps, err = _parse_int(body.get('reps'), 'reps', min_val=0, allow_none=True)
    if err: return jsonify({'error': err}), 400
    duration_sec, err = _parse_int(body.get('duration_sec'), 'duration_sec', min_val=0, allow_none=True)
    if err: return jsonify({'error': err}), 400
    superset_group, err = _parse_int(body.get('superset_group'), 'superset_group', min_val=1, allow_none=True)
    if err: return jsonify({'error': err}), 400

    if reps is None and duration_sec is None:
        return jsonify({'error': 'Provide either reps or duration_sec (or both)'}), 400

    with get_db() as conn:
        lvl = conn.execute('SELECT id FROM routine_levels WHERE id = ?', (level_id,)).fetchone()
        if lvl is None:
            return jsonify({'error': f'routine_level {level_id} not found'}), 404
        ex = conn.execute('SELECT id FROM exercises WHERE id = ?', (exercise_id,)).fetchone()
        if ex is None:
            return jsonify({'error': f'exercise {exercise_id} not found'}), 404

        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO level_exercises
                   (routine_level_id, exercise_id, order_index, sets,
                    reps, duration_sec, tempo, rest_sec, superset_group, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (level_id, exercise_id, order_index, sets, reps, duration_sec,
             body.get('tempo'), rest_sec, superset_group, body.get('notes'))
        )
        conn.commit()
        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (cursor.lastrowid,)).fetchone()
        return jsonify(dict(row)), 201


@legacy_bp.route('/routine_levels', methods=['POST'])
def create_routine_level():
    """[DEPRECATED] Create a new (routine_name, level) pair.
    Use POST /workouts instead."""
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
            row = conn.execute(
                'SELECT * FROM routine_levels WHERE routine_name = ? AND level = ?',
                (routine_name, level_val)
            ).fetchone()
            return jsonify(dict(row)), 200

        row = conn.execute('SELECT * FROM routine_levels WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


@legacy_bp.route('/level_exercises/<int:le_id>', methods=['PUT'])
def update_level_exercise(le_id):
    """[DEPRECATED] Update fields on a level_exercise row.
    Use PUT /workouts/<id> instead."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    int_fields = {
        'exercise_id': (1, False),
        'order_index': (1, False),
        'sets':        (1, False),
        'rest_sec':    (0, False),
        'reps':        (0, True),
        'duration_sec': (0, True),
        'superset_group': (1, True),
    }
    validated = {}
    for field, (min_val, allow_none) in int_fields.items():
        if field in body:
            parsed, err = _parse_int(body[field], field, min_val=min_val, allow_none=allow_none)
            if err:
                return jsonify({'error': err}), 400
            validated[field] = parsed

    with get_db() as conn:
        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        if row is None:
            return jsonify({'error': f'level_exercise {le_id} not found'}), 404

        updated = dict(row)
        for field in validated:
            updated[field] = validated[field]
        if 'tempo' in body:
            updated['tempo'] = body['tempo']
        if 'notes' in body:
            updated['notes'] = body['notes']

        if 'exercise_id' in validated:
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
             updated['rest_sec'], updated['superset_group'], updated['notes'], le_id)
        )
        conn.commit()
        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        return jsonify(dict(row)), 200


@legacy_bp.route('/level_exercises/<int:le_id>', methods=['DELETE'])
def delete_level_exercise(le_id):
    """[DEPRECATED] Remove a single level_exercise row.
    Use PUT /workouts/<id> instead."""
    with get_db() as conn:
        row = conn.execute('SELECT id FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        if row is None:
            return jsonify({'error': f'level_exercise {le_id} not found'}), 404
        conn.execute('DELETE FROM level_exercises WHERE id = ?', (le_id,))
        conn.commit()
        return '', 204
