FROM python:3.12-slim

WORKDIR /app

# Configure Python runtime environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000

# Install dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy runtime application code and model artifacts
COPY engine/ ./engine/
COPY templates/ ./templates/
COPY popular.pkl pt.pkl books.pkl similar_books.pkl ./
COPY app.py .
COPY .env.example .

# Informational port exposure (5000 for local container testing, 10000 for Render convention)
EXPOSE 5000 10000

# Production server execution with shell variable expansion for Render $PORT compatibility
CMD ["sh", "-c", "exec gunicorn --workers=1 --threads=2 --timeout=120 --bind=0.0.0.0:${PORT:-5000} app:app"]
