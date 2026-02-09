'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { getArchivedClients, restoreClient, type Athlete } from '@/api/coach/coach-client-service';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';

interface RestoreClientsSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClientRestored?: () => void;
}

export const RestoreClientsSidePanel = ({
    open,
    onOpenChange,
    onClientRestored,
}: RestoreClientsSidePanelProps) => {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const [archivedClients, setArchivedClients] = useState<Athlete[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setSelectedClientIds(new Set());
        }
    };

    // Fetch archived clients when panel opens
    useEffect(() => {
        if (open) {
            fetchArchivedClients();
        }
    }, [open]);

    const fetchArchivedClients = async () => {
        setIsLoading(true);
        try {
            const data = await getArchivedClients();
            setArchivedClients(data);
        } catch (error) {
            toast.error(t('general.error'));
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        if (selectedClientIds.size === 0) return;

        setIsRestoring(true);
        try {
            await restoreClient(Array.from(selectedClientIds));

            const restoredNames = archivedClients
                .filter(c => selectedClientIds.has(c.id))
                .map(c => c.name)
                .join(', ');

            const message = selectedClientIds.size === 1
                ? `${restoredNames} has been successfully restored and will regain app access immediately`
                : `${selectedClientIds.size} clients have been successfully restored and will regain app access immediately`;

            toast.success(message);

            // Invalidate the coach-clients query to refresh the main list without page reload
            queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
            // Invalidate conversations so restored clients appear in inbox
            queryClient.invalidateQueries({ queryKey: ['conversations'] });

            onOpenChange(false);
            if (onClientRestored) onClientRestored();
        } catch (error) {
            toast.error(t('athletes.notifications.restoreError'));
            console.error(error);
        } finally {
            setIsRestoring(false);
        }
    };

    const columns: ColumnDefinition<Athlete>[] = useMemo(() => [
        {
            id: 'name',
            label: t('athletes.restorePanel.columns.name'),
            width: { class: 'min-w-[300px]', pixel: '300px' },
            renderHeader: ({ isAllSelected, onToggleAll }) => (
                <div className="flex items-center gap-3 h-full w-full">
                    <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                    <span className="text-xs uppercase text-muted-foreground">{t('athletes.restorePanel.columns.name')}</span>
                </div>
            ),
            renderCell: (row, isSelected) => (
                <div className="flex items-center gap-3 h-full w-full">
                    <div
                        className="flex items-center justify-center h-full flex-shrink-0"
                        data-no-row-link="true"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientIds((prev) => {
                                const newSet = new Set(prev);
                                if (newSet.has(row.id)) {
                                    newSet.delete(row.id);
                                } else {
                                    newSet.add(row.id);
                                }
                                return newSet;
                            });
                        }}
                    >
                        <Checkbox checked={isSelected} />
                    </div>
                    <Avatar className="size-8 flex-shrink-0">
                        <AvatarImage src={row.avatarUrl} alt={row.name} />
                        <AvatarFallback className="text-xs">
                            {row.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium">{row.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{row.email}</span>
                    </div>
                </div>
            ),
        },
    ], [t, setSelectedClientIds]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleOpenChange}
            title={t('athletes.restorePanel.title')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isRestoring}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        onClick={handleRestore}
                        disabled={selectedClientIds.size === 0 || isRestoring}
                        className="gap-2"
                    >
                        {isRestoring ? <Spinner className="size-4" /> : null}
                        {selectedClientIds.size === 0
                            ? t('athletes.restorePanel.restoreButton')
                            : selectedClientIds.size === 1
                                ? 'Restore 1 client'
                                : `Restore ${selectedClientIds.size} clients`}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col h-full gap-6 min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner className="size-6" />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 [&_.border-t]:border-t-0">
                        <DataGrid
                            data={archivedClients}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="archived-clients"
                            searchPlaceholder={t('athletes.restorePanel.searchPlaceholder')}
                            searchFields={[(row) => `${row.name} ${row.email}`]}
                            enableSearch={true}
                            enableEditColumns={false}
                            enableExport={false}
                            enableRowSelection={true}
                            selectOnRowClick={true}
                            selectedRowIds={selectedClientIds}
                            onSelectionChange={setSelectedClientIds}
                            emptyMessage={t('athletes.restorePanel.emptyState')}
                            rowHeight="54px"
                            compactMode={true}
                            showPagination={false}
                            gridPadding={false}
                        />
                    </div>
                )}
            </div>
        </SidePanel>
    );
};
