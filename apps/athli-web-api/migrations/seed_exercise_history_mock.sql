-- ================================================
-- Mock Data for Testing Exercise History UI
-- ================================================
-- Coach: c153a8bc-8d3b-4821-872f-185b11388d78
-- Client: Replace with actual client_id
-- Dates: 2025-12-28 to 2026-01-01

-- Set variables for easier customization
DO $$
DECLARE
    v_coach_id UUID := 'c153a8bc-8d3b-4821-872f-185b11388d78';
    v_client_id UUID := '5e538fb7-2fbd-419f-8d22-19859865d484'; -- TODO: Replace with actual client_id
BEGIN

-- =============================================
-- 1. Insert Training History Records
-- =============================================
INSERT INTO public.client_training_history 
    (client_id, coach_id, date, workout_id, status, created_at, updated_at)
VALUES
    -- Day 1: 2025-12-28 - Completed workout
    (v_client_id, v_coach_id, '2025-12-28', 'workout_1', 'completed', NOW(), NOW()),
    
    -- Day 2: 2025-12-29 - Completed workout
    (v_client_id, v_coach_id, '2025-12-29', 'workout_1', 'completed', NOW(), NOW()),
    
    -- Day 3: 2025-12-30 - In progress
    (v_client_id, v_coach_id, '2025-12-30', 'workout_1', 'in_progress', NOW(), NOW()),
    
    -- Day 4: 2025-12-31 - Completed workout
    (v_client_id, v_coach_id, '2025-12-31', 'workout_1', 'completed', NOW(), NOW()),
    
    -- Day 5: 2026-01-01 - Completed (from your example data)
    (v_client_id, v_coach_id, '2026-01-01', 'workout_1', 'completed', NOW(), NOW())

ON CONFLICT (client_id, coach_id, date, workout_id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

-- =============================================
-- 2. Insert Exercise History Records
-- =============================================

-- Day 1: 2025-12-28
INSERT INTO public.client_training_exercise_history 
    (client_id, coach_id, date, workout_id, workout_name, exercise_id, exercise_data)
VALUES
    (v_client_id, v_coach_id, '2025-12-28', 'workout_1', 'Push Pull', 'K6NnTv0', 
     '{"sets":[{"reps":{"completed":10,"prescribed":12},"type":"normal","weight":{"completed":50,"prescribed":50},"completed":true,"setNumber":1,"exerciseType":"weight_reps"},{"reps":{"completed":10,"prescribed":12},"type":"normal","weight":{"completed":50,"prescribed":50},"completed":true,"setNumber":2,"exerciseType":"weight_reps"}],"notes":"First workout, warming up.","exerciseType":"weight_reps","performedExerciseId":"pex_day1_1","prescribedExerciseId":"K6NnTv0"}'::jsonb),
    
    (v_client_id, v_coach_id, '2025-12-28', 'workout_1', 'Push Pull', 'pdm4AfV', 
     '{"sets":[{"reps":{"completed":8,"prescribed":10},"type":"normal","weight":{"completed":60,"prescribed":60},"completed":true,"setNumber":1,"exerciseType":"weight_reps"}],"notes":"Heavy set.","exerciseType":"weight_reps","performedExerciseId":"pex_day1_2","prescribedExerciseId":"pdm4AfV"}'::jsonb);

-- Day 2: 2025-12-29
INSERT INTO public.client_training_exercise_history 
    (client_id, coach_id, date, workout_id, workout_name, exercise_id, exercise_data)
VALUES
    (v_client_id, v_coach_id, '2025-12-29', 'workout_1', 'Push Pull', 'K6NnTv0', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":55,"prescribed":55},"completed":true,"setNumber":1,"exerciseType":"weight_reps"},{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":55,"prescribed":55},"completed":true,"setNumber":2,"exerciseType":"weight_reps"}],"notes":"Feeling stronger.","exerciseType":"weight_reps","performedExerciseId":"pex_day2_1","prescribedExerciseId":"K6NnTv0"}'::jsonb),
    
    (v_client_id, v_coach_id, '2025-12-29', 'workout_1', 'Push Pull', 'U0uPZBq_main', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":70,"prescribed":70},"completed":true,"setNumber":1,"exerciseType":"weight_reps"}],"notes":"Good form.","exerciseType":"weight_reps","performedExerciseId":"pex_day2_2","prescribedExerciseId":"U0uPZBq_main"}'::jsonb);

-- Day 4: 2025-12-31
INSERT INTO public.client_training_exercise_history 
    (client_id, coach_id, date, workout_id, workout_name, exercise_id, exercise_data)
VALUES
    (v_client_id, v_coach_id, '2025-12-31', 'workout_1', 'Push Pull', 'K6NnTv0', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":60,"prescribed":60},"completed":true,"setNumber":1,"exerciseType":"weight_reps"},{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":60,"prescribed":60},"completed":true,"setNumber":2,"exerciseType":"weight_reps"}],"notes":"Best session yet.","exerciseType":"weight_reps","performedExerciseId":"pex_day4_1","prescribedExerciseId":"K6NnTv0"}'::jsonb),
    
    (v_client_id, v_coach_id, '2025-12-31', 'workout_1', 'Push Pull', 'T3JogV7llll', 
     '{"type":"normal","notes":"Cool down completed.","distance":{"completed":150,"prescribed":100},"completed":true,"durationSec":{"completed":120,"prescribed":100},"exerciseType":"distance_duration","performedExerciseId":"pex_day4_2","prescribedExerciseId":"T3JogV7llll"}'::jsonb);

