import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, BookOpen, Sparkles, X } from 'lucide-react';
import { searchBooks } from '../services/api';

export default function SearchBar({
  placeholder = 'Search by book title (e.g. 1984, Harry Potter, The Hobbit)...',
  onSelectBook,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchBooks(trimmed, 8);
        setSuggestions(data.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Search suggestion error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (book) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectBook) {
      onSelectBook(book);
    } else {
      navigate(`/book/${encodeURIComponent(book.isbn || book.id)}`);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleFormSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 shadow-sm transition-all"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3">
            Search Matches ({suggestions.length})
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((book) => (
              <button
                key={book.id || book.isbn}
                type="button"
                onClick={() => handleSelect(book)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-12 rounded bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                  {book.image_url ? (
                    <img
                      src={book.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {book.title}
                    </span>
                    {book.in_collaborative_model && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    by {book.author || 'Unknown'} {book.year ? `• ${book.year}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
