import os
import re
import math
import pickle
import urllib.parse
from collections import defaultdict
from typing import List, Dict, Any, Optional, Set, Tuple
import numpy as np
import pandas as pd

# Standard English stopwords to filter non-informative terms
STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
    'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
    'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
    'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
    'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
    'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
    'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
}

# Subtitle and edition marker keywords commonly found in book variations
EDITION_MARKERS = {
    'novel', 'paperback', 'hardcover', 'edition', 'classics', 'classic', 'book',
    'series', 'vol', 'volume', 'part', 'reprint', 'mass', 'market', 'library',
    'anniversary', 'signet', 'penguin', 'everyman', 'oxford', 'vintage', 'bantam'
}


class TextNormalizer:
    """Utilities for robust string normalization and tokenization."""

    @staticmethod
    def clean_str(val: Any) -> str:
        if val is None or pd.isna(val):
            return ''
        s = str(val).strip()
        if s.lower() in ('nan', 'none', 'null', ''):
            return ''
        return s

    @classmethod
    def normalize_title(cls, text: Any) -> str:
        s = cls.clean_str(text).lower()
        if not s:
            return ''
        # Replace non-alphanumeric characters with spaces
        s = re.sub(r'[^a-z0-9]+', ' ', s)
        return ' '.join(s.split())

    @classmethod
    def tokenize(cls, text: Any, filter_stopwords: bool = True) -> List[str]:
        s = cls.clean_str(text).lower()
        if not s:
            return []
        tokens = re.findall(r'[a-z0-9]+', s)
        if filter_stopwords:
            tokens = [t for t in tokens if len(t) > 1 and t not in STOPWORDS]
        else:
            tokens = [t for t in tokens if len(t) > 1]
        return tokens

    @classmethod
    def get_title_core_tokens(cls, title: str, author: str = '') -> Set[str]:
        """Extract core semantic tokens of a title, stripping author names and edition markers."""
        tokens = set(cls.tokenize(title, filter_stopwords=True))
        if author:
            author_toks = set(cls.tokenize(author, filter_stopwords=False))
            tokens = tokens - author_toks
        return tokens

    @classmethod
    def get_main_title(cls, title: str) -> str:
        """Strips subtitles after colons, dashes, or parentheses."""
        s = cls.clean_str(title)
        # Split on colon, dash with spaces, or opening parenthesis/bracket
        for delim in (':', ' - ', ' (', ' ['):
            if delim in s:
                s = s.split(delim)[0]
        return cls.normalize_title(s)

    @classmethod
    def is_same_book_or_edition(cls, title_a: str, author_a: str, title_b: str, author_b: str) -> bool:
        """
        Determines whether title_b represents the same underlying book or an edition variant
        of title_a. Enforces strict deduplication so recommendations show distinct works.
        """
        import difflib
        norm_a = cls.normalize_title(title_a)
        norm_b = cls.normalize_title(title_b)
        if not norm_a or not norm_b:
            return False

        # 1. Exact normalized title match
        if norm_a == norm_b:
            return True

        # 2. Main title match (before subtitles, parenthetical tags)
        main_a = cls.get_main_title(title_a)
        main_b = cls.get_main_title(title_b)
        if main_a and main_b and main_a == main_b and len(main_a) >= 4:
            return True

        # 3. Substring / Prefix match for long titles
        # e.g. "The Power of Your Subconscious Mind" inside "... Mind: One of the Most Powerful..."
        if len(norm_a) >= 8 and len(norm_b) >= 8:
            if norm_b.startswith(norm_a) or norm_a.startswith(norm_b):
                return True
            if f" {norm_a} " in f" {norm_b} " or f" {norm_b} " in f" {norm_a} ":
                return True

        # 4. Fuzzy character sequence similarity >= 0.85 (handles typos like subconscious vs subconsious)
        if len(norm_a) >= 8 and len(norm_b) >= 8:
            ratio = difflib.SequenceMatcher(None, norm_a, norm_b).ratio()
            if ratio >= 0.85:
                return True

        core_a = cls.get_title_core_tokens(title_a, author_a)
        core_b = cls.get_title_core_tokens(title_b, author_b)

        if not core_a or not core_b:
            return False

        clean_a = core_a - EDITION_MARKERS
        clean_b = core_b - EDITION_MARKERS

        cmp_a = clean_a if clean_a else core_a
        cmp_b = clean_b if clean_b else core_b

        # 5. Exact set of core tokens matches
        if cmp_a == cmp_b:
            return True

        # 6. Complete subset relationship
        # If all core tokens of one title are contained in the other and min_len >= 2
        min_len = min(len(cmp_a), len(cmp_b))
        if min_len >= 2 and (cmp_a.issubset(cmp_b) or cmp_b.issubset(cmp_a)):
            return True
        if min_len == 1 and (cmp_a.issubset(cmp_b) or cmp_b.issubset(cmp_a)) and min(len(norm_a), len(norm_b)) <= 6:
            return True

        # 7. Token Jaccard similarity >= 0.65
        inter = len(cmp_a & cmp_b)
        union = len(cmp_a | cmp_b)
        if union > 0 and (inter / union) >= 0.65:
            return True

        # 8. Author match + subset or substring
        norm_auth_a = cls.normalize_title(author_a)
        norm_auth_b = cls.normalize_title(author_b)
        authors_match = bool(norm_auth_a and norm_auth_b and (
            norm_auth_a in norm_auth_b or norm_auth_b in norm_auth_a
            or difflib.SequenceMatcher(None, norm_auth_a, norm_auth_b).ratio() >= 0.80
        ))

        if authors_match:
            if norm_a in norm_b or norm_b in norm_a:
                return True
            if cmp_a.issubset(cmp_b) or cmp_b.issubset(cmp_a):
                return True

        return False


