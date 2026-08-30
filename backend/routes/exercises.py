import sqlite3
from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
    from backend.validators import _parse_int
    from backend.data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
    from backend.services.progression_service import calculate_progression_readiness
except ImportError:
    from db import get_db
    from validators import _parse_int
    from data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
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


# ── Legacy Routine / Level endpoints moved to routes/legacy.py ───────────────
# See backend/routes/legacy.py for /routines/, /routine_levels/, /level_exercises/ endpoints.

