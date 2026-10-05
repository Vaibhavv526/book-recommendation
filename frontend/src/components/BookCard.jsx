import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen } from 'lucide-react';
import RecommendationBadge from './RecommendationBadge';

export default function BookCard({
  book,
  strategy,
  badge,
  rank,
  reason,
}) {
  const [imageError, setImageError] = useState(false);

  if (!book) return null;

  const rawIsbn = book.isbn || book.id;
  const hasValidIsbn = Boolean(rawIsbn && String(rawIsbn).trim() && String(rawIsbn).trim() !== 'undefined');
  const isbn = hasValidIsbn ? String(rawIsbn).trim() : '';

  const title = book.title || 'Untitled Book';
  const author = book.author || 'Unknown Author';
  const imageUrl = book.image_url_m || book.image_url || book.image_url_l;
  const rating = book.avg_rating;
  const numRatings = book.num_ratings;
  const year = book.year;
  const isCollab = book.in_collaborative_model;

  // Safe navigation: if ISBN is missing, route to /recommend?title=<encoded title>
  const targetUrl = hasValidIsbn
    ? `/book/${encodeURIComponent(isbn)}`
    : `/recommend?title=${encodeURIComponent(title)}`;

  return (
    <Link
      to={targetUrl}
      className="group bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <div>
        {/* Book Cover Container (2:3 aspect ratio) */}
        <div className="w-full aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 overflow-hidden relative border border-slate-100 flex items-center justify-center">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={`Cover of ${title} by ${author}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-slate-400 text-center h-full w-full bg-slate-50 border-l-4 border-l-indigo-400">
              <BookOpen className="w-8 h-8 mb-1.5 text-slate-400 stroke-1" />
              <span className="text-xs font-semibold line-clamp-2 text-slate-700 px-1 leading-tight">
                {title}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                {author}
              </span>
            </div>
          )}

          {/* Ranking Badge (#1 to #50 on popular books) */}
          {rank && (
            <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight shadow-xs">
              #{rank}
            </div>
          )}

          {/* Top-Right Badge Slot */}
          <div className="absolute top-2 right-2">
            {badge ? (
              badge
            ) : strategy ? (
              <RecommendationBadge strategy={strategy} size="xs" />
            ) : isCollab ? (
              <RecommendationBadge strategy="collaborative" size="xs" />
            ) : null}
          </div>
        </div>

        {/* Book Info */}
        <div className="space-y-1">
          <h3
            title={title}
            className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug"
          >
            {title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1">
            by {author}
          </p>

          {/* Optional Recommendation Reason */}
          {reason && (
            <p className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md font-medium line-clamp-1 mt-1 border border-indigo-100">
              {reason}
            </p>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        {rating !== undefined && rating !== null ? (
          <div className="flex items-center gap-1 font-medium text-amber-600">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
            {numRatings !== undefined && (
              <span className="text-[11px] text-slate-500 font-normal">({numRatings})</span>
            )}
          </div>
        ) : year ? (
          <span className="text-[11px] text-slate-500">{year}</span>
        ) : (
          <span className="text-[11px] text-slate-500">View details</span>
        )}

        <span className="text-[11px] font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          Details →
        </span>
      </div>
    </Link>
  );
}
