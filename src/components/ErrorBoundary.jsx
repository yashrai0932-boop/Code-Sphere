import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service like Sentry or Supabase
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="glass-panel" style={{ padding: '2rem', margin: '1rem', textAlign: 'center', borderColor: '#ff3b30' }}>
          <h2 style={{ color: '#ff3b30', marginBottom: '1rem' }}>Something went wrong.</h2>
          <p style={{ color: 'var(--text-secondary)' }}>This specific component encountered an error, but the rest of the app is still working.</p>
          <button 
            className="btn btn-secondary" 
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
