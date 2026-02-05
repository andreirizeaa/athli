
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSections,
    createSection,
    updateSection,
    deleteSections,
    duplicateSection,
    starSections,
    archiveSections,
} from '@/api/coach/coach-section-service';
import type { Section } from '@/api/coach/coach-section-service';
import type { WorkoutProgramPayload } from '@/components/training/workout-schema';
import { toast } from 'sonner';

const EMPTY_ARRAY: any[] = [];

export function useCoachSections(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();

    const {
        data: sections,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-sections'],
        queryFn: () => getSections(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled !== false,
    });

    const createMutation = useMutation({
        mutationFn: (data: WorkoutProgramPayload & { sectionType: string }) => createSection(data),
        onSuccess: (newSection) => {
            queryClient.setQueryData(['coach-sections'], (old: Section[] | undefined) => {
                return old ? [newSection, ...old] : [newSection];
            });
            toast.success('Section created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create section');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<WorkoutProgramPayload & { sectionType: string }> }) => updateSection(id, data),
        onSuccess: (updatedSection) => {
            queryClient.setQueryData(['coach-sections'], (old: Section[] | undefined) => {
                return old?.map(s => s.id === updatedSection.id ? updatedSection : s);
            });
            toast.success('Section updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update section');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: string | string[]) => deleteSections(ids),
        onSuccess: (_, ids) => {
            const idsArray = Array.isArray(ids) ? ids : [ids];
            queryClient.setQueryData(['coach-sections'], (old: Section[] | undefined) => {
                return old?.filter(s => !idsArray.includes(s.id));
            });
            toast.success('Section(s) deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete section(s)');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => duplicateSection(id),
        onSuccess: (newSection) => {
            queryClient.setQueryData(['coach-sections'], (old: Section[] | undefined) => {
                return old ? [newSection, ...old] : [newSection];
            });
            toast.success('Section duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate section');
        }
    });

    const starMutation = useMutation({
        mutationFn: ({ ids, starred }: { ids: string | string[]; starred: boolean }) => starSections(ids, starred),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-sections'] });
            toast.success('Section updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update section');
        }
    });

    const archiveMutation = useMutation({
        mutationFn: ({ ids, archived }: { ids: string | string[]; archived: boolean }) => archiveSections(ids, archived),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-sections'] });
            toast.success('Section updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update section');
        }
    });

    return {
        sections: sections || EMPTY_ARRAY,
        isLoading,
        error,
        createSection: createMutation.mutateAsync,
        updateSection: updateMutation.mutateAsync,
        deleteSections: deleteMutation.mutateAsync,
        duplicateSection: duplicateMutation.mutateAsync,
        starSections: starMutation.mutateAsync,
        archiveSections: archiveMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
