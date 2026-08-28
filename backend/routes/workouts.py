from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

workouts_bp = Blueprint('workouts', __name__)

VALID_PHASES = ('warmup', 'main', 'cooldown')


def _normalize_workout_exercises_payload(body, conn):
    """
    Normalizes exercise slots from request body into an ordered list of valid exercise dictionaries.
    Supports:
      1. Explicit sections: body['warm_up'] (or 'warmup_exercises'), body['main'] (or 'main_exercises' or 'exercises'), body['cool_down'] (or 'cooldown_exercises')
      2. Unified flat list: body['exercises'] where each item can have 'phase': 'warmup' | 'main' | 'cooldown' (default: 'main')

    Ensures sequential ordering:
      Warm-up exercises (order_index 1..W)
      Main workout exercises (order_index W+1..W+M)
      Cool-down exercises (order_index W+M+1..W+M+C)
    """
    raw_sections = []

    has_warmup_section = 'warm_up' in body or 'warmup_exercises' in body or 'warmup' in body
    has_cooldown_section = 'cool_down' in body or 'cooldown_exercises' in body or 'cooldown' in body
    has_main_section = 'main' in body or 'main_exercises' in body

    if has_warmup_section or has_cooldown_section or has_main_section:
        warmups = body.get('warm_up') or body.get('warmup_exercises') or body.get('warmup') or []
        mains = body.get('main') or body.get('main_exercises') or body.get('exercises') or []
        cooldowns = body.get('cool_down') or body.get('cooldown_exercises') or body.get('cooldown') or []

        for item in warmups:
            if isinstance(item, dict):
                item_copy = dict(item)
                item_copy['phase'] = 'warmup'
                raw_sections.append(item_copy)
        for item in mains:
            if isinstance(item, dict):
                item_copy = dict(item)
                if 'phase' not in item_copy or item_copy['phase'] not in VALID_PHASES:
                    item_copy['phase'] = 'main'
                raw_sections.append(item_copy)
        for item in cooldowns:
            if isinstance(item, dict):
                item_copy = dict(item)
                item_copy['phase'] = 'cooldown'
                raw_sections.append(item_copy)
    else:
        exercises = body.get('exercises', [])
        for item in exercises:
            if isinstance(item, dict):
                raw_sections.append(dict(item))

    def phase_rank(item):
        p = item.get('phase', 'main')
        if p == 'warmup':
            return 0
        if p == 'main':
            return 1
        if p == 'cooldown':
            return 2
        return 1

    sorted_sections = sorted(raw_sections, key=phase_rank)
    normalized = []
    current_order = 1

    for ex in sorted_sections:
        ex_id = ex.get('exercise_id') or ex.get('id')
        if not ex_id:
            ex_name = ex.get('exercise_name') or ex.get('name')
            if ex_name:
                row = conn.execute('SELECT id FROM exercises WHERE name = ? COLLATE NOCASE', (ex_name,)).fetchone()
                if row:
                    ex_id = row['id']
        if not ex_id:
            continue

        phase = ex.get('phase', 'main')
        if phase not in VALID_PHASES:
            phase = 'main'

        default_sets = 1 if phase in ('warmup', 'cooldown') else 3
        sets = ex.get('sets', default_sets)
        try:
            sets = int(sets)
            if sets < 1:
                sets = default_sets
        except (ValueError, TypeError):
            sets = default_sets

        default_rest = 15 if phase in ('warmup', 'cooldown') else 90
        rest_sec = ex.get('rest_sec', default_rest)
        try:
            rest_sec = int(rest_sec)
            if rest_sec < 0:
                rest_sec = default_rest
        except (ValueError, TypeError):
            rest_sec = default_rest

        reps = ex.get('reps')
        if reps is not None and str(reps).strip() != '':
            try:
                reps = int(reps)
            except (ValueError, TypeError):
                reps = None
        else:
            reps = None

        duration_sec = ex.get('duration_sec')
        if duration_sec is not None and str(duration_sec).strip() != '':
            try:
                duration_sec = int(duration_sec)
            except (ValueError, TypeError):
                duration_sec = None
        else:
            duration_sec = None

        normalized.append({
            'exercise_id': ex_id,
            'phase': phase,
            'order_index': current_order,
            'sets': sets,
            'reps': reps,
            'duration_sec': duration_sec,
            'rest_sec': rest_sec,
            'tempo': ex.get('tempo'),
            'superset_group': ex.get('superset_group'),
            'notes': ex.get('notes')
        })
        current_order += 1

    return normalized


