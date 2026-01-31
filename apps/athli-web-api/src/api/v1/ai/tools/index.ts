/**
 * AI Tool definitions and registry
 * These tools are used by the LangGraph agent to interact with the Athli platform
 */

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { getSupabaseClient } from '../../../../services/supabase.service';

// ============================================================================
// Tool Context Type
// ============================================================================

export interface ToolContext {
  coachId: string;
}

// ============================================================================
// CLIENT TOOLS
// ============================================================================

export const createSearchClientsTool = (ctx: ToolContext) =>
  tool(
    async ({ name }) => {
      const supabase = getSupabaseClient();
      const { data: clients, error } = await supabase
        .from('coach_clients_view')
        .select('client_id, full_name, email, goals, category, status')
        .eq('coach_id', ctx.coachId)
        .eq('is_active', true)
        .eq('is_archived', false)
        .ilike('full_name', `%${name}%`);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      if (!clients || clients.length === 0) {
        return JSON.stringify({
          found: false,
          message: `No clients found matching "${name}"`,
          clients: [],
        });
      }

      return JSON.stringify({
        found: true,
        count: clients.length,
        clients: clients.map((c) => ({
          id: c.client_id,
          name: c.full_name,
          email: c.email,
          goals: c.goals,
          category: c.category,
          status: c.status,
        })),
      });
    },
    {
      name: 'search_clients',
      description:
        "Search coach's clients by name. Use this when user mentions a client name to find their ID. Returns matching clients with basic info.",
      schema: z.object({
        name: z.string().describe('The client name to search for (partial match)'),
      }),
    }
  );

export const createGetClientProfileTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId }) => {
      const supabase = getSupabaseClient();

      // Get client from view
      const { data: client, error } = await supabase
        .from('coach_clients_view')
        .select('*')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .single();

      if (error || !client) {
        return JSON.stringify({ error: 'Client not found' });
      }

      // Get additional profile data
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('client_id', clientId)
        .single();

      // Get goals
      const { data: goals } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', ctx.coachId);

      // Get injuries
      const { data: injuries } = await supabase
        .from('client_injuries')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', ctx.coachId);

      return JSON.stringify({
        id: client.client_id,
        name: client.full_name,
        email: client.email,
        category: client.category,
        status: client.status,
        joinedAt: client.created_at,
        profile: profile
          ? {
              gender: profile.gender,
              dateOfBirth: profile.date_of_birth,
              height: profile.height_cm,
              unitSystem: profile.unit_system,
            }
          : null,
        goals: goals || [],
        injuries: injuries || [],
      });
    },
    {
      name: 'get_client_profile',
      description:
        'Get detailed client profile including goals and injuries. Use after finding client ID with search_clients.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID) to get profile for'),
      }),
    }
  );

export const createGetClientWorkoutsTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, limit = 20 }) => {
      const supabase = getSupabaseClient();

      // Get client's training history
      const { data: history, error } = await supabase
        .from('client_training_history')
        .select('*')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        clientId,
        count: history?.length || 0,
        workouts:
          history?.map((w) => ({
            id: w.id,
            workoutId: w.workout_id,
            workoutName: w.workout_name,
            date: w.date,
            status: w.status,
            completedAt: w.completed_at,
          })) || [],
      });
    },
    {
      name: 'get_client_workouts',
      description:
        "Get a client's recent workout history including completion status. Useful for analyzing training consistency.",
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        limit: z.number().optional().describe('Max number of workouts to return (default 20)'),
      }),
    }
  );

export const createGetClientMetricsTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId }) => {
      const supabase = getSupabaseClient();

      // Get metric assignments
      const { data: assignments } = await supabase
        .from('client_metric_assignments')
        .select('*, coach_metrics(*)')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId);

      // Get metric entries
      const { data: entries } = await supabase
        .from('client_metric_entries')
        .select('*')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(50);

      return JSON.stringify({
        clientId,
        assignments:
          assignments?.map((a) => ({
            metricId: a.metric_id,
            metricName: a.coach_metrics?.name,
            metricType: a.coach_metrics?.metric_type,
          })) || [],
        recentEntries:
          entries?.map((e) => ({
            metricId: e.metric_id,
            value: e.value,
            date: e.date,
          })) || [],
      });
    },
    {
      name: 'get_client_metrics',
      description:
        "Get a client's tracked metrics and recent entries. Useful for progress analysis.",
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
      }),
    }
  );

