# PRD: Athli AI Assistant - Phase 3

**Version:** 1.0
**Status:** Draft
**Last Updated:** February 2025

---

## 1. Overview

This document outlines advanced features for the AI Assistant that are planned for Phase 3. These features enhance the user experience but are not critical for core functionality.

**Prerequisites:** Phase 1 and Phase 2 must be complete and stable.

---

## 2. Features

### 2.1 File/PDF Processing

**Current State:** UI exists (file upload button) but no backend processing.

**Phase 3 Scope:**
- Accept PDF uploads of workout programs
- Parse PDF content (OCR if needed)
- Extract workout structure from unstructured text
- Convert to Athli workout format

**Technical Considerations:**
- PDF parsing library (pdf-parse, pdfjs)
- OCR for scanned documents (Tesseract, cloud OCR)
- LLM to interpret unstructured workout text
- Cost implications of processing large PDFs

**Example Flow:**
```
User uploads: "client_program.pdf"
        ↓
Backend extracts text from PDF
        ↓
LLM interprets workout structure
        ↓
AI presents: "I found 4 workouts in this PDF. Would you like me to add them to your library?"
        ↓
User confirms → Workouts created with correct exercise IDs
```

---

### 2.2 Voice Input

**Current State:** Text input only, microphone button exists but non-functional.

**Phase 3 Scope:**
- Speech-to-text for user input
- Consider voice output for responses (text-to-speech)

**Technical Options:**

| Option | Pros | Cons |
|--------|------|------|
| Web Speech API | Free, browser native | Less accurate, limited browser support |
| OpenAI Whisper | Very accurate | Paid (~$0.006/min) |
| Hybrid | Best of both | More complex |

**Recommended:** Start with Web Speech API, fallback to Whisper for poor results.

---

### 2.3 Advanced Streaming

**Current State:** Basic streaming with tool call indicators and "Thinking..." animation.

**Phase 3 Enhancements:**
- Show intermediate reasoning steps
- Display partial results as tools complete
- Progress indicator for multi-step operations
- Estimated time remaining for long operations

**Example:**
```
Creating your workout...
├── ✓ Loaded exercise catalog (0.5s)
├── ✓ Selected 6 exercises (1.2s)
├── ⏳ Generating sets and reps...
└── Estimated: 3 seconds remaining
```

---

### 2.4 Auto-Retry & Resilience

**Current State:** Basic error messages, no automatic recovery.

**Phase 3 Scope:**
- Automatic retry with exponential backoff
- Fallback to alternative LLM provider
- Queue long-running requests
- Resume interrupted conversations

**Retry Strategy:**
```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Retry flow
// Attempt 1: immediate
// Attempt 2: wait 1s
// Attempt 3: wait 2s
// Attempt 4: wait 4s
// Give up: show error with "Try again" button
```

**LLM Fallback:**
```
Primary: GPT-5 via OpenRouter
    ↓ (if fails)
Fallback: Claude via OpenRouter
    ↓ (if fails)
Error: "AI service temporarily unavailable. Please try again."
```

---

### 2.5 Mobile App Integration

**Current State:** Web app only (`/assistant` page)

**Phase 3 Scope:**
- Connect mobile `app/client/[id]/assistant.tsx` to same backend API
- Adapt UI for mobile constraints (smaller action cards, touch-friendly)
- Consider offline behavior / poor connectivity handling
- Push notifications for AI responses (if async processing added)

**Open Questions:**
- Same API endpoints or mobile-specific?
- How to handle long-running requests on mobile?
- Reduced feature set for mobile, or full parity?

---

### 2.6 Conversation Persistence

**Current State:** Frontend state only. Page refresh = lost conversation.

**Phase 3 Scope:**
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

### 2.7 Advanced Workout Types

**Current State:** AI can only create basic "regular" workouts with simple sets/reps. The workout schema supports much more.

**Gap Analysis:**

| Feature | Schema Supports | AI Can Create |
|---------|-----------------|---------------|
| Regular sections | Yes | Yes |
| AMRAP (with duration) | Yes | No |
| Tabata | Yes | No |
| HIIT | Yes | No |
| EMOM | Yes | No |
| Circuits (with rounds) | Yes | No |
| Auxiliary (warmup/cooldown) | Yes | No |
| Supersets | Yes | No (wrong implementation) |
| Warm-up/Failure/Drop sets | Yes | No |
| Tempo prescriptions | Yes | No |
| Unilateral (each side) | Yes | No |
| Alternative exercises | Yes | No |
| Custom column labels | Yes | No |

**Phase 3 Scope:**
- Expand AI tool schema to support advanced section types
- Fix superset implementation (currently wrong - uses section type instead of exercise linking)
- Add interval-based section fields (duration, work/rest, rounds)

**Solution Options:**

**Option A: Specialized Tools**
Create focused tools for each workout type:
```
create_strength_workout    → Regular sections
create_amrap_workout       → AMRAP with duration
create_hiit_workout        → HIIT with intervals
create_circuit_workout     → Circuits with rounds
create_tabata_workout      → Tabata structure
```

**Option B: Rich Schema with Smart Defaults**
Expand single `create_workout` tool to handle all types:
```typescript
const sectionSchema = z.object({
  name: z.string(),
  type: z.enum(['regular', 'amrap', 'tabata', 'hiit', 'emom', 'circuits', 'auxiliary']),

  // Type-specific (optional, validated based on type)
  durationSec: z.number().optional(),      // AMRAP
  workSec: z.number().optional(),          // Tabata, HIIT
  restSec: z.number().optional(),          // Tabata, HIIT
  rounds: z.number().optional(),           // Circuits, Tabata, HIIT
  intervalSec: z.number().optional(),      // EMOM
  category: z.enum(['warmup', 'cooldown', 'mobility']).optional(),

  exercises: z.array(exerciseSchema),
});

const exerciseSchema = z.object({
  prescribedExerciseId: z.string(),
  name: z.string(),
  // ... existing fields ...

  // Advanced (optional)
  supersetWith: z.string().optional(),     // Exercise ID to superset with
  eachSide: z.boolean().optional(),
  tempo: z.string().optional(),            // e.g., "3-1-2-0"
  alternatives: z.array(z.string()).optional(),
});
```

**Option C: Builder Pattern**
Break creation into composable steps:
```
create_workout_shell  → Base workout
add_regular_section   → Add regular section
add_amrap_section     → Add AMRAP section
add_hiit_section      → Add HIIT section
add_exercise          → Add exercise to section
create_superset       → Link exercises
finalize_workout      → Validate and confirm
```

**Recommendation:** Option B (Rich Schema) provides the best balance of flexibility and simplicity. The AI only specifies fields relevant to the workout type.

**Priority within Phase 3:**
1. AMRAP + Circuits (most requested)
2. Supersets (fix the bug)
3. Tabata/HIIT/EMOM
4. Advanced set types (warmup, failure, dropset)
5. Tempo, alternatives, each side

---

## 3. Success Metrics

| Metric | Target |
|--------|--------|
| PDF processing success rate | > 80% |
| Voice input accuracy | > 90% |
| Auto-retry success rate | > 70% of retried requests succeed |
| Mobile adoption rate | 30% of active coaches use AI on mobile |
| Conversation continuation rate | 40% of coaches return to past conversations |

---

## 4. Dependencies

- Phase 2 complete (exercise ID resolution)
- User feedback from Phase 2 to prioritize features
- Cost analysis to budget for PDF/voice processing
