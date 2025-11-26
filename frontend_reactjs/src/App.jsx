import React, { useState, useMemo } from 'react';
import { callBackendGenerate } from './services/generatorApi';
import { sanitizeHtml } from './utils/sanitize';

/**
 * PUBLIC_INTERFACE
 * localGenerate
 * Fallback local generator for when backend is not configured.
 */
function localGenerate(prompt) {
  // Minimal placeholder generator returning a simple component code
  const title = 'Generated Component';
  const code = `export default function GeneratedPreview(){
  return (
    <div style={{padding:16, border:'1px solid #e5e7eb', borderRadius:8}}>
      <h2 style={{margin:0, marginBottom:8, color:'#2563EB'}}>Preview</h2>
      <p style={{margin:0}}>Prompt: ${JSON.stringify(prompt)}</p>
    </div>
  );
}`;
  return { code, meta: { title, sections: ['Preview'] } };
}

/**
 * PUBLIC_INTERFACE
 * App
 * Main UI with prompt input, submit, preview/code toggle, and copy button.
 */
export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // { code, meta }
  const [showCode, setShowCode] = useState(false); // toggle: false => Preview (default), true => Code
  const apiBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p) return;
    setIsLoading(true);
    try {
      // try backend first if configured
      let out = null;
      if (apiBase) {
        try {
          out = await callBackendGenerate(p);
        } catch (err) {
          // fallback to local if backend fails
          // eslint-disable-next-line no-console
          console.warn('Backend call failed, using local generator:', err);
        }
      }
      if (!out) {
        out = localGenerate(p);
      }
      setResult(out);
      setShowCode(false); // default to Preview on new result
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      // Optional UX: Could show a toast; keeping it simple to avoid adding deps
    } catch {
      // No-op
    }
  };

  const renderedPreviewHtml = useMemo(() => {
    if (!result?.code) return '';
    // Since we are not evaluating JSX, display code as a pre-rendered HTML block for preview:
    // We wrap code in a styled div to show a "visual" container and not execute untrusted code.
    const safe = sanitizeHtml(result.code)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h2 style="margin:0;color:#2563EB;font-size:16px;">Preview (Code not executed)</h2>
        </div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;background:#f9fafb;padding:12px;border-radius:6px;border:1px dashed #e5e7eb;">${safe}</pre>
      </div>
    `;
  }, [result]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <header style={{ padding: '16px 24px', background: 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(249,250,251,1))', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Proto Bot</h1>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Ocean Professional Theme</div>
      </header>

      <main style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Describe the UI to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              outline: 'none',
              background: '#fff'
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 16px',
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </form>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCode}
              onChange={(e) => setShowCode(e.target.checked)}
            />
            <span>Code</span>
          </label>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {showCode ? 'Showing Code' : 'Showing Preview'}
            {apiBase ? ' • Using backend' : ' • Local generator'}
          </span>
        </div>

        <section style={{ marginTop: 16 }}>
          {!result && (
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              Enter a prompt to generate UI code.
            </div>
          )}

          {result && !showCode && (
            <div
              // Preview mode: DO NOT execute arbitrary code. We show a safe, non-executed preview container with code text.
              dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
            />
          )}

          {result && showCode && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, color: '#2563EB' }}>{result?.meta?.title || 'Generated Code'}</div>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '8px 10px',
                    background: '#F59E0B',
                    color: '#111827',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
              <pre style={{ margin: 0, padding: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
                {result.code}
              </pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
