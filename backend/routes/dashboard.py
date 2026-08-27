from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request

try:
    from backend.db import get_db
except ImportError:
    from db import get_db

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

dashboard_bp = Blueprint('dashboard', __name__)


# ── Dashboard aggregation helpers ────────────────────────────────────────────

def compute_exercise_progress(ex_type, logs):
    """Group raw log rows by calendar day and compute daily progress metric."""
    if not logs:
        return []

    by_date = {}
    for log in logs:
        ts = log.get('timestamp') or ''
        date_str = str(ts)[:10]
        if not date_str:
            continue
        if date_str not in by_date:
            by_date[date_str] = []
        by_date[date_str].append(log)

    sorted_dates = sorted(by_date.keys())
    points = []
    for d in sorted_dates:
        day_logs = by_date[d]
        if ex_type == 'duration':
            metric = max((l.get('duration_sec') or 0) for l in day_logs)
        else:
            metric = sum(
                ((l.get('reps') or 0) * l['weight_kg']) if l.get('weight_kg') else (l.get('reps') or 0)
                for l in day_logs
            )
        points.append({'date': d, 'metric': metric})
    return points


def compute_exercise_stats(points, today):
    """Compute current, 2wk_ago, and pct_change for an exercise.
    Requires at least 2 logged sessions in the last 2 weeks (or comparing against <= 14d ago)."""
    if not points or len(points) < 2:
        return None

    cutoff_14 = (today - timedelta(days=14)).isoformat()
    points_in_2wk = [p for p in points if p['date'] >= cutoff_14]
    past_points = [p for p in points if p['date'] <= cutoff_14]

    if past_points:
        past = past_points[-1]['metric']
    elif len(points_in_2wk) >= 2:
        past = points_in_2wk[0]['metric']
    else:
        return None

    current = points[-1]['metric']

    if past is not None and past > 0:
        pct = round((current - past) / past * 100)
        return {
            'current': current,
            'past': past,
            'pct': pct
        }
    return None


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
                'last_log': dict(last_log) if last_log else None
            })

        total_sets = sum(e['sets'] for e in exercises)

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
                'exercises': exercises
            }
        }), 200


# ── Dashboard summary / records / activity ───────────────────────────────────

