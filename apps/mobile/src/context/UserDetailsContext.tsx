import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserId, setSelectedLanguage, getSelectedLanguage } from '../services/storageService';
import { fetchUserDetailsById, editUserDetails } from '../services/userService';
import { setLanguage } from '../utils/i18n';
import { formatWeightForDisplay, formatHeightForDisplay } from '../utils/unitConversions';

interface UserDetails {
  unitSystem: 'metric' | 'imperial' | null;
  currentWeightKG: number | null;
  heightCM: number | null;
  ageRange: string | null;
  gender: string | null;
  language: string | null;
  currentStreak: number | null;
  walkthroughCompleted: boolean | null;
  hasRated: boolean | null;
  fullName: string | null;
  profilePicture: string | null;
  createdAt: string | null;
}

interface UserDetailsContextType {
  userDetails: UserDetails | null;
  updateUserDetails: <K extends keyof UserDetails>(key: K, value: UserDetails[K]) => void;
  updateUnitSystem: (unitSystem: 'metric' | 'imperial') => void;
  // Helper methods for weight and height
  updateWeight: (weightKg: number) => void;
  updateHeight: (heightCm: number) => void;
  updateHasRated: (rated: boolean) => void;
  updateWalkthroughCompleted: (completed: boolean) => void;
  updateLanguage: (language: string) => void;
  getWeightDisplay: () => string;
  getHeightDisplay: () => string;
  getAgeRangeDisplay: () => string;
  refetchUserDetails: () => Promise<void>;
  setSignedInUser: (id: string | null) => Promise<void>;
  isUserDetailsLoaded: boolean;
}

const UserDetailsContext = createContext<UserDetailsContextType | undefined>(undefined);

const initialUserDetails: UserDetails | null = null;

interface UserDetailsProviderProps {
  children: ReactNode;
}

