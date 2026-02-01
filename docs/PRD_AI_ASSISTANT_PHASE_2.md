# PRD: Athli AI Assistant - Phase 2

**Version:** 1.0
**Status:** Draft
**Last Updated:** January 2025

**Completion Promise:** `PHASE2COMPLETE`

When all acceptance criteria are met and verification passes, output: `<promise>PHASE2COMPLETE</promise>`

---

## 1. Overview

This document outlines features and improvements deferred from Phase 1 of the AI Assistant implementation. These items are intentionally out of scope for the initial release to reduce complexity and ship faster.

---

## 2. Exercise ID Resolution (MuscleWiki Integration)

### 2.1 Problem Statement

When the AI creates a workout, it only provides exercise **names** as strings. The workout preview/execution doesn't work because exercises are missing MuscleWiki IDs.

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

### 2.2 Current Architecture: Tools vs Transformer

Understanding the separation between AI tools (backend) and the transformer (frontend) is critical:

**AI Tools (Backend - `apps/athli-web-api/src/api/v1/ai/tools/index.ts`):**

| Tool | Purpose | Output |
|------|---------|--------|
| `create_workout` | Creates full workout with multiple sections | `{ name, sections: [{ name, type, exercises: [...] }] }` |
| `create_section` | Creates reusable section template (single section) | `{ name, type, exercises: [...] }` |

Both tools share the same `workoutExerciseSchema`:
```typescript
// Current schema - NO prescribedExerciseId!
const workoutExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().default(3),
  reps: z.string(),
  weight: z.string().optional(),
  rest: z.number().optional(),
  notes: z.string().optional(),
});
```

**Transformer (Frontend - `apps/athli-web-app/lib/ai-payload-transformer.ts`):**

The transformer takes the AI's simplified payload and converts it to the full API format:

| Responsibility | What It Does |
|----------------|--------------|
| Generate UUIDs | Adds `id` and `instanceId` for exercises and sections |
| Create sets array | Converts `sets: 3` to array of set objects |
| Add defaults | `rest: 90`, `exerciseId: null` (BUG!) |
| Add metadata | `pre`, `post`, `completedSummary` objects |

**Current Flow (Broken):**
```
AI Tool → Simplified payload (no IDs)
    ↓
Tool validates → Returns action
    ↓
Frontend shows confirm card
    ↓
User confirms
    ↓
Transformer runs → Sets exerciseId: null (BUG)
    ↓
Saved to DB → Exercise has no MuscleWiki ID
```

**Phase 2 Flow (Fixed):**
```
AI calls get_exercise_catalog → Gets IDs
    ↓
AI Tool → Payload WITH prescribedExerciseId
    ↓
Tool validates → Checks IDs exist in DB
    ↓
Frontend shows confirm card
    ↓
User confirms
    ↓
Transformer runs → Passes through prescribedExerciseId
    ↓
Saved to DB → Exercise has valid MuscleWiki ID
```

**Key Insight:** The AI must provide `prescribedExerciseId`. The transformer should NOT be responsible for ID resolution - it just passes through what the AI provides.

---

## Chosen Solution: On-Demand Catalog + Validation

**Approach:**
1. AI calls `get_exercise_catalog` tool to load exercises before creating workout
2. AI calls `create_workout` with MuscleWiki IDs
3. Tool validates IDs exist, rejects with helpful error if not

---

### New Tool: `get_exercise_catalog`

Returns the full MuscleWiki exercise list for the AI to reference.

#### Available Filter Options (from `musclewiki_filter_cache` table)

| Filter Type | Valid Values |
|-------------|--------------|
| **muscle** | Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quadriceps, Hamstrings, Glutes, Calves, Abs, Lower Back, Traps, Lats |
| **category** | Band, Barbell, Bodyweight, Bosu-Ball, Cables, Cardio, Dumbbells, Kettlebells, Machine, Medicine-Ball, Plate, Recovery, Smith-Machine, Stretches, TRX, Vitruvian, Yoga |
| **difficulty** | Novice, Intermediate, Advanced |
| **force** | Push, Pull, Static |
| **mechanic** | Compound, Isolation |

