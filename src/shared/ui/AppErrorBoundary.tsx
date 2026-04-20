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
      <main className="bo-system-screen min-h-0 min-w-0 p-4">
        <section className="bo-card space-y-2" role="alert" aria-live="assertive">
          <h2 className="text-base font-semibold text-danger">{this.props.surfaceLabel} failed to render</h2>
          <p className="text-sm text-textMuted">
            Reload this extension page. If this keeps happening, open Settings and export your workspace backup.
          </p>
        </section>
      </main>
    );
  }
}
