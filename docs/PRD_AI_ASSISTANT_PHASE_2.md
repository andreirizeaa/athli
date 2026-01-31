# PRD: Athli AI Assistant - Phase 2

**Version:** 1.0
**Status:** Draft
**Last Updated:** January 2025

---

## 1. Overview

This document outlines features and improvements deferred from Phase 1 of the AI Assistant implementation. These items are intentionally out of scope for the initial release to reduce complexity and ship faster.

---

## 2. Deferred Features

### 2.1 Exercise ID Resolution

**Problem:** In Phase 1, the AI generates exercise names as strings. These need to be matched to actual exercise IDs in the database for proper workout functionality.

**Phase 2 Solution:**
- Use Supabase `exercises` table to resolve exercise names to IDs
- Implement fuzzy matching for exercise name variations (e.g., "Bench Press" → "Barbell Bench Press")
- Build a lookup service that:
  1. Searches coach's custom exercises first
  2. Falls back to global exercise library
  3. Returns closest match with confidence score
  4. If confidence < threshold, asks user to confirm/select

**Technical Approach:**
```typescript
// Example resolution flow
interface ExerciseMatch {
  id: string;
  name: string;
  confidence: number; // 0-1
}

async function resolveExerciseName(
  name: string,
  coachId: string
): Promise<ExerciseMatch[]> {
  // 1. Exact match in coach's library
  // 2. Fuzzy match in coach's library
  // 3. Exact match in global library
  // 4. Fuzzy match in global library
  // Return top 3 matches with confidence scores
}
```

**Open Questions for Phase 2:**
- What fuzzy matching algorithm? (Levenshtein, trigram, embeddings?)
- Confidence threshold for auto-accept vs ask user?
- Should we pre-index exercises for faster search?

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
