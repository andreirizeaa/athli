---
# IMPLEMENTATION INSTRUCTIONS (READ FIRST)
---

## For Automated Implementation (Ralph Loop)

**CRITICAL: Read this entire section before starting.**

### Objective
Implement the Athli AI Assistant as specified in this PRD. You have been given full API keys and access to all necessary resources.

### Before You Start
**READ THE ARCHITECTURE DOCUMENT FIRST:** Before writing any code, read `/ARCHITECTURE.md` to understand the platform's tech stack, folder structure, coding conventions, and data flow patterns. This will help you make implementation decisions that align with existing patterns.

### Rules
1. **DO NOT STOP** until all features in this PRD are fully implemented
2. **DO NOT SKIP** any acceptance criteria - every single one must be tested and passing
3. **DO NOT ASK** for API keys - they are already configured in the environment
4. **DO NOT DEFER** any features listed in this PRD
5. **TEST EVERYTHING** - all acceptance criteria in Section 6 must be verified working

### Implementation Order
1. Set up backend infrastructure (AI service, routes, LangGraph agent)
2. Implement MCP tools (start with `create_workout`, then read tools)
3. Connect frontend to backend (SSE streaming, tool status indicators)
4. Implement Zustand store and payload transformer
5. Connect to workout builder
6. Test ALL acceptance criteria in Section 6

### Completion Criteria
You are DONE only when:
- [ ] All backend endpoints are implemented and working
- [ ] All MCP tools are implemented and tested
- [ ] Frontend streams responses with tool call indicators
- [ ] Human-in-the-loop works (AI asks clarifying questions)
- [ ] Workout creation flow works end-to-end (AI → Confirm → Builder)
- [ ] ALL acceptance criteria in Section 6 pass

### Completion Promise
When you have completed ALL of the above, your response MUST contain exactly:

```
RLPH_DONE
```

Then provide a summary of what was built and test results.

### Test Data Requirements

**IMPORTANT:** The account currently has NO test data (no clients, no workouts, etc.).

**Solution:** Create a seed script that uses Supabase directly.

#### Coach ID for Testing

**The coach ID to use for all test data:**
```
COACH_ID=5f016d89-03e8-4ebd-885a-42e8ff3039db
```

This is Alex Berard's account. All test clients and workouts will be added to this coach.

#### Safety Rules (CRITICAL)
1. **INSERT ONLY** - Never use DELETE, DROP, TRUNCATE, or UPDATE on existing data
2. **Prefix test data** - All test data names must start with `[TEST]` (e.g., "[TEST] John Smith")
3. **Check before insert** - Always check if test data already exists before inserting
4. **Use provided coach ID only** - Only add data to the coach ID specified above, never create new coaches
5. **No schema changes** - Never ALTER tables or modify database structure
6. **Idempotent** - Script should be safe to run multiple times without duplicating data

#### Implementation

1. Create `apps/athli-web-api/scripts/seed-test-data.ts`
2. Use the existing Supabase service role key from `.env` (`SUPABASE_SERVICE_ROLE_KEY`)
3. Use the coach ID provided above (hardcode it in the script)
4. Insert test data directly into the database:
   - 2-3 test clients linked to the coach (e.g., "[TEST] John Smith", "[TEST] Sarah Johnson")
   - Sample workouts in the coach's library (e.g., "[TEST] Push Day")
   - Basic profile data for each client
5. Run the seed script before testing acceptance criteria

```typescript
// Example seed script structure
import { createClient } from '@supabase/supabase-js';

const COACH_ID = '<FROM_PRD_ABOVE>'; // Use the coach ID from this PRD

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTestData() {
  // 1. Use the provided COACH_ID (DO NOT create new coaches)
  // 2. Check if test clients already exist (look for [TEST] prefix)
  // 3. Only INSERT if not exists
  // 4. NEVER delete or update existing data
  console.log('Test data seeded successfully');
}

seedTestData();
```

Run with: `npx ts-node apps/athli-web-api/scripts/seed-test-data.ts`

---

# PRD: Athli AI Assistant

**Version:** 1.0
**Status:** Draft
**Last Updated:** January 2025

---

## 1. Overview

### 1.1 Summary

The Athli AI Assistant is a conversational AI interface that enables coaches to perform any action they would normally do through the app via natural language. The assistant understands context, can access coach and client data, and can execute actions with user confirmation.

### 1.2 Goals

- Enable coaches to interact with Athli using natural language
- Reduce friction for common tasks (creating workouts, analyzing clients, etc.)
- Provide intelligent suggestions based on context
- Maintain safety through confirmation before executing actions

### 1.3 Non-Goals (v1)

- File/PDF processing
- Persistent chat history (session-only for v1)
- Auto-execution without confirmation
- Direct message sending (suggest only)
- Mobile app integration (web only for v1)
- Exercise ID resolution (names stored as strings for now)

### 1.4 Current State (What's Already Built)

The codebase has extensive UI scaffolding for AI features. Backend integration is the primary remaining work.

#### Web App - Assistant Page (`/assistant`)

| Component | Status | File |
|-----------|--------|------|
| Chat interface | ✅ Built | `app/assistant/components/ai-chat-interface.tsx` |
| Chat sidebar | ✅ Built | `app/assistant/components/sidebar.tsx` |
| Message bubbles | ✅ Built | `components/ui/custom/prompt/message.tsx` |
| Markdown rendering | ✅ Built | `components/ui/custom/prompt/markdown.tsx` |
| Code blocks | ✅ Built | `components/ui/custom/prompt/code-block.tsx` |
| Streaming display | ✅ Built (simulated) | `components/ui/custom/prompt/loader.tsx` |
| Client selector | ❌ Remove | No longer needed - AI handles client context via conversation |
| Suggestion chips | ✅ Built | `components/ui/custom/prompt/suggestion.tsx` |
| File attachments | ✅ Built | In `ai-chat-interface.tsx` |
| Lottie animation | ✅ Built | `public/animations/ai-sphere-animation.json` |

