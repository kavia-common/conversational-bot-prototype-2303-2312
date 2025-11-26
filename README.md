# conversational-bot-prototype-2303-2312

## Run frontend and backend together

A minimal Express backend is scaffolded for local development. You can now start both backend and frontend with a single command from the frontend folder.

## Quickstart

### First-time setup:
```bash
cd frontend_reactjs
npm install
cd ../backend
npm install
cd ../frontend_reactjs
```

### Running the application:
```bash
cd frontend_reactjs
npm start
```

This will:
- Start backend on http://localhost:8000 with CORS for http://localhost:3000
- Start React on http://localhost:3000
- Open http://localhost:3000 in your browser

## Environment

- Copy .env.example to .env inside frontend_reactjs to override defaults if needed.
  - REACT_APP_API_BASE defaults to http://localhost:8000
  - REACT_APP_FRONTEND_URL defaults to http://localhost:3000

## Backend endpoints

- GET /healthz -> 200 { status: "ok" }
- POST /api/generate { prompt } -> { html, content } placeholder response

## Scripts

All scripts are run from the `frontend_reactjs` directory:

- `npm start` - Starts both backend and frontend together using concurrently
- `npm run start:frontend` - Runs only the React frontend on port 3000
- `npm run start:backend` - Runs only the backend server on port 8000
- `npm run build` - Creates production build of the frontend
- `npm test` - Runs frontend tests

## Dependencies

The project uses:
- **concurrently** (^8.2.2) - For running backend and frontend simultaneously
- **cross-env** (^7.0.3) - For cross-platform environment variable support

Both are installed as devDependencies in the frontend package.json.

## Notes

- Scripts use concurrently for cross-platform process management
- Backend dependencies (express, cors) must be installed separately in the backend folder
- The combined start script ensures both services start together with colored output
