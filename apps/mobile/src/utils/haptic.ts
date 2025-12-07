import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  // Light impact for button selections
  selection: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  // Heavy impact for important actions like Rate FormAI
  important: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  // Success notification for completed actions
  success: () => {
    // Error haptic feels better than success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  // Warning notification for errors or warnings
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  // Error notification for failures
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },
};
