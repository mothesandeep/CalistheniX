# CalistheniX Tech Stack Overview

This document explains, in everyday terms, the main technologies used to build CalistheniX. You don’t need a technical background to understand why each tool was chosen and how they work together to deliver a smooth, offline-capable workout experience.

## Frontend Technologies
These are the tools and frameworks that run in your browser and power the user interface:

- **Vanilla JavaScript (ES6+)**  
  No heavy frameworks—just modern JavaScript—to keep the app fast, easy to debug, and lightweight.

- **HTML5 & CSS3 with CSS Variables**  
  Standard web building blocks, using custom variables to support a high-contrast, dark-theme design that’s easy on the eyes in a gym.

- **Chart.js**  
  A simple charting library for rendering trend lines, bar charts, and heatmaps that track your progress over time.

- **SVG Animations & Interactive Muscle Maps**  
  Vector graphics for smooth, scalable exercise demos without impacting performance.

- **Web APIs**  
  • **Service Worker API (Workbox)**: Caches app files and API calls so everything works offline.  
  • **Web Audio API**: Plays chimes and alerts for timers and personal record celebrations.  
  • **Vibration API**: Triggers gentle phone vibrations for workout cues when available.  
  • **LocalStorage & IndexedDB**: Stores workouts, session logs, and user settings right in your browser.

## Backend Technologies
These components run on the server (or locally, if you choose) to manage and store your data:

- **Python 3.10+**  
  A reliable, easy-to-read language that handles the app’s business logic.

- **Flask Framework**  
  A lightweight web server that exposes simple API endpoints (e.g., `/api/workouts`, `/api/sessions`) for the frontend to read and write data.

- **Flask-CORS**  
  Enables safe cross-origin requests if you ever host the frontend and backend on different domains.

- **SQLite3 Database**  
  A single-file database stored locally (or on your server) for true offline-first data storage. Configured in Write-Ahead Logging mode for crash recovery and speed.

- **Custom Migration Scripts**  
  Small Python scripts that update the database structure when new features are added, keeping old data intact.

## Infrastructure and Deployment
How the app is hosted, built, and kept running smoothly:

- **Version Control (Git & GitHub)**  
  All code—frontend and backend—lives in GitHub repositories for tracking changes and collaborating.

- **CI/CD Pipeline (GitHub Actions)**  
  Automated tests (using pytest for Python and lightweight test harnesses or Jest for JavaScript) run on every code change to catch bugs early.

- **Web Server & Hosting**  
  • **Gunicorn** (Python WSGI server) behind an **Nginx** reverse proxy for fast and secure request handling.  
  • Deployed on Linux-based cloud services (AWS EC2, Heroku, DigitalOcean, or a Docker container) depending on your preference.

- **Build Tools**  
  • **Rollup** or native **ES Modules** decide whether to bundle or load JavaScript files directly.  
  • **Workbox CLI** to generate the service worker and precache rules automatically.

- **Storage Monitoring**  
  Uses browser’s **StorageManager API** (`navigator.storage.estimate()`) to warn users if local storage nears capacity.

## Third-Party Integrations
External libraries and services that extend the app’s capabilities:

- **Chart.js** for polished, interactive analytics charts.

- **Workbox (v7.x)** to simplify service worker setup and offline strategies (cache-first for assets, stale-while-revalidate for API data).

- **Web Audio API** for precise timing cues and feedback sounds.

- **Vibration API** for haptic signals, with graceful fallbacks when not supported.

(No cloud sync, social features, or payment gateways are in scope for Phase 1.)

## Security and Performance Considerations
Steps taken to keep your data safe and the app snappy:

- **HTTPS Everywhere**  
  The app must be served over a secure connection so service workers and vibration APIs function correctly.

- **Input Sanitization**  
  Any custom exercise names or user-entered text are cleaned on the backend to prevent malicious entries.

- **Offline Reliability**  
  • **Crash-Resistant Database**: SQLite in WAL mode ensures that if the browser or server crashes mid-workout, you can resume exactly where you left off.  
  • **Service Worker Fallback**: A minimal `offline.html` is displayed if core assets fail to load, guiding the user to retry.

- **Caching Strategies**  
  • **Cache-First** for static files (JavaScript, CSS, images) so the UI loads instantly.  
  • **Stale-While-Revalidate** for dynamic JSON responses—shows you stored data immediately, then refreshes in the background.

- **Performance Budgets**  
  • UI interactions (like logging a set) respond in under 100 ms.  
  • Charts render within 200 ms, even with months of data.

- **Storage Quota Alerts**  
  Users receive a warning when local data usage exceeds 80%, encouraging them to export a JSON backup and clear old sessions.

## Conclusion and Overall Tech Stack Summary
CalistheniX’s technology choices prioritize speed, reliability, and full offline capability. By combining a simple Python/Flask backend with a Vanilla JavaScript PWA frontend, we avoid heavy frameworks, keep maintenance overhead low, and ensure the app works even without an internet connection. Key highlights:

- **Local-First Data**: SQLite + Service Workers + LocalStorage/IndexedDB for true offline use and crash recovery.
- **Lightweight UI**: No large JavaScript frameworks—just modern ES6, HTML5, CSS3, and targeted libraries (Chart.js) for analytics.
- **Robust Deployment**: GitHub Actions, Gunicorn/Nginx, and cloud hosting options ensure that updates are safe, tested, and automatically deployed.
- **Engaging Feedback**: Audio and haptic cues via Web Audio and Vibration APIs create a coach-like experience without extra hardware.

Together, these technologies deliver a focused, high-performance workout tracker built specifically for bodyweight and calisthenics athletes, with no compromises on offline access, data integrity, or user experience.