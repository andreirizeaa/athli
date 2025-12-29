import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '@/api/exercise/exercise-search';

export type DragOverSlot = {
  sectionId: string;
  slotIndex: number;
} | null;

type UseExerciseDragDropOptions = {
  onExpandSection?: (sectionId: string) => void;
};

const SCROLL_THRESHOLD = 80; // Distance from edge to trigger scroll
const SCROLL_SPEED = 10; // Pixels to scroll per frame

export const useExerciseDragDrop = (options?: UseExerciseDragDropOptions) => {
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<DragOverSlot>(null);
  const [dragOverTopLevelSlot, setDragOverTopLevelSlot] = useState<number | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const topLevelContainerRef = useRef<HTMLElement | null>(null);
  const expandedSectionsRef = useRef<Set<string>>(new Set());
  const scrollIntervalRef = useRef<number | null>(null);
  const lastMouseYRef = useRef<number>(0);

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
   * Handle auto-scrolling when dragging near edges
   */
  const handleAutoScroll = useCallback((mouseY: number) => {
    const container = topLevelContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const distanceFromTop = mouseY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - mouseY;

    // Clear existing scroll interval
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Scroll up if near top edge
    if (distanceFromTop < SCROLL_THRESHOLD && distanceFromTop > 0) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (container.scrollTop > 0) {
          container.scrollTop -= SCROLL_SPEED;
        }
      }, 16); // ~60fps
    }
    // Scroll down if near bottom edge
    else if (distanceFromBottom < SCROLL_THRESHOLD && distanceFromBottom > 0) {
      scrollIntervalRef.current = window.setInterval(() => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop < maxScroll) {
          container.scrollTop += SCROLL_SPEED;
        }
      }, 16); // ~60fps
    }
  }, []);

  /**
   * Clear auto-scroll interval
   */
  const clearAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((exercise: Exercise) => {
    setDraggedExercise(exercise);
  }, []);

  /**
   * Calculate the nearest top-level drop slot based on mouse position
   * Works for exercises and sections at the top level
   */
  const calculateNearestTopLevelSlot = useCallback((
    e: React.DragEvent,
    totalItems: number
  ): number | null => {
    if (!draggedExercise) return null;

    const containerElement = topLevelContainerRef.current;
    if (!containerElement) return null;

    // If no items exist, return slot 0
    if (totalItems === 0) {
      return 0;
    }

    // Get all top-level items (sections and exercises)
    const itemElements = Array.from(
      containerElement.querySelectorAll('[data-top-level-item]')
    ) as HTMLElement[];

    if (itemElements.length === 0) {
      return 0;
    }

    const mouseY = e.clientY;
    let nearestSlotIndex = 0;
    let minDistance = Infinity;

    // Check distance to position before first item
    const firstItem = itemElements[0];
    const firstItemRect = firstItem.getBoundingClientRect();
    const distanceToFirst = Math.abs(mouseY - firstItemRect.top);

    if (distanceToFirst < minDistance) {
      minDistance = distanceToFirst;
      nearestSlotIndex = 0;
    }

    // Check distances after each item
    itemElements.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemBottom = itemRect.bottom;

      // Distance to position after this item
      const distanceToAfter = Math.abs(mouseY - itemBottom);

      if (distanceToAfter < minDistance) {
        minDistance = distanceToAfter;
        nearestSlotIndex = index + 1;
      }
    });

    return nearestSlotIndex;
  }, [draggedExercise]);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedExercise(null);
    setDragOverSectionId(null);
    setDragOverSlot(null);
    setDragOverTopLevelSlot(null);
    // Clear expanded sections tracking
    expandedSectionsRef.current.clear();
    // Clear auto-scroll
    clearAutoScroll();
  }, [clearAutoScroll]);

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

    // Track mouse position and trigger auto-scroll
    lastMouseYRef.current = e.clientY;
    handleAutoScroll(e.clientY);

    setDragOverSectionId(sectionId);
    // Clear top-level slot when dragging over a section
    setDragOverTopLevelSlot(null);

    // Expand collapsed section when dragging over it (only once per drag session)
    if (options?.onExpandSection && !expandedSectionsRef.current.has(sectionId)) {
      expandedSectionsRef.current.add(sectionId);
      options.onExpandSection(sectionId);
    }

    // Automatically calculate and show nearest slot
    const nearestSlot = calculateNearestSlot(e, sectionId, exerciseCount);
    setDragOverSlot(nearestSlot);
  }, [draggedExercise, calculateNearestSlot, options, handleAutoScroll]);

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
   * Handle drag over top-level container - calculates nearest slot automatically
   */
  const handleTopLevelDragOver = useCallback((
    e: React.DragEvent,
    totalItems: number
  ) => {
    e.preventDefault();

    if (!draggedExercise) return;

    // Track mouse position and trigger auto-scroll
    lastMouseYRef.current = e.clientY;
    handleAutoScroll(e.clientY);

    // Check if we're inside a section - if so, don't handle at top level
    const target = e.target as HTMLElement;
    const isInsideSection = target.closest('[data-workout-section]');

    if (isInsideSection) {
      // We're inside a section, let the section handler manage the drop slot
      return;
    }

    // We're at top level - clear section state and set top-level slot
    setDragOverSlot(null);
    setDragOverSectionId(null);

    // Automatically calculate and show nearest slot
    const nearestSlot = calculateNearestTopLevelSlot(e, totalItems);
    setDragOverTopLevelSlot(nearestSlot);
  }, [draggedExercise, calculateNearestTopLevelSlot, handleAutoScroll]);

  /**
   * Handle drag leave top-level container
   */
  const handleTopLevelDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('[data-top-level-container]')) {
      setDragOverTopLevelSlot(null);
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

  /**
   * Register the top-level container ref for position calculations
   */
  const registerTopLevelContainerRef = useCallback((element: HTMLElement | null) => {
    topLevelContainerRef.current = element;
  }, []);

  /**
   * Cleanup scroll interval on unmount
   */
  useEffect(() => {
    return () => {
      clearAutoScroll();
    };
  }, [clearAutoScroll]);

  return {
    draggedExercise,
    dragOverSectionId,
    dragOverSlot,
    dragOverTopLevelSlot,
    handleDragStart,
    handleDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    handleTopLevelDragOver,
    handleTopLevelDragLeave,
    registerSectionRef,
    registerTopLevelContainerRef,
  };
};
