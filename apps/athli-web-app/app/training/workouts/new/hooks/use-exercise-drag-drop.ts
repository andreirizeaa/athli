import { useCallback, useRef, useState } from 'react';
import type { Exercise } from '@/api/exercise/exercise-search';

export type DragOverSlot = {
  sectionId: string;
  slotIndex: number;
} | null;

type UseExerciseDragDropOptions = {
  onExpandSection?: (sectionId: string) => void;
};

export const useExerciseDragDrop = (options?: UseExerciseDragDropOptions) => {
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<DragOverSlot>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const expandedSectionsRef = useRef<Set<string>>(new Set());

  /**
   * Calculate the nearest drop slot based on mouse position
   * This provides smooth, intelligent positioning without requiring precise dragging
   */
  const calculateNearestSlot = useCallback((
    e: React.DragEvent,
    sectionId: string,
    exerciseCount: number
  ): DragOverSlot => {
    if (!draggedExercise) return null;

    const sectionElement = sectionRefs.current.get(sectionId);
    if (!sectionElement) return null;

    // If section is empty, always slot 0
    if (exerciseCount === 0) {
      return { sectionId, slotIndex: 0 };
    }

    // Get all exercise cards in this section
    const exerciseCards = Array.from(
      sectionElement.querySelectorAll('[data-exercise-card]')
    ) as HTMLElement[];

    if (exerciseCards.length === 0) {
      return { sectionId, slotIndex: 0 };
    }

    const mouseY = e.clientY;
    let nearestSlotIndex = 0;
    let minDistance = Infinity;

    // Check distance to position before first card
    const firstCard = exerciseCards[0];
    const firstCardRect = firstCard.getBoundingClientRect();
    const distanceToFirst = Math.abs(mouseY - firstCardRect.top);

    if (distanceToFirst < minDistance) {
      minDistance = distanceToFirst;
      nearestSlotIndex = 0;
    }

    // Check distances after each card
    exerciseCards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardBottom = cardRect.bottom;

      // Distance to position after this card
      const distanceToAfter = Math.abs(mouseY - cardBottom);

      if (distanceToAfter < minDistance) {
        minDistance = distanceToAfter;
        nearestSlotIndex = index + 1;
      }
    });

    return { sectionId, slotIndex: nearestSlotIndex };
  }, [draggedExercise]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((exercise: Exercise) => {
    setDraggedExercise(exercise);
  }, []);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedExercise(null);
    setDragOverSectionId(null);
    setDragOverSlot(null);
    // Clear expanded sections tracking
    expandedSectionsRef.current.clear();
  }, []);

  /**
   * Handle drag over section - calculates nearest slot automatically
   */
  const handleSectionDragOver = useCallback((
    e: React.DragEvent,
    sectionId: string,
    exerciseCount: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedExercise) return;

    setDragOverSectionId(sectionId);

    // Expand collapsed section when dragging over it (only once per drag session)
    if (options?.onExpandSection && !expandedSectionsRef.current.has(sectionId)) {
      expandedSectionsRef.current.add(sectionId);
      options.onExpandSection(sectionId);
    }

    // Automatically calculate and show nearest slot
    const nearestSlot = calculateNearestSlot(e, sectionId, exerciseCount);
    setDragOverSlot(nearestSlot);
  }, [draggedExercise, calculateNearestSlot, options]);

  /**
   * Handle drag leave section
   */
  const handleSectionDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the section entirely
    // Check if the related target is still within a section
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('[data-workout-section]')) {
      setDragOverSectionId(null);
      setDragOverSlot(null);
    }
  }, []);

  /**
   * Register a section ref for position calculations
   */
  const registerSectionRef = useCallback((sectionId: string, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }, []);

  return {
    draggedExercise,
    dragOverSectionId,
    dragOverSlot,
    handleDragStart,
    handleDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    registerSectionRef,
  };
};
