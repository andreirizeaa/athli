import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserId } from './storageService';
import { SuperwallExpoModule } from 'expo-superwall';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const LAST_SYNC_KEY = 'last_sync_time';

// Global state
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let queryClient: any = null;
let isRunning = false;
let appStateSubscription: any = null;

// Initialize sync service
export function initializeSyncService(client: any) {
  queryClient = client;
}

// Start the background sync service
export function startSyncService() {
  if (isRunning) return;

  isRunning = true;

  // Initial sync
  performSync();

  // Set up interval for regular syncing
  syncIntervalId = setInterval(() => {
    performSync();
  }, SYNC_INTERVAL);

  // Listen for app state changes to sync when app becomes active
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
}

// Stop the background sync service
export function stopSyncService() {
  if (!isRunning) return;

  isRunning = false;

  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

// Handle app state changes
function handleAppStateChange(nextAppState: string) {
  if (nextAppState === 'active') {
    // Sync when app becomes active
    performSync();
  }
}

// Perform the actual sync operation
async function performSync(): Promise<void> {
  // Get user ID from AsyncStorage - only sync if user is signed in
  const currentUserId = await getUserId();
  if (!currentUserId || !queryClient) return;

  try {
    // Reset Superwall status first to ensure subscription state is fresh
    await resetSuperwallStatus();

    // Invalidate and refetch all relevant queries in parallel
    await Promise.all([
      // User Check-ins
      queryClient.invalidateQueries({ queryKey: ['userCheckIns', currentUserId] }),
      queryClient.refetchQueries({ queryKey: ['userCheckIns', currentUserId] }),

      // Lift Data
      queryClient.invalidateQueries({ queryKey: ['lifts-by-user', currentUserId] }),
      queryClient.refetchQueries({ queryKey: ['lifts-by-user', currentUserId] }),

      // User Details
      queryClient.invalidateQueries({ queryKey: ['user-details', currentUserId] }),
      queryClient.refetchQueries({ queryKey: ['user-details', currentUserId] }),
    ]);

    // Update last sync time
    await updateLastSyncTime();
  } catch (error) {
    // Silently handle errors to avoid disrupting user experience
  }
}

// Manual sync triggered by user
export async function performManualSync(): Promise<void> {
  try {
    await performSync();
  } catch (error) {
    console.error('Sync failed:', error);
    throw new Error('Sync failed. Please try again.');
  }
}

// Update last sync time in AsyncStorage
async function updateLastSyncTime(): Promise<void> {
  try {
    const now = new Date();
    await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
  } catch (error) {}
}

// Get last sync time from AsyncStorage
export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const lastSyncString = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (lastSyncString) {
      return new Date(lastSyncString);
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Format last sync time for display
export async function getFormattedLastSyncTime(): Promise<string | null> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return null;

  const timeString = lastSync.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Ensure AM/PM are uppercase
  return timeString.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

// Reset Superwall status
async function resetSuperwallStatus(): Promise<void> {
  try {
    // Complete Superwall refresh flow: reset → identify
    await SuperwallExpoModule.reset();

    const userId = await getUserId();
    if (userId) {
      await SuperwallExpoModule.identify(userId);
    }

    // Note: Superwall handles purchase restoration automatically
    // when users interact with paywalls, no manual restore needed
  } catch (error) {
    console.warn('Failed to reset Superwall status during sync:', error);
  }
}

// Check if sync is currently running
export function isSyncRunning(): boolean {
  return isRunning;
}