export const createGetClientCheckinsTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, limit = 10 }) => {
      const supabase = getSupabaseClient();

      const { data: checkins, error } = await supabase
        .from('client_checkin_logs')
        .select('*, coach_checkins(name, questions)')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        clientId,
        count: checkins?.length || 0,
        checkins:
          checkins?.map((c) => ({
            id: c.id,
            checkinName: c.coach_checkins?.name,
            submittedAt: c.submitted_at,
            responses: c.responses,
          })) || [],
      });
    },
    {
      name: 'get_client_checkins',
      description:
        "Get a client's recent check-in submissions with responses. Useful for understanding client feedback.",
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        limit: z.number().optional().describe('Max number of check-ins to return (default 10)'),
      }),
    }
  );

export const createGetInactiveClientsTool = (ctx: ToolContext) =>
  tool(
    async ({ days = 7 }) => {
      const supabase = getSupabaseClient();

      // Get all active clients
      const { data: clients } = await supabase
        .from('coach_clients_view')
        .select('client_id, full_name, email')
        .eq('coach_id', ctx.coachId)
        .eq('is_active', true)
        .eq('is_archived', false);

      if (!clients || clients.length === 0) {
        return JSON.stringify({ inactiveClients: [], message: 'No active clients found' });
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      // Get recent training for each client
      const inactiveClients = [];
      for (const client of clients) {
        const { data: recentTraining } = await supabase
          .from('client_training_history')
          .select('date')
          .eq('coach_id', ctx.coachId)
          .eq('client_id', client.client_id)
          .gte('date', cutoffStr)
          .limit(1);

        if (!recentTraining || recentTraining.length === 0) {
          inactiveClients.push({
            id: client.client_id,
            name: client.full_name,
            email: client.email,
          });
        }
      }

      return JSON.stringify({
        days,
        cutoffDate: cutoffStr,
        inactiveCount: inactiveClients.length,
        totalClients: clients.length,
        inactiveClients,
      });
    },
    {
      name: 'get_inactive_clients',
      description:
        'Find clients who have not trained in the specified number of days. Useful for identifying clients who need outreach.',
      schema: z.object({
        days: z.number().optional().describe('Number of days to check for inactivity (default 7)'),
      }),
    }
  );

// ============================================================================
// EXERCISE TOOLS
// ============================================================================

export const createSearchExercisesTool = (ctx: ToolContext) =>
  tool(
    async ({ query, muscleGroup, equipment, limit = 20 }) => {
      const supabase = getSupabaseClient();

      let dbQuery = supabase.from('exercises').select('id, name, muscle_group, equipment, difficulty');

      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }
      if (muscleGroup) {
        dbQuery = dbQuery.ilike('muscle_group', `%${muscleGroup}%`);
      }
      if (equipment) {
        dbQuery = dbQuery.ilike('equipment', `%${equipment}%`);
      }

      const { data: exercises, error } = await dbQuery.limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: exercises?.length || 0,
        exercises:
          exercises?.map((e) => ({
            id: e.id,
            name: e.name,
            muscleGroup: e.muscle_group,
            equipment: e.equipment,
            difficulty: e.difficulty,
          })) || [],
      });
    },
    {
      name: 'search_exercises',
      description:
        'Search the exercise library by name, muscle group, or equipment. Use to find exercises for workout creation.',
      schema: z.object({
        query: z.string().optional().describe('Search term for exercise name'),
        muscleGroup: z
          .string()
          .optional()
          .describe('Filter by muscle group (e.g., chest, back, legs)'),
        equipment: z
          .string()
          .optional()
          .describe('Filter by equipment (e.g., barbell, dumbbell, cable)'),
        limit: z.number().optional().describe('Max results to return (default 20)'),
      }),
    }
  );

// ============================================================================
// COACH TRAINING TOOLS
// ============================================================================

