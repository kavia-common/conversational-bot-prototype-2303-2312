import React from 'react';

const STYLES = {
  base: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(800px, 92vw)',
    zIndex: 1000,
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(17, 24, 39, 0.12)',
    border: '1px solid var(--kavia-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px'
  },
  success: {
    background: '#f0f9ff',
    borderColor: 'rgba(37, 99, 235, 0.2)',
    color: '#075985'
  },
  error: {
    background: '#fef2f2',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    color: '#7f1d1d'
  },
  info: {
    background: '#f8fafc',
    borderColor: 'rgba(17, 24, 39, 0.08)',
    color: '#111827'
  },
  btn: {
    padding: '6px 10px',
    borderRadius: 8,
    fontWeight: 700,
    border: '1px solid var(--kavia-border)',
    background: 'var(--kavia-surface)',
    color: 'var(--kavia-text)',
    cursor: 'pointer'
  },
  close: {
    padding: '4px 8px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 16
  },
};

/**
 * PUBLIC_INTERFACE
 * NotificationBanner
 * Dismissible banner for success/error/info messages with optional Retry button.
 */
export default function NotificationBanner({ visible, type = 'info', message = '', onClose, onRetry, retryLabel = 'Retry' }) {
  /** This is a public function: global banner for user notifications. */
  if (!visible) return null;

  const styleType = type === 'success' ? STYLES.success : type === 'error' ? STYLES.error : STYLES.info;
  const merged = { ...STYLES.base, ...styleType };

  return (
    <div role="status" aria-live="polite" style={merged}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true">{type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
        <span style={{ fontSize: 14 }}>{message}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {typeof onRetry === 'function' && type === 'error' && (
          <button type="button" onClick={onRetry} style={STYLES.btn} aria-label={retryLabel} title={retryLabel}>
            {retryLabel}
          </button>
        )}
        <button type="button" onClick={onClose} style={STYLES.close} aria-label="Dismiss notification" title="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
