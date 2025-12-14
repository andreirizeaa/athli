# Athli Mobile API

The backend API for the Athli mobile application, built with FastAPI and Python.

## Tech Stack

- **Python** 3.12+ - Programming language
- **FastAPI** - Modern, fast web framework
- **Celery** - Distributed task queue
- **Redis** - Caching and message broker
- **Supabase** - Database and backend services
- **OpenAI** - AI/ML services
- **MediaPipe** - Computer vision
- **Google GenAI** - AI services
- **Uvicorn** - ASGI server
- **Gunicorn** - Production WSGI server

## Getting Started

### Prerequisites

- **Python** 3.12 or higher
- **Redis** - For Celery task queue
- **pip** - Python package manager

### Installation

1. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd app
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the `app/` directory with the following variables:

```env
PORT=8000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Development

1. Start Redis (required for Celery):
```bash
redis-server
```

2. Start the Celery worker (in a separate terminal):
```bash
cd app
celery -A celery_app.celery worker --loglevel=info
```

3. Start the FastAPI development server:
```bash
cd app
uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**

API documentation (Swagger UI) will be available at **http://localhost:8000/docs**

### Production

For production, use Gunicorn with Uvicorn workers:

```bash
cd app
gunicorn main:app -c gunicorn.conf.py
```

Or use the provided start script:

```bash
./start_server.sh
```

## Available Scripts

- `uvicorn main:app --reload` - Start development server with hot reload
- `celery -A celery_app.celery worker --loglevel=info` - Start Celery worker
- `celery -A celery_app.celery flower --port=5555` - Start Celery monitoring (Flower)
- `gunicorn main:app -c gunicorn.conf.py` - Start production server

## Docker

### Development

Start all services with Docker Compose:

```bash
docker-compose up
```

This will start:
- FastAPI server on port 8000
- Redis on port 6379
- Celery worker
- Flower (Celery monitoring) on port 5555

### Production

```bash
docker-compose -f docker-compose.production.yml up
```

## Project Structure

```
athli-mobile-api/
├── app/
│   ├── api/              # API routes and endpoints
│   ├── lib/              # Library code
│   │   └── LiftAnalsis/ # Lift analysis module
│   ├── tasks/            # Celery tasks
│   ├── utils/            # Utility functions
│   ├── main.py          # FastAPI application entry point
│   ├── celery_app.py    # Celery configuration
│   ├── config.py        # Configuration and settings
│   └── requirements.txt # Python dependencies
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
└── gunicorn.conf.py     # Gunicorn configuration
```

## API Endpoints

### Documentation
- `GET /docs` - **Swagger UI** - Interactive API documentation
- `GET /redoc` - **ReDoc** - Alternative API documentation

### Health Check
- `GET /health` - Returns server status

### Lifts
- `POST /api/lifts` - Submit a lift for analysis
- `GET /api/lifts/{job_id}` - Get lift analysis status

## Background Tasks

The API uses Celery for background task processing:

- **Lift Analysis** - Processes video uploads and performs pose analysis
- **Video Processing** - Handles video uploads and storage
- **Push Notifications** - Sends notifications when analysis is complete

Monitor tasks using Flower:
```bash
celery -A celery_app.celery flower --port=5555
```

Then visit **http://localhost:5555** to view the Celery dashboard.

## Features

- ✅ **Async Processing** - Celery for background tasks
- ✅ **Video Analysis** - MediaPipe pose detection
- ✅ **AI Integration** - OpenAI and Google GenAI
- ✅ **Task Monitoring** - Flower for Celery monitoring
- ✅ **Structured Logging** - JSON logging with context
- ✅ **Error Handling** - Comprehensive error handling
- ✅ **Type Safety** - Type hints throughout
- ✅ **Scalable** - Horizontal scaling with Celery workers
