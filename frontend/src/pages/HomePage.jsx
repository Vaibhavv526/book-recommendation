import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { getPopularBooks } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import SearchBar from '../components/SearchBar';
import ErrorAlert from '../components/ErrorAlert';

export default function HomePage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPopular = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPopularBooks();
      setBooks(data.books || []);
    } catch (err) {
      console.error('Failed to load popular books:', err);
      setError(
        err.response?.data?.message ||
        'Unable to connect to the book server. Please verify the Flask backend is running on port 5000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopular();
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI-Driven Book Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Discover books you’ll actually{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              love to read
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Search across our catalogue of 270,000+ books or use our collaborative filtering recommender to find stories tailored to your taste.
          </p>

          {/* Hero Search Bar */}
          <div className="pt-2">
            <SearchBar placeholder="Search 270,000+ titles (e.g. 1984, The Hobbit, Harry Potter)..." />
          </div>
        </div>
      </section>

      {/* Main Content / Popular Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Top 50 Popular Books
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Highest rated and most reviewed books across reader communities
            </p>
          </div>

          {!loading && !error && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              Showing {books.length} titles
            </span>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto my-8">
            <ErrorAlert
              title="Failed to Load Popular Books"
              message={error}
              onRetry={fetchPopular}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {books.map((book) => (
              <BookCard key={book.id || book.isbn} book={book} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No books found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Please verify backend connectivity or reload the page.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
