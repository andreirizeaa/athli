

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_check_in_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare remaining int;
begin
  if OLD.lift_date = CURRENT_DATE then
    select count(*) into remaining
    from public.lifts
    where user_id = OLD.user_id
      and lift_date = CURRENT_DATE;

    if remaining = 0 then
      delete from public.user_check_ins
      where user_id = OLD.user_id and "date" = CURRENT_DATE;
    end if;
  end if;
  return OLD;
end;
$$;


ALTER FUNCTION "public"."cleanup_check_in_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_check_in_on_lift_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  d date;
begin
  -- Normalize to date in case lift_date is timestamp
  d := (OLD.lift_date)::date;

  -- If no more lifts exist for this user on that date, remove the check-in
  if not exists (
    select 1
    from public.lifts l
    where l.user_id = OLD.user_id
      and (l.lift_date)::date = d
  ) then
    delete from public.user_check_ins u
    where u.user_id = OLD.user_id
      and u."date" = d;

    -- optional log
    raise log '[cleanup_check_in_on_lift_delete] removed check-in for user %, date %', OLD.user_id, d;
  end if;

  return OLD;
end;
$$;


ALTER FUNCTION "public"."cleanup_check_in_on_lift_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_job_on_lift_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int := 0;
begin
  delete from public.jobs j
   where j.id = new.asset_id
     and j.user_id = new.user_id
  returning 1 into v_count;

  -- optional: server log line you can see in Logs Explorer
  raise log '[cleanup_job_on_lift_insert] deleted % job(s) for user %, id %',
            coalesce(v_count,0), new.user_id, new.asset_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."cleanup_job_on_lift_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_streak_for"("u" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
with days as (
  select date::date
  from public.user_check_ins
  where user_id = u
),
series as (
  select generate_series(0, 365) as diff  -- limit to a year back, tune as needed
),
today as (
  select (now() at time zone 'UTC')::date as d
),
hits as (
  select s.diff, (t.d - s.diff) as day
  from series s cross join today t
),
streak as (
  select count(*) as c
  from hits h
  where exists (select 1 from days d where d.date = h.day)
    and not exists (
      select 1
      from hits h2
      where h2.diff < h.diff
        and not exists (select 1 from days d2 where d2.date = h2.day)
    )
)
select coalesce((select c from streak), 0);
$$;


ALTER FUNCTION "public"."current_streak_for"("u" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_job_on_lift_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  v_deleted int;
begin
  -- Log what we're seeing at runtime
  RAISE LOG 'delete_job_on_lift_insert: new.asset_id=% new.user_id=%', NEW.asset_id, NEW.user_id;

  delete from public.jobs j
  where j.id = NEW.asset_id
    and j.user_id = NEW.user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE LOG 'delete_job_on_lift_insert: deleted rows=%', v_deleted;

  return NEW; -- AFTER trigger return value is ignored, but returning NEW is conventional
end;$$;


ALTER FUNCTION "public"."delete_job_on_lift_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_sent_subscription_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.sent_at is not null then
    delete from subscription_notifications_queue where id = new.id;
  end if;
  return null; -- row is gone after delete
end;
$$;


ALTER FUNCTION "public"."delete_sent_subscription_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_check_in_after_lift"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$BEGIN
return NEW;
END;$$;


ALTER FUNCTION "public"."ensure_check_in_after_lift"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_check_in_after_upsert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  d date;
begin
  -- Always normalize lift_date to a pure UTC date
  d := (NEW.lift_date at time zone 'UTC')::date;

  -- INSERT or UPDATE: only insert if d = today's UTC date
  if d = (now() at time zone 'UTC')::date then
    insert into public.user_check_ins(user_id, "date")
    values (NEW.user_id, d)
    on conflict (user_id, "date") do nothing;
  end if;

  return NEW;
end;$$;


ALTER FUNCTION "public"."ensure_check_in_after_upsert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lift_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Delete related jobs
  raise warning 'Deleting from jobs: %', row_to_json(old);
  delete from jobs j
  where j.user_id = old.user_id
    and j.asset_id = old.asset_id;

  return old;
end;
$$;


ALTER FUNCTION "public"."handle_lift_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lift_failure_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin

  -- Delete related jobs by asset_id + user_id
  delete from public.jobs j
  where j.user_id = old.user_id
    and j.asset_id = old.asset_id;

  return old;
end;
$$;


ALTER FUNCTION "public"."handle_lift_failure_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lifts_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin

  -- If is_valid is exactly 'TRUE', continue as normal
  if new.is_valid = 'TRUE' then
    return new;
  end if;

  -- Otherwise, insert into lift_failures with reason only if not already present
  if not exists (
    select 1
    from lift_failures lf
    where lf.user_id = new.user_id
      and lf.lift_id = new.id
      and lf.asset_id = new.asset_id
  ) then
    if new.is_valid = 'FALSE' then
      insert into lift_failures (user_id, lift_id, asset_id, error)
      values (new.user_id, new.id, new.asset_id, 'NO_GYM_VIDEO_FOUND');
    elsif new.is_valid = 'WRONG_MOVEMENT' then
      insert into lift_failures (user_id, lift_id, asset_id, error)
      values (new.user_id, new.id, new.asset_id, 'WRONG_MOVEMENT');
    else
      -- Catch-all for any unexpected value (null, typo, etc.)
      insert into lift_failures (user_id, lift_id, asset_id, error)
      values (new.user_id, new.id, new.asset_id, 'UNKNOWN_ERROR');
    end if;
  end if;

  -- Cancel the original insert into lifts
  return null;
end;$$;


ALTER FUNCTION "public"."handle_lifts_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  name_from_meta text;
begin
  -- Try several places for a name (works better for Apple/Google)
  select coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    (select i.identity_data ->> 'name'
       from auth.identities i
      where i.user_id = new.id
      limit 1),
    (select trim(
              coalesce(i.identity_data->>'given_name','') || ' ' ||
              coalesce(i.identity_data->>'family_name',''))
       from auth.identities i
      where i.user_id = new.id
        and (i.identity_data ? 'given_name' or i.identity_data ? 'family_name')
      limit 1)
  ) into name_from_meta;

  insert into public.users (
    id,
    email,
    full_name,
    profile_picture,            -- ✅ added field
    created_at,
    sign_in_method
  )
  values (
    new.id,
    new.email,
    nullif(name_from_meta, ''),  -- only set if non-empty
    new.raw_user_meta_data ->> 'avatar_url',  -- ✅ new field value
    coalesce(new.created_at, now()),
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do update
     set email           = excluded.email,                      -- keep email fresh
         full_name       = coalesce(public.users.full_name, excluded.full_name),  -- only fill if null
         profile_picture = coalesce(public.users.profile_picture, excluded.profile_picture),  -- ✅ new logic
         sign_in_method  = coalesce(public.users.sign_in_method, excluded.sign_in_method);

  return new;
end;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_req_id bigint;
  v_jwt text;
begin
  -- fetch JWT from Vault once
  select decrypted_secret
    into v_jwt
  from vault.decrypted_secrets
  where name = 'edge_fn_jwt';

  -- call Edge Function #1: delete-auth-user
  v_req_id := net.http_post(
    url     := 'https://dsvyhorkfdcqjrjiqefe.functions.supabase.co/delete-auth-user',
    headers := jsonb_build_object(
                 'Content-Type','application/json',
                 'Authorization','Bearer ' || v_jwt
               ),
    body    := jsonb_build_object('user_id', old.user_id)
  );

  -- call Edge Function #2: delete-user-storage
  v_req_id := net.http_post(
    url     := 'https://dsvyhorkfdcqjrjiqefe.functions.supabase.co/delete-user-storage',
    headers := jsonb_build_object(
                 'Content-Type','application/json',
                 'Authorization','Bearer ' || v_jwt
               ),
    body    := jsonb_build_object('user_id', old.user_id)
  );

  return old;
end;
$$;


ALTER FUNCTION "public"."handle_user_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_lift_failure"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin

  -- Only insert if the new status is 'failed'
  if new.status = 'failed' and (old.status is distinct from new.status) then
    -- Only insert if no existing row matches user_id + lift_id + asset_id
    if not exists (
      select 1
      from lift_failures lf
      where lf.user_id = new.user_id
        and lf.lift_id = new.lift_id   -- assuming new.lift_id is your lift_id
        and lf.asset_id = new.asset_id
    ) then
      insert into lift_failures (user_id, lift_id, asset_id, error)
      values (new.user_id, new.lift_id, new.asset_id, 'ERROR_OCCURED');
      
      raise notice 'Inserted into lift_failures for user_id=%, lift_id=%, asset_id=%',
        new.user_id, new.lift_id, new.asset_id;
    end if;
  end if;

  return new;
end;$$;


ALTER FUNCTION "public"."insert_lift_failure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_block_when_lift_exists"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if exists (
    select 1 from public.lifts l
     where l.asset_id = new.id
       and l.user_id  = new.user_id
  ) then
    -- skip creating (or re-creating) this job
    raise log '[jobs_block_when_lift_exists] skipped job insert for user %, id % (lift exists)',
              new.user_id, new.id;
    return null;  -- CANCEL the insert
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."jobs_block_when_lift_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_auth_user_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  name_from_meta text;
begin
  -- Try several places for a name (works better for Apple/Google)
  select coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    (select i.identity_data ->> 'name'
       from auth.identities i
      where i.user_id = new.id
      limit 1),
    (select trim(
              coalesce(i.identity_data->>'given_name','') || ' ' ||
              coalesce(i.identity_data->>'family_name',''))
       from auth.identities i
      where i.user_id = new.id
        and (i.identity_data ? 'given_name' or i.identity_data ? 'family_name')
      limit 1)
  ) into name_from_meta;

  insert into public.users (user_id, email, full_name, created_at)
  values (new.id, new.email, nullif(name_from_meta, ''), coalesce(new.created_at, now()))
  on conflict (user_id) do update
     set email      = excluded.email,
         full_name  = coalesce(public.users.full_name, excluded.full_name),
         updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."on_auth_user_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_whats_new"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Must be a JSON array
  if jsonb_typeof(new.whats_new) <> 'array' then
    raise exception 'whats_new must be a JSON array';
  end if;

  -- Must have at least one element
  if jsonb_array_length(new.whats_new) < 1 then
    raise exception 'whats_new must have at least one entry';
  end if;

  -- Check that every element is a string
  if exists (
    select 1
    from jsonb_array_elements(new.whats_new) elem
    where jsonb_typeof(elem) <> 'string'
  ) then
    raise exception 'whats_new must only contain strings';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_whats_new"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "version" "text" NOT NULL,
    "force_show" boolean DEFAULT false NOT NULL,
    "force_update" boolean DEFAULT false NOT NULL,
    "whats_new" "jsonb" DEFAULT '["Performance improvements"]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "lift_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" DEFAULT 'lift_analysis'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "is_streak" boolean DEFAULT false,
    "asset_id" "text" NOT NULL
);

