import os

class Config:
    """Base application configuration."""
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DB_PATH = os.environ.get('CALISTHENIX_DB_PATH', os.path.join(BASE_DIR, 'tracker.db'))
    PORT = int(os.environ.get('PORT', 5001))
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    TESTING = False


class TestConfig(Config):
    """Test environment configuration."""
    TESTING = True
    DEBUG = False
