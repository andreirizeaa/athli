import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoadingLiftData } from '../../types/Lifts';

const KEY = 'loading_lifts_v1';

/**
 * Load all persisted, in-progress lifts from AsyncStorage
 * Includes progress percentage, pipeline stage, and all other lift data
 */
export async function loadLoadingLifts(): Promise<LoadingLiftData[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/**
 * Save loading lifts to AsyncStorage, filtering out completed ones
 * Only stores lifts that are not fully completed to keep storage clean
 * Includes progress percentage, pipeline stage, and all other lift data
 */
export async function saveLoadingLifts(lifts: LoadingLiftData[]): Promise<void> {
  try {
    const toStore = lifts.filter((lift) => !(lift.isComplete && lift.status === 'completed'));
    await AsyncStorage.setItem(KEY, JSON.stringify(toStore));
  } catch (error) {
    // Ignore write errors silently to avoid breaking the app
  }
}

/**
 * Remove a single lift by id from AsyncStorage
 * Used for hard deletes if needed
 */
export async function removeLoadingLiftById(id: string): Promise<void> {
  try {
    const all = await loadLoadingLifts();
    const next = all.filter((lift) => lift.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {}
}

/**
 * Clear all loading lifts from AsyncStorage
 * Useful for cleanup or reset scenarios
 */
export async function clearAllLoadingLifts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {}
}
