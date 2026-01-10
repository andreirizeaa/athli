import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitsPreference = 'metric' | 'imperial';

type UnitsContextValue = {
    units: UnitsPreference;
    setUnits: (units: UnitsPreference) => void;
};

const UnitsContext = createContext<UnitsContextValue | undefined>(undefined);

const UNITS_KEY = '@athli:units_preference';

export const UnitsProvider = ({ children }: { children: ReactNode }) => {
    const [units, setUnitsState] = useState<UnitsPreference>('metric');

    useEffect(() => {
        const loadUnits = async () => {
            try {
                const savedUnits = await AsyncStorage.getItem(UNITS_KEY);
                if (savedUnits === 'metric' || savedUnits === 'imperial') {
                    setUnitsState(savedUnits);
                }
            } catch (error) {
                // Ignore errors and use defaults
            }
        };

        loadUnits();
    }, []);

    const setUnits = async (newUnits: UnitsPreference) => {
        setUnitsState(newUnits);
        try {
            await AsyncStorage.setItem(UNITS_KEY, newUnits);
        } catch (error) {
            // Ignore errors
        }
    };

    return (
        <UnitsContext.Provider value={{ units, setUnits }}>
            {children}
        </UnitsContext.Provider>
    );
};

export const useUnits = () => {
    const context = useContext(UnitsContext);

    if (!context) {
        throw new Error('useUnits must be used within a UnitsProvider');
    }

    return context;
};
