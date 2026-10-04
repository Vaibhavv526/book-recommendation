import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen, Sparkles } from 'lucide-react';

export default function BookCard({ book }) {
  const [imageError, setImageError] = useState(false);

  if (!book) return null;

  const isbn = book.isbn || book.id;
  const title = book.title || 'Untitled Book';
  const author = book.author || 'Unknown Author';
  const imageUrl = book.image_url_m || book.image_url;
  const rating = book.avg_rating;
  const numRatings = book.num_ratings;
  const year = book.year;
  const isCollab = book.in_collaborative_model;

  return (
    <Link
      to={`/book/${encodeURIComponent(isbn)}`}
      className="group bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Book Cover Container */}
        <div className="w-full aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-3.5 overflow-hidden relative shadow-inner flex items-center justify-center">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-slate-400 text-center">
              <BookOpen className="w-10 h-10 mb-2 stroke-1" />
              <span className="text-xs font-medium line-clamp-2 text-slate-500">{title}</span>
            </div>
          )}

          {/* Collaborative Model Tag */}
          {isCollab && (
            <div className="absolute top-2.5 right-2.5 bg-indigo-600/90 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-300" />
              AI Rec
            </div>
          )}
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
        </div>
      </div>

      {/* Footer Meta */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        {rating !== undefined && rating !== null ? (
          <div className="flex items-center gap-1 font-medium text-amber-600">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
            {numRatings !== undefined && (
              <span className="text-[11px] text-slate-400 font-normal">({numRatings})</span>
            )}
          </div>
        ) : year ? (
          <span className="text-[11px] text-slate-400">{year}</span>
        ) : (
          <span className="text-[11px] text-slate-400">View details</span>
        )}

        <span className="text-[11px] font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          Details →
        </span>
      </div>
    </Link>
  );
}
