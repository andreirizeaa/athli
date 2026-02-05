'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCoachWorkouts } from '@/hooks/use-coach-workouts';
import { useCoachPrograms } from '@/hooks/use-coach-programs';
import { useCoachExercises } from '@/hooks/use-coach-exercises';
import { useCoachSections } from '@/hooks/use-coach-sections';
import type { Workout, Program } from '@/components/app/app-shell';
import type { Exercise } from '@/api/coach/coach-exercise-service';
import type { Section } from '@/api/coach/coach-section-service';

type TrainingDataContextType = {
  workouts: Workout[];
  programs: Program[];
  exercises: Exercise[];
  sections: Section[];
  isLoadingWorkouts: boolean;
  isLoadingPrograms: boolean;
  isLoadingExercises: boolean;
  isLoadingSections: boolean;
  refreshWorkouts: () => Promise<void>;
  refreshPrograms: () => Promise<void>;
  refreshExercises: () => Promise<void>;
  refreshSections: () => Promise<void>;
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
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
  const { sections: cachedSections, isLoading: isSLoading } = useCoachSections();

  // Maintain local state for context consumers (compatibility)
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Sync cache to local state - only update if data actually changed
  useEffect(() => {
    if (cachedWorkouts && cachedWorkouts !== workouts) setWorkouts(cachedWorkouts);
  }, [cachedWorkouts, workouts]);

  useEffect(() => {
    if (cachedPrograms && cachedPrograms !== programs) setPrograms(cachedPrograms);
  }, [cachedPrograms, programs]);

  useEffect(() => {
    if (cachedExercises && cachedExercises !== exercises) setExercises(cachedExercises);
  }, [cachedExercises, exercises]);

  useEffect(() => {
    if (cachedSections && cachedSections !== sections) setSections(cachedSections);
  }, [cachedSections, sections]);

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

  const refreshSections = async () => {
    await queryClient.invalidateQueries({ queryKey: ['coach-sections'] });
  };

  const value = useMemo(() => ({
    workouts,
    programs,
    exercises,
    sections,
    isLoadingWorkouts: isWLoading,
    isLoadingPrograms: isPLoading,
    isLoadingExercises: isELoading,
    isLoadingSections: isSLoading,
    refreshWorkouts,
    refreshPrograms,
    refreshExercises,
    refreshSections,
    setWorkouts,
    setPrograms,
    setExercises,
    setSections,
  }), [
    workouts,
    programs,
    exercises,
    sections,
    isWLoading,
    isPLoading,
    isELoading,
    isSLoading,
    refreshWorkouts,
    refreshPrograms,
    refreshExercises,
    refreshSections,
  ]);

  return (
    <TrainingDataContext.Provider value={value}>
      {children}
    </TrainingDataContext.Provider>
  );
};
