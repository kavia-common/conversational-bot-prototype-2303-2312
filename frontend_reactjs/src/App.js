import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Preview from './Preview';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import { ChatProvider, useChatActions, useChatState } from './state/chatStore';
import { generateSiteFromPrompt, sanitizeGeneratedHtml } from './utils/generation';
import useTypingIndicator from './hooks/useTypingIndicator';
import useApiClient from './hooks/useApiClient';

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

  // API client hook: determines whether API is configured and provides methods
  const { useApi, apiBase, sendMessage, streamMessage } = useApiClient();

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
      if (useApi) {
        // Use API client. Prefer streaming to give UX parity if backend supports it.
        let finalHtml = '';
        let appendedFinal = false;

        await streamMessage(baseMessages, (delta) => {
          // delta: { role, content, done, html?, error? }
          if (delta?.done) {
            // finalize: set HTML if provided and append final assistant message once
            if (typeof delta.html === 'string' && delta.html) {
              finalHtml = delta.html;
              setHtml(delta.html);
            }
            stopTyping();
            if (!appendedFinal) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content:
                    typeof delta?.content === 'string' && delta.content
                      ? delta.content
                      : 'Preview updated.'
                }
              ]);
              appendedFinal = true;
            }
          } else if (typeof delta?.content === 'string') {
            // Show streaming indicator text
            // Use typing hook already animating; we won't append intermediate chunks to the list to keep UI simple
          }
        });

        // If stream didn't produce html, attempt non-stream send as fallback
        if (!finalHtml) {
          const result = await sendMessage(baseMessages);
          if (typeof result?.html === 'string') {
            setHtml(result.html);
          }
          if (Array.isArray(result?.messages)) {
            setMessages(result.messages);
          } else {
            // Ensure we append an assistant ack to preserve previous behavior
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content:
                  'Preview updated. You can refine with follow-up prompts like "make it dark", "add a contact section", or "add portfolio projects".'
              }
            ]);
          }
          if (result?.error) {
            setError(result.error);
          }
          stopTyping();
        }
      } else {
        // Client-only mode: preserve existing behavior
        await simulateThinking(600, 1400);

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
      }
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
    <div className="App">
      {/* Sidebar - Chat */}
      <aside className="app-sidebar" aria-label="Chat panel">
        <div className="app-topbar">
          <TopBar theme={theme} onToggleTheme={toggleTheme} onReset={handleReset} />
        </div>
        <div className="app-messages" aria-label="Chat history">
          <MessageList messages={renderedMessages} isGenerating={isGenerating && !isTyping} />
        </div>
        <div className="app-chat-form">
          <ChatInput
            input={input}
            setInput={setInput}
            isGenerating={isGenerating}
            error={error}
            useApi={useApi}
            apiBase={apiBase}
            onSubmit={onSubmit}
          />
        </div>
      </aside>

      {/* Main Canvas - Preview */}
      <main className="app-main" aria-label="Preview panel">
        <div className="preview-header" role="group" aria-label="Preview header">
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
          {/* Remove verbose helper text to avoid any leftover header/spacing within preview area */}
          <div className="text-muted" aria-live="polite" style={{ fontSize: 13 }}>
            {/* Keep concise to avoid clutter near preview */}
          </div>
        </div>

        <div className="preview-canvas">
          <div className="preview-frame">
            <Preview html={previewSrcDoc} height="calc(100vh - 64px - 32px)" />
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
