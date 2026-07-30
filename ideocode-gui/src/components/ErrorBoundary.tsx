import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-bg-primary">
          <div className="max-w-md p-6 space-y-4 text-center">
            <div className="text-2xl font-display font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              IDEOCODE
            </div>
            <div className="text-sm text-error font-medium">Something went wrong</div>
            <div className="text-xs text-text-muted font-mono bg-bg-elevated rounded p-3 text-left max-h-32 overflow-y-auto">
              {this.state.error.message}
            </div>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="px-4 py-2 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover transition-fast"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
