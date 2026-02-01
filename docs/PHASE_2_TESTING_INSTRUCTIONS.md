# Phase 2 Testing Instructions

## Overview

Phase 2 implements Exercise ID Resolution (MuscleWiki Integration). This document provides instructions for testing the implementation.

## Prerequisites

1. Install dependencies: `npm install`
2. Ensure `musclewiki_exercise_cache` table is populated in Supabase
3. Start the dev servers

## Files Changed

### Backend (`apps/athli-web-api`)
- `src/api/v1/ai/tools/index.ts` - Added `get_exercise_catalog` tool, updated schemas
- `src/services/ai/prompts.ts` - Updated system prompt

### Frontend (`apps/athli-web-app`)
- `lib/ai-payload-transformer.ts` - Fixed workout structure
- `app/assistant/components/tool-status.tsx` - Added tool display name

## Test Cases

### Test 1: Exercise Catalog Tool

1. Start the API server: `cd apps/athli-web-api && npm run dev`
2. Start the web app: `cd apps/athli-web-app && npm run dev`
3. Go to `/assistant`
4. Ask: "Show me chest exercises"
5. **Expected**: AI calls `get_exercise_catalog` with `muscle: "Chest"` and returns a table of exercises with IDs

### Test 2: Workout Creation with IDs

1. Ask: "Create a chest workout with 3 exercises"
2. **Expected**:
   - AI first calls `get_exercise_catalog`
   - AI then calls `create_workout` with `prescribedExerciseId` for each exercise
   - Confirm card appears
3. Click "Add to Library"
4. **Verify in database**:
   ```sql
   SELECT workout_data FROM coach_workouts ORDER BY created_at DESC LIMIT 1;
   ```
   - Check `items[].data.exercises[].exercises[].prescribedExerciseId` is NOT null
   - Check `items[].itemType` is `"section"` (not `type`)

### Test 3: Workout Opens Correctly

1. After Test 2, go to `/training/workouts`
2. Click on the newly created workout
3. **Expected**:
   - Exercise names display (not "Unknown Exercise")
   - Exercise thumbnails load
   - Clicking exercise shows video/instructions

### Test 4: Validation Error - Missing ID

1. Manually test the API by calling `create_workout` without `prescribedExerciseId`
2. **Expected**: Error message like:
   ```json
   {
     "success": false,
     "error": "Invalid exercise IDs:\n- \"Bench Press\" is missing prescribedExerciseId.\n\nCall get_exercise_catalog to get valid IDs."
   }
   ```

### Test 5: Validation Error - Invalid ID

1. Call `create_workout` with a fake ID like `"99999"`
2. **Expected**: Error message indicating ID not found

### Test 6: Filter Validation

1. Ask AI to filter by invalid muscle like "Legs"
2. **Expected**: Zod validation error, AI retries with valid value like "Quadriceps"

## Verification Checklist

- [ ] `get_exercise_catalog` returns exercises with MuscleWiki IDs
- [ ] `get_exercise_catalog` filters work (muscle, category, difficulty, force, mechanic)
- [ ] `create_workout` requires `prescribedExerciseId`
- [ ] `create_workout` validates IDs exist in database
- [ ] `create_section` has same validation
- [ ] Transformer produces correct structure (`itemType: "section"`)
- [ ] Transformer passes through `prescribedExerciseId`
- [ ] Saved workouts open correctly with exercise videos

## Database Queries for Verification

Check if exercise IDs are valid:
```sql
SELECT musclewiki_id, name FROM musclewiki_exercise_cache WHERE musclewiki_id IN ('213', '312', '448');
```

Check workout structure:
```sql
SELECT
  name,
  workout_data->'items'->0->'itemType' as item_type,
  workout_data->'items'->0->'data'->'exercises'->0->'exercises'->0->'prescribedExerciseId' as exercise_id
FROM coach_workouts
ORDER BY created_at DESC
LIMIT 1;
```

## Success Criteria

Phase 2 is complete when:
1. AI creates workouts with valid `prescribedExerciseId` values
2. Saved workouts open correctly with exercise videos/instructions
3. Invalid/missing IDs are rejected with helpful error messages
