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
  getAllFiles,
  deleteFile,
  type CoachFile,
  type DeleteFileData,
} from '@/services/coach/coach-file-service';

/**
 * Hook to fetch and sync all library data
 * Call this ONCE in the root layout
 * @param isAuthenticated - Whether the user is authenticated
 */
export function useLibraryData(isAuthenticated: boolean = false) {
  const setCheckIns = useLibraryStore((state) => state.setCheckIns);
  const setExercises = useLibraryStore((state) => state.setExercises);
  const setHabits = useLibraryStore((state) => state.setHabits);
  const setMetrics = useLibraryStore((state) => state.setMetrics);
  const setQuestionnaires = useLibraryStore((state) => state.setQuestionnaires);
  const setSections = useLibraryStore((state) => state.setSections);
  const setWorkouts = useLibraryStore((state) => state.setWorkouts);
  const setFiles = useLibraryStore((state) => state.setFiles);

  // Check-ins
  const checkInsQuery = useQuery({
    queryKey: ['checkIns'],
    queryFn: getCheckIns,
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  // Exercises
  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Habits
  const habitsQuery = useQuery({
    queryKey: ['habits'],
    queryFn: getAllHabits,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Metrics
  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: getAllMetrics,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Questionnaires
  const questionnairesQuery = useQuery({
    queryKey: ['questionnaires'],
    queryFn: getQuestionnaires,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Sections
  const sectionsQuery = useQuery({
    queryKey: ['sections'],
    queryFn: getSections,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Workouts
  const workoutsQuery = useQuery({
    queryKey: ['workouts'],
    queryFn: getWorkouts,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Files
  const filesQuery = useQuery({
    queryKey: ['files'],
    queryFn: getAllFiles,
    staleTime: 0, // Always consider data stale to ensure fresh data
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Sync to Zustand when data changes
  useEffect(() => {
    if (checkInsQuery.data) {
      console.log('[useLibraryData] Syncing checkIns to store:', checkInsQuery.data.length, 'items');
      setCheckIns(checkInsQuery.data);
    }
    if (exercisesQuery.data) {
      console.log('[useLibraryData] Syncing exercises to store:', exercisesQuery.data.length, 'items');
      setExercises(exercisesQuery.data);
    }
    if (habitsQuery.data) {
      console.log('[useLibraryData] Syncing habits to store:', habitsQuery.data.length, 'items');
      setHabits(habitsQuery.data);
    }
    if (metricsQuery.data) {
      console.log('[useLibraryData] Syncing metrics to store:', metricsQuery.data.length, 'items');
      setMetrics(metricsQuery.data);
    }
    if (questionnairesQuery.data) {
      console.log('[useLibraryData] Syncing questionnaires to store:', questionnairesQuery.data.length, 'items');
      setQuestionnaires(questionnairesQuery.data);
    }
    if (sectionsQuery.data) {
      console.log('[useLibraryData] Syncing sections to store:', sectionsQuery.data.length, 'items');
      setSections(sectionsQuery.data);
    }
    if (workoutsQuery.data) {
      console.log('[useLibraryData] Syncing workouts to store:', workoutsQuery.data.length, 'items');
      setWorkouts(workoutsQuery.data);
    }
    if (filesQuery.data) {
      console.log('[useLibraryData] Syncing files to store:', filesQuery.data.length, 'items');
      setFiles(filesQuery.data);
    }
  }, [
    checkInsQuery.data,
    exercisesQuery.data,
    habitsQuery.data,
    metricsQuery.data,
    questionnairesQuery.data,
    sectionsQuery.data,
    workoutsQuery.data,
    filesQuery.data,
    setCheckIns,
    setExercises,
    setHabits,
    setMetrics,
    setQuestionnaires,
    setSections,
    setWorkouts,
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
      filesQuery.isLoading,
    isError:
      checkInsQuery.isError ||
      exercisesQuery.isError ||
      habitsQuery.isError ||
      metricsQuery.isError ||
      questionnairesQuery.isError ||
      sectionsQuery.isError ||
      workoutsQuery.isError ||
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
    // Files
    deleteFile: deleteFileMutation,
  };
}
