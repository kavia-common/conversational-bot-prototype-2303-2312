# Frontend Backend Integration

This document explains how the React frontend integrates with a backend generator API for both non-streaming and streaming flows, and how to configure the environment to enable it.

## Configure environment

Set a base URL for your backend:

- REACT_APP_API_BASE=http://localhost:8080
- Or REACT_APP_BACKEND_URL=http://localhost:8080

Optional streaming endpoint via WebSocket:

- REACT_APP_WS_URL=wss://your-host/ws

Health check path (used by the top bar indicator):

- REACT_APP_HEALTHCHECK_PATH=/healthz

Provider defaults (used to seed local settings):

- REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
- REACT_APP_OLLAMA_MODEL=llama3

All variables are centralized in src/utils/env.js.

## Endpoints and requests

Non-streaming:
- POST {API_BASE}/api/generate
- Body: { "prompt": string, "provider": "ollama" | "openai", "model": string }
- Optional headers for proxying:
  - X-OpenAI-Key when provider is openai
  - X-OpenAI-Base-URL when provider is openai and you want to target a custom OpenAI-compatible base
  - X-Ollama-Base when provider is ollama to override Ollama base URL
- Response shape the app understands:
  - { "html": string, "content": string, "messages": [...] } or
  - { "code": string, "meta": { ... } }

Streaming (SSE):
- Preferred GET: {API_BASE}/api/generate/stream?prompt=...
  - The app uses EventSource when available
  - SSE events:
    - event: chunk data: {"type":"code","payload":"..."} and/or {"type":"meta","payload":{...}}
    - event: done data: {"html":"<!doctype ...>", "content":"...","done":true}
    - event: error data: {"message":"..."}
- Fallback POST with Accept: text/event-stream to {API_BASE}/api/generate
  - Emits the same event shapes, framed as SSE

Streaming (WebSocket) if REACT_APP_WS_URL is set:
- The app connects to WS_URL and sends:
  - { "type": "chat.stream", "messages": [{role,content}, ...] }
- Expected inbound messages:
  - { "role": "assistant", "content": "partial", "done": false }
  - Final: { "done": true, "html": "<!doctype ...>"? }

If streaming over WS fails, the app falls back to SSE or a non-streaming request; if the backend is not configured, it falls back to a client-side generator.

## Client behavior and fallbacks

- useApiClient hook decides if API is enabled (API_BASE set)
- For sendMessage:
  - Tries POST /api/generate
  - On non-OK or network error, falls back to a local generator
- For streamMessage:
  - Tries WebSocket first if WS_URL is set
  - Else tries SSE (GET or POST)
  - On failure, falls back to a local simulated stream which ends with a safe preview container built from code text

Relevant files:
- src/hooks/useApiClient.js
- src/api/generatorApi.js
- src/hooks/useStreamedGenerator.js

## Security and preview

The app never executes untrusted code in the preview:
- Generated code is displayed as text in a styled container or rendered HTML is sanitized
- Scripts, iframes, inline event handlers, and certain external link rels are stripped
- The inline preview uses src/Preview.js; the full-screen preview page is src/PreviewPage.js

## Feature flags and experiments

- REACT_APP_FEATURE_FLAGS can be JSON or CSV and is parsed by src/utils/env.js
- Gate UI with src/components/FeatureFlagGate.jsx:
  <FeatureFlagGate flag="demoPanel">...</FeatureFlagGate>
- EXPERIMENTS_ENABLED enables allowAll blocks for experimentation environments:
  <FeatureFlagGate flag="nonexistent" allowAll>Shown when experiments are globally enabled</FeatureFlagGate>

