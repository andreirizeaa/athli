'use client';

import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
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
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Athlete, ClientMetric, ClientHabit, ClientNote } from '@/api/coach/coach-client-service';
import type { ClientPhoto } from '@/api/client/client-photo-service';
import type { ClientCheckIn, ClientQuestionnaire } from '@/api/client/client-form-service';
import type { ClientFileAssignment } from '@/api/coach/coach-file-service';
import type { AthleteDetails, WorkoutStatistics } from '@/api/client/client-service';

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
    goals: string[];
    injuries: string[];
    details: AthleteDetails | null;
    workoutStats: {
        last7Days: WorkoutStatistics | null;
        last30Days: WorkoutStatistics | null;
        nextWeek: WorkoutStatistics | null;
    } | null;
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    refreshSection: (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes' | 'bio' | 'goals' | 'injuries' | 'details' | 'workout-stats') => Promise<void>;
}

const ClientProfileContext = createContext<ClientProfileContextType | undefined>(undefined);

export const ClientProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const params = useParams<{ clientId: string }>();
    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    const queryClient = useQueryClient();
    const { user } = useUserProfile();

    // Track client ID changes and loading state
    const previousClientId = useRef<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const loadStartTime = useRef<number>(Date.now());
    const minimumLoadTime = 1200; // Minimum time to show loader (1.2s) - increased to ensure smooth loading

    // Use all the React Query hooks - they will only fetch when clientId is provided
    const { client: athlete, isLoading: isLoadingProfile, error: profileError, isFetching: isFetchingProfile } = useClientProfile(clientId);
    const { metrics, isLoading: isLoadingMetrics, isFetching: isFetchingMetrics } = useClientMetrics(clientId);
    const { habits, isLoading: isLoadingHabits, isFetching: isFetchingHabits } = useClientHabits(clientId);
    const { photos, isLoading: isLoadingPhotos, isFetching: isFetchingPhotos } = useClientPhotos(clientId);
    const { checkIns, isLoading: isLoadingCheckIns, isFetching: isFetchingCheckIns } = useClientCheckIns(clientId);
    const { questionnaires, isLoading: isLoadingQuestionnaires, isFetching: isFetchingQuestionnaires } = useClientQuestionnaires(clientId);
    const { files, isLoading: isLoadingFiles, isFetching: isFetchingFiles } = useClientFiles(clientId);
    const { notes, isLoading: isLoadingNotes, isFetching: isFetchingNotes } = useClientNotes(clientId);
    const { bio, isLoading: isLoadingBio, isFetching: isFetchingBio } = useClientBio(clientId);
    const { goals, isLoading: isLoadingGoals, isFetching: isFetchingGoals } = useClientGoals(clientId);
    const { injuries, isLoading: isLoadingInjuries, isFetching: isFetchingInjuries } = useClientInjuries(clientId);
    const { details, isLoading: isLoadingDetails, isFetching: isFetchingDetails } = useClientDetails(clientId);
    const { stats: workoutStats, isLoading: isLoadingWorkoutStats, isFetching: isFetchingWorkoutStats } = useClientWorkoutStats(clientId);

    // Check if ANY data is currently loading or fetching (fetching includes cached data being revalidated)
    const isAnyLoading = isLoadingProfile || isLoadingMetrics || isLoadingHabits || isLoadingPhotos ||
                         isLoadingCheckIns || isLoadingQuestionnaires || isLoadingFiles || isLoadingNotes ||
                         isLoadingBio || isLoadingGoals || isLoadingInjuries || isLoadingDetails || isLoadingWorkoutStats;

    const isAnyFetching = isFetchingProfile || isFetchingMetrics || isFetchingHabits || isFetchingPhotos ||
                          isFetchingCheckIns || isFetchingQuestionnaires || isFetchingFiles || isFetchingNotes ||
                          isFetchingBio || isFetchingGoals || isFetchingInjuries || isFetchingDetails || isFetchingWorkoutStats;

    // Debug logging
    useEffect(() => {
        if (isInitialLoad) {
            console.log('[ClientProfile] Loading state:', {
                athlete: !!athlete,
                user: !!user,
                isAnyLoading,
                isAnyFetching,
                individual: {
                    profile: { loading: isLoadingProfile, fetching: isFetchingProfile },
                    metrics: { loading: isLoadingMetrics, fetching: isFetchingMetrics },
                    habits: { loading: isLoadingHabits, fetching: isFetchingHabits },
                    photos: { loading: isLoadingPhotos, fetching: isFetchingPhotos },
                    checkIns: { loading: isLoadingCheckIns, fetching: isFetchingCheckIns },
                    questionnaires: { loading: isLoadingQuestionnaires, fetching: isFetchingQuestionnaires },
                    files: { loading: isLoadingFiles, fetching: isFetchingFiles },
                    notes: { loading: isLoadingNotes, fetching: isFetchingNotes },
                    bio: { loading: isLoadingBio, fetching: isFetchingBio },
                    goals: { loading: isLoadingGoals, fetching: isFetchingGoals },
                    injuries: { loading: isLoadingInjuries, fetching: isFetchingInjuries },
                    details: { loading: isLoadingDetails, fetching: isFetchingDetails },
                    workoutStats: { loading: isLoadingWorkoutStats, fetching: isFetchingWorkoutStats },
                }
            });
        }
    }, [isInitialLoad, isAnyLoading, isAnyFetching, athlete, user,
        isLoadingProfile, isFetchingProfile, isLoadingMetrics, isFetchingMetrics,
        isLoadingHabits, isFetchingHabits, isLoadingPhotos, isFetchingPhotos,
        isLoadingCheckIns, isFetchingCheckIns, isLoadingQuestionnaires, isFetchingQuestionnaires,
        isLoadingFiles, isFetchingFiles, isLoadingNotes, isFetchingNotes,
        isLoadingBio, isFetchingBio, isLoadingGoals, isFetchingGoals,
        isLoadingInjuries, isFetchingInjuries, isLoadingDetails, isFetchingDetails,
        isLoadingWorkoutStats, isFetchingWorkoutStats]);

    // Reset initial load state when clientId changes
    useEffect(() => {
        if (previousClientId.current !== clientId) {
            setIsInitialLoad(true);
            loadStartTime.current = Date.now();
            previousClientId.current = clientId;
        }
    }, [clientId]);

    // Mark as loaded once ALL queries complete AND minimum time has passed AND user is loaded
    useEffect(() => {
        // Don't hide loader until:
        // 1. We have the athlete data
        // 2. We have the user data (needed for some queries)
        // 3. All queries that can run have completed (both loading and fetching)
        // 4. Minimum load time has passed
        if (isInitialLoad && athlete && user && !isAnyLoading && !isAnyFetching) {
            const elapsedTime = Date.now() - loadStartTime.current;
            const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);

            if (remainingTime > 0) {
                // Wait for minimum time before hiding loader
                const timer = setTimeout(() => {
                    setIsInitialLoad(false);
                }, remainingTime);
                return () => clearTimeout(timer);
            } else {
                setIsInitialLoad(false);
            }
        }
    }, [isInitialLoad, isAnyLoading, isAnyFetching, athlete, user]);

    // Show loading on initial load until ALL data is loaded
    const isLoading = isInitialLoad && (isAnyLoading || isAnyFetching || !athlete || !user);
    const error = profileError ? (profileError as Error).message : null;

    // Refresh all data by invalidating all queries
    const refreshData = async () => {
        if (!clientId) return;

        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['client-profile', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-metrics', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-habits', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-check-ins', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-questionnaires', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-files', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-bio', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-goals', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-injuries', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] }),
            queryClient.invalidateQueries({ queryKey: ['client-workout-stats', clientId] }),
        ]);
    };

    // Refresh specific section by invalidating its query
    const refreshSection = async (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes' | 'bio' | 'goals' | 'injuries' | 'details' | 'workout-stats') => {
        if (!clientId) return;

        const queryKeyMap = {
            'metrics': ['client-metrics', clientId],
            'habits': ['client-habits', clientId],
            'photos': ['client-photos', clientId],
            'check-ins': ['client-check-ins', clientId],
            'questionnaires': ['client-questionnaires', clientId],
            'files': ['client-files', clientId],
            'notes': ['client-notes', clientId],
            'bio': ['client-bio', clientId],
            'goals': ['client-goals', clientId],
            'injuries': ['client-injuries', clientId],
            'details': ['client-details', clientId],
            'workout-stats': ['client-workout-stats', clientId],
        };

        await queryClient.invalidateQueries({ queryKey: queryKeyMap[section] });
    };

    return (
        <ClientProfileContext.Provider
            value={{
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
                isLoading,
                error,
                refreshData,
                refreshSection,
            }}
        >
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
