'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X, Trash2, UserPlus, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Checkbox } from '@/components/ui/checkbox';
import { AddCheckInFormSidePanel } from '@/components/forms/add-check-in-form-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { deleteCheckIn, duplicateCheckIn, type CheckIn as Form } from '@/api/coach/coach-check-in-service';
import { assignForm, assignFormsToClients, convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { formTemplates } from '@/constants/forms';
import { cn } from '@/lib/general/utils';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { useCoachCheckIns } from '@/hooks/use-coach-check-ins';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useUserProfile } from '@/hooks/use-user-profile';


// Removed mock forms as we fetch from the API

const CheckInsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkIns: forms, isLoading } = useCoachCheckIns();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();
  const queryClient = useQueryClient();

  const [isAddCheckInOpen, setIsAddCheckInOpen] = useState<boolean>(false);
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [formsToAssign, setFormsToAssign] = useState<Form[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  // Auto-open add check-in panel if ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenAddCheckIn();
      // Clear the query param
      window.history.replaceState({}, '', '/forms/check-ins');
    }
  }, [searchParams]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['coach-check-ins'] });
  };

  const handleOpenAddCheckIn = () => {
    setIsAddCheckInOpen(true);
  };

  const handleClearSelectedCheckIns = () => {
    setSelectedCheckIns(new Set());
  };

  const handleDuplicateSelected = async () => {
    const selectedForms = checkInForms.filter((form) => selectedCheckIns.has(form.id));
    if (selectedForms.length !== 1) return;

    const formToDuplicate = selectedForms[0];
    try {
      await duplicateCheckIn(formToDuplicate.id, formToDuplicate);
      refresh();
      setSelectedCheckIns(new Set());
    } catch (error) {
      console.error('Failed to duplicate form:', error);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!formToDelete) return;
    try {
      const form = forms?.find(f => f.id === formToDelete);
      await deleteCheckIn(formToDelete);
      refresh();

      if (form) {
        toast.success(t('general.deleteSuccessName', { name: form.name }));
      } else {
        toast.success(t('general.deleteSuccess'));
      }

      // Clear selection if deleted
      if (selectedCheckIns.has(formToDelete)) {
        const newSet = new Set(selectedCheckIns);
        newSet.delete(formToDelete);
        setSelectedCheckIns(newSet);
      }
      setFormToDelete(null);
    } catch (error) {
      console.error('Failed to delete check-in:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedCheckIns);
      const deleteCount = idsToDelete.length;
      await Promise.all(idsToDelete.map((id) => deleteCheckIn(id)));
      refresh();

      toast.success(t('general.deleteSuccessCount', { count: deleteCount, item: deleteCount === 1 ? 'check-in' : 'check-ins' }));

      setSelectedCheckIns(new Set());
    } catch (error) {
      console.error('Failed to bulk delete check-ins:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleAssignToClients = () => {
    const selectedForms = checkInForms.filter((form) => selectedCheckIns.has(form.id));
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

  const handleAssignFormsToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || formsToAssign.length === 0) return;

    // Check if user (coach) exists
    if (!user?.id) return;

    try {
      const scheduleData: AssignFormScheduleData = {
        type: 'check-in',
        frequency: 'weekly',
        selectedDays: ['sunday'],
      };

      const cronExpression = convertScheduleToCron(scheduleData);

      await assignFormsToClients({
        formIds: formsToAssign.map(f => f.id),
        clientIds: clientIds,
        coachId: user.id,
        formType: 'check-in',
        cronExpression: cronExpression,
        scheduleData: scheduleData,
      });

      setIsAssignToClientsOpen(false);
      const formCount = formsToAssign.length;
      const clientCount = clientIds.length;

      // Remove queries to force hard refresh and loading state
      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-check-ins', clientId] });
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
        toast.success(`Successfully assigned ${formCount} check-ins to ${clientCount} clients`);
      }

      // Clear selection
      setFormsToAssign([]);
      setSelectedCheckIns(new Set());
    } catch (error) {
      console.error('Failed to assign forms to clients:', error);
    }
  };

  const checkInForms = useMemo(() => {
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

    setIsAddCheckInOpen(false);
  };

  const formatScheduleText = (form: Form): string => {
    // First try to get schedule from database
    let schedule = form.schedule_config;

    // Fallback to template if no schedule_config in database
    if (!schedule) {
      const template = formTemplates.find((t) => t.name === form.name);
      schedule = template?.schedule;
    }

    if (!schedule || schedule.type !== 'check-in') {
      return '--';
    }

    if (schedule.frequency === 'daily') {
      // If all 7 days are selected, just say "Daily"
      if (schedule.selectedDays && schedule.selectedDays.length === 7) {
        return t('athletes.profile.checkIns.schedule.frequency.daily');
      }
      // Otherwise show the specific days
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayNames = schedule.selectedDays.map(day => t(`habits.form.${day}`)).join(', ');
        return t('athletes.profile.checkIns.schedule.frequency.daily') + ` (${dayNames})`;
      }
      return t('athletes.profile.checkIns.schedule.frequency.daily');
    } else if (schedule.frequency === 'weekly') {
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayName = t(`habits.form.${schedule.selectedDays[0]}`);
        return t('athletes.profile.checkIns.schedule.frequency.weekly') + ` (${dayName})`;
      }
      return t('athletes.profile.checkIns.schedule.frequency.weekly');
    } else if (schedule.frequency === 'biweekly') {
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayName = t(`habits.form.${schedule.selectedDays[0]}`);
        return t('athletes.profile.checkIns.schedule.frequency.biweekly') + ` (${dayName})`;
      }
      return t('athletes.profile.checkIns.schedule.frequency.biweekly');
    } else if (schedule.frequency === 'monthly') {
      if (schedule.monthlyOption === 'first') {
        return t('athletes.profile.checkIns.schedule.frequency.monthly') + ' (1st)';
      } else if (schedule.monthlyOption === 'last') {
        return t('athletes.profile.checkIns.schedule.frequency.monthly') + ' (Last)';
      } else if (schedule.monthlyOption === 'specific' && schedule.specificDay) {
        const suffix = schedule.specificDay === 1 ? 'st' : schedule.specificDay === 2 ? 'nd' : schedule.specificDay === 3 ? 'rd' : 'th';
        return t('athletes.profile.checkIns.schedule.frequency.monthly') + ` (${schedule.specificDay}${suffix})`;
      }
      return t('athletes.profile.checkIns.schedule.frequency.monthly');
    }

    return '--';
  };

  const checkInColumns: ColumnDefinition<Form>[] = [
    {
      id: 'name',
      label: t('forms.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({
        isSorted,
        isAscending,
        isDescending,
        onSort,
        isAllSelected,
        onToggleAll,
      }) => (
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
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
          >
            <Checkbox checked={isSelected} onCheckedChange={() => {
              const newSet = new Set(selectedCheckIns);
              if (newSet.has(row.id)) {
                newSet.delete(row.id);
              } else {
                newSet.add(row.id);
              }
              setSelectedCheckIns(newSet);
            }} />
          </div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'description',
      label: t('forms.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground truncate block">
          {row.description || '--'}
        </span>
      ),
    },
    {
      id: 'schedule',
      label: t('athletes.profile.checkIns.columns.schedule'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[250px]', pixel: '250px' },
      getSortValue: (row) => formatScheduleText(row).toLowerCase(),
      getSearchValue: (row) => formatScheduleText(row),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{formatScheduleText(row)}</span>
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




  const selectedCount = selectedCheckIns.size;

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={checkInForms}
        columns={checkInColumns}
        getRowId={(row) => row.id}
        gridKey="check-ins-forms"
        searchPlaceholder={t('forms.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name', 'description']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedCheckIns}
        onSelectionChange={setSelectedCheckIns}

        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('forms.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('forms.checkIns.emptyState.title')}
            subtitle="Create check-in forms to regularly collect feedback and monitor your clients' progress"
            action={
              <Button onClick={handleOpenAddCheckIn} className="gap-2">
                <Plus className="size-4" />
                <span>{t('forms.addCheckIn')}</span>
              </Button>
            }
          />
        }
        filterBarActions={
          <Button onClick={handleOpenAddCheckIn} className="gap-2">
            <Plus className="size-4" />
            <span>{t('forms.addCheckIn')}</span>
          </Button>
        }
        selectionActions={
          selectedCount > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelectedCheckIns}
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
          router.push(`/forms/check-ins/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            router.push(`/forms/check-ins/${row.id}`);
          }
        }}
      />

      <AddCheckInFormSidePanel
        open={isAddCheckInOpen}
        onOpenChange={setIsAddCheckInOpen}
        onSave={handleSaveForm}
      />

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedCheckIns.size}
        itemType={t('forms.checkIns.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={formToDelete !== null}
        onOpenChange={(open) => !open && setFormToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        itemName={forms?.find(f => f.id === formToDelete)?.name}
        itemType="check-in"
      />

      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('forms.assignToClientsTitle')}
        assignButtonLabel={(count) =>
          count === 1
            ? t('forms.assignToOneClient')
            : t('forms.assignToClientsCount', { count })
        }
        onAssign={handleAssignFormsToClients}
        previewComponent={
          formsToAssign.length > 0 ? (
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
          )
        }
      />
    </div>
  );
};

export default CheckInsPage;
