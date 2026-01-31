/**
 * Startup Context Service
 * Pre-fetches coach data to inject into the system prompt
 * This eliminates unnecessary tool calls and speeds up responses
 */

import { getSupabaseClient } from '../supabase.service';

export interface ClientSummary {
  id: string;
  name: string;
  category: string;
  goals?: string;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  type?: string;
  difficulty?: string;
}

export interface StartupContext {
  coachId: string;
  coachName?: string;
  clients: ClientSummary[];
  workouts: WorkoutSummary[];
  fetchedAt: Date;
}

/**
 * Fetch startup context for a coach
 * This data is injected into the system prompt to avoid tool calls
 */
export async function fetchStartupContext(coachId: string): Promise<StartupContext> {
  const supabase = getSupabaseClient();

  // Fetch in parallel for speed
  const [clientsResult, workoutsResult, coachResult] = await Promise.all([
    // Get all active clients (goals is in a separate table, skip for now)
    supabase
      .from('coach_clients_view')
      .select('client_id, full_name, category')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('full_name', { ascending: true })
      .limit(50),

    // Get coach's workout templates
    supabase
      .from('coach_workouts')
      .select('id, name, type, difficulty')
      .eq('coach_id', coachId)
      .order('name', { ascending: true })
      .limit(50),

    // Get coach name
    supabase
      .from('user_profiles')
      .select('name')
      .eq('id', coachId)
      .single(),
  ]);

  const clients: ClientSummary[] = (clientsResult.data || []).map((c: any) => ({
    id: c.client_id,
    name: c.full_name || 'Unknown',
    category: c.category || 'online',
  }));

  const workouts: WorkoutSummary[] = (workoutsResult.data || []).map((w: any) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    difficulty: w.difficulty,
  }));

  return {
    coachId,
    coachName: coachResult.data?.name,
    clients,
    workouts,
    fetchedAt: new Date(),
  };
}

/**
 * Format startup context for injection into system prompt
 */
export function formatStartupContext(context: StartupContext): string {
  let output = `\n\n## Your Data (pre-loaded, no need to call tools for this)\n`;

  // Coach info
  if (context.coachName) {
    output += `\n**Coach:** ${context.coachName}\n`;
  }

  // Clients
  output += `\n**Your Clients (${context.clients.length}):**\n`;
  if (context.clients.length === 0) {
    output += `- No clients yet\n`;
  } else {
    for (const client of context.clients) {
      output += `- ${client.name} (ID: ${client.id}, ${client.category})`;
      if (client.goals) {
        output += ` - Goals: ${client.goals}`;
      }
      output += `\n`;
    }
  }

  // Workouts
  output += `\n**Your Workout Templates (${context.workouts.length}):**\n`;
  if (context.workouts.length === 0) {
    output += `- No workouts yet\n`;
  } else {
    for (const workout of context.workouts) {
      output += `- "${workout.name}" (ID: ${workout.id}`;
      if (workout.type) output += `, ${workout.type}`;
      if (workout.difficulty) output += `, ${workout.difficulty}`;
      output += `)\n`;
    }
  }

  output += `\n**IMPORTANT:** You already have this data. Do NOT call list_all_clients, search_clients, or get_coach_workouts unless the user explicitly asks you to refresh the data or you need more details about a specific client.\n`;

  return output;
}
