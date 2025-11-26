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
    <form onSubmit={onSubmit}>
      <label htmlFor="prompt" style={{ display: 'none' }}>
        Prompt
      </label>
      <div className="app-chat-input">
        <input
          id="prompt"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g., "Create a dark SaaS landing with features, articles, and contact"'
          aria-label="Enter your prompt"
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="btn btn-primary"
          aria-label="Send prompt"
          title={isGenerating ? 'Generating...' : 'Send'}
        >
          {isGenerating ? 'Generating...' : 'Send'}
        </button>
      </div>
      {error ? (
        <div role="alert" style={{ color: THEME.error, marginTop: 8, fontSize: 13 }}>
          {error}
        </div>
      ) : null}
      {useApi ? (
        <div className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>
          Using API base: {apiBase}
        </div>
      ) : (
        <div className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>
          Running in client-only mode. Set REACT_APP_API_BASE to integrate a backend later.
        </div>
      )}
    </form>
  );
}
