import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * Preview component renders a single sandboxed iframe using srcDoc only.
 * - Uses srcDoc instead of src to avoid route-loading the app inside the iframe.
 * - Applies sandbox to restrict capabilities.
 * - Guards against nested rendering when the app runs inside an iframe, but allows main app usage.
 * - Strips any <iframe> tags from provided HTML to prevent recursive previews.
 */
export default function Preview({ html, height = 'calc(100vh - 64px - 32px)' }) {
  /** This is a public function: a safe preview pane for raw HTML. */

  // Relaxed guard:
  // Only hide the preview when we are explicitly embedded by an external host.
  // We use a naming convention: if window.name contains "hosted-preview" an external host set it.
  const runningInsideForeignIframe =
    typeof window !== 'undefined' &&
    window.top !== window.self &&
    typeof window.name === 'string' &&
    window.name.includes('hosted-preview');

  // Sanitize: remove iframes/scripts and inline handlers; preserve safe HTML/CSS.
  const sanitizedHtml = useMemo(() => {
    if (!html || typeof html !== 'string') return '';
    let out = html;

    // Remove any existing <iframe ...>...</iframe> blocks
    out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    // Also remove any self-closing iframes just in case
    out = out.replace(/<iframe[^>]*\/>/gi, '');

    // Remove <script> tags entirely to prevent attempts to mount apps inside preview
    out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Remove inline on* handlers as a basic safety measure
    out = out.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');

    // Ensure the HTML does not include a container with id="root" (avoid confusion with host app root)
    out = out.replace(/id\s*=\s*["']root["']/gi, 'id="preview-root"');

    return out.trim();
  }, [html]);

  // Minimal logging for debugging preview states
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[Preview] embeddedByHost?', runningInsideForeignIframe, 'htmlEmpty?', !sanitizedHtml);
  }

  if (runningInsideForeignIframe) {
    // When running inside an explicitly hosted iframe, avoid rendering another iframe to prevent nesting.
    return null;
  }

  // Visual fallback when html is empty to help users understand state
  const isEmpty = !sanitizedHtml || sanitizedHtml.length === 0;

  return (
    <div style={{ width: '100%', height }}>
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
          No preview yet. Enter a prompt and click Send to generate a live preview.
        </div>
      ) : (
        <iframe
          title="Prototype Preview"
          sandbox="allow-same-origin allow-forms allow-scripts"
          style={{ width: '100%', height: '100%', border: 'none' }}
          // Use srcDoc strictly; do not set src to avoid loading app routes.
          srcDoc={sanitizedHtml}
        />
      )}
    </div>
  );
}
