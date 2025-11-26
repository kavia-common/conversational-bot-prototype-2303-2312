import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * Preview renders ONLY the provided generated markup inside a sandboxed iframe via srcDoc.
 * - No extra wrappers or headers inside the iframe.
 * - Strips scripts, iframes, inline handlers, and hostile link injections that could inject app UI.
 * - Preserves safe HTML and inline CSS required for layout.
 * - Empty-state is rendered OUTSIDE the iframe.
 */
export default function Preview({ html, height = 'calc(100vh - 64px - 32px)' }) {
  /** This is a public function: a safe preview pane for raw HTML. */

  // When embedded by an external host, avoid nested iframes.
  const runningInsideForeignIframe =
    typeof window !== 'undefined' &&
    window.top !== window.self &&
    typeof window.name === 'string' &&
    window.name.includes('hosted-preview');

  // Sanitize: remove scripts/iframes/inline event handlers/injections; preserve safe CSS and inline styles.
  const sanitizedHtml = useMemo(() => {
    if (!html || typeof html !== 'string') return '';
    let out = html;

    // Remove any existing <script>...</script> and self-closing scripts
    out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
    out = out.replace(/<script[^>]*\/>/gi, '');

    // Remove any existing <iframe>...</iframe> and self-closing iframes
    out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    out = out.replace(/<iframe[^>]*\/>/gi, '');

    // Remove inline event handlers like onclick, onload, etc.
    out = out.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');

    // Defensive: strip external resource link tags that could inject app UI/toolbars.
    // Preserve inline <style>...</style> content.
    out = out.replace(/<link[^>]+rel=["']?(?:preload|modulepreload|stylesheet|prefetch|preconnect)["']?[^>]*>/gi, '');

    // Prevent confusion with our host app root id.
    out = out.replace(/id\s*=\s*["']root["']/gi, 'id="preview-root"');

    // Heuristic: strip toolbars/placeholders possibly injected by an app
    out = out.replace(/<[^>]+(?:data-app-ui|data-preview-toolbar|class=["'][^"']*(?:app-toolbar|preview-toolbar|app-placeholder)[^"']*["'])[^>]*>[\s\S]*?<\/[^>]+>/gi, '');

    return out.trim();
  }, [html]);

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[Preview] embeddedByHost?', runningInsideForeignIframe, 'htmlEmpty?', !sanitizedHtml);
  }

  if (runningInsideForeignIframe) {
    return null;
  }

  const isEmpty = !sanitizedHtml;

  return (
    <div style={{ width: '100%', height }}>
      {isEmpty ? (
        // Empty state OUTSIDE iframe
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
          // Strict sandbox; allow-scripts enables basic inline JS in generated pages if present.
          sandbox="allow-same-origin allow-forms allow-scripts"
          style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', display: 'block' }}
          srcDoc={sanitizedHtml}
        />
      )}
    </div>
  );
}
