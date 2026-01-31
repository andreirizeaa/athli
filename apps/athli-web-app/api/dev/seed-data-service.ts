/**
 * Seed Data Service
 * API calls for Dev Studio seed data operations
 */

import { apiFetch, ApiResponse } from '../api-client';

export interface SeedDataResult {
  coachLibrary: {
    metrics: number;
    habits: number;
    files: number;
    checkIns: number;
    questionnaires: number;
    exercises: number;
    workouts: number;
    programs: number;
    sections: number;
  };
  clients: number;
  assignments: {
    metrics: number;
    habits: number;
    files: number;
    checkIns: number;
    questionnaires: number;
  };
  privateData: {
    bios: number;
    goals: number;
    injuries: number;
    notes: number;
  };
  logs: {
    metricLogs: number;
    habitLogs: number;
    checkInLogs: number;
    questionnaireLogs: number;
    photoLogs: number;
  };
  training: {
    trainingEntries: number;
    historyEntries: number;
  };
  todos: {
    ownTodos: number;
    autoTodos: number;
  };
  messaging: {
    conversations: number;
    messages: number;
    attachments: number;
    reactions: number;
  };
}

export interface RemoveDataResult {
  deletedClients: number;
  deletedItems: {
    coachMetrics: number;
    coachHabits: number;
    coachFiles: number;
    coachCheckIns: number;
    coachQuestionnaires: number;
    coachExercises: number;
    coachWorkouts: number;
    coachPrograms: number;
    coachSections: number;
    ownTodos: number;
    autoTodos: number;
    conversations: number;
  };
}

/**
 * Add seed data for development testing
 */
export async function addSeedData(): Promise<ApiResponse<SeedDataResult>> {
  return apiFetch<ApiResponse<SeedDataResult>>('/seed-data/add', {
    method: 'POST',
  });
}

/**
 * Remove seed data
 */
export async function removeSeedData(): Promise<ApiResponse<RemoveDataResult>> {
  return apiFetch<ApiResponse<RemoveDataResult>>('/seed-data/remove', {
    method: 'DELETE',
  });
}
