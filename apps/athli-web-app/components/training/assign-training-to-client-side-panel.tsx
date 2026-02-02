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

type TrainingItem =
    | { type: 'workout'; id: string; name: string }
    | { type: 'program'; id: string; name: string }
    | { type: 'exercise'; id: string; name: string };

interface AssignTrainingToClientSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedItem: TrainingItem | null;
    title?: string;
}

export const AssignTrainingToClientSidePanel = ({
    open,
    onOpenChange,
    selectedItem,
    title,
}: AssignTrainingToClientSidePanelProps) => {
    const router = useRouter();
    const { clients, isLoading } = useCoachClients();

    const handleClientClick = (client: Athlete) => {
        if (!selectedItem) return;

        onOpenChange(false);

        // Build query parameters based on item type
        const params = new URLSearchParams();
        params.set('openModal', 'true');

        let url = `/athletes/${client.id}/training`;

        switch (selectedItem.type) {
            case 'workout':
                params.set('workoutId', selectedItem.id);
                params.set('workoutName', selectedItem.name);
                break;
            case 'program':
                params.set('programId', selectedItem.id);
                params.set('programName', selectedItem.name);
                break;
            case 'exercise':
                params.set('exerciseId', selectedItem.id);
                params.set('exerciseName', selectedItem.name);
                break;
        }

        router.push(`${url}?${params.toString()}`);
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

    const getTitle = () => {
        if (title) return title;
        if (!selectedItem) return 'Assign to Client';

        const itemTypeLabel = selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1);
        return `Assigning ${itemTypeLabel}: ${selectedItem.name}`;
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
            title={getTitle()}
        >
            <div className="flex flex-col gap-2 flex-1 min-h-0 ">
                <div className="flex-1 min-h-0 overflow-hidden [&_.border-t]:border-t-0 ">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <DataGrid
                            data={clients || []}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="assign-training-to-clients"
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
