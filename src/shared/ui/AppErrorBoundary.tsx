import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  surfaceLabel: string;
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[BrandOps] ${this.props.surfaceLabel} crashed.`, error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="bo-mobile-app bo-system-screen min-h-[100dvh] min-w-0 p-4">
        <section className="bo-card mx-auto mt-8 max-w-md space-y-3" role="alert" aria-live="assertive">
          <h2 className="text-h3 text-danger">Something went wrong</h2>
          <p className="text-sm text-textMuted">
            {this.props.surfaceLabel} hit an unexpected error. Try reloading this page. If it keeps happening, open
            Settings (when available) and export a workspace backup.
          </p>
          <button
            type="button"
            className="bo-link"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </button>
        </section>
      </main>
    );
  }
}
