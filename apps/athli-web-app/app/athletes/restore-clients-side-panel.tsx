'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Search } from 'lucide-react';
import { getArchivedClients, restoreClient, type Athlete } from '@/api/coach/coach-client-service';

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
    const [archivedClients, setArchivedClients] = useState<Athlete[]>([]);
    const [filteredClients, setFilteredClients] = useState<Athlete[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setSelectedClientId(null);
            setSearchQuery('');
            setCurrentPage(1);
        }
    };

    // Fetch archived clients when panel opens
    useEffect(() => {
        if (open) {
            fetchArchivedClients();
        }
    }, [open]);

    // Filter clients based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredClients(archivedClients);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = archivedClients.filter(
                (client) =>
                    client.name.toLowerCase().includes(query) ||
                    client.email.toLowerCase().includes(query)
            );
            setFilteredClients(filtered);
        }
        setCurrentPage(1); // Reset to first page when search changes
    }, [searchQuery, archivedClients]);

    const fetchArchivedClients = async () => {
        setIsLoading(true);
        try {
            const data = await getArchivedClients();
            setArchivedClients(data);
            setFilteredClients(data);
        } catch (error) {
            toast.error(t('general.error'));
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedClientId) return;

        setIsRestoring(true);
        try {
            await restoreClient(selectedClientId);
            toast.success(t('athletes.notifications.restoreSuccess'));
            onOpenChange(false);
            if (onClientRestored) onClientRestored();
        } catch (error) {
            toast.error(t('athletes.notifications.restoreError'));
            console.error(error);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleClientSelect = (clientId: string) => {
        setSelectedClientId(selectedClientId === clientId ? null : clientId);
    };

    // Pagination
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleOpenChange}
            title={t('athletes.restorePanel.title')}
            footer={
                <div className="flex w-full justify-start gap-2">
                    <Button
                        onClick={handleRestore}
                        disabled={!selectedClientId || isRestoring}
                    >
                        {isRestoring ? <Spinner className="mr-2" /> : null}
                        {t('athletes.restorePanel.restoreButton')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isRestoring}
                    >
                        {t('general.cancel')}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col h-full gap-6">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={t('athletes.restorePanel.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-auto border rounded-md">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner className="size-6" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex items-center justify-center h-full p-8 text-center">
                            <p className="text-sm text-muted-foreground">{t('athletes.restorePanel.emptyState')}</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                                <tr>
                                    <th className="w-12 p-3"></th>
                                    <th className="text-left p-3 font-medium text-sm">
                                        {t('athletes.restorePanel.columns.name')}
                                    </th>
                                    <th className="text-left p-3 font-medium text-sm">
                                        {t('athletes.restorePanel.columns.email')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="border-t hover:bg-muted/30 cursor-pointer"
                                        onClick={() => handleClientSelect(client.id)}
                                    >
                                        <td className="p-3">
                                            <Checkbox
                                                checked={selectedClientId === client.id}
                                                onCheckedChange={() => handleClientSelect(client.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="p-3 text-sm">{client.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{client.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </SidePanel>
    );
};
