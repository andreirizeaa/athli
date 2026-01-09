import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type LibraryTab = 'workouts' | 'sections' | 'programs' | 'exercises' | 'forms' | 'metrics' | 'habits' | 'files';

type LibraryTabContextType = {
    currentLibraryTab: LibraryTab;
    setCurrentLibraryTab: (tab: LibraryTab) => void;
};

const LibraryTabContext = createContext<LibraryTabContextType | undefined>(undefined);

export function LibraryTabProvider({ children }: { children: ReactNode }) {
    const [currentLibraryTab, setCurrentLibraryTab] = useState<LibraryTab>('workouts');

    return (
        <LibraryTabContext.Provider value={{ currentLibraryTab, setCurrentLibraryTab }}>
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
