FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgtk-3-0 \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ .

# Copy Gunicorn configuration
COPY gunicorn.conf.py .

# Add the current directory to Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Set environment variables for maximum concurrency
ENV GUNICORN_WORKERS=4
ENV PORT=8000

# Default command - use Gunicorn for production with maximum concurrency
CMD ["gunicorn", "-c", "gunicorn.conf.py", "main:app"]
