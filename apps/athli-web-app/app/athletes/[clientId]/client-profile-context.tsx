'use client';

import React, { createContext, useContext, useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useClientProfile } from '@/hooks/use-client-profile';
import { useClientMetrics } from '@/hooks/use-client-metrics';
import { useClientHabits } from '@/hooks/use-client-habits';
import { useClientNotes } from '@/hooks/use-client-notes';
import { useClientPhotos } from '@/hooks/use-client-photos';
import { useClientCheckIns } from '@/hooks/use-client-check-ins';
import { useClientQuestionnaires } from '@/hooks/use-client-questionnaires';
import { useClientFiles } from '@/hooks/use-client-files';
import { useClientBio } from '@/hooks/use-client-bio';
import { useClientGoals } from '@/hooks/use-client-goals';
import { useClientInjuries } from '@/hooks/use-client-injuries';
import { useClientDetails } from '@/hooks/use-client-details';
import { useClientWorkoutStats } from '@/hooks/use-client-workout-stats';
import { useClientUpdates } from '@/hooks/use-client-updates';
import { useClientUniqueExercises } from '@/hooks/use-client-unique-exercises';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Athlete, ClientMetric, ClientHabit, ClientNote } from '@/api/coach/coach-client-service';
import type { ClientPhoto } from '@/api/client/client-photo-service';
import type { ClientCheckIn, ClientQuestionnaire } from '@/api/client/client-form-service';
import type { ClientFileAssignment } from '@/api/coach/coach-file-service';
import type { AthleteDetails, WorkoutStatistics, AthleteGoal, AthleteInjury } from '@/api/client/client-service';
import type { ClientUpdate } from '@/api/client/client-updates-service';
import type { UniqueExercise } from '@/api/client/client-training-service';