ALTER TABLE ONLY "public"."jobs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lift_failures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lift_id" "text" NOT NULL,
    "asset_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "error" "text" NOT NULL
);


ALTER TABLE "public"."lift_failures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_favourite" boolean DEFAULT false NOT NULL,
    "lift_type" "text" NOT NULL,
    "lift_date" "date" NOT NULL,
    "metric_weight" numeric(8,2) NOT NULL,
    "reps" integer NOT NULL,
    "raw_video_url" "text" NOT NULL,
    "pose_video_url" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "analysis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lift_time" "text" NOT NULL,
    "asset_id" "text" NOT NULL,
    "is_valid" "text" NOT NULL,
    CONSTRAINT "lift_data_reps_check" CHECK (("reps" > 0)),
    CONSTRAINT "lift_data_weight_value_check" CHECK (("metric_weight" >= (0)::numeric))
);

ALTER TABLE ONLY "public"."lifts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."lifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_overrides" (
    "id" "text" DEFAULT 'global'::"text" NOT NULL,
    "status" boolean DEFAULT false NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_notifications_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "expo_push_token" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "send_at" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone
);


ALTER TABLE "public"."subscription_notifications_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
)
PARTITION BY RANGE ("date");


ALTER TABLE "public"."user_check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2025_08" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2025_08" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2025_09" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2025_09" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2025_10" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2025_10" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2025_11" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2025_11" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2025_12" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2025_12" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_01" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_01" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_02" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_02" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_03" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_04" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_05" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_06" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_07" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_07" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_08" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_08" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_09" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_09" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_10" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_10" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_11" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_11" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_check_ins_2026_12" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL
);