#### Web App - Workout Builder AI Mode

| Component | Status | File |
|-----------|--------|------|
| AI/Manual toggle | ✅ Built | `app/training/workouts/workout-builder.tsx` |
| AI prompt input | ✅ Built | In workout-builder |
| PDF upload | ✅ Built (UI only) | In workout-builder |
| Mock generation | ✅ Built | `api/exercise/generate-exercise.ts` |

#### Mobile App (Not in Scope for v1)

| Component | Status | File |
|-----------|--------|------|
| Client assistant screen | ✅ Built (UI only) | `app/client/[id]/assistant.tsx` |
| Help modal | ✅ Built | `app/modals/athli-assistant-help-modal.tsx` |


#### Backend

| Component | Status | Notes |
|-----------|--------|-------|
| AI routes | ❌ Not built | Need to create |
| AI service | ❌ Not built | Need to create |
| Tool definitions | ❌ Not built | Need to create |
| LLM integration | ❌ Not built | Need to create |

---

## 2. User Stories

### 2.1 Primary User

**Coach** - A fitness professional who manages multiple clients, creates workout programs, and tracks client progress.

### 2.2 User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-1 | Coach | Ask the AI to create a workout plan | I can quickly generate workouts without manual building |
| US-2 | Coach | Select a client for context | The AI can give personalized recommendations |
| US-3 | Coach | Review AI-generated content before saving | I can edit and ensure quality |
| US-4 | Coach | Ask questions about training principles | I can get quick answers without leaving the app |
| US-5 | Coach | Analyze a client's progress | I can make data-driven decisions |
| US-6 | Coach | Get suggestions for client messages | I can communicate more effectively |

---

## 3. Functional Requirements

### 3.1 AI Capabilities

The AI Assistant must be able to perform or assist with ALL coach actions in the app:

#### 3.1.1 Training & Workouts

| ID | Capability | Action Type | Description |
|----|------------|-------------|-------------|
| T-1 | Create workout | Execute | Generate a complete workout with sections and exercises |
| T-2 | Create training program | Execute | Generate a multi-week program |
| T-3 | Create exercise section | Execute | Generate a reusable section template |
| T-4 | Suggest exercise variations | Suggest | Recommend alternatives for exercises |
| T-5 | Create warm-up/cooldown | Execute | Generate warm-up or cooldown routines |
| T-6 | Modify existing workout | Execute | Edit an existing workout based on instructions |

#### 3.1.2 Client Management

| ID | Capability | Action Type | Description |
|----|------------|-------------|-------------|
| C-1 | Analyze client progress | Read | Summarize client's workout history and progress |
| C-2 | Analyze training load | Read | Evaluate volume, intensity, frequency |
| C-3 | Suggest workout assignment | Suggest | Recommend which workout to assign |
| C-4 | Review client check-ins | Read | Summarize recent check-in responses |
| C-5 | Identify inactive clients | Read | List clients who haven't trained recently |

#### 3.1.3 Communication (Suggest Only)

| ID | Capability | Action Type | Description |
|----|------------|-------------|-------------|
| M-1 | Draft client message | Suggest | Generate message text (user sends manually) |
| M-2 | Draft check-in form | Suggest | Suggest questions for a check-in form |
| M-3 | Motivational message | Suggest | Generate encouragement based on client data |

#### 3.1.4 Analytics & Insights

| ID | Capability | Action Type | Description |
|----|------------|-------------|-------------|
| A-1 | Progress trends | Read | Identify trends in client metrics |
| A-2 | Workout effectiveness | Read | Analyze which workouts produce results |
| A-3 | Client comparison | Read | Compare progress across clients |
| A-4 | Recovery analysis | Read | Evaluate recovery patterns |

#### 3.1.5 Knowledge & Research

| ID | Capability | Action Type | Description |
|----|------------|-------------|-------------|
| K-1 | Training principles | Answer | Explain hypertrophy, strength, etc. |
| K-2 | Exercise technique | Answer | Describe proper form and cues |
| K-3 | Injury prevention | Answer | Provide guidance on safe training |
| K-4 | Periodization | Answer | Explain programming concepts |
| K-5 | Nutrition basics | Answer | General nutrition guidance |

### 3.2 Action Types

| Type | Description | User Flow |
|------|-------------|-----------|
| **Execute** | Creates/modifies data in the system | AI generates → User reviews → User clicks "Add to Library" → Saved |
| **Suggest** | Provides recommendation without direct action | AI generates → User manually copies/uses |
| **Read** | Retrieves and summarizes existing data | AI queries data → Displays summary |
| **Answer** | Provides knowledge-based response | AI responds with information |

### 3.3 Human-in-the-Loop (Critical)

**The AI must ask for clarification when uncertain.** This is a core requirement.

**Client Resolution:** There is NO client selector dropdown. The AI resolves client context through conversation:
- User mentions "John" → AI looks up clients named John
- If exactly one match → AI proceeds with that client
- If multiple matches → AI asks: "Which John? I see John Smith and John Doe."
- If no match → AI asks: "I couldn't find a client named John. Could you check the name?"

| Situation | AI Behavior |
|-----------|-------------|
| User mentions client by name | AI looks up client, asks if ambiguous |
| Ambiguous instruction | AI asks clarifying question before proceeding |
| Multiple valid interpretations | AI presents options and asks user to choose |
| Missing required information | AI asks for the missing details |

