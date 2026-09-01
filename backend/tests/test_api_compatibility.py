import unittest
import json
import sqlite3
from backend.app import create_app, init_db
from backend.config import Config
from backend.db import get_db

class TestApiCompatibility(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        init_db()

    def test_api_prefixed_endpoints(self):
        """Verify that /api/ prefixed endpoints work equivalently to root endpoints."""
        res = self.client.get('/api/exercises')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIsInstance(data, list)

        res_workouts = self.client.get('/api/workouts')
        self.assertEqual(res_workouts.status_code, 200)

        res_splits = self.client.get('/api/splits')
        self.assertEqual(res_splits.status_code, 200)

        res_records = self.client.get('/api/records')
        self.assertEqual(res_records.status_code, 200)

        res_backup = self.client.get('/api/backup')
        self.assertEqual(res_backup.status_code, 200)

    def test_sqlite_wal_mode(self):
        """Verify that SQLite connection enables WAL journal mode and foreign keys."""
        with get_db() as conn:
            journal_mode = conn.execute('PRAGMA journal_mode').fetchone()[0]
            foreign_keys = conn.execute('PRAGMA foreign_keys').fetchone()[0]
            self.assertEqual(journal_mode.lower(), 'wal')
            self.assertEqual(foreign_keys, 1)

if __name__ == '__main__':
    unittest.main()
