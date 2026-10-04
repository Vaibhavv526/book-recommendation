"""
Hybrid Book Recommendation Engine
Integrates Collaborative Filtering, Author-Weighted Content Recommendation,
Edition Deduplication, Author Diversity Filtering, and Popularity Fallbacks.
"""

from .recommender import HybridRecommender, get_recommender

__all__ = ['HybridRecommender', 'get_recommender']
