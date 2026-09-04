"""
Database seeding and catalog synchronization module for CalistheniX.
"""
from backend.app.db.connection import get_db
from backend.app.data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
from backend.app.data.seed_data import (
    SEED,
    SEED_VERSION,
    WARMUP_COOLDOWN_EXERCISES,
    DEFAULT_WORKOUT_PHASES,
)


def ensure_warmup_cooldown_exercises(conn=None):
    """Ensure canonical warm-up mobility and cool-down stretch exercises exist in the database."""
    if conn is not None:
        _insert_warmup_cooldown_exercises(conn)
    else:
        with get_db() as local_conn:
            _insert_warmup_cooldown_exercises(local_conn)
            local_conn.commit()


def _insert_warmup_cooldown_exercises(conn):
    cursor = conn.cursor()
    for item in WARMUP_COOLDOWN_EXERCISES:
        name, ex_type, default_val, pattern = item[0], item[1], item[2], item[3]
        existing = cursor.execute('SELECT id FROM exercises WHERE name = ?', (name,)).fetchone()
        if not existing:
            dur  = default_val if ex_type == 'duration' else None
            reps = default_val if ex_type == 'reps' else None
            cursor.execute(
                '''INSERT INTO exercises
                       (name, day, type, movement_pattern, progression_target_reps, progression_target_duration)
                   VALUES (?, 'Mobility & Stretching', ?, ?, ?, ?)''',
                (name, ex_type, pattern, reps, dur)
            )


