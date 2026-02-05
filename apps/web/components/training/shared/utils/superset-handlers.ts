import type { WorkoutSchema, WorkoutSchemaItem, ExerciseWithSuperset, WorkoutSection } from '@/components/training/shared/types/workout-builder.types';
import type { SetData } from '@/components/training/builder/exercise-card';

/**
 * Groups consecutive exercises by their superset ID for display purposes
 *
 * @param exercises - Array of exercises
 * @returns Array of exercise groups (supersets and individual exercises)
 */
export const groupExercisesBySuperset = (
  exercises: ExerciseWithSuperset[]
): Array<ExerciseWithSuperset[]> => {
  const groups: Array<ExerciseWithSuperset[]> = [];
  let currentGroup: ExerciseWithSuperset[] = [];
  let currentGroupId: string | null = null;

  exercises.forEach((exercise) => {
    if (exercise.supersetGroupId) {
      if (exercise.supersetGroupId === currentGroupId) {
        currentGroup.push(exercise);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [exercise];
        currentGroupId = exercise.supersetGroupId;
      }
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentGroupId = null;
      }
      groups.push([exercise]);
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

/**
 * Links two consecutive top-level exercises into a superset
 *
 * @param itemIndex - The index of the first exercise item in the items array
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelSupersetLink = (
  itemIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const items = [...currentSchema.items];
  const currentItem = items[itemIndex];
  const nextItem = items[itemIndex + 1];

  // Both must be exercise items
  if (
    !currentItem ||
    !nextItem ||
    currentItem.itemType !== 'exercise' ||
    nextItem.itemType !== 'exercise'
  ) {
    return currentSchema;
  }

  // Determine the contiguous block we are (or will be) linking
  let start = itemIndex;
  let end = itemIndex + 1;

  // Extend upwards while part of any existing superset chain (and is exercise)
  while (
    start > 0 &&
    items[start - 1].itemType === 'exercise' &&
    (items[start - 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId
  ) {
    start -= 1;
  }

  // Extend downwards while part of any existing superset chain (and is exercise)
  while (
    end < items.length - 1 &&
    items[end + 1].itemType === 'exercise' &&
    (items[end + 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId
  ) {
    end += 1;
  }

  // Use an existing group id if present, otherwise create a new one
  const existingGroupId =
    currentItem.exercise.supersetGroupId ||
    nextItem.exercise.supersetGroupId ||
    (items[start] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId ||
    (items[end] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId;

  const supersetGroupId =
    existingGroupId || `superset_toplevel_${itemIndex}_${Date.now()}`;

  // Assign the same supersetGroupId to the entire contiguous block
  for (let i = start; i <= end; i += 1) {
    const item = items[i];
    if (item.itemType === 'exercise') {
      items[i] = {
        ...item,
        exercise: {
          ...item.exercise,
          supersetGroupId,
        },
      };
    }
  }

  // Sync sets, rest, and column labels: use top exercise as source
  const topItem = items[start];
  if (topItem.itemType === 'exercise') {
    const topSets = topItem.exercise.sets || [];
    const topSetCount = topSets.length;
    const topRest = topSets[0]?.rest || '';
    const topColumn1Label = topItem.exercise.column1Label;
    const topColumn2Label = topItem.exercise.column2Label;

    // Update all other exercises in the superset to match top exercise's sets
    for (let i = start + 1; i <= end; i += 1) {
      const item = items[i];
      if (item.itemType === 'exercise') {
        const currentSets = item.exercise.sets || [];
        let newSets: SetData[];

        if (currentSets.length < topSetCount) {
          // Add sets
          newSets = [...currentSets];
          for (let j = currentSets.length; j < topSetCount; j++) {
            const sourceSet = topSets[j];
            newSets.push({
              setNumber: j + 1,
              type: sourceSet?.type || 'normal',
              reps: sourceSet?.reps || '',
              weight: '',
              rest: sourceSet?.rest || '',
              distance: sourceSet?.distance || '',
              duration: sourceSet?.duration || '',
            });
          }
        } else if (currentSets.length > topSetCount) {
          // Remove excess sets
          newSets = currentSets.slice(0, topSetCount);
        } else {
          newSets = currentSets;
        }

        // Also sync rest from top exercise to all sets
        newSets = newSets.map((set, idx) => ({
          ...set,
          setNumber: idx + 1,
          rest: topRest,
        }));

        items[i] = {
          ...item,
          exercise: {
            ...item.exercise,
            sets: newSets,
            column1Label: topColumn1Label,
            column2Label: topColumn2Label,
          },
        };
      }
    }
  }

  return {
    ...currentSchema,
    items,
  };
};

/**
 * Unlinks two consecutive top-level exercises in a superset
 *
 * @param itemIndex - The index of the first exercise item in the link to break
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleTopLevelSupersetUnlink = (
  itemIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  const items = [...currentSchema.items];
  const currentItem = items[itemIndex];
  const nextItem = items[itemIndex + 1];

  // Both must be exercise items with same superset group
  if (
    !currentItem ||
    !nextItem ||
    currentItem.itemType !== 'exercise' ||
    nextItem.itemType !== 'exercise'
  ) {
    return currentSchema;
  }

  const currentExercise = currentItem.exercise;
  const nextExercise = nextItem.exercise;

  if (
    !currentExercise.supersetGroupId ||
    currentExercise.supersetGroupId !== nextExercise.supersetGroupId
  ) {
    return currentSchema;
  }

  const groupId = currentExercise.supersetGroupId;

  // Find contiguous segment ABOVE including itemIndex that belongs to this group
  let upperStart = itemIndex;
  while (
    upperStart > 0 &&
    items[upperStart - 1].itemType === 'exercise' &&
    (items[upperStart - 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId === groupId
  ) {
    upperStart -= 1;
  }

  // Find contiguous segment BELOW starting at itemIndex + 1 that belongs to this group
  let lowerStart = itemIndex + 1;
  let lowerEnd = lowerStart;
  while (
    lowerEnd < items.length - 1 &&
    items[lowerEnd + 1].itemType === 'exercise' &&
    (items[lowerEnd + 1] as { itemType: 'exercise'; exercise: ExerciseWithSuperset }).exercise.supersetGroupId === groupId
  ) {
    lowerEnd += 1;
  }

  // Lower segment becomes either a new superset group (if at least 2 exercises)
  // or is fully unlinked if it's only a single exercise.
  const lowerLength = lowerEnd - lowerStart + 1;
  const newGroupId =
    lowerLength >= 2 ? `superset_toplevel_${lowerStart}_${Date.now()}` : null;

  for (let i = lowerStart; i <= lowerEnd; i += 1) {
    const item = items[i];
    if (item.itemType === 'exercise') {
      items[i] = {
        ...item,
        exercise: {
          ...item.exercise,
          supersetGroupId: newGroupId,
        },
      };
    }
  }

  return {
    ...currentSchema,
    items,
  };
};

/**
 * Links two consecutive exercises within a section into a superset
 *
 * @param sectionId - The ID of the section containing the exercises
 * @param exerciseIndex - The index of the first exercise in the superset
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSupersetLink = (
  sectionId: string,
  exerciseIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];
        const currentExercise = exercises[exerciseIndex];
        const nextExercise = exercises[exerciseIndex + 1];

        if (currentExercise && nextExercise) {
          // Determine the contiguous block we are (or will be) linking
          let start = exerciseIndex;
          let end = exerciseIndex + 1;

          // Extend upwards while part of any existing superset chain
          while (start > 0 && exercises[start - 1].supersetGroupId) {
            start -= 1;
          }

          // Extend downwards while part of any existing superset chain
          while (end < exercises.length - 1 && exercises[end + 1].supersetGroupId) {
            end += 1;
          }

          // Use an existing group id if present, otherwise create a new one
          const existingGroupId =
            currentExercise.supersetGroupId ||
            nextExercise.supersetGroupId ||
            exercises[start].supersetGroupId ||
            exercises[end].supersetGroupId;

          const supersetGroupId =
            existingGroupId || `superset_${sectionId}_${exerciseIndex}_${Date.now()}`;

          // Assign the same supersetGroupId to the entire contiguous block
          for (let i = start; i <= end; i += 1) {
            exercises[i] = {
              ...exercises[i],
              supersetGroupId,
            };
          }

          // Sync sets, rest, and column labels: use top exercise as source
          const topExercise = exercises[start];
          const topSets = topExercise.sets || [];
          const topSetCount = topSets.length;
          const topRest = topSets[0]?.rest || '';
          const topColumn1Label = topExercise.column1Label;
          const topColumn2Label = topExercise.column2Label;

          // Update all other exercises in the superset to match top exercise's sets
          for (let i = start + 1; i <= end; i += 1) {
            const currentSets = exercises[i].sets || [];
            let newSets: SetData[];

            if (currentSets.length < topSetCount) {
              // Add sets
              newSets = [...currentSets];
              for (let j = currentSets.length; j < topSetCount; j++) {
                const sourceSet = topSets[j];
                newSets.push({
                  setNumber: j + 1,
                  type: sourceSet?.type || 'normal',
                  reps: sourceSet?.reps || '',
                  weight: '',
                  rest: sourceSet?.rest || '',
                  distance: sourceSet?.distance || '',
                  duration: sourceSet?.duration || '',
                });
              }
            } else if (currentSets.length > topSetCount) {
              // Remove excess sets
              newSets = currentSets.slice(0, topSetCount);
            } else {
              newSets = currentSets;
            }

            // Also sync rest from top exercise to all sets
            newSets = newSets.map((set, idx) => ({
              ...set,
              setNumber: idx + 1,
              rest: topRest,
            }));

            exercises[i] = {
              ...exercises[i],
              sets: newSets,
              column1Label: topColumn1Label,
              column2Label: topColumn2Label,
            };
          }
        }

        return {
          ...item,
          section: {
            ...item.section,
            exercises,
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Unlinks two consecutive exercises within a section in a superset
 *
 * @param sectionId - The ID of the section containing the exercises
 * @param exerciseIndex - The index of the first exercise in the link to break
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema
 */
export const handleSupersetUnlink = (
  sectionId: string,
  exerciseIndex: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];
        const currentExercise = exercises[exerciseIndex];
        const nextExercise = exercises[exerciseIndex + 1];

        if (
          currentExercise &&
          nextExercise &&
          currentExercise.supersetGroupId &&
          currentExercise.supersetGroupId === nextExercise.supersetGroupId
        ) {
          const groupId = currentExercise.supersetGroupId;

          // Find contiguous segment ABOVE including exerciseIndex that belongs to this group
          let upperStart = exerciseIndex;
          while (upperStart > 0 && exercises[upperStart - 1].supersetGroupId === groupId) {
            upperStart -= 1;
          }

          // Find contiguous segment BELOW starting at exerciseIndex + 1 that belongs to this group
          let lowerStart = exerciseIndex + 1;
          let lowerEnd = lowerStart;
          while (
            lowerEnd < exercises.length - 1 &&
            exercises[lowerEnd + 1].supersetGroupId === groupId
          ) {
            lowerEnd += 1;
          }

          // Lower segment becomes either a new superset group (if at least 2 exercises)
          // or is fully unlinked if it's only a single exercise.
          const lowerLength = lowerEnd - lowerStart + 1;
          const newGroupId =
            lowerLength >= 2 ? `superset_${sectionId}_${lowerStart}_${Date.now()}` : null;

          for (let i = lowerStart; i <= lowerEnd; i += 1) {
            exercises[i] = {
              ...exercises[i],
              supersetGroupId: newGroupId,
            };
          }
        }

        return {
          ...item,
          section: {
            ...item.section,
            exercises,
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Synchronizes set counts across all exercises in a superset within a section.
 * When one exercise's set count changes, all other exercises in the same superset
 * are updated to match, copying the set type from the changed exercise.
 *
 * @param sectionId - The ID of the section containing the exercises
 * @param changedExerciseInstanceId - The instanceId of the exercise that changed
 * @param newSetCount - The new number of sets
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema with synchronized set counts
 */
export const syncSupersetSetsInSection = (
  sectionId: string,
  changedExerciseInstanceId: string,
  newSetCount: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];

        // Find the changed exercise to get its supersetGroupId and sets
        const changedExercise = exercises.find(ex => ex.instanceId === changedExerciseInstanceId);
        if (!changedExercise?.supersetGroupId) {
          return item; // Not part of a superset, no sync needed
        }

        const supersetGroupId = changedExercise.supersetGroupId;
        const sourceSets = changedExercise.sets || [];

        // Update all exercises in the same superset
        const updatedExercises = exercises.map(exercise => {
          if (exercise.supersetGroupId !== supersetGroupId || exercise.instanceId === changedExerciseInstanceId) {
            return exercise; // Different superset or the one that triggered the change
          }

          const currentSets = exercise.sets || [];
          const currentSetCount = currentSets.length;

          if (currentSetCount === newSetCount) {
            return exercise; // Already has the right number of sets
          }

          let newSets: SetData[];

          if (newSetCount > currentSetCount) {
            // Add sets - copy type and reps from the source exercise's corresponding set
            newSets = [...currentSets];
            for (let i = currentSetCount; i < newSetCount; i++) {
              const sourceSet = sourceSets[i];
              newSets.push({
                setNumber: i + 1,
                type: sourceSet?.type || 'normal',
                reps: sourceSet?.reps || '',
                weight: '',
                rest: sourceSet?.rest || '',
                distance: sourceSet?.distance || '',
                duration: sourceSet?.duration || '',
              });
            }
          } else {
            // Remove sets from the end
            newSets = currentSets.slice(0, newSetCount);
          }

          // Renumber sets
          newSets = newSets.map((set, idx) => ({ ...set, setNumber: idx + 1 }));

          return {
            ...exercise,
            sets: newSets,
          };
        });

        return {
          ...item,
          section: {
            ...item.section,
            exercises: updatedExercises,
          },
        };
      }
      return item;
    }),
  };
};

