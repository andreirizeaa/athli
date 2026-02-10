'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlatformSettings } from '@/hooks/use-platform-settings';
import { UserProfile } from '@/api/user/user-service';
import { CoachPreferences } from '@/api/settings/coach/coach-preferences-service';
import { CoachCompanyInfo } from '@/api/settings/coach/coach-company-service';
import { NotificationPreference } from '@/api/settings/coach/coach-notifications-service';
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
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useConversations } from '@/hooks/use-conversations';
import { usePrefetchAllExercises } from '@/hooks/use-all-exercises';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { useCoachSequences } from '@/hooks/use-coach-sequences';
import { useStripeConnection, useCoachPackages, useCoupons, useSummaryAnalytics, useSummaryActivity, useAllPackageStats } from '@/hooks/use-coach-packages';

interface GlobalContextType {
    user: UserProfile | null;
    preferences: CoachPreferences | null;
    company: CoachCompanyInfo | null;
    notificationPreferences: NotificationPreference[];
    uniqueCode: string | null;

    isLoading: boolean;

    // Actions
    updatePreferences: (updates: Partial<CoachPreferences>) => Promise<any>;
    updateCompany: (updates: Partial<CoachCompanyInfo>) => Promise<any>;
    uploadAndSetCompanyLogo: (file: File) => Promise<any>;
    updateNotificationPreference: (args: { notificationType: string; inAppEnabled?: boolean; pushEnabled?: boolean }) => Promise<any>;
    batchUpdateNotificationPreferences: (preferences: Array<{ notificationType: string; inAppEnabled?: boolean; pushEnabled?: boolean }>) => Promise<any>;
    isUploadingLogo: boolean;
    isUpdatingCompany: boolean;
}

const GlobalContext = createContext<GlobalContextType>({
    user: null,
    preferences: null,
    company: null,
    notificationPreferences: [],
    uniqueCode: null,
    isLoading: true,
    updatePreferences: async () => { },
    updateCompany: async () => { },
    uploadAndSetCompanyLogo: async () => { },
    updateNotificationPreference: async () => { },
    batchUpdateNotificationPreferences: async () => { },
    isUploadingLogo: false,
    isUpdatingCompany: false,
});

export const useGlobalData = () => useContext(GlobalContext);

import { usePathname } from 'next/navigation';

// Component to handle prefetching of coach data
const CoachDataPrefetcher = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();
    const isAthleteProfile = pathname?.includes('/athletes/') && pathname?.split('/').filter(Boolean).length >= 2;
    const shouldPrefetch = !isAthleteProfile;

    const { isLoading: isFilesLoading } = useCoachFiles({ enabled: shouldPrefetch });
    const { isLoading: isHabitsLoading } = useCoachHabits({ enabled: shouldPrefetch });
    const { isLoading: isMetricsLoading } = useCoachMetrics({ enabled: shouldPrefetch });
    const { isLoading: isCheckInsLoading } = useCoachCheckIns({ enabled: shouldPrefetch });
    const { isLoading: isQuestionnairesLoading } = useCoachQuestionnaires({ enabled: shouldPrefetch });
    const { isLoading: isWorkoutsLoading } = useCoachWorkouts({ enabled: shouldPrefetch });
    const { isLoading: isProgramsLoading } = useCoachPrograms({ enabled: shouldPrefetch });
    const { isLoading: isExercisesLoading } = useCoachExercises({ enabled: shouldPrefetch });
    const { isLoadingOwn: isOwnTodoLoading, isLoadingAuto: isAutoTodoLoading } = useCoachTodo({ enabled: shouldPrefetch });
    const { isLoading: isClientsLoading } = useCoachClients({ enabled: shouldPrefetch });
    const { isLoading: isConversationsLoading } = useConversations({ enabled: shouldPrefetch });
    // Background prefetch — warm the cache but don't block the full-screen loader
    usePrefetchAllExercises({ enabled: shouldPrefetch });
    useCoachOnboardings({ enabled: shouldPrefetch });
    useCoachSequences({ enabled: shouldPrefetch });
    useStripeConnection();
    useCoachPackages();
    useCoupons();
    useSummaryAnalytics();
    useSummaryActivity();
    useAllPackageStats();

    const isLoading = isFilesLoading ||
        isHabitsLoading ||
        isMetricsLoading ||
        isCheckInsLoading ||
        isQuestionnairesLoading ||
        isWorkoutsLoading ||
        isProgramsLoading ||
        isExercisesLoading ||
        isOwnTodoLoading ||
        isAutoTodoLoading ||
        isClientsLoading ||
        isConversationsLoading;

    // We only show the full screen loader for prefetching if we are NOT on a specific athlete's page
    // This allows the athlete profile to load its own data without being blocked by global coach data loading
    const shouldShowLoader = isLoading && shouldPrefetch;

    if (shouldShowLoader) {
        return <FullScreenLoader subtitle="Just setting up your workspace, Coach..." />;
    }

    return <>{children}</>;
};

export default function GlobalDataProvider({ children }: { children: ReactNode }) {
    const { user: userProfile, isLoading: isUserLoading } = useUserProfile();
    const {
        preferences,
        company,
        notificationPreferences,
        uniqueCode,
        isLoading: isSettingsLoading,
        updatePreferences,
        updateCompany,
        uploadAndSetCompanyLogo,
        updateNotificationPreference,
        batchUpdateNotificationPreferences,
        isUploadingLogo,
        isUpdatingCompany
    } = usePlatformSettings();

    const isLoading = isUserLoading || isSettingsLoading;

    const value = useMemo(() => ({
        user: userProfile as UserProfile,
        preferences: preferences as CoachPreferences,
        company: company as CoachCompanyInfo,
        notificationPreferences,
        uniqueCode,
        isLoading,
        updatePreferences,
        updateCompany,
        uploadAndSetCompanyLogo,
        updateNotificationPreference,
        batchUpdateNotificationPreferences,
        isUploadingLogo,
        isUpdatingCompany
    }), [userProfile, preferences, company, notificationPreferences, uniqueCode, isLoading, updatePreferences, updateCompany, uploadAndSetCompanyLogo, updateNotificationPreference, batchUpdateNotificationPreferences, isUploadingLogo, isUpdatingCompany]);

    if (isLoading) {
        return <FullScreenLoader subtitle="Just setting up your workspace, Coach..." />;
    }

    if (userProfile) {
        return (
            <GlobalContext.Provider value={value}>
                <CoachDataPrefetcher>
                    {children}
                </CoachDataPrefetcher>
            </GlobalContext.Provider>
        );
    }

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
}