interface ClientProfileContextType {
    athlete: Athlete | null;
    metrics: ClientMetric[];
    habits: ClientHabit[];
    photos: ClientPhoto[];
    checkIns: ClientCheckIn[];
    questionnaires: ClientQuestionnaire[];
    files: ClientFileAssignment[];
    notes: ClientNote[];
    bio: string;
    goals: AthleteGoal[];
    injuries: AthleteInjury[];
    details: AthleteDetails | null;
    workoutStats: {
        last7Days: WorkoutStatistics | null;
        last30Days: WorkoutStatistics | null;
        nextWeek: WorkoutStatistics | null;
    } | null;
    updates: ClientUpdate[];
    uniqueExercises: UniqueExercise[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    refreshSection: (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes' | 'bio' | 'goals' | 'injuries' | 'details' | 'workout-stats' | 'updates' | 'unique-exercises') => Promise<void>;
}

const ClientProfileContext = createContext<ClientProfileContextType | undefined>(undefined);

interface ClientProfileProviderProps {
    children: React.ReactNode;
    clientId?: string; // Optional - if not provided, will use URL params
}

export const ClientProfileProvider = ({ children, clientId: clientIdProp }: ClientProfileProviderProps) => {
    const params = useParams<{ clientId: string; contactId: string }>();
    // Use provided clientId prop, or fall back to clientId/contactId from URL params
    const clientIdFromParams = params.clientId || params.contactId;
    const rawClientId = clientIdProp || (Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams);
    const queryClient = useQueryClient();
    const { user } = useUserProfile();

    // Track client ID changes and loading state
    const previousClientId = useRef<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Use all the React Query hooks - they will only fetch when clientId is provided
    const { client: athlete, isLoading: isLoadingProfile, error: profileError, isFetching: isFetchingProfile } = useClientProfile(rawClientId);
    // Use the resolved athlete ID (UUID) for other queries
    const resolvedClientId = athlete?.id;

    const { metrics, isLoading: isLoadingMetrics, isFetching: isFetchingMetrics } = useClientMetrics(resolvedClientId);
    const { habits, isLoading: isLoadingHabits, isFetching: isFetchingHabits } = useClientHabits(resolvedClientId);
    const { photos, isLoading: isLoadingPhotos, isFetching: isFetchingPhotos } = useClientPhotos(resolvedClientId);
    const { checkIns, isLoading: isLoadingCheckIns, isFetching: isFetchingCheckIns } = useClientCheckIns(resolvedClientId);
    const { questionnaires, isLoading: isLoadingQuestionnaires, isFetching: isFetchingQuestionnaires } = useClientQuestionnaires(resolvedClientId);
    const { files, isLoading: isLoadingFiles, isFetching: isFetchingFiles } = useClientFiles(resolvedClientId);
    const { notes, isLoading: isLoadingNotes, isFetching: isFetchingNotes } = useClientNotes(resolvedClientId);
    const { bio, isLoading: isLoadingBio, isFetching: isFetchingBio } = useClientBio(resolvedClientId);
    const { goals, isLoading: isLoadingGoals, isFetching: isFetchingGoals } = useClientGoals(resolvedClientId);
    const { injuries, isLoading: isLoadingInjuries, isFetching: isFetchingInjuries } = useClientInjuries(resolvedClientId);
    const { details, isLoading: isLoadingDetails, isFetching: isFetchingDetails } = useClientDetails(resolvedClientId);
    const { stats: workoutStats, isLoading: isLoadingWorkoutStats, isFetching: isFetchingWorkoutStats } = useClientWorkoutStats(resolvedClientId);
    const { updates, isLoading: isLoadingUpdates, isFetching: isFetchingUpdates } = useClientUpdates(resolvedClientId);
    const { uniqueExercises, isLoading: isLoadingUniqueExercises, isFetching: isFetchingUniqueExercises } = useClientUniqueExercises(resolvedClientId);

    // Check if ANY data is currently loading or fetching (fetching includes cached data being revalidated)
    const isAnyLoading = isLoadingProfile || isLoadingMetrics || isLoadingHabits || isLoadingPhotos ||
        isLoadingCheckIns || isLoadingQuestionnaires || isLoadingFiles || isLoadingNotes ||
        isLoadingBio || isLoadingGoals || isLoadingInjuries || isLoadingDetails || isLoadingWorkoutStats ||
        isLoadingUpdates || isLoadingUniqueExercises;

    const isAnyFetching = isFetchingProfile || isFetchingMetrics || isFetchingHabits || isFetchingPhotos ||
        isFetchingCheckIns || isFetchingQuestionnaires || isFetchingFiles || isFetchingNotes ||
        isFetchingBio || isFetchingGoals || isFetchingInjuries || isFetchingDetails || isFetchingWorkoutStats ||
        isFetchingUpdates || isFetchingUniqueExercises;



    // Reset initial load state when clientId changes
    useEffect(() => {
        if (previousClientId.current !== rawClientId) {
            setIsInitialLoad(true);
            previousClientId.current = rawClientId;
        }
    }, [rawClientId]);

    // Mark as loaded once ALL queries complete AND user is loaded
    useEffect(() => {
        // Don't hide loader until:
        // 1. We have the athlete data
        // 2. We have the user data (needed for some queries)
        // 3. All queries that can run have completed (both loading and fetching)
        if (isInitialLoad && athlete && user && !isAnyLoading && !isAnyFetching) {
            setIsInitialLoad(false);
        }
    }, [isInitialLoad, isAnyLoading, isAnyFetching, athlete, user]);

    // Show loading on initial load until ALL data is loaded
    // Don't show loading if there's a profile error (e.g., 404 client not found)
    const error = profileError ? (profileError as Error).message : null;
    const isLoading = !error && isInitialLoad && (isAnyLoading || isAnyFetching || !athlete || !user);

    // Refresh all data by invalidating all queries
    const refreshData = useCallback(async () => {
        if (!athlete?.id) return;
        const targetId = athlete.id;

        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['client-profile', rawClientId] }), // Profile uses publicId/param
            queryClient.invalidateQueries({ queryKey: ['client-metrics', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-habits', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-photos', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-check-ins', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-questionnaires', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-files', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-notes', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-bio', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-goals', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-injuries', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-details', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-workout-stats', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-updates', targetId] }),
            queryClient.invalidateQueries({ queryKey: ['client-unique-exercises', targetId] }),
        ]);
    }, [athlete?.id, queryClient, rawClientId]);

    // Refresh specific section by invalidating its query
    const refreshSection = useCallback(async (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes' | 'bio' | 'goals' | 'injuries' | 'details' | 'workout-stats' | 'updates' | 'unique-exercises') => {
        if (!athlete?.id) return;
        const targetId = athlete.id;

        const queryKeyMap = {
            'metrics': ['client-metrics', targetId],
            'habits': ['client-habits', targetId],
            'photos': ['client-photos', targetId],
            'check-ins': ['client-check-ins', targetId],
            'questionnaires': ['client-questionnaires', targetId],
            'files': ['client-files', targetId],
            'notes': ['client-notes', targetId],
            'bio': ['client-bio', targetId],
            'goals': ['client-goals', targetId],
            'injuries': ['client-injuries', targetId],
            'details': ['client-details', targetId],
            'workout-stats': ['client-workout-stats', targetId],
            'updates': ['client-updates', targetId],
            'unique-exercises': ['client-unique-exercises', targetId],
        };

        await queryClient.invalidateQueries({ queryKey: queryKeyMap[section] });
    }, [athlete?.id, queryClient]);

    const value = useMemo(() => ({
        athlete,
        metrics,
        habits,
        photos,
        checkIns,
        questionnaires,
        files,
        notes,
        bio,
        goals,
        injuries,
        details,
        workoutStats,
        updates,
        uniqueExercises,
        isLoading,
        error,
        refreshData,
        refreshSection,
    }), [
        athlete,
        metrics,
        habits,
        photos,
        checkIns,
        questionnaires,
        files,
        notes,
        bio,
        goals,
        injuries,
        details,
        workoutStats,
        updates,
        uniqueExercises,
        isLoading,
        error,
        refreshData,
        refreshSection,
    ]);

    return (
        <ClientProfileContext.Provider value={value}>
            {children}
        </ClientProfileContext.Provider>
    );
};

export const useClientProfileContext = () => {
    const context = useContext(ClientProfileContext);
    if (context === undefined) {
        throw new Error('useClientProfileContext must be used within a ClientProfileProvider');
    }
    return context;
};
