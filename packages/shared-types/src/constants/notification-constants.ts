/**
 * Coach Notification Constants
 * Shared across all apps for consistent notification types.
 */

export const NOTIFICATION_TYPES = {
  // Training
  workout_completed: 'workout_completed',
  workout_missed: 'workout_missed',
  // Forms
  checkin_completed: 'checkin_completed',
  checkin_missed: 'checkin_missed',
  questionnaire_completed: 'questionnaire_completed',
  // Tracking
  metric_logged: 'metric_logged',
  metric_missed: 'metric_missed',
  habit_logged: 'habit_logged',
  habit_missed: 'habit_missed',
  photo_uploaded: 'photo_uploaded',
  // Profile
  client_connected: 'client_connected',
  goal_added: 'goal_added',
  goal_edited: 'goal_edited',
  goal_deleted: 'goal_deleted',
  injury_added: 'injury_added',
  injury_edited: 'injury_edited',
  injury_deleted: 'injury_deleted',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CATEGORIES = {
  training: [NOTIFICATION_TYPES.workout_completed, NOTIFICATION_TYPES.workout_missed],
  forms: [NOTIFICATION_TYPES.checkin_completed, NOTIFICATION_TYPES.checkin_missed, NOTIFICATION_TYPES.questionnaire_completed],
  tracking: [NOTIFICATION_TYPES.metric_logged, NOTIFICATION_TYPES.metric_missed, NOTIFICATION_TYPES.habit_logged, NOTIFICATION_TYPES.habit_missed, NOTIFICATION_TYPES.photo_uploaded],
  profile: [
    NOTIFICATION_TYPES.client_connected,
    NOTIFICATION_TYPES.goal_added,
    NOTIFICATION_TYPES.goal_edited,
    NOTIFICATION_TYPES.goal_deleted,
    NOTIFICATION_TYPES.injury_added,
    NOTIFICATION_TYPES.injury_edited,
    NOTIFICATION_TYPES.injury_deleted,
  ],
} as const;

export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  workout_completed: 'Workout completed',
  workout_missed: 'Workout missed',
  checkin_completed: 'Check-in completed',
  checkin_missed: 'Check-in missed',
  questionnaire_completed: 'Questionnaire completed',
  metric_logged: 'Metric logged',
  metric_missed: 'Metric log missed',
  habit_logged: 'Habit logged',
  habit_missed: 'Habit log missed',
  photo_uploaded: 'Progress photo uploaded',
  client_connected: 'Client connected',
  goal_added: 'Goal added',
  goal_edited: 'Goal updated',
  goal_deleted: 'Goal removed',
  injury_added: 'Injury added',
  injury_edited: 'Injury updated',
  injury_deleted: 'Injury removed',
};
