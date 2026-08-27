"""Progression Service

Pure calculation and business logic for calisthenics skill progressions,
weighted readiness scoring, RPE fatigue detection, and promotion criteria.
"""


def calculate_progression_readiness(exercise, logs, next_exercise=None):
    """Compute weighted progression readiness score and status for an exercise.

    Scoring Logic:
      - Hit Rate (60% weight): sessions_at_target / sessions_needed
      - RPE Signal (40% weight):
          - avg_rpe <= 7: full credit (40%)
          - avg_rpe >= 9: partial credit (down to 0%) and forces status to "almost_ready"
          - 7 < avg_rpe < 9: linear interpolation
      - Fallback: if RPE is null, score relies strictly on hit rate.
      - Status:
          - "ready": readiness_pct >= 90 AND avg_rpe <= 8.5 (or null) AND hold_or_reps_met
          - "almost_ready": readiness_pct >= 60 (or forced due to RPE >= 9)
          - "not_ready": readiness_pct < 60

    Args:
        exercise (dict): Exercise catalog entry with type, targets, sessions_needed.
        logs (list of dict): Raw log rows for this exercise, newest first.
        next_exercise (dict, optional): Next progression catalog entry if configured.

    Returns:
        dict: Standardized readiness report payload.
    """
    target_reps = exercise.get('progression_target_reps')
    target_dur = exercise.get('progression_target_duration')
    sessions_needed = exercise.get('progression_sessions_needed') or 2
    ex_type = exercise.get('type')

    # Baseline when no target is set
    if target_reps is None and target_dur is None:
        return {
            'readiness_pct': 0,
            'status': 'not_ready',
            'criteria': {
                'hold_or_reps_met': False,
                'sessions_completed': 0,
                'sessions_needed': sessions_needed,
                'avg_rpe': None
            },
            'next_exercise': None,
            'no_target': True
        }

    # Group logs by calendar date (using date portion of ISO timestamp)
    by_date = {}
    for log in logs:
        ts = str(log.get('timestamp') or '')
        date_str = ts[:10] if len(ts) >= 10 else None
        if not date_str:
            continue
        by_date.setdefault(date_str, []).append(log)

    sorted_dates = sorted(by_date.keys(), reverse=True)
    sessions_completed = len(sorted_dates)

    sessions_at_target = 0
    evaluated_rpes = []

    for date_str in sorted_dates[:sessions_needed]:
        day_logs = by_date[date_str]
        if ex_type == 'duration':
            best = max((l.get('duration_sec') or 0) for l in day_logs)
            meets = best >= target_dur if target_dur is not None else False
        else:
            best = max((l.get('reps') or 0) for l in day_logs)
            meets = best >= target_reps if target_reps is not None else False

        if meets:
            sessions_at_target += 1
            for l in day_logs:
                if l.get('rpe') is not None:
                    try:
                        evaluated_rpes.append(float(l['rpe']))
                    except (ValueError, TypeError):
                        pass
        else:
            for l in day_logs:
                if l.get('rpe') is not None:
                    try:
                        evaluated_rpes.append(float(l['rpe']))
                    except (ValueError, TypeError):
                        pass

    hold_or_reps_met = (sessions_completed >= sessions_needed and sessions_at_target >= sessions_needed)
    hit_rate = min(1.0, sessions_at_target / sessions_needed) if sessions_needed > 0 else 0.0

    avg_rpe = None
    if evaluated_rpes:
        avg_rpe = round(sum(evaluated_rpes) / len(evaluated_rpes), 1)

    if avg_rpe is None:
        readiness_pct = int(round(hit_rate * 100))
        readiness_pct = max(0, min(100, readiness_pct))
        if readiness_pct >= 90 and hold_or_reps_met:
            status = 'ready'
        elif readiness_pct >= 60:
            status = 'almost_ready'
        else:
            status = 'not_ready'
    else:
        # 60% Hit-rate weight + 40% RPE signal weight
        hit_score = hit_rate * 60.0
        if avg_rpe <= 7.0:
            rpe_credit = 40.0
        elif avg_rpe >= 9.0:
            rpe_credit = max(0.0, 10.0 - (avg_rpe - 9.0) * 10.0)
        else:
            rpe_credit = 40.0 - ((avg_rpe - 7.0) / 2.0) * 30.0

        rpe_score = rpe_credit * hit_rate
        readiness_pct = int(round(hit_score + rpe_score))
        readiness_pct = max(0, min(100, readiness_pct))

        if avg_rpe >= 9.0:
            status = 'almost_ready' if readiness_pct >= 60 else 'not_ready'
        elif readiness_pct >= 90 and avg_rpe <= 8.5 and hold_or_reps_met:
            status = 'ready'
        elif readiness_pct >= 60:
            status = 'almost_ready'
        else:
            status = 'not_ready'

    return {
        'readiness_pct': readiness_pct,
        'status': status,
        'criteria': {
            'hold_or_reps_met': hold_or_reps_met,
            'sessions_completed': sessions_completed,
            'sessions_needed': sessions_needed,
            'avg_rpe': avg_rpe
        },
        'next_exercise': next_exercise,
        'no_target': False
    }
