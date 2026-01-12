/**
 * @athli/shared-types
 *
 * Shared TypeScript types and utilities for the Athli platform.
 * This package ensures type consistency between web and mobile apps.
 *
 * CRITICAL: This is the SINGLE source of truth for:
 * - Workout schema types
 * - Payload building (builder → API)
 * - Payload conversion (API → builder)
 *
 * ONE SCHEMA - ONE BUILDER - ONE CONVERTER - NO DRIFT
 */

// Core schema types
export * from './workout-schema';

// Payload building (builder → API)
export * from './payload-builder';

// Payload conversion (API → builder)
export * from './payload-converter';

// Training constants (centralized)
export * from './training-constants';
