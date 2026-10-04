import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Search, BookOpen, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { getRecommendations } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorAlert from '../components/ErrorAlert';

const QUICK_PICKS = [
  '1984',
  'Animal Farm',
  'The Fellowship of the Ring (The Lord of the Rings, Part 1)',
  'Harry Potter and the Chamber of Secrets (Book 2)',
  'Brave New World',
  'The Catcher in the Rye'
];

export default function RecommendPage() {
  const [searchParams] = useSearchParams();
  const [inputVal, setInputVal] = useState(searchParams.get('title') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchRecommendations = async (targetQuery) => {
    const q = (targetQuery || inputVal).trim();
    if (!q) {
      setError('Please enter a book title or ISBN to get recommendations.');
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
      if (resData?.error === 'book_not_in_recommender') {
        setError({
          type: 'not_in_recommender',
          title: 'Not in Collaborative Matrix',
          message: resData.message || 'This book is in the catalogue, but not currently in the collaborative filtering model.',
          book: resData.book
        });
      } else {
        setError({
          type: 'general',
          title: 'Book Not Found',
          message: resData?.message || 'Sorry, this book was not found in our recommendation database. Please check spelling or try a popular title.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const titleParam = searchParams.get('title');
    if (titleParam) {
      setInputVal(titleParam);
      fetchRecommendations(titleParam);
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRecommendations();
  };

  const handleQuickPick = (title) => {
    setInputVal(title);
    fetchRecommendations(title);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Collaborative Filtering Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find Books Similar to Your Favorites
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Our collaborative filtering model analyzes reading patterns across thousands of readers to find high-affinity book recommendations.
        </p>
      </div>

      {/* Input Form */}
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter book title (e.g. 1984, Animal Farm)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm sm:text-base shadow-sm shadow-indigo-200 transition-colors shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Recommend
              </>
            )}
          </button>
        </form>

        {/* Quick Picks */}
        <div className="pt-2">
          <span className="text-xs font-medium text-slate-400 block mb-2">
            Try a popular collaborative model title:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => handleQuickPick(pick)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
              >
                {pick}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error / Not in Model Alert */}
      {error && (
        <div className="max-w-2xl mx-auto">
          {typeof error === 'object' && error.type === 'not_in_recommender' ? (
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                {error.title}
              </div>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                {error.message}
              </p>
              {error.book && (
                <div className="pt-2 text-xs text-amber-700">
                  Book found in catalogue: <span className="font-semibold">{error.book.title}</span> by {error.book.author}
                </div>
              )}
            </div>
          ) : (
            <ErrorAlert
              title={typeof error === 'object' ? error.title : 'Recommendation Request Failed'}
              message={typeof error === 'object' ? error.message : error}
            />
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 max-w-5xl mx-auto pt-4">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {!loading && result && (
        <div className="space-y-8 max-w-5xl mx-auto pt-4">
          {/* Source Book Banner */}
          {result.source_book && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Recommendations Based On:
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {result.source_book.title}
                  </h3>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200">
                {result.count} high-confidence matches
              </span>
            </div>
          )}

          {/* Recommended Books Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {result.recommendations?.map((recBook) => (
              <BookCard key={recBook.id || recBook.isbn} book={recBook} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
