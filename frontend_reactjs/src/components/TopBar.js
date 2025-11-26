import React from 'react';

/**
 * PUBLIC_INTERFACE
 * TopBar renders the chat header containing the app title, theme toggle, and reset button.
 */
export default function TopBar({ theme, onToggleTheme, onReset }) {
  /** This is a public function: top bar control section for the chat sidebar. */
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
      <div style={{ display: 'flex', gap: 8 }}>
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
