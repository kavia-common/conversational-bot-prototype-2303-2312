import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import { ChatProvider, useChatActions, useChatState } from './state/chatStore';
import { generateSiteFromPrompt, sanitizeGeneratedHtml } from './utils/generation';
import useTypingIndicator from './hooks/useTypingIndicator';
import useApiClient from './hooks/useApiClient';

/** Local component which consumes the store and renders the UI (chat-only layout). */
function AppInner() {
  const { messages, isGenerating, error, theme } = useChatState();
  const { setMessages, setHtml, setGenerating, setError, setTheme, reset } = useChatActions();
  const [input, setInput] = useState('');

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
        let finalHtml = '';
        let appendedFinal = false;

        await streamMessage(baseMessages, (delta) => {
          if (delta?.done) {
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
          }
          stopTyping();
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
      }
    } catch (e) {
      setError('Failed to generate preview. Please try again.');
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

  return (
    <div className="App">
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
    <ChatProvider>
      <AppInner />
    </ChatProvider>
  );
}

export default App;
