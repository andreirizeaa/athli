# Supabase Automation & Backend Jobs - Full TODO

This document catalogs every piece of backend automation, cron job, database trigger, and edge function that needs to be built for the Athli platform. Organized by priority and domain.

---

## 1. FLOW EXECUTION ENGINE (Core Infrastructure)

The flow system (visual flow builder) is fully designed in the web UI but has **zero execution logic**. This is the foundational piece everything else depends on.

### What exists
- `coach_flows` table with `flow_data` (JSONB containing React Flow nodes/edges)
- `coach_onboardings` table (same structure, separate from flows)
- 7 trigger types defined: `new-client-signup`, `missed-check-in`, `check-in-completed`, `missed-workout`, `workout-finished`, `missed-habit-log`, `missed-metric-log`
- 8 action types: `send-message`, `assign-questionnaire`, `assign-check-in`, `add-file`, `add-habit`, `add-metric`, `wait`, `is-check-in-completed`
- 5 default flows created per coach on signup (all inactive by default)

### What needs to be built
- [ ] **Flow execution engine** - A service that receives trigger events and walks the flow graph, executing each action node in sequence
- [ ] **Event dispatch system** - When a triggering event happens (workout completed, check-in submitted, etc.), emit an event that the flow engine picks up
- [ ] **Action handlers** - One handler per action type:
  - `send-message`: Insert into `messages` table for the coach-client conversation
  - `assign-questionnaire`: Create `client_questionnaires` rows
  - `assign-check-in`: Create `client_checkins` rows
  - `add-file`: Attach files to client
  - `add-habit`: Create `client_habits` rows
  - `add-metric`: Create `client_metrics` rows
  - `wait`: Schedule delayed continuation (needs a job queue / pg_cron one-off)
  - `is-check-in-completed`: Conditional branching
- [ ] **Flow run tracking** - Log each flow execution (which client, which flow, which step, success/failure)
- [ ] **Onboarding execution** - Same engine but triggered specifically on `new-client-signup`

### Implementation approach
- Option A: **Supabase Edge Functions** - Trigger via database webhooks or pg_net
- Option B: **pg_cron + Supabase functions** - For scheduled checks
- Option C: **Express service worker** - Background job processor in the existing service app
- The `wait` action is the trickiest - needs delayed job scheduling (pg_cron one-off job, or a `flow_pending_actions` table polled by a cron)

---

## 2. ONBOARDING TRIGGER (on client signup)

### What exists
- Client invitation flow: coach invites -> client signs up -> `coach_client_assignments` status changes to `accepted`
- `coach_onboardings` table stores onboarding flow definitions
- Web UI for building onboarding flows

