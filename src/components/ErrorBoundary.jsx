import { Component } from 'react';
import { Button } from '../design-system/primitives';

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
        <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
          <div className="w-full max-w-md rounded-lg border border-rose-500/30 bg-bg-elevated p-6 text-center shadow-xl">
            <div className="mb-4 text-5xl">😕</div>
            <h1 className="mb-2 text-xl font-bold text-text-primary">Đã xảy ra lỗi</h1>
            <p className="mb-4 text-sm text-text-secondary">
              Rất tiếc, đã có lỗi không mong muốn xảy ra.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-secondary">
                  Chi tiết lỗi
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-bg-base p-2 text-xs text-rose-400">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} variant="primary">
              Tải lại trang
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
