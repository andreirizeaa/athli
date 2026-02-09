-- 1. Create coach_sequences table
CREATE TABLE IF NOT EXISTS "public"."coach_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "flow_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."coach_sequences" FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."coach_sequences" OWNER TO "postgres";

ALTER TABLE ONLY "public"."coach_sequences"
    ADD CONSTRAINT "coach_sequences_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."coach_sequences"
    ADD CONSTRAINT "coach_sequences_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- RLS policy
ALTER TABLE "public"."coach_sequences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_all" ON "public"."coach_sequences" TO "authenticated"
    USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));

-- Index
CREATE INDEX "idx_coach_sequences_coach_id" ON "public"."coach_sequences" USING "btree" ("coach_id");

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER "trg_sequences_updated_at" BEFORE UPDATE ON "public"."coach_sequences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Grants
GRANT ALL ON TABLE "public"."coach_sequences" TO "anon";
GRANT ALL ON TABLE "public"."coach_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sequences" TO "service_role";

-- 2. Add sequence_id to coach_packages
ALTER TABLE "public"."coach_packages"
    ADD COLUMN IF NOT EXISTS "sequence_id" "uuid" REFERENCES "public"."coach_sequences"("id") ON DELETE RESTRICT;
