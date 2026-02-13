import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'athli_biometric_enabled';
const BIOMETRIC_USER_ID_KEY = 'athli_biometric_user_id';

type BiometricType = 'faceid' | 'fingerprint' | 'iris' | 'none';

type BiometricStore = {
  // State
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;

  // Actions
  initialize: () => Promise<void>;
  checkBiometricAvailability: () => Promise<void>;
  enableBiometric: (userId: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  isBiometricEnabledForUser: (userId: string) => Promise<boolean>;
};

export const useBiometricStore = create<BiometricStore>((set, get) => ({
  biometricEnabled: false,
  biometricAvailable: false,
  biometricType: 'none',
  isEnrolled: false,

  initialize: async () => {
    await get().checkBiometricAvailability();

    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      set({ biometricEnabled: enabled === 'true' });
    } catch (error) {
      console.error('[BiometricStore] Failed to load preference:', error);
    }
  },

  checkBiometricAvailability: async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricType = 'none';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'faceid';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      set({
        biometricAvailable: compatible && enrolled,
        biometricType,
        isEnrolled: enrolled,
      });
    } catch (error) {
      console.error('[BiometricStore] Error checking availability:', error);
      set({ biometricAvailable: false });
    }
  },

  enableBiometric: async (userId: string) => {
    const { biometricAvailable } = get();
    if (!biometricAvailable) {
      return false;
    }

    // Verify biometric before enabling
    const result = await get().authenticateWithBiometric();
    if (!result.success) {
      return false;
    }

    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      await SecureStore.setItemAsync(BIOMETRIC_USER_ID_KEY, userId);
      set({ biometricEnabled: true });
      return true;
    } catch (error) {
      console.error('[BiometricStore] Failed to enable:', error);
      return false;
    }
  },

  disableBiometric: async () => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_USER_ID_KEY);
      set({ biometricEnabled: false });
    } catch (error) {
      console.error('[BiometricStore] Failed to disable:', error);
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Athli',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  },

  isBiometricEnabledForUser: async (userId: string) => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const storedUserId = await SecureStore.getItemAsync(BIOMETRIC_USER_ID_KEY);
      return enabled === 'true' && storedUserId === userId;
    } catch (error) {
      console.error('[BiometricStore] Error checking biometric for user:', error);
      return false;
    }
  },
}));

/**
 * Hook to access biometric preferences (backward compatible)
 */
export const useBiometric = () => {
  const biometricEnabled = useBiometricStore((state) => state.biometricEnabled);
  const biometricAvailable = useBiometricStore((state) => state.biometricAvailable);
  const biometricType = useBiometricStore((state) => state.biometricType);
  const isEnrolled = useBiometricStore((state) => state.isEnrolled);
  const enableBiometric = useBiometricStore((state) => state.enableBiometric);
  const disableBiometric = useBiometricStore((state) => state.disableBiometric);
  const authenticateWithBiometric = useBiometricStore((state) => state.authenticateWithBiometric);

  return {
    biometricEnabled,
    biometricAvailable,
    biometricType,
    isEnrolled,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
  };
};
