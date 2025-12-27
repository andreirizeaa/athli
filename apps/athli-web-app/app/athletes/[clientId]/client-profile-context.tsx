'use client';

import React, { createContext, useContext } from 'react';
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
import type { Athlete, ClientMetric, ClientHabit, ClientNote } from '@/api/coach/coach-client-service';
import type { ClientPhoto } from '@/api/client/client-photo-service';
import type { ClientCheckIn, ClientQuestionnaire } from '@/api/client/client-form-service';
import type { ClientFileAssignment } from '@/api/coach/coach-file-service';

interface ClientProfileContextType {
    athlete: Athlete | null;
    metrics: ClientMetric[];
    habits: ClientHabit[];
    photos: ClientPhoto[];
    checkIns: ClientCheckIn[];
    questionnaires: ClientQuestionnaire[];
    files: ClientFileAssignment[];
    notes: ClientNote[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    refreshSection: (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes') => Promise<void>;
}

const ClientProfileContext = createContext<ClientProfileContextType | undefined>(undefined);

export const ClientProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const params = useParams<{ clientId: string }>();
    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    const queryClient = useQueryClient();

    // Use all the React Query hooks - they will only fetch when clientId is provided
    const { client: athlete, isLoading: isLoadingProfile, error: profileError } = useClientProfile(clientId);
    const { metrics, isLoading: isLoadingMetrics } = useClientMetrics(clientId);
    const { habits, isLoading: isLoadingHabits } = useClientHabits(clientId);
    const { photos, isLoading: isLoadingPhotos } = useClientPhotos(clientId);
    const { checkIns, isLoading: isLoadingCheckIns } = useClientCheckIns(clientId);
    const { questionnaires, isLoading: isLoadingQuestionnaires } = useClientQuestionnaires(clientId);
    const { files, isLoading: isLoadingFiles } = useClientFiles(clientId);
    const { notes, isLoading: isLoadingNotes } = useClientNotes(clientId);

    // Aggregate loading state - show loading until all initial queries return data
    const isLoading = isLoadingProfile || isLoadingMetrics || isLoadingHabits || isLoadingPhotos || isLoadingCheckIns || isLoadingQuestionnaires || isLoadingFiles || isLoadingNotes;
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
        ]);
    };

    // Refresh specific section by invalidating its query
    const refreshSection = async (section: 'metrics' | 'habits' | 'photos' | 'check-ins' | 'questionnaires' | 'files' | 'notes') => {
        if (!clientId) return;

        const queryKeyMap = {
            'metrics': ['client-metrics', clientId],
            'habits': ['client-habits', clientId],
            'photos': ['client-photos', clientId],
            'check-ins': ['client-check-ins', clientId],
            'questionnaires': ['client-questionnaires', clientId],
            'files': ['client-files', clientId],
            'notes': ['client-notes', clientId],
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
