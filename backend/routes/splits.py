from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

splits_bp = Blueprint('splits', __name__)


@splits_bp.route('/splits', methods=['GET'])
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


@splits_bp.route('/splits', methods=['POST'])
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


@splits_bp.route('/splits/<int:split_id>', methods=['GET'])
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


@splits_bp.route('/splits/<int:split_id>', methods=['PUT'])
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


@splits_bp.route('/splits/<int:split_id>', methods=['DELETE'])
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


@splits_bp.route('/splits/<int:split_id>/schedule', methods=['GET'])
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


@splits_bp.route('/splits/<int:split_id>/schedule', methods=['PUT'])
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


@splits_bp.route('/splits/<int:split_id>/schedule/<int:day_of_week>', methods=['PUT'])
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
