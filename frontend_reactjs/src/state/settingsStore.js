import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const LS_KEY = 'proto-bot-llm-settings-v1';

const defaultSettings = {
  provider: 'ollama', // 'ollama' | 'openai'
  ollamaBaseUrl: 'http://localhost:11434',
  model: 'llama3', // default model; user can override
  openaiApiKey: '' // stored only in browser; not sent unless provider=openai
};

const ACTIONS = {
  INIT: 'INIT',
  UPDATE: 'UPDATE',
  RESET: 'RESET'
};

function loadSettings() {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { ...defaultSettings };
    const data = JSON.parse(raw);
    const out = {
      provider: data?.provider === 'openai' ? 'openai' : 'ollama',
      ollamaBaseUrl: typeof data?.ollamaBaseUrl === 'string' ? data.ollamaBaseUrl : defaultSettings.ollamaBaseUrl,
      model: typeof data?.model === 'string' ? data.model : defaultSettings.model,
      openaiApiKey: typeof data?.openaiApiKey === 'string' ? data.openaiApiKey : ''
    };
    return out;
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(s) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      provider: s?.provider === 'openai' ? 'openai' : 'ollama',
      ollamaBaseUrl: typeof s?.ollamaBaseUrl === 'string' ? s.ollamaBaseUrl : defaultSettings.ollamaBaseUrl,
      model: typeof s?.model === 'string' ? s.model : defaultSettings.model,
      openaiApiKey: typeof s?.openaiApiKey === 'string' ? s.openaiApiKey : ''
    };
    window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.INIT:
      return { ...state, ...(action.payload || {}) };
    case ACTIONS.UPDATE: {
      const next = { ...state, ...(action.payload || {}) };
      return next;
    }
    case ACTIONS.RESET:
      return { ...defaultSettings };
    default:
      return state;
  }
}

const SettingsStateContext = createContext(undefined);
const SettingsDispatchContext = createContext(undefined);

/**
 * PUBLIC_INTERFACE
 * SettingsProvider wraps app to expose LLM settings state.
 */
export function SettingsProvider({ children }) {
  /** This is a public function: provides LLM settings via context. */
  const [state, dispatch] = useReducer(reducer, defaultSettings);

  useEffect(() => {
    const initial = loadSettings();
    dispatch({ type: ACTIONS.INIT, payload: initial });
  }, []);

  useEffect(() => {
    saveSettings(state);
  }, [state]);

  const stateValue = useMemo(() => state, [state]);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);

  return (
    <SettingsStateContext.Provider value={stateValue}>
      <SettingsDispatchContext.Provider value={dispatchValue}>
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsStateContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useSettings returns the LLM settings.
 */
export function useSettings() {
  /** Public function: access settings state */
  const ctx = useContext(SettingsStateContext);
  if (ctx === undefined) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * useSettingsActions returns update/reset helpers.
 */
export function useSettingsActions() {
  /** Public function: helpers to update or reset settings */
  const dispatch = useContext(SettingsDispatchContext);
  if (dispatch === undefined) throw new Error('useSettingsActions must be used within SettingsProvider');

  return {
    update(partial) {
      dispatch({ type: ACTIONS.UPDATE, payload: partial });
    },
    reset() {
      dispatch({ type: ACTIONS.RESET });
    }
  };
}
