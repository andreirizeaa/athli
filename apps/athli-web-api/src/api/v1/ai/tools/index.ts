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
  startupContext?: string;
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

export const createListAllClientsTool = (ctx: ToolContext) =>
  tool(
    async () => {
      const supabase = getSupabaseClient();

      const { data: clients, error } = await supabase
        .from('coach_clients_view')
        .select('client_id, full_name, email, category, status, created_at')
        .eq('coach_id', ctx.coachId)
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('full_name', { ascending: true });

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: clients?.length || 0,
        clients:
          clients?.map((c) => ({
            id: c.client_id,
            name: c.full_name,
            email: c.email,
            category: c.category,
            status: c.status,
            joinedAt: c.created_at,
          })) || [],
      });
    },
    {
      name: 'list_all_clients',
      description:
        "List all of the coach's active clients. Use this to see all clients or when the user asks 'who are my clients' or 'show me all clients'.",
      schema: z.object({}),
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
// CHECKIN & METRICS TOOLS
// ============================================================================

export const createListAllCheckinTemplatesTool = (ctx: ToolContext) =>
  tool(
    async () => {
      const supabase = getSupabaseClient();

      const { data: checkins, error } = await supabase
        .from('coach_checkins')
        .select('id, name, description, questions, is_active, created_at')
        .eq('coach_id', ctx.coachId)
        .order('name', { ascending: true });

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: checkins?.length || 0,
        checkinTemplates:
          checkins?.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            questionCount: Array.isArray(c.questions) ? c.questions.length : 0,
            isActive: c.is_active,
            createdAt: c.created_at,
          })) || [],
      });
    },
    {
      name: 'list_all_checkin_templates',
      description:
        "List all of the coach's check-in form templates. Use this to see what check-in forms are available.",
      schema: z.object({}),
    }
  );

export const createListAllMetricsTool = (ctx: ToolContext) =>
  tool(
    async () => {
      const supabase = getSupabaseClient();

      const { data: metrics, error } = await supabase
        .from('coach_metrics')
        .select('id, name, metric_type, unit, is_active, created_at')
        .eq('coach_id', ctx.coachId)
        .order('name', { ascending: true });

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      return JSON.stringify({
        count: metrics?.length || 0,
        metrics:
          metrics?.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.metric_type,
            unit: m.unit,
            isActive: m.is_active,
            createdAt: m.created_at,
          })) || [],
      });
    },
    {
      name: 'list_all_metrics',
      description:
        "List all of the coach's tracked metrics (e.g., weight, body fat, measurements). Use this to see what metrics are being tracked.",
      schema: z.object({}),
    }
  );

// ============================================================================
// EXERCISE CATALOG TOOL
// ============================================================================

// Valid filter values for get_exercise_catalog
// These match the actual values in musclewiki_filter_cache table
const VALID_MUSCLES = [
  'Chest', 'Lats', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abdominals',
  'Lower back', 'Traps', 'Obliques'
] as const;

const VALID_CATEGORIES = [
  'Band', 'Barbell', 'Bodyweight', 'Bosu-Ball', 'Cables', 'Cardio',
  'Dumbbells', 'Kettlebells', 'Machine', 'Medicine-Ball', 'Plate',
  'Recovery', 'Smith-Machine', 'Stretches', 'TRX', 'Vitruvian', 'Yoga'
] as const;

const VALID_DIFFICULTIES = ['Novice', 'Intermediate', 'Advanced'] as const;
const VALID_FORCES = ['Push', 'Pull', 'Static'] as const;
const VALID_MECHANICS = ['Compound', 'Isolation'] as const;

