# Athli Platform Architecture

This document provides a comprehensive overview of the Athli codebase architecture, tech stack, and development conventions.

---

## Overview

Athli is a **coach-client fitness platform** built as a Turborepo monorepo with 4 apps and 1 shared package:

| App | Tech | Port | Purpose |
|-----|------|------|---------|
| `athli-web-app` | Next.js 16 | 3001 | Main web app (coaches & clients) |
| `athli-web-api` | Express.js 5 | 3002 | Backend API |
| `athli-mobile` | Expo/React Native | - | Mobile app |
| `athli-landing-page` | Next.js | 3000 | Marketing site |
| `@athli/shared-types` | TypeScript | - | Shared types package |

---

## Monorepo Structure

```
athli-monorepo/
├── apps/
│   ├── athli-web-app/      # Next.js - main web application
│   ├── athli-web-api/      # Express.js - backend API
│   ├── athli-mobile/       # React Native/Expo - mobile app
│   └── athli-landing-page/ # Next.js - marketing site
├── packages/
│   └── shared-types/       # TypeScript types - single source of truth
├── package.json            # Root package with workspaces
└── turbo.json              # Turborepo configuration
```

---

## Tech Stack

### Frontend (Web & Landing)

- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix UI components)
- **State Management:** TanStack React Query (server cache), Context API (auth)
- **Forms:** React Hook Form + Zod validation
- **Database:** Supabase (PostgreSQL) + Supabase SSR client
- **Auth:** Supabase Auth (email, Google OAuth, Apple Sign-In)
- **API Communication:** Axios with interceptors + TanStack React Query
- **Data Visualization:** Recharts, AG Grid

### Mobile (React Native/Expo)

- **Framework:** Expo 54, React Native 0.81.5
- **Navigation:** Expo Router (file-based routing)
- **State Management:** Zustand (stores), React Query, Context
- **UI Components:** Custom + Expo UI, Lucide React Native icons
- **Styling:** React Native StyleSheet (no CSS-in-JS)
- **Database/Auth:** Supabase (persists session in MMKV storage)
- **API Communication:** Axios (same setup as web)
- **Performance:** FlashList (optimized lists), React Native Reanimated (animations)
- **Local Storage:** MMKV (encrypted key-value storage)

### Backend (API)

- **Framework:** Express.js 5.1 (TypeScript)
- **Database:** Supabase PostgreSQL (via @supabase/supabase-js admin client)
- **Auth:** JWT validation + Supabase Auth verification
- **Middleware:** Helmet (security), CORS, compression, rate-limiting, Pino logging
- **API Docs:** Swagger/OpenAPI
- **Validation:** Zod schemas

### Shared Types Package

- **Purpose:** Single source of truth for all workout, messaging, and training data types
- **Exports:** Workout schema, payload builder/converter, messaging types, training constants
- **Ensures:** Web and mobile apps stay in sync with zero drift

---

## Key Features

1. **Workout Builder** - Visual drag-drop editor for creating workouts with exercises, sets, supersets, alternatives
2. **Client Management** - Coaches assign workouts/programs to clients
3. **Progress Tracking** - Clients log workout completion on mobile
4. **Messaging** - Real-time chat via Supabase Realtime
5. **Check-ins** - Questionnaire forms from coach to client
6. **Metrics/Habits** - Tracking client progress

---

## Data Flow

### Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. COMPONENT                                                │
│    User interaction triggers action                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 2. REACT QUERY HOOK                                         │
│    useMutation/useQuery calls service function              │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 3. SERVICE CLASS                                            │
│    api/[feature]-service.ts makes API call                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 4. AXIOS INTERCEPTOR                                        │
│    Adds JWT: Authorization: Bearer {token}                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 5. API MIDDLEWARE                                           │
│    CORS, auth, validation                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 6. ROUTE HANDLER                                            │
│    Validates payload, calls service                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 7. DATABASE                                                 │
│    Supabase PostgreSQL with RLS policies                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 8. RESPONSE                                                 │
│    { success: true, data: {...} }                           │
└─────────────────────────────────────────────────────────────┘
```

### State Management

| Layer | Web | Mobile |
|-------|-----|--------|
| Server state | TanStack React Query | TanStack React Query |
| Client state | Context API | Zustand stores |
| Auth | Supabase + Context | Supabase + Zustand |
| Local storage | Cookies | MMKV |

---

## Folder Structure

### Web App (`apps/athli-web-app/`)

```
├── app/                    # Next.js App Router routes
│   ├── auth/               # Login, signup, password reset
│   ├── training/           # Workouts, programs, sections
│   ├── athletes/           # Client management (coach view)
│   ├── check-ins/          # Form submissions
│   ├── inbox/              # Messaging system
│   ├── settings/           # User preferences
│   └── home/               # Dashboard
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── app/                # App shell, navigation
│   └── training/           # Workout builder components
├── api/                    # API client layer
│   ├── api-client.ts       # Axios wrapper
│   └── [feature]-service.ts # Service classes
├── hooks/                  # Custom React hooks
│   ├── use-coach-*.ts      # Coach feature hooks
│   └── use-client-*.ts     # Client feature hooks
├── lib/
│   ├── supabase/           # Supabase client
│   └── axios.ts            # Axios interceptors
└── providers/              # React context providers
```

### API (`apps/athli-web-api/`)

```
├── src/
│   ├── routes/             # Express routes
│   │   ├── auth/           # Authentication
│   │   ├── coach/          # Coach operations
│   │   ├── client/         # Client operations
│   │   └── v1Router.ts     # Route aggregator
│   ├── services/           # Business logic
│   ├── middleware/         # Auth, error handling
│   ├── loaders/            # Express setup
│   └── server.ts           # Entry point
```

### Mobile (`apps/athli-mobile/`)

```
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with providers
│   ├── (tabs)/             # Tab-based navigation
│   ├── auth/               # Auth screens
│   ├── modals/             # Modal screens
│   └── client/[id]/        # Client detail screens
├── components/             # Reusable UI components
├── stores/                 # Zustand stores
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
├── services/               # API services
├── constants/              # Theme, typography
└── utils/                  # Utility functions
```

---

## API Routes

```
/api/v1/
├── /auth                   # Authentication
│   ├── POST /signup
│   ├── POST /signin
│   └── POST /refresh
├── /user                   # User profile
│   ├── GET /me
│   └── PUT /
├── /coach                  # Coach operations
│   ├── /clients
│   ├── /workouts
│   ├── /programs
│   ├── /sections
│   ├── /exercises
│   ├── /habits
│   └── /check-ins
├── /client                 # Client operations
│   ├── /workouts
│   └── /check-ins
├── /exercises              # Exercise library
└── /settings               # App settings
```

---

## Authentication Flow

```
1. User signs in (email, Google, Apple)
2. Supabase Auth returns session with JWT
3. Session stored in cookies (web) / MMKV (mobile)
4. Axios interceptor adds JWT to all requests
5. API middleware verifies JWT with Supabase
6. On 401: logout dialog shown, session cleared
```

---

## Development Conventions

### Web App

- Use `@/` path aliases for imports
- API calls go through service classes in `/api`
- React Query hooks in `/hooks`
- Components use shadcn/ui from `/components/ui`

### Mobile App

| Do | Don't |
|----|-------|
| `PressableOpacity` from pressto | `TouchableOpacity` |
| `haptics` utility from `@/utils/haptics` | `expo-haptics` directly |
| `StyleSheet.create()` | Inline style objects |
| `useThemePreference()` colors | Hardcoded hex colors |
| `t('key.path')` translations | Hardcoded strings |
| `FlashList` for lists | `FlatList` for large lists |
| `expo-image` | React Native Image |
| `@/` path aliases | Deep relative imports |

### API

- All routes under `/api/v1/`
- JWT verification via Supabase middleware
- Response format: `{ success, message, data }`
- Zod validation on all inputs

---

## Code Patterns

### Service Pattern (API Client)

```typescript
// api/coach/coach-workout-service.ts
export async function getCoachWorkouts(coachId: string) {
  const response = await apiFetch('/coach/workouts', {
    params: { coachId }
  });
  return response.data;
}
```

### React Query Hook Pattern

```typescript
// hooks/use-coach-workouts.ts
export function useCoachWorkouts(coachId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['coach-workouts', coachId],
    queryFn: () => getCoachWorkouts(coachId),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const createMutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['coach-workouts', coachId]
      });
    }
  });

  return { workouts: data, isLoading, createWorkout: createMutation.mutate };
}
```

### Mobile Component Pattern

```typescript
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PressableOpacity } from 'pressto';
import { haptics } from '@/utils/haptics';

export function MyComponent() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const handlePress = () => {
    haptics.medium();
    // action
  };

  return (
    <PressableOpacity onPress={handlePress}>
      <Text style={[styles.text, { color: themeColors.text }]}>
        {t('feature.label')}
      </Text>
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  text: { ...typography.p1 }
});
```

---

## Environment Variables

### Web App (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### API (`.env`)

```
NODE_ENV=development
PORT=3002
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CORS_ORIGIN=http://localhost:3001
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Run all apps in parallel
npm run dev

# Run specific platforms
npm run ios      # Mobile iOS
npm run android  # Mobile Android
```

**Development Ports:**
- Landing page: http://localhost:3000
- Web app: http://localhost:3001
- API: http://localhost:3002

---

## Additional Documentation

- `docs/PRD_AI_ASSISTANT.md` - **AI Assistant PRD** (features, architecture, acceptance criteria)
- `apps/athli-mobile/CLAUDE.md` - Detailed mobile conventions
- `apps/athli-mobile/docs/ZUSTAND_ARCHITECTURE.md` - State management
- `apps/athli-web-app/MESSAGING_INTEGRATION_GUIDE.md` - Messaging setup
- `packages/shared-types/README.md` - Shared types documentation
