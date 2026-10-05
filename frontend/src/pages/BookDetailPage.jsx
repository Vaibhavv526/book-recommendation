import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Building,
  Hash,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  FileText,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { getBookDetails, getSimilarBooks } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorAlert from '../components/ErrorAlert';
import { RecommendationStrategyBanner } from '../components/RecommendationBadge';

export default function BookDetailPage() {
  const { isbn } = useParams();
  const [book, setBook] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [similarEngine, setSimilarEngine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [copiedIsbn, setCopiedIsbn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBookData() {
      if (!isbn) return;
      setLoading(true);
      setError(null);
      setImageError(false);
      setSimilarBooks([]);
      setSimilarEngine(null);

      try {
        const bookData = await getBookDetails(isbn);
        if (!isMounted) return;
        setBook(bookData);

        // If book is in collaborative model, fetch similar books
        if (bookData.in_collaborative_model) {
          setLoadingSimilar(true);
          try {
            const similarData = await getSimilarBooks(isbn);
            if (isMounted) {
              setSimilarBooks(similarData.recommendations || []);
              setSimilarEngine(similarData.engine || null);
            }
          } catch (simErr) {
            console.warn('Could not load similar books:', simErr);
          } finally {
            if (isMounted) setLoadingSimilar(false);
          }
        }
      } catch (err) {
        console.error('Error fetching book detail:', err);
        if (isMounted) {
          setError(
            err.response?.data?.message ||
            `Failed to load book details for ISBN "${isbn}".`
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBookData();

    return () => {
      isMounted = false;
    };
  }, [isbn]);

  const handleCopyIsbn = () => {
    const raw = book?.isbn || book?.id;
    if (raw) {
      navigator.clipboard?.writeText(String(raw));
      setCopiedIsbn(true);
      setTimeout(() => setCopiedIsbn(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-pulse space-y-8">
        <div className="h-5 bg-slate-200 rounded w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="aspect-[2/3] bg-slate-200 rounded-xl" />
          <div className="md:col-span-2 space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-5 bg-slate-100 rounded w-1/2" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <ErrorAlert
          title="Book Not Found"
          message={error || 'The requested book metadata could not be loaded.'}
        />
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Explore
        </Link>
      </div>
    );
  }

  // Priority: image_url_l -> image_url_m -> image_url
  const coverUrl = book.image_url_l || book.image_url_m || book.image_url;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalogue
        </Link>
      </div>

      {/* Main Book Detail Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[260px] aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden shadow-md border border-slate-200/80 flex items-center justify-center">
              {coverUrl && !imageError ? (
                <img
                  src={coverUrl}
                  alt={`Cover of ${book.title} by ${book.author}`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                  <BookOpen className="w-16 h-16 mb-2 stroke-1" />
                  <span className="text-sm font-semibold text-slate-700">{book.title}</span>
                  <span className="text-xs text-slate-500 mt-1">{book.author}</span>
                </div>
              )}
            </div>

            {/* Model Badge */}
            <div className="mt-4 w-full max-w-[260px]">
              {book.in_collaborative_model ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI Collaborative Model Available</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>General Catalogue Title</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {book.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium">
                by <span className="text-slate-900 font-semibold">{book.author}</span>
              </p>
            </div>

            {/* Metadata Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 relative group">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" /> ISBN
                </span>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 break-all">
                    {book.isbn || book.id || 'N/A'}
                  </p>
                  {(book.isbn || book.id) && (
                    <button
                      type="button"
                      onClick={handleCopyIsbn}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label="Copy ISBN"
                      title="Copy ISBN"
                    >
                      {copiedIsbn ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Year
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  {book.year || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" /> Publisher
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                  {book.publisher || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="pt-2 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                External Actions & Discovery
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {/* Amazon Button - Exact search URL contract */}
                {book.amazon_search_url && (
                  <a
                    href={book.amazon_search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Find on Amazon
                    <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                  </a>
                )}

                {/* PDF Google Search Button - Exact Google search contract */}
                {book.pdf_search_url && (
                  <a
                    href={book.pdf_search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-slate-800 hover:bg-slate-900 text-white shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
                  >
                    <FileText className="w-4 h-4" />
                    PDF / Digital Copy
                    <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                  </a>
                )}

                {/* Get Similar Recommendations link */}
                <Link
                  to={`/recommend?title=${encodeURIComponent(book.title)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Find Similar Books
                </Link>
              </div>

              <p className="text-xs text-slate-500">
                * PDF button safely opens a Google search for digital/PDF copies of this book.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Books Section */}
      {book.in_collaborative_model && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Readers Also Enjoyed
              </h2>
            </div>
            {similarBooks.length > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {similarBooks.length} collaborative matches
              </span>
            )}
          </div>

          {/* Strategy Explanation Banner */}
          {similarEngine && (
            <RecommendationStrategyBanner
              engine={similarEngine}
              sourceTitle={book.title}
            />
          )}

          {loadingSimilar && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!loadingSimilar && similarBooks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarBooks.map((simBook, idx) => (
                <BookCard
                  key={simBook.id || simBook.isbn || `${simBook.title}-${idx}`}
                  book={simBook}
                  strategy={similarEngine?.strategy || 'collaborative'}
                />
              ))}
            </div>
          )}

          {!loadingSimilar && similarBooks.length === 0 && (
            <div className="p-6 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
              No direct collaborative matches found for this title.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
