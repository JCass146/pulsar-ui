import React from "react";

/**
 * ErrorBoundary
 *
 * Catches rendering errors in child components and displays a fallback UI
 * instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Benefits:
 * - Prevents blank screens on component errors
 * - Allows graceful error recovery
 * - Logs errors for debugging
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            border: "2px solid #d32f2f",
            borderRadius: "8px",
            backgroundColor: "#ffebee",
          }}
        >
          <h2 style={{ color: "#d32f2f", margin: "0 0 10px 0" }}>
            Application Error
          </h2>
          <p style={{ margin: "0 0 10px 0", color: "#666" }}>
            Something went wrong. Please try refreshing the page.
          </p>
          {this.state.error && (
            <details
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#fff",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#333",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                Error Details
              </summary>
              <pre style={{ margin: "10px 0 0 0", overflow: "auto" }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
