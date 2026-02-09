/**
 * Simple event emitter for rate limit (429) events.
 * Used to communicate between axios interceptor (outside React) and the overlay (inside React).
 */

type RateLimitCallback = () => void;

const listeners: Set<RateLimitCallback> = new Set();

export const rateLimitEvents = {
  onRateLimited: (callback: RateLimitCallback): (() => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  emitRateLimited: (): void => {
    listeners.forEach((callback) => callback());
  },
};