export const createGetExerciseCatalogTool = (ctx: ToolContext) =>
  tool(
    async ({ muscle, category, difficulty, force, mechanic }) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from('musclewiki_exercise_cache')
        .select('musclewiki_id, name, target_muscles, category, difficulty, force, mechanic');

      // Apply filters (use ONE at a time for best results)
      if (muscle) {
        // Use filter with 'cs' (contains) operator for JSONB arrays
        query = query.filter('target_muscles', 'cs', JSON.stringify([muscle]));
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      if (force) {
        query = query.eq('force', force);
      }
      if (mechanic) {
        query = query.eq('mechanic', mechanic);
      }

      const { data: exercises, error } = await query.order('name', { ascending: true });

      if (error) {
        return JSON.stringify({ error: error.message });
      }

      if (!exercises || exercises.length === 0) {
        return JSON.stringify({
          success: false,
          count: 0,
          exercises: [],
          message: 'No exercises found matching the filters. Try using fewer filters or different values.',
        });
      }

      // Format as a table for easy AI parsing
      const header = 'ID   | Name                                    | Target Muscles              | Equipment';
      const separator = '-----|----------------------------------------|-----------------------------|-----------';
      const rows = exercises.map((e) => {
        const id = String(e.musclewiki_id).padEnd(4);
        const name = (e.name || '').substring(0, 40).padEnd(40);
        const muscles = (Array.isArray(e.target_muscles) ? e.target_muscles.join(', ') : '').substring(0, 28).padEnd(28);
        const equipment = e.category || '';
        return `${id} | ${name} | ${muscles} | ${equipment}`;
      });

      const table = [header, separator, ...rows].join('\n');

      return JSON.stringify({
        success: true,
        count: exercises.length,
        catalog: table,
        message: `Found ${exercises.length} exercises. Use the ID (first column) as prescribedExerciseId when creating workouts.`,
      });
    },
    {
      name: 'get_exercise_catalog',
      description:
        'Get the exercise catalog with MuscleWiki IDs. Call this BEFORE create_workout or create_section to get valid exercise IDs. Use ONE filter at a time for best results.',
      schema: z.object({
        muscle: z.enum(VALID_MUSCLES).optional()
          .describe("Filter by target muscle (e.g., 'Chest', 'Back', 'Lats'). Use ONE filter at a time."),
        category: z.enum(VALID_CATEGORIES).optional()
          .describe("Filter by equipment (e.g., 'Barbell', 'Dumbbells', 'Machine'). Use ONE filter at a time."),
        difficulty: z.enum(VALID_DIFFICULTIES).optional()
          .describe("Filter by difficulty (Novice, Intermediate, Advanced). Use ONE filter at a time."),
        force: z.enum(VALID_FORCES).optional()
          .describe("Filter by force type (Push, Pull, Static). Use ONE filter at a time."),
        mechanic: z.enum(VALID_MECHANICS).optional()
          .describe("Filter by mechanic (Compound, Isolation). Use ONE filter at a time."),
      }),
    }
  );

// Helper function to validate exercise IDs exist in database
async function validateExerciseIds(exerciseIds: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
  const supabase = getSupabaseClient();

  const { data: exercises, error } = await supabase
    .from('musclewiki_exercise_cache')
    .select('musclewiki_id')
    .in('musclewiki_id', exerciseIds);

  if (error) {
    return { valid: false, invalidIds: exerciseIds };
  }

  const foundIds = new Set(exercises?.map(e => String(e.musclewiki_id)) || []);
  const invalidIds = exerciseIds.filter(id => !foundIds.has(id));

  return { valid: invalidIds.length === 0, invalidIds };
}

// ============================================================================
// WORKOUT CREATION TOOLS
// ============================================================================

