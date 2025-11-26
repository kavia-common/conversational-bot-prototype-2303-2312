import React from 'react';

/**
 * PUBLIC_INTERFACE
 * ErrorBoundary
 * Catches render errors and shows a friendly fallback with a reset button.
 */
export default class ErrorBoundary extends React.Component {
  /** This is a public class: wraps children and provides graceful error fallback. */
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error || new Error('Unknown error') };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Caught error:', error, info);
    }
  }

  // PUBLIC_INTERFACE
  reset = () => {
    /** Clears error state to re-render children. */
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--kavia-bg)',
            color: 'var(--kavia-text)',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(720px, 94vw)',
              background: 'var(--kavia-surface)',
              color: 'var(--kavia-text)',
              border: '1px solid var(--kavia-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-md)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span aria-hidden="true">⚠️</span>
              <strong>Something went wrong.</strong>
            </div>
            <div style={{ fontSize: 14, color: 'var(--kavia-muted)', marginBottom: 12 }}>
              An unexpected error occurred while rendering the app.
            </div>
            <button
              type="button"
              onClick={this.reset}
              className="btn btn-primary"
              aria-label="Reset app view"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }
    // eslint-disable-next-line react/prop-types
    return this.props.children;
  }
}
