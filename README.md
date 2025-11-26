# conversational-bot-prototype-2303-2312

## Run frontend and backend together

A minimal Express backend is scaffolded for local development. You can now start both backend and frontend with a single command from the frontend folder.

Quickstart:
- cd frontend_reactjs
- npm install
- npm start
  - Starts backend on http://localhost:8000 with CORS for http://localhost:3000
  - Starts React on http://localhost:3000
- Open http://localhost:3000

Environment:
- Copy .env.example to .env inside frontend_reactjs to override defaults if needed.
  - REACT_APP_API_BASE defaults to http://localhost:8000
  - REACT_APP_FRONTEND_URL defaults to http://localhost:3000

Backend endpoints:
- GET /healthz -> 200 { status: "ok" }
- POST /api/generate { prompt } -> { html, content } placeholder response

Notes:
- Scripts use concurrently for cross-platform process management.
- To run only the frontend: npm run start:frontend
- To run only the backend: npm run start:backend