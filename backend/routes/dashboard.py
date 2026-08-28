from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify

try:
    from backend.db import get_db
    from backend.services.dashboard_service import (
        calculate_streak,
        calculate_week_stats,
        calculate_top_movers,
        format_personal_records,
        compute_muscle_focus
    )
except ImportError:
    from db import get_db
    from services.dashboard_service import (
        calculate_streak,
        calculate_week_stats,
        calculate_top_movers,
        format_personal_records,
        compute_muscle_focus
    )

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

dashboard_bp = Blueprint('dashboard', __name__)


# ── Today Resolver Endpoint (Custom Split Model) ───────────────────────────────

@dashboard_bp.route('/today', methods=['GET'])
@dashboard_bp.route('/api/today-workout', methods=['GET'])
def get_today_resolved():
    """Resolve today's workout based on active training split and current day of week."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        now = datetime.now()
        day_of_week = now.weekday()  # 0=Monday .. 6=Sunday
        day_name = DAY_NAMES[day_of_week]

        if not active_split:
            return jsonify({
                'status': 'no_split',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'message': 'No training split configured'
            }), 200

        split_id = active_split['id']
        split_name = active_split['name']

        sched = conn.execute(
            'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
            (split_id, day_of_week)
        ).fetchone()

        if not sched or sched['day_type'] == 'rest' or not sched['workout_id']:
            # Search for next scheduled workout
            next_workout = None
            for offset in range(1, 8):
                next_day_idx = (day_of_week + offset) % 7
                next_sched = conn.execute(
                    'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
                    (split_id, next_day_idx)
                ).fetchone()
                if next_sched and next_sched['day_type'] == 'workout' and next_sched['workout_id']:
                    w = conn.execute('SELECT * FROM workouts WHERE id = ?', (next_sched['workout_id'],)).fetchone()
                    if w:
                        next_workout = {
                            'day_of_week': next_day_idx,
                            'day_name': DAY_NAMES[next_day_idx],
                            'workout_id': w['id'],
                            'workout_name': w['name']
                        }
                        break

            return jsonify({
                'status': 'rest',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'split_id': split_id,
                'split_name': split_name,
                'message': 'Rest Day — Recovery & Adaptations',
                'next_workout': next_workout
            }), 200

        workout_id = sched['workout_id']
        workout = conn.execute('SELECT * FROM workouts WHERE id = ?', (workout_id,)).fetchone()
        if not workout:
            return jsonify({
                'status': 'rest',
                'day_of_week': day_of_week,
                'day_name': day_name,
                'split_id': split_id,
                'split_name': split_name,
                'message': 'Assigned workout was not found',
                'next_workout': None
            }), 200

        rows = conn.execute('''
            SELECT we.*, e.name as exercise_name, e.type as exercise_type,
                   e.progression_target_reps, e.progression_target_duration
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.order_index ASC, we.id ASC
        ''', (workout_id,)).fetchall()

        exercises = []
        for r in rows:
            last_log = conn.execute('''
                SELECT reps, duration_sec, weight_kg, rpe, timestamp
                FROM logs
                WHERE exercise_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (r['exercise_id'],)).fetchone()

            phase_val = r['phase'] if ('phase' in r.keys() and r['phase']) else 'main'
            exercises.append({
                'id': r['id'],
                'workout_id': r['workout_id'],
                'exercise_id': r['exercise_id'],
                'exercise_name': r['exercise_name'],
                'exercise_type': r['exercise_type'],
                'order_index': r['order_index'],
                'sets': r['sets'],
                'reps': r['reps'],
                'duration_sec': r['duration_sec'],
                'rest_sec': r['rest_sec'],
                'tempo': r['tempo'],
                'superset_group': r['superset_group'],
                'notes': r['notes'],
                'phase': phase_val,
                'last_log': dict(last_log) if last_log else None
            })

        warmup_list = [e for e in exercises if e['phase'] == 'warmup']
        main_list = [e for e in exercises if e['phase'] == 'main']
        cooldown_list = [e for e in exercises if e['phase'] == 'cooldown']

        total_sets = sum(e['sets'] for e in exercises)
        warmup_sets = sum(e['sets'] for e in warmup_list)
        main_sets = sum(e['sets'] for e in main_list)
        cooldown_sets = sum(e['sets'] for e in cooldown_list)

        return jsonify({
            'status': 'workout',
            'day_of_week': day_of_week,
            'day_name': day_name,
            'split_id': split_id,
            'split_name': split_name,
            'workout': {
                'id': workout['id'],
                'name': workout['name'],
                'description': workout['description'],
                'total_sets': total_sets,
                'warmup_sets': warmup_sets,
                'main_sets': main_sets,
                'cooldown_sets': cooldown_sets,
                'exercises': exercises,
                'warm_up': warmup_list,
                'warmup': warmup_list,
                'main': main_list,
                'cool_down': cooldown_list,
                'cooldown': cooldown_list
            }
        }), 200


# ── Dashboard summary / records / activity ───────────────────────────────────

@dashboard_bp.route('/dashboard/summary', methods=['GET'])
@dashboard_bp.route('/api/stats-summary', methods=['GET'])
def get_dashboard_summary():
    """Return summary statistics for the dashboard view."""
    with get_db() as conn:
        logs = conn.execute("SELECT * FROM logs WHERE (phase IS NULL OR phase = '' OR phase = 'main') ORDER BY timestamp ASC").fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()
        sessions = conn.execute("SELECT * FROM workout_sessions WHERE status = 'completed' ORDER BY completed_at ASC").fetchall()

    logs_list = [dict(r) for r in logs]
    sessions_list = [dict(r) for r in sessions]
    ex_map = {e['id']: dict(e) for e in exercises}

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()

    logged_dates = set()
    for l in logs_list:
        ts = str(l.get('timestamp') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    for s in sessions_list:
        ts = str(s.get('completed_at') or s.get('started_at') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    streak_days, today = calculate_streak(logged_dates, today_local, today_utc)
    week_sessions, week_sets = calculate_week_stats(logged_dates, logs_list, sessions_list, today, today_local, today_utc)
    top_movers = calculate_top_movers(logs_list, ex_map, today, limit=3)

    return jsonify({
        'streak_days': streak_days,
        'week_sessions': week_sessions,
        'week_sets': week_sets,
        'top_movers': top_movers
    })


@dashboard_bp.route('/api/weekly-progress', methods=['GET'])
def get_weekly_progress():
    """Return weekly workout completion and 7-day status."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        schedule = []
        if active_split:
            rows = conn.execute(
                '''
                SELECT s.day_of_week, s.day_type, s.workout_id, w.name as workout_name
                FROM weekly_schedules s
                LEFT JOIN workouts w ON s.workout_id = w.id
                WHERE s.split_id = ?
                ORDER BY s.day_of_week ASC
                ''', (active_split['id'],)
            ).fetchall()
            schedule = [dict(r) for r in rows]

        planned_count = len([d for d in schedule if d.get('day_type') == 'workout']) or 4
        today = datetime.now(timezone.utc).date()
        cutoff_7 = (today - timedelta(days=6)).isoformat()
        logs = conn.execute(
            'SELECT DISTINCT SUBSTR(timestamp, 1, 10) as dt FROM logs WHERE timestamp >= ?',
            (cutoff_7,)
        ).fetchall()
        done_count = len(logs)
        pct = min(100, int((done_count / max(1, planned_count)) * 100))

        return jsonify({
            'planned_workouts': planned_count,
            'completed_workouts': done_count,
            'completion_pct': pct,
            'schedule': schedule
        })


