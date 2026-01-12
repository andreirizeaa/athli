/**
 * Zustand stores - Centralized state management
 *
 * This replaces the old Context API implementation
 */

// Export stores
export { useThemeStore, type ColorSchemePreference } from './useThemeStore';
export { useTranslationsStore } from './useTranslationsStore';
export { useUnitsStore, type UnitsPreference } from './useUnitsStore';
export { useAppViewStore, type AppView } from './useAppViewStore';
export { useLibraryTabStore, type LibraryTab } from './useLibraryTabStore';
export { useTrainingOverlayStore } from './useTrainingOverlayStore';
export { useCoachProfileStore } from './useCoachProfileStore';
export { useClientProfileStore } from './useClientProfileStore';
export {
  useModalCallbacksStore,
  type HabitOptionsData,
  type ScheduleFrequency,
  type MonthlyOption,
  type ScheduleData,
} from './useModalCallbacksStore';
export { useLibraryStore } from './useLibraryStore';
export { useClientsStore } from './useClientsStore';

// Re-export useColorScheme from useThemeStore
export { useColorScheme } from './useThemeStore';

// Backward compatibility hooks
// These hooks match the old Context API hooks for easy migration

import { useThemeStore } from './useThemeStore';
import { useTranslationsStore } from './useTranslationsStore';
import { useUnitsStore } from './useUnitsStore';
import { useAppViewStore } from './useAppViewStore';
import { useLibraryTabStore } from './useLibraryTabStore';
import { useTrainingOverlayStore } from './useTrainingOverlayStore';
import { useModalCallbacksStore } from './useModalCallbacksStore';

/**
 * Hook to access theme preferences (backward compatible)
 * Replaces: useThemePreference from contexts/useColorScheme
 */
export const useThemePreference = () => {
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
