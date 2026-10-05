import React from 'react';
import { Sparkles, BookOpen, Search, TrendingUp, Star, Info } from 'lucide-react';

const STRATEGY_CONFIG = {
  collaborative: {
    label: 'AI Collaborative',
    explanation: 'Readers who liked this book also liked these.',
    badgeClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
    iconColor: 'text-indigo-600',
    icon: Sparkles,
  },
  content: {
    label: 'Content Match',
    explanation: 'Recommended from similar title and author characteristics.',
    badgeClasses: 'bg-teal-50 text-teal-700 border-teal-200/90',
    iconColor: 'text-teal-600',
    icon: BookOpen,
  },
  content_freeform: {
    label: 'Search Match',
    explanation: 'Matched from your search using title and author similarity.',
    badgeClasses: 'bg-sky-50 text-sky-700 border-sky-200/90',
    iconColor: 'text-sky-600',
    icon: Search,
  },
  content_with_popularity_backfill: {
    label: 'Content + Popular',
    explanation: 'Curated thematic matches supplemented with reader favorites.',
    badgeClasses: 'bg-violet-50 text-violet-700 border-violet-200/90',
    iconColor: 'text-violet-600',
    icon: TrendingUp,
  },
  popularity_fallback: {
    label: 'Popular',
    explanation: 'Popular recommendation from the catalogue.',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200/90',
    iconColor: 'text-amber-600',
    icon: Star,
  },
};

function getStrategyConfig(strategy) {
  if (strategy && STRATEGY_CONFIG[strategy]) {
    return STRATEGY_CONFIG[strategy];
  }
  // Default fallback
  return {
    label: 'Recommendation',
    explanation: 'Recommended based on catalogue discovery.',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    iconColor: 'text-slate-600',
    icon: BookOpen,
  };
}

/**
 * Visual badge for recommendation strategies
 */
export default function RecommendationBadge({
  strategy,
  labelOverride,
  size = 'sm',
  className = '',
}) {
  const config = getStrategyConfig(strategy);
  const Icon = config.icon;
  const label = labelOverride || config.label;

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : size === 'md'
    ? 'text-xs px-2.5 py-1 gap-1.5'
    : 'text-[11px] px-2 py-0.5 gap-1.2';

  const iconSizes = size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs ${config.badgeClasses} ${sizeClasses} ${className}`}
    >
      <Icon className={`${iconSizes} ${config.iconColor} shrink-0`} />
      <span>{label}</span>
    </span>
  );
}

/**
 * Subtle and professional strategy explanation banner
 * Used on RecommendPage and BookDetailPage (Similar Books)
 */
export function RecommendationStrategyBanner({
  engine,
  sourceTitle,
  className = '',
}) {
  if (!engine) return null;

  const strategy = engine.strategy || 'content';
  const config = getStrategyConfig(strategy);
  const fallbackUsed = Boolean(engine.fallback_used);

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <RecommendationBadge strategy={strategy} size="md" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-900 leading-snug">
              {config.explanation}
            </p>
            {sourceTitle && (
              <p className="text-xs text-slate-500">
                Matched against: <span className="font-medium text-slate-700">{sourceTitle}</span>
              </p>
            )}
          </div>
        </div>

        {fallbackUsed && (
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 rounded-lg shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Catalogue popularity fallback applied</span>
          </div>
        )}
      </div>
    </div>
  );
}
