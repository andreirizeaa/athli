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
| Client selector | ✅ Built | In `ai-chat-interface.tsx` |
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

#### Mobile App

| Component | Status | File |
|-----------|--------|------|
| Client assistant screen | ✅ Built | `app/client/[id]/assistant.tsx` |
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

### 3.3 Context & Data Access

When a client is selected, AI has access to:

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
│    "Here's a push day workout for John..."                      │
│    [Workout Preview Card]                                       │
│    ┌─────────────────────────────────────────┐                  │
│    │ Push Day - Chest Focus                  │                  │
│    │ • Bench Press: 4x8                      │                  │
│    │ • Incline DB Press: 3x10                │                  │
│    │ • Cable Flyes: 3x12                     │                  │
│    │ ...                                     │                  │
│    └─────────────────────────────────────────┘                  │
│    [Edit] [Add to Library]                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 4. User can:                                                    │
│    a) Click "Edit" → Opens workout builder with pre-filled data │
│    b) Click "Add to Library" → Saves directly                   │
│    c) Ask AI to modify → "Make it 5 sets instead"               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Requirements

### 4.1 LLM Integration

| Requirement | Specification |
|-------------|---------------|
| Provider | OpenAI GPT-4o (or Claude Opus 4.5 as fallback) |
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
    selectedClientId?: string;
    currentPage?: string;
  };
  conversationHistory: Message[];
}
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
    name: "get_client_data",
    description: "Retrieve client information",
    parameters: { clientId: string, dataType: 'profile' | 'workouts' | 'metrics' | 'checkins' }
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
- [x] Client selector dropdown
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

### Phase 1: Foundation (This PR)
- [ ] Backend AI service with LLM integration
- [ ] Basic chat endpoint
- [ ] Tool definitions for workout creation
- [ ] Connect existing UI to real backend
- [ ] Workout preview card component
- [ ] Execute action endpoint

### Phase 2: Full Capabilities
- [ ] All tool definitions (programs, sections, analytics)
- [ ] Client data retrieval tools
- [ ] All preview card components
- [ ] Streaming responses

### Phase 3: Enhancements
- [ ] Persistent chat history
- [ ] File/PDF processing
- [ ] Voice input
- [ ] Mobile app integration

---

## 11. Decisions

| Question | Decision |
|----------|----------|
| LLM Provider | OpenAI GPT-4o |
| Action button | Simple "Confirm" button that navigates to the relevant page (e.g., workout builder) with pre-filled data |
| Streaming indicator | Yes, show typing indicator while streaming |
| Error handling | Display friendly error message in chat |
| MCP vs LangGraph | Use both - MCP for extensible tools, LangGraph for agent orchestration |
| Tool authentication | Pass through user session (coachId from JWT) |
| Exercise name resolution | Use AI's exercise name directly in payload; matching to IDs is a later concern |
| Payload transfer | Use Zustand state management to pass data to builder pages |
| Conversation persistence | Session-only; page refresh = new conversation |
| Observability | Use LangSmith for all logging/tracing (no custom solution) |

### 11.1 Agent Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max agent iterations | 10 | Prevent infinite loops |
| Request timeout | 60 seconds | Balance between UX and complex queries |
| Max tokens per request | 8000 | Leave room for response |
| Conversation history | Last 10 messages | Keep context manageable |

### 11.2 Streaming Behavior

| Phase | User Sees |
|-------|-----------|
| Agent thinking | Typing indicator |
| Tool call in progress | (Optional) "Looking up client data..." if easy to implement |
| Final response | Streamed text + action card |

**Note:** Intermediate step streaming is nice-to-have. Don't add complexity if it's difficult.

### 11.3 Error Handling Matrix

| Error Type | User Message | Action |
|------------|--------------|--------|
| Tool execution failed | "I couldn't complete that action. Try rephrasing your request." | Log to LangSmith |
| LLM timeout | "I'm taking longer than expected. Please try again." | Allow retry |
| LLM rate limit | "High demand right now. Please wait a moment." | Auto-retry after delay |
| Invalid tool response | "Something went wrong. Please try again or raise a support ticket." | Log error details |
| Max iterations reached | "This request is too complex. Try breaking it into smaller steps." | Return partial results if any |

### 11.4 Exercise Name Strategy

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
│  │   ├─ Client selector                                                     │
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
│  ├─ Call OpenAI GPT-4o with tools                                           │
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
│                              OpenAI GPT-4o                                   │
├─────────────────────────────────────────────────────────────────────────────┤
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
│   │       │   ├── client.tools.ts      # get_client_profile, get_metrics, etc.
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
├── hooks/
│   └── use-ai-chat.ts            # Chat hook (streaming support)
├── app/assistant/
│   └── components/
│       ├── ai-chat-interface.tsx # (update existing - connect to real API)
│       └── action-card.tsx       # New: displays action with Confirm button
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

### 12.6 Action Card Component

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

Clicking "Confirm" navigates to the relevant page (e.g., `/training/workouts/new`) with pre-filled data.

### 12.7 Example Flow

**User:** "Create a push day workout for John"

1. Frontend sends to `/api/v1/ai/chat` with `selectedClientId: "john-123"`
2. Backend loads John's profile, workout history, coach's exercises
3. Backend calls GPT-4o with system prompt + tools
4. GPT-4o calls `create_workout` tool with generated payload
5. Backend streams response: "I'll create a Push Day workout..."
6. Backend includes action: `{ type: "create_workout", payload: {...} }`
7. Frontend displays Action Card with "Confirm" button
8. User clicks "Confirm"
9. Frontend navigates to `/training/workouts/new?data={encoded_payload}`
10. Workout builder opens with pre-filled data

---

## 13. Appendix

### 13.1 Existing Files to Modify

| File | Changes |
|------|---------|
| `apps/athli-web-app/app/assistant/components/ai-chat-interface.tsx` | Connect to real API |
| `apps/athli-web-api/src/routes/` | Add AI routes |

### 13.2 New Files to Create

| File | Purpose |
|------|---------|
| `apps/athli-web-api/src/services/ai.service.ts` | LLM integration |
| `apps/athli-web-api/src/api/v1/ai/ai.controller.ts` | AI endpoints |
| `apps/athli-web-api/src/api/v1/ai/ai.routes.ts` | Route definitions |
| `apps/athli-web-api/src/api/v1/ai/tools/` | Tool definitions |
| `apps/athli-web-app/components/ai/workout-preview-card.tsx` | Preview component |
| `apps/athli-web-app/components/ai/action-button.tsx` | Execute button |