class CollaborativeEngine:
    """Wrapper around existing collaborative model artifacts (pt.pkl & similar_books.pkl)."""

    def __init__(self, pt_path: str, similar_books_path: str):
        if not os.path.exists(pt_path) or not os.path.exists(similar_books_path):
            raise FileNotFoundError(f"Collaborative model files not found: {pt_path}, {similar_books_path}")
        
        with open(pt_path, 'rb') as f:
            self.pt = pickle.load(f)
        with open(similar_books_path, 'rb') as f:
            self.similar_books = pickle.load(f)

        self.collab_titles_set = set(self.pt.index)
        self.collab_titles_lower_map = {str(title).lower(): str(title) for title in self.pt.index}

    def has_title(self, title: str) -> bool:
        if not title:
            return False
        return str(title).strip().lower() in self.collab_titles_lower_map

    def get_canonical_title(self, title: str) -> Optional[str]:
        if not title:
            return None
        return self.collab_titles_lower_map.get(str(title).strip().lower())

    def get_recommendation_titles(self, canonical_title: str, top_n: int = 12) -> List[Tuple[str, float]]:
        """
        Returns list of (rec_title, similarity_score) preserving exact ranking.
        Excludes the query book itself.
        """
        if canonical_title not in self.collab_titles_set:
            return []

        index = int(np.where(self.pt.index == canonical_title)[0][0])
        # Sort row descending, skip self at index 0
        similar_items = sorted(
            list(enumerate(self.similar_books[index])),
            key=lambda x: x[1],
            reverse=True
        )[1:top_n + 1]

        results = []
        for item in similar_items:
            rec_title = str(self.pt.index[item[0]])
            rec_score = float(item[1])
            results.append((rec_title, rec_score))
        return results