const workoutExerciseSchema = z.object({
  prescribedExerciseId: z.string().describe('MuscleWiki exercise ID (required). Get this from get_exercise_catalog.'),
  name: z.string().describe('Exercise name (for display)'),
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

      // Collect all exercises and validate prescribedExerciseId
      const allExercises: { name: string; prescribedExerciseId?: string }[] = [];
      const errors: string[] = [];

      for (const section of sections) {
        for (const ex of section.exercises) {
          allExercises.push(ex);
          if (!ex.prescribedExerciseId) {
            errors.push(`"${ex.name}" is missing prescribedExerciseId. Call get_exercise_catalog first.`);
          }
        }
      }

      if (errors.length > 0) {
        return JSON.stringify({
          success: false,
          error: 'Invalid exercise IDs:\n' + errors.join('\n') + '\n\nCall get_exercise_catalog to get valid IDs.',
        });
      }

      // Validate that all exercise IDs exist in the database
      const exerciseIds = allExercises.map(ex => ex.prescribedExerciseId!);
      const { valid, invalidIds } = await validateExerciseIds(exerciseIds);

      if (!valid) {
        const invalidErrors = invalidIds.map(id => {
          const ex = allExercises.find(e => e.prescribedExerciseId === id);
          return `ID "${id}" for "${ex?.name || 'Unknown'}" not found. Check the exercise catalog for correct IDs.`;
        });
        return JSON.stringify({
          success: false,
          error: 'Invalid exercise IDs:\n' + invalidErrors.join('\n') + '\n\nCall get_exercise_catalog to get valid IDs.',
        });
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
              prescribedExerciseId: ex.prescribedExerciseId,
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
        'Create a new workout template. Requires prescribedExerciseId for each exercise (get IDs from get_exercise_catalog first). Returns a payload that the user must confirm before saving.',
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

      // Validate prescribedExerciseId for each exercise
      const errors: string[] = [];
      for (const ex of exercises) {
        if (!ex.prescribedExerciseId) {
          errors.push(`"${ex.name}" is missing prescribedExerciseId. Call get_exercise_catalog first.`);
        }
      }

      if (errors.length > 0) {
        return JSON.stringify({
          success: false,
          error: 'Invalid exercise IDs:\n' + errors.join('\n') + '\n\nCall get_exercise_catalog to get valid IDs.',
        });
      }

      // Validate that all exercise IDs exist in the database
      const exerciseIds = exercises.map((ex: any) => ex.prescribedExerciseId);
      const { valid, invalidIds } = await validateExerciseIds(exerciseIds);

      if (!valid) {
        const invalidErrors = invalidIds.map(id => {
          const ex = exercises.find((e: any) => e.prescribedExerciseId === id);
          return `ID "${id}" for "${ex?.name || 'Unknown'}" not found. Check the exercise catalog for correct IDs.`;
        });
        return JSON.stringify({
          success: false,
          error: 'Invalid exercise IDs:\n' + invalidErrors.join('\n') + '\n\nCall get_exercise_catalog to get valid IDs.',
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
            prescribedExerciseId: ex.prescribedExerciseId,
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
        'Create a reusable section template. Requires prescribedExerciseId for each exercise (get IDs from get_exercise_catalog first). Returns a payload that the user must confirm before saving.',
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
// ASSIGNMENT TOOLS
// ============================================================================

export const createAssignWorkoutTool = (ctx: ToolContext) =>
  tool(
    async (input) => {
      const { clientId, clientName, workoutId, workoutName, date, time, isRecurring, recurrencePattern, notes } = input;

      // Validate required fields
      if (!clientId || !workoutId || !date) {
        return JSON.stringify({
          success: false,
          error: 'clientId, workoutId, and date are required to assign a workout',
        });
      }

      // Format the assignment for display
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const scheduleType = isRecurring ? `recurring (${recurrencePattern || 'weekly'})` : 'one-off';

      return JSON.stringify({
        success: true,
        action: 'assign_workout',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          workoutId,
          workoutName: workoutName || 'Workout',
          date,
          time: time || null,
          isRecurring: isRecurring || false,
          recurrencePattern: recurrencePattern || null,
          notes: notes || null,
        },
        message: `Ready to assign "${workoutName || 'Workout'}" to ${clientName || 'client'} on ${formattedDate}${time ? ` at ${time}` : ''} (${scheduleType}).${notes ? ` Note: "${notes}"` : ''}`,
      });
    },
    {
      name: 'assign_workout',
      description:
        'Assign a workout to a client for a specific date. Returns a payload that the user must confirm before the assignment is saved. ALWAYS use this tool when user asks to assign, schedule, or give a workout to a client.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID) to assign the workout to'),
        clientName: z.string().optional().describe('The client name for display'),
        workoutId: z.string().describe('The workout ID (UUID) to assign'),
        workoutName: z.string().optional().describe('The workout name for display'),
        date: z.string().describe('The date to assign the workout (ISO format, e.g., 2026-02-03)'),
        time: z.string().optional().describe('Optional time for the workout (e.g., "13:00" or "1:00 PM")'),
        isRecurring: z.boolean().optional().describe('Whether this is a recurring assignment'),
        recurrencePattern: z.string().optional().describe('Recurrence pattern if recurring (e.g., "weekly", "every monday")'),
        notes: z.string().optional().describe('Optional notes for the client about this workout'),
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
// CLIENT MODIFICATION TOOLS (require confirmation)
// ============================================================================

export const createAssignMetricToClientTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, clientName, metricId, metricName }) => {
      // Validate the metric exists
      const supabase = getSupabaseClient();
      const { data: metric, error } = await supabase
        .from('coach_metrics')
        .select('id, name, metric_type, unit')
        .eq('coach_id', ctx.coachId)
        .eq('id', metricId)
        .single();

      if (error || !metric) {
        return JSON.stringify({
          success: false,
          error: `Metric with ID "${metricId}" not found. Use list_all_metrics to see available metrics.`,
        });
      }

      return JSON.stringify({
        success: true,
        action: 'assign_metric_to_client',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          metricId,
          metricName: metric.name,
          metricType: metric.metric_type,
          metricUnit: metric.unit,
        },
        message: `Ready to assign "${metric.name}" metric to ${clientName || 'client'}.`,
      });
    },
    {
      name: 'assign_metric_to_client',
      description:
        'Assign a tracked metric to a client so they can log it. Returns a payload that the user must confirm. Use list_all_metrics first to get available metric IDs.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        clientName: z.string().optional().describe('Client name for display'),
        metricId: z.string().describe('The metric ID (UUID) to assign'),
        metricName: z.string().optional().describe('Metric name for display'),
      }),
    }
  );

