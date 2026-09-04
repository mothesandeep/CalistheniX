"""
Backward compatibility shim for backend.db -> backend.app.db
"""
from backend.app.db.connection import get_db, get_db_connection, DB_PATH

__all__ = ['get_db', 'get_db_connection', 'DB_PATH']