@workouts_bp.route('/workouts', methods=['GET'])
def get_workouts():
    """List all reusable workouts with exercise count and total sets across phases."""
    with get_db() as conn:
        rows = conn.execute('''
            SELECT w.*,
                   COUNT(we.id) AS exercise_count,
                   COALESCE(SUM(we.sets), 0) AS total_sets,
                   COALESCE(SUM(CASE WHEN we.phase = 'warmup' THEN we.sets ELSE 0 END), 0) AS warmup_sets,
                   COALESCE(SUM(CASE WHEN we.phase = 'main' THEN we.sets ELSE 0 END), 0) AS main_sets,
                   COALESCE(SUM(CASE WHEN we.phase = 'cooldown' THEN we.sets ELSE 0 END), 0) AS cooldown_sets
            FROM workouts w
            LEFT JOIN workout_exercises we ON w.id = we.workout_id
            GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at
            ORDER BY w.name ASC
        ''').fetchall()
        return jsonify([dict(r) for r in rows]), 200


@workouts_bp.route('/workouts', methods=['POST'])
def create_workout():
    """Create a new reusable workout with warm-up, main, and cool-down exercise slots."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Workout name is required'}), 400

    description = body.get('description', '')

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO workouts (name, description) VALUES (?, ?)', (name, description))
        workout_id = cursor.lastrowid

        exercises = _normalize_workout_exercises_payload(body, conn)

        for ex in exercises:
            cursor.execute('''
                INSERT INTO workout_exercises
                    (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes, phase)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                workout_id,
                ex['exercise_id'],
                ex['order_index'],
                ex['sets'],
                ex['reps'],
                ex['duration_sec'],
                ex['rest_sec'],
                ex['tempo'],
                ex['superset_group'],
                ex['notes'],
                ex['phase']
            ))

        conn.commit()
        detail, _ = get_workout_detail(workout_id)
        return detail, 201


@workouts_bp.route('/workouts/<int:workout_id>', methods=['GET'])
def get_workout_detail(workout_id):
    """Get single workout detail with its ordered exercises and warm-up/main/cool-down breakdown."""
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

        all_exercises = [dict(r) for r in rows]
        for ex in all_exercises:
            if not ex.get('phase'):
                ex['phase'] = 'main'

        warmup_list = [e for e in all_exercises if e['phase'] == 'warmup']
        main_list = [e for e in all_exercises if e['phase'] == 'main']
        cooldown_list = [e for e in all_exercises if e['phase'] == 'cooldown']

        w_dict['exercises'] = all_exercises
        w_dict['warm_up'] = warmup_list
        w_dict['main'] = main_list
        w_dict['cool_down'] = cooldown_list

        w_dict['total_sets'] = sum(r['sets'] for r in rows)
        w_dict['warmup_sets'] = sum(r['sets'] for r in warmup_list)
        w_dict['main_sets'] = sum(r['sets'] for r in main_list)
        w_dict['cooldown_sets'] = sum(r['sets'] for r in cooldown_list)

        return jsonify(w_dict), 200


@workouts_bp.route('/workouts/<int:workout_id>', methods=['PUT'])
def update_workout(workout_id):
    """Update workout name, description, and exercise slots across all phases."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Workout name is required'}), 400

    description = body.get('description', '')

    with get_db() as conn:
        w = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not w:
            return jsonify({'error': 'Workout not found'}), 404

        cursor = conn.cursor()
        cursor.execute(
            'UPDATE workouts SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (name, description, workout_id)
        )

        has_exercises_key = (
            'exercises' in body or
            'warm_up' in body or 'warmup_exercises' in body or 'warmup' in body or
            'main' in body or 'main_exercises' in body or
            'cool_down' in body or 'cooldown_exercises' in body or 'cooldown' in body
        )

        if has_exercises_key:
            cursor.execute('DELETE FROM workout_exercises WHERE workout_id = ?', (workout_id,))
            exercises = _normalize_workout_exercises_payload(body, conn)

            for ex in exercises:
                cursor.execute('''
                    INSERT INTO workout_exercises
                        (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes, phase)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    workout_id,
                    ex['exercise_id'],
                    ex['order_index'],
                    ex['sets'],
                    ex['reps'],
                    ex['duration_sec'],
                    ex['rest_sec'],
                    ex['tempo'],
                    ex['superset_group'],
                    ex['notes'],
                    ex['phase']
                ))

        conn.commit()
        return get_workout_detail(workout_id)


@workouts_bp.route('/workouts/<int:workout_id>/duplicate', methods=['POST'])
def duplicate_workout(workout_id):
    """Duplicate a workout into an independent copy, preserving all phases and ordering."""
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
            phase = e['phase'] if 'phase' in e.keys() and e['phase'] else 'main'
            cursor.execute('''
                INSERT INTO workout_exercises
                    (workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes, phase)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                e['notes'],
                phase
            ))

        conn.commit()
        detail, _ = get_workout_detail(new_workout_id)
        return detail, 201


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


