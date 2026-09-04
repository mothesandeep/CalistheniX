"""
CalistheniX — Canonical Realistic Demo Dataset Generator

Generates 24 realistic completed workout sessions with sets, reps, durations, RPE/RIR,
and personal records spanning the active 5-Day PPL split over the past 7-8 weeks.
"""
from datetime import datetime, timedelta, timezone
import json


def get_demo_date(days_ago, hour=9, minute=30, add_minutes=0):
    """Generate ISO timestamp for demo session days_ago relative to now."""
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
    dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if add_minutes:
        dt += timedelta(minutes=add_minutes)
    return dt.isoformat()


def get_canonical_demo_data(conn=None):
    """
    Returns (sessions, logs) arrays for seeding into SQLite.
    Resolves exercise_ids from the exercises table by name if conn is provided.
    """
    ex_map = {}
    if conn:
        rows = conn.execute('SELECT id, name FROM exercises').fetchall()
        for r in rows:
            ex_map[r['name'].lower()] = r['id']

    def eid(name, fallback_id):
        return ex_map.get(name.lower(), fallback_id)

    # 24 sessions spanning the last 52 days
    session_configs = [
  {
    'uuid': "demo-sess-01",
    'routine': "Push A",
    'days_ago': 1,
    'duration_min': 46,
    'exercises': [
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'weight_kg': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'weight_kg': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 13,
            'weight_kg': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'weight_kg': 15,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Wide Push-ups",
        'id': 2,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 15,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Decline Push-ups",
        'id': 3,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 13,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Pike Push-ups",
        'id': 4,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Triceps Dips",
        'id': 5,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'weight_kg': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 8,
            'weight_kg': 15,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Plank",
        'id': 6,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 6,
            'rir': 4
          },
          {
            'duration_sec': 45,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 45,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-02",
    'routine': "Pull A",
    'days_ago': 2,
    'duration_min': 48,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 50,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "hold"
          },
          {
            'duration_sec': 45,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Wide Grip",
        'id': 13,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'weight_kg': 10,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          },
          {
            'reps': 4,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Chin-ups",
        'id': 14,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 6,
            'weight_kg': 8,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Negative Pull-ups",
        'id': 15,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Scapular Pulls",
        'id': 16,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 11,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Knee Raises",
        'id': 17,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 15,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 15,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-03",
    'routine': "Legs (Combined)",
    'days_ago': 4,
    'duration_min': 50,
    'exercises': [
      {
        'name': "Pistol Squat Progression",
        'id': 24,
        'type': "reps",
        'sets': [
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 8,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Bulgarian Split Squats",
        'id': 25,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'weight_kg': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'weight_kg': 14,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Walking Lunges",
        'id': 26,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 14,
            'weight_kg': 10,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Jump Squats",
        'id': 27,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 15,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 15,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Single-leg Glute Bridge Hold",
        'id': 28,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Calf Raises",
        'id': 29,
        'type': "reps",
        'sets': [
          {
            'reps': 22,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 20,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 20,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Hanging Leg Raises",
        'id': 30,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Side Plank",
        'id': 31,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-04",
    'routine': "Push B",
    'days_ago': 6,
    'duration_min': 45,
    'exercises': [
      {
        'name': "Pike Push-ups Elevated",
        'id': 7,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Handstand Push-up Progression",
        'id': 8,
        'type': "reps",
        'sets': [
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 7,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 12,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Archer Push-ups",
        'id': 9,
        'type': "reps",
        'sets': [
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 8,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Lateral Raise",
        'id': 10,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 15,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 15,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hollow Body Hold",
        'id': 11,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-05",
    'routine': "Pull B",
    'days_ago': 8,
    'duration_min': 46,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 45,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Close Grip",
        'id': 18,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'weight_kg': 8,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "weight"
          }
        ]
      },
      {
        'name': "Inverted Rows (Bar/Rings)",
        'id': 19,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Commando Pull-ups",
        'id': 20,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "reps"
          }
        ]
      },
      {
        'name': "Bicep Curls (Band/Rings)",
        'id': 21,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Front Lever Hold Progression",
        'id': 22,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 15,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 14,
            'rpe': 9,
            'rir': 1
          },
          {
            'duration_sec': 12,
            'rpe': 10,
            'rir': 0,
            'is_pr': True,
            'pr_type': "hold"
          }
        ]
      },
      {
        'name': "Dead Hang",
        'id': 23,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-06",
    'routine': "Push A",
    'days_ago': 10,
    'duration_min': 45,
    'exercises': [
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 11,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'weight_kg': 10,
            'rpe': 10,
            'rir': 0
          }
        ]
      },
      {
        'name': "Wide Push-ups",
        'id': 2,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 15,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Decline Push-ups",
        'id': 3,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Pike Push-ups",
        'id': 4,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Triceps Dips",
        'id': 5,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 9,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Plank",
        'id': 6,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 6,
            'rir': 4
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-07",
    'routine': "Pull A",
    'days_ago': 12,
    'duration_min': 47,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 45,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Wide Grip",
        'id': 13,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 4,
            'weight_kg': 8,
            'rpe': 10,
            'rir': 0
          }
        ]
      },
      {
        'name': "Chin-ups",
        'id': 14,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Negative Pull-ups",
        'id': 15,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Scapular Pulls",
        'id': 16,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 10,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Knee Raises",
        'id': 17,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 14,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-08",
    'routine': "Legs (Combined)",
    'days_ago': 14,
    'duration_min': 48,
    'exercises': [
      {
        'name': "Pistol Squat Progression",
        'id': 24,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bulgarian Split Squats",
        'id': 25,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'weight_kg': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Walking Lunges",
        'id': 26,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 12,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Jump Squats",
        'id': 27,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Single-leg Glute Bridge Hold",
        'id': 28,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Calf Raises",
        'id': 29,
        'type': "reps",
        'sets': [
          {
            'reps': 20,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 18,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 18,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Leg Raises",
        'id': 30,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Side Plank",
        'id': 31,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 30,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-09",
    'routine': "Push B",
    'days_ago': 16,
    'duration_min': 44,
    'exercises': [
      {
        'name': "Pike Push-ups Elevated",
        'id': 7,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 9,
            'rpe': 10,
            'rir': 0
          }
        ]
      },
      {
        'name': "Handstand Push-up Progression",
        'id': 8,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'weight_kg': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 11,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Archer Push-ups",
        'id': 9,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Lateral Raise",
        'id': 10,
        'type': "reps",
        'sets': [
          {
            'reps': 15,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hollow Body Hold",
        'id': 11,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 30,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 25,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-10",
    'routine': "Pull B",
    'days_ago': 18,
    'duration_min': 45,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Close Grip",
        'id': 18,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'weight_kg': 4,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'weight_kg': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Inverted Rows (Bar/Rings)",
        'id': 19,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Commando Pull-ups",
        'id': 20,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bicep Curls (Band/Rings)",
        'id': 21,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Front Lever Hold Progression",
        'id': 22,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 12,
            'rpe': 9,
            'rir': 1
          },
          {
            'duration_sec': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Dead Hang",
        'id': 23,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-11",
    'routine': "Push A",
    'days_ago': 20,
    'duration_min': 45,
    'exercises': [
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'weight_kg': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 10,
            'weight_kg': 8,
            'rpe': 10,
            'rir': 0
          }
        ]
      },
      {
        'name': "Wide Push-ups",
        'id': 2,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 13,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Decline Push-ups",
        'id': 3,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Pike Push-ups",
        'id': 4,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Triceps Dips",
        'id': 5,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'weight_kg': 5,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Plank",
        'id': 6,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 40,
            'rpe': 6,
            'rir': 4
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-12",
    'routine': "Pull A",
    'days_ago': 22,
    'duration_min': 46,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 45,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Wide Grip",
        'id': 13,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'weight_kg': 4,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 4,
            'weight_kg': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Chin-ups",
        'id': 14,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'weight_kg': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Negative Pull-ups",
        'id': 15,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Scapular Pulls",
        'id': 16,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 10,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Knee Raises",
        'id': 17,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 13,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-13",
    'routine': "Legs (Combined)",
    'days_ago': 24,
    'duration_min': 47,
    'exercises': [
      {
        'name': "Pistol Squat Progression",
        'id': 24,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bulgarian Split Squats",
        'id': 25,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Walking Lunges",
        'id': 26,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Jump Squats",
        'id': 27,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 14,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 13,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Single-leg Glute Bridge Hold",
        'id': 28,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 18,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 18,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Calf Raises",
        'id': 29,
        'type': "reps",
        'sets': [
          {
            'reps': 20,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 18,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 18,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 18,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Leg Raises",
        'id': 30,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Side Plank",
        'id': 31,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-14",
    'routine': "Push B",
    'days_ago': 26,
    'duration_min': 44,
    'exercises': [
      {
        'name': "Pike Push-ups Elevated",
        'id': 7,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Handstand Push-up Progression",
        'id': 8,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 11,
            'weight_kg': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Archer Push-ups",
        'id': 9,
        'type': "reps",
        'sets': [
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Lateral Raise",
        'id': 10,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hollow Body Hold",
        'id': 11,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-15",
    'routine': "Pull B",
    'days_ago': 28,
    'duration_min': 44,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 40,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 40,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Close Grip",
        'id': 18,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Inverted Rows (Bar/Rings)",
        'id': 19,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Commando Pull-ups",
        'id': 20,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bicep Curls (Band/Rings)",
        'id': 21,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Front Lever Hold Progression",
        'id': 22,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 10,
            'rpe': 9,
            'rir': 1
          },
          {
            'duration_sec': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Dead Hang",
        'id': 23,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 25,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-16",
    'routine': "Push A",
    'days_ago': 31,
    'duration_min': 44,
    'exercises': [
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Wide Push-ups",
        'id': 2,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Decline Push-ups",
        'id': 3,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Pike Push-ups",
        'id': 4,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Triceps Dips",
        'id': 5,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'weight_kg': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Plank",
        'id': 6,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 40,
            'rpe': 6,
            'rir': 4
          },
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-17",
    'routine': "Pull A",
    'days_ago': 33,
    'duration_min': 45,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 40,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Wide Grip",
        'id': 13,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Chin-ups",
        'id': 14,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Negative Pull-ups",
        'id': 15,
        'type': "reps",
        'sets': [
          {
            'reps': 4,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Scapular Pulls",
        'id': 16,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 9,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Knee Raises",
        'id': 17,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-18",
    'routine': "Legs (Combined)",
    'days_ago': 35,
    'duration_min': 46,
    'exercises': [
      {
        'name': "Pistol Squat Progression",
        'id': 24,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bulgarian Split Squats",
        'id': 25,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'weight_kg': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'weight_kg': 6,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Walking Lunges",
        'id': 26,
        'type': "reps",
        'sets': [
          {
            'reps': 14,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'weight_kg': 4,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Jump Squats",
        'id': 27,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 13,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Single-leg Glute Bridge Hold",
        'id': 28,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 18,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 18,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 15,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Calf Raises",
        'id': 29,
        'type': "reps",
        'sets': [
          {
            'reps': 18,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 18,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Leg Raises",
        'id': 30,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Side Plank",
        'id': 31,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-19",
    'routine': "Push B",
    'days_ago': 37,
    'duration_min': 43,
    'exercises': [
      {
        'name': "Pike Push-ups Elevated",
        'id': 7,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Handstand Push-up Progression",
        'id': 8,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Archer Push-ups",
        'id': 9,
        'type': "reps",
        'sets': [
          {
            'reps': 6,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 6,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Lateral Raise",
        'id': 10,
        'type': "reps",
        'sets': [
          {
            'reps': 13,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 13,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hollow Body Hold",
        'id': 11,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-20",
    'routine': "Pull B",
    'days_ago': 40,
    'duration_min': 43,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Close Grip",
        'id': 18,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Inverted Rows (Bar/Rings)",
        'id': 19,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Commando Pull-ups",
        'id': 20,
        'type': "reps",
        'sets': [
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 3,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bicep Curls (Band/Rings)",
        'id': 21,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Front Lever Hold Progression",
        'id': 22,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 9,
            'rpe': 9,
            'rir': 1
          },
          {
            'duration_sec': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Dead Hang",
        'id': 23,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 25,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-21",
    'routine': "Push A",
    'days_ago': 42,
    'duration_min': 43,
    'exercises': [
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Wide Push-ups",
        'id': 2,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Decline Push-ups",
        'id': 3,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Pike Push-ups",
        'id': 4,
        'type': "reps",
        'sets': [
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 7,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Triceps Dips",
        'id': 5,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Plank",
        'id': 6,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 6,
            'rir': 4
          },
          {
            'duration_sec': 35,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-22",
    'routine': "Pull A",
    'days_ago': 45,
    'duration_min': 42,
    'exercises': [
      {
        'name': "Dead Hang",
        'id': 12,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 35,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 30,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Pull-ups Wide Grip",
        'id': 13,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Chin-ups",
        'id': 14,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 3,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Negative Pull-ups",
        'id': 15,
        'type': "reps",
        'sets': [
          {
            'reps': 4,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 3,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 3,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Scapular Pulls",
        'id': 16,
        'type': "reps",
        'sets': [
          {
            'reps': 8,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 8,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 7,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Knee Raises",
        'id': 17,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-23",
    'routine': "Legs (Combined)",
    'days_ago': 48,
    'duration_min': 44,
    'exercises': [
      {
        'name': "Pistol Squat Progression",
        'id': 24,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Bulgarian Split Squats",
        'id': 25,
        'type': "reps",
        'sets': [
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 9,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Walking Lunges",
        'id': 26,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Jump Squats",
        'id': 27,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 12,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 12,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Single-leg Glute Bridge Hold",
        'id': 28,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 15,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 15,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 15,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Calf Raises",
        'id': 29,
        'type': "reps",
        'sets': [
          {
            'reps': 16,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 16,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 16,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hanging Leg Raises",
        'id': 30,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Side Plank",
        'id': 31,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  },
  {
    'uuid': "demo-sess-24",
    'routine': "Push B",
    'days_ago': 52,
    'duration_min': 42,
    'exercises': [
      {
        'name': "Pike Push-ups Elevated",
        'id': 7,
        'type': "reps",
        'sets': [
          {
            'reps': 9,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 8,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Handstand Push-up Progression",
        'id': 8,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 5,
            'rpe': 9,
            'rir': 1
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Diamond Push-ups",
        'id': 1,
        'type': "reps",
        'sets': [
          {
            'reps': 11,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 11,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 10,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Archer Push-ups",
        'id': 9,
        'type': "reps",
        'sets': [
          {
            'reps': 5,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 5,
            'rpe': 8,
            'rir': 2
          },
          {
            'reps': 4,
            'rpe': 9,
            'rir': 1
          }
        ]
      },
      {
        'name': "Lateral Raise",
        'id': 10,
        'type': "reps",
        'sets': [
          {
            'reps': 12,
            'rpe': 6,
            'rir': 4
          },
          {
            'reps': 12,
            'rpe': 7,
            'rir': 3
          },
          {
            'reps': 10,
            'rpe': 8,
            'rir': 2
          }
        ]
      },
      {
        'name': "Hollow Body Hold",
        'id': 11,
        'type': "duration",
        'sets': [
          {
            'duration_sec': 20,
            'rpe': 7,
            'rir': 3
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          },
          {
            'duration_sec': 20,
            'rpe': 8,
            'rir': 2
          }
        ]
      }
    ]
  }
]

    sessions = []
    logs = []
    log_counter = 1

    for sc in session_configs:
        start_ts = get_demo_date(sc['days_ago'], 9, 15)
        end_ts = get_demo_date(sc['days_ago'], 9, 15, sc['duration_min'])
        tot_dur = sc['duration_min'] * 60
        warm_dur = 300
        cool_dur = 300
        main_dur = max(0, tot_dur - warm_dur - cool_dur)

        session_exercises = []
        session_logs = []
        tot_sets = 0

        for ex in sc['exercises']:
            actual_id = eid(ex['name'], ex['id'])
            ex_sets = []

            for s_idx, s in enumerate(ex['sets'], 1):
                tot_sets += 1
                reps = s.get('reps')
                weight_kg = s.get('weight_kg')
                dur = s.get('duration_sec')
                rpe = s.get('rpe', 8.0)
                rir = s.get('rir', max(0, round(10.0 - rpe)))
                is_pr = s.get('is_pr', False)
                pr_type = s.get('pr_type')
                client_uuid = f'demo-log-{log_counter}'

                log_entry = {
                    'id': client_uuid,
                    'client_uuid': client_uuid,
                    'session_id': sc['uuid'],
                    'session_uuid': sc['uuid'],
                    'exercise_id': actual_id,
                    'exercise_name': ex['name'],
                    'set_number': s_idx,
                    'reps': reps,
                    'weight_kg': weight_kg,
                    'duration_sec': dur,
                    'rpe': rpe,
                    'rir': rir,
                    'completed': 1,
                    'is_pr': 1 if is_pr else 0,
                    'pr_type': pr_type,
                    'timestamp': start_ts,
                    'logged_at': start_ts,
                    'phase': 'main'
                }
                log_counter += 1
                logs.append(log_entry)
                session_logs.append(log_entry)

                ex_sets.append({
                    'set_number': s_idx,
                    'reps': reps,
                    'weight_kg': weight_kg,
                    'duration_sec': dur,
                    'rpe': rpe,
                    'rir': rir,
                    'completed': True,
                    'is_pr': is_pr,
                    'pr_type': pr_type
                })

            session_exercises.append({
                'exercise_id': actual_id,
                'name': ex['name'],
                'exercise_name': ex['name'],
                'type': ex['type'],
                'exercise_type': ex['type'],
                'phase': 'main',
                'sets': ex_sets
            })

        session_obj = {
            'id': sc['uuid'],
            'session_uuid': sc['uuid'],
            'routine': sc['routine'],
            'routine_name': sc['routine'],
            'level': 1,
            'started_at': start_ts,
            'completed_at': end_ts,
            'duration_sec': tot_dur,
            'warmup_duration_sec': warm_dur,
            'main_duration_sec': main_dur,
            'cooldown_duration_sec': cool_dur,
            'warmup_status': 'completed',
            'cooldown_status': 'completed',
            'total_sets': tot_sets,
            'completed_sets': tot_sets,
            'status': 'completed',
            'is_completed': True,
            'is_demo': True,
            'exercises': session_exercises,
            'logs': session_logs
        }
        session_obj['raw_json'] = json.dumps(session_obj)
        sessions.append(session_obj)

    return sessions, logs
