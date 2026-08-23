"""
seed.py — Populate the exercises table with real calisthenics progression data.

Run from backend/ with venv active:
    python seed.py

Idempotent: clears and re-seeds exercises on every run.
Also clears logs (FK dependency) — don't run this after you have real log data.

Chain structure (prerequisite_id / next_id) is set after initial insert
so IDs are known. Each exercise's predecessor gets next_id pointing forward,
and each successor gets prerequisite_id pointing back.
"""

import sqlite3
import os

DB_PATH = 'tracker.db'

# ---------------------------------------------------------------------------
# Data definitions
# Each chain is an ordered list: index 0 = base of progression.
# prerequisite_id = None for first in chain, next_id = None for last.
# Standalone entries (Active Recovery) are single-element lists.
# ---------------------------------------------------------------------------

CHAINS = {

    # ── Push Day ─────────────────────────────────────────────────────────────
    'Push': [
        ('Incline Push-up',              'reps'),
        ('Push-up',                      'reps'),
        ('Pike Push-up',                 'reps'),
        ('Diamond Push-up',              'reps'),
        ('Pseudo Planche Push-up',       'reps'),
        ('Archer Push-up',               'reps'),
        ('Planche Lean',                 'duration'),
        ('Tuck Planche',                 'duration'),
        ('Advanced Tuck Planche',        'duration'),
        ('Straddle Planche',             'duration'),
    ],

    # ── Pull Day ─────────────────────────────────────────────────────────────
    'Pull': [
        ('Dead Hang',                    'duration'),
        ('Scapular Pull-up',             'reps'),
        ('Negative Pull-up',             'reps'),
        ('Pull-up',                      'reps'),
        ('Chin-up',                      'reps'),
        ('Archer Pull-up',               'reps'),
        ('Tuck Front Lever',             'duration'),
        ('Advanced Tuck Front Lever',    'duration'),
        ('Straddle Front Lever',         'duration'),
        ('Full Front Lever',             'duration'),
    ],

    # ── Legs Day ─────────────────────────────────────────────────────────────
    'Legs': [
        ('Bodyweight Squat',             'reps'),
        ('Split Squat',                  'reps'),
        ('Bulgarian Split Squat',        'reps'),
        ('Assisted Pistol Squat',        'reps'),
        ('Pistol Squat',                 'reps'),
        ('Shrimp Squat',                 'reps'),
        ('Calf Raise',                   'reps'),
        ('Nordic Curl Negative',         'reps'),
    ],

    # ── Full Body / Core ─────────────────────────────────────────────────────
    'Full Body': [
        ('Plank',                                'duration'),
        ('Hollow Body Hold',                     'duration'),
        ('L-sit',                                'duration'),
        ('V-sit',                                'duration'),
        ('Handstand Hold against Wall',          'duration'),
        ('Freestanding Handstand',               'duration'),
    ],

    # ── Active Recovery — no chains, standalone entries ───────────────────
    'Active Recovery': [
        [('Shoulder Dislocate Stretch',  'duration')],
        [('Hip Flexor Stretch',          'duration')],
        [('Thoracic Spine Stretch',      'duration')],
    ],
}


def seed():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found. Run `python app.py` once first to create the DB.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing data (logs first — FK dependency on exercises)
    print("Clearing existing logs and exercises...")
    cursor.execute('DELETE FROM logs')
    cursor.execute('DELETE FROM exercises')
    cursor.execute('DELETE FROM sqlite_sequence WHERE name IN ("exercises", "logs")')
    conn.commit()

    # ── Pass 1: insert all exercises without chain IDs ────────────────────
    # Returns a mapping: name -> db_id
    name_to_id = {}

    def insert(name, day, ex_type):
        cursor.execute(
            'INSERT INTO exercises (name, day, type, prerequisite_id, next_id) '
            'VALUES (?, ?, ?, NULL, NULL)',
            (name, day, ex_type)
        )
        row_id = cursor.lastrowid
        name_to_id[name] = row_id
        print(f"  INSERT {ex_type:8s}  [{day}]  {name!r}")
        return row_id

    for day, chains in CHAINS.items():
        if day == 'Active Recovery':
            # Each element is already a single-item list (standalone)
            for standalone in chains:
                name, ex_type = standalone[0]
                insert(name, day, ex_type)
        else:
            for name, ex_type in chains:
                insert(name, day, ex_type)

    conn.commit()

    # ── Pass 2: set prerequisite_id and next_id along each chain ─────────
    print("\nLinking progression chains...")
    for day, chains in CHAINS.items():
        if day == 'Active Recovery':
            continue  # standalone — no links needed

        for i, (name, _) in enumerate(chains):
            ex_id = name_to_id[name]
            prereq_id = name_to_id[chains[i - 1][0]] if i > 0 else None
            next_id   = name_to_id[chains[i + 1][0]] if i < len(chains) - 1 else None

            cursor.execute(
                'UPDATE exercises SET prerequisite_id = ?, next_id = ? WHERE id = ?',
                (prereq_id, next_id, ex_id)
            )
            chain_pos = f"{'START' if prereq_id is None else '     '} → {name!r} → {'END' if next_id is None else '...'}"
            print(f"  [{day}]  {chain_pos}")

    conn.commit()
    conn.close()

    total = len(name_to_id)
    print(f"\nDone. {total} exercises seeded across 5 days.")
    print("prerequisite_id / next_id chains written for Push, Pull, Legs, Full Body.")
    print("Active Recovery entries left unlinked (standalone, as intended).")


if __name__ == '__main__':
    seed()
