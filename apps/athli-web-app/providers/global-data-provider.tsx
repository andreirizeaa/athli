'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePlatformSettings } from '@/hooks/use-platform-settings';
import { UserProfile } from '@/api/user/user-service';
import { CoachPreferences } from '@/api/settings/coach/coach-preferences-service';
import { CoachCompanyInfo } from '@/api/settings/coach/coach-company-service';
import { NotificationEvent } from '@/api/settings/coach/coach-notifications-service';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';

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

    // Optionally perform a hard block here if critical data is missing, 
    // but usually better to let the UI skeleton load.

    if (isLoading) {
        return <FullScreenLoader />;
    }

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
}
