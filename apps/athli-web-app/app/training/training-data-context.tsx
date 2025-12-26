'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getWorkouts } from '@/api/coach/coach-workout-service';
import { getPrograms } from '@/api/coach/coach-program-service';
import { getExercises } from '@/api/coach/coach-exercise-service';
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
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);

  const loadWorkouts = async () => {
    try {
      setIsLoadingWorkouts(true);
      const data = await getWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setIsLoadingWorkouts(false);
    }
  };

  const loadPrograms = async () => {
    try {
      setIsLoadingPrograms(true);
      const data = await getPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  const loadExercises = async () => {
    try {
      setIsLoadingExercises(true);
      const data = await getExercises();
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  useEffect(() => {
    // Load all three datasets in parallel on mount
    Promise.all([
      loadWorkouts(),
      loadPrograms(),
      loadExercises(),
    ]);
  }, []);

  const value = {
    workouts,
    programs,
    exercises,
    isLoadingWorkouts,
    isLoadingPrograms,
    isLoadingExercises,
    refreshWorkouts: loadWorkouts,
    refreshPrograms: loadPrograms,
    refreshExercises: loadExercises,
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
