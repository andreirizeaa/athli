/**
 * AI Action Store - Zustand store for managing AI-generated action payloads
 */

import { create } from 'zustand';

export type ActionType = 'create_workout' | 'create_program' | 'create_section';

export interface AIActionPayload {
  type: ActionType;
  payload: any;
}

interface AIActionStore {
  // State
  pendingAction: AIActionPayload | null;
  isExecuting: boolean;
  lastError: string | null;

  // Actions
  setPendingAction: (action: AIActionPayload | null) => void;
  clearPendingAction: () => void;
  setIsExecuting: (executing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAIActionStore = create<AIActionStore>((set) => ({
  // Initial state
  pendingAction: null,
  isExecuting: false,
  lastError: null,

  // Actions
  setPendingAction: (action) => set({ pendingAction: action, lastError: null }),
  clearPendingAction: () => set({ pendingAction: null }),
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  setError: (error) => set({ lastError: error }),
}));

/**
 * Helper to get redirect URL for an action type
 */
export function getActionRedirectUrl(actionType: ActionType): string {
  switch (actionType) {
    case 'create_workout':
      return '/training/workouts';
    case 'create_program':
      return '/training/programs';
    case 'create_section':
      return '/training/sections';
    default:
      return '/training/workouts';
  }
}

/**
 * Helper to get action display name
 */
export function getActionDisplayName(actionType: ActionType): string {
  switch (actionType) {
    case 'create_workout':
      return 'Add Workout to Library';
    case 'create_program':
      return 'Add Program to Library';
    case 'create_section':
      return 'Add Section to Library';
    default:
      return 'Confirm';
  }
}
