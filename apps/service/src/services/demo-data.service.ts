import { getSupabaseClient } from './supabase.service';
import crypto from 'crypto';

interface SeedDemoClientParams {
  coachId: string;
  coachName: string;
  coachEmail: string;
  signinMethod: 'email' | 'google';
  profilePictureUrl: string | null;
  timezone: string | null;
}

class DemoDataService {
  async seedDemoClient(params: SeedDemoClientParams): Promise<void> {
    const { coachId, coachName, coachEmail, signinMethod, profilePictureUrl, timezone } = params;
    const supabase = getSupabaseClient();

    // Debug: verify service role key is being used
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('[DemoData] Service role key present:', !!serviceKey, 'length:', serviceKey?.length);
    console.log('[DemoData] Starting demo client seed for coach:', coachId);

    try {
      // Demo client uses the same user ID as the coach
      // Coach becomes their own client with additional profile entries
      const clientId = coachId;
      const demoName = `${coachName} - Demo`;

      // Step 1: Create user_profiles entry with user_type='client'
      // Use the same email, signin_method, and profile_picture as the coach
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .insert({
          id: clientId,
          user_type: 'client',
          email: coachEmail,
          name: demoName,
          profile_picture_url: profilePictureUrl,
          signin_method: signinMethod,
          ...(timezone && { timezone }),
        });

      if (userProfileError) {
        if (userProfileError.code === '23505') {
          // Row already exists — ensure the name has the "- Demo" suffix and continue seeding
          console.log('[DemoData] Demo user_profiles already exists, updating name and continuing');
          await supabase
            .from('user_profiles')
            .update({ name: demoName })
            .eq('id', clientId)
            .eq('user_type', 'client');
        } else {
          console.error('[DemoData] Failed to create user_profiles:', userProfileError);
          return;
        }
      }

      console.log('[DemoData] Created demo user_profiles entry:', clientId);

      // Step 2: Create client_profiles FIRST (FK on coach_client_assignments requires this)
      const { data: cpData, error: clientProfileError } = await supabase
        .from('client_profiles')
        .insert({
          client_id: clientId,
          unit_system: 'metric',
        })
        .select('client_id')
        .single();

      console.log('[DemoData] client_profiles insert result - data:', cpData, 'error:', clientProfileError);

      if (clientProfileError && clientProfileError.code !== '23505') {
        console.error('[DemoData] Failed to create client_profiles:', clientProfileError);
        return;
      }

      // Verify client_profiles exists (needed for FK on coach_client_assignments)
      const { data: cpCheck } = await supabase
        .from('client_profiles')
        .select('client_id')
        .eq('client_id', clientId)
        .single();

      if (!cpCheck) {
        console.error('[DemoData] client_profiles not found after insert!');
        return;
      }

      console.log('[DemoData] Verified client_profiles entry exists');

      // Step 3: Create coach_client_assignments (requires client_profiles to exist due to fk_cca_client_profile)
      // Triggers on other client tables depend on this existing
      // NOTE: Migration 137 must be applied to allow coach_id = client_id (self-reference for demo)

      // Clean up any stale conversation data from previous failed runs
      // The assignment trigger creates conversations, so we need to clean up first
      console.log('[DemoData] Cleaning up any stale conversation data...');
      await supabase
        .from('conversations')
        .delete()
        .eq('coach_id', coachId)
        .eq('client_id', clientId);

      console.log('[DemoData] Attempting to insert coach_client_assignments with coach_id=client_id=', coachId);

      const { error: assignmentError } = await supabase
        .from('coach_client_assignments')
        .insert({
          coach_id: coachId,
          client_id: clientId,
          category: 'online',
          status: 'connected',
          connected_at: new Date().toISOString(),
          is_active: true,
        });

      console.log('[DemoData] Assignment insert error:', assignmentError);

      if (assignmentError) {
        if (assignmentError.code === '23505') {
          console.log('[DemoData] Assignment already exists (duplicate key), continuing...');
        } else {
          console.error('[DemoData] Failed to create assignment:', JSON.stringify(assignmentError));
          if (assignmentError.message?.includes('self') || assignmentError.code === '23514') {
            console.error('[DemoData] Self-reference constraint violation - ensure migration 137 is applied');
          }
          return;
        }
      }

      // Verify the assignment was actually created
      const { data: assignmentCheck, error: checkError } = await supabase
        .from('coach_client_assignments')
        .select('coach_id, client_id')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .single();

      console.log('[DemoData] Assignment verification - data:', assignmentCheck, 'error:', checkError);

      if (!assignmentCheck) {
        console.error('[DemoData] Assignment row not found after insert!');
        return;
      }

      console.log('[DemoData] Verified coach_client_assignments entry exists');

      // Steps 4+: Seed all client data in parallel where possible
      await Promise.all([
        this.seedBio(supabase, clientId, coachId),
        this.seedGoals(supabase, clientId, coachId),
        this.seedInjuries(supabase, clientId, coachId),
        this.seedNotes(supabase, clientId, coachId),
        this.seedMetrics(supabase, clientId, coachId),
        this.seedHabits(supabase, clientId, coachId),
        this.seedCheckins(supabase, clientId, coachId),
        this.seedQuestionnaires(supabase, clientId, coachId),
      ]);

      // Training must be done after the above since it's the most complex
      await this.seedTraining(supabase, clientId, coachId);

      // Generate client tasks for today based on the seeded assignments
      await this.generateTasks(supabase);

      console.log('[DemoData] Demo client seed complete for coach:', coachId);
    } catch (err) {
      console.error('[DemoData] Unexpected error during seeding:', err);
    }
  }

