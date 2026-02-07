'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Power, Plus, Hash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { cn } from '@/lib/general/utils';
import { type Flow, updateFlowStatus } from '@/api/coach/coach-flow-service';
import { useCoachFlows } from '@/hooks/use-coach-flows';
import { Loader2 } from 'lucide-react';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ConfirmPublishDialog } from '@/components/app/confirm-publish-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Define the fixed order for flows - outside component to avoid recreation
const FLOW_ORDER = [
  'Missed Check-in',
  'Check-in Completed',
  'Missed Workout',
  'Workout Finished'
];

const countActionNodes = (flowData?: { nodes?: any[]; edges?: any[] }) =>
  flowData?.nodes?.filter((n: any) => n.type === 'action').length || 0;

const FlowsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { flows, isLoading, refetch } = useCoachFlows();

  // Data is now fetched and cached by useCoachFlows hook

  const [optimisticFlows, setOptimisticFlows] = useState<Flow[]>([]);
  const [publishDialogFlow, setPublishDialogFlow] = useState<{ flow: Flow; checked: boolean } | null>(null);

  // Update optimistic state when flows data changes, maintaining fixed order
  useEffect(() => {
    if (!flows || flows.length === 0) {
      // Only update if we currently have flows
      setOptimisticFlows((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const sortedFlows = [...flows].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';

      const indexA = FLOW_ORDER.indexOf(nameA);
      const indexB = FLOW_ORDER.indexOf(nameB);

      // If both flows are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Otherwise, maintain alphabetical order for any additional flows
      return nameA.localeCompare(nameB);
    });

    // Only update if the sorted flows are actually different
    setOptimisticFlows((prev) => {
      if (prev.length !== sortedFlows.length) return sortedFlows;

      // Check if flows have actually changed
      const hasChanged = sortedFlows.some((flow, index) =>
        flow.id !== prev[index]?.id ||
        flow.is_active !== prev[index]?.is_active ||
        flow.name !== prev[index]?.name
      );

      return hasChanged ? sortedFlows : prev;
    });
  }, [flows]);

  const handleToggleActive = async (flow: Flow, checked: boolean) => {
    // Store previous state for rollback
    const previousState = optimisticFlows;

    // Optimistically update the UI without refetching
    setOptimisticFlows(prev =>
      prev.map(f => f.id === flow.id ? { ...f, is_active: checked } : f)
    );

    try {
      await updateFlowStatus(flow.id, checked);
      toast.success(checked ? `${flow.name} published` : `${flow.name} unpublished`);
    } catch (error) {
      console.error('Failed to update flow status:', error);
      toast.error(`Failed to update ${flow.name} status`);
      // Revert optimistic update on error using previous state
      setOptimisticFlows(previousState);
    }
  };

  const columns: ColumnDefinition<Flow>[] = [
    {
      id: 'name',
      label: 'Trigger',
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => (row.name || '').toLowerCase(),
      getSearchValue: (row) => row.name || '',
      renderCell: (row) => (
        <span className="text-sm font-medium truncate">{row.name}</span>
      ),
    },
    {
      id: 'description',
      label: t('flows.columns.description'),
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
      id: 'steps',
      label: t('flows.columns.stepCount'),
      icon: <Hash className="size-3" />,
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => countActionNodes(row.flow_data),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{countActionNodes(row.flow_data)}</span>
      ),
    },
    {
      id: 'is_active',
      label: 'Published',
      icon: <Power className="size-3" />,
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => (row.is_active ? 1 : 0),
      renderHeader: ({ isSorted, isAscending }) => (
        <div className="flex items-center justify-end w-full pr-4 gap-2">
          <Power className="size-3" />
          <span className="text-xs font-medium">Published</span>
          {isSorted && (
            <span className="ml-1">
              {isAscending ? (
                <ArrowUpNarrowWide className="size-3" />
              ) : (
                <ArrowDownWideNarrow className="size-3" />
              )}
            </span>
          )}
        </div>
      ),
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full pr-4" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={!!row.is_active}
                    onCheckedChange={(checked) => setPublishDialogFlow({ flow: row, checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.is_active ? 'Unpublish flow' : 'Publish flow'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('flows.title')}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/features')}
          >
            <Plus className="size-4" />
            Request a new flow
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <div className="flex-1 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataGrid
            data={optimisticFlows}
            columns={columns}
            getRowId={(row) => row.id}
            gridKey="flows"
            searchPlaceholder={t('flows.searchPlaceholder')}
            enableSearch={true}
            searchFields={['name', 'description']}
            enableEditColumns={false}
            enableExport={false}
            enableRowSelection={false}
            showPagination={false}
            gridPadding={true}
            compactPagination={true}
            emptyMessage={t('flows.emptyMessage')}
            emptyState={
              <EmptyGridState
                title="No flows found"
                subtitle="The default system flows seem to be missing."
              />
            }
            onRowClick={(row, event) => {
              const targetElement = event.target as HTMLElement;
              if (targetElement.closest('[data-no-row-link="true"]')) {
                return;
              }
              router.push(`/flows/${row.id}`);
            }}
            onRowKeyDown={(row, event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                const targetElement = event.target as HTMLElement;
                if (targetElement.closest('[data-no-row-link="true"]')) {
                  return;
                }
                event.preventDefault();
                router.push(`/flows/${row.id}`);
              }
            }}
          />
        )}
      </div>

      <ConfirmPublishDialog
        open={!!publishDialogFlow}
        onOpenChange={(open) => { if (!open) setPublishDialogFlow(null); }}
        onConfirm={async () => {
          if (publishDialogFlow) {
            await handleToggleActive(publishDialogFlow.flow, publishDialogFlow.checked);
            setPublishDialogFlow(null);
          }
        }}
        isPublishing={!!publishDialogFlow?.checked}
        itemName={publishDialogFlow?.flow.name}
      />
    </div>
  );
};

export default FlowsPage;
