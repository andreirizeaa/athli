'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { cn } from '@/lib/utils';
import { AddFlowSidePanel } from '@/components/flows/add-flow-side-panel';

type Flow = {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  createdAt: number;
};

// Mock flows data
const mockFlows: Flow[] = [
  {
    id: 'flow-1',
    name: 'New Client Onboarding',
    description: 'Comprehensive onboarding flow for new clients',
    stepCount: 5,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'flow-2',
    name: 'Athlete Welcome',
    description: 'Welcome and introduction flow for new athletes',
    stepCount: 3,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const FlowsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>(mockFlows);
  const [isAddFlowOpen, setIsAddFlowOpen] = useState<boolean>(false);

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
      getSortValue: (row) => row.stepCount,
      getSearchValue: (row) => row.stepCount.toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.stepCount}</span>
      ),
    },
  ];

  const renderFirstColumnHeader = ({
    isSorted,
    isAscending,
    isDescending,
    onSort,
  }: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
  }) => {
    return (
      <div className="flex items-center gap-2 h-full w-full">
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

  const renderFirstColumn = (row: Flow) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <span className="text-sm font-medium truncate">{row.name}</span>
      </div>
    );
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
        enableRowSelection={false}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('flows.emptyMessage')}
        onRowClick={(row) => {
          router.push(`/flows/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            router.push(`/flows/${row.id}`);
          }
        }}
      />

      <AddFlowSidePanel
        open={isAddFlowOpen}
        onOpenChange={setIsAddFlowOpen}
      />
    </div>
  );
};

export default FlowsPage;