  // ─── Step 5: Bio ────────────────────────────────────────────────

  private async seedBio(supabase: any, clientId: string, coachId: string) {
    const { error } = await supabase.from('client_bio').insert({
      client_id: clientId,
      coach_id: coachId,
      bio: 'Recreational athlete focused on building strength and improving overall fitness. Currently training 4-5 days per week with a mix of weightlifting and conditioning. Looking to improve body composition while maintaining energy for daily activities.',
    });
    if (error) console.error('[DemoData] Bio insert failed:', error);
  }

  // ─── Step 6: Goals ──────────────────────────────────────────────

  private async seedGoals(supabase: any, clientId: string, coachId: string) {
    const now = new Date();
    const { error } = await supabase.from('client_goals').insert([
      {
        client_id: clientId,
        coach_id: coachId,
        goal: 'Bench press 100kg',
        target_date: addMonths(now, 3).toISOString().split('T')[0],
        achieved: false,
        details: 'Current 1RM is 85kg. Want to hit the 100kg milestone by increasing volume and progressive overload on bench press and accessory movements.',
      },
      {
        client_id: clientId,
        coach_id: coachId,
        goal: 'Run a 5K under 25 minutes',
        target_date: addMonths(now, 2).toISOString().split('T')[0],
        achieved: false,
        details: 'Current best is 27:30. Adding two cardio sessions per week with interval training to improve pace.',
      },
      {
        client_id: clientId,
        coach_id: coachId,
        goal: 'Lose 5kg body fat',
        target_date: addMonths(now, 4).toISOString().split('T')[0],
        achieved: false,
        details: 'Starting at 88kg with approximately 18% body fat. Target is 83kg while maintaining muscle mass through proper nutrition and training.',
      },
    ]);
    if (error) console.error('[DemoData] Goals insert failed:', error);
  }

  // ─── Step 7: Injuries ──────────────────────────────────────────

  private async seedInjuries(supabase: any, clientId: string, coachId: string) {
    const now = new Date();
    const { error } = await supabase.from('client_injuries').insert([
      {
        client_id: clientId,
        coach_id: coachId,
        injury: 'Mild lower back strain',
        status: 'recovering',
        date: addMonths(now, -2).toISOString().split('T')[0],
        details: 'Occurred during deadlifts with improper bracing. Avoiding heavy conventional deadlifts, using trap bar and lighter loads. Physical therapy 1x/week.',
      },
      {
        client_id: clientId,
        coach_id: coachId,
        injury: 'Right shoulder impingement',
        status: 'resolved',
        date: addMonths(now, -6).toISOString().split('T')[0],
        details: 'From overhead pressing with excessive volume. Resolved with rotator cuff strengthening and improved warm-up routine. No current limitations.',
      },
    ]);
    if (error) console.error('[DemoData] Injuries insert failed:', error);
  }

  // ─── Step 8: Notes ─────────────────────────────────────────────

  private async seedNotes(supabase: any, clientId: string, coachId: string) {
    const { error } = await supabase.from('client_notes').insert([
      {
        client_id: clientId,
        coach_id: coachId,
        title: 'Initial Assessment',
        body: 'Client shows good baseline strength with 2+ years of training experience. Squat form needs work on depth and knee tracking. Upper body push/pull ratio is imbalanced - more pulling volume needed. Recommended starting with a 4-day upper/lower split.',
        is_pinned: true,
      },
      {
        client_id: clientId,
        coach_id: coachId,
        title: 'Nutrition Discussion',
        body: 'Discussed macro targets: 180g protein, 250g carbs, 70g fat (~2,350 kcal). Client prefers meal prepping on Sundays. Currently skipping breakfast - suggested adding a quick protein shake + oats. Will reassess in 4 weeks.',
        is_pinned: false,
      },
    ]);
    if (error) console.error('[DemoData] Notes insert failed:', error);
  }

  // ─── Step 9: Metrics + Logs ────────────────────────────────────

