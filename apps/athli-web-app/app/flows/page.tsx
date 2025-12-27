'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/general/utils';
import { AddFlowSidePanel } from '@/components/flows/add-flow-side-panel';
import { type Flow } from '@/api/coach/coach-flow-service';
import { useCoachFlows } from '@/hooks/use-coach-flows';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyGridState } from '@/components/app/empty-grid-state';


const FlowsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { flows, isLoading, duplicateFlow: duplicateFlowMutation } = useCoachFlows();
  const [isAddFlowOpen, setIsAddFlowOpen] = useState<boolean>(false);
  const [selectedFlows, setSelectedFlows] = useState<Set<string>>(new Set());

  // Data is now fetched and cached by useCoachFlows hook

  const columns: ColumnDefinition<Flow>[] = [
    {
      id: 'name',
      label: t('flows.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
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
      id: 'stepCount',
      label: t('flows.columns.stepCount'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => (row.flow_data?.nodes?.length || 0),
      getSearchValue: (row) => (row.flow_data?.nodes?.length || 0).toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.flow_data?.nodes?.length || 0}</span>
      ),
    },
  ];

  const handleClearSelected = () => {
    setSelectedFlows(new Set());
  };

  const handleDuplicateSelected = async () => {
    if (selectedFlows.size !== 1) return;
    const flowId = Array.from(selectedFlows)[0];
    try {
      await duplicateFlowMutation(flowId);
      setSelectedFlows(new Set());
      // Cache is automatically updated by the mutation
    } catch (error) {
      console.error('Failed to duplicate flow:', error);
    }
  };

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
                {t('flows.columns.name')}
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
    return (row: Flow, isSelected: boolean) => {
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

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('flows.title')}</h1>
          <Button className="gap-2" onClick={() => setIsAddFlowOpen(true)}>
            <Plus className="size-4" />
            <span>{t('flows.addFlow')}</span>
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
            data={flows}
            columns={columns}
            getRowId={(row) => row.id}
            gridKey="flows"
            searchPlaceholder={t('flows.searchPlaceholder')}
            enableSearch={true}
            searchFields={['name', 'description']}
            enableEditColumns={false}
            enableExport={false}
            enableRowSelection={true}
            selectedRowIds={selectedFlows}
            onSelectionChange={setSelectedFlows}
            firstColumnId="name"
            stickyFirstColumn={true}
            firstColumnWidth="350px"
            hideFirstColumnBorder={false}
            renderFirstColumn={createRenderFirstColumn((id) => {
              const newSet = new Set(selectedFlows);
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
              setSelectedFlows(newSet);
            })}
            renderFirstColumnHeader={renderFirstColumnHeader}
            showPagination={true}
            gridPadding={true}
            compactPagination={true}
            emptyMessage={t('flows.emptyMessage')}
            emptyState={
              <EmptyGridState
                title="No flows yet"
                subtitle="Create your first automation flow to streamline your coaching workflow"
                action={
                  <Button onClick={() => setIsAddFlowOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    <span>{t('flows.addFlow')}</span>
                  </Button>
                }
              />
            }
            selectionActions={
              selectedFlows.size > 0 ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={handleClearSelected}
                    className="gap-2"
                    aria-label={t('flows.actions.clearSelected')}
                  >
                    <X className="size-4" />
                    <span>
                      {t('flows.actions.clearSelected')} {selectedFlows.size}
                    </span>
                  </Button>
                  {selectedFlows.size === 1 && (
                    <Button
                      variant="ghost"
                      onClick={handleDuplicateSelected}
                      className="gap-2"
                      aria-label={t('flows.actions.duplicateAria')}
                    >
                      <Copy className="size-4" />
                      <span>{t('flows.actions.duplicate')}</span>
                    </Button>
                  )}
                </div>
              ) : undefined
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

      <AddFlowSidePanel
        open={isAddFlowOpen}
        onOpenChange={setIsAddFlowOpen}
      />
    </div>
  );
};

export default FlowsPage;
