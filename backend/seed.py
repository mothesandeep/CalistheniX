"""
seed.py — Populate the exercises table with placeholder data for the 5-day split.

Run once from the backend/ directory (with venv active):
    python seed.py

Safe to re-run: skips any exercise whose name already exists.
Swap placeholder names for your real exercise names before the first real
gym session.
"""

import sqlite3
import os

DB_PATH = 'tracker.db'

# ---------------------------------------------------------------------------
# Exercise definitions
# Each entry: (name, day, type)
# type: 'reps' or 'duration'
# prerequisite_id and next_id left NULL — Phase 3 scope, not MVP.
# ---------------------------------------------------------------------------

EXERCISES = [
    # ── Push Day ────────────────────────────────────────────────────────────
    # Hold-based (duration)
    ('Planche Lean Hold',             'Push', 'duration'),
    ('Pseudo Planche Push-up Hold',   'Push', 'duration'),
    # Rep-based
    ('Pike Push-up',                  'Push', 'reps'),
    ('Dip',                           'Push', 'reps'),
    ('Diamond Push-up',               'Push', 'reps'),
    ('Tricep Extension',              'Push', 'reps'),

    # ── Pull Day ────────────────────────────────────────────────────────────
    # Hold-based (duration)
    ('Dead Hang',                     'Pull', 'duration'),
    ('Tuck Front Lever Hold',         'Pull', 'duration'),
    ('Scapular Pull-up Hold',         'Pull', 'duration'),
    # Rep-based
    ('Pull-up',                       'Pull', 'reps'),
    ('Archer Pull-up',                'Pull', 'reps'),
    ('Bicep Curl',                    'Pull', 'reps'),

    # ── Legs Day ────────────────────────────────────────────────────────────
    # Hold-based (duration)
    ('L-sit Hold',                    'Legs', 'duration'),
    ('Wall Sit',                      'Legs', 'duration'),
    # Rep-based
    ('Squat',                         'Legs', 'reps'),
    ('Bulgarian Split Squat',         'Legs', 'reps'),
    ('Nordic Hamstring Curl',         'Legs', 'reps'),
    ('Calf Raise',                    'Legs', 'reps'),

    # ── Full Body Day ────────────────────────────────────────────────────────
    # Hold-based (duration)
    ('Handstand Wall Hold',           'Full Body', 'duration'),
    ('Tuck Planche Hold',             'Full Body', 'duration'),
    # Rep-based
    ('Muscle-up',                     'Full Body', 'reps'),
    ('Front Lever Row',               'Full Body', 'reps'),
    ('Pistol Squat',                  'Full Body', 'reps'),
    ('Dragon Flag',                   'Full Body', 'reps'),

    # ── Active Recovery Day ─────────────────────────────────────────────────
    # Hold-based (duration)
    ('Pancake Stretch Hold',          'Active Recovery', 'duration'),
    ('Hip Flexor Stretch Hold',       'Active Recovery', 'duration'),
    # Rep-based
    ('Band Pull-apart',               'Active Recovery', 'reps'),
    ('Scapular Retraction',           'Active Recovery', 'reps'),
    ('Face Pull',                     'Active Recovery', 'reps'),
]

def seed():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found. Run `python app.py` once first to create the DB.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch existing names so re-runs are safe
    cursor.execute('SELECT name FROM exercises')
    existing = {row[0] for row in cursor.fetchall()}

    inserted = 0
    skipped = 0
    for name, day, ex_type in EXERCISES:
        if name in existing:
            print(f"  SKIP  {name!r} (already exists)")
            skipped += 1
        else:
            cursor.execute(
                'INSERT INTO exercises (name, day, type, prerequisite_id, next_id) VALUES (?, ?, ?, NULL, NULL)',
                (name, day, ex_type)
            )
            print(f"  INSERT {ex_type:8s}  [{day}]  {name!r}")
            inserted += 1

    conn.commit()
    conn.close()

    print(f"\nDone. {inserted} inserted, {skipped} skipped.")
    print("Swap placeholder names in seed.py for your real exercise list, then re-run.")

if __name__ == '__main__':
    seed()