  private async seedMetrics(supabase: any, clientId: string, coachId: string) {
    const now = new Date();

    // Create 3 metrics
    const metricsToInsert = [
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: 'Body Weight',
        unit: 'kg',
        value_kind: 'number',
      },
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: 'Body Fat %',
        unit: '%',
        value_kind: 'percent',
      },
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: 'Sleep Quality',
        unit: '/10',
        value_kind: 'score',
      },
    ];

    const { error: metricsError } = await supabase
      .from('client_metrics')
      .insert(metricsToInsert);

    if (metricsError) {
      console.error('[DemoData] Metrics insert failed:', metricsError);
      return;
    }

    // Create metric logs over past 3 weeks
    const bodyWeightId = metricsToInsert[0].id;
    const bodyFatId = metricsToInsert[1].id;
    const sleepId = metricsToInsert[2].id;

    const metricLogs: any[] = [];

    // Body Weight - daily-ish values trending 88 -> 87.2
    const weightValues = [88.0, 87.8, 87.9, 87.6, 87.5, 87.7, 87.4, 87.5, 87.3, 87.6, 87.4, 87.2, 87.3, 87.1, 87.2];
    for (let i = 0; i < weightValues.length; i++) {
      const date = addDays(now, -(21 - i * 1.4));
      metricLogs.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: bodyWeightId,
        value: weightValues[i],
        date: date.toISOString().split('T')[0],
        created_by: clientId,
      });
    }

    // Body Fat % - weekly values 18.5 -> 17.8
    const bfValues = [18.5, 18.2, 17.8];
    for (let i = 0; i < bfValues.length; i++) {
      const date = addDays(now, -(21 - i * 7));
      metricLogs.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: bodyFatId,
        value: bfValues[i],
        date: date.toISOString().split('T')[0],
        created_by: clientId,
      });
    }

    // Sleep Quality - daily values 6-9 range
    const sleepValues = [7, 6, 8, 7, 9, 7, 8, 6, 7, 8, 9, 7, 8, 7, 8, 6, 7, 8, 9, 7, 8];
    for (let i = 0; i < sleepValues.length; i++) {
      const date = addDays(now, -(21 - i));
      metricLogs.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: sleepId,
        value: sleepValues[i],
        date: date.toISOString().split('T')[0],
        created_by: clientId,
      });
    }

    const { error: logsError } = await supabase.from('client_metric_logs').insert(metricLogs);
    if (logsError) console.error('[DemoData] Metric logs insert failed:', logsError);
  }

  // ─── Step 10: Habits + Logs ────────────────────────────────────

  private async seedHabits(supabase: any, clientId: string, coachId: string) {
    const now = new Date();

    // Create 3 habits
    const habitsToInsert = [
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: 'Drink 3L water',
        schedule_type: 'daily',
        amount: 3,
        unit: 'l',
        period: 'daily',
      },
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: '10,000 steps',
        schedule_type: 'daily',
        amount: 10000,
        unit: 'steps',
        period: 'daily',
      },
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        name: 'Stretch for 15 min',
        schedule_type: 'weekly',
        days_of_week: [1, 3, 5],
        amount: 15,
        unit: 'min',
        period: 'weekly',
      },
    ];

    const { error: habitsError } = await supabase.from('client_habits').insert(habitsToInsert);

    if (habitsError) {
      console.error('[DemoData] Habits insert failed:', habitsError);
      return;
    }

    // Create habit logs over past 3 weeks
    const waterId = habitsToInsert[0].id;
    const stepsId = habitsToInsert[1].id;
    const stretchId = habitsToInsert[2].id;

    const habitLogs: any[] = [];

    // Water habit logs - daily over 3 weeks, with values above/below target (3L)
    // Realistic range: 1.5L to 4L - some days exceed, some days fall short
    const waterValues = [2.5, 3.0, 3.5, 2.0, 3.0, 4.0, 3.5, 2.5, 3.0, 3.5, 2.0, 3.0, 3.5, 4.0, 2.5, 3.0, 2.0, 3.5, 3.0, 4.0, 3.0];
    for (let i = 0; i < 21; i++) {
      const date = addDays(now, -(21 - i));
      const value = waterValues[i];
      const status = value >= 3 ? 'completed' : 'partial';
      habitLogs.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: waterId,
        date: date.toISOString().split('T')[0],
        status,
        completed: status === 'completed',
        value,
        created_by: clientId,
      });
    }

    // Steps habit logs - daily with varied values above/below target (10,000)
    // Realistic range: 4,000 to 15,000 - shows days exceeding goal and days falling short
    const stepsValues = [8500, 12000, 6500, 10500, 14000, 9000, 11500, 5000, 13000, 10000, 7500, 15000, 8000, 12500, 4500, 11000, 9500, 13500, 6000, 10500, 12000];
    for (let i = 0; i < 21; i++) {
      const date = addDays(now, -(21 - i));
      const value = stepsValues[i];
      const status = value >= 10000 ? 'completed' : 'partial';
      habitLogs.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: stepsId,
        date: date.toISOString().split('T')[0],
        status,
        completed: status === 'completed',
        value,
        created_by: clientId,
      });
    }

    // Stretch habit logs - Mon/Wed/Fri only, with values above/below target (15 min)
    // Realistic range: 8 to 25 min - some sessions longer, some shorter
    const stretchValues = [12, 18, 15, 10, 20, 15, 22, 14, 16, 8, 25, 15];
    let stretchIndex = 0;
    for (let i = 0; i < 21; i++) {
      const date = addDays(now, -(21 - i));
      const dow = date.getDay(); // 0=Sun, 1=Mon, ...
      if (dow === 1 || dow === 3 || dow === 5) {
        const value = stretchValues[stretchIndex % stretchValues.length];
        stretchIndex++;
        const status = value >= 15 ? 'completed' : 'partial';
        habitLogs.push({
          id: crypto.randomUUID(),
          client_id: clientId,
          coach_id: coachId,
          assignment_id: stretchId,
          date: date.toISOString().split('T')[0],
          status,
          completed: status === 'completed',
          value,
          created_by: clientId,
        });
      }
    }

    const { error: logsError } = await supabase.from('client_habit_logs').insert(habitLogs);
    if (logsError) console.error('[DemoData] Habit logs insert failed:', logsError);
  }

  // ─── Step 11: Check-ins + Logs ─────────────────────────────────

  private async seedCheckins(supabase: any, clientId: string, coachId: string) {
    const now = new Date();
    const checkinId = crypto.randomUUID();

    // Create check-in definition
    const { error: checkinError } = await supabase.from('client_checkins').insert({
      id: checkinId,
      client_id: clientId,
      coach_id: coachId,
      name: 'Weekly Check-in',
      description: 'Weekly progress check-in to track how you are feeling and identify any issues.',
      status: 'live',
      schedule_config: { type: 'check-in', frequency: 'weekly', selectedDays: ['sunday'] },
      cron_expression: '0 9 * * 0',
      questions: [
        { id: crypto.randomUUID(), format: 'scale', question: 'How are you feeling this week?', scaleFrom: '1', scaleTo: '10', required: true },
        { id: crypto.randomUUID(), format: 'yesNo', question: 'Any pain or discomfort?', required: true },
        { id: crypto.randomUUID(), format: 'rating', question: 'Rate your nutrition adherence', scaleFrom: '1', scaleTo: '5', required: true },
        { id: crypto.randomUUID(), format: 'text', question: 'Anything else to share?', required: false },
      ],
    });

    if (checkinError) {
      console.error('[DemoData] Checkin insert failed:', checkinError);
      return;
    }

    // Create 2 completed check-in logs from past 2 weeks
    const checkinLogs = [
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: checkinId,
        submission_date: addDays(now, -14).toISOString().split('T')[0],
        answers: {
          0: { value: 7 },
          1: { value: false },
          2: { value: 4 },
          3: { value: 'Feeling good overall. Energy levels have been consistent this week.' },
        },
        status: 'reviewed',
        coach_comment: 'Great progress this week! Keep up the consistency with nutrition. Let\'s push a bit harder on the compound lifts next week.',
        reviewed_at: addDays(now, -13).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        client_id: clientId,
        coach_id: coachId,
        assignment_id: checkinId,
        submission_date: addDays(now, -7).toISOString().split('T')[0],
        answers: {
          0: { value: 8 },
          1: { value: true },
          2: { value: 3 },
          3: { value: 'Slight soreness in lower back after Tuesday\'s session. Nutrition was harder to stick to this weekend.' },
        },
        status: 'reviewed',
        coach_comment: 'Thanks for flagging the back soreness. Let\'s reduce deadlift volume this week and add some extra mobility work. Don\'t stress about the weekend - just get back on track Monday.',
        reviewed_at: addDays(now, -6).toISOString(),
      },
    ];

    const { error: logsError } = await supabase.from('client_checkin_logs').insert(checkinLogs);
    if (logsError) console.error('[DemoData] Checkin logs insert failed:', logsError);
  }

  // ─── Step 12: Questionnaires ──────────────────────────────────

  private async seedQuestionnaires(supabase: any, clientId: string, coachId: string) {
    const now = new Date();

    const { error } = await supabase.from('client_questionnaires').insert({
      id: crypto.randomUUID(),
      client_id: clientId,
      coach_id: coachId,
      name: 'Onboarding Questionnaire',
      description: 'Initial questionnaire to understand your background and goals.',
      questions: [
        { id: crypto.randomUUID(), format: 'text', question: 'What are your fitness goals?', required: true },
        { id: crypto.randomUUID(), format: 'multipleChoice', question: 'Training experience level?', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
        { id: crypto.randomUUID(), format: 'text', question: 'Any dietary restrictions?', required: false },
      ],
      answers: [
        { value: 'I want to get stronger, build muscle, and improve my overall fitness. My main focus is on compound lifts but I also want to improve my cardiovascular endurance for recreational sports.' },
        { value: 'Intermediate' },
        { value: 'No major restrictions. I try to limit processed foods and eat mostly whole foods. Occasionally have dairy sensitivity so I use lactose-free alternatives.' },
      ],
      status: 'completed',
      sent_at: addDays(now, -25).toISOString(),
      completed_at: addDays(now, -24).toISOString(),
    });

    if (error) console.error('[DemoData] Questionnaire insert failed:', error);
  }

  // ─── Generate client tasks ──────────────────────────────────

  private async generateTasks(supabase: any) {
    const { data, error } = await supabase.rpc('generate_daily_client_tasks');
    if (error) {
      console.error('[DemoData] Task generation failed:', error);
      return;
    }
    console.log('[DemoData] Generated', data ?? 0, 'client tasks');
  }

  // ─── Steps 13-16: Training ────────────────────────────────────

  private async seedTraining(supabase: any, clientId: string, coachId: string) {
    const now = new Date();
    const today = stripTime(now);

    // Generate schedule: 3 weeks past + 4 weeks future
    // Mon/Wed/Fri = Upper, Tue/Thu = Lower
    const startDate = addDays(today, -21);
    const endDate = addDays(today, 28);

    const trainingRows: any[] = [];
    const historyRows: any[] = [];
    const exerciseHistoryRows: any[] = [];

    // Determine which past dates are "missed" (~3-4 scattered)
    const missedDayOffsets = new Set([-18, -11, -6, -2]); // days relative to today

    let completedCount7 = 0;
    let totalCount7 = 0;
    let completedCount30 = 0;
    let totalCount30 = 0;
    let lastActivity: string | null = null;

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0=Sun..6=Sat
      const daysFromToday = Math.round((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = daysFromToday < 0;
      const isToday = daysFromToday === 0;
      const dateStr = current.toISOString().split('T')[0];

      // Only Mon-Fri training days
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const isUpper = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        const isMissed = isPast && missedDayOffsets.has(daysFromToday);
        const isCompleted = isPast && !isMissed;

        const workoutId = 'workout_1';
        const workout = isUpper
          ? this.buildUpperWorkout(isCompleted, dateStr)
          : this.buildLowerWorkout(isCompleted, dateStr);

        const trainingData: Record<string, any> = {
          [workoutId]: workout,
        };

        trainingRows.push({
          client_id: clientId,
          date: dateStr,
          coach_id: coachId,
          training_data: trainingData,
        });

        // Training history
        if (isPast || isToday) {
          const status = isMissed ? 'missed' as const : isCompleted ? 'completed' as const : 'not_started' as const;
          historyRows.push({
            client_id: clientId,
            coach_id: coachId,
            date: dateStr,
            workout_id: workoutId,
            status,
          });

          // Exercise history for completed workouts
          if (isCompleted) {
            const exercises = this.extractExercises(workout, workoutId);
            for (const ex of exercises) {
              exerciseHistoryRows.push({
                client_id: clientId,
                coach_id: coachId,
                date: dateStr,
                workout_id: workoutId,
                workout_name: workout.name,
                exercise_id: ex.exerciseId,
                exercise_data: ex.data,
              });
            }
            lastActivity = dateStr;
          }
        }

        // Summary stats
        if (daysFromToday >= -7 && daysFromToday < 0) {
          totalCount7++;
          if (isCompleted) completedCount7++;
        }
        if (daysFromToday >= -30 && daysFromToday < 0) {
          totalCount30++;
          if (isCompleted) completedCount30++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // Insert training data
    const { error: trainingError } = await supabase
      .from('client_training')
      .insert(trainingRows);
    if (trainingError) {
      console.error('[DemoData] Training insert failed:', trainingError);
      return;
    }

    // Insert training history
    if (historyRows.length > 0) {
      const { error: histError } = await supabase
        .from('client_training_history')
        .insert(historyRows);
      if (histError) console.error('[DemoData] Training history insert failed:', histError);
    }

    // Insert exercise history
    if (exerciseHistoryRows.length > 0) {
      const { error: exHistError } = await supabase
        .from('client_training_exercise_history')
        .insert(exerciseHistoryRows);
      if (exHistError) console.error('[DemoData] Exercise history insert failed:', exHistError);
    }

    // Insert training summary
    const { error: summaryError } = await supabase
      .from('client_training_summary')
      .insert({
        client_id: clientId,
        coach_id: coachId,
        last_activity: lastActivity ? new Date(lastActivity).toISOString() : null,
        last_7_days_training_completed: completedCount7,
        last_7_days_training_total: totalCount7,
        last_30_days_training_completed: completedCount30,
        last_30_days_training_total: totalCount30,
      });
    if (summaryError) console.error('[DemoData] Training summary insert failed:', summaryError);
  }

  // ─── Workout Builders ─────────────────────────────────────────

  // Real exercise IDs from the seed data (musclewiki_id values)
  private static readonly EXERCISE_IDS = {
    // Upper body
    BARBELL_BENCH_PRESS: '3',
    BARBELL_OVERHEAD_PRESS: '258',
    PUSH_UP: '144',
    DUMBBELL_ROW_BILATERAL: '20',
    DUMBBELL_LATERAL_RAISE: '14',
    BAND_PULL_APART: '225',
    CHEST_STRETCH: '102',
    SHOULDER_STRETCH: '116',
    // Lower body
    BARBELL_SQUAT: '6',
    BARBELL_STIFF_LEG_DEADLIFT: '21',
    JUMP_SQUATS: '152',
    FORWARD_LUNGE: '320',
    MACHINE_LEG_PRESS: '7',
    CALF_RAISES: '161',
    MACHINE_HAMSTRING_CURL: '22',
    BODYWEIGHT_SQUAT: '153',
    QUADS_STRETCH: '106',
    HAMSTRINGS_STRETCH: '123',
  };

  private buildUpperWorkout(completed: boolean, dateStr: string): any {
    const workoutStarted = completed ? new Date(dateStr + 'T08:00:00Z') : null;
    const workoutEnded = completed ? new Date(dateStr + 'T09:05:00Z') : null;

    const EX = DemoDataService.EXERCISE_IDS;
    const exBenchId = EX.BARBELL_BENCH_PRESS;
    const exOhpId = EX.BARBELL_OVERHEAD_PRESS;
    const exArmCirclesId = crypto.randomUUID(); // No seed data for arm circles
    const exBandPullId = EX.BAND_PULL_APART;
    const exPushupId = EX.PUSH_UP;
    const exDbRowId = EX.DUMBBELL_ROW_BILATERAL;
    const exLatRaiseId = EX.DUMBBELL_LATERAL_RAISE;
    const exChestStretchId = EX.CHEST_STRETCH;
    const exShoulderStretchId = EX.SHOULDER_STRETCH;

    return {
      id: null,
      name: 'Upper Body',
      description: 'Upper body strength and conditioning session',
      type: 'weightlifting',
      difficulty: 'intermediate',
      equipment: ['Barbell', 'Dumbbell', 'Bands'],
      totalExercises: 9,
      items: [
        // Warmup
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Warm-up',
            type: 'auxiliary',
            category: 'warmup',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exArmCirclesId, 'Arm Circles', 2, 15, null, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exBandPullId, 'Band Pull-Aparts', 2, 15, null, completed)],
              },
            ],
          },
        },
        // Strength (superset: Bench + OHP)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Strength',
            type: 'regular',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: true,
                exercises: [
                  this.makeRegularExercise(exBenchId, 'Bench Press', 4, 8, 80, completed, exOhpId),
                  this.makeRegularExercise(exOhpId, 'Overhead Press', 4, 8, 50, completed, exBenchId),
                ],
              },
            ],
          },
        },
        // AMRAP (8 min)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'AMRAP Finisher',
            type: 'amrap',
            durationSec: 480,
            roundsCompleted: completed ? 4 : null,
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              this.makeAmrapExercise(exPushupId, 'Push-ups', 12, null, completed),
              this.makeAmrapExercise(exDbRowId, 'Dumbbell Rows', 10, 22.5, completed),
            ],
          },
        },
        // EMOM (10 min, 60s intervals)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'EMOM Shoulders',
            type: 'emom',
            intervalSec: 60,
            durationMin: 10,
            completedRounds: completed ? 10 : 0,
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exLatRaiseId, 'Lateral Raises', 12, 10, completed)],
              },
            ],
          },
        },
        // Cooldown
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Cool-down',
            type: 'auxiliary',
            category: 'cooldown',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exChestStretchId, 'Chest Stretch', 1, 30, null, completed, null, 'seconds')],
              },
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exShoulderStretchId, 'Shoulder Stretch', 1, 30, null, completed, null, 'seconds')],
              },
            ],
          },
        },
      ],
      pre: completed
        ? { sleep: randInt(3, 5), mood: randInt(3, 5), energy: randInt(3, 5), stress: randInt(1, 3), soreness: randInt(1, 3) }
        : { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: completed
        ? { rating: randInt(3, 5), intensity: randInt(3, 5), sessionComments: null }
        : { rating: null, intensity: null, sessionComments: null },
      completedSummary: completed
        ? {
            status: 'completed',
            startedAt: workoutStarted!.toISOString(),
            completedAt: workoutEnded!.toISOString(),
            totalDurationMin: 65,
            totalWeightLifted: null,
            pausedAt: null,
            totalPausedMs: 0,
          }
        : {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            totalDurationMin: null,
            totalWeightLifted: null,
            pausedAt: null,
            totalPausedMs: 0,
          },
    };
  }

  private buildLowerWorkout(completed: boolean, dateStr: string): any {
    const workoutStarted = completed ? new Date(dateStr + 'T08:00:00Z') : null;
    const workoutEnded = completed ? new Date(dateStr + 'T09:15:00Z') : null;

    const EX = DemoDataService.EXERCISE_IDS;
    const exLegSwingsId = crypto.randomUUID(); // No seed data for leg swings
    const exBwSquatsId = EX.BODYWEIGHT_SQUAT;
    const exBackSquatId = EX.BARBELL_SQUAT;
    const exRdlId = EX.BARBELL_STIFF_LEG_DEADLIFT;
    const exJumpSquatsId = EX.JUMP_SQUATS;
    const exLungesId = EX.FORWARD_LUNGE;
    const exBoxJumpsId = crypto.randomUUID(); // No seed data for box jumps
    const exWallSitsId = crypto.randomUUID(); // No seed data for wall sits
    const exLegPressId = EX.MACHINE_LEG_PRESS;
    const exCalfRaisesId = EX.CALF_RAISES;
    const exLegCurlsId = EX.MACHINE_HAMSTRING_CURL;
    const exQuadStretchId = EX.QUADS_STRETCH;
    const exHamStretchId = EX.HAMSTRINGS_STRETCH;

    return {
      id: null,
      name: 'Lower Body',
      description: 'Lower body strength and conditioning session',
      type: 'weightlifting',
      difficulty: 'intermediate',
      equipment: ['Barbell', 'Box', 'Leg Press Machine'],
      totalExercises: 13,
      items: [
        // Warmup
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Warm-up',
            type: 'auxiliary',
            category: 'warmup',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exLegSwingsId, 'Leg Swings', 2, 15, null, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exBwSquatsId, 'Bodyweight Squats', 2, 10, null, completed)],
              },
            ],
          },
        },
        // Strength
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Strength',
            type: 'regular',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exBackSquatId, 'Back Squats', 5, 5, 120, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exRdlId, 'Romanian Deadlift', 4, 10, 80, completed)],
              },
            ],
          },
        },
        // Tabata (20s work, 10s rest, 8 rounds)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Tabata Legs',
            type: 'tabata',
            workSec: 20,
            restSec: 10,
            rounds: 8,
            completedRounds: completed ? 8 : 0,
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exJumpSquatsId, 'Jump Squats', 12, null, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exLungesId, 'Lunges', 10, null, completed)],
              },
            ],
          },
        },
        // HIIT (40s work, 20s rest, 5 rounds)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'HIIT Conditioning',
            type: 'hiit',
            workSec: 40,
            restSec: 20,
            rounds: 5,
            completedRounds: completed ? 5 : 0,
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exBoxJumpsId, 'Box Jumps', 10, null, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exWallSitsId, 'Wall Sits', 1, null, completed, 'seconds', '40')],
              },
            ],
          },
        },
        // Circuits (3 rounds)
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Accessory Circuit',
            type: 'circuits',
            rounds: 3,
            completedRounds: completed ? 3 : 0,
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exLegPressId, 'Leg Press', 12, 150, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exCalfRaisesId, 'Calf Raises', 15, 80, completed)],
              },
              {
                isSuperset: false,
                exercises: [this.makeCircuitExercise(exLegCurlsId, 'Leg Curls', 12, 45, completed)],
              },
            ],
          },
        },
        // Cooldown
        {
          itemType: 'section',
          data: {
            id: crypto.randomUUID(),
            name: 'Cool-down',
            type: 'auxiliary',
            category: 'cooldown',
            notes: null,
            completed: completed ? 'completed' : 'not_started',
            exercises: [
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exQuadStretchId, 'Quad Stretch', 1, 30, null, completed, null, 'seconds')],
              },
              {
                isSuperset: false,
                exercises: [this.makeRegularExercise(exHamStretchId, 'Hamstring Stretch', 1, 30, null, completed, null, 'seconds')],
              },
            ],
          },
        },
      ],
      pre: completed
        ? { sleep: randInt(3, 5), mood: randInt(3, 5), energy: randInt(3, 5), stress: randInt(1, 3), soreness: randInt(1, 3) }
        : { sleep: null, mood: null, energy: null, stress: null, soreness: null },
      post: completed
        ? { rating: randInt(3, 5), intensity: randInt(3, 5), sessionComments: null }
        : { rating: null, intensity: null, sessionComments: null },
      completedSummary: completed
        ? {
            status: 'completed',
            startedAt: workoutStarted!.toISOString(),
            completedAt: workoutEnded!.toISOString(),
            totalDurationMin: 75,
            totalWeightLifted: null,
            pausedAt: null,
            totalPausedMs: 0,
          }
        : {
            status: 'not_started',
            startedAt: null,
            completedAt: null,
            totalDurationMin: null,
            totalWeightLifted: null,
            pausedAt: null,
            totalPausedMs: 0,
          },
    };
  }

  // ─── Exercise Helpers ─────────────────────────────────────────

  private makeRegularExercise(
    id: string,
    name: string,
    sets: number,
    reps: number,
    weight: number | null,
    completed: boolean,
    supersetId: string | null = null,
    col1Label: string = 'Reps',
  ): any {
    const setsArr = [];
    for (let i = 1; i <= sets; i++) {
      const completedReps = completed ? String(reps + (Math.random() > 0.7 ? 1 : 0)) : null;
      const completedWeight = completed && weight ? String(weight) : null;
      setsArr.push({
        setNumber: i,
        type: 'normal',
        restSec: weight ? 90 : 30,
        completed: completed ? 'completed' : 'not_started',
        skipped: false,
        trackableField1: {
          label: col1Label,
          prescribed: String(reps),
          completed: completedReps,
        },
        trackableField2: {
          label: weight ? 'kg' : 'Optional',
          prescribed: weight ? String(weight) : null,
          completed: completedWeight,
        },
        dropset: null,
      });
    }

    return {
      id,
      prescribedExerciseId: id,
      performedExerciseId: null,
      column1Label: col1Label,
      column2Label: weight ? 'kg' : 'Optional',
      notes: null,
      supersetId,
      eachSide: false,
      tempo: null,
      alternatives: [],
      completed: completed ? 'completed' : 'not_started',
      sets: setsArr,
    };
  }

  private makeAmrapExercise(
    id: string,
    name: string,
    reps: number,
    weight: number | null,
    completed: boolean,
  ): any {
    return {
      id,
      prescribedExerciseId: id,
      performedExerciseId: null,
      column1Label: 'Reps',
      column2Label: weight ? 'kg' : 'Optional',
      notes: null,
      completed: completed ? 'completed' : 'not_started',
      eachSide: false,
      tempo: null,
      restSec: 0,
      alternatives: [],
      supersetId: null,
      trackableField1: {
        label: 'Reps',
        prescribed: String(reps),
        completed: completed ? String(reps) : null,
      },
      trackableField2: {
        label: weight ? 'kg' : 'Optional',
        prescribed: weight ? String(weight) : null,
        completed: completed && weight ? String(weight) : null,
      },
    };
  }

  private makeCircuitExercise(
    id: string,
    name: string,
    reps: number,
    weight: number | null,
    completed: boolean,
    col1Label: string = 'Reps',
    prescribedReps?: string,
  ): any {
    return {
      id,
      prescribedExerciseId: id,
      performedExerciseId: null,
      column1Label: col1Label,
      column2Label: weight ? 'kg' : 'Optional',
      notes: null,
      supersetId: null,
      eachSide: false,
      tempo: null,
      alternatives: [],
      completed: completed ? 'completed' : 'not_started',
      set: {
        setNumber: 1,
        type: 'normal',
        restSec: null,
        completed: completed ? 'completed' : 'not_started',
        skipped: false,
        trackableField1: {
          label: col1Label,
          prescribed: prescribedReps || String(reps),
          completed: completed ? (prescribedReps || String(reps)) : null,
        },
        trackableField2: {
          label: weight ? 'kg' : 'Optional',
          prescribed: weight ? String(weight) : null,
          completed: completed && weight ? String(weight) : null,
        },
        dropset: null,
      },
    };
  }

  // ─── Extract exercises for exercise history ───────────────────

  private extractExercises(workout: any, workoutId: string): { exerciseId: string; data: any }[] {
    const results: { exerciseId: string; data: any }[] = [];

    for (const item of workout.items) {
      if (item.itemType !== 'section') continue;
      const section = item.data;

      if (section.type === 'amrap') {
        // AMRAP exercises are flat
        for (const ex of section.exercises) {
          results.push({ exerciseId: ex.id, data: ex });
        }
      } else if (['tabata', 'hiit', 'emom', 'circuits'].includes(section.type)) {
        // Circuit-style: exercises in groups
        for (const group of section.exercises) {
          for (const ex of group.exercises) {
            results.push({ exerciseId: ex.id, data: ex });
          }
        }
      } else {
        // Regular / auxiliary: exercises in groups
        for (const group of section.exercises) {
          for (const ex of group.exercises) {
            results.push({ exerciseId: ex.id, data: ex });
          }
        }
      }
    }

    return results;
  }
}

// ─── Date helpers ──────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.round(days));
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function stripTime(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const demoDataService = new DemoDataService();
