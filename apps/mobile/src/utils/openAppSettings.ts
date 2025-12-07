import { Platform, Linking } from 'react-native';

/**
 * Opens the app settings with fallback options for better reliability
 * across different iOS and Android versions.
 */
export async function openAppSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    // Try multiple iOS settings URLs in order of preference
    const settingsUrls = [
      'app-settings:', // App-specific settings (iOS 8+)
      'App-Prefs:root=Privacy&path=PHOTOS', // Direct to Photos privacy settings
      'App-Prefs:root=Privacy', // General privacy settings
      'App-Prefs:root=General', // General settings
    ];

    for (const url of settingsUrls) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        // Continue to next URL if this one fails
        continue;
      }
    }

    // Final fallback to general settings
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Failed to open any settings:', error);
    }
  } else {
    // Android - use the more reliable method
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Failed to open Android settings:', error);
    }
  }
}
