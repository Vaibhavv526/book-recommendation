import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Search, BookOpen, Loader2 } from 'lucide-react';
import { getRecommendations } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorAlert from '../components/ErrorAlert';
import SearchBar from '../components/SearchBar';
import { RecommendationStrategyBanner } from '../components/RecommendationBadge';

const QUICK_PICKS = [
  '1984',
  'Animal Farm',
  'The Fellowship of the Ring',
  'Harry Potter and the Chamber of Secrets',
  'Brave New World',
  'The Catcher in the Rye',
];

export default function RecommendPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputVal, setInputVal] = useState(searchParams.get('title') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeRecommendation = async (targetQuery) => {
    const q = (targetQuery || inputVal).trim();
    if (!q) {
      setError('Please enter a book title to get recommendations.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getRecommendations({ query: q });
      setResult(data);
    } catch (err) {
      console.error('Recommendation API error:', err);
      const resData = err.response?.data;
      setError(
        resData?.message ||
        'Sorry, this book was not found in our recommendation database. Please check spelling or try a popular title.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const titleParam = searchParams.get('title');
    if (!titleParam) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setInputVal(titleParam);
      setLoading(true);
      setError(null);
      setResult(null);

      getRecommendations({ query: titleParam })
        .then((data) => {
          if (isMounted) {
            setResult(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Recommendation API error:', err);
            const resData = err.response?.data;
            setError(
              resData?.message ||
              'Sorry, this book was not found in our recommendation database. Please check spelling or try a popular title.'
            );
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ title: inputVal.trim() });
    } else {
      setError('Please enter a book title to get recommendations.');
    }
  };

  const handleQuickPick = (pickTitle) => {
    setInputVal(pickTitle);
    setSearchParams({ title: pickTitle });
  };

  const handleAutocompleteSelect = (book) => {
    const title = book.title || '';
    setInputVal(title);
    if (title) {
      setSearchParams({ title });
    }
  };

  const sourceBook = result?.source_book;
  const engine = result?.engine;
  const strategy = engine?.strategy || 'collaborative';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/90 text-indigo-700 text-xs font-semibold uppercase tracking-wider shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Hybrid Recommendation Workbench
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find Books Similar to Your Favorites
        </h1>
        <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
          Analyze collaborative reader affinity and thematic catalogue characteristics to discover tailored book recommendations.
        </p>
      </div>

      {/* Input Workbench */}
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Autocomplete-powered Search Bar */}
        <div>
          <label htmlFor="recommend-search-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Search Catalogue or Enter Exact Title
          </label>
          <SearchBar
            id="recommend-search-input"
            placeholder="Type book title (e.g. 1984, Animal Farm, Dune)..."
            onSelectBook={handleAutocompleteSelect}
          />
        </div>

        {/* Or direct freeform query submission */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Or enter title directly..."
              aria-label="Book title for recommendation"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm shadow-2xs transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Recommend
              </>
            )}
          </button>
        </form>

        {/* Quick Picks */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 block mb-2">
            Try a popular model title:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => handleQuickPick(pick)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {pick}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-2xl mx-auto">
          <ErrorAlert
            title="Recommendation Notice"
            message={error}
            onRetry={() => executeRecommendation(inputVal)}
          />
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 max-w-5xl mx-auto pt-2">
          <div className="h-14 bg-slate-200/80 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {!loading && result && (
        <div className="space-y-6 max-w-5xl mx-auto pt-2">
          {/* Strategy Insight Banner */}
          {engine && (
            <RecommendationStrategyBanner
              engine={engine}
              sourceTitle={sourceBook?.title || inputVal}
            />
          )}

          {/* Source Book Summary */}
          {sourceBook && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-14 rounded bg-slate-200 overflow-hidden shrink-0 border border-slate-200/80 flex items-center justify-center">
                  {sourceBook.image_url_m || sourceBook.image_url ? (
                    <img
                      src={sourceBook.image_url_m || sourceBook.image_url}
                      alt={`Cover of ${sourceBook.title}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recommendations Based On:
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {sourceBook.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    by {sourceBook.author || 'Unknown'} {sourceBook.year ? `(${sourceBook.year})` : ''}
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                {result.count} recommendations
              </span>
            </div>
          )}

          {/* Recommended Books Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {result.recommendations?.map((recBook, idx) => (
              <BookCard
                key={recBook.id || recBook.isbn || `${recBook.title}-${idx}`}
                book={recBook}
                strategy={strategy}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
