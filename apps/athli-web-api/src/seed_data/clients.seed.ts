/**
 * Clients Seed Data
 * Handles creation of test client users and their profiles
 */

import { TEST_CLIENTS, TEST_PASSWORD, TestClient } from './utils';

/**
 * Create test client user data for Supabase auth.admin.createUser
 */
export function getTestClientAuthData(client: TestClient) {
  return {
    email: client.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: client.name,
      user_type: 'client',
    },
  };
}

/**
 * Get client profile data for client_profiles table
 * Schema: client_id, date_of_birth, gender, height_cm, phone, country, unit_system
 * Note: coach_id, category, status are in coach_client_assignments, not here
 */
export function getClientProfileData(clientId: string, _coachId: string, client: TestClient) {
  return {
    client_id: clientId,
    gender: client.gender,
    date_of_birth: client.dateOfBirth,
    height_cm: client.heightCm,
    country: client.country,
    unit_system: client.unitSystem,
  };
}

/**
 * Get coach-client assignment data
 */
export function getCoachClientAssignmentData(coachId: string, clientId: string, client: TestClient) {
  return {
    coach_id: coachId,
    client_id: clientId,
    category: client.category,
    status: client.status,
    is_active: true,
    is_archived: false,
  };
}

/**
 * Get client training summary initialization data
 * Schema: client_id (PK), last_activity, last_7_days_training_completed/total,
 *         last_30_days_training_completed/total, updated_by, updated_at
 */
export function getClientTrainingSummaryData(_coachId: string, clientId: string) {
  return {
    client_id: clientId,
    last_activity: null,
    last_7_days_training_completed: 0,
    last_7_days_training_total: 0,
    last_30_days_training_completed: 0,
    last_30_days_training_total: 0,
  };
}

/**
 * Get all test clients
 */
export function getAllTestClients() {
  return TEST_CLIENTS;
}
