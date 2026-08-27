"""
migrate_movement_patterns.py — One-time / Standalone migration script to add
`movement_pattern` column to the `exercises` table and backfill all exercises
with their canonical biomechanical movement pattern.

Usage:
    ./venv/bin/python backend/scripts/migrate_movement_patterns.py
"""

import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

for p in (CURRENT_DIR, BACKEND_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app import init_db, _migrate_movement_pattern_column, get_db, EXERCISE_MOVEMENT_PATTERNS
except ImportError:
    from app import init_db, _migrate_movement_pattern_column, get_db, EXERCISE_MOVEMENT_PATTERNS


def run_migration():
    print("Running movement_pattern column migration...")
    init_db()
    _migrate_movement_pattern_column()

    with get_db() as conn:
        conn.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
        rows = conn.execute("SELECT id, name, day, type, movement_pattern FROM exercises ORDER BY id").fetchall()

    print(f"\nMigration successfully applied. Verified {len(rows)} exercises in database:")
    print(f"{'-'*75}")
    print(f"{'ID':<4} | {'Exercise Name':<32} | {'Day':<8} | {'Type':<8} | {'Pattern':<16}")
    print(f"{'-'*75}")
    for r in rows:
        print(f"{r['id']:<4} | {r['name']:<32} | {r['day']:<8} | {r['type']:<8} | {r['movement_pattern']:<16}")
    print(f"{'-'*75}\n")


if __name__ == '__main__':
    run_migration()
