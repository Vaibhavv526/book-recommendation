import urllib.parse
import pickle
import numpy as np
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

popular = pickle.load(open('popular.pkl','rb'))
pt = pickle.load(open('pt.pkl','rb'))
books = pickle.load(open('books.pkl','rb'))
similar_books = pickle.load(open('similar_books.pkl','rb'))

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# ---------------------------------------------------------
# Server-Side Search Index & Metadata Lookup Structures
# ---------------------------------------------------------
collab_titles_set = set(pt.index)
collab_titles_lower_map = {title.lower(): title for title in pt.index}

# 1. Full ISBN lookup table for all 271,360 books in books.pkl
isbn_to_book = {}
for row in books.itertuples(index=False):
    isbn = str(row[0]).strip()
    title = str(row[1]).strip()
    author = str(row[2]).strip() if str(row[2]).strip() not in ('nan', '') else 'Unknown'
    year = str(row[3]).strip() if str(row[3]).strip() not in ('nan', '') else ''
    publisher = str(row[4]).strip() if str(row[4]).strip() not in ('nan', '') else 'Unknown'
    img_m = str(row[6]).strip() if str(row[6]).strip() not in ('nan', '') else ''
    img_l = str(row[7]).strip() if str(row[7]).strip() not in ('nan', '') else ''
    
    in_collab = title in collab_titles_set
    
    isbn_to_book[isbn] = {
        'id': isbn,
        'isbn': isbn,
        'title': title,
        'author': author,
        'year': year,
        'publisher': publisher,
        'image_url': img_m,
        'image_url_m': img_m,
        'image_url_l': img_l,
        'in_collaborative_model': in_collab
    }

# 2. Deduplicated search index & title-to-isbn mapping (one canonical entry per title)
books_unique = books.drop_duplicates('Book-Title')
title_to_isbn = {}
title_lower_to_isbn = {}
search_items = []
search_titles_lower = []

for row in books_unique.itertuples(index=False):
    isbn = str(row[0]).strip()
    title = str(row[1]).strip()
    b_dict = isbn_to_book[isbn]
    
    title_to_isbn[title] = isbn
    title_lower_to_isbn[title.lower()] = isbn
    search_items.append(b_dict)
    search_titles_lower.append(title.lower())

def generate_amazon_url(title, author):
    query = f"{title} {author}".strip()
    return f"https://www.amazon.com/s?k={urllib.parse.quote_plus(query)}"

def generate_pdf_url(title):
    query = f"{title} PDF download".strip()
    return f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"

def enrich_book_details(book_dict):
    b = dict(book_dict)
    b['amazon_search_url'] = generate_amazon_url(b.get('title', ''), b.get('author', ''))
    b['pdf_search_url'] = generate_pdf_url(b.get('title', ''))
    return b

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
            temp_df = books[books['Book-Title'] == rec_title]
            rec_book = {
                'id': str(temp_df['ISBN'].values[0]) if len(temp_df) > 0 else '',
                'isbn': str(temp_df['ISBN'].values[0]) if len(temp_df) > 0 else '',
                'title': rec_title,
                'author': str(temp_df['Book-Author'].values[0]) if len(temp_df) > 0 else 'Unknown',
                'year': str(temp_df['Year-Of-Publication'].values[0]) if len(temp_df) > 0 else '',
                'publisher': str(temp_df['Publisher'].values[0]) if len(temp_df) > 0 else 'Unknown',
                'image_url': str(temp_df['Image-URL-M'].values[0]) if len(temp_df) > 0 else '',
                'image_url_m': str(temp_df['Image-URL-M'].values[0]) if len(temp_df) > 0 else '',
                'image_url_l': str(temp_df['Image-URL-L'].values[0]) if len(temp_df) > 0 else '',
                'in_collaborative_model': True,
                'amazon_search_url': generate_amazon_url(rec_title, ''),
                'pdf_search_url': generate_pdf_url(rec_title)
            }
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
            exact.append(search_items[i])
        elif t.startswith(q):
            prefix.append(search_items[i])
        elif q in t:
            contains.append(search_items[i])
            
    combined = exact + prefix + contains
    seen = set()
    results = []
    for item in combined:
        if item['id'] not in seen:
            seen.add(item['id'])
            results.append(enrich_book_details(item))
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

@app.route('/api/recommend', methods=['POST'])
def api_recommend():
    data = request.get_json(silent=True) or request.form
    if not data:
        return jsonify({'error': 'invalid_request', 'message': "Request body must contain 'query' or 'id'."}), 400
    
    query = (data.get('query') or '').strip()
    book_id = (data.get('id') or '').strip()
    
    target_book = None
    canonical_title = None
    
    if book_id:
        target_book = isbn_to_book.get(book_id)
        if target_book:
            canonical_title = target_book['title']
    elif query:
        # Match against collaborative index first
        if query in collab_titles_set:
            canonical_title = query
        elif query.lower() in collab_titles_lower_map:
            canonical_title = collab_titles_lower_map[query.lower()]
        elif query in title_to_isbn:
            canonical_title = query
        elif query.lower() in title_lower_to_isbn:
            isbn = title_lower_to_isbn[query.lower()]
            canonical_title = isbn_to_book[isbn]['title']
        
        if canonical_title:
            isbn = title_to_isbn.get(canonical_title)
            if isbn and isbn in isbn_to_book:
                target_book = isbn_to_book[isbn]
    
    if not target_book and not canonical_title:
        return jsonify({
            'error': 'book_not_found',
            'message': 'Sorry, this book is not available in our catalogue. Please check the spelling or try another book.'
        }), 404
    
    if canonical_title not in collab_titles_set:
        return jsonify({
            'error': 'book_not_in_recommender',
            'message': 'This book is available in the catalogue but is not currently supported by the collaborative recommendation model.',
            'book': enrich_book_details(target_book) if target_book else {'title': canonical_title}
        }), 404
    
    recs = get_collaborative_recommendations(canonical_title)
    return jsonify({
        'source_book': enrich_book_details(target_book) if target_book else {'title': canonical_title},
        'model_type': 'collaborative',
        'count': len(recs),
        'recommendations': recs
    }), 200

@app.route('/api/books/<book_id>/similar', methods=['GET'])
def api_similar(book_id):
    book = isbn_to_book.get(str(book_id).strip())
    if not book:
        return jsonify({'error': 'book_not_found', 'message': f"Book with ID '{book_id}' was not found in the catalogue."}), 404
    
    if not book['in_collaborative_model']:
        return jsonify({
            'error': 'book_not_in_recommender',
            'message': 'This book is not currently supported by the collaborative recommendation model.',
            'book': enrich_book_details(book)
        }), 404
        
    recs = get_collaborative_recommendations(book['title'])
    return jsonify({
        'source_book': enrich_book_details(book),
        'model_type': 'collaborative',
        'count': len(recs),
        'recommendations': recs
    }), 200

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
        item = []
        temp_df = books[books['Book-Title'] == pt.index[i[0]]]
        item.extend(list(temp_df.drop_duplicates('Book-Title')['Book-Title'].values))
        item.extend(list(temp_df.drop_duplicates('Book-Title')['Book-Author'].values))
        item.extend(list(temp_df.drop_duplicates('Book-Title')['Image-URL-M'].values))

        data.append(item)

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
    app.run(debug=True)