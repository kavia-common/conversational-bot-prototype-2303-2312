# Proto Bot Local Backend

A minimal Express server used for local development alongside the React frontend.

- Port: 8000 (override with PORT)
- CORS_ORIGIN: http://localhost:3000 by default

Endpoints:
- GET /healthz -> 200 { status: "ok" }
- POST /api/generate { prompt } -> { html, content } placeholder

Run (from frontend):
- cd ../frontend_reactjs
- npm install
- npm start  # starts backend + frontend together

Run backend only:
- From backend/: npm install && npm start
