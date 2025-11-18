import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import numpy as np

# Download VADER lexicon if not already present
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except nltk.downloader.DownloadError:
    nltk.download('vader_lexicon', quiet=True)

# Initialize Flask App and CORS
app = Flask(__name__)
# CRITICAL FIX: Allow all origins (*) for development
CORS(app) 
sia = SentimentIntensityAnalyzer()

# --- Helper Function for JSON Serialization ---
def convert_nan_to_null(obj):
    """Converts numpy NaN types to Python None for JSON serialization."""
    if isinstance(obj, float) and np.isnan(obj):
        return None
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

# --- Sentiment Analysis Core Logic ---
def analyze_review(review, id_num, rating=None):
    if not isinstance(review, str):
        review = str(review)
        
    scores = sia.polarity_scores(review)
    compound_score = scores['compound']

    if compound_score >= 0.05:
        sentiment = "Positive"
    elif compound_score <= -0.05:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"

    return {
        'id': id_num,
        'review': review,
        'compound_score': compound_score,
        'sentiment': sentiment,
        'pos': scores['pos'],
        'neg': scores['neg'],
        'neu': scores['neu'],
        'rating': rating  # Include rating if available
    }

# --- Flask Routes ---

@app.route('/load_data', methods=['GET'])
def load_data():
    """Loads and analyzes data from sample_reviews.csv."""
    try:
        # Assuming the CSV is in the same directory
        df = pd.read_csv('sample_reviews.csv')
        
        # Ensure 'review' column exists and replace NaN with empty string for VADER
        if 'review' not in df.columns:
             return jsonify({'error': 'CSV must contain a column named "review"'}), 400
        
        # Optionally, rename the index to 'id' for easier tracking
        df.index.name = 'id'
        df = df.reset_index()

        results = []
        # Check if 'rating' column exists
        has_rating = 'rating' in df.columns

        for index, row in df.iterrows():
            rating_value = row['rating'] if has_rating else None
            
            # Use 'review' or 'text' column, falling back to an empty string
            review_text = str(row['review']) if pd.notna(row['review']) else ""

            analysis = analyze_review(review_text, row['id'] + 1, rating_value)
            results.append(analysis)

        # CRITICAL FIX: Use the custom encoder to handle NaN values before serialization
        return app.response_class(
            response=json.dumps(results, default=convert_nan_to_null),
            status=200,
            mimetype='application/json'
        )

    except FileNotFoundError:
        return jsonify({'error': 'sample_reviews.csv not found. Please ensure the file is in the server directory.'}), 404
    except Exception as e:
        print(f"Error during CSV processing: {e}")
        return jsonify({'error': f'An error occurred during processing: {str(e)}'}), 500

@app.route('/analyze', methods=['POST'])
def analyze_input():
    """Analyzes a list of reviews sent via POST request."""
    data = request.get_json()
    reviews = data.get('reviews', [])

    if not reviews:
        return jsonify({'error': 'No reviews provided.'}), 400

    results = []
    for i, review in enumerate(reviews):
        analysis = analyze_review(review, i + 1)
        results.append(analysis)

    return jsonify(results)

if __name__ == '__main__':
    # Running on 0.0.0.0 allows access from external sources, necessary for React connection
    app.run(host='0.0.0.0', port=5000)