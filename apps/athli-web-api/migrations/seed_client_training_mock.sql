-- ================================================
-- Additional Mock Data: client_training rows
-- ================================================
-- This adds the client_training rows with workout_data JSONB
-- Run this AFTER the previous seed script

DO $$
DECLARE
    v_coach_id UUID := 'c153a8bc-8d3b-4821-872f-185b11388d78';
    v_client_id UUID := '5e538fb7-2fbd-419f-8d22-19859865d484';
    v_workout_json JSONB;
BEGIN

-- Base workout template (we'll modify completedSummary for each day)
v_workout_json := '{
  "id": "95db068d-4074-459d-9cf7-d572d50982e3",
  "name": "Push Pull",
  "type": "weightlifting",
  "equipment": ["Barbell"],
  "difficulty": "beginner",
  "description": "Simple push pull workout",
  "is_favourite": false,
  "total_exercises": 4,
  "workout_data": {
    "pre": {"readiness": 7},
    "post": {"rating": 8, "intensity": 7, "sessionComments": "Solid session."},
    "items": [
      {
        "itemType": "exercise",
        "data": {
          "sets": [
            {"reps": {"completed": 12, "prescribed": 12}, "type": "normal", "weight": {"completed": 50, "prescribed": 50}, "completed": true, "setNumber": 1, "exerciseType": "weight_reps"}
          ],
          "notes": "Warm-up set.",
          "exerciseType": "weight_reps",
          "performedExerciseId": null,
          "prescribedExerciseId": "K6NnTv0"
        }
      },
      {
        "itemType": "section",
        "data": {
          "id": "sec_regular_1",
          "name": "Mid warm up",
          "type": "regular",
          "notes": null,
          "exercises": [
            {
              "isSuperset": false,
              "exercises": [
                {
                  "sets": [{"reps": {"completed": 12, "prescribed": 12}, "type": "normal", "weight": {"completed": 60, "prescribed": 60}, "completed": true, "setNumber": 1, "exerciseType": "weight_reps"}],
                  "notes": "Good form.",
                  "exerciseType": "weight_reps",
                  "performedExerciseId": null,
                  "prescribedExerciseId": "pdm4AfV"
                }
              ]
            }
          ]
        }
      }
    ],
    "completedSummary": {
      "status": "completed",
      "startedAt": null,
      "completedAt": null,
      "totalDurationMin": 45,
      "totalWeightLifted": 500
    }
  }
}'::jsonb;

-- Day 1: 2025-12-28
INSERT INTO public.client_training (client_id, coach_id, date, training_data, created_at, updated_at)
VALUES (
    v_client_id, 
    v_coach_id, 
    '2025-12-28',
    jsonb_build_object('workout_1', jsonb_set(
        jsonb_set(v_workout_json, '{workout_data,completedSummary,startedAt}', '"2025-12-28T09:00:00.000Z"'),
        '{workout_data,completedSummary,completedAt}', '"2025-12-28T09:45:00.000Z"'
    )),
    NOW(),
    NOW()
)
ON CONFLICT (client_id, date, coach_id) DO UPDATE SET
    training_data = EXCLUDED.training_data,
    updated_at = NOW();

-- Day 2: 2025-12-29
INSERT INTO public.client_training (client_id, coach_id, date, training_data, created_at, updated_at)
VALUES (
    v_client_id, 
    v_coach_id, 
    '2025-12-29',
    jsonb_build_object('workout_1', jsonb_set(
        jsonb_set(v_workout_json, '{workout_data,completedSummary,startedAt}', '"2025-12-29T10:00:00.000Z"'),
        '{workout_data,completedSummary,completedAt}', '"2025-12-29T10:50:00.000Z"'
    )),
    NOW(),
    NOW()
)
ON CONFLICT (client_id, date, coach_id) DO UPDATE SET
    training_data = EXCLUDED.training_data,
    updated_at = NOW();

-- Day 3: 2025-12-30 (in_progress)
INSERT INTO public.client_training (client_id, coach_id, date, training_data, created_at, updated_at)
VALUES (
    v_client_id, 
    v_coach_id, 
    '2025-12-30',
    jsonb_build_object('workout_1', jsonb_set(
        jsonb_set(
            jsonb_set(v_workout_json, '{workout_data,completedSummary,status}', '"in_progress"'),
            '{workout_data,completedSummary,startedAt}', '"2025-12-30T11:00:00.000Z"'
        ),
        '{workout_data,completedSummary,completedAt}', 'null'
    )),
    NOW(),
    NOW()
)
ON CONFLICT (client_id, date, coach_id) DO UPDATE SET
    training_data = EXCLUDED.training_data,
    updated_at = NOW();

-- Day 4: 2025-12-31
INSERT INTO public.client_training (client_id, coach_id, date, training_data, created_at, updated_at)
VALUES (
    v_client_id, 
    v_coach_id, 
    '2025-12-31',
    jsonb_build_object('workout_1', jsonb_set(
        jsonb_set(v_workout_json, '{workout_data,completedSummary,startedAt}', '"2025-12-31T08:00:00.000Z"'),
        '{workout_data,completedSummary,completedAt}', '"2025-12-31T08:42:00.000Z"'
    )),
    NOW(),
    NOW()
)
ON CONFLICT (client_id, date, coach_id) DO UPDATE SET
    training_data = EXCLUDED.training_data,
    updated_at = NOW();

RAISE NOTICE 'client_training mock data inserted successfully!';
RAISE NOTICE 'Added 4 rows for dates: 2025-12-28, 2025-12-29, 2025-12-30, 2025-12-31';

END $$;
