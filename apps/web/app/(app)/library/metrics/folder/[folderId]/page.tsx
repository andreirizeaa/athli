'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useTerminology } from '@/hooks/use-terminology';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  FileText,
  Trash2,
  X,
  UserPlus,
  Copy,
  Edit,
  MoreHorizontal,
  Move,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { AddMetricSidePanel } from '@/components/metrics/add-metric-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useCoachMetrics } from '@/hooks/use-coach-metrics';
import { useCoachMetricFolders } from '@/hooks/use-coach-metric-folders';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Metric } from '@/api/coach/coach-metric-service';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { assignMetricsToClients } from '@/api/client/client-metric-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { CreateFolderDialog } from '@/components/app/create-folder-dialog';
import { MoveToFolderDialog } from '@/components/app/move-to-folder-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const MetricFolderPage = () => {
  const params = useParams();
  const folderId = params.folderId as string;
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations();
  const terminology = useTerminology();

  const {
    metrics,
    isLoading,
    createMetric,
    updateMetric,
    deleteMetric,
    duplicateMetric,
  } = useCoachMetrics();
  const {
    folders,
    updateFolder,
    deleteFolder,
    moveMetric,
  } = useCoachMetricFolders();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();

  // Get current folder
  const currentFolder = useMemo(() => {
    return folders.find(f => f.id === folderId);
  }, [folders, folderId]);

  // Get metrics in this folder
  const folderMetrics = useMemo(() => {
    return metrics.filter(m => m.folder_id === folderId);
  }, [metrics, folderId]);

  const [isAddMetricOpen, setIsAddMetricOpen] = useState<boolean>(false);
  const [isEditMetricOpen, setIsEditMetricOpen] = useState<boolean>(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [metricsToAssign, setMetricsToAssign] = useState<Metric[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [metricToDelete, setMetricToDelete] = useState<string | null>(null);

  // Folder state
  const [isEditFolderOpen, setIsEditFolderOpen] = useState<boolean>(false);
  const [isFolderDeleteOpen, setIsFolderDeleteOpen] = useState<boolean>(false);
  const [metricToMove, setMetricToMove] = useState<Metric | null>(null);

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
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {
                const newSet = new Set(selectedMetrics);
                if (newSet.has(row.id)) newSet.delete(row.id);
                else newSet.add(row.id);
                setSelectedMetrics(newSet);
              }}
            />
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setMetricToMove(row);
                }}
              >
                <Move className="size-4 mr-2" />
                <span>{t('common.move')}</span>
              </DropdownMenuItem>
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
            cron_expression: cronExpression,
          },
        });
        handleCloseEditMetric();
      } else {
        // Create new metric and move to this folder
        const newMetric = await createMetric({
          name,
          unit,
          description,
          value_kind: 'number',
          schedule_config: scheduleConfig,
          cron_expression: cronExpression,
        });
        // Move the newly created metric to this folder (silent to avoid double toast)
        await moveMetric({ metricId: newMetric.id, folderId, silent: true });
        toast.success(t('toasts.metricAdded'));
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

      await Promise.all(idsToDelete.map((id) => deleteMetric(id)));

      toast.success(
        t('general.deleteSuccessCount', {
          count: deleteCount,
          item: deleteCount === 1 ? 'metric' : 'metrics',
        })
      );

      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to bulk delete metrics:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!metricToDelete) return;
    try {
      const metric = metrics.find((m) => m.id === metricToDelete);
      await deleteMetric(metricToDelete);

      if (metric) {
        toast.success(t('general.deleteSuccessName', { name: metric.name }));
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
    const selectedMetricItems = folderMetrics.filter((metric) =>
      selectedMetrics.has(metric.id)
    );
    if (selectedMetricItems.length === 0) return;

    setMetricsToAssign(selectedMetricItems);
    setIsAssignToClientsOpen(true);
  };

  const handleAssignFolderToClients = () => {
    if (folderMetrics.length === 0) {
      toast.error(t('toasts.folderEmpty'));
      return;
    }
    setMetricsToAssign(folderMetrics);
    setIsAssignToClientsOpen(true);
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
        coachId: user.id,
      });

      setIsAssignToClientsOpen(false);
      const metricCount = metricsToAssign.length;
      const clientCount = clientIds.length;

      clientIds.forEach((clientId) => {
        queryClient.removeQueries({ queryKey: ['client-metrics', clientId] });
      });

      if (metricCount === 1 && clientCount === 1) {
        const metricName = metricsToAssign[0].name;
        const clientName =
          clients.find((c) => c.id === clientIds[0])?.name || 'Client';
        toast.success(
          t('metrics.assignSuccessSingle', { metricName, clientName })
        );
      } else if (metricCount === 1) {
        const metricName = metricsToAssign[0].name;
        toast.success(
          t('metrics.assignSuccessMetricMultiClient', {
            metricName,
            count: clientCount,
          })
        );
      } else if (clientCount === 1) {
        const clientName =
          clients.find((c) => c.id === clientIds[0])?.name || 'Client';
        toast.success(
          t('metrics.assignSuccessMultiMetricSingleClient', {
            count: metricCount,
            clientName,
          })
        );
      } else {
        toast.success(
          `Successfully assigned ${metricCount} metrics to ${clientCount} clients`
        );
      }

      setMetricsToAssign([]);
      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to assign metrics to clients:', error);
    }
  };

  // Folder handlers
  const handleUpdateFolder = async (name: string) => {
    if (!currentFolder) return;
    await updateFolder({ id: currentFolder.id, data: { name } });
    setIsEditFolderOpen(false);
  };

  const handleDeleteFolder = async () => {
    if (!currentFolder) return;
    try {
      await deleteFolder(currentFolder.id);
      router.push('/library/metrics');
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleMoveMetric = async (targetFolderId: string | null) => {
    if (!metricToMove) return;
    await moveMetric({ metricId: metricToMove.id, folderId: targetFolderId });
    setMetricToMove(null);
  };

  // If folder not found, redirect
  if (!currentFolder && !isLoading) {
    router.push('/library/metrics');
    return null;
  }

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
                    onClick={() => router.push('/library/metrics')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('metrics.title')}
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
            <Button
              variant="ghost"
              onClick={() => setIsEditFolderOpen(true)}
              className="gap-2 border border-primary"
            >
              <Edit className="size-4" />
              <span>{t('common.editFolder')}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleAssignFolderToClients}
              className="gap-2 border border-primary"
            >
              <UserPlus className="size-4" />
              <span>{t('common.assignFolder')}</span>
            </Button>
            <Button onClick={handleOpenAddMetric} className="gap-2">
              <Plus className="size-4" />
              <span>{t('metrics.addMetric')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <div className="border-b" />
      </div>

      <DataGrid
        data={folderMetrics}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`metrics-folder-${folderId}`}
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
        emptyMessage="No metrics in this folder"
        emptyState={
          <EmptyGridState
            title="No metrics in this folder"
            subtitle={t('common.addMetricsToFolder')}
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
                >
                  <Copy className="size-4" />
                  <span>{t('metrics.actions.duplicate')}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleAssignToClients}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                <span>{terminology.assignToPlural}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
          onSave={async (
            name,
            unit,
            description,
            _existingMetricId,
            scheduleConfig,
            cronExpression
          ) => {
            await handleSaveMetric(
              name,
              unit,
              description,
              undefined,
              scheduleConfig,
              cronExpression
            );
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
        itemName={metrics.find((m) => m.id === metricToDelete)?.name}
        itemType="metric"
      />

      {/* Folder dialogs */}
      <CreateFolderDialog
        open={isEditFolderOpen}
        onOpenChange={setIsEditFolderOpen}
        onSave={handleUpdateFolder}
        title="Edit Folder"
        initialName={currentFolder?.name || ''}
        isEdit={true}
      />

      <ConfirmDeleteDialog
        open={isFolderDeleteOpen}
        onOpenChange={setIsFolderDeleteOpen}
        onConfirm={handleDeleteFolder}
        itemName={currentFolder?.name}
        itemType="folder"
      />

      <MoveToFolderDialog
        open={metricToMove !== null}
        onOpenChange={(open) => !open && setMetricToMove(null)}
        folders={folders}
        currentFolderId={folderId}
        onMove={handleMoveMetric}
        itemName={metricToMove?.name}
      />

      {/* Assign to Clients Side Panel */}
      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={`Assign metrics to ${terminology.pluralLower}`}
        assignButtonLabel={(count) => terminology.assignToCountLabel(count)}
        onAssign={handleAssignMetricsToClients}
        previewComponent={
          metricsToAssign.length > 0 ? (
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
    </div>
  );
};

export default MetricFolderPage;
