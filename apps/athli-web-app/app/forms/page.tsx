'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PageTabs, type TabItem } from '@/components/page-tabs';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X, Trash2, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { SidePanel } from '@/components/app/side-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AddCheckInFormSidePanel } from '@/components/forms/add-check-in-form-side-panel';
import { AddQuestionnaireFormSidePanel } from '@/components/forms/add-questionnaire-form-side-panel';
import { addForm, assignForm, convertScheduleToCron, type Form, type AssignFormScheduleData } from '@/lib/forms/form-service';
import { formTemplates } from '@/lib/constants/forms';
import { mockAthletes } from '@/components/app/app-shell';
import { cn } from '@/lib/utils';

// Mock forms data
const mockForms: Form[] = [
  {
    id: 'form-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'form-2',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const FormsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [forms, setForms] = useState<Form[]>(mockForms);
  const [activeTab, setActiveTab] = useState<'check-ins' | 'questionnaires'>('check-ins');

  // Set active tab from URL search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'check-ins' || tabParam === 'questionnaires') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [isAddCheckInOpen, setIsAddCheckInOpen] = useState<boolean>(false);
  const [isAddQuestionnaireOpen, setIsAddQuestionnaireOpen] = useState<boolean>(false);
  
  // Selection state
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  
  // Assign to clients side panel state
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [formsToAssign, setFormsToAssign] = useState<Form[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const handleOpenAddCheckIn = () => {
    setIsAddCheckInOpen(true);
  };

  const handleOpenAddQuestionnaire = () => {
    setIsAddQuestionnaireOpen(true);
  };

  const handleClearSelectedCheckIns = () => {
    setSelectedCheckIns(new Set());
  };

  const handleClearSelectedQuestionnaires = () => {
    setSelectedQuestionnaires(new Set());
  };

  const handleAssignToClients = () => {
    const selectedForms = activeTab === 'check-ins'
      ? checkInForms.filter((form) => selectedCheckIns.has(form.id))
      : questionnaireForms.filter((form) => selectedQuestionnaires.has(form.id));
    
    if (selectedForms.length === 0) {
      return;
    }
    
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
    if (selectedClientIds.size === 0 || formsToAssign.length === 0) {
      return;
    }
    
    try {
      const clientIdsArray = Array.from(selectedClientIds);
      const isCheckIn = activeTab === 'check-ins';
      
      // For each form and each client, assign the form
      await Promise.all(
        formsToAssign.flatMap((form) =>
          clientIdsArray.map(async (clientId) => {
            const scheduleData: AssignFormScheduleData = isCheckIn
              ? {
                  type: 'check-in',
                  frequency: 'weekly',
                  selectedDays: ['sunday'],
                }
              : {
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
      if (activeTab === 'check-ins') {
        setSelectedCheckIns(new Set());
      } else {
        setSelectedQuestionnaires(new Set());
      }
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

  // Filter forms by type (for now, we'll use mock data - in production this would come from the backend)
  const checkInForms = useMemo(() => {
    // TODO: Filter by type when Form interface includes type field
    return forms.filter((form) => form.name.includes('Check-in') || form.name.includes('Weekly'));
  }, [forms]);

  const questionnaireForms = useMemo(() => {
    // TODO: Filter by type when Form interface includes type field
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
    setForms((prev) => [...prev, newForm]);
    
    // Determine form type from template
    const template = formTemplates.find((t) => t.name === newForm.name);
    const formType = template?.schedule?.type || 'check-in';
    
    // If questions are provided (from template), store them for the form detail page
    if (questions && questions.length > 0) {
      sessionStorage.setItem(`form-questions-${newForm.id}`, JSON.stringify(questions));
      // Navigate to the correct form detail page based on type
      if (formType === 'check-in') {
        router.push(`/forms/check-ins/${newForm.id}`);
      } else {
        router.push(`/forms/questionnaires/${newForm.id}`);
      }
    }
  };

  const formatScheduleText = (form: Form): string => {
    // Find matching template
    const template = formTemplates.find((t) => t.name === form.name);
    
    if (!template?.schedule || template.schedule.type !== 'check-in') {
      return '-';
    }
    
    const schedule = template.schedule;
    
    if (schedule.frequency === 'daily') {
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
    
    return '-';
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
      id: 'schedule',
      label: t('athletes.profile.checkIns.columns.schedule'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
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
      getSortValue: (row) => row.questionCount,
      getSearchValue: (row) => row.questionCount.toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.questionCount}</span>
      ),
    },
  ];

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
      getSortValue: (row) => row.questionCount,
      getSearchValue: (row) => row.questionCount.toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.questionCount}</span>
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

  const tabs: TabItem[] = [
    { value: 'check-ins', label: t('forms.tabs.checkIns') },
    { value: 'questionnaires', label: t('forms.tabs.questionnaires') },
  ];

  const renderGrid = (
    data: Form[],
    gridKey: string,
    addButton: React.ReactNode,
    selectedIds: Set<string>,
    onSelectionChange: (ids: Set<string>) => void,
    onToggleRow: (id: string) => void,
    columns: ColumnDefinition<Form>[],
    formType: 'check-ins' | 'questionnaires'
  ) => {
    const selectedCount = selectedIds.size;
    return (
      <DataGrid
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={gridKey}
        searchPlaceholder={t('forms.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name', 'description']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedIds}
        onSelectionChange={onSelectionChange}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={createRenderFirstColumn(onToggleRow)}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('forms.emptyMessage')}
        filterBarActions={addButton}
        selectionActions={
          selectedCount > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={() => {
                  if (activeTab === 'check-ins') {
                    handleClearSelectedCheckIns();
                  } else {
                    handleClearSelectedQuestionnaires();
                  }
                }}
                className="gap-2"
                aria-label={t('forms.clearSelected')}
              >
                <X className="size-4" />
                <span>
                  {t('forms.clearSelected')} {selectedCount}
                </span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleAssignToClients}
                className="gap-2"
                aria-label={t('forms.assignToClients')}
              >
                <UserPlus className="size-4" />
                <span>{t('forms.assignToClients')}</span>
              </Button>
            </div>
          ) : undefined
        }
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          router.push(`/forms/${formType}/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            router.push(`/forms/${formType}/${row.id}`);
          }
        }}
      />
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('forms.title')}</h1>
        </div>
        <div className="px-4">
          <PageTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'check-ins' | 'questionnaires')}
            className="mt-1"
          />
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'check-ins' | 'questionnaires')} className="w-full flex flex-col flex-1 min-h-0">
        <TabsContent value="check-ins" className="flex-1 min-h-0 mt-0">
          <div className="h-full w-full flex flex-col">
            {renderGrid(
              checkInForms,
              'check-ins-forms',
              <Button onClick={handleOpenAddCheckIn} className="gap-2">
                <Plus className="size-4" />
                <span>{t('forms.addCheckIn')}</span>
              </Button>,
              selectedCheckIns,
              setSelectedCheckIns,
              (id) => {
                const newSet = new Set(selectedCheckIns);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedCheckIns(newSet);
              },
              checkInColumns,
              'check-ins'
            )}
          </div>
        </TabsContent>

        <TabsContent value="questionnaires" className="flex-1 min-h-0 mt-0">
          <div className="h-full w-full flex flex-col">
            {renderGrid(
              questionnaireForms,
              'questionnaires-forms',
              <Button onClick={handleOpenAddQuestionnaire} className="gap-2">
                <Plus className="size-4" />
                <span>{t('forms.addQuestionnaire')}</span>
              </Button>,
              selectedQuestionnaires,
              setSelectedQuestionnaires,
              (id) => {
                const newSet = new Set(selectedQuestionnaires);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedQuestionnaires(newSet);
              },
              questionnaireColumns,
              'questionnaires'
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddCheckInFormSidePanel
        open={isAddCheckInOpen}
        onOpenChange={setIsAddCheckInOpen}
        onSave={handleSaveForm}
      />

      <AddQuestionnaireFormSidePanel
        open={isAddQuestionnaireOpen}
        onOpenChange={setIsAddQuestionnaireOpen}
        onSave={handleSaveForm}
      />

      {/* Assign to Clients Side Panel */}
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
          {/* Forms to be assigned */}
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

          {/* Client Selection */}
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

export default FormsPage;
