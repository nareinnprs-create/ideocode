import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  /** "fullscreen" (default) replaces the app with a reload screen; "panel"
   * shows a compact, resettable card so a single panel crash does not take
   * down the rest of the UI. */
  variant?: "fullscreen" | "panel";
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
      return this.props.variant === "panel"
        ? this.renderPanel(this.state.error)
        : this.renderFullscreen(this.state.error);
    }
    return this.props.children;
  }

  private renderFullscreen(error: Error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="max-w-md p-6 space-y-4 text-center">
          <div className="text-xl font-semibold text-text-primary">IDEOCODE</div>
          <div className="text-sm text-error font-medium">Something went wrong</div>
          <div className="text-xs text-text-muted font-mono bg-bg-elevated rounded p-3 text-left max-h-32 overflow-y-auto">
            {error.message}
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

  private renderPanel(error: Error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-full max-w-xs p-4 rounded-lg bg-bg-elevated border border-error/30 space-y-3">
          <div className="text-xs font-medium text-error">Panel crashed</div>
          <div className="text-[11px] text-text-muted font-mono max-h-24 overflow-y-auto break-words">
            {error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 text-[11px] bg-accent-primary text-white rounded hover:bg-accent-hover transition-fast"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