**Never assume.** If the AI cannot confidently complete a request, it must ask the human. This prevents errors and builds trust.

### 3.4 Context & Data Access

When the AI identifies a client from conversation, it has access to:

| Data Source | Access Level | Description |
|-------------|--------------|-------------|
| Client profile | Read | Name, goals, preferences, notes |
| Workout history | Read | Past workouts, completion status |
| Progress metrics | Read | Weight, strength records, measurements |
| Check-in responses | Read | Form submissions and answers |
| Coach's exercise library | Read | Custom exercises created by coach |
| Coach's workouts | Read | Existing workout templates |
| Coach's programs | Read | Existing program templates |
| Coach's sections | Read | Existing section templates |

### 3.4 Action Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User sends message                                           │
│    "Create a push day workout for John focusing on chest"       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 2. AI processes request with context                            │
│    - Selected client: John                                      │
│    - John's history: Intermediate, bench 185lb                  │
│    - Coach's exercise library: [...]                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 3. AI generates response with action                            │
│    "Here's a push day workout for John:                         │
│                                                                 │
│    **Push Day - Chest Focus**                                   │
│    • Bench Press: 4x8                                           │
│    • Incline DB Press: 3x10                                     │
│    • Cable Flyes: 3x12                                          │
│    ...                                                          │
│                                                                 │
│    If you'd like to edit this plan, just tell me what to        │
│    change. Otherwise, click Confirm to add it to your library." │
│                                                                 │
│                                              [Confirm]          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 4. User can:                                                    │
│    a) Chat to modify → "Make it 5 sets instead" → AI adjusts    │
│    b) Click "Confirm" → Executes the action (save/apply/etc.)   │
│                                                                 │
│ Note: If user doesn't confirm, the generated content is not     │
│ saved. This is acceptable for v1 (orphaned drafts).             │
└─────────────────────────────────────────────────────────────────┘
```

**Key UX Principles:**
- AI always explains the plan in text format within the chat message
- User can iterate via chat before confirming ("make it harder", "add more exercises")
- Single "Confirm" button executes the action (could be create, edit, apply, etc.)
- Confirm action depends on context (add to library, apply change, save edit, etc.)

---

## 4. Technical Requirements

### 4.1 LLM Integration

| Requirement | Specification |
|-------------|---------------|
| Provider | OpenRouter (provides access to GPT-4o, Claude, Gemini, etc.) |
| Features | Function calling / Tool use for actions |
| Streaming | Yes, with typing indicator |
| Context window | Sufficient for client data + conversation |

### 4.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ai/chat` | POST | Send message, receive response |
| `/api/v1/ai/execute` | POST | Execute confirmed action |

### 4.3 Chat Request Schema

```typescript
interface ChatRequest {
  message: string;
  sessionId: string;
  context: {
    currentPage?: string; // e.g., "/training/workouts" for page-aware suggestions
  };
  conversationHistory: Message[];
}
// Note: No selectedClientId - client context is determined through conversation.
// If user mentions a client, AI looks them up. If ambiguous, AI asks for clarification.
```

### 4.4 Chat Response Schema

```typescript
interface ChatResponse {
  message: string;
  action?: {
    type: 'create_workout' | 'create_program' | 'create_section' | 'suggest_message' | ...;
    payload: any; // Type-specific payload
    displayComponent: 'workout_preview' | 'program_preview' | 'message_preview' | ...;
  };
}
```

### 4.5 Tool Definitions

The AI will have access to these tools/functions:

```typescript
const tools = [
  {
    name: "search_clients",
    description: "Search coach's clients by name. Use this when user mentions a client.",
    parameters: { name: string } // Returns matching clients with id, name, goals
  },
  {
    name: "get_client_data",
    description: "Retrieve detailed client information (requires client ID from search_clients)",
    parameters: { clientId: string, dataType: 'profile' | 'workouts' | 'metrics' | 'checkins' }
  },
  {
    name: "create_workout",
    description: "Create a new workout plan",
    parameters: { /* WorkoutPayload schema */ }
  },
  {
    name: "create_program",
    description: "Create a training program",
    parameters: { /* ProgramPayload schema */ }
  },
  {
    name: "search_exercises",
    description: "Search exercise library",
    parameters: { query: string, muscleGroup?: string, equipment?: string }
  },
  {
    name: "get_coach_workouts",
    description: "Get coach's workout templates",
    parameters: { limit?: number, filter?: string }
  },
  // ... more tools
];
```

---

## 5. UI/UX Requirements

### 5.1 Existing Components (Already Built)

- [x] Chat message interface
- [x] Streaming text display
- [ ] ~~Client selector dropdown~~ (Removed - AI handles client context via conversation)
- [x] Suggestion chips (Training, Analytics, etc.)
- [x] Markdown rendering
- [x] Code block syntax highlighting
- [x] Chat sidebar with session list

### 5.2 New Components Needed

| Component | Description |
|-----------|-------------|
| WorkoutPreviewCard | Display generated workout with Edit/Add buttons |
| ProgramPreviewCard | Display generated program |
| MessagePreviewCard | Display draft message with Copy button |
| ActionConfirmButton | Generic "Add to Library" / "Execute" button |
| LoadingIndicator | Show when AI is processing |

### 5.3 Action Buttons

Each executable action displays with:
- **Preview** of the generated content
- **Edit button** - Opens relevant builder with pre-filled data
- **Confirm button** - Executes the action directly

---

## 6. Acceptance Criteria

