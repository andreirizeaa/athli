'use client';

import { useState, useMemo, ReactNode, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Athlete } from '@/api/coach/coach-client-service';
import { Spinner } from '@/components/ui/spinner';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';

interface AssignToClientsSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    /**
     * Component to show what is being assigned (e.g. list of files, metrics, etc)
     */
    previewComponent?: ReactNode;
    /**
     * Callback when assign button is clicked
     * @param clientIds Array of selected client IDs
     */
    onAssign: (clientIds: string[]) => Promise<void>;
    isAssigning?: boolean;
    assignButtonLabel?: string | ((count: number) => string);
}

export const AssignToClientsSidePanel = ({
    open,
    onOpenChange,
    title,
    description,
    previewComponent,
    onAssign,
    isAssigning = false,
    assignButtonLabel
}: AssignToClientsSidePanelProps) => {
    const t = useTranslations();
    const { clients, isLoading } = useCoachClients();
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [internalAssigning, setInternalAssigning] = useState(false);

    // Reset selection when closed
    useEffect(() => {
        if (!open) {
            setSelectedClientIds(new Set());
        }
    }, [open]);

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

    const handleAssign = async () => {
        if (selectedClientIds.size === 0) return;

        setInternalAssigning(true);
        try {
            await onAssign(Array.from(selectedClientIds));
            onOpenChange(false);
        } catch (error) {
            console.error('Assignment failed', error);
        } finally {
            setInternalAssigning(false);
        }
    };

    const columns: ColumnDefinition<Athlete>[] = useMemo(() => [
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
                                <AvatarImage src={row.avatarUrl} alt={row.name} />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <span className={cn('truncate text-sm font-medium')}>{row.name}</span>
                        </div>
                    </div>
                );
            },
        },
    ], [t]);

    const loadingState = isAssigning || internalAssigning;

    const defaultButtonLabel = selectedClientIds.size === 1
        ? t('general.assign')
        : `${t('general.assign')} (${selectedClientIds.size})`;

    const label = typeof assignButtonLabel === 'function'
        ? assignButtonLabel(selectedClientIds.size)
        : assignButtonLabel || defaultButtonLabel;

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loadingState}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedClientIds.size === 0 || loadingState}
                        className="gap-2"
                    >
                        {loadingState ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {label}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-6 h-full">
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
                {/* Preview Section */}
                {previewComponent && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        {previewComponent}
                    </div>
                )}

                {/* Client List */}
                <div className="flex flex-col gap-2 flex-1 min-h-0">
                    <div className="flex-1 min-h-0 overflow-hidden [&_.border-t]:border-t-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Spinner className="size-6" />
                            </div>
                        ) : (
                            <DataGrid
                                data={clients || []}
                                columns={columns}
                                getRowId={(row) => row.id}
                                gridKey="assign-to-clients"
                                searchPlaceholder={t('metrics.searchAthletes')} // Utilizing existing string or generic
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
                                showPagination={false}
                                gridPadding={false}
                            />
                        )}
                    </div>
                </div>
            </div>
        </SidePanel>
    );
};
