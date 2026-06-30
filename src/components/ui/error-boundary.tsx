"use client";

import { Component, Fragment, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
}

interface State {
  hasError: boolean;
  message: string;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] p-3 sm:p-4 text-center"
          >
            <p className="text-sm font-semibold text-[color:var(--error)]">
              {this.props.message ?? "This page failed to load. Try refreshing."}
            </p>
            <p className="text-xs text-[color:var(--fg-secondary)]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState((s) => ({ hasError: false, message: "", resetKey: s.resetKey + 1 }))}
              className="mt-1 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--muted)]"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
