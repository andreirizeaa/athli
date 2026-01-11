/**
 * Centralized data fetching hooks that sync React Query with Zustand
 *
 * These hooks should be used ONCE at the app root level (in _layout.tsx)
 * Components should subscribe to Zustand stores directly, not call these hooks.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryStore } from '@/stores/useLibraryStore';
import {
  getCheckIns,
  deleteCheckIn,
  duplicateCheckIn,
  type CheckIn,
} from '@/services/coach/coach-check-in-service';
import {
  getExercises,
  deleteExercises,
  duplicateExercises,
  type Exercise,
} from '@/services/coach/coach-exercise-service';
import {
  getAllHabits,
  deleteHabit,
  duplicateHabit,
  type Habit,
  type DeleteHabitData,
} from '@/services/coach/coach-habit-service';
import {
  getAllMetrics,
  deleteMetric,
  duplicateMetric,
  type Metric,
} from '@/services/coach/coach-metric-service';
import {
  getQuestionnaires,
  deleteQuestionnaire,
  duplicateQuestionnaire,
  type Questionnaire,
} from '@/services/coach/coach-questionnaire-service';
import {
  getSections,
  deleteSections,
  duplicateSection,
  type Section,
} from '@/services/coach/coach-section-service';
import {
  getWorkouts,
  deleteWorkouts,
  duplicateWorkout,
} from '@/services/coach/coach-workout-service';
import {
  getPrograms,
  deletePrograms,
  duplicateProgram,
} from '@/services/coach/coach-program-service';
import {
  getAllFiles,
  deleteFile,
  type CoachFile,
  type DeleteFileData,
} from '@/services/coach/coach-file-service';

/**
 * Hook to fetch and sync all library data
 * Call this ONCE in the root layout
 */
export function useLibraryData() {
  const setCheckIns = useLibraryStore((state) => state.setCheckIns);
  const setExercises = useLibraryStore((state) => state.setExercises);
  const setHabits = useLibraryStore((state) => state.setHabits);
  const setMetrics = useLibraryStore((state) => state.setMetrics);
  const setQuestionnaires = useLibraryStore((state) => state.setQuestionnaires);
  const setSections = useLibraryStore((state) => state.setSections);
  const setWorkouts = useLibraryStore((state) => state.setWorkouts);
  const setPrograms = useLibraryStore((state) => state.setPrograms);
  const setFiles = useLibraryStore((state) => state.setFiles);

  // Check-ins
  const checkInsQuery = useQuery({
    queryKey: ['checkIns'],
    queryFn: getCheckIns,
    staleTime: 5 * 60 * 1000,
  });

  // Exercises
  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
    staleTime: 5 * 60 * 1000,
  });

  // Habits
  const habitsQuery = useQuery({
    queryKey: ['habits'],
    queryFn: getAllHabits,
    staleTime: 5 * 60 * 1000,
  });

  // Metrics
  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: getAllMetrics,
    staleTime: 5 * 60 * 1000,
  });

  // Questionnaires
  const questionnairesQuery = useQuery({
    queryKey: ['questionnaires'],
    queryFn: getQuestionnaires,
    staleTime: 5 * 60 * 1000,
  });

  // Sections
  const sectionsQuery = useQuery({
    queryKey: ['sections'],
    queryFn: getSections,
    staleTime: 5 * 60 * 1000,
  });

  // Workouts
  const workoutsQuery = useQuery({
    queryKey: ['workouts'],
    queryFn: getWorkouts,
    staleTime: 5 * 60 * 1000,
  });

  // Programs
  const programsQuery = useQuery({
    queryKey: ['programs'],
    queryFn: getPrograms,
    staleTime: 5 * 60 * 1000,
  });

  // Files
  const filesQuery = useQuery({
    queryKey: ['files'],
    queryFn: getAllFiles,
    staleTime: 5 * 60 * 1000,
  });

  // Sync to Zustand when data changes
  useEffect(() => {
    if (checkInsQuery.data) setCheckIns(checkInsQuery.data);
    if (exercisesQuery.data) setExercises(exercisesQuery.data);
    if (habitsQuery.data) setHabits(habitsQuery.data);
    if (metricsQuery.data) setMetrics(metricsQuery.data);
    if (questionnairesQuery.data) setQuestionnaires(questionnairesQuery.data);
    if (sectionsQuery.data) setSections(sectionsQuery.data);
    if (workoutsQuery.data) setWorkouts(workoutsQuery.data);
    if (programsQuery.data) setPrograms(programsQuery.data);
    if (filesQuery.data) setFiles(filesQuery.data);
  }, [
    checkInsQuery.data,
    exercisesQuery.data,
    habitsQuery.data,
    metricsQuery.data,
    questionnairesQuery.data,
    sectionsQuery.data,
    workoutsQuery.data,
    programsQuery.data,
    filesQuery.data,
    setCheckIns,
    setExercises,
    setHabits,
    setMetrics,
    setQuestionnaires,
    setSections,
    setWorkouts,
    setPrograms,
    setFiles,
  ]);

  return {
    isLoading:
      checkInsQuery.isLoading ||
      exercisesQuery.isLoading ||
      habitsQuery.isLoading ||
      metricsQuery.isLoading ||
      questionnairesQuery.isLoading ||
      sectionsQuery.isLoading ||
      workoutsQuery.isLoading ||
      programsQuery.isLoading ||
      filesQuery.isLoading,
    isError:
      checkInsQuery.isError ||
      exercisesQuery.isError ||
      habitsQuery.isError ||
      metricsQuery.isError ||
      questionnairesQuery.isError ||
      sectionsQuery.isError ||
      workoutsQuery.isError ||
      programsQuery.isError ||
      filesQuery.isError,
  };
}

