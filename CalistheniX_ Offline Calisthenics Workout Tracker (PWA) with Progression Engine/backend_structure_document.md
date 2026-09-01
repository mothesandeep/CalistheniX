# CalistheniX Backend Structure Document

## 1. Backend Architecture

**Overall Design**
- We use Python’s Flask framework to expose simple, well-organized HTTP endpoints (APIs).  
- Code is organized with Flask Blueprints (separate modules for workouts, sessions, splits, etc.) to keep related routes and logic together.  
- We follow a basic layered pattern:
  - **Routes/Controllers** handle incoming requests and return JSON responses.  
  - **Services** contain business logic (e.g., calculating readiness scores, applying promotion rules).  
  - **Data Access Layer** interacts with the SQLite database through SQL queries or a lightweight ORM.

**Scalability & Maintainability**
- Modular Blueprints let us add new features without cluttering existing code.  
- Custom migration scripts evolve the database schema in small, reversible steps.  
- Flask-CORS keeps frontend and backend decoupled—easy to host separately and scale each tier independently.

**Performance**
- SQLite is configured in Write-Ahead Logging (WAL) mode for faster writes and built-in crash recovery.  
- API endpoints return only the JSON needed by the PWA, minimizing payload size.  
- Read-heavy queries (analytics, history) use proper indexing on timestamp and foreign keys.

---

## 2. Database Management

**Technology & Type**
- SQLite3 (file-based SQL database) chosen for its simplicity and offline-first capabilities.  
- Configured with PRAGMA settings:  
  - `journal_mode = WAL` for concurrent reads/writes and crash resistance.  
  - `synchronous = NORMAL` for a balance between speed and durability.

**Data Organization & Access**
- Data is stored in well-named tables representing exercises, workouts, splits, sessions, and settings.  
- Relationships are maintained via foreign keys (e.g., each session row points to a workout template).  
- We use parameterized SQL to prevent injection and keep queries fast.

**Management Practices**
- A `migrations` folder holds simple Python scripts that alter tables and backfill data safely.  
- On startup, the app checks the current schema version and applies any pending migrations before handling requests.  
- Backups: The PWA can request a full JSON export of all tables; restores are idempotent and validate schema compatibility.

---

## 3. Database Schema

**Human-Readable Overview**
- **exercise_library**: Stores every possible exercise with metadata (muscle group, progression links).  
- **workout_templates**: Named workout blueprints.  
- **template_phases**: Phases (Warm-up, Main, Cool-down) tied to each template.  
- **phase_exercises**: Linking table with order, target sets/reps, hold durations, tempo codes.  
- **training_splits**: User-named split plans (e.g., Push/Pull/Legs).  
- **split_schedule**: Assigns a template to each day of the week (Monday = 1…Sunday = 7).  
- **sessions**: Completed workout sessions with start/end timestamps.  
- **session_sets**: One row per set performed, capturing actual reps, duration, weight, RPE, PR flag.  
- **personal_records**: Tracks all‐time bests per exercise for quick lookup.  
- **settings**: Key/value pairs for user preferences (audio/haptic, theme, notifications).

**SQL Schema (SQLite/PostgreSQL)**
```sql
-- Exercise Library
CREATE TABLE exercise_library (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  muscle_group   TEXT,
  movement_pattern TEXT,
  progression_to INTEGER REFERENCES exercise_library(id),
  metadata       JSON,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Templates & Phases
CREATE TABLE workout_templates (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE template_phases (
  id           INTEGER PRIMARY KEY,
  template_id  INTEGER NOT NULL REFERENCES workout_templates(id),
  phase_order  INTEGER NOT NULL,                 -- 1=Warm-up,2=Main,3=Cool-down
  name         TEXT NOT NULL
);
CREATE TABLE phase_exercises (
  id                  INTEGER PRIMARY KEY,
  phase_id            INTEGER NOT NULL REFERENCES template_phases(id),
  exercise_id         INTEGER NOT NULL REFERENCES exercise_library(id),
  position            INTEGER NOT NULL,
  target_sets         INTEGER,
  target_reps         INTEGER,
  hold_duration_sec   INTEGER,
  tempo_code          TEXT,
  is_superset_group   BOOLEAN DEFAULT FALSE
);

-- Training Splits & Schedule
CREATE TABLE training_splits (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE split_schedule (
  id            INTEGER PRIMARY KEY,
  split_id      INTEGER NOT NULL REFERENCES training_splits(id),
  day_of_week   INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
  template_id   INTEGER NOT NULL REFERENCES workout_templates(id)
);

-- Workout Sessions & Sets
CREATE TABLE sessions (
  id                   INTEGER PRIMARY KEY,
  template_id          INTEGER NOT NULL REFERENCES workout_templates(id),
  start_time           DATETIME NOT NULL,
  end_time             DATETIME,
  summary_json         JSON,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE session_sets (
  id                   INTEGER PRIMARY KEY,
  session_id           INTEGER NOT NULL REFERENCES sessions(id),
  exercise_id          INTEGER NOT NULL REFERENCES exercise_library(id),
  phase_name           TEXT NOT NULL,
  set_number           INTEGER NOT NULL,
  actual_reps          INTEGER,
  actual_duration_sec  INTEGER,
  weight               REAL,
  rpe                  INTEGER,
  is_personal_record   BOOLEAN DEFAULT FALSE,
  tempo_code           TEXT,
  hold_duration_sec    INTEGER
);

-- Personal Records
CREATE TABLE personal_records (
  id             INTEGER PRIMARY KEY,
  exercise_id    INTEGER NOT NULL REFERENCES exercise_library(id),
  record_type    TEXT NOT NULL,    -- e.g., "max_reps", "longest_hold"
  record_value   REAL NOT NULL,
  achieved_at    DATETIME NOT NULL,
  session_set_id INTEGER REFERENCES session_sets(id)
);

-- User Settings
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value JSON
);
```

