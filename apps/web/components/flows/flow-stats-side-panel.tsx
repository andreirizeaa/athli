'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidePanel } from '@/components/app/side-panel';
import { DataGrid } from '@/components/app/data-grid';
import { getFlowStats, type FlowClientStat } from '@/api/coach/coach-flow-service';
import { useTerminology } from '@/hooks/use-terminology';

type FlowStatsSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  flowName: string;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const FlowStatsSidePanel = ({ open, onOpenChange, flowId, flowName }: FlowStatsSidePanelProps) => {
  const router = useRouter();
  const [stats, setStats] = useState<FlowClientStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminology = useTerminology();

  useEffect(() => {
    if (!open) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await getFlowStats(flowId);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch flow stats:', error);
        setStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [open, flowId]);

  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title={`${flowName} Stats`}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No executions yet</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 [&_thead_th]:border-t-0">
          <DataGrid
            data={stats}
            columns={[
              {
                id: 'name',
                label: terminology.singular,
                width: { class: 'w-[215px]', pixel: '215px' },
                getSortValue: (row) => row.name.toLowerCase(),
                getSearchValue: (row) => row.name,
                renderCell: (row) => {
                  const initials = getInitials(row.name);
                  return (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={row.avatarUrl} alt={row.name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{row.name}</span>
                    </div>
                  );
                },
              },
              {
                id: 'executionCount',
                label: 'Executions',
                width: { class: 'w-[100px]', pixel: '100px' },
                getSortValue: (row) => row.executionCount,
                renderCell: (row) => (
                  <span className="text-sm">{row.executionCount}</span>
                ),
              },
              {
                id: 'actions',
                label: '',
                width: { class: 'w-[50px]', pixel: '50px' },
                renderCell: (row) => (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            onOpenChange(false);
                            router.push(`/athletes/${row.id}/overview`);
                          }}
                        >
                          <ExternalLink className="size-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ),
              },
            ]}
            getRowId={(row) => row.id}
            gridKey="flow-stats"
            enableSearch={true}
            compactMode={true}
            showPagination={false}
            rowHeight="54px"
            gridPadding={false}
          />
        </div>
      )}
    </SidePanel>
  );
};