export const createAddClientGoalTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, clientName, goalType, targetValue, targetDate, description }) => {
      // If no target date provided, suggest a date 6 months from now
      let suggestedDate = targetDate;
      if (!suggestedDate) {
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        suggestedDate = sixMonthsFromNow.toISOString().split('T')[0];
      }

      return JSON.stringify({
        success: true,
        action: 'add_client_goal',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          goalType,
          targetValue: targetValue || null,
          targetDate: suggestedDate,
          description: description || '',
        },
        message: `Ready to add "${goalType}" goal for ${clientName || 'client'}${targetValue ? ` (target: ${targetValue})` : ''}${suggestedDate ? ` by ${suggestedDate}` : ''}.`,
      });
    },
    {
      name: 'add_client_goal',
      description:
        'Add a new goal for a client. Returns a payload that the user must confirm before saving. If no target date is specified, defaults to 6 months from today.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        clientName: z.string().optional().describe('Client name for display'),
        goalType: z.string().describe('Type of goal (e.g., "Weight Loss", "Strength", "Muscle Gain", "Endurance")'),
        targetValue: z.string().optional().describe('Target value (e.g., "75kg", "100kg squat", "Run 5k")'),
        targetDate: z.string().optional().describe('Target date (ISO format, e.g., 2026-08-02). If not provided, defaults to 6 months from today.'),
        description: z.string().optional().describe('Additional details about the goal'),
      }),
    }
  );

export const createAddClientInjuryTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, clientName, injuryType, bodyPart, severity, notes, dateOccurred }) => {
      // If no date provided, use today as default
      const injuryDate = dateOccurred || new Date().toISOString().split('T')[0];

      return JSON.stringify({
        success: true,
        action: 'add_client_injury',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          injuryType,
          bodyPart,
          severity: severity || 'moderate',
          notes: notes || '',
          dateOccurred: injuryDate,
        },
        message: `Ready to add "${injuryType}" injury (${bodyPart}) for ${clientName || 'client'}, occurred on ${injuryDate}.`,
      });
    },
    {
      name: 'add_client_injury',
      description:
        'Record an injury for a client. Returns a payload that the user must confirm before saving. If no date is specified, defaults to today.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        clientName: z.string().optional().describe('Client name for display'),
        injuryType: z.string().describe('Type of injury (e.g., "Strain", "Sprain", "Tendinitis", "Pain")'),
        bodyPart: z.string().describe('Affected body part (e.g., "Lower Back", "Right Knee", "Left Shoulder")'),
        severity: z.enum(['mild', 'moderate', 'severe']).optional().describe('Injury severity'),
        notes: z.string().optional().describe('Additional notes about the injury, limitations, or rehab'),
        dateOccurred: z.string().optional().describe('When the injury occurred (ISO format, e.g., 2026-01-15). If not provided, defaults to today.'),
      }),
    }
  );

export const createDraftMessageTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, clientName, subject, message, messageType }) => {
      return JSON.stringify({
        success: true,
        action: 'draft_message',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          subject: subject || '',
          message,
          messageType: messageType || 'general',
        },
        message: `Message drafted for ${clientName || 'client'}. You can copy and send it via your preferred channel.`,
      });
    },
    {
      name: 'draft_message_for_client',
      description:
        'Draft a message for a client. The coach can then copy and send it via their preferred messaging channel (email, WhatsApp, etc.).',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        clientName: z.string().optional().describe('Client name for display'),
        subject: z.string().optional().describe('Message subject (for email)'),
        message: z.string().describe('The message content'),
        messageType: z.enum(['check_in', 'motivation', 'reminder', 'feedback', 'general']).optional()
          .describe('Type of message'),
      }),
    }
  );

export const createUpdateClientProfileTool = (ctx: ToolContext) =>
  tool(
    async ({ clientId, clientName, updates }) => {
      const updatesList = Object.entries(updates)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return JSON.stringify({
        success: true,
        action: 'update_client_profile',
        payload: {
          clientId,
          clientName: clientName || 'Client',
          updates,
        },
        message: `Ready to update ${clientName || 'client'}'s profile: ${updatesList}`,
      });
    },
    {
      name: 'update_client_profile',
      description:
        'Update a client\'s profile information. Returns a payload that the user must confirm before saving. Note: Only category and notes can be updated via AI.',
      schema: z.object({
        clientId: z.string().describe('The client ID (UUID)'),
        clientName: z.string().optional().describe('Client name for display'),
        updates: z.object({
          category: z.enum(['online', 'in-person', 'hybrid']).optional()
            .describe('Client coaching type: online (remote coaching), in-person (face-to-face), or hybrid (mix of both)'),
          notes: z.string().optional().describe('Coach notes about the client'),
        }).describe('Fields to update'),
      }),
    }
  );

