import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200/90 flex items-center justify-center text-indigo-600 mx-auto shadow-2xs">
        <Compass className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">404 Notice</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Page Not Found</h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          The requested page or book catalogue resource could not be found or has moved.
        </p>
      </div>

      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Explore
        </Link>
      </div>
    </div>
  );
}
