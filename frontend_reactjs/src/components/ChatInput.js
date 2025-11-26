import React from 'react';

const THEME = {
  error: '#EF4444',
  text: '#111827',
  border: 'rgba(17, 24, 39, 0.08)'
};

/**
 * PUBLIC_INTERFACE
 * ChatInput renders the input form for sending prompts, with error display and mode hint.
 */
export default function ChatInput({
  input,
  setInput,
  isGenerating,
  error,
  useApi,
  apiBase,
  onSubmit
}) {
  /** Public function: chat input form with submit and status messaging. */
  return (
    <form onSubmit={onSubmit} style={{ padding: 16, borderTop: `1px solid ${THEME.border}` }}>
      <label htmlFor="prompt" style={{ display: 'none' }}>
        Prompt
      </label>
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: 'var(--kavia-surface)',
          border: `1px solid ${THEME.border}`,
          borderRadius: 14,
          padding: 8
        }}
      >
        <input
          id="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g., "Create a dark SaaS landing with features, articles, and contact"'
          aria-label="Enter your prompt"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'transparent',
            color: THEME.text
          }}
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="btn btn-primary"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: 'none'
          }}
          aria-label="Send prompt"
        >
          {isGenerating ? 'Generating...' : 'Send'}
        </button>
      </div>
      {error ? (
        <div
          role="alert"
          style={{
            color: THEME.error,
            marginTop: 8,
            fontSize: 13
          }}
        >
          {error}
        </div>
      ) : null}
      {useApi ? (
        <div style={{ marginTop: 8, color: 'var(--kavia-muted)', fontSize: 12 }}>
          Using API base: {apiBase}
        </div>
      ) : (
        <div style={{ marginTop: 8, color: 'var(--kavia-muted)', fontSize: 12 }}>
          Running in client-only mode. Set REACT_APP_API_BASE to integrate a backend later.
        </div>
      )}
    </form>
  );
}
