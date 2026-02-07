import { apiFetch } from '../api-client';

export interface CoachChecklist {
  coach_id: string;
  client_app_demo: boolean;
  coach_app_demo: boolean;
  workout_ai: boolean;
  program_templates: boolean;
  custom_exercises: boolean;
  automate_onboardings: boolean;
  check_ins_forms: boolean;
  powerful_flows: boolean;
  lifestyle_habits: boolean;
  track_metrics: boolean;
  on_demand_resources: boolean;
  created_at: string;
  updated_at: string;
}

export const getCoachChecklist = async (): Promise<CoachChecklist> => {
  const response = await apiFetch<{ data: { checklist: CoachChecklist } }>('/coach/new/checklist');
  return response.data.checklist;
};

export const updateCoachChecklistField = async (field: 'client_app_demo' | 'coach_app_demo'): Promise<void> => {
  await apiFetch('/coach/new/checklist', {
    method: 'PATCH',
    body: JSON.stringify({ field }),
  });
};
