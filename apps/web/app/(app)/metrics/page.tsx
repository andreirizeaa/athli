'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Trash2, X, UserPlus, Copy, FolderPlus, MoreHorizontal, Move, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { PageHeader } from '@/components/app/page-header';
import { AddMetricSidePanel } from '@/components/metrics/add-metric-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { UpgradeDialog } from '@/components/app/upgrade-dialog';
import { useCoachMetrics } from '@/hooks/use-coach-metrics';
import { useCoachMetricFolders } from '@/hooks/use-coach-metric-folders';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Metric } from '@/api/coach/coach-metric-service';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { assignMetricsToClients } from '@/api/client/client-metric-service';
import { useUserProfile } from '@/hooks/use-user-profile';
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
import { useTerminology } from '@/hooks/use-terminology';

const MetricsPage = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations();
  const terminology = useTerminology();
  const searchParams = useSearchParams();
  const {
    metrics,
    isLoading,
    createMetric,
    updateMetric,
    deleteMetric,
    duplicateMetric
  } = useCoachMetrics();
  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveMetric,
    isCreating: isCreatingFolder,
  } = useCoachMetricFolders();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();
  const { hasAccess: hasHabitsMetricsAccess } = useFeatureAccess('habits_metrics');

  const [isAddMetricOpen, setIsAddMetricOpen] = useState<boolean>(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState<boolean>(false);
  const [isEditMetricOpen, setIsEditMetricOpen] = useState<boolean>(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [metricsToAssign, setMetricsToAssign] = useState<Metric[]>([]);
  const [folderToAssign, setFolderToAssign] = useState<{ id: string; name: string } | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [metricToDelete, setMetricToDelete] = useState<string | null>(null);

  // Folder state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [metricToMove, setMetricToMove] = useState<Metric | null>(null);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState<boolean>(false);
  const [folderSearch, setFolderSearch] = useState<string>('');

  // Filter metrics to show only unfiled ones on the main page
  const unfiledMetrics = useMemo(() => {
    return metrics.filter(m => !m.folder_id);
  }, [metrics]);

  // Get item counts for each folder
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    metrics.forEach(m => {
      if (m.folder_id) {
        counts[m.folder_id] = (counts[m.folder_id] || 0) + 1;
      }
    });
    return counts;
  }, [metrics]);

  // Filter folders based on search (folder names and contents)
  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folders;
    const searchLower = folderSearch.toLowerCase();
    return folders.filter(f => {
      // Match folder name
      if (f.name.toLowerCase().includes(searchLower)) return true;
      // Match any metric inside the folder
      const folderMetrics = metrics.filter(m => m.folder_id === f.id);
      return folderMetrics.some(m => m.name.toLowerCase().includes(searchLower));
    });
  }, [folders, folderSearch, metrics]);

  // Auto-open add metric panel if ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenAddMetric();
      window.history.replaceState({}, '', '/metrics');
    }
  }, [searchParams]);

  const columns: ColumnDefinition<Metric>[] = [
    {
      id: 'name',
      label: t('metrics.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          </div>
          <span className="text-xs uppercase text-muted-foreground">
            {t('metrics.columns.name')}
          </span>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isSelected} onCheckedChange={() => {
              const newSet = new Set(selectedMetrics);
              if (newSet.has(row.id)) newSet.delete(row.id);
              else newSet.add(row.id);
              setSelectedMetrics(newSet);
            }} />
          </div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'unit',
      label: t('metrics.columns.unit'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => row.unit.toLowerCase(),
      getSearchValue: (row) => row.unit,
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.unit}</span>
      ),
    },
    {
      id: 'description',
      label: t('metrics.columns.description'),
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
      id: 'schedule',
      label: t('metrics.schedule.frequency.label'),
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
      id: 'actions',
      label: '',
      sortable: false,
      width: { class: 'w-[100px]', pixel: '100px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {folders.length > 0 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setMetricToMove(row);
                  }}
                >
                  <Move className="size-4 mr-2" />
                  <span>Move to folder</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setMetricToDelete(row.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2 text-destructive" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const formatScheduleText = (metric: Metric): string => {
    const schedule = metric.schedule_config;

    if (!schedule || !schedule.frequency) {
      return '--';
    }

    if (schedule.frequency === 'daily') {
      if (schedule.selectedDays && schedule.selectedDays.length === 7) {
        return t('metrics.schedule.frequency.daily');
      }
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayNames = schedule.selectedDays.map(day => t(`habits.form.${day}`)).join(', ');
        return t('metrics.schedule.frequency.daily') + ` (${dayNames})`;
      }
      return t('metrics.schedule.frequency.daily');
    } else if (schedule.frequency === 'weekly') {
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayName = t(`habits.form.${schedule.selectedDays[0]}`);
        return t('metrics.schedule.frequency.weekly') + ` (${dayName})`;
      }
      return t('metrics.schedule.frequency.weekly');
    } else if (schedule.frequency === 'biweekly') {
      if (schedule.selectedDays && schedule.selectedDays.length > 0) {
        const dayName = t(`habits.form.${schedule.selectedDays[0]}`);
        return t('metrics.schedule.frequency.biweekly') + ` (${dayName})`;
      }
      return t('metrics.schedule.frequency.biweekly');
    } else if (schedule.frequency === 'monthly') {
      if (schedule.monthlyOption === 'first') {
        return t('metrics.schedule.frequency.monthly') + ' (1st)';
      } else if (schedule.monthlyOption === 'last') {
        return t('metrics.schedule.frequency.monthly') + ' (Last)';
      } else if (schedule.monthlyOption === 'specific' && schedule.specificDay) {
        const suffix = schedule.specificDay === 1 ? 'st' : schedule.specificDay === 2 ? 'nd' : schedule.specificDay === 3 ? 'rd' : 'th';
        return t('metrics.schedule.frequency.monthly') + ` (${schedule.specificDay}${suffix})`;
      }
      return t('metrics.schedule.frequency.monthly');
    }

    return '--';
  };

  const handleOpenAddMetric = () => {
    setIsAddMetricOpen(true);
  };

  const handleCloseAddMetric = () => {
    setIsAddMetricOpen(false);
  };

  const handleOpenEditMetric = (metric: Metric) => {
    setEditingMetric(metric);
    setIsEditMetricOpen(true);
  };

  const handleCloseEditMetric = () => {
    setEditingMetric(null);
    setIsEditMetricOpen(false);
  };

  const handleSaveMetric = async (
    name: string,
    unit: string,
    description?: string,
    _existingMetricId?: string,
    scheduleConfig?: any,
    cronExpression?: string
  ) => {
    try {
      if (editingMetric) {
        await updateMetric({
          id: editingMetric.id,
          updates: {
            name,
            unit,
            description,
            schedule_config: scheduleConfig,
            cron_expression: cronExpression
          }
        });
        handleCloseEditMetric();
      } else {
        await createMetric({
          name,
          unit,
          description,
          value_kind: 'number',
          schedule_config: scheduleConfig,
          cron_expression: cronExpression
        });
        handleCloseAddMetric();
      }
    } catch (error) {
      console.error('Failed to save metric:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedMetrics);
      const deleteCount = idsToDelete.length;

      let singleItemName = '';
      if (deleteCount === 1) {
        const item = metrics.find(m => m.id === idsToDelete[0]);
        if (item) singleItemName = item.name;
      }

      await Promise.all(idsToDelete.map((id) => deleteMetric(id)));

      if (deleteCount === 1 && singleItemName) {
        toast.success(t('general.deleteSuccessName', { name: singleItemName }));
      } else {
        toast.success(t('general.deleteSuccessCount', { count: deleteCount, item: deleteCount === 1 ? 'metric' : 'metrics' }));
      }

      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to bulk delete metrics:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!metricToDelete) return;
    try {
      const metric = metrics.find(m => m.id === metricToDelete);
      await deleteMetric(metricToDelete);

      if (metric) {
        toast.success(t('general.deleteSuccessName', { name: metric.name }));
      } else {
        toast.success(t('general.deleteSuccess'));
      }

      setMetricToDelete(null);
    } catch (error) {
      console.error('Failed to delete metric:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleClearSelected = () => {
    setSelectedMetrics(new Set());
  };

  const handleDuplicateSelected = async () => {
    if (selectedMetrics.size !== 1) return;
    const metricId = Array.from(selectedMetrics)[0];
    try {
      await duplicateMetric(metricId);
      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to duplicate metric:', error);
    }
  };

  const handleAssignToClients = () => {
    if (!hasHabitsMetricsAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    const selectedMetricItems = metrics.filter((metric) => selectedMetrics.has(metric.id));
    if (selectedMetricItems.length === 0) {
      return;
    }

    setMetricsToAssign(selectedMetricItems);
    setIsAssignToClientsOpen(true);
    setSelectedClientIds(new Set());
  };

  const handleRemoveMetricFromAssignList = (metricId: string) => {
    setMetricsToAssign((prev) => {
      const newList = prev.filter((metric) => metric.id !== metricId);
      if (newList.length === 0) {
        setIsAssignToClientsOpen(false);
      }
      return newList;
    });
  };

  const handleAssignMetricsToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || metricsToAssign.length === 0 || !user?.id) {
      return;
    }

    try {
      await assignMetricsToClients({
        metricIds: metricsToAssign.map((m) => m.id),
        clientIds: clientIds,
        coachId: user.id
      });

      setIsAssignToClientsOpen(false);
      setFolderToAssign(null);
      const metricCount = metricsToAssign.length;
      const clientCount = clientIds.length;

      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-metrics', clientId] });
      });

      if (metricCount === 1 && clientCount === 1) {
        const metricName = metricsToAssign[0].name;
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('metrics.assignSuccessSingle', { metricName, clientName }));
      } else if (metricCount === 1) {
        const metricName = metricsToAssign[0].name;
        toast.success(t('metrics.assignSuccessMetricMultiClient', { metricName, count: clientCount }));
      } else if (clientCount === 1) {
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('metrics.assignSuccessMultiMetricSingleClient', { count: metricCount, clientName }));
      } else {
        toast.success(`Successfully assigned ${metricCount} metrics to ${clientCount} clients`);
      }

      setMetricsToAssign([]);
      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to assign metrics to clients:', error);
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

  const handleMoveMetric = async (folderId: string | null) => {
    if (!metricToMove) return;
    await moveMetric({ metricId: metricToMove.id, folderId });
    setMetricToMove(null);
  };

  const handleBulkMove = async (folderId: string | null) => {
    const idsToMove = Array.from(selectedMetrics);
    await Promise.all(idsToMove.map((id) => moveMetric({ metricId: id, folderId })));
    setSelectedMetrics(new Set());
    setIsBulkMoveOpen(false);
  };

  const handleFolderClick = (folderId: string) => {
    router.push(`/metrics/folder/${folderId}`);
  };

  const handleAssignFolder = async (folderId: string) => {
    if (!hasHabitsMetricsAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Get all metrics in this folder
    const folderMetrics = metrics.filter(m => m.folder_id === folderId);
    if (folderMetrics.length === 0) {
      toast.error('This folder is empty');
      return;
    }
    setFolderToAssign({ id: folder.id, name: folder.name });
    setMetricsToAssign(folderMetrics);
    setIsAssignToClientsOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('metrics.title')}
        action={
          <ButtonGroup>
            <FolderSearchButton
              value={folderSearch}
              onChange={setFolderSearch}
            />
            <Button
              variant="ghost"
              onClick={() => setIsCreateFolderOpen(true)}
              className="gap-2 border border-primary"
            >
              <FolderPlus className="size-4" />
              <span>Create Folder</span>
            </Button>
            <Button onClick={handleOpenAddMetric} className="gap-2">
              <Plus className="size-4" />
              <span>{t('metrics.addMetric')}</span>
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
        data={unfiledMetrics}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="metrics"
        searchPlaceholder={t('metrics.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name', 'unit', 'description']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedMetrics}
        onSelectionChange={setSelectedMetrics}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('metrics.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('metrics.emptyState.title')}
            subtitle="Define custom metrics to track and measure your clients' performance and progress"
            action={
              <Button onClick={handleOpenAddMetric} className="gap-2">
                <Plus className="size-4" />
                <span>{t('metrics.addMetric')}</span>
              </Button>
            }
          />
        }
        selectionActions={
          selectedMetrics.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
                aria-label={t('metrics.actions.clearSelected')}
              >
                <X className="size-4" />
                <span>
                  {t('general.clearSelected', { count: selectedMetrics.size })}
                </span>
              </Button>
              {selectedMetrics.size === 1 && (
                <Button
                  variant="ghost"
                  onClick={handleDuplicateSelected}
                  className="gap-2"
                  aria-label={t('metrics.actions.duplicateAria')}
                >
                  <Copy className="size-4" />
                  <span>{t('metrics.actions.duplicate')}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleAssignToClients}
                className="gap-2"
                aria-label={terminology.assignToPlural}
              >
                <UserPlus className="size-4" />
                <span>{terminology.assignToPlural}</span>
              </Button>
              {folders.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setIsBulkMoveOpen(true)}
                  className="gap-2"
                >
                  <Move className="size-4" />
                  <span>Move</span>
                </Button>
              )}
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
          handleOpenEditMetric(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleOpenEditMetric(row);
          }
        }}
      />

      <AddMetricSidePanel
        open={isAddMetricOpen}
        onOpenChange={setIsAddMetricOpen}
        onSave={handleSaveMetric}
        showLibraryTab={false}
      />

      {editingMetric && (
        <AddMetricSidePanel
          open={isEditMetricOpen}
          onOpenChange={setIsEditMetricOpen}
          metric={editingMetric as any}
          onSave={async (name, unit, description, _existingMetricId, scheduleConfig, cronExpression) => {
            await handleSaveMetric(name, unit, description, undefined, scheduleConfig, cronExpression);
          }}
          onDelete={async (metricId) => {
            await deleteMetric(metricId);
            handleCloseEditMetric();
          }}
          allowSchedule={true}
        />
      )}

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedMetrics.size}
        itemType={t('metrics.title').toLowerCase()}
      />

      <ConfirmDeleteDialog
        open={metricToDelete !== null}
        onOpenChange={(open) => !open && setMetricToDelete(null)}
        onConfirm={handleDeleteSingle}
        itemName={metrics.find(m => m.id === metricToDelete)?.name}
        itemType="metric"
      />

      {/* Folder dialogs */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onSave={handleCreateFolder}
        title="Create Folder"
      />

      <CreateFolderDialog
        open={editingFolder !== null}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        onSave={handleUpdateFolder}
        title="Edit Folder"
        initialName={editingFolder?.name || ''}
        isEdit={true}
      />

      <ConfirmDeleteDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        onConfirm={handleDeleteFolder}
        itemName={folders.find(f => f.id === folderToDelete)?.name}
        itemType="folder"
      />

      <MoveToFolderDialog
        open={metricToMove !== null}
        onOpenChange={(open) => !open && setMetricToMove(null)}
        folders={folders}
        currentFolderId={metricToMove?.folder_id}
        onMove={handleMoveMetric}
        itemName={metricToMove?.name}
      />

      <MoveToFolderDialog
        open={isBulkMoveOpen}
        onOpenChange={setIsBulkMoveOpen}
        folders={folders}
        onMove={handleBulkMove}
      />

      {/* Assign to Clients Side Panel */}
      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={(open) => {
          setIsAssignToClientsOpen(open);
          if (!open) setFolderToAssign(null);
        }}
        title={`Assign metrics to ${terminology.pluralLower}`}
        assignButtonLabel={(count) => terminology.assignToCountLabel(count)}
        onAssign={handleAssignMetricsToClients}
        previewComponent={
          folderToAssign ? (
            <div className="border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Folder className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{folderToAssign.name}</span>
                  <p className="text-xs text-muted-foreground">{metricsToAssign.length} {metricsToAssign.length === 1 ? 'metric' : 'metrics'}</p>
                </div>
              </div>
            </div>
          ) : metricsToAssign.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {metricsToAssign.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{metric.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMetricFromAssignList(metric.id)}
                    className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${metric.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t('metrics.noMetricsSelected')}
            </div>
          )
        }
      />

      <UpgradeDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        description="Assign metrics to track and measure your clients' performance and progress over time."
        screenshot={{
          light: '/app-screenshots/client/metrics/light.png',
          dark: '/app-screenshots/client/metrics/dark.png',
          alt: 'Metrics feature preview',
        }}
      />
    </div>
  );
};

export default MetricsPage;
