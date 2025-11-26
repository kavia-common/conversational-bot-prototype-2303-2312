import { useCallback, useRef, useState } from 'react';
import { generateOnce, streamGenerate } from '../api/generatorApi';

/**
 * PUBLIC_INTERFACE
 * Hook to manage generation (streaming preferred with fallback), maintain buffers and UI status.
 *
 * Notes:
 * - Some backends emit SSE events with shapes:
 *   * event:chunk data: {"type":"code","payload":"...partial or full code..."}
 *   * event:chunk data: {"type":"meta","payload":{"title":"...","sections":[...]}}
 *   * event:done  data: {"html":"<!doctype ...>", "content":"...", "done":true}
 * - We now set currentHtml when a final html payload is received to ensure PreviewPage is not empty.
 */
export function useStreamedGenerator() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState('');
  const [codeBuffer, setCodeBuffer] = useState('');
  const [meta, setMeta] = useState({ title: '', sections: [] });
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false); // Preview/Code toggle (default false shows Preview)
  const [currentHtml, setCurrentHtml] = useState(''); // sanitized final html
  const abortRef = useRef(null);
  const lastPromptRef = useRef('');

  const reset = useCallback(() => {
    setIsStreaming(false);
    setStatus('');
    setCodeBuffer('');
    setMeta({ title: '', sections: [] });
    setError('');
    setCurrentHtml('');
    if (abortRef.current) {
      try { abortRef.current.abort?.(); } catch { /* noop */ }
      abortRef.current = null;
    }
  }, []);

  const start = useCallback(
    (prompt, { stream = true } = {}) => {
      reset();
      lastPromptRef.current = String(prompt || '');
      setIsStreaming(true);
      setStatus('Generating…');

      if (stream) {
        // Start streaming
        const handle = streamGenerate(prompt, {
          onStatus: (msg) => {
            setStatus(typeof msg === 'string' && msg ? msg : 'Generating…');
          },
          onChunk: (evt) => {
            // Normalize chunk shapes
            try {
              if (evt?.type === 'status') {
                setStatus(String(evt.payload || ''));
              } else if (evt?.type === 'code') {
                const next = String(evt.payload || '');
                setCodeBuffer(next);
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.debug('[useStreamedGenerator] code chunk length=', next.length);
                }
              } else if (evt?.type === 'meta') {
                setMeta(evt.payload || {});
              } else if (typeof evt?.html === 'string' && evt?.done) {
                // Some backends may send final html in a single event on 'done'
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.debug('[useStreamedGenerator] final html received from stream, length=', evt.html.length);
                }
                setCurrentHtml(evt.html || '');
                // If code not provided via code chunks, ensure codeBuffer not undefined
                setCodeBuffer((prev) => prev || '');
              }
            } catch {
              // ignore malformed event
            }
          },
          onDone: () => {
            setIsStreaming(false);
            setStatus('Generation complete');
            // Do not clear currentHtml here; keep whatever was set via stream finalizer
            abortRef.current = null;
          },
          onError: (err) => {
            setIsStreaming(false);
            const msg = err?.message === 'aborted' ? 'Generation canceled' : `Generation failed: ${err?.message || 'Unknown error'}`;
            setStatus(msg);
            setError(err?.message || 'Unknown error');
            abortRef.current = null;
          }
        });
        abortRef.current = handle;
      } else {
        // Non-streaming fallback
        const controller = new AbortController();
        abortRef.current = { abort: () => controller.abort() };
        setStatus('Generating…');
        generateOnce(prompt, { signal: controller.signal })
          .then(({ code, meta }) => {
            setCodeBuffer(code || '');
            setMeta(meta || {});
            // Non-stream endpoint in backend returns { code, meta } (not html), so currentHtml remains for consumer to build.
            setIsStreaming(false);
            setStatus('Generation complete');
          })
          .catch((err) => {
            const isAborted = controller.signal.aborted;
            const msg = isAborted ? 'Generation canceled' : `Generation failed: ${err?.message || 'Unknown error'}`;
            setError(err?.message || (isAborted ? 'aborted' : 'error'));
            setIsStreaming(false);
            setStatus(msg);
          })
          .finally(() => {
            abortRef.current = null;
          });
      }
    },
    [reset]
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      try { abortRef.current.abort?.(); } catch { /* noop */ }
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStatus('Generation canceled');
  }, []);

  const retry = useCallback(() => {
    const last = lastPromptRef.current || '';
    if (!last) return;
    start(last, { stream: true });
  }, [start]);

  const copyCurrent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeBuffer || '');
      return true;
    } catch {
      return false;
    }
  }, [codeBuffer]);

  return {
    isStreaming,
    status,
    codeBuffer,
    meta,
    error,
    showCode,
    setShowCode,
    currentHtml,
    setCurrentHtml,
    start,
    cancel,
    retry,
    reset,
    copyCurrent
  };
}
