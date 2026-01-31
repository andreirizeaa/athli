/**
 * Client Data Seed
 * Generates test data for client private data, assignments, and logs
 *
 * The database has client assignment tables (client_metrics, client_habits, etc.)
 * which are copies of coach library items for each client.
 * Log tables reference assignment_id from these tables.
 */

import {
  TEST_PREFIX,
  randomInRange,
  randomFloatInRange,
  randomPick,
  getPastDates,
  formatDate,
} from './utils';

/**
 * Get client bio data
 * Schema: id, client_id, coach_id, bio, created_at, updated_at
 * Unique constraint on client_id only
 */
export function getClientBio(coachId: string, clientId: string, _clientName: string) {
  const bios = [
    'Motivated individual looking to build strength and improve overall fitness.',
    'Former athlete returning to fitness after a break. Ready to get back in shape.',
    'Busy professional seeking efficient workouts and sustainable nutrition habits.',
    'Fitness enthusiast aiming to take training to the next level.',
    'New to strength training, eager to learn proper form and build a solid foundation.',
  ];

  return {
    coach_id: coachId,
    client_id: clientId,
    bio: randomPick(bios),
  };
}

/**
 * Get client goals data (2-3 goals per client)
 * Schema: id, client_id, coach_id, goal (TEXT), target_date, achieved (BOOLEAN)
 */
export function getClientGoals(coachId: string, clientId: string) {
  const allGoals = [
    'Build 5kg of lean muscle mass over the next 6 months',
    'Reduce body fat percentage by 5%',
    'Increase squat, bench, and deadlift by 20%',
    'Follow meal plan consistently for 12 weeks',
    'Improve flexibility - touch toes and overall mobility',
    'Complete a 5K run without stopping',
    'Train consistently 4 times per week',
  ];

  const numGoals = randomInRange(2, 3);
  const selectedGoals = [];
  const shuffled = [...allGoals].sort(() => 0.5 - Math.random());

  for (let i = 0; i < numGoals; i++) {
    // Calculate target date 2-6 months from now
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + randomInRange(2, 6));

    selectedGoals.push({
      coach_id: coachId,
      client_id: clientId,
      goal: `${TEST_PREFIX} ${shuffled[i]}`,
      target_date: formatDate(targetDate),
      achieved: Math.random() < 0.2, // 20% chance of being achieved
    });
  }

  return selectedGoals;
}

/**
 * Get client injuries data (0-2 injuries per client)
 * Schema: id, client_id, coach_id, injury (TEXT), status, date
 * Note: status column may have been removed in migration 065
 */
export function getClientInjuries(coachId: string, clientId: string) {
  const allInjuries = [
    'Lower back pain - occasional discomfort, avoid heavy deadlifts',
    'Left shoulder impingement - clicks during overhead movements',
    'Previous ACL tear - fully recovered but cautious',
    'Slight wrist strain during pressing movements',
  ];

  const numInjuries = randomInRange(0, 2);
  const selectedInjuries = [];
  const shuffled = [...allInjuries].sort(() => 0.5 - Math.random());

  for (let i = 0; i < numInjuries; i++) {
    // Injury date 1-12 months ago
    const injuryDate = new Date();
    injuryDate.setMonth(injuryDate.getMonth() - randomInRange(1, 12));

    selectedInjuries.push({
      coach_id: coachId,
      client_id: clientId,
      injury: `${TEST_PREFIX} ${shuffled[i]}`,
      date: formatDate(injuryDate),
    });
  }

  return selectedInjuries;
}

/**
 * Get client notes data (2-3 notes per client)
 * Schema: id, client_id, coach_id, title (TEXT), body (TEXT), is_pinned, created_at, updated_at
 */
