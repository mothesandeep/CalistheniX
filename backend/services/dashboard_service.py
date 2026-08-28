"""Dashboard Service

Pure calculation and analytics aggregation functions for the CalistheniX dashboard:
- Streak calculation
- Weekly session and volume metrics
- Progression top movers
- Personal Record (PR) date relative formatting
- Muscle group keyword tagging
"""

from datetime import datetime, timedelta, timezone


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


def calculate_streak(logged_dates, today_local, today_utc):
    """Calculate consecutive daily training streak.
    If athlete logged today, count backwards from today; if not yet today, count from yesterday."""
    today_str_local = today_local.isoformat()
    today_str_utc = today_utc.isoformat()

    # Choose anchor date for today (match local or UTC if logged today)
    if today_str_local in logged_dates:
        today = today_local
    elif today_str_utc in logged_dates:
        today = today_utc
    else:
        today = today_local
    today_str = today.isoformat()

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

    return streak_days, today


def calculate_week_stats(logged_dates, logs_list, sessions_list, today, today_local, today_utc):
    """Calculate total distinct workout sessions and total sets completed in the last 7 days."""
    today_str = today.isoformat()
    today_str_local = today_local.isoformat()
    today_str_utc = today_utc.isoformat()
    max_today_str = max(today_str, today_str_utc, today_str_local)

    cutoff_7 = (today - timedelta(days=6)).isoformat()
    week_sessions = len([d for d in logged_dates if cutoff_7 <= d <= max_today_str])

    week_sets_logs = sum(
        1 for l in logs_list
        if cutoff_7 <= str(l.get('timestamp') or '')[:10] <= max_today_str
        and l.get('phase') in (None, '', 'main')
    )
    week_sets_sessions = sum(
        int(s.get('completed_sets') or s.get('main_sets') or s.get('total_sets') or 0)
        for s in sessions_list
        if cutoff_7 <= str(s.get('completed_at') or s.get('started_at') or '')[:10] <= max_today_str
    )
    week_sets = max(week_sets_logs, week_sets_sessions)

    return week_sessions, week_sets



def calculate_top_movers(logs_list, ex_map, today, limit=3):
    """Find exercises with highest percentage improvement over the last 2 weeks."""
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
                'pct_change': stats['pct'],
                'current_reps': stats['current'],
                'past_reps': stats['past']
            })

    movers.sort(key=lambda m: abs(m['pct_change']), reverse=True)
    return movers[:limit]


def format_personal_records(rows, today_local, today_utc):
    """Format raw PR query rows with human-friendly relative date labels."""
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

    return results


def compute_muscle_focus(workout_name, workout_description):
    """Derive targeted muscle groups from workout name and description text."""
    name = workout_name or ''
    desc = workout_description or ''
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

    return {
        'workout_name': name,
        'muscle_label': ', '.join(labels),
        'front': list(set(front)),
        'back': list(set(back))
    }
