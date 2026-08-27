"""
seed.py — Populate the database with canonical calisthenics routines and progression data.

Usage:
    python backend/scripts/seed.py
    # or with venv:
    ./venv/bin/python backend/scripts/seed.py

Idempotent: clears exercises, routine levels, and level exercises, then populates
full Push A/B, Pull A/B, Legs A/B splits with tempo, rest periods, and superset groupings.
"""

import sys
import os

# Ensure backend package and project root can be imported
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

for p in (CURRENT_DIR, BACKEND_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app import init_db, reseed_data, get_db
except ImportError:
    from app import init_db, reseed_data, get_db


def main():
    print("Initializing CalistheniX database...")
    init_db()
    print("Reseeding canonical calisthenics routine data...")
    reseed_data()

    with get_db() as conn:
        ex_count = conn.execute("SELECT COUNT(*) FROM exercises").fetchone()[0]
        level_count = conn.execute("SELECT COUNT(*) FROM routine_levels").fetchone()[0]
        slot_count = conn.execute("SELECT COUNT(*) FROM level_exercises").fetchone()[0]

    print(f"Success: {ex_count} exercises, {level_count} routine levels, {slot_count} level exercise slots seeded.")


if __name__ == '__main__':
    main()
