/**
 * Zustand stores - Centralized state management
 *
 * This replaces the old Context API implementation
 */

// Export stores
export { useThemeStore, type ColorSchemePreference } from './useThemeStore';
export { useTranslationsStore } from './useTranslationsStore';
export { useUnitsStore, type UnitsPreference } from './useUnitsStore';
export { useHapticsStore } from './useHapticsStore';
export { useBiometricStore } from './useBiometricStore';
export { useAppViewStore, type AppView } from './useAppViewStore';
export { useLibraryTabStore, type LibraryTab } from './useLibraryTabStore';
export { useTrainingOverlayStore } from './useTrainingOverlayStore';
export { useCoachProfileStore } from './useCoachProfileStore';
export { useCoachCompanyStore } from './useCoachCompanyStore';
export { useCoachEntitlementsStore } from './useCoachEntitlementsStore';
export { useCoachPreferencesStore } from './useCoachPreferencesStore';
export { useClientProfileStore } from './useClientProfileStore';
export { useAuthSessionStore } from './useAuthSessionStore';
export { useAppInitStore } from './useAppInitStore';
export {
  useModalCallbacksStore,
  type HabitOptionsData,
  type ScheduleFrequency,
  type MonthlyOption,
  type ScheduleData,
} from './useModalCallbacksStore';
export { useLibraryStore } from './useLibraryStore';
export { useClientsStore } from './useClientsStore';
export { useChatsStore } from './useChatsStore';
export { useClientDetailStore } from './useClientDetailStore';
export { useFeatureRequestsStore } from './useFeatureRequestsStore';
export { useAthleteDataStore } from './useAthleteDataStore';
export { useCoachDataStore } from './useCoachDataStore';
export { useAthleteCoachEntitlementsStore } from './useAthleteCoachEntitlementsStore';

// Export auth hook
export { useAuth } from '../hooks/useAuth';

// Re-export useColorScheme from useThemeStore
export { useColorScheme } from './useThemeStore';

// Backward compatibility hooks
// These hooks match the old Context API hooks for easy migration

import { useThemeStore } from './useThemeStore';
import { useTranslationsStore } from './useTranslationsStore';
import { useUnitsStore } from './useUnitsStore';
import { useHapticsStore } from './useHapticsStore';
import { useBiometricStore } from './useBiometricStore';
import { useAppViewStore } from './useAppViewStore';
import { useLibraryTabStore } from './useLibraryTabStore';
import { useTrainingOverlayStore } from './useTrainingOverlayStore';
import { useModalCallbacksStore } from './useModalCallbacksStore';
import { DEFAULT_THEME, createPresetPalette } from '@/constants/theme';

/**
 * Hook to access theme preferences (backward compatible)
 * Replaces: useThemePreference from contexts/useColorScheme
 */
export const useThemePreference = () => {
  try {
    const preference = useThemeStore((state) => state.preference);
    const setPreference = useThemeStore((state) => state.setPreference);
    const preset = useThemeStore((state) => state.preset);
    const setPreset = useThemeStore((state) => state.setPreset);
    const primaryColor = useThemeStore((state) => state.primaryColor);
    const primarySoftColor = useThemeStore((state) => state.primarySoftColor);
    const colors = useThemeStore((state) => state.colors);

    return {
      preference,
      setPreference,
      preset,
      setPreset,
      primaryColor,
      primarySoftColor,
      colors,
    };
  } catch {
    // Fallback when store not available (e.g., returning from native camera)
    const fallbackColors = createPresetPalette(DEFAULT_THEME.preset, 'dark');
    return {
      preference: 'system' as const,
      setPreference: () => {},
      preset: DEFAULT_THEME.preset,
      setPreset: () => {},
      primaryColor: fallbackColors.primary,
      primarySoftColor: fallbackColors.primarySoft,
      colors: fallbackColors,
    };
  }
};

/**
 * Hook to access translations (backward compatible)
 * Replaces: useTranslations from contexts/useTranslations
 */
export const useTranslations = () => {
  const locale = useTranslationsStore((state) => state.locale);
  const setLocale = useTranslationsStore((state) => state.setLocale);
  const t = useTranslationsStore((state) => state.t);

  return { locale, setLocale, t };
};

/**
 * Hook to access units preference (backward compatible)
 * Replaces: useUnits from contexts/useUnits
 */
export const useUnits = () => {
  const units = useUnitsStore((state) => state.units);
  const setUnits = useUnitsStore((state) => state.setUnits);

  return { units, setUnits };
};

/**
 * Hook to access app view (backward compatible)
 * Replaces: useAppView from contexts/useAppView
 */
export const useAppView = () => {
  const appView = useAppViewStore((state) => state.appView);
  const setAppView = useAppViewStore((state) => state.setAppView);

  return { appView, setAppView };
};

/**
 * Hook to access library tab state (backward compatible)
 * Replaces: useLibraryTab from contexts/useLibraryTab
 */