/**
 * Synchronizes set counts across all top-level exercises in a superset.
 * When one exercise's set count changes, all other exercises in the same superset
 * are updated to match, copying the set type from the changed exercise.
 *
 * @param changedExerciseInstanceId - The instanceId of the exercise that changed
 * @param newSetCount - The new number of sets
 * @param currentSchema - The current workout schema
 * @returns Updated workout schema with synchronized set counts
 */
export const syncSupersetSetsTopLevel = (
  changedExerciseInstanceId: string,
  newSetCount: number,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  // Find the changed exercise to get its supersetGroupId and sets
  const changedItem = currentSchema.items.find(
    item => item.itemType === 'exercise' && item.exercise.instanceId === changedExerciseInstanceId
  );

  if (!changedItem || changedItem.itemType !== 'exercise' || !changedItem.exercise.supersetGroupId) {
    return currentSchema; // Not found or not part of a superset
  }

  const supersetGroupId = changedItem.exercise.supersetGroupId;
  const sourceSets = changedItem.exercise.sets || [];

  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType !== 'exercise') {
        return item;
      }

      if (item.exercise.supersetGroupId !== supersetGroupId || item.exercise.instanceId === changedExerciseInstanceId) {
        return item; // Different superset or the one that triggered the change
      }

      const currentSets = item.exercise.sets || [];
      const currentSetCount = currentSets.length;

      if (currentSetCount === newSetCount) {
        return item; // Already has the right number of sets
      }

      let newSets: SetData[];

      if (newSetCount > currentSetCount) {
        // Add sets - copy type and reps from the source exercise's corresponding set
        newSets = [...currentSets];
        for (let i = currentSetCount; i < newSetCount; i++) {
          const sourceSet = sourceSets[i];
          newSets.push({
            setNumber: i + 1,
            type: sourceSet?.type || 'normal',
            reps: sourceSet?.reps || '',
            weight: '',
            rest: sourceSet?.rest || '',
            distance: sourceSet?.distance || '',
            duration: sourceSet?.duration || '',
          });
        }
      } else {
        // Remove sets from the end
        newSets = currentSets.slice(0, newSetCount);
      }

      // Renumber sets
      newSets = newSets.map((set, idx) => ({ ...set, setNumber: idx + 1 }));

      return {
        ...item,
        exercise: {
          ...item.exercise,
          sets: newSets,
        },
      };
    }),
  };
};

