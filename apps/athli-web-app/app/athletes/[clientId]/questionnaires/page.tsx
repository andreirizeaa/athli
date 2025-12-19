'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Plus, FileText, X, Trash2, ClipboardList } from 'lucide-react';
import { deleteClientCheckIns, getClientQuestionnaires, type ClientQuestionnaire } from '@/lib/forms/form-service';
import { AddQuestionnaireSidePanel } from '@/components/forms/add-questionnaire-side-panel';
import { Badge } from '@/components/ui/badge';

const ClientQuestionnairesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const [questionnaires, setQuestionnaires] = useState<ClientQuestionnaire[]>([]);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [isAddQuestionnaireOpen, setIsAddQuestionnaireOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const itemsPerPage = 25;

  useEffect(() => {
    const fetchQuestionnaires = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const data = await getClientQuestionnaires(clientId);
        setQuestionnaires(data);
        setFilteredCount(data.length);
      } catch (error) {
        console.error('Failed to fetch questionnaires:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionnaires();
  }, [clientId]);

  const handleAddQuestionnaire = () => {
    setIsAddQuestionnaireOpen(true);
  };

  const handleSaveAddQuestionnaire = async (formId: string, scheduleData: any) => {
    // This callback is called after the form is successfully assigned via the assignForm service
    // The service call and logging happens in AddQuestionnaireSidePanel's handleSave function
    // Refresh the questionnaires list
    if (clientId) {
      const data = await getClientQuestionnaires(clientId);
      setQuestionnaires(data);
    }
  };

  const handleClearSelected = () => {
    setSelectedQuestionnaires(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestionnaires.size === 0 || !clientId) return;

    try {
      await deleteClientCheckIns({
        checkInIds: Array.from(selectedQuestionnaires),
        clientId: clientId,
      });

      setQuestionnaires((prev) => prev.filter((q) => !selectedQuestionnaires.has(q.id)));
      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to delete questionnaires:', error);
    }
  };

  const handleToggleQuestionnaire = (questionnaireId: string) => {
    setSelectedQuestionnaires((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionnaireId)) {
        newSet.delete(questionnaireId);
      } else {
        newSet.add(questionnaireId);
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
            {t('athletes.profile.questionnaires.columns.name')}
          </span>
        </div>
      </div>
    );
  };

  // Render first column with checkbox
  const renderFirstColumn = (row: ClientQuestionnaire, isSelected: boolean) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
        >
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleQuestionnaire(row.id)} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-medium truncate">{row.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.questionCount === 1
              ? t('athletes.profile.questionnaires.questions', { count: row.questionCount })
              : t('athletes.profile.questionnaires.questionsPlural', { count: row.questionCount })}
          </span>
        </div>
      </div>
    );
  };

  const columns: ColumnDefinition<ClientQuestionnaire>[] = [
    {
      id: 'name',
      label: t('athletes.profile.questionnaires.columns.name'),
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
              ? t('athletes.profile.questionnaires.questions', { count: row.questionCount })
              : t('athletes.profile.questionnaires.questionsPlural', { count: row.questionCount })}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      label: t('athletes.profile.questionnaires.columns.status'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.status,
      getSearchValue: (row) => row.status,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.questionnaires.columns.status')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <Badge variant={row.status === 'completed' ? 'default' : 'outline'} className="text-xs">
          {row.status === 'completed' ? t('athletes.profile.questionnaires.status.completed') : t('athletes.profile.questionnaires.status.pending')}
        </Badge>
      ),
    },
    {
      id: 'sentAt',
      label: t('athletes.profile.questionnaires.columns.sentAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.sentAt.getTime(),
      getSearchValue: (row) => row.sentAt.toLocaleDateString(),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.questionnaires.columns.sentAt')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">
          {row.sentAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'completedAt',
      label: t('athletes.profile.questionnaires.columns.completedAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.completedAt?.getTime() || 0,
      getSearchValue: (row) => row.completedAt?.toLocaleDateString() || '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.questionnaires.columns.completedAt')}
          </span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">
          {row.completedAt ? row.completedAt.toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      id: 'description',
      label: t('athletes.profile.questionnaires.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[400px]', pixel: '400px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">
            {t('athletes.profile.questionnaires.columns.description')}
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

  // Filter and sort questionnaires
  const filteredAndSortedQuestionnaires = useMemo(() => {
    let filtered = [...questionnaires];

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [questionnaires]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={filteredAndSortedQuestionnaires}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`client-questionnaires-${clientId}`}
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('athletes.profile.questionnaires.searchPlaceholder')}
        searchFields={['name', 'description']}
        filterBarActions={
          <div className="flex items-center gap-2">
            <Button onClick={handleAddQuestionnaire} className="gap-2">
              <Plus className="size-4" />
              <span>{t('athletes.profile.questionnaires.addQuestionnaire')}</span>
            </Button>
          </div>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedQuestionnaires}
        onSelectionChange={setSelectedQuestionnaires}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('athletes.profile.questionnaires.emptyMessage')}
        emptyState={
          <EmptyGridState
            title="No questionnaires assigned"
            subtitle="This client has no questionnaires assigned yet"
            action={
              <Button onClick={() => router.push('/forms')} className="gap-2">
                <ClipboardList className="size-4" />
                <span>{t('athletes.profile.questionnaires.goToForms')}</span>
              </Button>
            }
          />
        }
        onRowClick={(row) => {
          router.push(`/athletes/${clientId}/questionnaires/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            router.push(`/athletes/${clientId}/questionnaires/${row.id}`);
          }
        }}
        selectionActions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={handleClearSelected}
              className="gap-2"
              aria-label={t('athletes.profile.questionnaires.clearSelected')}
            >
              <X className="size-4" />
              <span>
                {t('athletes.profile.questionnaires.clearSelected')} {selectedQuestionnaires.size}
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
      <AddQuestionnaireSidePanel
        open={isAddQuestionnaireOpen}
        onOpenChange={setIsAddQuestionnaireOpen}
        onSave={handleSaveAddQuestionnaire}
        clientId={clientId}
      />
    </div>
  );
};

export default ClientQuestionnairesPage;
