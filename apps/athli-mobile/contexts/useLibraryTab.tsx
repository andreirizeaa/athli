import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type LibraryTab = 'workouts' | 'sections' | 'programs' | 'exercises' | 'checkIns' | 'questionnaires' | 'metrics' | 'habits' | 'files';

type LibraryTabContextType = {
    currentLibraryTab: LibraryTab;
    setCurrentLibraryTab: (tab: LibraryTab) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
};

const LibraryTabContext = createContext<LibraryTabContextType | undefined>(undefined);

export function LibraryTabProvider({ children }: { children: ReactNode }) {
    const [currentLibraryTab, setCurrentLibraryTab] = useState<LibraryTab>('workouts');
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <LibraryTabContext.Provider value={{
            currentLibraryTab,
            setCurrentLibraryTab,
            searchQuery,
            setSearchQuery
        }}>
            {children}
        </LibraryTabContext.Provider>
    );
}

export function useLibraryTab() {
    const context = useContext(LibraryTabContext);
    if (context === undefined) {
        throw new Error('useLibraryTab must be used within a LibraryTabProvider');
    }
    return context;
}
