import React, { useMemo, useState } from 'react';
import { useSettings, useSettingsActions } from '../state/settingsStore';
import { useChatState } from '../state/chatStore';

/**
 * PUBLIC_INTERFACE
 * SettingsPanel allows configuring LLM provider (Ollama/OpenAI), model, endpoints and API key (stored in localStorage).
 * - Test Connection will do a lightweight call to backend /api/generate with prompt="ping" and streaming disabled.
 */
export default function SettingsPanel({ onClose }) {
  /** This is a public function: UI for LLM settings configuration. */
  const settings = useSettings();
  const { update } = useSettingsActions();
  const { isGenerating } = useChatState();

  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);

  const apiBase = (process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '').trim();

  const isOpenAI = settings.provider === 'openai';
  const isOllama = settings.provider === 'ollama';

  const isSettingsComplete = useMemo(() => {
    if (isOllama) {
      return Boolean(settings.ollamaBaseUrl && settings.model);
    }
    if (isOpenAI) {
      // We do not send the key to backend unless provider=openai; completeness requires a key present in browser
      return Boolean(settings.openaiApiKey && settings.model);
    }
    return false;
  }, [settings, isOllama, isOpenAI]);

  const handleTest = async () => {
    setTesting(true);
    setTestStatus('');
    try {
      const url = `${apiBase}/api/generate`;
      const body = {
        prompt: 'ping',
        provider: settings.provider,
        model: settings.model
      };
      // For OpenAI, include key in header for backend to proxy; never log the key
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (settings.provider === 'openai' && settings.openaiApiKey) {
        headers['X-OpenAI-Key'] = settings.openaiApiKey;
      }
      // For Ollama, include base URL override in header so backend can call the right host
      if (settings.provider === 'ollama' && settings.ollamaBaseUrl) {
        headers['X-Ollama-Base'] = settings.ollamaBaseUrl;
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        setTestStatus(`❌ Failed: ${text || resp.status}`);
      } else {
        setTestStatus('✅ Connection OK');
      }
    } catch (e) {
      setTestStatus('❌ Network error');
    } finally {
      setTesting(false);
    }
  };

  const field = {
    label: { fontSize: 12, color: 'var(--kavia-muted)', marginBottom: 6, display: 'block' },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid var(--kavia-border)',
      background: 'var(--kavia-surface)',
      color: 'var(--kavia-text)'
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Settings"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1200,
        padding: 16
      }}
    >
      <div
        style={{
          width: 'min(720px, 96vw)',
          background: 'var(--kavia-surface)',
          color: 'var(--kavia-text)',
          border: '1px solid var(--kavia-border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          padding: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #F59E0B, #2563EB)'
            }} />
            <strong>Settings</strong>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 12 }}>
              {isSettingsComplete ? 'Ready' : 'Incomplete'}
            </span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="btn btn-ghost"
            aria-label="Close settings"
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={field.label}>Provider</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => update({ provider: 'ollama' })}
                aria-pressed={settings.provider === 'ollama'}
                title="Local Ollama"
                style={{
                  borderColor: settings.provider === 'ollama' ? 'var(--kavia-primary)' : 'var(--kavia-border)'
                }}
                disabled={isGenerating}
              >
                🐪 Ollama
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => update({ provider: 'openai' })}
                aria-pressed={settings.provider === 'openai'}
                title="OpenAI (proxied by backend)"
                style={{
                  borderColor: settings.provider === 'openai' ? 'var(--kavia-primary)' : 'var(--kavia-border)'
                }}
                disabled={isGenerating}
              >
                🧠 OpenAI
              </button>
            </div>
          </div>

          <div>
            <label style={field.label}>Model</label>
            <input
              style={field.input}
              placeholder={settings.provider === 'openai' ? 'e.g., gpt-4o-mini' : 'e.g., llama3'}
              value={settings.model || ''}
              onChange={(e) => update({ model: e.target.value })}
              disabled={isGenerating}
            />
          </div>

          {settings.provider === 'ollama' && (
            <div>
              <label style={field.label}>Ollama Base URL</label>
              <input
                style={field.input}
                placeholder="http://localhost:11434"
                value={settings.ollamaBaseUrl || ''}
                onChange={(e) => update({ ollamaBaseUrl: e.target.value })}
                disabled={isGenerating}
              />
              <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>
                Backend will use this base URL override for requests to your local Ollama.
              </div>
            </div>
          )}

          {settings.provider === 'openai' && (
            <div>
              <label style={field.label}>OpenAI API Key</label>
              <input
                style={field.input}
                type="password"
                placeholder="sk-..."
                value={settings.openaiApiKey || ''}
                onChange={(e) => update({ openaiApiKey: e.target.value })}
                disabled={isGenerating}
              />
              <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>
                Stored only in your browser and sent to backend only when provider is OpenAI for proxying.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleTest}
              disabled={!apiBase || testing || !isSettingsComplete}
              title={apiBase ? '' : 'Backend not configured (REACT_APP_API_BASE)'}
            >
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            <span className="text-muted" style={{ fontSize: 12 }}>
              {apiBase ? `Backend: ${apiBase}` : 'Backend not configured'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12 }}>{testStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
