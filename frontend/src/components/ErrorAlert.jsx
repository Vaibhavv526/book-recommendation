import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export default function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-950 shadow-2xs transition-all animate-in fade-in duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5" aria-hidden="true">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
          <p className="text-sm text-rose-800 mt-0.5 leading-relaxed">{message}</p>

          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Try again
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