export function getClientNotes(coachId: string, clientId: string) {
  const allNotes = [
    { title: 'Initial Assessment', body: 'Client shows good mobility but needs work on core stability. Recommended starting with foundation program.' },
    { title: 'Progress Update', body: 'Great progress in the first month. Strength is improving and client is showing good consistency.' },
    { title: 'Nutrition Discussion', body: 'Discussed meal prep strategies. Client will focus on increasing protein intake.' },
    { title: 'Form Check', body: 'Reviewed squat form. Cue to push knees out and maintain upright torso.' },
    { title: 'Program Adjustment', body: 'Added extra rest day due to work stress. Will reassess next week.' },
    { title: 'Goal Review', body: 'Mid-program check-in. On track for weight loss goal, strength progressing well.' },
  ];

  const numNotes = randomInRange(2, 3);
  const selectedNotes = [];
  const shuffled = [...allNotes].sort(() => 0.5 - Math.random());

  for (let i = 0; i < numNotes; i++) {
    selectedNotes.push({
      coach_id: coachId,
      client_id: clientId,
      title: `${TEST_PREFIX} ${shuffled[i].title}`,
      body: shuffled[i].body,
      is_pinned: i === 0, // First note is pinned
    });
  }

  return selectedNotes;
}

/**
 * Get client metric logs for past 30 days
 * Direct insert to client_metric_logs table
 * Schema: id, coach_id, client_id, metric_id, value, recorded_date, created_at
 */
export function getClientMetricLogs(
  coachId: string,
  clientId: string,
  metricIds: string[]
) {
  const logs: any[] = [];
  const dates = getPastDates(30);

  for (const metricId of metricIds) {
    // Log every 3-5 days for each metric
    const interval = randomInRange(3, 5);
    const logDates = dates.filter((_, i) => i % interval === 0);

    for (const date of logDates) {
      logs.push({
        coach_id: coachId,
        client_id: clientId,
        metric_id: metricId,
        value: randomFloatInRange(60, 100, 1),
        recorded_date: date,
      });
    }
  }

  return logs;
}

/**
 * Get client habit logs for past 30 days
 * Direct insert to client_habit_logs table
 * Schema: id, coach_id, client_id, habit_id, completed, value, recorded_date, created_at
 */
export function getClientHabitLogs(
  coachId: string,
  clientId: string,
  habitIds: string[]
) {
  const logs: any[] = [];
  const dates = getPastDates(30);

  for (const habitId of habitIds) {
    for (const date of dates) {
      // 70% completion rate
      if (Math.random() < 0.7) {
        logs.push({
          coach_id: coachId,
          client_id: clientId,
          habit_id: habitId,
          completed: true,
          value: randomInRange(1, 10),
          recorded_date: date,
        });
      }
    }
  }

  return logs;
}

/**
 * Get client check-in logs (4 weekly check-ins)
 * Schema: id, coach_id, client_id, checkin_id, response_data, submission_date, created_at
 */
export function getClientCheckInLogs(
  coachId: string,
  clientId: string,
  checkInIds: string[]
) {
  const logs: any[] = [];
  const today = new Date();

  for (const checkInId of checkInIds) {
    // Create 4 weekly submissions
    for (let week = 1; week <= 4; week++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (week * 7));

      logs.push({
        coach_id: coachId,
        client_id: clientId,
        checkin_id: checkInId,
        response_data: {
          q1: randomInRange(5, 10),
          q2: randomInRange(6, 10),
          q3: 'Had some great workouts this week!',
          q4: 'Struggled with nutrition on the weekend.',
          q5: randomInRange(7, 10),
        },
        submission_date: formatDate(date),
      });
    }
  }

  return logs;
}

/**
 * Get client questionnaire logs (completed onboarding)
 * Schema: id, coach_id, client_id, questionnaire_id, response_data, submission_date, created_at
 */
export function getClientQuestionnaireLogs(
  coachId: string,
  clientId: string,
  questionnaireIds: string[]
) {
  const logs: any[] = [];
  const today = new Date();
  const submissionDate = new Date(today);
  submissionDate.setDate(submissionDate.getDate() - 30);

  // Only submit the first questionnaire (onboarding)
  if (questionnaireIds.length > 0) {
    logs.push({
      coach_id: coachId,
      client_id: clientId,
      questionnaire_id: questionnaireIds[0],
      response_data: {
        q1: 'Build muscle and improve overall fitness',
        q2: '4',
        q3: ['Gym', 'Dumbbells', 'Barbell'],
        q4: 'Minor lower back tightness occasionally',
        q5: 'Intermediate',
      },
      submission_date: formatDate(submissionDate),
    });
  }

  return logs;
}

