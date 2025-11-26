import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * Preview component renders a single sandboxed iframe using srcDoc only.
 * - Uses srcDoc instead of src to avoid route-loading the app inside the iframe.
 * - Applies sandbox to restrict capabilities.
 * - Guards against nested rendering when the app runs inside an iframe.
 * - Strips any <iframe> tags from provided HTML to prevent recursive previews.
 */
export default function Preview({ html, height = 'calc(100vh - 64px - 32px)' }) {
  /** This is a public function: a safe preview pane for raw HTML. */
  // Guard: Do not render preview if we are already inside an iframe (prevents nesting).
  const isInIframe = typeof window !== 'undefined' && window.top !== window.self;

  // Sanitize: strip iframes and inline scripts from the incoming HTML to avoid nested frames and execution.
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

    return out;
  }, [html]);

  if (isInIframe) {
    // When running inside an iframe, avoid rendering another iframe to prevent nesting.
    return null;
  }

  return (
    <iframe
      title="Prototype Preview"
      sandbox="allow-same-origin allow-forms allow-scripts"
      style={{ width: '100%', height, border: 'none' }}
      // Use srcDoc strictly; do not set src to avoid loading app routes.
      srcDoc={sanitizedHtml}
    />
  );
}
