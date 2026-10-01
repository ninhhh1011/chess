import { Component } from 'react';
import { AppButton } from '../ui/AppButton';
import { AppSurface } from '../ui/AppSurface';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-4">
          <AppSurface className="w-full max-w-md rounded-[12px] border border-[var(--app-danger)]/40 p-6 text-center shadow-xl">
            <div className="mb-4 text-5xl">😕</div>
            <h1 className="mb-2 text-xl font-bold text-[var(--app-foreground)]">Đã xảy ra lỗi</h1>
            <p className="mb-4 text-xs text-[var(--app-muted)]">
              Rất tiếc, đã có lỗi không mong muốn xảy ra.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-[var(--app-subtle)] hover:text-[var(--app-muted)]">
                  Chi tiết lỗi
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded-[6px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] p-2 text-xs font-mono text-[var(--app-danger)]">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <AppButton onClick={this.handleReset} variant="primary" className="w-full">
              Tải lại trang
            </AppButton>
          </AppSurface>
        </div>
      );
    }

    return this.props.children;
  }
}
