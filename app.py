import os
import urllib.parse
import pickle
import numpy as np
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from engine.recommender import get_recommender

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
recommender = get_recommender(PROJECT_DIR)

# Reused catalogue & collaborative structures from hybrid recommender (zero duplicate loading)
popular = recommender.pop_engine.popular_df
pt = recommender.collab_engine.pt
similar_books = recommender.collab_engine.similar_books
collab_titles_set = recommender.collab_engine.collab_titles_set
collab_titles_lower_map = recommender.collab_engine.collab_titles_lower_map

isbn_to_book = recommender.isbn_to_book
title_to_isbn = recommender.title_to_isbn
title_lower_to_isbn = recommender.title_lower_to_isbn

# Server-Side Search Index (lightweight parallel arrays over canonical titles)
search_titles = list(title_to_isbn.keys())
search_titles_lower = [t.lower() for t in search_titles]
search_isbns = list(title_to_isbn.values())

app = Flask(__name__)
cors_origins_env = os.environ.get('CORS_ORIGINS', '*').strip()

if cors_origins_env == '*':
    cors_origins = '*'
else:
    cors_origins = [
        origin.strip()
        for origin in cors_origins_env.split(',')
        if origin.strip()
    ]

CORS(
    app,
    resources={r"/api/*": {"origins": cors_origins}},
    supports_credentials=False
)

def generate_amazon_url(title, author):
    query = f"{title} {author}".strip()
    return f"https://www.amazon.com/s?k={urllib.parse.quote_plus(query)}"

def generate_pdf_url(title):
    query = f"{title} PDF download".strip()
    return f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"

def enrich_book_details(book_dict):
    return recommender.enrich_book(book_dict)

def get_collaborative_recommendations(canonical_title):
    if canonical_title not in collab_titles_set:
        return None
    index = np.where(pt.index == canonical_title)[0][0]
    similar_items = sorted(list(enumerate(similar_books[index])), key=lambda x: x[1], reverse=True)[1:5]
    
    recs = []
    for i in similar_items:
        rec_title = pt.index[i[0]]
        rec_isbn = title_to_isbn.get(rec_title)
        if rec_isbn and rec_isbn in isbn_to_book:
            rec_book = enrich_book_details(isbn_to_book[rec_isbn])
        else:
            rec_book = enrich_book_details({
                'id': '',
                'isbn': '',
                'title': rec_title,
                'author': 'Unknown',
                'year': '',
                'publisher': 'Unknown',
                'image_url': '',
                'image_url_m': '',
                'image_url_l': '',
                'in_collaborative_model': True
            })
        recs.append(rec_book)
    return recs

def search_books(query, limit=8):
    q = query.strip().lower()
    if not q:
        return []
    
    exact = []
    prefix = []
    contains = []
    
    for i, t in enumerate(search_titles_lower):
        if t == q:
            exact.append(search_isbns[i])
        elif t.startswith(q):
            prefix.append(search_isbns[i])
        elif q in t:
            contains.append(search_isbns[i])
            
    combined = exact + prefix + contains
    seen = set()
    results = []
    for isbn in combined:
        if isbn not in seen and isbn in isbn_to_book:
            seen.add(isbn)
            results.append(enrich_book_details(isbn_to_book[isbn]))
            if len(results) >= limit:
                break
    return results

# ---------------------------------------------------------
# Modern REST API Endpoints
# ---------------------------------------------------------

@app.route('/api/books/popular', methods=['GET'])
def api_popular():
    popular_list = []
    for row in popular.itertuples(index=False):
        title = str(row[0]).strip()
        author = str(row[1]).strip()
        img_m = str(row[2]).strip()
        num_ratings = int(row[3])
        avg_rating = round(float(row[4]), 2)
        
        isbn = title_to_isbn.get(title, '')
        popular_list.append({
            'id': isbn,
            'isbn': isbn,
            'title': title,
            'author': author,
            'image_url': img_m,
            'image_url_m': img_m,
            'num_ratings': num_ratings,
            'avg_rating': avg_rating,
            'in_collaborative_model': title in collab_titles_set,
            'amazon_search_url': generate_amazon_url(title, author),
            'pdf_search_url': generate_pdf_url(title)
        })
    return jsonify({'count': len(popular_list), 'books': popular_list}), 200

@app.route('/api/books/search', methods=['GET'])
def api_search():
    q = request.args.get('q', '').strip()
    limit = request.args.get('limit', default=8, type=int)
    limit = max(1, min(limit, 50))
    if not q:
        return jsonify({'query': '', 'total_matches': 0, 'results': []}), 200
    results = search_books(q, limit=limit)
    return jsonify({'query': q, 'total_matches': len(results), 'results': results}), 200

@app.route('/api/books/<book_id>', methods=['GET'])
def api_book_detail(book_id):
    book = isbn_to_book.get(str(book_id).strip())
    if not book:
        return jsonify({'error': 'book_not_found', 'message': f"Book with ID '{book_id}' was not found in the catalogue."}), 404
    return jsonify(enrich_book_details(book)), 200

STRATEGY_LABELS = {
    'collaborative': 'Collaborative Reader Patterns',
    'content': 'Thematic & Author Affinity',
    'content_freeform': 'Thematic & Author Affinity',
    'content_with_popularity_backfill': 'Thematic Match + Popularity Fallback',
    'popularity_fallback': 'Popularity Fallback'
}

