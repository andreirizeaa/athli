# Per-User Job Locking Mechanism

This document explains the Redis-based locking mechanism that ensures only one job per user can run at a time in the FormAI service.

## Overview

The locking mechanism prevents multiple jobs from running simultaneously for the same user by using Redis locks. When a pose worker task starts, it attempts to acquire an exclusive lock for the user. If another job is already running for that user, the task is immediately requeued without being marked as failed.

## How It Works

### 1. Lock Acquisition (pose_stage)

When a `pose_stage` task starts:

1. **Try to acquire lock**: Uses `try_acquire_user_lock(user_id, job_id)` 
2. **If lock acquired**: Proceeds with pose processing
3. **If lock failed**: Raises `Reject(requeue=True)` to put the task back on the queue
4. **Lock held**: The lock remains active throughout the entire pipeline (pose + analyze)

### 2. Lock Release (analyze_stage)

When the `analyze_stage` task completes (success or failure):

1. **Always release lock**: Uses `release_user_lock(user_id, job_id)` in a `finally` block
2. **Atomic release**: Only releases if the current job still owns the lock
3. **Cleanup guaranteed**: Lock is released regardless of success/failure

### 3. Lock Properties

- **Key format**: `formai:userlock:{user_id}`
- **Value**: The `job_id` that owns the lock
- **TTL**: 20 minutes (configurable via `USER_LOCK_TTL_SECONDS`)
- **Atomic operations**: Uses Redis `SET NX EX` for acquisition and `WATCH/MULTI/EXEC` for release

## Key Benefits

1. **No job failures**: Tasks that can't acquire locks are requeued, not failed
2. **Crash safety**: Locks auto-expire if workers die unexpectedly
3. **Race condition prevention**: Redis atomic operations prevent race conditions
4. **Per-user isolation**: Each user can only have one active job at a time
5. **Pipeline-wide locking**: Lock covers both pose and analyze stages

## Configuration

Environment variables:

- `USER_LOCK_TTL_SECONDS`: Lock expiration time (default: 1200 seconds / 20 minutes)
- `CELERY_BROKER_URL` or `REDIS_URL`: Redis connection URL

## Testing

Run the test script to verify the locking mechanism:

```bash
python test_locks.py
```

The test script verifies:
- Redis connectivity
- Lock acquisition and release
- Concurrent access prevention
- Proper cleanup

## Implementation Details

### Files Modified

1. **`app/locks.py`** (new): Redis locking utilities
2. **`app/tasks.py`**: Updated pose_stage and analyze_stage tasks

### Key Functions

- `try_acquire_user_lock(user_id, job_id)`: Try to acquire exclusive lock
- `release_user_lock(user_id, job_id)`: Release lock (only if owned by job_id)
- `check_user_lock(user_id)`: Check if user has active lock

### Error Handling

- **Redis down**: Fails open (allows jobs to proceed) to prevent Redis issues from blocking all work
- **Lock acquisition failure**: Uses `Reject(requeue=True)` for immediate requeue
- **Lock release failure**: Logged but doesn't fail the job

## Monitoring

The locking mechanism includes comprehensive logging:

- Lock acquisition attempts and results
- Lock release operations
- Requeue events due to lock conflicts
- Redis connection issues

Look for log messages with `[Lock]` prefix and `component="pose_worker"` or `component="analyze_worker"`.

## Troubleshooting

### Common Issues

1. **Tasks stuck in queue**: Check if user has a long-running job or if lock wasn't released
2. **Redis connection errors**: Verify Redis is running and accessible
3. **Multiple jobs running**: Check if lock TTL is too short or if locks aren't being released

### Debug Commands

```bash
# Check if a user has an active lock
redis-cli GET "formai:userlock:USER_ID"

# List all user locks
redis-cli KEYS "formai:userlock:*"

# Clear a specific user lock (emergency only)
redis-cli DEL "formai:userlock:USER_ID"
```

## Future Enhancements

- Lock metrics and monitoring
- Per-user queue prioritization
- Lock timeout alerts
- Lock ownership verification
