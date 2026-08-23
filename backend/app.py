import sqlite3
from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

DB_PATH = 'tracker.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create exercises table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        day TEXT NOT NULL,
        type TEXT NOT NULL,
        prerequisite_id INTEGER,
        next_id INTEGER,
        FOREIGN KEY(prerequisite_id) REFERENCES exercises(id),
        FOREIGN KEY(next_id) REFERENCES exercises(id)
    )
    ''')
    
    # Create logs table
    # Note: 'synced' is a client-side only property as per architecture.md
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        duration_sec INTEGER,
        rpe INTEGER,
        client_uuid TEXT UNIQUE NOT NULL,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id)
    )
    ''')
    
    # Create progressions table (empty for now)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS progressions (
        id INTEGER PRIMARY KEY AUTOINCREMENT
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB on startup
if not os.path.exists(DB_PATH):
    init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/exercises', methods=['GET'])
def get_exercises():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM exercises')
    rows = cursor.fetchall()
    conn.close()
    
    exercises = [dict(row) for row in rows]
    return jsonify(exercises)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
