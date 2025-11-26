import React, { useEffect, useMemo } from 'react';
import { useChatState } from './state/chatStore';
import { sanitizeGeneratedHtml } from './utils/generation';

/**
 * PUBLIC_INTERFACE
 * PreviewPage renders ONLY the generated HTML content in a full-window view.
 * It reuses sanitizeGeneratedHtml and displays no application UI.
 * Gracefully handles empty content by showing a minimal message.
 */
export default function PreviewPage() {
  /** This is a public function: full-window preview page. */

  // Ensure minimal body reset so the page is plain and uncluttered
  useEffect(() => {
    // Apply a minimal reset for better full-window rendering
    const previous = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      background: document.body.style.background,
    };
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#ffffff';
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[PreviewPage] mounted');
    }
    return () => {
      document.body.style.margin = previous.margin;
      document.body.style.padding = previous.padding;
      document.body.style.background = previous.background;
    };
  }, []);

  let currentHtml = '';
  try {
    const state = useChatState();
    currentHtml = typeof state?.currentHtml === 'string' ? state.currentHtml : '';
  } catch {
    currentHtml = '';
  }

  const sanitized = useMemo(() => sanitizeGeneratedHtml(currentHtml || ''), [currentHtml]);
  const isEmpty = !sanitized || sanitized.trim().length === 0;

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[PreviewPage] currentHtml length=', (currentHtml || '').length, 'sanitized empty?', isEmpty);
  }

  // Render only the content; if empty, show a minimal helper
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {isEmpty ? (
        <div
          role="status"
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: '#6b7280',
            fontSize: 14,
            padding: 16
          }}
        >
          No preview available. Generate content from the main app to view it here.
        </div>
      ) : (
        <iframe
          title="Full Preview"
          sandbox="allow-same-origin allow-forms allow-scripts"
          style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', display: 'block' }}
          srcDoc={sanitized}
        />
      )}
    </div>
  );
}
