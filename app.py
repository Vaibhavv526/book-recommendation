from flask import Flask,render_template,request
import pickle
import numpy as np

popular = pickle.load(open('popular.pkl','rb'))
pt = pickle.load(open('pt.pkl','rb'))
books = pickle.load(open('books.pkl','rb'))
similar_books = pickle.load(open('similar_books.pkl','rb'))

app = Flask(__name__)

@app.route('/')
def home():
    # return render_template('index.html')
    return render_template('index.html',
                           book_name = list(popular['Book-Title'].values),
                           author=list(popular['Book-Author'].values),
                           image=list(popular['Image-URL-M'].values),
                           votes=list(popular['num_ratings'].values),
                           rating=list(popular['avg_rating'].values)
                           )

@app.route('/recommend')
def recommend_ui():
    return render_template('recommend.html')

@app.route('/recommend_books',methods=['post'])
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

    print(data)

    return render_template('recommend.html', data=data, user_input=cleaned_input)

if __name__ == '__main__':
    app.run(debug=True)