#### Tool Schema with Zod Validation

**Filter Constraint:** The AI should use **one filter at a time** to keep results focused and manageable. Multiple filters can narrow results too much, potentially returning an empty catalog.

```typescript
// Valid filter values (from musclewiki_filter_cache)
const VALID_MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
  'Lower Back', 'Traps', 'Lats'
] as const;

const VALID_CATEGORIES = [
  'Band', 'Barbell', 'Bodyweight', 'Bosu-Ball', 'Cables', 'Cardio',
  'Dumbbells', 'Kettlebells', 'Machine', 'Medicine-Ball', 'Plate',
  'Recovery', 'Smith-Machine', 'Stretches', 'TRX', 'Vitruvian', 'Yoga'
] as const;

const VALID_DIFFICULTIES = ['Novice', 'Intermediate', 'Advanced'] as const;
const VALID_FORCES = ['Push', 'Pull', 'Static'] as const;
const VALID_MECHANICS = ['Compound', 'Isolation'] as const;

// Tool definition with validated filters
// NOTE: Use ONE filter at a time for best results
{
  name: "get_exercise_catalog",
  description: "Get the exercise catalog with MuscleWiki IDs. Call this BEFORE create_workout or create_section. Use ONE filter at a time.",
  schema: z.object({
    muscle: z.enum(VALID_MUSCLES).optional()
      .describe("Filter by target muscle (e.g., 'Chest', 'Back', 'Lats')"),
    category: z.enum(VALID_CATEGORIES).optional()
      .describe("Filter by equipment (e.g., 'Barbell', 'Dumbbells', 'Machine')"),
    difficulty: z.enum(VALID_DIFFICULTIES).optional()
      .describe("Filter by difficulty (Novice, Intermediate, Advanced)"),
    force: z.enum(VALID_FORCES).optional()
      .describe("Filter by force type (Push, Pull, Static)"),
    mechanic: z.enum(VALID_MECHANICS).optional()
      .describe("Filter by mechanic (Compound, Isolation)")
  })
}
```

#### Example Returns

```
## Exercise Catalog (filtered by muscle: Back)
ID   | Name                          | Target Muscles    | Equipment
-----|-------------------------------|-------------------|----------
213  | Lat Pulldown                  | Lats, Biceps      | Cables
214  | Lat Pulldown (Wide Grip)      | Lats              | Cables
312  | Seated Cable Row              | Back, Biceps      | Cables
448  | Barbell Bent Over Row         | Back, Biceps      | Barbell
...
(~150 exercises for Back)
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
## Creating Workouts and Sections

When creating workouts or sections with exercises, you MUST:
1. First call \`get_exercise_catalog\` to get the MuscleWiki exercise IDs
2. Then call \`create_workout\` or \`create_section\` with \`prescribedExerciseId\` for each exercise

Important rules:
- Use ONE filter at a time when calling get_exercise_catalog (don't combine multiple filters)
- Both create_workout and create_section require prescribedExerciseId for each exercise
- The tools will reject exercises without valid IDs

Example flow:
- User: "Create a chest workout"
- You: Call get_exercise_catalog with muscle: "Chest"
- You: Review the catalog, pick appropriate exercises
- You: Call create_workout with prescribedExerciseId for each exercise

Example for sections:
- User: "Create a warm-up section"
- You: Call get_exercise_catalog (no filter or filter by category: "Stretches")
- You: Call create_section with prescribedExerciseId for each exercise
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

**Empty Catalog (Over-filtered):**
```
AI calls get_exercise_catalog({ muscle: "Chest", category: "TRX", difficulty: "Advanced" })
                ↓
Tool returns:
{
  success: false,
  exercises: [],
  count: 0,
  message: "No exercises found matching the filters. Try using fewer filters or different values."
}
                ↓
AI removes some filters and retries with broader criteria
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
   - Update `workoutExerciseSchema` to include `prescribedExerciseId`
   - Update `create_workout` with ID validation
   - Update `create_section` with same ID validation (both tools share schema)