> **⚠️ MANDATORY TESTING:** Every acceptance criterion below MUST be tested before implementation is considered complete. Do not skip any. Run each test command through the AI assistant and verify the expected behavior occurs.

### 6.1 Training & Workouts

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-T1 | "Create a full body workout for beginners" | Generates workout with appropriate exercises, displays preview card, offers Add to Library |
| AC-T2 | "Create a 4-week strength program" | Generates multi-week program, displays preview, offers Add to Library |
| AC-T3 | "Make a chest and triceps section" | Generates section template, displays preview, offers Add to Library |
| AC-T4 | "What exercises can I substitute for bench press?" | Lists alternatives with explanations |
| AC-T5 | "Create a 10-minute warm-up routine" | Generates warm-up section with mobility/activation exercises |
| AC-T6 | "Add more volume to John's leg day" | Shows current workout, suggests modifications |
| AC-T7 | "Create a workout using only dumbbells" | Generates workout filtered to dumbbell exercises only |
| AC-T8 | "Create a HIIT workout with 30 second intervals" | Generates timed/circuit style workout |

### 6.2 Client Management

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-C1 | "How is John progressing?" | Summarizes workout completion, PRs, trends |
| AC-C2 | "What's John's training volume this week?" | Calculates and displays sets/reps/tonnage |
| AC-C3 | "Which workout should I give Sarah next?" | Recommends based on history and goals |
| AC-C4 | "Summarize John's last check-in" | Displays check-in responses with insights |
| AC-C5 | "Who hasn't trained in the last 7 days?" | Lists inactive clients |
| AC-C6 | "Show me John's strength progress on bench press" | Displays progress data/chart |
| AC-C7 | "What are John's goals?" | Retrieves and displays client profile info |

### 6.3 Communication

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-M1 | "Write a message to congratulate John on his PR" | Generates message draft, displays with Copy button |
| AC-M2 | "Draft a check-in reminder for Sarah" | Generates reminder message draft |
| AC-M3 | "Create a check-in form for nutrition tracking" | Generates form questions, displays preview |
| AC-M4 | "Write a motivational message for clients who missed workouts" | Generates encouraging message |

### 6.4 Analytics

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-A1 | "What are John's strongest muscle groups?" | Analyzes workout data, provides insights |
| AC-A2 | "Is John overtraining?" | Analyzes volume/frequency, provides assessment |
| AC-A3 | "Compare John and Sarah's progress" | Side-by-side comparison of metrics |
| AC-A4 | "Which of my workouts gets the best completion rate?" | Analyzes workout usage data |

### 6.5 Knowledge & Research

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-K1 | "What's the best rep range for hypertrophy?" | Provides evidence-based answer |
| AC-K2 | "How should I program for a powerlifting meet?" | Explains peaking/tapering concepts |
| AC-K3 | "My client has shoulder pain during bench press" | Provides form cues and alternatives |
| AC-K4 | "Explain progressive overload" | Educational response with examples |
| AC-K5 | "What's the difference between linear and undulating periodization?" | Comparative explanation |

### 6.6 Context Awareness

| ID | Test Question/Command | Expected Behavior |
|----|----------------------|-------------------|
| AC-X1 | Select client, then "Create a workout for them" | Uses selected client's data for personalization |
| AC-X2 | "Use my existing exercises" | References coach's exercise library |
| AC-X3 | "Similar to my Push Day workout" | References coach's existing workouts |
| AC-X4 | Follow-up: "Make it harder" | Modifies previous response appropriately |

---

## 7. Data Flow

### 7.1 Chat Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Web App │────▶│   API    │────▶│ AI Svc   │────▶│   LLM    │
│          │◀────│          │◀────│          │◀────│          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                ┌──────────┐
                │ Supabase │ (for context data)
                └──────────┘