def reseed_data(force=False):
    """Clear exercises/routine_levels/level_exercises and repopulate with SEED data.
    Logs are NOT touched. Idempotent: checks seed version stored in DB first unless force=True."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA foreign_keys = OFF')

        cursor.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        row = cursor.execute("SELECT value FROM meta WHERE key = 'seed_version'").fetchone()
        if not force and row and row['value'] == SEED_VERSION:
            cursor.execute('PRAGMA foreign_keys = ON')
            return  # already at current seed — skip

        # ── Clear dependent tables in safe order ──────────────────────────────────
        for tbl in ['level_exercises', 'routine_levels', 'weekly_schedules',
                    'workout_exercises', 'workouts', 'training_splits', 'exercises']:
            cursor.execute(f'DELETE FROM {tbl}')
        cursor.execute(
            "DELETE FROM sqlite_sequence WHERE name IN "
            "('exercises','routine_levels','level_exercises','training_splits',"
            "'workouts','weekly_schedules','workout_exercises')"
        )

        # ── Insert exercises (deduplicate by name) ─────────────────────────────────
        ex_id_by_name = {}
        for routine_name, exercises in SEED:
            for (name, ex_type, sets, reps, dur, rest, notes) in exercises:
                if name not in ex_id_by_name:
                    pattern = EXERCISE_MOVEMENT_PATTERNS.get(name)
                    if not pattern:
                        if 'Push' in routine_name:   pattern = 'push_horizontal'
                        elif 'Pull' in routine_name: pattern = 'pull_vertical'
                        elif 'Leg' in routine_name:  pattern = 'squat'
                        else:                         pattern = 'push_horizontal'
                    cursor.execute(
                        'INSERT INTO exercises (name, day, type, movement_pattern) VALUES (?, ?, ?, ?)',
                        (name, routine_name, ex_type, pattern)
                    )
                    ex_id_by_name[name] = cursor.lastrowid

        # ── Ensure mobility and stretching exercises exist ────────────────────────
        ensure_warmup_cooldown_exercises(conn)
        for r in cursor.execute('SELECT id, name FROM exercises').fetchall():
            ex_id_by_name[r['name']] = r['id']

        # ── Insert routine_levels and level_exercises (legacy compat) ─────────────
        for routine_name, exercises in SEED:
            cursor.execute(
                'INSERT INTO routine_levels (routine_name, level) VALUES (?, 1)',
                (routine_name,)
            )
            rl_id = cursor.lastrowid
            for idx, (name, ex_type, sets, reps, dur, rest, notes) in enumerate(exercises, start=1):
                cursor.execute(
                    '''INSERT INTO level_exercises
                           (routine_level_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)''',
                    (rl_id, ex_id_by_name[name], idx, sets, reps, dur, rest, notes)
                )

        # ── Insert Reusable Workouts with warmup / main / cooldown phases ─────────
        workout_ids = {}
        for workout_name, main_exercises in SEED:
            cursor.execute(
                'INSERT INTO workouts (name, description) VALUES (?, ?)',
                (workout_name, f'Standard {workout_name} workout routine')
            )
            w_id = cursor.lastrowid
            workout_ids[workout_name] = w_id

            order_idx = 1
            phases = DEFAULT_WORKOUT_PHASES.get(workout_name, {})

            for (w_name, w_type, w_val, w_notes) in phases.get('warmup', []):
                ex_id = ex_id_by_name.get(w_name)
                if ex_id:
                    is_dur = w_type == 'duration'
                    cursor.execute(
                        '''INSERT INTO workout_exercises
                               (workout_id, exercise_id, order_index, sets, reps, duration_sec,
                                tempo, rest_sec, superset_group, notes, phase)
                           VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'warmup')''',
                        (w_id, ex_id, order_idx, None if is_dur else w_val, w_val if is_dur else None, w_notes)
                    )
                    order_idx += 1

            for (name, ex_type, sets, reps, dur, rest, notes) in main_exercises:
                cursor.execute(
                    '''INSERT INTO workout_exercises
                           (workout_id, exercise_id, order_index, sets,
                            reps, duration_sec, tempo, rest_sec, superset_group, notes, phase)
                       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 'main')''',
                    (w_id, ex_id_by_name[name], order_idx, sets, reps, dur, rest, notes)
                )
                order_idx += 1

            for (c_name, c_type, c_val, c_notes) in phases.get('cooldown', []):
                ex_id = ex_id_by_name.get(c_name)
                if ex_id:
                    is_dur = c_type == 'duration'
                    cursor.execute(
                        '''INSERT INTO workout_exercises
                               (workout_id, exercise_id, order_index, sets, reps, duration_sec,
                                tempo, rest_sec, superset_group, notes, phase)
                           VALUES (?, ?, ?, 1, ?, ?, NULL, 10, NULL, ?, 'cooldown')''',
                        (w_id, ex_id, order_idx, None if is_dur else c_val, c_val if is_dur else None, c_notes)
                    )
                    order_idx += 1

        # ── Default Training Split: 5-Day Aesthetic Physique Split (Active) ─────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES (?, ?, 1)''',
            (
                'Aesthetic Physique — 5-Day PPL Split',
                '2x Push, 2x Pull, 1x Legs (Combined). Core 5 days/week. 2 rest days (Push A → Pull A → Legs (Combined) → Push B → Pull B → Rest → Rest)'
            )
        )
        split_5day_id = cursor.lastrowid
        schedule_5day = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs (Combined)')),
            (3, 'workout', workout_ids.get('Push B')),
            (4, 'workout', workout_ids.get('Pull B')),
            (5, 'rest',    None),
            (6, 'rest',    None),
        ]
        for day_idx, day_type, w_id in schedule_5day:
            cursor.execute(
                'INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id) VALUES (?, ?, ?, ?)',
                (split_5day_id, day_idx, day_type, w_id)
            )

        # ── Secondary Training Split: Complete 6-Day PPL Plan ──────────────────────
        cursor.execute(
            '''INSERT INTO training_splits (name, description, is_active)
               VALUES (?, ?, 0)''',
            (
                'Aesthetic Physique — Complete PPL A/B Plan',
                '6 days training (Push A → Pull A → Legs A → Push B → Pull B → Legs B → Rest)'
            )
        )
        split_6day_id = cursor.lastrowid
        schedule_6day = [
            (0, 'workout', workout_ids.get('Push A')),
            (1, 'workout', workout_ids.get('Pull A')),
            (2, 'workout', workout_ids.get('Legs A')),
            (3, 'workout', workout_ids.get('Push B')),
            (4, 'workout', workout_ids.get('Pull B')),
            (5, 'workout', workout_ids.get('Legs B')),
            (6, 'rest',    None),
        ]
        for day_idx, day_type, w_id in schedule_6day:
            cursor.execute(
                'INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id) VALUES (?, ?, ?, ?)',
                (split_6day_id, day_idx, day_type, w_id)
            )

        # ── Stamp seed version ────────────────────────────────────────────────────
        cursor.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_version', ?)",
            (SEED_VERSION,)
        )
        cursor.execute('PRAGMA foreign_keys = ON')
        conn.commit()
