'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useTerminology } from '@/hooks/use-terminology';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X, UserPlus, Target, Clock, Bell, Copy, ChevronRight, Edit, MoreHorizontal, Move, Loader2, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Habit } from '@/api/coach/coach-habit-service';
import { useCoachHabits } from '@/hooks/use-coach-habits';
import { useCoachHabitFolders } from '@/hooks/use-coach-habit-folders';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { assignHabitsToClients } from '@/api/client/client-habit-service';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { CreateFolderDialog } from '@/components/app/create-folder-dialog';
import { MoveToFolderDialog } from '@/components/app/move-to-folder-dialog';
import { SidePanel } from '@/components/app/side-panel';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type HabitFormValues = {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
};

const unitOptions = ['steps', 'min', 'times', 'count', 'drink', 'cups', 'm', 'km', 'mile', 'sec', 'hour', 'ml', 'l', 'oz', 'cal', 'g', 'mg'] as const;

const HabitFolderPage = () => {
  const params = useParams();
  const folderId = params.folderId as string;
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations();
  const terminology = useTerminology();
  const { user } = useUserProfile();

  const { habits, createHabit, updateHabit, deleteHabit, duplicateHabit, isDuplicating } = useCoachHabits();
  const { folders, updateFolder, deleteFolder, moveHabit } = useCoachHabitFolders();
  const { clients } = useCoachClients();

  const currentFolder = useMemo(() => folders.find(f => f.id === folderId), [folders, folderId]);
  const folderHabits = useMemo(() => habits.filter(h => h.folderId === folderId), [habits, folderId]);

  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [isEditHabitOpen, setIsEditHabitOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState(false);
  const [habitsToAssign, setHabitsToAssign] = useState<Habit[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [habitToMove, setHabitToMove] = useState<Habit | null>(null);
  const [enableDuration, setEnableDuration] = useState(false);
  const [enableReminder, setEnableReminder] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('library');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  const habitSchema = z.object({
    name: z.string().min(1).max(60),
    description: z.string().optional(),
    amount: z.number().int().min(1),
    unit: z.string().min(1),
    period: z.union([z.literal('daily'), z.literal('weekly')]),
    duration: z.number().int().positive().optional(),
    reminderTime: z.string().optional(),
    reminderMessage: z.string().optional(),
  });

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    mode: 'onChange',
    defaultValues: { name: '', description: '', amount: 0, unit: '', period: 'daily' },
  });

  const nameValue = form.watch('name');
  const amount = form.watch('amount');
  const unit = form.watch('unit');
  const period = form.watch('period');

  const handleOpenAddHabit = () => {
    setIsAddHabitOpen(true);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
    setActiveTab('library');
    setLibrarySearchQuery('');
  };

  const handleCloseAddHabit = () => {
    setIsAddHabitOpen(false);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
    setActiveTab('library');
    setLibrarySearchQuery('');
  };

  const handleSelectHabit = (habit: DefaultHabit) => {
    form.setValue('name', habit.name);
    form.setValue('description', habit.description || '');
    form.setValue('amount', habit.amount);
    form.setValue('unit', habit.unit);
    form.setValue('period', habit.period);

    if (habit.duration) {
      form.setValue('duration', habit.duration);
      setEnableDuration(true);
    } else {
      form.setValue('duration', undefined);
      setEnableDuration(false);
    }

    if (habit.reminderTime) {
      form.setValue('reminderTime', habit.reminderTime);
      form.setValue('reminderMessage', habit.reminderMessage || '');
      setEnableReminder(true);
    } else {
      form.setValue('reminderTime', undefined);
      form.setValue('reminderMessage', undefined);
      setEnableReminder(false);
    }

    setActiveTab('manual');
  };

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return true;
    if (normalizedText.includes(normalizedQuery)) return true;
    let textIndex = 0;
    let queryIndex = 0;
    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }
    return queryIndex === normalizedQuery.length;
  };

  const filteredLibraryHabits = useMemo(() => {
    if (!librarySearchQuery.trim()) return defaultHabits;
    const query = librarySearchQuery.trim().toLowerCase();
    return defaultHabits
      .map((section) => {
        const filteredHabitsInSection = section.habits.filter((habit) => {
          return isFuzzyMatch(habit.name, query) || (habit.description && isFuzzyMatch(habit.description, query)) || isFuzzyMatch(section.label, query);
        });
        if (filteredHabitsInSection.length === 0) return null;
        return { ...section, habits: filteredHabitsInSection };
      })
      .filter((section): section is typeof defaultHabits[0] => section !== null);
  }, [librarySearchQuery]);

  const handleOpenEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    form.setValue('name', habit.name);
    form.setValue('description', habit.description || '');
    form.setValue('amount', habit.amount);
    form.setValue('unit', habit.unit);
    form.setValue('period', habit.period);
    if (habit.duration) { form.setValue('duration', habit.duration); setEnableDuration(true); }
    if (habit.reminderTime) { form.setValue('reminderTime', habit.reminderTime); form.setValue('reminderMessage', habit.reminderMessage || ''); setEnableReminder(true); }
    setIsEditHabitOpen(true);
  };

  const handleCloseEditHabit = () => {
    setIsEditHabitOpen(false);
    setEditingHabitId(null);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
  };

  const handleSaveHabit = async (values: HabitFormValues) => {
    setIsSaving(true);
    try {
      if (editingHabitId) {
        await updateHabit({ id: editingHabitId, ...values });
        handleCloseEditHabit();
      } else {
        const newHabit = await createHabit(values);
        await moveHabit({ habitId: newHabit.id, folderId });
        handleCloseAddHabit();
      }
    } catch (error) {
      console.error('Failed to save habit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHabit = async () => {
    if (!editingHabitId) return;
    try {
      await deleteHabit(editingHabitId);
      handleCloseEditHabit();
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedHabits).map((id) => deleteHabit(id)));
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to bulk delete habits:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!habitToDelete) return;
    try {
      await deleteHabit(habitToDelete);
      setHabitToDelete(null);
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleAssignToClients = () => {
    const selectedHabitItems = folderHabits.filter(h => selectedHabits.has(h.id));
    if (selectedHabitItems.length === 0) return;
    setHabitsToAssign(selectedHabitItems);
    setIsAssignToClientsOpen(true);
  };

  const handleAssignFolderToClients = () => {
    if (folderHabits.length === 0) { toast.error('This folder is empty'); return; }
    setHabitsToAssign(folderHabits);
    setIsAssignToClientsOpen(true);
  };

  const handleAssignHabitsToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || habitsToAssign.length === 0 || !user?.id) return;
    try {
      await assignHabitsToClients({ habitIds: habitsToAssign.map(h => h.id), clientIds, coachId: user.id });
      setIsAssignToClientsOpen(false);
      clientIds.forEach(clientId => queryClient.removeQueries({ queryKey: ['client-habits', clientId] }));
      toast.success(`Successfully assigned ${habitsToAssign.length} habits to ${clientIds.length} clients`);
      setHabitsToAssign([]);
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to assign habits to clients:', error);
    }
  };

  const handleUpdateFolder = async (name: string) => {
    if (!currentFolder) return;
    await updateFolder({ id: currentFolder.id, data: { name } });
    setIsEditFolderOpen(false);
  };

  const handleDeleteFolder = async () => {
    if (!currentFolder) return;
    try {
      await deleteFolder(currentFolder.id);
      router.push('/habits');
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleMoveHabit = async (targetFolderId: string | null) => {
    if (!habitToMove) return;
    await moveHabit({ habitId: habitToMove.id, folderId: targetFolderId });
    setHabitToMove(null);
  };

  const getAimText = (habit: Habit): string => {
    const unitLabel = t(`habits.form.units.${habit.unit as string}`);
    const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
    return `${habit.amount} ${unitLabel} / ${periodText}`;
  };

  const columns: ColumnDefinition<Habit>[] = [
    {
      id: 'name',
      label: t('habits.columns.name'),
      width: { class: 'w-[350px]', pixel: '350px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <span className="text-xs uppercase text-muted-foreground">{t('habits.columns.name')}</span>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div data-no-row-link="true"><Checkbox checked={isSelected} onCheckedChange={() => { const newSet = new Set(selectedHabits); if (newSet.has(row.id)) newSet.delete(row.id); else newSet.add(row.id); setSelectedHabits(newSet); }} /></div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'aim',
      label: 'Aim',
      width: { class: 'w-[300px]', pixel: '300px' },
      renderHeader: () => (<div className="flex items-center gap-2"><Target className="size-3 text-muted-foreground" /><span className="text-xs uppercase text-muted-foreground">Aim</span></div>),
      renderCell: (row) => <span className="text-sm text-foreground">{getAimText(row)}</span>,
    },
    {
      id: 'duration',
      label: 'Duration',
      width: { class: 'w-[150px]', pixel: '150px' },
      renderHeader: () => (<div className="flex items-center gap-2"><Clock className="size-3 text-muted-foreground" /><span className="text-xs uppercase text-muted-foreground">Duration</span></div>),
      renderCell: (row) => <span className="text-sm text-muted-foreground">{row.duration ? `${row.duration} min` : '--'}</span>,
    },
    {
      id: 'reminder',
      label: 'Reminder',
      width: { class: 'w-[150px]', pixel: '150px' },
      renderHeader: () => (<div className="flex items-center gap-2"><Bell className="size-3 text-muted-foreground" /><span className="text-xs uppercase text-muted-foreground">Reminder</span></div>),
      renderCell: (row) => <span className="text-sm text-muted-foreground">{row.reminderTime || '--'}</span>,
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHabitToMove(row); }}><Move className="size-4 mr-2" /><span>Move</span></DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHabitToDelete(row.id); }} className="text-destructive focus:text-destructive"><Trash2 className="size-4 mr-2 text-destructive" /><span>{t('general.delete')}</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!currentFolder) {
    router.push('/habits');
    return null;
  }

  const renderManualForm = () => (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(handleSaveHabit)(e); }} className="flex flex-col gap-6">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel><span>{t('habits.form.name')}<RequiredAsterisk /></span></FormLabel>
            <FormControl>
              <div className="relative">
                <Input placeholder={t('habits.form.namePlaceholder')} maxLength={60} className="pr-12" {...field} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{nameValue?.length || 0} / 60</span>
              </div>
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>{t('habits.form.description')}</FormLabel><FormControl><Textarea placeholder={t('habits.form.descriptionPlaceholder')} rows={3} className="resize-none" {...field} /></FormControl></FormItem>
        )} />
        <div className="space-y-4">
          <Label><span>{t('habits.form.amountUnitPeriod')}<RequiredAsterisk /></span></Label>
          <div className="flex items-center gap-2">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem className="w-[20%]"><FormControl><Input type="number" placeholder={t('habits.form.amount')} min="1" step="1" {...field} onChange={(e) => { const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10); field.onChange(isNaN(value) ? 0 : value); }} value={field.value === 0 ? '' : field.value} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem className="w-[20%]"><FormControl><Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="w-full"><SelectValue placeholder={t('habits.form.unit')} /></SelectTrigger><SelectContent>{unitOptions.map((unit) => (<SelectItem key={unit} value={unit}>{t(`habits.form.units.${unit}`)}</SelectItem>))}</SelectContent></Select></FormControl></FormItem>
            )} />
            <div className="text-muted-foreground px-2">/</div>
            <FormField control={form.control} name="period" render={({ field }) => (
              <FormItem><FormControl><ToggleGroup type="single" value={field.value} onValueChange={(value) => { if (value) field.onChange(value as 'daily' | 'weekly'); }} variant="outline" spacing={0}><ToggleGroupItem value="daily">{t('habits.form.daily')}</ToggleGroupItem><ToggleGroupItem value="weekly">{t('habits.form.weekly')}</ToggleGroupItem></ToggleGroup></FormControl></FormItem>
            )} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2"><Switch checked={enableDuration} onCheckedChange={(checked) => { setEnableDuration(checked); form.setValue('duration', checked ? 30 : undefined); }} /><Label className="cursor-pointer">{t('habits.form.duration')}</Label></div>
          {enableDuration && (<div className="flex gap-2"><FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="0" min="1" step="1" className="w-[100%]" {...field} onChange={(e) => { const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10); field.onChange(value === undefined || isNaN(value) ? undefined : value); }} value={field.value ?? ''} /></FormControl></FormItem>)} /><Label className="text-sm text-muted-foreground">{t('habits.form.durationLabel')}</Label></div>)}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2"><Switch checked={enableReminder} onCheckedChange={(checked) => { setEnableReminder(checked); if (checked) { form.setValue('reminderTime', '07:00'); form.setValue('reminderMessage', ''); } else { form.setValue('reminderTime', undefined); form.setValue('reminderMessage', undefined); } }} /><Label className="cursor-pointer">{t('habits.form.reminder')}</Label></div>
          {enableReminder && (<div className="flex gap-4"><FormField control={form.control} name="reminderTime" render={({ field }) => (<FormItem className="w-[20%]"><FormLabel className="text-sm">{t('habits.form.reminderTime')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>)} /><FormField control={form.control} name="reminderMessage" render={({ field }) => (<FormItem className="flex-1"><FormLabel className="text-sm">{t('habits.form.reminderMessage')}</FormLabel><FormControl><Input placeholder={t('habits.form.reminderMessagePlaceholder')} {...field} /></FormControl></FormItem>)} /></div>)}
        </div>
      </form>
    </Form>
  );

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      {/* Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => router.push('/habits')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('habits.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 font-semibold text-foreground">
                    {currentFolder?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{currentFolder?.name}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button variant="ghost" onClick={() => setIsEditFolderOpen(true)} className="gap-2 border border-primary"><Edit className="size-4" /><span>Edit Folder</span></Button>
            <Button variant="ghost" onClick={handleAssignFolderToClients} className="gap-2 border border-primary"><UserPlus className="size-4" /><span>Assign Folder</span></Button>
            <Button onClick={handleOpenAddHabit} className="gap-2"><Plus className="size-4" /><span>{t('habits.addHabit')}</span></Button>
          </ButtonGroup>
        </div>
        <div className="border-b" />
      </div>

      <DataGrid
        data={folderHabits}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`habits-folder-${folderId}`}
        searchPlaceholder={t('habits.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedHabits}
        onSelectionChange={setSelectedHabits}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage="No habits in this folder"
        emptyState={<EmptyGridState title="No habits in this folder" subtitle="Add habits to this folder to organize your library" action={<Button onClick={handleOpenAddHabit} className="gap-2"><Plus className="size-4" /><span>{t('habits.addHabit')}</span></Button>} />}
        selectionActions={selectedHabits.size > 0 ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => setSelectedHabits(new Set())} className="gap-2"><X className="size-4" /><span>{t('general.clearSelected', { count: selectedHabits.size })}</span></Button>
            {selectedHabits.size === 1 && <Button variant="ghost" onClick={async () => { await duplicateHabit(Array.from(selectedHabits)[0]); setSelectedHabits(new Set()); }} className="gap-2" disabled={isDuplicating}>{isDuplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}<span>{t('habits.actions.duplicate')}</span></Button>}
            <Button variant="ghost" onClick={handleAssignToClients} className="gap-2"><UserPlus className="size-4" /><span>{terminology.assignToPlural}</span></Button>
            <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /><span>{t('general.delete')}</span></Button>
          </div>
        ) : undefined}
        onRowClick={(row, event) => { if (!(event.target as HTMLElement).closest('[data-no-row-link="true"]')) handleOpenEditHabit(row); }}
        onRowKeyDown={(row, event) => { if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).closest('[data-no-row-link="true"]')) { event.preventDefault(); handleOpenEditHabit(row); } }}
        rowHeight="54px"
      />

      <SidePanel open={isAddHabitOpen} onOpenChange={(open) => { if (!open) handleCloseAddHabit(); }} title={t('habits.addHabitTitle')} onOpenAutoFocus={(e) => e.preventDefault()} contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
        footer={activeTab === 'manual' ? (
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseAddHabit} disabled={isSaving}>{t('general.cancel')}</Button>
            <Button type="button" onClick={form.handleSubmit(handleSaveHabit)} disabled={!form.formState.isValid || isSaving} className="gap-2">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('general.save')}</Button>
          </div>
        ) : null}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'library')} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="library" className="flex-1">Athli library</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual add</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-0">
            <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input type="text" placeholder="Search habits..." value={librarySearchQuery} onChange={(e) => setLibrarySearchQuery(e.target.value)} className="pl-9" />
              </div>
              {filteredLibraryHabits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><p>No habits found matching &quot;{librarySearchQuery}&quot;</p></div>
              ) : (
                filteredLibraryHabits.map((section) => (
                  <div key={section.label} className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {section.habits.map((habit) => {
                        const unitLabel = t(`habits.form.units.${habit.unit as string}`);
                        const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
                        const subtitle = `${habit.amount} ${unitLabel} / ${periodText}`;
                        return (
                          <Card key={`${section.label}-${habit.name}`} className="p-4 cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSelectHabit(habit)} tabIndex={0} role="button">
                            <div className="flex flex-col gap-1">
                              <h4 className="text-sm font-medium text-foreground">{habit.name}</h4>
                              <p className="text-xs text-muted-foreground">{subtitle}</p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="manual" className="mt-0">{renderManualForm()}</TabsContent>
        </Tabs>
      </SidePanel>

      <SidePanel open={isEditHabitOpen} onOpenChange={(open) => { if (!open) handleCloseEditHabit(); }} title="Edit Habit" onOpenAutoFocus={(e) => e.preventDefault()} contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
        footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="outline" onClick={handleCloseEditHabit} disabled={isSaving}>{t('general.cancel')}</Button><Button type="button" variant="outline" onClick={handleDeleteHabit} className="gap-2" disabled={isSaving}><Trash2 className="size-4" />{t('general.delete')}</Button><Button type="button" onClick={form.handleSubmit(handleSaveHabit)} disabled={!form.formState.isValid || isSaving} className="gap-2">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('general.save')}</Button></div>}
      >{renderManualForm()}</SidePanel>

      <ConfirmDeleteDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen} onConfirm={handleBulkDelete} count={selectedHabits.size} itemType={t('habits.title').toLowerCase()} />
      <ConfirmDeleteDialog open={habitToDelete !== null} onOpenChange={(open) => !open && setHabitToDelete(null)} onConfirm={handleDeleteSingle} itemName={habits.find(h => h.id === habitToDelete)?.name} itemType="habit" />
      <CreateFolderDialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen} onSave={handleUpdateFolder} title="Edit Folder" initialName={currentFolder?.name || ''} isEdit={true} />
      <MoveToFolderDialog open={habitToMove !== null} onOpenChange={(open) => !open && setHabitToMove(null)} folders={folders} currentFolderId={folderId} onMove={handleMoveHabit} itemName={habitToMove?.name} />

      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={`Assign habits to ${terminology.pluralLower}`}
        assignButtonLabel={(count) => terminology.assignToCountLabel(count)}
        onAssign={handleAssignHabitsToClients}
        previewComponent={habitsToAssign.length > 0 ? (
          <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
            {habitsToAssign.map((habit) => (<div key={habit.id} className="flex items-center justify-between px-4 py-3"><span className="text-sm truncate">{habit.name}</span><button type="button" onClick={() => setHabitsToAssign(prev => prev.filter(h => h.id !== habit.id))} className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button></div>))}
          </div>
        ) : <div className="text-sm text-muted-foreground py-4 text-center">{t('habits.noHabitsSelected')}</div>}
      />
    </div>
  );
};

export default HabitFolderPage;