/**
 * Syncs rest values across all exercises in a superset within a section.
 * Updates ALL sets in ALL exercises with the same rest value.
 */
export const syncSupersetRestInSection = (
  sectionId: string,
  changedExerciseInstanceId: string,
  restValue: string,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];

        // Find changed exercise to get supersetGroupId
        const changedExercise = exercises.find(ex => ex.instanceId === changedExerciseInstanceId);
        if (!changedExercise?.supersetGroupId) {
          return item; // Not in superset
        }

        const supersetGroupId = changedExercise.supersetGroupId;

        // Update rest for all exercises in the superset
        const updatedExercises = exercises.map(exercise => {
          if (exercise.supersetGroupId !== supersetGroupId) {
            return exercise;
          }

          // Update all sets with new rest value
          const updatedSets = (exercise.sets || []).map(set => ({
            ...set,
            rest: restValue,
          }));

          return { ...exercise, sets: updatedSets };
        });

        return {
          ...item,
          section: { ...item.section, exercises: updatedExercises },
        };
      }
      return item;
    }),
  };
};

/**
 * Syncs rest values across all top-level exercises in a superset.
 */
export const syncSupersetRestTopLevel = (
  changedExerciseInstanceId: string,
  restValue: string,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  // Find changed exercise
  const changedItem = currentSchema.items.find(
    item => item.itemType === 'exercise' && item.exercise.instanceId === changedExerciseInstanceId
  );
  if (!changedItem || changedItem.itemType !== 'exercise' || !changedItem.exercise.supersetGroupId) {
    return currentSchema;
  }

  const supersetGroupId = changedItem.exercise.supersetGroupId;

  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'exercise' && item.exercise.supersetGroupId === supersetGroupId) {
        const updatedSets = (item.exercise.sets || []).map(set => ({
          ...set,
          rest: restValue,
        }));
        return { ...item, exercise: { ...item.exercise, sets: updatedSets } };
      }
      return item;
    }),
  };
};

