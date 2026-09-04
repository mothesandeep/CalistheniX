"""
CalistheniX — Backward Compatibility Shim for backend.app

Preserves legacy imports for test suites and scripts:
  - from backend.app import create_app, app, init_db, reseed_data, ...
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import (
    create_app,
    app,
    init_db,
    reseed_data,
    Config,
    TestConfig,
    get_db,
    get_db_connection,
    DB_PATH,
    SEED,
    SEED_VERSION,
    EXERCISE_MOVEMENT_PATTERNS,
)
from backend.app.data.seed_data import (
    WARMUP_COOLDOWN_EXERCISES,
    DEFAULT_WORKOUT_PHASES,
)

_SEED_VERSION = SEED_VERSION
_SEED = SEED

if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=Config.PORT)
