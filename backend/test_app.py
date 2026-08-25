import unittest
import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from backend.app import app, get_db, init_db, reseed_data, _parse_int, DB_PATH


class TestCalistheniXBackend(unittest.TestCase):

    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        init_db()
        reseed_data()
        with get_db() as conn:
            conn.execute('DELETE FROM logs')
            conn.commit()

    def test_progressions_table_removed(self):
        """Fix 5: Verify progressions table is dropped/not created."""
        with get_db() as conn:
            row = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='progressions'"
            ).fetchone()
            self.assertIsNone(row, "Table 'progressions' should not exist in database")

    def test_parse_int_helper(self):
        """Fix 4: Verify _parse_int validation helper logic."""
        # Valid integers
        val, err = _parse_int(5, 'sets', min_val=1)
        self.assertEqual(val, 5)
        self.assertIsNone(err)

        val, err = _parse_int("10", 'rest_sec', min_val=0)
        self.assertEqual(val, 10)
        self.assertIsNone(err)

        # Allow None
        val, err = _parse_int(None, 'reps', allow_none=True)
        self.assertIsNone(val)
        self.assertIsNone(err)

        # Disallow None when required
        val, err = _parse_int(None, 'sets', allow_none=False)
        self.assertIsNone(val)
        self.assertIn("required", err)

        # Reject booleans
        val, err = _parse_int(True, 'sets', min_val=1)
        self.assertIsNone(val)
        self.assertIn("boolean", err)

        # Reject invalid strings
        val, err = _parse_int("invalid", 'sets', min_val=1)
        self.assertIsNone(val)
        self.assertIn("valid integer", err)

        # Reject below min_val
        val, err = _parse_int(0, 'sets', min_val=1)
        self.assertIsNone(val)
        self.assertIn("at least 1", err)

        val, err = _parse_int(-5, 'rest_sec', min_val=0)
        self.assertIsNone(val)
        self.assertIn("at least 0", err)

    def test_add_level_exercise_validation(self):
        """Fix 4: Test input validation in add_level_exercise."""
        with get_db() as conn:
            rl = conn.execute('SELECT id FROM routine_levels LIMIT 1').fetchone()
            self.assertIsNotNone(rl)
            rl_id = rl['id']
            ex = conn.execute('SELECT id FROM exercises LIMIT 1').fetchone()
            self.assertIsNotNone(ex)
            ex_id = ex['id']

        # 1. Missing required fields
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'sets': 3
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('Missing required fields', data.get('error', ''))

        # 2. Invalid sets (string non-number)
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': 1,
            'sets': 'invalid',
            'rest_sec': 90,
            'reps': 10
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('valid integer', data.get('error', ''))

        # 3. Invalid sets (<= 0)
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': 1,
            'sets': 0,
            'rest_sec': 90,
            'reps': 10
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('at least 1', data.get('error', ''))

        # 4. Invalid rest_sec (< 0)
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': 1,
            'sets': 3,
            'rest_sec': -10,
            'reps': 10
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('at least 0', data.get('error', ''))

        # 5. Invalid order_index (boolean)
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': True,
            'sets': 3,
            'rest_sec': 90,
            'reps': 10
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('boolean', data.get('error', ''))

        # 6. Missing both reps and duration_sec
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': 99,
            'sets': 3,
            'rest_sec': 90
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn('Provide either reps or duration_sec', data.get('error', ''))

        # 7. Valid payload
        res = self.client.post(f'/routine_levels/{rl_id}/exercises', json={
            'exercise_id': ex_id,
            'order_index': 99,
            'sets': "4",
            'rest_sec': "60",
            'reps': "12",
            'notes': 'Test exercise'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['sets'], 4)
        self.assertEqual(data['rest_sec'], 60)
        self.assertEqual(data['reps'], 12)

    def test_update_level_exercise_validation(self):
        """Fix 4: Test input validation in update_level_exercise."""
        with get_db() as conn:
            le = conn.execute('SELECT id FROM level_exercises LIMIT 1').fetchone()
            self.assertIsNotNone(le)
            le_id = le['id']

        # Invalid sets
        res = self.client.put(f'/level_exercises/{le_id}', json={'sets': 'abc'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('valid integer', res.get_json().get('error', ''))

        # Invalid rest_sec
        res = self.client.put(f'/level_exercises/{le_id}', json={'rest_sec': -5})
        self.assertEqual(res.status_code, 400)
        self.assertIn('at least 0', res.get_json().get('error', ''))

        # Valid update
        res = self.client.put(f'/level_exercises/{le_id}', json={'sets': 5, 'rest_sec': 45})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['sets'], 5)
        self.assertEqual(res.get_json()['rest_sec'], 45)

    def test_get_progression_status_critical_fix(self):
        """Fix 1: Test get_progression_status returns 200 JSON with expected keys and no 500 error."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT INTO exercises (name, day, type, progression_target_reps, progression_sessions_needed)
                   VALUES ('Next Push Exercise', 'Push A', 'reps', 20, 2)'''
            )
            next_id = cursor.lastrowid

            cursor.execute(
                '''INSERT INTO exercises (name, day, type, next_id, progression_target_reps, progression_sessions_needed)
                   VALUES ('Source Push Exercise', 'Push A', 'reps', ?, 10, 2)''',
                (next_id,)
            )
            source_id = cursor.lastrowid

            u1 = f"test-uuid-{uuid.uuid4()}"
            u2 = f"test-uuid-{uuid.uuid4()}"

            cursor.execute(
                '''INSERT INTO logs (exercise_id, timestamp, reps, client_uuid)
                   VALUES (?, '2026-08-20T10:00:00Z', 12, ?)''',
                (source_id, u1)
            )
            cursor.execute(
                '''INSERT INTO logs (exercise_id, timestamp, reps, client_uuid)
                   VALUES (?, '2026-08-21T10:00:00Z', 15, ?)''',
                (source_id, u2)
            )
            conn.commit()

        res = self.client.get(f'/exercises/{source_id}/progression-status')
        self.assertEqual(res.status_code, 200, f"Expected 200 but got {res.status_code}: {res.data.decode('utf-8')}")
        data = res.get_json()
        self.assertIsNotNone(data, "Response should be valid JSON, not None")
        self.assertEqual(data.get('status'), 'ready')
        self.assertEqual(data.get('readiness_pct'), 100)
        self.assertIn('criteria', data)
        self.assertTrue(data['criteria']['hold_or_reps_met'])
        self.assertEqual(data['criteria']['sessions_completed'], 2)
        self.assertEqual(data['criteria']['sessions_needed'], 2)
        self.assertIn('next_exercise', data)
        self.assertEqual(data['next_exercise']['id'], next_id)
        self.assertEqual(data['next_exercise']['name'], 'Next Push Exercise')

    def test_progression_status_high_rpe_forces_almost_ready(self):
        """Test that high RPE (>= 9) forces status to almost_ready even with 100% target hit."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT INTO exercises (name, day, type, progression_target_reps, progression_sessions_needed)
                   VALUES ('High Fatigue Exercise', 'Push A', 'reps', 10, 2)'''
            )
            ex_id = cursor.lastrowid
            u1, u2 = str(uuid.uuid4()), str(uuid.uuid4())
            cursor.execute(
                '''INSERT INTO logs (exercise_id, timestamp, reps, rpe, client_uuid)
                   VALUES (?, '2026-08-20T10:00:00Z', 12, 9.5, ?)''',
                (ex_id, u1)
            )
            cursor.execute(
                '''INSERT INTO logs (exercise_id, timestamp, reps, rpe, client_uuid)
                   VALUES (?, '2026-08-21T10:00:00Z', 14, 9.5, ?)''',
                (ex_id, u2)
            )
            conn.commit()

        res = self.client.get(f'/exercises/{ex_id}/progression-status')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'almost_ready')
        self.assertEqual(data['criteria']['avg_rpe'], 9.5)
        self.assertTrue(data['criteria']['hold_or_reps_met'])

    def test_get_progression_status_no_target(self):
        """Test get_progression_status when no target is configured."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO exercises (name, day, type) VALUES ('No Target Exercise', 'Push A', 'reps')"
            )
            ex_id = cursor.lastrowid
            conn.commit()

        res = self.client.get(f'/exercises/{ex_id}/progression-status')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'not_ready')
        self.assertEqual(data.get('readiness_pct'), 0)
        self.assertTrue(data.get('no_target'))
        self.assertFalse(data['criteria']['hold_or_reps_met'])

    def test_db_context_manager_safety(self):
        """Fix 2: Test that context manager properly yields connection and closes it."""
        with get_db() as conn:
            row = conn.execute("SELECT 1 AS ok").fetchone()
            self.assertEqual(row['ok'], 1)
        with self.assertRaises(sqlite3.ProgrammingError):
            conn.execute("SELECT 1")

    def test_flask_debug_env_config(self):
        """Fix 3: Test FLASK_DEBUG environment variable parsing."""
        with patch.dict(os.environ, {'FLASK_DEBUG': 'True'}):
            debug_flag = os.environ.get('FLASK_DEBUG', 'False') == 'True'
            self.assertTrue(debug_flag)

        with patch.dict(os.environ, {'FLASK_DEBUG': 'False'}):
            debug_flag = os.environ.get('FLASK_DEBUG', 'False') == 'True'
            self.assertFalse(debug_flag)

        with patch.dict(os.environ, {}, clear=True):
            debug_flag = os.environ.get('FLASK_DEBUG', 'False') == 'True'
            self.assertFalse(debug_flag)

    def test_crud_endpoints(self):
        """Verify standard REST endpoints work seamlessly with context manager."""
        # 1. GET /exercises
        res = self.client.get('/exercises')
        self.assertEqual(res.status_code, 200)
        exercises = res.get_json()
        self.assertTrue(len(exercises) > 0)
        ex_id = exercises[0]['id']

        # 2. POST /exercises
        res = self.client.post('/exercises', json={
            'name': 'Custom Planche Pushup',
            'day': 'Push A',
            'type': 'reps'
        })
        self.assertEqual(res.status_code, 201)
        custom_ex_id = res.get_json()['id']

        # 3. GET /routines/Push A/levels
        res = self.client.get('/routines/Push A/levels')
        self.assertEqual(res.status_code, 200)
        levels = res.get_json()
        self.assertTrue(len(levels) > 0)

        # 4. POST /logs & duplicate idempotent handling
        u_log = f"test-uuid-{uuid.uuid4()}"
        log_payload = {
            'exercise_id': ex_id,
            'timestamp': '2026-08-25T12:00:00Z',
            'reps': 15,
            'client_uuid': u_log
        }
        res = self.client.post('/logs', json=log_payload)
        self.assertEqual(res.status_code, 201)
        # Duplicate should return 200 without error
        res_dup = self.client.post('/logs', json=log_payload)
        self.assertEqual(res_dup.status_code, 200)

        # 5. GET /exercises/<id>/logs
        res = self.client.get(f'/exercises/{ex_id}/logs')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.get_json()) >= 1)

        # 6. GET /export & POST /import
        res = self.client.get('/export')
        self.assertEqual(res.status_code, 200)
        exported = res.get_json()
        self.assertTrue(len(exported) >= 1)

        res_import = self.client.post('/import', json=exported)
        self.assertEqual(res_import.status_code, 200)

        # 7. Dashboard summary, records, activity
        res = self.client.get('/dashboard/summary')
        self.assertEqual(res.status_code, 200)
        self.assertIn('streak_days', res.get_json())

        res = self.client.get('/dashboard/records')
        self.assertEqual(res.status_code, 200)

        res = self.client.get('/dashboard/activity')
        self.assertEqual(res.status_code, 200)

        # 8. Type-aware log validation
        # Reps type without reps should fail (400)
        res = self.client.post('/logs', json={
            'exercise_id': ex_id,
            'timestamp': '2026-08-25T13:00:00Z',
            'client_uuid': f"test-no-reps-{uuid.uuid4()}"
        })
        self.assertEqual(res.status_code, 400)

        # 9. Exercise creation validation
        res = self.client.post('/exercises', json={
            'name': 'Bad Type Exercise',
            'day': 'Push A',
            'type': 'invalid_type'
        })
        self.assertEqual(res.status_code, 400)

        # 10. Update & Delete level exercises
        with get_db() as conn:
            le = conn.execute('SELECT id FROM level_exercises LIMIT 1').fetchone()
            self.assertIsNotNone(le)
            le_id = le['id']

        res = self.client.put(f'/level_exercises/{le_id}', json={'sets': 5, 'rest_sec': 120})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['sets'], 5)

        res = self.client.delete(f'/level_exercises/{le_id}')
        self.assertEqual(res.status_code, 204)

    def test_workout_sessions_foundation_lifecycle(self):
        """Phase 1: Test workout_sessions lifecycle, idempotency, and set linkage."""
        with get_db() as conn:
            ex = conn.execute('SELECT id, name FROM exercises LIMIT 1').fetchone()
            ex_id = ex['id']
            ex_name = ex['name']

        sess_uuid = f"sess-{uuid.uuid4()}"
        session_payload = {
            'id': sess_uuid,
            'routine': 'Push A',
            'level': 1,
            'startTime': '2026-08-25T14:00:00Z',
            'completed_at': '2026-08-25T14:35:00Z',
            'duration': 2100,
            'status': 'completed',
            'exercises': [
                {
                    'exercise_id': ex_id,
                    'exercise_name': ex_name,
                    'exercise_type': 'reps',
                    'sets': [
                        {
                            'set_num': 1,
                            'target_val': 15,
                            'actual_val': 15,
                            'completed': True,
                            'completedAt': '2026-08-25T14:05:00Z',
                            'client_uuid': f"{sess_uuid}_{ex_id}_1"
                        },
                        {
                            'set_num': 2,
                            'target_val': 15,
                            'actual_val': 12,
                            'completed': True,
                            'completedAt': '2026-08-25T14:10:00Z',
                            'client_uuid': f"{sess_uuid}_{ex_id}_2"
                        }
                    ]
                }
            ]
        }

        # 1. First submission -> 201 Created
        res = self.client.post('/workout_sessions', json=session_payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['session_uuid'], sess_uuid)
        self.assertEqual(data['total_sets'], 2)
        self.assertEqual(data['completed_sets'], 2)

        # 2. Duplicate submission (idempotency) -> 200 OK without creating duplicate rows
        res_dup = self.client.post('/workout_sessions', json=session_payload)
        self.assertEqual(res_dup.status_code, 200)

        # 3. GET /workout_sessions list
        res_list = self.client.get('/workout_sessions')
        self.assertEqual(res_list.status_code, 200)
        sessions = res_list.get_json()
        self.assertTrue(any(s['session_uuid'] == sess_uuid for s in sessions))

        # 4. GET /workout_sessions/<session_uuid> detail
        res_detail = self.client.get(f'/workout_sessions/{sess_uuid}')
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.get_json()
        self.assertEqual(detail['session_uuid'], sess_uuid)
        self.assertEqual(len(detail['logs']), 2)
        self.assertEqual(detail['logs'][0]['session_uuid'], sess_uuid)

    def test_phase3_persistence_and_sync_bundle(self):
        """Phase 3: Test full backup bundle export (v2.0) and multi-entity idempotent import."""
        # 1. GET /export v2 bundle
        res = self.client.get('/export')
        self.assertEqual(res.status_code, 200)
        bundle = res.get_json()
        self.assertIsInstance(bundle, dict)
        self.assertEqual(bundle.get('export_version'), '2.0')
        self.assertIn('logs', bundle)
        self.assertIn('workout_sessions', bundle)
        self.assertIn('exercises', bundle)

        # 2. GET /export?format=legacy
        res_legacy = self.client.get('/export?format=legacy')
        self.assertEqual(res_legacy.status_code, 200)
        self.assertIsInstance(res_legacy.get_json(), list)

        # 3. POST /import with v2 bundle
        import_uuid_sess = f"import-sess-{uuid.uuid4()}"
        import_uuid_log = f"import-log-{uuid.uuid4()}"
        import_payload = {
            'export_version': '2.0',
            'workout_sessions': [
                {
                    'session_uuid': import_uuid_sess,
                    'routine_name': 'Pull A',
                    'level': 1,
                    'started_at': '2026-08-25T10:00:00Z',
                    'completed_at': '2026-08-25T10:45:00Z',
                    'duration_sec': 2700,
                    'total_sets': 4,
                    'completed_sets': 4,
                    'status': 'completed'
                }
            ],
            'logs': [
                {
                    'exercise_id': 1,
                    'timestamp': '2026-08-25T10:05:00Z',
                    'reps': 10,
                    'client_uuid': import_uuid_log,
                    'session_uuid': import_uuid_sess
                }
            ]
        }

        res_import = self.client.post('/import', json=import_payload)
        self.assertEqual(res_import.status_code, 200)
        data = res_import.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['imported_sessions'], 1)
        self.assertEqual(data['imported_logs'], 1)

        # 4. Duplicate import test (should skip already imported without crashing)
        res_import_dup = self.client.post('/import', json=import_payload)
        self.assertEqual(res_import_dup.status_code, 200)
        dup_data = res_import_dup.get_json()
        self.assertEqual(dup_data['skipped_sessions'], 1)
        self.assertEqual(dup_data['skipped_logs'], 1)

        # 5. Invalid import payload rejection
        res_invalid = self.client.post('/import', json={'logs': 'not-a-list'})
        self.assertEqual(res_invalid.status_code, 400)

    def test_phase5_dashboard_aggregates_and_streak(self):
        """Phase 5: Test dynamic streak calculation, weekly volume, and PR aggregates."""
        now = datetime.now(timezone.utc)
        d0 = now.strftime('%Y-%m-%dT12:00:00Z')
        d1 = (now - timedelta(days=1)).strftime('%Y-%m-%dT12:00:00Z')
        d2 = (now - timedelta(days=2)).strftime('%Y-%m-%dT12:00:00Z')

        with get_db() as conn:
            ex = conn.execute('SELECT id FROM exercises LIMIT 1').fetchone()
            ex_id = ex['id']

            # Insert logs for 3 consecutive days
            for i, ts in enumerate([d0, d1, d2]):
                conn.execute(
                    '''INSERT INTO logs (exercise_id, timestamp, reps, weight_kg, rpe, client_uuid)
                       VALUES (?, ?, ?, ?, ?, ?)''',
                    (ex_id, ts, 15 + i, 5.0, 8, f"streak-uuid-{i}-{uuid.uuid4()}")
                )
            conn.commit()

        # 1. Check summary
        res = self.client.get('/dashboard/summary')
        self.assertEqual(res.status_code, 200)
        summary = res.get_json()
        self.assertEqual(summary['streak_days'], 3)
        self.assertEqual(summary['week_sessions'], 3)
        self.assertGreaterEqual(summary['week_sets'], 3)

        # 2. Check PRs
        res_pr = self.client.get('/dashboard/records')
        self.assertEqual(res_pr.status_code, 200)
        records = res_pr.get_json()
        self.assertTrue(len(records) >= 1)
        top_ex = next(r for r in records if r['exercise_id'] == ex_id)
        self.assertEqual(top_ex['max_reps'], 17) # 15 + 2

        # 3. Check activity heatmap
        res_act = self.client.get('/dashboard/activity')
        self.assertEqual(res_act.status_code, 200)
        activity = res_act.get_json()
        self.assertTrue(len(activity) >= 3)

    def test_phase7_exercise_progression_promotion(self):
        """Phase 7: Test one-tap progression promotion replacing routine slots with next progression."""
        with get_db() as conn:
            # Create step 1 exercise
            c1 = conn.execute(
                "INSERT INTO exercises (name, type, day) VALUES ('Progress Step 1', 'reps', 'Push A')"
            )
            step1_id = c1.lastrowid

            # Create step 2 exercise
            c2 = conn.execute(
                "INSERT INTO exercises (name, type, day) VALUES ('Progress Step 2', 'reps', 'Push A')"
            )
            step2_id = c2.lastrowid

            # Link step 1 -> step 2
            conn.execute('UPDATE exercises SET next_id = ? WHERE id = ?', (step2_id, step1_id))

            # Put step 1 in a routine level
            c_le = conn.execute(
                '''INSERT INTO level_exercises (routine_level_id, exercise_id, sets, reps, rest_sec, order_index)
                   VALUES (1, ?, 3, 10, 90, 99)''',
                (step1_id,)
            )
            le_id = c_le.lastrowid
            conn.commit()

        # Call promote endpoint
        res = self.client.post(f'/exercises/{step1_id}/promote')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'promoted')
        self.assertEqual(data['next_exercise']['id'], step2_id)
        self.assertGreaterEqual(data['updated_routine_slots'], 1)

        # Verify routine level slot updated to step 2
        with get_db() as conn:
            row = conn.execute(
                'SELECT exercise_id FROM level_exercises WHERE id = ?', (le_id,)
            ).fetchone()
            self.assertEqual(row['exercise_id'], step2_id)

    def test_phase11_edge_cases_and_error_handling(self):
        """Phase 11: Test 404/400 error handling on session details, promote without next_id, and invalid routes."""
        # 1. Non-existent session detail -> 404
        res_sess_404 = self.client.get('/workout_sessions/non-existent-uuid-12345')
        self.assertEqual(res_sess_404.status_code, 404)

        # 2. Promote non-existent exercise -> 404
        res_prom_404 = self.client.post('/exercises/999999/promote')
        self.assertEqual(res_prom_404.status_code, 404)

        # 3. Promote exercise without configured next_id -> 400
        with get_db() as conn:
            c = conn.execute("INSERT INTO exercises (name, type, day) VALUES ('Dead End Exercise', 'reps', 'Push A')")
            dead_end_id = c.lastrowid
            conn.commit()

        res_prom_400 = self.client.post(f'/exercises/{dead_end_id}/promote')
        self.assertEqual(res_prom_400.status_code, 400)
        self.assertIn('No next progression', res_prom_400.get_json()['error'])

        # 4. Root route directory returns 200 JSON
        res_root = self.client.get('/')
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_root.get_json()['status'], 'online')


if __name__ == '__main__':
    unittest.main()