export function UserDetailsProvider({ children }: UserDetailsProviderProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(initialUserDetails);
  const queryClient = useQueryClient();
  const [userId, setUserIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    getUserId()
      .then((id) => setUserIdState(id ?? null)) // normalize undefined → null
      .catch(() => setUserIdState(null));
    setIsLoaded(false);
  }, []);

  // Set loaded to true if there's no userId (onboarding case)
  // Set loaded to false when userId is set (signed in case)
  useEffect(() => {
    if (userId == null) {
      // matches null or undefined
      setIsLoaded(true);
    } else {
      setIsLoaded(false); // Reset loading state when user signs in
    }
  }, [userId]);

  // Sync language from context with i18n when userDetails changes
  useEffect(() => {
    if (userDetails?.language) {
      setLanguage(userDetails.language);

      // Also sync with LanguageContext if it exists
      try {
        const { setSelectedLanguage } = require('../services/storageService');
        setSelectedLanguage(userDetails.language);
      } catch (error) {
        console.warn('Error syncing language to AsyncStorage:', error);
      }
    }
  }, [userDetails?.language]);

  useQuery({
    queryKey: ['user-details', userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        if (!userId) return null;
        const row = await fetchUserDetailsById(userId);
        if (!row) return null;
        // Map server values to context state; do not hardcode defaults
        setUserDetails({
          unitSystem: row.unit_system ?? null,
          currentWeightKG: row.metric_weight ?? null,
          heightCM: row.metric_height ?? null,
          ageRange: row.age_range ?? null,
          gender: row.gender ?? null,
          language: row.language ?? null,
          currentStreak: row.current_streak ?? null,
          walkthroughCompleted: row.walkthrough_completed ?? null,
          hasRated: row.has_rated ?? null,
          fullName: (row as any).full_name ?? null,
          profilePicture: (row as any).profile_picture ?? null,
          createdAt: (row as any).created_at ?? null,
        });
        return row;
      } finally {
        setIsLoaded(true);
      }
    },
  });

  const updateUserDetails = <K extends keyof UserDetails>(key: K, value: UserDetails[K]) => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, [key]: value };
    });
  };

  const updateUnitSystem = (unitSystem: 'metric' | 'imperial') => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, unitSystem };
    });
  };

  const updateWeight = (weightKg: number) => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, currentWeightKG: weightKg };
    });
  };

  const updateHeight = (heightCm: number) => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, heightCM: heightCm };
    });
  };

  const updateWalkthroughCompleted = (completed: boolean) => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, walkthroughCompleted: completed };
    });
  };

  const updateHasRated = (rated: boolean) => {
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, hasRated: rated };
    });
  };

  const updateLanguage = async (language: string) => {
    // Update i18n immediately
    setLanguage(language);

    // Save to AsyncStorage
    await setSelectedLanguage(language);

    // Update context
    setUserDetails((prev) => {
      const base: UserDetails = prev ?? {
        unitSystem: null,
        currentWeightKG: null,
        heightCM: null,
        ageRange: null,
        gender: null,
        language: null,
        currentStreak: null,
        walkthroughCompleted: null,
        hasRated: null,
        fullName: null,
        profilePicture: null,
        createdAt: null,
      };
      return { ...base, language };
    });
  };

  const getWeightDisplay = (): string => {
    if (!userDetails || userDetails.currentWeightKG == null || !userDetails.unitSystem) return '';
    return formatWeightForDisplay(userDetails.currentWeightKG, userDetails.unitSystem);
  };

  const getHeightDisplay = (): string => {
    if (!userDetails || userDetails.heightCM == null || !userDetails.unitSystem) return '';
    return formatHeightForDisplay(userDetails.heightCM, userDetails.unitSystem);
  };

  const getAgeRangeDisplay = (): string => {
    if (!userDetails || !userDetails.ageRange) return '';
    return userDetails.ageRange;
  };

  const refetchUserDetails = async () => {
    // 1) Ensure context has a userId (we only read storage on mount otherwise)
    let id = userId;
    if (!id) {
      id = await getUserId().catch(() => null);
      if (id) setUserIdState(id);
    }

    // 2) If still no id, just clear and bail — but DO NOT flip isLoaded false
    if (!id) {
      setUserDetails(null);
      return;
    }

    // 3) Refetch the active query without changing isLoaded (avoid global gate flicker)
    await queryClient.refetchQueries({ queryKey: ['user-details', id], exact: true });
    // When this resolves, your useQuery's queryFn has already run and setUserDetails().
  };

  const setSignedInUser = async (id: string | null) => {
    setUserIdState(id);

    if (!id) {
      setUserDetails(null);
      return;
    }

    await queryClient.refetchQueries({ queryKey: ['user-details', id], exact: true });
    // When this resolves, your useQuery's queryFn has already run and setUserDetails().
  };

  const value = useMemo(
    () => ({
      userDetails,
      updateUserDetails,
      updateUnitSystem,
      updateWeight,
      updateHeight,
      updateWalkthroughCompleted,
      updateHasRated,
      updateLanguage,
      getWeightDisplay,
      getHeightDisplay,
      getAgeRangeDisplay,
      refetchUserDetails,
      setSignedInUser,
      isUserDetailsLoaded: isLoaded,
    }),
    [
      userDetails,
      updateUserDetails,
      updateUnitSystem,
      updateWeight,
      updateHeight,
      updateWalkthroughCompleted,
      updateHasRated,
      updateLanguage,
      getWeightDisplay,
      getHeightDisplay,
      getAgeRangeDisplay,
      refetchUserDetails,
      setSignedInUser,
      isLoaded,
    ]
  );

  // Reset function for account deletion
  const resetContext = React.useCallback(() => {
    setUserDetails(initialUserDetails);
    setIsLoaded(false);
    setUserIdState(null);
    // Reset loading state to false so it can be properly set when new data loads
  }, []);

  // Expose reset function globally for account deletion
  React.useEffect(() => {
    (global as any).resetUserDetailsContext = resetContext;
    return () => {
      (global as any).resetUserDetailsContext = undefined;
    };
  }, [resetContext]);

  return <UserDetailsContext.Provider value={value}>{children}</UserDetailsContext.Provider>;
}

export function useUserDetails() {
  const context = useContext(UserDetailsContext);
  if (context === undefined) {
    throw new Error('useUserDetails must be used within a UserDetailsProvider');
  }
  return context;
}
