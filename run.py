"""
CalistheniX Root Application Runner
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import create_app, Config

app = create_app()

if __name__ == '__main__':
    port = Config.PORT
    debug = Config.DEBUG
    print(f"🚀 Launching CalistheniX Backend on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
