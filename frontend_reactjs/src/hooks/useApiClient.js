//
// PUBLIC_INTERFACE
// useApiClient provides sendMessage and streamMessage functions, reading API base and WebSocket URL
// from environment variables (REACT_APP_API_BASE and REACT_APP_WS_URL). It includes a no-backend
// fallback that mirrors the current local generation flow so the app behavior remains unchanged
// when no backend is configured.
//
// - No external dependencies
// - Safe when env vars are undefined
// - Uses fetch placeholders for non-stream requests when API base is provided
//
// Usage:
//   import useApiClient from './hooks/useApiClient';
//   const { useApi, sendMessage, streamMessage, apiBase, wsUrl } = useApiClient();
//
import { useMemo } from 'react';
import { generateSiteFromPrompt, sanitizeGeneratedHtml } from '../utils/generation';

// Basic utility to normalize env string
function normalizeEnvString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// PUBLIC_INTERFACE
export default function useApiClient() {
  /** This is a public function: returns API client helpers and env flags for integration. */
  const apiBaseRaw = process.env.REACT_APP_API_BASE;
  const wsUrlRaw = process.env.REACT_APP_WS_URL;

  const apiBase = normalizeEnvString(apiBaseRaw);
  const wsUrl = normalizeEnvString(wsUrlRaw);

  // Decide if API is configured
  const useApi = apiBase.length > 0;

  // Local fallback implementations replicate current local generation flow
  async function localSendMessage(messages) {
    // messages is an array of {role, content}. We will look at the latest user message.
    const lastUser = [...(messages || [])].reverse().find((m) => m?.role === 'user');
    const prompt = normalizeEnvString(lastUser?.content || '');
    if (!prompt) {
      return {
        messages: messages || [],
        html: '',
        error: 'Please enter a prompt.'
      };
    }

    // Generate locally using existing client generator
    const raw = generateSiteFromPrompt(prompt, {});
    const html = sanitizeGeneratedHtml(raw);

    const assistantMsg = {
      role: 'assistant',
      content:
        'Preview updated. You can refine with follow-up prompts like "make it dark", "add a contact section", or "add portfolio projects".'
    };

    return {
      messages: [...(messages || []), assistantMsg],
      html,
      error: ''
    };
  }

  async function localStreamMessage(messages, onDelta) {
    // Simulate a short "typing" stream then finalize with the same content as localSendMessage.
    const lastUser = [...(messages || [])].reverse().find((m) => m?.role === 'user');
    const prompt = normalizeEnvString(lastUser?.content || '');
    const baseText = 'Thinking';
    let dots = 0;

    // Emit a few "typing" deltas
    const steps = 6;
    for (let i = 0; i < steps; i += 1) {
      dots = (dots + 1) % 4;
      const content = `${baseText}${'.'.repeat(dots)}`;
      if (typeof onDelta === 'function') {
        onDelta({ role: 'assistant', content, done: false });
      }
      // small jitter
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 180 + Math.floor(Math.random() * 120)));
    }

    if (!prompt) {
      if (typeof onDelta === 'function') {
        onDelta({ role: 'assistant', content: 'Please enter a prompt.', done: true, error: true });
      }
      return { error: 'Please enter a prompt.' };
    }

    const raw = generateSiteFromPrompt(prompt, {});
    const html = sanitizeGeneratedHtml(raw);

    if (typeof onDelta === 'function') {
      onDelta({
        role: 'assistant',
        content:
          'Preview updated. You can refine with follow-up prompts like "make it dark", "add a contact section", or "add portfolio projects".',
        done: true,
        html
      });
    }
    return { html, error: '' };
  }

  // Placeholder API implementations: safe to call even if backend does not fully exist yet
  function readSettings() {
    try {
      const raw = window.localStorage.getItem('proto-bot-llm-settings-v1');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async function apiSendMessage(messages) {
    try {
      const s = readSettings();
      const provider = s?.provider === 'openai' ? 'openai' : 'ollama';
      const model = typeof s?.model === 'string' ? s.model : undefined;

      const headers = { 'Content-Type': 'application/json' };
      if (provider === 'openai' && s?.openaiApiKey) headers['X-OpenAI-Key'] = s.openaiApiKey;
      if (provider === 'openai' && s?.openaiBaseUrl) headers['X-OpenAI-Base-URL'] = s.openaiBaseUrl;
      if (provider === 'ollama' && s?.ollamaBaseUrl) headers['X-Ollama-Base'] = s.ollamaBaseUrl;

      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: (messages || []).filter(m=>m?.role==='user').slice(-1)[0]?.content || '', provider, model })
      });

      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[useApiClient] API sendMessage non-OK, falling back to local. Status:', res.status);
        }
        return localSendMessage(messages);
      }

      const data = await res.json().catch(() => ({}));
      const nextMessages = Array.isArray(data?.messages) ? data.messages : messages || [];
      const html = typeof data?.html === 'string' ? data.html : '';
      const error = typeof data?.error === 'string' ? data.error : '';

      return { messages: nextMessages, html, error };
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[useApiClient] API sendMessage error, falling back to local.', e);
      }
      return localSendMessage(messages);
    }
  }

  async function apiStreamMessage(messages, onDelta) {
    // Attempt a WebSocket stream if wsUrl configured, else fallback to HTTP POST /api/generate with SSE accept
    if (wsUrl) {
      try {
        await new Promise((resolve, reject) => {
          const socketUrl = wsUrl;
          const ws = new WebSocket(socketUrl);
          let closed = false;

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'chat.stream', messages }));
          };

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              // Expected streaming deltas:
              // { role:'assistant', content:'partial', done:false }
              // Final message may include { done:true, html:'...' }
              if (typeof onDelta === 'function') {
                onDelta(msg);
              }
              if (msg?.done) {
                closed = true;
                ws.close();
                resolve(null);
              }
            } catch {
              // ignore malformed
            }
          };

          ws.onerror = () => {
            if (!closed) {
              closed = true;
              try { ws.close(); } catch {}
              reject(new Error('WebSocket error'));
            }
          };

          ws.onclose = () => {
            if (!closed) {
              closed = true;
              resolve(null);
            }
          };
        });
        return { error: '' };
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[useApiClient] WS streaming failed, attempting fetch fallback then local.', e);
        }
        // fall through to fetch or local
      }
    }

    // Fallback: use backend /api/generate with Accept: text/event-stream
    try {
      const s = (function () {
        try {
          const raw = window.localStorage.getItem('proto-bot-llm-settings-v1');
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      const provider = s?.provider === 'openai' ? 'openai' : 'ollama';
      const model = typeof s?.model === 'string' ? s.model : undefined;
      const headers = { Accept: 'text/event-stream', 'Content-Type': 'application/json' };
      if (provider === 'openai' && s?.openaiApiKey) headers['X-OpenAI-Key'] = s.openaiApiKey;
      if (provider === 'openai' && s?.openaiBaseUrl) headers['X-OpenAI-Base-URL'] = s.openaiBaseUrl;
      if (provider === 'ollama' && s?.ollamaBaseUrl) headers['X-Ollama-Base'] = s.ollamaBaseUrl;

      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: (messages || []).filter(m=>m?.role==='user').slice(-1)[0]?.content || '',
          provider,
          model
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (typeof onDelta === 'function') {
          const finalMsg = {
            role: 'assistant',
            content:
              typeof data?.content === 'string'
                ? data.content
                : 'Preview updated.',
            done: true,
            html: typeof data?.html === 'string' ? data.html : ''
          };
          onDelta(finalMsg);
        }
        return { error: '' };
      }
      return localStreamMessage(messages, onDelta);
    } catch {
      return localStreamMessage(messages, onDelta);
    }
  }

  const value = useMemo(
    () => ({
      useApi,
      apiBase,
      wsUrl,
      // PUBLIC_INTERFACE
      async sendMessage(messages) {
        /** Sends message(s) to backend or local generator and returns {messages, html, error}. */
        if (!useApi) return localSendMessage(messages);
        return apiSendMessage(messages);
      },
      // PUBLIC_INTERFACE
      async streamMessage(messages, onDelta) {
        /** Streams assistant deltas via WS/API or simulates locally; calls onDelta for each chunk. */
        if (!useApi) return localStreamMessage(messages, onDelta);
        return apiStreamMessage(messages, onDelta);
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useApi, apiBase, wsUrl]
  );

  return value;
}