# ── Preset Routine Templates (Warm-up & Cool-Down Libraries) ─────────────────

ROUTINE_PRESETS = {
    'warmups': [
        {
            'id': 'warmup_full_body',
            'category': 'full_body',
            'name': 'Full Body Dynamic Prep',
            'target_body': 'full_body',
            'description': 'Kinetic chain activation: joint mobility, hip openers, and dynamic full-body integration.',
            'exercises': [
                {'name': 'Arm Swings', 'exercise_name': 'Arm Swings', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Dynamic horizontal and overhead arm swings'},
                {'name': 'Wrist Circles', 'exercise_name': 'Wrist Circles', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Controlled clockwise and counter-clockwise rotations'},
                {'name': 'Cat-Cow Stretch', 'exercise_name': 'Cat-Cow Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Segmental thoracic and lumbar articulation'},
                {'name': 'Leg Swings', 'exercise_name': 'Leg Swings', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Forward/backward and lateral dynamic hip swings'},
                {'name': "World's Greatest Stretch", 'exercise_name': "World's Greatest Stretch", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Lunge + thoracic reach toward ceiling'}
            ]
        },
        {
            'id': 'warmup_push',
            'category': 'push',
            'name': 'Push Dynamic Prep',
            'target_body': 'push',
            'description': 'Targeted wrist loading, shoulder capsule mobility, and scapular protraction for pressing patterns.',
            'exercises': [
                {'name': 'Wrist Circles', 'exercise_name': 'Wrist Circles', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Thorough wrist joint preparation'},
                {'name': 'Shoulder CARs', 'exercise_name': 'Shoulder CARs', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Controlled Articular Rotations through full range of motion'},
                {'name': 'Scapular Push-ups', 'exercise_name': 'Scapular Push-ups', 'type': 'reps', 'reps': 10, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Straight arms; isolate protraction and retraction'},
                {'name': 'Arm Swings', 'exercise_name': 'Arm Swings', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Open chest and activate anterior delts dynamically'},
                {'name': 'Incline Push-up Prep', 'exercise_name': 'Incline Push-up Prep', 'type': 'reps', 'reps': 8, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Light pushing progression to prime pressing mechanics'}
            ]
        },
        {
            'id': 'warmup_pull',
            'category': 'pull',
            'name': 'Pull Dynamic Prep',
            'target_body': 'pull',
            'description': 'Scapular depression, shoulder circles, grip prep, and light pulling activation.',
            'exercises': [
                {'name': 'Wrist Preparation', 'exercise_name': 'Wrist Preparation', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Grip and forearm dynamic prep'},
                {'name': 'Arm Circles', 'exercise_name': 'Arm Circles', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Controlled shoulder circumduction'},
                {'name': 'Scapular Pulls', 'exercise_name': 'Scapular Pulls', 'type': 'reps', 'reps': 8, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Engage lower traps and lats to depress scapulae without bending elbows'},
                {'name': 'Dead Hang', 'exercise_name': 'Dead Hang', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Passive to active grip and shoulder decompression'},
                {'name': 'Incline Row Prep', 'exercise_name': 'Incline Row Prep', 'type': 'reps', 'reps': 8, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Light horizontal pulling to prime lat activation'}
            ]
        },
        {
            'id': 'warmup_legs',
            'category': 'legs',
            'name': 'Legs Mobility & Prep',
            'target_body': 'legs',
            'description': 'Ankle mobility, hip openers, dynamic lunges, and bodyweight squat activation.',
            'exercises': [
                {'name': 'Ankle Circles', 'exercise_name': 'Ankle Circles', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Smooth dorsiflexion and plantarflexion rotations'},
                {'name': 'Leg Swings', 'exercise_name': 'Leg Swings', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Dynamic forward and lateral swings'},
                {'name': 'Deep Squat Hold', 'exercise_name': 'Deep Squat Hold', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Heels down, tall spine, open adductors'},
                {'name': 'Bodyweight Squats', 'exercise_name': 'Bodyweight Squats', 'type': 'reps', 'reps': 10, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Smooth controlled tempo through full range'},
                {'name': 'Walking Lunges', 'exercise_name': 'Walking Lunges', 'type': 'reps', 'reps': 10, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Dynamic step lunges to warm glutes and quads'}
            ]
        },
        {
            'id': 'warmup_handstand',
            'category': 'handstand',
            'name': 'Handstand Specific Prep',
            'target_body': 'handstand',
            'description': 'Progressive wrist loading, shoulder flexion mobility, scapular elevation, and chest-to-wall alignment.',
            'exercises': [
                {'name': 'Wrist Preparation', 'exercise_name': 'Wrist Preparation', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Warm up palm base, fingers, and wrist extensors'},
                {'name': 'Wrist Rocks', 'exercise_name': 'Wrist Rocks', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Forward and sideways gentle loading on palms and knuckles'},
                {'name': 'Shoulder Mobility', 'exercise_name': 'Shoulder Mobility', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Full overhead flexion without lumbar arching'},
                {'name': 'Scapular Elevation', 'exercise_name': 'Scapular Elevation', 'type': 'reps', 'reps': 10, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Shrug shoulders to ears overhead with locked elbows'},
                {'name': 'Wall-Facing Handstand Prep', 'exercise_name': 'Wall-Facing Handstand Prep', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Chest to wall; push through floor and hollow body'}
            ]
        },
        {
            'id': 'warmup_planche',
            'category': 'planche',
            'name': 'Planche Specific Prep',
            'target_body': 'planche',
            'description': 'High-torque wrist prep, anterior shoulder activation, locked-arm scapular protraction, and planche leans.',
            'exercises': [
                {'name': 'Wrist Preparation', 'exercise_name': 'Wrist Preparation', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Thorough wrist extension conditioning'},
                {'name': 'Shoulder Activation', 'exercise_name': 'Shoulder Activation', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Straight-arm anterior deltoid engagement'},
                {'name': 'Scapular Protraction', 'exercise_name': 'Scapular Protraction', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Round upper back with straight arms; create dome shape'},
                {'name': 'Planche Lean Prep', 'exercise_name': 'Planche Lean Prep', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Lean shoulders forward past wrists with full protraction'}
            ]
        },
        {
            'id': 'warmup_front_lever',
            'category': 'front_lever',
            'name': 'Front Lever Specific Prep',
            'target_body': 'front_lever',
            'description': 'Straight-arm lat activation, scapular depression/retraction, active dead hang, and hollow body core engagement.',
            'exercises': [
                {'name': 'Shoulder Activation', 'exercise_name': 'Shoulder Activation', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Prime rotator cuff and posterior capsule'},
                {'name': 'Scapular Pulls', 'exercise_name': 'Scapular Pulls', 'type': 'reps', 'reps': 8, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Straight-arm hanging scapular depressions'},
                {'name': 'Dead Hang', 'exercise_name': 'Dead Hang', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Active hang with retracted scapulae and neutral ribcage'},
                {'name': 'Hollow Body Activation', 'exercise_name': 'Hollow Body Activation', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Posterior pelvic tilt with lower back pressed flat to floor'}
            ]
        },
        {
            'id': 'warmup_mobility',
            'category': 'mobility',
            'name': 'Mobility & Joint Prep',
            'target_body': 'mobility',
            'description': 'Thoracic spine waves, shoulder CARs, 90/90 hip transitions, and deep squat decompression.',
            'exercises': [
                {'name': 'Cat-Cow Stretch', 'exercise_name': 'Cat-Cow Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Segmental spinal movement from tailbone to neck'},
                {'name': 'Shoulder CARs', 'exercise_name': 'Shoulder CARs', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Slow controlled circular shoulder rotations'},
                {'name': 'Hip 90/90 Transitions', 'exercise_name': 'Hip 90/90 Transitions', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Internal and external rotational hip mobility'},
                {'name': 'Deep Squat Hold', 'exercise_name': 'Deep Squat Hold', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'warmup', 'coaching_cue': 'Sit deep with elbows pushing knees gently outward'},
                {'name': "World's Greatest Stretch", 'exercise_name': "World's Greatest Stretch", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 15, 'phase': 'warmup', 'coaching_cue': 'Lunge + thoracic twist + hamstring opener'}
            ]
        }
    ],
    'cooldowns': [
        {
            'id': 'cooldown_full_body',
            'category': 'full_body',
            'name': 'Full Body Static Recovery',
            'target_body': 'full_body',
            'description': 'Calming static stretches for chest, lats, hips, hamstrings, and spinal relaxation.',
            'exercises': [
                {'name': 'Chest Stretch', 'exercise_name': 'Chest Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Wall-supported gentle pectoral release'},
                {'name': 'Lat Stretch', 'exercise_name': 'Lat Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Breathe deeply into ribcage and latissimus dorsi'},
                {'name': 'Hip Flexor Stretch', 'exercise_name': 'Hip Flexor Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Kneeling lunge with posterior pelvic tuck'},
                {'name': 'Hamstring Stretch', 'exercise_name': 'Hamstring Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Hinge gently at the hips without rounding lower back'},
                {'name': "Child's Pose", 'exercise_name': "Child's Pose", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Sink hips to heels; slow deep parasympathetic breaths'}
            ]
        },
        {
            'id': 'cooldown_push',
            'category': 'push',
            'name': 'Push Recovery (Chest & Arms)',
            'target_body': 'push',
            'description': 'Targeted static stretching for pectorals, anterior deltoids, triceps, and abdominal wall.',
            'exercises': [
                {'name': 'Chest Stretch', 'exercise_name': 'Chest Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Open anterior chest fibers with gentle wall pressure'},
                {'name': 'Shoulder Stretch', 'exercise_name': 'Shoulder Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Cross-body posterior deltoid release'},
                {'name': 'Overhead Triceps Stretch', 'exercise_name': 'Overhead Triceps Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Elbow bent behind head, gently drawing inward'},
                {'name': 'Cobra Pose', 'exercise_name': 'Cobra Pose', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Gentle prone extension for anterior chain'}
            ]
        },
        {
            'id': 'cooldown_pull',
            'category': 'pull',
            'name': 'Pull Recovery (Lats & Forearms)',
            'target_body': 'pull',
            'description': 'Static stretching for lats, biceps, forearms, and rhomboids following pulling sessions.',
            'exercises': [
                {'name': 'Lat Stretch', 'exercise_name': 'Lat Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Bar or pole supported lat elongation'},
                {'name': 'Biceps & Forearm Stretch', 'exercise_name': 'Biceps & Forearm Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Palm against wall, fingers pointing back'},
                {'name': 'Eagle Arms Stretch', 'exercise_name': 'Eagle Arms Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Intertwine forearms to open upper back and rhomboids'},
                {'name': 'Dead Hang', 'exercise_name': 'Dead Hang', 'type': 'duration', 'duration_sec': 20, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Passive relaxing decompression of spine and shoulders'}
            ]
        },
        {
            'id': 'cooldown_legs',
            'category': 'legs',
            'name': 'Legs Flexibility & Recovery',
            'target_body': 'legs',
            'description': 'Deep static stretches for hip flexors, hamstrings, glutes, adductors, and calves.',
            'exercises': [
                {'name': 'Hip Flexor Stretch', 'exercise_name': 'Hip Flexor Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Tuck pelvis under to isolate psoas'},
                {'name': 'Hamstring Stretch', 'exercise_name': 'Hamstring Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Seated or standing hinge with relaxed neck'},
                {'name': 'Pigeon Pose', 'exercise_name': 'Pigeon Pose', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Deep piriformis and gluteus medius opening'},
                {'name': 'Standing Calf Stretch', 'exercise_name': 'Standing Calf Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Wall-assisted heel-down gastrocnemius stretch'},
                {'name': 'Butterfly Stretch', 'exercise_name': 'Butterfly Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Soles together, gentle adductor release'}
            ]
        },
        {
            'id': 'cooldown_handstand',
            'category': 'handstand',
            'name': 'Handstand Decompression',
            'target_body': 'handstand',
            'description': 'Wrist relief, posterior capsule stretch, lat elongation, and child\'s pose spinal release.',
            'exercises': [
                {'name': 'Reverse Wrist Stretch', 'exercise_name': 'Reverse Wrist Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Gentle palms-up wrist extensor release'},
                {'name': 'Shoulder Stretch', 'exercise_name': 'Shoulder Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Cross-body deltoid stretch'},
                {'name': 'Lat Stretch', 'exercise_name': 'Lat Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Side body and overhead shoulder opener'},
                {'name': "Child's Pose", 'exercise_name': "Child's Pose", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Calm breathing and spinal decompression'}
            ]
        },
        {
            'id': 'cooldown_planche',
            'category': 'planche',
            'name': 'Planche Recovery (Wrists & Biceps)',
            'target_body': 'planche',
            'description': 'Wrist flexor/extensor release, distal biceps wall stretch, and anterior deltoid relief.',
            'exercises': [
                {'name': 'Reverse Wrist Stretch', 'exercise_name': 'Reverse Wrist Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Kneeling palms-up gentle extensor stretch'},
                {'name': 'Biceps & Forearm Stretch', 'exercise_name': 'Biceps & Forearm Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Distal biceps and anterior capsule wall stretch'},
                {'name': 'Chest Stretch', 'exercise_name': 'Chest Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Pectoral and shoulder opener'},
                {'name': "Child's Pose", 'exercise_name': "Child's Pose", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Restorative diaphragmatic breathing'}
            ]
        },
        {
            'id': 'cooldown_front_lever',
            'category': 'front_lever',
            'name': 'Front Lever Recovery (Lats & Spine)',
            'target_body': 'front_lever',
            'description': 'Lat decompression, prone abdominal stretch, thoracic extension, and seated forward fold.',
            'exercises': [
                {'name': 'Lat Stretch', 'exercise_name': 'Lat Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Bar-assisted lat and teres major stretch'},
                {'name': 'Cobra Pose', 'exercise_name': 'Cobra Pose', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Abdominal wall and anterior hip stretch'},
                {'name': 'Puppy Pose', 'exercise_name': 'Puppy Pose', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Thoracic extension with chest melting toward floor'},
                {'name': 'Seated Forward Fold', 'exercise_name': 'Seated Forward Fold', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Relaxed posterior chain and lower back release'}
            ]
        },
        {
            'id': 'cooldown_mobility',
            'category': 'mobility',
            'name': 'Mobility & Decompression',
            'target_body': 'mobility',
            'description': 'Restorative hip and spine circuit: Child\'s pose, Pigeon pose, spinal twist, and butterfly stretch.',
            'exercises': [
                {'name': "Child's Pose", 'exercise_name': "Child's Pose", 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Deep restorative spinal resting pose'},
                {'name': 'Pigeon Pose', 'exercise_name': 'Pigeon Pose', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Deep glute and outer hip relaxation'},
                {'name': 'Supine Spinal Twist', 'exercise_name': 'Supine Spinal Twist', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Gentle rotational release for lower back and hips'},
                {'name': 'Butterfly Stretch', 'exercise_name': 'Butterfly Stretch', 'type': 'duration', 'duration_sec': 30, 'sets': 1, 'rest_sec': 10, 'phase': 'cooldown', 'coaching_cue': 'Adductor and pelvic floor relaxation'}
            ]
        }
    ]
}


@workouts_bp.route('/api/routine-templates', methods=['GET'])
@workouts_bp.route('/workouts/templates', methods=['GET'])
def get_routine_templates():
    """Get catalog of preset warm-up and cool-down routine templates."""
    with get_db() as conn:
        exercises = conn.execute('SELECT id, name, type, movement_pattern FROM exercises').fetchall()
        ex_map = {e['name'].lower(): dict(e) for e in exercises}

        # Populate exercise_id for all template items dynamically
        presets_copy = {
            'warmups': [],
            'cooldowns': []
        }

        for category in ('warmups', 'cooldowns'):
            for tpl in ROUTINE_PRESETS[category]:
                tpl_copy = dict(tpl)
                enriched_exs = []
                for ex in tpl['exercises']:
                    e_copy = dict(ex)
                    lookup = ex_map.get(e_copy['exercise_name'].lower())
                    if lookup:
                        e_copy['exercise_id'] = lookup['id']
                        e_copy['exercise_type'] = lookup['type']
                    enriched_exs.append(e_copy)
                tpl_copy['exercises'] = enriched_exs
                presets_copy[category].append(tpl_copy)

        return jsonify(presets_copy), 200
