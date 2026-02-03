'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Plus, FileText, X, Trash2, MoreHorizontal, Pause, Play } from 'lucide-react';
import { deleteClientCheckIns, updateClientCheckInStatus, type ClientCheckIn } from '@/api/client/client-form-service';
import { AssignCheckInSidePanel } from '@/components/forms/assign-check-in-side-panel';
import { Badge } from '@/components/ui/badge';
import { useClientCheckIns } from '@/hooks/use-client-check-ins';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useClientProfile } from '@/hooks/use-client-profile';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ClientCheckInPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  const router = useRouter();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;

  const { user } = useUserProfile();
  const { client } = useClientProfile(clientId);
  const { checkIns, refetch } = useClientCheckIns(clientId);
  const itemsPerPage = 25;
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [isAddCheckInOpen, setIsAddCheckInOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [checkInToDelete, setCheckInToDelete] = useState<ClientCheckIn | null>(null);

  // Format schedule text
  const formatSchedule = (schedule: string): string => {
    const scheduleMap: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      manual: 'Manual',
    };
    return scheduleMap[schedule.toLowerCase()] || schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  // Format date to "7 Feb, 2026"
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  // Get status badge
  const getStatusBadge = (status: 'draft' | 'live' | 'paused') => {
    switch (status) {
      case 'draft':
        return (
          <Badge
            variant="outline"
            className="text-xs border-muted-foreground text-muted-foreground bg-transparent"
          >
            {t('athletes.profile.checkIns.status.draft')}
          </Badge>
        );
      case 'live':
        return (
          <Badge
            variant="default"
            className="text-xs rounded-full bg-primary text-primary-foreground border-transparent"
          >
            {t('athletes.profile.checkIns.status.live')}
          </Badge>
        );
      case 'paused':
        return (
          <Badge
            variant="outline"
            className="text-xs border-yellow-500 text-yellow-600 bg-transparent"
          >
            {t('athletes.profile.checkIns.status.paused')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleAddCheckIn = () => {
    setIsAddCheckInOpen(true);
  };

  const handleSaveAddCheckIn = async () => {
    refetch();
  };

  const handleClearSelected = () => {
    setSelectedCheckIns(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedCheckIns.size === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientId || !user?.id) return;

    try {
      const idsToDelete = checkInToDelete ? [checkInToDelete.id] : Array.from(selectedCheckIns);
      await deleteClientCheckIns({
        checkInIds: idsToDelete,
        clientId: clientId,
        coachId: user.id
      });

      toast.success(t('general.deleteSuccess'));
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedCheckIns(new Set());
      setCheckInToDelete(null);
    } catch (error) {
      console.error('Failed to delete check-ins:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleToggleCheckIn = (checkInId: string) => {
    setSelectedCheckIns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(checkInId)) {
        newSet.delete(checkInId);
      } else {
        newSet.add(checkInId);
      }
      return newSet;
    });
  };

  const handlePublish = async (checkIn: ClientCheckIn) => {
    if (!clientId || !user?.id) return;

    try {
      await updateClientCheckInStatus({
        checkInId: checkIn.id,
        clientId: clientId,
        coachId: user.id,
        status: 'live',
      });
      toast.success(t('athletes.profile.checkIns.publishSuccess'));
      refetch();
    } catch (error) {
      console.error('Failed to publish check-in:', error);
      toast.error(t('general.error'));
    }
  };

  const handlePause = async (checkIn: ClientCheckIn) => {
    if (!clientId || !user?.id) return;

    try {
      await updateClientCheckInStatus({
        checkInId: checkIn.id,
        clientId: clientId,
        coachId: user.id,
        status: 'paused',
      });
      toast.success(t('athletes.profile.checkIns.pauseSuccess'));
      refetch();
    } catch (error) {
      console.error('Failed to pause check-in:', error);
      toast.error(t('general.error'));
    }
  };

  const handleResume = async (checkIn: ClientCheckIn) => {
    if (!clientId || !user?.id) return;

    try {
      await updateClientCheckInStatus({
        checkInId: checkIn.id,
        clientId: clientId,
        coachId: user.id,
        status: 'live',
      });
      toast.success(t('athletes.profile.checkIns.resumeSuccess'));
      refetch();
    } catch (error) {
      console.error('Failed to resume check-in:', error);
      toast.error(t('general.error'));
    }
  };

  const handleDeleteSingle = (checkIn: ClientCheckIn) => {
    setCheckInToDelete(checkIn);
    setIsDeleteDialogOpen(true);
  };

  const columns: ColumnDefinition<ClientCheckIn>[] = [
    {
      id: 'name',
      label: t('athletes.profile.checkIns.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[300px]', pixel: '300px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">
              {t('athletes.profile.checkIns.columns.name')}
            </span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
          >
            <Checkbox checked={isSelected} onCheckedChange={() => handleToggleCheckIn(row.id)} />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-medium truncate">{row.name}</span>
            <span className="text-xs text-muted-foreground">
              {row.questionCount === 1
                ? t('athletes.profile.checkIns.questions', { count: row.questionCount })
                : t('athletes.profile.checkIns.questionsPlural', { count: row.questionCount })}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      label: t('athletes.profile.checkIns.columns.status'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => row.status,
      getSearchValue: (row) => row.status,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.status')}
          </span>
        </div>
      ),
      renderCell: (row) => getStatusBadge(row.status),
    },
    {
      id: 'schedule',
      label: t('athletes.profile.checkIns.columns.schedule'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.schedule.toLowerCase(),
      getSearchValue: (row) => row.schedule,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.schedule')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{formatSchedule(row.schedule)}</span>
      ),
    },
    {
      id: 'submissions',
      label: t('athletes.profile.checkIns.columns.submissions'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.submissionCount,
      getSearchValue: () => '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.submissions')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.submissionCount}</span>
      ),
    },
    {
      id: 'createdAt',
      label: t('athletes.profile.checkIns.columns.createdAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[140px]', pixel: '140px' },
      getSortValue: (row) => row.createdAt.getTime(),
      getSearchValue: () => '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.createdAt')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'nextScheduledAt',
      label: t('athletes.profile.checkIns.columns.nextScheduledAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[140px]', pixel: '140px' },
      getSortValue: (row) => row.nextScheduledAt.getTime(),
      getSearchValue: () => '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.nextScheduledAt')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">
          {row.status === 'draft' ? '--' : row.status === 'paused' ? t('athletes.profile.checkIns.status.paused') : formatDate(row.nextScheduledAt)}
        </span>
      ),
    },
    {
      id: 'description',
      label: t('athletes.profile.checkIns.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[300px]', pixel: '300px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.description')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground truncate block">
          {row.description || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      label: '',
      icon: <></>,
      sortable: false,
      width: { class: 'w-[140px]', pixel: '140px' },
      getSortValue: () => '',
      getSearchValue: () => '',
      renderHeader: () => <></>,
      renderCell: (row) => {
        // Draft state: show Publish button
        if (row.status === 'draft') {
          return (
            <div className="flex items-center justify-end gap-2" data-no-row-link="true">
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePublish(row);
                }}
              >
                {t('athletes.profile.checkIns.publish')}
              </Button>
            </div>
          );
        }

        // Live or Paused: show ellipsis dropdown
        return (
          <div className="flex items-center justify-end" data-no-row-link="true">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.status === 'live' ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePause(row);
                    }}
                  >
                    <Pause className="size-4 mr-2" />
                    <span>{t('athletes.profile.checkIns.pause')}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResume(row);
                    }}
                  >
                    <Play className="size-4 mr-2" />
                    <span>{t('athletes.profile.checkIns.resume')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSingle(row);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2 text-destructive" />
                  <span>{t('general.delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Filter and sort check-ins
  const filteredAndSortedCheckIns = useMemo(() => {
    let filtered = [...checkIns];

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [checkIns]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={filteredAndSortedCheckIns}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`client-check-ins-${clientId}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder={t('athletes.profile.checkIns.searchPlaceholder')}
        searchFields={['name', 'description', 'schedule']}
        filterBarActions={
          <div className="flex items-center gap-2">
            <Button onClick={handleAddCheckIn} className="gap-2">
              <Plus className="size-4" />
              <span>{t('general.assign')} Check-in</span>
            </Button>
          </div>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedCheckIns}
        onSelectionChange={setSelectedCheckIns}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('athletes.profile.checkIns.emptyMessage')}
        emptyState={
          <EmptyGridState
            title="No check-ins assigned"
            subtitle="This client has no check-ins assigned yet"
            action={
              <Button onClick={() => setIsAddCheckInOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('general.assign')} Check-in</span>
              </Button>
            }
          />
        }
        onRowClick={(row) => {
          router.push(`/athletes/${clientId}/check-in/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            router.push(`/athletes/${clientId}/check-in/${row.id}`);
          }
        }}
        selectionActions={
          selectedCheckIns.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
              >
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedCheckIns.size })}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeleteSelected}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
      />
      {user?.id && (
        <AssignCheckInSidePanel
          open={isAddCheckInOpen}
          onOpenChange={setIsAddCheckInOpen}
          onSave={handleSaveAddCheckIn}
          clientId={clientId}
          coachId={user.id}
          clientName={client?.name}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setCheckInToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        count={checkInToDelete ? 1 : selectedCheckIns.size}
        itemName={checkInToDelete?.name}
        itemType="check-in"
        variant="default"
      />
    </div>
  );
};

export default ClientCheckInPage;
