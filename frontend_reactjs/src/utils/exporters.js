//
// PUBLIC_INTERFACE
// Helpers for exporting generated HTML: copy to clipboard, download file, and open preview in a new tab.
// These helpers operate on plain strings of HTML and are safe to call from UI components.
//
// Notes:
// - They gracefully handle empty/missing HTML (no-ops with optional console debug in dev).
// - Clipboard copy uses navigator.clipboard when available, with a textarea fallback.
// - Download creates a Blob and uses an anchor click to trigger saving.
// - Open in new tab uses window.open + data URL fallback with Blob for compatibility.
//

/** PUBLIC_INTERFACE */
export async function copyHtmlToClipboard(html) {
  /** Copies provided HTML string to the system clipboard. */
  try {
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[exporters.copyHtmlToClipboard] No HTML to copy');
      }
      return false;
    }

    // Prefer modern clipboard API
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(html);
      return true;
    }

    // Fallback using a hidden textarea
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

/** PUBLIC_INTERFACE */
export function downloadHtml(html, filename = 'prototype.html') {
  /** Triggers a browser download of the provided HTML as a .html file. */
  try {
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[exporters.downloadHtml] No HTML to download');
      }
      return false;
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'prototype.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    return true;
  } catch {
    return false;
  }
}

/** PUBLIC_INTERFACE */
export function openPreviewInNewTab(html) {
  /** Opens the provided HTML in a new browser tab for full-window preview. */
  try {
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[exporters.openPreviewInNewTab] No HTML to open');
      }
      return false;
    }

    // Try Blob URL first for larger content compatibility
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');

    if (win) {
      // Cleanup when the new window/tab unloads or immediately if blocked
      const revoke = () => URL.revokeObjectURL(url);
      try {
        win.addEventListener('beforeunload', revoke);
      } catch {
        // Ignore if cross-origin policies prevent adding listeners
        setTimeout(revoke, 30000); // revoke after 30s as a fallback
      }
      return true;
    }

    // Fallback: data URL (may be blocked for very large HTML)
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    const win2 = window.open(dataUrl, '_blank', 'noopener,noreferrer');
    return !!win2;
  } catch {
    return false;
  }
}
