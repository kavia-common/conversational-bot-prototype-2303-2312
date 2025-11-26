//
// Generator API utilities for non-streaming and streaming code generation.
//
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  '';

/**
 * PUBLIC_INTERFACE
 * Call non-streaming generation endpoint.
 */
export async function generateOnce(prompt, { signal } = {}) {
  const url = `${API_BASE}/api/generate`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Generate failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

/**
 * PUBLIC_INTERFACE
 * Stream generation via SSE, progressively returns chunks via onChunk.
 * It uses GET /api/generate/stream by default as EventSource and falls back to fetch+stream reader.
 */
export function streamGenerate(prompt, {
  onChunk,
  onDone,
  onError,
  usePost = false,
  signal
} = {}) {
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
    try { es && es.close(); } catch {}
  };

  let es;
  if (supportsEventSource) {
    const url = `${API_BASE}/api/generate/stream?prompt=${encodeURIComponent(prompt)}`;
    es = new EventSource(url, { withCredentials: true });
    const onMessage = (ev) => {
      if (ev.type === 'error') {
        onError?.(new Error('SSE connection error'));
        cleanup();
        return;
      }
    };
    es.addEventListener('chunk', (e) => {
      try {
        const data = JSON.parse(e.data);
        onChunk?.(data);
      } catch (_e) {}
    });
    es.addEventListener('done', () => {
      onDone?.();
      cleanup();
    });
    es.addEventListener('error', (e) => {
      onError?.(new Error('SSE error'));
      cleanup();
    });
    es.onerror = onMessage;

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
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Stream failed: ${resp.status} ${t}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse SSE frames
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = frame.split('\n');
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
            } catch {}
          } else if (event === 'done') {
            onDone?.();
          } else if (event === 'error') {
            try {
              const obj = JSON.parse(data);
              onError?.(new Error(obj?.message || 'stream error'));
            } catch {
              onError?.(new Error('stream error'));
            }
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        onError?.(new Error('aborted'));
      } else {
        onError?.(err);
      }
    }
  })();

  return { abort: () => controller.abort() };
}
