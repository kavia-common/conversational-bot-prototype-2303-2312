# CodeGen Backend API

A minimal backend that proxies generation requests to either:
- Ollama (local LLM) via OLLAMA_BASE_URL
- OpenAI (chat.completions) via OPENAI_API_KEY

Features:
- POST /api/generate: non-stream JSON response returning `{ html, content, messages? }`
- POST /api/generate (Accept: text/event-stream): streams SSE (event:chunk, event:done) for incremental updates
- Provider routing using request-time overrides and environment defaults
- OpenAI proxy mode; never expose or log API keys
- Simple HTML generator wrapper

## Configuration

Create a `.env` file (see `.env.example`) with:

- PROVIDER=ollama (default 'ollama' | 'openai')
- OLLAMA_BASE_URL=http://localhost:11434
- OLLAMA_MODEL=llama3
- OPENAI_API_KEY=sk-...
- OPENAI_MODEL=gpt-4o-mini

You can override at request-time:
- Body: `{ provider, model }`
- Headers:
  - `X-Ollama-Base`: override base URL for Ollama
  - `X-OpenAI-Key`: override OpenAI key (only used if provider=openai)

## Run

Install deps and start:

- pip install -r requirements.txt
- uvicorn app:app --host 0.0.0.0 --port 8080

## Notes

- Sensitive errors are redacted.
- Keys are never logged.
- SSE endpoint uses the same route but honors `Accept: text/event-stream`.

```json
POST /api/generate
{
  "prompt": "Create a landing page",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```
