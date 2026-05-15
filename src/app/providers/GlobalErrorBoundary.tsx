import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorScreen } from '@/shared/components/ErrorScreen';
import { logger } from '@/core/telemetry/logger';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Unhandled React render error', error, {
      context: 'GlobalErrorBoundary',
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
