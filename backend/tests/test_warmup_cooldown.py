import unittest
import json
import uuid
from datetime import datetime, timezone

try:
    from backend.app import app, get_db, init_db, reseed_data
except ImportError:
    from app import app, get_db, init_db, reseed_data


class TestWarmupCooldownSystem(unittest.TestCase):

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

    def test_database_schema_has_phase_columns_with_default_main(self):
        """Requirement 2: Ensure phase column exists in tables and defaults to 'main'."""
        with get_db() as conn:
            cursor = conn.cursor()
            for table in ('workout_exercises', 'level_exercises', 'logs'):
                cols = {row[1]: row for row in cursor.execute(f'PRAGMA table_info({table})').fetchall()}
                self.assertIn('phase', cols, f"Table '{table}' missing 'phase' column")
                # Check default value is 'main'
                default_val = cols['phase'][4]
                self.assertIn('main', str(default_val).lower())

    def test_canonical_warmup_and_cooldown_exercises_seeded(self):
        """Requirement 3 & 4: Ensure mobility and stretch movements exist in exercises catalog with duration/reps."""
        res = self.client.get('/exercises')
        self.assertEqual(res.status_code, 200)
        exercises = res.get_json()
        ex_map = {e['name']: e for e in exercises}

        # Check Warm-up exercises
        warmup_names = ['Wrist Circles', 'Arm Circles', 'Shoulder CARs', 'Leg Swings', 'Scapular Push-ups']
        for name in warmup_names:
            self.assertIn(name, ex_map, f"Warm-up exercise '{name}' missing from catalog")
            ex = ex_map[name]
            if name == 'Scapular Push-ups':
                self.assertEqual(ex['type'], 'reps')
            else:
                self.assertEqual(ex['type'], 'duration')

        # Check Cool-down exercises
        cooldown_names = ['Chest Stretch', 'Lat Stretch', 'Shoulder Stretch', 'Hip Flexor Stretch', 'Hamstring Stretch']
        for name in cooldown_names:
            self.assertIn(name, ex_map, f"Cool-down exercise '{name}' missing from catalog")
            self.assertEqual(ex_map[name]['type'], 'duration')

    def test_create_workout_with_flat_list_phases(self):
        """Requirement 1 & 5: Create workout using flat exercises list with explicit phase attributes."""
        # Look up exercise IDs
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        payload = {
            'name': 'Complete Push Session',
            'description': 'Push day with dynamic warm-up and post-workout stretching',
            'exercises': [
                {
                    'exercise_id': wrist_id,
                    'phase': 'warmup',
                    'sets': 1,
                    'duration_sec': 30,
                    'rest_sec': 10
                },
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'sets': 3,
                    'reps': 12,
                    'rest_sec': 90
                },
                {
                    'exercise_id': chest_stretch_id,
                    'phase': 'cooldown',
                    'sets': 1,
                    'duration_sec': 45,
                    'rest_sec': 15
                }
            ]
        }

        res = self.client.post('/workouts', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()

        self.assertEqual(data['name'], 'Complete Push Session')
        self.assertEqual(len(data['exercises']), 3)

        # Verify ordering: warm-up (1) -> main (2) -> cool-down (3)
        self.assertEqual(data['exercises'][0]['phase'], 'warmup')
        self.assertEqual(data['exercises'][0]['order_index'], 1)
        self.assertEqual(data['exercises'][0]['duration_sec'], 30)

        self.assertEqual(data['exercises'][1]['phase'], 'main')
        self.assertEqual(data['exercises'][1]['order_index'], 2)
        self.assertEqual(data['exercises'][1]['reps'], 12)

        self.assertEqual(data['exercises'][2]['phase'], 'cooldown')
        self.assertEqual(data['exercises'][2]['order_index'], 3)
        self.assertEqual(data['exercises'][2]['duration_sec'], 45)

        # Check sectional groupings
        self.assertEqual(len(data['warm_up']), 1)
        self.assertEqual(len(data['main']), 1)
        self.assertEqual(len(data['cool_down']), 1)
        self.assertEqual(data['total_sets'], 5)
        self.assertEqual(data['warmup_sets'], 1)
        self.assertEqual(data['main_sets'], 3)
        self.assertEqual(data['cooldown_sets'], 1)

    def test_create_workout_with_sectional_keys(self):
        """Requirement 1, 4 & 5: Create workout using explicit warm_up, main, and cool_down keys."""
        with get_db() as conn:
            arm_id = conn.execute("SELECT id FROM exercises WHERE name = 'Arm Circles'").fetchone()['id']
            scap_id = conn.execute("SELECT id FROM exercises WHERE name = 'Scapular Push-ups'").fetchone()['id']
            dips_id = conn.execute("SELECT id FROM exercises WHERE name = 'Triceps Dips'").fetchone()['id']
            lat_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Lat Stretch'").fetchone()['id']

        payload = {
            'name': 'Sectional Upper Routine',
            'description': 'Sectional payload format testing',
            'warm_up': [
                {'exercise_id': arm_id, 'duration_sec': 30, 'sets': 1, 'rest_sec': 10},
                {'exercise_id': scap_id, 'reps': 10, 'sets': 1, 'rest_sec': 15}
            ],
            'main': [
                {'exercise_id': dips_id, 'reps': 15, 'sets': 4, 'rest_sec': 90}
            ],
            'cool_down': [
                {'exercise_id': lat_stretch_id, 'duration_sec': 40, 'sets': 1, 'rest_sec': 10}
            ]
        }

        res = self.client.post('/workouts', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()

        self.assertEqual(len(data['exercises']), 4)
        self.assertEqual(len(data['warm_up']), 2)
        self.assertEqual(len(data['main']), 1)
        self.assertEqual(len(data['cool_down']), 1)

        # Check sequential order_index 1..4
        orders = [e['order_index'] for e in data['exercises']]
        self.assertEqual(orders, [1, 2, 3, 4])
        self.assertEqual(data['exercises'][0]['exercise_name'], 'Arm Circles')
        self.assertEqual(data['exercises'][1]['exercise_name'], 'Scapular Push-ups')
        self.assertEqual(data['exercises'][2]['exercise_name'], 'Triceps Dips')
        self.assertEqual(data['exercises'][3]['exercise_name'], 'Lat Stretch')

    def test_backward_compatibility_old_workout_without_phases(self):
        """Requirement 2 & 8: Workouts created without warm-up/cool-down default to 'main' without error."""
        with get_db() as conn:
            ex_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']

        legacy_payload = {
            'name': 'Classic Legacy Workout',
            'description': 'No warmup or cooldown configured',
            'exercises': [
                {'exercise_id': ex_id, 'sets': 3, 'reps': 10, 'rest_sec': 90}
            ]
        }

        res = self.client.post('/workouts', json=legacy_payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()

        self.assertEqual(data['name'], 'Classic Legacy Workout')
        self.assertEqual(len(data['exercises']), 1)
        self.assertEqual(data['exercises'][0]['phase'], 'main')
        self.assertEqual(len(data['warm_up']), 0)
        self.assertEqual(len(data['main']), 1)
        self.assertEqual(len(data['cool_down']), 0)
        self.assertEqual(data['total_sets'], 3)
        self.assertEqual(data['main_sets'], 3)

    def test_update_workout_preserves_and_reconfigures_phases(self):
        """Requirement 1, 5 & 7: Updating a workout correctly updates warm-up, main, and cool-down slots."""
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            shoulder_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Shoulder Stretch'").fetchone()['id']

        res = self.client.post('/workouts', json={'name': 'Initial Workout', 'exercises': [{'exercise_id': pushup_id, 'sets': 3, 'reps': 10}]})
        self.assertEqual(res.status_code, 201)
        w_id = res.get_json()['id']

        update_payload = {
            'name': 'Initial Workout (Updated with Stretches)',
            'description': 'Now includes stretches and warm-up',
            'warm_up': [{'exercise_id': wrist_id, 'duration_sec': 30, 'sets': 1, 'rest_sec': 10}],
            'main': [{'exercise_id': pushup_id, 'reps': 12, 'sets': 4, 'rest_sec': 90}],
            'cool_down': [{'exercise_id': shoulder_stretch_id, 'duration_sec': 30, 'sets': 1, 'rest_sec': 15}]
        }

        res_update = self.client.put(f'/workouts/{w_id}', json=update_payload)
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.get_json()

        self.assertEqual(updated['name'], 'Initial Workout (Updated with Stretches)')
        self.assertEqual(len(updated['exercises']), 3)
        self.assertEqual(len(updated['warm_up']), 1)
        self.assertEqual(len(updated['main']), 1)
        self.assertEqual(len(updated['cool_down']), 1)
        self.assertEqual(updated['total_sets'], 6)

    def test_duplicate_workout_preserves_phases(self):
        """Requirement 5: Duplicate workout clones all phases and order indices properly."""
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            lat_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Lat Stretch'").fetchone()['id']

        create_res = self.client.post('/workouts', json={
            'name': 'Original Routine',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'duration_sec': 30, 'sets': 1},
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3},
                {'exercise_id': lat_stretch_id, 'phase': 'cooldown', 'duration_sec': 30, 'sets': 1}
            ]
        })
        self.assertEqual(create_res.status_code, 201)
        orig_id = create_res.get_json()['id']

        dup_res = self.client.post(f'/workouts/{orig_id}/duplicate')
        self.assertEqual(dup_res.status_code, 201)
        dup_data = dup_res.get_json()

        self.assertEqual(dup_data['name'], 'Original Routine (Copy)')
        self.assertEqual(len(dup_data['exercises']), 3)
        self.assertEqual(dup_data['exercises'][0]['phase'], 'warmup')
        self.assertEqual(dup_data['exercises'][1]['phase'], 'main')
        self.assertEqual(dup_data['exercises'][2]['phase'], 'cooldown')

    def test_today_endpoint_includes_warmup_and_cooldown(self):
        """Requirement 5: GET /today returns workout with phase metadata and sectional lists."""
        # Create a workout with warmup and cooldown and set it to today's schedule
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

            cursor = conn.cursor()
            cursor.execute("INSERT INTO workouts (name, description) VALUES ('Today Test Workout', 'Test')")
            w_id = cursor.lastrowid

            cursor.execute("INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, duration_sec, rest_sec, phase) VALUES (?, ?, 1, 1, 30, 10, 'warmup')", (w_id, wrist_id))
            cursor.execute("INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_sec, phase) VALUES (?, ?, 2, 3, 10, 90, 'main')", (w_id, pushup_id))
            cursor.execute("INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, duration_sec, rest_sec, phase) VALUES (?, ?, 3, 1, 30, 10, 'cooldown')", (w_id, chest_stretch_id))

            # Assign to active split day 0 (Monday)
            cursor.execute("UPDATE weekly_schedules SET workout_id = ? WHERE day_of_week = 0", (w_id,))
            conn.commit()

        res = self.client.get('/today')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        if data.get('status') == 'workout' and data.get('workout'):
            w = data['workout']
            self.assertIn('warm_up', w)
            self.assertIn('main', w)
            self.assertIn('cool_down', w)
            for ex in w['exercises']:
                self.assertIn('phase', ex)

    def test_session_lifecycle_and_immutable_reproduction(self):
        """Requirement 6 & 7: Completed session stores exact executed snapshot and does not mutate if workout template changes."""
        session_uuid = f"test-sess-{uuid.uuid4()}"
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        # 1. Create a workout template
        res_w = self.client.post('/workouts', json={
            'name': 'Push & Mobility V1',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'duration_sec': 30, 'sets': 1},
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'duration_sec': 30, 'sets': 1}
            ]
        })
        self.assertEqual(res_w.status_code, 201)
        w_id = res_w.get_json()['id']

        # 2. Record completed session
        session_payload = {
            'id': session_uuid,
            'routine': 'Push & Mobility V1',
            'workout_id': w_id,
            'started_at': '2026-08-27T10:00:00Z',
            'completed_at': '2026-08-27T10:45:00Z',
            'duration_sec': 2700,
            'status': 'completed',
            'exercises': [
                {
                    'exercise_id': wrist_id,
                    'exercise_name': 'Wrist Circles',
                    'phase': 'warmup',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                },
                {
                    'exercise_id': pushup_id,
                    'exercise_name': 'Diamond Push-ups',
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [
                        {'set_num': 1, 'target_val': 10, 'actual_val': 12, 'completed': True},
                        {'set_num': 2, 'target_val': 10, 'actual_val': 10, 'completed': True},
                        {'set_num': 3, 'target_val': 10, 'actual_val': 10, 'completed': True}
                    ]
                },
                {
                    'exercise_id': chest_stretch_id,
                    'exercise_name': 'Chest Stretch',
                    'phase': 'cooldown',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 45, 'completed': True}]
                }
            ]
        }

        res_sess = self.client.post('/workout_sessions', json=session_payload)
        self.assertEqual(res_sess.status_code, 201)

        # 3. Modify the workout template drastically later
        self.client.put(f'/workouts/{w_id}', json={
            'name': 'Push & Mobility V2 (Completely Changed)',
            'exercises': [
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 50, 'sets': 10}
            ]
        })

        # 4. Fetch the historical session detail: must reflect original executed session perfectly!
        res_hist = self.client.get(f'/workout_sessions/{session_uuid}')
        self.assertEqual(res_hist.status_code, 200)
        hist_data = res_hist.get_json()

        self.assertEqual(hist_data['routine_name'], 'Push & Mobility V1')
        self.assertIsNotNone(hist_data.get('snapshot'))
        snap = hist_data['snapshot']
        self.assertEqual(len(snap['exercises']), 3)
        self.assertEqual(snap['exercises'][0]['phase'], 'warmup')
        self.assertEqual(snap['exercises'][1]['phase'], 'main')
        self.assertEqual(snap['exercises'][2]['phase'], 'cooldown')

        # Check that individual logged sets stored phase correctly in logs table
        logs = hist_data['logs']
        self.assertEqual(len(logs), 5)
        warmup_logs = [l for l in logs if l.get('phase') == 'warmup']
        main_logs = [l for l in logs if l.get('phase') == 'main']
        cooldown_logs = [l for l in logs if l.get('phase') == 'cooldown']

        self.assertEqual(len(warmup_logs), 1)
        self.assertEqual(len(main_logs), 3)
        self.assertEqual(len(cooldown_logs), 1)

    def test_builder_scenarios_warmup_only_cooldown_only_and_both(self):
        """Test builder combinations: No warm-up/cool-down, Warm-up only, Cool-down only, and Both."""
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        # 1. No warm-up / cool-down
        res1 = self.client.post('/workouts', json={
            'name': 'Main Only Workout',
            'exercises': [{'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3}]
        })
        self.assertEqual(res1.status_code, 201)
        w1 = res1.get_json()
        self.assertEqual(len(w1['warm_up']), 0)
        self.assertEqual(len(w1['main']), 1)
        self.assertEqual(len(w1['cool_down']), 0)

        # 2. Warm-up only
        res2 = self.client.post('/workouts', json={
            'name': 'Warmup + Main Workout',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'duration_sec': 30, 'sets': 1},
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3}
            ]
        })
        self.assertEqual(res2.status_code, 201)
        w2 = res2.get_json()
        self.assertEqual(len(w2['warm_up']), 1)
        self.assertEqual(len(w2['main']), 1)
        self.assertEqual(len(w2['cool_down']), 0)

        # 3. Cool-down only
        res3 = self.client.post('/workouts', json={
            'name': 'Main + Cooldown Workout',
            'exercises': [
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'duration_sec': 30, 'sets': 1}
            ]
        })
        self.assertEqual(res3.status_code, 201)
        w3 = res3.get_json()
        self.assertEqual(len(w3['warm_up']), 0)
        self.assertEqual(len(w3['main']), 1)
        self.assertEqual(len(w3['cool_down']), 1)

        # 4. Both
        res4 = self.client.post('/workouts', json={
            'name': 'Full Lifecycle Workout',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'duration_sec': 30, 'sets': 1},
                {'exercise_id': pushup_id, 'phase': 'main', 'reps': 10, 'sets': 3},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'duration_sec': 30, 'sets': 1}
            ]
        })
        self.assertEqual(res4.status_code, 201)
        w4 = res4.get_json()
        self.assertEqual(len(w4['warm_up']), 1)
        self.assertEqual(len(w4['main']), 1)
        self.assertEqual(len(w4['cool_down']), 1)

    def test_builder_reordering_and_reload_persistence(self):
        """Test builder exercise reordering and reload persistence."""
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            arm_id = conn.execute("SELECT id FROM exercises WHERE name = 'Arm Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            dips_id = conn.execute("SELECT id FROM exercises WHERE name = 'Triceps Dips'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']
            lat_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Lat Stretch'").fetchone()['id']

        # Initial workout
        res_create = self.client.post('/workouts', json={
            'name': 'Reorder Routine Test',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'order_index': 1, 'duration_sec': 30},
                {'exercise_id': arm_id, 'phase': 'warmup', 'order_index': 2, 'duration_sec': 30},
                {'exercise_id': pushup_id, 'phase': 'main', 'order_index': 3, 'reps': 10},
                {'exercise_id': dips_id, 'phase': 'main', 'order_index': 4, 'reps': 12},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'order_index': 5, 'duration_sec': 30},
                {'exercise_id': lat_stretch_id, 'phase': 'cooldown', 'order_index': 6, 'duration_sec': 30}
            ]
        })
        self.assertEqual(res_create.status_code, 201)
        w_id = res_create.get_json()['id']

        # Simulate user reordering: Arm Circles before Wrist Circles in Warmup; Dips before Pushups in Main; Lat before Chest in Cooldown
        res_update = self.client.put(f'/workouts/{w_id}', json={
            'name': 'Reorder Routine Test (Reordered)',
            'exercises': [
                {'exercise_id': arm_id, 'phase': 'warmup', 'order_index': 1, 'duration_sec': 35},
                {'exercise_id': wrist_id, 'phase': 'warmup', 'order_index': 2, 'duration_sec': 25},
                {'exercise_id': dips_id, 'phase': 'main', 'order_index': 3, 'reps': 15},
                {'exercise_id': pushup_id, 'phase': 'main', 'order_index': 4, 'reps': 8},
                {'exercise_id': lat_stretch_id, 'phase': 'cooldown', 'order_index': 5, 'duration_sec': 40},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'order_index': 6, 'duration_sec': 20}
            ]
        })
        self.assertEqual(res_update.status_code, 200)

        # Reload from API
        res_reload = self.client.get(f'/workouts/{w_id}')
        self.assertEqual(res_reload.status_code, 200)
        reloaded = res_reload.get_json()

        # Check Warmup order
        self.assertEqual(reloaded['warm_up'][0]['exercise_name'], 'Arm Circles')
        self.assertEqual(reloaded['warm_up'][0]['duration_sec'], 35)
        self.assertEqual(reloaded['warm_up'][1]['exercise_name'], 'Wrist Circles')
        self.assertEqual(reloaded['warm_up'][1]['duration_sec'], 25)

        # Check Main order
        self.assertEqual(reloaded['main'][0]['exercise_name'], 'Triceps Dips')
        self.assertEqual(reloaded['main'][0]['reps'], 15)
        self.assertEqual(reloaded['main'][1]['exercise_name'], 'Diamond Push-ups')
        self.assertEqual(reloaded['main'][1]['reps'], 8)

        # Check Cooldown order
        self.assertEqual(reloaded['cool_down'][0]['exercise_name'], 'Lat Stretch')
        self.assertEqual(reloaded['cool_down'][0]['duration_sec'], 40)
        self.assertEqual(reloaded['cool_down'][1]['exercise_name'], 'Chest Stretch')
        self.assertEqual(reloaded['cool_down'][1]['duration_sec'], 20)

    def test_runner_all_phase_combinations_lifecycle(self):
        """Test all Live Runner combinations:
        1. No warm-up + no cool-down
        2. Warm-up + no cool-down
        3. No warm-up + cool-down
        4. Warm-up + cool-down
        5. Skip warm-up / skip cool-down status tracking
        """
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        # Combo 1: No warmup, No cooldown (main only)
        sess1_uuid = str(uuid.uuid4())
        res1 = self.client.post('/workout_sessions', json={
            'id': sess1_uuid,
            'routine': 'Main Only Routine',
            'started_at': '2026-08-27T08:00:00Z',
            'completed_at': '2026-08-27T08:30:00Z',
            'duration_sec': 1800,
            'warmup_status': 'none',
            'cooldown_status': 'none',
            'exercises': [
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [{'set_num': 1, 'target_val': 10, 'actual_val': 10, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res1.status_code, 201)
        det1 = self.client.get(f'/workout_sessions/{sess1_uuid}').get_json()
        self.assertEqual(det1['snapshot']['warmup_status'], 'none')
        self.assertEqual(det1['snapshot']['cooldown_status'], 'none')
        self.assertEqual(len(det1['logs']), 1)
        self.assertEqual(det1['logs'][0]['phase'], 'main')

        # Combo 2: Warm-up + No cooldown
        sess2_uuid = str(uuid.uuid4())
        res2 = self.client.post('/workout_sessions', json={
            'id': sess2_uuid,
            'routine': 'Warmup + Main Routine',
            'started_at': '2026-08-27T09:00:00Z',
            'completed_at': '2026-08-27T09:40:00Z',
            'duration_sec': 2400,
            'warmup_status': 'completed',
            'cooldown_status': 'none',
            'exercises': [
                {
                    'exercise_id': wrist_id,
                    'phase': 'warmup',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                },
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [{'set_num': 1, 'target_val': 10, 'actual_val': 12, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res2.status_code, 201)
        det2 = self.client.get(f'/workout_sessions/{sess2_uuid}').get_json()
        self.assertEqual(det2['snapshot']['warmup_status'], 'completed')
        self.assertEqual(det2['snapshot']['cooldown_status'], 'none')
        self.assertEqual(len(det2['logs']), 2)
        phases2 = [l['phase'] for l in det2['logs']]
        self.assertIn('warmup', phases2)
        self.assertIn('main', phases2)

        # Combo 3: No warmup + Cool-down
        sess3_uuid = str(uuid.uuid4())
        res3 = self.client.post('/workout_sessions', json={
            'id': sess3_uuid,
            'routine': 'Main + Cooldown Routine',
            'started_at': '2026-08-27T10:00:00Z',
            'completed_at': '2026-08-27T10:35:00Z',
            'duration_sec': 2100,
            'warmup_status': 'none',
            'cooldown_status': 'completed',
            'exercises': [
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [{'set_num': 1, 'target_val': 10, 'actual_val': 10, 'completed': True}]
                },
                {
                    'exercise_id': chest_stretch_id,
                    'phase': 'cooldown',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res3.status_code, 201)
        det3 = self.client.get(f'/workout_sessions/{sess3_uuid}').get_json()
        self.assertEqual(det3['snapshot']['warmup_status'], 'none')
        self.assertEqual(det3['snapshot']['cooldown_status'], 'completed')
        phases3 = [l['phase'] for l in det3['logs']]
        self.assertIn('main', phases3)
        self.assertIn('cooldown', phases3)

        # Combo 4: Full Lifecycle (Warmup + Main + Cooldown)
        sess4_uuid = str(uuid.uuid4())
        res4 = self.client.post('/workout_sessions', json={
            'id': sess4_uuid,
            'routine': 'Full Tri-Phase Routine',
            'started_at': '2026-08-27T11:00:00Z',
            'completed_at': '2026-08-27T11:50:00Z',
            'duration_sec': 3000,
            'warmup_status': 'completed',
            'cooldown_status': 'completed',
            'exercises': [
                {
                    'exercise_id': wrist_id,
                    'phase': 'warmup',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                },
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [{'set_num': 1, 'target_val': 10, 'actual_val': 10, 'completed': True}]
                },
                {
                    'exercise_id': chest_stretch_id,
                    'phase': 'cooldown',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res4.status_code, 201)
        det4 = self.client.get(f'/workout_sessions/{sess4_uuid}').get_json()
        self.assertEqual(det4['snapshot']['warmup_status'], 'completed')
        self.assertEqual(det4['snapshot']['cooldown_status'], 'completed')
        self.assertEqual(len(det4['logs']), 3)

        # Combo 5: Skipped Warmup + Skipped Cooldown (main only logged)
        sess5_uuid = str(uuid.uuid4())
        res5 = self.client.post('/workout_sessions', json={
            'id': sess5_uuid,
            'routine': 'Skipped Prep and Recovery Routine',
            'started_at': '2026-08-27T12:00:00Z',
            'completed_at': '2026-08-27T12:25:00Z',
            'duration_sec': 1500,
            'warmup_status': 'skipped',
            'cooldown_status': 'skipped',
            'exercises': [
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [{'set_num': 1, 'target_val': 10, 'actual_val': 10, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res5.status_code, 201)
        det5 = self.client.get(f'/workout_sessions/{sess5_uuid}').get_json()
        self.assertEqual(det5['snapshot']['warmup_status'], 'skipped')
        self.assertEqual(det5['snapshot']['cooldown_status'], 'skipped')

    def test_warmup_and_cooldown_do_not_count_as_strength_volume_in_analytics(self):
        """Test Requirement 5: Warm-up and cool-down mobility/stretch logs do NOT count as strength sets in week_sets or activity volume."""
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        today_str = datetime.now(timezone.utc).date().isoformat()

        # Log 2 warmup sets (wrist circles)
        self.client.post('/logs', json={
            'exercise_id': wrist_id,
            'timestamp': f'{today_str}T08:00:00Z',
            'duration_sec': 30,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'warmup'
        })
        self.client.post('/logs', json={
            'exercise_id': wrist_id,
            'timestamp': f'{today_str}T08:02:00Z',
            'duration_sec': 30,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'warmup'
        })

        # Log 3 main strength sets (diamond push-ups)
        for i in range(3):
            self.client.post('/logs', json={
                'exercise_id': pushup_id,
                'timestamp': f'{today_str}T08:10:0{i}Z',
                'reps': 10,
                'weight_kg': None,
                'rpe': 7,
                'client_uuid': str(uuid.uuid4()),
                'phase': 'main'
            })

        # Log 2 cooldown stretch sets (chest stretch)
        self.client.post('/logs', json={
            'exercise_id': chest_stretch_id,
            'timestamp': f'{today_str}T08:30:00Z',
            'duration_sec': 30,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'cooldown'
        })
        self.client.post('/logs', json={
            'exercise_id': chest_stretch_id,
            'timestamp': f'{today_str}T08:32:00Z',
            'duration_sec': 30,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'cooldown'
        })

        # Verify Dashboard Summary week_sets only counts the 3 main sets (not 7)
        res_summary = self.client.get('/dashboard/summary')
        self.assertEqual(res_summary.status_code, 200)
        data_summary = res_summary.get_json()
        self.assertEqual(data_summary['week_sets'], 3)

        # Verify Dashboard Activity Heatmap counts 3 sets and 30 reps (excluding warmup and cooldown)
        res_act = self.client.get('/dashboard/activity')
        self.assertEqual(res_act.status_code, 200)
        data_act = res_act.get_json()
        today_act = next((a for a in data_act if a['date'] == today_str), None)
        self.assertIsNotNone(today_act)
        self.assertEqual(today_act['total_sets'], 3)
        self.assertEqual(today_act['total_reps'], 30)

    def test_cooldown_and_warmup_do_not_affect_personal_records_detection(self):
        """Test Requirement 5 & 7: Stretches and warm-up movements do NOT pollute or trigger strength Personal Records (PRs)."""
        with get_db() as conn:
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            lat_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Lat Stretch'").fetchone()['id']

        today_str = datetime.now(timezone.utc).date().isoformat()

        # Log high hold duration as cool-down stretch
        self.client.post('/logs', json={
            'exercise_id': lat_stretch_id,
            'timestamp': f'{today_str}T10:00:00Z',
            'duration_sec': 90,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'cooldown'
        })

        # Log main strength set for Diamond Push-ups
        self.client.post('/logs', json={
            'exercise_id': pushup_id,
            'timestamp': f'{today_str}T10:15:00Z',
            'reps': 15,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'main'
        })

        # Query PRs
        res_prs = self.client.get('/dashboard/records')
        self.assertEqual(res_prs.status_code, 200)
        prs = res_prs.get_json()

        # Pushups should have PR of 15 reps
        pushup_pr = next((p for p in prs if p['exercise_id'] == pushup_id), None)
        self.assertIsNotNone(pushup_pr)
        self.assertEqual(pushup_pr['max_reps'], 15)

        # Lat Stretch done as cool-down should NOT be listed in strength PRs
        lat_pr = next((p for p in prs if p['exercise_id'] == lat_stretch_id), None)
        self.assertIsNone(lat_pr)

    def test_progression_readiness_scoring_unpolluted_by_warmup_and_cooldown(self):
        """Test Requirement 5 & 7: Warm-up or Cool-down executions of a movement do NOT count towards progression readiness targets."""
        with get_db() as conn:
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            # Configure progression target on diamond pushups: 10 reps, 2 sessions needed
            conn.execute("UPDATE exercises SET progression_target_reps = 10, progression_sessions_needed = 2 WHERE id = ?", (pushup_id,))
            conn.commit()

        # Athlete logs 20 reps of Diamond Pushups as a warm-up prep movement
        self.client.post('/logs', json={
            'exercise_id': pushup_id,
            'timestamp': '2026-08-27T08:00:00Z',
            'reps': 20,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'warmup'
        })

        # Check progression readiness: should remain 0% because warmup sets are ignored
        res_prog = self.client.get(f'/exercises/{pushup_id}/progression-status')
        self.assertEqual(res_prog.status_code, 200)
        prog_data = res_prog.get_json()
        self.assertEqual(prog_data['readiness_pct'], 0)
        self.assertEqual(prog_data['criteria']['sessions_completed'], 0)

        # Now log a main strength set hitting target
        self.client.post('/logs', json={
            'exercise_id': pushup_id,
            'timestamp': '2026-08-27T08:15:00Z',
            'reps': 12,
            'rpe': 7,
            'client_uuid': str(uuid.uuid4()),
            'phase': 'main'
        })

        res_prog2 = self.client.get(f'/exercises/{pushup_id}/progression-status')
        self.assertEqual(res_prog2.status_code, 200)
        prog_data2 = res_prog2.get_json()
        self.assertEqual(prog_data2['criteria']['sessions_completed'], 1)
        self.assertGreater(prog_data2['readiness_pct'], 0)

    def test_history_session_preserves_tri_phase_durations_and_is_immutable_to_template_changes(self):
        """Test Requirement 1, 2, 3, 4:
        1. Completed session preserves total, prep, training, and recovery durations.
        2. Preserves warmup and cooldown statuses.
        3. Editing the workout template does NOT alter the historical session data.
        """
        with get_db() as conn:
            wrist_id = conn.execute("SELECT id FROM exercises WHERE name = 'Wrist Circles'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']
            chest_stretch_id = conn.execute("SELECT id FROM exercises WHERE name = 'Chest Stretch'").fetchone()['id']

        # 1. Create Workout template
        res_workout = self.client.post('/workouts', json={
            'name': 'Original Upper Body Template',
            'exercises': [
                {'exercise_id': wrist_id, 'phase': 'warmup', 'order_index': 1, 'duration_sec': 30},
                {'exercise_id': pushup_id, 'phase': 'main', 'order_index': 2, 'sets': 3, 'reps': 10},
                {'exercise_id': chest_stretch_id, 'phase': 'cooldown', 'order_index': 3, 'duration_sec': 30}
            ]
        })
        self.assertEqual(res_workout.status_code, 201)
        w_id = res_workout.get_json()['id']

        # 2. Record Completed Workout Session
        sess_uuid = str(uuid.uuid4())
        res_sess = self.client.post('/workout_sessions', json={
            'id': sess_uuid,
            'workout_id': w_id,
            'routine': 'Original Upper Body Template',
            'started_at': '2026-08-27T07:00:00Z',
            'completed_at': '2026-08-27T07:52:00Z',
            'duration_sec': 3120,          # Total: 52 min
            'warmup_duration_sec': 480,    # Prep: 8 min
            'main_duration_sec': 2280,     # Training: 38 min
            'cooldown_duration_sec': 360,  # Recovery: 6 min
            'warmup_status': 'completed',
            'cooldown_status': 'completed',
            'exercises': [
                {
                    'exercise_id': wrist_id,
                    'phase': 'warmup',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                },
                {
                    'exercise_id': pushup_id,
                    'phase': 'main',
                    'exercise_type': 'reps',
                    'sets': [
                        {'set_num': 1, 'target_val': 10, 'actual_val': 10, 'completed': True, 'rpe': 7},
                        {'set_num': 2, 'target_val': 10, 'actual_val': 10, 'completed': True, 'rpe': 8},
                        {'set_num': 3, 'target_val': 10, 'actual_val': 10, 'completed': True, 'rpe': 8}
                    ]
                },
                {
                    'exercise_id': chest_stretch_id,
                    'phase': 'cooldown',
                    'exercise_type': 'duration',
                    'sets': [{'set_num': 1, 'target_val': 30, 'actual_val': 30, 'completed': True}]
                }
            ]
        })
        self.assertEqual(res_sess.status_code, 201)

        # Verify session list returns exact tri-phase durations
        res_list = self.client.get('/workout_sessions')
        self.assertEqual(res_list.status_code, 200)
        sessions = res_list.get_json()
        target_s = next((s for s in sessions if s['session_uuid'] == sess_uuid), None)
        self.assertIsNotNone(target_s)
        self.assertEqual(target_s['duration_sec'], 3120)
        self.assertEqual(target_s['warmup_duration_sec'], 480)
        self.assertEqual(target_s['main_duration_sec'], 2280)
        self.assertEqual(target_s['cooldown_duration_sec'], 360)
        self.assertEqual(target_s['warmup_status'], 'completed')
        self.assertEqual(target_s['cooldown_status'], 'completed')

        # Verify session detail view returns exact breakdown
        res_detail = self.client.get(f'/workout_sessions/{sess_uuid}')
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.get_json()
        self.assertEqual(detail['duration_sec'], 3120)
        self.assertEqual(detail['warmup_duration_sec'], 480)
        self.assertEqual(detail['main_duration_sec'], 2280)
        self.assertEqual(detail['cooldown_duration_sec'], 360)
        self.assertEqual(detail['warmup_status'], 'completed')
        self.assertEqual(detail['cooldown_status'], 'completed')
        self.assertEqual(len(detail['logs']), 5)

        # 3. Now modify the template radically (change name, delete warm-up, double reps)
        res_edit = self.client.put(f'/workouts/{w_id}', json={
            'name': 'Radically Modified Template',
            'exercises': [
                {'exercise_id': pushup_id, 'phase': 'main', 'order_index': 1, 'sets': 5, 'reps': 25}
            ]
        })
        self.assertEqual(res_edit.status_code, 200)

        # 4. Verify historical session is 100% IMMUTABLE
        res_detail_after = self.client.get(f'/workout_sessions/{sess_uuid}')
        self.assertEqual(res_detail_after.status_code, 200)
        detail_after = res_detail_after.get_json()
        self.assertEqual(detail_after['routine_name'], 'Original Upper Body Template')
        self.assertEqual(detail_after['duration_sec'], 3120)
        self.assertEqual(detail_after['warmup_duration_sec'], 480)
        self.assertEqual(detail_after['main_duration_sec'], 2280)
        self.assertEqual(detail_after['cooldown_duration_sec'], 360)
        self.assertEqual(detail_after['warmup_status'], 'completed')
        self.assertEqual(detail_after['cooldown_status'], 'completed')
        self.assertEqual(len(detail_after['logs']), 5)

    def test_legacy_history_records_backward_compatibility(self):
        """Test Requirement 4: Legacy workout session rows without phase duration columns remain fully valid."""
        sess_uuid = str(uuid.uuid4())
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO workout_sessions
                    (session_uuid, routine_name, level, started_at, completed_at, duration_sec, total_sets, completed_sets, status, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    sess_uuid,
                    'Legacy 2025 Routine',
                    1,
                    '2026-08-20T08:00:00Z',
                    '2026-08-20T08:45:00Z',
                    2700,
                    12,
                    12,
                    'completed',
                    '{"id":"' + sess_uuid + '","routine":"Legacy 2025 Routine"}'
                )
            )
            conn.commit()

        # GET /workout_sessions should handle legacy rows seamlessly
        res = self.client.get('/workout_sessions')
        self.assertEqual(res.status_code, 200)
        sessions = res.get_json()
        leg = next((s for s in sessions if s['session_uuid'] == sess_uuid), None)
        self.assertIsNotNone(leg)
        self.assertEqual(leg['duration_sec'], 2700)
        self.assertEqual(leg['main_duration_sec'], 2700)
        self.assertEqual(leg['warmup_duration_sec'], 0)
        self.assertEqual(leg['cooldown_duration_sec'], 0)
        self.assertEqual(leg['warmup_status'], 'none')
        self.assertEqual(leg['cooldown_status'], 'none')

        # GET /workout_sessions/<uuid>
        res_det = self.client.get(f'/workout_sessions/{sess_uuid}')
        self.assertEqual(res_det.status_code, 200)
        leg_det = res_det.get_json()
        self.assertEqual(leg_det['duration_sec'], 2700)
        self.assertEqual(leg_det['main_duration_sec'], 2700)
        self.assertEqual(leg_det['warmup_duration_sec'], 0)
        self.assertEqual(leg_det['cooldown_duration_sec'], 0)

    def test_get_all_eight_warmup_and_cooldown_intent_templates(self):
        """Test that GET /workouts/templates returns all 8 intelligent intent categories for warm-up and cool-down."""
        res = self.client.get('/workouts/templates')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertIn('warmups', data)
        self.assertIn('cooldowns', data)
        self.assertEqual(len(data['warmups']), 8)
        self.assertEqual(len(data['cooldowns']), 8)

        expected_warmup_categories = [
            'full_body', 'push', 'pull', 'legs',
            'handstand', 'planche', 'front_lever', 'mobility'
        ]
        warmup_cats = [w.get('category') for w in data['warmups']]
        for cat in expected_warmup_categories:
            self.assertIn(cat, warmup_cats)

        expected_cooldown_categories = [
            'full_body', 'push', 'pull', 'legs',
            'handstand', 'planche', 'front_lever', 'mobility'
        ]
        cooldown_cats = [c.get('category') for c in data['cooldowns']]
        for cat in expected_cooldown_categories:
            self.assertIn(cat, cooldown_cats)

        # Verify all template exercises resolve to valid exercise_id
        for w in data['warmups']:
            self.assertGreaterEqual(len(w['exercises']), 3)
            self.assertLessEqual(len(w['exercises']), 5)
            for ex in w['exercises']:
                self.assertIsNotNone(ex.get('exercise_id'), f"Missing exercise_id for {ex['name']} in warmup {w['id']}")

        for c in data['cooldowns']:
            self.assertGreaterEqual(len(c['exercises']), 3)
            self.assertLessEqual(len(c['exercises']), 5)
            for ex in c['exercises']:
                self.assertIsNotNone(ex.get('exercise_id'), f"Missing exercise_id for {ex['name']} in cooldown {c['id']}")

    def test_create_workout_from_push_intent_template_and_customize(self):
        """Test creating a workout using Push intent templates, customizing sets/reps/notes, and saving."""
        res_tpls = self.client.get('/workouts/templates')
        self.assertEqual(res_tpls.status_code, 200)
        tpls = res_tpls.get_json()

        push_warmup = next(w for w in tpls['warmups'] if w['category'] == 'push')
        push_cooldown = next(c for c in tpls['cooldowns'] if c['category'] == 'push')

        with get_db() as conn:
            dips_id = conn.execute("SELECT id FROM exercises WHERE name = 'Triceps Dips'").fetchone()['id']
            pushup_id = conn.execute("SELECT id FROM exercises WHERE name = 'Diamond Push-ups'").fetchone()['id']

        # Customize warm-up items
        custom_warmup = []
        for idx, ex in enumerate(push_warmup['exercises']):
            ex_copy = dict(ex)
            ex_copy['order_index'] = idx + 1
            if ex_copy['name'] == 'Wrist Circles':
                ex_copy['duration_sec'] = 45  # Customized duration
                ex_copy['notes'] = 'Extra wrist attention for heavy pressing'
            custom_warmup.append(ex_copy)

        # Main strength exercises
        main_exs = [
            {'exercise_id': dips_id, 'phase': 'main', 'order_index': 1, 'sets': 4, 'reps': 12, 'notes': 'Deep chest dip'},
            {'exercise_id': pushup_id, 'phase': 'main', 'order_index': 2, 'sets': 3, 'reps': 15, 'notes': 'Full lockout'}
        ]

        # Customize cool-down items
        custom_cooldown = []
        for idx, ex in enumerate(push_cooldown['exercises']):
            ex_copy = dict(ex)
            ex_copy['order_index'] = idx + 1
            if ex_copy['name'] == 'Chest Stretch':
                ex_copy['duration_sec'] = 40  # Customized stretch time
            custom_cooldown.append(ex_copy)

        # Create workout with sectional keys
        res_create = self.client.post('/workouts', json={
            'name': 'Customized Push Power Day',
            'description': 'Intelligent Push template with custom wrist prep and chest stretches',
            'warm_up': custom_warmup,
            'main': main_exs,
            'cool_down': custom_cooldown
        })
        self.assertEqual(res_create.status_code, 201)
        w_id = res_create.get_json()['id']

        # Fetch created workout and verify customizations
        res_get = self.client.get(f'/workouts/{w_id}')
        self.assertEqual(res_get.status_code, 200)
        workout_data = res_get.get_json()

        self.assertEqual(len(workout_data['warm_up']), len(push_warmup['exercises']))
        self.assertEqual(len(workout_data['main']), 2)
        self.assertEqual(len(workout_data['cool_down']), len(push_cooldown['exercises']))

        # Check customized wrist circle
        wrist_ex = next(w for w in workout_data['warm_up'] if w['exercise_name'] == 'Wrist Circles')
        self.assertEqual(wrist_ex['duration_sec'], 45)
        self.assertEqual(wrist_ex['notes'], 'Extra wrist attention for heavy pressing')

        # Check customized chest stretch
        chest_ex = next(c for c in workout_data['cool_down'] if c['exercise_name'] == 'Chest Stretch')
        self.assertEqual(chest_ex['duration_sec'], 40)

    def test_create_workout_from_handstand_planche_front_lever_skill_templates(self):
        """Test skill templates: Handstand, Planche, and Front Lever contain specific movement sequences."""
        res_tpls = self.client.get('/workouts/templates')
        self.assertEqual(res_tpls.status_code, 200)
        tpls = res_tpls.get_json()

        hs_w = next(w for w in tpls['warmups'] if w['category'] == 'handstand')
        hs_names = [e['name'] for e in hs_w['exercises']]
        self.assertIn('Wrist Preparation', hs_names)
        self.assertIn('Wrist Rocks', hs_names)
        self.assertIn('Shoulder Mobility', hs_names)
        self.assertIn('Scapular Elevation', hs_names)
        self.assertIn('Wall-Facing Handstand Prep', hs_names)

        pl_w = next(w for w in tpls['warmups'] if w['category'] == 'planche')
        pl_names = [e['name'] for e in pl_w['exercises']]
        self.assertIn('Wrist Preparation', pl_names)
        self.assertIn('Shoulder Activation', pl_names)
        self.assertIn('Scapular Protraction', pl_names)
        self.assertIn('Planche Lean Prep', pl_names)

        fl_w = next(w for w in tpls['warmups'] if w['category'] == 'front_lever')
        fl_names = [e['name'] for e in fl_w['exercises']]
        self.assertIn('Shoulder Activation', fl_names)
        self.assertIn('Scapular Pulls', fl_names)
        self.assertIn('Dead Hang', fl_names)
        self.assertIn('Hollow Body Activation', fl_names)

    def test_template_customization_and_removal_of_slots(self):
        """Test user autonomy: Loading a template, removing an exercise, reordering, and updating."""
        res_tpls = self.client.get('/workouts/templates')
        leg_warmup = next(w for w in res_tpls.get_json()['warmups'] if w['category'] == 'legs')

        with get_db() as conn:
            squat_id = conn.execute("SELECT id FROM exercises WHERE name = 'Pistol Squat Progression'").fetchone()['id']

        # User chooses to keep only 2 warmup movements (removes walking lunges and ankle circles)
        selected_warmup = [
            {'exercise_id': leg_warmup['exercises'][1]['exercise_id'], 'phase': 'warmup', 'order_index': 1, 'duration_sec': 30}, # Leg Swings
            {'exercise_id': leg_warmup['exercises'][2]['exercise_id'], 'phase': 'warmup', 'order_index': 2, 'duration_sec': 40}  # Deep Squat Hold
        ]

        res_create = self.client.post('/workouts', json={
            'name': 'Customized Legs Minimal Prep',
            'warm_up': selected_warmup,
            'main': [{'exercise_id': squat_id, 'phase': 'main', 'order_index': 1, 'sets': 3, 'reps': 8}],
            'cool_down': []
        })
        self.assertEqual(res_create.status_code, 201)
        w_id = res_create.get_json()['id']

        # Verify only 2 warm-up items were saved and 0 cool-down items
        w_data = self.client.get(f'/workouts/{w_id}').get_json()
        self.assertEqual(len(w_data['warm_up']), 2)
        self.assertEqual(len(w_data['cool_down']), 0)
        self.assertEqual(w_data['warm_up'][0]['exercise_name'], 'Leg Swings')
        self.assertEqual(w_data['warm_up'][1]['exercise_name'], 'Deep Squat Hold')
        self.assertEqual(w_data['warm_up'][1]['duration_sec'], 40)

    def test_backup_export_and_restore_with_multiphase_sessions(self):
        """Test that /export and /import cleanly preserve tri-phase durations, statuses, and log phases."""
        sess_uuid = str(uuid.uuid4())
        client_uuid1 = str(uuid.uuid4())
        client_uuid2 = str(uuid.uuid4())
        client_uuid3 = str(uuid.uuid4())

        with get_db() as conn:
            conn.execute('''
                INSERT INTO workout_sessions
                    (session_uuid, routine_name, level, started_at, completed_at, duration_sec,
                     warmup_duration_sec, main_duration_sec, cooldown_duration_sec,
                     warmup_status, cooldown_status, total_sets, completed_sets, status)
                VALUES (?, 'Push Power Pro', 1, '2026-08-25T10:00:00Z', '2026-08-25T10:50:00Z', 3000,
                        300, 2400, 300, 'completed', 'completed', 5, 5, 'completed')
            ''', (sess_uuid,))
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, duration_sec, client_uuid, session_uuid, phase)
                VALUES (1, '2026-08-25T10:02:00Z', 30, ?, ?, 'warmup')
            ''', (client_uuid1, sess_uuid))
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, reps, client_uuid, session_uuid, phase)
                VALUES (2, '2026-08-25T10:20:00Z', 12, ?, ?, 'main')
            ''', (client_uuid2, sess_uuid))
            conn.execute('''
                INSERT INTO logs (exercise_id, timestamp, duration_sec, client_uuid, session_uuid, phase)
                VALUES (3, '2026-08-25T10:46:00Z', 30, ?, ?, 'cooldown')
            ''', (client_uuid3, sess_uuid))
            conn.commit()

        # 1. Export
        res_exp = self.client.get('/export')
        self.assertEqual(res_exp.status_code, 200)
        export_data = res_exp.get_json()

        # 2. Clear tables
        with get_db() as conn:
            conn.execute('DELETE FROM logs WHERE session_uuid = ?', (sess_uuid,))
            conn.execute('DELETE FROM workout_sessions WHERE session_uuid = ?', (sess_uuid,))
            conn.commit()

        # 3. Import
        res_imp = self.client.post('/import', json=export_data)
        self.assertEqual(res_imp.status_code, 200)

        # 4. Verify restored session
        with get_db() as conn:
            restored_sess = conn.execute(
                'SELECT * FROM workout_sessions WHERE session_uuid = ?',
                (sess_uuid,)
            ).fetchone()
            self.assertIsNotNone(restored_sess)
            self.assertEqual(restored_sess['duration_sec'], 3000)
            self.assertEqual(restored_sess['warmup_duration_sec'], 300)
            self.assertEqual(restored_sess['main_duration_sec'], 2400)
            self.assertEqual(restored_sess['cooldown_duration_sec'], 300)
            self.assertEqual(restored_sess['warmup_status'], 'completed')
            self.assertEqual(restored_sess['cooldown_status'], 'completed')

            # Verify restored logs phase
            l_warm = conn.execute('SELECT * FROM logs WHERE client_uuid = ?', (client_uuid1,)).fetchone()
            self.assertEqual(l_warm['phase'], 'warmup')
            l_main = conn.execute('SELECT * FROM logs WHERE client_uuid = ?', (client_uuid2,)).fetchone()
            self.assertEqual(l_main['phase'], 'main')
            l_cool = conn.execute('SELECT * FROM logs WHERE client_uuid = ?', (client_uuid3,)).fetchone()
            self.assertEqual(l_cool['phase'], 'cooldown')

    def test_today_resolver_with_and_without_phases(self):
        """Test /today resolver returns structured sectional arrays for multiphase and legacy workouts."""
        # 1. Test workout with warmup and cooldown
        with get_db() as conn:
            w_id = conn.execute("INSERT INTO workouts (name, description) VALUES ('Today Test Workout', 'Desc')").lastrowid
            ex1 = conn.execute("SELECT id FROM exercises LIMIT 1").fetchone()['id']
            conn.execute('''
                INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, reps, phase)
                VALUES (?, ?, 1, 1, 10, 'warmup')
            ''', (w_id, ex1))
            conn.execute('''
                INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, reps, phase)
                VALUES (?, ?, 2, 3, 10, 'main')
            ''', (w_id, ex1))
            conn.execute('''
                INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets, reps, phase)
                VALUES (?, ?, 3, 1, 10, 'cooldown')
            ''', (w_id, ex1))

            split_id = conn.execute("SELECT id FROM training_splits WHERE is_active = 1 LIMIT 1").fetchone()['id']
            now_dow = datetime.now().weekday()
            conn.execute('''
                INSERT INTO weekly_schedules (split_id, day_of_week, day_type, workout_id)
                VALUES (?, ?, 'workout', ?)
                ON CONFLICT(split_id, day_of_week) DO UPDATE SET day_type = 'workout', workout_id = excluded.workout_id
            ''', (split_id, now_dow, w_id))
            conn.commit()

        res = self.client.get('/today')
        self.assertEqual(res.status_code, 200)
        today_data = res.get_json()
        self.assertEqual(today_data['status'], 'workout')
        self.assertIn('workout', today_data)
        w_obj = today_data['workout']
        self.assertEqual(len(w_obj['warmup']), 1)
        self.assertEqual(len(w_obj['main']), 1)
        self.assertEqual(len(w_obj['cooldown']), 1)
        self.assertEqual(w_obj['total_sets'], 5)
        self.assertEqual(w_obj['main_sets'], 3)


if __name__ == '__main__':
    unittest.main()

