'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import all tab page components to avoid circular dependencies
const ClientOverviewPage = dynamic(() => import('@/app/athletes/[clientId]/overview/page'), { ssr: false });
const ClientNotesPage = dynamic(() => import('@/app/athletes/[clientId]/notes/page'), { ssr: false });
const ClientMetricsPage = dynamic(() => import('@/app/athletes/[clientId]/metrics/page'), { ssr: false });
const ClientHabitsPage = dynamic(() => import('@/app/athletes/[clientId]/habits/page'), { ssr: false });
const ClientPhotosPage = dynamic(() => import('@/app/athletes/[clientId]/photos/page'), { ssr: false });
const ClientFilesPage = dynamic(() => import('@/app/athletes/[clientId]/files/page'), { ssr: false });
const ClientCheckInPage = dynamic(() => import('@/app/athletes/[clientId]/check-in/page'), { ssr: false });
const ClientQuestionnairesPage = dynamic(() => import('@/app/athletes/[clientId]/questionnaires/page'), { ssr: false });
const ClientSettingsPage = dynamic(() => import('@/app/athletes/[clientId]/settings/page'), { ssr: false });
const TrainingCalendarPage = dynamic(() => import('@/app/athletes/[clientId]/training/page'), { ssr: false });

interface ClientProfileContentProps {
    tab: string;
}

export const ClientProfileContent = React.memo(function ClientProfileContent({ tab }: ClientProfileContentProps) {
    // Map of tab names to components
    const tabComponents: Record<string, React.ComponentType<any>> = {
        'overview': ClientOverviewPage,
        'notes': ClientNotesPage,
        'metrics': ClientMetricsPage,
        'habits': ClientHabitsPage,
        'photos': ClientPhotosPage,
        'files': ClientFilesPage,
        'check-in': ClientCheckInPage,
        'questionnaires': ClientQuestionnairesPage,
        'settings': ClientSettingsPage,
        'training': TrainingCalendarPage,
    };

    // Only render the active tab component
    const ActiveComponent = tabComponents[tab] || ClientOverviewPage;

    return (
        <div className="h-full w-full">
            <ActiveComponent />
        </div>
    );
});
