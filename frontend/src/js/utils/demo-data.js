/**
 * CalistheniX — Canonical Realistic Demo Dataset & Lifecycle Manager
 *
 * Responsibilities:
 * - Generates 24 realistic completed workout sessions spanning the 5-Day PPL split
 *   over the past 7-8 weeks with progressive overload, PRs, and RPE/RIR effort metrics.
 * - Detects fresh app installation and initializes demo data once.
 * - Restores clean baseline demo data without duplicates.
 * - Permanently wipes all user/demo data on Reset Everything while preserving workout presets.
 * - Prevents demo data from resurrecting on browser refresh after Reset Everything.
 */

(function () {
  'use strict';

  const CANONICAL_DEFAULT_WEIGHT_HISTORY = [
    { date: '2026-07-01', weight: 82.4 },
    { date: '2026-07-05', weight: 82.1 },
    { date: '2026-07-10', weight: 81.8 },
    { date: '2026-07-16', weight: 81.5 },
    { date: '2026-07-23', weight: 80.7 },
    { date: '2026-07-29', weight: 80.4 },
    { date: '2026-08-04', weight: 80.1 },
    { date: '2026-08-10', weight: 79.8 },
    { date: '2026-08-16', weight: 79.5 },
    { date: '2026-08-23', weight: 79.1 },
    { date: '2026-08-27', weight: 78.4 },
    { date: '2026-08-31', weight: 78.3 }
  ];

  function getDemoISODate(daysAgo, hour = 9, minute = 15, addMinutes = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    if (addMinutes) {
      d.setMinutes(d.getMinutes() + addMinutes);
    }
    return d.toISOString();
  }

  function generateDemoDataset() {
    const sessionConfigs = [
  {
    "uuid": "demo-sess-01",
    "routine": "Push A",
    "daysAgo": 1,
    "durationMin": 46,
    "exercises": [
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "weight_kg": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "weight_kg": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 13,
            "weight_kg": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "weight_kg": 15,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Wide Push-ups",
        "id": 2,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 15,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Decline Push-ups",
        "id": 3,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 13,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Pike Push-ups",
        "id": 4,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Triceps Dips",
        "id": 5,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "weight_kg": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 8,
            "weight_kg": 15,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Plank",
        "id": 6,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 6,
            "rir": 4
          },
          {
            "duration_sec": 45,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 45,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-02",
    "routine": "Pull A",
    "daysAgo": 2,
    "durationMin": 48,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 50,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "hold"
          },
          {
            "duration_sec": 45,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Wide Grip",
        "id": 13,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "weight_kg": 10,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          },
          {
            "reps": 4,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Chin-ups",
        "id": 14,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 6,
            "weight_kg": 8,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Negative Pull-ups",
        "id": 15,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Scapular Pulls",
        "id": 16,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 11,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Knee Raises",
        "id": 17,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 15,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 15,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-03",
    "routine": "Legs (Combined)",
    "daysAgo": 4,
    "durationMin": 50,
    "exercises": [
      {
        "name": "Pistol Squat Progression",
        "id": 24,
        "type": "reps",
        "sets": [
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 8,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Bulgarian Split Squats",
        "id": 25,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "weight_kg": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "weight_kg": 14,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Walking Lunges",
        "id": 26,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 14,
            "weight_kg": 10,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Jump Squats",
        "id": 27,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 15,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 15,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Single-leg Glute Bridge Hold",
        "id": 28,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Calf Raises",
        "id": 29,
        "type": "reps",
        "sets": [
          {
            "reps": 22,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 20,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 20,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Hanging Leg Raises",
        "id": 30,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Side Plank",
        "id": 31,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-04",
    "routine": "Push B",
    "daysAgo": 6,
    "durationMin": 45,
    "exercises": [
      {
        "name": "Pike Push-ups Elevated",
        "id": 7,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Handstand Push-up Progression",
        "id": 8,
        "type": "reps",
        "sets": [
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 7,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 12,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Archer Push-ups",
        "id": 9,
        "type": "reps",
        "sets": [
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 8,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Lateral Raise",
        "id": 10,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 15,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 15,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hollow Body Hold",
        "id": 11,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-05",
    "routine": "Pull B",
    "daysAgo": 8,
    "durationMin": 46,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 45,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Close Grip",
        "id": 18,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "weight_kg": 8,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "weight"
          }
        ]
      },
      {
        "name": "Inverted Rows (Bar/Rings)",
        "id": 19,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Commando Pull-ups",
        "id": 20,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "reps"
          }
        ]
      },
      {
        "name": "Bicep Curls (Band/Rings)",
        "id": 21,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Front Lever Hold Progression",
        "id": 22,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 15,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 14,
            "rpe": 9,
            "rir": 1
          },
          {
            "duration_sec": 12,
            "rpe": 10,
            "rir": 0,
            "is_pr": true,
            "pr_type": "hold"
          }
        ]
      },
      {
        "name": "Dead Hang",
        "id": 23,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-06",
    "routine": "Push A",
    "daysAgo": 10,
    "durationMin": 45,
    "exercises": [
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 11,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "weight_kg": 10,
            "rpe": 10,
            "rir": 0
          }
        ]
      },
      {
        "name": "Wide Push-ups",
        "id": 2,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 15,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Decline Push-ups",
        "id": 3,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Pike Push-ups",
        "id": 4,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Triceps Dips",
        "id": 5,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 9,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Plank",
        "id": 6,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 6,
            "rir": 4
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-07",
    "routine": "Pull A",
    "daysAgo": 12,
    "durationMin": 47,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 45,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Wide Grip",
        "id": 13,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 4,
            "weight_kg": 8,
            "rpe": 10,
            "rir": 0
          }
        ]
      },
      {
        "name": "Chin-ups",
        "id": 14,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Negative Pull-ups",
        "id": 15,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Scapular Pulls",
        "id": 16,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 10,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Knee Raises",
        "id": 17,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 14,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-08",
    "routine": "Legs (Combined)",
    "daysAgo": 14,
    "durationMin": 48,
    "exercises": [
      {
        "name": "Pistol Squat Progression",
        "id": 24,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bulgarian Split Squats",
        "id": 25,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "weight_kg": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Walking Lunges",
        "id": 26,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 12,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Jump Squats",
        "id": 27,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Single-leg Glute Bridge Hold",
        "id": 28,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Calf Raises",
        "id": 29,
        "type": "reps",
        "sets": [
          {
            "reps": 20,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 18,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 18,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Leg Raises",
        "id": 30,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Side Plank",
        "id": 31,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 30,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-09",
    "routine": "Push B",
    "daysAgo": 16,
    "durationMin": 44,
    "exercises": [
      {
        "name": "Pike Push-ups Elevated",
        "id": 7,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 9,
            "rpe": 10,
            "rir": 0
          }
        ]
      },
      {
        "name": "Handstand Push-up Progression",
        "id": 8,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "weight_kg": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 11,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Archer Push-ups",
        "id": 9,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Lateral Raise",
        "id": 10,
        "type": "reps",
        "sets": [
          {
            "reps": 15,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hollow Body Hold",
        "id": 11,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 30,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 25,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-10",
    "routine": "Pull B",
    "daysAgo": 18,
    "durationMin": 45,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Close Grip",
        "id": 18,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "weight_kg": 4,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "weight_kg": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Inverted Rows (Bar/Rings)",
        "id": 19,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Commando Pull-ups",
        "id": 20,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bicep Curls (Band/Rings)",
        "id": 21,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Front Lever Hold Progression",
        "id": 22,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 12,
            "rpe": 9,
            "rir": 1
          },
          {
            "duration_sec": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Dead Hang",
        "id": 23,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-11",
    "routine": "Push A",
    "daysAgo": 20,
    "durationMin": 45,
    "exercises": [
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "weight_kg": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 10,
            "weight_kg": 8,
            "rpe": 10,
            "rir": 0
          }
        ]
      },
      {
        "name": "Wide Push-ups",
        "id": 2,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 13,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Decline Push-ups",
        "id": 3,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Pike Push-ups",
        "id": 4,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Triceps Dips",
        "id": 5,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "weight_kg": 5,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Plank",
        "id": 6,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 40,
            "rpe": 6,
            "rir": 4
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-12",
    "routine": "Pull A",
    "daysAgo": 22,
    "durationMin": 46,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 45,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Wide Grip",
        "id": 13,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "weight_kg": 4,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 4,
            "weight_kg": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Chin-ups",
        "id": 14,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "weight_kg": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Negative Pull-ups",
        "id": 15,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Scapular Pulls",
        "id": 16,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 10,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Knee Raises",
        "id": 17,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 13,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-13",
    "routine": "Legs (Combined)",
    "daysAgo": 24,
    "durationMin": 47,
    "exercises": [
      {
        "name": "Pistol Squat Progression",
        "id": 24,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bulgarian Split Squats",
        "id": 25,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Walking Lunges",
        "id": 26,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Jump Squats",
        "id": 27,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 14,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 13,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Single-leg Glute Bridge Hold",
        "id": 28,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 18,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 18,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Calf Raises",
        "id": 29,
        "type": "reps",
        "sets": [
          {
            "reps": 20,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 18,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 18,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 18,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Leg Raises",
        "id": 30,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Side Plank",
        "id": 31,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-14",
    "routine": "Push B",
    "daysAgo": 26,
    "durationMin": 44,
    "exercises": [
      {
        "name": "Pike Push-ups Elevated",
        "id": 7,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Handstand Push-up Progression",
        "id": 8,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 11,
            "weight_kg": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Archer Push-ups",
        "id": 9,
        "type": "reps",
        "sets": [
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Lateral Raise",
        "id": 10,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hollow Body Hold",
        "id": 11,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-15",
    "routine": "Pull B",
    "daysAgo": 28,
    "durationMin": 44,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 40,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 40,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Close Grip",
        "id": 18,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Inverted Rows (Bar/Rings)",
        "id": 19,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Commando Pull-ups",
        "id": 20,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bicep Curls (Band/Rings)",
        "id": 21,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Front Lever Hold Progression",
        "id": 22,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 10,
            "rpe": 9,
            "rir": 1
          },
          {
            "duration_sec": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Dead Hang",
        "id": 23,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 25,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-16",
    "routine": "Push A",
    "daysAgo": 31,
    "durationMin": 44,
    "exercises": [
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Wide Push-ups",
        "id": 2,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Decline Push-ups",
        "id": 3,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Pike Push-ups",
        "id": 4,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Triceps Dips",
        "id": 5,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "weight_kg": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Plank",
        "id": 6,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 40,
            "rpe": 6,
            "rir": 4
          },
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-17",
    "routine": "Pull A",
    "daysAgo": 33,
    "durationMin": 45,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 40,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Wide Grip",
        "id": 13,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Chin-ups",
        "id": 14,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Negative Pull-ups",
        "id": 15,
        "type": "reps",
        "sets": [
          {
            "reps": 4,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Scapular Pulls",
        "id": 16,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 9,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Knee Raises",
        "id": 17,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-18",
    "routine": "Legs (Combined)",
    "daysAgo": 35,
    "durationMin": 46,
    "exercises": [
      {
        "name": "Pistol Squat Progression",
        "id": 24,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bulgarian Split Squats",
        "id": 25,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "weight_kg": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "weight_kg": 6,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Walking Lunges",
        "id": 26,
        "type": "reps",
        "sets": [
          {
            "reps": 14,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "weight_kg": 4,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Jump Squats",
        "id": 27,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 13,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Single-leg Glute Bridge Hold",
        "id": 28,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 18,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 18,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 15,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Calf Raises",
        "id": 29,
        "type": "reps",
        "sets": [
          {
            "reps": 18,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 18,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Leg Raises",
        "id": 30,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Side Plank",
        "id": 31,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-19",
    "routine": "Push B",
    "daysAgo": 37,
    "durationMin": 43,
    "exercises": [
      {
        "name": "Pike Push-ups Elevated",
        "id": 7,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Handstand Push-up Progression",
        "id": 8,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Archer Push-ups",
        "id": 9,
        "type": "reps",
        "sets": [
          {
            "reps": 6,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 6,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Lateral Raise",
        "id": 10,
        "type": "reps",
        "sets": [
          {
            "reps": 13,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 13,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hollow Body Hold",
        "id": 11,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-20",
    "routine": "Pull B",
    "daysAgo": 40,
    "durationMin": 43,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Close Grip",
        "id": 18,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Inverted Rows (Bar/Rings)",
        "id": 19,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Commando Pull-ups",
        "id": 20,
        "type": "reps",
        "sets": [
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 3,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bicep Curls (Band/Rings)",
        "id": 21,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Front Lever Hold Progression",
        "id": 22,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 9,
            "rpe": 9,
            "rir": 1
          },
          {
            "duration_sec": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Dead Hang",
        "id": 23,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 25,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-21",
    "routine": "Push A",
    "daysAgo": 42,
    "durationMin": 43,
    "exercises": [
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Wide Push-ups",
        "id": 2,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Decline Push-ups",
        "id": 3,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Pike Push-ups",
        "id": 4,
        "type": "reps",
        "sets": [
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 7,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Triceps Dips",
        "id": 5,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Plank",
        "id": 6,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 6,
            "rir": 4
          },
          {
            "duration_sec": 35,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-22",
    "routine": "Pull A",
    "daysAgo": 45,
    "durationMin": 42,
    "exercises": [
      {
        "name": "Dead Hang",
        "id": 12,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 35,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 30,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Pull-ups Wide Grip",
        "id": 13,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Chin-ups",
        "id": 14,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 3,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Negative Pull-ups",
        "id": 15,
        "type": "reps",
        "sets": [
          {
            "reps": 4,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 3,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 3,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Scapular Pulls",
        "id": 16,
        "type": "reps",
        "sets": [
          {
            "reps": 8,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 8,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 7,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Knee Raises",
        "id": 17,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-23",
    "routine": "Legs (Combined)",
    "daysAgo": 48,
    "durationMin": 44,
    "exercises": [
      {
        "name": "Pistol Squat Progression",
        "id": 24,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Bulgarian Split Squats",
        "id": 25,
        "type": "reps",
        "sets": [
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 9,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Walking Lunges",
        "id": 26,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Jump Squats",
        "id": 27,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 12,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 12,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Single-leg Glute Bridge Hold",
        "id": 28,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 15,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 15,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 15,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Calf Raises",
        "id": 29,
        "type": "reps",
        "sets": [
          {
            "reps": 16,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 16,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 16,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hanging Leg Raises",
        "id": 30,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Side Plank",
        "id": 31,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  },
  {
    "uuid": "demo-sess-24",
    "routine": "Push B",
    "daysAgo": 52,
    "durationMin": 42,
    "exercises": [
      {
        "name": "Pike Push-ups Elevated",
        "id": 7,
        "type": "reps",
        "sets": [
          {
            "reps": 9,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 8,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Handstand Push-up Progression",
        "id": 8,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 5,
            "rpe": 9,
            "rir": 1
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Diamond Push-ups",
        "id": 1,
        "type": "reps",
        "sets": [
          {
            "reps": 11,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 11,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 10,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Archer Push-ups",
        "id": 9,
        "type": "reps",
        "sets": [
          {
            "reps": 5,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 5,
            "rpe": 8,
            "rir": 2
          },
          {
            "reps": 4,
            "rpe": 9,
            "rir": 1
          }
        ]
      },
      {
        "name": "Lateral Raise",
        "id": 10,
        "type": "reps",
        "sets": [
          {
            "reps": 12,
            "rpe": 6,
            "rir": 4
          },
          {
            "reps": 12,
            "rpe": 7,
            "rir": 3
          },
          {
            "reps": 10,
            "rpe": 8,
            "rir": 2
          }
        ]
      },
      {
        "name": "Hollow Body Hold",
        "id": 11,
        "type": "duration",
        "sets": [
          {
            "duration_sec": 20,
            "rpe": 7,
            "rir": 3
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          },
          {
            "duration_sec": 20,
            "rpe": 8,
            "rir": 2
          }
        ]
      }
    ]
  }
];

    const sessions = [];
    const logs = [];
    let logCounter = 1;

    sessionConfigs.forEach(sc => {
      const startTs = getDemoISODate(sc.daysAgo, 9, 15);
      const endTs = getDemoISODate(sc.daysAgo, 9, 15, sc.durationMin);
      const totDur = sc.durationMin * 60;
      const warmDur = 300;
      const coolDur = 300;
      const mainDur = Math.max(0, totDur - warmDur - coolDur);

      const sessionExercises = [];
      const sessionLogs = [];
      let totSets = 0;

      sc.exercises.forEach(ex => {
        const exSets = [];
        ex.sets.forEach((s, sIdx) => {
          totSets += 1;
          const reps = s.reps != null ? s.reps : null;
          const dur = s.duration_sec != null ? s.duration_sec : null;
          const rpe = s.rpe != null ? s.rpe : 8;
          const rir = s.rir != null ? s.rir : Math.max(0, Math.round(10 - rpe));
          const weightKg = s.weight_kg != null ? s.weight_kg : null;
          const isPr = !!s.is_pr;
          const prType = s.pr_type || null;

          const clientUuid = `demo-log-${String(logCounter).padStart(4, '0')}`;
          logCounter += 1;

          const logItem = {
            exercise_id: ex.id,
            exercise_name: ex.name,
            exercise_type: ex.type,
            timestamp: startTs,
            logged_at: startTs,
            reps: reps,
            weight_kg: weightKg,
            duration_sec: dur,
            rpe: rpe,
            rir: rir,
            client_uuid: clientUuid,
            id: clientUuid,
            session_uuid: sc.uuid,
            phase: 'main'
          };
          logs.push(logItem);
          sessionLogs.push(logItem);

          exSets.push({
            set_number: sIdx + 1,
            reps: reps,
            weight_kg: weightKg,
            duration_sec: dur,
            rpe: rpe,
            rir: rir,
            completed: true,
            is_pr: isPr,
            pr_type: prType
          });
        });

        sessionExercises.push({
          exercise_id: ex.id,
          name: ex.name,
          exercise_name: ex.name,
          type: ex.type,
          exercise_type: ex.type,
          phase: 'main',
          sets: exSets
        });
      });

      const sessionObj = {
        id: sc.uuid,
        session_uuid: sc.uuid,
        routine: sc.routine,
        routine_name: sc.routine,
        level: 1,
        started_at: startTs,
        completed_at: endTs,
        duration_sec: totDur,
        warmup_duration_sec: warmDur,
        main_duration_sec: mainDur,
        cooldown_duration_sec: coolDur,
        warmup_status: 'completed',
        cooldown_status: 'completed',
        total_sets: totSets,
        completed_sets: totSets,
        status: 'completed',
        is_completed: true,
        is_demo: true,
        exercises: sessionExercises,
        logs: sessionLogs
      };

      sessions.push(sessionObj);
    });

    return {
      sessions,
      logs,
      weightHistory: [...CANONICAL_DEFAULT_WEIGHT_HISTORY]
    };
  }

  function shouldInitializeDemoData() {
    if (typeof localStorage === 'undefined') return false;
    // If user explicitly wiped everything, never auto-seed
    if (localStorage.getItem('cx_user_cleared') === '1') {
      return false;
    }
    // If already initialized and has sessions/weight, don't reseed
    if (localStorage.getItem('cx_initialized') === '1') {
      const existingSessions = localStorage.getItem('cx_sessions');
      if (existingSessions && JSON.parse(existingSessions || '[]').length > 0) {
        return false;
      }
    }
    const weightHistory = localStorage.getItem('cx_weight_history');
    const hasWeight = weightHistory && JSON.parse(weightHistory).length > 0;
    const hasSessions = localStorage.getItem('cx_sessions') && JSON.parse(localStorage.getItem('cx_sessions')).length > 0;
    return !hasWeight && !hasSessions;
  }

  async function initializeDemoData(force = false) {
    if (typeof localStorage === 'undefined') return { success: false, seeded: false };

    if (!force && !shouldInitializeDemoData()) {
      return { success: true, seeded: false, message: 'Demo data already present or user cleared' };
    }

    try {
      const data = generateDemoDataset();
      
      // Seed sessions
      data.sessions.forEach(sess => {
        localStorage.setItem(`cx_session_${sess.session_uuid}`, JSON.stringify(sess));
      });
      localStorage.setItem('cx_sessions', JSON.stringify(data.sessions));

      // Seed weight history
      localStorage.setItem('cx_weight_history', JSON.stringify(data.weightHistory));
      localStorage.setItem('cx_target_weight', '77');
      localStorage.setItem('cx_latest_weight', '78.3');
      localStorage.setItem('cx_initialized', '1');
      localStorage.setItem('cx_demo_data', '1');
      localStorage.removeItem('cx_user_cleared');

      // Update in-memory state if loaded
      if (typeof state !== 'undefined') {
        state.weightHistory = [...data.weightHistory];
        state.targetWeight = 77.0;
        state.latestWeight = 78.3;
        state.workoutSessions = [...data.sessions];
        if (!state.userProfile) state.userProfile = {};
        state.userProfile.target_weight = 77.0;
        state.userProfile.current_weight = 78.3;
      }

      // Best effort backend sync
      if (typeof fetch === 'function' && typeof API_URL !== 'undefined') {
        fetch(`${API_URL}/demo/seed`, { method: 'POST' }).catch(() => {});
      }

      return {
        success: true,
        seeded: true,
        sessionsCount: data.sessions.length,
        weightCount: data.weightHistory.length
      };
    } catch (err) {
      console.warn('Demo data initialization error:', err);
      return { success: false, seeded: false, error: err.message };
    }
  }

  async function restoreCleanDemoData() {
    if (typeof localStorage === 'undefined') return;

    // 1. Clean existing demo and user sessions/logs/PRs from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('cx_session_') ||
        k.startsWith('cx_pending_') ||
        k.startsWith('cx_pending_session_') ||
        k === 'cx_sessions' ||
        k === 'cx_workout_history' ||
        k === 'cx_completed_sessions' ||
        k === 'cx_today_logs' ||
        k === 'cx_quick_checkins' ||
        k === 'cx_prs' ||
        k === 'cx_personal_records' ||
        k === 'cx_dashboard_records'
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('cx_active_session');
    localStorage.removeItem('cx_active_workout');
    localStorage.removeItem('cx_current_workout');
    localStorage.removeItem('cx_workout_draft');
    localStorage.removeItem('cx_user_cleared');

    // 2. Re-establish clean canonical demo sessions
    const data = generateDemoDataset();
    data.sessions.forEach(sess => {
      localStorage.setItem(`cx_session_${sess.session_uuid}`, JSON.stringify(sess));
    });
    localStorage.setItem('cx_sessions', JSON.stringify(data.sessions));
    localStorage.setItem('cx_workout_history', JSON.stringify(data.sessions));
    localStorage.setItem('cx_completed_sessions', JSON.stringify(data.sessions));

    // 3. Restore bodyweight baseline
    localStorage.setItem('cx_weight_history', JSON.stringify(data.weightHistory));
    localStorage.setItem('cx_target_weight', '77');
    localStorage.setItem('cx_latest_weight', '78.3');
    localStorage.setItem('cx_initialized', '1');
    localStorage.setItem('cx_demo_data', '1');

    // 4. Invalidate API cache if available
    if (typeof API !== 'undefined' && typeof API.invalidateCache === 'function') {
      API.invalidateCache();
    } else if (typeof invalidateCache === 'function') {
      invalidateCache();
    }

    // 5. Update runtime state
    if (typeof state !== 'undefined') {
      state.weightHistory = [...data.weightHistory];
      state.targetWeight = 77.0;
      state.latestWeight = 78.3;
      state.activeSession = null;
      state.todayLogs = {};
      state.workoutSessions = [...data.sessions];
      state.historyLogs = null;
      state.dashboardRecords = null;
      if (!state.userProfile) state.userProfile = {};
      state.userProfile.target_weight = 77.0;
      state.userProfile.current_weight = 78.3;
    }

    // 6. Backend sync if reachable
    if (typeof fetch === 'function') {
      try {
        const url = (typeof API_BASE !== 'undefined') ? `${API_BASE}/demo/reset` : (typeof API_URL !== 'undefined' ? `${API_URL}/demo/reset` : 'http://127.0.0.1:5001/demo/reset');
        await fetch(url, { method: 'POST' });
      } catch (_) {}
    }

    if (typeof showToast === 'function') {
      showToast('Demo data restored to clean baseline');
    }
    if (typeof loadDashboardSummary === 'function') {
      await loadDashboardSummary();
    }
    if (typeof loadWorkoutSessions === 'function') {
      await loadWorkoutSessions();
    }
    if (typeof render === 'function') {
      render();
    }
    if (typeof renderApp === 'function') {
      renderApp();
    }
  }

  async function executeResetEverything() {
    if (typeof localStorage === 'undefined') return;

    // 1. Wipe all local storage keys
    localStorage.clear();

    // 2. Mark explicitly cleared so demo data never resurrects on refresh
    localStorage.setItem('cx_user_cleared', '1');
    localStorage.setItem('cx_initialized', '1');
    localStorage.setItem('cx_demo_data', '0');
    localStorage.setItem('cx_weight_history', '[]');

    const defaults = typeof SETTINGS_DEFAULTS !== 'undefined' ? SETTINGS_DEFAULTS : {
      weight_unit: 'kg',
      default_rest_sec: 90,
      rest_pause_sec: 15,
      keep_screen_awake: true,
      flash_screen: false,
      effort_mode: 'RIR',
      theme: 'dark',
      accent_color: '#FF5D5D',
      body_diagram_model: 'male',
      language: 'en',
      equipment: ['pullup_bar', 'dip_bars', 'rings', 'parallettes', 'resistance_bands', 'floor']
    };

    localStorage.setItem('cx_weight_unit', defaults.weight_unit);
    localStorage.setItem('cx_default_rest_sec', String(defaults.default_rest_sec));
    localStorage.setItem('cx_rest_pause_sec', String(defaults.rest_pause_sec));
    localStorage.setItem('cx_keep_screen_awake', defaults.keep_screen_awake ? '1' : '0');
    localStorage.setItem('cx_flash_screen', defaults.flash_screen ? '1' : '0');
    localStorage.setItem('cx_effort_mode', defaults.effort_mode);
    localStorage.setItem('cx_theme', defaults.theme);
    localStorage.setItem('cx_body_diagram_model', defaults.body_diagram_model);
    localStorage.setItem('cx_accent_color', defaults.accent_color);
    localStorage.setItem('cx_language', defaults.language);
    localStorage.setItem('cx_equipment_profile', JSON.stringify(defaults.equipment));

    // 3. Clear memory state
    if (typeof state !== 'undefined') {
      state.view = 'home';
      state.weightHistory = [];
      state.workoutSessions = [];
      state.activeSession = null;
      state.todayLogs = {};
      state.latestWeight = null;
      state.targetWeight = null;
      state.dashboardSummary = { streak_days: 0, week_sessions: 0, week_sets: 0, top_movers: [] };
      state.dashboardRecords = [];
      state.dashboardActivity = [];
      state.historyLogs = [];
      state.weightUnit = defaults.weight_unit;
      state.defaultRestSec = defaults.default_rest_sec;
      state.restPauseSec = defaults.rest_pause_sec;
      state.keepScreenAwake = defaults.keep_screen_awake;
      state.soundsEnabled = true;
      state.flashScreen = defaults.flash_screen;
      state.effortMode = defaults.effort_mode;
      state.theme = defaults.theme;
      state.bodyDiagramModel = defaults.body_diagram_model;
      state.accentColor = defaults.accent_color;
      state.language = defaults.language;
      state.equipmentProfile = [...defaults.equipment];
    }

    // 4. Clear server-side database if available
    if (typeof fetch === 'function') {
      try {
        const url = (typeof API_BASE !== 'undefined') ? `${API_BASE}/reset-everything` : (typeof API_URL !== 'undefined' ? `${API_URL}/reset-everything` : 'http://127.0.0.1:5001/reset-everything');
        await fetch(url, { method: 'POST' });
      } catch (_) {}
    }

    // 5. Invalidate API cache
    if (typeof API !== 'undefined' && typeof API.invalidateCache === 'function') {
      API.invalidateCache();
    } else if (typeof invalidateCache === 'function') {
      invalidateCache();
    }

    if (typeof initThemeAndAccent === 'function') {
      initThemeAndAccent();
    }
    if (typeof closeSettingsModal === 'function') {
      closeSettingsModal();
    }
    if (typeof closeSettingsSheet === 'function') {
      closeSettingsSheet();
    }

    if (typeof showToast === 'function') {
      showToast('All user and workout data permanently cleared');
    }
    if (typeof loadDashboardSummary === 'function') {
      await loadDashboardSummary();
    }
    if (typeof loadWorkoutSessions === 'function') {
      await loadWorkoutSessions();
    }
    if (typeof loadExercises === 'function') {
      await loadExercises();
    }
    if (typeof loadSplits === 'function') {
      await loadSplits();
    }
    if (typeof loadWorkouts === 'function') {
      await loadWorkouts();
    }
    if (typeof switchView === 'function') {
      switchView('home');
    } else if (typeof render === 'function') {
      render();
    }
    if (typeof renderApp === 'function') {
      renderApp();
    }
  }

  // Export globals
  if (typeof window !== 'undefined') {
    window.CANONICAL_DEFAULT_WEIGHT_HISTORY = CANONICAL_DEFAULT_WEIGHT_HISTORY;
    window.generateDemoDataset = generateDemoDataset;
    window.shouldInitializeDemoData = shouldInitializeDemoData;
    window.initializeDemoData = initializeDemoData;
    window.restoreCleanDemoData = restoreCleanDemoData;
    window.executeResetEverything = executeResetEverything;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.CANONICAL_DEFAULT_WEIGHT_HISTORY = CANONICAL_DEFAULT_WEIGHT_HISTORY;
    globalThis.generateDemoDataset = generateDemoDataset;
    globalThis.shouldInitializeDemoData = shouldInitializeDemoData;
    globalThis.initializeDemoData = initializeDemoData;
    globalThis.restoreCleanDemoData = restoreCleanDemoData;
    globalThis.executeResetEverything = executeResetEverything;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      CANONICAL_DEFAULT_WEIGHT_HISTORY,
      generateDemoDataset,
      shouldInitializeDemoData,
      initializeDemoData,
      restoreCleanDemoData,
      executeResetEverything
    };
  }
})();
