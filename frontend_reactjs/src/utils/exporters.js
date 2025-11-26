/**
// PUBLIC_INTERFACE
// Helpers for exporting generated HTML: copy to clipboard and download file.
// The dedicated preview is now served via the /#/preview route instead of a blob tab.
*/

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
