'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCoachWorkouts } from '@/hooks/use-coach-workouts';
import { useCoachPrograms } from '@/hooks/use-coach-programs';
import { useCoachExercises } from '@/hooks/use-coach-exercises';
import type { Workout, Program } from '@/components/app/app-shell';
import type { Exercise } from '@/api/coach/coach-exercise-service';

type TrainingDataContextType = {
  workouts: Workout[];
  programs: Program[];
  exercises: Exercise[];
  isLoadingWorkouts: boolean;
  isLoadingPrograms: boolean;
  isLoadingExercises: boolean;
  refreshWorkouts: () => Promise<void>;
  refreshPrograms: () => Promise<void>;
  refreshExercises: () => Promise<void>;
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
};

const TrainingDataContext = createContext<TrainingDataContextType | null>(null);

export const useTrainingData = () => {
  const context = useContext(TrainingDataContext);
  if (!context) {
    throw new Error('useTrainingData must be used within TrainingDataProvider');
  }
  return context;
};

type TrainingDataProviderProps = {
  children: ReactNode;
};

export const TrainingDataProvider = ({ children }: TrainingDataProviderProps) => {
  const queryClient = useQueryClient();

  // Use hooks to fetch data (will use cache if preloaded)
  const { workouts: cachedWorkouts, isLoading: isWLoading } = useCoachWorkouts();
  const { programs: cachedPrograms, isLoading: isPLoading } = useCoachPrograms();
  const { exercises: cachedExercises, isLoading: isELoading } = useCoachExercises();

  // Maintain local state for context consumers (compatibility)
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Sync cache to local state
  useEffect(() => {
    if (cachedWorkouts) setWorkouts(cachedWorkouts);
  }, [cachedWorkouts]);

  useEffect(() => {
    if (cachedPrograms) setPrograms(cachedPrograms);
  }, [cachedPrograms]);

  useEffect(() => {
    if (cachedExercises) setExercises(cachedExercises);
  }, [cachedExercises]);

  // Refresh functions invalidate queries to trigger refetch
  const refreshWorkouts = async () => {
    await queryClient.invalidateQueries({ queryKey: ['coach-workouts'] });
  };

  const refreshPrograms = async () => {
    await queryClient.invalidateQueries({ queryKey: ['coach-programs'] });
  };

  const refreshExercises = async () => {
    await queryClient.invalidateQueries({ queryKey: ['coach-exercises'] });
  };

  const value = {
    workouts,
    programs,
    exercises,
    isLoadingWorkouts: isWLoading,
    isLoadingPrograms: isPLoading,
    isLoadingExercises: isELoading,
    refreshWorkouts,
    refreshPrograms,
    refreshExercises,
    setWorkouts,
    setPrograms,
    setExercises,
  };

  return (
    <TrainingDataContext.Provider value={value}>
      {children}
    </TrainingDataContext.Provider>
  );
};