export const createGetCoachWorkoutsTool = (ctx: ToolContext) =>
  tool(
    async ({ limit = 50, filter }) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from('coach_workouts')
        .select('id, name, description, type, difficulty, total_exercises, created_at')
        .eq('coach_id', ctx.coachId)
        .order('created_at', { ascending: false });

      if (filter) {
        query = query.ilike('name', `%${filter}%`);
      }

      const { data: workouts, error } = await query.limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: workouts?.length || 0,
        workouts:
          workouts?.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            type: w.type,
            difficulty: w.difficulty,
            totalExercises: w.total_exercises,
            createdAt: w.created_at,
          })) || [],
      });
    },
    {
      name: 'get_coach_workouts',
      description:
        "Get the coach's workout templates from their library. Use to reference existing workouts.",
      schema: z.object({
        limit: z.number().optional().describe('Max workouts to return (default 50)'),
        filter: z.string().optional().describe('Filter by workout name'),
      }),
    }
  );

export const createGetCoachProgramsTool = (ctx: ToolContext) =>
  tool(
    async ({ limit = 50 }) => {
      const supabase = getSupabaseClient();

      const { data: programs, error } = await supabase
        .from('coach_programs')
        .select('id, name, description, duration_weeks, created_at')
        .eq('coach_id', ctx.coachId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: programs?.length || 0,
        programs:
          programs?.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            durationWeeks: p.duration_weeks,
            createdAt: p.created_at,
          })) || [],
      });
    },
    {
      name: 'get_coach_programs',
      description: "Get the coach's training programs from their library.",
      schema: z.object({
        limit: z.number().optional().describe('Max programs to return (default 50)'),
      }),
    }
  );

export const createGetCoachSectionsTool = (ctx: ToolContext) =>
  tool(
    async ({ limit = 50 }) => {
      const supabase = getSupabaseClient();

      const { data: sections, error } = await supabase
        .from('coach_sections')
        .select('id, name, description, type, created_at')
        .eq('coach_id', ctx.coachId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: sections?.length || 0,
        sections:
          sections?.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            type: s.type,
            createdAt: s.created_at,
          })) || [],
      });
    },
    {
      name: 'get_coach_sections',
      description: "Get the coach's reusable section templates from their library.",
      schema: z.object({
        limit: z.number().optional().describe('Max sections to return (default 50)'),
      }),
    }
  );

// ============================================================================
// WORKOUT CREATION TOOLS
// ============================================================================

const workoutExerciseSchema = z.object({
  name: z.string().describe('Exercise name'),
  sets: z.number().default(3).describe('Number of sets'),
  reps: z.string().describe('Rep target (e.g., "8", "8-12", "AMRAP")'),
  weight: z.string().optional().describe('Weight prescription (e.g., "80kg", "RPE 8")'),
  rest: z.number().optional().describe('Rest in seconds between sets'),
  notes: z.string().optional().describe('Exercise-specific notes or cues'),
});

const workoutSectionSchema = z.object({
  name: z.string().describe('Section name (e.g., "Warm-up", "Main Lifts", "Accessories")'),
  type: z.enum(['regular', 'superset', 'circuit', 'amrap']).default('regular'),
  exercises: z.array(workoutExerciseSchema).describe('Exercises in this section'),
});

export const createCreateWorkoutTool = (ctx: ToolContext) =>
  tool(
    async (input) => {
      // Validate the workout structure
      const { name, description, type, difficulty, sections } = input;

      if (!name || !sections || sections.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Workout must have a name and at least one section with exercises',
        });
      }

      // Validate each section has exercises
      for (const section of sections) {
        if (!section.exercises || section.exercises.length === 0) {
          return JSON.stringify({
            success: false,
            error: `Section "${section.name}" must have at least one exercise`,
          });
        }
      }

      // Count total exercises
      const totalExercises = sections.reduce(
        (sum: number, section: any) => sum + section.exercises.length,
        0
      );

      // Return the validated payload for the frontend to save
      return JSON.stringify({
        success: true,
        action: 'create_workout',
        payload: {
          name,
          description: description || '',
          type: type || 'strength',
          difficulty: difficulty || 'intermediate',
          totalExercises,
          sections: sections.map((section: any) => ({
            name: section.name,
            type: section.type || 'regular',
            exercises: section.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets || 3,
              reps: ex.reps || '10',
              weight: ex.weight || null,
              rest: ex.rest || 90,
              notes: ex.notes || null,
            })),
          })),
        },
        message: `Workout "${name}" ready to save with ${totalExercises} exercises in ${sections.length} section(s).`,
      });
    },
    {
      name: 'create_workout',
      description:
        'Create a new workout template. Returns a payload that the user must confirm before saving to their library.',
      schema: z.object({
        name: z.string().describe('Workout name'),
        description: z.string().optional().describe('Workout description'),
        type: z
          .enum(['strength', 'hypertrophy', 'conditioning', 'cardio', 'mobility'])
          .optional()
          .describe('Workout type'),
        difficulty: z
          .enum(['beginner', 'intermediate', 'advanced'])
          .optional()
          .describe('Difficulty level'),
        sections: z.array(workoutSectionSchema).describe('Workout sections with exercises'),
      }),
    }
  );

