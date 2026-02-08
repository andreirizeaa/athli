/**
 * Client Task Schema
 *
 * Types for the client_tasks system – a materialised to-do list generated
 * daily by a pg_cron job based on active assignments.
 */

export type ClientTaskType = 'check_in' | 'metric' | 'habit' | 'questionnaire';

export interface ClientTask {
    id: string;
    client_id: string;
    coach_id: string;
    task_type: ClientTaskType;
    reference_id: string;
    due_date: string;
    created_at: string;
    // Joined fields (populated by API)
    name?: string;
    description?: string;
}