export const createCreateCheckinTemplateTool = (ctx: ToolContext) =>
  tool(
    async ({ name, description, questions }) => {
      if (!questions || questions.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Check-in template must have at least one question',
        });
      }

      return JSON.stringify({
        success: true,
        action: 'create_checkin_template',
        payload: {
          name,
          description: description || '',
          questions: questions.map((q: any, index: number) => ({
            id: `q${index + 1}`,
            ...q,
          })),
        },
        message: `Ready to create "${name}" check-in template with ${questions.length} question(s).`,
      });
    },
    {
      name: 'create_checkin_template',
      description:
        'Create a new check-in form template. Returns a payload that the user must confirm before saving.',
      schema: z.object({
        name: z.string().describe('Check-in template name'),
        description: z.string().optional().describe('Description of the check-in'),
        questions: z.array(z.object({
          question: z.string().describe('The question text'),
          type: z.enum(['text', 'number', 'rating', 'yesNo', 'multipleChoice', 'scale', 'date']).describe('Question type: text (free text), number (numeric input), rating (1-5 stars), yesNo (yes/no toggle), multipleChoice (select from options), scale (custom range like 1-10), date (date picker)'),
          required: z.boolean().optional().describe('Whether the question is required'),
          options: z.array(z.string()).optional().describe('Options for multipleChoice questions'),
          scaleFrom: z.string().optional().describe('Start of scale range for scale type (e.g., "1" or "Low")'),
          scaleTo: z.string().optional().describe('End of scale range for scale type (e.g., "10" or "High")'),
        })).describe('List of questions'),
      }),
    }
  );

export const createCreateMetricTool = (ctx: ToolContext) =>
  tool(
    async ({ name, metricType, unit, description }) => {
      return JSON.stringify({
        success: true,
        action: 'create_metric',
        payload: {
          name,
          metricType,
          unit: unit || '',
          description: description || '',
        },
        message: `Ready to create "${name}" metric (${metricType}${unit ? `, unit: ${unit}` : ''}).`,
      });
    },
    {
      name: 'create_metric',
      description:
        'Create a new trackable metric. Returns a payload that the user must confirm before saving.',
      schema: z.object({
        name: z.string().describe('Metric name (e.g., "Body Weight", "Waist Circumference", "1RM Squat")'),
        metricType: z.enum(['weight', 'measurement', 'percentage', 'count', 'time', 'custom'])
          .describe('Type of metric'),
        unit: z.string().optional().describe('Unit of measurement (e.g., "kg", "cm", "lbs", "minutes")'),
        description: z.string().optional().describe('Description of what this metric tracks'),
      }),
    }
  );

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export const createAllTools = (ctx: ToolContext) => [
  // Client tools
  createListAllClientsTool(ctx),
  createSearchClientsTool(ctx),
  createGetClientProfileTool(ctx),
  createGetClientWorkoutsTool(ctx),
  createGetClientMetricsTool(ctx),
  createGetClientCheckinsTool(ctx),
  createGetInactiveClientsTool(ctx),

  // Exercise tools
  createSearchExercisesTool(ctx),
  createGetExerciseCatalogTool(ctx),

  // Coach training tools
  createGetCoachWorkoutsTool(ctx),
  createGetCoachProgramsTool(ctx),
  createGetCoachSectionsTool(ctx),

  // Checkin & Metrics tools
  createListAllCheckinTemplatesTool(ctx),
  createListAllMetricsTool(ctx),

  // Creation tools
  createCreateWorkoutTool(ctx),
  createCreateSectionTool(ctx),

  // Assignment tools
  createAssignWorkoutTool(ctx),

  // Client modification tools (require confirmation)
  createAssignMetricToClientTool(ctx),
  createAddClientGoalTool(ctx),
  createAddClientInjuryTool(ctx),
  createDraftMessageTool(ctx),
  createUpdateClientProfileTool(ctx),
  createCreateCheckinTemplateTool(ctx),
  createCreateMetricTool(ctx),

  // Analytics tools
  createAnalyzeClientProgressTool(ctx),
];
