import { getSupabaseClient } from './supabase.service';
import crypto from 'crypto';

/**
 * Seeds rich demo data for screenshot/documentation purposes.
 * Creates multiple clients with varied data states.
 */

const DEMO_CLIENTS = [
  { name: 'Sarah Johnson', email: 'sarah.j@demo.athli.com', bio: 'Marathon runner transitioning to strength training. Competes in half-marathons.' },
  { name: 'Marcus Chen', email: 'marcus.c@demo.athli.com', bio: 'Former college athlete getting back into fitness after 5 years. Focus on hypertrophy.' },
  { name: 'Emma Williams', email: 'emma.w@demo.athli.com', bio: 'Yoga instructor adding weight training. Interested in functional fitness.' },
  { name: 'James Rodriguez', email: 'james.r@demo.athli.com', bio: 'Competitive CrossFit athlete. Training for regional qualifiers.' },
  { name: 'Olivia Taylor', email: 'olivia.t@demo.athli.com', bio: 'New to fitness, starting with basic strength and cardio. Goal: lose 10kg.' },
  { name: 'Daniel Kim', email: 'daniel.k@demo.athli.com', bio: 'Powerlifter. Preparing for first competition. Squat: 180kg, Bench: 120kg, Deadlift: 200kg.' },
  { name: 'Sophia Martinez', email: 'sophia.m@demo.athli.com', bio: 'Postpartum return to exercise. Focus on core rehab and progressive overload.' },
  { name: 'Alex Patel', email: 'alex.p@demo.athli.com', bio: 'Triathlete. Needs periodised plan balancing swim, bike, run with gym work.' },
];

const EXERCISES = [
  { name: 'Barbell Back Squat', muscle_group: 'Legs', type: 'weighted' },
  { name: 'Bench Press', muscle_group: 'Chest', type: 'weighted' },
  { name: 'Deadlift', muscle_group: 'Back', type: 'weighted' },
  { name: 'Overhead Press', muscle_group: 'Shoulders', type: 'weighted' },
  { name: 'Barbell Row', muscle_group: 'Back', type: 'weighted' },
  { name: 'Pull-ups', muscle_group: 'Back', type: 'bodyweight' },
  { name: 'Dumbbell Lunges', muscle_group: 'Legs', type: 'weighted' },
  { name: 'Dumbbell Curl', muscle_group: 'Arms', type: 'weighted' },
  { name: 'Tricep Pushdown', muscle_group: 'Arms', type: 'weighted' },
  { name: 'Plank', muscle_group: 'Core', type: 'timed' },
  { name: 'Running', muscle_group: 'Cardio', type: 'cardio' },
  { name: 'Leg Press', muscle_group: 'Legs', type: 'weighted' },
];

const HABIT_NAMES = [
  'Drink 2L water',
  '10,000 steps',
  'Sleep 8 hours',
  'Take creatine',
  'Stretch 10 mins',
  'Eat 150g protein',
];

const METRIC_NAMES = [
  { name: 'Body Weight', unit: 'kg', type: 'number' },
  { name: 'Body Fat %', unit: '%', type: 'number' },
  { name: 'Waist', unit: 'cm', type: 'number' },
  { name: 'Chest', unit: 'cm', type: 'number' },
  { name: 'Sleep Quality', unit: '/10', type: 'number' },
];

const NOTE_TITLES = [
  'Initial assessment',
  'Week 4 check-in summary',
  'Injury update - left knee',
  'Competition prep notes',
  'Nutrition discussion',
  'Program adjustment',
];

