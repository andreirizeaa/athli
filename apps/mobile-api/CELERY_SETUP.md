# Celery + Redis Background Job Setup

This document describes the new Celery + Redis setup for durable background lift analysis jobs.

## Overview

The backend now uses Celery with Redis as the message broker to handle lift analysis as durable background jobs. This provides:

- Fast POST `/lifts/analyse` → returns 202 Accepted with a job_id
- Durable job processing that survives app restarts
- Progress tracking and status monitoring
- Idempotent job processing

## Architecture

1. **FastAPI API Server**: Handles HTTP requests and enqueues jobs
2. **Celery Worker**: Processes background jobs from Redis queue
3. **Redis**: Message broker and result backend
4. **PostgreSQL**: Jobs table tracks job status and progress

## New Endpoints

### POST `/lifts/analyse`
- **Status**: 202 Accepted
- **Response**: `{"accepted": true, "job_id": "...", "lift_id": "..."}`
- Enqueues a background job for lift analysis

### GET `/lifts/jobs/{job_id}?userId={userId}`
- **Response**: Job status and progress information
- Use this to show progress spinners in the UI

### GET `/lifts/lookup?key={job_id}&userId={userId}`
- **Response**: Completed lift data (by asset_id OR id)
- Use this to fetch the final result

## Environment Variables

Add these to your `.env` file:

```bash
# Celery / Redis
REDIS_URL=redis://redis:6379/0

# Existing Supabase variables...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Schema

The setup requires a `jobs` table in your Supabase database:

```sql
-- jobs table to track analysis status
create table if not exists jobs (
  id text primary key,                 -- job_id (use liftId/assetId)
  user_id uuid not null,
  kind text not null default 'lift_analysis',
  status text not null,                -- queued | running | succeeded | failed
  progress int not null default 0,     -- 0..100
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists jobs_user_id_idx on jobs(user_id);
```

## Running the System

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up
```

This starts:
- API server on port 8000
- Celery worker
- Redis on port 6379

### Option 2: Manual Setup

1. **Start Redis**:
   ```bash
   redis-server
   ```

2. **Start API Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Start Celery Worker**:
   ```bash
   celery -A app.celery_app.celery worker --loglevel=INFO -Q analysis
   ```

## Job Flow

1. Client sends POST `/lifts/analyse` with lift data
2. API creates job record with status "queued"
3. API enqueues Celery task and returns 202 with job_id
4. Celery worker picks up the task
5. Worker updates job status to "running" and processes:
   - Video validation
   - Pose estimation
   - AI analysis
   - Database upload
6. Worker updates job status to "succeeded" or "failed"
7. Client polls `/lifts/jobs/{job_id}` for status
8. Client fetches final result via `/lifts/lookup?key={job_id}`

## Error Handling

The system handles various error conditions:
- `WRONG_MOVEMENT`: Video doesn't match expected exercise
- `NO_GYM_VIDEO_FOUND`: Video doesn't contain gym exercise
- `VIDEO_VALIDATION_FAILED`: General validation error
- `POSE_ESTIMATION_FAILED`: Pose detection failed
- `AI_ANALYSIS_FAILED`: Gemini analysis failed

## Monitoring

- Check job status: `GET /lifts/jobs/{job_id}?userId={userId}`
- View job progress (0-100%)
- Check error messages for failed jobs
- Jobs are automatically retried up to 3 times with exponential backoff

## Migration from Background Tasks

The old FastAPI background task system has been replaced with Celery. The API endpoints remain the same, but now use durable job processing instead of in-memory background tasks.
