"""
CalistheniX — Performance & Network Transit Test Suite

Verifies:
1. Gzip Compression middleware for large payloads with Accept-Encoding: gzip
2. Cache-Control and Vary: Accept-Encoding headers on GET endpoints
3. POST /logs/batch atomic transaction ingestion and idempotency
"""
import gzip
import json
import pytest
from backend.app import app, init_db, reseed_data, get_db


@pytest.fixture(autouse=True)
def setup_test_database():
    init_db()
    reseed_data()


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_cache_control_headers_on_get(client):
    """GET endpoints should return Cache-Control headers."""
    res = client.get('/exercises')
    assert res.status_code == 200
    assert 'Cache-Control' in res.headers
    assert 'stale-while-revalidate' in res.headers['Cache-Control']


def test_gzip_compression_on_large_payload(client):
    """GET /exercises with Accept-Encoding: gzip should compress if payload >= 500 bytes."""
    res = client.get('/exercises', headers={'Accept-Encoding': 'gzip'})
    assert res.status_code == 200
    if len(res.data) >= 500 or res.headers.get('Content-Encoding') == 'gzip':
        assert res.headers.get('Content-Encoding') == 'gzip'
        assert 'Accept-Encoding' in res.headers.get('Vary', '')
        decompressed = gzip.decompress(res.data)
        data = json.loads(decompressed.decode('utf-8'))
        assert isinstance(data, list)
        assert len(data) > 0


def test_batch_logs_creation(client):
    """POST /logs/batch should atomically insert multiple log items."""
    batch_payload = [
        {
            'exercise_id': 1,
            'timestamp': '2026-09-04T12:00:00Z',
            'reps': 15,
            'weight_kg': 0,
            'rpe': 8,
            'client_uuid': 'batch-uuid-test-001',
            'phase': 'main'
        },
        {
            'exercise_id': 2,
            'timestamp': '2026-09-04T12:05:00Z',
            'duration_sec': 45,
            'weight_kg': 0,
            'rpe': 9,
            'client_uuid': 'batch-uuid-test-002',
            'phase': 'main'
        }
    ]

    res = client.post('/logs/batch', json=batch_payload)
    assert res.status_code == 200
    body = res.get_json()
    assert body.get('saved') == 2
    assert len(body.get('items', [])) == 2

    # Idempotent replay: sending same client_uuids again should succeed without duplicate error
    res_replay = client.post('/logs/batch', json=batch_payload)
    assert res_replay.status_code == 200
    body_replay = res_replay.get_json()
    assert body_replay.get('saved') == 2


def test_batch_logs_with_exercise_name_resolution(client):
    """POST /logs/batch should resolve exercise_name if exercise_id is omitted."""
    batch_payload = {
        'logs': [
            {
                'exercise_name': 'Diamond Push-ups',
                'timestamp': '2026-09-04T12:10:00Z',
                'reps': 20,
                'client_uuid': 'batch-uuid-name-test-001',
                'phase': 'main'
            }
        ]
    }

    res = client.post('/logs/batch', json=batch_payload)
    assert res.status_code == 200
    body = res.get_json()
    assert body.get('saved') == 1