/**
 * Get client photo logs (4 progress photos)
 * Schema: id, client_id, coach_id, date, front_photo_path, side_photo_path, back_photo_path
 * Uses shared placeholder paths that all clients can reference
 */
export function getClientPhotoLogs(coachId: string, clientId: string) {
  const logs: any[] = [];
  const today = new Date();

  // Shared placeholder photo paths (would be real storage paths in production)
  const mockPhotoPath = 'shared/placeholder-progress-photo.jpg';

  // Create 4 photo entries, one per week for the past month
  for (let week = 1; week <= 4; week++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (week * 7));

    logs.push({
      coach_id: coachId,
      client_id: clientId,
      date: formatDate(date),
      front_photo_path: mockPhotoPath,
      side_photo_path: mockPhotoPath,
      back_photo_path: mockPhotoPath,
    });
  }

  return logs;
}

// ============================================
// Client Assignments (copies of coach library items)
// These create entries in client_* tables that reference coach templates
// ============================================

/**
 * Get client metric assignments - copies coach metrics to client
 * Schema: id, client_id, coach_id, name, unit, description, value_kind, min_value, max_value, cron_expression, schedule_config
 */
export function getClientMetricAssignments(
  coachId: string,
  clientId: string,
  coachMetrics: Array<{ id: string; name: string; unit?: string; description?: string; value_kind?: string }>
) {
  return coachMetrics.map(metric => ({
    coach_id: coachId,
    client_id: clientId,
    name: metric.name,
    unit: metric.unit || null,
    description: metric.description || null,
    value_kind: metric.value_kind || 'number',
    min_value: null,
    max_value: null,
    cron_expression: null,
    schedule_config: {},
  }));
}

/**
 * Get client habit assignments - copies coach habits to client
 * Schema: id, client_id, coach_id, name, description, amount, unit, period, schedule_type, days_of_week, etc.
 */
export function getClientHabitAssignments(
  coachId: string,
  clientId: string,
  coachHabits: Array<{ id: string; name: string; description?: string; amount?: number; unit?: string; period?: string }>
) {
  return coachHabits.map(habit => ({
    coach_id: coachId,
    client_id: clientId,
    name: habit.name,
    description: habit.description || null,
    amount: habit.amount || null,
    unit: habit.unit || null,
    period: habit.period || 'daily',
    schedule_type: 'daily',
    days_of_week: null,
    times_of_day: null,
    timezone: 'UTC',
    start_date: null,
  }));
}

/**
 * Get client check-in assignments - copies coach check-ins to client
 * Schema: id, client_id, coach_id, name, description, questions, schedule_config, cron_expression
 */
export function getClientCheckInAssignments(
  coachId: string,
  clientId: string,
  coachCheckIns: Array<{ id: string; name: string; description?: string; questions?: any[] }>
) {
  return coachCheckIns.map(checkIn => ({
    coach_id: coachId,
    client_id: clientId,
    name: checkIn.name,
    description: checkIn.description || null,
    questions: checkIn.questions || [],
    schedule_config: null,
    cron_expression: null,
  }));
}

/**
 * Get client questionnaire assignments - copies coach questionnaires to client
 * Schema: id, client_id, coach_id, name, description, questions
 */
export function getClientQuestionnaireAssignments(
  coachId: string,
  clientId: string,
  coachQuestionnaires: Array<{ id: string; name: string; description?: string; questions?: any[] }>
) {
  return coachQuestionnaires.map(questionnaire => ({
    coach_id: coachId,
    client_id: clientId,
    name: questionnaire.name,
    description: questionnaire.description || null,
    questions: questionnaire.questions || [],
  }));
}

// ============================================
// Client Logs with Assignment IDs
// These create log entries that reference client assignments
// ============================================

/**
 * Get client metric logs using assignment IDs
 * Schema: id, client_id, coach_id, assignment_id, value, date
 */
