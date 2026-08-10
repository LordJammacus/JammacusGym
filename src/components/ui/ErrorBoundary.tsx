import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center bg-black">
          <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-zinc-400 mb-1 max-w-xs">
            The app encountered an unexpected error. Your workout data is safe.
          </p>
          <p className="text-xs text-zinc-600 mb-6 font-mono max-w-xs break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            className="bg-brand text-white px-6 py-3 rounded-lg font-medium min-h-[44px]"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
