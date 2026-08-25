"""
seed.py — Populate the database with canonical calisthenics routines and progression data.

Usage:
    python backend/seed.py
    # or from backend directory:
    python seed.py

Idempotent: clears exercises, routine levels, and level exercises, then populates
full Push A/B, Pull A/B, Legs A/B splits with tempo, rest periods, and superset groupings.
"""

import sys
import os

# Ensure backend package can be imported regardless of execution directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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

    print(f"✓ Success: {ex_count} exercises, {level_count} routine levels, {slot_count} level exercise slots seeded.")


if __name__ == '__main__':
    main()
