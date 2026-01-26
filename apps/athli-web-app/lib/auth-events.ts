/**
 * Simple event emitter for auth-related events
 * Used to communicate between axios interceptor (outside React) and auth providers (inside React)
 */

type AuthEventCallback = () => void;

const listeners: Set<AuthEventCallback> = new Set();

export const authEvents = {
  /**
   * Subscribe to session expired events
   */
  onSessionExpired: (callback: AuthEventCallback): (() => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  /**
   * Emit session expired event - called from axios interceptor
   */
  emitSessionExpired: (): void => {
    listeners.forEach((callback) => callback());
  },
};
