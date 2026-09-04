"""
Backward compatibility shim for backend.migrations -> backend.app.db.migrations
"""
from backend.app.db.migrations import (
    migrate_notes_column,
    migrate_progression_columns,
    migrate_session_uuid_column,
    migrate_movement_pattern_column,
    migrate_phase_columns,
    migrate_session_phase_duration_columns,
    run_all_migrations,
)

__all__ = [
    'migrate_notes_column',
    'migrate_progression_columns',
    'migrate_session_uuid_column',
    'migrate_movement_pattern_column',
    'migrate_phase_columns',
    'migrate_session_phase_duration_columns',
    'run_all_migrations',
]