2. `apps/athli-web-api/src/services/ai/exercise-catalog.ts` (new)
   - `getExerciseCatalog(filter?: FilterOptions)` - fetch and format exercises
   - `validateExerciseIds(ids: string[])` - check IDs exist in DB
   - Cache the formatted catalog (regenerate daily)

3. `apps/athli-web-api/src/services/ai/prompts.ts`
   - Add workout creation instructions to system prompt
   - Instruct AI to use ONE filter at a time

4. `apps/athli-web-app/lib/ai-payload-transformer.ts`
   - Update to pass through `prescribedExerciseId` from AI payload
   - Fix structure to match workout schema (`itemType: "section"`, nested exercises)

5. `apps/athli-web-app/app/assistant/components/tool-status.tsx`
   - Add display name for `get_exercise_catalog` tool

**Schema Changes:**

```typescript
// Updated workoutExerciseSchema (shared by create_workout and create_section)
const workoutExerciseSchema = z.object({
  prescribedExerciseId: z.string().describe('MuscleWiki exercise ID (required)'),
  name: z.string().describe('Exercise name (for display)'),
  sets: z.number().default(3),
  reps: z.string(),
  weight: z.string().optional(),
  rest: z.number().optional(),
  notes: z.string().optional(),
});
```

**Database:**
- Read from existing `musclewiki_exercise_cache` table
- Fields: `musclewiki_id`, `name`, `target_muscles`, `category`, `difficulty`, `force`, `mechanic`

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
- [ ] `get_exercise_catalog` supports single filter at a time (muscle, category, difficulty, force, mechanic)
- [ ] `get_exercise_catalog` returns helpful error when no exercises match filters
- [ ] `create_workout` rejects exercises without `prescribedExerciseId`
- [ ] `create_workout` validates that exercise IDs exist in database
- [ ] `create_workout` returns helpful error messages for invalid IDs
- [ ] `create_section` has same validation as `create_workout` (both share schema)
- [ ] System prompt instructs AI to call `get_exercise_catalog` before `create_workout` or `create_section`
- [ ] System prompt instructs AI to use ONE filter at a time
- [ ] AI-created workouts save with correct `prescribedExerciseId` values
- [ ] AI-created sections save with correct `prescribedExerciseId` values
- [ ] Saved workouts open correctly with exercise videos and instructions
- [ ] Transformer passes through `prescribedExerciseId` (does NOT set null)

**Should Have:**
- [ ] Exercise catalog is cached (regenerated daily) for performance
- [ ] Catalog response is formatted for easy AI parsing (ID | Name | Muscles | Equipment)
- [ ] Full catalog (~1700 exercises) loads in < 5 seconds

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

## 4. End-to-End Test Cases

These tests verify the complete flow works. The AI can create any valid workout - we're just checking the structure is correct.

### Test 1: Basic Workout Creation

```
Input: "Create a chest workout with 3 exercises"

Expected:
1. AI calls get_exercise_catalog (optionally filtered by muscle: "Chest")
2. AI calls create_workout with payload containing:
   - name: any string
   - sections: array with at least 1 section
   - each exercise has prescribedExerciseId that exists in DB
3. Frontend shows confirm card
4. User confirms → workout saved to coach_workouts table

Verify in database:
- workout_data.items is not empty
- workout_data.items[].data.exercises[].exercises[].prescribedExerciseId is valid
- All prescribedExerciseId values exist in musclewiki_exercise_cache
```

### Test 2: Workout Opens Correctly

```
Prerequisite: Workout created via Test 1

Steps:
1. Navigate to /training/workouts
2. Click on the AI-created workout
3. Workout preview opens

Verify:
- Exercise names display (not "Unknown Exercise")
- Exercise thumbnails load
- Clicking exercise shows video
- Sets/reps display correctly
```

### Test 3: Filtered Catalog (One Filter at a Time)

```
Input: "Create a back workout using only dumbbells"

Expected:
1. AI calls get_exercise_catalog with ONE filter:
   - Either: muscle: "Back"
   - Or: category: "Dumbbells"
   - NOT both at once (to avoid over-filtering)
2. AI mentally filters the returned list for dumbbell back exercises
3. AI creates workout with exercises matching both criteria
4. All prescribedExerciseId values are valid

Verify:
- AI uses single filter in get_exercise_catalog call
- Exercises in workout are appropriate for the request
- No validation errors on create_workout
```