// Helper to get field name from column label
const getFieldNameFromLabel = (columnLabel: string): 'reps' | 'weight' | 'distance' | 'duration' | 'optional' | null => {
  if (columnLabel === 'Reps') return 'reps';
  if (columnLabel === 'kg' || columnLabel === 'lbs') return 'weight';
  if (columnLabel === 'km' || columnLabel === 'm' || columnLabel === 'yards' || columnLabel === 'miles' || columnLabel === 'feet') return 'distance';
  if (columnLabel === 'minutes' || columnLabel === 'seconds') return 'duration';
  if (columnLabel === 'None' || columnLabel === 'Optional') return null;
  // For optional columns (Tempo, RIR, RPE, etc.)
  return 'optional';
};

// Helper to clear a specific field in sets based on column label
const clearFieldInSets = (sets: SetData[], columnLabel: string): SetData[] => {
  const fieldName = getFieldNameFromLabel(columnLabel);
  if (!fieldName) return sets; // None/Optional has no field to clear

  return sets.map(set => {
    const newSet = { ...set };
    if (fieldName === 'reps') {
      newSet.reps = '';
    } else if (fieldName === 'weight') {
      newSet.weight = '';
    } else if (fieldName === 'distance') {
      newSet.distance = '';
    } else if (fieldName === 'duration') {
      newSet.duration = '';
    } else if (fieldName === 'optional') {
      if (newSet.optional) {
        newSet.optional = { ...newSet.optional, prescribed: '' };
      }
    }
    return newSet;
  });
};

