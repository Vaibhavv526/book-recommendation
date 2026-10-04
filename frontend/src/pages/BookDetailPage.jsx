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
  Loader2
} from 'lucide-react';
import { getBookDetails, getSimilarBooks } from '../services/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorAlert from '../components/ErrorAlert';

export default function BookDetailPage() {
  const { isbn } = useParams();
  const [book, setBook] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBookData() {
      if (!isbn) return;
      setLoading(true);
      setError(null);
      setImageError(false);
      setSimilarBooks([]);

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-pulse space-y-8">
        <div className="h-6 bg-slate-200 rounded w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="aspect-[2/3] bg-slate-200 rounded-2xl" />
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Explore
        </Link>
      </div>
    );
  }

  const coverUrl = book.image_url_l || book.image_url_m || book.image_url;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalogue
        </Link>
      </div>

      {/* Main Book Detail Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[260px] aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 flex items-center justify-center">
              {coverUrl && !imageError ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                  <BookOpen className="w-16 h-16 mb-2 stroke-1" />
                  <span className="text-sm font-medium text-slate-500">{book.title}</span>
                </div>
              )}
            </div>

            {/* Model Badge */}
            <div className="mt-4 w-full max-w-[260px]">
              {book.in_collaborative_model ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI Collaborative Recommendations Available</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>General Catalogue Title</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {book.title}
              </h1>
              <p className="text-lg text-slate-600 font-medium">
                by <span className="text-slate-900">{book.author}</span>
              </p>
            </div>

            {/* Metadata Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> ISBN
                </span>
                <p className="text-sm font-semibold text-slate-800 break-all">{book.isbn || book.id}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Year
                </span>
                <p className="text-sm font-semibold text-slate-800">{book.year || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Building className="w-3 h-3" /> Publisher
                </span>
                <p className="text-sm font-semibold text-slate-800 truncate">{book.publisher || 'Unknown'}</p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="pt-2 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                External Search & Purchase Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                {/* Amazon Button */}
                {book.amazon_search_url && (
                  <a
                    href={book.amazon_search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Find on Amazon
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}

                {/* PDF Google Search Button */}
                {book.pdf_search_url && (
                  <a
                    href={book.pdf_search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    PDF / Digital Copy
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}

                {/* Get Recommendations link */}
                <Link
                  to={`/recommend?title=${encodeURIComponent(book.title)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Get Similar Recommendations
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                * PDF button safely opens a Google search for digital/PDF copies of this book.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Books Section */}
      {book.in_collaborative_model && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Readers Also Enjoyed
              </h2>
            </div>
            {similarBooks.length > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {similarBooks.length} collaborative matches
              </span>
            )}
          </div>

          {loadingSimilar && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!loadingSimilar && similarBooks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {similarBooks.map((simBook) => (
                <BookCard key={simBook.id || simBook.isbn} book={simBook} />
              ))}
            </div>
          )}

          {!loadingSimilar && similarBooks.length === 0 && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
              No direct collaborative matches found for this title.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
