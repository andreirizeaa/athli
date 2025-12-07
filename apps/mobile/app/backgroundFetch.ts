import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'LIFT_BACKGROUND_FETCH';
const PENDING_KEY = 'pendingLiftCompletions';
const INFLIGHT_KEY = 'inflightAssetIds';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const inflight: string[] = JSON.parse((await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]');
    if (!Array.isArray(inflight) || inflight.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Background fetch logic can be added here if needed
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function initBackgroundFetch() {
  try {
    // Register the background fetch task
    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
    });
  } catch (error) {
    // Silently fail - background fetch is optional
  }
}

// Function to check if background task is available and set up
export async function getBackgroundTaskStatus() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    return status;
  } catch (error) {
    return BackgroundTask.BackgroundTaskStatus.Restricted;
  }
}
