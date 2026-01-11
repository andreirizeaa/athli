# Library Tab Migration Guide

This guide shows exactly how to migrate each library tab component from using direct `useQuery` calls to the centralized Zustand architecture.

## Migration Status

### ✅ Completed:
- `check-ins-tab.tsx`
- `exercises-tab.tsx`
- `habits-tab.tsx`

### 📝 Remaining:
- `metrics-tab.tsx`
- `questionnaires-tab.tsx`
- `sections-tab.tsx`
- `workouts-tab.tsx`
- `programs-tab.tsx`
- `files-tab.tsx`

## Step-by-Step Migration

### Step 1: Update Imports

**Remove:**
```tsx
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';
import { getItems } from '@/services/...';  // Remove the getter function
```

**Add:**
```tsx
import { useLibraryStore } from '@/stores';
```

**Example:**
```tsx
// Before
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMetrics, deleteMetric } from '@/services/coach/coach-metric-service';

// After
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryStore } from '@/stores';
import { deleteMetric } from '@/services/coach/coach-metric-service';
```

### Step 2: Replace useQuery with Zustand

**Remove:**
```tsx
const { data: items = [], isLoading, error } = useQuery({
  queryKey: ['items'],
  queryFn: getItems,
});

const filteredItems = useMemo(() => {
  if (!searchQuery) return items;
  const query = searchQuery.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(query));
}, [items, searchQuery]);
```

**Replace with:**
```tsx
const getFilteredItems = useLibraryStore((state) => state.getFilteredXXX);
const filteredItems = useMemo(
  () => getFilteredItems(searchQuery),
  [getFilteredItems, searchQuery]
);
```

**Examples:**
```tsx
// Metrics tab
const getFilteredMetrics = useLibraryStore((state) => state.getFilteredMetrics);
const filteredMetrics = useMemo(
  () => getFilteredMetrics(searchQuery),
  [getFilteredMetrics, searchQuery]
);

// Questionnaires tab
const getFilteredQuestionnaires = useLibraryStore((state) => state.getFilteredQuestionnaires);
const filteredQuestionnaires = useMemo(
  () => getFilteredQuestionnaires(searchQuery),
  [getFilteredQuestionnaires, searchQuery]
);

// Sections tab
const getFilteredSections = useLibraryStore((state) => state.getFilteredSections);
const filteredSections = useMemo(
  () => getFilteredSections(searchQuery),
  [getFilteredSections, searchQuery]
);

// Workouts tab
const getFilteredWorkouts = useLibraryStore((state) => state.getFilteredWorkouts);
const filteredWorkouts = useMemo(
  () => getFilteredWorkouts(searchQuery),
  [getFilteredWorkouts, searchQuery]
);

// Programs tab (if exists)
const getFilteredPrograms = useLibraryStore((state) => state.getFilteredPrograms);
const filteredPrograms = useMemo(
  () => getFilteredPrograms(searchQuery),
  [getFilteredPrograms, searchQuery]
);

// Files tab
const getFilteredFiles = useLibraryStore((state) => state.getFilteredFiles);
const filteredFiles = useMemo(
  () => getFilteredFiles(searchQuery),
  [getFilteredFiles, searchQuery]
);
```

### Step 3: Remove Loading/Error States

**Remove these sections:**
```tsx
{/* Loading State */}
{isLoading && (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={themeColors.text} />
    <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
      {t('general.loading')}
    </Text>
  </View>
)}

{/* Error State */}
{error && !isLoading && (
  <View style={styles.centerContainer}>
    <Text style={[styles.errorText, { color: themeColors.mutedText }]}>
      {t('general.errorLoadingData')}
    </Text>
  </View>
)}
```

**Keep only:**
```tsx
{/* Empty State */}
{filteredItems.length === 0 && (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
      {t('library.empty.message')}
    </Text>
  </View>
)}
```

### Step 4: Update List Rendering

**Change from:**
```tsx
{!isLoading && !error && filteredItems.map((item, index) => {
```

**To:**
```tsx
{filteredItems.map((item, index) => {
```

### Step 5: Update Type References

**Change from:**
```tsx
const handleItemPress = (item: typeof items[0]) => {
```

**To:**
```tsx
const handleItemPress = (item: typeof filteredItems[0]) => {
```

## Complete Example: Metrics Tab

Here's a complete before/after example for `metrics-tab.tsx`:

### Before:
```tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryTab } from '@/stores';
import { getAllMetrics, deleteMetric } from '@/services/coach/coach-metric-service';

export const MetricsTab = () => {
  const { searchQuery } = useLibraryTab();
  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: getAllMetrics,
  });

  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return metrics;
    const query = searchQuery.toLowerCase();
    return metrics.filter((item) => item.name.toLowerCase().includes(query));
  }, [metrics, searchQuery]);

  // ... mutations and handlers ...

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator />}
      {error && <Text>Error loading data</Text>}
      {!isLoading && !error && filteredMetrics.map((metric) => (
        // ... render metric
      ))}
    </View>
  );
};
```

### After:
```tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { deleteMetric } from '@/services/coach/coach-metric-service';

export const MetricsTab = () => {
  const { searchQuery } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get metrics from Zustand store
  const getFilteredMetrics = useLibraryStore((state) => state.getFilteredMetrics);
  const filteredMetrics = useMemo(
    () => getFilteredMetrics(searchQuery),
    [getFilteredMetrics, searchQuery]
  );

  // ... mutations and handlers ...

  return (
    <View style={styles.container}>
      {filteredMetrics.length === 0 && <Text>No metrics</Text>}
      {filteredMetrics.map((metric) => (
        // ... render metric
      ))}
    </View>
  );
};
```

## Quick Checklist

For each file you migrate:

- [ ] Remove `useQuery` import
- [ ] Remove `ActivityIndicator` import
- [ ] Remove getter function import (e.g., `getMetrics`)
- [ ] Add `useLibraryStore` import
- [ ] Replace `useQuery` call with Zustand store subscription
- [ ] Update type references from `items` to `filteredItems`
- [ ] Remove loading state section
- [ ] Remove error state section
- [ ] Update list rendering condition (remove `!isLoading && !error`)
- [ ] Test the component

## Testing After Migration

1. **TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

2. **Check for errors in specific file:**
   ```bash
   npx tsc --noEmit 2>&1 | grep "metrics-tab"
   ```

3. **Run the app and verify:**
   - Component renders correctly
   - Search/filtering works
   - Delete/duplicate mutations work
   - No duplicate API calls (check network tab)
   - Data persists when navigating between tabs

## Common Issues

### Issue: "Property does not exist on type"
**Solution:** Make sure you're using the correct `getFilteredXXX` method name from the store.

### Issue: "Cannot read property of undefined"
**Solution:** The store might not be initialized. Check that `DataInitializer` is called in `_layout.tsx`.

### Issue: "Data not loading"
**Solution:** Verify that the corresponding query key in `use-library-data.ts` matches what you're invalidating in mutations.

## Notes

- **Don't** modify the mutations - they still use `useQueryClient.invalidateQueries()` which triggers React Query to refetch
- **Don't** worry about data loading - it's handled at the app root level
- **Do** keep the empty state rendering
- **Do** update all type references to use `filteredItems` instead of `items`
