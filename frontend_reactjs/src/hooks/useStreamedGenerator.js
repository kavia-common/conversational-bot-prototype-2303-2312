import { useCallback, useMemo, useRef, useState } from 'react';
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

  const start = useCallback((prompt, { stream = true } = {}) => {
    reset();
    setIsStreaming(true);
    setStatus('Generating…');

    if (stream) {
      // Start streaming
      const handle = streamGenerate(prompt, {
        onChunk: (evt) => {
          if (evt?.type === 'status') {
            setStatus(String(evt.payload || ''));
          } else if (evt?.type === 'code') {
            // progressively update code buffer
            setCodeBuffer(String(evt.payload || ''));
          } else if (evt?.type === 'meta') {
            setMeta(evt.payload || {});
          }
        },
        onDone: () => {
          setIsStreaming(false);
          setStatus('Done');
          // The consumer should sanitize and render; we store raw buffer here.
          setCurrentHtml(''); // Let the UI convert codeBuffer into rendered preview as needed
          abortRef.current = null;
        },
        onError: (err) => {
          setIsStreaming(false);
          setError(err?.message || 'Stream error');
          abortRef.current = null;
        }
      });
      abortRef.current = handle;
    } else {
      // Non-streaming fallback
      const controller = new AbortController();
      abortRef.current = { abort: () => controller.abort() };
      generateOnce(prompt, { signal: controller.signal })
        .then(({ code, meta }) => {
          setCodeBuffer(code || '');
          setMeta(meta || {});
          setIsStreaming(false);
          setStatus('Done');
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            setError('aborted');
          } else {
            setError(err?.message || 'error');
          }
          setIsStreaming(false);
        })
        .finally(() => {
          abortRef.current = null;
        });
    }
  }, [reset]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStatus('Canceled');
  }, []);

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
    reset,
    copyCurrent
  };
}
