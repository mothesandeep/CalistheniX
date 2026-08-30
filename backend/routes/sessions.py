import sqlite3
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/exercises/<int:exercise_id>/logs', methods=['GET'])
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


@sessions_bp.route('/logs', methods=['POST'])
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
        ex_id = body.get('exercise_id')
        ex = None
        if not ex_id and body.get('exercise_name'):
            matched = conn.execute(
                'SELECT id, type FROM exercises WHERE name = ? COLLATE NOCASE',
                (body['exercise_name'],)
            ).fetchone()
            if matched:
                ex_id = matched['id']
                ex = matched
            else:
                return jsonify({'error': f"exercise '{body.get('exercise_name')}' not found"}), 404
        elif ex_id is not None:
            ex = conn.execute(
                'SELECT type FROM exercises WHERE id = ?', (ex_id,)
            ).fetchone()
            if ex is None:
                return jsonify({'error': f"exercise {ex_id} not found"}), 404
        else:
            return jsonify({'error': "exercise_id or exercise_name is required"}), 400

        ex_type = ex['type']
        if ex_type == 'duration' and body.get('duration_sec') is None:
            return jsonify({'error': 'duration_sec is required for duration-type exercises'}), 400
        if ex_type == 'reps' and body.get('reps') is None:
            return jsonify({'error': 'reps is required for reps-type exercises'}), 400

        phase_raw = (body.get('phase') or 'main').strip().lower().replace('-', '_')
        if phase_raw in ('warmup', 'warm_up'):
            phase = 'warmup'
        elif phase_raw in ('cooldown', 'cool_down'):
            phase = 'cooldown'
        else:
            phase = 'main'

        try:
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT INTO logs
                       (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid, phase)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    ex_id,
                    body['timestamp'],
                    body.get('reps'),
                    body.get('weight_kg'),
                    body.get('duration_sec'),
                    body.get('rpe'),
                    body['client_uuid'],
                    body.get('session_uuid'),
                    phase
                )
            )
            conn.commit()
            new_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            row = conn.execute(
                'SELECT * FROM logs WHERE client_uuid = ?', (body['client_uuid'],)
            ).fetchone()
            return jsonify(dict(row)), 200

        row = conn.execute('SELECT * FROM logs WHERE id = ?', (new_id,)).fetchone()
        return jsonify(dict(row)), 201


