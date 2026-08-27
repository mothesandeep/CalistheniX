import unittest
from datetime import date, timedelta
from backend.services.progression_service import calculate_progression_readiness
from backend.services.dashboard_service import (
    compute_exercise_progress,
    compute_exercise_stats,
    calculate_streak,
    calculate_week_stats,
    calculate_top_movers,
    format_personal_records,
    compute_muscle_focus
)


class TestProgressionService(unittest.TestCase):

    def test_calculate_progression_readiness_no_target(self):
        ex = {'id': 1, 'name': 'Push-ups', 'type': 'reps', 'progression_target_reps': None, 'progression_target_duration': None}
        result = calculate_progression_readiness(ex, [])
        self.assertTrue(result['no_target'])
        self.assertEqual(result['status'], 'not_ready')
        self.assertEqual(result['readiness_pct'], 0)

    def test_calculate_progression_readiness_ready_low_rpe(self):
        ex = {
            'id': 1,
            'name': 'Pull-ups',
            'type': 'reps',
            'progression_target_reps': 10,
            'progression_sessions_needed': 2
        }
        logs = [
            {'timestamp': '2026-08-25T10:00:00Z', 'reps': 12, 'rpe': 7.0},
            {'timestamp': '2026-08-26T10:00:00Z', 'reps': 11, 'rpe': 6.5}
        ]
        result = calculate_progression_readiness(ex, logs)
        self.assertFalse(result['no_target'])
        self.assertEqual(result['status'], 'ready')
        self.assertGreaterEqual(result['readiness_pct'], 90)
        self.assertTrue(result['criteria']['hold_or_reps_met'])

    def test_calculate_progression_readiness_high_rpe_fatigue(self):
        ex = {
            'id': 1,
            'name': 'Dips',
            'type': 'reps',
            'progression_target_reps': 15,
            'progression_sessions_needed': 2
        }
        logs = [
            {'timestamp': '2026-08-25T10:00:00Z', 'reps': 15, 'rpe': 9.5},
            {'timestamp': '2026-08-26T10:00:00Z', 'reps': 15, 'rpe': 9.0}
        ]
        result = calculate_progression_readiness(ex, logs)
        self.assertEqual(result['status'], 'almost_ready')


class TestDashboardService(unittest.TestCase):

    def test_compute_exercise_progress_reps_and_weight(self):
        logs = [
            {'timestamp': '2026-08-20T10:00:00Z', 'reps': 10, 'weight_kg': 10},
            {'timestamp': '2026-08-20T10:05:00Z', 'reps': 10, 'weight_kg': 10},
            {'timestamp': '2026-08-21T10:00:00Z', 'reps': 12, 'weight_kg': 0}
        ]
        pts = compute_exercise_progress('reps', logs)
        self.assertEqual(len(pts), 2)
        self.assertEqual(pts[0]['metric'], 200)  # (10*10) + (10*10)
        self.assertEqual(pts[1]['metric'], 12)   # 12

    def test_compute_exercise_progress_duration(self):
        logs = [
            {'timestamp': '2026-08-20T10:00:00Z', 'duration_sec': 30},
            {'timestamp': '2026-08-20T10:05:00Z', 'duration_sec': 45}
        ]
        pts = compute_exercise_progress('duration', logs)
        self.assertEqual(len(pts), 1)
        self.assertEqual(pts[0]['metric'], 45)  # max duration

    def test_calculate_streak(self):
        today = date(2026, 8, 27)
        dates = {'2026-08-25', '2026-08-26', '2026-08-27'}
        streak, anchor = calculate_streak(dates, today, today)
        self.assertEqual(streak, 3)

    def test_compute_muscle_focus(self):
        res = compute_muscle_focus('Push Day A', 'Focusing on diamond pushups and bar dips')
        self.assertIn('chest', res['front'])
        self.assertIn('triceps', res['front'])
        self.assertIn('Chest, Shoulders, Triceps', res['muscle_label'])

    def test_format_personal_records(self):
        today = date(2026, 8, 27)
        rows = [
            {'exercise_id': 1, 'exercise_name': 'Pull-ups', 'last_achieved_at': '2026-08-27T10:00:00Z'},
            {'exercise_id': 2, 'exercise_name': 'Dips', 'last_achieved_at': '2026-08-26T10:00:00Z'},
            {'exercise_id': 3, 'exercise_name': 'Squats', 'last_achieved_at': '2026-08-24T10:00:00Z'}
        ]
        formatted = format_personal_records(rows, today, today)
        self.assertEqual(formatted[0]['date_label'], 'Today')
        self.assertEqual(formatted[1]['date_label'], 'Yesterday')
        self.assertEqual(formatted[2]['date_label'], '3 days ago')


if __name__ == '__main__':
    unittest.main()
