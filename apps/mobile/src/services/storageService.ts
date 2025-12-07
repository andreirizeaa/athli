import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from './alertService';

const USER_ID_KEY = 'user_id';
const SELECTED_DATE_KEY = 'selectedDate';
const LOADING_LIFTS_KEY = 'loadingLifts';
const PENDING_LIFT_COMPLETIONS_KEY = 'pendingLiftCompletions';
const PENDING_LIFT_FAILURES_KEY = 'pendingLiftFailures';
const INFLIGHT_ASSET_IDS_KEY = 'inflightAssetIds';
const USER_JUST_PAID_KEY = 'userJustPaid';
const SELECTED_LANGUAGE_KEY = 'selectedLanguage';

export async function setUserId(userId: string): Promise<void> {
  const value = await AsyncStorage.getItem(USER_ID_KEY);
  if (value) {
    await AsyncStorage.removeItem(USER_ID_KEY);
  }
  await AsyncStorage.setItem(USER_ID_KEY, userId);
}

export async function getUserId(): Promise<string | null> {
  const value = await AsyncStorage.getItem(USER_ID_KEY);
  return value;
}

export async function removeUserId(): Promise<void> {
  await AsyncStorage.removeItem(USER_ID_KEY);
}

/**
 * Clears all user data from AsyncStorage and memory when account is deleted
 */
export async function clearAllUserData(): Promise<void> {
  try {
    // Clear all AsyncStorage keys related to user data
    const keysToRemove = [
      USER_ID_KEY,
      SELECTED_DATE_KEY,
      LOADING_LIFTS_KEY,
      PENDING_LIFT_COMPLETIONS_KEY,
      PENDING_LIFT_FAILURES_KEY,
      INFLIGHT_ASSET_IDS_KEY,
      USER_JUST_PAID_KEY,
      SELECTED_LANGUAGE_KEY,
    ];

    await Promise.all(keysToRemove.map((key) => AsyncStorage.removeItem(key)));

    ('All user data cleared from AsyncStorage');
  } catch (error) {
    showAlert(
      'Error',
      'An error occurred while clearing your data. Please try again.',
      undefined,
      'STORAGE_SERVICE_CLEAR_DATA_ERROR',
      error
    );
    throw error;
  }
}

/**
 * Sets a flag indicating the user just completed a payment
 */
export async function setUserJustPaid(): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_JUST_PAID_KEY, 'true');
  } catch (error) {
    console.warn('Error setting userJustPaid flag:', error);
  }
}

/**
 * Checks if the user just completed a payment
 */
export async function getUserJustPaid(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(USER_JUST_PAID_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Error getting userJustPaid flag:', error);
    return false;
  }
}

/**
 * Clears the userJustPaid flag
 */
export async function clearUserJustPaid(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_JUST_PAID_KEY);
  } catch (error) {
    console.warn('Error clearing userJustPaid flag:', error);
  }
}

/**
 * Sets the selected language in AsyncStorage
 */
export async function setSelectedLanguage(language: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_LANGUAGE_KEY, language);
  } catch (error) {
    console.warn('Error setting selected language:', error);
  }
}

/**
 * Gets the selected language from AsyncStorage
 */
export async function getSelectedLanguage(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(SELECTED_LANGUAGE_KEY);
    return value;
  } catch (error) {
    console.warn('Error getting selected language:', error);
    return null;
  }
}

/**
 * Clears the selected language from AsyncStorage
 */
export async function clearSelectedLanguage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SELECTED_LANGUAGE_KEY);
  } catch (error) {
    console.warn('Error clearing selected language:', error);
  }
}

/**
 * Generic function to get an item from AsyncStorage
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`Error getting item ${key}:`, error);
    return null;
  }
}

/**
 * Generic function to set an item in AsyncStorage
 */
export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Error setting item ${key}:`, error);
  }
}
