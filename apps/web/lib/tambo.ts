/**
 * Tambo Component Registrations
 *
 * Registers existing Athli UI components so Tambo's agent can render
 * them in response to user messages instead of returning raw JSON.
 *
 * Requires: @tambo-ai/react, zod
 * Set NEXT_PUBLIC_TAMBO_API_KEY in your env.
 */

import { z } from 'zod';
import type { TamboComponent } from '@tambo-ai/react';
import { ActionCard } from '@/app/(app)/assistant/components/action-card';

// ── Schemas ────────────────────────────────────────────────────────

const workoutExerciseSchema = z.object({
  name: z.string().describe('Exercise name'),
  sets: z.number().describe('Number of sets'),
  reps: z.string().describe('Rep range e.g. "8-12"'),
  rest: z.string().optional().describe('Rest period e.g. "60s"'),
  notes: z.string().optional().describe('Additional notes'),
});

const workoutSchema = z.object({
  actionType: z.literal('create_workout'),
  payload: z.object({
    name: z.string().describe('Workout name'),
    description: z.string().optional().describe('Workout description'),
    exercises: z.array(workoutExerciseSchema).describe('List of exercises'),
  }),
});

const assignWorkoutSchema = z.object({
  actionType: z.literal('assign_workout'),
  payload: z.object({
    workoutId: z.string().describe('Workout ID to assign'),
    clientId: z.string().describe('Client ID'),
    clientName: z.string().describe('Client display name'),
    date: z.string().describe('Assignment date ISO string'),
  }),
});

const draftMessageSchema = z.object({
  actionType: z.literal('draft_message'),
  payload: z.object({
    clientId: z.string().describe('Client ID'),
    clientName: z.string().describe('Client display name'),
    message: z.string().describe('Message content'),
  }),
});

const createMetricSchema = z.object({
  actionType: z.literal('create_metric'),
  payload: z.object({
    name: z.string().describe('Metric name'),
    metricType: z.string().describe('weight | measurement | percentage | count | time | custom'),
    unit: z.string().optional().describe('Unit of measurement'),
    description: z.string().optional().describe('Metric description'),
  }),
});

const createCheckinSchema = z.object({
  actionType: z.literal('create_checkin_template'),
  payload: z.object({
    name: z.string().describe('Check-in template name'),
    description: z.string().optional(),
    questions: z.array(z.object({
      question: z.string(),
      type: z.string().describe('text | number | rating | yesNo | multipleChoice | scale'),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional(),
    })).optional(),
  }),
});

// ── Component wrappers for Tambo ───────────────────────────────────

// Tambo needs plain components that accept flattened props.
// We wrap ActionCard to unpack the schema shape.
function TamboWorkoutCard(props: z.infer<typeof workoutSchema>) {
  return <ActionCard actionType={props.actionType} payload={props.payload} onConfirm={() => {}} />;
}

function TamboAssignWorkoutCard(props: z.infer<typeof assignWorkoutSchema>) {
  return <ActionCard actionType={props.actionType} payload={props.payload} onConfirm={() => {}} />;
}

function TamboDraftMessageCard(props: z.infer<typeof draftMessageSchema>) {
  return <ActionCard actionType={props.actionType} payload={props.payload} onConfirm={() => {}} />;
}

function TamboCreateMetricCard(props: z.infer<typeof createMetricSchema>) {
  return <ActionCard actionType={props.actionType} payload={props.payload} onConfirm={() => {}} />;
}

function TamboCreateCheckinCard(props: z.infer<typeof createCheckinSchema>) {
  return <ActionCard actionType={props.actionType} payload={props.payload} onConfirm={() => {}} />;
}

// ── Exported registrations ─────────────────────────────────────────

export const tamboComponents: TamboComponent[] = [
  {
    name: 'WorkoutCard',
    description: 'Displays a workout creation card with exercises. Use when the user asks to create a workout.',
    component: TamboWorkoutCard,
    propsSchema: workoutSchema,
  },
  {
    name: 'AssignWorkoutCard',
    description: 'Displays a workout assignment confirmation card. Use when assigning a workout to a client.',
    component: TamboAssignWorkoutCard,
    propsSchema: assignWorkoutSchema,
  },
  {
    name: 'DraftMessageCard',
    description: 'Displays a draft message card for sending a message to a client.',
    component: TamboDraftMessageCard,
    propsSchema: draftMessageSchema,
  },
  {
    name: 'CreateMetricCard',
    description: 'Displays a metric creation card. Use when the coach wants to create a new tracking metric.',
    component: TamboCreateMetricCard,
    propsSchema: createMetricSchema,
  },
  {
    name: 'CreateCheckinCard',
    description: 'Displays a check-in template creation card with questions.',
    component: TamboCreateCheckinCard,
    propsSchema: createCheckinSchema,
  },
];

export const tamboApiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY || '';
