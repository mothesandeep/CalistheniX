import unittest
import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

try:
    from backend.app import app, get_db, init_db, reseed_data, _parse_int, DB_PATH
except ImportError:
    from app import app, get_db, init_db, reseed_data, _parse_int, DB_PATH


class TestPhase1Hardening(unittest.TestCase):

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

    # ── P0: Historical Data Immutability ─────────────────────────────────────
    def test_historical_session_immutability(self):
        """Step 4: Modifying workout templates must NOT mutate completed sessions."""
        sess_uuid = str(uuid.uuid4())
        session_payload = {
            'id': sess_uuid,
            'routine': 'Push A',
            'level': 1,
            'startTime': datetime.now(timezone.utc).isoformat(),
            'completed_at': datetime.now(timezone.utc).isoformat(),
            'duration_sec': 1800,
            'status': 'completed',
            'exercises': [
                {
                    'exercise_id': 1,
                    'name': 'Diamond Push-ups',
                    'sets': [
                        {'set_num': 1, 'completed': True, 'actual_val': 20, 'weight_kg': 0, 'rpe': 8}
                    ]
                }
            ]
        }

        # 1. Save completed session
        res = self.client.post('/workout_sessions', json=session_payload)
        self.assertEqual(res.status_code, 201)

        # 2. Modify workout exercise template in database
        with get_db() as conn:
            conn.execute(
                'UPDATE workout_exercises SET reps = 99, sets = 10 WHERE exercise_id = 1'
            )
            conn.commit()

        # 3. Fetch completed session detail and verify it preserved original data
        res = self.client.get(f'/workout_sessions/{sess_uuid}')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsNotNone(data.get('snapshot'))
        self.assertEqual(data['snapshot']['exercises'][0]['sets'][0]['actual_val'], 20)
        self.assertEqual(len(data.get('logs', [])), 1)
        self.assertEqual(data['logs'][0]['reps'], 20)

    # ── P0: Idempotency & Duplicate Sync ──────────────────────────────────────
    def test_session_sync_idempotency(self):
        """Step 7: Submitting the same workout session twice must NOT duplicate records."""
        sess_uuid = str(uuid.uuid4())
        client_uuid = str(uuid.uuid4())
        payload = {
            'id': sess_uuid,
            'routine': 'Pull A',
            'level': 1,
            'startTime': datetime.now(timezone.utc).isoformat(),
            'completed_at': datetime.now(timezone.utc).isoformat(),
            'duration_sec': 1200,
            'status': 'completed',
            'exercises': [
                {
                    'exercise_id': 12,
                    'name': 'Pull-ups Wide Grip',
                    'sets': [
                        {'set_num': 1, 'completed': True, 'actual_val': 10, 'client_uuid': client_uuid}
                    ]
                }
            ]
        }

        # First POST
        res1 = self.client.post('/workout_sessions', json=payload)
        self.assertEqual(res1.status_code, 201)

        # Second identical POST (simulating retry / double click)
        res2 = self.client.post('/workout_sessions', json=payload)
        self.assertEqual(res2.status_code, 200)

        with get_db() as conn:
            session_count = conn.execute(
                'SELECT COUNT(*) AS cnt FROM workout_sessions WHERE session_uuid = ?', (sess_uuid,)
            ).fetchone()['cnt']
            self.assertEqual(session_count, 1, "Session must not be duplicated")

            log_count = conn.execute(
                'SELECT COUNT(*) AS cnt FROM logs WHERE client_uuid = ?', (client_uuid,)
            ).fetchone()['cnt']
            self.assertEqual(log_count, 1, "Log set must not be duplicated")

    # ── P0: PR Calculation Accuracy ──────────────────────────────────────────
    def test_personal_records_calculation(self):
        """Step 12: PR detection computes correct max reps, duration, and load."""
        with get_db() as conn:
            # Add logs for exercise 1 (Diamond Push-ups, reps)
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, reps, client_uuid)
                VALUES (1, '2026-08-01T10:00:00Z', 15, 'uuid-pr-1')
            ''')
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, reps, client_uuid)
                VALUES (1, '2026-08-05T10:00:00Z', 25, 'uuid-pr-2')
            ''')
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, reps, client_uuid)
                VALUES (1, '2026-08-10T10:00:00Z', 20, 'uuid-pr-3')
            ''')
            conn.commit()

        res = self.client.get('/dashboard/records')
        self.assertEqual(res.status_code, 200)
        records = res.get_json()
        ex1_record = next((r for r in records if r['exercise_id'] == 1), None)
        self.assertIsNotNone(ex1_record)
        self.assertEqual(ex1_record['max_reps'], 25)
        self.assertEqual(ex1_record['total_logs'], 3)

    # ── P0: Backup and Restore Verification ──────────────────────────────────
    def test_backup_export_and_restore(self):
        """Step 16: Export backup and restore into clean environment."""
        sess_uuid = str(uuid.uuid4())
        client_uuid = str(uuid.uuid4())

        # Insert test data
        with get_db() as conn:
            conn.execute('''
                INSERT INTO workout_sessions (session_uuid, routine_name, level, started_at, completed_at, duration_sec, total_sets, completed_sets, status)
                VALUES (?, 'Push A', 1, '2026-08-20T10:00:00Z', '2026-08-20T10:30:00Z', 1800, 4, 4, 'completed')
            ''', (sess_uuid,))
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, reps, client_uuid, session_uuid)
                VALUES (1, '2026-08-20T10:10:00Z', 18, ?, ?)
            ''', (client_uuid, sess_uuid))
            conn.commit()

        # 1. Export backup
        res = self.client.get('/export')
        self.assertEqual(res.status_code, 200)
        backup_data = res.get_json()
        self.assertEqual(backup_data.get('export_version'), '2.1')
        self.assertIn('logs', backup_data)
        self.assertIn('workout_sessions', backup_data)

        # 2. Clear database
        with get_db() as conn:
            conn.execute('DELETE FROM logs')
            conn.execute('DELETE FROM workout_sessions')
            conn.commit()

        # 3. Restore backup
        res = self.client.post('/import', json=backup_data)
        self.assertEqual(res.status_code, 200)
        import_result = res.get_json()
        self.assertGreaterEqual(import_result.get('imported_logs', 0), 1)
        self.assertGreaterEqual(import_result.get('imported_sessions', 0), 1)

        # 4. Verify restored data
        with get_db() as conn:
            restored_log = conn.execute('SELECT * FROM logs WHERE client_uuid = ?', (client_uuid,)).fetchone()
            self.assertIsNotNone(restored_log)
            self.assertEqual(restored_log['reps'], 18)

            restored_sess = conn.execute('SELECT * FROM workout_sessions WHERE session_uuid = ?', (sess_uuid,)).fetchone()
            self.assertIsNotNone(restored_sess)

    # ── P1: Database Indexing & Integrity ─────────────────────────────────────
    def test_database_performance_indexes(self):
        """Step 5: Verify required database indexes exist."""
        with get_db() as conn:
            indexes = [
                row[1] for row in conn.execute(
                    "SELECT type, name FROM sqlite_master WHERE type='index'"
                ).fetchall()
            ]
            self.assertIn('idx_logs_exercise_timestamp', indexes)
            self.assertIn('idx_logs_session_uuid', indexes)
            self.assertIn('idx_sessions_started_at', indexes)
            self.assertIn('idx_sessions_completed_at', indexes)

    def test_movement_pattern_migration_step(self):
        """Verify movement_pattern column migration and backfill logic."""
        from backend.app import _migrate_movement_pattern_column
        with get_db() as conn:
            cols = [row[1] for row in conn.execute('PRAGMA table_info(exercises)').fetchall()]
            self.assertIn('movement_pattern', cols)

            # Re-running migration is safe (idempotent)
            _migrate_movement_pattern_column()

            # Confirm no null values exist
            null_count = conn.execute("SELECT COUNT(*) FROM exercises WHERE movement_pattern IS NULL").fetchone()[0]
            self.assertEqual(null_count, 0)


if __name__ == '__main__':
    unittest.main()
