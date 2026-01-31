/**
 * Seed Test Data Script for AI Assistant Testing
 *
 * SAFETY RULES:
 * 1. INSERT ONLY - Never DELETE, DROP, TRUNCATE, or UPDATE existing data
 * 2. All test data names must start with [TEST]
 * 3. Check before insert - don't duplicate data
 * 4. Use provided coach ID only
 * 5. No schema changes
 * 6. Idempotent - safe to run multiple times
 *
 * Run: npx ts-node apps/athli-web-api/scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Coach ID from PRD
const COACH_ID = '5f016d89-03e8-4ebd-885a-42e8ff3039db';

// Test data definitions
const TEST_CLIENTS = [
  {
    email: 'test.john.smith@athli-test.com',
    name: '[TEST] John Smith',
    goals: 'Build muscle, improve strength',
    category: 'online',
  },
  {
    email: 'test.sarah.johnson@athli-test.com',
    name: '[TEST] Sarah Johnson',
    goals: 'Weight loss, general fitness',
    category: 'online',
  },
  {
    email: 'test.mike.wilson@athli-test.com',
    name: '[TEST] Mike Wilson',
    goals: 'Powerlifting, strength training',
    category: 'in-person',
  },
];

const TEST_WORKOUTS = [
  {
    name: '[TEST] Push Day',
    description: 'Chest, shoulders, and triceps workout',
    type: 'strength',
    difficulty: 'intermediate',
    workout_data: {
      items: [
        {
          id: 'section-1',
          type: 'section',
          name: 'Main Lifts',
          sectionType: 'regular',
          exercises: [
            {
              id: 'ex-1',
              instanceId: 'inst-1',
              name: 'Bench Press',
              sets: [
                { id: 's1', reps: '8', weight: '80kg', completed: false },
                { id: 's2', reps: '8', weight: '80kg', completed: false },
                { id: 's3', reps: '8', weight: '80kg', completed: false },
                { id: 's4', reps: '8', weight: '80kg', completed: false },
              ],
              rest: 120,
            },
            {
              id: 'ex-2',
              instanceId: 'inst-2',
              name: 'Overhead Press',
              sets: [
                { id: 's5', reps: '8', weight: '40kg', completed: false },
                { id: 's6', reps: '8', weight: '40kg', completed: false },
                { id: 's7', reps: '8', weight: '40kg', completed: false },
              ],
              rest: 90,
            },
          ],
        },
        {
          id: 'section-2',
          type: 'section',
          name: 'Accessories',
          sectionType: 'regular',
          exercises: [
            {
              id: 'ex-3',
              instanceId: 'inst-3',
              name: 'Cable Flyes',
              sets: [
                { id: 's8', reps: '12', weight: '15kg', completed: false },
                { id: 's9', reps: '12', weight: '15kg', completed: false },
                { id: 's10', reps: '12', weight: '15kg', completed: false },
              ],
              rest: 60,
            },
          ],
        },
      ],
      pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: { rating: null, intensity: null, sessionComments: '' },
      completedSummary: { status: 'not_started', startedAt: null, completedAt: null },
    },
    total_exercises: 3,
  },
  {
    name: '[TEST] Pull Day',
    description: 'Back and biceps workout',
    type: 'strength',
    difficulty: 'intermediate',
    workout_data: {
      items: [
        {
          id: 'section-3',
          type: 'section',
          name: 'Main Lifts',
          sectionType: 'regular',
          exercises: [
            {
              id: 'ex-4',
              instanceId: 'inst-4',
              name: 'Deadlift',
              sets: [
                { id: 's11', reps: '5', weight: '120kg', completed: false },
                { id: 's12', reps: '5', weight: '120kg', completed: false },
                { id: 's13', reps: '5', weight: '120kg', completed: false },
              ],
              rest: 180,
            },
            {
              id: 'ex-5',
              instanceId: 'inst-5',
              name: 'Barbell Row',
              sets: [
                { id: 's14', reps: '8', weight: '60kg', completed: false },
                { id: 's15', reps: '8', weight: '60kg', completed: false },
                { id: 's16', reps: '8', weight: '60kg', completed: false },
              ],
              rest: 90,
            },
          ],
        },
      ],
      pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: { rating: null, intensity: null, sessionComments: '' },
      completedSummary: { status: 'not_started', startedAt: null, completedAt: null },
    },
    total_exercises: 2,
  },
  {
    name: '[TEST] Leg Day',
    description: 'Lower body workout',
    type: 'strength',
    difficulty: 'advanced',
    workout_data: {
      items: [
        {
          id: 'section-4',
          type: 'section',
          name: 'Main Lifts',
          sectionType: 'regular',
          exercises: [
            {
              id: 'ex-6',
              instanceId: 'inst-6',
              name: 'Squat',
              sets: [
                { id: 's17', reps: '5', weight: '100kg', completed: false },
                { id: 's18', reps: '5', weight: '100kg', completed: false },
                { id: 's19', reps: '5', weight: '100kg', completed: false },
                { id: 's20', reps: '5', weight: '100kg', completed: false },
              ],
              rest: 180,
            },
          ],
        },
      ],
      pre: { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: { rating: null, intensity: null, sessionComments: '' },
      completedSummary: { status: 'not_started', startedAt: null, completedAt: null },
    },
    total_exercises: 1,
  },
];

async function checkTestDataExists(table: string, nameField: string, prefix: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select(nameField)
    .ilike(nameField, `${prefix}%`)
    .limit(1);

  return !error && data && data.length > 0;
}

async function seedTestClients(): Promise<string[]> {
  console.log('Checking for existing test clients...');

  const clientIds: string[] = [];

  for (const clientData of TEST_CLIENTS) {
    // Check if this test client already exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', clientData.email)
      .single();

    if (existing) {
      console.log(`  - Client "${clientData.name}" already exists`);
      clientIds.push(existing.id);
      continue;
    }

    console.log(`  + Creating client "${clientData.name}"...`);

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: clientData.email,
      email_confirm: true,
      user_metadata: {
        name: clientData.name,
        user_type: 'client',
      },
    });

    if (createError) {
      // User might exist in auth but not profiles
      console.log(`    Warning: ${createError.message}`);
      continue;
    }

    const clientId = newUser.user.id;
    clientIds.push(clientId);

    // Ensure client_profiles entry
    await supabase.from('client_profiles').upsert(
      {
        client_id: clientId,
      },
      { onConflict: 'client_id' }
    );

    // Create coach-client assignment
    await supabase.from('coach_client_assignments').upsert(
      {
        coach_id: COACH_ID,
        client_id: clientId,
        category: clientData.category,
        status: 'active',
        is_active: true,
        is_archived: false,
      },
      { onConflict: 'coach_id, client_id' }
    );

    // Add client goals
    if (clientData.goals) {
      await supabase.from('client_goals').insert({
        client_id: clientId,
        coach_id: COACH_ID,
        goal_text: clientData.goals,
      });
    }

    console.log(`    Created client ${clientData.name} (${clientId})`);
  }

  return clientIds;
}

async function seedTestWorkouts(): Promise<void> {
  console.log('Checking for existing test workouts...');

  for (const workout of TEST_WORKOUTS) {
    // Check if workout already exists
    const { data: existing } = await supabase
      .from('coach_workouts')
      .select('id')
      .eq('coach_id', COACH_ID)
      .eq('name', workout.name)
      .single();

    if (existing) {
      console.log(`  - Workout "${workout.name}" already exists`);
      continue;
    }

    console.log(`  + Creating workout "${workout.name}"...`);

    const { error } = await supabase.from('coach_workouts').insert({
      coach_id: COACH_ID,
      name: workout.name,
      description: workout.description,
      type: workout.type,
      difficulty: workout.difficulty,
      workout_data: workout.workout_data,
      total_exercises: workout.total_exercises,
    });

    if (error) {
      console.log(`    Error: ${error.message}`);
    } else {
      console.log(`    Created workout "${workout.name}"`);
    }
  }
}

async function seedTrainingHistory(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;

  console.log('Seeding training history...');

  // Get the test workouts
  const { data: workouts } = await supabase
    .from('coach_workouts')
    .select('id, name')
    .eq('coach_id', COACH_ID)
    .ilike('name', '[TEST]%');

  if (!workouts || workouts.length === 0) return;

  const today = new Date();

  // For the first test client, add some training history
  const clientId = clientIds[0];

  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i * 2); // Every 2 days
    const dateStr = date.toISOString().split('T')[0];

    const workout = workouts[i % workouts.length];

    // Check if history entry exists
    const { data: existing } = await supabase
      .from('client_training_history')
      .select('id')
      .eq('coach_id', COACH_ID)
      .eq('client_id', clientId)
      .eq('date', dateStr)
      .eq('workout_id', workout.id)
      .single();

    if (existing) continue;

    await supabase.from('client_training_history').insert({
      coach_id: COACH_ID,
      client_id: clientId,
      workout_id: workout.id,
      workout_name: workout.name,
      date: dateStr,
      status: i < 7 ? 'completed' : 'scheduled',
      completed_at: i < 7 ? new Date(date.getTime() + 3600000).toISOString() : null,
    });
  }

  console.log('  + Added training history for test client');
}

async function main() {
  console.log('='.repeat(50));
  console.log('Athli AI Assistant - Test Data Seeder');
  console.log('='.repeat(50));
  console.log(`Coach ID: ${COACH_ID}`);
  console.log('');

  try {
    // Verify coach exists
    const { data: coach, error: coachError } = await supabase
      .from('user_profiles')
      .select('id, name')
      .eq('id', COACH_ID)
      .single();

    if (coachError || !coach) {
      console.error('Error: Coach not found with ID', COACH_ID);
      process.exit(1);
    }

    console.log(`Coach found: ${coach.name || 'Unknown'}`);
    console.log('');

    // Seed test data
    const clientIds = await seedTestClients();
    console.log('');

    await seedTestWorkouts();
    console.log('');

    await seedTrainingHistory(clientIds);
    console.log('');

    console.log('='.repeat(50));
    console.log('Test data seeded successfully!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
}

main();