export const createCreateSectionTool = (ctx: ToolContext) =>
  tool(
    async (input) => {
      const { name, description, type, exercises } = input;

      if (!name || !exercises || exercises.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Section must have a name and at least one exercise',
        });
      }

      return JSON.stringify({
        success: true,
        action: 'create_section',
        payload: {
          name,
          description: description || '',
          type: type || 'regular',
          exercises: exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || '10',
            weight: ex.weight || null,
            rest: ex.rest || 90,
            notes: ex.notes || null,
          })),
        },
        message: `Section "${name}" ready to save with ${exercises.length} exercise(s).`,
      });
    },
    {
      name: 'create_section',
      description:
        'Create a reusable section template. Returns a payload that the user must confirm before saving.',
      schema: z.object({
        name: z.string().describe('Section name'),
        description: z.string().optional().describe('Section description'),
        type: z
          .enum(['regular', 'superset', 'circuit', 'amrap'])
          .optional()
          .describe('Section type'),
        exercises: z.array(workoutExerciseSchema).describe('Exercises in the section'),
      }),
    }
  );

// ============================================================================
// ANALYTICS TOOLS
// ============================================================================

export const createAnalyzeClientProgressTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId }) => {
      const supabase = getSupabaseClient();

      // Get training history stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentWorkouts } = await supabase
        .from('client_training_history')
        .select('status, date, workout_name')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const completed = recentWorkouts?.filter((w) => w.status === 'completed').length || 0;
      const total = recentWorkouts?.length || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Get recent metrics
      const { data: metrics } = await supabase
        .from('client_metric_entries')
        .select('*, coach_metrics(name)')
        .eq('coach_id', ctx.coachId)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(20);

      // Get client goals
      const { data: goals } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('coach_id', ctx.coachId);

      return JSON.stringify({
        clientId,
        period: 'last 30 days',
        trainingStats: {
          totalWorkouts: total,
          completedWorkouts: completed,
          completionRate: `${completionRate}%`,
        },
        recentMetrics:
          metrics?.slice(0, 10).map((m) => ({
            metric: m.coach_metrics?.name,
            value: m.value,
            date: m.date,
          })) || [],
        goals: goals || [],
        summary:
          total > 0
            ? `Client completed ${completed} of ${total} workouts (${completionRate}% completion rate) in the last 30 days.`
            : 'No training data available for the last 30 days.',
      });
    },
    {
      name: 'analyze_client_progress',
      description:
        "Analyze a client's overall progress including workout completion, metrics trends, and goal progress.",
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID) to analyze'),
      }),
    }
  );

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export const createAllTools = (ctx: ToolContext) => [
  // Client tools
  createSearchClientsTool(ctx),
  createGetClientProfileTool(ctx),
  createGetClientWorkoutsTool(ctx),
  createGetClientMetricsTool(ctx),
  createGetClientCheckinsTool(ctx),
  createGetInactiveClientsTool(ctx),

  // Exercise tools
  createSearchExercisesTool(ctx),

  // Coach training tools
  createGetCoachWorkoutsTool(ctx),
  createGetCoachProgramsTool(ctx),
  createGetCoachSectionsTool(ctx),

  // Creation tools
  createCreateWorkoutTool(ctx),
  createCreateSectionTool(ctx),

  // Analytics tools
  createAnalyzeClientProgressTool(ctx),
];
