'use client';

import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlatformSettings } from '@/hooks/use-platform-settings';
import { UserProfile } from '@/api/user/user-service';
import { CoachPreferences } from '@/api/settings/coach/coach-preferences-service';
import { CoachCompanyInfo } from '@/api/settings/coach/coach-company-service';
import { NotificationEvent } from '@/api/settings/coach/coach-notifications-service';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';

// Hooks for prefetching
import { useCoachFiles } from '@/hooks/use-coach-files';
import { useCoachHabits } from '@/hooks/use-coach-habits';
import { useCoachMetrics } from '@/hooks/use-coach-metrics';
import { useCoachCheckIns } from '@/hooks/use-coach-check-ins';
import { useCoachQuestionnaires } from '@/hooks/use-coach-questionnaires';
import { useCoachWorkouts } from '@/hooks/use-coach-workouts';
import { useCoachPrograms } from '@/hooks/use-coach-programs';
import { useCoachExercises } from '@/hooks/use-coach-exercises';
import { useCoachTodo } from '@/hooks/use-coach-todo';

interface GlobalContextType {
    user: UserProfile | null;
    preferences: CoachPreferences | null;
    company: CoachCompanyInfo | null;
    notifications: NotificationEvent[];
    uniqueCode: string | null;

    isLoading: boolean;

    // Actions
    updatePreferences: (updates: Partial<CoachPreferences>) => Promise<any>;
    updateCompany: (updates: Partial<CoachCompanyInfo>) => Promise<any>;
    uploadAndSetCompanyLogo: (file: File) => Promise<any>;
    toggleNotification: (args: { eventId: string; enabled: boolean }) => Promise<any>;
    isUploadingLogo: boolean;
    isUpdatingCompany: boolean;
}

const GlobalContext = createContext<GlobalContextType>({
    user: null,
    preferences: null,
    company: null,
    notifications: [],
    uniqueCode: null,
    isLoading: true,
    updatePreferences: async () => { },
    updateCompany: async () => { },
    uploadAndSetCompanyLogo: async () => { },
    toggleNotification: async () => { },
    isUploadingLogo: false,
    isUpdatingCompany: false,
});

export const useGlobalData = () => useContext(GlobalContext);

// Component to handle prefetching of coach data
const CoachDataPrefetcher = ({ children }: { children: ReactNode }) => {
    const { isLoading: isFilesLoading } = useCoachFiles();
    const { isLoading: isHabitsLoading } = useCoachHabits();
    const { isLoading: isMetricsLoading } = useCoachMetrics();
    const { isLoading: isCheckInsLoading } = useCoachCheckIns();
    const { isLoading: isQuestionnairesLoading } = useCoachQuestionnaires();
    const { isLoading: isWorkoutsLoading } = useCoachWorkouts();
    const { isLoading: isProgramsLoading } = useCoachPrograms();
    const { isLoading: isExercisesLoading } = useCoachExercises();
    const { isLoadingOwn: isOwnTodoLoading, isLoadingAuto: isAutoTodoLoading } = useCoachTodo();

    const isLoading = isFilesLoading ||
        isHabitsLoading ||
        isMetricsLoading ||
        isCheckInsLoading ||
        isQuestionnairesLoading ||
        isWorkoutsLoading ||
        isProgramsLoading ||
        isExercisesLoading ||
        isOwnTodoLoading ||
        isAutoTodoLoading;

    if (isLoading) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
};

export default function GlobalDataProvider({ children }: { children: ReactNode }) {
    const { user: userProfile, isLoading: isUserLoading } = useUserProfile();
    const {
        preferences,
        company,
        notifications,
        uniqueCode,
        isLoading: isSettingsLoading,
        updatePreferences,
        updateCompany,
        uploadAndSetCompanyLogo,
        toggleNotification,
        isUploadingLogo,
        isUpdatingCompany
    } = usePlatformSettings();

    const isLoading = isUserLoading || isSettingsLoading;

    const value = useMemo(() => ({
        user: userProfile as UserProfile, // Casting assuming user is loaded or handled by layout check
        preferences: preferences as CoachPreferences,
        company: company as CoachCompanyInfo,
        notifications,
        uniqueCode,
        isLoading,
        updatePreferences,
        updateCompany,
        uploadAndSetCompanyLogo,
        toggleNotification,
        isUploadingLogo,
        isUpdatingCompany
    }), [userProfile, preferences, company, notifications, uniqueCode, isLoading, updatePreferences, updateCompany, uploadAndSetCompanyLogo, toggleNotification, isUploadingLogo, isUpdatingCompany]);

    if (isLoading) {
        return <FullScreenLoader />;
    }

    // If user is logged in, wrap with prefetcher to ensure data is loaded
    if (userProfile) {
        return (
            <GlobalContext.Provider value={value}>
                <CoachDataPrefetcher>
                    {children}
                </CoachDataPrefetcher>
            </GlobalContext.Provider>
        );
    }

    // Not logged in, just provide context (likely null user) and children
    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
}