@dashboard_bp.route('/dashboard/summary', methods=['GET'])
@dashboard_bp.route('/api/stats-summary', methods=['GET'])
def get_dashboard_summary():
    """Return summary statistics for the dashboard view."""
    with get_db() as conn:
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()
        sessions = conn.execute("SELECT * FROM workout_sessions WHERE status = 'completed' ORDER BY completed_at ASC").fetchall()

    logs_list = [dict(r) for r in logs]
    sessions_list = [dict(r) for r in sessions]
    ex_map = {e['id']: dict(e) for e in exercises}

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()
    today_str_utc = today_utc.isoformat()
    today_str_local = today_local.isoformat()

    # Collect all distinct dates with at least one log or completed workout session
    logged_dates = set()
    for l in logs_list:
        ts = str(l.get('timestamp') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    for s in sessions_list:
        ts = str(s.get('completed_at') or s.get('started_at') or '')
        if len(ts) >= 10:
            logged_dates.add(ts[:10])

    # Choose anchor date for today (match local or UTC if logged today)
    if today_str_local in logged_dates:
        today = today_local
    elif today_str_utc in logged_dates:
        today = today_utc
    else:
        today = today_local
    today_str = today.isoformat()

    # 1. streak_days: count consecutive calendar days with >=1 log or session entry.
    streak_days = 0
    if today_str in logged_dates or today_str_utc in logged_dates or today_str_local in logged_dates:
        curr = today
        while curr.isoformat() in logged_dates:
            streak_days += 1
            curr -= timedelta(days=1)
    else:
        yesterday_local = today_local - timedelta(days=1)
        yesterday_utc = today_utc - timedelta(days=1)
        if yesterday_local.isoformat() in logged_dates:
            curr = yesterday_local
            while curr.isoformat() in logged_dates:
                streak_days += 1
                curr -= timedelta(days=1)
        elif yesterday_utc.isoformat() in logged_dates:
            curr = yesterday_utc
            while curr.isoformat() in logged_dates:
                streak_days += 1
                curr -= timedelta(days=1)

    # 2. week_sessions: count distinct calendar days with >=1 log/session in last 7 days
    cutoff_7 = (today - timedelta(days=6)).isoformat()
    week_sessions = len([d for d in logged_dates if cutoff_7 <= d <= max(today_str, today_str_utc, today_str_local)])

    # 3. week_sets: total count of completed sets from logs and workout_sessions in last 7 days
    max_today_str = max(today_str, today_str_utc, today_str_local)
    week_sets_logs = sum(1 for l in logs_list if cutoff_7 <= str(l.get('timestamp') or '')[:10] <= max_today_str)
    week_sets_sessions = sum(int(s.get('completed_sets') or s.get('total_sets') or 0) for s in sessions_list if cutoff_7 <= str(s.get('completed_at') or s.get('started_at') or '')[:10] <= max_today_str)
    week_sets = max(week_sets_logs, week_sets_sessions, week_sets_logs + week_sets_sessions)

    # 4. top_movers: array of up to 3 objects
    logs_by_ex = {}
    for l in logs_list:
        eid = l['exercise_id']
        if eid not in logs_by_ex:
            logs_by_ex[eid] = []
        logs_by_ex[eid].append(l)

    movers = []
    for eid, ex_logs in logs_by_ex.items():
        ex = ex_map.get(eid)
        if not ex:
            continue
        points = compute_exercise_progress(ex['type'], ex_logs)
        stats = compute_exercise_stats(points, today)
        if stats and stats['pct'] is not None:
            movers.append({
                'exercise_id': eid,
                'exercise_name': ex['name'],
                'metric_current': stats['current'],
                'metric_2wk_ago': stats['past'],
                'pct_change': stats['pct']
            })

    movers.sort(key=lambda m: abs(m['pct_change']), reverse=True)
    top_movers = movers[:3]

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
        desc = workout['description'] if workout else ''
        name = workout['name'] if workout else ''
        text = f"{name} {desc}".lower()

        front = []
        back = []
        labels = []
        if any(w in text for w in ['push', 'dip', 'press', 'chest']):
            front.extend(['chest', 'shoulders', 'triceps', 'abs'])
            labels.append('Chest, Shoulders, Triceps')
        if any(w in text for w in ['pull', 'chin', 'row', 'back', 'lever']):
            back.extend(['lats', 'upper_back', 'biceps'])
            front.append('biceps')
            labels.append('Back, Biceps, Lats')
        if any(w in text for w in ['leg', 'squat', 'lunge', 'calf']):
            front.append('quads')
            back.extend(['glutes', 'hamstrings', 'calves'])
            labels.append('Legs, Glutes, Calves')

        if not labels:
            labels.append('Full Body Conditioning')
            front.extend(['chest', 'abs', 'shoulders'])
            back.extend(['upper_back', 'lats'])

        return jsonify({
            'workout_name': name,
            'muscle_label': ', '.join(labels),
            'front': list(set(front)),
            'back': list(set(back))
        })


@dashboard_bp.route('/api/exercise-progress', methods=['GET'])
def get_exercise_progress_api():
    """Return top mover progressions for the dashboard."""
    with get_db() as conn:
        logs = conn.execute('SELECT * FROM logs ORDER BY timestamp ASC').fetchall()
        exercises = conn.execute('SELECT * FROM exercises').fetchall()

    logs_list = [dict(r) for r in logs]
    ex_map = {e['id']: dict(e) for e in exercises}
    today = datetime.now(timezone.utc).date()

    logs_by_ex = {}
    for l in logs_list:
        eid = l['exercise_id']
        logs_by_ex.setdefault(eid, []).append(l)

    movers = []
    for eid, ex_logs in logs_by_ex.items():
        ex = ex_map.get(eid)
        if not ex:
            continue
        points = compute_exercise_progress(ex['type'], ex_logs)
        stats = compute_exercise_stats(points, today)
        if stats and stats['pct'] is not None:
            movers.append({
                'exercise_id': eid,
                'exercise_name': ex['name'],
                'current_reps': stats['current'],
                'past_reps': stats['past'],
                'pct_change': stats['pct']
            })

    movers.sort(key=lambda m: abs(m['pct_change']), reverse=True)
    return jsonify(movers[:4])


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
            GROUP BY e.id, e.name, e.type
            ORDER BY last_achieved_at DESC, total_logs DESC
            '''
        ).fetchall()

    today_utc = datetime.now(timezone.utc).date()
    today_local = datetime.now().date()
    today_str_utc = today_utc.isoformat()
    today_str_local = today_local.isoformat()
    yesterday_str_utc = (today_utc - timedelta(days=1)).isoformat()
    yesterday_str_local = (today_local - timedelta(days=1)).isoformat()

    results = []
    for r in rows:
        d = dict(r)
        ts = str(d.get('last_achieved_at') or '')
        ts_date = ts[:10]
        if ts_date in (today_str_utc, today_str_local):
            d['date_label'] = 'Today'
        elif ts_date in (yesterday_str_utc, yesterday_str_local):
            d['date_label'] = 'Yesterday'
        elif len(ts_date) == 10:
            try:
                dt_obj = datetime.strptime(ts_date, '%Y-%m-%d').date()
                diff_days = (today_local - dt_obj).days
                if 1 < diff_days <= 6:
                    d['date_label'] = f'{diff_days} days ago'
                else:
                    d['date_label'] = dt_obj.strftime('%d %b')
            except Exception:
                d['date_label'] = ts_date
        else:
            d['date_label'] = 'Recent'
        results.append(d)

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
            GROUP BY SUBSTR(timestamp, 1, 10)
            ORDER BY date ASC
            '''
        ).fetchall()
        return jsonify([dict(r) for r in rows])