/**
 * Syncs column labels across all exercises in a superset within a section.
 * Also clears the corresponding field values when column labels change.
 */
export const syncSupersetColumnLabelsInSection = (
  sectionId: string,
  changedExerciseInstanceId: string,
  column1Label: string | undefined,
  column2Label: string | undefined,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'section' && item.section.id === sectionId && item.section.exercises) {
        const exercises = [...item.section.exercises];

        // Find changed exercise to get supersetGroupId
        const changedExercise = exercises.find(ex => ex.instanceId === changedExerciseInstanceId);
        if (!changedExercise?.supersetGroupId) {
          return item; // Not in superset
        }

        const supersetGroupId = changedExercise.supersetGroupId;

        // Update column labels for all exercises in the superset
        const updatedExercises = exercises.map(exercise => {
          if (exercise.supersetGroupId !== supersetGroupId) {
            return exercise;
          }

          // Skip the exercise that triggered the change (already handled by caller)
          if (exercise.instanceId === changedExerciseInstanceId) {
            return {
              ...exercise,
              column1Label,
              column2Label,
            };
          }

          let updatedSets = exercise.sets || [];

          // If column1 label changed, clear the old column1 field values
          if (column1Label !== undefined && exercise.column1Label !== column1Label) {
            // Clear old column values
            if (exercise.column1Label) {
              updatedSets = clearFieldInSets(updatedSets, exercise.column1Label);
            }
          }

          // If column2 label changed, clear the old column2 field values
          if (column2Label !== undefined && exercise.column2Label !== column2Label) {
            // Clear old column values
            if (exercise.column2Label) {
              updatedSets = clearFieldInSets(updatedSets, exercise.column2Label);
            }
          }

          return {
            ...exercise,
            sets: updatedSets,
            column1Label,
            column2Label,
          };
        });

        return {
          ...item,
          section: { ...item.section, exercises: updatedExercises },
        };
      }
      return item;
    }),
  };
};