/**
 * Mutations for library items
 * These can be used throughout the app
 */
export function useLibraryMutations() {
  const queryClient = useQueryClient();

  // Check-in mutations
  const deleteCheckInMutation = useMutation({
    mutationFn: (id: string) => deleteCheckIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
    },
  });

  const duplicateCheckInMutation = useMutation({
    mutationFn: ({ id, original }: { id: string; original: CheckIn }) =>
      duplicateCheckIn(id, original),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
    },
  });

  // Exercise mutations
  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string | string[]) => deleteExercises(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const duplicateExerciseMutation = useMutation({
    mutationFn: (id: string | string[]) => duplicateExercises(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  // Habit mutations
  const deleteHabitMutation = useMutation({
    mutationFn: (data: DeleteHabitData) => deleteHabit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const duplicateHabitMutation = useMutation({
    mutationFn: (id: string) => duplicateHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  // Metric mutations
  const deleteMetricMutation = useMutation({
    mutationFn: (id: string) => deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  const duplicateMetricMutation = useMutation({
    mutationFn: (id: string) => duplicateMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  // Questionnaire mutations
  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (id: string) => deleteQuestionnaire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
  });

  const duplicateQuestionnaireMutation = useMutation({
    mutationFn: ({ id, original }: { id: string; original: Questionnaire }) =>
      duplicateQuestionnaire(id, original),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
  });

  // Section mutations
  const deleteSectionMutation = useMutation({
    mutationFn: (id: string | string[]) => deleteSections(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  const duplicateSectionMutation = useMutation({
    mutationFn: (id: string) => duplicateSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  // Workout mutations
  const deleteWorkoutMutation = useMutation({
    mutationFn: (id: string | string[]) => deleteWorkouts(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const duplicateWorkoutMutation = useMutation({
    mutationFn: (id: string) => duplicateWorkout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  // Program mutations
  const deleteProgramMutation = useMutation({
    mutationFn: (id: string | string[]) => deletePrograms(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  const duplicateProgramMutation = useMutation({
    mutationFn: (id: string) => duplicateProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  // File mutations
  const deleteFileMutation = useMutation({
    mutationFn: (data: DeleteFileData) => deleteFile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  return {
    // Check-ins
    deleteCheckIn: deleteCheckInMutation,
    duplicateCheckIn: duplicateCheckInMutation,
    // Exercises
    deleteExercise: deleteExerciseMutation,
    duplicateExercise: duplicateExerciseMutation,
    // Habits
    deleteHabit: deleteHabitMutation,
    duplicateHabit: duplicateHabitMutation,
    // Metrics
    deleteMetric: deleteMetricMutation,
    duplicateMetric: duplicateMetricMutation,
    // Questionnaires
    deleteQuestionnaire: deleteQuestionnaireMutation,
    duplicateQuestionnaire: duplicateQuestionnaireMutation,
    // Sections
    deleteSection: deleteSectionMutation,
    duplicateSection: duplicateSectionMutation,
    // Workouts
    deleteWorkout: deleteWorkoutMutation,
    duplicateWorkout: duplicateWorkoutMutation,
    // Programs
    deleteProgram: deleteProgramMutation,
    duplicateProgram: duplicateProgramMutation,
    // Files
    deleteFile: deleteFileMutation,
  };
}
