-- 1a. Create coach_onboardings table (same schema as coach_flows)
CREATE TABLE IF NOT EXISTS "public"."coach_onboardings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "flow_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_onboardings" FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."coach_onboardings" OWNER TO "postgres";

ALTER TABLE ONLY "public"."coach_onboardings"
    ADD CONSTRAINT "coach_onboardings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."coach_onboardings"
    ADD CONSTRAINT "coach_onboardings_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- RLS policy
ALTER TABLE "public"."coach_onboardings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_all" ON "public"."coach_onboardings" TO "authenticated"
    USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));

-- Index
CREATE INDEX "idx_coach_onboardings_coach_id" ON "public"."coach_onboardings" USING "btree" ("coach_id");

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER "trg_onboardings_updated_at" BEFORE UPDATE ON "public"."coach_onboardings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Grants
GRANT ALL ON TABLE "public"."coach_onboardings" TO "anon";
GRANT ALL ON TABLE "public"."coach_onboardings" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_onboardings" TO "service_role";

-- 1b. Update handle_new_coach_setup() to remove "New Client Sign Up" flow
CREATE OR REPLACE FUNCTION "public"."handle_new_coach_setup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function is triggered from coach_profiles INSERT
  -- No need to check user_type - if we're here, it's a coach

  -- 1. Create default preferences (theme, language, units, color_preset)
  INSERT INTO public.coach_preferences (coach_id, theme, language, units, color_preset)
  VALUES (NEW.id, 'light', 'en', 'metric', 'default')
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
  ON CONFLICT DO NOTHING;

  -- 3.5. Create Getting Started checklist row
  INSERT INTO public.coach_getting_started_checklist (coach_id)
  VALUES (NEW.id)
  ON CONFLICT (coach_id) DO NOTHING;

  -- 4. Create default flows (4 fixed flows - New Client Sign Up moved to onboarding)
  -- Flow 1: Missed Check-in
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Check-in',
      'Triggered when a client misses a scheduled check-in.',
      '{"nodes":[],"edges":[]}',
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 2: Check-in Completed
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Check-in Completed',
      'Triggered when a client completes a check-in.',
      '{"nodes":[],"edges":[]}',
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 3: Missed Workout
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Missed Workout',
      'Triggered when a client misses a scheduled workout.',
      '{"nodes":[],"edges":[]}',
      false
  )
  ON CONFLICT DO NOTHING;

  -- Flow 4: Workout Finished
  INSERT INTO public.coach_flows (coach_id, name, description, flow_data, is_active)
  VALUES (
      NEW.id,
      'Workout Finished',
      'Triggered when a client completes a workout.',
      '{"nodes":[],"edges":[]}',
      false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error seeding coach defaults: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 1c. Delete existing "New Client Sign Up" flows
DELETE FROM public.coach_flows WHERE name = 'New Client Sign Up';
