/**
 * AI Action Store - Zustand store for managing AI-generated action payloads
 */

import { create } from 'zustand';

export type ActionType =
  | 'create_workout'
  | 'create_program'
  | 'create_section'
  | 'assign_workout'
  | 'assign_metric_to_client'
  | 'add_client_goal'
  | 'add_client_injury'
  | 'draft_message'
  | 'update_client_profile'
  | 'create_checkin_template'
  | 'create_metric';

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
export function getActionRedirectUrl(actionType: ActionType, payload?: any): string {
  const clientId = payload?.clientId;

  switch (actionType) {
    case 'create_workout':
      return clientId ? `/athletes/${clientId}/training` : '/library/training/workouts';
    case 'create_program':
      return '/library/training/programs';
    case 'create_section':
      return '/library/training/sections';
    case 'assign_workout':
      return clientId ? `/athletes/${clientId}/training` : '/athletes';
    case 'assign_metric_to_client':
    case 'add_client_goal':
    case 'add_client_injury':
    case 'update_client_profile':
      return clientId ? `/athletes/${clientId}/overview` : '/athletes';
    case 'create_checkin_template':
      return clientId ? `/athletes/${clientId}/check-in` : '/library/forms/check-ins';
    case 'create_metric':
      return clientId ? `/athletes/${clientId}/metrics` : '/library/metrics';
    case 'draft_message':
      return '/inbox';
    default:
      return '/library/training/workouts';
  }
}

/**
 * Helper to get action display name
 */
export function getActionDisplayName(actionType: ActionType, payload?: any): string {
  const hasClient = !!payload?.clientId;

  switch (actionType) {
    case 'create_workout':
      return hasClient ? 'Add to Training' : 'Add Workout to Library';
    case 'create_program':
      return 'Add Program to Library';
    case 'create_section':
      return 'Add Section to Library';
    case 'assign_workout':
      return 'Assign Workout';
    case 'assign_metric_to_client':
      return 'Assign Metric';
    case 'add_client_goal':
      return 'Add Goal';
    case 'add_client_injury':
      return 'Record Injury';
    case 'draft_message':
      return 'Copy Message';
    case 'update_client_profile':
      return 'Update Profile';
    case 'create_checkin_template':
      return hasClient ? 'Create Check-in' : 'Add Check-in to Library';
    case 'create_metric':
      return hasClient ? 'Track Metric' : 'Add Metric to Library';
    default:
      return 'Confirm';
  }
}
