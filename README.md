# BookVerse — AI-Powered Hybrid Book Recommendation System

BookVerse is an end-to-end book recommendation platform that pairs collaborative filtering with content-based retrieval to deliver high-relevance recommendations across an entire 270,000+ title catalogue. By unifying reader-interaction patterns, an author-weighted TF-IDF inverted index, heuristic edition deduplication, and popularity fallbacks, BookVerse eliminates the classic cold-start coverage bottleneck that limits standard collaborative filtering systems. The platform couples a responsive, accessible React 19 single-page application with a robust Flask REST API serving millisecond-latency recommendations.

---

## Table of Contents

- [Project Highlights](#project-highlights)
- [Why Hybrid? (The Cold-Start Challenge)](#why-hybrid-the-cold-start-challenge)
- [System Architecture](#system-architecture)
- [Recommendation Engine](#recommendation-engine)
  - [Collaborative Filtering Engine](#collaborative-filtering-engine)
  - [Content-Based Inverted Index Engine](#content-based-inverted-index-engine)
  - [Filtering & Diversification Pipeline](#filtering--diversification-pipeline)
- [Recommendation Strategies & Transparency](#recommendation-strategies--transparency)
- [Cold-Start Handling](#cold-start-handling)
- [Benchmark & Evaluation Suite](#benchmark--evaluation-suite)
- [Frontend Application](#frontend-application)
- [Backend REST API](#backend-rest-api)
- [Project Structure](#project-structure)
- [Dataset & Model Artifacts](#dataset--model-artifacts)
- [Local Quick Start](#local-quick-start)
- [Runtime Environment & Requirements](#runtime-environment--requirements)
- [Resource Requirements & Deployment Notes](#resource-requirements--deployment-notes)
- [Limitations & Security Profile](#limitations--security-profile)
- [Future Engineering Roadmap](#future-engineering-roadmap)
- [Author & Project Information](#author--project-information)

---

## Project Highlights

| Feature / Capability | Description |
| :--- | :--- |
| **Hybrid Recommendation Routing** | Cascading decision flow: Collaborative Filtering $\rightarrow$ Content-Based Retrieval $\rightarrow$ Popularity Fallback. |
| **100% Catalogue Coverage** | Expands recommendation capability from 706 collaborative titles to all 242,135 unique titles in the catalogue. |
| **Collaborative Precision** | High-confidence cosine similarity over active reader patterns for popular, high-interaction literature. |
| **Inverted Index TF-IDF Retrieval** | Memory-efficient inverted index enabling sub-50ms lexical and thematic retrieval across 242k+ books without dense matrix overhead. |
| **Edition & Reprint Deduplication** | 8-tier matching algorithm removing duplicate editions, translations, and reprints from recommendation lists. |
| **Author Diversification Filter** | Enforces a cap of at most 2 recommendations per author, balancing creator affinity with catalogue exploration. |
| **Transparent Strategy Badges** | Every recommendation response provides metadata explaining exactly which engine strategy generated the result. |
| **Decoupled REST API** | Clean Flask API with JSON endpoints, unified error handling, and parameter validation. |
| **Modern React 19 SPA** | Fast, accessible frontend built with Vite, Tailwind CSS v4, Lucide icons, search autocomplete, and keyboard navigation. |
| **Deterministic Evaluation Suite** | 107-query reproducible test harness verifying recommendation counts, latency percentiles, and zero-redundancy constraints. |

---

## Why Hybrid? (The Cold-Start Challenge)

### The Limitation of Pure Collaborative Filtering
In traditional item-item collaborative filtering, similarity matrices are constructed strictly from user rating overlaps. To ensure statistical reliability and eliminate noise, the collaborative dataset is filtered to users with $\ge 200$ ratings and books with $\ge 50$ ratings:

- **Total Catalogue Books:** 271,360 records (242,135 unique titles)
- **Collaborative Filtering Coverage:** Exactly **706 books** (0.29% of catalogue)
- **Unsupported Titles:** Over **241,400 unique titles** (99.71% of catalogue)

Under a pure collaborative model, searching for 99.7% of catalogue books produces an immediate query failure ("Book not found in recommendation database").

### The Hybrid Solution
BookVerse resolves this coverage gap through intelligent hybrid fallback routing:

```
                  User Query (Title or ISBN)
                              │
                              ▼
                   Catalogue Book Resolution
                   (ISBN, Title, or Normalization)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Book in Collaborative         Book NOT in Collaborative
       Matrix? (706 titles)          Matrix? (Cold-Start / Long-Tail)
               │                             │
               ▼                             ▼
       Collaborative Engine          Content-Based Engine
       (User Interaction Matrix)     (TF-IDF Inverted Index over 242k titles)
               │                             │
               └──────────────┬──────────────┘
                              │
                              ▼
            Candidate Deduplication & Diversification
            ├── Exclude source book (0% self-recommendation)
            ├── Filter title variants & editions (0% edition redundancy)
            └── Cap at max 2 books per author (Author diversity)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Top-4 Slots Filled?          Fewer than 4 Candidates?
               │                             │
               │                             ▼
               │                    Popularity Fallback Engine
               │                    (Backfill from top-rated books)
               │                             │
               └──────────────┬──────────────┘
                              │
                              ▼
                Final 4 Recommendations
                + Engine Strategy Metadata
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Client Layer (React 19 SPA)                        │
│                                                                             │
│   HomePage (Top 50, Quick Search)        RecommendPage (Search, Badges)     │
│   BookDetailPage (Metadata, Direct Recs) NotFoundPage (Safe Fallback)       │
│                                                                             │
│   Libraries: React 19, React Router 7, Tailwind CSS v4, Axios, Lucide       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ HTTP / JSON Requests
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               Development Proxy (Vite :5173 -> :5000)                       │
│               Production: Direct API Base URL via Environment Variable     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Proxied JSON Requests
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backend Service (Flask REST API)                    │
│                                                                             │
│   Endpoints:                                                                │
│   • GET  /api/books/popular         • POST /api/recommend                   │
│   • GET  /api/books/search          • GET  /api/books/<book_id>/similar     │
│   • GET  /api/books/<book_id>                                               │
│                                                                             │
│   Features: JSON Error Interceptors, Parameter Sanitization, Flask-CORS     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 HybridRecommender Engine (`engine/recommender.py`)          │
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │  CollaborativeEngine   │  │     ContentEngine      │  │PopularityEngine│ │
│  │  ──────────────────    │  │  ────────────────────  │  │────────────────│ │
│  │  • pt.pkl (706 x 810)  │  │  • TF-IDF Inverted Idx │  │• popular.pkl   │ │
│  │  • similar_books.pkl   │  │    (242,135 documents, │  │  (Top 50 books │ │
│  │    (706 x 706 matrix)  │  │     112,204 vocabulary)│  │   aggregated)  │ │
│  │  • Cosine user affinity│  │  • Author-boosted dot  │  │• Fallback fill │ │
│  │  • Exact top-N ranking │  │  • Rarest-token guard  │  │                │ │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬────────┘ │
│              │                           │                       │          │
│              └─────────────────────┐     │     ┌─────────────────┘          │
│                                    ▼     ▼     ▼                            │
│                        Filtering & Diversification Pipeline                 │
│                        ├── Self-Recommendation Exclusion                   │
│                        ├── 8-Tier Heuristic Edition Deduplication          │
│                        └── Max 2 Books per Author Diversity Rule            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Recommendation Engine

### Collaborative Filtering Engine
The collaborative engine operates on user interaction data using item-item collaborative filtering:
- **Matrix Dimension:** 706 popular books by 810 qualified readers.
- **Similarity Metric:** Pairwise cosine similarity stored in `similar_books.pkl`.
- **Ranking Preservation:** When a query book is present in the collaborative pivot table, the top similar items from the matrix are strictly preserved in descending order.

**Verified Collaborative Baseline:**
Query: `1984` (*George Orwell*)
1. *Animal Farm* (*George Orwell*)
2. *The Handmaid's Tale* (*Margaret Atwood*)
3. *Brave New World* (*Aldous Huxley*)
4. *The Vampire Lestat (Vampire Chronicles, Book II)* (*Anne Rice*)

### Content-Based Inverted Index Engine
A naive content-based recommender over 242,135 unique books would require a $242{,}135 \times 242{,}135$ pairwise matrix, requiring over **230 GB of RAM** in float32 format.

BookVerse solves this using a **sparse Inverted Index**:
- **Indexed Documents:** 242,135 unique titles.
- **Vocabulary Size:** 112,204 normalized lexical tokens.
- **Storage:** Precomputed token-to-posting postings list stored in `engine/cache/content_index.pkl` (93 MB).
- **Weighting Scheme:** Sublinear Term Frequency ($1 + \ln(\text{tf})$) combined with Inverse Document Frequency ($\ln((N + 1) / (\text{df} + 1)) + 1$).
- **Author Boosting:** Query author tokens receive an author affinity boost of $2.5\times$ to balance subject matter and author style.
- **Rarest-Author-Token Guard:** When candidates match on author tokens without title overlap, they are accepted only if they match the rarest author token and pass author verification. This prevents false matches on common first names (e.g. preventing "Joan Joseph" from matching "Joseph Murphy").

### Filtering & Diversification Pipeline
Every candidate pool passes through a multi-stage refinement pipeline:
1. **Self-Exclusion:** The query ISBN, exact title, and normalized title are excluded.
2. **8-Tier Edition Deduplication:** Identifies and discards reprints, paperback editions, subtitle additions, and volume markers using `TextNormalizer.is_same_book_or_edition()`.
3. **Author Diversity Rule:** Limits recommendations to at most 2 titles from any single author in the primary pass, avoiding catalog domination by prolific authors.
4. **Popularity Backfill:** If filtering reduces recommendations below the target count ($N=4$), slots are backfilled from `popular.pkl` while enforcing deduplication and author caps.

---

## Recommendation Strategies & Transparency

BookVerse does not hide its recommendation decisions. Every response object contains explicit strategy metadata that the frontend renders as an informational badge:

| Strategy Code | User-Facing Label | Trigger Condition |
| :--- | :--- | :--- |
| `collaborative` | **Collaborative Reader Patterns** | Book exists in the 706-book matrix; recommendations derived from reader co-rating habits. |
| `content` | **Thematic & Author Affinity** | Book is outside the collaborative matrix; recommendations retrieved via TF-IDF content similarity. |
| `content_freeform` | **Thematic & Author Affinity** | Query title was not an exact catalog match; resolved via freeform lexical search. |
| `content_with_popularity_backfill` | **Thematic Match + Popularity Fallback** | Content matches yielded fewer than 4 distinct items; remaining slots filled from popular books. |
| `popularity_fallback` | **Popularity Fallback** | Zero content matches found; filled entirely from top-rated books. |

---

## Cold-Start Handling

### The Problem
When a user searches for a book with high cultural value but fewer than 50 ratings in the historical dataset, traditional collaborative recommenders fail with a cold-start error.

### The Verified Solution
Consider the non-collaborative title **"The Power of Your Subconscious Mind"** by *Joseph Murphy*:
- **In Collaborative Model?** No (not in 706-book matrix).
- **BookVerse Engine Behavior:** Automatically routes query to the Content Engine.
- **Generated Recommendations:**
  1. *The Amazing Laws of Cosmic Mind Power* (*Joseph Murphy*) — Author & theme match
  2. *Think Yourself Rich* (*Joseph Murphy*) — Author affinity match
  3. *Osun Across the Waters* (*Joseph M. Murphy*) — Semantic token overlap
  4. *The Power of Five* (*W.i.t.c.h.*) — Thematic title match
- **Integrity Verified:** Zero common-author-token bleed (candidates such as *Joan Joseph* or *Joseph Campbell* are filtered out by the rarest-author-token guard).

---

## Benchmark & Evaluation Suite

BookVerse includes an automated, deterministic evaluation suite located in [`evaluation/evaluate_recommender.py`](file:///c:/Users/kv997/Downloads/ML_Models/book_recommendation/project/evaluation/evaluate_recommender.py). The benchmark evaluates **107 diverse queries** across 7 distinct categories (known regressions, collaborative-supported titles, multi-edition works, long titles, short titles, subtitles, and prolific authors).

### Verified Stage 5B Benchmark Results

| Metric | Measured Result | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **Fulfilled Count Rate** | **100.0%** (107 / 107 returned exactly 4 recs) | 100.0% | **PASS** |
| **Self-Recommendation Rate** | **0.00%** (0 / 107 recommended the query book) | 0.00% | **TARGET MET** |
| **Edition Redundancy Rate** | **0.00%** (0 duplicate editions/variants) | 0.00% | **TARGET MET** |
| **Duplicate ISBN Rate** | **0.00%** | 0.00% | **PASS** |
| **Author Diversity Ratio** | **0.7734** | $\ge 0.75$ | **PASS** |
| **Avg Unique Authors / Query** | **3.09 / 4.00** | $\ge 3.00$ | **PASS** |
| **Author Cap Violations (>2)** | **3.74%** (4 queries) | $\le 5.00\%$ | **TARGET MET** |
| **Catalogue Coverage** | **100.0%** (242,135 unique titles) | 100.0% | **PASS** |
| **Collaborative Latency (p95)** | **10.26 ms** | $\le 20.0\text{ ms}$ | **PASS** |
| **Cold-Start Latency (p95)** | **43.39 ms** | $\le 50.0\text{ ms}$ | **PASS** |
| **Overall Engine Latency (p95)** | **38.08 ms** (mean: 12.23 ms) | $\le 50.0\text{ ms}$ | **PASS** |
| **1984 Collaborative Ranking** | **Exact (4/4 match preserved)** | Exact Match | **PASS** |

*Note: These latency metrics represent local single-process benchmark evaluations and are not production service level agreements.*

---

## Frontend Application

The user interface is built as a Single Page Application in [`frontend/`](file:///c:/Users/kv997/Downloads/ML_Models/book_recommendation/project/frontend) using modern web technologies:
- **Framework:** React 19.2 + Vite 8.3
- **Routing:** React Router DOM 7.18
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React
- **HTTP Client:** Axios with centralized base URL configuration

### User Interface Capabilities
- **Search Autocomplete:** Debounced real-time catalogue title search with prefix and containment matching.
- **Keyboard Navigation:** Full accessible focus outlines, ARIA attributes, and keyboard shortcuts (`Enter`, `Escape`, arrow keys).
- **Strategy Visualizer:** Color-coded badges indicating collaborative vs. hybrid content derivation.
- **Detailed Book Modal/Page:** Displays publisher, publication year, ISBN, and full metadata.
- **Action Buttons:**
  - **Copy ISBN:** One-click clipboard copy with visual confirmation.
  - **Amazon Search:** Direct lookup on Amazon for purchase availability.
  - **Google PDF Search Action:** Opens a new browser tab with a Google search query for `"<BOOK TITLE> PDF download"`. *(Note: BookVerse does not scrape, host, or download PDF files directly).*
- **Responsive Layout:** Adaptive grid supporting mobile, tablet, and widescreen desktop displays.

---

## Backend REST API

The Flask backend in [`app.py`](file:///c:/Users/kv997/Downloads/ML_Models/book_recommendation/project/app.py) provides 5 RESTful JSON endpoints alongside global error handling:

### Endpoint Directory

| Method | Endpoint | Parameters / Body | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/books/popular` | None | Returns the top 50 books aggregated by rating count and average score. |
| `GET` | `/api/books/search` | Query: `q` (string), `limit` (int, default 8, max 50) | Prefix and substring title autocomplete across 242k titles. |
| `GET` | `/api/books/<book_id>` | Path: `book_id` (ISBN string) | Detailed metadata for a single catalogue book. |
| `POST` | `/api/recommend` | JSON: `{"query": "..."}` or `{"id": "..."}` | Generates 4 recommendations using the hybrid decision engine. |
| `GET` | `/api/books/<book_id>/similar` | Path: `book_id` (ISBN string) | Recommends similar items directly for an identified ISBN. |

---

### API Schemas & Examples

#### 1. Generate Recommendations (`POST /api/recommend`)
**Request:**
```bash
curl -X POST http://127.0.0.1:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "1984"}'
```

**Success Response (200 OK):**
```json
{
  "source_book": {
    "id": "0451524934",
    "isbn": "0451524934",
    "title": "1984",
    "author": "George Orwell",
    "year": "1990",
    "publisher": "Signet Book",
    "image_url_m": "http://images.amazon.com/images/P/0451524934.01.MZZZZZZZ.jpg",
    "in_collaborative_model": true
  },
  "model_type": "collaborative",
  "count": 4,
  "engine": {
    "strategy": "collaborative",
    "strategy_label": "Collaborative Reader Patterns",
    "fallback_used": false
  },
  "recommendations": [
    {
      "id": "0451526341",
      "isbn": "0451526341",
      "title": "Animal Farm",
      "author": "George Orwell",
      "year": "1996",
      "publisher": "Signet Book",
      "image_url_m": "http://images.amazon.com/images/P/0451526341.01.MZZZZZZZ.jpg",
      "in_collaborative_model": true,
      "amazon_search_url": "https://www.amazon.com/s?k=Animal+Farm+George+Orwell",
      "pdf_search_url": "https://www.google.com/search?q=Animal+Farm+PDF+download"
    }
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "book_not_found",
  "message": "Sorry, this book is not available in our catalogue. Please check the spelling or try another book."
}
```

---

## Project Structure

```
book_recommendation/project/
├── .gitattributes                    # Git LFS configuration for large binary files
├── .gitignore                       # Excludes virtual environments, raw datasets, builds
├── procfile                         # Process declaration for WSGI runner
├── requirements.txt                 # Backend Python package requirements
├── app.py                           # Dual-layer Flask server (legacy Jinja + REST API)
├── book_recommender_system.ipynb     # Jupyter notebook documenting exploratory modeling
│
├── [Model Pickles]
│   ├── popular.pkl                  # Top 50 popular books DataFrame (7.7 KB)
│   ├── pt.pkl                       # Collaborative pivot table 706 x 810 (4.6 MB)
│   ├── similar_books.pkl            # Cosine similarity matrix 706 x 706 (4.0 MB)
│   └── books.pkl                    # Full catalogue DataFrame (71.7 MB, tracked via Git LFS)
│
├── engine/                          # Recommendation Subsystem
│   ├── __init__.py                  # Package exports (HybridRecommender, get_recommender)
│   ├── recommender.py               # Core hybrid engine implementation
│   └── cache/                       # Precomputed fast-lookup structures
│       ├── catalogue_meta.pkl        # Fast ISBN and title index (79.4 MB)
│       └── content_index.pkl         # Inverted index TF-IDF weights (93.0 MB)
│
├── evaluation/                      # Evaluation Suite & Test Harness
│   ├── evaluate_recommender.py       # Deterministic evaluation script
│   ├── test_set.json                # Fixed evaluation query set
│   └── results/                     # Baseline and Stage 5B benchmark artifacts
│       ├── stage5b_report.md        # Comprehensive evaluation analysis
│       ├── stage5b_results.json     # Raw per-query results
│       └── stage5b_summary.csv      # Tabular per-query metrics
│
├── frontend/                        # React 19 Frontend Application
│   ├── package.json                 # Dependencies and scripts
│   ├── vite.config.js               # Dev server configuration and proxy rules
│   ├── index.html                   # HTML entry point
│   ├── src/
│   │   ├── App.jsx                  # Application router
│   │   ├── services/api.js          # Axios API communication service
│   │   ├── components/              # Reusable UI components (BookCard, SearchBar, etc.)
│   │   └── pages/                   # Application views (Home, Recommend, BookDetail)
│   └── public/                      # Static assets and icons
│
└── templates/                       # Legacy Flask Templates (Bootstrap 3)
    ├── index.html                   # Preserved for backward compatibility
    └── recommend.html
```

*Note: The `templates/` folder contains the legacy Bootstrap 3 Jinja2 server-rendered views preserved for backward compatibility. The primary user interface is the React 19 SPA.*

---

## Dataset & Model Artifacts

### Raw Datasets
The project was originally derived from the Book-Crossing dataset, comprising three tables:
- `Books.csv` (~73 MB): ISBN, title, author, publication year, publisher, and image URLs.
- `Ratings.csv` (~23 MB): User-ID, ISBN, and book rating (0–10 scale).
- `Users.csv` (~11 MB): User-ID, location, and demographic age.

*Raw CSV files are excluded from Git via `.gitignore` to prevent repository bloat.*

### Model Artifacts & Cache Files
- `books.pkl` (71.7 MB): Full catalogue metadata DataFrame, tracked via **Git LFS**.
- `pt.pkl` (4.6 MB): Dense pivot table representing ratings across 706 books and 810 users.
- `similar_books.pkl` (4.0 MB): Pairwise cosine similarity matrix.
- `popular.pkl` (7.7 KB): Pre-aggregated top 50 books with average ratings and counts.
- `engine/cache/catalogue_meta.pkl` (79.4 MB): Dictionary lookup tables mapping ISBNs to metadata.
- `engine/cache/content_index.pkl` (93.0 MB): Sparse inverted index mapping 112k tokens to document postings.

---

## Local Quick Start

### 1. Prerequisites
- **Python:** 3.12.x (tested environment)
- **Node.js:** 18+ or 20+ (with npm)
- **Git LFS:** Required to pull `books.pkl` (`git lfs pull`)

---

### 2. Backend Setup
From the repository root:

```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Start the Flask server
python app.py
```
The Flask backend will start on **`http://127.0.0.1:5000`**.

---

### 3. Frontend Setup
In a separate terminal window:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
The Vite development server will start on **`http://localhost:5173`**.

The development server automatically proxies all `/api/*` HTTP requests to `http://127.0.0.1:5000` via the proxy configuration in [`frontend/vite.config.js`](file:///c:/Users/kv997/Downloads/ML_Models/book_recommendation/project/frontend/vite.config.js).

---

### 4. Running the Evaluation Suite
To execute the deterministic 107-query evaluation benchmark:

```bash
# Ensure virtual environment is activated
python evaluation/evaluate_recommender.py
```
This runs the full test harness and outputs execution statistics, quality checks, and latency percentiles.

---

## Runtime Environment & Requirements

- **Backend Runtime:** Python 3.12.7 (64-bit). The pre-serialized pickle models use pickle protocol 5.
- **Frontend Tooling:** Node.js, npm, Vite 8.3, React 19.2.
- **Cross-Origin Setup:** In development, Vite reverse-proxies `/api` routes to avoid CORS browser friction. In addition, Flask-CORS is enabled on `/api/*`.

---

## Resource Requirements & Deployment Notes

- **Memory (RAM) Footprint:**
  - Inverted Index & Postings: ~750 MB
  - Catalogue Lookup Tables (271k books): ~350 MB
  - Total Single-Process Backend Memory: **approximately 1.1 GB RAM**
- **Hosting Considerations:**
  - **Free-Tier Warning:** Low-memory free-tier containers with 512 MB limits (e.g. basic free dynos on Render or Railway) are **not suitable** for the current single-container architecture and will fail with an Out-of-Memory (OOM) error during startup.
  - **Recommended Production Sizing:** A container or virtual server with at least **2.0 GB of available RAM** is recommended.
- **Production Status:** BookVerse is configured for local pair programming and evaluation. Production hardening, containerization, and cloud deployment pipelines are planned for upcoming stages.

---

## Limitations & Security Profile

1. **Metadata Quality Dependence:** Content-based similarity relies on book titles and author strings available in the original Book-Crossing dataset. Books lacking rich descriptive subtitles depend more heavily on author affinity.
2. **Collaborative Matrix Density:** The collaborative matrix covers 706 books. While the hybrid architecture seamlessly handles all other books via content retrieval, collaborative serendipity is concentrated on the high-interaction cohort.
3. **Memory Footprint:** Loading full inverted index postings in Python memory produces a ~1.1 GB process footprint.
4. **Development Security Defaults:** The current `app.py` script defaults to `debug=True` when invoked directly via `python app.py`. Production deployment will require formal environment-variable-driven configuration.

---

## Future Engineering Roadmap

- [ ] **Production Hardening:** Replace hardcoded debug flags and local proxy assumptions with dynamic environment variables (`PORT`, `DEBUG`, `CORS_ORIGINS`).
- [ ] **Containerization:** Provide a multi-stage `Dockerfile` and `docker-compose.yml` to bundle the built React SPA and Gunicorn backend.
- [ ] **Disk-Backed Retrieval (SQLite / Memory-Mapping):** Migrate the in-memory catalogue dictionary to SQLite or memory-mapped files (`mmap`) to reduce runtime RAM consumption from 1.1 GB to under 256 MB.
- [ ] **CI Pipeline:** Add a GitHub Actions workflow to run frontend linting (`oxlint`), production bundling (`vite build`), and backend evaluation (`evaluate_recommender.py`) on pull requests.
- [ ] **Enhanced Content Signals:** Incorporate book genre classifications and book description summaries to augment title/author lexical signals.

---

## Author & Project Information

- **Developer:** K Vaibhav
- **Repository:** [https://github.com/Vaibhavv526/book-recommendation](https://github.com/Vaibhavv526/book-recommendation)
- **License:** Open-source project for educational, portfolio, and research demonstration.
