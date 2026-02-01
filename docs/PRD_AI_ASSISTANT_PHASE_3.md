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

## 3. Success Metrics

| Metric | Target |
|--------|--------|
| PDF processing success rate | > 80% |
| Voice input accuracy | > 90% |
| Auto-retry success rate | > 70% of retried requests succeed |
| User satisfaction with streaming UX | > 4/5 rating |

---

## 4. Dependencies

- Phase 2 complete (exercise ID resolution, mobile, persistence)
- User feedback from Phase 2 to prioritize features
- Cost analysis to budget for PDF/voice processing
