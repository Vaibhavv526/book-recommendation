import React from 'react';
import { BookOpen, Sparkles, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900">BookVerse Recommender</span>
            </div>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              Discover your next favorite book with algorithmic collaborative filtering and a catalogue of over 270,000 titles.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Flask API
              </span>
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                React + Vite
              </span>
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Collaborative Filtering
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-slate-600 hover:text-indigo-600 transition-colors">
                  Top 50 Popular Books
                </Link>
              </li>
              <li>
                <Link to="/recommend" className="text-slate-600 hover:text-indigo-600 transition-colors">
                  AI Recommendation Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* System Info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Dataset Scope
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>271,360 Catalogue Titles</li>
              <li>706 Deep Collaborative Vectors</li>
              <li>Dual Search: Exact & Semantic</li>
              <li>Instant Google PDF & Amazon Links</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BookVerse Recommendation System. Personal ML Project.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> & ML Precision
          </p>
        </div>
      </div>
    </footer>
  );
}
