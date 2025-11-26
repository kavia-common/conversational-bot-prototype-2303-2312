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
        let aggCode = '';
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
                const piece = String(evt.payload || '');
                // Append piece to buffer when backend sends incrementally
                aggCode += piece;
                setCodeBuffer(aggCode);
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.debug('[useStreamedGenerator] code chunk received length=', piece.length, 'agg=', aggCode.length);
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
                setCodeBuffer((prev) => prev || aggCode || '');
              } else if (evt?.done && typeof evt?.code === 'string' && !evt.html) {
                // Done event with aggregated code but no html
                aggCode = evt.code;
                setCodeBuffer(aggCode);
              }
            } catch {
              // ignore malformed event
            }
          },
          onDone: () => {
            setIsStreaming(false);
            // If html wasn't provided, attempt to convert code to html by wrapping as safe preview container
            if (!currentHtml && (codeBuffer || aggCode)) {
              try {
                const code = codeBuffer || aggCode || '';
                const safe = (code || '')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                const html = `
                  <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                      <h2 style="margin:0;color:#2563EB;font-size:16px;">Preview (Code not executed)</h2>
                    </div>
                    <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;background:#f9fafb;padding:12px;border-radius:6px;border:1px dashed #e5e7eb;">${safe}</pre>
                  </div>
                `;
                setCurrentHtml(html);
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.debug('[useStreamedGenerator] built preview html from code buffer length=', (code || '').length);
                }
                setStatus(`Generation complete (${(code || '').length} chars)`);
              } catch {
                setStatus('Generation complete');
              }
            } else {
              setStatus(`Generation complete${codeBuffer ? ` (${(codeBuffer || '').length} chars)` : ''}`);
            }
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
            const codeStr = code || '';
            setCodeBuffer(codeStr);
            setMeta(meta || {});
            // convert to safe preview container for immediate display if consumer expects currentHtml
            if (codeStr) {
              const safe = codeStr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const html = `
                <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <h2 style="margin:0;color:#2563EB;font-size:16px;">Preview (Code not executed)</h2>
                  </div>
                  <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;background:#f9fafb;padding:12px;border-radius:6px;border:1px dashed #e5e7eb;">${safe}</pre>
                </div>
              `;
              setCurrentHtml(html);
            }
            setIsStreaming(false);
            setStatus(codeStr ? `Generation complete (${codeStr.length} chars)` : 'Generation complete');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reset, currentHtml, codeBuffer]
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