@dashboard_bp.route('/api/muscle-focus', methods=['GET'])
def get_muscle_focus():
    """Return muscle targets for today's resolved workout."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        day_of_week = datetime.now().weekday()
        if not active_split:
            return jsonify({'muscle_label': 'Full Body Mobility', 'front': ['abs', 'quads'], 'back': ['glutes', 'calves']})

        sched = conn.execute(
            'SELECT * FROM weekly_schedules WHERE split_id = ? AND day_of_week = ?',
            (active_split['id'], day_of_week)
        ).fetchone()

        if not sched or sched['day_type'] == 'rest' or not sched['workout_id']:
            return jsonify({'muscle_label': 'Active Recovery & Mobility', 'front': ['abs'], 'back': ['lower_back', 'calves']})

        workout = conn.execute('SELECT * FROM workouts WHERE id = ?', (sched['workout_id'],)).fetchone()
        workout_name = workout['name'] if workout else ''
        workout_desc = workout['description'] if workout else ''

    return jsonify(compute_muscle_focus(workout_name, workout_desc))


@dashboard_bp.route('/api/exercise-progress', methods=['GET'])
def get_exercise_progress_api():
    """Return top mover progressions for the dashboard."""
    with get_db() as conn:
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()

    logs_list = [dict(r) for r in logs]
    ex_map = {e['id']: dict(e) for e in exercises}
    today = datetime.now(timezone.utc).date()

    movers = calculate_top_movers(logs_list, ex_map, today, limit=4)
    return jsonify(movers)


@dashboard_bp.route('/api/upcoming-workouts', methods=['GET'])
def get_upcoming_workouts():
    """Return next 3 days of workouts from active split."""
    with get_db() as conn:
        active_split = conn.execute('SELECT * FROM training_splits WHERE is_active = 1').fetchone()
        if not active_split:
            active_split = conn.execute('SELECT * FROM training_splits ORDER BY id ASC LIMIT 1').fetchone()

        if not active_split:
            return jsonify([])

        today_dow = datetime.now().weekday()
        upcoming = []
        for offset in range(1, 4):
            day_idx = (today_dow + offset) % 7
            sched = conn.execute(
                '''
                SELECT s.day_of_week, s.day_type, s.workout_id, w.name as workout_name, w.description as workout_desc
                FROM weekly_schedules s
                LEFT JOIN workouts w ON s.workout_id = w.id
                WHERE s.split_id = ? AND s.day_of_week = ?
                ''', (active_split['id'], day_idx)
            ).fetchone()

            is_workout = sched and sched['day_type'] == 'workout' and sched['workout_id']
            upcoming.append({
                'day_offset': offset,
                'day_of_week': day_idx,
                'day_name': DAY_NAMES[day_idx],
                'is_workout': bool(is_workout),
                'workout_id': sched['workout_id'] if is_workout else None,
                'workout_name': sched['workout_name'] if is_workout else 'Rest & Recovery',
                'description': sched['workout_desc'] if is_workout else 'Active Recovery & Mobility'
            })

        return jsonify(upcoming)


@dashboard_bp.route('/dashboard/records', methods=['GET'])
@dashboard_bp.route('/api/recent-prs', methods=['GET'])
def get_personal_records():
    """Return all-time Personal Records (PRs) across all exercises with dynamic relative date labels."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                e.id                AS exercise_id,
                e.name              AS exercise_name,
                e.type              AS exercise_type,
                MAX(l.reps)         AS max_reps,
                MAX(l.duration_sec) AS max_duration_sec,
                MAX(l.weight_kg)    AS max_weight_kg,
                MAX(l.timestamp)    AS last_achieved_at,
                COUNT(l.id)         AS total_logs
            FROM exercises e
            JOIN logs l ON l.exercise_id = e.id
            WHERE (l.phase IS NULL OR l.phase = '' OR l.phase = 'main')
            GROUP BY e.id, e.name, e.type
            ORDER BY last_achieved_at DESC, total_logs DESC
            '''
        ).fetchall()

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()

    results = format_personal_records(rows, today_local, today_utc)
    return jsonify(results)


@dashboard_bp.route('/dashboard/activity', methods=['GET'])
def get_activity_heatmap():
    """Return day-by-day training volume and sets for the last 30 days."""
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT
                SUBSTR(timestamp, 1, 10) AS date,
                COUNT(id)                AS total_sets,
                SUM(COALESCE(reps, 0))   AS total_reps,
                SUM(COALESCE(duration_sec, 0)) AS total_duration_sec
            FROM logs
            WHERE timestamp >= date('now', '-30 days')
              AND (phase IS NULL OR phase = '' OR phase = 'main')
            GROUP BY SUBSTR(timestamp, 1, 10)
            ORDER BY date ASC
            '''
        ).fetchall()
        return jsonify([dict(r) for r in rows])

