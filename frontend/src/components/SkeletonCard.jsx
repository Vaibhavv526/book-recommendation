import React from 'react';

export default function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs animate-pulse flex flex-col justify-between"
    >
      <div>
        {/* Cover Skeleton with matching 2:3 ratio */}
        <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg mb-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>

        {/* Title & Author Skeleton */}
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-200 rounded w-5/6" />
          <div className="h-3 bg-slate-150 rounded w-1/2" />
        </div>
      </div>

      {/* Meta Footer Skeleton */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="h-3.5 bg-slate-150 rounded w-16" />
        <div className="h-3.5 bg-slate-200 rounded w-12" />
      </div>
    </div>
  );
}
