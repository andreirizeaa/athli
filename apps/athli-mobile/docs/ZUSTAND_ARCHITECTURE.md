# Zustand + React Query Architecture

## Overview

This app now uses a **centralized data fetching architecture** that combines:
- **Zustand** for client-side state management
- **React Query** for server state synchronization (used ONCE at the root level)
- **Service layer** for API calls

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Components                              │
│  - Subscribe to Zustand stores ONLY                         │
│  - Never call useQuery directly                             │
│  - Use mutation hooks for data modifications                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Zustand Stores                            │
│  - Hold all application data                                │
│  - Provide selectors for filtered/computed data             │
│  - Updated automatically by React Query                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Centralized Data Hooks                         │
│  - useLibraryData() - fetches all library items             │
│  - useClientsData() - fetches client data                   │
│  - Called ONCE in root layout via DataInitializer          │
│  - Syncs React Query data to Zustand stores                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  React Query Layer                          │
│  - Handles server state synchronization                     │
│  - Caching, refetching, background updates                  │
│  - Used once at root level                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  - Pure functions for API calls                             │
│  - Uses axios instance with auth interceptors               │
│  - No component dependencies                                │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/athli-mobile/
├── stores/
│   ├── useLibraryStore.ts        # All library data (check-ins, exercises, etc.)
│   ├── useClientsStore.ts        # Client data
│   └── index.ts                  # Barrel exports
├── hooks/
│   ├── use-library-data.ts       # Centralized library data fetching
│   └── use-clients-data.ts       # Centralized client data fetching
├── services/
│   └── coach/
│       ├── coach-check-in-service.ts
│       ├── coach-client-service.ts
│       └── ... (other services)
├── components/
│   ├── providers/
│   │   └── data-initializer.tsx  # Initializes data fetching
│   └── features/
│       └── library/
│           ├── check-ins-tab.tsx # Example: Uses Zustand, not useQuery
│           └── ... (other tabs)
└── app/
    └── _layout.tsx               # Renders DataInitializer
```

## How It Works

### 1. Root Level Initialization (app/_layout.tsx)

```tsx
import { DataInitializer } from '@/components/providers/data-initializer';

function RootLayoutNav() {
  // Initialize data fetching (runs once after auth is restored)
  DataInitializer();

  // ... rest of layout
}
```

### 2. Data Initializer (components/providers/data-initializer.tsx)

```tsx
export function DataInitializer() {
  // These hooks run ONCE and sync data to Zustand
  useLibraryData();  // Fetches check-ins, exercises, habits, etc.
  useClientsData();  // Fetches clients

  return null; // Doesn't render anything
}
```

### 3. Centralized Data Hooks (hooks/use-library-data.ts)

```tsx
export function useLibraryData() {
  const setCheckIns = useLibraryStore((state) => state.setCheckIns);

  // React Query fetches data
  const checkInsQuery = useQuery({
    queryKey: ['checkIns'],
    queryFn: getCheckIns,
  });

  // Sync to Zustand when data changes
  if (checkInsQuery.data) {
    setCheckIns(checkInsQuery.data);
  }

  return { isLoading, isError };
}
```

### 4. Zustand Stores (stores/useLibraryStore.ts)

```tsx
export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // State
  checkIns: [],
  exercises: [],

  // Actions
  setCheckIns: (checkIns) => set({ checkIns }),
  setExercises: (exercises) => set({ exercises }),

  // Computed selectors
  getFilteredCheckIns: (searchQuery: string) => {
    const { checkIns } = get();
    if (!searchQuery) return checkIns;
    return checkIns.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  },
}));
```

### 5. Components Use Zustand Only

**OLD WAY (❌ Don't do this):**
```tsx
export const CheckInsTab = () => {
  // ❌ BAD: Calling useQuery directly in component
  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkIns'],
    queryFn: getCheckIns,
  });

  // ❌ BAD: Multiple components doing this = multiple API calls
}
```

**NEW WAY (✅ Do this):**
```tsx
export const CheckInsTab = () => {
  const { searchQuery } = useLibraryTab();

  // ✅ GOOD: Get data from Zustand store
  const getFilteredCheckIns = useLibraryStore((state) => state.getFilteredCheckIns);
  const filteredCheckIns = useMemo(
    () => getFilteredCheckIns(searchQuery),
    [getFilteredCheckIns, searchQuery]
  );

  // ✅ GOOD: Get mutations for modifications
  const { deleteCheckIn } = useLibraryMutations();

  // Component just renders data from Zustand
  return <View>{/* ... */}</View>;
}
```

## Benefits

### ✅ **Single API Call Per Resource**
- `useLibraryData()` is called ONCE at the root
- All library tabs share the same data
- No duplicate network requests

### ✅ **Consistent Data Across App**
- Zustand stores are the single source of truth
- All components see the same data
- Updates propagate automatically

### ✅ **Better Performance**
- No re-fetching when navigating between tabs
- Efficient filtering via computed selectors
- Reduced memory overhead

### ✅ **Simpler Components**
- No loading/error states to manage (handled at root)
- Just subscribe to Zustand and render
- Clear separation of concerns

### ✅ **Optimistic Updates**
- Mutations invalidate React Query cache
- React Query re-fetches in background
- Zustand auto-updates with new data

## Data Flow Example

### When User Opens the App:

```
1. App starts
   ↓