function randomId() {
  return crypto.randomUUID();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ScreenshotSeedService {
  async seedScreenshotData(coachId: string): Promise<{ clientsCreated: number }> {
    const supabase = getSupabaseClient();
    let clientsCreated = 0;

    for (const clientData of DEMO_CLIENTS) {
      try {
        const clientId = randomId();

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: clientData.email,
          password: 'demo-password-123',
          email_confirm: true,
          user_metadata: { name: clientData.name },
        });

        if (authError) {
          // User might already exist
          if (authError.message?.includes('already been registered')) {
            console.log(`[ScreenshotSeed] Client ${clientData.name} already exists, skipping`);
            continue;
          }
          console.error(`[ScreenshotSeed] Auth error for ${clientData.name}:`, authError);
          continue;
        }

        const userId = authData.user.id;

        // Create user_profiles (client)
        await supabase.from('user_profiles').insert({
          id: userId,
          user_type: 'client',
          email: clientData.email,
          name: clientData.name,
          signin_method: 'email',
        });

        // Create client_profiles
        await supabase.from('client_profiles').insert({
          client_id: userId,
          unit_system: 'metric',
        });

        // Assign to coach
        await supabase.from('coach_client_assignments').insert({
          coach_id: coachId,
          client_id: userId,
          status: 'active',
        });

        // Bio
        await supabase.from('client_bio').insert({
          client_id: userId,
          coach_id: coachId,
          bio: clientData.bio,
        });

        // Goals
        await supabase.from('client_goals').insert([
          { client_id: userId, coach_id: coachId, title: 'Build muscle', description: 'Gain 5kg lean mass in 6 months', id: randomId() },
          { client_id: userId, coach_id: coachId, title: 'Improve cardio', description: 'Run 5K under 25 minutes', id: randomId() },
        ]);

        // Notes
        const noteCount = randomBetween(2, 4);
        for (let i = 0; i < noteCount; i++) {
          await supabase.from('client_notes').insert({
            id: randomId(),
            client_id: userId,
            coach_id: coachId,
            title: NOTE_TITLES[i % NOTE_TITLES.length],
            content: `Session notes for ${clientData.name}. Progress has been ${['excellent', 'steady', 'good', 'promising'][i % 4]}. Key focus areas discussed and plan adjusted accordingly.`,
            created_at: daysAgo(i * 7),
          });
        }

        // Habits
        const habitCount = randomBetween(2, 4);
        for (let i = 0; i < habitCount; i++) {
          const habitId = randomId();
          await supabase.from('habits').insert({
            id: habitId,
            coach_id: coachId,
            name: HABIT_NAMES[i % HABIT_NAMES.length],
          });

          await supabase.from('client_habits').insert({
            id: randomId(),
            client_id: userId,
            coach_id: coachId,
            habit_id: habitId,
          });

          // Some habit logs
          for (let d = 0; d < randomBetween(5, 14); d++) {
            await supabase.from('habit_logs').insert({
              id: randomId(),
              client_id: userId,
              coach_id: coachId,
              habit_id: habitId,
              completed: Math.random() > 0.2,
              log_date: daysAgo(d),
            });
          }
        }

        // Metrics
        const metricCount = randomBetween(2, 3);
        for (let i = 0; i < metricCount; i++) {
          const metricDef = METRIC_NAMES[i % METRIC_NAMES.length];
          const metricId = randomId();
          await supabase.from('metrics').insert({
            id: metricId,
            coach_id: coachId,
            name: metricDef.name,
            unit: metricDef.unit,
          });

          await supabase.from('client_metrics').insert({
            id: randomId(),
            client_id: userId,
            coach_id: coachId,
            metric_id: metricId,
          });

          // Metric logs with realistic progression
          const baseValue = metricDef.name === 'Body Weight' ? randomBetween(65, 95) : randomBetween(10, 30);
          for (let d = 0; d < randomBetween(8, 20); d++) {
            const variation = (Math.random() - 0.5) * 2;
            await supabase.from('metric_logs').insert({
              id: randomId(),
              client_id: userId,
              coach_id: coachId,
              metric_id: metricId,
              value: (baseValue + variation - d * 0.1).toFixed(1),
              log_date: daysAgo(d * 3),
            });
          }
        }

        // Chat messages
        const chatId = randomId();
        await supabase.from('chats').insert({
          id: chatId,
          coach_id: coachId,
          client_id: userId,
        });

        const messages = [
          { sender_id: userId, content: `Hi coach! Ready to get started 💪` },
          { sender_id: coachId, content: `Welcome ${clientData.name.split(' ')[0]}! I've set up your program. Let me know if you have questions.` },
          { sender_id: userId, content: `Looks great! Quick question about the squat depth on day 1?` },
          { sender_id: coachId, content: `Go as deep as comfortable while maintaining a neutral spine. I'll check your form in the video.` },
          { sender_id: userId, content: `Got it, thanks! Completed today's session. Felt strong 🔥` },
        ];

        for (let m = 0; m < messages.length; m++) {
          await supabase.from('messages').insert({
            id: randomId(),
            chat_id: chatId,
            sender_id: messages[m].sender_id,
            content: messages[m].content,
            created_at: daysAgo(messages.length - m),
          });
        }

        clientsCreated++;
        console.log(`[ScreenshotSeed] Created client: ${clientData.name}`);
      } catch (err) {
        console.error(`[ScreenshotSeed] Error creating ${clientData.name}:`, err);
      }
    }

    return { clientsCreated };
  }

  async cleanScreenshotData(coachId: string): Promise<{ clientsRemoved: number }> {
    const supabase = getSupabaseClient();
    let clientsRemoved = 0;

    for (const clientData of DEMO_CLIENTS) {
      try {
        // Find user by email
        const { data: users } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', clientData.email)
          .eq('user_type', 'client');

        if (!users || users.length === 0) continue;

        for (const user of users) {
          const clientId = user.id;

          // Delete in order (FK constraints)
          await supabase.from('messages').delete().eq('sender_id', clientId);
          await supabase.from('chats').delete().eq('client_id', clientId);
          await supabase.from('habit_logs').delete().eq('client_id', clientId);
          await supabase.from('client_habits').delete().eq('client_id', clientId);
          await supabase.from('metric_logs').delete().eq('client_id', clientId);
          await supabase.from('client_metrics').delete().eq('client_id', clientId);
          await supabase.from('client_notes').delete().eq('client_id', clientId);
          await supabase.from('client_goals').delete().eq('client_id', clientId);
          await supabase.from('client_bio').delete().eq('client_id', clientId);
          await supabase.from('coach_client_assignments').delete().eq('client_id', clientId);
          await supabase.from('client_profiles').delete().eq('client_id', clientId);
          await supabase.from('user_profiles').delete().eq('id', clientId).eq('user_type', 'client');

          // Delete auth user
          await supabase.auth.admin.deleteUser(clientId);

          clientsRemoved++;
          console.log(`[ScreenshotSeed] Removed client: ${clientData.name}`);
        }
      } catch (err) {
        console.error(`[ScreenshotSeed] Error removing ${clientData.name}:`, err);
      }
    }

    return { clientsRemoved };
  }
}

export const screenshotSeedService = new ScreenshotSeedService();