```

### 7.2 Action Execution Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Web App │────▶│   API    │────▶│ Supabase │
│ (confirm)│◀────│ /execute │◀────│  (save)  │
└──────────┘     └──────────┘     └──────────┘
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Data access | AI only accesses data for authenticated coach's clients |
| Action safety | All execute actions require explicit user confirmation |
| Message safety | Messages are suggested, never auto-sent |
| Prompt injection | Input sanitization, system prompt hardening |
| Rate limiting | Limit API calls per user to prevent abuse |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Response time | < 3 seconds for simple queries |
| Action success rate | > 95% of executed actions complete without error |
| User satisfaction | Qualitative feedback collection |

---

## 10. Implementation Phases

### Implementation Checklist
- [ ] Backend AI service with LangGraph + OpenAI integration
- [ ] Chat endpoint with streaming
- [ ] Tool definitions for workout creation
- [ ] Tool call status indicators ("Looking up client data...")
- [ ] Human-in-the-loop: AI asks clarifying questions when uncertain
- [ ] Workout validation (feedback to AI on invalid payloads)
- [ ] Connect existing UI to real backend
- [ ] Single "Confirm" button for actions
- [ ] LangSmith setup for observability
- [ ] System prompt with safety guardrails

---

## 11. Decisions

| Question | Decision |
|----------|----------|
| LLM Provider | OpenRouter (access to GPT-4o, Claude, etc.) |
| Action button | Single "Confirm" button that executes the action (save, apply, create, etc.) |
| Edit flow | User chats to modify ("make it harder") before confirming; no separate Edit button |
| Streaming indicator | Yes, show typing indicator + tool call status messages |
| Error handling | Display friendly error message in chat |
| MCP + LangGraph | Both - MCP defines tools (extensible), LangGraph orchestrates agent (ReAct loop) |
| Streaming protocol | Server-Sent Events (SSE) - simpler than WebSockets for one-way streaming |
| Tool data persistence | Tools return payloads only; frontend saves via existing APIs |
| Tool authentication | coachId passed in tool context (not re-validated per tool call) |
| Exercise name resolution | Use AI's exercise name directly in payload (stored as strings) |
| Payload transfer | Use Zustand state management to pass data to builder pages |
| Conversation persistence | Frontend state only; page refresh = new conversation |
| Observability | Use LangSmith for all logging/tracing (requires setup) |
| Human-in-the-loop | AI must ask clarifying questions when uncertain |
| Mobile | Not in scope for v1 |

### 11.1 Context Loading Strategy

**Upfront context (loaded into system prompt):**
- Coach profile (name, preferences)
- If client selected: client name, goals, recent summary, injury notes
- Brief overview to give AI general awareness

**On-demand via tools:**
- Full workout history
- All metrics and progress data
- Check-in responses
- Exercise library searches

**Rationale:** Balance between giving AI enough context to be helpful vs. not overloading initial request with data that may not be needed.

### 11.2 Tool Response Guidelines

| Guideline | Requirement |
|-----------|-------------|
| Completeness | Return full data, never truncate |
| Detail level | Include all relevant fields |
| Pagination | For large datasets, return reasonable batch with indication of more available |

**Never truncate tool responses.** If a client has 50 workouts, the tool should return all 50 (or paginate with clear indication). The AI needs complete information to make good recommendations.

### 11.3 Agent Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max agent iterations | 10 | Prevent infinite loops |
| Request timeout | 60 seconds | Balance between UX and complex queries |
| Max tokens per request | 8000 | Leave room for response |
| Conversation history | Last 10 messages | Keep context manageable |

### 11.2 Streaming Behavior

| Phase | User Sees |
|-------|-----------|
| Agent thinking | Typing indicator (existing Lottie animation) |
| Tool call in progress | Status message: "Looking up client data...", "Searching exercises...", etc. |
| Final response | Streamed text + Confirm button (if action) |

**Important:** Tool call status indicators ARE in scope for v1. When the agent calls a tool, display a brief status message so the user knows the AI is working, not stuck. This is critical for UX since multi-tool requests can take 10-30 seconds.

### 11.3 Tool Execution

| Setting | Value | Rationale |
|---------|-------|-----------|
| Execution mode | Sequential | Tools run one at a time, not in parallel |
| Validation | In wrapper layer | Validate inside tool before returning to agent |
| Data persistence | Frontend executes | Tools return payloads, not DB records |

**Workout Validation:** When `create_workout` tool generates a payload, the wrapper validates before returning:
- All required fields present (name, at least one section, exercises in each section)
- Data types correct (sets is number, reps is string, etc.)
- If validation fails, return error to agent so it can fix and retry

**Execution Flow:**
```
AI calls create_workout tool
  → Wrapper generates payload
  → Wrapper validates payload
  → If invalid: return error to AI, AI retries
  → If valid: return payload to AI
  → AI includes payload in response
  → Frontend displays with Confirm button
  → User clicks Confirm
  → Frontend transforms payload (simplified → full API format)
  → Frontend calls POST /api/workouts to save immediately
  → On success: show toast, navigate to /training/workouts (or open builder to view)
  → On error: show error toast, keep Confirm button available to retry
```

**Key behavior:** Clicking "Confirm" saves immediately to the database. The workout is created right away, not just pre-filled in a form.

### 11.4 Streaming Architecture

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Protocol | Server-Sent Events (SSE) | One-way server→client, simpler than WebSockets |
| Endpoint | `POST /api/v1/ai/chat` returns SSE stream | Single endpoint for request + streaming response |
| Events | `thinking`, `tool_call`, `content`, `action`, `done` | Distinct event types for UI handling |

**SSE Event Types:**
```typescript
// Typing indicator
{ event: "thinking" }

// Tool being called
{ event: "tool_call", data: { tool: "get_client_profile", status: "calling" } }
{ event: "tool_call", data: { tool: "get_client_profile", status: "complete" } }

// Streamed text content
{ event: "content", data: { delta: "Here's a push day workout..." } }

// Action payload (sent at end if applicable)
{ event: "action", data: { type: "create_workout", payload: {...} } }

// Stream complete
{ event: "done" }
```

### 11.4 Error Handling Matrix

| Error Type | User Message | Action |
|------------|--------------|--------|
| Tool execution failed | "I couldn't complete that action. Try rephrasing your request." | Log to LangSmith |
| LLM timeout | "I'm taking longer than expected. Please try again." | Allow retry |
| LLM rate limit | "High demand right now. Please wait a moment." | Auto-retry after delay |
| Invalid tool response | "Something went wrong. Please try again or raise a support ticket." | Log error details |
| Max iterations reached | "This request is too complex. Try breaking it into smaller steps." | Return partial results if any |
| Validation failed | (Not shown to user) | AI receives error, attempts to fix |

### 11.5 Exercise Name Strategy

For v1, the AI generates exercise names directly in the workout payload:

```typescript
// AI generates this
{
  exercises: [
    { name: "Bench Press", sets: 4, reps: "8" },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10" }
  ]
}

// Stored as-is in workout_data
// Exercise ID resolution happens later (when client views workout)
```

**Rationale:** Simplifies initial implementation. The exercise library has 1700+ exercises - matching can be done at render time or as a background job.

### 11.6 System Prompt

The system prompt is defined in code (not database) and includes:

```
You are Athli AI, an assistant for fitness coaches using the Athli platform.

Your role:
- Help coaches create workouts, programs, and training plans
- Analyze client progress and provide insights
- Answer questions about training principles and exercise technique
- Draft messages and check-in forms