### What needs to be built
- [ ] **Database trigger or webhook** on `coach_client_assignments` when `status` changes to `accepted`
- [ ] Look up the coach's active onboarding flow(s)
- [ ] Execute the onboarding flow for this client (using the flow execution engine from #1)
- [ ] Track onboarding progress per client
- [ ] Handle edge case: coach has multiple onboardings - which one runs? (likely needs an "assigned onboarding" field or a default)

---

## 3. CHECK-IN SCHEDULING & AUTOMATION

### What exists
- `client_checkins` with `cron_expression` and `schedule_config` (frequency: daily/weekly/biweekly/monthly, selectedDays)
- `client_checkin_logs` for submission tracking
- Status field: `draft`, `live`, `paused`
- Cron expressions are generated and stored but **not executed**

### What needs to be built
- [ ] **Cron job: Send scheduled check-ins** - Runs daily (e.g., 9 AM in client's timezone)
  - Query all `client_checkins` where `status = 'live'`
  - Parse `cron_expression` to determine if today is a send day
  - For biweekly: needs app-layer logic since pg_cron doesn't support it natively
  - Create a pending check-in instance / send notification to client
- [ ] **Missed check-in detection** - End-of-day cron job
  - For each `live` check-in that was due today, check if `client_checkin_logs` has a submission for today
  - If no submission: trigger `missed-check-in` flow event
- [ ] **Check-in completed event** - When client submits a check-in
  - Trigger `check-in-completed` flow event
  - Database trigger on `client_checkin_logs` INSERT where status = 'completed'

---

## 4. QUESTIONNAIRE SCHEDULING

### What exists
- `client_questionnaires` with `status` (draft/pending/completed), `sent_at`, `completed_at`
- Schedule data structure exists in types (`AssignFormScheduleData`) but is unused
- Currently one-time only - coach manually assigns and it's immediately sent

### What needs to be built
- [ ] **Recurring questionnaire support** - If schedule_config is set on a questionnaire assignment
  - Cron job to create new `client_questionnaires` instances on schedule
  - Similar logic to check-in scheduling
- [ ] **Questionnaire reminder notifications** - For pending questionnaires that haven't been completed
- [ ] **Questionnaire expiration** - Optional deadline after which questionnaire can't be submitted

---

## 5. WORKOUT COMPLETION & MISSED WORKOUT DETECTION

### What exists
- `client_training` (daily calendar, keyed by date)
- `client_training_history` with `status`: `not_started`, `in_progress`, `completed`
- `client_training_exercise_history` for exercise-level tracking
- Workout completion is tracked when client finishes via mobile app
- Missed workouts are **implicitly** determined (past date + not_started = missed)

### What needs to be built
- [ ] **End-of-day cron job: Mark missed workouts**
  - Query `client_training` for yesterday's date (or today at end of day)
  - For each workout where `completedSummary.status = 'not_started'`:
    - Upsert `client_training_history` with status `'missed'` (or keep as `not_started` and detect via date)
    - Trigger `missed-workout` flow event for the client's coach
  - Consider timezone handling (each client may be in a different timezone)
- [ ] **Workout completed event trigger**
  - When `client_training_history` is updated to `status = 'completed'`:
    - Trigger `workout-finished` flow event
  - Could be a DB trigger on `client_training_history` UPDATE/INSERT
- [ ] **Weekly training summary generation**
  - Aggregate completed vs assigned workouts for the week
  - Calculate completion percentage
  - Feed into coach dashboard / notification

---

## 6. HABIT LOG DETECTION

### What exists
- `client_habits` with `schedule_config` (daily/weekly/custom, `days_of_week`, `times_of_day`)
- `client_habit_logs` with `recorded_date`, `completed` boolean, `value`
- Streak calculation function (`calculate_habit_streaks`)
- Flow trigger type: `missed-habit-log`

### What needs to be built
- [ ] **End-of-day cron job: Detect missed habit logs**
  - For each active `client_habits`:
    - Check if today was a scheduled day (based on `schedule_config` / `days_of_week`)
    - Check if `client_habit_logs` has an entry for today
    - If scheduled but no log: trigger `missed-habit-log` flow event
- [ ] **Habit reminder notifications** - Push notification at the scheduled `times_of_day`
- [ ] **Streak milestone notifications** - Celebrate 7-day, 30-day, etc. streaks

---

## 7. METRIC LOG DETECTION

### What exists
- `client_metrics` / `coach_metrics` with `cron_expression`, `schedule_config` (daily/weekly/biweekly/monthly)
- `client_metric_logs` with `value`, `measured_at`
- Flow trigger type: `missed-metric-log`

### What needs to be built
- [ ] **End-of-day cron job: Detect missed metric logs**
  - For each active `client_metrics` with a schedule:
    - Parse `cron_expression` or `schedule_config` to determine if today was a log day
    - Check if `client_metric_logs` has an entry for today
    - If no log: trigger `missed-metric-log` flow event
- [ ] **Metric reminder notifications** - Remind client to log metrics on scheduled days
- [ ] **Progress photo reminders** - If coach has set up a photo schedule

---

## 8. PUSH NOTIFICATION INFRASTRUCTURE

### What exists
- `expo-notifications` package installed in mobile app
- `available_notification_events` table with 6 event types
- `coach_notification_preferences` table for opt-in/out
- Supabase Realtime for live messaging
- **NO push token storage, NO push sending logic**

### What needs to be built
- [ ] **Device token storage** - New table `user_push_tokens`:
  ```
  user_id, expo_push_token, device_type, is_active, created_at, updated_at
  ```
- [ ] **Push token registration endpoint** - Mobile app registers token on login
- [ ] **Push notification sending service** - Calls Expo Push API
  - Wrapper function that takes `userId`, `title`, `body`, `data`
  - Looks up active push tokens for user
  - Sends via Expo Push API (or Supabase Edge Function)
- [ ] **Notification triggers** - Hook into all events:
  - New message received -> push to recipient
  - Check-in due -> push to client
  - Check-in submitted -> push to coach (for review)
  - Workout reminder -> push to client
  - Habit reminder -> push to client
  - Questionnaire assigned -> push to client
  - Flow action "send-message" -> push to client
- [ ] **Notification preferences check** - Before sending, check `coach_notification_preferences` / client preferences
- [ ] **Notification history table** - Track what was sent, opened, etc.

---

## 9. EMAIL SERVICE INTEGRATION

### What exists
- Two blocking TODOs in `coach-clients.controller.ts`:
  - `createClients`: "TODO: Send invitation email to client.email with client.invitation_token"
  - `resendInvite`: "TODO: Integrate email invitation service here"
- `email_bounced_at` field on `coach_client_assignments` (for future bounce tracking)

### What needs to be built
- [ ] **Email service integration** (SendGrid / AWS SES / Resend)
  - Client invitation emails with signup link containing invitation token
  - Email templates for invitations
- [ ] **Bounce handling** - Webhook to update `email_bounced_at` and status to `bounced`
- [ ] **Transactional emails** for:
  - Client invitation
  - Check-in reminders (optional)
  - Questionnaire assigned notification
  - Coach weekly summary
  - Trial expiration warnings (future)

---

## 10. PROGRAM AUTO-ASSIGNMENT

### What exists
- `coach_programs` with multi-week `program_data` (days mapped to workout IDs)
- Manual workout assignment to calendar dates
- Program assignment UI exists but full auto-mapping is incomplete

### What needs to be built
- [ ] **Program-to-calendar mapping** - When coach assigns program with start date:
  - Auto-populate `client_training` for each day in the program
  - Map program day 1 -> start_date, day 2 -> start_date+1, etc.
  - Handle multi-week programs (week 2 starts on day 8, etc.)
- [ ] **Week rollover automation** - If program is 8 weeks, auto-assign week 2 when week 1 ends
- [ ] **Program completion tracking** - Track overall program progress percentage

---

## 11. SUBSCRIPTION & BILLING (Future)

### What exists
- Billing page placeholder ("Coming Soon")
- Refer and Earn page with mock data
- `coach_unique_codes` table for referral codes
- i18n references to "30-day free trial" and "paid plans"

### What needs to be built (future priority)
- [ ] **Subscription schema** - `coach_subscriptions` table (plan, trial dates, stripe IDs, status)
- [ ] **Stripe integration** - Customer creation, checkout, webhooks
- [ ] **Trial management cron job** - Check for expiring trials, send warnings, downgrade on expiry
- [ ] **Referral conversion tracking** - Track when referred coach converts to paid
- [ ] **Referral reward automation** - Grant pro-rated free month to referrer

---

## 12. DAILY END-OF-DAY CRON JOB (Consolidated)

Many items above require an end-of-day check. These should ideally be consolidated into one or a few coordinated cron jobs.

### Proposed: `daily_end_of_day_check` (runs at midnight per timezone, or a fixed time like 11:59 PM UTC)

1. **Missed workouts** - Scan `client_training` for today, flag not_started as missed, trigger flows
2. **Missed check-ins** - Scan `client_checkins` (live, due today), check for missing logs, trigger flows
3. **Missed habit logs** - Scan `client_habits` (scheduled today), check for missing logs, trigger flows
4. **Missed metric logs** - Scan `client_metrics` (scheduled today), check for missing logs, trigger flows
5. **Generate daily summaries** - Update `client_training_summary` aggregates

### Timezone consideration
- Clients/coaches may be in different timezones
- Options:
  - Store timezone per coach/client, run checks per timezone group
  - Run at a fixed UTC time and accept slight inaccuracy
  - Use pg_cron with timezone-aware scheduling

---

## 13. MORNING REMINDER CRON JOB

### Proposed: `daily_morning_reminders` (runs at configured time, e.g., 8-9 AM per timezone)

1. **Today's workout reminder** - Push notification: "You have X workout(s) scheduled today"
2. **Check-in due reminder** - Push notification: "Your weekly check-in is due today"
3. **Habit reminders** - Push at scheduled `times_of_day` for each habit
4. **Metric log reminders** - Push for scheduled metric logs
5. **Pending questionnaire reminders** - Nudge for unsubmitted questionnaires

---

## PRIORITY ORDER

| Priority | Item | Reason |
|----------|------|--------|
| P0 | Flow execution engine (#1) | Everything depends on this |
| P0 | Push notification infrastructure (#8) | Needed by all reminders/triggers |
| P0 | Onboarding trigger (#2) | Critical for new client experience |
| P1 | End-of-day cron: missed workouts (#5) | Core coaching feature |
| P1 | End-of-day cron: missed check-ins (#3) | Core coaching feature |
| P1 | End-of-day cron: missed habits (#6) | Core coaching feature |
| P1 | End-of-day cron: missed metrics (#7) | Core coaching feature |
| P1 | Workout completed trigger (#5) | Enables "Workout Finished" flow |
| P1 | Check-in completed trigger (#3) | Enables "Check-in Completed" flow |
| P2 | Check-in scheduling automation (#3) | Recurring check-in delivery |
| P2 | Morning reminder cron (#13) | Client engagement |
| P2 | Email service (#9) | Client invitations currently broken |
| P2 | Program auto-assignment (#10) | Quality of life for coaches |
| P3 | Questionnaire scheduling (#4) | Lower usage frequency |
| P3 | Habit/metric reminder pushes (#6, #7) | Nice-to-have engagement |
| P4 | Subscription & billing (#11) | Future monetization |

---

## TECHNICAL DECISIONS NEEDED

1. **Where to run the flow engine?**
   - Supabase Edge Functions (Deno) vs. Express service background worker vs. separate worker service
2. **How to handle `wait` actions?**
   - pg_cron one-off scheduled jobs vs. a `pending_actions` table polled by cron vs. external job queue (Bull/BullMQ)
3. **Push notification provider?**
   - Expo Push API directly vs. OneSignal vs. Firebase Cloud Messaging
4. **Email provider?**
   - Resend vs. SendGrid vs. AWS SES
5. **Timezone handling strategy?**
   - Per-user timezone vs. per-coach timezone vs. UTC-only
6. **Consolidated vs. separate cron jobs?**
   - One big end-of-day job vs. individual jobs per feature