class ContentEngine:
    """
    Memory-efficient Inverted Index & Vector Space Recommender.
    Indexes ~242k unique book titles with author-boosted TF-IDF weighting.
    """

    def __init__(self, books_unique: pd.DataFrame, author_weight: float = 2.5, cache_dir: Optional[str] = None):
        self.author_weight = author_weight
        self.doc_titles: List[str] = []
        self.doc_authors: List[str] = []
        self.doc_isbns: List[str] = []
        self.doc_years: List[str] = []
        self.doc_publishers: List[str] = []
        self.doc_images: List[str] = []
        self.doc_images_m: List[str] = []
        self.doc_images_l: List[str] = []
        
        self.title_to_doc_id: Dict[str, int] = {}
        self.isbn_to_doc_id: Dict[str, int] = {}

        # Inverted index: token -> list of (doc_id, tfidf_weight)
        self.inverted_index: Dict[str, List[Tuple[int, float]]] = defaultdict(list)
        self.doc_norms: np.ndarray = np.array([], dtype=np.float32)
        self.idf: Dict[str, float] = {}

        cache_file = os.path.join(cache_dir, 'content_index.pkl') if cache_dir else None
        if cache_file and os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                state = pickle.load(f)
            self.doc_isbns = state['doc_isbns']
            self.doc_titles = state['doc_titles']
            self.doc_authors = state['doc_authors']
            self.doc_years = state['doc_years']
            self.doc_publishers = state['doc_publishers']
            self.doc_images = state['doc_images']
            self.doc_images_m = state['doc_images_m']
            self.doc_images_l = state['doc_images_l']
            self.doc_norms = state['doc_norms']
            self.inverted_index = state['inverted_index']
            self.idf = state['idf']
            self.title_to_doc_id = state['title_to_doc_id']
            self.isbn_to_doc_id = state['isbn_to_doc_id']
        else:
            self._build_index(books_unique)
            if cache_file:
                os.makedirs(os.path.dirname(cache_file), exist_ok=True)
                state = {
                    'doc_isbns': self.doc_isbns,
                    'doc_titles': self.doc_titles,
                    'doc_authors': self.doc_authors,
                    'doc_years': self.doc_years,
                    'doc_publishers': self.doc_publishers,
                    'doc_images': self.doc_images,
                    'doc_images_m': self.doc_images_m,
                    'doc_images_l': self.doc_images_l,
                    'doc_norms': self.doc_norms,
                    'inverted_index': self.inverted_index,
                    'idf': self.idf,
                    'title_to_doc_id': self.title_to_doc_id,
                    'isbn_to_doc_id': self.isbn_to_doc_id,
                }
                with open(cache_file, 'wb') as f:
                    pickle.dump(state, f, protocol=pickle.HIGHEST_PROTOCOL)

    def _build_index(self, books_unique: pd.DataFrame):
        # Extract column lists directly for maximum speed and minimal memory
        isbns = books_unique['ISBN'].astype(str).tolist()
        titles = books_unique['Book-Title'].fillna('').astype(str).tolist()
        authors = books_unique['Book-Author'].fillna('Unknown').astype(str).tolist()
        years = books_unique['Year-Of-Publication'].fillna('').astype(str).tolist()
        publishers = books_unique['Publisher'].fillna('Unknown').astype(str).tolist()
        imgs_s = books_unique['Image-URL-S'].fillna('').astype(str).tolist() if 'Image-URL-S' in books_unique.columns else [''] * len(isbns)
        imgs_m = books_unique['Image-URL-M'].fillna('').astype(str).tolist() if 'Image-URL-M' in books_unique.columns else [''] * len(isbns)
        imgs_l = books_unique['Image-URL-L'].fillna('').astype(str).tolist() if 'Image-URL-L' in books_unique.columns else [''] * len(isbns)

        n_docs = len(titles)
        self.doc_isbns = isbns
        self.doc_titles = titles
        self.doc_authors = authors
        self.doc_years = years
        self.doc_publishers = publishers
        self.doc_images = [m or s for m, s in zip(imgs_m, imgs_s)]
        self.doc_images_m = imgs_m
        self.doc_images_l = imgs_l

        self.doc_norms = np.zeros(n_docs, dtype=np.float32)
        df_freq = defaultdict(int)
        doc_tokens_list: List[List[str]] = []

        # Pass 1: Tokenize & document frequencies
        for doc_id in range(n_docs):
            title = titles[doc_id]
            isbn = isbns[doc_id]

            norm_title = TextNormalizer.normalize_title(title)
            if norm_title and norm_title not in self.title_to_doc_id:
                self.title_to_doc_id[norm_title] = doc_id
            if isbn and isbn not in self.isbn_to_doc_id:
                self.isbn_to_doc_id[isbn] = doc_id

            t_toks = TextNormalizer.tokenize(title, filter_stopwords=True)
            a_toks = TextNormalizer.tokenize(authors[doc_id], filter_stopwords=True)

            # Combined tokens with author repeated for weighting
            combined_toks = t_toks + a_toks + a_toks
            doc_tokens_list.append(combined_toks)
            for t in set(combined_toks):
                df_freq[t] += 1

        # Compute IDF
        self.idf = {
            t: math.log((n_docs + 1.0) / (cnt + 1.0)) + 1.0
            for t, cnt in df_freq.items()
        }

        # Pass 2: Inverted index & Euclidean document norms
        for doc_id, toks in enumerate(doc_tokens_list):
            if not toks:
                self.doc_norms[doc_id] = 1.0
                continue
            tf_counts = defaultdict(int)
            for t in toks:
                tf_counts[t] += 1

            norm_sq = 0.0
            for t, count in tf_counts.items():
                w = (1.0 + math.log(count)) * self.idf[t]
                self.inverted_index[t].append((doc_id, float(w)))
                norm_sq += w * w
            self.doc_norms[doc_id] = math.sqrt(norm_sq) if norm_sq > 0 else 1.0

    def query(self, query_title: str, query_author: str = '', source_doc_id: int = -1, top_k: int = 30) -> List[Tuple[int, float]]:
        """Queries the inverted index and returns candidate doc_ids with cosine similarity scores."""
        title_toks = TextNormalizer.tokenize(query_title, filter_stopwords=True)
        author_toks = TextNormalizer.tokenize(query_author, filter_stopwords=True)

        if not title_toks and not author_toks:
            return []

        q_tf: Dict[str, float] = defaultdict(float)
        for t in title_toks:
            q_tf[t] += 1.0
        for a in author_toks:
            q_tf[a] += self.author_weight

        q_norm_sq = 0.0
        scores: Dict[int, float] = defaultdict(float)

        for t, tf_val in q_tf.items():
            if t in self.idf:
                qw = (1.0 + math.log(tf_val)) * self.idf[t]
                q_norm_sq += qw * qw
                postings = self.inverted_index.get(t, [])
                for doc_id, dw in postings:
                    if doc_id != source_doc_id:
                        scores[doc_id] += qw * dw

        if not scores or q_norm_sq <= 0:
            return []

        q_norm = math.sqrt(q_norm_sq)
        results = []
        for doc_id, dot in scores.items():
            cos_sim = dot / (q_norm * self.doc_norms[doc_id])
            results.append((doc_id, float(cos_sim)))

        # Sort descending by cosine similarity
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


