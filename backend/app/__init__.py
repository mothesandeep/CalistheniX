"""
CalistheniX — Flask Application Factory & Core Package

Responsibilities:
  - Create and configure the Flask app instance via create_app()
  - Register all route blueprints (standard paths and /api prefixes)
  - Initialize database schema and idempotent seed data
  - Provide the root status endpoint
"""
import os
import gzip
import io
from flask import Flask, jsonify, request
from flask_cors import CORS

from backend.app.core.config import Config, TestConfig
from backend.app.db.connection import get_db, get_db_connection, DB_PATH
from backend.app.db.schema import init_db
from backend.app.db.seed import reseed_data, ensure_warmup_cooldown_exercises
from backend.app.db.migrations import run_all_migrations
from backend.app.data.movement_patterns import EXERCISE_MOVEMENT_PATTERNS
from backend.app.data.seed_data import (
    SEED,
    SEED_VERSION,
    WARMUP_COOLDOWN_EXERCISES,
    DEFAULT_WORKOUT_PHASES,
)
from backend.app.routes.splits import splits_bp
from backend.app.routes.workouts import workouts_bp
from backend.app.routes.exercises import exercises_bp
from backend.app.routes.sessions import sessions_bp
from backend.app.routes.dashboard import dashboard_bp
from backend.app.routes.backup import backup_bp
from backend.app.routes.legacy import legacy_bp


def create_app(config_class=Config):
    """Application factory — creates and configures the Flask app instance."""
    flask_app = Flask(__name__)
    if isinstance(config_class, type) or hasattr(config_class, '__dict__'):
        flask_app.config.from_object(config_class)
    elif isinstance(config_class, dict):
        flask_app.config.from_mapping(config_class)

    cors_origins = flask_app.config.get('CORS_ORIGINS', '*')
    CORS(flask_app, resources={r"/*": {"origins": cors_origins}})

    # Register Route Blueprints (both standard paths and /api prefixes)
    flask_app.register_blueprint(splits_bp)
    flask_app.register_blueprint(workouts_bp)
    flask_app.register_blueprint(exercises_bp)
    flask_app.register_blueprint(sessions_bp)
    flask_app.register_blueprint(dashboard_bp)
    flask_app.register_blueprint(backup_bp)
    flask_app.register_blueprint(legacy_bp)   # deprecated but still served

    # Register API-prefixed routes for REST client compatibility
    flask_app.register_blueprint(splits_bp, url_prefix='/api', name='api_splits')
    flask_app.register_blueprint(workouts_bp, url_prefix='/api', name='api_workouts')
    flask_app.register_blueprint(exercises_bp, url_prefix='/api', name='api_exercises')
    flask_app.register_blueprint(sessions_bp, url_prefix='/api', name='api_sessions')
    flask_app.register_blueprint(dashboard_bp, url_prefix='/api', name='api_dashboard')
    flask_app.register_blueprint(backup_bp, url_prefix='/api', name='api_backup')
    flask_app.register_blueprint(legacy_bp, url_prefix='/api', name='api_legacy')

    # Root status endpoint
    @flask_app.route('/', methods=['GET'])
    def root_status():
        """Root endpoint showing API status and available endpoints."""
        return jsonify({
            'service': 'CalistheniX REST API',
            'status': 'online',
            'version': '2.0.0',
            'endpoints': {
                'today':              '/today',
                'splits':             '/splits',
                'workouts':           '/workouts',
                'exercises':          '/exercises',
                'workout_sessions':   '/workout_sessions',
                'dashboard_summary':  '/dashboard/summary',
                'dashboard_records':  '/dashboard/records',
                'dashboard_activity': '/dashboard/activity',
                'export':             '/export',
                'frontend_ui':        'http://localhost:8080'
            }
        }), 200

    @flask_app.after_request
    def compress_and_cache_response(response):
        """Enable response caching headers and standard library gzip compression for payload transit optimization."""
        # 1. Cache headers for successful GET requests
        if request.method == 'GET' and response.status_code == 200:
            if 'Cache-Control' not in response.headers:
                response.headers['Cache-Control'] = 'private, no-cache, stale-while-revalidate=60'

        # 2. Transparent gzip compression for payloads >= 500 bytes
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if (
            'gzip' in accept_encoding.lower()
            and 200 <= response.status_code < 300
            and not response.direct_passthrough
            and 'Content-Encoding' not in response.headers
        ):
            data = response.get_data()
            if len(data) >= 500:
                gzip_buffer = io.BytesIO()
                with gzip.GzipFile(mode='wb', fileobj=gzip_buffer, compresslevel=6) as gzip_file:
                    gzip_file.write(data)
                compressed_data = gzip_buffer.getvalue()
                if len(compressed_data) < len(data):
                    response.set_data(compressed_data)
                    response.headers['Content-Encoding'] = 'gzip'
                    response.headers['Content-Length'] = str(len(compressed_data))
                    response.headers['Vary'] = 'Accept-Encoding'

        return response

    return flask_app


# Default application instance
app = create_app()

# Auto-initialize database and seeds on import (safe and idempotent)
init_db()
reseed_data()

__all__ = [
    'create_app',
    'app',
    'init_db',
    'reseed_data',
    'Config',
    'TestConfig',
    'get_db',
    'get_db_connection',
    'DB_PATH',
    'SEED',
    'SEED_VERSION',
    'EXERCISE_MOVEMENT_PATTERNS',
]
