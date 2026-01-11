import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

export type LibraryTab = 'workouts' | 'sections' | 'programs' | 'exercises' | 'checkIns' | 'questionnaires' | 'metrics' | 'habits' | 'files';

type LibraryTabContextType = {
    currentLibraryTab: LibraryTab;
    setCurrentLibraryTab: (tab: LibraryTab) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    registerOpenRow: (closeFn: () => void) => void;
    closeOpenRow: () => void;
};

const LibraryTabContext = createContext<LibraryTabContextType | undefined>(undefined);

export function LibraryTabProvider({ children }: { children: ReactNode }) {
    const [currentLibraryTab, setCurrentLibraryTab] = useState<LibraryTab>('workouts');
    const [searchQuery, setSearchQuery] = useState('');
    const closeRowRef = useRef<(() => void) | null>(null);

    const registerOpenRow = useCallback((closeFn: () => void) => {
        if (closeRowRef.current && closeRowRef.current !== closeFn) {
            closeRowRef.current();
        }
        closeRowRef.current = closeFn;
    }, []);

    const closeOpenRow = useCallback(() => {
        if (closeRowRef.current) {
            closeRowRef.current();
            closeRowRef.current = null;
        }
    }, []);

    return (
        <LibraryTabContext.Provider value={{
            currentLibraryTab,
            setCurrentLibraryTab,
            searchQuery,
            setSearchQuery,
            registerOpenRow,
            closeOpenRow,
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
