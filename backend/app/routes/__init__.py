"""
Route blueprints package for CalistheniX.
"""
from .splits import splits_bp
from .workouts import workouts_bp
from .exercises import exercises_bp
from .sessions import sessions_bp
from .dashboard import dashboard_bp
from .backup import backup_bp
from .legacy import legacy_bp

__all__ = [
    'splits_bp',
    'workouts_bp',
    'exercises_bp',
    'sessions_bp',
    'dashboard_bp',
    'backup_bp',
    'legacy_bp',
]
