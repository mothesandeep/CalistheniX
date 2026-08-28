import sqlite3
from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
    from backend.utils import _parse_int
    from backend.services.progression_service import calculate_progression_readiness
except ImportError:
    from db import get_db
    from utils import _parse_int
    from services.progression_service import calculate_progression_readiness

exercises_bp = Blueprint('exercises', __name__)


@exercises_bp.route('/exercises', methods=['GET'])
def get_exercises():
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM exercises').fetchall()
        return jsonify([dict(r) for r in rows])


@exercises_bp.route('/exercises', methods=['POST'])
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

    movement_pattern = body.get('movement_pattern')
    if not movement_pattern:
        try:
            from backend.app import EXERCISE_MOVEMENT_PATTERNS
        except ImportError:
            try:
                from app import EXERCISE_MOVEMENT_PATTERNS
            except ImportError:
                EXERCISE_MOVEMENT_PATTERNS = {}
        pattern = EXERCISE_MOVEMENT_PATTERNS.get(name.strip())
        if pattern:
            movement_pattern = pattern
        elif 'Push' in day:
            movement_pattern = 'push_horizontal'
        elif 'Pull' in day:
            movement_pattern = 'pull_vertical'
        elif 'Leg' in day:
            movement_pattern = 'squat'
        else:
            movement_pattern = 'push_horizontal'

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO exercises
                   (name, day, type, movement_pattern, prerequisite_id, next_id, progression_target_reps, progression_target_duration, progression_sessions_needed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                name.strip(),
                day.strip(),
                ex_type.strip(),
                movement_pattern.strip(),
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


@exercises_bp.route('/exercises/<int:ex_id>/progression-status', methods=['GET'])
def get_progression_status(ex_id):
    """Return weighted progression readiness score and status for an exercise."""
    with get_db() as conn:
        ex = conn.execute('SELECT * FROM exercises WHERE id = ?', (ex_id,)).fetchone()
        if ex is None:
            return jsonify({'error': 'exercise not found'}), 404

        ex = dict(ex)
        logs = conn.execute(
            "SELECT * FROM logs WHERE exercise_id = ? AND (phase = 'main' OR phase IS NULL) ORDER BY timestamp DESC",
            (ex_id,)
        ).fetchall()
        logs = [dict(r) for r in logs]

        next_exercise = None
        if ex.get('next_id'):
            next_ex = conn.execute(
                'SELECT id, name FROM exercises WHERE id = ?', (ex['next_id'],)
            ).fetchone()
            if next_ex:
                next_exercise = dict(next_ex)

    result = calculate_progression_readiness(ex, logs, next_exercise)
    return jsonify(result), 200


@exercises_bp.route('/exercises/<int:ex_id>/promote', methods=['POST'])
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


# ── Routine / Level endpoints ─────────────────────────────────────────────────

@exercises_bp.route('/routines/<string:name>/levels', methods=['GET'])
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


@exercises_bp.route('/routine_levels/<int:level_id>/exercises', methods=['POST'])
def add_level_exercise(level_id):
    """Add one exercise entry to a routine level."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['exercise_id', 'order_index', 'sets', 'rest_sec']
    missing = [f for f in required if f not in body or body[f] is None]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

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

    if reps is None and duration_sec is None:
        return jsonify({'error': 'Provide either reps or duration_sec (or both)'}), 400

    tempo = body.get('tempo')
    notes = body.get('notes')

    with get_db() as conn:
        lvl = conn.execute(
            'SELECT id FROM routine_levels WHERE id = ?', (level_id,)
        ).fetchone()
        if lvl is None:
            return jsonify({'error': f'routine_level {level_id} not found'}), 404

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


@exercises_bp.route('/routine_levels', methods=['POST'])
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
            row = conn.execute(
                'SELECT * FROM routine_levels WHERE routine_name = ? AND level = ?',
                (routine_name, level_val)
            ).fetchone()
            return jsonify(dict(row)), 200

        row = conn.execute('SELECT * FROM routine_levels WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


@exercises_bp.route('/level_exercises/<int:le_id>', methods=['PUT'])
def update_level_exercise(le_id):
    """Update any subset of fields on a level_exercise row."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

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

        updated = dict(row)
        for field in ['exercise_id', 'order_index', 'sets', 'reps', 'duration_sec', 'rest_sec', 'superset_group']:
            if field in validated_fields:
                updated[field] = validated_fields[field]

        if 'tempo' in body:
            updated['tempo'] = body['tempo']
        if 'notes' in body:
            updated['notes'] = body['notes']

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
             updated['rest_sec'], updated['superset_group'], updated['notes'],
             le_id)
        )
        conn.commit()

        row = conn.execute('SELECT * FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        return jsonify(dict(row)), 200


@exercises_bp.route('/level_exercises/<int:le_id>', methods=['DELETE'])
def delete_level_exercise(le_id):
    """Remove a single level_exercise row."""
    with get_db() as conn:
        row = conn.execute('SELECT id FROM level_exercises WHERE id = ?', (le_id,)).fetchone()
        if row is None:
            return jsonify({'error': f'level_exercise {le_id} not found'}), 404
        conn.execute('DELETE FROM level_exercises WHERE id = ?', (le_id,))
        conn.commit()
        return '', 204