@sessions_bp.route('/workout_sessions', methods=['GET'])
def get_workout_sessions():
    """Return all completed workout sessions with tri-phase duration and status metadata."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT id, session_uuid, routine_name, level, started_at, completed_at,
                   duration_sec, warmup_duration_sec, main_duration_sec, cooldown_duration_sec,
                   warmup_status, cooldown_status, total_sets, completed_sets, status, raw_json
            FROM workout_sessions
            ORDER BY completed_at DESC, started_at DESC
            '''
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            raw = None
            if d.get('raw_json'):
                try:
                    raw = json.loads(d['raw_json'])
                except Exception:
                    raw = None

            # Fallbacks for backwards compatibility with legacy rows
            warmup_dur = d.get('warmup_duration_sec') or (raw.get('warmup_duration_sec') if raw else 0) or 0
            cooldown_dur = d.get('cooldown_duration_sec') or (raw.get('cooldown_duration_sec') if raw else 0) or 0
            main_dur = d.get('main_duration_sec') or (raw.get('main_duration_sec') if raw else None)
            if main_dur is None or (main_dur == 0 and (d.get('duration_sec') or 0) > 0 and warmup_dur == 0 and cooldown_dur == 0):
                main_dur = d.get('duration_sec') or 0

            warmup_st = d.get('warmup_status') or (raw.get('warmup_status') if raw else 'none') or 'none'
            cooldown_st = d.get('cooldown_status') or (raw.get('cooldown_status') if raw else 'none') or 'none'

            d['warmup_duration_sec'] = warmup_dur
            d['main_duration_sec'] = main_dur
            d['cooldown_duration_sec'] = cooldown_dur
            d['warmup_status'] = warmup_st
            d['cooldown_status'] = cooldown_st
            results.append(d)

        return jsonify(results), 200


@sessions_bp.route('/workout_sessions/<string:session_uuid>', methods=['GET'])
def get_workout_session_detail(session_uuid):
    """Return detailed session information including tri-phase durations, statuses, snapshot, and logs."""
    with get_db() as conn:
        row = conn.execute(
            'SELECT * FROM workout_sessions WHERE session_uuid = ?', (session_uuid,)
        ).fetchone()
        if not row:
            return jsonify({'error': 'workout session not found'}), 404

        session_dict = dict(row)
        snapshot = None
        if session_dict.get('raw_json'):
            try:
                snapshot = json.loads(session_dict['raw_json'])
                session_dict['snapshot'] = snapshot
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

        # Backward compatibility fallbacks
        warmup_dur = session_dict.get('warmup_duration_sec') or (snapshot.get('warmup_duration_sec') if snapshot else 0) or 0
        cooldown_dur = session_dict.get('cooldown_duration_sec') or (snapshot.get('cooldown_duration_sec') if snapshot else 0) or 0
        main_dur = session_dict.get('main_duration_sec') or (snapshot.get('main_duration_sec') if snapshot else None)
        if main_dur is None or (main_dur == 0 and (session_dict.get('duration_sec') or 0) > 0 and warmup_dur == 0 and cooldown_dur == 0):
            main_dur = session_dict.get('duration_sec') or 0

        warmup_st = session_dict.get('warmup_status') or (snapshot.get('warmup_status') if snapshot else 'none') or 'none'
        cooldown_st = session_dict.get('cooldown_status') or (snapshot.get('cooldown_status') if snapshot else 'none') or 'none'

        session_dict['warmup_duration_sec'] = warmup_dur
        session_dict['main_duration_sec'] = main_dur
        session_dict['cooldown_duration_sec'] = cooldown_dur
        session_dict['warmup_status'] = warmup_st
        session_dict['cooldown_status'] = cooldown_st

        return jsonify(session_dict), 200


@sessions_bp.route('/workout_sessions', methods=['POST'])
def create_or_sync_workout_session():
    """Create or idempotently sync a workout session and its completed sets across phases."""
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

    warmup_duration_sec = body.get('warmup_duration_sec', 0) or 0
    main_duration_sec = body.get('main_duration_sec', 0) or 0
    cooldown_duration_sec = body.get('cooldown_duration_sec', 0) or 0
    warmup_status = body.get('warmup_status', 'none') or 'none'
    cooldown_status = body.get('cooldown_status', 'none') or 'none'

    if main_duration_sec == 0 and duration_sec > 0 and warmup_duration_sec == 0 and cooldown_duration_sec == 0:
        main_duration_sec = duration_sec

    if not session_uuid or not routine_name or not started_at:
        return jsonify({'error': 'session_uuid, routine_name, and started_at are required'}), 400

    exercises = body.get('exercises', [])
    total_sets = 0
    completed_sets = 0
    raw_logs_to_insert = []

    for ex in exercises:
        ex_id = ex.get('exercise_id') or ex.get('id')
        ex_name = ex.get('exercise_name') or ex.get('name')
        ex_type = ex.get('exercise_type') or ex.get('type', 'reps')
        phase = ex.get('phase', 'main')
        if phase not in ('warmup', 'main', 'cooldown'):
            phase = 'main'

        for s in ex.get('sets', []):
            total_sets += 1
            if s.get('completed'):
                completed_sets += 1
                raw_logs_to_insert.append({
                    'exercise_id': ex_id,
                    'exercise_name': ex_name,
                    'timestamp': s.get('completedAt') or s.get('completed_at') or completed_at,
                    'reps': s.get('actual_val') if ex_type == 'reps' else None,
                    'duration_sec': s.get('actual_val') if ex_type == 'duration' else None,
                    'weight_kg': s.get('weight_kg'),
                    'rpe': s.get('rpe'),
                    'phase': phase,
                    'client_uuid': s.get('client_uuid') or f"{session_uuid}_{ex_id or ex_name}_{s.get('set_num', total_sets)}"
                })

    raw_json_str = json.dumps(body)

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                '''
                INSERT INTO workout_sessions
                    (session_uuid, routine_name, level, started_at, completed_at, duration_sec,
                     warmup_duration_sec, main_duration_sec, cooldown_duration_sec,
                     warmup_status, cooldown_status, total_sets, completed_sets, status, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    session_uuid,
                    routine_name,
                    level,
                    str(started_at),
                    str(completed_at),
                    duration_sec,
                    warmup_duration_sec,
                    main_duration_sec,
                    cooldown_duration_sec,
                    warmup_status,
                    cooldown_status,
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
                SET completed_at = ?, duration_sec = ?, warmup_duration_sec = ?,
                    main_duration_sec = ?, cooldown_duration_sec = ?,
                    warmup_status = ?, cooldown_status = ?,
                    total_sets = ?, completed_sets = ?, status = ?, raw_json = ?
                WHERE session_uuid = ?
                ''',
                (
                    str(completed_at),
                    duration_sec,
                    warmup_duration_sec,
                    main_duration_sec,
                    cooldown_duration_sec,
                    warmup_status,
                    cooldown_status,
                    total_sets,
                    completed_sets,
                    status,
                    raw_json_str,
                    session_uuid
                )
            )
            conn.commit()
            created = False

        for log_data in raw_logs_to_insert:
            resolved_ex_id = log_data.get('exercise_id')
            if not resolved_ex_id and log_data.get('exercise_name'):
                match = conn.execute(
                    'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE',
                    (log_data['exercise_name'],)
                ).fetchone()
                if match:
                    resolved_ex_id = match['id']
            if not resolved_ex_id:
                continue

            try:
                cursor.execute(
                    '''
                    INSERT INTO logs (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid, phase)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        resolved_ex_id,
                        str(log_data['timestamp']),
                        log_data.get('reps'),
                        log_data.get('weight_kg'),
                        log_data.get('duration_sec'),
                        log_data.get('rpe'),
                        log_data['client_uuid'],
                        session_uuid,
                        log_data.get('phase', 'main')
                    )
                )
                conn.commit()
            except sqlite3.IntegrityError:
                pass

        row = conn.execute('SELECT * FROM workout_sessions WHERE session_uuid = ?', (session_uuid,)).fetchone()
        return jsonify(dict(row)), (201 if created else 200)
