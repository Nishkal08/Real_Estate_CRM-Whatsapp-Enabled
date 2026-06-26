import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Global Error Boundary — catches render crashes and shows recovery UI
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          background: 'var(--bg-glass-strong)',
          border: '1px solid var(--border-glass)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: 'var(--shadow-float)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--danger-bg)', color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertTriangle size={22} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: 8,
          }}>
            Something went wrong
          </h2>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.6 }}>
            An unexpected error occurred in this section.
          </p>

          {this.state.errorMessage && (
            <p style={{
              fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              background: 'var(--bg-surface)', padding: '8px 12px',
              borderRadius: 8, marginBottom: 20, wordBreak: 'break-all',
            }}>
              {this.state.errorMessage}
            </p>
          )}

          <button
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.reload();
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}
          >
            <RefreshCw size={14} />
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
