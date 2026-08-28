import sqlite3
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

backup_bp = Blueprint('backup', __name__)


@backup_bp.route('/export', methods=['GET'])
def export_all_logs():
    """Full JSON dump of all workout_sessions, logs, and exercise catalogs.
    This is the backup safety net — comprehensive and versioned."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                l.id,
                l.client_uuid,
                l.session_uuid,
                l.timestamp,
                l.reps,
                l.weight_kg,
                l.duration_sec,
                l.rpe,
                l.phase,
                e.id          AS exercise_id,
                e.name        AS exercise_name,
                e.type        AS exercise_type,
                e.day         AS exercise_day
            FROM   logs l
            JOIN   exercises e ON e.id = l.exercise_id
            ORDER  BY l.timestamp ASC
            '''
        ).fetchall()

        sessions = conn.execute(
            'SELECT * FROM workout_sessions ORDER BY completed_at ASC'
        ).fetchall()

        exercises = conn.execute(
            'SELECT * FROM exercises ORDER BY id ASC'
        ).fetchall()

        splits = conn.execute('SELECT * FROM training_splits ORDER BY id ASC').fetchall()
        schedules = conn.execute('SELECT * FROM weekly_schedules ORDER BY split_id ASC, day_of_week ASC').fetchall()
        workouts = conn.execute('SELECT * FROM workouts ORDER BY id ASC').fetchall()
        workout_exercises = conn.execute('SELECT * FROM workout_exercises ORDER BY workout_id ASC, order_index ASC').fetchall()

        if request.args.get('format') == 'legacy':
            return jsonify([dict(r) for r in rows]), 200

        return jsonify({
            'export_version': '2.1',
            'exported_at': datetime.now(timezone.utc).isoformat(),
            'logs': [dict(r) for r in rows],
            'workout_sessions': [dict(s) for s in sessions],
            'exercises': [dict(e) for e in exercises],
            'training_splits': [dict(s) for s in splits],
            'weekly_schedules': [dict(ws) for ws in schedules],
            'workouts': [dict(w) for w in workouts],
            'workout_exercises': [dict(we) for we in workout_exercises]
        }), 200


@backup_bp.route('/import', methods=['POST'])
def import_logs():
    """Import and merge a JSON backup dump.
    Idempotent: uses client_uuid and session_uuid to skip already-existing entries.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    if isinstance(body, list):
        log_items = body
        session_items = []
    elif isinstance(body, dict):
        log_items = body.get('logs', [])
        session_items = body.get('workout_sessions', [])
    else:
        return jsonify({'error': 'Expected a JSON object or array'}), 400

    if not isinstance(log_items, list) or not isinstance(session_items, list):
        return jsonify({'error': 'Invalid backup format'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        imported_logs = 0
        skipped_logs = 0
        imported_sessions = 0
        skipped_sessions = 0

        # 1. Import workout sessions
        for s in session_items:
            if not isinstance(s, dict):
                continue
            sess_uuid = s.get('session_uuid') or s.get('id')
            routine_name = s.get('routine_name') or s.get('routine')
            started_at = s.get('started_at') or s.get('startTime')
            if not sess_uuid or not routine_name or not started_at:
                continue
            try:
                tot_dur = s.get('duration_sec', 0)
                main_dur = s.get('main_duration_sec', tot_dur)
                warm_dur = s.get('warmup_duration_sec', 0)
                cool_dur = s.get('cooldown_duration_sec', 0)
                warm_stat = s.get('warmup_status', 'none')
                cool_stat = s.get('cooldown_status', 'none')

                cursor.execute(
                    '''
                    INSERT INTO workout_sessions
                        (session_uuid, routine_name, level, started_at, completed_at, duration_sec,
                         warmup_duration_sec, main_duration_sec, cooldown_duration_sec,
                         warmup_status, cooldown_status, total_sets, completed_sets, status, raw_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        sess_uuid,
                        routine_name,
                        s.get('level', 1),
                        str(started_at),
                        str(s.get('completed_at') or started_at),
                        tot_dur,
                        warm_dur,
                        main_dur,
                        cool_dur,
                        warm_stat,
                        cool_stat,
                        s.get('total_sets', 0),
                        s.get('completed_sets', 0),
                        s.get('status', 'completed'),
                        s.get('raw_json') or json.dumps(s)
                    )
                )
                imported_sessions += 1
            except sqlite3.IntegrityError:
                skipped_sessions += 1

        # 2. Import log entries
        for item in log_items:
            if not isinstance(item, dict):
                continue
            ex_id = item.get('exercise_id')
            ts = item.get('timestamp')
            uuid_str = item.get('client_uuid') or item.get('uuid')
            session_uuid = item.get('session_uuid')

            if not ex_id or not ts or not uuid_str:
                continue

            try:
                cursor.execute(
                    '''INSERT INTO logs (exercise_id, timestamp, reps, weight_kg, duration_sec, rpe, client_uuid, session_uuid, phase)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (
                        ex_id,
                        ts,
                        item.get('reps'),
                        item.get('weight_kg'),
                        item.get('duration_sec'),
                        item.get('rpe'),
                        uuid_str,
                        session_uuid,
                        item.get('phase', 'main')
                    )
                )
                imported_logs += 1
            except sqlite3.IntegrityError:
                skipped_logs += 1

        # 3. Import workouts & workout_exercises if present
        workout_items = body.get('workouts', []) if isinstance(body, dict) else []
        for w in workout_items:
            if not isinstance(w, dict) or not w.get('name'):
                continue
            w_id = w.get('id')
            existing = None
            if w_id:
                existing = conn.execute('SELECT id FROM workouts WHERE id = ?', (w_id,)).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO workouts (id, name, description) VALUES (?, ?, ?)',
                    (w_id, w['name'], w.get('description', ''))
                )
            else:
                cursor.execute(
                    'UPDATE workouts SET name = ?, description = ? WHERE id = ?',
                    (w['name'], w.get('description', ''), existing['id'])
                )

        we_items = body.get('workout_exercises', []) if isinstance(body, dict) else []
        for we in we_items:
            if not isinstance(we, dict) or not we.get('workout_id') or not we.get('exercise_id'):
                continue
            we_id = we.get('id')
            existing = None
            if we_id:
                existing = conn.execute('SELECT id FROM workout_exercises WHERE id = ?', (we_id,)).fetchone()
            if not existing:
                try:
                    phase = we.get('phase', 'main')
                    cursor.execute('''
                        INSERT INTO workout_exercises
                            (id, workout_id, exercise_id, order_index, sets, reps, duration_sec, rest_sec, tempo, superset_group, notes, phase)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        we_id,
                        we['workout_id'],
                        we['exercise_id'],
                        we.get('order_index', 1),
                        we.get('sets', 3),
                        we.get('reps'),
                        we.get('duration_sec'),
                        we.get('rest_sec', 90),
                        we.get('tempo'),
                        we.get('superset_group'),
                        we.get('notes'),
                        phase
                    ))
                except sqlite3.IntegrityError:
                    pass

        # 4. Import training_splits & weekly_schedules if present
        split_items = body.get('training_splits', []) if isinstance(body, dict) else []
        for sp in split_items:
            if not isinstance(sp, dict) or not sp.get('name'):
                continue
            sp_id = sp.get('id')
            existing = None
            if sp_id:
                existing = conn.execute('SELECT id FROM training_splits WHERE id = ?', (sp_id,)).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO training_splits (id, name, description, is_active) VALUES (?, ?, ?, ?)',
                    (sp_id, sp['name'], sp.get('description', ''), sp.get('is_active', 0))
                )

        ws_items = body.get('weekly_schedules', []) if isinstance(body, dict) else []
        for ws in ws_items:
            if not isinstance(ws, dict) or 'split_id' not in ws or 'day_of_week' not in ws:
                continue
            cursor.execute('''
                INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(split_id, day_of_week) DO UPDATE SET
                    day_type = excluded.day_type,
                    workout_id = excluded.workout_id
            ''', (ws['split_id'], ws['day_of_week'], ws.get('day_type', 'workout'), ws.get('workout_id')))

        conn.commit()
        return jsonify({
            'status': 'success',
            'imported_logs': imported_logs,
            'skipped_logs': skipped_logs,
            'imported_sessions': imported_sessions,
            'skipped_sessions': skipped_sessions,
            'imported_workouts': len(workout_items),
            'imported_splits': len(split_items),
            'total_processed': len(log_items) + len(session_items)
        }), 200
