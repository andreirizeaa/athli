'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { SidePanel } from '@/components/app/side-panel';
import { Spinner } from '@/components/ui/spinner';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Athlete } from '@/api/coach/coach-client-service';
import { cn } from '@/lib/general/utils';

interface SelectClientSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
}

/**
 * Simple client selection panel for general navigation to training calendar
 * Does not pass any item data - just navigates to the client's training calendar
 */
export const SelectClientSidePanel = ({
    open,
    onOpenChange,
    title = 'Select Client',
}: SelectClientSidePanelProps) => {
    const router = useRouter();
    const { clients, isLoading } = useCoachClients();

    const handleClientClick = (client: Athlete) => {
        onOpenChange(false);
        router.push(`/athletes/${client.id}/training`);
    };

    const handleRowKeyDown = (
        row: Athlete,
        event: React.KeyboardEvent<HTMLTableRowElement>
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClientClick(row);
        }
    };

    const columns: ColumnDefinition<Athlete>[] = [
        {
            id: 'name',
            label: 'Athlete',
            icon: <UserPlus className="size-3" />,
            width: { class: 'w-full', pixel: '100%' },
            getSortValue: (row) => row.name.toLowerCase(),
            getSearchValue: (row) => `${row.name} ${row.email}`,
            renderCell: (row) => {
                const initials = row.name
                    .split(' ')
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('');
                return (
                    <div className="flex items-center gap-3 h-full w-full">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={row.avatarUrl} alt={row.name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn('truncate text-sm font-medium')}>{row.name}</span>
                    </div>
                );
            },
        },
    ];

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title={title}
        >
            <div className="flex flex-col gap-2 flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-hidden [&_.border-t]:border-t-0 pb-0.5">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <DataGrid
                            data={clients || []}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="select-client-for-training"
                            searchPlaceholder="Search athletes..."
                            enableSearch={true}
                            enableEditColumns={false}
                            enableExport={false}
                            enableRowSelection={false}
                            onRowClick={handleClientClick}
                            onRowKeyDown={handleRowKeyDown}
                            emptyMessage="No athletes found."
                            rowHeight="54px"
                            compactMode={true}
                            showPagination={false}
                            gridPadding={false}
                        />
                    )}
                </div>
            </div>
        </SidePanel>
    );
};
