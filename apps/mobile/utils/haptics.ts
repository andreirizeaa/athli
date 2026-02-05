import * as Haptics from 'expo-haptics';

/**
 * Centralized haptics utility
 *
 * Provides consistent haptic feedback across the app with:
 * - Global preference support (enable/disable)
 * - Silent error handling (never blocks UI)
 * - Standardized feedback types
 */

let isHapticsEnabled = true;

/**
 * Set whether haptics are enabled globally
 * Called by useHapticsStore when preference changes
 */
export const setHapticsEnabled = (enabled: boolean) => {
  isHapticsEnabled = enabled;
};

/**
 * Get current haptics enabled state
 */
export const getHapticsEnabled = () => isHapticsEnabled;

/**
 * Haptic feedback functions
 */
export const haptics = {
  /**
   * Light selection feedback - for subtle interactions
   * Use for: Tab switches, minor selections
   */
  selection: () => {
    if (!isHapticsEnabled) return;
    Haptics.selectionAsync().catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Light impact feedback - subtle tap
   * Use for: List item taps, minor actions
   */
  light: () => {
    if (!isHapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Medium impact feedback - standard button press (DEFAULT)
   * Use for: All buttons, primary interactions
   */
  medium: () => {
    if (!isHapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Heavy impact feedback - important actions
   * Use for: Critical actions, confirmations
   */
  heavy: () => {
    if (!isHapticsEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Success notification - completed actions
   * Use for: Successful form submissions, save operations
   */
  success: () => {
    if (!isHapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Warning notification - caution needed
   * Use for: Warnings, validation issues
   */
  warning: () => {
    if (!isHapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },

  /**
   * Error notification - failures
   * Use for: Failed operations, errors
   */
  error: () => {
    if (!isHapticsEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Silently handle haptic errors to prevent blocking UI
    });
  },
};
