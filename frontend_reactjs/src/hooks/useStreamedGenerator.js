import { useCallback, useRef, useState } from 'react';
import { generateOnce, streamGenerate } from '../api/generatorApi';

/**
 * PUBLIC_INTERFACE
 * Hook to manage generation (streaming preferred with fallback), maintain buffers and UI status.
 */
export function useStreamedGenerator() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState('');
  const [codeBuffer, setCodeBuffer] = useState('');
  const [meta, setMeta] = useState({ title: '', sections: [] });
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false); // Preview/Code toggle
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
      abortRef.current.abort();
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
                setCodeBuffer(String(evt.payload || ''));
              } else if (evt?.type === 'meta') {
                setMeta(evt.payload || {});
              } else if (typeof evt?.html === 'string' && evt?.done) {
                // Some backends may send final html in a single event on 'done'
                setCodeBuffer((prev) => prev || '');
              }
            } catch {
              // ignore malformed event
            }
          },
          onDone: () => {
            setIsStreaming(false);
            setStatus('Generation complete');
            // The consumer should sanitize and render; we store raw buffer here.
            setCurrentHtml(''); // Let the UI convert codeBuffer into rendered preview as needed
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
      abortRef.current.abort();
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