Guidelines:
- Always ask for clarification if a request is ambiguous
- If no client is selected and the request requires client context, ask which client
- Present plans in clear text format before asking for confirmation
- Be concise but thorough in explanations

Safety:
- Do NOT provide medical advice or injury diagnosis
- Do NOT recommend specific treatments for injuries
- For injury-related questions, recommend the client consult a healthcare professional
- You may suggest exercise modifications or alternatives that avoid aggravating an area

Context available:
- Coach profile and preferences
- Selected client's profile, goals, workout history, and metrics (when client selected)
- Coach's exercise library, workouts, programs, and sections
```

**Location:** `apps/athli-web-api/src/services/ai/prompts.ts`

### 11.7 Observability

| Component | Tool | Status |
|-----------|------|--------|
| LLM calls | LangSmith | Needs setup |
| Tool calls | LangSmith | Needs setup |
| Errors | LangSmith | Needs setup |
| Latency | LangSmith | Needs setup |

**Setup required:** LangSmith account, API key in environment variables, LangChain tracing enabled.

---

## 12. Architecture

### 12.1 MCP Tools Strategy

The existing API endpoints can be categorized into three types for MCP tool conversion:

#### Direct Tools (1:1 Mapping)
These endpoints map directly to MCP tools with minimal wrapping:

| API Endpoint | MCP Tool | Notes |
|--------------|----------|-------|
| `GET /coach/training/workouts` | `get_coach_workouts` | Ready as-is |
| `GET /coach/training/programs` | `get_coach_programs` | Ready as-is |
| `GET /coach/training/sections` | `get_coach_sections` | Ready as-is |
| `GET /exercises?search=&muscle=` | `search_exercises` | Ready as-is |
| `GET /clients` | `get_clients` | Ready as-is |
| `GET /clients/detail` | `get_client_profile` | Add `clientId` param |
| `GET /client/metrics` | `get_client_metrics` | Add `clientId` param |
| `POST /client/trainings/calendar` | `get_training_calendar` | Ready as-is |
| `GET /search?q=` | `search_all` | Ready as-is |

#### Thin Wrapper Tools (Simplified Input)
These need wrappers to simplify complex payloads for AI:

| MCP Tool | Simplification |
|----------|----------------|
| `create_workout` | AI sends exercise names → wrapper resolves IDs, builds full payload |
| `create_program` | AI sends workout names → wrapper resolves IDs |
| `create_section` | AI sends exercise names → wrapper resolves IDs |

#### Composite Tools (Multi-API Orchestration)
These combine multiple endpoints for complex operations:

| MCP Tool | Combines |
|----------|----------|
| `analyze_client_progress` | metrics + trainings + check-ins |
| `get_client_full_context` | profile + goals + injuries + history |
| `assign_workout_to_client` | create assignment + calendar update |

### 12.2 Thin Wrapper Example: create_workout

**Problem:** The raw API expects a complex nested structure with UUIDs, trackable fields, and execution metadata.

**Solution:** AI sends simplified input, wrapper transforms it.

#### AI Input (Simplified)
```typescript
{
  name: "Push Day",
  description: "Chest and triceps focused",
  type: "strength",
  difficulty: "intermediate",
  sections: [
    {
      name: "Main Lifts",
      type: "regular",
      exercises: [
        { name: "Bench Press", sets: 4, reps: "8", weight: "80kg", rest: 120 },
        { name: "Incline DB Press", sets: 3, reps: "10-12", weight: "30kg", rest: 90 }
      ]
    },
    {
      name: "Accessories",
      exercises: [
        { name: "Cable Flyes", sets: 3, reps: "12-15", rest: 60 }
      ]
    }
  ]
}
```

#### Wrapper Responsibilities
1. **Resolve exercise names to IDs** - Look up "Bench Press" → `exercise-uuid`
2. **Generate UUIDs** - For sections, exercises, instance IDs
3. **Expand sets** - `sets: 4, reps: "8"` → array of 4 SetPayload objects
4. **Fill defaults** - `pre`, `post`, `completedSummary` with null values
5. **Calculate totals** - `total_exercises` count

#### MCP Tool Definition
```typescript
{
  name: "create_workout",
  description: "Create a new workout template for the coach's library",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Workout name" },
      description: { type: "string" },
      type: { type: "string", enum: ["strength", "hypertrophy", "conditioning", "cardio"] },
      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["regular", "amrap", "circuit"], default: "regular" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Exercise name (will be looked up)" },
                  sets: { type: "number", default: 3 },
                  reps: { type: "string", description: "Rep target (e.g., '8', '8-12')" },
                  weight: { type: "string", description: "Weight (e.g., '80kg')" },
                  rest: { type: "number", description: "Rest in seconds" }
                },
                required: ["name"]
              }
            }
          },
          required: ["name", "exercises"]
        }
      }
    },
    required: ["name", "sections"]
  }
}
```

### 12.3 LangGraph ReAct Agent

The agent uses a ReAct (Reason + Act) loop to handle complex requests:

```
User: "Create a workout for John based on his recent progress"

Agent Loop:
  1. Think: "I need John's profile and recent workouts"
  2. Act: call get_client_profile(clientId: "john-123")
  3. Observe: { name: "John", goals: "strength", level: "intermediate" }
  4. Think: "Now I need his workout history"
  5. Act: call get_client_workouts(clientId: "john-123")
  6. Observe: [{ name: "Push Day", completed: true }, ...]
  7. Think: "He's intermediate, focused on strength, did push recently. Create pull workout."
  8. Act: call create_workout({ name: "Pull Day", sections: [...] })
  9. Observe: { success: true, workoutId: "new-uuid" }
  10. Respond: "I've created a Pull Day workout for John based on his strength goals..."