export function getClientMetricLogsWithAssignments(
  coachId: string,
  clientId: string,
  assignmentIds: string[]
) {
  const logs: any[] = [];
  const dates = getPastDates(30);

  for (const assignmentId of assignmentIds) {
    // Log every 3-5 days for each metric
    const interval = randomInRange(3, 5);
    const logDates = dates.filter((_, i) => i % interval === 0);

    for (const date of logDates) {
      logs.push({
        coach_id: coachId,
        client_id: clientId,
        assignment_id: assignmentId,
        value: randomFloatInRange(60, 100, 1),
        date,
      });
    }
  }

  return logs;
}

/**
 * Get client habit logs using assignment IDs
 * Schema: id, client_id, coach_id, assignment_id, date, completed, value, status
 */
export function getClientHabitLogsWithAssignments(
  coachId: string,
  clientId: string,
  assignmentIds: string[]
) {
  const logs: any[] = [];
  const dates = getPastDates(30);

  for (const assignmentId of assignmentIds) {
    for (const date of dates) {
      // 70% completion rate
      const completed = Math.random() < 0.7;
      if (completed) {
        logs.push({
          coach_id: coachId,
          client_id: clientId,
          assignment_id: assignmentId,
          date,
          completed: true,
          value: randomInRange(1, 10),
          status: 'completed',
        });
      }
    }
  }

  return logs;
}

/**
 * Get client check-in logs using assignment IDs
 * Schema: id, client_id, coach_id, assignment_id, submission_date, answers, status, coach_comment, reviewed_at
 */
export function getClientCheckInLogsWithAssignments(
  coachId: string,
  clientId: string,
  assignmentIds: string[]
) {
  const logs: any[] = [];
  const today = new Date();

  for (const assignmentId of assignmentIds) {
    // Create 4 weekly submissions for each check-in
    for (let week = 1; week <= 4; week++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (week * 7));

      // Determine status - older ones are reviewed, recent ones are in review
      const status = week > 2 ? 'reviewed' : 'review';
      const reviewed = status === 'reviewed';

      logs.push({
        coach_id: coachId,
        client_id: clientId,
        assignment_id: assignmentId,
        submission_date: formatDate(date),
        answers: {
          q1: randomInRange(5, 10),
          q2: randomInRange(6, 10),
          q3: randomPick([
            'Had some great workouts this week!',
            'Feeling stronger every day.',
            'Making progress on my goals.',
            'Pushed through a tough week.',
          ]),
          q4: randomPick([
            'Struggled with nutrition on the weekend.',
            'Need to focus more on sleep.',
            'Work stress is high right now.',
            null,
          ]),
          q5: randomInRange(7, 10),
        },
        status,
        coach_comment: reviewed ? 'Great progress! Keep up the good work.' : null,
        reviewed_at: reviewed ? new Date(date.getTime() + 86400000).toISOString() : null,
      });
    }
  }

  return logs;
}

/**
 * Get client questionnaire logs using assignment IDs
 * Schema: id, client_id, coach_id, assignment_id, submission_date, answers, status
 */
export function getClientQuestionnaireLogsWithAssignments(
  coachId: string,
  clientId: string,
  assignmentIds: string[]
) {
  const logs: any[] = [];
  const today = new Date();
  const submissionDate = new Date(today);
  submissionDate.setDate(submissionDate.getDate() - 30);

  // Create one completed submission for each questionnaire
  for (const assignmentId of assignmentIds) {
    logs.push({
      coach_id: coachId,
      client_id: clientId,
      assignment_id: assignmentId,
      submission_date: formatDate(submissionDate),
      answers: {
        q1: 'Build muscle and improve overall fitness',
        q2: '4',
        q3: ['Gym', 'Dumbbells', 'Barbell'],
        q4: randomPick([
          'Minor lower back tightness occasionally',
          'Previous shoulder injury, fully healed',
          'No current injuries',
          'Knee discomfort after long runs',
        ]),
        q5: randomPick(['Beginner', 'Intermediate', 'Advanced']),
      },
      status: 'completed',
    });
  }

  return logs;
}