class PopularityEngine:
    """Wrapper providing pre-ranked fallback books from popular.pkl."""

    def __init__(self, popular_path: str):
        if not os.path.exists(popular_path):
            raise FileNotFoundError(f"Popular books artifact not found: {popular_path}")
        with open(popular_path, 'rb') as f:
            self.popular_df = pickle.load(f)

        self.popular_books = []
        for row in self.popular_df.itertuples(index=False):
            self.popular_books.append({
                'title': TextNormalizer.clean_str(row[0]),
                'author': TextNormalizer.clean_str(row[1]),
                'image_url_m': TextNormalizer.clean_str(row[2]),
                'image_url': TextNormalizer.clean_str(row[2]),
                'num_ratings': int(row[3]) if len(row) > 3 else 0,
                'avg_rating': round(float(row[4]), 2) if len(row) > 4 else 0.0,
            })

    def get_top_popular(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.popular_books[:limit]


class HybridRecommender:
    """
    Unified Hybrid Recommendation Engine.
    Combines:
    - Collaborative Filtering (high-confidence collaborative item similarity)
    - Author-Weighted Content Recommender (~242k unique catalogue coverage)
    - Edition Deduplication (prunes title variants, reprints, self-recommendations)
    - Author Diversity Filter (caps same-author dominance while preserving author affinity)
    - Popularity Fallback (ensures robust fulfillment)
    """

    def __init__(self, project_dir: str):
        self.project_dir = project_dir

        cache_dir = os.path.join(project_dir, 'engine', 'cache')
        cat_file = os.path.join(cache_dir, 'catalogue_meta.pkl')
        books_unique = None

        self.isbn_to_book: Dict[str, Dict[str, Any]] = {}
        self.title_to_isbn: Dict[str, str] = {}
        self.title_lower_to_isbn: Dict[str, str] = {}

        if os.path.exists(cat_file):
            with open(cat_file, 'rb') as f:
                cat_meta = pickle.load(f)
            self.isbn_to_book = cat_meta['isbn_to_book']
            self.title_to_isbn = cat_meta['title_to_isbn']
            self.title_lower_to_isbn = cat_meta['title_lower_to_isbn']
        else:
            # Load raw metadata books.pkl
            books_path = os.path.join(project_dir, 'books.pkl')
            if not os.path.exists(books_path):
                books_path = os.path.join(project_dir, 'Books.csv')
                books_df = pd.read_csv(books_path, low_memory=False)
            else:
                with open(books_path, 'rb') as f:
                    books_df = pickle.load(f)

            books_unique = books_df.drop_duplicates('Book-Title').copy()

            for row in books_df.itertuples(index=False):
                isbn = TextNormalizer.clean_str(row[0])
                title = TextNormalizer.clean_str(row[1])
                author = TextNormalizer.clean_str(row[2]) or 'Unknown'
                year = TextNormalizer.clean_str(row[3])
                pub = TextNormalizer.clean_str(row[4]) or 'Unknown'
                img_m = TextNormalizer.clean_str(row[6])
                img_l = TextNormalizer.clean_str(row[7])

                b_dict = {
                    'id': isbn,
                    'isbn': isbn,
                    'title': title,
                    'author': author,
                    'year': year,
                    'publisher': pub,
                    'image_url': img_m,
                    'image_url_m': img_m,
                    'image_url_l': img_l,
                }
                if isbn not in self.isbn_to_book:
                    self.isbn_to_book[isbn] = b_dict
                if title not in self.title_to_isbn:
                    self.title_to_isbn[title] = isbn
                if title.lower() not in self.title_lower_to_isbn:
                    self.title_lower_to_isbn[title.lower()] = isbn

            os.makedirs(cache_dir, exist_ok=True)
            with open(cat_file, 'wb') as f:
                pickle.dump({
                    'isbn_to_book': self.isbn_to_book,
                    'title_to_isbn': self.title_to_isbn,
                    'title_lower_to_isbn': self.title_lower_to_isbn
                }, f, protocol=pickle.HIGHEST_PROTOCOL)

        content_cache_file = os.path.join(cache_dir, 'content_index.pkl')
        if not os.path.exists(content_cache_file) and books_unique is None:
            books_path = os.path.join(project_dir, 'books.pkl')
            if not os.path.exists(books_path):
                books_path = os.path.join(project_dir, 'Books.csv')
                books_df = pd.read_csv(books_path, low_memory=False)
            else:
                with open(books_path, 'rb') as f:
                    books_df = pickle.load(f)
            books_unique = books_df.drop_duplicates('Book-Title').copy()

        # Initialize sub-engines
        pt_path = os.path.join(project_dir, 'pt.pkl')
        sim_path = os.path.join(project_dir, 'similar_books.pkl')
        pop_path = os.path.join(project_dir, 'popular.pkl')

        self.collab_engine = CollaborativeEngine(pt_path, sim_path)
        self.content_engine = ContentEngine(books_unique, author_weight=2.5, cache_dir=cache_dir)
        self.pop_engine = PopularityEngine(pop_path)

    # -------------------------------------------------------------
    # Metadata Enrichment & Lookup
    # -------------------------------------------------------------

    def _generate_amazon_url(self, title: str, author: str) -> str:
        q = f"{title} {author}".strip()
        return f"https://www.amazon.com/s?k={urllib.parse.quote_plus(q)}"

    def _generate_pdf_url(self, title: str) -> str:
        q = f"{title} PDF download".strip()
        return f"https://www.google.com/search?q={urllib.parse.quote_plus(q)}"

    def enrich_book(self, book_dict: Dict[str, Any], in_collab: Optional[bool] = None) -> Dict[str, Any]:
        b = dict(book_dict)
        title = b.get('title', '')
        author = b.get('author', '')
        isbn = b.get('isbn') or b.get('id', '')
        
        b['id'] = isbn
        b['isbn'] = isbn
        b['in_collaborative_model'] = (
            in_collab if in_collab is not None
            else self.collab_engine.has_title(title)
        )
        b['amazon_search_url'] = self._generate_amazon_url(title, author)
        b['pdf_search_url'] = self._generate_pdf_url(title)
        return b

    def resolve_book(self, query: str) -> Optional[Dict[str, Any]]:
        """Resolves a book by ISBN, exact title, or case-insensitive title."""
        q = TextNormalizer.clean_str(query)
        if not q:
            return None

        # 1. Exact ISBN lookup
        if q in self.isbn_to_book:
            return self.enrich_book(self.isbn_to_book[q])

        # 2. Case-insensitive Title lookup
        q_lower = q.lower()
        if q_lower in self.title_lower_to_isbn:
            isbn = self.title_lower_to_isbn[q_lower]
            return self.enrich_book(self.isbn_to_book[isbn])

        # 3. Content engine normalized title lookup
        norm_q = TextNormalizer.normalize_title(q)
        if norm_q in self.content_engine.title_to_doc_id:
            doc_id = self.content_engine.title_to_doc_id[norm_q]
            isbn = self.content_engine.doc_isbns[doc_id]
            if isbn in self.isbn_to_book:
                return self.enrich_book(self.isbn_to_book[isbn])

        return None

    # -------------------------------------------------------------
    # Candidate Generation & Diversity Filtering
    # -------------------------------------------------------------

    def _filter_and_diversify(
        self,
        candidates: List[Dict[str, Any]],
        source_book: Optional[Dict[str, Any]],
        top_n: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Applies:
        1. Self-exclusion (never recommend the source book or its ISBN)
        2. Edition deduplication (never recommend alternate editions/reprints of the query book)
        3. Author diversity rule (maximum 2 recommendations from the same author)
        """
        seen_isbns: Set[str] = set()
        seen_norm_titles: Set[str] = set()
        author_counts: Dict[str, int] = defaultdict(int)

        source_title = source_book.get('title', '') if source_book else ''
        source_author = source_book.get('author', '') if source_book else ''
        source_isbn = source_book.get('isbn', '') if source_book else ''

        if source_isbn:
            seen_isbns.add(source_isbn)
        if source_title:
            seen_norm_titles.add(TextNormalizer.normalize_title(source_title))

        accepted: List[Dict[str, Any]] = []
        deferred: List[Dict[str, Any]] = []

        for cand in candidates:
            c_isbn = cand.get('isbn') or cand.get('id', '')
            c_title = cand.get('title', '')
            c_author = cand.get('author', '')
            norm_c_title = TextNormalizer.normalize_title(c_title)

            # Skip duplicate ISBNs
            if c_isbn in seen_isbns:
                continue

            # Skip same normalized title
            if norm_c_title in seen_norm_titles:
                continue

            # Skip editions of the source book
            if source_title and TextNormalizer.is_same_book_or_edition(
                source_title, source_author, c_title, c_author
            ):
                continue

            # Skip duplicate editions among already accepted recommendations
            is_dup_of_accepted = any(
                TextNormalizer.is_same_book_or_edition(
                    acc['title'], acc['author'], c_title, c_author
                )
                for acc in accepted
            )
            if is_dup_of_accepted:
                continue

            # Author Diversity Check: Maximum 2 per author in first pass
            norm_author = TextNormalizer.normalize_title(c_author)
            if author_counts[norm_author] < 2:
                accepted.append(cand)
                seen_isbns.add(c_isbn)
                seen_norm_titles.add(norm_c_title)
                author_counts[norm_author] += 1
                if len(accepted) >= top_n:
                    return accepted
            else:
                deferred.append(cand)

        # Second pass: If fewer than top_n, fill from deferred candidates
        for cand in deferred:
            if len(accepted) >= top_n:
                break
            c_isbn = cand.get('isbn') or cand.get('id', '')
            norm_c_title = TextNormalizer.normalize_title(cand.get('title', ''))
            if c_isbn not in seen_isbns and norm_c_title not in seen_norm_titles:
                accepted.append(cand)
                seen_isbns.add(c_isbn)
                seen_norm_titles.add(norm_c_title)

        return accepted[:top_n]

    # -------------------------------------------------------------
    # Public Recommendation API
    # -------------------------------------------------------------

    def recommend_by_title(self, title: str, top_n: int = 4) -> Dict[str, Any]:
        """
        Generates recommendations for a book title using the hybrid routing architecture:
        Collaborative -> Content -> Popularity Fallback.
        """
        clean_query = TextNormalizer.clean_str(title)
        if not clean_query:
            return {
                'query': title,
                'source_book': None,
                'recommendations': [],
                'count': 0,
                'strategy': 'none',
                'message': 'Please enter a book title to get recommendations.'
            }

        source_book = self.resolve_book(clean_query)
        candidates: List[Dict[str, Any]] = []
        strategy = 'content'

        # ---------------------------------------------------------
        # Case 1: Source Book Resolved in Catalogue
        # ---------------------------------------------------------
        if source_book:
            source_title = source_book['title']
            source_author = source_book['author']
            canonical_cf_title = self.collab_engine.get_canonical_title(source_title)

            # Strategy 1: Collaborative Filtering (Primary if available)
            if canonical_cf_title:
                strategy = 'collaborative'
                cf_titles = self.collab_engine.get_recommendation_titles(canonical_cf_title, top_n=top_n * 3)
                for rec_title, _score in cf_titles:
                    rec_isbn = self.title_to_isbn.get(rec_title)
                    if rec_isbn and rec_isbn in self.isbn_to_book:
                        rec_item = self.enrich_book(self.isbn_to_book[rec_isbn], in_collab=True)
                    else:
                        rec_item = self.enrich_book({
                            'id': '',
                            'isbn': '',
                            'title': rec_title,
                            'author': 'Unknown',
                            'year': '',
                            'publisher': '',
                            'image_url': '',
                            'image_url_m': '',
                            'image_url_l': ''
                        }, in_collab=True)
                    candidates.append(rec_item)

            # Strategy 2: Content-Based Engine (If not in CF or need candidate pool)
            if len(candidates) < top_n * 2:
                # Find source doc_id if present
                norm_title = TextNormalizer.normalize_title(source_title)
                source_doc_id = self.content_engine.title_to_doc_id.get(norm_title, -1)
                
                content_matches = self.content_engine.query(
                    query_title=source_title,
                    query_author=source_author,
                    source_doc_id=source_doc_id,
                    top_k=max(100, top_n * 20)
                )
                for doc_id, _score in content_matches:
                    isbn = self.content_engine.doc_isbns[doc_id]
                    if isbn in self.isbn_to_book:
                        cand_item = self.enrich_book(self.isbn_to_book[isbn])
                        candidates.append(cand_item)

        # ---------------------------------------------------------
        # Case 2: Source Book Not in Catalogue (Freeform search query)
        # ---------------------------------------------------------
        else:
            strategy = 'content_freeform'
            content_matches = self.content_engine.query(
                query_title=clean_query,
                query_author='',
                source_doc_id=-1,
                top_k=max(100, top_n * 20)
            )
            for doc_id, _score in content_matches:
                isbn = self.content_engine.doc_isbns[doc_id]
                if isbn in self.isbn_to_book:
                    cand_item = self.enrich_book(self.isbn_to_book[isbn])
                    candidates.append(cand_item)

        # ---------------------------------------------------------
        # Apply Edition Deduplication & Author Diversity Filter
        # ---------------------------------------------------------
        final_recs = self._filter_and_diversify(candidates, source_book, top_n=top_n)

        # ---------------------------------------------------------
        # Strategy 3: Popularity Fallback Backfill
        # ---------------------------------------------------------
        if len(final_recs) < top_n:
            pop_books = self.pop_engine.get_top_popular(limit=top_n * 3)
            for pop_item in pop_books:
                pop_title = pop_item['title']
                pop_isbn = self.title_to_isbn.get(pop_title, '')
                if pop_isbn and pop_isbn in self.isbn_to_book:
                    full_pop = self.enrich_book(self.isbn_to_book[pop_isbn])
                else:
                    full_pop = self.enrich_book(pop_item)

                # Validate deduplication against source and existing recommendations
                if source_book and TextNormalizer.is_same_book_or_edition(
                    source_book['title'], source_book['author'], full_pop['title'], full_pop['author']
                ):
                    continue

                if any(r.get('id') == full_pop.get('id') or r.get('title') == full_pop.get('title') for r in final_recs):
                    continue

                final_recs.append(full_pop)
                if len(final_recs) >= top_n:
                    break

            if strategy != 'collaborative':
                strategy = f"{strategy}_with_popularity_backfill" if len(candidates) > 0 else "popularity_fallback"

        return {
            'query': title,
            'source_book': source_book,
            'recommendations': final_recs,
            'count': len(final_recs),
            'strategy': strategy
        }

    def recommend_by_isbn(self, isbn: str, top_n: int = 4) -> Dict[str, Any]:
        """Generates recommendations given an ISBN."""
        clean_isbn = TextNormalizer.clean_str(isbn)
        if not clean_isbn:
            return {
                'query': isbn,
                'source_book': None,
                'recommendations': [],
                'count': 0,
                'strategy': 'none',
                'message': 'Invalid or empty ISBN provided.'
            }

        book = self.isbn_to_book.get(clean_isbn)
        if not book:
            return {
                'query': isbn,
                'source_book': None,
                'recommendations': [],
                'count': 0,
                'strategy': 'not_found',
                'message': f"Book with ISBN '{isbn}' not found in catalogue."
            }

        return self.recommend_by_title(book['title'], top_n=top_n)


# Singleton accessor
_GLOBAL_RECOMMENDER: Optional[HybridRecommender] = None

def get_recommender(project_dir: Optional[str] = None) -> HybridRecommender:
    global _GLOBAL_RECOMMENDER
    if _GLOBAL_RECOMMENDER is None:
        if project_dir is None:
            # Default to current directory or parent directory
            project_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
        _GLOBAL_RECOMMENDER = HybridRecommender(project_dir)
    return _GLOBAL_RECOMMENDER