```

### 12.4 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Web App)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  /assistant page                                                             │
│  ├─ AIChatInterface (existing)                                              │
│  │   ├─ Messages display                                                    │
│  │   ├─ Suggestion chips                                                    │
│  │   └─ Prompt input                                                        │
│  └─ useAIChat hook (new)                                                    │
│      ├─ sendMessage(message, context)                                       │
│      ├─ messages state                                                      │
│      └─ confirmAction(action) → navigate to page                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 API (Express)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST /api/v1/ai/chat                                                        │
│  ├─ Authenticate user (JWT)                                                 │
│  ├─ Load context data from Supabase                                         │
│  ├─ Build system prompt                                                     │
│  ├─ Call OpenRouter LLM with tools                                          │
│  └─ Stream response back                                                    │
│                                                                              │
│  POST /api/v1/ai/execute                                                     │
│  ├─ Validate action payload                                                 │
│  ├─ Execute action (create workout, etc.)                                   │
│  └─ Return redirect URL                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI Service Layer                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  AIService                                                                   │
│  ├─ buildSystemPrompt(coach, client?)                                       │
│  ├─ chat(messages, tools) → Stream<Response>                                │
│  └─ executeAction(action, coachId) → Result                                 │
│                                                                              │
│  Tools (OpenAI Function Calling)                                             │
│  ├─ create_workout      ├─ get_client_data     ├─ analyze_progress          │
│  ├─ create_program      ├─ search_exercises    ├─ draft_message             │
│  └─ create_section      └─ get_workouts        └─ get_checkins              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenRouter (LLM Gateway)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  - Routes to GPT-4o, Claude, or other models                                │
│  - System prompt with Athli context                                          │
│  - Conversation history                                                      │
│  - Tool definitions                                                          │
│  - Streaming responses                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 File Structure

```
apps/athli-web-api/
├── src/
│   ├── api/v1/ai/
│   │   ├── ai.controller.ts      # POST /chat endpoint
│   │   ├── ai.routes.ts          # Route definitions
│   │   └── mcp/
│   │       ├── server.ts         # MCP server setup (full MCP protocol)
│   │       ├── tools/
│   │       │   ├── index.ts      # Tool registry & definitions
│   │       │   ├── training.tools.ts    # create_workout, create_program, etc.
│   │       │   ├── client.tools.ts      # search_clients, get_client_data, etc.
│   │       │   ├── exercise.tools.ts    # search_exercises
│   │       │   └── analytics.tools.ts   # analyze_progress (composite)
│   │       └── wrappers/
│   │           ├── workout.wrapper.ts   # Transforms AI input → full payload
│   │           ├── program.wrapper.ts
│   │           └── section.wrapper.ts
│   └── services/
│       └── ai/
│           ├── langgraph-agent.ts       # LangGraph.js ReAct agent
│           ├── prompts.ts               # System prompts
│           └── agent-state.ts           # Agent state management

apps/athli-web-app/
├── stores/
│   └── ai-action-store.ts        # Zustand store for AI action payloads
├── hooks/
│   └── use-ai-chat.ts            # Chat hook (SSE streaming support)
├── lib/
│   └── ai-payload-transformer.ts # Transforms AI payload → API payload
├── app/assistant/
│   └── components/
│       ├── ai-chat-interface.tsx # (update existing - connect to real API)
│       ├── action-card.tsx       # New: displays action with Confirm button
│       └── tool-status.tsx       # New: shows "Looking up client data..."
```

### 12.5.1 Dependencies

```json
// apps/athli-web-api/package.json (new dependencies)
// Note: Version placeholders - resolve to latest stable at implementation time
{
  "dependencies": {
    "@langchain/langgraph": "^0.2.x",
    "@langchain/openai": "^0.3.x",
    "@langchain/core": "^0.3.x",
    "openai": "^4.x"
  }
}
```

**Note:** OpenRouter uses OpenAI-compatible API, so we use `@langchain/openai` with OpenRouter's base URL.

### 12.6 Zustand Store for Actions

AI-generated payloads are stored in Zustand, then transformed when user confirms.

```typescript
// stores/ai-action-store.ts
import { create } from 'zustand';

interface AIActionStore {
  pendingAction: {
    type: 'create_workout' | 'create_program' | 'create_section';
    payload: any; // Simplified AI payload
  } | null;
  setPendingAction: (action: AIActionStore['pendingAction']) => void;
  clearPendingAction: () => void;
}

