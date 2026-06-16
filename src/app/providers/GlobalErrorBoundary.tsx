import { Component, ErrorInfo, ReactNode } from 'react';
import {
  DEFAULT_APP_ERROR_MESSAGE,
  logAppError,
  notifyAppError,
} from '@/core/telemetry/error.service';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void notifyAppError(error, {
      userMessage: DEFAULT_APP_ERROR_MESSAGE,
      screen: 'App',
      component: 'GlobalErrorBoundary',
    });
    void logAppError(error, {
      screen: 'App',
      component: 'GlobalErrorBoundary',
      action: 'componentDidCatch',
      componentStack: info.componentStack ?? undefined,
      userMessage: DEFAULT_APP_ERROR_MESSAGE,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg px-6 py-12 text-center text-text">
          <div className="mx-auto max-w-sm rounded-[16px] border border-border bg-surface p-5">
            <h1 className="text-[18px] font-bold">Ứng dụng gặp sự cố</h1>
            <p className="mt-2 text-[14px] text-muted">{DEFAULT_APP_ERROR_MESSAGE}</p>
            <button
              type="button"
              className="mt-4 rounded-[12px] bg-primary px-4 py-2 text-[14px] font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
