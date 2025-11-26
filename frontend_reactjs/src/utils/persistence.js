const KEY = 'proto-bot-session-v1';

/**
 * PUBLIC_INTERFACE
 * loadSession retrieves persisted session (messages, currentHtml, theme) from localStorage.
 */
export function loadSession() {
  /** Public function: load persisted session from storage. */
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // guard types
    const out = {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      currentHtml: typeof data?.currentHtml === 'string' ? data.currentHtml : '',
      theme: data?.theme === 'dark' ? 'dark' : 'light'
    };
    return out;
  } catch {
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * saveSession persists selected parts of state into localStorage.
 */
export function saveSession(state) {
  /** Public function: save selected state keys to storage. */
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      messages: Array.isArray(state?.messages) ? state.messages : [],
      currentHtml: typeof state?.currentHtml === 'string' ? state.currentHtml : '',
      theme: state?.theme === 'dark' ? 'dark' : 'light'
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore quota or serialization errors
  }
}

/**
 * PUBLIC_INTERFACE
 * clearSession removes persisted state.
 */
export function clearSession() {
  /** Public function: clear saved session from storage. */
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