---

## 4. API Design and Endpoints

We use a RESTful approach. Every endpoint deals in JSON and maps directly to CRUD operations on the tables above.

**Key Endpoints**
- `GET /api/exercises`  
  List all exercises in the library.  
- `POST /api/exercises`  
  Add or customize a movement.  

- `GET /api/workouts`  
  List workout templates.  
- `POST /api/workouts`  
  Create a new workout template.  
- `PUT /api/workouts/:id`  
  Update a template’s name or phases.  
- `DELETE /api/workouts/:id`  
  Remove a template.

- `GET /api/splits` / `POST` / `PUT` / `DELETE`  
  Manage named split plans and day assignments.

- `GET /api/sessions`  
  Retrieve past session summaries.  
- `POST /api/sessions`  
  Start a new session (records `start_time`).  
- `PUT /api/sessions/:id`  
  Add end time and summary JSON.  

- `POST /api/sessions/:id/sets`  
  Log a completed set.  
- `GET /api/sessions/:id/sets`  
  Fetch all sets for a session.

- `GET /api/records`  
  Fetch personal records across exercises.

- `GET /api/settings` / `PUT /api/settings`  
  Retrieve or update user preferences.

- `POST /api/backup`  
  Export full JSON dump of all tables.  
- `POST /api/restore`  
  Import a JSON dump (idempotent).

These endpoints let the front end plan workouts, run live sessions, track progress, and manage data without ever leaving the PWA.

---

## 5. Hosting Solutions

**Environment**
- We recommend deploying the Flask backend behind a WSGI server like Gunicorn, with Nginx as a reverse proxy for SSL termination and static-file serving.  
- Common cloud options:
  - **AWS EC2** (self-managed virtual machines)  
  - **DigitalOcean App Platform** or **Droplets**  
  - **Heroku** (simple Git-push deployments)  
  - **Docker** container on any Linux host

**Benefits**
- **Reliability**: Nginx + Gunicorn handles multiple worker processes gracefully and restarts them on failure.  
- **Scalability**: You can spin up more instances behind a load balancer as usage grows.  
- **Cost-Effectiveness**: SQLite keeps costs low—no need for managed database instances unless you choose to migrate to PostgreSQL later.  
- **Offline Support**: Static assets (the PWA shell) can be served from a CDN (e.g., AWS CloudFront) while the API runs on a small instance.

---

## 6. Infrastructure Components

- **Load Balancer** (optional) spreads API traffic across multiple Flask instances for high availability.  
- **CDN** (e.g., CloudFront, Netlify) serves JavaScript, CSS, images, and the service worker script for lightning-fast global delivery.  
- **Caching Layer**: Though dynamic data is stored locally by the PWA, Nginx can cache common API GET responses (e.g., `/api/exercises`) to reduce backend load.  
- **Docker** (optional) encapsulates the app, ensuring consistent environments across local, staging, and production.  
- **Backup Storage**: Nightly snapshots of the SQLite file (or JSON exports) stored in S3 or similar for disaster recovery.  

All these pieces work together to deliver low-latency responses, high uptime, and a smooth offline-first experience.

---

## 7. Security Measures

- **HTTPS Everywhere**: SSL/TLS is mandatory so service workers and vibration APIs work properly.  
- **CORS**: Flask-CORS is configured to allow only the PWA’s origin, preventing unauthorized domains from calling the API.  
- **Input Sanitization**: All text fields (exercise names, custom templates) are cleaned on the backend to prevent injection attacks.  
- **Access Control**: No user accounts or passwords are used in Phase 1, so there’s no session hijacking risk; data is isolated per device.  
- **Data Encryption** (optional): If you host the SQLite file on a shared server, enable filesystem-level encryption or migrate to an encrypted database engine.

---

## 8. Monitoring and Maintenance

- **Logging**: Flask logs requests, errors, and stack traces to a rotating log file or stdout for containerized setups.  
- **Error Tracking**: Integrate Sentry (or similar) for real-time exception alerts.  
- **Performance Metrics**: Use Prometheus + Grafana or AWS CloudWatch to track request rates, error rates, and response latency.  
- **Health Checks**: A simple `/health` endpoint returns 200 OK if the app can read and write to the database.  
- **Database Backups & Migrations**:
  - Automated nightly copies of the SQLite file or JSON exports.  
  - On-start migration runner applies any schema updates before serving traffic.
- **CI/CD**: GitHub Actions run `pytest` for backend routes on every push and automatically deploy to staging or production when tests pass.

---

## 9. Conclusion and Overall Backend Summary

CalistheniX’s backend is a lightweight, offline-first architecture built around Python/Flask and SQLite. It prioritizes:

- **Modularity**: Clear separation of routes, services, and data access for easy maintenance and future growth.  
- **Offline Reliability**: WAL-enabled SQLite and service worker–driven caching ensure no workout data is lost—even if the browser or server restarts mid-session.  
- **Simplicity**: A RESTful API surface that mirrors the database schema makes it easy for the front end to plan workouts, log sessions, and visualize progress.  
- **Scalability & Cost Control**: Deployable on a tiny cloud instance or a larger fleet behind a load balancer, with minimal operational overhead.

With well-defined API endpoints, robust security practices, and a clear migration path, this backend gives CalistheniX a rock-solid foundation for tracking bodyweight training—online or off—without compromise.