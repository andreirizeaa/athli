```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ATHLI PLATFORM ARCHITECTURE                              │
│                              Coaching & Athlete Management Platform                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────── CLIENTS ────────────────────────────────────────────┐
│                                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐  │
│   │   Coaches    │     │  Athletes   │     │  Visitors   │     │   Admin / CI            │  │
│   │ (Web App)    │     │ (Mobile)    │     │ (Marketing) │     │   (GitHub Actions)      │  │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └───────────┬─────────────┘  │
│          │                   │                   │                        │                  │
└──────────┼───────────────────┼───────────────────┼────────────────────────┼──────────────────┘
           │                   │                   │                        │
           ▼                   ▼                   ▼                        │
┌──────────────────────────────────────── FRONTEND ──────────────────────────┼──────────────────┐
│                                                                           │                   │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐   │                   │
│  │    Web App (Coach)   │  │   Mobile App (Client) │  │   Marketing    │   │                   │
│  │    apps/web          │  │   apps/mobile          │  │   apps/marketing│  │                   │
│  ├──────────────────────┤  ├──────────────────────┤  ├────────────────┤   │                   │
│  │ Next.js 16 (App      │  │ React Native + Expo   │  │ Next.js        │   │                   │
│  │ Router)              │  │ Expo Router            │  │ i18n (locale)  │   │                   │
│  │ React 19             │  │ React Native Paper     │  │ Landing pages  │   │                   │
│  │ TypeScript           │  │ TypeScript             │  │                │   │                   │
│  │ Tailwind CSS         │  │ NativeWind             │  └────────────────┘   │                   │
│  │ shadcn/ui            │  │                        │                       │                   │
│  │ Tanstack React Query │  │ Tanstack React Query   │  Deployed on:         │                   │
│  │ next-intl (i18n)     │  │                        │  Vercel (Next.js)     │                   │
│  │ Tambo (Gen UI)       │  │                        │                       │                   │
│  ├──────────────────────┤  ├──────────────────────┤                        │                   │
│  │ PAGES / FEATURES:    │  │ TABS / SCREENS:       │                        │                   │
│  │ • /home              │  │ • Home                 │                        │                   │
│  │ • /athletes          │  │ • Clients              │                        │                   │
│  │ • /assistant (AI)    │  │ • Training             │                        │                   │
│  │ • /library           │  │ • Library              │                        │                   │
│  │ • /inbox             │  │ • Chats (Inbox)        │                        │                   │
│  │ • /check-ins         │  │ • Progress             │                        │                   │
│  │ • /flows             │  │ • Profile              │                        │                   │
│  │ • /todo              │  │ • Settings             │                        │                   │
│  │ • /business          │  │ • Assistant (AI)       │                        │                   │
│  │ • /nutrition         │  │ • Notifications        │                        │                   │
│  │ • /settings          │  │ • Check-ins            │                        │                   │
│  │ • /onboarding        │  │ • Questionnaires       │                        │                   │
│  │ • /refer-and-earn    │  │ • Goals & Injuries     │                        │                   │
│  │ • /get-started       │  │ • Welcome/Onboarding   │                        │                   │
│  └──────────┬───────────┘  └──────────┬───────────┘                        │                   │
│             │                         │                                     │                   │
│             │    ┌────────────────────┐│                                     │                   │
│             │    │ @athli/shared-types ││  packages/shared-types             │                   │
│             │    │ (constants,schemas, ││  Shared across all apps            │                   │
│             │    │  functions, types)  ││                                     │                   │
│             │    └────────┬───────────┘│                                     │                   │
│             │             │            │                                     │                   │
└─────────────┼─────────────┼────────────┼─────────────────────────────────────┼───────────────────┘
              │             │            │                                     │
              ▼             │            ▼                                     │
┌────────────────────────────────────── API LAYER ────────────────────────────┼───────────────────┐
│                                                                             │                    │
│  ┌──────────────────────────────────────────────────────────────────────────┘                    │
│  │                                                                                               │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  │                        Express.js API Service (apps/service)                            │  │
│  │  │                        Port 3002 (dev) / 3000 (prod)                                    │  │
│  │  ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │  │                                                                                         │  │
│  │  │  ┌─────────────────── MIDDLEWARE CHAIN ──────────────────────────────────────────────┐  │  │
│  │  │  │  request-logger → rate-limit → supabase-auth → validate → [controller] →         │  │  │
│  │  │  │  error-handler → not-found-handler                                                │  │  │
│  │  │  └──────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  │                                                                                         │  │
│  │  │  ┌─────────────────── API ROUTES (v1) ──────────────────────────────────────────────┐  │  │
│  │  │  │                                                                                   │  │  │
│  │  │  │  /auth          - Auth (shared + coach + client)                                  │  │  │
│  │  │  │  /user          - User profiles                                                   │  │  │
│  │  │  │  /client        - Client management                                               │  │  │
│  │  │  │  /clients       - Coach → client views                                            │  │  │
│  │  │  │  /coach         - Coach features (workouts, programs, flows, check-ins, etc.)     │  │  │
│  │  │  │  /ai            - AI assistant (SSE streaming chat + chat history CRUD)            │  │  │
│  │  │  │  /exercises     - Exercise library (MuscleWiki cache)                              │  │  │
│  │  │  │  /payments      - Stripe Connect payments                                         │  │  │
│  │  │  │  /billing       - Platform billing & entitlements                                  │  │  │
│  │  │  │  /notifications - Push notification management                                     │  │  │
│  │  │  │  /settings      - App settings                                                     │  │  │
│  │  │  │  /search        - Global search                                                    │  │  │
│  │  │  │  /intercom      - Intercom integration                                             │  │  │
│  │  │  │  /feature-requests - User feature requests                                         │  │  │
│  │  │  │                                                                                   │  │  │
│  │  │  └───────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  │                                                                                         │  │
│  │  │  ┌─────────────────── SERVICES ─────────────────────────────────────────────────────┐  │  │
│  │  │  │                                                                                   │  │  │
│  │  │  │  auth.service          supabase.service        stripe.service                     │  │  │
│  │  │  │  user.service          musclewiki.service      stripe-sync.service                │  │  │
│  │  │  │  notification.service  avatar.service          stripe-platform-price.service      │  │  │
│  │  │  │  demo-data.service     entitlements.service    ai-chat-history.service            │  │  │
│  │  │  │  intercom.service      onboarding-executor     sequence-executor.service          │  │  │
│  │  │  │                                                                                   │  │  │
│  │  │  │  ┌─── AI Service (LangGraph) ───────────────────────────────────────────────┐    │  │  │
│  │  │  │  │  langgraph-agent.ts  ─── OpenRouter LLM (ChatOpenAI)                     │    │  │  │
│  │  │  │  │  prompts.ts          ─── System prompts + tool status messages            │    │  │  │
│  │  │  │  │  startup-context.ts  ─── Pre-loaded coach data injection                  │    │  │  │
│  │  │  │  │  tools/index.ts      ─── Tool registry (search clients, workouts, etc.)   │    │  │  │
│  │  │  │  └──────────────────────────────────────────────────────────────────────────┘    │  │  │
│  │  │  │                                                                                   │  │  │
│  │  │  └───────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  │                                                                                         │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                                               │
│  │  ┌─────────────────── DEPLOYMENT ──────────────────────────────────────────────────────────┐  │
│  │  │  Docker (multi-stage build) → Nginx reverse proxy (TLS) → EC2 / Container host         │  │
│  │  │  docker-compose.prod.yml: nginx (443/80) + api (3000)                                   │  │
│  │  │  ECR for container images                                                               │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                                               │
└──┴───────────────────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────── DATA / INFRA LAYER ──────────────────────────────────────────┐
│                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              SUPABASE (Hosted)                                              │  │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  PostgreSQL   │  │  Auth        │  │  Storage     │  │  Realtime    │  │  Edge        │  │  │
│  │  │  Database     │  │  (GoTrue)    │  │  (S3-compat) │  │  (WebSocket) │  │  Functions   │  │  │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├─────────────┤  │  │
│  │  │              │  │ JWT tokens   │  │ Profile pics │  │ Broadcast    │  │ Cron jobs:  │  │  │
│  │  │ 241 migrations│ │ Email/pass  │  │ Coach files  │  │ triggers for │  │             │  │  │
│  │  │              │  │ OAuth        │  │ Client       │  │ messaging,   │  │ • mark      │  │  │
│  │  │ TABLES:      │  │              │  │ photos       │  │ reactions,   │  │   missed    │  │  │
│  │  │ • user_      │  │ Row Level    │  │ Exercise     │  │ attachments  │  │   workouts  │  │  │
│  │  │   profiles   │  │ Security     │  │ videos       │  │              │  │ • populate  │  │  │
│  │  │ • coach_*    │  │ (RLS)        │  │ Form files   │  │              │  │   exercise  │  │  │
│  │  │ • client_*   │  │              │  │              │  │              │  │   cache     │  │  │
│  │  │ • messages   │  │              │  │              │  │              │  │ • cleanup   │  │  │
│  │  │ • conversations│ │             │  │              │  │              │  │   storage   │  │  │
│  │  │ • ai_chats   │  │              │  │              │  │              │  │ • habit     │  │  │
│  │  │ • coach_flows│  │              │  │              │  │              │  │   reminders │  │  │
│  │  │ • stripe_*   │  │              │  │              │  │              │  │ • coach     │  │  │
│  │  │ • referrals  │  │              │  │              │  │              │  │   digest    │  │  │
│  │  │ • notifications│ │             │  │              │  │              │  │ • free trial│  │  │
│  │  │ • push_tokens│  │              │  │              │  │              │  │   expiry    │  │  │
│  │  │ • entitlements│ │              │  │              │  │              │  │             │  │  │
│  │  │ • ai_usage   │  │              │  │              │  │              │  │ Push notif  │  │  │
│  │  │              │  │              │  │              │  │              │  │ functions:  │  │  │
│  │  │ VIEWS:       │  │              │  │              │  │              │  │ • client    │  │  │
│  │  │ • coach_     │  │              │  │              │  │              │  │ • coach     │  │  │
│  │  │   clients_   │  │              │  │              │  │              │  │ • message   │  │  │
│  │  │   view       │  │              │  │              │  │              │  │ • assignment│  │  │
│  │  │ • coach_     │  │              │  │              │  │              │  │ • referral  │  │  │
│  │  │   checkins_  │  │              │  │              │  │              │  │             │  │  │
│  │  │   review_view│  │              │  │              │  │              │  │             │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                   │
│  ┌─────────────────── EXTERNAL SERVICES ──────────────────────────────────────────────────────┐  │
│  │                                                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  Stripe      │  │  OpenRouter  │  │  LangSmith   │  │  Intercom    │  │  MuscleWiki │  │  │
│  │  │  Connect     │  │  (LLM API)   │  │  (Tracing)   │  │  (Support)   │  │  (Exercises) │  │  │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├─────────────┤  │  │
│  │  │ Payments     │  │ AI chat via  │  │ Observability│  │ Customer     │  │ Exercise    │  │  │
│  │  │ Subscriptions│  │ LangGraph    │  │ for AI agent │  │ support      │  │ database    │  │  │
│  │  │ Checkout     │  │ ReAct agent  │  │ tool calls   │  │ chat widget  │  │ cache/sync  │  │  │
│  │  │ Webhooks     │  │              │  │              │  │              │  │             │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐                                                        │  │
│  │  │  Tambo        │  │  Expo/EAS    │                                                        │  │
│  │  │  (Gen UI)     │  │  (Mobile     │                                                        │  │
│  │  ├──────────────┤  │   Build)     │                                                        │  │
│  │  │ AI-rendered  │  ├──────────────┤                                                        │  │
│  │  │ components   │  │ OTA updates  │                                                        │  │
│  │  │ in assistant │  │ App Store /  │                                                        │  │
│  │  │              │  │ Play Store   │                                                        │  │
│  │  └──────────────┘  └──────────────┘                                                        │  │
│  │                                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────── BUILD / TOOLING ─────────────────────────────────────────────┐
│                                                                                                   │
│  Turborepo (task orchestration + caching)                                                         │
│  npm workspaces (dependency management)                                                           │
│  TypeScript (full-stack type safety)                                                              │
│  Biome (linting + formatting)                                                                     │
│  Husky + lint-staged (pre-commit hooks)                                                           │
│  Vitest (backend testing)                                                                         │
│  EAS Build (mobile CI/CD)                                                                         │
│  Vercel (web + marketing deployment)                                                              │
│  Docker + ECR (service deployment)                                                                │
│                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────── DATA FLOW ───────────────────────────────────────────────────┐
│                                                                                                   │
│  Coach (Web)                                                                                      │
│    │                                                                                              │
│    ├── axios → Express API (/api/v1/*) → Supabase (service role key)                              │
│    ├── Supabase Client (direct) → Auth, Realtime subscriptions                                    │
│    └── SSE stream ← AI chat endpoint ← LangGraph agent ← OpenRouter LLM                          │
│                                                                                                   │
│  Athlete (Mobile)                                                                                 │
│    │                                                                                              │
│    ├── Supabase Client (direct) → Auth, DB queries, Realtime                                      │
│    ├── Services → Express API → Supabase (for complex operations)                                 │
│    └── Push notifications ← Supabase Edge Functions ← DB triggers                                 │
│                                                                                                   │
│  Realtime Sync:                                                                                   │
│    DB trigger → Supabase Realtime broadcast → WebSocket → Client/Coach apps                       │
│    (Used for: messaging, reactions, attachments, presence)                                         │
│                                                                                                   │
│  Payments:                                                                                        │
│    Coach Stripe Dashboard → Products/Prices                                                       │
│    Client → Stripe Checkout (in-app browser) → Webhook → Express → DB                             │
│                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```
