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
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 10
      }}
      aria-live="polite"
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 12px',
          borderRadius: 14,
          background: isUser ? THEME.primary : THEME.surface,
          color: isUser ? '#fff' : THEME.text,
          border: isUser ? 'none' : `1px solid ${THEME.border}`,
          boxShadow: isUser
            ? '0 8px 20px rgba(37,99,235,0.25)'
            : '0 6px 16px rgba(17,24,39,0.04)'
        }}
      >
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const hasAssistantTyping = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && typeof messages[messages.length - 1]?.content === 'string' && /typing|thinking/i.test(messages[messages.length - 1].content);

  return (
    <div
      style={{
        padding: 16,
        overflowY: 'auto',
        flex: 1
      }}
      aria-label="Chat history"
    >
      {messages.map((m, idx) => (
        <ChatMessage key={idx} role={m.role} content={m.content} />
      ))}
      {/* Fallback "Thinking..." only if generating and no explicit typing message is present */}
      {isGenerating && !hasAssistantTyping && <ChatMessage role="assistant" content="Thinking..." />}
      <div ref={chatEndRef} />
    </div>
  );
}