def format_recommendation_response(rec_res, source_book):
    strategy = rec_res.get('strategy', 'content')
    fallback_used = 'popularity' in strategy
    label = STRATEGY_LABELS.get(strategy, 'Thematic & Author Affinity')
    recs = rec_res.get('recommendations', [])

    return {
        'source_book': source_book,
        'model_type': 'collaborative' if strategy == 'collaborative' else 'hybrid',
        'count': len(recs),
        'recommendations': recs,
        'engine': {
            'strategy': strategy,
            'strategy_label': label,
            'fallback_used': fallback_used
        }
    }

@app.route('/api/recommend', methods=['POST'])
def api_recommend():
    data = request.get_json(silent=True) or request.form
    if not data:
        return jsonify({'error': 'invalid_request', 'message': "Request body must contain 'query' or 'id'."}), 400
    
    query = (data.get('query') or '').strip()
    book_id = (data.get('id') or '').strip()
    
    if not query and not book_id:
        return jsonify({'error': 'invalid_request', 'message': "Request body must contain 'query' or 'id'."}), 400
    
    if book_id:
        target_book = isbn_to_book.get(book_id)
        if not target_book:
            return jsonify({
                'error': 'book_not_found',
                'message': f"Book with ID '{book_id}' was not found in the catalogue."
            }), 404
        rec_res = recommender.recommend_by_title(target_book['title'], top_n=4)
        source_book = rec_res.get('source_book') or enrich_book_details(target_book)
        return jsonify(format_recommendation_response(rec_res, source_book)), 200

    elif query:
        resolved_book = recommender.resolve_book(query)
        if not resolved_book:
            return jsonify({
                'error': 'book_not_found',
                'message': 'Sorry, this book is not available in our catalogue. Please check the spelling or try another book.'
            }), 404
        
        rec_res = recommender.recommend_by_title(resolved_book['title'], top_n=4)
        source_book = rec_res.get('source_book') or enrich_book_details(resolved_book)
        return jsonify(format_recommendation_response(rec_res, source_book)), 200

@app.route('/api/books/<book_id>/similar', methods=['GET'])
def api_similar(book_id):
    clean_id = str(book_id).strip()
    book = isbn_to_book.get(clean_id)
    if not book:
        return jsonify({
            'error': 'book_not_found',
            'message': f"Book with ID '{book_id}' was not found in the catalogue."
        }), 404

    rec_res = recommender.recommend_by_title(book['title'], top_n=4)
    source_book = rec_res.get('source_book') or enrich_book_details(book)
    return jsonify(format_recommendation_response(rec_res, source_book)), 200

# ---------------------------------------------------------
# Legacy HTML Routes (Preserved for compatibility)
# ---------------------------------------------------------

@app.route('/')
def home():
    return render_template('index.html',
                           book_name=list(popular['Book-Title'].values),
                           author=list(popular['Book-Author'].values),
                           image=list(popular['Image-URL-M'].values),
                           votes=list(popular['num_ratings'].values),
                           rating=list(popular['avg_rating'].values)
                           )

@app.route('/recommend')
def recommend_ui():
    return render_template('recommend.html')

@app.route('/recommend_books', methods=['post'])
def recommend():
    user_input = request.form.get('user_input')
    if not user_input or not user_input.strip():
        return render_template('recommend.html', message="Please enter a book name.")

    cleaned_input = user_input.strip()

    # 1. Exact match in pt.index
    matches = np.where(pt.index == cleaned_input)[0]

    # 2. Case-insensitive fallback
    if len(matches) == 0:
        lower_input = cleaned_input.lower()
        lower_indices = [i for i, title in enumerate(pt.index) if str(title).lower() == lower_input]
        if lower_indices:
            matches = lower_indices

    # If book is not found in recommendation database
    if len(matches) == 0:
        return render_template(
            'recommend.html',
            message="Sorry, this book is not available in our recommendation database. Please try another book.",
            user_input=cleaned_input
        )

    index = matches[0]
    similar_items = sorted(list(enumerate(similar_books[index])), key=lambda x: x[1], reverse=True)[1:5]

    data = []
    for i in similar_items:
        rec_title = pt.index[i[0]]
        rec_isbn = title_to_isbn.get(rec_title)
        book_info = isbn_to_book.get(rec_isbn, {}) if rec_isbn else {}
        author = book_info.get('author', 'Unknown')
        image = book_info.get('image_url_m', '')
        data.append([rec_title, author, image])

    return render_template('recommend.html', data=data, user_input=cleaned_input)

# ---------------------------------------------------------
# Safe Error Handlers (Never expose Python tracebacks to API)
# ---------------------------------------------------------

@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'not_found', 'message': 'The requested API endpoint was not found.'}), 404
    return render_template('recommend.html', message="Page not found."), 404

@app.errorhandler(405)
def handle_405(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'method_not_allowed', 'message': 'HTTP method not allowed for this endpoint.'}), 405
    return render_template('recommend.html', message="Method not allowed."), 405

@app.errorhandler(500)
def handle_500(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'internal_server_error', 'message': 'An unexpected server error occurred.'}), 500
    return render_template('recommend.html', message="An internal server error occurred."), 500

@app.errorhandler(Exception)
def handle_general_exception(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'internal_server_error', 'message': 'An unexpected server error occurred.'}), 500
    return render_template('recommend.html', message="An error occurred while processing your request."), 500

if __name__ == '__main__':
    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', '5000'))
    DEBUG = os.environ.get('DEBUG', 'false').lower() in ('true', '1', 'yes')

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG
    )