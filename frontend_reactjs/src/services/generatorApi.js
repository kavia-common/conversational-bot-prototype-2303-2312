/**
 * PUBLIC_INTERFACE
 * callBackendGenerate
 * Calls backend /api/generate if REACT_APP_API_BASE is set; otherwise returns null.
 *
 * Note: Primary streaming/non-streaming helpers live in src/api/generatorApi.js.
 */
export async function callBackendGenerate(prompt) {
  const base = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  if (!base) return null;
  const url = `${base.replace(/\/+$/, '')}/api/generate`;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[services/callBackendGenerate] POST', url);
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Backend error: ${resp.status} ${text}`);
  }
  return resp.json();
}