export const useLibraryTab = () => {
  const currentLibraryTab = useLibraryTabStore((state) => state.currentLibraryTab);
  const setCurrentLibraryTab = useLibraryTabStore((state) => state.setCurrentLibraryTab);
  const searchQuery = useLibraryTabStore((state) => state.searchQuery);
  const setSearchQuery = useLibraryTabStore((state) => state.setSearchQuery);
  const registerOpenRow = useLibraryTabStore((state) => state.registerOpenRow);
  const closeOpenRow = useLibraryTabStore((state) => state.closeOpenRow);
  const openRowCloseFn = useLibraryTabStore((state) => state.openRowCloseFn);

  return {
    currentLibraryTab,
    setCurrentLibraryTab,
    searchQuery,
    setSearchQuery,
    registerOpenRow,
    closeOpenRow,
    openRowCloseFn,
  };
};

/**
 * Hook to access training overlay state (backward compatible)
 * Replaces: useTrainingOverlay from contexts/useTrainingOverlay
 */
export const useTrainingOverlay = () => {
  const isVisible = useTrainingOverlayStore((state) => state.isVisible);
  const showOverlay = useTrainingOverlayStore((state) => state.showOverlay);
  const hideOverlay = useTrainingOverlayStore((state) => state.hideOverlay);

  return { isVisible, showOverlay, hideOverlay };
};

/**
 * Hook to access modal callbacks (backward compatible)
 * Replaces: useModalCallbacks (context implementation)
 */
export const useModalCallbacks = () => {
  const store = useModalCallbacksStore();

  // Include computed properties that match the old context API
  return {
    ...store,
    habitOptionsData: store.storedHabitOptionsData,
    scheduleData: store.storedScheduleData,
    reorderItems: store.storedReorderItems,
  };
};

/**
 * Hook to access haptics preferences (backward compatible)
 * Replaces: direct expo-haptics calls
 */
export const useHaptics = () => {
  const hapticsEnabled = useHapticsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useHapticsStore((state) => state.setHapticsEnabled);

  return { hapticsEnabled, setHapticsEnabled };
};

/**
 * Hook to access biometric preferences (backward compatible)
 */
export const useBiometric = () => {
  const biometricEnabled = useBiometricStore((state) => state.biometricEnabled);
  const biometricAvailable = useBiometricStore((state) => state.biometricAvailable);
  const biometricType = useBiometricStore((state) => state.biometricType);
  const isEnrolled = useBiometricStore((state) => state.isEnrolled);
  const enableBiometric = useBiometricStore((state) => state.enableBiometric);
  const disableBiometric = useBiometricStore((state) => state.disableBiometric);
  const authenticateWithBiometric = useBiometricStore((state) => state.authenticateWithBiometric);

  return {
    biometricEnabled,
    biometricAvailable,
    biometricType,
    isEnrolled,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
  };
};

import { useCoachEntitlementsStore } from './useCoachEntitlementsStore';
import { useCoachPreferencesStore } from './useCoachPreferencesStore';

/**
 * Hook to access coach entitlements (feature gating)
 */
export const useEntitlements = () => {
  const entitlements = useCoachEntitlementsStore((state) => state.entitlements);
  const isLoading = useCoachEntitlementsStore((state) => state.isLoading);
  const isOnTrial = useCoachEntitlementsStore((state) => state.isOnTrial);
  const hasFeature = useCoachEntitlementsStore((state) => state.hasFeature);
  const hasAddon = useCoachEntitlementsStore((state) => state.hasAddon);

  return {
    entitlements,
    isLoading,
    isOnTrial,
    hasFeature,
    hasAddon,
    plan: entitlements?.plan_type ?? 'starter',
    clientLimit: entitlements?.client_limit ?? 5,
  };
};

/**
 * Hook to access coach preferences (terminology)
 */
export const useCoachPreferences = () => {
  const preferences = useCoachPreferencesStore((state) => state.preferences);
  const isLoading = useCoachPreferencesStore((state) => state.isLoading);
  const loadPreferences = useCoachPreferencesStore((state) => state.loadPreferences);
  const updateTerminology = useCoachPreferencesStore((state) => state.updateTerminology);

  return {
    preferences,
    isLoading,
    loadPreferences,
    updateTerminology,
    terminology: preferences?.client_terminology ?? 'athlete',
  };
};

import { useAthleteCoachEntitlementsStore } from './useAthleteCoachEntitlementsStore';

/**
 * Hook for athletes to access their coach's entitlements
 * Used for feature gating in the client/athlete app
 */
export const useAthleteCoachEntitlements = () => {
  const coachEntitlements = useAthleteCoachEntitlementsStore((state) => state.coachEntitlements);
  const isLoading = useAthleteCoachEntitlementsStore((state) => state.isLoading);
  const isCoachOnStarter = useAthleteCoachEntitlementsStore((state) => state.isCoachOnStarter);
  const hasFeature = useAthleteCoachEntitlementsStore((state) => state.hasFeature);

  return {
    coachEntitlements,
    isLoading,
    isCoachOnStarter,
    hasFeature,
    coachPlan: coachEntitlements?.plan_type ?? 'starter',
  };
};
