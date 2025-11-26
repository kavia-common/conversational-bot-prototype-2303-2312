//
// Generator API utilities for non-streaming and streaming code generation.
//
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  '';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.debug('[generatorApi] API_BASE =', API_BASE || '(not set)');
}

function safeReasonFromText(status, text) {
  const snippet = (text || '').trim().slice(0, 300);
  return status >= 500
    ? 'Server error'
    : status === 429
    ? 'Rate limited'
    : status === 408
    ? 'Request timeout'
    : status >= 400
    ? (snippet || `Request failed (${status})`)
    : 'Network error';
}

/**
 * PUBLIC_INTERFACE
 * Call non-streaming generation endpoint.
 */
import { useSettings } from '../state/settingsStore'; // not directly usable here; add helper to read localStorage

function loadSettingsSnapshot() {
  try {
    const raw = window.localStorage.getItem('proto-bot-llm-settings-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function generateOnce(prompt, { signal } = {}) {
  const url = `${API_BASE}/api/generate`;
  const s = loadSettingsSnapshot();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const body = {
    prompt,
    provider: s?.provider === 'openai' ? 'openai' : 'ollama',
    model: typeof s?.model === 'string' ? s.model : undefined
  };
  if (s?.provider === 'openai' && typeof s?.openaiApiKey === 'string' && s.openaiApiKey) {
    headers['X-OpenAI-Key'] = s.openaiApiKey;
  }
  if (s?.provider === 'ollama' && typeof s?.ollamaBaseUrl === 'string' && s.ollamaBaseUrl) {
    headers['X-Ollama-Base'] = s.ollamaBaseUrl;
  }

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });
  } catch (e) {
    throw new Error('Network error');
  }
  if (!resp.ok) {
    let msg = '';
    try {
      const j = await resp.json();
      msg = typeof j?.error === 'string' ? j.error : '';
    } catch {
      const t = await resp.text().catch(() => '');
      msg = safeReasonFromText(resp.status, t);
    }
    const reason = msg || safeReasonFromText(resp.status, '');
    const err = new Error(reason);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

/**
 * PUBLIC_INTERFACE
 * Stream generation via SSE, progressively returns chunks via onChunk.
 * It uses GET /api/generate/stream by default as EventSource and falls back to fetch+stream reader.
 */
export function streamGenerate(
  prompt,
  {
    onChunk,
    onDone,
    onError,
    onStatus, // optional callback for user-facing status messages
    usePost = false,
    signal
  } = {}
) {
  const controller = new AbortController();
  // Link external signal to internal controller
  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const supportsEventSource = typeof window !== 'undefined' && 'EventSource' in window && !usePost;

  // Cleanup helper
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    try {
      es && es.close();
    } catch {}
  };

  let es;
  if (supportsEventSource) {
    const url = `${API_BASE}/api/generate/stream?prompt=${encodeURIComponent(prompt)}`;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      onError?.(new Error('Unable to open stream'));
      return { abort: () => controller.abort() };
    }

    const handleEsError = () => {
      onError?.(new Error('SSE connection error'));
      cleanup();
    };

    es.addEventListener('open', () => {
      onStatus?.('Generating…');
    });

    es.addEventListener('chunk', (e) => {
      try {
        const data = JSON.parse(e.data);
        onChunk?.(data);
      } catch {
        // ignore malformed chunk
      }
    });

    es.addEventListener('done', (e) => {
      try {
        // Some backends may include final payload in done event
        if (e?.data) {
          const data = JSON.parse(e.data);
          onChunk?.(data);
        }
      } catch {}
      onDone?.();
      cleanup();
    });

    es.addEventListener('error', (e) => {
      // Custom 'error' event with JSON { message }
      try {
        if (e?.data) {
          const data = JSON.parse(e.data);
          const msg = typeof data?.message === 'string' ? data.message : 'Stream error';
          onError?.(new Error(msg));
        } else {
          onError?.(new Error('Stream error'));
        }
      } catch {
        onError?.(new Error('Stream error'));
      }
      cleanup();
    });

    es.onerror = handleEsError;

    // Abort handling: EventSource has no direct abort, we close it.
    controller.signal.addEventListener('abort', () => {
      onError?.(new Error('aborted'));
      cleanup();
    });

    return { abort: () => controller.abort() };
  }

  // Fallback: fetch with Accept: text/event-stream (POST)
  const url = `${API_BASE}/api/generate`;
  (async () => {
    try {
      const s = (function () {
        try {
          const raw = window.localStorage.getItem('proto-bot-llm-settings-v1');
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      const headers = {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json'
      };
      const body = {
        prompt,
        provider: s?.provider === 'openai' ? 'openai' : 'ollama',
        model: typeof s?.model === 'string' ? s.model : undefined
      };
      if (s?.provider === 'openai' && typeof s?.openaiApiKey === 'string' && s.openaiApiKey) {
        headers['X-OpenAI-Key'] = s.openaiApiKey;
      }
      if (s?.provider === 'ollama' && typeof s?.ollamaBaseUrl === 'string' && s.ollamaBaseUrl) {
        headers['X-Ollama-Base'] = s.ollamaBaseUrl;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!resp.ok || !resp.body) {
        let t = '';
        try {
          t = await resp.text();
        } catch {
          // ignore
        }
        throw new Error(safeReasonFromText(resp.status || 0, t));
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      onStatus?.('Generating…');
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse SSE frames (support CRLF/LF)
        let sepIdx;
        while ((sepIdx = buffer.search(/\r?\n\r?\n/)) >= 0) {
          const frame = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + (buffer[sepIdx] === '\r' ? 4 : 2));
          const lines = frame.split(/\r?\n/);
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              event = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              data += (data ? '\n' : '') + line.slice(5).trim();
            }
          }
          if (event === 'chunk') {
            try {
              const obj = JSON.parse(data);
              onChunk?.(obj);
            } catch {
              // ignore malformed
            }
          } else if (event === 'done') {
            // optional data on done
            try {
              if (data) {
                const obj = JSON.parse(data);
                onChunk?.(obj);
              }
            } catch {}
            onDone?.();
          } else if (event === 'error') {
            try {
              const obj = JSON.parse(data);
              onError?.(new Error(obj?.message || 'Stream error'));
            } catch {
              onError?.(new Error('Stream error'));
            }
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        onError?.(new Error('aborted'));
      } else {
        onError?.(err instanceof Error ? err : new Error('Network error'));
      }
    }
  })();

  return { abort: () => controller.abort() };
}
