'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Info,
  Trash2,
  UserPlus,
  Target,
  Clock,
  Bell,
  X,
  Copy,
  Loader2,
  Check,
  FolderPlus,
  MoreHorizontal,
  Move,
  Folder,
} from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { PageHeader } from '@/components/app/page-header';
import { useUserProfile } from '@/hooks/use-user-profile';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Habit } from '@/api/coach/coach-habit-service';
import { useCoachHabits } from '@/hooks/use-coach-habits';
import { useCoachHabitFolders } from '@/hooks/use-coach-habit-folders';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { assignHabitsToClients } from '@/api/client/client-habit-service';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { FolderCard } from '@/components/app/folder-card';
import { CreateFolderDialog } from '@/components/app/create-folder-dialog';
import { MoveToFolderDialog } from '@/components/app/move-to-folder-dialog';
import { FolderSearchButton } from '@/components/app/folder-search-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import { useFeatureAccess } from '@/lib/permissions/feature-gate';

// Screenshot preview component for upgrade dialog
function ScreenshotPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const r = 8;

  return (
    <div ref={containerRef} className="relative">
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
        >
          <defs>
            <linearGradient id="border-grad-habits-page" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-habits-page)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-habits-page)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <img
        src="/app-screenshots/client/habits/light.png"
        alt="Habits feature preview"
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src="/app-screenshots/client/habits/dark.png"
        alt="Habits feature preview"
        className="hidden w-full h-auto rounded-lg border dark:block"
      />
    </div>
  );
}

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

const unitOptions = [
  'steps', 'min', 'times', 'count', 'drink', 'cups', 'm', 'km', 'mile',
  'sec', 'hour', 'ml', 'l', 'oz', 'cal', 'g', 'mg',
] as const;

const HabitsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    habits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    duplicateHabit,
    isCreating,
    isUpdating,
    isDeleting,
    isDuplicating
  } = useCoachHabits();
  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveHabit,
  } = useCoachHabitFolders();
  const { clients } = useCoachClients();

  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const { user } = useUserProfile();
  const { hasAccess: hasHabitsMetricsAccess } = useFeatureAccess('habits_metrics');

  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('library');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [isEditHabitOpen, setIsEditHabitOpen] = useState<boolean>(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [habitsToAssign, setHabitsToAssign] = useState<Habit[]>([]);
  const [folderToAssign, setFolderToAssign] = useState<{ id: string; name: string } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);

  // Folder state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [habitToMove, setHabitToMove] = useState<Habit | null>(null);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState<boolean>(false);
  const [folderSearch, setFolderSearch] = useState<string>('');

  // Filter habits to show only unfiled ones
  const unfiledHabits = useMemo(() => {
    return habits.filter(h => !h.folderId);
  }, [habits]);

  // Get item counts for each folder
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    habits.forEach(h => {
      if (h.folderId) {
        counts[h.folderId] = (counts[h.folderId] || 0) + 1;
      }
    });
    return counts;
  }, [habits]);

  // Filter folders based on search (folder names and contents)
  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folders;
    const searchLower = folderSearch.toLowerCase();
    return folders.filter(f => {
      // Match folder name
      if (f.name.toLowerCase().includes(searchLower)) return true;
      // Match any habit inside the folder
      const folderHabits = habits.filter(h => h.folderId === f.id);
      return folderHabits.some(h => h.name.toLowerCase().includes(searchLower));
    });
  }, [folders, folderSearch, habits]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenAddHabit();
      window.history.replaceState({}, '', '/habits');
    }
  }, [searchParams]);

  const habitSchema = z.object({
    name: z.string().min(1, t('habits.form.nameRequired')).max(60, t('habits.form.nameMaxLength')),
    description: z.string().optional(),
    amount: z.number().int().min(1, t('habits.form.amountRequired')),
    unit: z.string().min(1, t('habits.form.unitRequired')),
    period: z.union([z.literal('daily'), z.literal('weekly')]),
    duration: z.number().int().positive().optional(),
    reminderTime: z.string().optional(),
    reminderMessage: z.string().optional(),
  });

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      amount: 0,
      unit: '',
      period: 'daily',
      duration: undefined,
      reminderTime: undefined,
      reminderMessage: undefined,
    },
  });

  const [enableDuration, setEnableDuration] = useState<boolean>(false);
  const [enableReminder, setEnableReminder] = useState<boolean>(false);

  const period = form.watch('period');
  const amount = form.watch('amount');
  const unit = form.watch('unit');
  const nameValue = form.watch('name');

  const textualRepresentation = useMemo(() => {
    if (!amount || amount === 0 || !unit) return '';
    const unitLabel = t(`habits.form.units.${unit as string}`);
    const periodText = period === 'daily' ? t('habits.form.textualRepresentationDaily') : t('habits.form.textualRepresentationWeekly');
    return t('habits.form.textualRepresentation', { amount, unit: unitLabel, period: periodText });
  }, [amount, unit, period, t]);

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

  const handleOpenEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id);
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
        await createHabit(values);
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
      const habit = habits.find(h => h.id === editingHabitId);
      await deleteHabit(editingHabitId);
      if (habit) {
        toast.success(t('general.deleteSuccessName', { name: habit.name }));
      }
      handleCloseEditHabit();
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error(t('general.deleteError'));
    }
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

  const handleToggleHabit = (habitId: string) => {
    setSelectedHabits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) newSet.delete(habitId);
      else newSet.add(habitId);
      return newSet;
    });
  };

  const handleClearSelected = () => setSelectedHabits(new Set());

  const handleDuplicateSelected = async () => {
    if (selectedHabits.size !== 1) return;
    const habitId = Array.from(selectedHabits)[0];
    try {
      await duplicateHabit(habitId);
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to duplicate habit:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedHabits);
      const deleteCount = idsToDelete.length;
      await Promise.all(idsToDelete.map((id) => deleteHabit(id)));
      toast.success(t('general.deleteSuccessCount', { count: deleteCount, item: deleteCount === 1 ? 'habit' : 'habits' }));
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to bulk delete habits:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!habitToDelete) return;
    try {
      const habit = habits.find(h => h.id === habitToDelete);
      await deleteHabit(habitToDelete);
      if (habit) {
        toast.success(t('general.deleteSuccessName', { name: habit.name }));
      }
      setHabitToDelete(null);
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleAssignToClients = () => {
    if (!hasHabitsMetricsAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    const selectedHabitItems = habits.filter((habit) => selectedHabits.has(habit.id));
    if (selectedHabitItems.length === 0) return;
    setHabitsToAssign(selectedHabitItems);
    setIsAssignToClientsOpen(true);
  };

  const handleRemoveHabitFromAssignList = (habitId: string) => {
    setHabitsToAssign((prev) => {
      const newList = prev.filter((habit) => habit.id !== habitId);
      if (newList.length === 0) setIsAssignToClientsOpen(false);
      return newList;
    });
  };

  const handleAssignHabitsToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || habitsToAssign.length === 0 || !user?.id) return;
    try {
      await assignHabitsToClients({ habitIds: habitsToAssign.map((h) => h.id), clientIds, coachId: user.id });
      setIsAssignToClientsOpen(false);
      setFolderToAssign(null);
      const habitCount = habitsToAssign.length;
      const clientCount = clientIds.length;
      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-habits', clientId] });
      });
      if (habitCount === 1 && clientCount === 1) {
        const habitName = habitsToAssign[0].name;
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('habits.assignSuccessSingle', { habitName, clientName }));
      } else if (habitCount === 1) {
        const habitName = habitsToAssign[0].name;
        toast.success(t('habits.assignSuccessHabitMultiClient', { habitName, count: clientCount }));
      } else if (clientCount === 1) {
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('habits.assignSuccessMultiHabitSingleClient', { count: habitCount, clientName }));
      } else {
        toast.success(`Successfully assigned ${habitCount} habits to ${clientCount} clients`);
      }
      setHabitsToAssign([]);
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to assign habits to clients:', error);
    }
  };

  // Folder handlers
  const handleCreateFolder = async (name: string) => {
    await createFolder({ name });
  };

  const handleUpdateFolder = async (name: string) => {
    if (!editingFolder) return;
    await updateFolder({ id: editingFolder.id, data: { name } });
    setEditingFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleMoveHabit = async (folderId: string | null) => {
    if (!habitToMove) return;
    await moveHabit({ habitId: habitToMove.id, folderId });
    setHabitToMove(null);
  };

  const handleBulkMove = async (folderId: string | null) => {
    const idsToMove = Array.from(selectedHabits);
    await Promise.all(idsToMove.map((id) => moveHabit({ habitId: id, folderId })));
    setSelectedHabits(new Set());
    setIsBulkMoveOpen(false);
  };

  const handleFolderClick = (folderId: string) => {
    router.push(`/habits/folder/${folderId}`);
  };

  const handleAssignFolder = async (folderId: string) => {
    if (!hasHabitsMetricsAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderHabits = habits.filter(h => h.folderId === folderId);
    if (folderHabits.length === 0) {
      toast.error('This folder is empty');
      return;
    }
    setFolderToAssign({ id: folder.id, name: folder.name });
    setHabitsToAssign(folderHabits);
    setIsAssignToClientsOpen(true);
  };

  const getAimText = (habit: Habit): string => {
    const unitLabel = t(`habits.form.units.${habit.unit as string}`);
    const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
    return `${habit.amount} ${unitLabel} / ${periodText}`;
  };

  const getDurationText = (habit: Habit): string => {
    if (!habit.duration) return '--';
    return `${habit.duration} ${t('habits.form.durationLabel')}`;
  };

  const getReminderText = (habit: Habit): string => {
    if (!habit.reminderTime) return '--';
    return habit.reminderTime;
  };

  const columns: ColumnDefinition<Habit>[] = [
    {
      id: 'name',
      label: t('habits.columns.name'),
      width: { class: 'w-[350px]', pixel: '350px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">{t('habits.columns.name')}</span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isSelected} onCheckedChange={() => handleToggleHabit(row.id)} />
          </div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'aim',
      label: 'Aim',
      icon: <Target className="size-3" />,
      sortable: false,
      width: { class: 'w-[300px]', pixel: '300px' },
      getSortValue: (row) => getAimText(row),
      getSearchValue: (row) => getAimText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Target className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Aim</span>
        </div>
      ),
      renderCell: (row) => <span className="text-sm text-foreground">{getAimText(row)}</span>,
    },
    {
      id: 'duration',
      label: 'Duration',
      icon: <Clock className="size-3" />,
      sortable: false,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.duration || 0,
      getSearchValue: (row) => getDurationText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Clock className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Duration</span>
        </div>
      ),
      renderCell: (row) => <span className="text-sm text-muted-foreground">{getDurationText(row)}</span>,
    },
    {
      id: 'reminder',
      label: 'Reminder',
      icon: <Bell className="size-3" />,
      sortable: false,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.reminderTime || '',
      getSearchValue: (row) => getReminderText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Bell className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Reminder</span>
        </div>
      ),
      renderCell: (row) => <span className="text-sm text-muted-foreground">{getReminderText(row)}</span>,
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {folders.length > 0 && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHabitToMove(row); }}>
                  <Move className="size-4 mr-2" />
                  <span>Move to folder</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHabitToDelete(row.id); }} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4 mr-2 text-destructive" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

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
          <FormItem>
            <FormLabel>{t('habits.form.description')}</FormLabel>
            <FormControl><Textarea placeholder={t('habits.form.descriptionPlaceholder')} rows={3} className="resize-none" {...field} /></FormControl>
          </FormItem>
        )} />
        <div className="space-y-4">
          <Label><span>{t('habits.form.amountUnitPeriod')}<RequiredAsterisk /></span></Label>
          <div className="flex items-center gap-2">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem className="w-[20%]">
                <FormControl>
                  <Input type="number" placeholder={t('habits.form.amount')} min="1" step="1" {...field}
                    onChange={(e) => { const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10); field.onChange(isNaN(value) ? 0 : value); }}
                    value={field.value === 0 ? '' : field.value}
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem className="w-[20%]">
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t('habits.form.unit')} /></SelectTrigger>
                    <SelectContent>{unitOptions.map((unit) => (<SelectItem key={unit} value={unit}>{t(`habits.form.units.${unit}`)}</SelectItem>))}</SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )} />
            <div className="text-muted-foreground px-2">/</div>
            <FormField control={form.control} name="period" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ToggleGroup type="single" value={field.value} onValueChange={(value) => { if (value) field.onChange(value as 'daily' | 'weekly'); }} variant="outline" spacing={0}>
                    <ToggleGroupItem value="daily">{t('habits.form.daily')}</ToggleGroupItem>
                    <ToggleGroupItem value="weekly">{t('habits.form.weekly')}</ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
              </FormItem>
            )} />
          </div>
          <div className="min-h-[20px]">{textualRepresentation && <p className="text-sm text-muted-foreground">{textualRepresentation}</p>}</div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={enableDuration} onCheckedChange={(checked) => { setEnableDuration(checked); form.setValue('duration', checked ? 30 : undefined); }} />
            <Label className="cursor-pointer">{t('habits.form.duration')}</Label>
          </div>
          {enableDuration && (
            <div className="flex gap-2">
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="number" placeholder="0" min="1" step="1" className="w-[100%]" {...field}
                      onChange={(e) => { const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10); field.onChange(value === undefined || isNaN(value) ? undefined : value); }}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )} />
              <Label className="text-sm text-muted-foreground">{t('habits.form.durationLabel')}</Label>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={enableReminder} onCheckedChange={(checked) => { setEnableReminder(checked); if (checked) { form.setValue('reminderTime', '07:00'); form.setValue('reminderMessage', ''); } else { form.setValue('reminderTime', undefined); form.setValue('reminderMessage', undefined); } }} />
            <Label className="cursor-pointer">{t('habits.form.reminder')}</Label>
          </div>
          {enableReminder && (
            <div className="flex gap-4">
              <FormField control={form.control} name="reminderTime" render={({ field }) => (
                <FormItem className="w-[20%]">
                  <FormLabel className="text-sm">{t('habits.form.reminderTime')}</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="reminderMessage" render={({ field }) => (
                <FormItem className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="text-sm">{t('habits.form.reminderMessage')}</FormLabel>
                    <Tooltip><TooltipTrigger asChild><Info className="size-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>This message will appear on the clients notification message</p></TooltipContent></Tooltip>
                  </div>
                  <FormControl><Input placeholder={t('habits.form.reminderMessagePlaceholder')} {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
          )}
        </div>
      </form>
    </Form>
  );

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('habits.title')}
        action={
          <ButtonGroup>
            <FolderSearchButton
              value={folderSearch}
              onChange={setFolderSearch}
            />
            <Button variant="ghost" onClick={() => setIsCreateFolderOpen(true)} className="gap-2 border border-primary">
              <FolderPlus className="size-4" />
              <span>Create Folder</span>
            </Button>
            <Button onClick={handleOpenAddHabit} className="gap-2">
              <Plus className="size-4" />
              <span>{t('habits.addHabit')}</span>
            </Button>
          </ButtonGroup>
        }
      />

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="px-4 pt-3 pb-1 overflow-x-auto flex-shrink-0">
          <div className="flex gap-3 min-h-[72px] items-center">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  name={folder.name}
                  itemCount={folderItemCounts[folder.id] || 0}
                  onClick={() => handleFolderClick(folder.id)}
                  onEdit={() => setEditingFolder({ id: folder.id, name: folder.name })}
                  onDelete={() => setFolderToDelete(folder.id)}
                  onAssign={() => handleAssignFolder(folder.id)}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No folders match your search</span>
            )}
          </div>
        </div>
      )}

      <DataGrid
        data={unfiledHabits}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="habits"
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
        emptyMessage={t('habits.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('habits.emptyState.title')}
            subtitle="Create daily habits to help your clients build consistency and track their progress over time"
            action={<Button onClick={handleOpenAddHabit} className="gap-2"><Plus className="size-4" /><span>{t('habits.addHabit')}</span></Button>}
          />
        }
        selectionActions={
          selectedHabits.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={handleClearSelected} className="gap-2"><X className="size-4" /><span>{t('general.clearSelected', { count: selectedHabits.size })}</span></Button>
              {selectedHabits.size === 1 && <Button variant="ghost" onClick={handleDuplicateSelected} className="gap-2" disabled={isDuplicating}>{isDuplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}<span>{t('habits.actions.duplicate')}</span></Button>}
              <Button variant="ghost" onClick={handleAssignToClients} className="gap-2"><UserPlus className="size-4" /><span>{t('habits.actions.addToClients')}</span></Button>
              {folders.length > 0 && <Button variant="ghost" onClick={() => setIsBulkMoveOpen(true)} className="gap-2"><Move className="size-4" /><span>Move</span></Button>}
              <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /><span>{t('general.delete')}</span></Button>
            </div>
          ) : undefined
        }
        onRowClick={(row, event) => { if (!(event.target as HTMLElement).closest('[data-no-row-link="true"]')) handleOpenEditHabit(row); }}
        onRowKeyDown={(row, event) => { if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).closest('[data-no-row-link="true"]')) { event.preventDefault(); handleOpenEditHabit(row); } }}
        rowHeight="54px"
      />

      <ConfirmDeleteDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen} onConfirm={handleBulkDelete} count={selectedHabits.size} itemType={t('habits.title').toLowerCase()} />
      <ConfirmDeleteDialog open={habitToDelete !== null} onOpenChange={(open) => !open && setHabitToDelete(null)} onConfirm={handleDeleteSingle} itemName={habits.find(h => h.id === habitToDelete)?.name} itemType="habit" />

      {/* Folder dialogs */}
      <CreateFolderDialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen} onSave={handleCreateFolder} title="Create Folder" />
      <CreateFolderDialog open={editingFolder !== null} onOpenChange={(open) => !open && setEditingFolder(null)} onSave={handleUpdateFolder} title="Edit Folder" initialName={editingFolder?.name || ''} isEdit={true} />
      <ConfirmDeleteDialog open={folderToDelete !== null} onOpenChange={(open) => !open && setFolderToDelete(null)} onConfirm={handleDeleteFolder} itemName={folders.find(f => f.id === folderToDelete)?.name} itemType="folder" />
      <MoveToFolderDialog open={habitToMove !== null} onOpenChange={(open) => !open && setHabitToMove(null)} folders={folders} currentFolderId={habitToMove?.folderId} onMove={handleMoveHabit} itemName={habitToMove?.name} />
      <MoveToFolderDialog open={isBulkMoveOpen} onOpenChange={setIsBulkMoveOpen} folders={folders} onMove={handleBulkMove} />

      {/* Add Habit Side Panel */}
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

      {/* Edit Habit Side Panel */}
      <SidePanel open={isEditHabitOpen} onOpenChange={(open) => { if (!open) handleCloseEditHabit(); }} title="Edit Habit" onOpenAutoFocus={(e) => e.preventDefault()} contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseEditHabit} disabled={isSaving}>{t('general.cancel')}</Button>
            <Button type="button" variant="outline" onClick={handleDeleteHabit} className="gap-2" disabled={isSaving}><Trash2 className="size-4" />{t('general.delete')}</Button>
            <Button type="button" onClick={form.handleSubmit(handleSaveHabit)} disabled={!form.formState.isValid || isSaving} className="gap-2">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('general.save')}</Button>
          </div>
        }
      >
        {renderManualForm()}
      </SidePanel>

      {/* Assign to Clients Side Panel */}
      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={(open) => {
          setIsAssignToClientsOpen(open);
          if (!open) setFolderToAssign(null);
        }}
        title={t('habits.assignToClientsTitle')}
        assignButtonLabel={(count) => count === 1 ? t('habits.assignToOneClient') : t('habits.assignToClientsCount', { count })}
        onAssign={handleAssignHabitsToClients}
        previewComponent={
          folderToAssign ? (
            <div className="border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Folder className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{folderToAssign.name}</span>
                  <p className="text-xs text-muted-foreground">{habitsToAssign.length} {habitsToAssign.length === 1 ? 'habit' : 'habits'}</p>
                </div>
              </div>
            </div>
          ) : habitsToAssign.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {habitsToAssign.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0"><span className="text-sm truncate">{habit.name}</span></div>
                  <button type="button" onClick={() => handleRemoveHabitFromAssignList(habit.id)} className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-muted-foreground py-4 text-center">{t('habits.noHabitsSelected')}</div>
        }
      />

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Assign habits to help your clients build consistency and track their progress over time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScreenshotPreview />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => router.push('/settings/billing')}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitsPage;
