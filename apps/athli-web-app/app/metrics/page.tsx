'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Trash2, X, UserPlus, Copy, Loader2 } from 'lucide-react';
import { Button as UIButton } from '@/components/ui/button';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { PageHeader } from '@/components/app/page-header';
import { SidePanel } from '@/components/app/side-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AddMetricSidePanel } from '@/components/metrics/add-metric-side-panel';
import { EditMetricSidePanel } from '@/components/metrics/edit-metric-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useCoachMetrics } from '@/hooks/use-coach-metrics';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Metric } from '@/api/coach/coach-metric-service';
import { cn } from '@/lib/general/utils';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { assignMetricsToClients } from '@/api/client/client-metric-service';
import { useUserProfile } from '@/hooks/use-user-profile';

/* Metric type is imported from service */

const MetricsPage = () => {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const {
    metrics,
    isLoading,
    createMetric,
    updateMetric,
    deleteMetric,
    duplicateMetric
  } = useCoachMetrics();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();

  const [isAddMetricOpen, setIsAddMetricOpen] = useState<boolean>(false);
  const [isEditMetricOpen, setIsEditMetricOpen] = useState<boolean>(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [metricsToAssign, setMetricsToAssign] = useState<Metric[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [metricToDelete, setMetricToDelete] = useState<string | null>(null);



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
          {row.description || '-'}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setMetricToDelete(row.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t('metrics.actions.deleteAria', { name: row.name })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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

  const handleSaveMetric = async (name: string, unit: string, description?: string) => {
    try {
      if (editingMetric) {
        // Update existing metric
        await updateMetric({
          id: editingMetric.id,
          updates: { name, unit, description }
        });
        handleCloseEditMetric();
      } else {
        // Add new metric
        await createMetric({
          name,
          unit,
          description,
          value_kind: 'number' // Default
        });
        handleCloseAddMetric();
      }
    } catch (error) {
      console.error('Failed to save metric:', error);
    }
  };

  const handleDeleteMetric = async (metricId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setMetricToDelete(metricId);
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

  const handleDeleteKeyDown = (metricId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteMetric(metricId, e);
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
      const metricCount = metricsToAssign.length;
      const clientCount = clientIds.length;

      // Remove queries to force hard refresh and loading state
      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-metrics', clientId] });
      });


      // Determine toast message
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

      // Clear selection
      setMetricsToAssign([]);
      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to assign metrics to clients:', error);
    }
  };

  const handleCloseAssignToClients = () => {
    setIsAssignToClientsOpen(false);
    setMetricsToAssign([]);
    setSelectedClientIds(new Set());
  };





  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('metrics.title')}
        action={
          <Button onClick={handleOpenAddMetric} className="gap-2">
            <Plus className="size-4" />
            <span>{t('metrics.addMetric')}</span>
          </Button>
        }
      />

      <DataGrid
        data={metrics}
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
                aria-label={t('metrics.actions.assignToClients')}
              >
                <UserPlus className="size-4" />
                <span>{t('metrics.actions.assignToClients')}</span>
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
        onSave={async (name, unit, description) => await handleSaveMetric(name, unit, description)}
        showLibraryTab={false}
      />

      {editingMetric && (
        <EditMetricSidePanel
          open={isEditMetricOpen}
          onOpenChange={setIsEditMetricOpen}
          metric={editingMetric as any /* temporary cast if there are slight mismatches in expected props */}
          onSave={handleSaveMetric}
          onDelete={async (metricId) => {
            await deleteMetric(metricId);
            handleCloseEditMetric();
          }}
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

      {/* Assign to Clients Side Panel */}
      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('metrics.assignToClientsTitle')}
        assignButtonLabel={(count) =>
          count === 1
            ? t('metrics.assignToOneClient')
            : t('metrics.assignToClientsCount', { count })
        }
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

export default MetricsPage;
