"""
Database migration helpers for CalistheniX.

Each function safely adds a column (or set of columns) to an existing
SQLite table using ALTER TABLE … ADD COLUMN. All migrations are
idempotent — they check PRAGMA table_info() first and skip if the
column already exists.

Called by init_db() on every server startup.
"""
from backend.app.db.connection import get_db
from backend.app.data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS


def migrate_notes_column():
    """Add `notes` TEXT nullable column to level_exercises if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(level_exercises)').fetchall()]
        if 'notes' not in cols:
            cursor.execute('ALTER TABLE level_exercises ADD COLUMN notes TEXT')
            conn.commit()


def migrate_progression_columns():
    """Add three progression tracking columns to exercises if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(exercises)').fetchall()]
        pending = [
            ('progression_target_reps',     'ALTER TABLE exercises ADD COLUMN progression_target_reps     INTEGER'),
            ('progression_target_duration', 'ALTER TABLE exercises ADD COLUMN progression_target_duration INTEGER'),
            ('progression_sessions_needed', 'ALTER TABLE exercises ADD COLUMN progression_sessions_needed INTEGER NOT NULL DEFAULT 2'),
        ]
        for col_name, sql in pending:
            if col_name not in cols:
                cursor.execute(sql)
        conn.commit()


def migrate_session_uuid_column():
    """Add `session_uuid` TEXT column to logs table if not already present."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(logs)').fetchall()]
        if 'session_uuid' not in cols:
            cursor.execute('ALTER TABLE logs ADD COLUMN session_uuid TEXT')
            conn.commit()


def migrate_movement_pattern_column():
    """Add `movement_pattern` TEXT column to exercises table if missing and backfill existing rows."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(exercises)').fetchall()]
        if 'movement_pattern' not in cols:
            cursor.execute("ALTER TABLE exercises ADD COLUMN movement_pattern TEXT NOT NULL DEFAULT 'push_horizontal'")
            for name, pattern in EXERCISE_MOVEMENT_PATTERNS.items():
                cursor.execute('UPDATE exercises SET movement_pattern = ? WHERE name = ?', (pattern, name))
            cursor.execute("UPDATE exercises SET movement_pattern = 'push_horizontal' WHERE movement_pattern IS NULL OR movement_pattern = ''")
            conn.commit()


def migrate_phase_columns():
    """Add `phase` TEXT NOT NULL DEFAULT 'main' to workout_exercises, level_exercises, and logs if missing."""
    with get_db() as conn:
        cursor = conn.cursor()
        for table in ['workout_exercises', 'level_exercises', 'logs']:
            cols = [row[1] for row in cursor.execute(f'PRAGMA table_info({table})').fetchall()]
            if 'phase' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN phase TEXT NOT NULL DEFAULT 'main'")
        conn.commit()


def migrate_session_phase_duration_columns():
    """Add phase duration and status columns to workout_sessions table if missing."""
    with get_db() as conn:
        cursor = conn.cursor()
        cols = [row[1] for row in cursor.execute('PRAGMA table_info(workout_sessions)').fetchall()]
        pending = [
            ('warmup_duration_sec',   'ALTER TABLE workout_sessions ADD COLUMN warmup_duration_sec   INTEGER DEFAULT 0'),
            ('main_duration_sec',     'ALTER TABLE workout_sessions ADD COLUMN main_duration_sec     INTEGER DEFAULT 0'),
            ('cooldown_duration_sec', 'ALTER TABLE workout_sessions ADD COLUMN cooldown_duration_sec INTEGER DEFAULT 0'),
            ('warmup_status',         "ALTER TABLE workout_sessions ADD COLUMN warmup_status         TEXT DEFAULT 'none'"),
            ('cooldown_status',       "ALTER TABLE workout_sessions ADD COLUMN cooldown_status       TEXT DEFAULT 'none'"),
        ]
        for col_name, sql in pending:
            if col_name not in cols:
                cursor.execute(sql)
        conn.commit()


def run_all_migrations():
    """Run every migration in dependency order. Safe to call on every startup."""
    migrate_notes_column()
    migrate_progression_columns()
    migrate_session_uuid_column()
    migrate_movement_pattern_column()
    migrate_phase_columns()
    migrate_session_phase_duration_columns()
