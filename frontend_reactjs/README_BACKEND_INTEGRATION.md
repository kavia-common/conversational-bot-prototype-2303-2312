# Frontend Backend Integration

This React app can use the backend CodeGen API if configured via environment variable:

- `REACT_APP_API_BASE` — Base URL of the backend, e.g. `http://localhost:8080`

When set, the app will POST `/api/generate` with `{ prompt, provider, model }` and optionally headers for proxying:
- `X-OpenAI-Key` when provider is `openai` (stored only in browser; sent only for proxying)
- `X-Ollama-Base` when provider is `ollama` to override base URL

The endpoint returns `{ html, content, messages? }` for non-stream and streams SSE when `Accept: text/event-stream` is set.

If not set or backend call fails, the app falls back to a local generator that returns a minimal placeholder component.

UI changes:
- Added a toggle to switch between Preview (default) and Code views.
- Preview does not execute arbitrary code. It displays a styled, sanitized preview container with code text.
- Code view includes a Copy button.
- Removed “Open in new tab” and export buttons (remain absent).
