import React, { useEffect, useMemo } from 'react';
import { useStreamedGenerator } from '../hooks/useStreamedGenerator';

/**
 * PUBLIC_INTERFACE
 * Minimal panel demonstrating streaming integration with Preview/Code toggle and controls.
 * Note: Parent can pass a sanitizeAndRender function if needed; otherwise we display code as text.
 */
export default function GeneratorPanel({ defaultPrompt = '', sanitizeAndRender }) {
  const {
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
    copyCurrent
  } = useStreamedGenerator();

  // Convert to rendered output when done and preview is selected.
  useEffect(() => {
    if (!isStreaming && !showCode && typeof sanitizeAndRender === 'function') {
      try {
        const html = sanitizeAndRender(codeBuffer);
        setCurrentHtml(html);
      } catch {
        // Keep silent; caller responsible for sanitization.
      }
    }
  }, [isStreaming, showCode, codeBuffer, sanitizeAndRender, setCurrentHtml]);

  const onStart = () => {
    const prompt = defaultPrompt || 'Create a small chat UI with header and message list.';
    start(prompt, { stream: true });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onStart} disabled={isStreaming} style={{ padding: '8px 12px', background: '#2563EB', color: '#fff', borderRadius: 6, border: 'none' }}>
          {isStreaming ? 'Generating…' : 'Generate'}
        </button>
        {isStreaming && (
          <button onClick={cancel} style={{ padding: '8px 12px', background: '#EF4444', color: '#fff', borderRadius: 6, border: 'none' }}>
            Cancel
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} />
            Show Code
          </label>
          <button onClick={copyCurrent} disabled={!codeBuffer} style={{ padding: '6px 10px', borderRadius: 6 }}>
            Copy
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        {isStreaming ? 'Generating…' : status}
        {isStreaming && <span> •••</span>}
        {error && <span style={{ color: '#EF4444', marginLeft: 8 }}>{error}</span>}
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, minHeight: 160, background: '#f9fafb' }}>
        {showCode ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {codeBuffer || 'No code yet.'}
          </pre>
        ) : (
          <>
            {isStreaming && (
              <div style={{ fontStyle: 'italic', color: '#6b7280' }}>
                Preview will render once generation completes…
              </div>
            )}
            {!isStreaming && currentHtml && (
              <div dangerouslySetInnerHTML={{ __html: currentHtml }} />
            )}
            {!isStreaming && !currentHtml && (
              <div style={{ color: '#6b7280' }}>Nothing to preview.</div>
            )}
          </>
        )}
      </div>

      {meta?.title && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <strong>Title:</strong> {meta.title}
        </div>
      )}
      {Array.isArray(meta?.sections) && meta.sections.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 13 }}>
          <strong>Sections:</strong> {meta.sections.join(', ')}
        </div>
      )}
    </div>
  );
}
