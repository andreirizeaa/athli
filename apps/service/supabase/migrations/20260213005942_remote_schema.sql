create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "wrappers" with schema "extensions";

create type "public"."platform_addon_type" as enum ('automations', 'ai_assistant', 'payments');

create type "public"."platform_plan_type" as enum ('starter', 'pro', 'max');

create type "public"."platform_subscription_status" as enum ('trialing', 'active', 'past_due', 'cancelled', 'paused', 'unpaid');


  create table "public"."ai_assistant_daily_usage" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "usage_date" date not null default CURRENT_DATE,
    "prompt_count" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ai_assistant_daily_usage" enable row level security;


  create table "public"."assistant_todo_cron_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "rows_inserted" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."assistant_todo_cron_log" enable row level security;


  create table "public"."billing_activity" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid,
    "package_id" uuid,
    "subscription_id" uuid,
    "event_type" text not null,
    "description" text not null,
    "amount_cents" integer,
    "currency" text default 'usd'::text,
    "metadata" jsonb default '{}'::jsonb,
    "stripe_event_id" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."billing_activity" enable row level security;


  create table "public"."client_bio" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "bio" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."client_bio" enable row level security;


  create table "public"."client_checkin_logs" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "submission_date" date not null default CURRENT_DATE,
    "answers" jsonb not null default '{}'::jsonb,
    "status" text not null default 'assigned'::text,
    "coach_comment" text,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "assignment_id" uuid not null,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_checkin_logs" enable row level security;


  create table "public"."client_checkins" (
    "client_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "questions" jsonb default '[]'::jsonb,
    "schedule_config" jsonb,
    "cron_expression" text,
    "id" uuid not null default gen_random_uuid(),
    "status" text default 'draft'::text
      );


alter table "public"."client_checkins" enable row level security;


  create table "public"."client_files" (
    "client_id" uuid not null,
    "display_name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "bucket_id" text default 'coach_files'::text,
    "file_path" text not null,
    "mime_type" text,
    "size" bigint,
    "coach_id" uuid not null,
    "filename" text not null,
    "id" uuid not null default gen_random_uuid(),
    "coach_file_id" uuid
      );


alter table "public"."client_files" enable row level security;


  create table "public"."client_goals" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "goal" text not null,
    "target_date" date,
    "achieved" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "details" text
      );


alter table "public"."client_goals" enable row level security;


  create table "public"."client_habit_logs" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "date" date not null default CURRENT_DATE,
    "completed" boolean not null default false,
    "created_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_by" uuid,
    "updated_at" timestamp with time zone,
    "assignment_id" uuid not null,
    "value" numeric,
    "status" text,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_habit_logs" enable row level security;


  create table "public"."client_habits" (
    "client_id" uuid not null,
    "custom_schedule" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "amount" numeric,
    "unit" text,
    "period" text,
    "coach_id" uuid not null,
    "schedule_type" text,
    "days_of_week" smallint[],
    "times_of_day" time without time zone[],
    "timezone" text default 'UTC'::text,
    "start_date" date,
    "end_date" date,
    "schedule_config" jsonb default '{}'::jsonb,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_habits" enable row level security;


  create table "public"."client_injuries" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "injury" text not null,
    "status" text,
    "date" date,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "details" text
      );


alter table "public"."client_injuries" enable row level security;


  create table "public"."client_metric_logs" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "value" numeric not null,
    "date" date not null default now(),
    "created_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "assignment_id" uuid not null,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_metric_logs" enable row level security;


  create table "public"."client_metrics" (
    "client_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "unit" text,
    "description" text,
    "value_kind" text,
    "coach_id" uuid not null,
    "min_value" numeric,
    "max_value" numeric,
    "id" uuid not null default gen_random_uuid(),
    "cron_expression" text,
    "schedule_config" jsonb default '{}'::jsonb
      );


alter table "public"."client_metrics" enable row level security;


  create table "public"."client_notes" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "is_pinned" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "title" text not null,
    "body" text,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_notes" enable row level security;


  create table "public"."client_package_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "package_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "sequence_executed_at" timestamp with time zone
      );


alter table "public"."client_package_assignments" enable row level security;


  create table "public"."client_photo_logs" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "date" date not null default CURRENT_DATE,
    "front_photo_path" text,
    "side_photo_path" text,
    "back_photo_path" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."client_photo_logs" enable row level security;


  create table "public"."client_profiles" (
    "client_id" uuid not null,
    "date_of_birth" date,
    "gender" text,
    "height_cm" integer,
    "phone" text,
    "country" text,
    "unit_system" text not null default 'metric'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."client_profiles" enable row level security;


  create table "public"."client_push_notification_log" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "notification_type" text not null,
    "notification_date" date not null,
    "sent_at" timestamp with time zone not null default now()
      );


alter table "public"."client_push_notification_log" enable row level security;


  create table "public"."client_push_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "expo_push_token" text not null,
    "device_id" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."client_push_tokens" enable row level security;


  create table "public"."client_questionnaires" (
    "client_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "questions" jsonb default '[]'::jsonb,
    "id" uuid not null default gen_random_uuid(),
    "status" text default 'draft'::text,
    "sent_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "answers" jsonb default '[]'::jsonb
      );


alter table "public"."client_questionnaires" enable row level security;


  create table "public"."client_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "package_id" uuid,
    "stripe_subscription_id" text not null,
    "stripe_customer_id" text not null,
    "status" text not null default 'active'::text,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean not null default false,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "cancel_at" timestamp with time zone
      );


alter table "public"."client_subscriptions" enable row level security;


  create table "public"."client_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "task_type" text not null,
    "reference_id" uuid not null,
    "due_date" date not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."client_tasks" enable row level security;


  create table "public"."client_training" (
    "client_id" uuid not null,
    "date" date not null,
    "coach_id" uuid not null,
    "training_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."client_training" enable row level security;


  create table "public"."client_training_exercise_history" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "date" date not null,
    "workout_id" text not null,
    "workout_name" text not null,
    "exercise_id" text not null,
    "exercise_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "row_id" bigint generated always as identity not null,
    "section_type" text,
    "section_completed_rounds" integer
      );


alter table "public"."client_training_exercise_history" enable row level security;


  create table "public"."client_training_history" (
    "client_id" uuid not null,
    "coach_id" uuid not null,
    "date" date not null,
    "workout_id" text not null,
    "status" text not null default 'not_started'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."client_training_history" enable row level security;


  create table "public"."client_training_summary" (
    "client_id" uuid not null,
    "last_activity" timestamp with time zone,
    "last_7_days_training_completed" integer not null default 0,
    "last_7_days_training_total" integer not null default 0,
    "last_30_days_training_completed" integer not null default 0,
    "last_30_days_training_total" integer not null default 0,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now(),
    "coach_id" uuid not null
      );


alter table "public"."client_training_summary" enable row level security;


  create table "public"."coach_auto_todolist" (
    "coach_id" uuid not null,
    "title" text not null,
    "type" text not null,
    "client_id" uuid,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "client_user_type" character varying(20) default 'client'::character varying,
    "id" uuid not null default gen_random_uuid(),
    "description" text
      );


alter table "public"."coach_auto_todolist" enable row level security;


  create table "public"."coach_checkins" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "schedule_config" jsonb not null default '{}'::jsonb,
    "cron_expression" text,
    "questions" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "num_of_questions" integer default 0,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."coach_checkins" enable row level security;


  create table "public"."coach_client_assignments" (
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "category" text,
    "status" text not null default 'invited'::text,
    "is_active" boolean not null default true,
    "is_archived" boolean not null default false,
    "invitation_sent_at" timestamp with time zone,
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "invitation_token" character varying(8),
    "email_bounced_at" timestamp with time zone,
    "onboarding_id" uuid,
    "onboarding_executed_at" timestamp with time zone,
    "is_demo" boolean default false
      );


alter table "public"."coach_client_assignments" enable row level security;


  create table "public"."coach_company_information" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "company_name" text,
    "website" text,
    "linkedin" text,
    "location" text,
    "specialities" jsonb not null default '[]'::jsonb,
    "logo_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_company_information" enable row level security;


  create table "public"."coach_coupons" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "code" text not null,
    "discount_type" text not null,
    "discount_value" numeric(10,2) not null,
    "currency" text default 'usd'::text,
    "duration_months" integer,
    "max_redemptions" integer,
    "redemption_count" integer not null default 0,
    "expires_at" timestamp with time zone,
    "is_active" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "stripe_coupon_id" text,
    "stripe_promo_code_id" text
      );


alter table "public"."coach_coupons" enable row level security;


  create table "public"."coach_entitlements" (
    "coach_id" uuid not null,
    "plan_type" public.platform_plan_type not null default 'starter'::public.platform_plan_type,
    "client_limit" integer not null default 5,
    "has_ai_workout_builder" boolean not null default false,
    "has_custom_exercises" boolean not null default false,
    "has_questionnaires" boolean not null default false,
    "has_habits_metrics" boolean not null default false,
    "storage_limit_gb" integer not null default 0,
    "has_broadcast_messaging" boolean not null default false,
    "has_ai_todo_list" boolean not null default false,
    "has_priority_support" boolean not null default false,
    "has_automations" boolean not null default false,
    "has_ai_assistant" boolean not null default false,
    "has_payments" boolean not null default false,
    "subscription_status" public.platform_subscription_status not null default 'active'::public.platform_subscription_status,
    "is_trial" boolean not null default false,
    "trial_ends_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_entitlements" enable row level security;


  create table "public"."coach_exercises" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "category" text,
    "muscle_group" text[],
    "video_link" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "is_favourite" boolean not null default false,
    "difficulty" text
      );


alter table "public"."coach_exercises" enable row level security;


  create table "public"."coach_file_folders" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_file_folders" enable row level security;


  create table "public"."coach_files" (
    "coach_id" uuid not null,
    "bucket_id" text not null default 'coach_files'::text,
    "file_path" text not null,
    "filename" text not null,
    "mime_type" text,
    "size" bigint,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "folder_id" uuid
      );


alter table "public"."coach_files" enable row level security;


  create table "public"."coach_flows" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "flow_data" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "automation_schema" jsonb
      );


alter table "public"."coach_flows" enable row level security;


  create table "public"."coach_getting_started_checklist" (
    "coach_id" uuid not null,
    "client_app_demo" boolean not null default false,
    "coach_app_demo" boolean not null default false,
    "workout_ai" boolean not null default false,
    "program_templates" boolean not null default false,
    "custom_exercises" boolean not null default false,
    "automate_onboardings" boolean not null default false,
    "check_ins_forms" boolean not null default false,
    "powerful_flows" boolean not null default false,
    "lifestyle_habits" boolean not null default false,
    "track_metrics" boolean not null default false,
    "on_demand_resources" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_getting_started_checklist" enable row level security;


  create table "public"."coach_habit_folders" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_habit_folders" enable row level security;


  create table "public"."coach_habits" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "schedule_type" text not null default 'daily'::text,
    "days_of_week" smallint[],
    "times_of_day" time without time zone[],
    "timezone" text not null default 'UTC'::text,
    "start_date" date default CURRENT_DATE,
    "end_date" date,
    "schedule_config" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "folder_id" uuid
      );


alter table "public"."coach_habits" enable row level security;


  create table "public"."coach_metric_folders" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_metric_folders" enable row level security;


  create table "public"."coach_metrics" (
    "coach_id" uuid not null,
    "name" text not null,
    "unit" text,
    "description" text,
    "value_kind" text not null default 'number'::text,
    "min_value" numeric,
    "max_value" numeric,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "cron_expression" text,
    "schedule_config" jsonb default '{}'::jsonb,
    "folder_id" uuid
      );


alter table "public"."coach_metrics" enable row level security;


  create table "public"."coach_notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "notification_type" text not null,
    "in_app_enabled" boolean not null default true,
    "push_enabled" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_notification_preferences" enable row level security;


  create table "public"."coach_notifications" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "notification_type" text not null,
    "title" text not null,
    "description" text,
    "metadata" jsonb default '{}'::jsonb,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_notifications" enable row level security;


  create table "public"."coach_onboardings" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "flow_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default false
      );


alter table "public"."coach_onboardings" enable row level security;


  create table "public"."coach_own_todolist" (
    "coach_id" uuid not null,
    "title" text not null,
    "information" text,
    "type" text not null,
    "client_id" uuid,
    "due_date" timestamp with time zone,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "client_user_type" character varying(20) default 'client'::character varying,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."coach_own_todolist" enable row level security;


  create table "public"."coach_packages" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "stripe_product_id" text,
    "stripe_price_id" text,
    "name" text not null,
    "description" text,
    "amount_cents" integer not null,
    "currency" text not null default 'usd'::text,
    "interval" text not null default 'one_time'::text,
    "interval_count" integer,
    "is_active" boolean not null default false,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_visible" boolean not null default true,
    "features" jsonb default '[]'::jsonb,
    "free_trial_days" integer default 0,
    "onboarding_id" uuid,
    "sequence_id" uuid,
    "image_url" text,
    "sales_count" integer not null default 0,
    "active_subscriptions_count" integer not null default 0,
    "cancellations_count" integer not null default 0,
    "refunds_count" integer not null default 0,
    "total_revenue_cents" bigint not null default 0
      );


alter table "public"."coach_packages" enable row level security;


  create table "public"."coach_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "theme" text not null default 'light'::text,
    "language" text not null default 'en'::text,
    "color_preset" text not null default 'default'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "client_terminology" text not null default 'athlete'::text
      );


alter table "public"."coach_preferences" enable row level security;


  create table "public"."coach_profiles" (
    "id" uuid not null,
    "is_active" boolean not null default true,
    "is_archived" boolean not null default false,
    "status" character varying(20) default 'active'::character varying,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "getting_started_checklist_complete" boolean not null default false,
    "onboarding_complete" boolean not null default false,
    "free_trial_completed" boolean not null default false,
    "referrer_coach_id" uuid
      );


alter table "public"."coach_profiles" enable row level security;


  create table "public"."coach_programs" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "program_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "id" uuid not null default gen_random_uuid(),
    "is_favourite" boolean not null default false,
    "type" text,
    "difficulty" text,
    "weeks" integer,
    "total_workouts" integer default 0
      );


alter table "public"."coach_programs" enable row level security;


  create table "public"."coach_push_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "expo_push_token" text not null,
    "device_id" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_push_tokens" enable row level security;


  create table "public"."coach_questionnaires" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "questions" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "num_of_questions" integer default 0,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."coach_questionnaires" enable row level security;


  create table "public"."coach_referrals" (
    "id" uuid not null default gen_random_uuid(),
    "referrer_coach_id" uuid not null,
    "referred_coach_id" uuid not null,
    "status" text not null default 'trial_started'::text,
    "referrer_credit_cents" integer not null default 0,
    "referred_credit_cents" integer not null default 0,
    "referrer_credit_applied_at" timestamp with time zone,
    "referred_credit_applied_at" timestamp with time zone,
    "trial_started_at" timestamp with time zone not null default now(),
    "trial_ended_at" timestamp with time zone,
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_referrals" enable row level security;


  create table "public"."coach_sections" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "section_type" text not null,
    "section_data" jsonb not null default '{"items": []}'::jsonb,
    "number_of_exercises" integer not null default 0,
    "is_favourite" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_sections" enable row level security;


  create table "public"."coach_sequences" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "flow_data" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coach_sequences" enable row level security;


  create table "public"."coach_stripe_accounts" (
    "coach_id" uuid not null,
    "stripe_account_id" text not null,
    "onboarding_complete" boolean not null default false,
    "charges_enabled" boolean not null default false,
    "payouts_enabled" boolean not null default false,
    "details_submitted" boolean not null default false,
    "default_currency" text,
    "country" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "account_type" text not null default 'express'::text
      );


alter table "public"."coach_stripe_accounts" enable row level security;


  create table "public"."coach_unique_codes" (
    "coach_id" uuid not null,
    "code" text not null,
    "created_at" timestamp with time zone not null default now(),
    "onboarding_id" uuid
      );


alter table "public"."coach_unique_codes" enable row level security;


  create table "public"."coach_workouts" (
    "coach_id" uuid not null,
    "name" text not null,
    "description" text,
    "workout_data" jsonb not null default '{}'::jsonb,
    "total_exercises" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "type" text,
    "equipment" text[],
    "difficulty" text,
    "id" uuid not null default gen_random_uuid(),
    "is_favourite" boolean not null default false
      );


alter table "public"."coach_workouts" enable row level security;


  create table "public"."conversation_participants" (
    "conversation_id" uuid not null,
    "user_id" uuid not null,
    "other_user_id" uuid not null,
    "is_archived" boolean not null default false,
    "is_muted" boolean not null default false,
    "is_pinned" boolean not null default false,
    "archived_at" timestamp with time zone,
    "muted_at" timestamp with time zone,
    "pinned_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."conversation_participants" enable row level security;


  create table "public"."conversation_presence" (
    "conversation_id" uuid not null,
    "user_id" uuid not null,
    "last_active_at" timestamp with time zone not null default now()
      );


alter table "public"."conversation_presence" enable row level security;


  create table "public"."conversations" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "last_message_at" timestamp with time zone,
    "last_message_preview" text,
    "last_message_type" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_message_sender_id" uuid
      );


alter table "public"."conversations" enable row level security;


  create table "public"."feature_request_replies" (
    "id" uuid not null default gen_random_uuid(),
    "feature_request_id" uuid not null,
    "user_id" uuid not null,
    "user_name" text not null,
    "user_type" text not null,
    "profile_picture_url" text,
    "message" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."feature_request_replies" enable row level security;


  create table "public"."feature_request_upvotes" (
    "id" uuid not null default gen_random_uuid(),
    "feature_request_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."feature_request_upvotes" enable row level security;


  create table "public"."feature_requests" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "upvote_count" integer not null default 0,
    "user_id" uuid not null,
    "user_name" text not null,
    "user_type" text not null,
    "profile_picture_url" text,
    "status" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."feature_requests" enable row level security;


  create table "public"."flow_execution_cron_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "rows_processed" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."flow_execution_cron_log" enable row level security;


  create table "public"."flow_execution_log" (
    "id" uuid not null default gen_random_uuid(),
    "execution_id" uuid not null,
    "action_id" text not null,
    "action_type" text not null,
    "result" text,
    "error_message" text,
    "executed_at" timestamp with time zone not null default now()
      );


alter table "public"."flow_execution_log" enable row level security;


  create table "public"."flow_executions" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid,
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "automation_schema" jsonb not null,
    "current_action_id" text,
    "status" text not null default 'pending'::text,
    "wait_until" timestamp with time zone,
    "trigger_type" text not null,
    "trigger_context" jsonb,
    "trigger_key" text not null,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."flow_executions" enable row level security;


  create table "public"."flow_trigger_cron_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "rows_inserted" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."flow_trigger_cron_log" enable row level security;


  create table "public"."free_trial_expiry_cron_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "rows_updated" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."free_trial_expiry_cron_log" enable row level security;


  create table "public"."message_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "conversation_id" uuid not null,
    "bucket_id" text not null default 'message_attachments'::text,
    "file_path" text not null,
    "filename" text not null,
    "mime_type" text,
    "size_bytes" bigint,
    "thumbnail_path" text,
    "width" integer,
    "height" integer,
    "duration_seconds" integer,
    "upload_status" text not null default 'completed'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."message_attachments" enable row level security;


  create table "public"."message_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "conversation_id" uuid not null,
    "user_id" uuid not null,
    "reaction" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."message_reactions" enable row level security;


  create table "public"."message_read_receipts" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "user_id" uuid not null,
    "last_read_message_id" uuid,
    "last_read_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."message_read_receipts" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "sender_id" uuid not null,
    "content" text,
    "message_type" text not null default 'text'::text,
    "parent_message_id" uuid,
    "status" text not null default 'sent'::text,
    "sent_at" timestamp with time zone not null default now(),
    "read_at" timestamp with time zone,
    "edited_at" timestamp with time zone,
    "is_deleted" boolean not null default false,
    "deleted_at" timestamp with time zone,
    "deleted_by_sender" boolean default false,
    "deleted_by_recipient" boolean default false,
    "created_at" timestamp with time zone not null default now(),
    "attachment_count" integer default 0,
    "idempotency_key" text,
    "attachments_ready" boolean default true,
    "sender_role" text
      );


alter table "public"."messages" enable row level security;


  create table "public"."missed_workout_cron_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "rows_inserted" integer default 0,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."missed_workout_cron_log" enable row level security;


  create table "public"."musclewiki_api_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "endpoint" text not null,
    "method" text not null default 'GET'::text,
    "query_params" jsonb,
    "response_status" integer,
    "response_size_bytes" integer,
    "exercises_returned" integer default 0,
    "cache_hit" boolean not null default false,
    "cache_miss_reason" text,
    "request_source" text,
    "user_id" uuid,
    "request_duration_ms" integer,
    "rate_limit_remaining" integer,
    "rate_limit_reset_at" timestamp with time zone,
    "content_type" text,
    "compliance_note" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."musclewiki_api_audit_log" enable row level security;


  create table "public"."musclewiki_cache_population_log" (
    "id" uuid not null default gen_random_uuid(),
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "status" text not null default 'running'::text,
    "total_fetched" integer default 0,
    "total_cached" integer default 0,
    "errors" integer default 0,
    "error_message" text,
    "triggered_by" text default 'cron'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."musclewiki_cache_population_log" enable row level security;


  create table "public"."musclewiki_exercise_cache" (
    "id" uuid not null default gen_random_uuid(),
    "musclewiki_id" text not null,
    "name" text not null,
    "name_alternative" text,
    "slug" text,
    "category" text,
    "difficulty" text,
    "force" text,
    "mechanic" text,
    "target_muscles" jsonb default '[]'::jsonb,
    "synergist_muscles" jsonb default '[]'::jsonb,
    "stabilizer_muscles" jsonb default '[]'::jsonb,
    "instructions" jsonb default '[]'::jsonb,
    "tips" jsonb default '[]'::jsonb,
    "cached_at" timestamp with time zone not null default now(),
    "cache_expires_at" timestamp with time zone not null default (now() + '30 days'::interval),
    "last_accessed_at" timestamp with time zone not null default now(),
    "access_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "thumbnail_url" text
      );


alter table "public"."musclewiki_exercise_cache" enable row level security;


  create table "public"."musclewiki_filter_cache" (
    "id" uuid not null default gen_random_uuid(),
    "filter_type" text not null,
    "filter_value" text not null,
    "display_label" text not null,
    "sort_order" integer default 0,
    "cached_at" timestamp with time zone not null default now(),
    "cache_expires_at" timestamp with time zone not null default (now() + '30 days'::interval),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."musclewiki_filter_cache" enable row level security;


  create table "public"."musclewiki_sync_metadata" (
    "id" uuid not null default gen_random_uuid(),
    "sync_type" text not null,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" text,
    "last_sync_count" integer default 0,
    "last_sync_duration_ms" integer,
    "last_error_message" text,
    "sync_enabled" boolean not null default true,
    "sync_interval_hours" integer not null default 168,
    "total_exercises_cached" integer default 0,
    "total_api_calls_today" integer default 0,
    "api_calls_reset_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."musclewiki_sync_metadata" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "client_id" uuid not null,
    "package_id" uuid,
    "stripe_checkout_session_id" text,
    "stripe_payment_intent_id" text,
    "amount_cents" integer not null,
    "currency" text not null default 'usd'::text,
    "status" text not null default 'pending'::text,
    "failure_reason" text,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "coupon_id" uuid
      );


alter table "public"."payments" enable row level security;


  create table "public"."platform_addons" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "addon_type" public.platform_addon_type not null,
    "stripe_subscription_item_id" text,
    "stripe_price_id" text,
    "price_cents" integer not null default 0,
    "billing_interval" text,
    "is_active" boolean not null default true,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."platform_addons" enable row level security;


  create table "public"."platform_billing_activity" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "event_type" text not null,
    "description" text not null,
    "amount_cents" integer,
    "currency" text default 'usd'::text,
    "subscription_id" uuid,
    "addon_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "stripe_event_id" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."platform_billing_activity" enable row level security;


  create table "public"."platform_stripe_prices" (
    "id" uuid not null default gen_random_uuid(),
    "stripe_product_id" text not null,
    "stripe_price_id" text not null,
    "price_type" text not null,
    "plan_type" text,
    "addon_type" text,
    "client_limit" integer,
    "billing_interval" text not null,
    "unit_amount_cents" integer not null,
    "currency" text not null default 'usd'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."platform_stripe_prices" enable row level security;


  create table "public"."platform_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "plan_type" public.platform_plan_type not null default 'starter'::public.platform_plan_type,
    "client_limit" integer not null default 5,
    "billing_interval" text,
    "current_price_cents" integer default 0,
    "currency" text not null default 'usd'::text,
    "status" public.platform_subscription_status not null default 'active'::public.platform_subscription_status,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "cancel_at_period_end" boolean not null default false,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" text,
    "stripe_price_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."platform_subscriptions" enable row level security;


  create table "public"."stripe_webhook_events" (
    "id" text not null,
    "type" text not null,
    "processed_at" timestamp with time zone not null default now(),
    "payload" jsonb not null
      );


alter table "public"."stripe_webhook_events" enable row level security;


  create table "public"."user_profiles" (
    "id" uuid not null,
    "user_type" character varying(20) not null,
    "email" character varying(255) not null,
    "name" character varying(200) not null,
    "profile_picture_url" text,
    "signin_method" character varying(20) not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_demo" boolean default false,
    "timezone" text
      );


alter table "public"."user_profiles" enable row level security;

CREATE UNIQUE INDEX ai_assistant_daily_usage_coach_id_usage_date_key ON public.ai_assistant_daily_usage USING btree (coach_id, usage_date);

CREATE UNIQUE INDEX ai_assistant_daily_usage_pkey ON public.ai_assistant_daily_usage USING btree (id);

CREATE UNIQUE INDEX assistant_todo_cron_log_pkey ON public.assistant_todo_cron_log USING btree (id);

CREATE UNIQUE INDEX billing_activity_pkey ON public.billing_activity USING btree (id);

CREATE UNIQUE INDEX client_bio_client_id_key ON public.client_bio USING btree (client_id);

CREATE UNIQUE INDEX client_bio_pkey ON public.client_bio USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_checkin_logs_assignment_submission_unique ON public.client_checkin_logs USING btree (assignment_id, submission_date);

CREATE UNIQUE INDEX client_checkin_logs_pkey ON public.client_checkin_logs USING btree (client_id, coach_id, submission_date, id);

CREATE UNIQUE INDEX client_checkins_id_unique ON public.client_checkins USING btree (id);

CREATE UNIQUE INDEX client_checkins_pkey ON public.client_checkins USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_files_pkey ON public.client_files USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_goals_pkey ON public.client_goals USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_habit_logs_assignment_date_unique ON public.client_habit_logs USING btree (assignment_id, date);

CREATE UNIQUE INDEX client_habit_logs_pkey ON public.client_habit_logs USING btree (client_id, coach_id, date, id);

CREATE UNIQUE INDEX client_habits_id_unique ON public.client_habits USING btree (id);

CREATE UNIQUE INDEX client_habits_pkey ON public.client_habits USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_injuries_pkey ON public.client_injuries USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_metric_logs_assignment_date_unique ON public.client_metric_logs USING btree (assignment_id, date);

CREATE UNIQUE INDEX client_metric_logs_pkey ON public.client_metric_logs USING btree (id);

CREATE UNIQUE INDEX client_metrics_id_unique ON public.client_metrics USING btree (id);

CREATE UNIQUE INDEX client_metrics_pkey ON public.client_metrics USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_notes_pkey ON public.client_notes USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_package_assignments_pkey ON public.client_package_assignments USING btree (id);

CREATE UNIQUE INDEX client_photo_logs_client_date_unique ON public.client_photo_logs USING btree (client_id, date);

CREATE UNIQUE INDEX client_photo_logs_pkey ON public.client_photo_logs USING btree (client_id, coach_id, date, id);

CREATE UNIQUE INDEX client_profiles_pkey ON public.client_profiles USING btree (client_id);

CREATE UNIQUE INDEX client_push_notification_log_client_id_notification_type_no_key ON public.client_push_notification_log USING btree (client_id, notification_type, notification_date);

CREATE UNIQUE INDEX client_push_notification_log_pkey ON public.client_push_notification_log USING btree (id);

CREATE UNIQUE INDEX client_push_tokens_client_id_expo_push_token_key ON public.client_push_tokens USING btree (client_id, expo_push_token);

CREATE UNIQUE INDEX client_push_tokens_pkey ON public.client_push_tokens USING btree (id);

CREATE UNIQUE INDEX client_questionnaires_id_unique ON public.client_questionnaires USING btree (id);

CREATE UNIQUE INDEX client_questionnaires_pkey ON public.client_questionnaires USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_subscriptions_pkey ON public.client_subscriptions USING btree (id);

CREATE UNIQUE INDEX client_subscriptions_stripe_subscription_id_key ON public.client_subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX client_tasks_pkey ON public.client_tasks USING btree (client_id, coach_id, id);

CREATE UNIQUE INDEX client_tasks_unique ON public.client_tasks USING btree (client_id, coach_id, task_type, reference_id, due_date);

CREATE UNIQUE INDEX client_training_exercise_history_pkey ON public.client_training_exercise_history USING btree (client_id, coach_id, date, workout_id, exercise_id, row_id);

CREATE UNIQUE INDEX client_training_history_pkey ON public.client_training_history USING btree (client_id, coach_id, date, workout_id);

CREATE UNIQUE INDEX client_training_new_pkey1 ON public.client_training USING btree (client_id, date, coach_id);

CREATE UNIQUE INDEX client_training_summary_pkey ON public.client_training_summary USING btree (client_id, coach_id);

CREATE UNIQUE INDEX coach_auto_todolist_pkey ON public.coach_auto_todolist USING btree (id);

CREATE UNIQUE INDEX coach_checkins_pkey ON public.coach_checkins USING btree (id);

CREATE UNIQUE INDEX coach_client_assignments_pkey ON public.coach_client_assignments USING btree (coach_id, client_id);

CREATE UNIQUE INDEX coach_company_information_coach_id_key ON public.coach_company_information USING btree (coach_id);

CREATE UNIQUE INDEX coach_company_information_pkey ON public.coach_company_information USING btree (id);

CREATE UNIQUE INDEX coach_entitlements_pkey ON public.coach_entitlements USING btree (coach_id);

CREATE UNIQUE INDEX coach_exercises_pkey ON public.coach_exercises USING btree (id);

CREATE UNIQUE INDEX coach_file_folders_pkey ON public.coach_file_folders USING btree (id);

CREATE UNIQUE INDEX coach_files_pkey ON public.coach_files USING btree (id);

CREATE UNIQUE INDEX coach_flows_pkey ON public.coach_flows USING btree (id);

CREATE UNIQUE INDEX coach_getting_started_checklist_pkey ON public.coach_getting_started_checklist USING btree (coach_id);

CREATE UNIQUE INDEX coach_habit_folders_pkey ON public.coach_habit_folders USING btree (id);

CREATE UNIQUE INDEX coach_habits_pkey ON public.coach_habits USING btree (id);

CREATE UNIQUE INDEX coach_metric_folders_pkey ON public.coach_metric_folders USING btree (id);

CREATE UNIQUE INDEX coach_metrics_pkey ON public.coach_metrics USING btree (id);

CREATE UNIQUE INDEX coach_notification_preferences_coach_id_notification_type_key ON public.coach_notification_preferences USING btree (coach_id, notification_type);

CREATE UNIQUE INDEX coach_notification_preferences_pkey ON public.coach_notification_preferences USING btree (id);

CREATE UNIQUE INDEX coach_notifications_pkey ON public.coach_notifications USING btree (id);

CREATE UNIQUE INDEX coach_onboardings_pkey ON public.coach_onboardings USING btree (id);

CREATE UNIQUE INDEX coach_own_todolist_pkey ON public.coach_own_todolist USING btree (id);

CREATE UNIQUE INDEX coach_packages_pkey ON public.coach_packages USING btree (id);

CREATE UNIQUE INDEX coach_preferences_coach_id_key ON public.coach_preferences USING btree (coach_id);

CREATE UNIQUE INDEX coach_preferences_pkey ON public.coach_preferences USING btree (id);

CREATE UNIQUE INDEX coach_profiles_pkey ON public.coach_profiles USING btree (id);

CREATE UNIQUE INDEX coach_programs_pkey ON public.coach_programs USING btree (id);

CREATE UNIQUE INDEX coach_push_tokens_coach_id_expo_push_token_key ON public.coach_push_tokens USING btree (coach_id, expo_push_token);

CREATE UNIQUE INDEX coach_push_tokens_pkey ON public.coach_push_tokens USING btree (id);

CREATE UNIQUE INDEX coach_questionnaires_pkey ON public.coach_questionnaires USING btree (id);

CREATE UNIQUE INDEX coach_referrals_pkey ON public.coach_referrals USING btree (id);

CREATE UNIQUE INDEX coach_referrals_referred_coach_id_key ON public.coach_referrals USING btree (referred_coach_id);

CREATE UNIQUE INDEX coach_sections_pkey ON public.coach_sections USING btree (id);

CREATE UNIQUE INDEX coach_sequences_pkey ON public.coach_sequences USING btree (id);

CREATE UNIQUE INDEX coach_stripe_accounts_pkey ON public.coach_stripe_accounts USING btree (coach_id);

CREATE UNIQUE INDEX coach_stripe_accounts_stripe_account_id_key ON public.coach_stripe_accounts USING btree (stripe_account_id);

CREATE UNIQUE INDEX coach_unique_codes_code_key ON public.coach_unique_codes USING btree (code);

CREATE UNIQUE INDEX coach_unique_codes_pkey ON public.coach_unique_codes USING btree (coach_id, code);

CREATE UNIQUE INDEX coach_workouts_pkey ON public.coach_workouts USING btree (id);

CREATE UNIQUE INDEX conversation_participants_pkey ON public.conversation_participants USING btree (conversation_id, user_id);

CREATE UNIQUE INDEX conversation_presence_pkey ON public.conversation_presence USING btree (conversation_id, user_id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX discount_codes_coach_id_code_key ON public.coach_coupons USING btree (coach_id, code);

CREATE UNIQUE INDEX discount_codes_pkey ON public.coach_coupons USING btree (id);

CREATE UNIQUE INDEX feature_request_replies_pkey ON public.feature_request_replies USING btree (id);

CREATE UNIQUE INDEX feature_request_upvotes_pkey ON public.feature_request_upvotes USING btree (id);

CREATE UNIQUE INDEX feature_requests_pkey ON public.feature_requests USING btree (id);

CREATE UNIQUE INDEX flow_execution_cron_log_pkey ON public.flow_execution_cron_log USING btree (id);

CREATE UNIQUE INDEX flow_execution_log_pkey ON public.flow_execution_log USING btree (id);

CREATE UNIQUE INDEX flow_executions_pkey ON public.flow_executions USING btree (id);

CREATE UNIQUE INDEX flow_trigger_cron_log_pkey ON public.flow_trigger_cron_log USING btree (id);

CREATE UNIQUE INDEX free_trial_expiry_cron_log_pkey ON public.free_trial_expiry_cron_log USING btree (id);

CREATE INDEX idx_ai_assistant_daily_usage_coach_date ON public.ai_assistant_daily_usage USING btree (coach_id, usage_date);

CREATE INDEX idx_attach_conversation ON public.message_attachments USING btree (conversation_id);

CREATE INDEX idx_attach_message ON public.message_attachments USING btree (message_id);

CREATE INDEX idx_billing_activity_client ON public.billing_activity USING btree (client_id, created_at DESC) WHERE (client_id IS NOT NULL);

CREATE INDEX idx_billing_activity_coach ON public.billing_activity USING btree (coach_id, created_at DESC);

CREATE INDEX idx_billing_activity_stripe_event ON public.billing_activity USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);

CREATE INDEX idx_billing_activity_type ON public.billing_activity USING btree (event_type);

CREATE INDEX idx_cat_client_user_composite ON public.coach_auto_todolist USING btree (client_id, client_user_type) WHERE (client_id IS NOT NULL);

CREATE INDEX idx_cat_coach_completed ON public.coach_auto_todolist USING btree (coach_id, completed);

CREATE INDEX idx_cc_client_id ON public.client_checkins USING btree (client_id);

CREATE INDEX idx_cca_client_id ON public.coach_client_assignments USING btree (client_id);

CREATE INDEX idx_cca_invitation_token ON public.coach_client_assignments USING btree (invitation_token);

CREATE INDEX idx_ccl_client_id ON public.client_checkin_logs USING btree (client_id);

CREATE INDEX idx_ccl_coach_status_date ON public.client_checkin_logs USING btree (coach_id, status, submission_date DESC);

CREATE INDEX idx_cf_client_id ON public.client_files USING btree (client_id);

CREATE INDEX idx_cg_client ON public.client_goals USING btree (client_id);

CREATE INDEX idx_ch_client_id ON public.client_habits USING btree (client_id);

CREATE INDEX idx_checkin_logs_coach ON public.client_checkin_logs USING btree (coach_id, submission_date DESC);

CREATE INDEX idx_checkins_coach ON public.coach_checkins USING btree (coach_id);

CREATE INDEX idx_ci_client ON public.client_injuries USING btree (client_id);

CREATE INDEX idx_client_bio_coach_id ON public.client_bio USING btree (coach_id);

CREATE INDEX idx_client_checkins_assignment ON public.client_checkin_logs USING btree (assignment_id);

CREATE INDEX idx_client_files_client_coach_file ON public.client_files USING btree (client_id, coach_file_id) WHERE (coach_file_id IS NOT NULL);

CREATE INDEX idx_client_files_coach_file_id ON public.client_files USING btree (coach_file_id);

CREATE INDEX idx_client_goals_coach_id ON public.client_goals USING btree (coach_id);

CREATE INDEX idx_client_habit_logs_client_assignment ON public.client_habit_logs USING btree (client_id, assignment_id);

CREATE INDEX idx_client_habits_assignment ON public.client_habit_logs USING btree (assignment_id);

CREATE INDEX idx_client_injuries_coach_id ON public.client_injuries USING btree (coach_id);

CREATE INDEX idx_client_metric_logs_client_assignment ON public.client_metric_logs USING btree (client_id, assignment_id);

CREATE INDEX idx_client_metrics_assignment ON public.client_metric_logs USING btree (assignment_id);

CREATE INDEX idx_client_notes_coach_id ON public.client_notes USING btree (coach_id);

CREATE INDEX idx_client_package_assignments_client ON public.client_package_assignments USING btree (client_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_client_package_assignments_coach ON public.client_package_assignments USING btree (coach_id);

CREATE INDEX idx_client_package_assignments_package ON public.client_package_assignments USING btree (package_id);

CREATE INDEX idx_client_photo_logs_client_date ON public.client_photo_logs USING btree (client_id, date);

CREATE INDEX idx_client_photo_logs_date ON public.client_photo_logs USING btree (date);

CREATE INDEX idx_client_pt_client ON public.client_push_tokens USING btree (client_id);

CREATE INDEX idx_client_pt_token ON public.client_push_tokens USING btree (expo_push_token);

CREATE INDEX idx_client_subscriptions_cancel_at ON public.client_subscriptions USING btree (cancel_at) WHERE (cancel_at IS NOT NULL);

CREATE INDEX idx_client_subscriptions_client ON public.client_subscriptions USING btree (client_id);

CREATE INDEX idx_client_subscriptions_coach ON public.client_subscriptions USING btree (coach_id);

CREATE INDEX idx_client_subscriptions_period_end ON public.client_subscriptions USING btree (current_period_end) WHERE (status = ANY (ARRAY['active'::text, 'past_due'::text]));

CREATE INDEX idx_client_subscriptions_status ON public.client_subscriptions USING btree (status);

CREATE INDEX idx_client_tasks_client_due ON public.client_tasks USING btree (client_id, due_date);

CREATE INDEX idx_client_tasks_coach_client ON public.client_tasks USING btree (coach_id, client_id);

CREATE INDEX idx_client_training_coach_date ON public.client_training USING btree (coach_id, date);

CREATE INDEX idx_cm_client_id ON public.client_metrics USING btree (client_id);

CREATE INDEX idx_cn_client_pinned ON public.client_notes USING btree (client_id, is_pinned DESC, created_at DESC);

CREATE INDEX idx_cn_coach_created ON public.coach_notifications USING btree (coach_id, created_at DESC);

CREATE INDEX idx_cn_coach_unread ON public.coach_notifications USING btree (coach_id) WHERE (read_at IS NULL);

CREATE INDEX idx_cn_type ON public.coach_notifications USING btree (notification_type);

CREATE INDEX idx_cnp_coach ON public.coach_notification_preferences USING btree (coach_id);

CREATE INDEX idx_coach_auto_todolist_client_id ON public.coach_auto_todolist USING btree (client_id) WHERE (client_id IS NOT NULL);

CREATE INDEX idx_coach_checkins_coach_id_lower_name ON public.coach_checkins USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_client_assignments_invitation_token ON public.coach_client_assignments USING btree (invitation_token) WHERE (invitation_token IS NOT NULL);

CREATE INDEX idx_coach_company_owner ON public.coach_company_information USING btree (coach_id);

CREATE INDEX idx_coach_coupons_coach_id ON public.coach_coupons USING btree (coach_id);

CREATE INDEX idx_coach_exercises_coach_id_lower_name ON public.coach_exercises USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_file_folders_coach ON public.coach_file_folders USING btree (coach_id);

CREATE INDEX idx_coach_files_folder ON public.coach_files USING btree (folder_id);

CREATE INDEX idx_coach_flows_coach_id_lower_name ON public.coach_flows USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_habit_folders_coach ON public.coach_habit_folders USING btree (coach_id);

CREATE INDEX idx_coach_habits_coach_id_lower_name ON public.coach_habits USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_habits_folder ON public.coach_habits USING btree (folder_id);

CREATE INDEX idx_coach_metric_folders_coach ON public.coach_metric_folders USING btree (coach_id);

CREATE INDEX idx_coach_metrics_coach_id_lower_name ON public.coach_metrics USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_metrics_folder ON public.coach_metrics USING btree (folder_id);

CREATE INDEX idx_coach_onboardings_active ON public.coach_onboardings USING btree (coach_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_coach_onboardings_coach_id ON public.coach_onboardings USING btree (coach_id);

CREATE INDEX idx_coach_own_todolist_client_id ON public.coach_own_todolist USING btree (client_id) WHERE (client_id IS NOT NULL);

CREATE INDEX idx_coach_packages_active ON public.coach_packages USING btree (coach_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_coach_packages_coach_id ON public.coach_packages USING btree (coach_id);

CREATE INDEX idx_coach_packages_revenue ON public.coach_packages USING btree (coach_id, total_revenue_cents DESC);

CREATE UNIQUE INDEX idx_coach_packages_stripe_unique ON public.coach_packages USING btree (coach_id, stripe_product_id, stripe_price_id) WHERE ((stripe_product_id IS NOT NULL) AND (stripe_price_id IS NOT NULL));

CREATE INDEX idx_coach_preferences_owner ON public.coach_preferences USING btree (coach_id);

CREATE INDEX idx_coach_profiles_active ON public.coach_profiles USING btree (is_active);

CREATE INDEX idx_coach_profiles_referrer ON public.coach_profiles USING btree (referrer_coach_id) WHERE (referrer_coach_id IS NOT NULL);

CREATE INDEX idx_coach_programs_coach_id_lower_name ON public.coach_programs USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_programs_difficulty ON public.coach_programs USING btree (difficulty) WHERE (difficulty IS NOT NULL);

CREATE INDEX idx_coach_programs_type ON public.coach_programs USING btree (type) WHERE (type IS NOT NULL);

CREATE INDEX idx_coach_questionnaires_coach_id_lower_name ON public.coach_questionnaires USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_referrals_referrer ON public.coach_referrals USING btree (referrer_coach_id, created_at DESC);

CREATE INDEX idx_coach_referrals_status ON public.coach_referrals USING btree (status);

CREATE INDEX idx_coach_sequences_coach_id ON public.coach_sequences USING btree (coach_id);

CREATE INDEX idx_coach_workouts_coach_id_lower_name ON public.coach_workouts USING btree (coach_id, lower(name));

CREATE INDEX idx_coach_workouts_type ON public.coach_workouts USING btree (type);

CREATE INDEX idx_conv_client ON public.conversations USING btree (client_id);

CREATE INDEX idx_conv_client_last_msg ON public.conversations USING btree (client_id, last_message_at DESC NULLS LAST);

CREATE INDEX idx_conv_coach ON public.conversations USING btree (coach_id);

CREATE INDEX idx_conv_coach_last_msg ON public.conversations USING btree (coach_id, last_message_at DESC NULLS LAST);

CREATE INDEX idx_conv_last_message ON public.conversations USING btree (last_message_at DESC NULLS LAST);

CREATE INDEX idx_conversation_presence_user ON public.conversation_presence USING btree (user_id, conversation_id);

CREATE INDEX idx_cot_client_user_composite ON public.coach_own_todolist USING btree (client_id, client_user_type) WHERE (client_id IS NOT NULL);

CREATE INDEX idx_cot_coach_completed ON public.coach_own_todolist USING btree (coach_id, completed);

CREATE INDEX idx_cot_coach_due ON public.coach_own_todolist USING btree (coach_id, due_date);

CREATE INDEX idx_cot_open_due ON public.coach_own_todolist USING btree (coach_id, due_date) WHERE (completed = false);

CREATE INDEX idx_cp_other_user ON public.conversation_participants USING btree (other_user_id);

CREATE INDEX idx_cp_user ON public.conversation_participants USING btree (user_id);

CREATE INDEX idx_cp_user_archived ON public.conversation_participants USING btree (user_id, is_archived);

CREATE INDEX idx_cp_user_pinned ON public.conversation_participants USING btree (user_id, is_pinned) WHERE (is_pinned = true);

CREATE INDEX idx_cpnl_client_date ON public.client_push_notification_log USING btree (client_id, notification_date);

CREATE INDEX idx_cpt_coach ON public.coach_push_tokens USING btree (coach_id);

CREATE INDEX idx_cpt_token ON public.coach_push_tokens USING btree (expo_push_token);

CREATE INDEX idx_cq_client_id ON public.client_questionnaires USING btree (client_id);

CREATE INDEX idx_cteh_client_exercise_date ON public.client_training_exercise_history USING btree (client_id, exercise_id, date DESC);

CREATE INDEX idx_cteh_coach_exercise ON public.client_training_exercise_history USING btree (coach_id, exercise_id);

CREATE INDEX idx_cth_client_date ON public.client_training_history USING btree (client_id, date);

CREATE INDEX idx_cth_coach_date_status ON public.client_training_history USING btree (coach_id, date, status);

CREATE INDEX idx_cts_activity ON public.client_training_summary USING btree (last_activity DESC);

CREATE INDEX idx_cts_client_activity ON public.client_training_summary USING btree (client_id, last_activity DESC);

CREATE INDEX idx_exercises_coach ON public.coach_exercises USING btree (coach_id);

CREATE INDEX idx_fe_flow_status ON public.flow_executions USING btree (flow_id, status);

CREATE INDEX idx_fe_status_wait ON public.flow_executions USING btree (status, wait_until) WHERE (status = ANY (ARRAY['pending'::text, 'waiting'::text]));

CREATE UNIQUE INDEX idx_fe_trigger_key_active ON public.flow_executions USING btree (trigger_key) WHERE (status <> ALL (ARRAY['completed'::text, 'cancelled'::text, 'failed'::text]));

CREATE INDEX idx_fecl_started_at ON public.flow_execution_cron_log USING btree (started_at DESC);

CREATE INDEX idx_fel_execution ON public.flow_execution_log USING btree (execution_id, executed_at);

CREATE INDEX idx_files_coach ON public.coach_files USING btree (coach_id);

CREATE INDEX idx_flows_coach ON public.coach_flows USING btree (coach_id);

CREATE INDEX idx_fr_created_at ON public.feature_requests USING btree (created_at DESC);

CREATE INDEX idx_fr_status ON public.feature_requests USING btree (status);

CREATE INDEX idx_fr_upvote_count ON public.feature_requests USING btree (upvote_count DESC);

CREATE INDEX idx_fr_user_id ON public.feature_requests USING btree (user_id);

CREATE INDEX idx_frr_feature_request_created ON public.feature_request_replies USING btree (feature_request_id, created_at);

CREATE INDEX idx_fru_feature_request ON public.feature_request_upvotes USING btree (feature_request_id);

CREATE INDEX idx_fru_user ON public.feature_request_upvotes USING btree (user_id);

CREATE INDEX idx_ftcl_started_at ON public.flow_trigger_cron_log USING btree (started_at DESC);

CREATE INDEX idx_ftecl_started_at ON public.free_trial_expiry_cron_log USING btree (started_at DESC);

CREATE INDEX idx_habits_coach ON public.coach_habits USING btree (coach_id);

CREATE INDEX idx_logs_client_history ON public.client_habit_logs USING btree (client_id, date DESC);

CREATE INDEX idx_logs_coach_recent ON public.client_habit_logs USING btree (coach_id, date DESC);

CREATE INDEX idx_mcpl_started_at ON public.musclewiki_cache_population_log USING btree (started_at DESC);

CREATE INDEX idx_mcpl_status ON public.musclewiki_cache_population_log USING btree (status);

CREATE UNIQUE INDEX idx_messages_idempotency_key ON public.messages USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE INDEX idx_messages_pending_attachments ON public.messages USING btree (conversation_id, attachments_ready) WHERE (attachments_ready = false);

CREATE INDEX idx_metric_logs_client_history ON public.client_metric_logs USING btree (client_id, date DESC);

CREATE INDEX idx_metric_logs_coach_recent ON public.client_metric_logs USING btree (coach_id, date DESC);

CREATE INDEX idx_metrics_coach ON public.coach_metrics USING btree (coach_id);

CREATE INDEX idx_msg_active ON public.messages USING btree (conversation_id, sent_at DESC) WHERE (is_deleted = false);

CREATE INDEX idx_msg_conversation_sent ON public.messages USING btree (conversation_id, sent_at DESC);

CREATE INDEX idx_msg_parent ON public.messages USING btree (parent_message_id) WHERE (parent_message_id IS NOT NULL);

CREATE INDEX idx_msg_sender ON public.messages USING btree (sender_id);

CREATE INDEX idx_msg_sent_at ON public.messages USING btree (sent_at DESC);

CREATE INDEX idx_msg_status ON public.messages USING btree (conversation_id, status) WHERE (status = ANY (ARRAY['sending'::text, 'failed'::text]));

CREATE INDEX idx_mwaal_cache_hit ON public.musclewiki_api_audit_log USING btree (cache_hit);

CREATE INDEX idx_mwaal_content_type ON public.musclewiki_api_audit_log USING btree (content_type);

CREATE INDEX idx_mwaal_created_at ON public.musclewiki_api_audit_log USING btree (created_at DESC);

CREATE INDEX idx_mwaal_endpoint ON public.musclewiki_api_audit_log USING btree (endpoint);

CREATE INDEX idx_mwcl_started_at ON public.missed_workout_cron_log USING btree (started_at DESC);

CREATE INDEX idx_mwec_cache_expires ON public.musclewiki_exercise_cache USING btree (cache_expires_at);

CREATE INDEX idx_mwec_category ON public.musclewiki_exercise_cache USING btree (category);

CREATE INDEX idx_mwec_difficulty ON public.musclewiki_exercise_cache USING btree (difficulty);

CREATE INDEX idx_mwec_musclewiki_id ON public.musclewiki_exercise_cache USING btree (musclewiki_id);

CREATE INDEX idx_mwec_name ON public.musclewiki_exercise_cache USING btree (name);

CREATE INDEX idx_mwec_name_search ON public.musclewiki_exercise_cache USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_mwec_target_muscles ON public.musclewiki_exercise_cache USING gin (target_muscles);

CREATE INDEX idx_mwfc_filter_type ON public.musclewiki_filter_cache USING btree (filter_type);

CREATE INDEX idx_payments_client ON public.payments USING btree (client_id);

CREATE INDEX idx_payments_coach ON public.payments USING btree (coach_id);

CREATE INDEX idx_payments_coach_client ON public.payments USING btree (coach_id, client_id);

CREATE INDEX idx_payments_coupon_package ON public.payments USING btree (coupon_id, package_id) WHERE (coupon_id IS NOT NULL);

CREATE INDEX idx_payments_paid_at ON public.payments USING btree (paid_at DESC) WHERE (paid_at IS NOT NULL);

CREATE INDEX idx_payments_status ON public.payments USING btree (status);

CREATE INDEX idx_photo_logs_client_date ON public.client_photo_logs USING btree (client_id, date DESC);

CREATE INDEX idx_photo_logs_coach_date ON public.client_photo_logs USING btree (coach_id, date DESC);

CREATE INDEX idx_platform_addons_active ON public.platform_addons USING btree (coach_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_platform_addons_coach ON public.platform_addons USING btree (coach_id);

CREATE INDEX idx_platform_billing_activity_coach ON public.platform_billing_activity USING btree (coach_id, created_at DESC);

CREATE INDEX idx_platform_billing_activity_stripe_event ON public.platform_billing_activity USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);

CREATE INDEX idx_platform_billing_activity_type ON public.platform_billing_activity USING btree (event_type);

CREATE INDEX idx_platform_subscriptions_period_end ON public.platform_subscriptions USING btree (current_period_end) WHERE (status = ANY (ARRAY['active'::public.platform_subscription_status, 'trialing'::public.platform_subscription_status, 'past_due'::public.platform_subscription_status]));

CREATE INDEX idx_platform_subscriptions_plan ON public.platform_subscriptions USING btree (plan_type);

CREATE INDEX idx_platform_subscriptions_status ON public.platform_subscriptions USING btree (status);

CREATE INDEX idx_platform_subscriptions_stripe_customer ON public.platform_subscriptions USING btree (stripe_customer_id);

CREATE INDEX idx_programs_coach ON public.coach_programs USING btree (coach_id);

CREATE INDEX idx_quest_coach ON public.coach_questionnaires USING btree (coach_id);

CREATE INDEX idx_reaction_conversation ON public.message_reactions USING btree (conversation_id);

CREATE INDEX idx_reaction_message ON public.message_reactions USING btree (message_id);

CREATE INDEX idx_reaction_user ON public.message_reactions USING btree (user_id);

CREATE INDEX idx_receipt_conversation ON public.message_read_receipts USING btree (conversation_id);

CREATE INDEX idx_receipt_message ON public.message_read_receipts USING btree (last_read_message_id) WHERE (last_read_message_id IS NOT NULL);

CREATE INDEX idx_receipt_user ON public.message_read_receipts USING btree (user_id);

CREATE INDEX idx_sections_coach ON public.coach_sections USING btree (coach_id);

CREATE INDEX idx_sections_coach_type ON public.coach_sections USING btree (coach_id, section_type);

CREATE INDEX idx_sections_type ON public.coach_sections USING btree (section_type);

CREATE INDEX idx_stripe_prices_lookup ON public.platform_stripe_prices USING btree (price_type, plan_type, addon_type, client_limit, billing_interval) WHERE (is_active = true);

CREATE INDEX idx_stripe_webhook_events_type ON public.stripe_webhook_events USING btree (type);

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);

CREATE INDEX idx_user_profiles_id ON public.user_profiles USING btree (id);

CREATE INDEX idx_user_profiles_user_type ON public.user_profiles USING btree (user_type);

CREATE INDEX idx_workouts_coach ON public.coach_workouts USING btree (coach_id);

CREATE UNIQUE INDEX message_attachments_pkey ON public.message_attachments USING btree (id);

CREATE UNIQUE INDEX message_reactions_pkey ON public.message_reactions USING btree (id);

CREATE UNIQUE INDEX message_read_receipts_pkey ON public.message_read_receipts USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX missed_workout_cron_log_pkey ON public.missed_workout_cron_log USING btree (id);

CREATE UNIQUE INDEX musclewiki_api_audit_log_pkey ON public.musclewiki_api_audit_log USING btree (id);

CREATE UNIQUE INDEX musclewiki_cache_population_log_pkey ON public.musclewiki_cache_population_log USING btree (id);

CREATE UNIQUE INDEX musclewiki_exercise_cache_musclewiki_id_key ON public.musclewiki_exercise_cache USING btree (musclewiki_id);

CREATE UNIQUE INDEX musclewiki_exercise_cache_pkey ON public.musclewiki_exercise_cache USING btree (id);

CREATE UNIQUE INDEX musclewiki_filter_cache_pkey ON public.musclewiki_filter_cache USING btree (id);

CREATE UNIQUE INDEX musclewiki_sync_metadata_pkey ON public.musclewiki_sync_metadata USING btree (id);

CREATE UNIQUE INDEX musclewiki_sync_metadata_sync_type_key ON public.musclewiki_sync_metadata USING btree (sync_type);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX payments_stripe_checkout_session_id_key ON public.payments USING btree (stripe_checkout_session_id);

CREATE UNIQUE INDEX payments_stripe_payment_intent_id_key ON public.payments USING btree (stripe_payment_intent_id);

CREATE UNIQUE INDEX platform_addons_coach_id_addon_type_key ON public.platform_addons USING btree (coach_id, addon_type);

CREATE UNIQUE INDEX platform_addons_pkey ON public.platform_addons USING btree (id);

CREATE UNIQUE INDEX platform_addons_stripe_subscription_item_id_key ON public.platform_addons USING btree (stripe_subscription_item_id);

CREATE UNIQUE INDEX platform_billing_activity_pkey ON public.platform_billing_activity USING btree (id);

CREATE UNIQUE INDEX platform_stripe_prices_pkey ON public.platform_stripe_prices USING btree (id);

CREATE UNIQUE INDEX platform_stripe_prices_price_type_plan_type_addon_type_clie_key ON public.platform_stripe_prices USING btree (price_type, plan_type, addon_type, client_limit, billing_interval) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX platform_stripe_prices_stripe_price_id_key ON public.platform_stripe_prices USING btree (stripe_price_id);

CREATE UNIQUE INDEX platform_subscriptions_coach_id_key ON public.platform_subscriptions USING btree (coach_id);

CREATE UNIQUE INDEX platform_subscriptions_pkey ON public.platform_subscriptions USING btree (id);

CREATE UNIQUE INDEX platform_subscriptions_stripe_customer_id_key ON public.platform_subscriptions USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);

CREATE UNIQUE INDEX platform_subscriptions_stripe_subscription_id_key ON public.platform_subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX stripe_webhook_events_pkey ON public.stripe_webhook_events USING btree (id);

CREATE UNIQUE INDEX uq_attach_file_path ON public.message_attachments USING btree (bucket_id, file_path);

CREATE UNIQUE INDEX uq_client_package_assignments_coach_client_package ON public.client_package_assignments USING btree (coach_id, client_id, package_id);

CREATE UNIQUE INDEX uq_coach_files_path ON public.coach_files USING btree (bucket_id, file_path);

CREATE UNIQUE INDEX uq_coach_packages_stripe_ids ON public.coach_packages USING btree (coach_id, stripe_product_id, stripe_price_id);

CREATE UNIQUE INDEX uq_coach_sections_name_ci ON public.coach_sections USING btree (coach_id, lower(name));

CREATE UNIQUE INDEX uq_conversation_coach_client ON public.conversations USING btree (coach_id, client_id);

CREATE UNIQUE INDEX uq_fru_feature_request_user ON public.feature_request_upvotes USING btree (feature_request_id, user_id);

CREATE UNIQUE INDEX uq_mwfc_type_value ON public.musclewiki_filter_cache USING btree (filter_type, filter_value);

CREATE UNIQUE INDEX uq_reaction_user_message ON public.message_reactions USING btree (message_id, user_id);

CREATE UNIQUE INDEX uq_receipt_user_conversation ON public.message_read_receipts USING btree (conversation_id, user_id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id, user_type);

alter table "public"."ai_assistant_daily_usage" add constraint "ai_assistant_daily_usage_pkey" PRIMARY KEY using index "ai_assistant_daily_usage_pkey";

alter table "public"."assistant_todo_cron_log" add constraint "assistant_todo_cron_log_pkey" PRIMARY KEY using index "assistant_todo_cron_log_pkey";

alter table "public"."billing_activity" add constraint "billing_activity_pkey" PRIMARY KEY using index "billing_activity_pkey";

alter table "public"."client_bio" add constraint "client_bio_pkey" PRIMARY KEY using index "client_bio_pkey";

alter table "public"."client_checkin_logs" add constraint "client_checkin_logs_pkey" PRIMARY KEY using index "client_checkin_logs_pkey";

alter table "public"."client_checkins" add constraint "client_checkins_pkey" PRIMARY KEY using index "client_checkins_pkey";

alter table "public"."client_files" add constraint "client_files_pkey" PRIMARY KEY using index "client_files_pkey";

alter table "public"."client_goals" add constraint "client_goals_pkey" PRIMARY KEY using index "client_goals_pkey";

alter table "public"."client_habit_logs" add constraint "client_habit_logs_pkey" PRIMARY KEY using index "client_habit_logs_pkey";

alter table "public"."client_habits" add constraint "client_habits_pkey" PRIMARY KEY using index "client_habits_pkey";

alter table "public"."client_injuries" add constraint "client_injuries_pkey" PRIMARY KEY using index "client_injuries_pkey";

alter table "public"."client_metric_logs" add constraint "client_metric_logs_pkey" PRIMARY KEY using index "client_metric_logs_pkey";

alter table "public"."client_metrics" add constraint "client_metrics_pkey" PRIMARY KEY using index "client_metrics_pkey";

alter table "public"."client_notes" add constraint "client_notes_pkey" PRIMARY KEY using index "client_notes_pkey";

alter table "public"."client_package_assignments" add constraint "client_package_assignments_pkey" PRIMARY KEY using index "client_package_assignments_pkey";

alter table "public"."client_photo_logs" add constraint "client_photo_logs_pkey" PRIMARY KEY using index "client_photo_logs_pkey";

alter table "public"."client_profiles" add constraint "client_profiles_pkey" PRIMARY KEY using index "client_profiles_pkey";

alter table "public"."client_push_notification_log" add constraint "client_push_notification_log_pkey" PRIMARY KEY using index "client_push_notification_log_pkey";

alter table "public"."client_push_tokens" add constraint "client_push_tokens_pkey" PRIMARY KEY using index "client_push_tokens_pkey";

alter table "public"."client_questionnaires" add constraint "client_questionnaires_pkey" PRIMARY KEY using index "client_questionnaires_pkey";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_pkey" PRIMARY KEY using index "client_subscriptions_pkey";

alter table "public"."client_tasks" add constraint "client_tasks_pkey" PRIMARY KEY using index "client_tasks_pkey";

alter table "public"."client_training" add constraint "client_training_new_pkey1" PRIMARY KEY using index "client_training_new_pkey1";

alter table "public"."client_training_exercise_history" add constraint "client_training_exercise_history_pkey" PRIMARY KEY using index "client_training_exercise_history_pkey";

alter table "public"."client_training_history" add constraint "client_training_history_pkey" PRIMARY KEY using index "client_training_history_pkey";

alter table "public"."client_training_summary" add constraint "client_training_summary_pkey" PRIMARY KEY using index "client_training_summary_pkey";

alter table "public"."coach_auto_todolist" add constraint "coach_auto_todolist_pkey" PRIMARY KEY using index "coach_auto_todolist_pkey";

alter table "public"."coach_checkins" add constraint "coach_checkins_pkey" PRIMARY KEY using index "coach_checkins_pkey";

alter table "public"."coach_client_assignments" add constraint "coach_client_assignments_pkey" PRIMARY KEY using index "coach_client_assignments_pkey";

alter table "public"."coach_company_information" add constraint "coach_company_information_pkey" PRIMARY KEY using index "coach_company_information_pkey";

alter table "public"."coach_coupons" add constraint "discount_codes_pkey" PRIMARY KEY using index "discount_codes_pkey";

alter table "public"."coach_entitlements" add constraint "coach_entitlements_pkey" PRIMARY KEY using index "coach_entitlements_pkey";

alter table "public"."coach_exercises" add constraint "coach_exercises_pkey" PRIMARY KEY using index "coach_exercises_pkey";

alter table "public"."coach_file_folders" add constraint "coach_file_folders_pkey" PRIMARY KEY using index "coach_file_folders_pkey";

alter table "public"."coach_files" add constraint "coach_files_pkey" PRIMARY KEY using index "coach_files_pkey";

alter table "public"."coach_flows" add constraint "coach_flows_pkey" PRIMARY KEY using index "coach_flows_pkey";

alter table "public"."coach_getting_started_checklist" add constraint "coach_getting_started_checklist_pkey" PRIMARY KEY using index "coach_getting_started_checklist_pkey";

alter table "public"."coach_habit_folders" add constraint "coach_habit_folders_pkey" PRIMARY KEY using index "coach_habit_folders_pkey";

alter table "public"."coach_habits" add constraint "coach_habits_pkey" PRIMARY KEY using index "coach_habits_pkey";

alter table "public"."coach_metric_folders" add constraint "coach_metric_folders_pkey" PRIMARY KEY using index "coach_metric_folders_pkey";

alter table "public"."coach_metrics" add constraint "coach_metrics_pkey" PRIMARY KEY using index "coach_metrics_pkey";

alter table "public"."coach_notification_preferences" add constraint "coach_notification_preferences_pkey" PRIMARY KEY using index "coach_notification_preferences_pkey";

alter table "public"."coach_notifications" add constraint "coach_notifications_pkey" PRIMARY KEY using index "coach_notifications_pkey";

alter table "public"."coach_onboardings" add constraint "coach_onboardings_pkey" PRIMARY KEY using index "coach_onboardings_pkey";

alter table "public"."coach_own_todolist" add constraint "coach_own_todolist_pkey" PRIMARY KEY using index "coach_own_todolist_pkey";

alter table "public"."coach_packages" add constraint "coach_packages_pkey" PRIMARY KEY using index "coach_packages_pkey";

alter table "public"."coach_preferences" add constraint "coach_preferences_pkey" PRIMARY KEY using index "coach_preferences_pkey";

alter table "public"."coach_profiles" add constraint "coach_profiles_pkey" PRIMARY KEY using index "coach_profiles_pkey";

alter table "public"."coach_programs" add constraint "coach_programs_pkey" PRIMARY KEY using index "coach_programs_pkey";

alter table "public"."coach_push_tokens" add constraint "coach_push_tokens_pkey" PRIMARY KEY using index "coach_push_tokens_pkey";

alter table "public"."coach_questionnaires" add constraint "coach_questionnaires_pkey" PRIMARY KEY using index "coach_questionnaires_pkey";

alter table "public"."coach_referrals" add constraint "coach_referrals_pkey" PRIMARY KEY using index "coach_referrals_pkey";

alter table "public"."coach_sections" add constraint "coach_sections_pkey" PRIMARY KEY using index "coach_sections_pkey";

alter table "public"."coach_sequences" add constraint "coach_sequences_pkey" PRIMARY KEY using index "coach_sequences_pkey";

alter table "public"."coach_stripe_accounts" add constraint "coach_stripe_accounts_pkey" PRIMARY KEY using index "coach_stripe_accounts_pkey";

alter table "public"."coach_unique_codes" add constraint "coach_unique_codes_pkey" PRIMARY KEY using index "coach_unique_codes_pkey";

alter table "public"."coach_workouts" add constraint "coach_workouts_pkey" PRIMARY KEY using index "coach_workouts_pkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_pkey" PRIMARY KEY using index "conversation_participants_pkey";

alter table "public"."conversation_presence" add constraint "conversation_presence_pkey" PRIMARY KEY using index "conversation_presence_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."feature_request_replies" add constraint "feature_request_replies_pkey" PRIMARY KEY using index "feature_request_replies_pkey";

alter table "public"."feature_request_upvotes" add constraint "feature_request_upvotes_pkey" PRIMARY KEY using index "feature_request_upvotes_pkey";

alter table "public"."feature_requests" add constraint "feature_requests_pkey" PRIMARY KEY using index "feature_requests_pkey";

alter table "public"."flow_execution_cron_log" add constraint "flow_execution_cron_log_pkey" PRIMARY KEY using index "flow_execution_cron_log_pkey";

alter table "public"."flow_execution_log" add constraint "flow_execution_log_pkey" PRIMARY KEY using index "flow_execution_log_pkey";

alter table "public"."flow_executions" add constraint "flow_executions_pkey" PRIMARY KEY using index "flow_executions_pkey";

alter table "public"."flow_trigger_cron_log" add constraint "flow_trigger_cron_log_pkey" PRIMARY KEY using index "flow_trigger_cron_log_pkey";

alter table "public"."free_trial_expiry_cron_log" add constraint "free_trial_expiry_cron_log_pkey" PRIMARY KEY using index "free_trial_expiry_cron_log_pkey";

alter table "public"."message_attachments" add constraint "message_attachments_pkey" PRIMARY KEY using index "message_attachments_pkey";

alter table "public"."message_reactions" add constraint "message_reactions_pkey" PRIMARY KEY using index "message_reactions_pkey";

alter table "public"."message_read_receipts" add constraint "message_read_receipts_pkey" PRIMARY KEY using index "message_read_receipts_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."missed_workout_cron_log" add constraint "missed_workout_cron_log_pkey" PRIMARY KEY using index "missed_workout_cron_log_pkey";

alter table "public"."musclewiki_api_audit_log" add constraint "musclewiki_api_audit_log_pkey" PRIMARY KEY using index "musclewiki_api_audit_log_pkey";

alter table "public"."musclewiki_cache_population_log" add constraint "musclewiki_cache_population_log_pkey" PRIMARY KEY using index "musclewiki_cache_population_log_pkey";

alter table "public"."musclewiki_exercise_cache" add constraint "musclewiki_exercise_cache_pkey" PRIMARY KEY using index "musclewiki_exercise_cache_pkey";

alter table "public"."musclewiki_filter_cache" add constraint "musclewiki_filter_cache_pkey" PRIMARY KEY using index "musclewiki_filter_cache_pkey";

alter table "public"."musclewiki_sync_metadata" add constraint "musclewiki_sync_metadata_pkey" PRIMARY KEY using index "musclewiki_sync_metadata_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."platform_addons" add constraint "platform_addons_pkey" PRIMARY KEY using index "platform_addons_pkey";

alter table "public"."platform_billing_activity" add constraint "platform_billing_activity_pkey" PRIMARY KEY using index "platform_billing_activity_pkey";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_pkey" PRIMARY KEY using index "platform_stripe_prices_pkey";

alter table "public"."platform_subscriptions" add constraint "platform_subscriptions_pkey" PRIMARY KEY using index "platform_subscriptions_pkey";

alter table "public"."stripe_webhook_events" add constraint "stripe_webhook_events_pkey" PRIMARY KEY using index "stripe_webhook_events_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."ai_assistant_daily_usage" add constraint "ai_assistant_daily_usage_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ai_assistant_daily_usage" validate constraint "ai_assistant_daily_usage_coach_id_fkey";

alter table "public"."ai_assistant_daily_usage" add constraint "ai_assistant_daily_usage_coach_id_usage_date_key" UNIQUE using index "ai_assistant_daily_usage_coach_id_usage_date_key";

alter table "public"."billing_activity" add constraint "billing_activity_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."billing_activity" validate constraint "billing_activity_client_id_fkey";

alter table "public"."billing_activity" add constraint "billing_activity_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."billing_activity" validate constraint "billing_activity_coach_id_fkey";

alter table "public"."billing_activity" add constraint "billing_activity_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.coach_packages(id) ON DELETE SET NULL not valid;

alter table "public"."billing_activity" validate constraint "billing_activity_package_id_fkey";

alter table "public"."billing_activity" add constraint "billing_activity_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.client_subscriptions(id) ON DELETE SET NULL not valid;

alter table "public"."billing_activity" validate constraint "billing_activity_subscription_id_fkey";

alter table "public"."client_bio" add constraint "client_bio_client_id_key" UNIQUE using index "client_bio_client_id_key";

alter table "public"."client_bio" add constraint "fk_cb_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_bio" validate constraint "fk_cb_client";

alter table "public"."client_bio" add constraint "fk_cb_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_bio" validate constraint "fk_cb_coach";

alter table "public"."client_checkin_logs" add constraint "client_checkin_logs_assignment_submission_unique" UNIQUE using index "client_checkin_logs_assignment_submission_unique";

alter table "public"."client_checkin_logs" add constraint "client_checkin_logs_status_check" CHECK ((status = ANY (ARRAY['assigned'::text, 'review'::text, 'reviewed'::text]))) not valid;

alter table "public"."client_checkin_logs" validate constraint "client_checkin_logs_status_check";

alter table "public"."client_checkin_logs" add constraint "fk_ccl_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_checkin_logs" validate constraint "fk_ccl_client";

alter table "public"."client_checkin_logs" add constraint "fk_client_checkin_logs_assignment" FOREIGN KEY (assignment_id) REFERENCES public.client_checkins(id) ON DELETE CASCADE not valid;

alter table "public"."client_checkin_logs" validate constraint "fk_client_checkin_logs_assignment";

alter table "public"."client_checkins" add constraint "client_checkins_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'live'::text, 'paused'::text]))) not valid;

alter table "public"."client_checkins" validate constraint "client_checkins_status_check";

alter table "public"."client_checkins" add constraint "fk_cca_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_checkins" validate constraint "fk_cca_client";

alter table "public"."client_files" add constraint "client_files_coach_file_id_fkey" FOREIGN KEY (coach_file_id) REFERENCES public.coach_files(id) ON DELETE SET NULL not valid;

alter table "public"."client_files" validate constraint "client_files_coach_file_id_fkey";

alter table "public"."client_files" add constraint "fk_cfa_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_files" validate constraint "fk_cfa_client";

alter table "public"."client_goals" add constraint "fk_cg_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_goals" validate constraint "fk_cg_client";

alter table "public"."client_goals" add constraint "fk_cg_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_goals" validate constraint "fk_cg_coach";

alter table "public"."client_habit_logs" add constraint "client_habit_logs_assignment_date_unique" UNIQUE using index "client_habit_logs_assignment_date_unique";

alter table "public"."client_habit_logs" add constraint "client_habit_logs_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.client_habits(id) ON DELETE CASCADE not valid;

alter table "public"."client_habit_logs" validate constraint "client_habit_logs_assignment_id_fkey";

alter table "public"."client_habit_logs" add constraint "client_habit_logs_status_check" CHECK ((status = ANY (ARRAY['completed'::text, 'skipped'::text, 'partial'::text]))) not valid;

alter table "public"."client_habit_logs" validate constraint "client_habit_logs_status_check";

alter table "public"."client_habit_logs" add constraint "fk_chl_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_habit_logs" validate constraint "fk_chl_client";

alter table "public"."client_habits" add constraint "client_habit_assignments_period_check" CHECK ((period = ANY (ARRAY['daily'::text, 'weekly'::text]))) not valid;

alter table "public"."client_habits" validate constraint "client_habit_assignments_period_check";

alter table "public"."client_habits" add constraint "client_habits_schedule_type_check" CHECK ((schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'custom'::text]))) not valid;

alter table "public"."client_habits" validate constraint "client_habits_schedule_type_check";

alter table "public"."client_habits" add constraint "fk_cha_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_habits" validate constraint "fk_cha_client";

alter table "public"."client_injuries" add constraint "fk_ci_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_injuries" validate constraint "fk_ci_client";

alter table "public"."client_injuries" add constraint "fk_ci_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_injuries" validate constraint "fk_ci_coach";

alter table "public"."client_metric_logs" add constraint "client_metric_logs_assignment_date_unique" UNIQUE using index "client_metric_logs_assignment_date_unique";

alter table "public"."client_metric_logs" add constraint "client_metric_logs_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.client_metrics(id) ON DELETE CASCADE not valid;

alter table "public"."client_metric_logs" validate constraint "client_metric_logs_assignment_id_fkey";

alter table "public"."client_metric_logs" add constraint "fk_cme_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_metric_logs" validate constraint "fk_cme_client";

alter table "public"."client_metrics" add constraint "client_metric_assignments_value_kind_check" CHECK ((value_kind = ANY (ARRAY['number'::text, 'percent'::text, 'duration'::text, 'score'::text]))) not valid;

alter table "public"."client_metrics" validate constraint "client_metric_assignments_value_kind_check";

alter table "public"."client_metrics" add constraint "fk_cma_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_metrics" validate constraint "fk_cma_client";

alter table "public"."client_notes" add constraint "fk_cn_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_notes" validate constraint "fk_cn_client";

alter table "public"."client_notes" add constraint "fk_cn_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_notes" validate constraint "fk_cn_coach";

alter table "public"."client_package_assignments" add constraint "client_package_assignments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_package_assignments" validate constraint "client_package_assignments_client_id_fkey";

alter table "public"."client_package_assignments" add constraint "client_package_assignments_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_package_assignments" validate constraint "client_package_assignments_coach_id_fkey";

alter table "public"."client_package_assignments" add constraint "client_package_assignments_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.coach_packages(id) ON DELETE CASCADE not valid;

alter table "public"."client_package_assignments" validate constraint "client_package_assignments_package_id_fkey";

alter table "public"."client_package_assignments" add constraint "uq_client_package_assignments_coach_client_package" UNIQUE using index "uq_client_package_assignments_coach_client_package";

alter table "public"."client_photo_logs" add constraint "client_photo_logs_client_date_unique" UNIQUE using index "client_photo_logs_client_date_unique";

alter table "public"."client_photo_logs" add constraint "fk_cpl_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_photo_logs" validate constraint "fk_cpl_client";

alter table "public"."client_profiles" add constraint "client_profiles_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text]))) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_gender_check";

alter table "public"."client_profiles" add constraint "client_profiles_unit_system_check" CHECK ((unit_system = ANY (ARRAY['metric'::text, 'imperial'::text]))) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_unit_system_check";

alter table "public"."client_profiles" add constraint "fk_client_profile" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_profiles" validate constraint "fk_client_profile";

alter table "public"."client_push_notification_log" add constraint "client_push_notification_log_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_push_notification_log" validate constraint "client_push_notification_log_client_id_fkey";

alter table "public"."client_push_notification_log" add constraint "client_push_notification_log_client_id_notification_type_no_key" UNIQUE using index "client_push_notification_log_client_id_notification_type_no_key";

alter table "public"."client_push_notification_log" add constraint "client_push_notification_log_notification_type_check" CHECK ((notification_type = ANY (ARRAY['morning_tasks'::text, 'morning_workouts'::text, 'evening_tasks'::text, 'evening_workouts'::text]))) not valid;

alter table "public"."client_push_notification_log" validate constraint "client_push_notification_log_notification_type_check";

alter table "public"."client_push_tokens" add constraint "client_push_tokens_client_id_expo_push_token_key" UNIQUE using index "client_push_tokens_client_id_expo_push_token_key";

alter table "public"."client_push_tokens" add constraint "client_push_tokens_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_push_tokens" validate constraint "client_push_tokens_client_id_fkey";

alter table "public"."client_questionnaires" add constraint "client_questionnaires_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'completed'::text]))) not valid;

alter table "public"."client_questionnaires" validate constraint "client_questionnaires_status_check";

alter table "public"."client_questionnaires" add constraint "fk_cqa_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_questionnaires" validate constraint "fk_cqa_client";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_subscriptions" validate constraint "client_subscriptions_client_id_fkey";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_subscriptions" validate constraint "client_subscriptions_coach_id_fkey";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.coach_packages(id) ON DELETE SET NULL not valid;

alter table "public"."client_subscriptions" validate constraint "client_subscriptions_package_id_fkey";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'unpaid'::text, 'trialing'::text]))) not valid;

alter table "public"."client_subscriptions" validate constraint "client_subscriptions_status_check";

alter table "public"."client_subscriptions" add constraint "client_subscriptions_stripe_subscription_id_key" UNIQUE using index "client_subscriptions_stripe_subscription_id_key";

alter table "public"."client_tasks" add constraint "client_tasks_type_check" CHECK ((task_type = ANY (ARRAY['check_in'::text, 'metric'::text, 'habit'::text, 'questionnaire'::text]))) not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_type_check";

alter table "public"."client_tasks" add constraint "client_tasks_unique" UNIQUE using index "client_tasks_unique";

alter table "public"."client_training" add constraint "chk_training_data_is_object" CHECK ((jsonb_typeof(training_data) = 'object'::text)) not valid;

alter table "public"."client_training" validate constraint "chk_training_data_is_object";

alter table "public"."client_training" add constraint "fk_ct_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_training" validate constraint "fk_ct_client";

alter table "public"."client_training" add constraint "fk_ct_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."client_training" validate constraint "fk_ct_coach";

alter table "public"."client_training_exercise_history" add constraint "chk_exercise_data_is_object" CHECK ((jsonb_typeof(exercise_data) = 'object'::text)) not valid;

alter table "public"."client_training_exercise_history" validate constraint "chk_exercise_data_is_object";

alter table "public"."client_training_exercise_history" add constraint "chk_section_type" CHECK (((section_type IS NULL) OR (section_type = ANY (ARRAY['amrap'::text, 'tabata'::text, 'hiit'::text, 'emom'::text, 'circuits'::text])))) not valid;

alter table "public"."client_training_exercise_history" validate constraint "chk_section_type";

alter table "public"."client_training_exercise_history" add constraint "fk_cteh_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_training_exercise_history" validate constraint "fk_cteh_client";

alter table "public"."client_training_exercise_history" add constraint "fk_cteh_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."client_training_exercise_history" validate constraint "fk_cteh_coach";

alter table "public"."client_training_exercise_history" add constraint "fk_cteh_training_history" FOREIGN KEY (client_id, coach_id, date, workout_id) REFERENCES public.client_training_history(client_id, coach_id, date, workout_id) ON DELETE CASCADE not valid;

alter table "public"."client_training_exercise_history" validate constraint "fk_cteh_training_history";

alter table "public"."client_training_history" add constraint "client_training_history_status_check" CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'missed'::text]))) not valid;

alter table "public"."client_training_history" validate constraint "client_training_history_status_check";

alter table "public"."client_training_history" add constraint "fk_cth_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_training_history" validate constraint "fk_cth_client";

alter table "public"."client_training_history" add constraint "fk_cth_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."client_training_history" validate constraint "fk_cth_coach";

alter table "public"."client_training_summary" add constraint "chk_counts" CHECK (((last_7_days_training_completed >= 0) AND (last_7_days_training_total >= 0) AND (last_30_days_training_completed >= 0) AND (last_30_days_training_total >= 0) AND (last_7_days_training_completed <= last_7_days_training_total) AND (last_30_days_training_completed <= last_30_days_training_total))) not valid;

alter table "public"."client_training_summary" validate constraint "chk_counts";

alter table "public"."client_training_summary" add constraint "fk_training_summary_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."client_training_summary" validate constraint "fk_training_summary_client";

alter table "public"."coach_auto_todolist" add constraint "chk_cat_type_client" CHECK ((((type = 'general'::text) AND (client_id IS NULL)) OR ((type = 'client'::text) AND (client_id IS NOT NULL)))) not valid;

alter table "public"."coach_auto_todolist" validate constraint "chk_cat_type_client";

alter table "public"."coach_auto_todolist" add constraint "coach_auto_todolist_client_user_type_check" CHECK (((client_user_type)::text = 'client'::text)) not valid;

alter table "public"."coach_auto_todolist" validate constraint "coach_auto_todolist_client_user_type_check";

alter table "public"."coach_auto_todolist" add constraint "coach_auto_todolist_type_check" CHECK ((type = ANY (ARRAY['client'::text, 'general'::text]))) not valid;

alter table "public"."coach_auto_todolist" validate constraint "coach_auto_todolist_type_check";

alter table "public"."coach_auto_todolist" add constraint "fk_auto_todo_client_user" FOREIGN KEY (client_id, client_user_type) REFERENCES public.user_profiles(id, user_type) ON DELETE SET NULL not valid;

alter table "public"."coach_auto_todolist" validate constraint "fk_auto_todo_client_user";

alter table "public"."coach_auto_todolist" add constraint "fk_cat_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE SET NULL not valid;

alter table "public"."coach_auto_todolist" validate constraint "fk_cat_client";

alter table "public"."coach_auto_todolist" add constraint "fk_cat_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_auto_todolist" validate constraint "fk_cat_coach";

alter table "public"."coach_checkins" add constraint "fk_coach_checkins_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_checkins" validate constraint "fk_coach_checkins_owner";

alter table "public"."coach_client_assignments" add constraint "coach_client_assignments_category_check" CHECK (((category IS NULL) OR (category = ANY (ARRAY['online'::text, 'in-person'::text, 'hybrid'::text])))) not valid;

alter table "public"."coach_client_assignments" validate constraint "coach_client_assignments_category_check";

alter table "public"."coach_client_assignments" add constraint "coach_client_assignments_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES public.coach_onboardings(id) ON DELETE SET NULL not valid;

alter table "public"."coach_client_assignments" validate constraint "coach_client_assignments_onboarding_id_fkey";

alter table "public"."coach_client_assignments" add constraint "coach_client_assignments_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'accepted'::text, 'bounced'::text, 'connected'::text, 'archived'::text]))) not valid;

alter table "public"."coach_client_assignments" validate constraint "coach_client_assignments_status_check";

alter table "public"."coach_client_assignments" add constraint "fk_cca_client" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_client_assignments" validate constraint "fk_cca_client";

alter table "public"."coach_client_assignments" add constraint "fk_cca_client_profile" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE CASCADE not valid;

alter table "public"."coach_client_assignments" validate constraint "fk_cca_client_profile";

alter table "public"."coach_client_assignments" add constraint "fk_cca_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_client_assignments" validate constraint "fk_cca_coach";

alter table "public"."coach_company_information" add constraint "coach_company_information_coach_id_key" UNIQUE using index "coach_company_information_coach_id_key";

alter table "public"."coach_company_information" add constraint "fk_coach_company_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_company_information" validate constraint "fk_coach_company_owner";

alter table "public"."coach_coupons" add constraint "discount_codes_coach_id_code_key" UNIQUE using index "discount_codes_coach_id_code_key";

alter table "public"."coach_coupons" add constraint "discount_codes_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_coupons" validate constraint "discount_codes_coach_id_fkey";

alter table "public"."coach_coupons" add constraint "discount_codes_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."coach_coupons" validate constraint "discount_codes_discount_type_check";

alter table "public"."coach_entitlements" add constraint "coach_entitlements_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_entitlements" validate constraint "coach_entitlements_coach_id_fkey";

alter table "public"."coach_exercises" add constraint "fk_coach_exercises_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_exercises" validate constraint "fk_coach_exercises_owner";

alter table "public"."coach_file_folders" add constraint "fk_coach_file_folders_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_file_folders" validate constraint "fk_coach_file_folders_owner";

alter table "public"."coach_files" add constraint "chk_bucket_id" CHECK ((bucket_id = 'coach_files'::text)) not valid;

alter table "public"."coach_files" validate constraint "chk_bucket_id";

alter table "public"."coach_files" add constraint "coach_files_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.coach_file_folders(id) ON DELETE SET NULL not valid;

alter table "public"."coach_files" validate constraint "coach_files_folder_id_fkey";

alter table "public"."coach_files" add constraint "fk_coach_files_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_files" validate constraint "fk_coach_files_owner";

alter table "public"."coach_flows" add constraint "fk_coach_flows_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_flows" validate constraint "fk_coach_flows_owner";

alter table "public"."coach_getting_started_checklist" add constraint "fk_checklist_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_getting_started_checklist" validate constraint "fk_checklist_coach";

alter table "public"."coach_habit_folders" add constraint "fk_coach_habit_folders_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_habit_folders" validate constraint "fk_coach_habit_folders_owner";

alter table "public"."coach_habits" add constraint "chk_days_of_week" CHECK (((days_of_week IS NULL) OR (days_of_week <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint]))) not valid;

alter table "public"."coach_habits" validate constraint "chk_days_of_week";

alter table "public"."coach_habits" add constraint "chk_habit_dates" CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (start_date <= end_date))) not valid;

alter table "public"."coach_habits" validate constraint "chk_habit_dates";

alter table "public"."coach_habits" add constraint "coach_habits_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.coach_habit_folders(id) ON DELETE SET NULL not valid;

alter table "public"."coach_habits" validate constraint "coach_habits_folder_id_fkey";

alter table "public"."coach_habits" add constraint "coach_habits_schedule_type_check" CHECK ((schedule_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'custom'::text]))) not valid;

alter table "public"."coach_habits" validate constraint "coach_habits_schedule_type_check";

alter table "public"."coach_habits" add constraint "fk_coach_habits_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_habits" validate constraint "fk_coach_habits_owner";

alter table "public"."coach_metric_folders" add constraint "fk_coach_metric_folders_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_metric_folders" validate constraint "fk_coach_metric_folders_owner";

alter table "public"."coach_metrics" add constraint "chk_metric_range" CHECK (((min_value IS NULL) OR (max_value IS NULL) OR (min_value <= max_value))) not valid;

alter table "public"."coach_metrics" validate constraint "chk_metric_range";

alter table "public"."coach_metrics" add constraint "coach_metrics_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.coach_metric_folders(id) ON DELETE SET NULL not valid;

alter table "public"."coach_metrics" validate constraint "coach_metrics_folder_id_fkey";

alter table "public"."coach_metrics" add constraint "coach_metrics_value_kind_check" CHECK ((value_kind = ANY (ARRAY['number'::text, 'percent'::text, 'duration'::text, 'score'::text]))) not valid;

alter table "public"."coach_metrics" validate constraint "coach_metrics_value_kind_check";

alter table "public"."coach_metrics" add constraint "fk_coach_metrics_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_metrics" validate constraint "fk_coach_metrics_owner";

alter table "public"."coach_notification_preferences" add constraint "coach_notification_preferences_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_notification_preferences" validate constraint "coach_notification_preferences_coach_id_fkey";

alter table "public"."coach_notification_preferences" add constraint "coach_notification_preferences_coach_id_notification_type_key" UNIQUE using index "coach_notification_preferences_coach_id_notification_type_key";

alter table "public"."coach_notifications" add constraint "coach_notifications_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_notifications" validate constraint "coach_notifications_client_id_fkey";

alter table "public"."coach_notifications" add constraint "coach_notifications_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_notifications" validate constraint "coach_notifications_coach_id_fkey";

alter table "public"."coach_onboardings" add constraint "coach_onboardings_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_onboardings" validate constraint "coach_onboardings_coach_id_fkey";

alter table "public"."coach_own_todolist" add constraint "chk_cot_type_client" CHECK ((((type = 'general'::text) AND (client_id IS NULL)) OR ((type = 'client'::text) AND (client_id IS NOT NULL)))) not valid;

alter table "public"."coach_own_todolist" validate constraint "chk_cot_type_client";

alter table "public"."coach_own_todolist" add constraint "coach_own_todolist_client_user_type_check" CHECK (((client_user_type)::text = 'client'::text)) not valid;

alter table "public"."coach_own_todolist" validate constraint "coach_own_todolist_client_user_type_check";

alter table "public"."coach_own_todolist" add constraint "coach_own_todolist_type_check" CHECK ((type = ANY (ARRAY['client'::text, 'general'::text]))) not valid;

alter table "public"."coach_own_todolist" validate constraint "coach_own_todolist_type_check";

alter table "public"."coach_own_todolist" add constraint "fk_cot_client" FOREIGN KEY (client_id) REFERENCES public.client_profiles(client_id) ON DELETE SET NULL not valid;

alter table "public"."coach_own_todolist" validate constraint "fk_cot_client";

alter table "public"."coach_own_todolist" add constraint "fk_cot_coach" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_own_todolist" validate constraint "fk_cot_coach";

alter table "public"."coach_own_todolist" add constraint "fk_own_todo_client_user" FOREIGN KEY (client_id, client_user_type) REFERENCES public.user_profiles(id, user_type) ON DELETE SET NULL not valid;

alter table "public"."coach_own_todolist" validate constraint "fk_own_todo_client_user";

alter table "public"."coach_packages" add constraint "coach_packages_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_packages" validate constraint "coach_packages_coach_id_fkey";

alter table "public"."coach_packages" add constraint "coach_packages_interval_check" CHECK (("interval" = ANY (ARRAY['one_time'::text, 'day'::text, 'week'::text, 'month'::text, 'year'::text]))) not valid;

alter table "public"."coach_packages" validate constraint "coach_packages_interval_check";

alter table "public"."coach_packages" add constraint "coach_packages_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES public.coach_onboardings(id) ON DELETE SET NULL not valid;

alter table "public"."coach_packages" validate constraint "coach_packages_onboarding_id_fkey";

alter table "public"."coach_packages" add constraint "coach_packages_sequence_id_fkey" FOREIGN KEY (sequence_id) REFERENCES public.coach_sequences(id) ON DELETE RESTRICT not valid;

alter table "public"."coach_packages" validate constraint "coach_packages_sequence_id_fkey";

alter table "public"."coach_packages" add constraint "uq_coach_packages_stripe_ids" UNIQUE using index "uq_coach_packages_stripe_ids";

alter table "public"."coach_preferences" add constraint "coach_preferences_client_terminology_check" CHECK ((client_terminology = ANY (ARRAY['athlete'::text, 'client'::text, 'member'::text]))) not valid;

alter table "public"."coach_preferences" validate constraint "coach_preferences_client_terminology_check";

alter table "public"."coach_preferences" add constraint "coach_preferences_coach_id_key" UNIQUE using index "coach_preferences_coach_id_key";

alter table "public"."coach_preferences" add constraint "fk_coach_preferences_owner" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_preferences" validate constraint "fk_coach_preferences_owner";

alter table "public"."coach_profiles" add constraint "coach_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_profiles" validate constraint "coach_profiles_id_fkey";

alter table "public"."coach_profiles" add constraint "coach_profiles_referrer_coach_id_fkey" FOREIGN KEY (referrer_coach_id) REFERENCES public.coach_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."coach_profiles" validate constraint "coach_profiles_referrer_coach_id_fkey";

alter table "public"."coach_profiles" add constraint "coach_profiles_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying])::text[]))) not valid;

alter table "public"."coach_profiles" validate constraint "coach_profiles_status_check";

alter table "public"."coach_programs" add constraint "fk_coach_programs_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_programs" validate constraint "fk_coach_programs_owner";

alter table "public"."coach_push_tokens" add constraint "coach_push_tokens_coach_id_expo_push_token_key" UNIQUE using index "coach_push_tokens_coach_id_expo_push_token_key";

alter table "public"."coach_push_tokens" add constraint "coach_push_tokens_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_push_tokens" validate constraint "coach_push_tokens_coach_id_fkey";

alter table "public"."coach_questionnaires" add constraint "fk_coach_quest_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_questionnaires" validate constraint "fk_coach_quest_owner";

alter table "public"."coach_referrals" add constraint "coach_referrals_referred_coach_id_fkey" FOREIGN KEY (referred_coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_referrals" validate constraint "coach_referrals_referred_coach_id_fkey";

alter table "public"."coach_referrals" add constraint "coach_referrals_referred_coach_id_key" UNIQUE using index "coach_referrals_referred_coach_id_key";

alter table "public"."coach_referrals" add constraint "coach_referrals_referrer_coach_id_fkey" FOREIGN KEY (referrer_coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_referrals" validate constraint "coach_referrals_referrer_coach_id_fkey";

alter table "public"."coach_referrals" add constraint "coach_referrals_status_check" CHECK ((status = ANY (ARRAY['trial_started'::text, 'trial_ended'::text, 'converted'::text]))) not valid;

alter table "public"."coach_referrals" validate constraint "coach_referrals_status_check";

alter table "public"."coach_sections" add constraint "coach_sections_section_type_check" CHECK ((section_type = ANY (ARRAY['regular'::text, 'amrap'::text, 'tabata'::text, 'hiit'::text, 'emom'::text, 'circuits'::text]))) not valid;

alter table "public"."coach_sections" validate constraint "coach_sections_section_type_check";

alter table "public"."coach_sections" add constraint "fk_coach_sections_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_sections" validate constraint "fk_coach_sections_owner";

alter table "public"."coach_sequences" add constraint "coach_sequences_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_sequences" validate constraint "coach_sequences_coach_id_fkey";

alter table "public"."coach_stripe_accounts" add constraint "coach_stripe_accounts_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_stripe_accounts" validate constraint "coach_stripe_accounts_coach_id_fkey";

alter table "public"."coach_stripe_accounts" add constraint "coach_stripe_accounts_stripe_account_id_key" UNIQUE using index "coach_stripe_accounts_stripe_account_id_key";

alter table "public"."coach_unique_codes" add constraint "coach_unique_codes_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coach_unique_codes" validate constraint "coach_unique_codes_coach_id_fkey";

alter table "public"."coach_unique_codes" add constraint "coach_unique_codes_code_key" UNIQUE using index "coach_unique_codes_code_key";

alter table "public"."coach_unique_codes" add constraint "coach_unique_codes_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES public.coach_onboardings(id) ON DELETE SET NULL not valid;

alter table "public"."coach_unique_codes" validate constraint "coach_unique_codes_onboarding_id_fkey";

alter table "public"."coach_workouts" add constraint "fk_coach_workouts_owner" FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_workouts" validate constraint "fk_coach_workouts_owner";

alter table "public"."conversation_participants" add constraint "fk_cp_conversation" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_participants" validate constraint "fk_cp_conversation";

alter table "public"."conversation_participants" add constraint "fk_cp_other_user" FOREIGN KEY (other_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_participants" validate constraint "fk_cp_other_user";

alter table "public"."conversation_participants" add constraint "fk_cp_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_participants" validate constraint "fk_cp_user";

alter table "public"."conversation_presence" add constraint "conversation_presence_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_presence" validate constraint "conversation_presence_conversation_id_fkey";

alter table "public"."conversation_presence" add constraint "conversation_presence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_presence" validate constraint "conversation_presence_user_id_fkey";

alter table "public"."conversations" add constraint "fk_conv_client" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "fk_conv_client";

alter table "public"."conversations" add constraint "fk_conv_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "fk_conv_coach";

alter table "public"."conversations" add constraint "uq_conversation_coach_client" UNIQUE using index "uq_conversation_coach_client";

alter table "public"."feature_request_replies" add constraint "feature_request_replies_user_type_check" CHECK ((user_type = ANY (ARRAY['coach'::text, 'client'::text]))) not valid;

alter table "public"."feature_request_replies" validate constraint "feature_request_replies_user_type_check";

alter table "public"."feature_request_replies" add constraint "fk_frr_feature_request" FOREIGN KEY (feature_request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE not valid;

alter table "public"."feature_request_replies" validate constraint "fk_frr_feature_request";

alter table "public"."feature_request_replies" add constraint "fk_frr_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."feature_request_replies" validate constraint "fk_frr_user";

alter table "public"."feature_request_upvotes" add constraint "fk_fru_feature_request" FOREIGN KEY (feature_request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE not valid;

alter table "public"."feature_request_upvotes" validate constraint "fk_fru_feature_request";

alter table "public"."feature_request_upvotes" add constraint "fk_fru_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."feature_request_upvotes" validate constraint "fk_fru_user";

alter table "public"."feature_request_upvotes" add constraint "uq_fru_feature_request_user" UNIQUE using index "uq_fru_feature_request_user";

alter table "public"."feature_requests" add constraint "feature_requests_status_check" CHECK ((status = ANY (ARRAY[NULL::text, 'in_progress'::text, 'completed'::text]))) not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_status_check";

alter table "public"."feature_requests" add constraint "feature_requests_user_type_check" CHECK ((user_type = ANY (ARRAY['coach'::text, 'client'::text]))) not valid;

alter table "public"."feature_requests" validate constraint "feature_requests_user_type_check";

alter table "public"."feature_requests" add constraint "fk_fr_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."feature_requests" validate constraint "fk_fr_user";

alter table "public"."flow_execution_log" add constraint "flow_execution_log_execution_id_fkey" FOREIGN KEY (execution_id) REFERENCES public.flow_executions(id) ON DELETE CASCADE not valid;

alter table "public"."flow_execution_log" validate constraint "flow_execution_log_execution_id_fkey";

alter table "public"."flow_executions" add constraint "fk_fe_client" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."flow_executions" validate constraint "fk_fe_client";

alter table "public"."flow_executions" add constraint "fk_fe_coach" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."flow_executions" validate constraint "fk_fe_coach";

alter table "public"."flow_executions" add constraint "fk_fe_flow" FOREIGN KEY (flow_id) REFERENCES public.coach_flows(id) ON DELETE SET NULL not valid;

alter table "public"."flow_executions" validate constraint "fk_fe_flow";

alter table "public"."flow_executions" add constraint "flow_executions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'waiting'::text, 'completed'::text, 'cancelled'::text, 'failed'::text]))) not valid;

alter table "public"."flow_executions" validate constraint "flow_executions_status_check";

alter table "public"."message_attachments" add constraint "chk_bucket_id" CHECK ((bucket_id = 'message_attachments'::text)) not valid;

alter table "public"."message_attachments" validate constraint "chk_bucket_id";

alter table "public"."message_attachments" add constraint "chk_file_path_format" CHECK ((file_path ~ '^[0-9a-f-]+/[0-9a-f-]+/.+$'::text)) not valid;

alter table "public"."message_attachments" validate constraint "chk_file_path_format";

alter table "public"."message_attachments" add constraint "fk_attach_conversation" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."message_attachments" validate constraint "fk_attach_conversation";

alter table "public"."message_attachments" add constraint "fk_attach_message" FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_attachments" validate constraint "fk_attach_message";

alter table "public"."message_attachments" add constraint "message_attachments_upload_status_check" CHECK ((upload_status = ANY (ARRAY['pending'::text, 'uploading'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_upload_status_check";

alter table "public"."message_reactions" add constraint "fk_reaction_conversation" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "fk_reaction_conversation";

alter table "public"."message_reactions" add constraint "fk_reaction_message" FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "fk_reaction_message";

alter table "public"."message_reactions" add constraint "fk_reaction_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "fk_reaction_user";

alter table "public"."message_reactions" add constraint "message_reactions_reaction_check" CHECK ((reaction = ANY (ARRAY['👍'::text, '❤️'::text, '😂'::text, '😮'::text, '😢'::text, '🙏'::text]))) not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_reaction_check";

alter table "public"."message_reactions" add constraint "uq_reaction_user_message" UNIQUE using index "uq_reaction_user_message";

alter table "public"."message_read_receipts" add constraint "fk_receipt_conversation" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."message_read_receipts" validate constraint "fk_receipt_conversation";

alter table "public"."message_read_receipts" add constraint "fk_receipt_message" FOREIGN KEY (last_read_message_id) REFERENCES public.messages(id) ON DELETE SET NULL not valid;

alter table "public"."message_read_receipts" validate constraint "fk_receipt_message";

alter table "public"."message_read_receipts" add constraint "fk_receipt_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."message_read_receipts" validate constraint "fk_receipt_user";

alter table "public"."message_read_receipts" add constraint "uq_receipt_user_conversation" UNIQUE using index "uq_receipt_user_conversation";

alter table "public"."messages" add constraint "chk_content_required" CHECK ((((message_type = 'text'::text) AND (content IS NOT NULL)) OR (message_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'file'::text])))) not valid;

alter table "public"."messages" validate constraint "chk_content_required";

alter table "public"."messages" add constraint "fk_msg_conversation" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "fk_msg_conversation";

alter table "public"."messages" add constraint "fk_msg_parent" FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "fk_msg_parent";

alter table "public"."messages" add constraint "fk_msg_sender" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "fk_msg_sender";

alter table "public"."messages" add constraint "messages_message_type_check" CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'audio'::text, 'file'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_message_type_check";

alter table "public"."messages" add constraint "messages_status_check" CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'read'::text, 'failed'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_status_check";

alter table "public"."musclewiki_exercise_cache" add constraint "musclewiki_exercise_cache_musclewiki_id_key" UNIQUE using index "musclewiki_exercise_cache_musclewiki_id_key";

alter table "public"."musclewiki_filter_cache" add constraint "uq_mwfc_type_value" UNIQUE using index "uq_mwfc_type_value";

alter table "public"."musclewiki_sync_metadata" add constraint "musclewiki_sync_metadata_sync_type_key" UNIQUE using index "musclewiki_sync_metadata_sync_type_key";

alter table "public"."payments" add constraint "payments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_client_id_fkey";

alter table "public"."payments" add constraint "payments_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_coach_id_fkey";

alter table "public"."payments" add constraint "payments_coupon_id_fkey" FOREIGN KEY (coupon_id) REFERENCES public.coach_coupons(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_coupon_id_fkey";

alter table "public"."payments" add constraint "payments_package_id_fkey" FOREIGN KEY (package_id) REFERENCES public.coach_packages(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_package_id_fkey";

alter table "public"."payments" add constraint "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text, 'disputed'::text, 'cancelled'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_status_check";

alter table "public"."payments" add constraint "payments_stripe_checkout_session_id_key" UNIQUE using index "payments_stripe_checkout_session_id_key";

alter table "public"."payments" add constraint "payments_stripe_payment_intent_id_key" UNIQUE using index "payments_stripe_payment_intent_id_key";

alter table "public"."platform_addons" add constraint "platform_addons_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text]))) not valid;

alter table "public"."platform_addons" validate constraint "platform_addons_billing_interval_check";

alter table "public"."platform_addons" add constraint "platform_addons_coach_id_addon_type_key" UNIQUE using index "platform_addons_coach_id_addon_type_key";

alter table "public"."platform_addons" add constraint "platform_addons_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."platform_addons" validate constraint "platform_addons_coach_id_fkey";

alter table "public"."platform_addons" add constraint "platform_addons_stripe_subscription_item_id_key" UNIQUE using index "platform_addons_stripe_subscription_item_id_key";

alter table "public"."platform_billing_activity" add constraint "platform_billing_activity_addon_id_fkey" FOREIGN KEY (addon_id) REFERENCES public.platform_addons(id) ON DELETE SET NULL not valid;

alter table "public"."platform_billing_activity" validate constraint "platform_billing_activity_addon_id_fkey";

alter table "public"."platform_billing_activity" add constraint "platform_billing_activity_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."platform_billing_activity" validate constraint "platform_billing_activity_coach_id_fkey";

alter table "public"."platform_billing_activity" add constraint "platform_billing_activity_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL not valid;

alter table "public"."platform_billing_activity" validate constraint "platform_billing_activity_subscription_id_fkey";

alter table "public"."platform_stripe_prices" add constraint "chk_addon_no_client_limit" CHECK (((price_type <> 'addon'::text) OR (client_limit IS NULL))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "chk_addon_no_client_limit";

alter table "public"."platform_stripe_prices" add constraint "chk_addon_requires_addon_type" CHECK (((price_type <> 'addon'::text) OR (addon_type IS NOT NULL))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "chk_addon_requires_addon_type";

alter table "public"."platform_stripe_prices" add constraint "chk_plan_requires_client_limit" CHECK (((price_type <> 'plan'::text) OR (client_limit IS NOT NULL))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "chk_plan_requires_client_limit";

alter table "public"."platform_stripe_prices" add constraint "chk_plan_requires_plan_type" CHECK (((price_type <> 'plan'::text) OR (plan_type IS NOT NULL))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "chk_plan_requires_plan_type";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_addon_type_check" CHECK ((addon_type = ANY (ARRAY['automations'::text, 'ai_assistant'::text, 'payments'::text]))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "platform_stripe_prices_addon_type_check";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text]))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "platform_stripe_prices_billing_interval_check";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_plan_type_check" CHECK ((plan_type = ANY (ARRAY['pro'::text, 'max'::text]))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "platform_stripe_prices_plan_type_check";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_price_type_check" CHECK ((price_type = ANY (ARRAY['plan'::text, 'addon'::text]))) not valid;

alter table "public"."platform_stripe_prices" validate constraint "platform_stripe_prices_price_type_check";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_price_type_plan_type_addon_type_clie_key" UNIQUE using index "platform_stripe_prices_price_type_plan_type_addon_type_clie_key";

alter table "public"."platform_stripe_prices" add constraint "platform_stripe_prices_stripe_price_id_key" UNIQUE using index "platform_stripe_prices_stripe_price_id_key";

alter table "public"."platform_subscriptions" add constraint "platform_subscriptions_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text]))) not valid;

alter table "public"."platform_subscriptions" validate constraint "platform_subscriptions_billing_interval_check";

alter table "public"."platform_subscriptions" add constraint "platform_subscriptions_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."platform_subscriptions" validate constraint "platform_subscriptions_coach_id_fkey";

alter table "public"."platform_subscriptions" add constraint "platform_subscriptions_coach_id_key" UNIQUE using index "platform_subscriptions_coach_id_key";

alter table "public"."platform_subscriptions" add constraint "platform_subscriptions_stripe_subscription_id_key" UNIQUE using index "platform_subscriptions_stripe_subscription_id_key";

alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_signin_method_check" CHECK (((signin_method)::text = ANY (ARRAY[('email'::character varying)::text, ('google'::character varying)::text, ('apple'::character varying)::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_signin_method_check";

alter table "public"."user_profiles" add constraint "user_profiles_user_type_check" CHECK (((user_type)::text = ANY ((ARRAY['coach'::character varying, 'client'::character varying])::text[]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_type_check";

set check_function_bodies = off;

create or replace view "public"."athletes_grid_view" as  SELECT cp.client_id AS id,
    up.name,
    up.profile_picture_url AS avatar,
    up.email,
    cts.last_activity,
    COALESCE(cts.last_7_days_training_completed, 0) AS "last7DaysTraining",
    COALESCE(cts.last_30_days_training_completed, 0) AS "last30DaysTraining",
    cp.phone,
    cp.country,
    cp.gender,
    cp.height_cm,
    cca.category,
    cca.is_active,
    cca.is_archived,
    ((cca.status = 'accepted'::text) OR (cca.status = 'connected'::text)) AS connected,
    cca.status AS "connectionStatus",
        CASE
            WHEN (cca.connected_at IS NOT NULL) THEN (CURRENT_DATE - (cca.connected_at)::date)
            ELSE 0
        END AS "clientFor",
        CASE
            WHEN (cp.date_of_birth IS NOT NULL) THEN (EXTRACT(year FROM age((cp.date_of_birth)::timestamp with time zone)))::integer
            ELSE NULL::integer
        END AS age,
    cca.coach_id,
    cp.created_at,
    cp.updated_at
   FROM (((public.client_profiles cp
     LEFT JOIN public.user_profiles up ON ((cp.client_id = up.id)))
     LEFT JOIN public.client_training_summary cts ON ((cp.client_id = cts.client_id)))
     LEFT JOIN public.coach_client_assignments cca ON ((cp.client_id = cca.client_id)));


CREATE OR REPLACE FUNCTION public.block_file_path_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    RAISE EXCEPTION 'file_path cannot be changed';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_message_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  topic TEXT;
  payload JSONB;
  attachments_json JSONB;
  reactions_json JSONB;
BEGIN
  -- Topic format: conversation:{id}:messages
  topic := 'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id) || ':messages';

  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'id', OLD.id,
      'conversation_id', OLD.conversation_id
    );
  ELSE
    -- Skip broadcast if message is waiting for attachments
    -- (unless it's being marked as ready)
    IF NEW.attachments_ready = FALSE AND
       (TG_OP = 'INSERT' OR (OLD.attachments_ready = FALSE AND NEW.attachments_ready = FALSE)) THEN
      -- Don't broadcast yet - waiting for attachments
      RETURN NEW;
    END IF;

    -- Query attachments for this message with pre-generated URLs
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ma.id,
        'message_id', ma.message_id,
        'conversation_id', ma.conversation_id,
        'bucket_id', ma.bucket_id,
        'file_path', ma.file_path,
        'filename', ma.filename,
        'mime_type', ma.mime_type,
        'size_bytes', ma.size_bytes,
        'thumbnail_path', ma.thumbnail_path,
        'width', ma.width,
        'height', ma.height,
        'duration_seconds', ma.duration_seconds,
        'upload_status', ma.upload_status,
        'created_at', ma.created_at
      )
    ), '[]'::jsonb)
    INTO attachments_json
    FROM public.message_attachments ma
    WHERE ma.message_id = NEW.id;

    -- Query reactions for this message
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      )
    ), '[]'::jsonb)
    INTO reactions_json
    FROM public.message_reactions mr
    WHERE mr.message_id = NEW.id;

    payload := jsonb_build_object(
      'type', TG_OP,
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_role', NEW.sender_role,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'parent_message_id', NEW.parent_message_id,
      'status', NEW.status,
      'sent_at', NEW.sent_at,
      'read_at', NEW.read_at,
      'edited_at', NEW.edited_at,
      'is_deleted', NEW.is_deleted,
      'deleted_at', NEW.deleted_at,
      'created_at', NEW.created_at,
      'attachment_count', COALESCE(NEW.attachment_count, 0),
      'attachments_ready', COALESCE(NEW.attachments_ready, TRUE),
      'idempotency_key', NEW.idempotency_key,
      'attachments', attachments_json,
      'reactions', reactions_json
    );
  END IF;

  -- Send broadcast using realtime.send
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_message_on_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  topic TEXT;
  payload JSONB;
  attachments_json JSONB;
  reactions_json JSONB;
  msg RECORD;
  reaction_message_id UUID;
BEGIN
  -- Get the message ID from either NEW or OLD
  reaction_message_id := COALESCE(NEW.message_id, OLD.message_id);

  -- Get the parent message
  SELECT * INTO msg FROM public.messages WHERE id = reaction_message_id;

  IF msg IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build topic
  topic := 'conversation:' || msg.conversation_id || ':messages';

  -- Query attachments for this message
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'message_id', ma.message_id,
      'conversation_id', ma.conversation_id,
      'bucket_id', ma.bucket_id,
      'file_path', ma.file_path,
      'filename', ma.filename,
      'mime_type', ma.mime_type,
      'size_bytes', ma.size_bytes,
      'thumbnail_path', ma.thumbnail_path,
      'width', ma.width,
      'height', ma.height,
      'duration_seconds', ma.duration_seconds,
      'upload_status', ma.upload_status,
      'created_at', ma.created_at
    )
  ), '[]'::jsonb)
  INTO attachments_json
  FROM public.message_attachments ma
  WHERE ma.message_id = reaction_message_id;

  -- Query ALL reactions for this message (including the one just inserted)
  -- For INSERT/UPDATE, include NEW; for DELETE, exclude OLD
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      )
    ), '[]'::jsonb)
    INTO reactions_json
    FROM public.message_reactions mr
    WHERE mr.message_id = reaction_message_id
    AND mr.id != OLD.id;  -- Exclude deleted reaction
  ELSE
    -- For INSERT, we need to include the NEW reaction explicitly
    -- since it may not be visible in the table yet
    SELECT COALESCE(jsonb_agg(reaction_obj), '[]'::jsonb)
    INTO reactions_json
    FROM (
      -- Existing reactions (excluding NEW.id to avoid duplicates)
      SELECT jsonb_build_object(
        'id', mr.id,
        'message_id', mr.message_id,
        'conversation_id', mr.conversation_id,
        'user_id', mr.user_id,
        'reaction', mr.reaction,
        'created_at', mr.created_at
      ) as reaction_obj
      FROM public.message_reactions mr
      WHERE mr.message_id = reaction_message_id
      AND mr.id != NEW.id
      UNION ALL
      -- Include the NEW reaction explicitly
      SELECT jsonb_build_object(
        'id', NEW.id,
        'message_id', NEW.message_id,
        'conversation_id', NEW.conversation_id,
        'user_id', NEW.user_id,
        'reaction', NEW.reaction,
        'created_at', NEW.created_at
      ) as reaction_obj
    ) combined;
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'type', 'UPDATE',
    'id', msg.id,
    'conversation_id', msg.conversation_id,
    'sender_id', msg.sender_id,
    'content', msg.content,
    'message_type', msg.message_type,
    'parent_message_id', msg.parent_message_id,
    'status', msg.status,
    'sent_at', msg.sent_at,
    'read_at', msg.read_at,
    'edited_at', msg.edited_at,
    'is_deleted', msg.is_deleted,
    'deleted_at', msg.deleted_at,
    'created_at', msg.created_at,
    'attachment_count', COALESCE(msg.attachment_count, 0),
    'attachments', attachments_json,
    'reactions', reactions_json
  );

  -- Send broadcast
  PERFORM realtime.send(
    payload,
    'message_change',
    topic,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_receive_conversation_broadcast(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_prompt(p_coach_id uuid, p_daily_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_count INTEGER;
  v_result JSONB;
BEGIN
  -- Get or create today's usage record
  INSERT INTO ai_assistant_daily_usage (coach_id, usage_date, prompt_count)
  VALUES (p_coach_id, CURRENT_DATE, 0)
  ON CONFLICT (coach_id, usage_date) DO NOTHING;

  -- Get current count
  SELECT prompt_count INTO v_current_count
  FROM ai_assistant_daily_usage
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE;

  -- Check if within limit
  IF v_current_count >= p_daily_limit THEN
    -- Return not allowed
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'daily_limit', p_daily_limit,
      'remaining', 0
    );
  END IF;

  -- Increment and return
  UPDATE ai_assistant_daily_usage
  SET prompt_count = prompt_count + 1,
      updated_at = NOW()
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE
  RETURNING prompt_count INTO v_current_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', p_daily_limit - v_current_count
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_attachments_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expected_count INTEGER;
  v_actual_count INTEGER;
  v_attachments_ready BOOLEAN;
BEGIN
  -- Get expected attachment count and current ready status
  SELECT attachment_count, attachments_ready 
  INTO v_expected_count, v_attachments_ready
  FROM public.messages
  WHERE id = NEW.message_id;
  
  -- If message is already ready, skip
  IF v_attachments_ready = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Count completed attachments
  SELECT COUNT(*) INTO v_actual_count
  FROM public.message_attachments
  WHERE message_id = NEW.message_id
    AND upload_status = 'completed';
  
  -- If all attachments are uploaded, mark message as ready
  IF v_actual_count >= COALESCE(v_expected_count, 0) THEN
    UPDATE public.messages
    SET attachments_ready = TRUE
    WHERE id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_flow_condition(p_trigger_type text, p_trigger_context jsonb, p_client_id uuid, p_coach_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_id  UUID;
  v_due     DATE;
  v_found   BOOLEAN;
BEGIN
  v_ref_id := (p_trigger_context->>'reference_id')::uuid;
  v_due    := (p_trigger_context->>'due_date')::date;

  CASE p_trigger_type
    WHEN 'missed-check-in' THEN
      -- Check if a check-in log exists for this assignment on the due date
      SELECT EXISTS(
        SELECT 1 FROM public.client_checkin_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND submission_date = v_due
      ) INTO v_found;

    WHEN 'missed-habit-log' THEN
      -- Check if a habit log exists with completed or partial status
      SELECT EXISTS(
        SELECT 1 FROM public.client_habit_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_due
          AND status IN ('completed', 'partial')
      ) INTO v_found;

    WHEN 'missed-metric-log' THEN
      -- Check if a metric log exists for this assignment on the due date
      SELECT EXISTS(
        SELECT 1 FROM public.client_metric_logs
        WHERE assignment_id = v_ref_id
          AND client_id = p_client_id
          AND coach_id = p_coach_id
          AND date = v_due
      ) INTO v_found;

    ELSE
      -- Unknown trigger type, default to false (follow NO branch)
      v_found := false;
  END CASE;

  RETURN v_found;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_assistant_todo_logs(p_retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.assistant_todo_cron_log
    WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_client_push_notification_log()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.client_push_notification_log
  WHERE notification_date < CURRENT_DATE - INTERVAL '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_flow_execution_logs(p_retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER := 0;
  v_tmp     INTEGER;
BEGIN
  -- Delete old cron logs
  DELETE FROM public.flow_execution_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  -- Delete old execution logs (for completed/failed/cancelled executions)
  DELETE FROM public.flow_execution_log
  WHERE execution_id IN (
    SELECT id FROM public.flow_executions
    WHERE status IN ('completed', 'failed', 'cancelled')
      AND created_at < now() - (p_retention_days || ' days')::INTERVAL
  );
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  -- Delete old completed executions
  DELETE FROM public.flow_executions
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND created_at < now() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted := v_deleted + v_tmp;

  RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_flow_trigger_logs(p_retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.flow_trigger_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_free_trial_expiry_logs(p_retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.free_trial_expiry_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_missed_workout_logs(p_retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.missed_workout_cron_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_musclewiki_audit_logs(p_retention_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.musclewiki_api_audit_log
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$
;

create or replace view "public"."client_profiles_full" as  SELECT cp.client_id,
    up.email,
    COALESCE(up.name, ''::character varying) AS name,
    up.profile_picture_url,
    COALESCE(up.signin_method, 'email'::character varying) AS signin_method,
    up.timezone,
    cp.date_of_birth,
    cp.gender,
    cp.height_cm,
    cp.phone,
    cp.country,
    cp.unit_system,
    cp.created_at,
    cp.updated_at
   FROM (public.client_profiles cp
     LEFT JOIN public.user_profiles up ON (((up.id = cp.client_id) AND ((up.user_type)::text = 'client'::text))));


create or replace view "public"."coach_checkins_review_view" as  SELECT ccl.id AS log_id,
    ccl.client_id,
    ccl.assignment_id,
    ccl.submission_date,
    ccl.answers,
    ccl.status AS review_status,
    ccl.coach_comment,
    up.name AS client_name,
    up.profile_picture_url AS client_avatar,
    cc.name AS checkin_name,
    ccl.coach_id
   FROM ((public.client_checkin_logs ccl
     JOIN public.client_checkins cc ON ((ccl.assignment_id = cc.id)))
     JOIN public.user_profiles up ON ((up.id = ccl.client_id)))
  WHERE (ccl.status = 'review'::text);


create or replace view "public"."coach_client_payment_summary" as  SELECT coach_id,
    client_id,
    COALESCE(sum(amount_cents) FILTER (WHERE (status = 'succeeded'::text)), (0)::bigint) AS total_paid_cents,
    (count(*) FILTER (WHERE (status = 'succeeded'::text)))::integer AS successful_count,
    (count(*) FILTER (WHERE (status = 'failed'::text)))::integer AS failed_count,
    max(paid_at) AS last_payment_at,
    max(updated_at) FILTER (WHERE (status = 'failed'::text)) AS last_failure_at
   FROM public.payments p
  GROUP BY coach_id, client_id;


create or replace view "public"."coach_clients_view" as  SELECT cca.coach_id,
    cca.client_id,
    cca.category,
    cca.status,
    cca.is_active,
    cca.is_archived,
    cca.invitation_sent_at,
    cca.connected_at,
    cca.invitation_token,
    cca.onboarding_id,
    cca.created_at,
    cca.updated_at,
    cp.date_of_birth,
    cp.gender,
    cp.height_cm,
    cp.phone,
    cp.country,
    cp.unit_system,
    COALESCE(up.name, up.email) AS full_name,
    up.email,
    up.profile_picture_url AS avatar_url,
    cts.last_activity,
    cts.last_7_days_training_completed,
    cts.last_7_days_training_total,
    cts.last_30_days_training_completed,
    cts.last_30_days_training_total
   FROM (((public.coach_client_assignments cca
     LEFT JOIN public.client_profiles cp ON ((cp.client_id = cca.client_id)))
     LEFT JOIN public.user_profiles up ON (((up.id = cca.client_id) AND ((up.user_type)::text = 'client'::text))))
     LEFT JOIN public.client_training_summary cts ON ((cts.client_id = cca.client_id)));


create or replace view "public"."coach_payment_analytics" as  SELECT coach_id,
    COALESCE(sum(amount_cents) FILTER (WHERE (status = 'succeeded'::text)), (0)::bigint) AS total_revenue_cents,
    (count(*) FILTER (WHERE (status = 'succeeded'::text)))::integer AS successful_count,
    (count(*) FILTER (WHERE (status = 'failed'::text)))::integer AS failed_count,
    (count(DISTINCT client_id) FILTER (WHERE (status = 'succeeded'::text)))::integer AS paying_client_count,
    max(paid_at) AS last_payment_at
   FROM public.payments p
  GROUP BY coach_id;


create or replace view "public"."coach_profiles_full" as  SELECT cp.id,
    up.email,
    COALESCE(up.name, ''::character varying) AS name,
    up.profile_picture_url,
    COALESCE(up.signin_method, 'email'::character varying) AS signin_method,
    cp.is_active,
    cp.is_archived,
    cp.status,
    up.timezone,
    cp.created_at,
    cp.updated_at,
    cp.free_trial_completed,
    cp.referrer_coach_id
   FROM (public.coach_profiles cp
     LEFT JOIN public.user_profiles up ON (((up.id = cp.id) AND ((up.user_type)::text = 'coach'::text))));


create or replace view "public"."coach_subscription_summary" as  SELECT coach_id,
    plan_type,
    client_limit,
    status,
    billing_interval,
    current_price_cents,
    currency,
    current_period_start,
    current_period_end,
    trial_ends_at,
    cancel_at_period_end,
    cancelled_at,
    COALESCE(( SELECT json_agg(json_build_object('type', pa.addon_type, 'price_cents', pa.price_cents, 'is_active', pa.is_active)) AS json_agg
           FROM public.platform_addons pa
          WHERE ((pa.coach_id = ps.coach_id) AND (pa.is_active = true))), '[]'::json) AS active_addons,
    (current_price_cents + COALESCE(( SELECT sum(pa.price_cents) AS sum
           FROM public.platform_addons pa
          WHERE ((pa.coach_id = ps.coach_id) AND (pa.is_active = true))), (0)::bigint)) AS total_monthly_cents,
    created_at,
    updated_at
   FROM public.platform_subscriptions ps;


CREATE OR REPLACE FUNCTION public.complete_exercise_cache_population(p_log_id uuid, p_status text, p_total_fetched integer DEFAULT 0, p_total_cached integer DEFAULT 0, p_errors integer DEFAULT 0, p_error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.musclewiki_cache_population_log
  SET
    completed_at = now(),
    status = p_status,
    total_fetched = p_total_fetched,
    total_cached = p_total_cached,
    errors = p_errors,
    error_message = p_error_message
  WHERE id = p_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_conversation_on_client_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Create conversation when status becomes 'accepted' OR 'connected'
  -- Skip for 'invited', 'bounced', and 'archived' statuses
  IF (NEW.status = 'accepted' OR NEW.status = 'connected')
     AND (OLD IS NULL OR (OLD.status <> 'accepted' AND OLD.status <> 'connected')) THEN

    -- Create conversation (trigger will create participant records automatically)
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (NEW.coach_id, NEW.client_id)
    ON CONFLICT (coach_id, client_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_participant_records()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.coach_id, NEW.client_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  INSERT INTO public.conversation_participants (
    conversation_id, user_id, other_user_id
  ) VALUES (
    NEW.id, NEW.client_id, NEW.coach_id
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  INSERT INTO public.message_read_receipts (conversation_id, user_id)
  VALUES
    (NEW.id, NEW.coach_id),
    (NEW.id, NEW.client_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_upvote_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = GREATEST(0, upvote_count - 1)
  WHERE id = OLD.feature_request_id;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.detect_flow_triggers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows  INTEGER := 0;
  v_tmp   INTEGER;
BEGIN
  -- ── 3a. missed-check-in ───────────────────────────────────────
  -- Fires when a client_task with task_type='check_in' has due_date < client's today
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-check-in',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-check-in:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-check-in'
  -- Timezone resolution
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'check_in'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3b. missed-habit-log ──────────────────────────────────────
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-habit-log',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-habit-log:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-habit-log'
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'habit'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3c. missed-metric-log ─────────────────────────────────────
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    ct.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-metric-log',
    jsonb_build_object(
      'reference_id', ct.reference_id,
      'task_type', ct.task_type,
      'due_date', ct.due_date
    ),
    'missed-metric-log:' || ct.client_id || ':' || ct.reference_id || ':' || ct.due_date
  FROM public.client_tasks ct
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = ct.coach_id
    AND cca.client_id = ct.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = ct.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-metric-log'
  LEFT JOIN public.user_profiles cup
    ON cup.id = ct.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = ct.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE ct.task_type = 'metric'
    AND ct.due_date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3d. missed-workout ────────────────────────────────────────
  -- Fires when client_training_history has status='missed' within last 2 days
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cf.coach_id,
    cth.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'missed-workout',
    jsonb_build_object(
      'date', cth.date,
      'workout_id', cth.workout_id
    ),
    'missed-workout:' || cth.client_id || ':' || cth.date
  FROM public.client_training_history cth
  JOIN public.coach_client_assignments cca
    ON cca.coach_id = cth.coach_id
    AND cca.client_id = cth.client_id
    AND cca.is_active = true
    AND cca.is_archived = false
  JOIN public.coach_flows cf
    ON cf.coach_id = cth.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'missed-workout'
  LEFT JOIN public.user_profiles cup
    ON cup.id = cth.client_id AND cup.user_type = 'client'
  LEFT JOIN public.user_profiles coup
    ON coup.id = cth.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  WHERE cth.status = 'missed'
    AND cth.date >= cd.client_today - 2
    AND cth.date < cd.client_today
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ── 3e. inactive-7-days ───────────────────────────────────────
  -- Reuses the same logic as migration 147 rule 2: no activity across
  -- all tables for 7+ days. Re-triggers daily if still inactive.
  INSERT INTO public.flow_executions (
    flow_id, coach_id, client_id, automation_schema,
    current_action_id, status, trigger_type, trigger_context, trigger_key
  )
  SELECT
    cf.id,
    cca.coach_id,
    cca.client_id,
    cf.automation_schema,
    cf.automation_schema->'trigger'->>'nextId',
    'pending',
    'inactive-7-days',
    jsonb_build_object(
      'last_activity', last_act.last_activity,
      'client_today', cd.client_today
    ),
    'inactive-7-days:' || cca.client_id || ':' || cd.client_today
  FROM public.coach_client_assignments cca
  JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
  LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
  CROSS JOIN LATERAL (
    SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today
  ) cd
  -- Find the most recent activity across all tables
  CROSS JOIN LATERAL (
    SELECT MAX(activity_date) AS last_activity
    FROM (
      SELECT cth.date AS activity_date
      FROM public.client_training_history cth
      WHERE cth.client_id = cca.client_id
        AND cth.coach_id = cca.coach_id
        AND cth.status IN ('in_progress', 'completed')
        AND cth.date >= cd.client_today - 7
      UNION ALL
      SELECT chl.date AS activity_date
      FROM public.client_habit_logs chl
      WHERE chl.client_id = cca.client_id
        AND chl.coach_id = cca.coach_id
        AND chl.date >= cd.client_today - 7
      UNION ALL
      SELECT cml.date AS activity_date
      FROM public.client_metric_logs cml
      WHERE cml.client_id = cca.client_id
        AND cml.coach_id = cca.coach_id
        AND cml.date >= cd.client_today - 7
      UNION ALL
      SELECT ccl.submission_date AS activity_date
      FROM public.client_checkin_logs ccl
      WHERE ccl.client_id = cca.client_id
        AND ccl.coach_id = cca.coach_id
        AND ccl.submission_date >= cd.client_today - 7
    ) all_activity
  ) last_act
  JOIN public.coach_flows cf
    ON cf.coach_id = cca.coach_id
    AND cf.is_active = true
    AND cf.automation_schema IS NOT NULL
    AND cf.automation_schema->'trigger'->>'type' = 'inactive-7-days'
  WHERE cca.is_active = true
    AND cca.is_archived = false
    AND cca.connected_at IS NOT NULL
    AND last_act.last_activity IS NULL
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  RETURN v_rows;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_checkin_assignment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_checkins c WHERE c.id = NEW.coach_checkin_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_checkin_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_checkin_log_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_checkins cc
    WHERE cc.client_id = NEW.client_id
      AND cc.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_coach_private_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment (not client_profiles)
  SELECT cca.coach_id INTO v_coach 
  FROM public.coach_client_assignments cca 
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN 
    RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id; 
  END IF;
  
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_file_assignment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
DECLARE v_path text;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  SELECT cf.file_path INTO v_path
  FROM public.coach_files cf
  WHERE cf.id = NEW.coach_file_id
    AND cf.coach_id = v_coach;

  IF v_path IS NULL THEN
    RAISE EXCEPTION 'coach_file_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  NEW.coach_file_path := v_path; -- Denormalized for Storage speed
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_habit_assignment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_habits ch
    WHERE ch.id = NEW.coach_habit_id
      AND ch.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_habit_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_habit_log_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_habits ch
    WHERE ch.client_id = NEW.client_id
      AND ch.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_metric_assignment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach
  FROM public.client_profiles cp
  WHERE cp.client_id = NEW.client_id;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'client_id has no client_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_metrics cm
    WHERE cm.id = NEW.coach_metric_id
      AND cm.coach_id = v_coach
  ) THEN
    RAISE EXCEPTION 'coach_metric_id does not belong to client coach';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_metric_entry_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  -- Get coach from assignment
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  -- Check assignment exists (now in client_metrics table)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.client_id = NEW.client_id
      AND cm.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'metric is not assigned to client';
  END IF;

  NEW.coach_id := v_coach;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_metric_log_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.client_id = NEW.client_id
      AND cm.id = NEW.assignment_id
  ) THEN
    RAISE EXCEPTION 'assignment_id does not exist for this client';
  END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_photo_log_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cca.coach_id INTO v_coach
  FROM public.coach_client_assignments cca
  WHERE cca.client_id = NEW.client_id
  LIMIT 1;

  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no coach assignment'; END IF;

  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_quest_assignment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_coach uuid;
BEGIN
  SELECT cp.coach_id INTO v_coach FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'client_id has no client_profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coach_questionnaires c WHERE c.id = NEW.coach_questionnaire_id AND c.coach_id = v_coach) THEN
    RAISE EXCEPTION 'coach_questionnaire_id does not belong to client coach';
  END IF;
  NEW.coach_id := v_coach;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_todolist_client_belongs_to_coach()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Defense-in-depth: Coach MUST match auth.uid() (if user session)
  IF auth.uid() IS NOT NULL AND NEW.coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'coach_id must equal auth.uid()';
  END IF;

  -- Normalize / validate (matches your CHECK constraints)
  IF NEW.type = 'general' THEN
    NEW.client_id := NULL; -- Force consistency
    RETURN NEW;
  ELSIF NEW.type = 'client' THEN
    IF NEW.client_id IS NULL THEN
      RAISE EXCEPTION 'type=client requires client_id';
    END IF;

    -- Use coach_client_assignments instead of client_profiles.coach_id
    IF NOT EXISTS (
      SELECT 1
      FROM public.coach_client_assignments cca
      WHERE cca.client_id = NEW.client_id
        AND cca.coach_id = NEW.coach_id
    ) THEN
      RAISE EXCEPTION 'client_id does not belong to this coach';
    END IF;

    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'invalid type (expected client/general)';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_add_files(p_coach_id uuid, p_client_id uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_files (client_id, coach_id, filename, display_name, file_path, mime_type, size)
  SELECT
    p_client_id,
    p_coach_id,
    f.filename,
    f.filename,
    f.file_path,
    f.mime_type,
    f.size
  FROM public.coach_files f
  WHERE f.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND f.coach_id = p_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_add_habits(p_coach_id uuid, p_client_id uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_habits (
    client_id, coach_id, name, description, schedule_type,
    days_of_week, times_of_day, timezone, start_date, end_date,
    schedule_config, amount, unit, period
  )
  SELECT
    p_client_id,
    p_coach_id,
    h.name,
    h.description,
    h.schedule_type,
    h.days_of_week,
    h.times_of_day,
    h.timezone,
    h.start_date,
    h.end_date,
    h.schedule_config,
    (h.schedule_config->>'amount')::numeric,
    h.schedule_config->>'unit',
    COALESCE(h.schedule_config->>'period', h.schedule_type)
  FROM public.coach_habits h
  WHERE h.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND h.coach_id = p_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_add_metrics(p_coach_id uuid, p_client_id uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_metrics (
    client_id, coach_id, name, unit, description,
    value_kind, min_value, max_value, cron_expression, schedule_config
  )
  SELECT
    p_client_id,
    p_coach_id,
    m.name,
    m.unit,
    m.description,
    m.value_kind,
    m.min_value,
    m.max_value,
    m.cron_expression,
    m.schedule_config
  FROM public.coach_metrics m
  WHERE m.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND m.coach_id = p_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_assign_checkins(p_coach_id uuid, p_client_id uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_checkins (client_id, coach_id, name, description, questions, schedule_config, cron_expression, status)
  SELECT
    p_client_id,
    p_coach_id,
    t.name,
    t.description,
    COALESCE(t.questions, '[]'::jsonb),
    t.schedule_config,
    t.cron_expression,
    CASE
      WHEN t.questions IS NOT NULL AND jsonb_array_length(t.questions) > 0 THEN 'live'
      ELSE 'draft'
    END
  FROM public.coach_checkins t
  WHERE t.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND t.coach_id = p_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_assign_questionnaires(p_coach_id uuid, p_client_id uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_questionnaires (client_id, coach_id, name, description, questions, status, sent_at)
  SELECT
    p_client_id,
    p_coach_id,
    t.name,
    t.description,
    COALESCE(t.questions, '[]'::jsonb),
    'pending',
    now()
  FROM public.coach_questionnaires t
  WHERE t.id = ANY(SELECT (jsonb_array_elements_text(p_ids))::uuid)
    AND t.coach_id = p_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_flow_send_message(p_coach_id uuid, p_client_id uuid, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE coach_id = p_coach_id
    AND client_id = p_client_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RAISE WARNING 'execute_flow_send_message: no conversation for coach=% client=%', p_coach_id, p_client_id;
    RETURN;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, status)
  VALUES (v_conversation_id, p_coach_id, p_message, 'text', 'sent');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_free_trials()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INTEGER;
  v_referral_rows INTEGER;
BEGIN
  -- Update coaches whose 30-day trial has expired.
  -- Only mark trials as completed when:
  --   1. free_trial_completed is currently FALSE
  --   2. 30 days have elapsed since created_at
  --   3. It's just after midnight (hour = 0) in the coach's timezone

  UPDATE public.coach_profiles cp
  SET free_trial_completed = TRUE
  FROM public.user_profiles up
  WHERE
    up.id = cp.id
    AND up.user_type = 'coach'
    AND cp.free_trial_completed = FALSE
    AND cp.created_at < NOW() - INTERVAL '30 days'
    AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 0;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Also update referral status to 'trial_ended' for referred coaches
  -- whose trial just expired (and who haven't converted yet)
  UPDATE public.coach_referrals cr
  SET
    status = 'trial_ended',
    trial_ended_at = NOW()
  FROM public.coach_profiles cp
  WHERE
    cr.referred_coach_id = cp.id
    AND cr.status = 'trial_started'  -- Only if still in trial_started status
    AND cp.free_trial_completed = TRUE  -- Trial just expired
    AND cr.converted_at IS NULL;  -- Haven't converted to paid

  GET DIAGNOSTICS v_referral_rows = ROW_COUNT;

  IF v_referral_rows > 0 THEN
    RAISE NOTICE 'expire_free_trials: marked % referrals as trial_ended', v_referral_rows;
  END IF;

  RETURN v_rows;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.extract_conversation_id_from_topic(topic text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  parts TEXT[];
  conv_id TEXT;
BEGIN
  parts := string_to_array(topic, ':');

  IF array_length(parts, 1) != 3 THEN
    RETURN NULL;
  END IF;

  IF parts[1] != 'conversation' OR parts[3] != 'messages' THEN
    RETURN NULL;
  END IF;

  conv_id := parts[2];

  BEGIN
    RETURN conv_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_assistant_todos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rows  INTEGER := 0;
    v_tmp   INTEGER;
BEGIN
    -- ── Rule 1: Running out of workouts ─────────────────────────────
    -- Client has had workouts before but none scheduled beyond today.
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' is running out of workouts',
        'No workouts are scheduled beyond ' ||
            to_char(COALESCE(latest.last_date, cd.client_today), 'Mon DD, YYYY') ||
            '. Consider programming their next training block.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    -- Only run at midnight window
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check client has had workouts before
    CROSS JOIN LATERAL (
        SELECT MAX(ct.date) AS last_date
        FROM public.client_training ct
        WHERE ct.client_id = cca.client_id
          AND ct.coach_id = cca.coach_id
          AND ct.training_data != '{}'::jsonb
    ) latest
    -- Check no future workouts exist
    LEFT JOIN LATERAL (
        SELECT 1 AS has_future
        FROM public.client_training ct
        WHERE ct.client_id = cca.client_id
          AND ct.coach_id = cca.coach_id
          AND ct.date > cd.client_today
          AND ct.training_data != '{}'::jsonb
        LIMIT 1
    ) future ON true
    -- Dedup: no existing uncompleted auto todo with same title for this client
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' is running out of workouts'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND latest.last_date IS NOT NULL  -- has had workouts before
      AND future.has_future IS NULL     -- no future workouts
      AND existing.id IS NULL;          -- not already flagged

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 2: Inactive client (no activity in 7 days) ────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has had no activity in 7 days',
        'No workouts, check-ins, habits, or metrics logged since ' ||
            to_char(COALESCE(last_act.last_activity, cca.connected_at), 'Mon DD, YYYY') ||
            '. They may need a check-in.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Find the most recent activity across all tables
    CROSS JOIN LATERAL (
        SELECT MAX(activity_date) AS last_activity
        FROM (
            -- Training completions
            SELECT cth.date AS activity_date
            FROM public.client_training_history cth
            WHERE cth.client_id = cca.client_id
              AND cth.coach_id = cca.coach_id
              AND cth.status IN ('in_progress', 'completed')
              AND cth.date >= cd.client_today - 7
            UNION ALL
            -- Habit logs
            SELECT chl.date AS activity_date
            FROM public.client_habit_logs chl
            WHERE chl.client_id = cca.client_id
              AND chl.coach_id = cca.coach_id
              AND chl.date >= cd.client_today - 7
            UNION ALL
            -- Metric logs
            SELECT cml.date AS activity_date
            FROM public.client_metric_logs cml
            WHERE cml.client_id = cca.client_id
              AND cml.coach_id = cca.coach_id
              AND cml.date >= cd.client_today - 7
            UNION ALL
            -- Check-in logs
            SELECT ccl.submission_date AS activity_date
            FROM public.client_checkin_logs ccl
            WHERE ccl.client_id = cca.client_id
              AND ccl.coach_id = cca.coach_id
              AND ccl.submission_date >= cd.client_today - 7
        ) all_activity
    ) last_act
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has had no activity in 7 days'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND cca.connected_at IS NOT NULL
      AND cca.connected_at <= NOW() - INTERVAL '7 days'  -- not brand new
      AND last_act.last_activity IS NULL  -- no recent activity
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 3: Missed workout streak (3+ in a row) ────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has missed 3+ workouts in a row',
        streak.missed_count || ' consecutive workouts missed since ' ||
            to_char(streak.streak_start, 'Mon DD, YYYY') ||
            '. Their program may need adjusting.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Count consecutive missed workouts from most recent backward
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) AS missed_count,
            MIN(h.date) AS streak_start
        FROM (
            SELECT
                cth.date,
                cth.status,
                ROW_NUMBER() OVER (ORDER BY cth.date DESC, cth.workout_id DESC) AS rn
            FROM public.client_training_history cth
            WHERE cth.client_id = cca.client_id
              AND cth.coach_id = cca.coach_id
              AND cth.date <= cd.client_today
            ORDER BY cth.date DESC, cth.workout_id DESC
            LIMIT 20  -- look back at most 20 entries
        ) h
        WHERE h.status = 'missed'
          AND h.rn = (
              -- Only count from the start: find the unbroken streak
              SELECT MIN(s.rn)
              FROM (
                  SELECT
                      hi.rn,
                      hi.status,
                      hi.rn - ROW_NUMBER() OVER (ORDER BY hi.rn) AS grp
                  FROM (
                      SELECT
                          cth2.status,
                          ROW_NUMBER() OVER (ORDER BY cth2.date DESC, cth2.workout_id DESC) AS rn
                      FROM public.client_training_history cth2
                      WHERE cth2.client_id = cca.client_id
                        AND cth2.coach_id = cca.coach_id
                        AND cth2.date <= cd.client_today
                      ORDER BY cth2.date DESC, cth2.workout_id DESC
                      LIMIT 20
                  ) hi
                  WHERE hi.status = 'missed'
              ) s
              WHERE s.grp = 0  -- first contiguous group from rn=1
          ) OR h.rn <= (
              -- Alternative: count all missed from rn=1 until first non-missed
              SELECT COALESCE(MIN(brk.rn) - 1, 20)
              FROM (
                  SELECT
                      ROW_NUMBER() OVER (ORDER BY cth3.date DESC, cth3.workout_id DESC) AS rn,
                      cth3.status
                  FROM public.client_training_history cth3
                  WHERE cth3.client_id = cca.client_id
                    AND cth3.coach_id = cca.coach_id
                    AND cth3.date <= cd.client_today
                  ORDER BY cth3.date DESC, cth3.workout_id DESC
                  LIMIT 20
              ) brk
              WHERE brk.status != 'missed'
          )
    ) streak
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has missed 3+ workouts in a row'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND streak.missed_count >= 3
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 4: Pending questionnaire overdue (3+ days) ────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cq.coach_id,
        cq.client_id,
        up.name || ' hasn''t completed their questionnaire: ' || cq.name,
        'Sent ' || EXTRACT(DAY FROM NOW() - cq.sent_at)::INTEGER || ' days ago on ' ||
            to_char(cq.sent_at, 'Mon DD, YYYY') || ' and still pending.',
        'client'
    FROM public.client_questionnaires cq
    JOIN public.coach_client_assignments cca
        ON cca.coach_id = cq.coach_id AND cca.client_id = cq.client_id
    JOIN public.user_profiles up ON up.id = cq.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cq.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cq.coach_id
        AND existing.client_id = cq.client_id
        AND existing.title = up.name || ' hasn''t completed their questionnaire: ' || cq.name
        AND existing.completed = false
    WHERE cq.status = 'pending'
      AND cq.sent_at IS NOT NULL
      AND cq.sent_at < NOW() - INTERVAL '3 days'
      AND cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 5: Declining habit compliance ─────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || '''s habit compliance has dropped',
        'Completion rate went from ' || prev_week.rate || '% to ' || this_week.rate ||
            '% compared to the previous week.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- This week's habit completion rate
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE chl.status = 'completed') AS completed,
            COUNT(*) AS total,
            CASE WHEN COUNT(*) >= 3
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE chl.status = 'completed') / COUNT(*))
                ELSE NULL
            END AS rate
        FROM public.client_habit_logs chl
        WHERE chl.client_id = cca.client_id
          AND chl.coach_id = cca.coach_id
          AND chl.date BETWEEN cd.client_today - 6 AND cd.client_today
    ) this_week
    -- Previous week's habit completion rate
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE chl.status = 'completed') AS completed,
            COUNT(*) AS total,
            CASE WHEN COUNT(*) >= 3
                THEN ROUND(100.0 * COUNT(*) FILTER (WHERE chl.status = 'completed') / COUNT(*))
                ELSE NULL
            END AS rate
        FROM public.client_habit_logs chl
        WHERE chl.client_id = cca.client_id
          AND chl.coach_id = cca.coach_id
          AND chl.date BETWEEN cd.client_today - 13 AND cd.client_today - 7
    ) prev_week
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || '''s habit compliance has dropped'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND prev_week.rate IS NOT NULL
      AND this_week.rate IS NOT NULL
      AND prev_week.rate >= 70           -- was doing well
      AND prev_week.rate - this_week.rate >= 30  -- significant drop
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 6: New client needs setup ─────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || ' has no assignments yet',
        'Connected ' || EXTRACT(DAY FROM NOW() - cca.connected_at)::INTEGER ||
            ' days ago but has no workouts, check-ins, habits, or metrics assigned.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check no assignments exist
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_training ct
        WHERE ct.client_id = cca.client_id AND ct.coach_id = cca.coach_id LIMIT 1
    ) t ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_checkins ci
        WHERE ci.client_id = cca.client_id AND ci.coach_id = cca.coach_id LIMIT 1
    ) ci ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_habits ch
        WHERE ch.client_id = cca.client_id AND ch.coach_id = cca.coach_id LIMIT 1
    ) h ON true
    LEFT JOIN LATERAL (
        SELECT 1 AS has_any FROM public.client_metrics cm
        WHERE cm.client_id = cca.client_id AND cm.coach_id = cca.coach_id LIMIT 1
    ) m ON true
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = up.name || ' has no assignments yet'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND cca.status = 'connected'
      AND cca.connected_at IS NOT NULL
      AND cca.connected_at < NOW() - INTERVAL '1 day'  -- give coach a day
      AND tw.is_midnight = true
      AND t.has_any IS NULL
      AND ci.has_any IS NULL
      AND h.has_any IS NULL
      AND m.has_any IS NULL
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 7: Metric not logged ──────────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cm.coach_id,
        cm.client_id,
        up.name || ' hasn''t logged ''' || cm.name || '''',
        'Last logged ' ||
            CASE WHEN last_log.last_date IS NOT NULL
                THEN EXTRACT(DAY FROM NOW() - last_log.last_date::timestamp)::INTEGER || ' days ago on ' ||
                     to_char(last_log.last_date, 'Mon DD, YYYY')
                ELSE 'never'
            END ||
            '. Expected frequency: ' || COALESCE(cm.schedule_config->>'frequency', 'unknown') || '.',
        'client'
    FROM public.client_metrics cm
    JOIN public.coach_client_assignments cca
        ON cca.coach_id = cm.coach_id AND cca.client_id = cm.client_id
    JOIN public.user_profiles up ON up.id = cm.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cm.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Most recent log for this metric
    CROSS JOIN LATERAL (
        SELECT MAX(cml.date) AS last_date
        FROM public.client_metric_logs cml
        WHERE cml.assignment_id = cm.id
          AND cml.client_id = cm.client_id
          AND cml.coach_id = cm.coach_id
    ) last_log
    -- Determine threshold based on frequency
    CROSS JOIN LATERAL (
        SELECT CASE cm.schedule_config->>'frequency'
            WHEN 'daily'    THEN 2
            WHEN 'weekly'   THEN 14
            WHEN 'biweekly' THEN 28
            WHEN 'monthly'  THEN 60
            ELSE 14  -- default to 2 weeks
        END AS threshold_days
    ) freq
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cm.coach_id
        AND existing.client_id = cm.client_id
        AND existing.title = up.name || ' hasn''t logged ''' || cm.name || ''''
        AND existing.completed = false
    WHERE cm.schedule_config IS NOT NULL
      AND cm.schedule_config != '{}'::jsonb
      AND cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND (
          last_log.last_date IS NULL  -- never logged
          OR last_log.last_date < cd.client_today - freq.threshold_days
      )
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 8: Client birthday coming up (within 3 days) ──────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        up.name || '''s birthday is ' ||
            CASE days_away.days
                WHEN 0 THEN 'today'
                WHEN 1 THEN 'tomorrow'
                ELSE 'in ' || days_away.days || ' days'
            END,
        'They''re turning ' ||
            (EXTRACT(YEAR FROM cd.client_today) - EXTRACT(YEAR FROM cp.date_of_birth))::INTEGER ||
            ' on ' || to_char(
                (EXTRACT(YEAR FROM cd.client_today)::INTEGER || '-' ||
                 LPAD(EXTRACT(MONTH FROM cp.date_of_birth)::TEXT, 2, '0') || '-' ||
                 LPAD(EXTRACT(DAY FROM cp.date_of_birth)::TEXT, 2, '0'))::date,
                'Mon DD, YYYY'
            ) || '.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    JOIN public.client_profiles cp ON cp.client_id = cca.client_id
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Calculate days until birthday this year (handle year wrap)
    CROSS JOIN LATERAL (
        SELECT
            CASE
                WHEN (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) >= cd.client_today
                THEN (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) - cd.client_today
                ELSE (MAKE_DATE(EXTRACT(YEAR FROM cd.client_today)::INTEGER + 1,
                                EXTRACT(MONTH FROM cp.date_of_birth)::INTEGER,
                                EXTRACT(DAY FROM cp.date_of_birth)::INTEGER)
                     ) - cd.client_today
            END AS days
    ) days_away
    -- Dedup: check no existing todo with birthday-related title for this client
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title LIKE up.name || '''s birthday is %'
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND tw.is_midnight = true
      AND cp.date_of_birth IS NOT NULL
      AND days_away.days BETWEEN 0 AND 3
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── Rule 9: Client anniversary ─────────────────────────────────
    INSERT INTO public.coach_auto_todolist (coach_id, client_id, title, description, type)
    SELECT
        cca.coach_id,
        cca.client_id,
        anniv.label || ' with ' || up.name,
        'You''ve been working together since ' ||
            to_char(cca.connected_at, 'Mon DD, YYYY') || '.',
        'client'
    FROM public.coach_client_assignments cca
    JOIN public.user_profiles up ON up.id = cca.client_id AND up.user_type = 'client'
    LEFT JOIN public.user_profiles coup ON coup.id = cca.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::date AS client_today,
               (NOW() AT TIME ZONE COALESCE(up.timezone, coup.timezone, 'UTC'))::time AS client_time
    ) cd
    CROSS JOIN LATERAL (
        SELECT cd.client_time >= '00:00'::time AND cd.client_time < '00:30'::time AS is_midnight
    ) tw
    -- Check milestone anniversaries
    CROSS JOIN LATERAL (
        SELECT milestone.label, milestone.anniversary_date
        FROM (
            VALUES
                ('1 month anniversary',  cca.connected_at + INTERVAL '1 month'),
                ('3 month anniversary',  cca.connected_at + INTERVAL '3 months'),
                ('6 month anniversary',  cca.connected_at + INTERVAL '6 months'),
                ('1 year anniversary',   cca.connected_at + INTERVAL '1 year'),
                ('2 year anniversary',   cca.connected_at + INTERVAL '2 years'),
                ('3 year anniversary',   cca.connected_at + INTERVAL '3 years')
        ) AS milestone(label, anniversary_date)
        WHERE milestone.anniversary_date::date BETWEEN cd.client_today AND cd.client_today + 3
        LIMIT 1
    ) anniv
    -- Dedup
    LEFT JOIN public.coach_auto_todolist existing
        ON existing.coach_id = cca.coach_id
        AND existing.client_id = cca.client_id
        AND existing.title = anniv.label || ' with ' || up.name
        AND existing.completed = false
    WHERE cca.is_active = true
      AND cca.is_archived = false
      AND cca.connected_at IS NOT NULL
      AND tw.is_midnight = true
      AND existing.id IS NULL;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    RETURN v_rows;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_daily_client_tasks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rows  INTEGER := 0;
    v_tmp   INTEGER;
BEGIN
    -- ── 3a. Check-ins (status = 'live') ──────────────────────────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        ci.client_id,
        ci.coach_id,
        'check_in',
        ci.id,
        cd.client_today
    FROM public.client_checkins ci
    LEFT JOIN public.user_profiles cup
        ON cup.id = ci.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = ci.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            lower(to_char(cd.client_today, 'fmday'))  AS dow_name,
            EXTRACT(DAY FROM cd.client_today)::INTEGER AS day_of_month,
            EXTRACT(DAY FROM (date_trunc('month', cd.client_today) + INTERVAL '1 month - 1 day'))::INTEGER AS days_in_month
    ) dp
    WHERE ci.status = 'live'
      AND ci.schedule_config IS NOT NULL
      AND (
          -- daily
          (ci.schedule_config->>'frequency' = 'daily')
          -- weekly: client's day name is in selectedDays
          OR (
              ci.schedule_config->>'frequency' = 'weekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
          )
          -- biweekly: correct day AND correct week parity
          OR (
              ci.schedule_config->>'frequency' = 'biweekly'
              AND ci.schedule_config->'selectedDays' ? dp.dow_name
              AND (
                  ((cd.client_today - ci.created_at::date) / 7) % 2 = 0
              )
          )
          -- monthly
          OR (
              ci.schedule_config->>'frequency' = 'monthly'
              AND (
                  (ci.schedule_config->>'monthlyOption' = 'first'    AND dp.day_of_month = 1)
                  OR (ci.schedule_config->>'monthlyOption' = 'last'  AND dp.day_of_month = dp.days_in_month)
                  OR (
                      ci.schedule_config->>'monthlyOption' = 'specific'
                      AND dp.day_of_month = COALESCE((ci.schedule_config->>'monthlyDay')::INTEGER, 1)
                  )
              )
          )
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── 3b. Metrics (cron_expression IS NOT NULL = scheduled) ────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        m.client_id,
        m.coach_id,
        'metric',
        m.id,
        cd.client_today
    FROM public.client_metrics m
    LEFT JOIN public.user_profiles cup
        ON cup.id = m.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = m.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            lower(to_char(cd.client_today, 'fmday'))  AS dow_name,
            EXTRACT(DAY FROM cd.client_today)::INTEGER AS day_of_month,
            EXTRACT(DAY FROM (date_trunc('month', cd.client_today) + INTERVAL '1 month - 1 day'))::INTEGER AS days_in_month
    ) dp
    WHERE m.cron_expression IS NOT NULL
      AND m.schedule_config IS NOT NULL
      AND (
          (m.schedule_config->>'frequency' = 'daily')
          OR (
              m.schedule_config->>'frequency' = 'weekly'
              AND m.schedule_config->'selectedDays' ? dp.dow_name
          )
          OR (
              m.schedule_config->>'frequency' = 'biweekly'
              AND m.schedule_config->'selectedDays' ? dp.dow_name
              AND (
                  ((cd.client_today - m.created_at::date) / 7) % 2 = 0
              )
          )
          OR (
              m.schedule_config->>'frequency' = 'monthly'
              AND (
                  (m.schedule_config->>'monthlyOption' = 'first'    AND dp.day_of_month = 1)
                  OR (m.schedule_config->>'monthlyOption' = 'last'  AND dp.day_of_month = dp.days_in_month)
                  OR (
                      m.schedule_config->>'monthlyOption' = 'specific'
                      AND dp.day_of_month = COALESCE((m.schedule_config->>'monthlyDay')::INTEGER, 1)
                  )
              )
          )
      )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- ── 3c. Habits ───────────────────────────────────────────────
    INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
    SELECT
        h.client_id,
        h.coach_id,
        'habit',
        h.id,
        cd.client_today
    FROM public.client_habits h
    LEFT JOIN public.user_profiles cup
        ON cup.id = h.client_id AND cup.user_type = 'client'
    LEFT JOIN public.user_profiles coup
        ON coup.id = h.coach_id AND coup.user_type = 'coach'
    CROSS JOIN LATERAL (
        SELECT (NOW() AT TIME ZONE COALESCE(cup.timezone, coup.timezone, 'UTC'))::date AS client_today
    ) cd
    CROSS JOIN LATERAL (
        SELECT
            EXTRACT(ISODOW FROM cd.client_today)::INTEGER AS dow_iso
    ) dp
    WHERE
        -- Respect date range
        (h.start_date IS NULL OR h.start_date <= cd.client_today)
        AND (h.end_date IS NULL OR h.end_date >= cd.client_today)
        AND (
            h.schedule_type = 'daily'
            OR (
                h.schedule_type = 'weekly'
                AND h.days_of_week IS NOT NULL
                AND dp.dow_iso = ANY(h.days_of_week)
            )
        )
    ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;

    GET DIAGNOSTICS v_tmp = ROW_COUNT;
    v_rows := v_rows + v_tmp;

    -- NOTE: Questionnaires are handled by a trigger (see section 5),
    -- not by this cron function.

    RETURN v_rows;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_short_id()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 8 random characters
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_short_id(p_len integer DEFAULT 12)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    alphabet CONSTANT text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    result text := '';
    buf bytea;
    b int;
    i int;
BEGIN
    IF p_len < 1 THEN
        RAISE EXCEPTION 'p_len must be >= 1';
    END IF;

    -- Generate random characters using rejection sampling to avoid modulo bias
    WHILE length(result) < p_len LOOP
        buf := gen_random_bytes(p_len);
        FOR i IN 0..length(buf)-1 LOOP
            b := get_byte(buf, i);

            -- Rejection sampling: 248 = 62 * 4 (largest multiple of 62 that fits in a byte)
            IF b < 248 THEN
                result := result || substr(alphabet, (b % 62) + 1, 1);
                EXIT WHEN length(result) = p_len;
            END IF;
        END LOOP;
    END LOOP;

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_unique_code(length integer DEFAULT 12)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ai_prompt_usage(p_coach_id uuid, p_daily_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_count INTEGER;
BEGIN
  -- Get current count (or 0 if no record exists)
  SELECT COALESCE(prompt_count, 0) INTO v_current_count
  FROM ai_assistant_daily_usage
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', GREATEST(0, p_daily_limit - v_current_count),
    'is_limited', true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cached_musclewiki_exercises(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_category text DEFAULT NULL::text, p_difficulty text DEFAULT NULL::text, p_search_term text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, musclewiki_id text, name text, category text, difficulty text, target_muscles jsonb, thumbnail_url text, is_cache_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mwec.id,
    mwec.musclewiki_id,
    mwec.name,
    mwec.category,
    mwec.difficulty,
    mwec.target_muscles,
    mwec.thumbnail_url,
    (mwec.cache_expires_at > now()) as is_cache_valid
  FROM public.musclewiki_exercise_cache mwec
  WHERE
    (p_category IS NULL OR mwec.category = p_category)
    AND (p_difficulty IS NULL OR mwec.difficulty = p_difficulty)
    AND (p_search_term IS NULL OR mwec.name ILIKE '%' || p_search_term || '%')
  ORDER BY mwec.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_coach_notification_settings(coach_uuid uuid)
 RETURNS TABLE(event_id uuid, event_key text, name text, description text, category text, enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Verify caller is authenticated and is the coach requesting their own settings
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != coach_uuid THEN
        RAISE EXCEPTION 'Unauthorized: Can only access your own notification settings';
    END IF;

    RETURN QUERY
    SELECT
      ane.id AS event_id,
      ane.event_key,
      ane.name,
      ane.description,
      ane.category,
      COALESCE(cnp.enabled, ane.default_enabled) AS enabled
    FROM public.available_notification_events ane
    LEFT JOIN public.coach_notification_preferences cnp
      ON ane.id = cnp.event_id
      AND cnp.coach_id = coach_uuid
    ORDER BY ane.category, ane.event_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_exercise_cache_stats()
 RETURNS TABLE(total_cached bigint, valid_cached bigint, expired_cached bigint, expiring_soon bigint, last_population timestamp with time zone, needs_refresh boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache)::BIGINT AS total_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at > now())::BIGINT AS valid_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at <= now())::BIGINT AS expired_cached,
    (SELECT COUNT(*) FROM public.musclewiki_exercise_cache WHERE cache_expires_at BETWEEN now() AND (now() + INTERVAL '2 days'))::BIGINT AS expiring_soon,
    (SELECT started_at FROM public.musclewiki_cache_population_log WHERE status = 'success' ORDER BY started_at DESC LIMIT 1) AS last_population,
    public.should_populate_exercise_cache() AS needs_refresh;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_flow_trigger_type(p_flow_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_node JSONB;
BEGIN
  FOR v_node IN SELECT jsonb_array_elements(p_flow_data->'nodes')
  LOOP
    IF v_node->>'type' = 'trigger' AND v_node->'data'->'option'->>'id' IS NOT NULL THEN
      RETURN v_node->'data'->'option'->>'id';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_musclewiki_usage_stats(p_days integer DEFAULT 30)
 RETURNS TABLE(period_start timestamp with time zone, period_end timestamp with time zone, total_api_calls bigint, cache_hits bigint, cache_misses bigint, cache_hit_rate numeric, avg_response_time_ms numeric, total_exercises_served bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    now() - (p_days || ' days')::INTERVAL as period_start,
    now() as period_end,
    COUNT(*)::BIGINT as total_api_calls,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::BIGINT as cache_hits,
    SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END)::BIGINT as cache_misses,
    ROUND(
      (SUM(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as cache_hit_rate,
    ROUND(AVG(request_duration_ms)::NUMERIC, 2) as avg_response_time_ms,
    SUM(exercises_returned)::BIGINT as total_exercises_served
  FROM public.musclewiki_api_audit_log
  WHERE created_at >= now() - (p_days || ' days')::INTERVAL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_coach_id uuid, p_client_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify caller is either the coach or the client in this conversation
  IF auth.uid() != p_coach_id AND auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: You must be a participant in the conversation';
  END IF;

  -- Note: Self-messaging is allowed (coach can be their own demo client)

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE coach_id = p_coach_id
    AND client_id = p_client_id;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (coach_id, client_id)
    VALUES (p_coach_id, p_client_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profile_picture_url(user_metadata jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF user_metadata->>'profile_picture_url' IS NOT NULL AND
     user_metadata->>'profile_picture_url' != '' THEN
    RETURN user_metadata->>'profile_picture_url';
  END IF;

  IF user_metadata->>'avatar_url' IS NOT NULL AND
     user_metadata->>'avatar_url' != '' THEN
    RETURN user_metadata->>'avatar_url';
  END IF;

  IF user_metadata->>'picture' IS NOT NULL AND
     user_metadata->>'picture' != '' THEN
    RETURN user_metadata->>'picture';
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_signin_method(user_metadata jsonb)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if provider is explicitly set in user_metadata (sometimes set)
  IF user_metadata->>'provider' IS NOT NULL THEN
    RETURN user_metadata->>'provider';
  END IF;

  -- Check issuer (iss) field - most reliable for OAuth providers
  -- Apple: https://appleid.apple.com
  -- Google: https://accounts.google.com
  IF user_metadata->>'iss' IS NOT NULL THEN
    IF user_metadata->>'iss' LIKE '%appleid.apple.com%' THEN
      RETURN 'apple';
    ELSIF user_metadata->>'iss' LIKE '%accounts.google.com%' OR user_metadata->>'iss' LIKE '%google%' THEN
      RETURN 'google';
    END IF;
  END IF;

  -- Check for Apple private relay email (reliable Apple indicator)
  IF user_metadata->>'email' LIKE '%@privaterelay.appleid.com' THEN
    RETURN 'apple';
  END IF;

  -- Check for Google-specific indicators
  IF user_metadata->>'picture' IS NOT NULL AND
     user_metadata->>'picture' LIKE '%googleusercontent.com%' THEN
    RETURN 'google';
  END IF;

  -- Default to email for everything else
  RETURN 'email';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_storage_signed_url(p_bucket_id text, p_file_path text, p_expiry_seconds integer DEFAULT 3600)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_signed_url TEXT;
BEGIN
  -- Generate a signed URL for the attachment
  -- This uses Supabase's storage.fpath API
  SELECT storage.fpath(p_bucket_id, p_file_path) INTO v_signed_url;
  RETURN v_signed_url;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if URL generation fails
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_type(user_metadata jsonb)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF user_metadata->>'user_type' IS NOT NULL THEN
    RETURN user_metadata->>'user_type';
  END IF;

  RETURN 'coach';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';

  IF v_user_type IS NULL THEN
    RETURN NEW;
  END IF;

  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  );

  IF v_user_type IS DISTINCT FROM v_old_user_type THEN
    IF v_user_type = 'coach' THEN
      SELECT EXISTS(SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        INSERT INTO public.coach_profiles (
          id,
          is_active,
          unique_code
        ) VALUES (
          NEW.id,
          true,
          UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FOR 14))
        );
      END IF;
    ELSIF v_user_type = 'client' THEN
      SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO v_profile_exists;
      IF NOT v_profile_exists THEN
        INSERT INTO public.user_profiles (
          id,
          user_type,
          email,
          name,
          profile_picture_url,
          signin_method
        ) VALUES (
          NEW.id,
          v_user_type,
          COALESCE(NEW.email, ''),
          v_user_name,
          v_profile_picture_url,
          v_signin_method
        );
      END IF;
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_auth_user_update: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_client_account_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions', 'vault'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call the edge function asynchronously via pg_net
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/cleanup-client-storage',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'client_id', OLD.client_id
      )
    ) INTO v_request_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error initiating storage cleanup for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_client_auth_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Delete from user_profiles (if exists)
  DELETE FROM public.user_profiles 
  WHERE id = OLD.client_id;

  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users 
  WHERE id = OLD.client_id;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - the main profile is already deleted
    RAISE WARNING 'Error cleaning up auth for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_coach_account_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions', 'vault'
AS $function$
DECLARE
  v_conversation_ids UUID[];
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get conversation IDs for this coach (for message attachment cleanup)
  SELECT ARRAY_AGG(id) INTO v_conversation_ids
  FROM public.conversations
  WHERE coach_id = OLD.id;

  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call the edge function asynchronously via pg_net
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/cleanup-coach-storage',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'coach_id', OLD.id,
        'conversation_ids', COALESCE(v_conversation_ids, ARRAY[]::UUID[])
      )
    ) INTO v_request_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error initiating storage cleanup for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_coach_auth_cleanup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- For demo clients, the coach is their own client (coach_id = client_id)
  -- We need to clean up in the right order to avoid FK violations

  -- Step 1: Delete any coach_client_assignments where this user is the client
  -- (In case cascade from coach_profiles didn't catch all of them)
  DELETE FROM public.coach_client_assignments
  WHERE client_id = OLD.id;

  -- Step 2: Delete client_profiles for this user (demo client)
  -- Must happen before user_profiles due to FK constraint
  DELETE FROM public.client_profiles
  WHERE client_id = OLD.id;

  -- Step 3: Delete user_profiles entry with user_type='client' (demo)
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'client';

  -- Step 4: Delete the coach's user_profiles entry
  DELETE FROM public.user_profiles
  WHERE id = OLD.id
    AND user_type = 'coach';

  -- Step 5: Delete from auth.users (cascades to other auth-related tables)
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_coach_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- If a referrer is set, create a referral record (trial_started event)
    IF NEW.referrer_coach_id IS NOT NULL AND (OLD IS NULL OR OLD.referrer_coach_id IS NULL) THEN
        INSERT INTO public.coach_referrals (
            referrer_coach_id,
            referred_coach_id,
            status,
            trial_started_at
        ) VALUES (
            NEW.referrer_coach_id,
            NEW.id,
            'trial_started',
            NOW()
        )
        ON CONFLICT (referred_coach_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_coach()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- 1. Create default preferences (without units/timezone, with client_terminology)
    INSERT INTO public.coach_preferences (coach_id, theme, language, color_preset, client_terminology)
    VALUES (NEW.id, 'light', 'en', 'default', 'athlete')
    ON CONFLICT (coach_id) DO NOTHING;

    -- 2. Generate and insert unique coach code
    INSERT INTO public.coach_unique_codes (coach_id, code)
    VALUES (
        NEW.id,
        upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
    )
    ON CONFLICT (coach_id, code) DO NOTHING;

    -- 3. Create default notification preferences
    INSERT INTO public.coach_notification_preferences (coach_id, event_id, enabled)
    SELECT
      NEW.id,
      id,
      true -- We default all to enabled for new coaches
    FROM public.available_notification_events
    ON CONFLICT (coach_id, event_id) DO NOTHING;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_coach_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only proceed if the new profile is a coach
  IF NEW.user_type != 'coach' THEN
    RETURN NEW;
  END IF;

  -- Verify coach_profiles exists (required for FK constraints)
  IF NOT EXISTS (SELECT 1 FROM public.coach_profiles WHERE id = NEW.id) THEN
    RAISE WARNING 'coach_profiles not found for user %, skipping coach setup', NEW.id;
    RETURN NEW;
  END IF;

  -- 1. Create trial entitlements (Max plan + automations + AI assistant for 30 days)
  INSERT INTO public.coach_entitlements (
    coach_id,
    plan_type,
    client_limit,
    has_ai_workout_builder,
    has_custom_exercises,
    has_questionnaires,
    has_habits_metrics,
    storage_limit_gb,
    has_broadcast_messaging,
    has_ai_todo_list,
    has_priority_support,
    has_automations,
    has_ai_assistant,
    has_payments,
    subscription_status,
    is_trial,
    trial_ends_at
  ) VALUES (
    NEW.id,
    'max',
    50,
    true,
    true,
    true,
    true,
    -1,
    true,
    true,
    true,
    true,
    true,
    false,
    'trialing',
    true,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (coach_id) DO NOTHING;

  -- 2. Create default preferences
  INSERT INTO public.coach_preferences (coach_id, theme, language, color_preset, client_terminology)
  VALUES (NEW.id, 'light', 'en', 'default', 'athlete')
  ON CONFLICT (coach_id) DO NOTHING;

  -- 3. Generate and insert unique coach code
  INSERT INTO public.coach_unique_codes (coach_id, code)
  VALUES (
    NEW.id,
    upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
  )
  ON CONFLICT (coach_id, code) DO NOTHING;

  -- 4. Create default notification preferences
  INSERT INTO public.coach_notification_preferences (coach_id, notification_type, in_app_enabled, push_enabled)
  VALUES
    (NEW.id, 'workout_completed', true, true),
    (NEW.id, 'workout_missed', true, true),
    (NEW.id, 'checkin_completed', true, true),
    (NEW.id, 'questionnaire_completed', true, true),
    (NEW.id, 'metric_logged', true, true),
    (NEW.id, 'habit_logged', true, true),
    (NEW.id, 'photo_uploaded', true, true),
    (NEW.id, 'client_connected', true, true),
    (NEW.id, 'goal_added', true, true),
    (NEW.id, 'goal_edited', true, true),
    (NEW.id, 'goal_deleted', true, true),
    (NEW.id, 'injury_added', true, true),
    (NEW.id, 'injury_edited', true, true),
    (NEW.id, 'injury_deleted', true, true)
  ON CONFLICT (coach_id, notification_type) DO NOTHING;

  -- 5. Create Getting Started checklist
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 6. Create default flows (6 flows)
  -- Note: No ON CONFLICT clause - this is a new coach setup, so there won't be
  -- any existing flows. The exception handler catches unique_violation if needed.
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Workout Finished', 'Triggered when a client completes a workout.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Workout finished","option":{"id":"workout-finished","name":"Workout finished"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Check-in Completed', 'Triggered when a client completes a check-in.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Check in completed","option":{"id":"check-in-completed","name":"Check in completed"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Check-in', 'Triggered when a client misses a scheduled check-in.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed check in","option":{"id":"missed-check-in","name":"Missed check in"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Workout', 'Triggered when a client misses a scheduled workout.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed workout","option":{"id":"missed-workout","name":"Missed workout"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Habit Log', 'Triggered when a client misses logging a habit.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed habit log","option":{"id":"missed-habit-log","name":"Missed habit log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (NEW.id, 'Missed Metric Log', 'Triggered when a client misses logging a metric.', '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":400,"y":50},"data":{"label":"Trigger","subtitle":"Missed metric log","option":{"id":"missed-metric-log","name":"Missed metric log"}}},{"id":"add-action-trigger","type":"addAction","position":{"x":400,"y":200},"data":{"metadata":{"index":0}}},{"id":"end","type":"end","position":{"x":400,"y":300},"data":{"label":"End"}}],"edges":[{"id":"trigger-to-add","source":"trigger","target":"add-action-trigger","type":"smoothstep"},{"id":"add-to-end","source":"add-action-trigger","target":"end","type":"smoothstep"}]}'::jsonb, false);

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'FK violation in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error in coach setup for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  IF v_user_type IS NULL THEN
    RAISE WARNING 'user_type not specified in signup metadata for user %', NEW.id;
    RETURN NEW;
  END IF;

  v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);

  -- Create coach_profiles WITHOUT unique_code
  IF v_user_type = 'coach' THEN
    INSERT INTO public.coach_profiles (id, is_active)
    VALUES (NEW.id, true);
  END IF;

  INSERT INTO public.user_profiles (
    id, user_type, email, name, profile_picture_url, signin_method, timezone
  ) VALUES (
    NEW.id,
    v_user_type,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    v_profile_picture_url,
    v_signin_method,
    NEW.raw_user_meta_data->>'timezone'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_profile_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_remaining_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_profiles
  FROM public.user_profiles
  WHERE id = OLD.id;

  IF v_remaining_profiles = 0 THEN
    DELETE FROM auth.users
    WHERE id = OLD.id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting auth user after profile deletion: %', SQLERRM;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_type VARCHAR(20);
  v_old_user_type VARCHAR(20);
  v_signin_method VARCHAR(20);
  v_profile_picture_url TEXT;
  v_profile_exists BOOLEAN;
  v_user_name TEXT;
  v_timezone TEXT;
  v_new_code TEXT;
  v_code_inserted BOOLEAN;
  v_retry_count INT;
  i INT;
BEGIN
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_old_user_type := OLD.raw_user_meta_data->>'user_type';
  v_profile_picture_url := public.get_profile_picture_url(NEW.raw_user_meta_data);
  v_timezone := NEW.raw_user_meta_data->>'timezone';

  v_user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    ''
  );

  -- CASE 1: user_type was just set (was null OR empty, now has value)
  -- This handles Google OAuth signup where user_type is set after user creation
  IF (v_old_user_type IS NULL OR v_old_user_type = '') AND
     (v_user_type IS NOT NULL AND v_user_type != '') THEN

    IF v_user_type NOT IN ('coach', 'client') THEN
      RAISE WARNING 'Invalid user_type: %. Skipping profile creation for user: %', v_user_type, NEW.id;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE id = NEW.id AND user_type = v_user_type
      ) INTO v_profile_exists;

      IF NOT v_profile_exists THEN
        v_signin_method := public.get_signin_method(NEW.raw_user_meta_data);

        -- Create coach_profiles (FIXED: use 'id' not 'coach_id')
        IF v_user_type = 'coach' THEN
          BEGIN
            INSERT INTO public.coach_profiles (id, is_active)
            VALUES (NEW.id, true);
          EXCEPTION
            WHEN unique_violation THEN
              NULL;
            WHEN OTHERS THEN
              RAISE WARNING 'Error inserting coach_profiles for user %: %', NEW.id, SQLERRM;
          END;

          -- Directly create coach_unique_codes entry (don't rely on trigger chain)
          -- Check if code already exists for this coach
          IF NOT EXISTS (SELECT 1 FROM public.coach_unique_codes WHERE coach_id = NEW.id) THEN
            v_code_inserted := FALSE;
            v_retry_count := 0;

            WHILE NOT v_code_inserted AND v_retry_count < 10 LOOP
              -- Generate 12-char alphanumeric code
              v_new_code := '';
              FOR i IN 1..12 LOOP
                v_new_code := v_new_code || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36 + 1)::INT, 1);
              END LOOP;

              BEGIN
                -- FIXED: removed sequence_id (was dropped in migration 185)
                INSERT INTO public.coach_unique_codes (coach_id, code, onboarding_id)
                VALUES (NEW.id, v_new_code, NULL);
                v_code_inserted := TRUE;
              EXCEPTION
                WHEN unique_violation THEN
                  v_retry_count := v_retry_count + 1;
              END;
            END LOOP;

            IF NOT v_code_inserted THEN
              RAISE WARNING 'Failed to generate unique code for coach % after 10 retries', NEW.id;
            END IF;
          END IF;
        END IF;

        BEGIN
          INSERT INTO public.user_profiles (
            id, user_type, email, name, profile_picture_url, signin_method, timezone
          ) VALUES (
            NEW.id,
            v_user_type,
            COALESCE(NEW.email, ''),
            v_user_name,
            v_profile_picture_url,
            v_signin_method,
            v_timezone
          );
        EXCEPTION
          WHEN unique_violation THEN
            NULL;
          WHEN OTHERS THEN
            RAISE WARNING 'Error inserting user_profiles for user %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  -- CASE 2: Update existing user_profiles with any metadata changes
  UPDATE public.user_profiles
  SET
    email = COALESCE(NEW.email, email),
    name = COALESCE(NULLIF(v_user_name, ''), name),
    profile_picture_url = COALESCE(v_profile_picture_url, profile_picture_url),
    timezone = COALESCE(v_timezone, timezone),
    updated_at = NOW()
  WHERE id = NEW.id;

  UPDATE public.coach_profiles
  SET updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Exception in handle_user_update for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_upvote_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = upvote_count + 1
  WHERE id = NEW.feature_request_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
    AND (coach_id = p_user_id OR client_id = p_user_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_musclewiki_api_call(p_endpoint text, p_method text DEFAULT 'GET'::text, p_query_params jsonb DEFAULT NULL::jsonb, p_response_status integer DEFAULT NULL::integer, p_response_size_bytes integer DEFAULT NULL::integer, p_exercises_returned integer DEFAULT 0, p_cache_hit boolean DEFAULT false, p_cache_miss_reason text DEFAULT NULL::text, p_request_source text DEFAULT 'web_app'::text, p_user_id uuid DEFAULT NULL::uuid, p_request_duration_ms integer DEFAULT NULL::integer, p_rate_limit_remaining integer DEFAULT NULL::integer, p_rate_limit_reset_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.musclewiki_api_audit_log (
    endpoint,
    method,
    query_params,
    response_status,
    response_size_bytes,
    exercises_returned,
    cache_hit,
    cache_miss_reason,
    request_source,
    user_id,
    request_duration_ms,
    rate_limit_remaining,
    rate_limit_reset_at
  ) VALUES (
    p_endpoint,
    p_method,
    p_query_params,
    p_response_status,
    p_response_size_bytes,
    p_exercises_returned,
    p_cache_hit,
    p_cache_miss_reason,
    p_request_source,
    p_user_id,
    p_request_duration_ms,
    p_rate_limit_remaining,
    p_rate_limit_reset_at
  )
  RETURNING id INTO v_log_id;

  -- Update daily API call counter
  UPDATE public.musclewiki_sync_metadata
  SET
    total_api_calls_today = CASE
      WHEN api_calls_reset_at IS NULL OR api_calls_reset_at < CURRENT_DATE
      THEN 1
      ELSE total_api_calls_today + 1
    END,
    api_calls_reset_at = CASE
      WHEN api_calls_reset_at IS NULL OR api_calls_reset_at < CURRENT_DATE
      THEN CURRENT_DATE + INTERVAL '1 day'
      ELSE api_calls_reset_at
    END
  WHERE sync_type = 'full_catalog';

  RETURN v_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_automate_onboardings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET automate_onboardings = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND automate_onboardings = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_check_ins_forms_questionnaire()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET check_ins_forms = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND check_ins_forms = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_custom_exercises()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET custom_exercises = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND custom_exercises = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_lifestyle_habits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET lifestyle_habits = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND lifestyle_habits = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_on_demand_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET on_demand_resources = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND on_demand_resources = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_powerful_flows()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name != 'New Client Sign Up' AND NEW.is_active = true THEN
    UPDATE public.coach_getting_started_checklist
    SET powerful_flows = true, updated_at = now()
    WHERE coach_id = NEW.coach_id AND powerful_flows = false;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_program_templates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET program_templates = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND program_templates = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_track_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET track_metrics = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND track_metrics = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_checklist_workout_ai()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coach_getting_started_checklist
  SET workout_ai = true, updated_at = now()
  WHERE coach_id = NEW.coach_id AND workout_ai = false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_message_attachments_ready(p_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.messages
  SET attachments_ready = TRUE
  WHERE id = p_message_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_missed_workouts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Insert a 'missed' row for every workout that exists in client_training
  -- but has no corresponding row in client_training_history.
  --
  -- Timezone resolution order:
  --   1. Client's own timezone (user_profiles where user_type='client')
  --   2. Coach's timezone (user_profiles where id = coach_id)
  --   3. 'UTC' fallback
  --
  -- We look back 2 days (yesterday + day before) as a catch-up window
  -- in case a previous cron run failed.
  --
  -- The ON CONFLICT DO NOTHING makes this fully idempotent.

  WITH missed AS (
    INSERT INTO public.client_training_history
      (client_id, coach_id, date, workout_id, status)
    SELECT
      ct.client_id,
      ct.coach_id,
      ct.date,
      wk.workout_id,
      'missed'
    FROM public.client_training ct
    LEFT JOIN public.user_profiles client_up
      ON client_up.id = ct.client_id AND client_up.user_type = 'client'
    LEFT JOIN public.user_profiles coach_up
      ON coach_up.id = ct.coach_id AND coach_up.user_type = 'coach'
    CROSS JOIN LATERAL jsonb_object_keys(ct.training_data) AS wk(workout_id)
    LEFT JOIN public.client_training_history cth
      ON  cth.client_id  = ct.client_id
      AND cth.coach_id   = ct.coach_id
      AND cth.date       = ct.date
      AND cth.workout_id = wk.workout_id
    WHERE
      ct.date < (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date
      AND ct.date >= (NOW() AT TIME ZONE COALESCE(client_up.timezone, coach_up.timezone, 'UTC'))::date - 2
      AND cth.client_id IS NULL
      AND ct.training_data != '{}'::jsonb
    ON CONFLICT (client_id, coach_id, date, workout_id) DO NOTHING
    RETURNING client_id, coach_id, date, workout_id
  )
  -- Create a coach notification for each missed workout
  INSERT INTO public.coach_notifications
    (coach_id, client_id, notification_type, title, description, metadata)
  SELECT
    m.coach_id,
    m.client_id,
    'workout_missed',
    'Workout missed',
    COALESCE(up.name, 'Client') || ' missed a workout on ' || to_char(m.date, 'Mon DD, YYYY'),
    jsonb_build_object('workout_id', m.workout_id, 'date', m.date)
  FROM missed m
  LEFT JOIN public.user_profiles up ON up.id = m.client_id AND up.user_type = 'client';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$
;

create or replace view "public"."musclewiki_compliance_report" as  SELECT date_trunc('day'::text, created_at) AS report_date,
    count(*) AS total_requests,
    sum(
        CASE
            WHEN cache_hit THEN 1
            ELSE 0
        END) AS cache_hits,
    sum(
        CASE
            WHEN (NOT cache_hit) THEN 1
            ELSE 0
        END) AS api_calls,
    round(((sum(
        CASE
            WHEN cache_hit THEN 1.0
            ELSE 0.0
        END) / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS cache_hit_percentage,
    sum(
        CASE
            WHEN (content_type = 'metadata'::text) THEN 1
            ELSE 0
        END) AS metadata_requests,
    sum(
        CASE
            WHEN (content_type = 'video'::text) THEN 1
            ELSE 0
        END) AS video_requests,
    min(rate_limit_remaining) AS min_rate_limit_remaining,
    round(avg(request_duration_ms), 2) AS avg_response_ms
   FROM public.musclewiki_api_audit_log
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;


CREATE OR REPLACE FUNCTION public.process_flow_executions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_processed INTEGER := 0;
  v_exec      RECORD;
  v_action    JSONB;
  v_action_type TEXT;
  v_payload   JSONB;
  v_next_id   TEXT;
  v_yes_id    TEXT;
  v_no_id     TEXT;
  v_check_result BOOLEAN;
  v_action_id TEXT;
  v_max_steps INTEGER := 50;  -- safety limit per execution
  v_step      INTEGER;
BEGIN
  -- Pick up executions ready to process
  FOR v_exec IN
    SELECT *
    FROM public.flow_executions
    WHERE (status = 'pending' AND current_action_id IS NOT NULL)
       OR (status = 'waiting' AND wait_until <= NOW())
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    v_action_id := v_exec.current_action_id;
    v_step := 0;

    -- Mark as started if new
    IF v_exec.started_at IS NULL THEN
      UPDATE public.flow_executions
      SET started_at = now(), status = 'pending'
      WHERE id = v_exec.id;
    END IF;

    -- If resuming from wait, change status back to pending
    IF v_exec.status = 'waiting' THEN
      UPDATE public.flow_executions
      SET status = 'pending', wait_until = NULL
      WHERE id = v_exec.id;
    END IF;

    <<action_loop>>
    LOOP
      v_step := v_step + 1;
      IF v_step > v_max_steps THEN
        UPDATE public.flow_executions
        SET status = 'failed', error_message = 'Max steps exceeded'
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result, error_message)
        VALUES (v_exec.id, COALESCE(v_action_id, 'unknown'), 'unknown', 'error', 'Max steps exceeded');
        EXIT action_loop;
      END IF;

      -- No more actions = flow complete
      IF v_action_id IS NULL THEN
        UPDATE public.flow_executions
        SET status = 'completed', completed_at = now(), current_action_id = NULL
        WHERE id = v_exec.id;
        EXIT action_loop;
      END IF;

      -- Look up the action in automation_schema
      v_action := v_exec.automation_schema->'actions'->v_action_id;

      IF v_action IS NULL THEN
        UPDATE public.flow_executions
        SET status = 'completed', completed_at = now(), current_action_id = NULL
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
        VALUES (v_exec.id, v_action_id, 'unknown', 'skipped');
        EXIT action_loop;
      END IF;

      v_action_type := v_action->>'type';
      v_next_id := v_action->>'nextId';

      BEGIN
        CASE v_action_type
          -- ── Wait node ───────────────────────────────────────────
          WHEN 'wait' THEN
            DECLARE
              v_wait_minutes INTEGER;
            BEGIN
              v_wait_minutes := COALESCE((v_action->>'payload')::integer, 60);
              UPDATE public.flow_executions
              SET status = 'waiting',
                  wait_until = NOW() + (v_wait_minutes || ' minutes')::interval,
                  current_action_id = v_next_id
              WHERE id = v_exec.id;
              INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
              VALUES (v_exec.id, v_action_id, 'wait', 'success');
              EXIT action_loop;  -- Stop processing, will resume after wait
            END;

          -- ── Check node ──────────────────────────────────────────
          WHEN 'check' THEN
            v_yes_id := v_action->>'yesId';
            v_no_id  := v_action->>'noId';
            v_check_result := public.check_flow_condition(
              v_exec.trigger_type,
              v_exec.trigger_context,
              v_exec.client_id,
              v_exec.coach_id
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'check',
              CASE WHEN v_check_result THEN 'yes' ELSE 'no' END);

            IF v_check_result THEN
              v_action_id := v_yes_id;
            ELSE
              v_action_id := v_no_id;
            END IF;
            -- Update current position
            UPDATE public.flow_executions
            SET current_action_id = v_action_id
            WHERE id = v_exec.id;
            CONTINUE action_loop;

          -- ── Send message ────────────────────────────────────────
          WHEN 'send-message' THEN
            PERFORM public.execute_flow_send_message(
              v_exec.coach_id, v_exec.client_id, v_action->>'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'send-message', 'success');

          -- ── Assign questionnaires ───────────────────────────────
          WHEN 'assign-questionnaire' THEN
            PERFORM public.execute_flow_assign_questionnaires(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'assign-questionnaire', 'success');

          -- ── Assign check-ins ────────────────────────────────────
          WHEN 'assign-check-in' THEN
            PERFORM public.execute_flow_assign_checkins(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'assign-check-in', 'success');

          -- ── Add files ───────────────────────────────────────────
          WHEN 'add-file' THEN
            PERFORM public.execute_flow_add_files(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-file', 'success');

          -- ── Add habits ──────────────────────────────────────────
          WHEN 'add-habit' THEN
            PERFORM public.execute_flow_add_habits(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-habit', 'success');

          -- ── Add metrics ─────────────────────────────────────────
          WHEN 'add-metric' THEN
            PERFORM public.execute_flow_add_metrics(
              v_exec.coach_id, v_exec.client_id, v_action->'payload'
            );
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, 'add-metric', 'success');

          ELSE
            INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result)
            VALUES (v_exec.id, v_action_id, v_action_type, 'skipped');
        END CASE;

        -- Advance to next action
        v_action_id := v_next_id;
        UPDATE public.flow_executions
        SET current_action_id = v_action_id
        WHERE id = v_exec.id;

      EXCEPTION WHEN OTHERS THEN
        -- Log the error and fail the execution
        UPDATE public.flow_executions
        SET status = 'failed',
            error_message = SQLERRM,
            current_action_id = v_action_id
        WHERE id = v_exec.id;
        INSERT INTO public.flow_execution_log (execution_id, action_id, action_type, result, error_message)
        VALUES (v_exec.id, v_action_id, COALESCE(v_action_type, 'unknown'), 'error', SQLERRM);
        EXIT action_loop;
      END;
    END LOOP;
  END LOOP;

  RETURN v_processed;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_checkin_review_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.coach_comment IS DISTINCT FROM OLD.coach_comment THEN
      RAISE EXCEPTION 'Clients cannot edit coach_comment.';
    END IF;
    IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Clients cannot edit reviewed_at.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_client_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = OLD.client_id THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Clients cannot change profile creation date.'; END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_musclewiki_exercise_access(p_musclewiki_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.musclewiki_exercise_cache
  SET
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE musclewiki_id = p_musclewiki_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_coach_item_name_conflict()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    base_name TEXT;
    target_name TEXT;
    counter INTEGER := 2;
    exists_already BOOLEAN;
BEGIN
    base_name := NEW.name;
    target_name := base_name;

    -- Look for conflicts within the same coach's library
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM public.%I WHERE coach_id = $1 AND lower(name) = lower($2) AND id IS DISTINCT FROM $3)',
            TG_TABLE_NAME
        )
        INTO exists_already
        USING NEW.coach_id, target_name, NEW.id;

        IF NOT exists_already THEN
            EXIT;
        END IF;

        -- Conflict found.
        -- First attempt: Append " Copy"
        -- Subsequent attempts: Append " Copy 2", " Copy 3", etc.
        
        -- If we are at the first conflict with the original name, try " Copy"
        IF target_name = base_name THEN
            target_name := base_name || ' Copy';
        ELSE
            -- We already tried " Copy" or " Copy N", try the next one
            -- Note: To keep it simple and robust, we just restart loop with " Copy N" logic
            -- but since we are inside a loop, we can just track state or try next candidate.
            -- This simple logic below works for "Name" -> "Name Copy" -> "Name Copy 2"
            
            target_name := base_name || ' Copy ' || counter;
            counter := counter + 1;
        END IF;
    END LOOP;

    NEW.name := target_name;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_client_item_coach_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.coach_id IS NULL THEN
    SELECT cca.coach_id INTO NEW.coach_id
    FROM public.coach_client_assignments cca
    WHERE cca.client_id = NEW.client_id
    LIMIT 1;
    
    IF NEW.coach_id IS NULL THEN
      RAISE EXCEPTION 'client_id % has no coach assignment', NEW.client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_habit_log_updated_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_training_summary_updated_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_coach_trial(p_coach_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_trial_end TIMESTAMPTZ;
BEGIN
    -- Calculate trial end (30 days from now)
    v_trial_end := NOW() + INTERVAL '30 days';

    -- Insert trial subscription (will trigger sync_coach_entitlements)
    INSERT INTO public.platform_subscriptions (
        coach_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_type,
        client_limit,
        billing_interval,
        current_price_cents,
        currency,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end
    ) VALUES (
        p_coach_id,
        NULL,  -- No Stripe customer until checkout
        NULL,  -- No Stripe subscription until checkout
        'max', -- Trial gets max plan features
        50,    -- Max plan client limit
        NULL,  -- No billing interval for trial
        0,     -- No cost during trial
        'usd',
        'trialing',
        v_trial_end,
        NOW(),
        v_trial_end
    )
    ON CONFLICT (coach_id) DO NOTHING;  -- Skip if already exists (idempotent)
END;
$function$
;

CREATE OR REPLACE FUNCTION public.should_populate_exercise_cache()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Grab one row's expiry. All rows share the same batch expiry.
  SELECT cache_expires_at INTO v_expires_at
  FROM public.musclewiki_exercise_cache
  LIMIT 1;

  -- Cache is empty → need to populate
  IF v_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Expired or expiring within 5 days → need to refresh
  IF v_expires_at < (now() + INTERVAL '5 days') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.start_exercise_cache_population()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.musclewiki_cache_population_log (status, triggered_by)
  VALUES ('running', 'cron')
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_coach_entitlements(p_coach_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_plan TEXT;
    v_client_limit INTEGER;
    v_status TEXT;
    v_is_trial BOOLEAN;
    v_trial_ends_at TIMESTAMPTZ;
    v_has_automations BOOLEAN;
    v_has_ai_assistant BOOLEAN;
    v_has_payments BOOLEAN;
    v_coach_exists BOOLEAN;
BEGIN
    -- Check if coach still exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_coach_id) INTO v_coach_exists;

    IF NOT v_coach_exists THEN
        -- Coach is being deleted, just clean up entitlements
        DELETE FROM public.coach_entitlements WHERE coach_id = p_coach_id;
        RETURN;
    END IF;

    -- Get subscription details
    SELECT
        COALESCE(plan_type::TEXT, 'starter'),
        COALESCE(client_limit, 5),
        COALESCE(status::TEXT, 'active'),
        (status = 'trialing'),
        trial_ends_at
    INTO v_plan, v_client_limit, v_status, v_is_trial, v_trial_ends_at
    FROM public.platform_subscriptions
    WHERE coach_id = p_coach_id;

    -- If no subscription, use defaults
    IF v_plan IS NULL THEN
        v_plan := 'starter';
        v_client_limit := 5;
        v_status := 'active';
        v_is_trial := false;
    END IF;

    -- Get addon status
    SELECT
        COALESCE(bool_or(addon_type::TEXT = 'automations' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'ai_assistant' AND is_active), false),
        COALESCE(bool_or(addon_type::TEXT = 'payments' AND is_active), false)
    INTO v_has_automations, v_has_ai_assistant, v_has_payments
    FROM public.platform_addons
    WHERE coach_id = p_coach_id;

    -- Upsert entitlements
    INSERT INTO public.coach_entitlements (
        coach_id,
        plan_type,
        client_limit,
        -- Plan features (Pro and Max get these)
        has_ai_workout_builder,
        has_custom_exercises,
        has_questionnaires,
        has_habits_metrics,
        storage_limit_gb,
        -- Max-only features
        has_broadcast_messaging,
        has_ai_todo_list,
        has_priority_support,
        -- Add-ons
        has_automations,
        has_ai_assistant,
        has_payments,
        -- Status
        subscription_status,
        is_trial,
        trial_ends_at
    ) VALUES (
        p_coach_id,
        v_plan::public.platform_plan_type,
        v_client_limit,
        -- Pro and Max features
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        v_plan IN ('pro', 'max'),
        CASE
            WHEN v_plan = 'starter' THEN 0
            WHEN v_plan = 'pro' THEN 5
            WHEN v_plan = 'max' THEN -1  -- -1 = unlimited
        END,
        -- Max-only features
        v_plan = 'max',
        v_plan = 'max',
        v_plan = 'max',
        -- Add-ons
        COALESCE(v_has_automations, false),
        COALESCE(v_has_ai_assistant, false),
        COALESCE(v_has_payments, false),
        -- Status
        v_status::public.platform_subscription_status,
        v_is_trial,
        v_trial_ends_at
    )
    ON CONFLICT (coach_id) DO UPDATE SET
        plan_type = EXCLUDED.plan_type,
        client_limit = EXCLUDED.client_limit,
        has_ai_workout_builder = EXCLUDED.has_ai_workout_builder,
        has_custom_exercises = EXCLUDED.has_custom_exercises,
        has_questionnaires = EXCLUDED.has_questionnaires,
        has_habits_metrics = EXCLUDED.has_habits_metrics,
        storage_limit_gb = EXCLUDED.storage_limit_gb,
        has_broadcast_messaging = EXCLUDED.has_broadcast_messaging,
        has_ai_todo_list = EXCLUDED.has_ai_todo_list,
        has_priority_support = EXCLUDED.has_priority_support,
        has_automations = EXCLUDED.has_automations,
        has_ai_assistant = EXCLUDED.has_ai_assistant,
        has_payments = EXCLUDED.has_payments,
        subscription_status = EXCLUDED.subscription_status,
        is_trial = EXCLUDED.is_trial,
        trial_ends_at = EXCLUDED.trial_ends_at,
        updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_checkin_submit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'review' THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'check_in'
          AND reference_id = NEW.assignment_id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id
          AND due_date     = NEW.submission_date;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_habit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status IN ('completed', 'partial') THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'habit'
          AND reference_id = NEW.assignment_id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id
          AND due_date     = NEW.date;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_metric_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.client_tasks
    WHERE task_type    = 'metric'
      AND reference_id = NEW.assignment_id
      AND client_id    = NEW.client_id
      AND coach_id     = NEW.coach_id
      AND due_date     = NEW.date;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_task_on_questionnaire_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'completed' THEN
        DELETE FROM public.client_tasks
        WHERE task_type    = 'questionnaire'
          AND reference_id = NEW.id
          AND client_id    = NEW.client_id
          AND coach_id     = NEW.coach_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_tasks_on_assignment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.client_tasks
    WHERE reference_id = OLD.id
      AND client_id    = OLD.client_id
      AND coach_id     = OLD.coach_id;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_questionnaire_task_on_pending()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'pending' THEN
        INSERT INTO public.client_tasks (client_id, coach_id, task_type, reference_id, due_date)
        VALUES (NEW.client_id, NEW.coach_id, 'questionnaire', NEW.id, CURRENT_DATE)
        ON CONFLICT (client_id, coach_id, task_type, reference_id, due_date) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_client_push_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase settings not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/client-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_detect_flow_triggers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  INSERT INTO public.flow_trigger_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  v_rows := public.detect_flow_triggers();

  UPDATE public.flow_trigger_cron_log
  SET completed_at = now(),
      rows_inserted = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'detect_flow_triggers: created % executions', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.flow_trigger_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'detect_flow_triggers failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_exercise_cache_population()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF NOT public.should_populate_exercise_cache() THEN
    RAISE NOTICE 'Cache is up to date, skipping population';
    RETURN;
  END IF;

  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase settings not configured. Set app.settings.supabase_url and app.settings.service_role_key';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or service key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/populate-exercise-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );

  RAISE NOTICE 'Cache population triggered successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to trigger cache population: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_expire_free_trials()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  -- Create log entry
  INSERT INTO public.free_trial_expiry_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  -- Run the core logic
  v_rows := public.expire_free_trials();

  -- Update log with result
  UPDATE public.free_trial_expiry_cron_log
  SET completed_at = now(),
      rows_updated = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'expire_free_trials: updated % rows', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the cron job
  UPDATE public.free_trial_expiry_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'expire_free_trials failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_generate_assistant_todos()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_log_id UUID;
    v_rows   INTEGER;
BEGIN
    INSERT INTO public.assistant_todo_cron_log (started_at)
    VALUES (now())
    RETURNING id INTO v_log_id;

    v_rows := public.generate_assistant_todos();

    UPDATE public.assistant_todo_cron_log
    SET completed_at = now(),
        rows_inserted = v_rows
    WHERE id = v_log_id;

    IF v_rows > 0 THEN
        RAISE NOTICE 'generate_assistant_todos: inserted % rows', v_rows;
    END IF;

EXCEPTION WHEN OTHERS THEN
    UPDATE public.assistant_todo_cron_log
    SET completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_log_id;

    RAISE WARNING 'generate_assistant_todos failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_mark_missed_workouts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  -- Create log entry
  INSERT INTO public.missed_workout_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  -- Run the core logic
  v_rows := public.mark_missed_workouts();

  -- Update log with result
  UPDATE public.missed_workout_cron_log
  SET completed_at = now(),
      rows_inserted = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'mark_missed_workouts: inserted % rows', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the cron job
  UPDATE public.missed_workout_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'mark_missed_workouts failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_process_flow_executions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_rows   INTEGER;
BEGIN
  INSERT INTO public.flow_execution_cron_log (started_at)
  VALUES (now())
  RETURNING id INTO v_log_id;

  v_rows := public.process_flow_executions();

  UPDATE public.flow_execution_cron_log
  SET completed_at = now(),
      rows_processed = v_rows
  WHERE id = v_log_id;

  IF v_rows > 0 THEN
    RAISE NOTICE 'process_flow_executions: processed % executions', v_rows;
  END IF;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.flow_execution_cron_log
  SET completed_at = now(),
      error_message = SQLERRM
  WHERE id = v_log_id;

  RAISE WARNING 'process_flow_executions failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_entitlements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- On delete, just delete the entitlements row instead of syncing
        -- The cascade will handle this, but be explicit
        DELETE FROM public.coach_entitlements WHERE coach_id = OLD.coach_id;
        RETURN OLD;
    ELSE
        PERFORM public.sync_coach_entitlements(NEW.coach_id);
        RETURN NEW;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_type = NEW.message_type,
    last_message_sender_id = NEW.sender_id,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN NULL
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Photo'
      WHEN NEW.message_type = 'video' THEN '🎥 Video'
      WHEN NEW.message_type = 'audio' THEN '🎵 Voice Message'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE 'Message'
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_flow_executions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_message_status_on_read()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Update all unread messages sent before the new read time
  UPDATE public.messages
  SET
    status = 'read',
    read_at = NEW.last_read_at
  WHERE conversation_id = NEW.conversation_id
    AND sender_id <> NEW.user_id -- Not the reader's own messages
    AND sent_at <= NEW.last_read_at
    AND status = 'sent'; -- Only update if not already read

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_coach_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles
    WHERE coach_id = NEW.coach_id
  ) THEN
    RAISE EXCEPTION 'Referenced user is not a coach.';
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."ai_assistant_daily_usage" to "anon";

grant insert on table "public"."ai_assistant_daily_usage" to "anon";

grant references on table "public"."ai_assistant_daily_usage" to "anon";

grant select on table "public"."ai_assistant_daily_usage" to "anon";

grant trigger on table "public"."ai_assistant_daily_usage" to "anon";

grant truncate on table "public"."ai_assistant_daily_usage" to "anon";

grant update on table "public"."ai_assistant_daily_usage" to "anon";

grant delete on table "public"."ai_assistant_daily_usage" to "authenticated";

grant insert on table "public"."ai_assistant_daily_usage" to "authenticated";

grant references on table "public"."ai_assistant_daily_usage" to "authenticated";

grant select on table "public"."ai_assistant_daily_usage" to "authenticated";

grant trigger on table "public"."ai_assistant_daily_usage" to "authenticated";

grant truncate on table "public"."ai_assistant_daily_usage" to "authenticated";

grant update on table "public"."ai_assistant_daily_usage" to "authenticated";

grant delete on table "public"."ai_assistant_daily_usage" to "service_role";

grant insert on table "public"."ai_assistant_daily_usage" to "service_role";

grant references on table "public"."ai_assistant_daily_usage" to "service_role";

grant select on table "public"."ai_assistant_daily_usage" to "service_role";

grant trigger on table "public"."ai_assistant_daily_usage" to "service_role";

grant truncate on table "public"."ai_assistant_daily_usage" to "service_role";

grant update on table "public"."ai_assistant_daily_usage" to "service_role";

grant delete on table "public"."assistant_todo_cron_log" to "anon";

grant insert on table "public"."assistant_todo_cron_log" to "anon";

grant references on table "public"."assistant_todo_cron_log" to "anon";

grant select on table "public"."assistant_todo_cron_log" to "anon";

grant trigger on table "public"."assistant_todo_cron_log" to "anon";

grant truncate on table "public"."assistant_todo_cron_log" to "anon";

grant update on table "public"."assistant_todo_cron_log" to "anon";

grant delete on table "public"."assistant_todo_cron_log" to "authenticated";

grant insert on table "public"."assistant_todo_cron_log" to "authenticated";

grant references on table "public"."assistant_todo_cron_log" to "authenticated";

grant select on table "public"."assistant_todo_cron_log" to "authenticated";

grant trigger on table "public"."assistant_todo_cron_log" to "authenticated";

grant truncate on table "public"."assistant_todo_cron_log" to "authenticated";

grant update on table "public"."assistant_todo_cron_log" to "authenticated";

grant delete on table "public"."assistant_todo_cron_log" to "service_role";

grant insert on table "public"."assistant_todo_cron_log" to "service_role";

grant references on table "public"."assistant_todo_cron_log" to "service_role";

grant select on table "public"."assistant_todo_cron_log" to "service_role";

grant trigger on table "public"."assistant_todo_cron_log" to "service_role";

grant truncate on table "public"."assistant_todo_cron_log" to "service_role";

grant update on table "public"."assistant_todo_cron_log" to "service_role";

grant delete on table "public"."billing_activity" to "anon";

grant insert on table "public"."billing_activity" to "anon";

grant references on table "public"."billing_activity" to "anon";

grant select on table "public"."billing_activity" to "anon";

grant trigger on table "public"."billing_activity" to "anon";

grant truncate on table "public"."billing_activity" to "anon";

grant update on table "public"."billing_activity" to "anon";

grant delete on table "public"."billing_activity" to "authenticated";

grant insert on table "public"."billing_activity" to "authenticated";

grant references on table "public"."billing_activity" to "authenticated";

grant select on table "public"."billing_activity" to "authenticated";

grant trigger on table "public"."billing_activity" to "authenticated";

grant truncate on table "public"."billing_activity" to "authenticated";

grant update on table "public"."billing_activity" to "authenticated";

grant delete on table "public"."billing_activity" to "service_role";

grant insert on table "public"."billing_activity" to "service_role";

grant references on table "public"."billing_activity" to "service_role";

grant select on table "public"."billing_activity" to "service_role";

grant trigger on table "public"."billing_activity" to "service_role";

grant truncate on table "public"."billing_activity" to "service_role";

grant update on table "public"."billing_activity" to "service_role";

grant delete on table "public"."client_bio" to "anon";

grant insert on table "public"."client_bio" to "anon";

grant references on table "public"."client_bio" to "anon";

grant select on table "public"."client_bio" to "anon";

grant trigger on table "public"."client_bio" to "anon";

grant truncate on table "public"."client_bio" to "anon";

grant update on table "public"."client_bio" to "anon";

grant delete on table "public"."client_bio" to "authenticated";

grant insert on table "public"."client_bio" to "authenticated";

grant references on table "public"."client_bio" to "authenticated";

grant select on table "public"."client_bio" to "authenticated";

grant trigger on table "public"."client_bio" to "authenticated";

grant truncate on table "public"."client_bio" to "authenticated";

grant update on table "public"."client_bio" to "authenticated";

grant delete on table "public"."client_bio" to "service_role";

grant insert on table "public"."client_bio" to "service_role";

grant references on table "public"."client_bio" to "service_role";

grant select on table "public"."client_bio" to "service_role";

grant trigger on table "public"."client_bio" to "service_role";

grant truncate on table "public"."client_bio" to "service_role";

grant update on table "public"."client_bio" to "service_role";

grant delete on table "public"."client_checkin_logs" to "anon";

grant insert on table "public"."client_checkin_logs" to "anon";

grant references on table "public"."client_checkin_logs" to "anon";

grant select on table "public"."client_checkin_logs" to "anon";

grant trigger on table "public"."client_checkin_logs" to "anon";

grant truncate on table "public"."client_checkin_logs" to "anon";

grant update on table "public"."client_checkin_logs" to "anon";

grant delete on table "public"."client_checkin_logs" to "authenticated";

grant insert on table "public"."client_checkin_logs" to "authenticated";

grant references on table "public"."client_checkin_logs" to "authenticated";

grant select on table "public"."client_checkin_logs" to "authenticated";

grant trigger on table "public"."client_checkin_logs" to "authenticated";

grant truncate on table "public"."client_checkin_logs" to "authenticated";

grant update on table "public"."client_checkin_logs" to "authenticated";

grant delete on table "public"."client_checkin_logs" to "service_role";

grant insert on table "public"."client_checkin_logs" to "service_role";

grant references on table "public"."client_checkin_logs" to "service_role";

grant select on table "public"."client_checkin_logs" to "service_role";

grant trigger on table "public"."client_checkin_logs" to "service_role";

grant truncate on table "public"."client_checkin_logs" to "service_role";

grant update on table "public"."client_checkin_logs" to "service_role";

grant delete on table "public"."client_checkins" to "anon";

grant insert on table "public"."client_checkins" to "anon";

grant references on table "public"."client_checkins" to "anon";

grant select on table "public"."client_checkins" to "anon";

grant trigger on table "public"."client_checkins" to "anon";

grant truncate on table "public"."client_checkins" to "anon";

grant update on table "public"."client_checkins" to "anon";

grant delete on table "public"."client_checkins" to "authenticated";

grant insert on table "public"."client_checkins" to "authenticated";

grant references on table "public"."client_checkins" to "authenticated";

grant select on table "public"."client_checkins" to "authenticated";

grant trigger on table "public"."client_checkins" to "authenticated";

grant truncate on table "public"."client_checkins" to "authenticated";

grant update on table "public"."client_checkins" to "authenticated";

grant delete on table "public"."client_checkins" to "service_role";

grant insert on table "public"."client_checkins" to "service_role";

grant references on table "public"."client_checkins" to "service_role";

grant select on table "public"."client_checkins" to "service_role";

grant trigger on table "public"."client_checkins" to "service_role";

grant truncate on table "public"."client_checkins" to "service_role";

grant update on table "public"."client_checkins" to "service_role";

grant delete on table "public"."client_files" to "anon";

grant insert on table "public"."client_files" to "anon";

grant references on table "public"."client_files" to "anon";

grant select on table "public"."client_files" to "anon";

grant trigger on table "public"."client_files" to "anon";

grant truncate on table "public"."client_files" to "anon";

grant update on table "public"."client_files" to "anon";

grant delete on table "public"."client_files" to "authenticated";

grant insert on table "public"."client_files" to "authenticated";

grant references on table "public"."client_files" to "authenticated";

grant select on table "public"."client_files" to "authenticated";

grant trigger on table "public"."client_files" to "authenticated";

grant truncate on table "public"."client_files" to "authenticated";

grant update on table "public"."client_files" to "authenticated";

grant delete on table "public"."client_files" to "service_role";

grant insert on table "public"."client_files" to "service_role";

grant references on table "public"."client_files" to "service_role";

grant select on table "public"."client_files" to "service_role";

grant trigger on table "public"."client_files" to "service_role";

grant truncate on table "public"."client_files" to "service_role";

grant update on table "public"."client_files" to "service_role";

grant delete on table "public"."client_goals" to "anon";

grant insert on table "public"."client_goals" to "anon";

grant references on table "public"."client_goals" to "anon";

grant select on table "public"."client_goals" to "anon";

grant trigger on table "public"."client_goals" to "anon";

grant truncate on table "public"."client_goals" to "anon";

grant update on table "public"."client_goals" to "anon";

grant delete on table "public"."client_goals" to "authenticated";

grant insert on table "public"."client_goals" to "authenticated";

grant references on table "public"."client_goals" to "authenticated";

grant select on table "public"."client_goals" to "authenticated";

grant trigger on table "public"."client_goals" to "authenticated";

grant truncate on table "public"."client_goals" to "authenticated";

grant update on table "public"."client_goals" to "authenticated";

grant delete on table "public"."client_goals" to "service_role";

grant insert on table "public"."client_goals" to "service_role";

grant references on table "public"."client_goals" to "service_role";

grant select on table "public"."client_goals" to "service_role";

grant trigger on table "public"."client_goals" to "service_role";

grant truncate on table "public"."client_goals" to "service_role";

grant update on table "public"."client_goals" to "service_role";

grant delete on table "public"."client_habit_logs" to "anon";

grant insert on table "public"."client_habit_logs" to "anon";

grant references on table "public"."client_habit_logs" to "anon";

grant select on table "public"."client_habit_logs" to "anon";

grant trigger on table "public"."client_habit_logs" to "anon";

grant truncate on table "public"."client_habit_logs" to "anon";

grant update on table "public"."client_habit_logs" to "anon";

grant delete on table "public"."client_habit_logs" to "authenticated";

grant insert on table "public"."client_habit_logs" to "authenticated";

grant references on table "public"."client_habit_logs" to "authenticated";

grant select on table "public"."client_habit_logs" to "authenticated";

grant trigger on table "public"."client_habit_logs" to "authenticated";

grant truncate on table "public"."client_habit_logs" to "authenticated";

grant update on table "public"."client_habit_logs" to "authenticated";

grant delete on table "public"."client_habit_logs" to "service_role";

grant insert on table "public"."client_habit_logs" to "service_role";

grant references on table "public"."client_habit_logs" to "service_role";

grant select on table "public"."client_habit_logs" to "service_role";

grant trigger on table "public"."client_habit_logs" to "service_role";

grant truncate on table "public"."client_habit_logs" to "service_role";

grant update on table "public"."client_habit_logs" to "service_role";

grant delete on table "public"."client_habits" to "anon";

grant insert on table "public"."client_habits" to "anon";

grant references on table "public"."client_habits" to "anon";

grant select on table "public"."client_habits" to "anon";

grant trigger on table "public"."client_habits" to "anon";

grant truncate on table "public"."client_habits" to "anon";

grant update on table "public"."client_habits" to "anon";

grant delete on table "public"."client_habits" to "authenticated";

grant insert on table "public"."client_habits" to "authenticated";

grant references on table "public"."client_habits" to "authenticated";

grant select on table "public"."client_habits" to "authenticated";

grant trigger on table "public"."client_habits" to "authenticated";

grant truncate on table "public"."client_habits" to "authenticated";

grant update on table "public"."client_habits" to "authenticated";

grant delete on table "public"."client_habits" to "service_role";

grant insert on table "public"."client_habits" to "service_role";

grant references on table "public"."client_habits" to "service_role";

grant select on table "public"."client_habits" to "service_role";

grant trigger on table "public"."client_habits" to "service_role";

grant truncate on table "public"."client_habits" to "service_role";

grant update on table "public"."client_habits" to "service_role";

grant delete on table "public"."client_injuries" to "anon";

grant insert on table "public"."client_injuries" to "anon";

grant references on table "public"."client_injuries" to "anon";

grant select on table "public"."client_injuries" to "anon";

grant trigger on table "public"."client_injuries" to "anon";

grant truncate on table "public"."client_injuries" to "anon";

grant update on table "public"."client_injuries" to "anon";

grant delete on table "public"."client_injuries" to "authenticated";

grant insert on table "public"."client_injuries" to "authenticated";

grant references on table "public"."client_injuries" to "authenticated";

grant select on table "public"."client_injuries" to "authenticated";

grant trigger on table "public"."client_injuries" to "authenticated";

grant truncate on table "public"."client_injuries" to "authenticated";

grant update on table "public"."client_injuries" to "authenticated";

grant delete on table "public"."client_injuries" to "service_role";

grant insert on table "public"."client_injuries" to "service_role";

grant references on table "public"."client_injuries" to "service_role";

grant select on table "public"."client_injuries" to "service_role";

grant trigger on table "public"."client_injuries" to "service_role";

grant truncate on table "public"."client_injuries" to "service_role";

grant update on table "public"."client_injuries" to "service_role";

grant delete on table "public"."client_metric_logs" to "anon";

grant insert on table "public"."client_metric_logs" to "anon";

grant references on table "public"."client_metric_logs" to "anon";

grant select on table "public"."client_metric_logs" to "anon";

grant trigger on table "public"."client_metric_logs" to "anon";

grant truncate on table "public"."client_metric_logs" to "anon";

grant update on table "public"."client_metric_logs" to "anon";

grant delete on table "public"."client_metric_logs" to "authenticated";

grant insert on table "public"."client_metric_logs" to "authenticated";

grant references on table "public"."client_metric_logs" to "authenticated";

grant select on table "public"."client_metric_logs" to "authenticated";

grant trigger on table "public"."client_metric_logs" to "authenticated";

grant truncate on table "public"."client_metric_logs" to "authenticated";

grant update on table "public"."client_metric_logs" to "authenticated";

grant delete on table "public"."client_metric_logs" to "service_role";

grant insert on table "public"."client_metric_logs" to "service_role";

grant references on table "public"."client_metric_logs" to "service_role";

grant select on table "public"."client_metric_logs" to "service_role";

grant trigger on table "public"."client_metric_logs" to "service_role";

grant truncate on table "public"."client_metric_logs" to "service_role";

grant update on table "public"."client_metric_logs" to "service_role";

grant delete on table "public"."client_metrics" to "anon";

grant insert on table "public"."client_metrics" to "anon";

grant references on table "public"."client_metrics" to "anon";

grant select on table "public"."client_metrics" to "anon";

grant trigger on table "public"."client_metrics" to "anon";

grant truncate on table "public"."client_metrics" to "anon";

grant update on table "public"."client_metrics" to "anon";

grant delete on table "public"."client_metrics" to "authenticated";

grant insert on table "public"."client_metrics" to "authenticated";

grant references on table "public"."client_metrics" to "authenticated";

grant select on table "public"."client_metrics" to "authenticated";

grant trigger on table "public"."client_metrics" to "authenticated";

grant truncate on table "public"."client_metrics" to "authenticated";

grant update on table "public"."client_metrics" to "authenticated";

grant delete on table "public"."client_metrics" to "service_role";

grant insert on table "public"."client_metrics" to "service_role";

grant references on table "public"."client_metrics" to "service_role";

grant select on table "public"."client_metrics" to "service_role";

grant trigger on table "public"."client_metrics" to "service_role";

grant truncate on table "public"."client_metrics" to "service_role";

grant update on table "public"."client_metrics" to "service_role";

grant delete on table "public"."client_notes" to "anon";

grant insert on table "public"."client_notes" to "anon";

grant references on table "public"."client_notes" to "anon";

grant select on table "public"."client_notes" to "anon";

grant trigger on table "public"."client_notes" to "anon";

grant truncate on table "public"."client_notes" to "anon";

grant update on table "public"."client_notes" to "anon";

grant delete on table "public"."client_notes" to "authenticated";

grant insert on table "public"."client_notes" to "authenticated";

grant references on table "public"."client_notes" to "authenticated";

grant select on table "public"."client_notes" to "authenticated";

grant trigger on table "public"."client_notes" to "authenticated";

grant truncate on table "public"."client_notes" to "authenticated";

grant update on table "public"."client_notes" to "authenticated";

grant delete on table "public"."client_notes" to "service_role";

grant insert on table "public"."client_notes" to "service_role";

grant references on table "public"."client_notes" to "service_role";

grant select on table "public"."client_notes" to "service_role";

grant trigger on table "public"."client_notes" to "service_role";

grant truncate on table "public"."client_notes" to "service_role";

grant update on table "public"."client_notes" to "service_role";

grant delete on table "public"."client_package_assignments" to "anon";

grant insert on table "public"."client_package_assignments" to "anon";

grant references on table "public"."client_package_assignments" to "anon";

grant select on table "public"."client_package_assignments" to "anon";

grant trigger on table "public"."client_package_assignments" to "anon";

grant truncate on table "public"."client_package_assignments" to "anon";

grant update on table "public"."client_package_assignments" to "anon";

grant delete on table "public"."client_package_assignments" to "authenticated";

grant insert on table "public"."client_package_assignments" to "authenticated";

grant references on table "public"."client_package_assignments" to "authenticated";

grant select on table "public"."client_package_assignments" to "authenticated";

grant trigger on table "public"."client_package_assignments" to "authenticated";

grant truncate on table "public"."client_package_assignments" to "authenticated";

grant update on table "public"."client_package_assignments" to "authenticated";

grant delete on table "public"."client_package_assignments" to "service_role";

grant insert on table "public"."client_package_assignments" to "service_role";

grant references on table "public"."client_package_assignments" to "service_role";

grant select on table "public"."client_package_assignments" to "service_role";

grant trigger on table "public"."client_package_assignments" to "service_role";

grant truncate on table "public"."client_package_assignments" to "service_role";

grant update on table "public"."client_package_assignments" to "service_role";

grant delete on table "public"."client_photo_logs" to "anon";

grant insert on table "public"."client_photo_logs" to "anon";

grant references on table "public"."client_photo_logs" to "anon";

grant select on table "public"."client_photo_logs" to "anon";

grant trigger on table "public"."client_photo_logs" to "anon";

grant truncate on table "public"."client_photo_logs" to "anon";

grant update on table "public"."client_photo_logs" to "anon";

grant delete on table "public"."client_photo_logs" to "authenticated";

grant insert on table "public"."client_photo_logs" to "authenticated";

grant references on table "public"."client_photo_logs" to "authenticated";

grant select on table "public"."client_photo_logs" to "authenticated";

grant trigger on table "public"."client_photo_logs" to "authenticated";

grant truncate on table "public"."client_photo_logs" to "authenticated";

grant update on table "public"."client_photo_logs" to "authenticated";

grant delete on table "public"."client_photo_logs" to "service_role";

grant insert on table "public"."client_photo_logs" to "service_role";

grant references on table "public"."client_photo_logs" to "service_role";

grant select on table "public"."client_photo_logs" to "service_role";

grant trigger on table "public"."client_photo_logs" to "service_role";

grant truncate on table "public"."client_photo_logs" to "service_role";

grant update on table "public"."client_photo_logs" to "service_role";

grant delete on table "public"."client_profiles" to "anon";

grant insert on table "public"."client_profiles" to "anon";

grant references on table "public"."client_profiles" to "anon";

grant select on table "public"."client_profiles" to "anon";

grant trigger on table "public"."client_profiles" to "anon";

grant truncate on table "public"."client_profiles" to "anon";

grant update on table "public"."client_profiles" to "anon";

grant delete on table "public"."client_profiles" to "authenticated";

grant insert on table "public"."client_profiles" to "authenticated";

grant references on table "public"."client_profiles" to "authenticated";

grant select on table "public"."client_profiles" to "authenticated";

grant trigger on table "public"."client_profiles" to "authenticated";

grant truncate on table "public"."client_profiles" to "authenticated";

grant update on table "public"."client_profiles" to "authenticated";

grant delete on table "public"."client_profiles" to "service_role";

grant insert on table "public"."client_profiles" to "service_role";

grant references on table "public"."client_profiles" to "service_role";

grant select on table "public"."client_profiles" to "service_role";

grant trigger on table "public"."client_profiles" to "service_role";

grant truncate on table "public"."client_profiles" to "service_role";

grant update on table "public"."client_profiles" to "service_role";

grant delete on table "public"."client_push_notification_log" to "anon";

grant insert on table "public"."client_push_notification_log" to "anon";

grant references on table "public"."client_push_notification_log" to "anon";

grant select on table "public"."client_push_notification_log" to "anon";

grant trigger on table "public"."client_push_notification_log" to "anon";

grant truncate on table "public"."client_push_notification_log" to "anon";

grant update on table "public"."client_push_notification_log" to "anon";

grant delete on table "public"."client_push_notification_log" to "authenticated";

grant insert on table "public"."client_push_notification_log" to "authenticated";

grant references on table "public"."client_push_notification_log" to "authenticated";

grant select on table "public"."client_push_notification_log" to "authenticated";

grant trigger on table "public"."client_push_notification_log" to "authenticated";

grant truncate on table "public"."client_push_notification_log" to "authenticated";

grant update on table "public"."client_push_notification_log" to "authenticated";

grant delete on table "public"."client_push_notification_log" to "service_role";

grant insert on table "public"."client_push_notification_log" to "service_role";

grant references on table "public"."client_push_notification_log" to "service_role";

grant select on table "public"."client_push_notification_log" to "service_role";

grant trigger on table "public"."client_push_notification_log" to "service_role";

grant truncate on table "public"."client_push_notification_log" to "service_role";

grant update on table "public"."client_push_notification_log" to "service_role";

grant delete on table "public"."client_push_tokens" to "anon";

grant insert on table "public"."client_push_tokens" to "anon";

grant references on table "public"."client_push_tokens" to "anon";

grant select on table "public"."client_push_tokens" to "anon";

grant trigger on table "public"."client_push_tokens" to "anon";

grant truncate on table "public"."client_push_tokens" to "anon";

grant update on table "public"."client_push_tokens" to "anon";

grant delete on table "public"."client_push_tokens" to "authenticated";

grant insert on table "public"."client_push_tokens" to "authenticated";

grant references on table "public"."client_push_tokens" to "authenticated";

grant select on table "public"."client_push_tokens" to "authenticated";

grant trigger on table "public"."client_push_tokens" to "authenticated";

grant truncate on table "public"."client_push_tokens" to "authenticated";

grant update on table "public"."client_push_tokens" to "authenticated";

grant delete on table "public"."client_push_tokens" to "service_role";

grant insert on table "public"."client_push_tokens" to "service_role";

grant references on table "public"."client_push_tokens" to "service_role";

grant select on table "public"."client_push_tokens" to "service_role";

grant trigger on table "public"."client_push_tokens" to "service_role";

grant truncate on table "public"."client_push_tokens" to "service_role";

grant update on table "public"."client_push_tokens" to "service_role";

grant delete on table "public"."client_questionnaires" to "anon";

grant insert on table "public"."client_questionnaires" to "anon";

grant references on table "public"."client_questionnaires" to "anon";

grant select on table "public"."client_questionnaires" to "anon";

grant trigger on table "public"."client_questionnaires" to "anon";

grant truncate on table "public"."client_questionnaires" to "anon";

grant update on table "public"."client_questionnaires" to "anon";

grant delete on table "public"."client_questionnaires" to "authenticated";

grant insert on table "public"."client_questionnaires" to "authenticated";

grant references on table "public"."client_questionnaires" to "authenticated";

grant select on table "public"."client_questionnaires" to "authenticated";

grant trigger on table "public"."client_questionnaires" to "authenticated";

grant truncate on table "public"."client_questionnaires" to "authenticated";

grant update on table "public"."client_questionnaires" to "authenticated";

grant delete on table "public"."client_questionnaires" to "service_role";

grant insert on table "public"."client_questionnaires" to "service_role";

grant references on table "public"."client_questionnaires" to "service_role";

grant select on table "public"."client_questionnaires" to "service_role";

grant trigger on table "public"."client_questionnaires" to "service_role";

grant truncate on table "public"."client_questionnaires" to "service_role";

grant update on table "public"."client_questionnaires" to "service_role";

grant delete on table "public"."client_subscriptions" to "anon";

grant insert on table "public"."client_subscriptions" to "anon";

grant references on table "public"."client_subscriptions" to "anon";

grant select on table "public"."client_subscriptions" to "anon";

grant trigger on table "public"."client_subscriptions" to "anon";

grant truncate on table "public"."client_subscriptions" to "anon";

grant update on table "public"."client_subscriptions" to "anon";

grant delete on table "public"."client_subscriptions" to "authenticated";

grant insert on table "public"."client_subscriptions" to "authenticated";

grant references on table "public"."client_subscriptions" to "authenticated";

grant select on table "public"."client_subscriptions" to "authenticated";

grant trigger on table "public"."client_subscriptions" to "authenticated";

grant truncate on table "public"."client_subscriptions" to "authenticated";

grant update on table "public"."client_subscriptions" to "authenticated";

grant delete on table "public"."client_subscriptions" to "service_role";

grant insert on table "public"."client_subscriptions" to "service_role";

grant references on table "public"."client_subscriptions" to "service_role";

grant select on table "public"."client_subscriptions" to "service_role";

grant trigger on table "public"."client_subscriptions" to "service_role";

grant truncate on table "public"."client_subscriptions" to "service_role";

grant update on table "public"."client_subscriptions" to "service_role";

grant delete on table "public"."client_tasks" to "anon";

grant insert on table "public"."client_tasks" to "anon";

grant references on table "public"."client_tasks" to "anon";

grant select on table "public"."client_tasks" to "anon";

grant trigger on table "public"."client_tasks" to "anon";

grant truncate on table "public"."client_tasks" to "anon";

grant update on table "public"."client_tasks" to "anon";

grant delete on table "public"."client_tasks" to "authenticated";

grant insert on table "public"."client_tasks" to "authenticated";

grant references on table "public"."client_tasks" to "authenticated";

grant select on table "public"."client_tasks" to "authenticated";

grant trigger on table "public"."client_tasks" to "authenticated";

grant truncate on table "public"."client_tasks" to "authenticated";

grant update on table "public"."client_tasks" to "authenticated";

grant delete on table "public"."client_tasks" to "service_role";

grant insert on table "public"."client_tasks" to "service_role";

grant references on table "public"."client_tasks" to "service_role";

grant select on table "public"."client_tasks" to "service_role";

grant trigger on table "public"."client_tasks" to "service_role";

grant truncate on table "public"."client_tasks" to "service_role";

grant update on table "public"."client_tasks" to "service_role";

grant delete on table "public"."client_training" to "anon";

grant insert on table "public"."client_training" to "anon";

grant references on table "public"."client_training" to "anon";

grant select on table "public"."client_training" to "anon";

grant trigger on table "public"."client_training" to "anon";

grant truncate on table "public"."client_training" to "anon";

grant update on table "public"."client_training" to "anon";

grant delete on table "public"."client_training" to "authenticated";

grant insert on table "public"."client_training" to "authenticated";

grant references on table "public"."client_training" to "authenticated";

grant select on table "public"."client_training" to "authenticated";

grant trigger on table "public"."client_training" to "authenticated";

grant truncate on table "public"."client_training" to "authenticated";

grant update on table "public"."client_training" to "authenticated";

grant delete on table "public"."client_training" to "service_role";

grant insert on table "public"."client_training" to "service_role";

grant references on table "public"."client_training" to "service_role";

grant select on table "public"."client_training" to "service_role";

grant trigger on table "public"."client_training" to "service_role";

grant truncate on table "public"."client_training" to "service_role";

grant update on table "public"."client_training" to "service_role";

grant delete on table "public"."client_training_exercise_history" to "anon";

grant insert on table "public"."client_training_exercise_history" to "anon";

grant references on table "public"."client_training_exercise_history" to "anon";

grant select on table "public"."client_training_exercise_history" to "anon";

grant trigger on table "public"."client_training_exercise_history" to "anon";

grant truncate on table "public"."client_training_exercise_history" to "anon";

grant update on table "public"."client_training_exercise_history" to "anon";

grant delete on table "public"."client_training_exercise_history" to "authenticated";

grant insert on table "public"."client_training_exercise_history" to "authenticated";

grant references on table "public"."client_training_exercise_history" to "authenticated";

grant select on table "public"."client_training_exercise_history" to "authenticated";

grant trigger on table "public"."client_training_exercise_history" to "authenticated";

grant truncate on table "public"."client_training_exercise_history" to "authenticated";

grant update on table "public"."client_training_exercise_history" to "authenticated";

grant delete on table "public"."client_training_exercise_history" to "service_role";

grant insert on table "public"."client_training_exercise_history" to "service_role";

grant references on table "public"."client_training_exercise_history" to "service_role";

grant select on table "public"."client_training_exercise_history" to "service_role";

grant trigger on table "public"."client_training_exercise_history" to "service_role";

grant truncate on table "public"."client_training_exercise_history" to "service_role";

grant update on table "public"."client_training_exercise_history" to "service_role";

grant delete on table "public"."client_training_history" to "anon";

grant insert on table "public"."client_training_history" to "anon";

grant references on table "public"."client_training_history" to "anon";

grant select on table "public"."client_training_history" to "anon";

grant trigger on table "public"."client_training_history" to "anon";

grant truncate on table "public"."client_training_history" to "anon";

grant update on table "public"."client_training_history" to "anon";

grant delete on table "public"."client_training_history" to "authenticated";

grant insert on table "public"."client_training_history" to "authenticated";

grant references on table "public"."client_training_history" to "authenticated";

grant select on table "public"."client_training_history" to "authenticated";

grant trigger on table "public"."client_training_history" to "authenticated";

grant truncate on table "public"."client_training_history" to "authenticated";

grant update on table "public"."client_training_history" to "authenticated";

grant delete on table "public"."client_training_history" to "service_role";

grant insert on table "public"."client_training_history" to "service_role";

grant references on table "public"."client_training_history" to "service_role";

grant select on table "public"."client_training_history" to "service_role";

grant trigger on table "public"."client_training_history" to "service_role";

grant truncate on table "public"."client_training_history" to "service_role";

grant update on table "public"."client_training_history" to "service_role";

grant delete on table "public"."client_training_summary" to "anon";

grant insert on table "public"."client_training_summary" to "anon";

grant references on table "public"."client_training_summary" to "anon";

grant select on table "public"."client_training_summary" to "anon";

grant trigger on table "public"."client_training_summary" to "anon";

grant truncate on table "public"."client_training_summary" to "anon";

grant update on table "public"."client_training_summary" to "anon";

grant delete on table "public"."client_training_summary" to "authenticated";

grant insert on table "public"."client_training_summary" to "authenticated";

grant references on table "public"."client_training_summary" to "authenticated";

grant select on table "public"."client_training_summary" to "authenticated";

grant trigger on table "public"."client_training_summary" to "authenticated";

grant truncate on table "public"."client_training_summary" to "authenticated";

grant update on table "public"."client_training_summary" to "authenticated";

grant delete on table "public"."client_training_summary" to "service_role";

grant insert on table "public"."client_training_summary" to "service_role";

grant references on table "public"."client_training_summary" to "service_role";

grant select on table "public"."client_training_summary" to "service_role";

grant trigger on table "public"."client_training_summary" to "service_role";

grant truncate on table "public"."client_training_summary" to "service_role";

grant update on table "public"."client_training_summary" to "service_role";

grant delete on table "public"."coach_auto_todolist" to "anon";

grant insert on table "public"."coach_auto_todolist" to "anon";

grant references on table "public"."coach_auto_todolist" to "anon";

grant select on table "public"."coach_auto_todolist" to "anon";

grant trigger on table "public"."coach_auto_todolist" to "anon";

grant truncate on table "public"."coach_auto_todolist" to "anon";

grant update on table "public"."coach_auto_todolist" to "anon";

grant delete on table "public"."coach_auto_todolist" to "authenticated";

grant insert on table "public"."coach_auto_todolist" to "authenticated";

grant references on table "public"."coach_auto_todolist" to "authenticated";

grant select on table "public"."coach_auto_todolist" to "authenticated";

grant trigger on table "public"."coach_auto_todolist" to "authenticated";

grant truncate on table "public"."coach_auto_todolist" to "authenticated";

grant update on table "public"."coach_auto_todolist" to "authenticated";

grant delete on table "public"."coach_auto_todolist" to "service_role";

grant insert on table "public"."coach_auto_todolist" to "service_role";

grant references on table "public"."coach_auto_todolist" to "service_role";

grant select on table "public"."coach_auto_todolist" to "service_role";

grant trigger on table "public"."coach_auto_todolist" to "service_role";

grant truncate on table "public"."coach_auto_todolist" to "service_role";

grant update on table "public"."coach_auto_todolist" to "service_role";

grant delete on table "public"."coach_checkins" to "anon";

grant insert on table "public"."coach_checkins" to "anon";

grant references on table "public"."coach_checkins" to "anon";

grant select on table "public"."coach_checkins" to "anon";

grant trigger on table "public"."coach_checkins" to "anon";

grant truncate on table "public"."coach_checkins" to "anon";

grant update on table "public"."coach_checkins" to "anon";

grant delete on table "public"."coach_checkins" to "authenticated";

grant insert on table "public"."coach_checkins" to "authenticated";

grant references on table "public"."coach_checkins" to "authenticated";

grant select on table "public"."coach_checkins" to "authenticated";

grant trigger on table "public"."coach_checkins" to "authenticated";

grant truncate on table "public"."coach_checkins" to "authenticated";

grant update on table "public"."coach_checkins" to "authenticated";

grant delete on table "public"."coach_checkins" to "service_role";

grant insert on table "public"."coach_checkins" to "service_role";

grant references on table "public"."coach_checkins" to "service_role";

grant select on table "public"."coach_checkins" to "service_role";

grant trigger on table "public"."coach_checkins" to "service_role";

grant truncate on table "public"."coach_checkins" to "service_role";

grant update on table "public"."coach_checkins" to "service_role";

grant delete on table "public"."coach_client_assignments" to "anon";

grant insert on table "public"."coach_client_assignments" to "anon";

grant references on table "public"."coach_client_assignments" to "anon";

grant select on table "public"."coach_client_assignments" to "anon";

grant trigger on table "public"."coach_client_assignments" to "anon";

grant truncate on table "public"."coach_client_assignments" to "anon";

grant update on table "public"."coach_client_assignments" to "anon";

grant delete on table "public"."coach_client_assignments" to "authenticated";

grant insert on table "public"."coach_client_assignments" to "authenticated";

grant references on table "public"."coach_client_assignments" to "authenticated";

grant select on table "public"."coach_client_assignments" to "authenticated";

grant trigger on table "public"."coach_client_assignments" to "authenticated";

grant truncate on table "public"."coach_client_assignments" to "authenticated";

grant update on table "public"."coach_client_assignments" to "authenticated";

grant delete on table "public"."coach_client_assignments" to "service_role";

grant insert on table "public"."coach_client_assignments" to "service_role";

grant references on table "public"."coach_client_assignments" to "service_role";

grant select on table "public"."coach_client_assignments" to "service_role";

grant trigger on table "public"."coach_client_assignments" to "service_role";

grant truncate on table "public"."coach_client_assignments" to "service_role";

grant update on table "public"."coach_client_assignments" to "service_role";

grant delete on table "public"."coach_company_information" to "anon";

grant insert on table "public"."coach_company_information" to "anon";

grant references on table "public"."coach_company_information" to "anon";

grant select on table "public"."coach_company_information" to "anon";

grant trigger on table "public"."coach_company_information" to "anon";

grant truncate on table "public"."coach_company_information" to "anon";

grant update on table "public"."coach_company_information" to "anon";

grant delete on table "public"."coach_company_information" to "authenticated";

grant insert on table "public"."coach_company_information" to "authenticated";

grant references on table "public"."coach_company_information" to "authenticated";

grant select on table "public"."coach_company_information" to "authenticated";

grant trigger on table "public"."coach_company_information" to "authenticated";

grant truncate on table "public"."coach_company_information" to "authenticated";

grant update on table "public"."coach_company_information" to "authenticated";

grant delete on table "public"."coach_company_information" to "service_role";

grant insert on table "public"."coach_company_information" to "service_role";

grant references on table "public"."coach_company_information" to "service_role";

grant select on table "public"."coach_company_information" to "service_role";

grant trigger on table "public"."coach_company_information" to "service_role";

grant truncate on table "public"."coach_company_information" to "service_role";

grant update on table "public"."coach_company_information" to "service_role";

grant delete on table "public"."coach_coupons" to "anon";

grant insert on table "public"."coach_coupons" to "anon";

grant references on table "public"."coach_coupons" to "anon";

grant select on table "public"."coach_coupons" to "anon";

grant trigger on table "public"."coach_coupons" to "anon";

grant truncate on table "public"."coach_coupons" to "anon";

grant update on table "public"."coach_coupons" to "anon";

grant delete on table "public"."coach_coupons" to "authenticated";

grant insert on table "public"."coach_coupons" to "authenticated";

grant references on table "public"."coach_coupons" to "authenticated";

grant select on table "public"."coach_coupons" to "authenticated";

grant trigger on table "public"."coach_coupons" to "authenticated";

grant truncate on table "public"."coach_coupons" to "authenticated";

grant update on table "public"."coach_coupons" to "authenticated";

grant delete on table "public"."coach_coupons" to "service_role";

grant insert on table "public"."coach_coupons" to "service_role";

grant references on table "public"."coach_coupons" to "service_role";

grant select on table "public"."coach_coupons" to "service_role";

grant trigger on table "public"."coach_coupons" to "service_role";

grant truncate on table "public"."coach_coupons" to "service_role";

grant update on table "public"."coach_coupons" to "service_role";

grant delete on table "public"."coach_entitlements" to "anon";

grant insert on table "public"."coach_entitlements" to "anon";

grant references on table "public"."coach_entitlements" to "anon";

grant select on table "public"."coach_entitlements" to "anon";

grant trigger on table "public"."coach_entitlements" to "anon";

grant truncate on table "public"."coach_entitlements" to "anon";

grant update on table "public"."coach_entitlements" to "anon";

grant delete on table "public"."coach_entitlements" to "authenticated";

grant insert on table "public"."coach_entitlements" to "authenticated";

grant references on table "public"."coach_entitlements" to "authenticated";

grant select on table "public"."coach_entitlements" to "authenticated";

grant trigger on table "public"."coach_entitlements" to "authenticated";

grant truncate on table "public"."coach_entitlements" to "authenticated";

grant update on table "public"."coach_entitlements" to "authenticated";

grant delete on table "public"."coach_entitlements" to "service_role";

grant insert on table "public"."coach_entitlements" to "service_role";

grant references on table "public"."coach_entitlements" to "service_role";

grant select on table "public"."coach_entitlements" to "service_role";

grant trigger on table "public"."coach_entitlements" to "service_role";

grant truncate on table "public"."coach_entitlements" to "service_role";

grant update on table "public"."coach_entitlements" to "service_role";

grant delete on table "public"."coach_exercises" to "anon";

grant insert on table "public"."coach_exercises" to "anon";

grant references on table "public"."coach_exercises" to "anon";

grant select on table "public"."coach_exercises" to "anon";

grant trigger on table "public"."coach_exercises" to "anon";

grant truncate on table "public"."coach_exercises" to "anon";

grant update on table "public"."coach_exercises" to "anon";

grant delete on table "public"."coach_exercises" to "authenticated";

grant insert on table "public"."coach_exercises" to "authenticated";

grant references on table "public"."coach_exercises" to "authenticated";

grant select on table "public"."coach_exercises" to "authenticated";

grant trigger on table "public"."coach_exercises" to "authenticated";

grant truncate on table "public"."coach_exercises" to "authenticated";

grant update on table "public"."coach_exercises" to "authenticated";

grant delete on table "public"."coach_exercises" to "service_role";

grant insert on table "public"."coach_exercises" to "service_role";

grant references on table "public"."coach_exercises" to "service_role";

grant select on table "public"."coach_exercises" to "service_role";

grant trigger on table "public"."coach_exercises" to "service_role";

grant truncate on table "public"."coach_exercises" to "service_role";

grant update on table "public"."coach_exercises" to "service_role";

grant delete on table "public"."coach_file_folders" to "anon";

grant insert on table "public"."coach_file_folders" to "anon";

grant references on table "public"."coach_file_folders" to "anon";

grant select on table "public"."coach_file_folders" to "anon";

grant trigger on table "public"."coach_file_folders" to "anon";

grant truncate on table "public"."coach_file_folders" to "anon";

grant update on table "public"."coach_file_folders" to "anon";

grant delete on table "public"."coach_file_folders" to "authenticated";

grant insert on table "public"."coach_file_folders" to "authenticated";

grant references on table "public"."coach_file_folders" to "authenticated";

grant select on table "public"."coach_file_folders" to "authenticated";

grant trigger on table "public"."coach_file_folders" to "authenticated";

grant truncate on table "public"."coach_file_folders" to "authenticated";

grant update on table "public"."coach_file_folders" to "authenticated";

grant delete on table "public"."coach_file_folders" to "service_role";

grant insert on table "public"."coach_file_folders" to "service_role";

grant references on table "public"."coach_file_folders" to "service_role";

grant select on table "public"."coach_file_folders" to "service_role";

grant trigger on table "public"."coach_file_folders" to "service_role";

grant truncate on table "public"."coach_file_folders" to "service_role";

grant update on table "public"."coach_file_folders" to "service_role";

grant delete on table "public"."coach_files" to "anon";

grant insert on table "public"."coach_files" to "anon";

grant references on table "public"."coach_files" to "anon";

grant select on table "public"."coach_files" to "anon";

grant trigger on table "public"."coach_files" to "anon";

grant truncate on table "public"."coach_files" to "anon";

grant update on table "public"."coach_files" to "anon";

grant delete on table "public"."coach_files" to "authenticated";

grant insert on table "public"."coach_files" to "authenticated";

grant references on table "public"."coach_files" to "authenticated";

grant select on table "public"."coach_files" to "authenticated";

grant trigger on table "public"."coach_files" to "authenticated";

grant truncate on table "public"."coach_files" to "authenticated";

grant update on table "public"."coach_files" to "authenticated";

grant delete on table "public"."coach_files" to "service_role";

grant insert on table "public"."coach_files" to "service_role";

grant references on table "public"."coach_files" to "service_role";

grant select on table "public"."coach_files" to "service_role";

grant trigger on table "public"."coach_files" to "service_role";

grant truncate on table "public"."coach_files" to "service_role";

grant update on table "public"."coach_files" to "service_role";

grant delete on table "public"."coach_flows" to "anon";

grant insert on table "public"."coach_flows" to "anon";

grant references on table "public"."coach_flows" to "anon";

grant select on table "public"."coach_flows" to "anon";

grant trigger on table "public"."coach_flows" to "anon";

grant truncate on table "public"."coach_flows" to "anon";

grant update on table "public"."coach_flows" to "anon";

grant delete on table "public"."coach_flows" to "authenticated";

grant insert on table "public"."coach_flows" to "authenticated";

grant references on table "public"."coach_flows" to "authenticated";

grant select on table "public"."coach_flows" to "authenticated";

grant trigger on table "public"."coach_flows" to "authenticated";

grant truncate on table "public"."coach_flows" to "authenticated";

grant update on table "public"."coach_flows" to "authenticated";

grant delete on table "public"."coach_flows" to "service_role";

grant insert on table "public"."coach_flows" to "service_role";

grant references on table "public"."coach_flows" to "service_role";

grant select on table "public"."coach_flows" to "service_role";

grant trigger on table "public"."coach_flows" to "service_role";

grant truncate on table "public"."coach_flows" to "service_role";

grant update on table "public"."coach_flows" to "service_role";

grant delete on table "public"."coach_getting_started_checklist" to "anon";

grant insert on table "public"."coach_getting_started_checklist" to "anon";

grant references on table "public"."coach_getting_started_checklist" to "anon";

grant select on table "public"."coach_getting_started_checklist" to "anon";

grant trigger on table "public"."coach_getting_started_checklist" to "anon";

grant truncate on table "public"."coach_getting_started_checklist" to "anon";

grant update on table "public"."coach_getting_started_checklist" to "anon";

grant delete on table "public"."coach_getting_started_checklist" to "authenticated";

grant insert on table "public"."coach_getting_started_checklist" to "authenticated";

grant references on table "public"."coach_getting_started_checklist" to "authenticated";

grant select on table "public"."coach_getting_started_checklist" to "authenticated";

grant trigger on table "public"."coach_getting_started_checklist" to "authenticated";

grant truncate on table "public"."coach_getting_started_checklist" to "authenticated";

grant update on table "public"."coach_getting_started_checklist" to "authenticated";

grant delete on table "public"."coach_getting_started_checklist" to "service_role";

grant insert on table "public"."coach_getting_started_checklist" to "service_role";

grant references on table "public"."coach_getting_started_checklist" to "service_role";

grant select on table "public"."coach_getting_started_checklist" to "service_role";

grant trigger on table "public"."coach_getting_started_checklist" to "service_role";

grant truncate on table "public"."coach_getting_started_checklist" to "service_role";

grant update on table "public"."coach_getting_started_checklist" to "service_role";

grant delete on table "public"."coach_habit_folders" to "anon";

grant insert on table "public"."coach_habit_folders" to "anon";

grant references on table "public"."coach_habit_folders" to "anon";

grant select on table "public"."coach_habit_folders" to "anon";

grant trigger on table "public"."coach_habit_folders" to "anon";

grant truncate on table "public"."coach_habit_folders" to "anon";

grant update on table "public"."coach_habit_folders" to "anon";

grant delete on table "public"."coach_habit_folders" to "authenticated";

grant insert on table "public"."coach_habit_folders" to "authenticated";

grant references on table "public"."coach_habit_folders" to "authenticated";

grant select on table "public"."coach_habit_folders" to "authenticated";

grant trigger on table "public"."coach_habit_folders" to "authenticated";

grant truncate on table "public"."coach_habit_folders" to "authenticated";

grant update on table "public"."coach_habit_folders" to "authenticated";

grant delete on table "public"."coach_habit_folders" to "service_role";

grant insert on table "public"."coach_habit_folders" to "service_role";

grant references on table "public"."coach_habit_folders" to "service_role";

grant select on table "public"."coach_habit_folders" to "service_role";

grant trigger on table "public"."coach_habit_folders" to "service_role";

grant truncate on table "public"."coach_habit_folders" to "service_role";

grant update on table "public"."coach_habit_folders" to "service_role";

grant delete on table "public"."coach_habits" to "anon";

grant insert on table "public"."coach_habits" to "anon";

grant references on table "public"."coach_habits" to "anon";

grant select on table "public"."coach_habits" to "anon";

grant trigger on table "public"."coach_habits" to "anon";

grant truncate on table "public"."coach_habits" to "anon";

grant update on table "public"."coach_habits" to "anon";

grant delete on table "public"."coach_habits" to "authenticated";

grant insert on table "public"."coach_habits" to "authenticated";

grant references on table "public"."coach_habits" to "authenticated";

grant select on table "public"."coach_habits" to "authenticated";

grant trigger on table "public"."coach_habits" to "authenticated";

grant truncate on table "public"."coach_habits" to "authenticated";

grant update on table "public"."coach_habits" to "authenticated";

grant delete on table "public"."coach_habits" to "service_role";

grant insert on table "public"."coach_habits" to "service_role";

grant references on table "public"."coach_habits" to "service_role";

grant select on table "public"."coach_habits" to "service_role";

grant trigger on table "public"."coach_habits" to "service_role";

grant truncate on table "public"."coach_habits" to "service_role";

grant update on table "public"."coach_habits" to "service_role";

grant delete on table "public"."coach_metric_folders" to "anon";

grant insert on table "public"."coach_metric_folders" to "anon";

grant references on table "public"."coach_metric_folders" to "anon";

grant select on table "public"."coach_metric_folders" to "anon";

grant trigger on table "public"."coach_metric_folders" to "anon";

grant truncate on table "public"."coach_metric_folders" to "anon";

grant update on table "public"."coach_metric_folders" to "anon";

grant delete on table "public"."coach_metric_folders" to "authenticated";

grant insert on table "public"."coach_metric_folders" to "authenticated";

grant references on table "public"."coach_metric_folders" to "authenticated";

grant select on table "public"."coach_metric_folders" to "authenticated";

grant trigger on table "public"."coach_metric_folders" to "authenticated";

grant truncate on table "public"."coach_metric_folders" to "authenticated";

grant update on table "public"."coach_metric_folders" to "authenticated";

grant delete on table "public"."coach_metric_folders" to "service_role";

grant insert on table "public"."coach_metric_folders" to "service_role";

grant references on table "public"."coach_metric_folders" to "service_role";

grant select on table "public"."coach_metric_folders" to "service_role";

grant trigger on table "public"."coach_metric_folders" to "service_role";

grant truncate on table "public"."coach_metric_folders" to "service_role";

grant update on table "public"."coach_metric_folders" to "service_role";

grant delete on table "public"."coach_metrics" to "anon";

grant insert on table "public"."coach_metrics" to "anon";

grant references on table "public"."coach_metrics" to "anon";

grant select on table "public"."coach_metrics" to "anon";

grant trigger on table "public"."coach_metrics" to "anon";

grant truncate on table "public"."coach_metrics" to "anon";

grant update on table "public"."coach_metrics" to "anon";

grant delete on table "public"."coach_metrics" to "authenticated";

grant insert on table "public"."coach_metrics" to "authenticated";

grant references on table "public"."coach_metrics" to "authenticated";

grant select on table "public"."coach_metrics" to "authenticated";

grant trigger on table "public"."coach_metrics" to "authenticated";

grant truncate on table "public"."coach_metrics" to "authenticated";

grant update on table "public"."coach_metrics" to "authenticated";

grant delete on table "public"."coach_metrics" to "service_role";

grant insert on table "public"."coach_metrics" to "service_role";

grant references on table "public"."coach_metrics" to "service_role";

grant select on table "public"."coach_metrics" to "service_role";

grant trigger on table "public"."coach_metrics" to "service_role";

grant truncate on table "public"."coach_metrics" to "service_role";

grant update on table "public"."coach_metrics" to "service_role";

grant delete on table "public"."coach_notification_preferences" to "anon";

grant insert on table "public"."coach_notification_preferences" to "anon";

grant references on table "public"."coach_notification_preferences" to "anon";

grant select on table "public"."coach_notification_preferences" to "anon";

grant trigger on table "public"."coach_notification_preferences" to "anon";

grant truncate on table "public"."coach_notification_preferences" to "anon";

grant update on table "public"."coach_notification_preferences" to "anon";

grant delete on table "public"."coach_notification_preferences" to "authenticated";

grant insert on table "public"."coach_notification_preferences" to "authenticated";

grant references on table "public"."coach_notification_preferences" to "authenticated";

grant select on table "public"."coach_notification_preferences" to "authenticated";

grant trigger on table "public"."coach_notification_preferences" to "authenticated";

grant truncate on table "public"."coach_notification_preferences" to "authenticated";

grant update on table "public"."coach_notification_preferences" to "authenticated";

grant delete on table "public"."coach_notification_preferences" to "service_role";

grant insert on table "public"."coach_notification_preferences" to "service_role";

grant references on table "public"."coach_notification_preferences" to "service_role";

grant select on table "public"."coach_notification_preferences" to "service_role";

grant trigger on table "public"."coach_notification_preferences" to "service_role";

grant truncate on table "public"."coach_notification_preferences" to "service_role";

grant update on table "public"."coach_notification_preferences" to "service_role";

grant delete on table "public"."coach_notifications" to "anon";

grant insert on table "public"."coach_notifications" to "anon";

grant references on table "public"."coach_notifications" to "anon";

grant select on table "public"."coach_notifications" to "anon";

grant trigger on table "public"."coach_notifications" to "anon";

grant truncate on table "public"."coach_notifications" to "anon";

grant update on table "public"."coach_notifications" to "anon";

grant delete on table "public"."coach_notifications" to "authenticated";

grant insert on table "public"."coach_notifications" to "authenticated";

grant references on table "public"."coach_notifications" to "authenticated";

grant select on table "public"."coach_notifications" to "authenticated";

grant trigger on table "public"."coach_notifications" to "authenticated";

grant truncate on table "public"."coach_notifications" to "authenticated";

grant update on table "public"."coach_notifications" to "authenticated";

grant delete on table "public"."coach_notifications" to "service_role";

grant insert on table "public"."coach_notifications" to "service_role";

grant references on table "public"."coach_notifications" to "service_role";

grant select on table "public"."coach_notifications" to "service_role";

grant trigger on table "public"."coach_notifications" to "service_role";

grant truncate on table "public"."coach_notifications" to "service_role";

grant update on table "public"."coach_notifications" to "service_role";

grant delete on table "public"."coach_onboardings" to "anon";

grant insert on table "public"."coach_onboardings" to "anon";

grant references on table "public"."coach_onboardings" to "anon";

grant select on table "public"."coach_onboardings" to "anon";

grant trigger on table "public"."coach_onboardings" to "anon";

grant truncate on table "public"."coach_onboardings" to "anon";

grant update on table "public"."coach_onboardings" to "anon";

grant delete on table "public"."coach_onboardings" to "authenticated";

grant insert on table "public"."coach_onboardings" to "authenticated";

grant references on table "public"."coach_onboardings" to "authenticated";

grant select on table "public"."coach_onboardings" to "authenticated";

grant trigger on table "public"."coach_onboardings" to "authenticated";

grant truncate on table "public"."coach_onboardings" to "authenticated";

grant update on table "public"."coach_onboardings" to "authenticated";

grant delete on table "public"."coach_onboardings" to "service_role";

grant insert on table "public"."coach_onboardings" to "service_role";

grant references on table "public"."coach_onboardings" to "service_role";

grant select on table "public"."coach_onboardings" to "service_role";

grant trigger on table "public"."coach_onboardings" to "service_role";

grant truncate on table "public"."coach_onboardings" to "service_role";

grant update on table "public"."coach_onboardings" to "service_role";

grant delete on table "public"."coach_own_todolist" to "anon";

grant insert on table "public"."coach_own_todolist" to "anon";

grant references on table "public"."coach_own_todolist" to "anon";

grant select on table "public"."coach_own_todolist" to "anon";

grant trigger on table "public"."coach_own_todolist" to "anon";

grant truncate on table "public"."coach_own_todolist" to "anon";

grant update on table "public"."coach_own_todolist" to "anon";

grant delete on table "public"."coach_own_todolist" to "authenticated";

grant insert on table "public"."coach_own_todolist" to "authenticated";

grant references on table "public"."coach_own_todolist" to "authenticated";

grant select on table "public"."coach_own_todolist" to "authenticated";

grant trigger on table "public"."coach_own_todolist" to "authenticated";

grant truncate on table "public"."coach_own_todolist" to "authenticated";

grant update on table "public"."coach_own_todolist" to "authenticated";

grant delete on table "public"."coach_own_todolist" to "service_role";

grant insert on table "public"."coach_own_todolist" to "service_role";

grant references on table "public"."coach_own_todolist" to "service_role";

grant select on table "public"."coach_own_todolist" to "service_role";

grant trigger on table "public"."coach_own_todolist" to "service_role";

grant truncate on table "public"."coach_own_todolist" to "service_role";

grant update on table "public"."coach_own_todolist" to "service_role";

grant delete on table "public"."coach_packages" to "anon";

grant insert on table "public"."coach_packages" to "anon";

grant references on table "public"."coach_packages" to "anon";

grant select on table "public"."coach_packages" to "anon";

grant trigger on table "public"."coach_packages" to "anon";

grant truncate on table "public"."coach_packages" to "anon";

grant update on table "public"."coach_packages" to "anon";

grant delete on table "public"."coach_packages" to "authenticated";

grant insert on table "public"."coach_packages" to "authenticated";

grant references on table "public"."coach_packages" to "authenticated";

grant select on table "public"."coach_packages" to "authenticated";

grant trigger on table "public"."coach_packages" to "authenticated";

grant truncate on table "public"."coach_packages" to "authenticated";

grant update on table "public"."coach_packages" to "authenticated";

grant delete on table "public"."coach_packages" to "service_role";

grant insert on table "public"."coach_packages" to "service_role";

grant references on table "public"."coach_packages" to "service_role";

grant select on table "public"."coach_packages" to "service_role";

grant trigger on table "public"."coach_packages" to "service_role";

grant truncate on table "public"."coach_packages" to "service_role";

grant update on table "public"."coach_packages" to "service_role";

grant delete on table "public"."coach_preferences" to "anon";

grant insert on table "public"."coach_preferences" to "anon";

grant references on table "public"."coach_preferences" to "anon";

grant select on table "public"."coach_preferences" to "anon";

grant trigger on table "public"."coach_preferences" to "anon";

grant truncate on table "public"."coach_preferences" to "anon";

grant update on table "public"."coach_preferences" to "anon";

grant delete on table "public"."coach_preferences" to "authenticated";

grant insert on table "public"."coach_preferences" to "authenticated";

grant references on table "public"."coach_preferences" to "authenticated";

grant select on table "public"."coach_preferences" to "authenticated";

grant trigger on table "public"."coach_preferences" to "authenticated";

grant truncate on table "public"."coach_preferences" to "authenticated";

grant update on table "public"."coach_preferences" to "authenticated";

grant delete on table "public"."coach_preferences" to "service_role";

grant insert on table "public"."coach_preferences" to "service_role";

grant references on table "public"."coach_preferences" to "service_role";

grant select on table "public"."coach_preferences" to "service_role";

grant trigger on table "public"."coach_preferences" to "service_role";

grant truncate on table "public"."coach_preferences" to "service_role";

grant update on table "public"."coach_preferences" to "service_role";

grant delete on table "public"."coach_profiles" to "anon";

grant insert on table "public"."coach_profiles" to "anon";

grant references on table "public"."coach_profiles" to "anon";

grant select on table "public"."coach_profiles" to "anon";

grant trigger on table "public"."coach_profiles" to "anon";

grant truncate on table "public"."coach_profiles" to "anon";

grant update on table "public"."coach_profiles" to "anon";

grant delete on table "public"."coach_profiles" to "authenticated";

grant insert on table "public"."coach_profiles" to "authenticated";

grant references on table "public"."coach_profiles" to "authenticated";

grant select on table "public"."coach_profiles" to "authenticated";

grant trigger on table "public"."coach_profiles" to "authenticated";

grant truncate on table "public"."coach_profiles" to "authenticated";

grant update on table "public"."coach_profiles" to "authenticated";

grant delete on table "public"."coach_profiles" to "service_role";

grant insert on table "public"."coach_profiles" to "service_role";

grant references on table "public"."coach_profiles" to "service_role";

grant select on table "public"."coach_profiles" to "service_role";

grant trigger on table "public"."coach_profiles" to "service_role";

grant truncate on table "public"."coach_profiles" to "service_role";

grant update on table "public"."coach_profiles" to "service_role";

grant delete on table "public"."coach_programs" to "anon";

grant insert on table "public"."coach_programs" to "anon";

grant references on table "public"."coach_programs" to "anon";

grant select on table "public"."coach_programs" to "anon";

grant trigger on table "public"."coach_programs" to "anon";

grant truncate on table "public"."coach_programs" to "anon";

grant update on table "public"."coach_programs" to "anon";

grant delete on table "public"."coach_programs" to "authenticated";

grant insert on table "public"."coach_programs" to "authenticated";

grant references on table "public"."coach_programs" to "authenticated";

grant select on table "public"."coach_programs" to "authenticated";

grant trigger on table "public"."coach_programs" to "authenticated";

grant truncate on table "public"."coach_programs" to "authenticated";

grant update on table "public"."coach_programs" to "authenticated";

grant delete on table "public"."coach_programs" to "service_role";

grant insert on table "public"."coach_programs" to "service_role";

grant references on table "public"."coach_programs" to "service_role";

grant select on table "public"."coach_programs" to "service_role";

grant trigger on table "public"."coach_programs" to "service_role";

grant truncate on table "public"."coach_programs" to "service_role";

grant update on table "public"."coach_programs" to "service_role";

grant delete on table "public"."coach_push_tokens" to "anon";

grant insert on table "public"."coach_push_tokens" to "anon";

grant references on table "public"."coach_push_tokens" to "anon";

grant select on table "public"."coach_push_tokens" to "anon";

grant trigger on table "public"."coach_push_tokens" to "anon";

grant truncate on table "public"."coach_push_tokens" to "anon";

grant update on table "public"."coach_push_tokens" to "anon";

grant delete on table "public"."coach_push_tokens" to "authenticated";

grant insert on table "public"."coach_push_tokens" to "authenticated";

grant references on table "public"."coach_push_tokens" to "authenticated";

grant select on table "public"."coach_push_tokens" to "authenticated";

grant trigger on table "public"."coach_push_tokens" to "authenticated";

grant truncate on table "public"."coach_push_tokens" to "authenticated";

grant update on table "public"."coach_push_tokens" to "authenticated";

grant delete on table "public"."coach_push_tokens" to "service_role";

grant insert on table "public"."coach_push_tokens" to "service_role";

grant references on table "public"."coach_push_tokens" to "service_role";

grant select on table "public"."coach_push_tokens" to "service_role";

grant trigger on table "public"."coach_push_tokens" to "service_role";

grant truncate on table "public"."coach_push_tokens" to "service_role";

grant update on table "public"."coach_push_tokens" to "service_role";

grant delete on table "public"."coach_questionnaires" to "anon";

grant insert on table "public"."coach_questionnaires" to "anon";

grant references on table "public"."coach_questionnaires" to "anon";

grant select on table "public"."coach_questionnaires" to "anon";

grant trigger on table "public"."coach_questionnaires" to "anon";

grant truncate on table "public"."coach_questionnaires" to "anon";

grant update on table "public"."coach_questionnaires" to "anon";

grant delete on table "public"."coach_questionnaires" to "authenticated";

grant insert on table "public"."coach_questionnaires" to "authenticated";

grant references on table "public"."coach_questionnaires" to "authenticated";

grant select on table "public"."coach_questionnaires" to "authenticated";

grant trigger on table "public"."coach_questionnaires" to "authenticated";

grant truncate on table "public"."coach_questionnaires" to "authenticated";

grant update on table "public"."coach_questionnaires" to "authenticated";

grant delete on table "public"."coach_questionnaires" to "service_role";

grant insert on table "public"."coach_questionnaires" to "service_role";

grant references on table "public"."coach_questionnaires" to "service_role";

grant select on table "public"."coach_questionnaires" to "service_role";

grant trigger on table "public"."coach_questionnaires" to "service_role";

grant truncate on table "public"."coach_questionnaires" to "service_role";

grant update on table "public"."coach_questionnaires" to "service_role";

grant delete on table "public"."coach_referrals" to "anon";

grant insert on table "public"."coach_referrals" to "anon";

grant references on table "public"."coach_referrals" to "anon";

grant select on table "public"."coach_referrals" to "anon";

grant trigger on table "public"."coach_referrals" to "anon";

grant truncate on table "public"."coach_referrals" to "anon";

grant update on table "public"."coach_referrals" to "anon";

grant delete on table "public"."coach_referrals" to "authenticated";

grant insert on table "public"."coach_referrals" to "authenticated";

grant references on table "public"."coach_referrals" to "authenticated";

grant select on table "public"."coach_referrals" to "authenticated";

grant trigger on table "public"."coach_referrals" to "authenticated";

grant truncate on table "public"."coach_referrals" to "authenticated";

grant update on table "public"."coach_referrals" to "authenticated";

grant delete on table "public"."coach_referrals" to "service_role";

grant insert on table "public"."coach_referrals" to "service_role";

grant references on table "public"."coach_referrals" to "service_role";

grant select on table "public"."coach_referrals" to "service_role";

grant trigger on table "public"."coach_referrals" to "service_role";

grant truncate on table "public"."coach_referrals" to "service_role";

grant update on table "public"."coach_referrals" to "service_role";

grant delete on table "public"."coach_sections" to "anon";

grant insert on table "public"."coach_sections" to "anon";

grant references on table "public"."coach_sections" to "anon";

grant select on table "public"."coach_sections" to "anon";

grant trigger on table "public"."coach_sections" to "anon";

grant truncate on table "public"."coach_sections" to "anon";

grant update on table "public"."coach_sections" to "anon";

grant delete on table "public"."coach_sections" to "authenticated";

grant insert on table "public"."coach_sections" to "authenticated";

grant references on table "public"."coach_sections" to "authenticated";

grant select on table "public"."coach_sections" to "authenticated";

grant trigger on table "public"."coach_sections" to "authenticated";

grant truncate on table "public"."coach_sections" to "authenticated";

grant update on table "public"."coach_sections" to "authenticated";

grant delete on table "public"."coach_sections" to "service_role";

grant insert on table "public"."coach_sections" to "service_role";

grant references on table "public"."coach_sections" to "service_role";

grant select on table "public"."coach_sections" to "service_role";

grant trigger on table "public"."coach_sections" to "service_role";

grant truncate on table "public"."coach_sections" to "service_role";

grant update on table "public"."coach_sections" to "service_role";

grant delete on table "public"."coach_sequences" to "anon";

grant insert on table "public"."coach_sequences" to "anon";

grant references on table "public"."coach_sequences" to "anon";

grant select on table "public"."coach_sequences" to "anon";

grant trigger on table "public"."coach_sequences" to "anon";

grant truncate on table "public"."coach_sequences" to "anon";

grant update on table "public"."coach_sequences" to "anon";

grant delete on table "public"."coach_sequences" to "authenticated";

grant insert on table "public"."coach_sequences" to "authenticated";

grant references on table "public"."coach_sequences" to "authenticated";

grant select on table "public"."coach_sequences" to "authenticated";

grant trigger on table "public"."coach_sequences" to "authenticated";

grant truncate on table "public"."coach_sequences" to "authenticated";

grant update on table "public"."coach_sequences" to "authenticated";

grant delete on table "public"."coach_sequences" to "service_role";

grant insert on table "public"."coach_sequences" to "service_role";

grant references on table "public"."coach_sequences" to "service_role";

grant select on table "public"."coach_sequences" to "service_role";

grant trigger on table "public"."coach_sequences" to "service_role";

grant truncate on table "public"."coach_sequences" to "service_role";

grant update on table "public"."coach_sequences" to "service_role";

grant delete on table "public"."coach_stripe_accounts" to "anon";

grant insert on table "public"."coach_stripe_accounts" to "anon";

grant references on table "public"."coach_stripe_accounts" to "anon";

grant select on table "public"."coach_stripe_accounts" to "anon";

grant trigger on table "public"."coach_stripe_accounts" to "anon";

grant truncate on table "public"."coach_stripe_accounts" to "anon";

grant update on table "public"."coach_stripe_accounts" to "anon";

grant delete on table "public"."coach_stripe_accounts" to "authenticated";

grant insert on table "public"."coach_stripe_accounts" to "authenticated";

grant references on table "public"."coach_stripe_accounts" to "authenticated";

grant select on table "public"."coach_stripe_accounts" to "authenticated";

grant trigger on table "public"."coach_stripe_accounts" to "authenticated";

grant truncate on table "public"."coach_stripe_accounts" to "authenticated";

grant update on table "public"."coach_stripe_accounts" to "authenticated";

grant delete on table "public"."coach_stripe_accounts" to "service_role";

grant insert on table "public"."coach_stripe_accounts" to "service_role";

grant references on table "public"."coach_stripe_accounts" to "service_role";

grant select on table "public"."coach_stripe_accounts" to "service_role";

grant trigger on table "public"."coach_stripe_accounts" to "service_role";

grant truncate on table "public"."coach_stripe_accounts" to "service_role";

grant update on table "public"."coach_stripe_accounts" to "service_role";

grant delete on table "public"."coach_unique_codes" to "anon";

grant insert on table "public"."coach_unique_codes" to "anon";

grant references on table "public"."coach_unique_codes" to "anon";

grant select on table "public"."coach_unique_codes" to "anon";

grant trigger on table "public"."coach_unique_codes" to "anon";

grant truncate on table "public"."coach_unique_codes" to "anon";

grant update on table "public"."coach_unique_codes" to "anon";

grant delete on table "public"."coach_unique_codes" to "authenticated";

grant insert on table "public"."coach_unique_codes" to "authenticated";

grant references on table "public"."coach_unique_codes" to "authenticated";

grant select on table "public"."coach_unique_codes" to "authenticated";

grant trigger on table "public"."coach_unique_codes" to "authenticated";

grant truncate on table "public"."coach_unique_codes" to "authenticated";

grant update on table "public"."coach_unique_codes" to "authenticated";

grant delete on table "public"."coach_unique_codes" to "service_role";

grant insert on table "public"."coach_unique_codes" to "service_role";

grant references on table "public"."coach_unique_codes" to "service_role";

grant select on table "public"."coach_unique_codes" to "service_role";

grant trigger on table "public"."coach_unique_codes" to "service_role";

grant truncate on table "public"."coach_unique_codes" to "service_role";

grant update on table "public"."coach_unique_codes" to "service_role";

grant delete on table "public"."coach_workouts" to "anon";

grant insert on table "public"."coach_workouts" to "anon";

grant references on table "public"."coach_workouts" to "anon";

grant select on table "public"."coach_workouts" to "anon";

grant trigger on table "public"."coach_workouts" to "anon";

grant truncate on table "public"."coach_workouts" to "anon";

grant update on table "public"."coach_workouts" to "anon";

grant delete on table "public"."coach_workouts" to "authenticated";

grant insert on table "public"."coach_workouts" to "authenticated";

grant references on table "public"."coach_workouts" to "authenticated";

grant select on table "public"."coach_workouts" to "authenticated";

grant trigger on table "public"."coach_workouts" to "authenticated";

grant truncate on table "public"."coach_workouts" to "authenticated";

grant update on table "public"."coach_workouts" to "authenticated";

grant delete on table "public"."coach_workouts" to "service_role";

grant insert on table "public"."coach_workouts" to "service_role";

grant references on table "public"."coach_workouts" to "service_role";

grant select on table "public"."coach_workouts" to "service_role";

grant trigger on table "public"."coach_workouts" to "service_role";

grant truncate on table "public"."coach_workouts" to "service_role";

grant update on table "public"."coach_workouts" to "service_role";

grant delete on table "public"."conversation_participants" to "anon";

grant insert on table "public"."conversation_participants" to "anon";

grant references on table "public"."conversation_participants" to "anon";

grant select on table "public"."conversation_participants" to "anon";

grant trigger on table "public"."conversation_participants" to "anon";

grant truncate on table "public"."conversation_participants" to "anon";

grant update on table "public"."conversation_participants" to "anon";

grant delete on table "public"."conversation_participants" to "authenticated";

grant insert on table "public"."conversation_participants" to "authenticated";

grant references on table "public"."conversation_participants" to "authenticated";

grant select on table "public"."conversation_participants" to "authenticated";

grant trigger on table "public"."conversation_participants" to "authenticated";

grant truncate on table "public"."conversation_participants" to "authenticated";

grant update on table "public"."conversation_participants" to "authenticated";

grant delete on table "public"."conversation_participants" to "service_role";

grant insert on table "public"."conversation_participants" to "service_role";

grant references on table "public"."conversation_participants" to "service_role";

grant select on table "public"."conversation_participants" to "service_role";

grant trigger on table "public"."conversation_participants" to "service_role";

grant truncate on table "public"."conversation_participants" to "service_role";

grant update on table "public"."conversation_participants" to "service_role";

grant delete on table "public"."conversation_presence" to "anon";

grant insert on table "public"."conversation_presence" to "anon";

grant references on table "public"."conversation_presence" to "anon";

grant select on table "public"."conversation_presence" to "anon";

grant trigger on table "public"."conversation_presence" to "anon";

grant truncate on table "public"."conversation_presence" to "anon";

grant update on table "public"."conversation_presence" to "anon";

grant delete on table "public"."conversation_presence" to "authenticated";

grant insert on table "public"."conversation_presence" to "authenticated";

grant references on table "public"."conversation_presence" to "authenticated";

grant select on table "public"."conversation_presence" to "authenticated";

grant trigger on table "public"."conversation_presence" to "authenticated";

grant truncate on table "public"."conversation_presence" to "authenticated";

grant update on table "public"."conversation_presence" to "authenticated";

grant delete on table "public"."conversation_presence" to "service_role";

grant insert on table "public"."conversation_presence" to "service_role";

grant references on table "public"."conversation_presence" to "service_role";

grant select on table "public"."conversation_presence" to "service_role";

grant trigger on table "public"."conversation_presence" to "service_role";

grant truncate on table "public"."conversation_presence" to "service_role";

grant update on table "public"."conversation_presence" to "service_role";

grant delete on table "public"."conversations" to "anon";

grant insert on table "public"."conversations" to "anon";

grant references on table "public"."conversations" to "anon";

grant select on table "public"."conversations" to "anon";

grant trigger on table "public"."conversations" to "anon";

grant truncate on table "public"."conversations" to "anon";

grant update on table "public"."conversations" to "anon";

grant delete on table "public"."conversations" to "authenticated";

grant insert on table "public"."conversations" to "authenticated";

grant references on table "public"."conversations" to "authenticated";

grant select on table "public"."conversations" to "authenticated";

grant trigger on table "public"."conversations" to "authenticated";

grant truncate on table "public"."conversations" to "authenticated";

grant update on table "public"."conversations" to "authenticated";

grant delete on table "public"."conversations" to "service_role";

grant insert on table "public"."conversations" to "service_role";

grant references on table "public"."conversations" to "service_role";

grant select on table "public"."conversations" to "service_role";

grant trigger on table "public"."conversations" to "service_role";

grant truncate on table "public"."conversations" to "service_role";

grant update on table "public"."conversations" to "service_role";

grant delete on table "public"."feature_request_replies" to "anon";

grant insert on table "public"."feature_request_replies" to "anon";

grant references on table "public"."feature_request_replies" to "anon";

grant select on table "public"."feature_request_replies" to "anon";

grant trigger on table "public"."feature_request_replies" to "anon";

grant truncate on table "public"."feature_request_replies" to "anon";

grant update on table "public"."feature_request_replies" to "anon";

grant delete on table "public"."feature_request_replies" to "authenticated";

grant insert on table "public"."feature_request_replies" to "authenticated";

grant references on table "public"."feature_request_replies" to "authenticated";

grant select on table "public"."feature_request_replies" to "authenticated";

grant trigger on table "public"."feature_request_replies" to "authenticated";

grant truncate on table "public"."feature_request_replies" to "authenticated";

grant update on table "public"."feature_request_replies" to "authenticated";

grant delete on table "public"."feature_request_replies" to "service_role";

grant insert on table "public"."feature_request_replies" to "service_role";

grant references on table "public"."feature_request_replies" to "service_role";

grant select on table "public"."feature_request_replies" to "service_role";

grant trigger on table "public"."feature_request_replies" to "service_role";

grant truncate on table "public"."feature_request_replies" to "service_role";

grant update on table "public"."feature_request_replies" to "service_role";

grant delete on table "public"."feature_request_upvotes" to "anon";

grant insert on table "public"."feature_request_upvotes" to "anon";

grant references on table "public"."feature_request_upvotes" to "anon";

grant select on table "public"."feature_request_upvotes" to "anon";

grant trigger on table "public"."feature_request_upvotes" to "anon";

grant truncate on table "public"."feature_request_upvotes" to "anon";

grant update on table "public"."feature_request_upvotes" to "anon";

grant delete on table "public"."feature_request_upvotes" to "authenticated";

grant insert on table "public"."feature_request_upvotes" to "authenticated";

grant references on table "public"."feature_request_upvotes" to "authenticated";

grant select on table "public"."feature_request_upvotes" to "authenticated";

grant trigger on table "public"."feature_request_upvotes" to "authenticated";

grant truncate on table "public"."feature_request_upvotes" to "authenticated";

grant update on table "public"."feature_request_upvotes" to "authenticated";

grant delete on table "public"."feature_request_upvotes" to "service_role";

grant insert on table "public"."feature_request_upvotes" to "service_role";

grant references on table "public"."feature_request_upvotes" to "service_role";

grant select on table "public"."feature_request_upvotes" to "service_role";

grant trigger on table "public"."feature_request_upvotes" to "service_role";

grant truncate on table "public"."feature_request_upvotes" to "service_role";

grant update on table "public"."feature_request_upvotes" to "service_role";

grant delete on table "public"."feature_requests" to "anon";

grant insert on table "public"."feature_requests" to "anon";

grant references on table "public"."feature_requests" to "anon";

grant select on table "public"."feature_requests" to "anon";

grant trigger on table "public"."feature_requests" to "anon";

grant truncate on table "public"."feature_requests" to "anon";

grant update on table "public"."feature_requests" to "anon";

grant delete on table "public"."feature_requests" to "authenticated";

grant insert on table "public"."feature_requests" to "authenticated";

grant references on table "public"."feature_requests" to "authenticated";

grant select on table "public"."feature_requests" to "authenticated";

grant trigger on table "public"."feature_requests" to "authenticated";

grant truncate on table "public"."feature_requests" to "authenticated";

grant update on table "public"."feature_requests" to "authenticated";

grant delete on table "public"."feature_requests" to "service_role";

grant insert on table "public"."feature_requests" to "service_role";

grant references on table "public"."feature_requests" to "service_role";

grant select on table "public"."feature_requests" to "service_role";

grant trigger on table "public"."feature_requests" to "service_role";

grant truncate on table "public"."feature_requests" to "service_role";

grant update on table "public"."feature_requests" to "service_role";

grant delete on table "public"."flow_execution_cron_log" to "anon";

grant insert on table "public"."flow_execution_cron_log" to "anon";

grant references on table "public"."flow_execution_cron_log" to "anon";

grant select on table "public"."flow_execution_cron_log" to "anon";

grant trigger on table "public"."flow_execution_cron_log" to "anon";

grant truncate on table "public"."flow_execution_cron_log" to "anon";

grant update on table "public"."flow_execution_cron_log" to "anon";

grant delete on table "public"."flow_execution_cron_log" to "authenticated";

grant insert on table "public"."flow_execution_cron_log" to "authenticated";

grant references on table "public"."flow_execution_cron_log" to "authenticated";

grant select on table "public"."flow_execution_cron_log" to "authenticated";

grant trigger on table "public"."flow_execution_cron_log" to "authenticated";

grant truncate on table "public"."flow_execution_cron_log" to "authenticated";

grant update on table "public"."flow_execution_cron_log" to "authenticated";

grant delete on table "public"."flow_execution_cron_log" to "service_role";

grant insert on table "public"."flow_execution_cron_log" to "service_role";

grant references on table "public"."flow_execution_cron_log" to "service_role";

grant select on table "public"."flow_execution_cron_log" to "service_role";

grant trigger on table "public"."flow_execution_cron_log" to "service_role";

grant truncate on table "public"."flow_execution_cron_log" to "service_role";

grant update on table "public"."flow_execution_cron_log" to "service_role";

grant delete on table "public"."flow_execution_log" to "anon";

grant insert on table "public"."flow_execution_log" to "anon";

grant references on table "public"."flow_execution_log" to "anon";

grant select on table "public"."flow_execution_log" to "anon";

grant trigger on table "public"."flow_execution_log" to "anon";

grant truncate on table "public"."flow_execution_log" to "anon";

grant update on table "public"."flow_execution_log" to "anon";

grant delete on table "public"."flow_execution_log" to "authenticated";

grant insert on table "public"."flow_execution_log" to "authenticated";

grant references on table "public"."flow_execution_log" to "authenticated";

grant select on table "public"."flow_execution_log" to "authenticated";

grant trigger on table "public"."flow_execution_log" to "authenticated";

grant truncate on table "public"."flow_execution_log" to "authenticated";

grant update on table "public"."flow_execution_log" to "authenticated";

grant delete on table "public"."flow_execution_log" to "service_role";

grant insert on table "public"."flow_execution_log" to "service_role";

grant references on table "public"."flow_execution_log" to "service_role";

grant select on table "public"."flow_execution_log" to "service_role";

grant trigger on table "public"."flow_execution_log" to "service_role";

grant truncate on table "public"."flow_execution_log" to "service_role";

grant update on table "public"."flow_execution_log" to "service_role";

grant delete on table "public"."flow_executions" to "anon";

grant insert on table "public"."flow_executions" to "anon";

grant references on table "public"."flow_executions" to "anon";

grant select on table "public"."flow_executions" to "anon";

grant trigger on table "public"."flow_executions" to "anon";

grant truncate on table "public"."flow_executions" to "anon";

grant update on table "public"."flow_executions" to "anon";

grant delete on table "public"."flow_executions" to "authenticated";

grant insert on table "public"."flow_executions" to "authenticated";

grant references on table "public"."flow_executions" to "authenticated";

grant select on table "public"."flow_executions" to "authenticated";

grant trigger on table "public"."flow_executions" to "authenticated";

grant truncate on table "public"."flow_executions" to "authenticated";

grant update on table "public"."flow_executions" to "authenticated";

grant delete on table "public"."flow_executions" to "service_role";

grant insert on table "public"."flow_executions" to "service_role";

grant references on table "public"."flow_executions" to "service_role";

grant select on table "public"."flow_executions" to "service_role";

grant trigger on table "public"."flow_executions" to "service_role";

grant truncate on table "public"."flow_executions" to "service_role";

grant update on table "public"."flow_executions" to "service_role";

grant delete on table "public"."flow_trigger_cron_log" to "anon";

grant insert on table "public"."flow_trigger_cron_log" to "anon";

grant references on table "public"."flow_trigger_cron_log" to "anon";

grant select on table "public"."flow_trigger_cron_log" to "anon";

grant trigger on table "public"."flow_trigger_cron_log" to "anon";

grant truncate on table "public"."flow_trigger_cron_log" to "anon";

grant update on table "public"."flow_trigger_cron_log" to "anon";

grant delete on table "public"."flow_trigger_cron_log" to "authenticated";

grant insert on table "public"."flow_trigger_cron_log" to "authenticated";

grant references on table "public"."flow_trigger_cron_log" to "authenticated";

grant select on table "public"."flow_trigger_cron_log" to "authenticated";

grant trigger on table "public"."flow_trigger_cron_log" to "authenticated";

grant truncate on table "public"."flow_trigger_cron_log" to "authenticated";

grant update on table "public"."flow_trigger_cron_log" to "authenticated";

grant delete on table "public"."flow_trigger_cron_log" to "service_role";

grant insert on table "public"."flow_trigger_cron_log" to "service_role";

grant references on table "public"."flow_trigger_cron_log" to "service_role";

grant select on table "public"."flow_trigger_cron_log" to "service_role";

grant trigger on table "public"."flow_trigger_cron_log" to "service_role";

grant truncate on table "public"."flow_trigger_cron_log" to "service_role";

grant update on table "public"."flow_trigger_cron_log" to "service_role";

grant delete on table "public"."free_trial_expiry_cron_log" to "anon";

grant insert on table "public"."free_trial_expiry_cron_log" to "anon";

grant references on table "public"."free_trial_expiry_cron_log" to "anon";

grant select on table "public"."free_trial_expiry_cron_log" to "anon";

grant trigger on table "public"."free_trial_expiry_cron_log" to "anon";

grant truncate on table "public"."free_trial_expiry_cron_log" to "anon";

grant update on table "public"."free_trial_expiry_cron_log" to "anon";

grant delete on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant insert on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant references on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant select on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant trigger on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant truncate on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant update on table "public"."free_trial_expiry_cron_log" to "authenticated";

grant delete on table "public"."free_trial_expiry_cron_log" to "service_role";

grant insert on table "public"."free_trial_expiry_cron_log" to "service_role";

grant references on table "public"."free_trial_expiry_cron_log" to "service_role";

grant select on table "public"."free_trial_expiry_cron_log" to "service_role";

grant trigger on table "public"."free_trial_expiry_cron_log" to "service_role";

grant truncate on table "public"."free_trial_expiry_cron_log" to "service_role";

grant update on table "public"."free_trial_expiry_cron_log" to "service_role";

grant delete on table "public"."message_attachments" to "anon";

grant insert on table "public"."message_attachments" to "anon";

grant references on table "public"."message_attachments" to "anon";

grant select on table "public"."message_attachments" to "anon";

grant trigger on table "public"."message_attachments" to "anon";

grant truncate on table "public"."message_attachments" to "anon";

grant update on table "public"."message_attachments" to "anon";

grant delete on table "public"."message_attachments" to "authenticated";

grant insert on table "public"."message_attachments" to "authenticated";

grant references on table "public"."message_attachments" to "authenticated";

grant select on table "public"."message_attachments" to "authenticated";

grant trigger on table "public"."message_attachments" to "authenticated";

grant truncate on table "public"."message_attachments" to "authenticated";

grant update on table "public"."message_attachments" to "authenticated";

grant delete on table "public"."message_attachments" to "service_role";

grant insert on table "public"."message_attachments" to "service_role";

grant references on table "public"."message_attachments" to "service_role";

grant select on table "public"."message_attachments" to "service_role";

grant trigger on table "public"."message_attachments" to "service_role";

grant truncate on table "public"."message_attachments" to "service_role";

grant update on table "public"."message_attachments" to "service_role";

grant delete on table "public"."message_reactions" to "anon";

grant insert on table "public"."message_reactions" to "anon";

grant references on table "public"."message_reactions" to "anon";

grant select on table "public"."message_reactions" to "anon";

grant trigger on table "public"."message_reactions" to "anon";

grant truncate on table "public"."message_reactions" to "anon";

grant update on table "public"."message_reactions" to "anon";

grant delete on table "public"."message_reactions" to "authenticated";

grant insert on table "public"."message_reactions" to "authenticated";

grant references on table "public"."message_reactions" to "authenticated";

grant select on table "public"."message_reactions" to "authenticated";

grant trigger on table "public"."message_reactions" to "authenticated";

grant truncate on table "public"."message_reactions" to "authenticated";

grant update on table "public"."message_reactions" to "authenticated";

grant delete on table "public"."message_reactions" to "service_role";

grant insert on table "public"."message_reactions" to "service_role";

grant references on table "public"."message_reactions" to "service_role";

grant select on table "public"."message_reactions" to "service_role";

grant trigger on table "public"."message_reactions" to "service_role";

grant truncate on table "public"."message_reactions" to "service_role";

grant update on table "public"."message_reactions" to "service_role";

grant delete on table "public"."message_read_receipts" to "anon";

grant insert on table "public"."message_read_receipts" to "anon";

grant references on table "public"."message_read_receipts" to "anon";

grant select on table "public"."message_read_receipts" to "anon";

grant trigger on table "public"."message_read_receipts" to "anon";

grant truncate on table "public"."message_read_receipts" to "anon";

grant update on table "public"."message_read_receipts" to "anon";

grant delete on table "public"."message_read_receipts" to "authenticated";

grant insert on table "public"."message_read_receipts" to "authenticated";

grant references on table "public"."message_read_receipts" to "authenticated";

grant select on table "public"."message_read_receipts" to "authenticated";

grant trigger on table "public"."message_read_receipts" to "authenticated";

grant truncate on table "public"."message_read_receipts" to "authenticated";

grant update on table "public"."message_read_receipts" to "authenticated";

grant delete on table "public"."message_read_receipts" to "service_role";

grant insert on table "public"."message_read_receipts" to "service_role";

grant references on table "public"."message_read_receipts" to "service_role";

grant select on table "public"."message_read_receipts" to "service_role";

grant trigger on table "public"."message_read_receipts" to "service_role";

grant truncate on table "public"."message_read_receipts" to "service_role";

grant update on table "public"."message_read_receipts" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."missed_workout_cron_log" to "anon";

grant insert on table "public"."missed_workout_cron_log" to "anon";

grant references on table "public"."missed_workout_cron_log" to "anon";

grant select on table "public"."missed_workout_cron_log" to "anon";

grant trigger on table "public"."missed_workout_cron_log" to "anon";

grant truncate on table "public"."missed_workout_cron_log" to "anon";

grant update on table "public"."missed_workout_cron_log" to "anon";

grant delete on table "public"."missed_workout_cron_log" to "authenticated";

grant insert on table "public"."missed_workout_cron_log" to "authenticated";

grant references on table "public"."missed_workout_cron_log" to "authenticated";

grant select on table "public"."missed_workout_cron_log" to "authenticated";

grant trigger on table "public"."missed_workout_cron_log" to "authenticated";

grant truncate on table "public"."missed_workout_cron_log" to "authenticated";

grant update on table "public"."missed_workout_cron_log" to "authenticated";

grant delete on table "public"."missed_workout_cron_log" to "service_role";

grant insert on table "public"."missed_workout_cron_log" to "service_role";

grant references on table "public"."missed_workout_cron_log" to "service_role";

grant select on table "public"."missed_workout_cron_log" to "service_role";

grant trigger on table "public"."missed_workout_cron_log" to "service_role";

grant truncate on table "public"."missed_workout_cron_log" to "service_role";

grant update on table "public"."missed_workout_cron_log" to "service_role";

grant delete on table "public"."musclewiki_api_audit_log" to "anon";

grant insert on table "public"."musclewiki_api_audit_log" to "anon";

grant references on table "public"."musclewiki_api_audit_log" to "anon";

grant select on table "public"."musclewiki_api_audit_log" to "anon";

grant trigger on table "public"."musclewiki_api_audit_log" to "anon";

grant truncate on table "public"."musclewiki_api_audit_log" to "anon";

grant update on table "public"."musclewiki_api_audit_log" to "anon";

grant delete on table "public"."musclewiki_api_audit_log" to "authenticated";

grant insert on table "public"."musclewiki_api_audit_log" to "authenticated";

grant references on table "public"."musclewiki_api_audit_log" to "authenticated";

grant select on table "public"."musclewiki_api_audit_log" to "authenticated";

grant trigger on table "public"."musclewiki_api_audit_log" to "authenticated";

grant truncate on table "public"."musclewiki_api_audit_log" to "authenticated";

grant update on table "public"."musclewiki_api_audit_log" to "authenticated";

grant delete on table "public"."musclewiki_api_audit_log" to "service_role";

grant insert on table "public"."musclewiki_api_audit_log" to "service_role";

grant references on table "public"."musclewiki_api_audit_log" to "service_role";

grant select on table "public"."musclewiki_api_audit_log" to "service_role";

grant trigger on table "public"."musclewiki_api_audit_log" to "service_role";

grant truncate on table "public"."musclewiki_api_audit_log" to "service_role";

grant update on table "public"."musclewiki_api_audit_log" to "service_role";

grant delete on table "public"."musclewiki_cache_population_log" to "anon";

grant insert on table "public"."musclewiki_cache_population_log" to "anon";

grant references on table "public"."musclewiki_cache_population_log" to "anon";

grant select on table "public"."musclewiki_cache_population_log" to "anon";

grant trigger on table "public"."musclewiki_cache_population_log" to "anon";

grant truncate on table "public"."musclewiki_cache_population_log" to "anon";

grant update on table "public"."musclewiki_cache_population_log" to "anon";

grant delete on table "public"."musclewiki_cache_population_log" to "authenticated";

grant insert on table "public"."musclewiki_cache_population_log" to "authenticated";

grant references on table "public"."musclewiki_cache_population_log" to "authenticated";

grant select on table "public"."musclewiki_cache_population_log" to "authenticated";

grant trigger on table "public"."musclewiki_cache_population_log" to "authenticated";

grant truncate on table "public"."musclewiki_cache_population_log" to "authenticated";

grant update on table "public"."musclewiki_cache_population_log" to "authenticated";

grant delete on table "public"."musclewiki_cache_population_log" to "service_role";

grant insert on table "public"."musclewiki_cache_population_log" to "service_role";

grant references on table "public"."musclewiki_cache_population_log" to "service_role";

grant select on table "public"."musclewiki_cache_population_log" to "service_role";

grant trigger on table "public"."musclewiki_cache_population_log" to "service_role";

grant truncate on table "public"."musclewiki_cache_population_log" to "service_role";

grant update on table "public"."musclewiki_cache_population_log" to "service_role";

grant delete on table "public"."musclewiki_exercise_cache" to "anon";

grant insert on table "public"."musclewiki_exercise_cache" to "anon";

grant references on table "public"."musclewiki_exercise_cache" to "anon";

grant select on table "public"."musclewiki_exercise_cache" to "anon";

grant trigger on table "public"."musclewiki_exercise_cache" to "anon";

grant truncate on table "public"."musclewiki_exercise_cache" to "anon";

grant update on table "public"."musclewiki_exercise_cache" to "anon";

grant delete on table "public"."musclewiki_exercise_cache" to "authenticated";

grant insert on table "public"."musclewiki_exercise_cache" to "authenticated";

grant references on table "public"."musclewiki_exercise_cache" to "authenticated";

grant select on table "public"."musclewiki_exercise_cache" to "authenticated";

grant trigger on table "public"."musclewiki_exercise_cache" to "authenticated";

grant truncate on table "public"."musclewiki_exercise_cache" to "authenticated";

grant update on table "public"."musclewiki_exercise_cache" to "authenticated";

grant delete on table "public"."musclewiki_exercise_cache" to "service_role";

grant insert on table "public"."musclewiki_exercise_cache" to "service_role";

grant references on table "public"."musclewiki_exercise_cache" to "service_role";

grant select on table "public"."musclewiki_exercise_cache" to "service_role";

grant trigger on table "public"."musclewiki_exercise_cache" to "service_role";

grant truncate on table "public"."musclewiki_exercise_cache" to "service_role";

grant update on table "public"."musclewiki_exercise_cache" to "service_role";

grant delete on table "public"."musclewiki_filter_cache" to "anon";

grant insert on table "public"."musclewiki_filter_cache" to "anon";

grant references on table "public"."musclewiki_filter_cache" to "anon";

grant select on table "public"."musclewiki_filter_cache" to "anon";

grant trigger on table "public"."musclewiki_filter_cache" to "anon";

grant truncate on table "public"."musclewiki_filter_cache" to "anon";

grant update on table "public"."musclewiki_filter_cache" to "anon";

grant delete on table "public"."musclewiki_filter_cache" to "authenticated";

grant insert on table "public"."musclewiki_filter_cache" to "authenticated";

grant references on table "public"."musclewiki_filter_cache" to "authenticated";

grant select on table "public"."musclewiki_filter_cache" to "authenticated";

grant trigger on table "public"."musclewiki_filter_cache" to "authenticated";

grant truncate on table "public"."musclewiki_filter_cache" to "authenticated";

grant update on table "public"."musclewiki_filter_cache" to "authenticated";

grant delete on table "public"."musclewiki_filter_cache" to "service_role";

grant insert on table "public"."musclewiki_filter_cache" to "service_role";

grant references on table "public"."musclewiki_filter_cache" to "service_role";

grant select on table "public"."musclewiki_filter_cache" to "service_role";

grant trigger on table "public"."musclewiki_filter_cache" to "service_role";

grant truncate on table "public"."musclewiki_filter_cache" to "service_role";

grant update on table "public"."musclewiki_filter_cache" to "service_role";

grant delete on table "public"."musclewiki_sync_metadata" to "anon";

grant insert on table "public"."musclewiki_sync_metadata" to "anon";

grant references on table "public"."musclewiki_sync_metadata" to "anon";

grant select on table "public"."musclewiki_sync_metadata" to "anon";

grant trigger on table "public"."musclewiki_sync_metadata" to "anon";

grant truncate on table "public"."musclewiki_sync_metadata" to "anon";

grant update on table "public"."musclewiki_sync_metadata" to "anon";

grant delete on table "public"."musclewiki_sync_metadata" to "authenticated";

grant insert on table "public"."musclewiki_sync_metadata" to "authenticated";

grant references on table "public"."musclewiki_sync_metadata" to "authenticated";

grant select on table "public"."musclewiki_sync_metadata" to "authenticated";

grant trigger on table "public"."musclewiki_sync_metadata" to "authenticated";

grant truncate on table "public"."musclewiki_sync_metadata" to "authenticated";

grant update on table "public"."musclewiki_sync_metadata" to "authenticated";

grant delete on table "public"."musclewiki_sync_metadata" to "service_role";

grant insert on table "public"."musclewiki_sync_metadata" to "service_role";

grant references on table "public"."musclewiki_sync_metadata" to "service_role";

grant select on table "public"."musclewiki_sync_metadata" to "service_role";

grant trigger on table "public"."musclewiki_sync_metadata" to "service_role";

grant truncate on table "public"."musclewiki_sync_metadata" to "service_role";

grant update on table "public"."musclewiki_sync_metadata" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."platform_addons" to "anon";

grant insert on table "public"."platform_addons" to "anon";

grant references on table "public"."platform_addons" to "anon";

grant select on table "public"."platform_addons" to "anon";

grant trigger on table "public"."platform_addons" to "anon";

grant truncate on table "public"."platform_addons" to "anon";

grant update on table "public"."platform_addons" to "anon";

grant delete on table "public"."platform_addons" to "authenticated";

grant insert on table "public"."platform_addons" to "authenticated";

grant references on table "public"."platform_addons" to "authenticated";

grant select on table "public"."platform_addons" to "authenticated";

grant trigger on table "public"."platform_addons" to "authenticated";

grant truncate on table "public"."platform_addons" to "authenticated";

grant update on table "public"."platform_addons" to "authenticated";

grant delete on table "public"."platform_addons" to "service_role";

grant insert on table "public"."platform_addons" to "service_role";

grant references on table "public"."platform_addons" to "service_role";

grant select on table "public"."platform_addons" to "service_role";

grant trigger on table "public"."platform_addons" to "service_role";

grant truncate on table "public"."platform_addons" to "service_role";

grant update on table "public"."platform_addons" to "service_role";

grant delete on table "public"."platform_billing_activity" to "anon";

grant insert on table "public"."platform_billing_activity" to "anon";

grant references on table "public"."platform_billing_activity" to "anon";

grant select on table "public"."platform_billing_activity" to "anon";

grant trigger on table "public"."platform_billing_activity" to "anon";

grant truncate on table "public"."platform_billing_activity" to "anon";

grant update on table "public"."platform_billing_activity" to "anon";

grant delete on table "public"."platform_billing_activity" to "authenticated";

grant insert on table "public"."platform_billing_activity" to "authenticated";

grant references on table "public"."platform_billing_activity" to "authenticated";

grant select on table "public"."platform_billing_activity" to "authenticated";

grant trigger on table "public"."platform_billing_activity" to "authenticated";

grant truncate on table "public"."platform_billing_activity" to "authenticated";

grant update on table "public"."platform_billing_activity" to "authenticated";

grant delete on table "public"."platform_billing_activity" to "service_role";

grant insert on table "public"."platform_billing_activity" to "service_role";

grant references on table "public"."platform_billing_activity" to "service_role";

grant select on table "public"."platform_billing_activity" to "service_role";

grant trigger on table "public"."platform_billing_activity" to "service_role";

grant truncate on table "public"."platform_billing_activity" to "service_role";

grant update on table "public"."platform_billing_activity" to "service_role";

grant delete on table "public"."platform_stripe_prices" to "anon";

grant insert on table "public"."platform_stripe_prices" to "anon";

grant references on table "public"."platform_stripe_prices" to "anon";

grant select on table "public"."platform_stripe_prices" to "anon";

grant trigger on table "public"."platform_stripe_prices" to "anon";

grant truncate on table "public"."platform_stripe_prices" to "anon";

grant update on table "public"."platform_stripe_prices" to "anon";

grant delete on table "public"."platform_stripe_prices" to "authenticated";

grant insert on table "public"."platform_stripe_prices" to "authenticated";

grant references on table "public"."platform_stripe_prices" to "authenticated";

grant select on table "public"."platform_stripe_prices" to "authenticated";

grant trigger on table "public"."platform_stripe_prices" to "authenticated";

grant truncate on table "public"."platform_stripe_prices" to "authenticated";

grant update on table "public"."platform_stripe_prices" to "authenticated";

grant delete on table "public"."platform_stripe_prices" to "service_role";

grant insert on table "public"."platform_stripe_prices" to "service_role";

grant references on table "public"."platform_stripe_prices" to "service_role";

grant select on table "public"."platform_stripe_prices" to "service_role";

grant trigger on table "public"."platform_stripe_prices" to "service_role";

grant truncate on table "public"."platform_stripe_prices" to "service_role";

grant update on table "public"."platform_stripe_prices" to "service_role";

grant delete on table "public"."platform_subscriptions" to "anon";

grant insert on table "public"."platform_subscriptions" to "anon";

grant references on table "public"."platform_subscriptions" to "anon";

grant select on table "public"."platform_subscriptions" to "anon";

grant trigger on table "public"."platform_subscriptions" to "anon";

grant truncate on table "public"."platform_subscriptions" to "anon";

grant update on table "public"."platform_subscriptions" to "anon";

grant delete on table "public"."platform_subscriptions" to "authenticated";

grant insert on table "public"."platform_subscriptions" to "authenticated";

grant references on table "public"."platform_subscriptions" to "authenticated";

grant select on table "public"."platform_subscriptions" to "authenticated";

grant trigger on table "public"."platform_subscriptions" to "authenticated";

grant truncate on table "public"."platform_subscriptions" to "authenticated";

grant update on table "public"."platform_subscriptions" to "authenticated";

grant delete on table "public"."platform_subscriptions" to "service_role";

grant insert on table "public"."platform_subscriptions" to "service_role";

grant references on table "public"."platform_subscriptions" to "service_role";

grant select on table "public"."platform_subscriptions" to "service_role";

grant trigger on table "public"."platform_subscriptions" to "service_role";

grant truncate on table "public"."platform_subscriptions" to "service_role";

grant update on table "public"."platform_subscriptions" to "service_role";

grant delete on table "public"."stripe_webhook_events" to "anon";

grant insert on table "public"."stripe_webhook_events" to "anon";

grant references on table "public"."stripe_webhook_events" to "anon";

grant select on table "public"."stripe_webhook_events" to "anon";

grant trigger on table "public"."stripe_webhook_events" to "anon";

grant truncate on table "public"."stripe_webhook_events" to "anon";

grant update on table "public"."stripe_webhook_events" to "anon";

grant delete on table "public"."stripe_webhook_events" to "authenticated";

grant insert on table "public"."stripe_webhook_events" to "authenticated";

grant references on table "public"."stripe_webhook_events" to "authenticated";

grant select on table "public"."stripe_webhook_events" to "authenticated";

grant trigger on table "public"."stripe_webhook_events" to "authenticated";

grant truncate on table "public"."stripe_webhook_events" to "authenticated";

grant update on table "public"."stripe_webhook_events" to "authenticated";

grant delete on table "public"."stripe_webhook_events" to "service_role";

grant insert on table "public"."stripe_webhook_events" to "service_role";

grant references on table "public"."stripe_webhook_events" to "service_role";

grant select on table "public"."stripe_webhook_events" to "service_role";

grant trigger on table "public"."stripe_webhook_events" to "service_role";

grant truncate on table "public"."stripe_webhook_events" to "service_role";

grant update on table "public"."stripe_webhook_events" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";


  create policy "ai_assistant_daily_usage_select_policy"
  on "public"."ai_assistant_daily_usage"
  as permissive
  for select
  to public
using ((coach_id = auth.uid()));



  create policy "ai_assistant_daily_usage_service_policy"
  on "public"."ai_assistant_daily_usage"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Service role can manage assistant todo log"
  on "public"."assistant_todo_cron_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "billing_activity_coach_select"
  on "public"."billing_activity"
  as permissive
  for select
  to authenticated
using ((coach_id = auth.uid()));



  create policy "billing_activity_service"
  on "public"."billing_activity"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "cb_manage"
  on "public"."client_bio"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "ccl_shared"
  on "public"."client_checkin_logs"
  as permissive
  for all
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)))
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cc_all"
  on "public"."client_checkins"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "cf_all"
  on "public"."client_files"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "cg_manage"
  on "public"."client_goals"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "chl_all"
  on "public"."client_habit_logs"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "ch_all"
  on "public"."client_habits"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "ci_manage"
  on "public"."client_injuries"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cml_all"
  on "public"."client_metric_logs"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "cm_all"
  on "public"."client_metrics"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "cn_manage"
  on "public"."client_notes"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "client_package_assignments_coach_delete"
  on "public"."client_package_assignments"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "client_package_assignments_coach_insert"
  on "public"."client_package_assignments"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "client_package_assignments_coach_update"
  on "public"."client_package_assignments"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "client_package_assignments_select"
  on "public"."client_package_assignments"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "client_package_assignments_service"
  on "public"."client_package_assignments"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "cpl_shared"
  on "public"."client_photo_logs"
  as permissive
  for all
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)))
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cp_delete"
  on "public"."client_profiles"
  as permissive
  for delete
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_profiles.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))));



  create policy "cp_insert_coach"
  on "public"."client_profiles"
  as permissive
  for insert
  to authenticated
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_profiles.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))));



  create policy "cp_select"
  on "public"."client_profiles"
  as permissive
  for select
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_profiles.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))));



  create policy "cp_update"
  on "public"."client_profiles"
  as permissive
  for update
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_profiles.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_profiles.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))));



  create policy "cpnl_service"
  on "public"."client_push_notification_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Clients can delete own push tokens"
  on "public"."client_push_tokens"
  as permissive
  for delete
  to authenticated
using ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "Clients can insert own push tokens"
  on "public"."client_push_tokens"
  as permissive
  for insert
  to authenticated
with check ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "Clients can update own push tokens"
  on "public"."client_push_tokens"
  as permissive
  for update
  to authenticated
using ((client_id = ( SELECT auth.uid() AS uid)))
with check ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "Clients can view own push tokens"
  on "public"."client_push_tokens"
  as permissive
  for select
  to authenticated
using ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "cq_delete"
  on "public"."client_questionnaires"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cq_insert"
  on "public"."client_questionnaires"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cq_select"
  on "public"."client_questionnaires"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "cq_update"
  on "public"."client_questionnaires"
  as permissive
  for update
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))))
with check (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "client_subscriptions_select"
  on "public"."client_subscriptions"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "client_subscriptions_service"
  on "public"."client_subscriptions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "ct_all"
  on "public"."client_tasks"
  as permissive
  for all
  to authenticated
using (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))))
with check (((client_id = ( SELECT auth.uid() AS uid)) OR (coach_id = ( SELECT auth.uid() AS uid))));



  create policy "ct_service"
  on "public"."client_tasks"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "ct_delete_coach"
  on "public"."client_training"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "ct_insert_coach"
  on "public"."client_training"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "ct_select"
  on "public"."client_training"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "ct_update_shared"
  on "public"."client_training"
  as permissive
  for update
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)))
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cteh_modify"
  on "public"."client_training_exercise_history"
  as permissive
  for all
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)))
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cth_delete"
  on "public"."client_training_history"
  as permissive
  for delete
  to public
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cth_insert"
  on "public"."client_training_history"
  as permissive
  for insert
  to public
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cth_select"
  on "public"."client_training_history"
  as permissive
  for select
  to public
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cth_update"
  on "public"."client_training_history"
  as permissive
  for update
  to public
using (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)))
with check (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = coach_id)));



  create policy "cts_client_insert"
  on "public"."client_training_summary"
  as permissive
  for insert
  to authenticated
with check ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "cts_client_update"
  on "public"."client_training_summary"
  as permissive
  for update
  to authenticated
using ((client_id = ( SELECT auth.uid() AS uid)))
with check ((client_id = ( SELECT auth.uid() AS uid)));



  create policy "cts_select"
  on "public"."client_training_summary"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = client_id) OR (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.client_id = client_training_summary.client_id) AND (cca.coach_id = ( SELECT auth.uid() AS uid)))))));



  create policy "cat_manage"
  on "public"."coach_auto_todolist"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cc_all"
  on "public"."coach_checkins"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cca_delete"
  on "public"."coach_client_assignments"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "cca_insert"
  on "public"."coach_client_assignments"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "cca_select"
  on "public"."coach_client_assignments"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = coach_id) OR (( SELECT auth.uid() AS uid) = client_id)));



  create policy "cca_update"
  on "public"."coach_client_assignments"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = coach_id))
with check ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "cci_delete"
  on "public"."coach_company_information"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cci_insert"
  on "public"."coach_company_information"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cci_select_public"
  on "public"."coach_company_information"
  as permissive
  for select
  to public
using (true);



  create policy "cci_update"
  on "public"."coach_company_information"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can manage own coupons"
  on "public"."coach_coupons"
  as permissive
  for all
  to public
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_entitlements_coach_select"
  on "public"."coach_entitlements"
  as permissive
  for select
  to authenticated
using ((coach_id = auth.uid()));



  create policy "coach_entitlements_service"
  on "public"."coach_entitlements"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "ce_manage"
  on "public"."coach_exercises"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_file_folders_delete_own"
  on "public"."coach_file_folders"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_file_folders_insert_own"
  on "public"."coach_file_folders"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_file_folders_select_own"
  on "public"."coach_file_folders"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_file_folders_update_own"
  on "public"."coach_file_folders"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cf_all"
  on "public"."coach_files"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cf_all"
  on "public"."coach_flows"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cgsc_coach_all"
  on "public"."coach_getting_started_checklist"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_habit_folders_delete_own"
  on "public"."coach_habit_folders"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_habit_folders_insert_own"
  on "public"."coach_habit_folders"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_habit_folders_select_own"
  on "public"."coach_habit_folders"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_habit_folders_update_own"
  on "public"."coach_habit_folders"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "ch_all"
  on "public"."coach_habits"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_metric_folders_delete_own"
  on "public"."coach_metric_folders"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_metric_folders_insert_own"
  on "public"."coach_metric_folders"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_metric_folders_select_own"
  on "public"."coach_metric_folders"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_metric_folders_update_own"
  on "public"."coach_metric_folders"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cm_all"
  on "public"."coach_metrics"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can insert own notification preferences"
  on "public"."coach_notification_preferences"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can update own notification preferences"
  on "public"."coach_notification_preferences"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can view own notification preferences"
  on "public"."coach_notification_preferences"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can delete own notifications"
  on "public"."coach_notifications"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can update own notifications"
  on "public"."coach_notifications"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can view own notifications"
  on "public"."coach_notifications"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "co_all"
  on "public"."coach_onboardings"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cot_manage"
  on "public"."coach_own_todolist"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_packages_coach_delete"
  on "public"."coach_packages"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_packages_coach_insert"
  on "public"."coach_packages"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_packages_coach_update"
  on "public"."coach_packages"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_packages_select"
  on "public"."coach_packages"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR ((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.coach_id = coach_packages.coach_id) AND (cca.client_id = ( SELECT auth.uid() AS uid)) AND (cca.status = 'accepted'::text)))))));



  create policy "coach_packages_service"
  on "public"."coach_packages"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "coach_p_delete"
  on "public"."coach_preferences"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_p_insert"
  on "public"."coach_preferences"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_p_select"
  on "public"."coach_preferences"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_p_update"
  on "public"."coach_preferences"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can read own profile"
  on "public"."coach_profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Coaches can update own profile"
  on "public"."coach_profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "System can insert coach profiles"
  on "public"."coach_profiles"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "coach_profiles_delete_own"
  on "public"."coach_profiles"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "cprog_manage"
  on "public"."coach_programs"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can delete own push tokens"
  on "public"."coach_push_tokens"
  as permissive
  for delete
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can insert own push tokens"
  on "public"."coach_push_tokens"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can update own push tokens"
  on "public"."coach_push_tokens"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can view own push tokens"
  on "public"."coach_push_tokens"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cq_all"
  on "public"."coach_questionnaires"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Coaches can view their referrals"
  on "public"."coach_referrals"
  as permissive
  for select
  to authenticated
using ((referrer_coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Service role full access"
  on "public"."coach_referrals"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "coach_sections_delete"
  on "public"."coach_sections"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "coach_sections_insert"
  on "public"."coach_sections"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "coach_sections_select"
  on "public"."coach_sections"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "coach_sections_update"
  on "public"."coach_sections"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = coach_id))
with check ((( SELECT auth.uid() AS uid) = coach_id));



  create policy "cs_all"
  on "public"."coach_sequences"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_stripe_accounts_coach_insert"
  on "public"."coach_stripe_accounts"
  as permissive
  for insert
  to authenticated
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_stripe_accounts_coach_select"
  on "public"."coach_stripe_accounts"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_stripe_accounts_coach_update"
  on "public"."coach_stripe_accounts"
  as permissive
  for update
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "coach_stripe_accounts_service"
  on "public"."coach_stripe_accounts"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Coaches can view own unique code"
  on "public"."coach_unique_codes"
  as permissive
  for select
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "cw_manage"
  on "public"."coach_workouts"
  as permissive
  for all
  to authenticated
using ((coach_id = ( SELECT auth.uid() AS uid)))
with check ((coach_id = ( SELECT auth.uid() AS uid)));



  create policy "Users update own participant records"
  on "public"."conversation_participants"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users view own participant records"
  on "public"."conversation_participants"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Participants can view presence"
  on "public"."conversation_presence"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = conversation_presence.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users can delete own presence"
  on "public"."conversation_presence"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can insert own presence"
  on "public"."conversation_presence"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can update own presence"
  on "public"."conversation_presence"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users create own conversations"
  on "public"."conversations"
  as permissive
  for insert
  to public
with check (((( SELECT auth.uid() AS uid) = coach_id) OR (( SELECT auth.uid() AS uid) = client_id)));



  create policy "Users view own conversations"
  on "public"."conversations"
  as permissive
  for select
  to public
using (((( SELECT auth.uid() AS uid) = coach_id) OR (( SELECT auth.uid() AS uid) = client_id)));



  create policy "feature_request_replies_delete"
  on "public"."feature_request_replies"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "feature_request_replies_insert"
  on "public"."feature_request_replies"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "feature_request_replies_select"
  on "public"."feature_request_replies"
  as permissive
  for select
  to public
using (true);



  create policy "feature_request_upvotes_delete"
  on "public"."feature_request_upvotes"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "feature_request_upvotes_insert"
  on "public"."feature_request_upvotes"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "feature_request_upvotes_select"
  on "public"."feature_request_upvotes"
  as permissive
  for select
  to public
using (true);



  create policy "feature_requests_delete"
  on "public"."feature_requests"
  as permissive
  for delete
  to public
using (((user_id = ( SELECT auth.uid() AS uid)) AND (status IS NULL)));



  create policy "feature_requests_insert"
  on "public"."feature_requests"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "feature_requests_select"
  on "public"."feature_requests"
  as permissive
  for select
  to public
using (true);



  create policy "feature_requests_update"
  on "public"."feature_requests"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "fecl_service"
  on "public"."flow_execution_cron_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "fel_auth_read"
  on "public"."flow_execution_log"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.flow_executions fe
  WHERE ((fe.id = flow_execution_log.execution_id) AND ((fe.coach_id = ( SELECT auth.uid() AS uid)) OR (fe.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "fel_service"
  on "public"."flow_execution_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "fe_auth_read"
  on "public"."flow_executions"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "fe_service"
  on "public"."flow_executions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "ftcl_service"
  on "public"."flow_trigger_cron_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage free trial expiry log"
  on "public"."free_trial_expiry_cron_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users update attachments in conversations"
  on "public"."message_attachments"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_attachments.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users upload attachments to conversations"
  on "public"."message_attachments"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_attachments.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users view attachments in conversations"
  on "public"."message_attachments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_attachments.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users add reactions"
  on "public"."message_reactions"
  as permissive
  for insert
  to public
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_reactions.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid))))))));



  create policy "Users remove own reactions"
  on "public"."message_reactions"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users view reactions"
  on "public"."message_reactions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_reactions.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users insert own read receipts"
  on "public"."message_read_receipts"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users update own read receipts"
  on "public"."message_read_receipts"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users view read receipts"
  on "public"."message_read_receipts"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = message_read_receipts.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users delete own messages"
  on "public"."messages"
  as permissive
  for delete
  to public
using ((sender_id = ( SELECT auth.uid() AS uid)));



  create policy "Users edit own messages"
  on "public"."messages"
  as permissive
  for update
  to public
using ((sender_id = ( SELECT auth.uid() AS uid)))
with check ((sender_id = ( SELECT auth.uid() AS uid)));



  create policy "Users send messages"
  on "public"."messages"
  as permissive
  for insert
  to public
with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid))))))));



  create policy "Users view own messages"
  on "public"."messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.coach_id = ( SELECT auth.uid() AS uid)) OR (c.client_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Service role can manage missed workout log"
  on "public"."missed_workout_cron_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "musclewiki_api_audit_log_select"
  on "public"."musclewiki_api_audit_log"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can view cache population log"
  on "public"."musclewiki_cache_population_log"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Service role can manage cache population log"
  on "public"."musclewiki_cache_population_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "musclewiki_exercise_cache_select"
  on "public"."musclewiki_exercise_cache"
  as permissive
  for select
  to public
using (true);



  create policy "musclewiki_filter_cache_select"
  on "public"."musclewiki_filter_cache"
  as permissive
  for select
  to public
using (true);



  create policy "musclewiki_sync_metadata_select"
  on "public"."musclewiki_sync_metadata"
  as permissive
  for select
  to public
using (true);



  create policy "payments_select"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using (((coach_id = ( SELECT auth.uid() AS uid)) OR (client_id = ( SELECT auth.uid() AS uid))));



  create policy "payments_service"
  on "public"."payments"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "platform_addons_coach_select"
  on "public"."platform_addons"
  as permissive
  for select
  to authenticated
using ((coach_id = auth.uid()));



  create policy "platform_addons_service"
  on "public"."platform_addons"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "platform_billing_activity_coach_select"
  on "public"."platform_billing_activity"
  as permissive
  for select
  to authenticated
using ((coach_id = auth.uid()));



  create policy "platform_billing_activity_service"
  on "public"."platform_billing_activity"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role full access"
  on "public"."platform_stripe_prices"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "platform_subscriptions_coach_select"
  on "public"."platform_subscriptions"
  as permissive
  for select
  to authenticated
using ((coach_id = auth.uid()));



  create policy "platform_subscriptions_service"
  on "public"."platform_subscriptions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "stripe_webhook_events_service"
  on "public"."stripe_webhook_events"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "System can insert profiles"
  on "public"."user_profiles"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Users can delete own profile"
  on "public"."user_profiles"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile"
  on "public"."user_profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view own profile and conversation participants"
  on "public"."user_profiles"
  as permissive
  for select
  to public
using (((id = ( SELECT auth.uid() AS uid)) OR (id IN ( SELECT DISTINCT
        CASE
            WHEN (conversations.coach_id = ( SELECT auth.uid() AS uid)) THEN conversations.client_id
            WHEN (conversations.client_id = ( SELECT auth.uid() AS uid)) THEN conversations.coach_id
            ELSE NULL::uuid
        END AS "case"
   FROM public.conversations
  WHERE (((conversations.coach_id = ( SELECT auth.uid() AS uid)) OR (conversations.client_id = ( SELECT auth.uid() AS uid))) AND (
        CASE
            WHEN (conversations.coach_id = ( SELECT auth.uid() AS uid)) THEN conversations.client_id
            WHEN (conversations.client_id = ( SELECT auth.uid() AS uid)) THEN conversations.coach_id
            ELSE NULL::uuid
        END IS NOT NULL))))));


CREATE TRIGGER update_ai_assistant_daily_usage_updated_at BEFORE UPDATE ON public.ai_assistant_daily_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_cb_integrity BEFORE INSERT OR UPDATE ON public.client_bio FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();

CREATE TRIGGER trg_cb_updated_at BEFORE UPDATE ON public.client_bio FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_checkin_log_integrity_trigger BEFORE INSERT OR UPDATE ON public.client_checkin_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_checkin_log_integrity();

CREATE TRIGGER trg_checkin_log_complete_task AFTER INSERT ON public.client_checkin_logs FOR EACH ROW EXECUTE FUNCTION public.trg_delete_task_on_checkin_submit();

CREATE TRIGGER trg_cc_coach_id BEFORE INSERT ON public.client_checkins FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();

CREATE TRIGGER trg_cca_updated_at BEFORE UPDATE ON public.client_checkins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checkin_delete_tasks AFTER DELETE ON public.client_checkins FOR EACH ROW EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

CREATE TRIGGER trg_cf_coach_id BEFORE INSERT ON public.client_files FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();

CREATE TRIGGER trg_cfa_updated_at BEFORE UPDATE ON public.client_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cg_integrity BEFORE INSERT OR UPDATE ON public.client_goals FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();

CREATE TRIGGER trg_cg_updated_at BEFORE UPDATE ON public.client_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_habit_log_integrity_trigger BEFORE INSERT OR UPDATE ON public.client_habit_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_habit_log_integrity();

CREATE TRIGGER trg_habit_log_complete_task AFTER INSERT OR UPDATE ON public.client_habit_logs FOR EACH ROW EXECUTE FUNCTION public.trg_delete_task_on_habit_log();

CREATE TRIGGER trg_ch_coach_id BEFORE INSERT ON public.client_habits FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();

CREATE TRIGGER trg_cha_updated_at BEFORE UPDATE ON public.client_habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_habit_delete_tasks AFTER DELETE ON public.client_habits FOR EACH ROW EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

CREATE TRIGGER trg_ci_integrity BEFORE INSERT OR UPDATE ON public.client_injuries FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();

CREATE TRIGGER trg_ci_updated_at BEFORE UPDATE ON public.client_injuries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_metric_log_integrity_trigger BEFORE INSERT OR UPDATE ON public.client_metric_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_metric_log_integrity();

CREATE TRIGGER trg_metric_log_complete_task AFTER INSERT OR UPDATE ON public.client_metric_logs FOR EACH ROW EXECUTE FUNCTION public.trg_delete_task_on_metric_log();

CREATE TRIGGER trg_cm_coach_id BEFORE INSERT ON public.client_metrics FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();

CREATE TRIGGER trg_cma_updated_at BEFORE UPDATE ON public.client_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_metric_delete_tasks AFTER DELETE ON public.client_metrics FOR EACH ROW EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

CREATE TRIGGER trg_cn_integrity BEFORE INSERT OR UPDATE ON public.client_notes FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_private_integrity();

CREATE TRIGGER trg_cn_updated_at BEFORE UPDATE ON public.client_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_client_package_assignments_updated_at BEFORE UPDATE ON public.client_package_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enforce_photo_log_integrity_trigger BEFORE INSERT OR UPDATE ON public.client_photo_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_photo_log_integrity();

CREATE TRIGGER trg_client_account_deletion BEFORE DELETE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_client_account_deletion();

CREATE TRIGGER trg_client_auth_cleanup AFTER DELETE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_client_auth_cleanup();

CREATE TRIGGER trg_cp_protect BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_client_profile_fields();

CREATE TRIGGER trg_cp_updated_at BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cq_coach_id BEFORE INSERT ON public.client_questionnaires FOR EACH ROW EXECUTE FUNCTION public.set_client_item_coach_id();

CREATE TRIGGER trg_cqa_updated_at BEFORE UPDATE ON public.client_questionnaires FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_questionnaire_complete_task AFTER UPDATE ON public.client_questionnaires FOR EACH ROW EXECUTE FUNCTION public.trg_delete_task_on_questionnaire_complete();

CREATE TRIGGER trg_questionnaire_delete_tasks AFTER DELETE ON public.client_questionnaires FOR EACH ROW EXECUTE FUNCTION public.trg_delete_tasks_on_assignment_delete();

CREATE TRIGGER trg_questionnaire_pending AFTER INSERT OR UPDATE ON public.client_questionnaires FOR EACH ROW EXECUTE FUNCTION public.trg_questionnaire_task_on_pending();

CREATE TRIGGER trg_client_subscriptions_updated_at BEFORE UPDATE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cts_audit BEFORE INSERT OR UPDATE ON public.client_training_summary FOR EACH ROW EXECUTE FUNCTION public.set_training_summary_updated_by();

CREATE TRIGGER trg_cat_client_integrity BEFORE INSERT OR UPDATE ON public.coach_auto_todolist FOR EACH ROW EXECUTE FUNCTION public.enforce_todolist_client_belongs_to_coach();

CREATE TRIGGER trg_cat_updated_at BEFORE UPDATE ON public.coach_auto_todolist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cc_updated_at BEFORE UPDATE ON public.coach_checkins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_checkin_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_checkins FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER trg_cca_updated_at BEFORE UPDATE ON public.coach_client_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_create_conversation_on_client_assignment AFTER INSERT OR UPDATE OF status ON public.coach_client_assignments FOR EACH ROW EXECUTE FUNCTION public.create_conversation_on_client_assignment();

CREATE TRIGGER trg_coach_company_updated_at BEFORE UPDATE ON public.coach_company_information FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_discount_codes_updated_at BEFORE UPDATE ON public.coach_coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_entitlements_updated_at BEFORE UPDATE ON public.coach_entitlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ce_updated_at BEFORE UPDATE ON public.coach_exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checklist_custom_exercises AFTER INSERT ON public.coach_exercises FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_custom_exercises();

CREATE TRIGGER trg_resolve_exercise_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_exercises FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER update_coach_file_folders_updated_at BEFORE UPDATE ON public.coach_file_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_cf_block_path_change BEFORE UPDATE OF file_path ON public.coach_files FOR EACH ROW EXECUTE FUNCTION public.block_file_path_change();

CREATE TRIGGER trg_cf_updated_at BEFORE UPDATE ON public.coach_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checklist_on_demand_resources AFTER INSERT ON public.coach_files FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_on_demand_resources();

CREATE TRIGGER trg_checklist_powerful_flows AFTER INSERT OR UPDATE ON public.coach_flows FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_powerful_flows();

CREATE TRIGGER trg_flows_updated_at BEFORE UPDATE ON public.coach_flows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_flow_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_flows FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER trg_cgsc_updated_at BEFORE UPDATE ON public.coach_getting_started_checklist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_coach_habit_folders_updated_at BEFORE UPDATE ON public.coach_habit_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ch_updated_at BEFORE UPDATE ON public.coach_habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checklist_lifestyle_habits AFTER INSERT ON public.coach_habits FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_lifestyle_habits();

CREATE TRIGGER trg_resolve_habit_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_habits FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER update_coach_metric_folders_updated_at BEFORE UPDATE ON public.coach_metric_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_checklist_track_metrics AFTER INSERT ON public.coach_metrics FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_track_metrics();

CREATE TRIGGER trg_cm_updated_at BEFORE UPDATE ON public.coach_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_metric_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_metrics FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER "Coach push notifications" AFTER INSERT ON public.coach_notifications FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://bxgbbpiswmauqdqkkaha.supabase.co/functions/v1/coach-push-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer SUPABASE_SERVICE_ROLE_KEY_REDACTED"}', '{}', '5000');

CREATE TRIGGER trg_checklist_automate_onboardings AFTER INSERT ON public.coach_onboardings FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_automate_onboardings();

CREATE TRIGGER trg_onboardings_updated_at BEFORE UPDATE ON public.coach_onboardings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cot_client_integrity BEFORE INSERT OR UPDATE ON public.coach_own_todolist FOR EACH ROW EXECUTE FUNCTION public.enforce_todolist_client_belongs_to_coach();

CREATE TRIGGER trg_cot_updated_at BEFORE UPDATE ON public.coach_own_todolist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_packages_updated_at BEFORE UPDATE ON public.coach_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_preferences_updated_at BEFORE UPDATE ON public.coach_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_account_deletion BEFORE DELETE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_coach_account_deletion();

CREATE TRIGGER trg_coach_auth_cleanup AFTER DELETE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_coach_auth_cleanup();

CREATE TRIGGER trigger_coach_referral AFTER INSERT OR UPDATE OF referrer_coach_id ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_coach_referral();

CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_checklist_program_templates AFTER INSERT ON public.coach_programs FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_program_templates();

CREATE TRIGGER trg_cprog_updated_at BEFORE UPDATE ON public.coach_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_program_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_programs FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER trg_checklist_check_ins_forms_q AFTER INSERT ON public.coach_questionnaires FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_check_ins_forms_questionnaire();

CREATE TRIGGER trg_cq_updated_at BEFORE UPDATE ON public.coach_questionnaires FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_questionnaire_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_questionnaires FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER update_coach_referrals_updated_at BEFORE UPDATE ON public.coach_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_resolve_section_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_sections FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON public.coach_sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coach_stripe_accounts_updated_at BEFORE UPDATE ON public.coach_stripe_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checklist_workout_ai AFTER INSERT ON public.coach_workouts FOR EACH ROW EXECUTE FUNCTION public.mark_checklist_workout_ai();

CREATE TRIGGER trg_cw_updated_at BEFORE UPDATE ON public.coach_workouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resolve_workout_name_conflict BEFORE INSERT OR UPDATE OF name ON public.coach_workouts FOR EACH ROW EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON public.conversation_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_create_participant_records AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.create_participant_records();

CREATE TRIGGER trg_fru_decrement_count AFTER DELETE ON public.feature_request_upvotes FOR EACH ROW EXECUTE FUNCTION public.decrement_upvote_count();

CREATE TRIGGER trg_fru_increment_count AFTER INSERT ON public.feature_request_upvotes FOR EACH ROW EXECUTE FUNCTION public.increment_upvote_count();

CREATE TRIGGER trg_fr_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_flow_executions_updated_at BEFORE UPDATE ON public.flow_executions FOR EACH ROW EXECUTE FUNCTION public.update_flow_executions_updated_at();

CREATE TRIGGER trg_check_attachments_complete AFTER INSERT OR UPDATE OF upload_status ON public.message_attachments FOR EACH ROW WHEN ((new.upload_status = 'completed'::text)) EXECUTE FUNCTION public.check_attachments_complete();

CREATE TRIGGER trg_broadcast_message_on_reaction AFTER INSERT OR DELETE OR UPDATE ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION public.broadcast_message_on_reaction();

CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON public.message_read_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_message_status_on_read AFTER INSERT OR UPDATE OF last_read_at ON public.message_read_receipts FOR EACH ROW EXECUTE FUNCTION public.update_message_status_on_read();

CREATE TRIGGER messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://bxgbbpiswmauqdqkkaha.supabase.co/functions/v1/message-push-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer SUPABASE_SERVICE_ROLE_KEY_REDACTED"}', '{}', '5000');

CREATE TRIGGER trg_broadcast_message_changes AFTER INSERT OR DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.broadcast_message_changes();

CREATE TRIGGER trg_update_conversation_on_message AFTER INSERT OR UPDATE OF content, is_deleted, message_type ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

CREATE TRIGGER trg_mwec_updated_at BEFORE UPDATE ON public.musclewiki_exercise_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_mwfc_updated_at BEFORE UPDATE ON public.musclewiki_filter_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_mwsm_updated_at BEFORE UPDATE ON public.musclewiki_sync_metadata FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_platform_addons_updated_at BEFORE UPDATE ON public.platform_addons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sync_entitlements_on_addon AFTER INSERT OR DELETE OR UPDATE ON public.platform_addons FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_entitlements();

CREATE TRIGGER trg_platform_subscriptions_updated_at BEFORE UPDATE ON public.platform_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sync_entitlements_on_subscription AFTER INSERT OR DELETE OR UPDATE ON public.platform_subscriptions FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_entitlements();

CREATE TRIGGER on_coach_profile_created AFTER INSERT ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_coach_setup();

CREATE TRIGGER on_user_profile_deleted AFTER DELETE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_user_profile_delete();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW WHEN ((((old.email)::text IS DISTINCT FROM (new.email)::text) OR (old.raw_user_meta_data IS DISTINCT FROM new.raw_user_meta_data))) EXECUTE FUNCTION public.handle_user_update();


  create policy "Allow authenticated users to delete realtime messages"
  on "realtime"."messages"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow authenticated users to receive realtime messages"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to send realtime messages"
  on "realtime"."messages"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to update realtime messages"
  on "realtime"."messages"
  as permissive
  for update
  to authenticated
using (true)
with check (true);


drop trigger if exists "objects_delete_delete_prefix" on "storage"."objects";

drop trigger if exists "objects_insert_create_prefix" on "storage"."objects";

drop trigger if exists "objects_update_create_prefix" on "storage"."objects";

drop trigger if exists "prefixes_create_hierarchy" on "storage"."prefixes";

drop trigger if exists "prefixes_delete_hierarchy" on "storage"."prefixes";


  create policy "Coaches can delete company logo"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Coaches can update company logo"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Coaches can upload company logo"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'coach-company'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));



  create policy "Public company logos are viewable by anyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'coach-company'::text));



  create policy "Public profile pictures are viewable by anyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-pictures'::text));



  create policy "Users can delete own profile picture"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own profile picture"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload own profile picture"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'profile-pictures'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "storage_client_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'coach_files'::text) AND (EXISTS ( SELECT 1
   FROM public.client_files cf
  WHERE ((cf.client_id = auth.uid()) AND (cf.file_path = objects.name))))));



  create policy "storage_client_read_own_photos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'client_photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



  create policy "storage_coach_manage"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'coach_files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'coach_files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "storage_coach_manage_client_photos"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'client_photos'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.coach_id = ( SELECT auth.uid() AS uid)) AND ((cca.client_id)::text = (storage.foldername(objects.name))[1]))))))
with check (((bucket_id = 'client_photos'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.coach_id = ( SELECT auth.uid() AS uid)) AND ((cca.client_id)::text = (storage.foldername(objects.name))[1]))))));



  create policy "storage_form_files_client_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'form_files'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



  create policy "storage_form_files_client_upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'form_files'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



  create policy "storage_form_files_coach_manage"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'form_files'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.coach_id = ( SELECT auth.uid() AS uid)) AND ((cca.client_id)::text = (storage.foldername(objects.name))[1]))))))
with check (((bucket_id = 'form_files'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM public.coach_client_assignments cca
  WHERE ((cca.coach_id = ( SELECT auth.uid() AS uid)) AND ((cca.client_id)::text = (storage.foldername(objects.name))[1]))))));



  create policy "storage_message_attachments_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM (public.message_attachments ma
     JOIN public.conversations c ON ((c.id = ma.conversation_id)))
  WHERE ((ma.file_path = objects.name) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));



  create policy "storage_message_attachments_upload"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'message_attachments'::text) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE (((c.id)::text = split_part(objects.name, '/'::text, 1)) AND ((c.coach_id = auth.uid()) OR (c.client_id = auth.uid())))))));


CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


