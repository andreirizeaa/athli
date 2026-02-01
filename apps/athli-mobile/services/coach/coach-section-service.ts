import { apiFetch, type ApiResponse } from '@/lib/api-client';
import type { WorkoutProgramPayload } from '@/components/features/workout/workout-schema';

export type Section = {
  id: string;
  program: string; // Display name (mapped from 'name')
  description: string;
  sectionType: string;
  duration?: number;
  rounds?: number;
  totalExercises: number;
  created: string;
  isFavourite: boolean;
};

/**
 * Service methods for section operations
 */

export const getSections = async (): Promise<Section[]> => {
  const response = await apiFetch<ApiResponse<{ sections: any[] }>>('/coach/training/sections');
  return (response.data?.sections || []).map((s) => ({
    id: s.id,
    program: s.name,
    description: s.description || '',
    sectionType: s.section_type || '',
    duration: s.duration,
    rounds: s.rounds,
    totalExercises: s.number_of_exercises || 0,
    created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: s.is_favourite || false,
  }));
};

/**
 * Star/Unstar sections
 */
export const starSections = async (sectionIds: string | string[], starred: boolean): Promise<void> => {
  const ids = Array.isArray(sectionIds) ? sectionIds : [sectionIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch('/coach/training/sections/toggle-favorite', {
        method: 'POST',
        body: JSON.stringify({ id, isFavourite: starred }),
      })
    )
  );
};

/**
 * Archive/Unarchive sections
 */
export const archiveSections = async (
  sectionIds: string | string[],
  archived: boolean
): Promise<void> => {
  const ids = Array.isArray(sectionIds) ? sectionIds : [sectionIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch('/coach/training/sections/update', {
        method: 'POST',
        body: JSON.stringify({ id, archived }),
      })
    )
  );
};

/**
 * Delete sections
 */
export const deleteSections = async (sectionIds: string | string[]): Promise<void> => {
  const ids = Array.isArray(sectionIds) ? sectionIds : [sectionIds];

  await Promise.all(
    ids.map((id) =>
      apiFetch(`/coach/training/sections/${id}`, {
        method: 'DELETE',
      })
    )
  );
};

/**
 * Create a new section
 */
export const createSection = async (sectionData: WorkoutProgramPayload & { sectionType: string; duration?: number; rounds?: number }): Promise<Section> => {
  // Get items from section_data
  const items = (sectionData as any).section_data?.items || [];

  // Calculate total exercises from items
  const totalExercises = items.reduce((total: number, item: any) => {
    if (item.itemType === 'exercise') {
      // Top-level exercises count as 1
      return total + 1;
    } else if (item.itemType === 'section') {
      const section = item.data;
      if (section.type === 'regular' || section.type === 'auxiliary') {
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum: number, group: any) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom' || section.type === 'circuits') {
        const exercises = section.exercises || [];
        return total + exercises.reduce((sum: number, group: any) => sum + (group.exercises?.length || 0), 0);
      } else if (section.type === 'amrap' || section.type === 'timed') {
        return total + (section.exercises?.length || 0);
      }
    }
    return total;
  }, 0);

  console.log('[CREATE SECTION SERVICE] Total exercises calculated:', totalExercises);

  const payload: any = {
    title: sectionData.name,
    description: sectionData.description,
    section_type: sectionData.sectionType,
    section_data: (sectionData as any).section_data,
    total_exercises: totalExercises,
  };

  console.log('[CREATE SECTION SERVICE] Payload being sent to API:', JSON.stringify(payload, null, 2));

  const response = await apiFetch<ApiResponse<{ section: any }>>('/coach/training/sections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log('[CREATE SECTION SERVICE] API Response:', JSON.stringify(response.data?.section, null, 2));

  if (!response.data) throw new Error('No section returned');
  const s = response.data.section;
  return {
    id: s.id,
    program: s.name,
    description: s.description || '',
    sectionType: s.section_type || '',
    totalExercises: s.number_of_exercises || 0,
    created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: s.is_favourite || false,
  };
};

/**
 * Update an existing section
 */
export const updateSection = async (
  sectionId: string,
  sectionData: Partial<WorkoutProgramPayload & { sectionType: string; duration?: number; rounds?: number }>
): Promise<Section> => {
  // Calculate total exercises if section_data provided
  const items = (sectionData as any).section_data?.items || [];
  const totalExercises = items.length > 0
    ? items.reduce((total: number, item: any) => {
      if (item.itemType === 'exercise') {
        // Top-level exercises count as 1
        return total + 1;
      } else if (item.itemType === 'section') {
        const section = item.data;
        if (section.type === 'regular' || section.type === 'auxiliary') {
          const exercises = section.exercises || [];
          return total + exercises.reduce((sum: number, group: any) => sum + (group.exercises?.length || 0), 0);
        } else if (section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom') {
          const exercises = section.exercises || [];
          return total + exercises.reduce((sum: number, group: any) => sum + (group.exercises?.length || 0), 0);
        } else if (section.type === 'amrap' || section.type === 'timed') {
          return total + (section.exercises?.length || 0);
        }
      }
      return total;
    }, 0)
    : undefined;

  const updatePayload: any = {
    id: sectionId,
    ...(sectionData.name && { title: sectionData.name }),
    ...(sectionData.description !== undefined && { description: sectionData.description }),
    ...(sectionData.sectionType && { section_type: sectionData.sectionType }),
    ...((sectionData as any).section_data && { section_data: (sectionData as any).section_data }),
    ...(totalExercises !== undefined && { total_exercises: totalExercises }),
  };

  const response = await apiFetch<ApiResponse<{ section: any }>>('/coach/training/sections/update', {
    method: 'POST',
    body: JSON.stringify(updatePayload),
  });

  if (!response.data) throw new Error('No section returned');
  const s = response.data.section;
  return {
    id: s.id,
    program: s.name,
    description: s.description || '',
    sectionType: s.section_type || '',
    totalExercises: s.number_of_exercises || 0,
    created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: s.is_favourite || false,
  };
};

/**
 * Get section by ID
 */
export const getSectionById = async (sectionId: string): Promise<any> => {
  const response = await apiFetch<ApiResponse<{ section: any }>>(`/coach/training/sections/${sectionId}`);

  if (!response.data) throw new Error('No section returned');

  const s = response.data.section;

  // Handle both new API format (items at top level) and legacy format (nested in section_data)
  // If items is present at top level and section_data doesn't have items, use top level
  const sectionDataItems = s.section_data?.items || s.items || [];
  const sectionData = {
    items: sectionDataItems,
  };

  return {
    ...s,
    section_data: sectionData,
  };
};

/**
 * Duplicate a section
 */
export const duplicateSection = async (sectionId: string): Promise<Section> => {
  const response = await apiFetch<ApiResponse<{ section: any }>>(`/coach/training/sections/${sectionId}/duplicate`, {
    method: 'POST',
  });

  if (!response.data) throw new Error('No section returned');
  const s = response.data.section;
  return {
    id: s.id,
    program: s.name,
    description: s.description || '',
    sectionType: s.section_type || '',
    totalExercises: s.number_of_exercises || 0,
    created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    isFavourite: s.is_favourite || false,
  };
};
