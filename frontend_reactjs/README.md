# Proto Bot Frontend (React)

This frontend is a lightweight React application for prototyping conversational bots and rapidly previewing generated UI. It follows the Ocean Professional theme and avoids heavy UI frameworks.

## Features

- Minimal dependencies and fast startup
- Centralized, safe environment handling with sensible defaults
- Optional backend integration for generation (HTTP, SSE) and WebSocket streaming
- Built-in feature flag gating
- Sandboxed live preview that never executes arbitrary code
- Clean, accessible, modern UI with a single-column chat layout and dedicated full-screen preview route

## Setup

### First-time installation:

**Important**: Both frontend and backend dependencies must be installed for the application to work properly.

```bash
# From project root or frontend_reactjs directory
npm install

# Then install backend dependencies
cd ../backend
npm install
cd ../frontend_reactjs
```

### Verify installation:

```bash
# Check that concurrently is installed
npm list concurrently

# Check that backend dependencies are installed
cd ../backend && npm list
```

## Quickstart

- **Install**: `npm install` (see Setup section above)
- **Development** (runs frontend + backend together):
  ```bash
  npm start
  ```
  - Backend at http://localhost:8000 (CORS allowed for http://localhost:3000)
  - Frontend at http://localhost:3000
- **Tests**: `npm test`
- **Build**: `npm run build`

### Individual service commands:

- **Frontend only**: `npm run start:frontend`
- **Backend only**: `npm run start:backend`

## Environment Configuration

Optional: create a .env file to configure backend and flags. For example:

```env
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_WS_URL=
REACT_APP_FEATURE_FLAGS=demoPanel,otherFlag
REACT_APP_EXPERIMENTS_ENABLED=true
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=llama3
```

**Tip**: Copy .env.example to .env to get sane local defaults.

If no backend is configured, the app uses a local client-side generator.

## Environment variables

All environment parsing is centralized in src/utils/env.js and only REACT_APP_* variables are read (as permitted by CRA). The helper returns normalized values:

