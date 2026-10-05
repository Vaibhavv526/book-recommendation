import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, BookOpen, Layers } from 'lucide-react';
import { getPopularBooks } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import SearchBar from '../components/SearchBar';
import ErrorAlert from '../components/ErrorAlert';

const QUICK_SEARCH_CHIPS = [
  '1984',
  'To Kill a Mockingbird',
  'The Great Gatsby',
  'Harry Potter',
  'Dune',
];

export default function HomePage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12); // Default to Top 12
  const navigate = useNavigate();

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
    let isMounted = true;

    async function loadData() {
      try {
        const data = await getPopularBooks();
        if (isMounted) {
          setBooks(data.books || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load popular books:', err);
          setError(
            err.response?.data?.message ||
            'Unable to connect to the book server. Please verify the Flask backend is running on port 5000.'
          );
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChipClick = (chipTitle) => {
    navigate(`/recommend?title=${encodeURIComponent(chipTitle)}`);
  };

  const displayedBooks = visibleCount === 'all' ? books : books.slice(0, visibleCount);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-14 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/90 text-indigo-700 text-xs font-semibold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI-Driven Hybrid Book Intelligence
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Discover books you’ll actually{' '}
            <span className="text-indigo-600">
              love to read
            </span>
          </h1>

          {/* Concise Value Proposition */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Search 270,000+ titles or leverage collaborative filtering and thematic content similarity to find your next favorite story.
          </p>

          {/* Hero Search Bar */}
          <div className="pt-2">
            <SearchBar placeholder="Search 270,000+ titles (e.g. 1984, The Hobbit, Harry Potter)..." />
          </div>

          {/* Quick-Search Chips */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-slate-500">Popular searches:</span>
            {QUICK_SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Value Stats Strip */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              270,000+ Catalogue Works
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Collaborative & Thematic Routing
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Instant Recommendations
            </span>
          </div>
        </div>
      </section>

      {/* Main Content / Popular Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Top Popular Books
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Highest rated and most reviewed books in the catalogue
            </p>
          </div>

          {/* View Control: Top 12 | Top 24 | All 50 */}
          {!loading && !error && books.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500">View:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setVisibleCount(12)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    visibleCount === 12
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Top 12
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(24)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    visibleCount === 24
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Top 24
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    visibleCount === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All 50
                </button>
              </div>
            </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && displayedBooks.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayedBooks.map((book, idx) => (
                <BookCard
                  key={book.id || book.isbn || `${book.title}-${idx}`}
                  book={book}
                  rank={idx + 1}
                />
              ))}
            </div>

            {/* Showing status */}
            <div className="text-center text-xs text-slate-500 pt-2">
              Showing {displayedBooks.length} of {books.length} popular titles
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 max-w-md mx-auto">
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
