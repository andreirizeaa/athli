'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X, Trash2, UserPlus, Copy, Loader2 } from 'lucide-react';
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
import { BulkDeleteConfirmationDialog } from '@/components/app/bulk-delete-confirmation-dialog';
import { addQuestionnaire, duplicateQuestionnaire, deleteQuestionnaire, getQuestionnaires, type Questionnaire as Form } from '@/api/coach/coach-questionnaire-service';
import { assignForm, convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { formTemplates } from '@/constants/forms';
import { mockAthletes } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';

// Removed mock forms as we fetch from the API

const QuestionnairesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddQuestionnaireOpen, setIsAddQuestionnaireOpen] = useState<boolean>(false);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [formsToAssign, setFormsToAssign] = useState<Form[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const data = await getQuestionnaires();
      setForms(data);
    } catch (error) {
      console.error('Failed to fetch questionnaires:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

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
      const duplicatedForm = await duplicateQuestionnaire(formToDuplicate.id, formToDuplicate);
      fetchForms();
      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to duplicate form:', error);
    }
  };

  const handleDeleteQuestionnaire = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await deleteQuestionnaire(id);
      fetchForms();

      // Clear selection if deleted
      if (selectedQuestionnaires.has(id)) {
        const newSet = new Set(selectedQuestionnaires);
        newSet.delete(id);
        setSelectedQuestionnaires(newSet);
      }
    } catch (error) {
      console.error('Failed to delete questionnaire:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedQuestionnaires);
      await Promise.all(idsToDelete.map((id) => deleteQuestionnaire(id)));
      fetchForms();
      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to bulk delete questionnaires:', error);
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

    try {
      const clientIdsArray = Array.from(selectedClientIds);

      await Promise.all(
        formsToAssign.flatMap((form) =>
          clientIdsArray.map(async (clientId) => {
            const scheduleData: AssignFormScheduleData = {
              type: 'one-time',
              sendNow: true,
            };

            const cronExpression = convertScheduleToCron(scheduleData);

            await assignForm({
              formId: form.id,
              clientId: clientId,
              cronExpression: cronExpression,
              scheduleData: scheduleData,
            });
          })
        )
      );

      setIsAssignToClientsOpen(false);
      setFormsToAssign([]);
      setSelectedQuestionnaires(new Set());
      setSelectedClientIds(new Set());
    } catch (error) {
      console.error('Failed to assign forms to clients:', error);
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
    return forms.filter((form) => !form.name.includes('Check-in') && !form.name.includes('Weekly'));
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
    fetchForms();

    const template = formTemplates.find((t) => t.name === newForm.name);
    const formType = template?.schedule?.type || 'check-in';

    if (questions && questions.length > 0) {
      sessionStorage.setItem(`form-questions-${newForm.id}`, JSON.stringify(questions));
      if (formType === 'check-in') {
        router.push(`/forms/check-ins/${newForm.id}`);
      } else {
        router.push(`/forms/questionnaires/${newForm.id}`);
      }
    }
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
          {row.description || '-'}
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
            onClick={(e) => handleDeleteQuestionnaire(row.id, e)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleDeleteQuestionnaire(row.id, e);
              }
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

  const renderFirstColumnHeader = ({
    isSorted,
    isAscending,
    isDescending,
    onSort,
    isAllSelected,
    onToggleAll,
  }: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
    isAllSelected: boolean;
    onToggleAll: () => void;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
        >
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <span className="text-xs uppercase text-muted-foreground">
                {t('forms.columns.name')}
              </span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onSort('asc')}
              className={cn(isAscending && 'bg-accent')}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">Sort ascending</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">Sort descending</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const createRenderFirstColumn = (onToggleRow: (id: string) => void) => {
    return (row: Form, isSelected: boolean) => {
      return (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
          >
            <Checkbox checked={isSelected} onCheckedChange={() => onToggleRow(row.id)} />
          </div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      );
    };
  };


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
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={createRenderFirstColumn((id) => {
          const newSet = new Set(selectedQuestionnaires);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          setSelectedQuestionnaires(newSet);
        })}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('forms.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('forms.questionnaires.emptyState.title')}
            subtitle={t('forms.questionnaires.emptyState.subtitle')}
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
                  {t('forms.clearSelected')} {selectedCount}
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

      <BulkDeleteConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedQuestionnaires.size}
        itemName={t('forms.questionnaires.title').toLowerCase()}
      />

      <SidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('forms.assignToClientsTitle')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleAssignFormsToClients}
              disabled={selectedClientIds.size === 0 || formsToAssign.length === 0}
            >
              {selectedClientIds.size === 1
                ? t('forms.assignToOneClient')
                : t('forms.assignToClientsCount', { count: selectedClientIds.size })}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAssignToClients}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 h-full">
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

          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <label className="text-sm font-medium">{t('athletes.title')}</label>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataGrid
                data={mockAthletes}
                columns={[
                  {
                    id: 'name',
                    label: t('athletes.title'),
                    icon: <UserPlus className="size-3" />,
                    width: { class: 'w-full', pixel: '100%' },
                    getSortValue: (row) => row.name.toLowerCase(),
                    getSearchValue: (row) => `${row.name} ${row.email} ${row.country}`,
                  },
                ]}
                getRowId={(row) => row.id}
                gridKey="assign-forms-to-clients"
                searchPlaceholder={t('forms.searchAthletes')}
                enableSearch={true}
                enableEditColumns={false}
                enableExport={false}
                enableRowSelection={true}
                selectedRowIds={selectedClientIds}
                onSelectionChange={setSelectedClientIds}
                onRowClick={(row, event) => {
                  const targetElement = event.target as HTMLElement;
                  if (targetElement.closest('[data-no-row-link="true"]')) {
                    return;
                  }
                  handleToggleClient(row.id);
                }}
                onRowKeyDown={(row, event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    const targetElement = event.target as HTMLElement;
                    if (targetElement.closest('[data-no-row-link="true"]')) {
                      return;
                    }
                    event.preventDefault();
                    handleToggleClient(row.id);
                  }
                }}
                firstColumnId="name"
                stickyFirstColumn={true}
                firstColumnWidth="100%"
                hideFirstColumnBorder={true}
                renderFirstColumn={(row, isSelected) => {
                  const initials = row.name
                    .split(' ')
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('');
                  return (
                    <div className="flex items-center gap-3 h-full w-full">
                      <div
                        className="flex items-center justify-center h-full flex-shrink-0"
                        data-no-row-link="true"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleClient(row.id)}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={row.avatar} alt={row.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn('truncate text-sm font-medium')}>{row.name}</span>
                      </div>
                    </div>
                  );
                }}
                renderFirstColumnHeader={({ isAllSelected, onToggleAll }) => {
                  return (
                    <div className="flex items-center gap-3 h-full w-full">
                      <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                      <div className="flex items-center gap-2">
                        <UserPlus className="size-3 text-muted-foreground" />
                        <span className="text-xs uppercase text-muted-foreground">{t('athletes.title')}</span>
                      </div>
                    </div>
                  );
                }}
                emptyMessage={t('forms.noAthletesFound')}
                rowHeight="54px"
                compactMode={true}
                showPagination={true}
                itemsPerPage={10}
                gridPadding={true}
              />
            </div>
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default QuestionnairesPage;
