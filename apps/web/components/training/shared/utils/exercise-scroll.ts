import type { Exercise } from '@/hooks/use-all-exercises';
import type { MutableRefObject } from 'react';

// Type for the exercise lookup function (passed from hook)
export type ExerciseLookupFn = (id: string) => Exercise | undefined;

type ScrollOptions = {
  /** Whether the section containing this exercise is currently collapsed */
  isCollapsed?: boolean;
  /** Callback to expand a collapsed section */
  onExpandSection?: (sectionId: string) => void;
  /** The ID of the section containing the exercise */
  sectionId?: string;
};

/**
 * Scrolls to an exercise in the middle content area, or opens video modal if not found
 *
 * @param exercise - The exercise to scroll to
 * @param exerciseRefs - Map of exercise IDs to their DOM elements
 * @param contentScrollRef - Ref to the scrollable content container
 * @param onVideoModalOpen - Callback to open the video modal
 * @param options - Optional scroll configuration
 */
export const handleExerciseClick = (
  exercise: Exercise,
  exerciseRefs: MutableRefObject<Map<string, HTMLDivElement>>,
  contentScrollRef: MutableRefObject<HTMLDivElement | null>,
  onVideoModalOpen: (exercise: Exercise) => void,
  options?: ScrollOptions
): void => {
  // First, try to scroll to the exercise if it exists in the middle area
  const exerciseRef = exerciseRefs.current.get(exercise.exerciseId);
  if (exerciseRef && contentScrollRef.current) {
    const scrollContainer = contentScrollRef.current;
    const containerRect = scrollContainer.getBoundingClientRect();
    const exerciseRect = exerciseRef.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop;
    const exerciseTop = exerciseRect.top - containerRect.top + scrollTop;

    // Scroll to center the exercise in the viewport
    const targetScroll = exerciseTop - containerRect.height / 2 + exerciseRect.height / 2;
    scrollContainer.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  } else {
    // If exercise not found in middle area, open video modal
    onVideoModalOpen(exercise);
  }
};

/**
 * Scrolls to an exercise by its ID, expanding collapsed sections if necessary
 * Also flashes the exercise border to highlight it
 *
 * @param exerciseId - The ID of the exercise to scroll to
 * @param workoutSections - Array of workout sections
 * @param collapsedSections - Set of collapsed section IDs
 * @param exerciseRefs - Map of exercise IDs to their DOM elements
 * @param contentScrollRef - Ref to the scrollable content container
 * @param setFocusedExerciseId - Callback to set the focused exercise ID (for border flash)
 * @param setCollapsedSections - Callback to update collapsed sections
 * @param setFocusedSupersetGroupId - Optional callback to set the focused superset group ID
 */
export const handleExerciseClickById = (
  instanceId: string,
  workoutSections: Array<{
    id: string;
    exercises?: Array<{ instanceId: string; supersetGroupId?: string | null }>;
  }>,
  collapsedSections: Set<string>,
  exerciseRefs: MutableRefObject<Map<string, HTMLDivElement>>,
  contentScrollRef: MutableRefObject<HTMLDivElement | null>,
  setFocusedExerciseId: (id: string | null) => void,
  setCollapsedSections: (updater: (prev: Set<string>) => Set<string>) => void,
  _findExerciseById?: ExerciseLookupFn,
  setFocusedSupersetGroupId?: (id: string | null) => void,
  topLevelExercises?: Array<{ instanceId: string; supersetGroupId?: string | null }>
): void => {
  // Find which section contains this exercise
  const sectionContainingExercise = workoutSections.find((section) =>
    section.exercises?.some((ex) => ex.instanceId === instanceId)
  );

  // Find the exercise itself to get its supersetGroupId
  // First check in sections, then in top-level exercises
  let exercise = sectionContainingExercise?.exercises?.find((ex) => ex.instanceId === instanceId);
  if (!exercise && topLevelExercises) {
    exercise = topLevelExercises.find((ex) => ex.instanceId === instanceId);
  }

  // If the section is collapsed, expand it
  const wasCollapsed = sectionContainingExercise && collapsedSections.has(sectionContainingExercise.id);
  if (wasCollapsed && sectionContainingExercise) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionContainingExercise.id);
      return next;
    });
  }

  // Flash the border by setting focused exercise ID
  setFocusedExerciseId(instanceId);

  // If exercise is part of a superset, also set the superset group ID to flash all linked exercises
  if (setFocusedSupersetGroupId && exercise?.supersetGroupId) {
    setFocusedSupersetGroupId(exercise.supersetGroupId);
  }

  // Clear the flash after animation (1.5 seconds)
  setTimeout(() => {
    setFocusedExerciseId(null);
    if (setFocusedSupersetGroupId) {
      setFocusedSupersetGroupId(null);
    }
  }, 1500);

  // If section was collapsed, wait for it to expand before scrolling
  const scrollToExercise = () => {
    const exerciseRef = exerciseRefs.current.get(instanceId);
    if (exerciseRef && contentScrollRef.current) {
      const scrollContainer = contentScrollRef.current;
      const containerRect = scrollContainer.getBoundingClientRect();
      const exerciseRect = exerciseRef.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop;
      const exerciseTop = exerciseRect.top - containerRect.top + scrollTop;

      const targetScroll = exerciseTop - containerRect.height / 2 + exerciseRect.height / 2;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  if (wasCollapsed) {
    // Wait for the section to expand (animation duration is 300ms)
    setTimeout(scrollToExercise, 350);
  } else {
    scrollToExercise();
  }
};