export const useAIActionStore = create<AIActionStore>((set) => ({
  pendingAction: null,
  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),
}));
```

**Confirm Flow (Save & Navigate):**
1. User clicks Confirm button in chat
2. Frontend transforms AI payload → full API format using `ai-payload-transformer.ts`
3. Frontend calls the appropriate API endpoint to save (e.g., `POST /api/workouts`)
4. On success:
   - Show success toast: "Workout created successfully"
   - **Navigate to the relevant page** so user can see/edit what was created:
     - Workout → `/training/workouts` (opens workout in builder)
     - Program → `/training/programs` (opens program detail)
     - Section → `/training/sections` (opens section detail)
     - Message draft → `/messages` or copy to clipboard
   - The newly created item should be highlighted/opened automatically
5. On error:
   - Show error toast
   - Keep Confirm button available for retry

**Why save & navigate:** User immediately sees the result and can make edits if needed. Creates a seamless flow from AI generation → saved item → editing.

**What Needs to Be Built:**
- Payload transformer (`ai-payload-transformer.ts`) to convert AI simplified format → full API format
- Confirm button handler that calls the transformer and API
- Success/error handling with toast notifications

### 12.7 Payload Transformation

The AI generates simplified payloads. Frontend transforms to full API format before saving.

**AI Payload (simplified):**
```typescript
{
  name: "Push Day",
  description: "Chest focused",
  sections: [
    {
      name: "Main Lifts",
      exercises: [
        { name: "Bench Press", sets: 4, reps: "8", weight: "80kg", rest: 120 }
      ]
    }
  ]
}
```

**API Payload (full):**
```typescript
{
  name: "Push Day",
  description: "Chest focused",
  type: "strength",
  difficulty: "intermediate",
  total_exercises: 1,
  sections: [
    {
      id: "uuid-generated",
      name: "Main Lifts",
      type: "regular",
      exercises: [
        {
          id: "uuid-generated",
          instanceId: "uuid-generated",
          name: "Bench Press",
          exerciseId: null, // Name stored as string
          sets: [
            { id: "uuid-1", reps: "8", weight: "80kg", completed: false },
            { id: "uuid-2", reps: "8", weight: "80kg", completed: false },
            { id: "uuid-3", reps: "8", weight: "80kg", completed: false },
            { id: "uuid-4", reps: "8", weight: "80kg", completed: false }
          ],
          rest: 120,
          notes: null
        }
      ]
    }
  ]
}
```

**Transformer responsibilities:**
- Generate UUIDs for sections, exercises, sets
- Expand `sets: 4` into array of 4 set objects
- Fill default values (type, difficulty, etc.)
- Calculate `total_exercises` count
- Set `exerciseId: null` (name stored as string)

### 12.8 Action Card Component

When AI suggests an executable action, display:

```
┌────────────────────────────────────────────────────┐
│  ✨ I'll create a Push Day workout with:           │
│                                                    │
│  • 4 exercises targeting chest and triceps        │
│  • Progressive overload with 4x8-10 rep scheme    │
│  • Includes warm-up sets                          │
│                                                    │
│                                      [Confirm]     │
└────────────────────────────────────────────────────┘
```

Clicking "Confirm" saves the workout immediately to the database.

### 12.9 Example Flow

**User:** "Create a push day workout for John"

1. Frontend sends to `/api/v1/ai/chat` (message mentions "John")
2. Backend loads John's profile, workout history, coach's exercises
3. Backend calls OpenRouter LLM with system prompt + tools
4. LLM calls `create_workout` tool with generated payload
5. Backend validates payload in wrapper
6. Backend streams response: "I'll create a Push Day workout..."
7. Backend includes action: `{ type: "create_workout", payload: {...} }`
8. Frontend displays Action Card with "Confirm" button
9. User clicks "Confirm"
10. Frontend transforms payload → full API format
11. Frontend calls `POST /api/workouts` to save
12. Success toast shown: "Workout created successfully"
13. User can view/edit the workout from the workouts list

---

## 13. Appendix

### 13.1 Existing Files to Modify

| File | Changes |
|------|---------|
| `apps/athli-web-app/app/assistant/components/ai-chat-interface.tsx` | Connect to real API, **remove client selector dropdown** |
| `apps/athli-web-api/src/routes/` | Add AI routes |

### 13.2 New Files to Create

| File | Purpose |
|------|---------|
| `apps/athli-web-api/src/services/ai/langgraph-agent.ts` | LangGraph ReAct agent |
| `apps/athli-web-api/src/services/ai/prompts.ts` | System prompts |
| `apps/athli-web-api/src/api/v1/ai/ai.controller.ts` | AI endpoints (SSE streaming) |
| `apps/athli-web-api/src/api/v1/ai/ai.routes.ts` | Route definitions |
| `apps/athli-web-api/src/api/v1/ai/mcp/tools/` | MCP tool definitions |
| `apps/athli-web-api/src/api/v1/ai/mcp/wrappers/` | Payload wrappers + validation |
| `apps/athli-web-app/stores/ai-action-store.ts` | Zustand store for AI actions |
| `apps/athli-web-app/hooks/use-ai-chat.ts` | SSE chat hook |
| `apps/athli-web-app/lib/ai-payload-transformer.ts` | AI → API payload transformer |
| `apps/athli-web-app/app/assistant/components/action-card.tsx` | Confirm button component |
| `apps/athli-web-app/app/assistant/components/tool-status.tsx` | Tool call status indicator |

### 13.3 Environment Variables Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `OPENROUTER_API_KEY` | OpenRouter API key | https://openrouter.ai/keys |
| `LANGCHAIN_API_KEY` | LangSmith API key for observability | https://smith.langchain.com/settings |
| `LANGCHAIN_TRACING_V2` | Set to `true` to enable tracing | N/A (just set to "true") |
| `LANGCHAIN_PROJECT` | LangSmith project name | N/A (e.g., "athli-ai-assistant") |

**Setup Steps:**
1. Create OpenRouter account at https://openrouter.ai
2. Generate API key from https://openrouter.ai/keys
3. Create LangSmith account (free tier available) at https://smith.langchain.com
4. Create new project in LangSmith
5. Add variables to `.env` in `apps/athli-web-api/`

**Add to file:** `apps/athli-web-api/.env`

```bash
# OpenRouter (LLM provider)
OPENROUTER_API_KEY=sk-or-v1-...

# LangSmith (observability)
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=athli-ai-assistant
```

**OpenRouter Configuration in Code:**
```typescript
// OpenRouter uses OpenAI-compatible API
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  modelName: "openai/gpt-4o", // or "anthropic/claude-3.5-sonnet"
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
```
