import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, BookOpen, Sparkles, X } from 'lucide-react';
import { searchBooks } from '../services/api';

export default function SearchBar({
  placeholder = 'Search by book title (e.g. 1984, Harry Potter, The Hobbit)...',
  onSelectBook,
  className = '',
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Reset suggestions when query is cleared
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightedIndex(-1);

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
      setHasSearched(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let isSubscribed = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchBooks(trimmed, 8);
        if (isSubscribed) {
          setSuggestions(data.results || []);
          setIsOpen(true);
          setHasSearched(true);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Search suggestion error:', err);
          setSuggestions([]);
          setHasSearched(true);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
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
    if (!book) return;
    setIsOpen(false);
    setQuery('');
    setSuggestions([]);
    setHighlightedIndex(-1);

    if (onSelectBook) {
      onSelectBook(book);
    } else {
      const rawIsbn = book.isbn || book.id;
      const hasValidIsbn = Boolean(rawIsbn && String(rawIsbn).trim() && String(rawIsbn).trim() !== 'undefined');
      if (hasValidIsbn) {
        navigate(`/book/${encodeURIComponent(String(rawIsbn).trim())}`);
      } else {
        navigate(`/recommend?title=${encodeURIComponent(book.title || '')}`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          handleSelect(suggestions[0]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;

      default:
        break;
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      const selected = highlightedIndex >= 0 ? suggestions[highlightedIndex] : suggestions[0];
      handleSelect(selected);
    }
  };

  const showZeroMatch = query.trim().length >= 2 && !loading && hasSearched && suggestions.length === 0;

  return (
    <div ref={dropdownRef} className={`relative w-full max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleFormSubmit} className="relative">
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-suggestions-list"
          className="relative flex items-center"
        >
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-hidden="true" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim().length >= 2 && (suggestions.length > 0 || hasSearched)) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            aria-label="Search catalogue books"
            aria-autocomplete="list"
            aria-controls="search-suggestions-list"
            aria-activedescendant={
              highlightedIndex >= 0 ? `suggestion-option-${highlightedIndex}` : undefined
            }
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm sm:text-base shadow-2xs transition-all focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
                setHasSearched(false);
                setHighlightedIndex(-1);
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          {suggestions.length > 0 && (
            <div className="p-2.5 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3.5 flex items-center justify-between">
              <span>Search Matches ({suggestions.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Use ↑↓ keys to navigate, Esc to close</span>
            </div>
          )}

          {/* Results List */}
          {suggestions.length > 0 && (
            <div
              id="search-suggestions-list"
              role="listbox"
              className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100"
            >
              {suggestions.map((book, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const bookKey = book.id || book.isbn || `${book.title}-${idx}`;

                return (
                  <button
                    key={bookKey}
                    id={`suggestion-option-${idx}`}
                    role="option"
                    aria-selected={isHighlighted}
                    type="button"
                    onClick={() => handleSelect(book)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full min-h-[48px] px-3.5 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer focus:outline-none ${
                      isHighlighted
                        ? 'bg-indigo-50/80 text-indigo-900'
                        : 'hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="w-9 h-12 rounded bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                      {book.image_url ? (
                        <img
                          src={book.image_url}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {book.title}
                        </span>
                        {book.in_collaborative_model && (
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        by {book.author || 'Unknown'} {book.year ? `• ${book.year}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Zero-Match State */}
          {showZeroMatch && (
            <div className="p-6 text-center space-y-1">
              <p className="text-sm font-medium text-slate-800">
                No books found matching &apos;{query}&apos;.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check spelling or search by popular title or author.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
