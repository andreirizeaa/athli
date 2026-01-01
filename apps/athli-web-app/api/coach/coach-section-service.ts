import { apiFetch, type ApiResponse } from '@/api/api-client';
import type { WorkoutProgramPayload } from '@/components/training/workout-schema';

export type Section = {
  id: string;
  program: string; // Display name (mapped from 'name')
  description: string;
  sectionType: string;
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
export const createSection = async (sectionData: WorkoutProgramPayload & { sectionType: string }): Promise<Section> => {
  // Calculate total exercises from items
  const totalExercises = sectionData.items.reduce((total, item) => {
    if (item.itemType === 'exercise') {
      return total + item.data.exercises.length;
    } else if (item.itemType === 'section') {
      const section = item.data;
      if (section.type === 'regular' || section.type === 'auxiliary') {
        return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
      } else if (section.type === 'circuits') {
        return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
      } else if (section.type === 'amrap' || section.type === 'timed') {
        return total + section.exercises.length;
      }
    }
    return total;
  }, 0);

  // Separate metadata from section data
  const cleanSectionData = {
    items: sectionData.items,
  };

  const response = await apiFetch<ApiResponse<{ section: any }>>('/coach/training/sections', {
    method: 'POST',
    body: JSON.stringify({
      title: sectionData.title,
      description: sectionData.description,
      section_type: sectionData.sectionType,
      section_data: cleanSectionData,
      total_exercises: totalExercises,
    }),
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
 * Update an existing section
 */
export const updateSection = async (
  sectionId: string,
  sectionData: Partial<WorkoutProgramPayload & { sectionType: string }>
): Promise<Section> => {
  // Calculate total exercises if items provided
  const totalExercises = sectionData.items
    ? sectionData.items.reduce((total, item) => {
      if (item.itemType === 'exercise') {
        return total + item.data.exercises.length;
      } else if (item.itemType === 'section') {
        const section = item.data;
        if (section.type === 'regular' || section.type === 'auxiliary') {
          return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
        } else if (section.type === 'circuits') {
          return total + section.exercises.reduce((sum, group) => sum + group.exercises.length, 0);
        } else if (section.type === 'amrap' || section.type === 'timed') {
          return total + section.exercises.length;
        }
      }
      return total;
    }, 0)
    : undefined;

  const cleanSectionData = sectionData.items
    ? {
      items: sectionData.items,
    }
    : undefined;

  const updatePayload: any = {
    id: sectionId,
    ...(sectionData.title && { title: sectionData.title }),
    ...(sectionData.description !== undefined && { description: sectionData.description }),
    ...(cleanSectionData && { section_data: cleanSectionData }),
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
  return response.data.section;
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
