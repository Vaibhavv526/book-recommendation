import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Fetch Top 50 popular books
 */
export const getPopularBooks = async () => {
  const response = await api.get('/api/books/popular');
  return response.data;
};

/**
 * Search catalogue books by title
 * @param {string} query
 * @param {number} limit
 */
export const searchBooks = async (query, limit = 8) => {
  const response = await api.get('/api/books/search', {
    params: { q: query, limit },
  });
  return response.data;
};

/**
 * Get detailed metadata for a single book by ISBN
 * @param {string} isbn
 */
export const getBookDetails = async (isbn) => {
  const response = await api.get(`/api/books/${encodeURIComponent(isbn)}`);
  return response.data;
};

/**
 * Get collaborative recommendations by query title or book ID
 * @param {string|{query?: string, id?: string}} queryOrId
 */
export const getRecommendations = async (queryOrId) => {
  const payload = typeof queryOrId === 'string'
    ? { query: queryOrId }
    : queryOrId;
  const response = await api.post('/api/recommend', payload);
  return response.data;
};

/**
 * Get similar books for a collaborative-model supported ISBN
 * @param {string} isbn
 */
export const getSimilarBooks = async (isbn) => {
  const response = await api.get(`/api/books/${encodeURIComponent(isbn)}/similar`);
  return response.data;
};

export default api;
