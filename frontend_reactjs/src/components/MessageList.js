import React, { useEffect, useRef } from 'react';

const THEME = {
  primary: '#2563EB',
  surface: '#ffffff',
  text: '#111827',
  border: 'rgba(17, 24, 39, 0.08)'
};

function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`msg ${isUser ? 'user' : 'assistant'}`} aria-live="polite">
      <div className="msg-bubble">
        {content}
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * MessageList renders the scrolling list of chat messages and an optional "Thinking..." placeholder.
 */
export default function MessageList({ messages, isGenerating }) {
  /** Public function: renders chat messages. */
  const chatEndRef = useRef(null);
  const safeMessages = Array.isArray(messages) ? messages : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages, isGenerating]);

  const last = safeMessages.length > 0 ? safeMessages[safeMessages.length - 1] : null;
  const hasAssistantTyping =
    !!last &&
    last?.role === 'assistant' &&
    typeof last?.content === 'string' &&
    /typing|thinking/i.test(last.content);

  return (
    <div
      style={{
        padding: 0,
        overflowY: 'auto',
        flex: 1
      }}
      aria-label="Chat history"
    >
      {safeMessages.map((m, idx) => (
        <ChatMessage key={idx} role={m?.role} content={m?.content} />
      ))}
      {/* Fallback "Thinking..." only if generating and no explicit typing message is present */}
      {isGenerating && !hasAssistantTyping && <ChatMessage role="assistant" content="Thinking..." />}
      <div ref={chatEndRef} />
    </div>
  );
}