-- Day 5: 2026-01-01 (from your example - full exercise payload)
INSERT INTO public.client_training_exercise_history 
    (client_id, coach_id, date, workout_id, workout_name, exercise_id, exercise_data)
VALUES
    (v_client_id, v_coach_id, '2026-01-01', 'workout_1', 'Push Pull', 'K6NnTv0', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":1,"prescribed":1},"dropset":null,"restSec":90,"skipped":false,"completed":true,"setNumber":1,"exerciseType":"weight_reps"},{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":1,"prescribed":1},"dropset":null,"restSec":90,"skipped":false,"completed":true,"setNumber":3,"exerciseType":"weight_reps"}],"notes":"Kept these light as activation.","supersetId":null,"alternatives":[],"exerciseType":"weight_reps","performedExerciseId":"pex_1767288501941_1","prescribedExerciseId":"K6NnTv0"}'::jsonb),
    
    (v_client_id, v_coach_id, '2026-01-01', 'workout_1', 'Push Pull', 'pdm4AfV', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":1,"prescribed":1},"dropset":null,"restSec":90,"skipped":false,"completed":true,"setNumber":3,"exerciseType":"weight_reps"}],"notes":"Felt easy, good tempo.","supersetId":null,"alternatives":[],"exerciseType":"weight_reps","performedExerciseId":"pex_1767288501941_2","prescribedExerciseId":"pdm4AfV"}'::jsonb),
    
    (v_client_id, v_coach_id, '2026-01-01', 'workout_1', 'Push Pull', 'U0uPZBq_main', 
     '{"sets":[{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":1,"prescribed":1},"dropset":null,"restSec":90,"skipped":false,"completed":true,"setNumber":1,"exerciseType":"weight_reps"},{"reps":{"completed":0,"prescribed":0},"type":"dropset","weight":{"completed":0,"prescribed":0},"dropset":{"stages":[{"reps":{"completed":1,"prescribed":1},"weight":{"completed":1,"prescribed":1},"completed":true},{"reps":{"completed":1,"prescribed":1},"weight":{"completed":1,"prescribed":1},"completed":true}]},"restSec":90,"skipped":false,"completed":true,"setNumber":2,"exerciseType":"weight_reps"},{"reps":{"completed":12,"prescribed":12},"type":"normal","weight":{"completed":1,"prescribed":1},"dropset":null,"restSec":90,"skipped":false,"completed":true,"setNumber":3,"exerciseType":"weight_reps"}],"notes":"Dropset: stayed strict, short pauses only.","supersetId":null,"alternatives":[],"exerciseType":"weight_reps","performedExerciseId":"pex_1767288501941_3","prescribedExerciseId":"U0uPZBq_main"}'::jsonb),
    
    (v_client_id, v_coach_id, '2026-01-01', 'workout_1', 'Push Pull', 'T3JogV7llll', 
     '{"reps":{"completed":12,"prescribed":12},"type":"normal","notes":"Steady pace.","weight":{"completed":0,"prescribed":0},"restSec":90,"distance":{"completed":100,"prescribed":100},"completed":true,"durationSec":{"completed":100,"prescribed":100},"exerciseType":"distance_duration","performedExerciseId":"pex_1767288501941_4","prescribedExerciseId":"T3JogV7llll"}'::jsonb);

RAISE NOTICE 'Mock data inserted successfully!';
RAISE NOTICE 'Training history: 5 rows';
RAISE NOTICE 'Exercise history: 10 rows';

END $$;
