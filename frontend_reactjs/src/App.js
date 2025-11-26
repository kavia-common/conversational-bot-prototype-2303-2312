import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import NotificationBanner from './components/NotificationBanner.jsx';
import { ChatProvider, useChatActions, useChatState } from './state/chatStore';
import { SettingsProvider } from './state/settingsStore';
import { generateSiteFromPrompt, sanitizeGeneratedHtml } from './utils/generation';
import useTypingIndicator from './hooks/useTypingIndicator';
import useApiClient from './hooks/useApiClient';

/** Local component which consumes the store and renders the UI (chat-only layout). */
function AppInner() {
  const { messages, isGenerating, error, theme } = useChatState();
  const { setMessages, setHtml, setGenerating, setError, setTheme, reset } = useChatActions();
  const [input, setInput] = useState('');
  const [banner, setBanner] = useState({ visible: false, type: 'info', message: '' });
  const [lastPrompt, setLastPrompt] = useState('');

  // Ensure document theme attribute exists early
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const t = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
    }
  }, [theme]);

  // Typing indicator for assistant streaming UX
  const { isTyping, indicatorText, startTyping, stopTyping } = useTypingIndicator();

  // API client hook: determines whether API is configured and provides methods
  const { useApi, apiBase, sendMessage, streamMessage } = useApiClient();

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Validate input
  const validate = (text) => {
    if (!text || !text.trim()) return 'Please enter a prompt.';
    if (text.length > 600) return 'Prompt is too long. Keep it under 600 characters.';
    return '';
  };

  const simulateThinking = async (minMs = 500, maxMs = 1200) => {
    const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((r) => setTimeout(r, jitter));
  };

  const showInfo = (message) => setBanner({ visible: true, type: 'info', message });
  const showSuccess = (message) => setBanner({ visible: true, type: 'success', message });
  const showError = (message) => setBanner({ visible: true, type: 'error', message });
  const hideBanner = () => setBanner((b) => ({ ...b, visible: false }));

  const handleGenerate = async (nextPrompt) => {
    const err = validate(nextPrompt);
    if (err) {
      setError(err);
      showError(err);
      return;
    }
    setError('');
    setGenerating(true);
    setLastPrompt(nextPrompt);
    showInfo('Generating…');

    // Append user message
    const userMsg = { role: 'user', content: nextPrompt.trim() };
    const baseMessages = [...messages, userMsg];
    setMessages(baseMessages);

    // Start assistant typing indicator
    startTyping({ baseText: 'Assistant is typing', intervalMs: 300, maxDots: 3, minDurationMs: 900 });

    try {
      if (useApi) {
        let finalHtml = '';
        let appendedFinal = false;

        let codeBuf = '';
        await streamMessage(baseMessages, (delta) => {
          if (typeof delta?.payload === 'string' && delta?.type === 'code') {
            codeBuf += delta.payload;
          }
          if (delta?.done) {
            if (typeof delta.html === 'string' && delta.html) {
              finalHtml = delta.html;
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.debug('[App] setting currentHtml from stream, length=', delta.html.length);
              }
              setHtml(delta.html);
            } else if (!finalHtml && codeBuf) {
              // Build a simple safe preview container from code
              const safe = codeBuf.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const html = `
                <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <h2 style="margin:0;color:#2563EB;font-size:16px;">Preview (Code not executed)</h2>
                  </div>
                  <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;background:#f9fafb;padding:12px;border-radius:6px;border:1px dashed #e5e7eb;">${safe}</pre>
                </div>
              `;
              finalHtml = html;
              setHtml(html);
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
          }
        });

        if (!finalHtml) {
          const result = await sendMessage(baseMessages);
          if (typeof result?.html === 'string') {
            setHtml(result.html);
          }
          if (Array.isArray(result?.messages)) {
            setMessages(result.messages);
          } else {
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
            showError(`Generation failed: ${result.error}`);
          } else {
            showSuccess('Generation complete');
          }
          stopTyping();
        } else {
          if (!finalHtml || finalHtml.trim().length === 0) {
            showError('Generation failed: empty result');
          } else {
            showSuccess(`Generation complete (${finalHtml.length} chars)`);
          }
        }
      } else {
        await simulateThinking(600, 1400);

        const html = generateSiteFromPrompt(nextPrompt.trim(), {});
        const sanitized = sanitizeGeneratedHtml(html);
        setHtml(sanitized);

        stopTyping();

        const botAck = {
          role: 'assistant',
          content:
            'Preview updated. You can refine with follow-up prompts like "make it dark", "add a contact section", or "add portfolio projects".'
        };
        setMessages([...baseMessages, botAck]);
        showSuccess('Generation complete');
      }
    } catch (e) {
      const msg = e?.message || 'Failed to generate preview. Please try again.';
      setError(msg);
      showError(`Generation failed: ${msg}`);
    } finally {
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

  // Derive a temporary "typing" message that appears only while the hook is typing.
  const renderedMessages = useMemo(() => {
    if (!isTyping) return messages;
    return [...messages, { role: 'assistant', content: indicatorText }];
  }, [messages, isTyping, indicatorText]);

  const onRetry = () => {
    hideBanner();
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  };

  return (
    <div className="App">
      <NotificationBanner
        visible={banner.visible}
        type={banner.type}
        message={banner.message}
        onClose={hideBanner}
        onRetry={banner.type === 'error' ? onRetry : undefined}
        retryLabel="Retry"
      />
      {/* Single-column chat layout (sidebar) */}
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
          <div className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
            {isGenerating ? 'Generating…' : error ? `Generation failed: ${error}` : messages.length > 1 ? 'Generation complete' : ''}
          </div>
        </div>
      </aside>
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
    <SettingsProvider>
      <ChatProvider>
        <AppInner />
      </ChatProvider>
    </SettingsProvider>
  );
}

export default App;
