import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 border border-red-500 rounded bg-red-50 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Something went wrong.</h2>
          <p>{this.props.fallbackMessage || "We're sorry, an unexpected error occurred."}</p>
          {this.state.error && (
            <pre className="mt-2 text-xs whitespace-pre-wrap bg-red-100 p-2 rounded">
              {this.state.error.toString()}
              {this.state.error.stack && `\n${this.state.error.stack.substring(0, 500)}...`}
            </pre>
          )}
           <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try to reload component
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 ml-2 px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
