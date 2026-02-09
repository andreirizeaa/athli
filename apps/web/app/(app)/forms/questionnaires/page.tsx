'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X, Trash2, UserPlus, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { SidePanel } from '@/components/app/side-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AddQuestionnaireFormSidePanel } from '@/components/forms/add-questionnaire-form-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { duplicateQuestionnaire, deleteQuestionnaire, type Questionnaire as Form } from '@/api/coach/coach-questionnaire-service';
import { assignForm, assignFormsToClients, convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { formTemplates } from '@/constants/forms';
import { mockAthletes } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';
import { useCoachQuestionnaires } from '@/hooks/use-coach-questionnaires';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useQueryClient } from '@tanstack/react-query';

// Removed mock forms as we fetch from the API

const QuestionnairesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { questionnaires: forms, isLoading } = useCoachQuestionnaires();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();
  const queryClient = useQueryClient();

  const [isAddQuestionnaireOpen, setIsAddQuestionnaireOpen] = useState<boolean>(false);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [formsToAssign, setFormsToAssign] = useState<Form[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['coach-questionnaires'] });
  };

  const handleOpenAddQuestionnaire = () => {
    setIsAddQuestionnaireOpen(true);
  };

  const handleClearSelectedQuestionnaires = () => {
    setSelectedQuestionnaires(new Set());
  };

  const handleDuplicateSelected = async () => {
    const selectedForms = questionnaireForms.filter((form) => selectedQuestionnaires.has(form.id));
    if (selectedForms.length !== 1) return;

    const formToDuplicate = selectedForms[0];
    try {
      await duplicateQuestionnaire(formToDuplicate.id, formToDuplicate);
      refresh();
      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to duplicate form:', error);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!formToDelete) return;
    try {
      const form = forms?.find(f => f.id === formToDelete);
      await deleteQuestionnaire(formToDelete);
      refresh();

      if (form) {
        toast.success(t('general.deleteSuccessName', { name: form.name }));
      } else {
        toast.success(t('general.deleteSuccess'));
      }

      // Clear selection if deleted
      if (selectedQuestionnaires.has(formToDelete)) {
        const newSet = new Set(selectedQuestionnaires);
        newSet.delete(formToDelete);
        setSelectedQuestionnaires(newSet);
      }
      setFormToDelete(null);
    } catch (error) {
      console.error('Failed to delete questionnaire:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedQuestionnaires);
      const deleteCount = idsToDelete.length;

      let singleItemName = '';
      if (deleteCount === 1) {
        const item = questionnaireForms.find(f => f.id === idsToDelete[0]);
        if (item) singleItemName = item.name;
      }

      await Promise.all(idsToDelete.map((id) => deleteQuestionnaire(id)));
      refresh();

      if (deleteCount === 1 && singleItemName) {
        toast.success(t('general.deleteSuccessName', { name: singleItemName }));
      } else {
        toast.success(t('general.deleteSuccessCount', { count: deleteCount, item: deleteCount === 1 ? 'questionnaire' : 'questionnaires' }));
      }

      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to bulk delete questionnaires:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleAssignToClients = () => {
    const selectedForms = questionnaireForms.filter((form) => selectedQuestionnaires.has(form.id));
    if (selectedForms.length === 0) return;

    setFormsToAssign(selectedForms);
    setIsAssignToClientsOpen(true);
    setSelectedClientIds(new Set());
  };

  const handleRemoveFormFromAssignList = (formId: string) => {
    setFormsToAssign((prev) => {
      const newList = prev.filter((form) => form.id !== formId);
      if (newList.length === 0) {
        setIsAssignToClientsOpen(false);
      }
      return newList;
    });
  };

  const handleAssignFormsToClients = async () => {
    if (selectedClientIds.size === 0 || formsToAssign.length === 0) return;

    // Check if user (coach) exists
    if (!user?.id) return;

    try {
      const clientIdsArray = Array.from(selectedClientIds);

      // We only support one schedule type for bulk assignment for now (can differ per form if we wanted,
      // but UI implies one schedule for all). Assuming the first form's schedule or a default one.
      // For simplicity in this bulk UI, we might use a default "one-time now" or let the user configure (not in current UI).
      // The current UI doesn't show schedule configuration in the side panel.
      // We'll proceed with "Assign Now" (one-time, immediate) as a safe default for bulk actions 
      // unless we add a schedule picker to the generic side panel.

      const defaultScheduleData: AssignFormScheduleData = {
        type: 'one-time',
        sendNow: true,
      };

      const defaultCron = convertScheduleToCron(defaultScheduleData);

      await assignFormsToClients({
        formIds: formsToAssign.map(f => f.id),
        clientIds: clientIdsArray,
        coachId: user.id,
        formType: 'questionnaire',
        cronExpression: defaultCron,
        scheduleData: defaultScheduleData
      });

      setIsAssignToClientsOpen(false);

      const formCount = formsToAssign.length;
      const clientCount = clientIdsArray.length;

      // Remove queries to force hard refresh and loading state
      clientIdsArray.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-questionnaires', clientId] });
      });

      toast.success(`Successfully assigned ${formCount} ${formCount === 1 ? 'questionnaire' : 'questionnaires'} to ${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`);

      setFormsToAssign([]);
      setSelectedQuestionnaires(new Set());
      setSelectedClientIds(new Set());
    } catch (error) {
      console.error('Failed to assign forms to clients:', error);
      toast.error('Failed to assign questionnaires');
    }
  };

  const handleCloseAssignToClients = () => {
    setIsAssignToClientsOpen(false);
    setFormsToAssign([]);
    setSelectedClientIds(new Set());
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const questionnaireForms = useMemo(() => {
    // Return all forms - backend filters by type
    return forms || [];
  }, [forms]);

  const handleSaveForm = async (newForm: Form, questions?: Array<{
    question: string;
    required: boolean;
    format: string;
    options?: string[];
    scaleFrom?: string;
    scaleTo?: string;
    mediaCount?: number;
  }>) => {
    refresh();

    if (questions && questions.length > 0) {
      sessionStorage.setItem(`form-questions-${newForm.id}`, JSON.stringify(questions));
    }

    setIsAddQuestionnaireOpen(false);
  };

  const questionnaireColumns: ColumnDefinition<Form>[] = [
    {
      id: 'name',
      label: t('forms.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({ isSorted, isAscending, isDescending, onSort, isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
                <span className="text-xs uppercase text-muted-foreground">{t('forms.columns.name')}</span>
                {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
                {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onSort('asc')} className={cn(isAscending && 'bg-accent')}>
                <ArrowUpNarrowWide className="size-4 mr-2" />
                <span className="flex-1">Sort ascending</span>
                {isAscending && <Check className="ml-2 size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('desc')} className={cn(isDescending && 'bg-accent')}>
                <ArrowDownWideNarrow className="size-4 mr-2" />
                <span className="flex-1">Sort descending</span>
                {isDescending && <Check className="ml-2 size-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      renderCell: (row, isSelected) => {
        const hasNoQuestions = !row.questions || row.questions.length === 0;
        return (
          <div className="flex items-center gap-3 h-full w-full">
            <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
              <Checkbox
                checked={isSelected}
                disabled={hasNoQuestions}
                onCheckedChange={() => {
                  if (hasNoQuestions) return;
                  const newSet = new Set(selectedQuestionnaires);
                  if (newSet.has(row.id)) newSet.delete(row.id);
                  else newSet.add(row.id);
                  setSelectedQuestionnaires(newSet);
                }}
              />
            </div>
            <span className="text-sm font-medium truncate">{row.name}</span>
          </div>
        );
      },
    },
    {
      id: 'description',
      label: t('forms.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[400px]', pixel: '400px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground truncate block">
          {row.description || '--'}
        </span>
      ),
    },
    {
      id: 'questionCount',
      label: t('forms.columns.questionCount'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.questions?.length || 0,
      getSearchValue: (row) => (row.questions?.length || 0).toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.questions?.length || 0}</span>
      ),
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setFormToDelete(row.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];




  const selectedCount = selectedQuestionnaires.size;

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={questionnaireForms}
        columns={questionnaireColumns}
        getRowId={(row) => row.id}
        gridKey="questionnaires-forms"
        searchPlaceholder={t('forms.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name', 'description']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedQuestionnaires}
        onSelectionChange={setSelectedQuestionnaires}
        isRowSelectable={(row) => row.questions && row.questions.length > 0}

        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('forms.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('forms.questionnaires.emptyState.title')}
            subtitle="Build questionnaires to gather detailed information from your clients about their goals and preferences"
            action={
              <Button onClick={handleOpenAddQuestionnaire} className="gap-2">
                <Plus className="size-4" />
                <span>{t('forms.addQuestionnaire')}</span>
              </Button>
            }
          />
        }
        filterBarActions={
          <Button onClick={handleOpenAddQuestionnaire} className="gap-2">
            <Plus className="size-4" />
            <span>{t('forms.addQuestionnaire')}</span>
          </Button>
        }
        selectionActions={
          selectedCount > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelectedQuestionnaires}
                className="gap-2"
                aria-label={t('forms.clearSelected')}
              >
                <X className="size-4" />
                <span>
                  {t('general.clearSelected', { count: selectedCount })}
                </span>
              </Button>
              {selectedCount === 1 && (
                <Button
                  variant="ghost"
                  onClick={handleDuplicateSelected}
                  className="gap-2"
                  aria-label={t('forms.actions.duplicateAria')}
                >
                  <Copy className="size-4" />
                  <span>{t('forms.actions.duplicate')}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleAssignToClients}
                className="gap-2"
                aria-label={t('forms.assignToClients')}
              >
                <UserPlus className="size-4" />
                <span>{t('forms.assignToClients')}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={t('general.delete')}
              >
                <Trash2 className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          router.push(`/forms/questionnaires/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            router.push(`/forms/questionnaires/${row.id}`);
          }
        }}
      />

      <AddQuestionnaireFormSidePanel
        open={isAddQuestionnaireOpen}
        onOpenChange={setIsAddQuestionnaireOpen}
        onSave={handleSaveForm}
      />

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedQuestionnaires.size}
        itemType={t('forms.questionnaires.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={formToDelete !== null}
        onOpenChange={(open) => !open && setFormToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        itemName={forms?.find(f => f.id === formToDelete)?.name}
        itemType="questionnaire"
      />

      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('forms.assignToClientsTitle')}
        onAssign={async (clientIds) => {
          setSelectedClientIds(new Set(clientIds));
          // We call the handler immediately, but we need to ensure selectedClientIds state is updated 
          // or we can pass clientIds directly to a new version of the handler.
          // Refactoring handleAssignFormsToClients to accept IDs would be cleaner, 
          // but for now setting state and calling works if we wait or just use the passed IDs.

          // Better approach: Call logic directly with passed IDs
          if (clientIds.length === 0 || formsToAssign.length === 0 || !user?.id) return;

          try {
            const defaultScheduleData: AssignFormScheduleData = {
              type: 'one-time',
              sendNow: true,
            };
            const defaultCron = convertScheduleToCron(defaultScheduleData);

            await assignFormsToClients({
              formIds: formsToAssign.map(f => f.id),
              clientIds: clientIds,
              coachId: user.id,
              formType: 'questionnaire',
              cronExpression: defaultCron,
              scheduleData: defaultScheduleData
            });

            const formCount = formsToAssign.length;
            const clientCount = clientIds.length;

            clientIds.forEach(clientId => {
              queryClient.removeQueries({ queryKey: ['client-questionnaires', clientId] });
            });

            // Determine toast message
            if (formCount === 1 && clientCount === 1) {
              const formName = formsToAssign[0].name;
              const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
              toast.success(t('forms.assignSuccessSingle', { formName, clientName }));
            } else if (formCount === 1) {
              const formName = formsToAssign[0].name;
              toast.success(t('forms.assignSuccessFormMultiClient', { formName, count: clientCount }));
            } else if (clientCount === 1) {
              const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
              toast.success(t('forms.assignSuccessMultiFormSingleClient', { count: formCount, clientName }));
            } else {
              toast.success(`Successfully assigned ${formCount} questionnaires to ${clientCount} clients`);
            }

            setFormsToAssign([]);
            setSelectedQuestionnaires(new Set());
            setSelectedClientIds(new Set());
          } catch (error) {
            console.error('Failed to assign forms to clients:', error);
            toast.error('Failed to assign questionnaires');
            throw error; // Propagate to panel to show error if needed
          }
        }}
        previewComponent={
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-sm font-medium">{t('forms.formsToAssign')}</label>
            {formsToAssign.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {formsToAssign.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{form.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFormFromAssignList(form.id)}
                      className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${form.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t('forms.noFormsSelected')}
              </div>
            )}
          </div>
        }
        assignButtonLabel={(count) => count <= 1 ? t('forms.assignToOneClient') : t('forms.assignToClientsCount', { count })}
        alertMessage={t('forms.questionnaires.assignAlert')}
      />
    </div>
  );
};

export default QuestionnairesPage;
