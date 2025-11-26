import React from 'react';
import { useChatState } from '../state/chatStore';

/**
 * PUBLIC_INTERFACE
 * TopBar renders the chat header containing the app title, theme toggle, and reset button.
 * It includes a dedicated Preview button to open the /#/preview route. Export actions were removed.
 */
export default function TopBar({ theme, onToggleTheme, onReset }) {
  /** This is a public function: top bar control section for the chat sidebar. */
  // Defensive guard if context not mounted yet
  let currentHtml = '';
  let isGenerating = false;
  try {
    const state = useChatState();
    currentHtml = typeof state?.currentHtml === 'string' ? state.currentHtml : '';
    isGenerating = !!state?.isGenerating;
  } catch {
    currentHtml = '';
    isGenerating = false;
  }
  const hasHtml = currentHtml.trim().length > 0;
  const previewEnabled = hasHtml && !isGenerating;

  // Navigate to dedicated preview route. Uses hash route (#/preview) to avoid dependency on react-router.
  const handleOpenPreviewRoute = () => {
    if (!previewEnabled) return;
    // Open in a new tab
    const url = `${window.location.origin}${window.location.pathname}#/preview`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const commonBtn = {
    padding: '8px 12px',
    borderRadius: 10,
    fontWeight: 700,
    border: '1px solid var(--kavia-border)',
    background: 'var(--kavia-surface)',
    color: 'var(--kavia-text)',
    cursor: previewEnabled ? 'pointer' : 'not-allowed',
    opacity: previewEnabled ? 1 : 0.6
  };

  return (
    <div
      style={{
        padding: 16,
        borderBottom: '1px solid var(--kavia-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #F59E0B, #2563EB)',
            boxShadow:
              '0 0 0 3px rgba(37,99,235,0.12), 0 6px 20px rgba(37,99,235,0.35)'
          }}
        />
        <strong>Proto Bot</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleOpenPreviewRoute}
          aria-label="Open Preview"
          style={commonBtn}
          type="button"
          disabled={!previewEnabled}
          title={
            previewEnabled
              ? 'Open dedicated preview page'
              : isGenerating
              ? 'Generating… Please wait'
              : 'No preview available yet'
          }
        >
          Preview
        </button>

        {/* Theme + Reset controls */}
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{
            position: 'static',
            padding: '8px 12px',
            borderRadius: 10,
            fontWeight: 700,
            background: 'var(--kavia-primary)',
            color: '#fff',
            border: 'none'
          }}
          type="button"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={onReset}
          aria-label="Reset chat and preview"
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            fontWeight: 700,
            background: 'var(--kavia-surface)',
            color: 'var(--kavia-text)',
            border: '1px solid var(--kavia-border)'
          }}
          type="button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
