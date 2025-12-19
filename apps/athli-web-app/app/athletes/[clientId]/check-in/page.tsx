'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Plus, FileText, X, Trash2, ClipboardList } from 'lucide-react';
import { deleteClientCheckIns, getClientCheckIns, type ClientCheckIn } from '@/lib/forms/form-service';
import { AddCheckInSidePanel } from '@/components/forms/add-check-in-side-panel';

const ClientCheckInPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const [checkIns, setCheckIns] = useState<ClientCheckIn[]>([]);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [isAddCheckInOpen, setIsAddCheckInOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const itemsPerPage = 25;

  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const data = await getClientCheckIns(clientId);
        setCheckIns(data);
        setFilteredCount(data.length);
      } catch (error) {
        console.error('Failed to fetch check-ins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckIns();
  }, [clientId]);

  const handleAddCheckIn = () => {
    setIsAddCheckInOpen(true);
  };

  const handleSaveAddCheckIn = async (formId: string, scheduleData: any) => {
    // This callback is called after the form is successfully assigned via the assignForm service
    // The service call and logging happens in AddCheckInSidePanel's handleSave function
    // Refresh the check-ins list
    if (clientId) {
      const data = await getClientCheckIns(clientId);
      setCheckIns(data);
    }
  };

  const handleClearSelected = () => {
    setSelectedCheckIns(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedCheckIns.size === 0 || !clientId) return;

    try {
      await deleteClientCheckIns({
        checkInIds: Array.from(selectedCheckIns),
        clientId: clientId,
      });
      
      setCheckIns((prev) => prev.filter((c) => !selectedCheckIns.has(c.id)));
      setSelectedCheckIns(new Set());
    } catch (error) {
      console.error('Failed to delete check-ins:', error);
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

  // Render first column header with checkbox
  const renderFirstColumnHeader = ({
    isAllSelected,
    onToggleAll,
  }: {
    isAllSelected: boolean;
    onToggleAll: () => void;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.name')}
          </span>
        </div>
      </div>
    );
  };

  // Render first column with checkbox
  const renderFirstColumn = (row: ClientCheckIn, isSelected: boolean) => {
    return (
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
    );
  };

  const columns: ColumnDefinition<ClientCheckIn>[] = [
    {
      id: 'name',
      label: t('athletes.profile.checkIns.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderCell: (row) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{row.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.questionCount === 1
              ? t('athletes.profile.checkIns.questions', { count: row.questionCount })
              : t('athletes.profile.checkIns.questionsPlural', { count: row.questionCount })}
          </span>
        </div>
      ),
    },
    {
      id: 'schedule',
      label: t('athletes.profile.checkIns.columns.schedule'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => row.schedule.toLowerCase(),
      getSearchValue: (row) => row.schedule,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.schedule')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.schedule}</span>
      ),
    },
    {
      id: 'nextScheduledAt',
      label: t('athletes.profile.checkIns.columns.nextScheduledAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[180px]', pixel: '180px' },
      getSortValue: (row) => row.nextScheduledAt.getTime(),
      getSearchValue: (row) => row.nextScheduledAt.toLocaleDateString(),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.checkIns.columns.nextScheduledAt')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">
          {row.nextScheduledAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'description',
      label: t('athletes.profile.checkIns.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[400px]', pixel: '400px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
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
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('athletes.profile.checkIns.searchPlaceholder')}
        searchFields={['name', 'description', 'schedule']}
        filterBarActions={
          <div className="flex items-center gap-2">
            <Button onClick={handleAddCheckIn} className="gap-2">
              <Plus className="size-4" />
              <span>{t('athletes.profile.checkIns.addCheckIn')}</span>
            </Button>
          </div>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedCheckIns}
        onSelectionChange={setSelectedCheckIns}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('athletes.profile.checkIns.emptyMessage')}
        emptyState={
          <EmptyGridState
            title="No check-ins assigned"
            subtitle="This client has no check-ins assigned yet"
            action={
              <Button onClick={() => router.push('/forms')} className="gap-2">
                <ClipboardList className="size-4" />
                <span>{t('athletes.profile.checkIns.goToForms')}</span>
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={handleClearSelected}
              className="gap-2"
              aria-label={t('athletes.profile.checkIns.clearSelected')}
            >
              <X className="size-4" />
              <span>
                {t('athletes.profile.checkIns.clearSelected')} {selectedCheckIns.size}
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleDeleteSelected}
              className="gap-2"
              aria-label={t('general.delete')}
            >
              <Trash2 className="size-4" />
              <span>{t('general.delete')}</span>
            </Button>
          </div>
        }
      />
      <AddCheckInSidePanel
        open={isAddCheckInOpen}
        onOpenChange={setIsAddCheckInOpen}
        onSave={handleSaveAddCheckIn}
        clientId={clientId}
      />
    </div>
  );
};

export default ClientCheckInPage;
