'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Trash2, X, UserPlus, Copy, Loader2 } from 'lucide-react';
import { Button as UIButton } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { PageHeader } from '@/components/app/page-header';
import { SidePanel } from '@/components/app/side-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AddMetricSidePanel } from '@/components/metrics/add-metric-side-panel';
import { EditMetricSidePanel } from '@/components/metrics/edit-metric-side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useCoachMetrics } from '@/hooks/use-coach-metrics';
import { Metric } from '@/api/coach/coach-metric-service';
import { mockAthletes } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';

/* Metric type is imported from service */

const MetricsPage = () => {
  const t = useTranslations();
  const {
    metrics,
    isLoading,
    createMetric,
    updateMetric,
    deleteMetric,
    duplicateMetric
  } = useCoachMetrics();

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
      await Promise.all(idsToDelete.map((id) => deleteMetric(id)));
      setSelectedMetrics(new Set());
    } catch (error) {
      console.error('Failed to bulk delete metrics:', error);
    }
  };

  const handleDeleteSingle = async () => {
    if (!metricToDelete) return;
    try {
      await deleteMetric(metricToDelete);
      setMetricToDelete(null);
    } catch (error) {
      console.error('Failed to delete metric:', error);
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

  const handleAssignMetricsToClients = async () => {
    if (selectedClientIds.size === 0 || metricsToAssign.length === 0) {
      return;
    }

    try {
      // TODO: Call service to assign metrics to clients
      // await assignMetricsToClients({
      //   metricIds: metricsToAssign.map((m) => m.id),
      //   clientIds: Array.from(selectedClientIds),
      // });

      setIsAssignToClientsOpen(false);
      setMetricsToAssign([]);
      setSelectedMetrics(new Set());
      setSelectedClientIds(new Set());
    } catch (error) {
      console.error('Failed to assign metrics to clients:', error);
    }
  };

  const handleCloseAssignToClients = () => {
    setIsAssignToClientsOpen(false);
    setMetricsToAssign([]);
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
      <SidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('metrics.assignToClientsTitle')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleAssignMetricsToClients}
              disabled={selectedClientIds.size === 0 || metricsToAssign.length === 0}
            >
              {selectedClientIds.size === 1
                ? t('metrics.assignToOneClient')
                : t('metrics.assignToClientsCount', { count: selectedClientIds.size })}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAssignToClients}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Metrics to be assigned */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-sm font-medium">{t('metrics.metricsToAssign')}</label>
            {metricsToAssign.length > 0 ? (
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
                    renderHeader: ({ isAllSelected, onToggleAll }) => (
                      <div className="flex items-center gap-3 h-full w-full">
                        <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                        <div className="flex items-center gap-2">
                          <UserPlus className="size-3 text-muted-foreground" />
                          <span className="text-xs uppercase text-muted-foreground">{t('athletes.title')}</span>
                        </div>
                      </div>
                    ),
                    renderCell: (row, isSelected) => {
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
                    },
                  },
                ]}
                getRowId={(row) => row.id}
                gridKey="assign-metrics-to-clients"
                searchPlaceholder={t('metrics.searchAthletes')}
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

                emptyMessage={t('metrics.noAthletesFound')}
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

export default MetricsPage;
