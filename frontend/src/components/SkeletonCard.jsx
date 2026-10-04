import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm animate-pulse flex flex-col justify-between">
      <div>
        {/* Cover Skeleton */}
        <div className="w-full aspect-[2/3] bg-slate-200 rounded-xl mb-4 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Title & Author Skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded-md w-3/4" />
          <div className="h-3.5 bg-slate-100 rounded-md w-1/2" />
        </div>
      </div>

      {/* Meta/Badge Skeleton */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-3 bg-slate-100 rounded w-16" />
        <div className="h-5 bg-slate-200 rounded-full w-12" />
      </div>
    </div>
  );
}
