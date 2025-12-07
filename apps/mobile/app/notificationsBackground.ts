import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'pendingLiftCompletions';
const PENDING_FAIL_KEY = 'pendingLiftFailures';
export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  try {
    if (error || !data) return;
    const payload = data as any;
    
    // Handle success notifications
    if (payload.type === 'lift_complete' && payload.assetId) {
      const raw = (await AsyncStorage.getItem(PENDING_KEY)) || '[]';
      const list = JSON.parse(raw);
      list.push({ assetId: payload.assetId, savedAt: Date.now() });
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
      return;
    }

    // Handle failure notifications
    if (payload.type === 'lift_failed' && payload.assetId) {
      const raw = (await AsyncStorage.getItem(PENDING_FAIL_KEY)) || '[]';
      const list = JSON.parse(raw);
      list.push({
        assetId: payload.assetId,
        error: payload.error || null,
        stage: payload.stage || 'analyze',
        savedAt: Date.now(),
      });
      await AsyncStorage.setItem(PENDING_FAIL_KEY, JSON.stringify(list));
      return;
    }
  } catch (_) {
    // no-op; background tasks must be resilient
  }
});