- API_BASE: from REACT_APP_API_BASE or REACT_APP_BACKEND_URL
- FRONTEND_URL: from REACT_APP_FRONTEND_URL
- WS_URL: from REACT_APP_WS_URL
- NODE_ENV: from REACT_APP_NODE_ENV or process.env.NODE_ENV
- NEXT_TELEMETRY_DISABLED: from REACT_APP_NEXT_TELEMETRY_DISABLED (boolean)
- ENABLE_SOURCE_MAPS: from REACT_APP_ENABLE_SOURCE_MAPS (boolean)
- PORT: from REACT_APP_PORT (integer, default 3000)
- TRUST_PROXY: from REACT_APP_TRUST_PROXY (boolean)
- LOG_LEVEL: from REACT_APP_LOG_LEVEL (string)
- HEALTHCHECK_PATH: from REACT_APP_HEALTHCHECK_PATH (default /healthz)
- FEATURE_FLAGS: parsed from REACT_APP_FEATURE_FLAGS (JSON or CSV)
- EXPERIMENTS_ENABLED: boolean from REACT_APP_EXPERIMENTS_ENABLED
- OLLAMA_BASE_URL: from REACT_APP_OLLAMA_BASE_URL (default http://localhost:11434)
- OLLAMA_MODEL: from REACT_APP_OLLAMA_MODEL (default llama3)

Usage in code:
```javascript
import env from './src/utils/env';
const { API_BASE, WS_URL, FEATURE_FLAGS, EXPERIMENTS_ENABLED } = env();
```

### Example .env mappings

- REACT_APP_API_BASE=http://localhost:8080
  - App makes POSTs to http://localhost:8080/api/generate
  - Health check uses http://localhost:8080/healthz (configurable via REACT_APP_HEALTHCHECK_PATH)

- REACT_APP_FEATURE_FLAGS='{"demoPanel": true, "betaHeader": false}'
  - FEATURE_FLAGS.demoPanel is true
  - FEATURE_FLAGS.betaHeader is false

- REACT_APP_FEATURE_FLAGS=demoPanel,alphaExperiment
  - Parsed as { demoPanel: true, alphaExperiment: true }

- REACT_APP_WS_URL=wss://example.com/stream
  - WebSocket integration attempts streaming from this URL

## Local backend

This repo includes a minimal Express backend under ../backend/server.js for local development:
- Health: GET /healthz
- Generate: POST /api/generate

Scripts:
- `npm start` - starts both backend (8000) and frontend (3000) using concurrently
- `npm run start:backend` - backend only
- `npm run start:frontend` - frontend only

CORS:
- Backend allows CORS from http://localhost:3000 by default. Adjust with CORS_ORIGIN env if necessary.

## Backend integration

Two layers exist:

- Hook-level integration (src/hooks/useApiClient.js):
  - Decides if backend is used based on API_BASE
  - Provides sendMessage and streamMessage
  - Falls back to local generation when the backend is not available or returns non-OK responses
  - Uses optional WebSocket URL from WS_URL for streaming first; if not configured or fails, falls back to HTTP streaming or local simulation

- API utilities (src/api/generatorApi.js):
  - generateOnce: POST API_BASE/api/generate with JSON { prompt, provider, model }
  - streamGenerate: preferred SSE path using GET /api/generate/stream or POST /api/generate with Accept: text/event-stream as a fallback
  - Adds proxy headers when applicable:
    - X-OpenAI-Key when provider is openai
    - X-OpenAI-Base-URL optional override for OpenAI-compatible endpoints
    - X-Ollama-Base for Ollama override

Settings for provider, model, and keys are stored in localStorage via src/state/settingsStore.js and configured via the Settings panel (gear icon in the Top Bar).

For more details, see README_BACKEND_INTEGRATION.md.

## Streaming and WebSockets

- Primary streaming is handled in src/hooks/useApiClient.js and src/api/generatorApi.js.
- WebSocket: if WS_URL is set, the app attempts a WebSocket connection and expects messages of the form:
  { role: "assistant", content: "partial", done: false } and a final { done: true, html: "<!doctype...>"? }
- SSE fallback: when WebSocket is not available, the app falls back to SSE via POST with Accept: text/event-stream or uses EventSource for GET /api/generate/stream if your backend supports it.
- The stream handler progressively buffers code deltas and sets preview HTML when the final html arrives. If only code is provided, a safe, non-executing preview container is built from the code text.

See:
- src/hooks/useApiClient.js
- src/api/generatorApi.js
- src/hooks/useStreamedGenerator.js

## Feature flags and experiments

- Gate UI with FeatureFlagGate (src/components/FeatureFlagGate.jsx):
  ```jsx
  <FeatureFlagGate flag="demoPanel">...</FeatureFlagGate>
  ```
- FEATURE_FLAGS is parsed from REACT_APP_FEATURE_FLAGS as JSON or CSV
- EXPERIMENTS_ENABLED can be used with allowAll to show experimental blocks for test environments:
  ```jsx
  <FeatureFlagGate flag="someFlag" allowAll>{...}</FeatureFlagGate>
  ```

## Preview behavior

The preview never executes untrusted code. There are two preview surfaces:

- Inline preview panel (chat layout):
  - The assistant generates code or html
  - If only code is produced, the app constructs a safe HTML wrapper that shows the code as text within a styled container
  - No scripts, iframes, inline handlers, or external stylesheets are executed or loaded

- Full-screen preview route (hash route):
  - Clicking "Open Preview" opens #/preview in a new tab
  - src/PreviewPage.js reads the currently generated HTML from the chat store and renders it inside a sandboxed iframe with sanitizeGeneratedHtml

Sanitization:
- src/utils/generation.js: sanitizeGeneratedHtml removes scripts, iframes, inline event handlers, certain link rels, and defensive toolbar placeholders
- src/Preview.js applies additional guardrails to ensure the embedded content is safe

## UI overview

- Top bar: theme toggle, reset, settings gear, preview button, backend health indicator
- Chat area: messages and typing indicator
- Chat input: prompt box and submit
- Settings: provider, model, base URLs and API key (stored in browser only; proxied when provider is OpenAI)
- Dedicated preview: #/preview route for a clean, full-window view

## Troubleshooting

- **"Client-only" status in the top bar** means no backend is configured (set REACT_APP_API_BASE)
- **"API Down"** indicates the health check failed to fetch from API_BASE + HEALTHCHECK_PATH (default /healthz)
- **If streaming fails**, the app automatically falls back to non-stream requests or local generation to preserve UX
- **Backend dependencies missing**: If you see errors about express or cors not found, run `npm install` in the `../backend` directory
- **'concurrently: not found' error**: This is now automatically fixed - the prestart script will install concurrently if it's missing from node_modules

## Learn more

- Environment helper: src/utils/env.js
- Generator API: src/api/generatorApi.js
- API/WS client: src/hooks/useApiClient.js
- Stream manager hook: src/hooks/useStreamedGenerator.js
- Preview: src/Preview.js and src/PreviewPage.js
