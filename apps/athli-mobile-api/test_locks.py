#!/usr/bin/env python3
"""
Test script to verify the Redis locking mechanism works correctly.
This script simulates multiple workers trying to process jobs for the same user.
"""

import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor

# Add the app directory to the path so we can import our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from locks import try_acquire_user_lock, release_user_lock, check_user_lock

def simulate_worker(worker_id: int, user_id: str, job_id: str, duration: float = 2.0):
    """
    Simulate a worker trying to acquire a lock and process a job.
    
    Args:
        worker_id: Unique identifier for this worker
        user_id: User ID to lock
        job_id: Job ID for this worker
        duration: How long to hold the lock (simulate processing time)
    """
    print(f"[Worker {worker_id}] Attempting to acquire lock for user {user_id}, job {job_id}")
    
    # Try to acquire the lock
    if try_acquire_user_lock(user_id, job_id):
        print(f"[Worker {worker_id}] ✅ SUCCESS: Acquired lock for user {user_id}")
        
        # Simulate processing work
        print(f"[Worker {worker_id}] Processing job {job_id} for {duration} seconds...")
        time.sleep(duration)
        
        # Release the lock
        release_user_lock(user_id, job_id)
        print(f"[Worker {worker_id}] ✅ Released lock for user {user_id}")
        return True
    else:
        print(f"[Worker {worker_id}] ❌ FAILED: Could not acquire lock for user {user_id} (already locked)")
        return False

def test_concurrent_locks():
    """Test that only one worker can hold a lock for a user at a time."""
    print("🧪 Testing concurrent lock acquisition...")
    print("=" * 60)
    
    user_id = "test_user_123"
    num_workers = 5
    
    # Create workers that will try to acquire the same user lock
    workers = []
    for i in range(num_workers):
        job_id = f"job_{i}_{int(time.time())}"
        workers.append((i, user_id, job_id, 3.0))  # 3 second processing time
    
    # Run workers concurrently
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(simulate_worker, *worker) for worker in workers]
        results = [future.result() for future in futures]
    
    # Check results
    successful_workers = sum(results)
    print(f"\n📊 Results:")
    print(f"   Total workers: {num_workers}")
    print(f"   Successful locks: {successful_workers}")
    print(f"   Failed locks: {num_workers - successful_workers}")
    
    if successful_workers == 1:
        print("✅ TEST PASSED: Only one worker acquired the lock (as expected)")
    else:
        print("❌ TEST FAILED: Multiple workers acquired the same lock")
    
    return successful_workers == 1

def test_lock_cleanup():
    """Test that locks are properly cleaned up."""
    print("\n🧪 Testing lock cleanup...")
    print("=" * 60)
    
    user_id = "cleanup_test_user"
    job_id = "cleanup_test_job"
    
    # Check no lock exists initially
    current_lock = check_user_lock(user_id)
    print(f"Initial lock status: {current_lock}")
    
    # Acquire lock
    if try_acquire_user_lock(user_id, job_id):
        print(f"✅ Acquired lock for {user_id}")
        
        # Check lock exists
        current_lock = check_user_lock(user_id)
        print(f"Lock status after acquisition: {current_lock}")
        
        # Release lock
        release_user_lock(user_id, job_id)
        print(f"✅ Released lock for {user_id}")
        
        # Check lock is gone
        current_lock = check_user_lock(user_id)
        print(f"Lock status after release: {current_lock}")
        
        if current_lock is None:
            print("✅ TEST PASSED: Lock properly cleaned up")
            return True
        else:
            print("❌ TEST FAILED: Lock not properly cleaned up")
            return False
    else:
        print("❌ TEST FAILED: Could not acquire initial lock")
        return False

def test_redis_connection():
    """Test that Redis connection is working."""
    print("🧪 Testing Redis connection...")
    print("=" * 60)
    
    try:
        from locks import r
        # Try a simple ping
        r.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("Make sure Redis is running and accessible")
        return False

if __name__ == "__main__":
    print("🔒 Redis Lock Testing Suite")
    print("=" * 60)
    
    # Test Redis connection first
    if not test_redis_connection():
        print("\n❌ Cannot proceed without Redis connection")
        sys.exit(1)
    
    # Run tests
    tests_passed = 0
    total_tests = 3
    
    if test_redis_connection():
        tests_passed += 1
    
    if test_lock_cleanup():
        tests_passed += 1
    
    if test_concurrent_locks():
        tests_passed += 1
    
    print(f"\n🏁 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! The locking mechanism is working correctly.")
        sys.exit(0)
    else:
        print("💥 Some tests failed. Please check the implementation.")
        sys.exit(1)
