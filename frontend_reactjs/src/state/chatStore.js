import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { loadSession, saveSession, clearSession } from '../utils/persistence';

/**
 * Chat store using Context + Reducer pattern.
 * Manages:
 * - messages: [{role, content}]
 * - currentHtml: string
 * - isGenerating: boolean
 * - error: string
 * - theme: 'light' | 'dark'
 * - settings: object (reserved for future)
 */

/** Initial assistant message to seed new sessions */
export const INITIAL_ASSISTANT_MESSAGE = {
  role: 'assistant',
  content:
    'Describe the website you want to prototype. For example: "Create a dark SaaS landing page with pricing and contact."'
};

/** Default initial state */
const initialState = {
  messages: [INITIAL_ASSISTANT_MESSAGE],
  currentHtml: '',
  isGenerating: false,
  error: '',
  theme: 'light',
  settings: {}
};

/** Action types */
export const ACTIONS = {
  INIT_FROM_STORAGE: 'INIT_FROM_STORAGE',
  SET_MESSAGES: 'SET_MESSAGES',
  SET_HTML: 'SET_HTML',
  SET_GENERATING: 'SET_GENERATING',
  SET_ERROR: 'SET_ERROR',
  SET_THEME: 'SET_THEME',
  RESET: 'RESET'
};

function reduce(state, action) {
  switch (action.type) {
    case ACTIONS.INIT_FROM_STORAGE: {
      // Merge persisted with defaults
      const persisted = action.payload || {};
      return {
        ...state,
        ...persisted,
        // Ensure minimal shape and defaults
        messages: Array.isArray(persisted.messages) && persisted.messages.length > 0 ? persisted.messages : state.messages,
        currentHtml: typeof persisted.currentHtml === 'string' ? persisted.currentHtml : state.currentHtml,
        theme: persisted.theme === 'dark' ? 'dark' : 'light'
      };
    }
    case ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload || [] };
    case ACTIONS.SET_HTML:
      return { ...state, currentHtml: typeof action.payload === 'string' ? action.payload : '' };
    case ACTIONS.SET_GENERATING:
      return { ...state, isGenerating: !!action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: typeof action.payload === 'string' ? action.payload : '' };
    case ACTIONS.SET_THEME:
      return { ...state, theme: action.payload === 'dark' ? 'dark' : 'light' };
    case ACTIONS.RESET:
      return { ...initialState };
    default:
      return state;
  }
}

const ChatStateContext = createContext(undefined);
const ChatDispatchContext = createContext(undefined);

/**
 * PUBLIC_INTERFACE
 * ChatProvider wraps the app and exposes chat state and dispatcher.
 */
export function ChatProvider({ children }) {
  /** This is a public function: Provider for chat state and actions. */
  const [state, dispatch] = useReducer(reduce, initialState);

  // Initialize from storage once
  useEffect(() => {
    const persisted = loadSession();
    if (persisted) {
      dispatch({ type: ACTIONS.INIT_FROM_STORAGE, payload: persisted });
    }
  }, []);

  // Persist selected state parts on change
  useEffect(() => {
    saveSession({
      messages: state.messages,
      currentHtml: state.currentHtml,
      theme: state.theme
    });
  }, [state.messages, state.currentHtml, state.theme]);

  // Apply theme to document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
  }, [state.theme]);

  // Memoize context values
  const stateValue = useMemo(() => state, [state]);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);

  return (
    <ChatStateContext.Provider value={stateValue}>
      <ChatDispatchContext.Provider value={dispatchValue}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useChatState returns the store state.
 */
export function useChatState() {
  /** This is a public function: get chat state from context. */
  const ctx = useContext(ChatStateContext);
  if (ctx === undefined) throw new Error('useChatState must be used within ChatProvider');
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * useChatDispatch returns the store dispatcher.
 */
export function useChatDispatch() {
  /** This is a public function: get chat dispatch from context. */
  const ctx = useContext(ChatDispatchContext);
  if (ctx === undefined) throw new Error('useChatDispatch must be used within ChatProvider');
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * useChatActions returns convenient action dispatchers.
 */
export function useChatActions() {
  /** This is a public function: convenience wrappers for dispatch actions. */
  const dispatch = useChatDispatch();

  return {
    setMessages: (messages) => dispatch({ type: ACTIONS.SET_MESSAGES, payload: messages }),
    setHtml: (html) => dispatch({ type: ACTIONS.SET_HTML, payload: html }),
    setGenerating: (flag) => dispatch({ type: ACTIONS.SET_GENERATING, payload: flag }),
    setError: (msg) => dispatch({ type: ACTIONS.SET_ERROR, payload: msg }),
    setTheme: (theme) => dispatch({ type: ACTIONS.SET_THEME, payload: theme }),
    reset: () => {
      clearSession();
      dispatch({ type: ACTIONS.RESET });
    }
  };
}
