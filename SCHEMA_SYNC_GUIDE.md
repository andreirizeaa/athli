# Athli Workout Schema Synchronization Guide

**Created:** January 12, 2026
**Status:** ✅ Implemented
**Critical:** This setup ensures web and mobile apps always use the same workout schema

---

## 🎯 Problem Solved

Previously, the web and mobile apps had **duplicate workout schema definitions** that could drift out of sync. This caused critical issues:
- Workouts created on web couldn't be opened on mobile (and vice versa)
- Web app was using OLD schema (hardcoded `weight`/`reps` fields)
- Mobile app was using NEW schema (flexible `trackableField1`/`trackableField2` pattern)
- Schema changes required manually updating both apps

---

## ✅ Solution

Created a **shared TypeScript package** (`@athli/shared-types`) that both apps import from:

```
packages/
└── shared-types/
    ├── src/
    │   ├── workout-schema.ts  ← Single source of truth
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

---

## 📦 Package Structure

### `@athli/shared-types`

**Location:** `/packages/shared-types/`

**Exports:**
- All workout schema types (SetPayload, WorkoutProgramPayload, etc.)
- TrackableField pattern types
- Section types (AMRAP, Timed, Circuits, etc.)
- Helper functions (createTrackableField, createDefaultSet)

**Usage in Web App:**
```typescript
import { WorkoutProgramPayload, SetPayload, TrackableField } from '@athli/shared-types';
```

**Usage in Mobile App:**
```typescript
import { WorkoutProgramPayload, SetPayload, TrackableField } from '@athli/shared-types';
```

---

## 🔄 Migration Applied

### 1. Schema Structure Change

**Before (OLD - Web App was using this):**
```json
{
  "setNumber": 1,
  "type": "normal",
  "weight": {"prescribed": 100, "completed": 100},
  "reps": {"prescribed": 12, "completed": 12},
  "restSec": 60
}
```

**After (NEW - Both apps now use this):**
```json
{
  "setNumber": 1,
  "type": "normal",
  "trackableField1": {
    "label": "Reps",
    "prescribed": "12",
    "completed": "12"
  },
  "trackableField2": {
    "label": "kg",
    "prescribed": "100",
    "completed": "100"
  },
  "dropset": null,
  "restSec": 60,
  "completed": false,
  "skipped": false
}
```

### 2. Files Updated

#### Web App
- `apps/athli-web-app/components/training/workout-schema.ts` → Now re-exports from shared package
- `apps/athli-web-app/components/training/shared/utils/payload-builder.ts` → Updated to use TrackableField pattern
- `apps/athli-web-app/package.json` → Added `@athli/shared-types` dependency

#### Mobile App
- `apps/athli-mobile/components/features/workout/workout-schema.ts` → Now re-exports from shared package
- `apps/athli-mobile/package.json` → Added `@athli/shared-types` dependency

#### Root
- `package.json` → Added `packages/*` to workspaces

---

## 🚀 Benefits

1. **Single Source of Truth** - Schema defined once in `/packages/shared-types/src/workout-schema.ts`
2. **Automatic Sync** - Changes propagate to both apps instantly
3. **Type Safety** - TypeScript ensures both apps use correct types
4. **No More Drift** - Impossible to have different schemas on web vs mobile
5. **Easy Updates** - Update schema once, both apps get it
6. **Flexible Columns** - TrackableField pattern allows custom column types beyond weight/reps

---

## 📋 Critical Rules for Developers

### ⚠️ NEVER DO THIS:
```typescript
// ❌ DO NOT duplicate types in app files
export type SetPayload = {
  setNumber: number;
  // ...
};
```

### ✅ ALWAYS DO THIS:
```typescript
// ✅ Import from shared package
import { SetPayload } from '@athli/shared-types';
```

---

## 🛠️ Making Schema Changes

### Step 1: Update Shared Package
```bash
# Edit the schema
code packages/shared-types/src/workout-schema.ts
```

### Step 2: Test Both Apps
```bash
# Web app
cd apps/athli-web-app && npx tsc --noEmit

# Mobile app
cd apps/athli-mobile && npx tsc --noEmit
```

### Step 3: Test Cross-Platform
1. Create a workout on web
2. Open same workout on mobile (verify it loads correctly)
3. Create a workout on mobile
4. Open same workout on web (verify it loads correctly)

---

## 🔍 Verification

### Check Schema is Synced
```bash
# Should show @athli/shared-types as a dependency
cat apps/athli-web-app/package.json | grep shared-types
cat apps/athli-mobile/package.json | grep shared-types
```

### Check Import Paths
```bash
# Should show imports from @athli/shared-types
grep -r "from '@athli/shared-types'" apps/
```

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial shared package creation with TrackableField pattern |

---

## 🐛 Troubleshooting

### Issue: Types not found
```bash
# Reinstall workspace dependencies
npm install
```

### Issue: Old types still showing
```bash
# Clear TypeScript cache
rm -rf apps/*/tsconfig.tsbuildinfo
```

### Issue: Schema drift detected
1. Check both apps import from `@athli/shared-types`
2. Verify no duplicate type definitions exist
3. Run type-check on both apps

---

## 📚 Related Documentation

- Package README: `/packages/shared-types/README.md`
- Web App Training Schema: `/apps/athli-web-app/components/training/workout-schema.ts`
- Mobile App Workout Schema: `/apps/athli-mobile/components/features/workout/workout-schema.ts`

---

## ⚡ Quick Reference

```typescript
// Import shared types
import {
  // Core types
  WorkoutProgramPayload,
  WorkoutItem,
  SetPayload,
  TrackableField,

  // Exercise types
  RegularExercisePayload,
  RoundExercisePayload,
  CircuitExercisePayload,

  // Section types
  WorkoutSectionPayload,
  RegularSectionPayload,
  AmrapSectionPayload,
  TimedSectionPayload,
  CircuitsSectionPayload,

  // Helper functions
  createTrackableField,
  createDefaultSet,
  DEFAULT_EXECUTION_FIELDS,
} from '@athli/shared-types';
```

---

**Remember:** This shared package is CRITICAL to the platform. Never bypass it or duplicate types in app code!
