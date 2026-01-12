import { createMMKV } from 'react-native-mmkv';

// Create a single MMKV instance for the app
// mode: MULTI_PROCESS allows the storage to be safely accessed from multiple processes
// This is useful if you're using app extensions, widgets, or share extensions
export const storage = createMMKV({
  id: 'athli-app-storage',
});

// Helper functions to match AsyncStorage API for easier migration
export const Storage = {
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },

  getItem: (key: string): string | undefined => {
    return storage.getString(key);
  },

  removeItem: (key: string): void => {
    storage.remove(key);
  },

  clear: (): void => {
    storage.clearAll();
  },

  getAllKeys: (): string[] => {
    return storage.getAllKeys();
  },
};