2. _layout.tsx renders
   ↓
3. DataInitializer runs
   ↓
4. useLibraryData() hook executes
   ↓
5. React Query fetches from API
   ↓
6. Data synced to Zustand stores
   ↓
7. Components subscribe to Zustand
   ↓
8. UI renders with data
```

### When User Deletes a Check-In:

```
1. Component calls deleteMutation.mutate(id)
   ↓
2. Mutation sends DELETE to API
   ↓
3. On success, invalidates React Query cache
   ↓
4. React Query refetches in background
   ↓
5. New data synced to Zustand
   ↓
6. Components re-render automatically
```

## Migration Guide

### For Library Tab Components:

1. **Remove** `useQuery` import and usage
2. **Add** Zustand store subscription:
   ```tsx
   const getFilteredItems = useLibraryStore((state) => state.getFilteredXXX);
   ```
3. **Use** `useLibraryMutations()` for delete/duplicate
4. **Remove** loading/error states (data is always available)

### For Client Components:

1. **Remove** `useQuery` import and usage
2. **Add** Zustand store subscription:
   ```tsx
   const clients = useClientsStore((state) => state.clients);
   ```
3. **Use** `useClientMutations()` for add/update/delete
4. **Remove** loading/error states

## Common Patterns

### Filtering Data:
```tsx
const getFilteredItems = useLibraryStore((state) => state.getFilteredCheckIns);
const items = useMemo(
  () => getFilteredItems(searchQuery),
  [getFilteredItems, searchQuery]
);
```

### Getting Specific Item:
```tsx
const getClientById = useClientsStore((state) => state.getClientById);
const client = getClientById(id);
```

### Mutations with Callbacks:
```tsx
const { deleteCheckIn } = useLibraryMutations();

deleteMutation.mutate(id, {
  onSuccess: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  onError: (error) => {
    Alert.alert('Error', error.message);
  },
});
```

## Troubleshooting

**Q: Data isn't showing up in components?**
- Check that `DataInitializer()` is called in `_layout.tsx`
- Verify Zustand store exports in `stores/index.ts`
- Check network tab - is data being fetched?

**Q: Getting stale data?**
- Mutations should invalidate React Query cache
- Check mutation `onSuccess` callbacks
- Verify `queryClient.invalidateQueries()` is called

**Q: Multiple API calls for same data?**
- Make sure components use Zustand, not `useQuery` directly
- Only `DataInitializer` should call data hooks

**Q: How to force refresh?**
- Use `queryClient.invalidateQueries({ queryKey: ['checkIns'] })`
- React Query will refetch and sync to Zustand
