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
const ClientUpdatesPage = dynamic(() => import('@/app/athletes/[clientId]/updates/page'), { ssr: false });
const ClientSettingsPage = dynamic(() => import('@/app/athletes/[clientId]/settings/page'), { ssr: false });
const TrainingCalendarPage = dynamic(() => import('@/app/athletes/[clientId]/training/page'), { ssr: false });

interface ClientProfileContentProps {
    tab: string;
}

export function ClientProfileContent({ tab }: ClientProfileContentProps) {
    const renderTab = (tabName: string, Component: React.ComponentType<any>) => {
        return (
            <div className={tab === tabName ? "block h-full" : "hidden"}>
                <Component />
            </div>
        );
    };

    return (
        <div className="h-full w-full">
            {renderTab('overview', ClientOverviewPage)}
            {renderTab('notes', ClientNotesPage)}
            {renderTab('metrics', ClientMetricsPage)}
            {renderTab('habits', ClientHabitsPage)}
            {renderTab('photos', ClientPhotosPage)}
            {renderTab('files', ClientFilesPage)}
            {renderTab('check-in', ClientCheckInPage)}
            {renderTab('questionnaires', ClientQuestionnairesPage)}
            {renderTab('updates', ClientUpdatesPage)}
            {renderTab('settings', ClientSettingsPage)}
            {renderTab('training', TrainingCalendarPage)}
        </div>
    );
}
