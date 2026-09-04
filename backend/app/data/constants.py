"""
Shared constants used across backend route modules.
Centralises DAY_NAMES (previously duplicated in app.py, splits.py, and dashboard.py)
and other project-wide values.
"""

# Ordered Mon-0 … Sun-6, matching the DB convention (weekly_schedules.day_of_week).
DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

VALID_PHASES = ('warmup', 'main', 'cooldown')
