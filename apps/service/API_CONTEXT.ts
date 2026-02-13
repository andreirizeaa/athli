/**
 * ATHLI SERVICE API CONTEXT
 * For AI model consumption - compact reference of all endpoints, inputs, and database tables
 */

// ============================================================================
// DATABASE TABLES
// ============================================================================

type Tables = {
  // User & Auth
  user_profiles: 'id mod_by name email profile_picture_url timezone'

  // Coach
  coach_profiles: 'id user_id onboarding_completed'
  coach_profiles_full: 'view joining user_profiles + coach data'
  coach_client_assignments: 'id coach_id client_id status archived invitation_token'
  coach_unique_codes: 'id coach_id code'
  coach_company_information: 'id coach_id name logo address phone'
  coach_preferences: 'id coach_id preferences_json'
  coach_notification_preferences: 'id coach_id email_* push_* settings'
  coach_push_tokens: 'id coach_id token platform'
  coach_getting_started_checklist: 'id coach_id step completed'

  // Coach Content
  coach_exercises: 'id coach_id name description instructions muscle_groups equipment video_url is_favorite'
  coach_workouts: 'id coach_id title description type equipment difficulty workout_data total_exercises is_favorite'
  coach_sections: 'id coach_id name description section_data is_favorite'
  coach_programs: 'id coach_id name description program_data duration_weeks is_favorite'
  coach_habits: 'id coach_id folder_id name description icon color frequency'
  coach_habit_folders: 'id coach_id name'
  coach_metrics: 'id coach_id folder_id name description unit icon'
  coach_metric_folders: 'id coach_id name'
  coach_files: 'id coach_id folder_id bucket_id file_path filename mime_type size'
  coach_file_folders: 'id coach_id name'
  coach_checkins: 'id coach_id name description frequency questions'
  coach_checkins_review_view: 'view of checkins pending review'
  coach_questionnaires: 'id coach_id name description questions'
  coach_flows: 'id coach_id name description trigger actions is_active'
  coach_onboardings: 'id coach_id name description steps'
  coach_sequences: 'id coach_id name description items'
  coach_own_todolist: 'id coach_id title description due_date priority completed'
  coach_auto_todolist: 'id coach_id type title description client_id'
  coach_notifications: 'id coach_id type title body read_at data'

  // Client
  client_profiles: 'id user_id coach_id bio preferences'
  client_profiles_full: 'view joining user_profiles + client data'
  client_bio: 'id client_id bio'
  client_goals: 'id client_id title description completed'
  client_injuries: 'id client_id name description status'
  client_habits: 'id client_id habit_id assigned_at'
  client_habit_logs: 'id client_habit_id date completed'
  client_metrics: 'id client_id metric_id assigned_at'
  client_metric_logs: 'id client_metric_id date value'
  client_checkins: 'id client_id checkin_id assigned_at'
  client_checkin_logs: 'id client_checkin_id date responses'
  client_questionnaires: 'id client_id questionnaire_id responses submitted_at'
  client_photos: 'id client_id category file_path'
  client_photo_logs: 'id client_photo_id date'
  client_files: 'id client_id file_id shared_at'
  client_notes: 'id client_id coach_id content'
  client_tasks: 'id client_id title completed'
  client_training: 'id client_id date workout_data status'
  client_training_history: 'id client_id date status summary'
  client_training_exercise_history: 'id client_id exercise_id sets reps weight date'
  client_workout_assignments: 'id client_id workout_id date'
  client_push_tokens: 'id client_id token platform'

  // Messaging
  conversations: 'id created_at updated_at'
  conversation_participants: 'id conversation_id user_id is_archived is_muted is_pinned last_read_at'
  messages: 'id conversation_id sender_id content parent_id created_at is_ready'
  message_attachments: 'id message_id file_url file_type'
  message_reactions: 'id message_id user_id emoji'
  message_read_receipts: 'id message_id user_id read_at'

  // Platform Billing (Athli SaaS)
  platform_subscriptions: 'id coach_id stripe_customer_id stripe_subscription_id plan_type client_limit billing_interval status current_price_cents'
  platform_addons: 'id coach_id addon_type stripe_subscription_item_id is_active price_cents'
  platform_billing_activity: 'id coach_id event_type description amount_cents'
  coach_entitlements: 'id coach_id plan_type client_limit has_* feature flags'
  stripe_webhook_events: 'id type payload processed_at'

  // Coach Payments (coach sells to clients)
  coach_stripe_accounts: 'id coach_id stripe_account_id onboarding_complete'
  coach_packages: 'id coach_id name description price interval features onboarding_id sequence_id is_active'
  coach_coupons: 'id coach_id code percent_off amount_off max_redemptions'
  client_package_assignments: 'id client_id package_id assigned_at'
  client_subscriptions: 'id client_id package_id stripe_subscription_id status'
  payments: 'id client_id package_id amount status'
  billing_activity: 'id coach_id client_id event_type amount'

  // External
  musclewiki_exercise_cache: 'id name muscle equipment difficulty category images videos'
  exercise_videos: 'id exercise_id url'
  feature_requests: 'id user_id title description upvote_count'
  feature_request_upvotes: 'id feature_request_id user_id'
  feature_request_replies: 'id feature_request_id user_id content'
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

type API = {
  // ---------------------------------------------------------------------------
  // AUTH /api/v1/auth
  // ---------------------------------------------------------------------------
  'POST /auth/register': { body: { email: string, password: string, name: string }, tables: ['user_profiles'], desc: 'Register new user' }
  'POST /auth/login': { body: { email: string, password: string }, tables: ['user_profiles'], desc: 'Login' }
  'POST /auth/verify-email': { body: { email: string, otp: string }, tables: ['user_profiles'], desc: 'Verify email with 8-digit OTP' }
  'POST /auth/resend-otp': { body: { email: string }, desc: 'Resend OTP' }
  'POST /auth/forgot-password': { body: { email: string }, desc: 'Request password reset' }
  'POST /auth/reset-password': { body: { email: string, otp: string, newPassword: string }, tables: ['user_profiles'], desc: 'Reset password' }
  'POST /auth/check-auth-provider': { body: { email: string }, tables: ['user_profiles'], desc: 'Check if OAuth or password' }
  'POST /auth/google': { body: { credential: string }, tables: ['user_profiles', 'coach_profiles'], desc: 'Google OAuth' }
  'POST /auth/logout': { desc: 'Logout' }
  'POST /auth/send-security-otp': { body: { email: string }, desc: 'Send OTP for sensitive action' }
  'POST /auth/verify-security-otp': { body: { email: string, otp: string }, desc: 'Verify security OTP' }

  // Coach Auth
  'POST /auth/coach/register': { body: { email: string, password: string, name: string }, tables: ['user_profiles', 'coach_profiles'], desc: 'Register as coach' }
  'POST /auth/coach/google': { body: { credential: string }, tables: ['user_profiles', 'coach_profiles'], desc: 'Google OAuth for coach' }

  // Client Auth
  'GET /auth/client/invite/:code': { params: { code: string }, tables: ['coach_unique_codes', 'coach_profiles_full'], desc: 'Get coach info by invite code (public)' }
  'POST /auth/client/accept-invite': { body: { inviteCode: string, email: string, password: string, name: string }, tables: ['user_profiles', 'client_profiles', 'coach_client_assignments'], desc: 'Accept invite create account' }
  'POST /auth/client/verify': { body: { email: string }, tables: ['client_profiles'], desc: 'Check if email is existing client' }

  // ---------------------------------------------------------------------------
  // USER /api/v1/user
  // ---------------------------------------------------------------------------
  'GET /user/me': { tables: ['user_profiles'], desc: 'Get current user' }
  'PATCH /user/me': { body: { name?: string, profilePictureUrl?: string, timezone?: string }, tables: ['user_profiles'], desc: 'Update profile' }
  'POST /user/ensure-client-profile': { body: { coachId: string }, tables: ['client_profiles'], desc: 'Create client profile if needed' }
  'POST /user/ensure-coach-profile': { tables: ['coach_profiles'], desc: 'Create coach profile if needed' }
  'GET /user/fetch/:id': { params: { id: string }, tables: ['user_profiles'], desc: 'Get public profile' }
  'DELETE /user/delete-account': { tables: ['user_profiles'], desc: 'Delete account' }
  'POST /user/new-client': { body: { coachId: string, invitationToken?: string, onboardingId?: string }, tables: ['client_profiles', 'coach_client_assignments'], desc: 'New client signup' }
  'POST /user/seed-demo-data': { tables: ['coach_*'], desc: 'Seed demo data for new coach' }

  // ---------------------------------------------------------------------------
  // COACH TRAINING /api/v1/coach/training
  // ---------------------------------------------------------------------------
  // Exercises
  'GET /coach/training/exercises': { tables: ['coach_exercises'], desc: 'Get all exercises' }
  'POST /coach/training/exercises': { body: { name: string, description?: string, instructions?: string, muscle_groups?: string[], equipment?: string[], video_url?: string }, tables: ['coach_exercises'], desc: 'Create exercise' }
  'GET /coach/training/exercises/:id': { tables: ['coach_exercises'], desc: 'Get exercise' }
  'PATCH /coach/training/exercises/:id': { body: { name?: string, description?: string, instructions?: string, muscle_groups?: string[], equipment?: string[] }, tables: ['coach_exercises'], desc: 'Update exercise' }
  'DELETE /coach/training/exercises/:id': { tables: ['coach_exercises'], desc: 'Delete exercise' }
  'POST /coach/training/exercises/:id/duplicate': { tables: ['coach_exercises'], desc: 'Duplicate exercise' }
  'PATCH /coach/training/exercises/:id/toggle-favorite': { tables: ['coach_exercises'], desc: 'Toggle favorite' }
  'POST /coach/training/exercises/upload-video': { body: 'multipart: file', tables: ['coach_exercises'], storage: 'exercise-videos', desc: 'Upload video' }

  // Workouts
  'GET /coach/training/workouts': { tables: ['coach_workouts'], desc: 'Get all workouts' }
  'POST /coach/training/workouts': { body: { title: string, description?: string, type?: string, equipment?: string, difficulty?: string, workout_data: object, total_exercises?: number }, tables: ['coach_workouts'], desc: 'Create workout' }
  'POST /coach/training/workouts/bulk': { body: { ids: string[] }, tables: ['coach_workouts'], desc: 'Get workouts by IDs' }
  'GET /coach/training/workouts/:id': { tables: ['coach_workouts'], desc: 'Get workout' }
  'PATCH /coach/training/workouts/:id': { body: { title?: string, description?: string, workout_data?: object }, tables: ['coach_workouts'], desc: 'Update workout' }
  'DELETE /coach/training/workouts/:id': { tables: ['coach_workouts'], desc: 'Delete workout' }
  'POST /coach/training/workouts/:id/duplicate': { tables: ['coach_workouts'], desc: 'Duplicate workout' }
  'POST /coach/training/workouts/toggle-favorite': { body: { id: string }, tables: ['coach_workouts'], desc: 'Toggle favorite' }

  // Sections
  'GET /coach/training/sections': { tables: ['coach_sections'], desc: 'Get all sections' }
  'POST /coach/training/sections': { body: { name: string, description?: string, section_data: object }, tables: ['coach_sections'], desc: 'Create section' }
  'POST /coach/training/sections/bulk': { body: { ids: string[] }, tables: ['coach_sections'], desc: 'Get by IDs' }
  'GET /coach/training/sections/:id': { tables: ['coach_sections'], desc: 'Get section' }
  'PATCH /coach/training/sections/:id': { tables: ['coach_sections'], desc: 'Update section' }
  'DELETE /coach/training/sections/:id': { tables: ['coach_sections'], desc: 'Delete section' }
  'POST /coach/training/sections/:id/duplicate': { tables: ['coach_sections'], desc: 'Duplicate' }
  'POST /coach/training/sections/toggle-favorite': { body: { id: string }, tables: ['coach_sections'], desc: 'Toggle favorite' }

  // Programs
  'GET /coach/training/programs': { tables: ['coach_programs'], desc: 'Get all programs' }
  'POST /coach/training/programs': { body: { name: string, description?: string, program_data: object, duration_weeks?: number }, tables: ['coach_programs'], desc: 'Create program' }
  'GET /coach/training/programs/:id': { tables: ['coach_programs'], desc: 'Get program' }
  'PATCH /coach/training/programs/:id': { tables: ['coach_programs'], desc: 'Update program' }
  'DELETE /coach/training/programs/:id': { tables: ['coach_programs'], desc: 'Delete program' }
  'POST /coach/training/programs/:id/duplicate': { tables: ['coach_programs'], desc: 'Duplicate' }
  'PATCH /coach/training/programs/:id/toggle-favorite': { tables: ['coach_programs'], desc: 'Toggle favorite' }

  // ---------------------------------------------------------------------------
  // COACH FORMS /api/v1/coach/forms
  // ---------------------------------------------------------------------------
  // Check-ins
  'GET /coach/forms/check-ins': { tables: ['coach_checkins'], desc: 'Get check-in templates' }
  'GET /coach/forms/check-ins/reviews': { tables: ['coach_checkins_review_view'], desc: 'Get pending reviews' }
  'GET /coach/forms/check-ins/:id': { tables: ['coach_checkins'], desc: 'Get check-in' }
  'POST /coach/forms/check-ins': { body: { name: string, description?: string, frequency?: string, questions: object[] }, tables: ['coach_checkins'], desc: 'Create check-in' }
  'PATCH /coach/forms/check-ins/:id': { tables: ['coach_checkins'], desc: 'Update check-in' }
  'DELETE /coach/forms/check-ins/:id': { tables: ['coach_checkins'], desc: 'Delete check-in' }

  // Questionnaires
  'GET /coach/forms/questionnaires': { tables: ['coach_questionnaires'], desc: 'Get questionnaires' }
  'GET /coach/forms/questionnaires/:id': { tables: ['coach_questionnaires'], desc: 'Get questionnaire' }
  'POST /coach/forms/questionnaires': { body: { name: string, description?: string, questions: object[] }, tables: ['coach_questionnaires'], desc: 'Create questionnaire' }
  'PATCH /coach/forms/questionnaires/:id': { tables: ['coach_questionnaires'], desc: 'Update questionnaire' }
  'DELETE /coach/forms/questionnaires/:id': { tables: ['coach_questionnaires'], desc: 'Delete questionnaire' }
  'POST /coach/forms/questionnaires/:id/duplicate': { tables: ['coach_questionnaires'], desc: 'Duplicate' }

  // ---------------------------------------------------------------------------
  // COACH FILES /api/v1/coach/files
  // ---------------------------------------------------------------------------
  'GET /coach/files': { tables: ['coach_files'], desc: 'Get all files' }
  'POST /coach/files': { body: 'multipart: file, filename, tags?', tables: ['coach_files'], storage: 'coach_files', desc: 'Upload file (50MB max)' }
  'POST /coach/files/link': { body: { filename: string, url: string }, tables: ['coach_files'], desc: 'Create external link' }
  'GET /coach/files/:id/url': { tables: ['coach_files'], desc: 'Get signed URL' }
  'PATCH /coach/files/:id/move': { body: { folder_id: string | null }, tables: ['coach_files'], desc: 'Move to folder' }
  'PATCH /coach/files/:id': { body: { filename: string }, tables: ['coach_files'], desc: 'Update file' }
  'DELETE /coach/files/:id': { tables: ['coach_files'], storage: 'coach_files', desc: 'Delete file' }
  'GET /coach/files/folders': { tables: ['coach_file_folders'], desc: 'Get folders' }
  'POST /coach/files/folders': { body: { name: string }, tables: ['coach_file_folders'], desc: 'Create folder' }
  'PATCH /coach/files/folders/:id': { body: { name: string }, tables: ['coach_file_folders'], desc: 'Update folder' }
  'DELETE /coach/files/folders/:id': { tables: ['coach_file_folders', 'coach_files'], desc: 'Delete folder (files unfiled)' }
  'GET /coach/files/folders/:id/files': { tables: ['coach_files'], desc: 'Get files in folder' }

  // ---------------------------------------------------------------------------
  // COACH HABITS /api/v1/coach/habits
  // ---------------------------------------------------------------------------
  'GET /coach/habits': { tables: ['coach_habits'], desc: 'Get all habits' }
  'POST /coach/habits': { body: { name: string, description?: string, icon?: string, color?: string, frequency?: string }, tables: ['coach_habits'], desc: 'Create habit' }
  'POST /coach/habits/:id/duplicate': { tables: ['coach_habits'], desc: 'Duplicate' }
  'PATCH /coach/habits/:id': { tables: ['coach_habits'], desc: 'Update habit' }
  'DELETE /coach/habits/:id': { tables: ['coach_habits'], desc: 'Delete habit' }
  'GET /coach/habits/folders': { tables: ['coach_habit_folders'], desc: 'Get folders' }
  'POST /coach/habits/folders': { body: { name: string }, tables: ['coach_habit_folders'], desc: 'Create folder' }
  'PATCH /coach/habits/folders/:id': { tables: ['coach_habit_folders'], desc: 'Update folder' }
  'DELETE /coach/habits/folders/:id': { tables: ['coach_habit_folders'], desc: 'Delete folder' }

  // ---------------------------------------------------------------------------
  // COACH METRICS /api/v1/coach/metrics
  // ---------------------------------------------------------------------------
  'GET /coach/metrics': { tables: ['coach_metrics'], desc: 'Get all metrics' }
  'POST /coach/metrics': { body: { name: string, description?: string, unit?: string, icon?: string }, tables: ['coach_metrics'], desc: 'Create metric' }
  'POST /coach/metrics/:id/duplicate': { tables: ['coach_metrics'], desc: 'Duplicate' }
  'PATCH /coach/metrics/:id/move': { body: { folder_id: string | null }, tables: ['coach_metrics'], desc: 'Move to folder' }
  'PATCH /coach/metrics/:id': { tables: ['coach_metrics'], desc: 'Update metric' }
  'DELETE /coach/metrics/:id': { tables: ['coach_metrics'], desc: 'Delete metric' }
  'GET /coach/metrics/folders': { tables: ['coach_metric_folders'], desc: 'Get folders' }
  'POST /coach/metrics/folders': { body: { name: string }, tables: ['coach_metric_folders'], desc: 'Create folder' }
  'PATCH /coach/metrics/folders/:id': { tables: ['coach_metric_folders'], desc: 'Update folder' }
  'DELETE /coach/metrics/folders/:id': { tables: ['coach_metric_folders'], desc: 'Delete folder' }

  // ---------------------------------------------------------------------------
  // COACH FLOWS/ONBOARDINGS/SEQUENCES /api/v1/coach
  // ---------------------------------------------------------------------------
  'GET /coach/flows': { tables: ['coach_flows'], desc: 'Get automation flows' }
  'GET /coach/flows/:id': { tables: ['coach_flows'], desc: 'Get flow' }
  'POST /coach/flows': { body: { name: string, description?: string, trigger?: string, actions: object[] }, tables: ['coach_flows'], desc: 'Create flow' }
  'PATCH /coach/flows/:id': { tables: ['coach_flows'], desc: 'Update flow' }
  'DELETE /coach/flows/:id': { tables: ['coach_flows'], desc: 'Delete flow' }

  'GET /coach/onboardings': { tables: ['coach_onboardings'], desc: 'Get onboardings' }
  'GET /coach/onboardings/:id': { tables: ['coach_onboardings'], desc: 'Get onboarding' }
  'POST /coach/onboardings': { body: { name: string, description?: string, steps: object[] }, tables: ['coach_onboardings'], desc: 'Create onboarding' }
  'PATCH /coach/onboardings/:id': { tables: ['coach_onboardings'], desc: 'Update onboarding' }
  'DELETE /coach/onboardings/:id': { tables: ['coach_onboardings'], desc: 'Delete onboarding' }

  'GET /coach/sequences': { tables: ['coach_sequences'], desc: 'Get sequences' }
  'GET /coach/sequences/:id': { tables: ['coach_sequences'], desc: 'Get sequence' }
  'POST /coach/sequences': { body: { name: string, description?: string, items: object[] }, tables: ['coach_sequences'], desc: 'Create sequence' }
  'PATCH /coach/sequences/:id': { tables: ['coach_sequences'], desc: 'Update sequence' }
  'DELETE /coach/sequences/:id': { tables: ['coach_sequences'], desc: 'Delete sequence' }

  // ---------------------------------------------------------------------------
  // COACH TODO /api/v1/coach/todo
  // ---------------------------------------------------------------------------
  'GET /coach/todo/own': { tables: ['coach_own_todolist'], desc: 'Get own todos' }
  'POST /coach/todo/own': { body: { title: string, description?: string, due_date?: string, priority?: string }, tables: ['coach_own_todolist'], desc: 'Create todo' }
  'PATCH /coach/todo/own/:id': { body: { title?: string, completed?: boolean }, tables: ['coach_own_todolist'], desc: 'Update todo' }
  'DELETE /coach/todo/own/:id': { tables: ['coach_own_todolist'], desc: 'Delete todo' }
  'GET /coach/todo/auto': { tables: ['coach_auto_todolist'], desc: 'Get auto todos' }
  'DELETE /coach/todo/auto/:id': { tables: ['coach_auto_todolist'], desc: 'Dismiss auto todo' }

  // ---------------------------------------------------------------------------
  // COACH MESSAGING /api/v1/coach/messaging
  // ---------------------------------------------------------------------------
  'POST /coach/messaging/conversations': { body: { includeArchived?: boolean }, tables: ['conversations', 'conversation_participants'], desc: 'Get conversations' }
  'GET /coach/messaging/conversations/:id/messages': { query: { limit?: number, before?: string }, tables: ['messages', 'message_attachments'], desc: 'Get messages' }
  'POST /coach/messaging/messages': { body: { conversationId: string, content: string, parentId?: string, attachments?: object[] }, tables: ['messages', 'message_attachments'], desc: 'Send message' }
  'POST /coach/messaging/messages/:id/ready': { tables: ['messages'], desc: 'Mark message ready' }
  'DELETE /coach/messaging/messages/:id': { tables: ['messages'], desc: 'Delete message' }
  'POST /coach/messaging/reactions': { body: { messageId: string, emoji: string }, tables: ['message_reactions'], desc: 'Add reaction' }
  'DELETE /coach/messaging/reactions/:messageId': { tables: ['message_reactions'], desc: 'Remove reaction' }
  'POST /coach/messaging/conversations/:id/read': { tables: ['message_read_receipts'], desc: 'Mark read' }
  'POST /coach/messaging/conversations/:id/archive': { tables: ['conversation_participants'], desc: 'Archive' }
  'POST /coach/messaging/conversations/:id/unarchive': { tables: ['conversation_participants'], desc: 'Unarchive' }
  'POST /coach/messaging/conversations/:id/pin': { tables: ['conversation_participants'], desc: 'Pin' }
  'POST /coach/messaging/conversations/:id/unpin': { tables: ['conversation_participants'], desc: 'Unpin' }
  'POST /coach/messaging/conversations/:id/mute': { tables: ['conversation_participants'], desc: 'Mute' }
  'POST /coach/messaging/conversations/:id/unmute': { tables: ['conversation_participants'], desc: 'Unmute' }
  'POST /coach/messaging/broadcast': { body: { clientIds: string[], content: string }, tables: ['messages', 'conversations'], desc: 'Broadcast to clients' }

  // ---------------------------------------------------------------------------
  // COACH INVITE CODES & PUBLIC /api/v1/coach
  // ---------------------------------------------------------------------------
  'GET /coach/invite-codes': { tables: ['coach_unique_codes'], desc: 'Get invite codes' }
  'POST /coach/invite-codes': { tables: ['coach_unique_codes'], desc: 'Get or create code' }
  'GET /coach/by-code/:code': { tables: ['coach_unique_codes', 'coach_profiles_full'], desc: 'Get coach by code (public)' }
  'GET /coach/code-by-id/:coachId': { tables: ['coach_unique_codes'], desc: 'Get code by coach ID (public)' }

  // ---------------------------------------------------------------------------
  // CLIENTS (coach managing clients) /api/v1/clients
  // ---------------------------------------------------------------------------
  'GET /clients': { tables: ['coach_clients_view', 'coach_client_assignments'], desc: 'Get all clients' }
  'POST /clients/new': { body: { clients: Array<{ email: string, name: string }> }, tables: ['user_profiles', 'client_profiles', 'coach_client_assignments'], desc: 'Invite clients' }
  'GET /clients/archived': { tables: ['coach_client_assignments'], desc: 'Get archived clients' }
  'POST /clients/restore': { headers: { 'x-client-id': string }, tables: ['coach_client_assignments'], desc: 'Restore client' }
  'POST /clients/resend-invite': { body: { clientId: string }, tables: ['coach_client_assignments'], desc: 'Resend invite' }
  'GET /clients/detail': { headers: { 'x-client-id': string }, tables: ['coach_clients_view'], desc: 'Get client detail' }
  'DELETE /clients': { headers: { 'x-client-id': string }, tables: ['coach_client_assignments'], desc: 'Remove client' }
  'PATCH /clients': { headers: { 'x-client-id': string }, body: { status?: string, notes?: string }, tables: ['coach_client_assignments'], desc: 'Update client' }
  'GET /clients/bio': { headers: { 'x-client-id': string }, tables: ['client_bio'], desc: 'Get bio' }
  'PATCH /clients/bio': { headers: { 'x-client-id': string }, body: { bio: string }, tables: ['client_bio'], desc: 'Update bio' }
  'GET /clients/goals': { headers: { 'x-client-id': string }, tables: ['client_goals'], desc: 'Get goals' }
  'POST /clients/goals': { headers: { 'x-client-id': string }, body: { title: string, description?: string }, tables: ['client_goals'], desc: 'Create goal' }
  'PATCH /clients/goals/:id': { body: { title?: string, completed?: boolean }, tables: ['client_goals'], desc: 'Update goal' }
  'DELETE /clients/goals/:id': { tables: ['client_goals'], desc: 'Delete goal' }
  'GET /clients/injuries': { headers: { 'x-client-id': string }, tables: ['client_injuries'], desc: 'Get injuries' }
  'POST /clients/injuries': { headers: { 'x-client-id': string }, body: { name: string, description?: string, status?: string }, tables: ['client_injuries'], desc: 'Create injury' }
  'PATCH /clients/injuries/:id': { tables: ['client_injuries'], desc: 'Update injury' }
  'DELETE /clients/injuries/:id': { tables: ['client_injuries'], desc: 'Delete injury' }
  'POST /clients/at-risk': { body: { thresholdDays?: number }, tables: ['coach_client_assignments'], desc: 'Get at-risk clients' }
  'POST /clients/training-history': { body: { date: string, status?: 'completed' | 'in_progress' | 'missed' }, tables: ['client_training_history'], desc: 'Get training history' }

  // ---------------------------------------------------------------------------
  // CLIENT (client's own view) /api/v1/client
  // ---------------------------------------------------------------------------
  'GET /client': { tables: ['client_profiles_full'], desc: 'Get my profile' }
  'PATCH /client': { body: { bio?: string, preferences?: object }, tables: ['client_profiles'], desc: 'Update my profile' }

  // Client Training
  'POST /client/trainings/calendar': { body: { startDate: string, endDate: string }, tables: ['client_training', 'client_workout_assignments'], desc: 'Get calendar' }
  'GET /client/trainings': { tables: ['client_training'], desc: 'Get trainings' }
  'PATCH /client/trainings/:id': { body: { status: 'pending' | 'in_progress' | 'completed' }, tables: ['client_training'], desc: 'Update status' }
  'POST /client/trainings/assign-workout': { body: { workoutId: string, date: string, clientId: string }, tables: ['client_workout_assignments', 'client_training'], desc: 'Assign workout' }
  'POST /client/trainings/workout-instance': { body: { assignmentId: string }, tables: ['client_training', 'coach_workouts'], desc: 'Get workout instance' }
  'DELETE /client/trainings/:clientId/workout/:workoutId': { tables: ['client_workout_assignments'], desc: 'Delete assignment' }
  'POST /client/trainings/exercise-history/add': { body: { exerciseId: string, sets: number, reps: number, weight: number }, tables: ['client_training_exercise_history'], desc: 'Add exercise log' }
  'POST /client/trainings/exercise-history': { body: { exerciseId: string }, tables: ['client_training_exercise_history'], desc: 'Get exercise history' }

  // Client Habits/Metrics
  'GET /client/habits': { tables: ['client_habits'], desc: 'Get my habits' }
  'POST /client/habits/:id/log': { body: { date: string, completed: boolean }, tables: ['client_habit_logs'], desc: 'Log habit' }
  'GET /client/metrics': { tables: ['client_metrics'], desc: 'Get my metrics' }
  'POST /client/metrics/:id/log': { body: { date: string, value: number }, tables: ['client_metric_logs'], desc: 'Log metric' }

  // Client Forms
  'GET /client/forms/check-ins': { tables: ['client_checkins'], desc: 'Get check-ins' }
  'POST /client/forms/check-ins/:id/submit': { body: { responses: object }, tables: ['client_checkin_logs'], desc: 'Submit check-in' }
  'GET /client/forms/questionnaires': { tables: ['client_questionnaires'], desc: 'Get questionnaires' }
  'POST /client/forms/questionnaires/:id/submit': { body: { responses: object }, tables: ['client_questionnaires'], desc: 'Submit questionnaire' }

  // Client Files/Photos/Notes
  'GET /client/files': { tables: ['client_files', 'coach_files'], desc: 'Get shared files' }
  'GET /client/photos': { tables: ['client_photos'], desc: 'Get photos' }
  'POST /client/photos': { body: 'multipart: file, category', tables: ['client_photos', 'client_photo_logs'], desc: 'Upload photo' }
  'DELETE /client/photos/:id': { tables: ['client_photos'], desc: 'Delete photo' }
  'GET /client/notes': { tables: ['client_notes'], desc: 'Get notes' }
  'POST /client/notes': { body: { content: string }, tables: ['client_notes'], desc: 'Create note' }
  'GET /client/tasks': { tables: ['client_tasks'], desc: 'Get tasks' }
  'PATCH /client/tasks/:id': { body: { completed: boolean }, tables: ['client_tasks'], desc: 'Update task' }

  // ---------------------------------------------------------------------------
  // EXERCISES (MuscleWiki) /api/v1/exercises
  // ---------------------------------------------------------------------------
  'GET /exercises/search': { query: { q: string }, tables: ['musclewiki_exercise_cache'], desc: 'Quick search (public)' }
  'GET /exercises/all': { tables: ['musclewiki_exercise_cache'], desc: 'Get all from cache' }
  'GET /exercises/filters': { tables: ['musclewiki_exercise_cache'], desc: 'Get filter options' }
  'GET /exercises': { query: { muscle?: string, equipment?: string, difficulty?: string, category?: string }, tables: ['musclewiki_exercise_cache'], desc: 'Search with filters' }
  'GET /exercises/:id': { tables: ['musclewiki_exercise_cache'], desc: 'Get exercise' }
  'GET /exercises/:id/videos': { tables: ['exercise_videos'], desc: 'Get video URLs' }

  // ---------------------------------------------------------------------------
  // BILLING (Platform SaaS) /api/v1/billing
  // ---------------------------------------------------------------------------
  'POST /billing/webhook': { body: 'Stripe event', tables: ['platform_subscriptions', 'platform_addons', 'platform_billing_activity', 'stripe_webhook_events', 'coach_entitlements'], desc: 'Stripe webhook' }
  'GET /billing/subscription': { tables: ['platform_subscriptions', 'platform_addons'], desc: 'Get subscription' }
  'GET /billing/entitlements': { tables: ['coach_entitlements'], desc: 'Get feature gates' }
  'GET /billing/activity': { query: { limit?: number, offset?: number }, tables: ['platform_billing_activity'], desc: 'Get activity' }
  'GET /billing/invoices': { query: { limit?: number }, desc: 'Get Stripe invoices' }
  'POST /billing/checkout': { body: { plan: 'pro' | 'max', clientLimit: number, interval: 'month' | 'year', addons?: string[], successUrl: string, cancelUrl: string }, tables: ['platform_subscriptions', 'user_profiles'], desc: 'Create checkout' }
  'POST /billing/portal': { body: { returnUrl?: string }, tables: ['platform_subscriptions'], desc: 'Create Stripe portal' }
  'PATCH /billing/plan': { body: { plan: 'pro' | 'max', clientLimit: number, interval: 'month' | 'year' }, tables: ['platform_subscriptions'], desc: 'Update plan' }
  'PATCH /billing/addons': { body: { addons: Array<'automations' | 'ai_assistant' | 'payments'> }, tables: ['platform_addons'], desc: 'Update addons' }
  'POST /billing/cancel': { body: { cancelImmediately?: boolean, reason?: string }, tables: ['platform_subscriptions'], desc: 'Cancel subscription' }
  'POST /billing/reactivate': { tables: ['platform_subscriptions'], desc: 'Reactivate subscription' }
  'GET /billing/ai-usage': { desc: 'Get AI usage (trial limits)' }
  'POST /billing/ai-usage/check': { desc: 'Check and increment AI usage' }

  // ---------------------------------------------------------------------------
  // PAYMENTS (Coach sells to clients) /api/v1/payments
  // ---------------------------------------------------------------------------
  'POST /payments/webhook': { body: 'Stripe event', tables: ['payments', 'client_subscriptions', 'billing_activity'], desc: 'Stripe webhook' }
  'GET /payments/connect/status': { tables: ['coach_stripe_accounts'], desc: 'Get Connect status' }
  'POST /payments/connect/onboard': { tables: ['coach_stripe_accounts'], desc: 'Start Stripe onboard' }
  'POST /payments/connect/dashboard-link': { tables: ['coach_stripe_accounts'], desc: 'Get dashboard link' }
  'DELETE /payments/connect/disconnect': { tables: ['coach_stripe_accounts'], desc: 'Disconnect Stripe' }
  'GET /payments/summary/analytics': { tables: ['payments', 'client_subscriptions'], desc: 'Get analytics' }
  'GET /payments/summary/activity': { query: { limit?: number, offset?: number }, tables: ['billing_activity'], desc: 'Get activity' }
  'GET /payments/packages/stats': { tables: ['coach_packages', 'client_package_assignments'], desc: 'Get package stats' }
  'GET /payments/packages': { tables: ['coach_packages'], desc: 'Get packages' }
  'POST /payments/packages': { body: { name: string, description?: string, price: number, interval?: string, features?: string[], onboardingId?: string, sequenceId?: string }, tables: ['coach_packages'], desc: 'Create package' }
  'PATCH /payments/packages/:id/toggle': { tables: ['coach_packages'], desc: 'Toggle active' }
  'PATCH /payments/packages/:id': { tables: ['coach_packages'], desc: 'Update package' }
  'DELETE /payments/packages/:id': { tables: ['coach_packages'], desc: 'Delete package' }
  'GET /payments/coupons': { tables: ['coach_coupons'], desc: 'Get coupons' }
  'POST /payments/coupons': { body: { code: string, percentOff?: number, amountOff?: number, maxRedemptions?: number }, tables: ['coach_coupons'], desc: 'Create coupon' }
  'PATCH /payments/coupons/:id': { tables: ['coach_coupons'], desc: 'Update coupon' }
  'DELETE /payments/coupons/:id': { tables: ['coach_coupons'], desc: 'Delete coupon' }
  'GET /payments/public/packages/:coachCode': { tables: ['coach_unique_codes', 'coach_packages'], desc: 'Get packages (public)' }
  'POST /payments/public/checkout/session': { body: { packageId: string, clientId: string, successUrl: string, cancelUrl: string }, tables: ['coach_packages', 'client_profiles'], desc: 'Checkout (public)' }
  'POST /payments/checkout/session': { body: { packageId: string, successUrl: string, cancelUrl: string }, tables: ['coach_packages'], desc: 'Checkout' }
  'POST /payments/packages/:id/assign': { body: { clientId: string }, tables: ['client_package_assignments'], desc: 'Assign package' }
  'DELETE /payments/packages/:id/assign/:clientId': { tables: ['client_package_assignments'], desc: 'Unassign package' }
  'GET /payments/packages/:id/assignments': { tables: ['client_package_assignments'], desc: 'Get assignments' }
  'GET /payments/clients/:clientId/assignments': { tables: ['client_package_assignments'], desc: 'Get client packages' }
  'GET /payments/client/packages': { tables: ['client_package_assignments'], desc: 'My packages (client)' }
  'POST /payments/client/billing-portal': { tables: ['client_subscriptions'], desc: 'Billing portal (client)' }

  // ---------------------------------------------------------------------------
  // SETTINGS /api/v1/settings
  // ---------------------------------------------------------------------------
  'GET /settings/coach/notifications': { tables: ['coach_notification_preferences'], desc: 'Get notification settings' }
  'PATCH /settings/coach/notifications': { body: { [key: string]: boolean }, tables: ['coach_notification_preferences'], desc: 'Update notification' }
  'PATCH /settings/coach/notifications/bulk': { body: { settings: object }, tables: ['coach_notification_preferences'], desc: 'Bulk update' }
  'GET /settings/coach/preferences': { tables: ['coach_preferences'], desc: 'Get preferences' }
  'PATCH /settings/coach/preferences': { body: { [key: string]: any }, tables: ['coach_preferences'], desc: 'Update preferences' }
  'GET /settings/coach/company': { tables: ['coach_company_information'], desc: 'Get company info' }
  'PATCH /settings/coach/company': { body: { name?: string, logo?: string, address?: string, phone?: string }, tables: ['coach_company_information'], desc: 'Update company' }
  'POST /settings/coach/push-token': { body: { token: string, platform: string }, tables: ['coach_push_tokens'], desc: 'Register push token' }
  'DELETE /settings/coach/push-token': { body: { token: string }, tables: ['coach_push_tokens'], desc: 'Delete push token' }
  'POST /settings/coach/complete-onboarding': { tables: ['coach_profiles'], desc: 'Complete onboarding' }
  'GET /settings/coach/unique-code': { tables: ['coach_unique_codes'], desc: 'Get unique code' }
  'POST /settings/client/push-token': { body: { token: string, platform: string }, tables: ['client_push_tokens'], desc: 'Register push token' }
  'DELETE /settings/client/push-token': { body: { token: string }, tables: ['client_push_tokens'], desc: 'Delete push token' }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS /api/v1/notifications
  // ---------------------------------------------------------------------------
  'GET /notifications': { query: { limit?: number, offset?: number, unreadOnly?: boolean }, tables: ['coach_notifications'], desc: 'Get notifications' }
  'PATCH /notifications/mark-all-read': { tables: ['coach_notifications'], desc: 'Mark all read' }
  'PATCH /notifications/:id/read': { tables: ['coach_notifications'], desc: 'Mark read' }
  'PATCH /notifications/:id/unread': { tables: ['coach_notifications'], desc: 'Mark unread' }

  // ---------------------------------------------------------------------------
  // FEATURE REQUESTS /api/v1/feature-requests
  // ---------------------------------------------------------------------------
  'GET /feature-requests': { query: { sort?: string, search?: string, limit?: number, offset?: number }, tables: ['feature_requests', 'feature_request_upvotes'], desc: 'Get requests' }
  'GET /feature-requests/:id': { tables: ['feature_requests'], desc: 'Get request' }
  'POST /feature-requests': { body: { title: string, description: string }, tables: ['feature_requests'], desc: 'Create request' }
  'DELETE /feature-requests/:id': { tables: ['feature_requests'], desc: 'Delete request' }
  'POST /feature-requests/:id/upvote': { tables: ['feature_request_upvotes'], desc: 'Toggle upvote' }
  'GET /feature-requests/:id/replies': { tables: ['feature_request_replies'], desc: 'Get replies' }
  'POST /feature-requests/:id/replies': { body: { content: string }, tables: ['feature_request_replies'], desc: 'Create reply' }
  'DELETE /feature-requests/replies/:replyId': { tables: ['feature_request_replies'], desc: 'Delete reply' }

  // ---------------------------------------------------------------------------
  // SEARCH /api/v1/search
  // ---------------------------------------------------------------------------
  'GET /search': { query: { q: string }, tables: ['coach_metrics', 'coach_habits', 'coach_files', 'coach_workouts', 'coach_programs', 'coach_exercises', 'coach_sections'], desc: 'Global search' }

  // ---------------------------------------------------------------------------
  // INTERCOM /api/v1/intercom
  // ---------------------------------------------------------------------------
  'GET /intercom/jwt': { desc: 'Get Intercom JWT' }
}

// All endpoints require Bearer auth except: webhooks, /public/*, /auth/client/invite/:code
