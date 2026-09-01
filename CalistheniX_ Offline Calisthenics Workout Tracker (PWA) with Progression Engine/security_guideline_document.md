# Security Guidelines for CalistheniX: Offline Calisthenics PWA

## 1. Purpose & Scope
These guidelines ensure that CalistheniX—an offline-first Progressive Web App (PWA) with a Python/Flask backend and SQLite local storage—adheres to security best practices by design. They cover threat modeling, secure coding, data protection, deployment, and ongoing maintenance.

### In Scope
- Frontend PWA (Service Worker, IndexedDB, LocalStorage)
- Backend API (Flask, SQLite)
- Data import/export (JSON)
- DevOps (CI/CD, hosting, secrets)

## 2. Core Security Principles
- Security by Design: bake in controls from the start.  
- Least Privilege: grant minimal permissions (e.g., DB user can only read/write specific tables).  
- Defense in Depth: multiple checks at client, service worker, and server.  
- Input Validation & Output Encoding: sanitize all user-supplied names, JSON, and parameters.  
- Fail Securely: default to denying access or aborting on error without leaking internals.  
- Secure Defaults: out-of-the-box, PWA served over HTTPS; Flask in production mode.  
- Keep Security Simple: clear, maintainable controls.

## 3. Architecture & Trust Boundaries
- Client (Browser): UI, Service Worker, LocalStorage/IndexedDB  
- Local SQLite (optional bundled) or Remote Flask/SQLite: APIs under `/api/*`  
- Service Worker Cache: static assets & dynamic responses  

## 4. Authentication & Access Control
- No user accounts in Phase 1: data lives on device by default—no external login.  
- If a remote Flask backend is used:  
  - Enforce JWT or session cookies over HTTPS.  
  - Use `HttpOnly`, `Secure`, `SameSite=Strict` cookies or Bearer tokens stored in memory only.  
  - Harden endpoints with rate-limiting (e.g., `Flask-Limiter`).

## 5. Input Handling & Validation
- All text fields (exercise names, split names) must be validated server-side and client-side:  
  - Reject control characters, enforce length limits, and escape HTML before rendering.  
- JSON import/export:  
  - Use a strict JSON schema validator (e.g., `jsonschema`).  
  - Deny unexpected fields; enforce numeric ranges on reps/RPE/tempo codes.  
- Parameterized Queries:  
  - Use SQLAlchemy or Flask’s DB API with bound parameters to prevent injection.  
- Service Worker routes:  
  - Validate request URLs against an allow-list; do not cache open redirects.

## 6. PWA & Service Worker Security
- HTTPS Mandatory: ensure TLS 1.2+ on all origins (including `localhost` for dev).  
- `sw.js` at root (`/sw.js`) to maximize scope; lock scope in registration.  
- Caching strategies via Workbox:  
  - Static assets: **Cache-First** with content-hash filenames.  
  - JSON API: **Stale-While-Revalidate**, with a max age (e.g., 1 day).  
- Offline Fallback: custom `offline.html` served on fetch failures.  
- CSP Header:  
  - default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline' (if needed).  
  - disallow `eval()`, inline scripts, and untrusted domains.
- Secure Storage:  
  - Store sensitive sync tokens (if any) in HttpOnly cookies or encrypted IndexedDB.

## 7. Data Protection & Privacy
- **At-Rest Encryption:** employ SQLCipher (AES-256) for SQLite if device key storage is available.  
- **Transport Encryption:** all API calls over HTTPS; redirect HTTP → HTTPS.  
- **Secrets Management:** do not hardcode DB credentials or keys; use environment variables or a secrets vault (e.g., AWS Secrets Manager).  
- **Logging & Error Messages:**  
  - Log minimal info; scrub PII.  
  - Return generic error messages ("Invalid input"), never stack traces.
- **Data Retention & Erasure:** allow user to clear data; confirm destructive actions.

## 8. API & Service Security
- **Rate Limiting:** throttle `/api/restore` and import endpoints.  
- **CORS:** restrict to approved origins—prefer same-origin use.  
- **Versioning:** prefix APIs (`/api/v1/...`) to allow future secure migrations.  
- **HTTP Methods:** enforce GET for read, POST for create/import, PUT/PATCH for update, DELETE for removal.  
- **Response Minimization:** return only fields needed by the client.

## 9. Web Application Security Hygiene
- **CSRF Protection:** if using cookies/sessions, apply anti-CSRF tokens to state-changing requests.  
- **Security Headers:** enforce:  
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`  
  - `X-Content-Type-Options: nosniff`  
  - `X-Frame-Options: DENY`  
  - `Referrer-Policy: no-referrer-when-downgrade`  
- **Cookie Attributes:** `Secure; HttpOnly; SameSite=Strict` for any session or CSRF cookie.  
- **Disable Debug Mode in Production:** ensure `app.debug = False`.

## 10. Infrastructure & Configuration Management
- **Secure Defaults:** remove or lock down default admin panels.  
- **OS Hardening:** close unused ports, disable SSH root login, install only necessary packages.  
- **TLS Configuration:** use modern cipher suites; disable TLS 1.0/1.1.  
- **File Permissions:** SQLite and config files set to `600` (owner read/write).  
- **Secrets & Environment:** store secrets in CI (GitHub Actions Secrets) or vault; never commit `.env`.

## 11. Dependency Management
- **Lockfiles:** commit `Pipfile.lock` or `requirements.txt` with hash pins; commit `package-lock.json`.  
- **Vulnerability Scanning:** integrate SCA (e.g., Dependabot or GitHub Advanced Security).  
- **Minimal Footprint:** only include necessary Chart.js modules to reduce attack surface (e.g., `chart.js/dist/Chart.min.js`).

## 12. DevOps & CI/CD Security
- **CI/CD Pipeline (GitHub Actions):**  
  - Require branch protection rules and PR reviews.  
  - Run `pytest` for backend, lightweight runner tests for frontend.  
  - Fail build on high-severity vulnerabilities.
- **Secrets Access:** limit read/write to pipeline; rotate regularly.  
- **Automated Deployments:** sign artifacts; deploy from a trusted environment.

## 13. Monitoring, Auditing & Incident Response
- **Audit Logs:** record admin actions (data import, schema migrations).  
- **Storage Usage Alerts:** monitor via `navigator.storage.estimate()`, show user warnings.  
- **Error Tracking:** integrate Sentry or similar (source-scrubbed) for production errors.  
- **Incident Plan:** define roles, communication channel, and recovery steps for data breaches or service compromises.

---

By following these layered guidelines tailored to CalistheniX’s offline-first PWA architecture and Python/Flask backend, you will build a secure, resilient, and privacy-respecting application that users can trust with their training data.