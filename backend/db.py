import sqlite3
import os
from contextlib import contextmanager

try:
    from backend.config import Config
except ImportError:
    from config import Config

DB_PATH = Config.DB_PATH


def get_db_connection(db_path=None):
    """Create and return a raw SQLite database connection with row factory and FK enabled."""
    target_path = db_path or Config.DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


@contextmanager
def get_db(db_path=None):
    """Context manager for SQLite connections.
    Guarantees conn.close() is called on block exit, normal return, or exception."""
    conn = get_db_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()
