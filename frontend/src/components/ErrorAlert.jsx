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
    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 shadow-sm transition-all animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-sm text-rose-700 mt-0.5 leading-relaxed">{message}</p>

          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-rose-400 hover:text-rose-600 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