ALTER TABLE "public"."user_check_ins_2026_12" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_info" (
    "user_id" "uuid" NOT NULL,
    "unit_system" "text",
    "metric_height" numeric,
    "metric_weight" numeric,
    "age_range" "text",
    "gender" "text",
    "language" "text",
    "walkthrough_completed" boolean DEFAULT false NOT NULL,
    "has_rated" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "referral_code" "text",
    CONSTRAINT "user_info_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['metric'::"text", 'imperial'::"text"])))
);


ALTER TABLE "public"."user_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "user_id" "uuid" NOT NULL,
    "expo_push_notification" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_onboarding" (
    "user_id" "uuid" NOT NULL,
    "workouts_per_week" "text",
    "discovery_source" "text",
    "training_reason" "text",
    "gym_challenge" "text",
    "lifter_type" "text",
    "perfect_form_goal" "text",
    "form_confidence" "text",
    "three_month_goal" "text",
    "has_personal_trainer" boolean,
    "onboarding_completed" boolean,
    "sign_in_method" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_onboarding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_valid" boolean DEFAULT true,
    "profile_picture" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2025_08" FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2025_09" FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2025_10" FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2025_11" FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2025_12" FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_01" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_02" FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_03" FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_04" FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_05" FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_06" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_07" FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_08" FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_09" FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_10" FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_11" FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');