### Test 4: Error Recovery

```
Scenario: AI tries to create workout without calling get_exercise_catalog

Steps:
1. AI calls create_workout with exercises that have no prescribedExerciseId
2. Tool returns error message

Expected error:
{
  success: false,
  error: "Invalid exercise IDs:\n- \"Bench Press\" is missing prescribedExerciseId.\n\nCall get_exercise_catalog to get valid IDs."
}

Recovery:
3. AI calls get_exercise_catalog
4. AI retries create_workout with correct IDs
5. Workout saves successfully
```

### Test 5: Invalid Filter Rejected

```
Input: AI calls get_exercise_catalog({ muscle: "Legs" })

Expected:
- Zod validation rejects "Legs" (not a valid muscle)
- Error returned: "Invalid enum value. Expected 'Chest' | 'Back' | ..."
- AI should retry with valid value like "Quadriceps" or "Hamstrings"
```

### Test 6: Workout Structure Validation

```
After workout is saved, verify workout_data matches schema:

{
  items: [
    {
      itemType: "section",           // NOT "type"
      data: {
        id: "uuid",
        name: "string",
        type: "regular",
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                prescribedExerciseId: "213",    // Valid MuscleWiki ID
                performedExerciseId: null,
                id: "uuid",
                sets: [...],
                // ... other fields
              }
            ]
          }
        ]
      }
    }
  ],
  pre: { ... },
  post: { ... },
  completedSummary: { status: "not_started", ... }
}
```

### Test 7: Full Catalog Load (No Filter)

```
Input: "Create a full body workout with exercises from different muscle groups"

Expected:
1. AI calls get_exercise_catalog() with NO filters
2. Tool returns full catalog (~1700 exercises, ~85KB)
3. AI successfully processes the response
4. AI creates workout with exercises from multiple muscle groups
5. Workout saves correctly

Verify:
- Full catalog returns in < 5 seconds
- AI context window handles ~20-25k tokens from catalog
- Response is formatted correctly for AI parsing
- No timeout or memory errors
```

### Test 8: Empty Catalog Recovery

```
Input: AI calls get_exercise_catalog with over-restrictive filters

Scenario:
1. AI calls get_exercise_catalog({ muscle: "Chest", category: "TRX" })
2. No exercises match this combination

Expected:
- Tool returns: { success: false, count: 0, message: "No exercises found..." }
- AI recognizes the issue
- AI retries with fewer filters (just muscle: "Chest" OR just category: "TRX")
- AI gets results on retry
```

### Test 9: Section Creation with IDs

```
Input: "Create a reusable warm-up section"

Expected:
1. AI calls get_exercise_catalog
2. AI calls create_section (NOT create_workout) with prescribedExerciseId for each exercise
3. Tool validates IDs
4. Section saves to coach_sections table

Verify:
- Section saved with correct exercise IDs
- Section can be reused in multiple workouts
```

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Exercise ID resolution accuracy | > 95% of AI-created exercises have valid IDs |
| Workout creation success rate | > 90% of AI workouts save and open correctly |
| Section creation success rate | > 90% of AI sections save correctly |
| Full catalog load time | < 5 seconds |
| E2E tests passing | 100% of tests 1-9 pass |

---

## 6. Dependencies

- Phase 1 must be stable and in production
- `musclewiki_exercise_cache` table must be populated

---

## 7. Verification Steps

1. Start the dev server
2. Go to `/assistant` page
3. Ask: "Create a chest workout with 3 exercises"
4. Verify AI calls `get_exercise_catalog` first
5. Verify AI calls `create_workout` with `prescribedExerciseId` for each exercise
6. Confirm the workout
7. Check database: `workout_data.items[].data.exercises[].exercises[].prescribedExerciseId` should be valid
8. Open the workout in `/training/workouts` - exercises should display with videos

---

## 8. Completion

When all acceptance criteria in Section 3 pass and verification succeeds, output:

```
<promise>PHASE2COMPLETE</promise>
```