/**
 * Syncs column labels across all top-level exercises in a superset.
 * Also clears the corresponding field values when column labels change.
 */
export const syncSupersetColumnLabelsTopLevel = (
  changedExerciseInstanceId: string,
  column1Label: string | undefined,
  column2Label: string | undefined,
  currentSchema: WorkoutSchema
): WorkoutSchema => {
  // Find changed exercise
  const changedItem = currentSchema.items.find(
    item => item.itemType === 'exercise' && item.exercise.instanceId === changedExerciseInstanceId
  );
  if (!changedItem || changedItem.itemType !== 'exercise' || !changedItem.exercise.supersetGroupId) {
    return currentSchema;
  }

  const supersetGroupId = changedItem.exercise.supersetGroupId;

  return {
    ...currentSchema,
    items: currentSchema.items.map((item) => {
      if (item.itemType === 'exercise' && item.exercise.supersetGroupId === supersetGroupId) {
        // Skip the exercise that triggered the change (already handled by caller)
        if (item.exercise.instanceId === changedExerciseInstanceId) {
          return {
            ...item,
            exercise: {
              ...item.exercise,
              column1Label,
              column2Label,
            },
          };
        }

        let updatedSets = item.exercise.sets || [];

        // If column1 label changed, clear the old column1 field values
        if (column1Label !== undefined && item.exercise.column1Label !== column1Label) {
          if (item.exercise.column1Label) {
            updatedSets = clearFieldInSets(updatedSets, item.exercise.column1Label);
          }
        }

        // If column2 label changed, clear the old column2 field values
        if (column2Label !== undefined && item.exercise.column2Label !== column2Label) {
          if (item.exercise.column2Label) {
            updatedSets = clearFieldInSets(updatedSets, item.exercise.column2Label);
          }
        }

        return {
          ...item,
          exercise: {
            ...item.exercise,
            sets: updatedSets,
            column1Label,
            column2Label,
          },
        };
      }
      return item;
    }),
  };
};
