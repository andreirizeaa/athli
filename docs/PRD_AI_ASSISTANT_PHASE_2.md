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

**Phase 2 Solutions:**

**Option A: AI Provides MuscleWiki IDs**
1. AI uses `search_exercises` tool before creating workout
2. AI includes `prescribedExerciseId` in payload
- Pros: Accurate matching
- Cons: More tool calls (slower)

**Option B: Backend Auto-Matching**
1. Backend searches for each exercise name when saving
2. Uses fuzzy matching to find MuscleWiki IDs
- Pros: No AI changes
- Cons: Fuzzy matching may be inaccurate

**Option C: Hybrid Approach (Recommended)**
1. AI generates workout with exercise names
2. Frontend transformer searches exercise cache for matches
3. Uses best match for `prescribedExerciseId`
4. Falls back to name-only if no match
- Pros: Fast (uses cached exercises), no AI changes
- Cons: Requires exercise cache loaded

**Option D: Deferred Linking**
1. Save workout with names only
2. Link exercises on-the-fly when opening workout
- Pros: Works immediately
- Cons: First open is slow

---

**Implementation (Option C):**
```typescript
interface ExerciseMatch {
  id: string;
  musclewikiId: string;
  name: string;
  confidence: number;
}

async function resolveExerciseName(
  name: string,
  exerciseCache: Exercise[]
): Promise<ExerciseMatch | null> {
  // 1. Exact match
  // 2. Case-insensitive match
  // 3. Fuzzy match (Levenshtein)
  // Return best match with confidence score
}
```

**Files to Modify:**
- `apps/athli-web-app/lib/ai-payload-transformer.ts` - Add exercise matching, fix structure
- `apps/athli-web-app/app/assistant/components/ai-chat-interface.tsx` - Pass exercise cache
- `packages/shared-types/src/workout-schema.ts` - Reference for correct structure

**Open Questions:**
- Fuzzy matching algorithm? (Levenshtein, trigram, embeddings?)
- Confidence threshold for auto-accept vs ask user?
- Pre-index exercises for faster search?

---

### 2.2 Mobile App Integration

**Phase 1:** Web app only (`/assistant` page)

**Phase 2 Scope:**
- Connect mobile `app/client/[id]/assistant.tsx` to same backend API
- Adapt UI for mobile constraints (smaller action cards, touch-friendly)
- Consider offline behavior / poor connectivity handling
- Push notifications for AI responses (if async processing added)

**Open Questions:**
- Same API endpoints or mobile-specific?
- How to handle long-running requests on mobile?
- Reduced feature set for mobile, or full parity?

---

### 2.3 Conversation Persistence

**Phase 1:** Frontend state only. Page refresh = lost conversation.

**Phase 2 Solution:**
- Store conversations in Supabase
- Schema:
  ```sql
  CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    title TEXT, -- Auto-generated from first message
    metadata JSONB -- selected client, page context, etc.
  );

  CREATE TABLE ai_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES ai_conversations(id),
    role TEXT, -- 'user' | 'assistant' | 'system'
    content TEXT,
    action JSONB, -- If message includes an action
    created_at TIMESTAMP
  );
  ```
- Load conversation history on page load
- Sidebar shows past conversations (already built, needs data)
- Search/filter past conversations

**Open Questions:**
- Retention policy? Delete after 30 days? Keep forever?
- Max conversations per coach?
- Export conversation history?

---

### 2.4 File/PDF Processing

**Phase 1:** UI exists but no backend processing

**Phase 2 Scope:**
- Accept PDF uploads of workout programs
- Parse PDF content (OCR if needed)
- Extract workout structure from unstructured text
- Convert to Athli workout format

**Technical Considerations:**
- PDF parsing library (pdf-parse, pdfjs)
- OCR for scanned documents (Tesseract, cloud OCR)
- LLM to interpret unstructured workout text
- Cost implications of processing large PDFs

---

### 2.5 Voice Input

**Phase 1:** Text input only

**Phase 2 Scope:**
- Add microphone button to chat interface
- Speech-to-text conversion
- Consider voice output for responses (text-to-speech)

**Technical Options:**
- Web Speech API (browser native, free)
- OpenAI Whisper API (more accurate, paid)
- Hybrid: browser API with Whisper fallback

---

### 2.6 Advanced Streaming

**Phase 1:** Basic streaming with tool call indicators

**Phase 2 Enhancements:**
- Show intermediate reasoning steps
- Display partial results as tools complete
- Cancel button for long-running requests
- Progress indicator for multi-step operations

---

### 2.7 Auto-Retry & Resilience

**Phase 1:** Basic error messages

**Phase 2 Scope:**
- Automatic retry with exponential backoff
- Fallback to alternative LLM provider (Claude if OpenAI fails)
- Queue long-running requests
- Resume interrupted conversations

---

## 3. Success Metrics for Phase 2

| Metric | Target |
|--------|--------|
| Exercise name resolution accuracy | > 95% |
| Mobile adoption rate | 30% of active coaches |
| Conversation continuation rate | 40% return to past conversations |
| PDF processing success rate | > 80% |

---

## 4. Dependencies

- Phase 1 must be stable and in production
- User feedback from Phase 1 to prioritize Phase 2 features
- Cost analysis of Phase 1 to budget for Phase 2 additions
