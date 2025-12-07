import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppVersion {
  version: string;
  force_show: boolean;
  force_update: boolean;
  whats_new: string[];
  created_at: string;
  updated_at: string;
}

export interface VersionCheckResult {
  shouldShowModal: boolean;
  forceUpdate: boolean;
  forceShow: boolean;
  latestVersion: string;
  currentVersion: string;
  whatsNew: string[];
}

// Constants
const LAST_VERSION_CHECK_KEY = 'last_version_check_time';
const VERSION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Gets the last version check time from AsyncStorage
 */
async function getLastVersionCheckTime(): Promise<number | null> {
  try {
    const timeString = await AsyncStorage.getItem(LAST_VERSION_CHECK_KEY);
    return timeString ? parseInt(timeString, 10) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Stores the current time as the last version check time
 */
async function setLastVersionCheckTime(): Promise<void> {
  try {
    const currentTime = Date.now();
    await AsyncStorage.setItem(LAST_VERSION_CHECK_KEY, currentTime.toString());
  } catch (error) {
    // Silent fail
  }
}

/**
 * Checks if enough time has passed since the last version check
 */
async function shouldCheckVersion(): Promise<boolean> {
  try {
    const lastCheckTime = await getLastVersionCheckTime();

    if (!lastCheckTime) {
      return true;
    }

    const timeSinceLastCheck = Date.now() - lastCheckTime;
    return timeSinceLastCheck >= VERSION_CHECK_INTERVAL;
  } catch (error) {
    // If there's an error, err on the side of checking
    return true;
  }
}

/**
 * Compares two version strings (e.g., "1.2.3" vs "1.2.4")
 * Returns: 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  // Ensure both arrays have the same length by padding with zeros
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0;
}

/**
 * Checks if two versions differ only in patch version (e.g., "1.2.3" vs "1.2.4")
 */
function isPatchVersionDifference(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  // Ensure both arrays have at least 3 parts
  while (v1Parts.length < 3) v1Parts.push(0);
  while (v2Parts.length < 3) v2Parts.push(0);

  // Check if major and minor versions are the same
  return v1Parts[0] === v2Parts[0] && v1Parts[1] === v2Parts[1] && v1Parts[2] !== v2Parts[2];
}

/**
 * Fetches the latest app version from the database
 */
async function fetchLatestAppVersion(): Promise<AppVersion | null> {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    // Handle case where no rows are returned
    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    return null;
  }
}

/**
 * Gets the current app version from Constants
 */
function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/**
 * Creates a default app version entry for testing
 * This should only be used in development
 */
export async function createDefaultAppVersion(): Promise<AppVersion | null> {
  try {
    const currentVersion = getCurrentAppVersion();

    const { data, error } = await supabase
      .from('app_versions')
      .insert({
        version: currentVersion,
        force_show: false,
        force_update: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default app version:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDefaultAppVersion:', error);
    return null;
  }
}

/**
 * Main function to check if the upgrade modal should be shown
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  const currentVersion = getCurrentAppVersion();

  // Default result
  const defaultResult: VersionCheckResult = {
    shouldShowModal: false,
    forceUpdate: false,
    forceShow: false,
    latestVersion: currentVersion,
    currentVersion,
    whatsNew: [],
  };

  try {
    // Check if we should perform a version check based on time
    const shouldCheck = await shouldCheckVersion();

    if (!shouldCheck) {
      return defaultResult;
    }

    // Fetch latest version from database
    const latestVersionData = await fetchLatestAppVersion();

    if (!latestVersionData) {
      return defaultResult;
    }

    // Store the current time as the last check time
    await setLastVersionCheckTime();

    const latestVersion = latestVersionData.version;
    const forceUpdate = latestVersionData.force_update;
    const forceShow = latestVersionData.force_show;
    const whatsNew = latestVersionData.whats_new || [];

    // If force_update is true, show modal without close button
    if (forceUpdate) {
      return {
        shouldShowModal: true,
        forceUpdate: true,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // If force_show is true, show modal with close button
    if (forceShow) {
      return {
        shouldShowModal: true,
        forceUpdate: false,
        forceShow: true,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // Compare versions
    const versionComparison = compareVersions(latestVersion, currentVersion);

    // If current version is newer or same, don't show modal
    if (versionComparison <= 0) {
      return {
        shouldShowModal: false,
        forceUpdate: false,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // If versions are different, check if it's only a patch difference
    const isPatchDiff = isPatchVersionDifference(currentVersion, latestVersion);

    if (isPatchDiff) {
      // Don't show modal for patch version differences
      return {
        shouldShowModal: false,
        forceUpdate: false,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // Show modal for major/minor version differences
    return {
      shouldShowModal: true,
      forceUpdate: false,
      forceShow: false,
      latestVersion,
      currentVersion,
      whatsNew,
    };
  } catch (error) {
    return defaultResult;
  }
}

/**
 * Forces a version check regardless of the last check time
 * This is useful for immediate checks when the add button is pressed
 */
export async function forceCheckAppVersion(): Promise<VersionCheckResult> {
  const currentVersion = getCurrentAppVersion();

  // Default result
  const defaultResult: VersionCheckResult = {
    shouldShowModal: false,
    forceUpdate: false,
    forceShow: false,
    latestVersion: currentVersion,
    currentVersion,
    whatsNew: [],
  };

  try {
    // Fetch latest version from database
    const latestVersionData = await fetchLatestAppVersion();

    if (!latestVersionData) {
      return defaultResult;
    }

    // Store the current time as the last check time
    await setLastVersionCheckTime();

    const latestVersion = latestVersionData.version;
    const forceUpdate = latestVersionData.force_update;
    const forceShow = latestVersionData.force_show;
    const whatsNew = latestVersionData.whats_new || [];

    // If force_update is true, show modal without close button
    if (forceUpdate) {
      return {
        shouldShowModal: true,
        forceUpdate: true,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // If force_show is true, show modal with close button
    if (forceShow) {
      return {
        shouldShowModal: true,
        forceUpdate: false,
        forceShow: true,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // Compare versions
    const versionComparison = compareVersions(latestVersion, currentVersion);

    // If current version is newer or same, don't show modal
    if (versionComparison <= 0) {
      return {
        shouldShowModal: false,
        forceUpdate: false,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // If versions are different, check if it's only a patch difference
    const isPatchDiff = isPatchVersionDifference(currentVersion, latestVersion);

    if (isPatchDiff) {
      // Don't show modal for patch version differences
      return {
        shouldShowModal: false,
        forceUpdate: false,
        forceShow: false,
        latestVersion,
        currentVersion,
        whatsNew,
      };
    }

    // Show modal for major/minor version differences
    return {
      shouldShowModal: true,
      forceUpdate: false,
      forceShow: false,
      latestVersion,
      currentVersion,
      whatsNew,
    };
  } catch (error) {
    return defaultResult;
  }
}
