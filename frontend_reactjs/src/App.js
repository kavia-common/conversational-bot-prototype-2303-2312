import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Preview from './Preview';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import { ChatProvider, useChatActions, useChatState } from './state/chatStore';
import { generateSiteFromPrompt, sanitizeGeneratedHtml } from './utils/generation';
import useTypingIndicator from './hooks/useTypingIndicator';

/**
 * Ocean Professional theme colors and simple design tokens.
 * These are used in inline styles to complement the base CSS file.
 */
const THEME = {
  primary: '#2563EB', // blue
  secondary: '#F59E0B', // amber
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  subtle: '#6b7280',
  border: 'rgba(17, 24, 39, 0.08)',
  gradient: 'linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(249, 250, 251, 0))'
};

/**
 * Small utility for safe HTML injection into iframe by setting srcdoc.
 * No external JS execution needed for this prototype.
 */
function useIFrameSrcDoc(html) {
  const [srcDoc, setSrcDoc] = useState('');
  useEffect(() => {
    setSrcDoc(html || '');
  }, [html]);
  return srcDoc;
}

/** Local component which consumes the store and renders the UI. */
function AppInner() {
  const { messages, currentHtml, isGenerating, error, theme } = useChatState();
  const { setMessages, setHtml, setGenerating, setError, setTheme, reset } = useChatActions();
  const [input, setInput] = useState('');

  // Typing indicator for assistant streaming UX
  const { isTyping, indicatorText, startTyping, stopTyping } = useTypingIndicator();

  // Read API base from env; normalize to a string and avoid mixing ?? with logical operators
  const envApi = process.env.REACT_APP_API_BASE;
  const apiBase = typeof envApi === 'string' ? envApi : '';
  const useApi = (typeof apiBase === 'string' && apiBase.trim().length > 0);

  const previewSrcDoc = useIFrameSrcDoc(currentHtml);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Validate input
  const validate = (text) => {
    if (!text || !text.trim()) return 'Please enter a prompt.';
    if (text.length > 600) return 'Prompt is too long. Keep it under 600 characters.';
    return '';
  };

  const simulateThinking = async (minMs = 500, maxMs = 1200) => {
    // Randomized delay to feel more natural
    const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((r) => setTimeout(r, jitter));
  };

  const handleGenerate = async (nextPrompt) => {
    const err = validate(nextPrompt);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setGenerating(true);

    // Append user message
    const userMsg = { role: 'user', content: nextPrompt.trim() };
    const baseMessages = [...messages, userMsg];
    setMessages(baseMessages);

    // Start assistant typing indicator
    startTyping({ baseText: 'Assistant is typing', intervalMs: 300, maxDots: 3, minDurationMs: 900 });

    try {
      // Simulate some "thinking" time and generation work
      await simulateThinking(600, 1400);

      // Generate preview HTML locally (client mode)
      const html = generateSiteFromPrompt(nextPrompt.trim(), {});
      const sanitized = sanitizeGeneratedHtml(html);
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[App] Setting preview HTML. length=', sanitized?.length || 0);
      }
      setHtml(sanitized);

      // Stop typing before posting the final message (respects min duration)
      stopTyping();

      // Append assistant final message
      const botAck = {
        role: 'assistant',
        content:
          'Preview updated. You can refine with follow-up prompts like "make it dark", "add a contact section", or "add portfolio projects".'
      };
      setMessages([...baseMessages, botAck]);
    } catch (e) {
      setError('Failed to generate preview. Please try again.');
    } finally {
      // Keep button disabled only while "generating". Typing is handled separately.
      setGenerating(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const text = input;
    setInput('');
    await handleGenerate(text);
  };

  const handleReset = () => {
    reset();
  };

  // Note: We do not hide the preview just because we are in any iframe.
  const isInIframe = typeof window !== 'undefined' && window.top !== window.self;

  // Derive a temporary "typing" message that appears only while the hook is typing.
  const renderedMessages = useMemo(() => {
    if (!isTyping) return messages;
    return [...messages, { role: 'assistant', content: indicatorText }];
  }, [messages, isTyping, indicatorText]);

  return (
    <div
      className="App"
      style={{
        minHeight: '100vh',
        background: THEME.background,
        color: THEME.text,
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 360px) 1fr',
        gap: 0
      }}
    >
      {/* Sidebar - Chat */}
      <aside
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: THEME.surface,
          borderRight: `1px solid ${THEME.border}`,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <TopBar theme={theme} onToggleTheme={toggleTheme} onReset={handleReset} />
        <MessageList messages={renderedMessages} isGenerating={isGenerating && !isTyping} />
        <ChatInput
          input={input}
          setInput={setInput}
          isGenerating={isGenerating}
          error={error}
          useApi={useApi}
          apiBase={apiBase}
          onSubmit={onSubmit}
        />
      </aside>

      {/* Main Canvas - Preview */}
      <main
        style={{
          minHeight: '100vh',
          background: THEME.background,
          display: 'grid',
          gridTemplateRows: '64px 1fr'
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: `1px solid ${THEME.border}`,
            background: THEME.surface
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #F59E0B, #2563EB)'
              }}
            />
            <strong>Live Preview</strong>
          </div>
          <div style={{ color: THEME.subtle, fontSize: 13 }}>
            Sandboxed iframe preview updates with each prompt.
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(17,24,39,0.06)',
              transition: 'box-shadow .2s ease'
            }}
          >
            <Preview
              html={previewSrcDoc}
              height="calc(100vh - 64px - 32px)"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Main App provider wrapper.
 */
function App() {
  /** This is a public function - wraps the app with the ChatProvider. */
  return (
    <ChatProvider>
      <AppInner />
    </ChatProvider>
  );
}

export default App;
