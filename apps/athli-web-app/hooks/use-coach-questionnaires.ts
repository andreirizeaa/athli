
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getQuestionnaires,
    addQuestionnaire,
    deleteQuestionnaire,
    duplicateQuestionnaire,
    Questionnaire,
    AddQuestionnaireData
} from '@/api/coach/coach-questionnaire-service';
import { toast } from 'sonner';

export function useCoachQuestionnaires() {
    const queryClient = useQueryClient();

    const {
        data: questionnaires,
        isLoading,
        error
    } = useQuery({
        queryKey: ['coach-questionnaires'],
        queryFn: () => getQuestionnaires(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const createMutation = useMutation({
        mutationFn: (data: AddQuestionnaireData) => addQuestionnaire(data),
        onSuccess: (newQuestionnaire) => {
            queryClient.setQueryData(['coach-questionnaires'], (old: Questionnaire[] | undefined) => {
                return old ? [newQuestionnaire, ...old] : [newQuestionnaire];
            });
            toast.success('Questionnaire created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create questionnaire');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteQuestionnaire(id),
        onSuccess: (_, id) => {
            queryClient.setQueryData(['coach-questionnaires'], (old: Questionnaire[] | undefined) => {
                return old?.filter(q => q.id !== id);
            });
            toast.success('Questionnaire deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete questionnaire');
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Questionnaire }) => duplicateQuestionnaire(id, data),
        onSuccess: (newQuestionnaire) => {
            queryClient.setQueryData(['coach-questionnaires'], (old: Questionnaire[] | undefined) => {
                return old ? [newQuestionnaire, ...old] : [newQuestionnaire];
            });
            toast.success('Questionnaire duplicated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to duplicate questionnaire');
        }
    });

    return {
        questionnaires: questionnaires || [],
        isLoading,
        error,
        createQuestionnaire: createMutation.mutateAsync,
        deleteQuestionnaire: deleteMutation.mutateAsync,
        duplicateQuestionnaire: duplicateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isDuplicating: duplicateMutation.isPending,
    };
}