ALTER TABLE ONLY "public"."user_check_ins" ATTACH PARTITION "public"."user_check_ins_2026_12" FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');



ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("lift_id", "user_id", "asset_id");



ALTER TABLE ONLY "public"."lift_failures"
    ADD CONSTRAINT "lift_failures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifts"
    ADD CONSTRAINT "lifts_pkey" PRIMARY KEY ("id", "user_id", "asset_id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."review_overrides"
    ADD CONSTRAINT "review_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_notifications_queue"
    ADD CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_check_ins"
    ADD CONSTRAINT "user_check_ins_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2025_08"
    ADD CONSTRAINT "user_check_ins_2025_08_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2025_09"
    ADD CONSTRAINT "user_check_ins_2025_09_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2025_10"
    ADD CONSTRAINT "user_check_ins_2025_10_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2025_11"
    ADD CONSTRAINT "user_check_ins_2025_11_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2025_12"
    ADD CONSTRAINT "user_check_ins_2025_12_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_01"
    ADD CONSTRAINT "user_check_ins_2026_01_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_02"
    ADD CONSTRAINT "user_check_ins_2026_02_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_03"
    ADD CONSTRAINT "user_check_ins_2026_03_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_04"
    ADD CONSTRAINT "user_check_ins_2026_04_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_05"
    ADD CONSTRAINT "user_check_ins_2026_05_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_06"
    ADD CONSTRAINT "user_check_ins_2026_06_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_07"
    ADD CONSTRAINT "user_check_ins_2026_07_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_08"
    ADD CONSTRAINT "user_check_ins_2026_08_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_09"
    ADD CONSTRAINT "user_check_ins_2026_09_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_10"
    ADD CONSTRAINT "user_check_ins_2026_10_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_11"
    ADD CONSTRAINT "user_check_ins_2026_11_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_check_ins_2026_12"
    ADD CONSTRAINT "user_check_ins_2026_12_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_info"
    ADD CONSTRAINT "user_info_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_onboarding"
    ADD CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "jobs_user_id_idx" ON "public"."jobs" USING "btree" ("user_id");



CREATE INDEX "lift_data_lift_date_idx" ON "public"."lifts" USING "btree" ("lift_date" DESC);



CREATE INDEX "lift_data_user_id_idx" ON "public"."lifts" USING "btree" ("user_id");



CREATE INDEX "lifts_asset_idx" ON "public"."lifts" USING "btree" ("asset_id");



CREATE INDEX "lifts_user_date_idx" ON "public"."lifts" USING "btree" ("user_id", "lift_date");



CREATE INDEX "scheduled_notifications_send_at_sent_at_idx" ON "public"."subscription_notifications_queue" USING "btree" ("send_at", "sent_at");



CREATE INDEX "subscription_notifications_queue_user_id_idx" ON "public"."subscription_notifications_queue" USING "btree" ("user_id");



CREATE UNIQUE INDEX "user_devices_token_key" ON "public"."user_devices" USING "btree" ("token");



CREATE INDEX "user_devices_user_id_idx" ON "public"."user_devices" USING "btree" ("user_id");



CREATE INDEX "user_info_user_id_idx" ON "public"."user_info" USING "btree" ("user_id");



CREATE INDEX "user_onboarding_user_id_idx" ON "public"."user_onboarding" USING "btree" ("user_id");



CREATE INDEX "users_user_id_idx" ON "public"."users" USING "btree" ("user_id");



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2025_08_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2025_09_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2025_10_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2025_11_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2025_12_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_01_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_02_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_03_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_04_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_05_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_06_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_07_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_08_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_09_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_10_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_11_pkey";



ALTER INDEX "public"."user_check_ins_pkey" ATTACH PARTITION "public"."user_check_ins_2026_12_pkey";



CREATE OR REPLACE TRIGGER "lift-complete" AFTER INSERT ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://dsvyhorkfdcqjrjiqefe.supabase.co/functions/v1/push-notifications', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdnlob3JrZmRjcWpyamlxZWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NTM0NCwiZXhwIjoyMDcwMzMxMzQ0fQ.kEBEharNgLp5A89JmwOhwOM_ozgS2q8pLwr4XreZqXw"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "lift-failure" AFTER INSERT ON "public"."lift_failures" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://dsvyhorkfdcqjrjiqefe.supabase.co/functions/v1/push-notifications', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdnlob3JrZmRjcWpyamlxZWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NTM0NCwiZXhwIjoyMDcwMzMxMzQ0fQ.kEBEharNgLp5A89JmwOhwOM_ozgS2q8pLwr4XreZqXw"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "on_user_delete" AFTER DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_delete"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."referral_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_review_overrides" BEFORE UPDATE ON "public"."review_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_info" BEFORE UPDATE ON "public"."user_info" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_onboarding" BEFORE UPDATE ON "public"."user_onboarding" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cleanup_check_in_on_lift_delete" AFTER DELETE ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_check_in_on_lift_delete"();



CREATE OR REPLACE TRIGGER "trg_delete_sent_subscription_notifications" AFTER UPDATE OF "sent_at" ON "public"."subscription_notifications_queue" FOR EACH ROW EXECUTE FUNCTION "public"."delete_sent_subscription_notifications"();



CREATE OR REPLACE TRIGGER "trg_handle_lift_delete" AFTER DELETE ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_lift_delete"();



CREATE OR REPLACE TRIGGER "trg_handle_lift_failure_delete" AFTER DELETE ON "public"."lift_failures" FOR EACH ROW EXECUTE FUNCTION "public"."handle_lift_failure_delete"();



CREATE OR REPLACE TRIGGER "trg_handle_lifts_insert" BEFORE INSERT ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_lifts_insert"();



CREATE OR REPLACE TRIGGER "trg_insert_lift_failure" AFTER UPDATE OF "status" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."insert_lift_failure"();



CREATE OR REPLACE TRIGGER "trg_lifts_delete_checkin" AFTER DELETE ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_check_in_on_delete"();



CREATE OR REPLACE TRIGGER "trg_lifts_insert_checkin" AFTER INSERT ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_check_in_after_lift"();



CREATE OR REPLACE TRIGGER "trg_lifts_upsert_checkin" AFTER INSERT OR UPDATE ON "public"."lifts" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_check_in_after_upsert"();



CREATE OR REPLACE TRIGGER "trg_user_notifications_set_updated_at" BEFORE UPDATE ON "public"."user_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_app_versions_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_whats_new_trigger" BEFORE INSERT OR UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_whats_new"();



ALTER TABLE ONLY "public"."subscription_notifications_queue"
    ADD CONSTRAINT "free_trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lift_failures"
    ADD CONSTRAINT "lift_failures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifts"
    ADD CONSTRAINT "lifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE "public"."user_check_ins"
    ADD CONSTRAINT "user_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_info"
    ADD CONSTRAINT "user_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_onboarding"
    ADD CONSTRAINT "user_onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated read" ON "public"."app_versions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read" ON "public"."referral_codes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read" ON "public"."review_overrides" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public read access" ON "public"."referral_codes" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."review_overrides" FOR SELECT USING (true);



CREATE POLICY "Users can delete own account" ON "public"."users" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own check-ins" ON "public"."user_check_ins" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own jobs" ON "public"."jobs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own lift_failures" ON "public"."lift_failures" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notification row" ON "public"."user_notifications" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own check-ins" ON "public"."user_check_ins" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own lift_failures" ON "public"."lift_failures" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own notification row" ON "public"."user_notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notification row" ON "public"."user_notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own check-ins" ON "public"."user_check_ins" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own check-ins" ON "public"."user_check_ins" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own lift_failures" ON "public"."lift_failures" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_read_own" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."lift_failures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lifts_delete_own" ON "public"."lifts" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lifts_insert_own" ON "public"."lifts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "lifts_read_own" ON "public"."lifts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lifts_select_own" ON "public"."lifts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lifts_update_own" ON "public"."lifts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_notifications_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2025_08" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2025_09" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2025_10" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2025_11" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2025_12" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_01" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_02" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_03" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_04" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_05" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_06" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_07" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_08" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_09" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_10" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_11" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_check_ins_2026_12" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_devices_delete_own" ON "public"."user_devices" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_devices_insert_own" ON "public"."user_devices" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_devices_select_own" ON "public"."user_devices" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_devices_update_own" ON "public"."user_devices" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_info" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_info_delete_own" ON "public"."user_info" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_info_insert_own" ON "public"."user_info" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_info_select_own" ON "public"."user_info" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_info_update_own" ON "public"."user_info" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_onboarding" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_onboarding_delete_own" ON "public"."user_onboarding" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_onboarding_insert_own" ON "public"."user_onboarding" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_onboarding_select_own" ON "public"."user_onboarding" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_onboarding_update_own" ON "public"."user_onboarding" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_own" ON "public"."users" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."jobs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lift_failures";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lifts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_check_ins";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_lift_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_lift_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_check_in_on_lift_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_job_on_lift_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_job_on_lift_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_job_on_lift_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_streak_for"("u" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_streak_for"("u" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_streak_for"("u" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_job_on_lift_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_job_on_lift_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_job_on_lift_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_sent_subscription_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_sent_subscription_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_sent_subscription_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_check_in_after_lift"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_check_in_after_lift"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_check_in_after_lift"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_check_in_after_upsert"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_check_in_after_upsert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_check_in_after_upsert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lift_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lift_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lift_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lift_failure_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lift_failure_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lift_failure_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lifts_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lifts_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lifts_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_lift_failure"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_lift_failure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_lift_failure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jobs_block_when_lift_exists"() TO "anon";
GRANT ALL ON FUNCTION "public"."jobs_block_when_lift_exists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jobs_block_when_lift_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_auth_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_auth_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_auth_user_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_whats_new"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_whats_new"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_whats_new"() TO "service_role";
























GRANT ALL ON TABLE "public"."app_versions" TO "anon";
GRANT ALL ON TABLE "public"."app_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_versions" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."lift_failures" TO "anon";
GRANT ALL ON TABLE "public"."lift_failures" TO "authenticated";
GRANT ALL ON TABLE "public"."lift_failures" TO "service_role";



GRANT ALL ON TABLE "public"."lifts" TO "authenticated";
GRANT ALL ON TABLE "public"."lifts" TO "service_role";



GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."review_overrides" TO "anon";
GRANT ALL ON TABLE "public"."review_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."review_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_notifications_queue" TO "anon";
GRANT ALL ON TABLE "public"."subscription_notifications_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_notifications_queue" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2025_08" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2025_08" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2025_08" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2025_09" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2025_09" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2025_09" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2025_10" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2025_10" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2025_10" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2025_11" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2025_11" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2025_11" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2025_12" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2025_12" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2025_12" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_01" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_01" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_01" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_02" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_02" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_02" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_03" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_03" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_03" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_04" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_04" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_04" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_05" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_05" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_05" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_06" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_06" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_06" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_07" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_07" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_07" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_08" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_08" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_08" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_09" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_09" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_09" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_10" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_10" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_10" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_11" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_11" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_11" TO "service_role";



GRANT ALL ON TABLE "public"."user_check_ins_2026_12" TO "anon";
GRANT ALL ON TABLE "public"."user_check_ins_2026_12" TO "authenticated";
GRANT ALL ON TABLE "public"."user_check_ins_2026_12" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."user_info" TO "authenticated";
GRANT ALL ON TABLE "public"."user_info" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."user_onboarding" TO "authenticated";
GRANT ALL ON TABLE "public"."user_onboarding" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
