# Phase 2: Exercise ID Resolution

**Completion Promise:** `PHASE2COMPLETE`

When all acceptance criteria are met and tests pass, output: `<promise>PHASE2COMPLETE</promise>`

---

## Goal

Fix AI workout creation so exercises have valid MuscleWiki IDs. Currently the AI creates workouts with just exercise names, causing workout preview to fail.

---

## Implementation Tasks

### 1. Create `get_exercise_catalog` Tool

**File:** `apps/athli-web-api/src/api/v1/ai/tools/index.ts`

Add a new tool that returns exercises from `musclewiki_exercise_cache` table:

```typescript
{
  name: "get_exercise_catalog",
  description: "Get the exercise catalog with MuscleWiki IDs. Call this BEFORE create_workout or create_section. Use ONE filter at a time.",
  schema: z.object({
    muscle: z.enum(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Lower Back', 'Traps', 'Lats']).optional(),
    category: z.enum(['Band', 'Barbell', 'Bodyweight', 'Bosu-Ball', 'Cables', 'Cardio', 'Dumbbells', 'Kettlebells', 'Machine', 'Medicine-Ball', 'Plate', 'Recovery', 'Smith-Machine', 'Stretches', 'TRX', 'Vitruvian', 'Yoga']).optional(),
    difficulty: z.enum(['Novice', 'Intermediate', 'Advanced']).optional(),
    force: z.enum(['Push', 'Pull', 'Static']).optional(),
    mechanic: z.enum(['Compound', 'Isolation']).optional()
  })
}
```

Return format (text table for AI parsing):
```
ID   | Name                    | Target Muscles | Equipment
-----|-------------------------|----------------|----------
213  | Lat Pulldown            | Lats, Biceps   | Cables
```

Handle empty results with helpful error message.

### 2. Update Exercise Schema

**File:** `apps/athli-web-api/src/api/v1/ai/tools/index.ts`

Update `workoutExerciseSchema` (shared by `create_workout` and `create_section`):

```typescript
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

### 3. Add ID Validation to `create_workout` and `create_section`

**File:** `apps/athli-web-api/src/api/v1/ai/tools/index.ts`

Before returning success, validate each exercise:
1. Check `prescribedExerciseId` exists
2. Check ID exists in `musclewiki_exercise_cache` table
3. Return helpful error if validation fails

Error format:
```json
{
  "success": false,
  "error": "Invalid exercise IDs:\n- \"Lat Pulldown\" is missing prescribedExerciseId.\n\nCall get_exercise_catalog to get valid IDs."
}
```

### 4. Update System Prompt

**File:** `apps/athli-web-api/src/services/ai/prompts.ts`

Add to system prompt:
```
## Creating Workouts and Sections

When creating workouts or sections with exercises, you MUST:
1. First call `get_exercise_catalog` to get the MuscleWiki exercise IDs
2. Then call `create_workout` or `create_section` with `prescribedExerciseId` for each exercise

Important rules:
- Use ONE filter at a time when calling get_exercise_catalog
- Both create_workout and create_section require prescribedExerciseId for each exercise
- The tools will reject exercises without valid IDs
```

### 5. Fix Transformer

**File:** `apps/athli-web-app/lib/ai-payload-transformer.ts`

Current bug: Sets `exerciseId: null`

Fix:
1. Pass through `prescribedExerciseId` from AI payload
2. Fix structure to use `itemType: "section"` (not `type: "section"`)
3. Wrap exercises in `{ isSuperset: false, exercises: [...] }` structure

Expected output structure:
```typescript
{
  items: [{
    itemType: "section",
    data: {
      id: "uuid",
      name: "Section Name",
      type: "regular",
      exercises: [{
        isSuperset: false,
        exercises: [{
          prescribedExerciseId: "213",  // From AI payload
          performedExerciseId: null,
          id: "uuid",
          sets: [...],
          // other fields
        }]
      }]
    }
  }],
  pre: { ... },
  post: { ... },
  completedSummary: { status: "not_started", ... }
}
```

### 6. Add Tool Display Name

**File:** `apps/athli-web-app/app/assistant/components/tool-status.tsx`

Add display name for `get_exercise_catalog` tool.

---

## Acceptance Criteria

All must pass before outputting completion promise:

- [ ] `get_exercise_catalog` tool exists and returns exercises with IDs
- [ ] `get_exercise_catalog` supports single filter (muscle, category, difficulty, force, mechanic)
- [ ] `get_exercise_catalog` returns helpful error when no exercises match
- [ ] `create_workout` rejects exercises without `prescribedExerciseId`
- [ ] `create_workout` validates exercise IDs exist in database
- [ ] `create_section` has same validation as `create_workout`
- [ ] System prompt includes workout creation instructions
- [ ] Transformer passes through `prescribedExerciseId` (not null)
- [ ] Transformer produces correct structure (`itemType: "section"`, nested exercises)
- [ ] AI-created workouts save with valid `prescribedExerciseId` values

---

## Verification Steps

1. Start the dev server: `npm run dev` (or appropriate command)
2. Go to `/assistant` page
3. Ask: "Create a chest workout with 3 exercises"
4. Verify AI calls `get_exercise_catalog` first
5. Verify AI calls `create_workout` with `prescribedExerciseId` for each exercise
6. Confirm the workout
7. Check database: `workout_data.items[].data.exercises[].exercises[].prescribedExerciseId` should be valid
8. Open the workout in `/training/workouts` - exercises should display with videos

---

## Database Reference

Table: `musclewiki_exercise_cache`
- `musclewiki_id` - The ID to use as `prescribedExerciseId`
- `name` - Exercise name
- `target_muscles` - Array of muscle names
- `category` - Equipment category
- `difficulty` - Novice/Intermediate/Advanced
- `force` - Push/Pull/Static
- `mechanic` - Compound/Isolation

---

## When Complete

After all acceptance criteria pass and verification succeeds, output:

```
<promise>PHASE2COMPLETE</promise>
```
