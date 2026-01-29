import { useState, useEffect, useCallback } from 'react';

import { WorkoutMeta } from '@athli/shared-types';

export const useWorkoutTimer = (workoutMeta: WorkoutMeta | null) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isPaused = !!workoutMeta?.pausedAt;

  const getElapsedSeconds = useCallback(() => {
    if (!workoutMeta?.startedAt) return 0;
    const startTime = new Date(workoutMeta.startedAt).getTime();
    const pausedMs = workoutMeta.totalPausedMs || 0;

    if (workoutMeta.pausedAt) {
      const pauseTime = new Date(workoutMeta.pausedAt).getTime();
      return Math.floor((pauseTime - startTime - pausedMs) / 1000);
    }
    return Math.floor((Date.now() - startTime - pausedMs) / 1000);
  }, [workoutMeta]);

  useEffect(() => {
    setElapsedSeconds(getElapsedSeconds());
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, getElapsedSeconds]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return { elapsedSeconds, formattedTime: formatTime(elapsedSeconds), isPaused };
};
