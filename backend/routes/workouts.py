from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

workouts_bp = Blueprint('workouts', __name__)


@workouts_bp.route('/workouts', methods=['GET'])
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


@workouts_bp.route('/workouts', methods=['POST'])
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


@workouts_bp.route('/workouts/<int:workout_id>', methods=['GET'])
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


@workouts_bp.route('/workouts/<int:workout_id>', methods=['PUT'])
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


@workouts_bp.route('/workouts/<int:workout_id>/duplicate', methods=['POST'])
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


@workouts_bp.route('/workouts/<int:workout_id>', methods=['DELETE'])
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
