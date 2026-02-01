# PRD: Athli AI Assistant - Phase 2

**Version:** 1.0
**Status:** Draft
**Last Updated:** January 2025

---

## 1. Overview

This document outlines features and improvements deferred from Phase 1 of the AI Assistant implementation. These items are intentionally out of scope for the initial release to reduce complexity and ship faster.

---

## 2. Deferred Features

### 2.1 Exercise ID Resolution (MuscleWiki Integration)

**Problem:** When the AI creates a workout, it only provides exercise **names** as strings. The workout preview/execution doesn't work because exercises are missing MuscleWiki IDs.

**Current Behavior (Phase 1):**
```json
// What AI generates
{
  "name": "Beginner Back Builder A",
  "sections": [{
    "name": "Main Lifts",
    "exercises": [{
      "name": "Lat Pulldown (Medium Grip)",  // Just a name, no ID
      "sets": 3,
      "reps": "8-12"
    }]
  }]
}
```

**What the Database Expects:**
```typescript
// From packages/shared-types/src/workout-schema.ts
export type ExerciseIdPair = {
  prescribedExerciseId: string;  // MuscleWiki ID like "213"
  performedExerciseId: string | null;
};
```

**The Issue:**
The `transformWorkoutPayload` function in `lib/ai-payload-transformer.ts` sets `exerciseId: null`, causing:
1. Workout preview can't load exercises
2. No exercise details (videos, instructions) available
3. Training logs don't link to proper exercises

**Additional Issue - Wrong Structure:**
The transformer also creates an incompatible structure:
```typescript
// Current (Wrong)
{ items: [{ id, type: "section", name, exercises: [...] }] }

// Expected (Correct)
{ items: [{ itemType: "section", data: { id, name, type, exercises: [{ isSuperset, exercises: [{ prescribedExerciseId, ... }] }] } }] }
```

---

## Chosen Solution: On-Demand Catalog + Validation

**Approach:**
1. AI calls `get_exercise_catalog` tool to load exercises before creating workout
2. AI calls `create_workout` with MuscleWiki IDs
3. Tool validates IDs exist, rejects with helpful error if not

---

### New Tool: `get_exercise_catalog`

Returns the full MuscleWiki exercise list for the AI to reference:

```typescript
// Tool definition
{
  name: "get_exercise_catalog",
  description: "Get the full exercise catalog with MuscleWiki IDs. Call this BEFORE create_workout to get the exercise IDs you need.",
  schema: z.object({
    muscle_group: z.string().optional().describe("Optional: filter by muscle group (e.g., 'chest', 'back', 'legs')")
  })
}

// Returns
`## Exercise Catalog
ID   | Name                          | Target Muscles    | Equipment
-----|-------------------------------|-------------------|----------
213  | Lat Pulldown                  | Lats, Biceps      | Cable
214  | Lat Pulldown (Wide Grip)      | Lats              | Cable
312  | Seated Cable Row              | Back, Biceps      | Cable
448  | Barbell Bench Press           | Chest, Triceps    | Barbell
...
(~1700 exercises, or filtered subset)`
```

---

### Updated Tool: `create_workout` Validation

The tool validates exercise IDs and returns helpful errors:

```typescript
// Validation logic in create_workout tool
async function validateExercises(exercises: Exercise[]): Promise<ValidationResult> {
  const errors: string[] = [];

  for (const exercise of exercises) {
    // Check 1: ID is required
    if (!exercise.prescribedExerciseId) {
      errors.push(`"${exercise.name}" is missing prescribedExerciseId. Call get_exercise_catalog first.`);
      continue;
    }

    // Check 2: ID must exist in database
    const exists = await checkExerciseExists(exercise.prescribedExerciseId);
    if (!exists) {
      errors.push(`ID "${exercise.prescribedExerciseId}" for "${exercise.name}" not found. Check the exercise catalog for correct IDs.`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: "Invalid exercise IDs:\n" + errors.join("\n") + "\n\nCall get_exercise_catalog to get valid IDs."
    };
  }

  return { success: true };
}
```

---

### System Prompt Addition

Add to `prompts.ts`:

```typescript
## Creating Workouts

When creating workouts with exercises, you MUST:
1. First call \`get_exercise_catalog\` to get the MuscleWiki exercise IDs
2. Then call \`create_workout\` with \`prescribedExerciseId\` for each exercise

The create_workout tool will reject exercises without valid IDs.

Example flow:
- User: "Create a chest workout"
- You: Call get_exercise_catalog (optionally filter by muscle_group: "chest")
- You: Review the catalog, pick appropriate exercises
- You: Call create_workout with prescribedExerciseId for each exercise
```

---

### Complete Flow

```
User: "Create a beginner back workout"
                ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: AI calls get_exercise_catalog                      │
│  → Optional: filter by muscle_group: "back"                 │
└─────────────────────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Tool returns exercise list                         │
│                                                             │
│  ID   | Name                    | Muscles      | Equipment  │
│  213  | Lat Pulldown            | Lats, Biceps | Cable      │
│  214  | Lat Pulldown (Wide)     | Lats         | Cable      │
│  312  | Seated Cable Row        | Back, Biceps | Cable      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: AI calls create_workout WITH IDs                   │
│                                                             │
│  { exercises: [                                             │
│    { prescribedExerciseId: "213", name: "Lat Pulldown", ... }│
│    { prescribedExerciseId: "312", name: "Seated Cable Row" } │
│  ]}                                                         │
└─────────────────────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Tool validates IDs                                 │
│  ✓ ID 213 exists → OK                                       │
│  ✓ ID 312 exists → OK                                       │
│  → Returns action payload for confirmation                  │
└─────────────────────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Frontend shows confirm card                        │
│  User clicks "Add to Library" → Saved to database           │
└─────────────────────────────────────────────────────────────┘
```

