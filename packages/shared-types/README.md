# @athli/shared-types

Shared TypeScript types for the Athli platform.

## Purpose

This package is the **single source of truth** for workout schema types across the entire Athli platform. It ensures that workouts created on web can be opened on mobile and vice versa.

## Critical Rules

1. **Never duplicate these types** - Always import from this package
2. **Test on both platforms** - Any schema changes must be tested on web and mobile
3. **Version carefully** - Schema changes are breaking changes
4. **Document changes** - Update this README when adding new types

## Usage

### In Web App (Next.js)

```typescript
import { WorkoutProgramPayload, SetPayload, TrackableField } from '@athli/shared-types';
```

### In Mobile App (React Native)

```typescript
import { WorkoutProgramPayload, SetPayload, TrackableField } from '@athli/shared-types';
```

## Available Types

### Core Workout Types
- `WorkoutProgramPayload` - Complete workout payload for API
- `WorkoutItem` - Workout item (exercise or section)
- `WorkoutSectionPayload` - Section payload (union of all section types)

### Set and Exercise Types
- `SetPayload` - Set with trackable fields
- `RegularExercisePayload` - Exercise with sets
- `RoundExercisePayload` - Exercise for AMRAP/Timed sections
- `CircuitExercisePayload` - Exercise for circuit sections

### Trackable Fields
- `TrackableField` - Column with label, prescribed, and completed values
- `DropsetPayload` - Dropset with stages
- `DropsetStage` - Individual dropset stage

### Section Types
- `RegularSectionPayload` - Regular section with sets
- `AmrapSectionPayload` - AMRAP section
- `TimedSectionPayload` - Timed section
- `CircuitsSectionPayload` - Circuits section
- `AuxiliarySectionPayload` - Auxiliary section (warmup/cooldown)

### Metadata Types
- `WorkoutPre` - Pre-workout data (readiness)
- `WorkoutPost` - Post-workout data (rating, intensity)
- `WorkoutMeta` - Execution metadata (status, duration)

### Helper Types
- `ExerciseType` - Exercise type discriminator
- `SectionType` - Section type discriminator
- `WorkoutStatus` - Workout execution status

## Schema Version

Current version: **1.0.0** (TrackableField pattern)

## Migration Notes

### From Legacy Schema (weight/reps) to TrackableField Pattern

**Before:**
```typescript
{
  weight: { prescribed: 100, completed: 100 },
  reps: { prescribed: 12, completed: 12 }
}
```

**After:**
```typescript
{
  trackableField1: { label: 'Reps', prescribed: '12', completed: '12' },
  trackableField2: { label: 'kg', prescribed: '100', completed: '100' }
}
```

This change allows for flexible column types beyond just weight and reps.
