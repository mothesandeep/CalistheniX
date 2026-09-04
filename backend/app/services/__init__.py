"""
Domain calculation and business logic services for CalistheniX.
"""
from .dashboard_service import (
    compute_exercise_progress,
    compute_exercise_stats,
    calculate_streak,
    calculate_week_stats,
    calculate_top_movers,
    format_personal_records,
    compute_muscle_focus,
)
from .progression_service import calculate_progression_readiness

__all__ = [
    'compute_exercise_progress',
    'compute_exercise_stats',
    'calculate_streak',
    'calculate_week_stats',
    'calculate_top_movers',
    'format_personal_records',
    'compute_muscle_focus',
    'calculate_progression_readiness',
]