---

### Error Handling Examples

**Missing ID:**
```
AI calls create_workout({ exercises: [{ name: "Lat Pulldown", sets: 3 }] })
                ↓
Tool returns:
{
  success: false,
  error: "Invalid exercise IDs:\n- \"Lat Pulldown\" is missing prescribedExerciseId.\n\nCall get_exercise_catalog to get valid IDs."
}
                ↓
AI calls get_exercise_catalog → then retries create_workout with IDs
```

**Invalid ID:**
```
AI calls create_workout({ exercises: [{ prescribedExerciseId: "99999", name: "Lat Pulldown" }] })
                ↓
Tool returns:
{
  success: false,
  error: "Invalid exercise IDs:\n- ID \"99999\" for \"Lat Pulldown\" not found.\n\nCheck the exercise catalog for correct IDs."
}
                ↓
AI calls get_exercise_catalog → finds correct ID → retries
```

---

### Size Estimate

- Full catalog: ~1700 exercises × ~50 chars = **~85KB** (~20-25k tokens)
- Filtered by muscle: ~100-200 exercises = **~5-10KB** (~2-3k tokens)
- Cost per catalog call: ~$0.005-0.02

---

### Fallback: Chunking by Muscle Group

If full catalog is too large, AI can filter:

```typescript
// AI calls with filter
get_exercise_catalog({ muscle_group: "back" })

// Returns only back exercises (~150 instead of 1700)
```

---

### Implementation

**Files to Modify:**

1. `apps/athli-web-api/src/api/v1/ai/tools/index.ts`
   - Add `get_exercise_catalog` tool
   - Update `create_workout` with ID validation

2. `apps/athli-web-api/src/services/ai/exercise-catalog.ts` (new)
   - `getExerciseCatalog(muscleGroup?: string)` - fetch and format exercises
   - `validateExerciseIds(ids: string[])` - check IDs exist in DB
   - Cache the formatted catalog (regenerate daily)

3. `apps/athli-web-api/src/services/ai/prompts.ts`
   - Add workout creation instructions to system prompt

4. `apps/athli-web-app/lib/ai-payload-transformer.ts`
   - Update to expect `prescribedExerciseId` in payload
   - Fix structure to match workout schema

**Database:**
- Read from existing `musclewiki_exercise_cache` table
- Fields: `musclewiki_id`, `name`, `target_muscles`, `category`

---

### Alternative Approaches (Rejected)

**Option A: AI searches exercises first**
- Too many tool calls, slower

**Option B: Backend fuzzy matching**
- Inaccurate, user loses control

**Option C: Frontend fuzzy matching**
- Same issues as Option B

**Option D: Deferred linking**
- Slow first open, linkage might change

---

## 3. Acceptance Criteria

**Must Have:**
- [ ] `get_exercise_catalog` tool returns all exercises with MuscleWiki IDs
- [ ] `get_exercise_catalog` supports optional `muscle_group` filter
- [ ] `create_workout` rejects exercises without `prescribedExerciseId`
- [ ] `create_workout` validates that exercise IDs exist in database
- [ ] `create_workout` returns helpful error messages for invalid IDs
- [ ] System prompt instructs AI to call `get_exercise_catalog` before `create_workout`
- [ ] AI-created workouts save with correct `prescribedExerciseId` values
- [ ] Saved workouts open correctly with exercise videos and instructions

**Should Have:**
- [ ] Exercise catalog is cached (regenerated daily) for performance
- [ ] Catalog response is formatted for easy AI parsing (ID | Name | Muscles | Equipment)

**Testing (AI Agent-Driven):**

Use Claude Code or similar AI agent to fully test the implementation:

1. **End-to-End Workout Creation Test:**
   - [ ] Agent calls `get_exercise_catalog` and verifies response format
   - [ ] Agent calls `create_workout` with valid IDs from catalog
   - [ ] Agent confirms the workout saves successfully
   - [ ] Agent reads the saved workout from database and verifies `prescribedExerciseId` values are correct
   - [ ] Agent opens the workout in the app and verifies exercises load with videos/instructions

2. **Error Handling Test:**
   - [ ] Agent calls `create_workout` WITHOUT IDs → verifies helpful error returned
   - [ ] Agent calls `create_workout` with INVALID IDs (e.g., "99999") → verifies error message
   - [ ] Agent verifies it can recover by calling `get_exercise_catalog` and retrying

3. **Debug Any Issues:**
   - [ ] If any test fails, agent inspects database, API responses, and logs
   - [ ] Agent identifies root cause and fixes the issue
   - [ ] Agent re-runs tests until all pass

---

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| Exercise ID resolution accuracy | > 95% of AI-created exercises have valid IDs |
| Workout creation success rate | > 90% of AI workouts save and open correctly |

---

## 5. Dependencies

- Phase 1 must be stable and in production
- `musclewiki_exercise_cache` table must be populated

---

## 6. Out of Scope (See Phase 3)

The following features are deferred to Phase 3:
- Mobile app integration
- Conversation persistence
- File/PDF processing
- Voice input
- Advanced streaming UI
- Auto-retry and resilience
