# AI Workout Creation Issue - Investigation Report

## Problem Summary
When the AI creates a workout and it gets saved to the database, clicking on the workout to preview it doesn't work. The exercises don't load properly because they're missing MuscleWiki IDs.

---

## Root Cause Analysis

### 1. What the AI Generates
When the AI creates a workout, it only provides exercise **names** as strings:

```json
{
  "name": "Beginner Back Builder A",
  "sections": [
    {
      "name": "Main Lifts",
      "exercises": [
        {
          "name": "Lat Pulldown (Medium Grip)",  // <-- Just a name, no ID
          "sets": 3,
          "reps": "8-12",
          "rest": 90
        }
      ]
    }
  ]
}
```

### 2. What the Database Expects
The proper workout schema requires `prescribedExerciseId` which is a MuscleWiki ID:

```typescript
// From packages/shared-types/src/workout-schema.ts
export type ExerciseIdPair = {
  prescribedExerciseId: string;  // MuscleWiki ID like "213"
  performedExerciseId: string | null;
};
```

### 3. What Gets Saved
The `transformWorkoutPayload` function in `lib/ai-payload-transformer.ts` transforms the AI payload but sets `exerciseId: null`:

```typescript
return {
  id: uuidv4(),
  instanceId: uuidv4(),
  name: exercise.name,
  exerciseId: null,  // <-- This is the problem!
  sets,
  rest: exercise.rest ?? 90,
  notes: exercise.notes || null,
};
```

### 4. The Result
When looking at the saved workout in the database:

```json
{
  "workout_data": {
    "items": [],  // Empty! Or exercises have no IDs
    "pre": {...},
    "post": {...}
  }
}
```

The workout preview can't load because:
1. `items` array is empty (wrong structure)
2. Or exercises have no `prescribedExerciseId` to look up in MuscleWiki

---

## Evidence from LangSmith Traces

The AI generates complete exercises with names but no IDs:

```
"Lat Pulldown (Medium Grip)" - no prescribedExerciseId
"Seated Cable Row (Neutral Grip)" - no prescribedExerciseId
"Dumbbell Romanian Deadlift" - no prescribedExerciseId
```

---

## The MuscleWiki Exercise System

Exercises in Athli have two IDs:
1. **Internal UUID** (`id`) - The app's internal identifier
2. **MuscleWiki ID** (`musclewikiId`) - The ID from MuscleWiki API (like "213", "448")

The workout schema uses `prescribedExerciseId` which is the MuscleWiki ID.

Example from a properly created workout:
```json
{
  "prescribedExerciseId": "213",
  "performedExerciseId": null
}
```

---

## Proposed Solutions

### Option A: AI Provides MuscleWiki IDs (Recommended)
1. Give the AI access to exercise search via the `search_exercises` tool
2. Before creating a workout, AI searches for each exercise to get its MuscleWiki ID
3. AI includes `prescribedExerciseId` in the workout payload

**Pros:** Accurate matching, exercises link correctly
**Cons:** More tool calls (slower), AI might pick wrong exercise

### Option B: Backend Auto-Matching
1. When saving an AI-created workout, backend searches for each exercise name
2. Backend automatically maps names to MuscleWiki IDs using fuzzy matching
3. If no match found, exercise is saved with name only (degraded experience)

**Pros:** No AI changes needed, works for edge cases
**Cons:** Fuzzy matching may be inaccurate, adds backend complexity

### Option C: Hybrid Approach (Best)
1. AI generates workout with exercise names
2. Frontend transformer searches MuscleWiki cache for each exercise name
3. Uses best match for `prescribedExerciseId`
4. Falls back to name-only if no match

**Pros:** Fast (uses cached exercises), no AI changes, good UX
**Cons:** Requires exercise cache to be loaded

### Option D: Deferred Linking
1. Save workout with exercise names only
2. When opening workout, frontend searches and links exercises on-the-fly
3. Cache the linkage for future opens

**Pros:** Works immediately, no changes to creation flow
**Cons:** First open is slow, linkage might change

---

## Required Changes by Solution

### Option A: AI Provides MuscleWiki IDs
Files to modify:
- `apps/athli-web-api/src/api/v1/ai/tools/index.ts`
  - Update `create_workout` tool to require `prescribedExerciseId`
  - Update `search_exercises` tool to return MuscleWiki IDs prominently
- `apps/athli-web-api/src/services/ai/prompts.ts`
  - Update prompt to instruct AI to search exercises first

### Option B: Backend Auto-Matching
Files to modify:
- `apps/athli-web-api/src/api/v1/coach/training.controller.ts`
  - Add exercise name-to-ID matching when creating workouts

### Option C: Hybrid Approach (Recommended)
Files to modify:
- `apps/athli-web-app/lib/ai-payload-transformer.ts`
  - Add function to search exercise cache and get MuscleWiki IDs
  - Update `transformWorkoutPayload` to include `prescribedExerciseId`
- `apps/athli-web-app/app/assistant/components/ai-chat-interface.tsx`
  - Pass exercise cache to transformer

---

## Additional Issue: Wrong Workout Structure

The current transformer creates a structure incompatible with the expected schema.

### Current (Wrong):
```typescript
{
  items: [
    {
      id: "...",
      type: "section",
      name: "Main Lifts",
      sectionType: "regular",
      exercises: [...]
    }
  ]
}
```

### Expected (Correct):
```typescript
{
  items: [
    {
      itemType: "section",
      data: {
        id: "...",
        name: "Main Lifts",
        type: "regular",
        exercises: [
          {
            isSuperset: false,
            exercises: [
              {
                prescribedExerciseId: "213",
                performedExerciseId: null,
                id: "...",
                sets: [...],
                // ... other fields
              }
            ]
          }
        ]
      }
    }
  ]
}
```

The transformer needs to be completely rewritten to match the shared schema.

---

## Recommendation

1. **Immediate:** Fix the transformer to use the correct workout structure (`itemType` + `data` wrapper)
2. **Short-term:** Implement Option C (Hybrid) for exercise ID matching
3. **Long-term:** Consider Option A to give AI full control over exercise selection

---

## Files Referenced

- `apps/athli-web-app/lib/ai-payload-transformer.ts` - Transform AI payload to API format
- `apps/athli-web-app/api/musclewiki/musclewiki-service.ts` - MuscleWiki exercise API
- `apps/athli-web-app/api/coach/coach-workout-service.ts` - Workout CRUD operations
- `packages/shared-types/src/workout-schema.ts` - Canonical workout schema
- `apps/athli-web-api/src/api/v1/ai/tools/index.ts` - AI tools including create_workout
