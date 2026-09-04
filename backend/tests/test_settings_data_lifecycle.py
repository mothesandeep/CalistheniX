import unittest
import json
from backend.app import app, get_db, init_db, reseed_data

class TestSettingsDataLifecycle(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        init_db()
        reseed_data(force=True)
        with get_db() as conn:
            conn.execute('DELETE FROM logs')
            conn.execute('DELETE FROM workout_sessions')
            conn.commit()

    def tearDown(self):
        reseed_data(force=True)
        with get_db() as conn:
            conn.execute('DELETE FROM logs')
            conn.execute('DELETE FROM workout_sessions')
            conn.commit()

    def test_demo_seed_endpoint_seeds_when_empty(self):
        """Fresh state: POST /api/demo/seed populates sessions and logs."""
        res = self.client.post('/api/demo/seed')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data.get('sessions_count'), 24)
        self.assertGreater(data.get('logs_count'), 100)

        # Verify DB content
        with get_db() as conn:
            sess_count = conn.execute('SELECT COUNT(*) FROM workout_sessions').fetchone()[0]
            log_count = conn.execute('SELECT COUNT(*) FROM logs').fetchone()[0]
            self.assertEqual(sess_count, 24)
            self.assertEqual(log_count, data.get('logs_count'))

    def test_demo_seed_endpoint_idempotent_no_duplicate(self):
        """Re-seeding when data already exists does not duplicate."""
        res1 = self.client.post('/api/demo/seed')
        self.assertEqual(res1.status_code, 200)
        first_count = res1.get_json().get('sessions_count')

        # Second call without force
        res2 = self.client.post('/api/demo/seed')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertEqual(data2.get('status'), 'skipped')
        self.assertIn('already contains workout data', data2.get('message', ''))

        with get_db() as conn:
            sess_count = conn.execute('SELECT COUNT(*) FROM workout_sessions').fetchone()[0]
            self.assertEqual(sess_count, first_count)

    def test_demo_reset_restores_canonical_dataset(self):
        """POST /api/demo/reset wipes existing sessions/logs and restores clean 24 sessions."""
        # Seed initial
        self.client.post('/api/demo/seed')
        
        # Add a custom user log and session
        with get_db() as conn:
            conn.execute("""
                INSERT INTO workout_sessions (session_uuid, routine_name, status, started_at)
                VALUES ('custom-user-sess', 'Custom Split', 'completed', '2026-09-01T10:00:00')
            """)
            conn.execute("""
                INSERT INTO logs (exercise_id, reps, rpe, client_uuid, session_uuid, timestamp)
                VALUES (1, 99, 10, 'custom-log-1', 'custom-user-sess', '2026-09-01T10:05:00')
            """)
            conn.commit()

        # Reset demo data
        res = self.client.post('/api/demo/reset')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data.get('sessions_count'), 24)

        # Check custom session is gone and demo dataset is clean
        with get_db() as conn:
            custom_sess = conn.execute("SELECT COUNT(*) FROM workout_sessions WHERE session_uuid = 'custom-user-sess'").fetchone()[0]
            self.assertEqual(custom_sess, 0)
            custom_log = conn.execute("SELECT COUNT(*) FROM logs WHERE client_uuid = 'custom-log-1'").fetchone()[0]
            self.assertEqual(custom_log, 0)
            sess_count = conn.execute('SELECT COUNT(*) FROM workout_sessions').fetchone()[0]
            self.assertEqual(sess_count, 24)

    def test_demo_reset_multiple_times_no_duplicates(self):
        """Resetting demo data multiple times sequentially never duplicates records."""
        for _ in range(3):
            res = self.client.post('/api/demo/reset')
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.get_json().get('sessions_count'), 24)

        with get_db() as conn:
            sess_count = conn.execute('SELECT COUNT(*) FROM workout_sessions').fetchone()[0]
            self.assertEqual(sess_count, 24)
            # Check unique session UUIDs
            unique_uuids = conn.execute('SELECT COUNT(DISTINCT session_uuid) FROM workout_sessions').fetchone()[0]
            self.assertEqual(unique_uuids, 24)

    def test_reset_everything_wipes_all_user_data_and_preserves_presets(self):
        """POST /api/reset-everything permanently wipes sessions/logs and keeps presets untouched."""
        # Seed demo data first
        self.client.post('/api/demo/seed')

        with get_db() as conn:
            presets_before = conn.execute('SELECT COUNT(*) FROM workouts').fetchone()[0]
            exercises_before = conn.execute('SELECT COUNT(*) FROM exercises').fetchone()[0]
            workout_ex_before = conn.execute('SELECT COUNT(*) FROM workout_exercises').fetchone()[0]
            splits_before = conn.execute('SELECT COUNT(*) FROM training_splits').fetchone()[0]
            schedule_before = conn.execute('SELECT COUNT(*) FROM weekly_schedules').fetchone()[0]
            self.assertGreater(presets_before, 0)
            self.assertGreater(exercises_before, 0)

        # Call reset everything
        res = self.client.post('/api/reset-everything')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')

        # Verify all user and demo data is wiped
        with get_db() as conn:
            sess_after = conn.execute('SELECT COUNT(*) FROM workout_sessions').fetchone()[0]
            logs_after = conn.execute('SELECT COUNT(*) FROM logs').fetchone()[0]
            self.assertEqual(sess_after, 0)
            self.assertEqual(logs_after, 0)

            # Verify presets are UNTOUCHED
            presets_after = conn.execute('SELECT COUNT(*) FROM workouts').fetchone()[0]
            exercises_after = conn.execute('SELECT COUNT(*) FROM exercises').fetchone()[0]
            workout_ex_after = conn.execute('SELECT COUNT(*) FROM workout_exercises').fetchone()[0]
            splits_after = conn.execute('SELECT COUNT(*) FROM training_splits').fetchone()[0]
            schedule_after = conn.execute('SELECT COUNT(*) FROM weekly_schedules').fetchone()[0]

            self.assertEqual(presets_before, presets_after)
            self.assertEqual(exercises_before, exercises_after)
            self.assertEqual(workout_ex_before, workout_ex_after)
            self.assertEqual(splits_before, splits_after)
            self.assertEqual(schedule_before, schedule_after)

if __name__ == '__main__':
    unittest.main()
