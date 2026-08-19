'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches client-side rendering errors
 * and displays a recoverable fallback UI instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Intentionally no logging — zero-log policy
    void error;
    void errorInfo;
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <main className="min-h-screen w-full bg-[#E2E6EE] flex flex-col items-center justify-center p-6">
          <div
            className="w-full max-w-[440px] rounded-[32px] p-10 text-center"
            style={{
              backgroundColor: '#EFF2F7',
              boxShadow: '16px 16px 40px #CAD2DF, -16px -16px 40px #FFFFFF, inset 1px 1px 2px #FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            <h2
              className="text-xl font-black uppercase mb-3 text-slate-800 tracking-widest"
              style={{ fontFamily: "var(--font-satoshi), 'Helvetica Neue', Helvetica, sans-serif" }}
            >
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              A rendering error occurred. Your keys are safe — nothing was transmitted.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-white cursor-pointer transition-all"
              style={{
                fontFamily: "var(--font-satoshi), 'Helvetica Neue', Helvetica, sans-serif",
                backgroundColor: '#181B22',
                backgroundImage: 'linear-gradient(180deg, #242831 0%, #151820 100%)',
                boxShadow: '6px 6px 16px rgba(166, 177, 198, 0.6), -4px -4px 10px #FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              Retry
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
