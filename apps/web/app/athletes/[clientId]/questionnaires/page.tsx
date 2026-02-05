'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Plus, FileText, X, Trash2, Send, MoreHorizontal, RefreshCw } from 'lucide-react';
import { deleteClientQuestionnaires, sendClientQuestionnaire, resendClientQuestionnaire, type ClientQuestionnaire } from '@/api/client/client-form-service';
import { AssignQuestionnaireSidePanel } from '@/components/forms/assign-questionnaire-side-panel';
import { Badge } from '@/components/ui/badge';
import { useClientQuestionnaires } from '@/hooks/use-client-questionnaires';
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

// Format date as "7 Feb, 2026 at 15:35"
const formatDateTime = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${year} at ${hours}:${minutes}`;
};

const ClientQuestionnairesPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  const router = useRouter();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;

  const { user } = useUserProfile();
  const { client } = useClientProfile(clientId);
  const { questionnaires, refetch } = useClientQuestionnaires(clientId);
  const itemsPerPage = 25;
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [isAddQuestionnaireOpen, setIsAddQuestionnaireOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState<boolean>(false);
  const [questionnaireToSend, setQuestionnaireToSend] = useState<ClientQuestionnaire | null>(null);

  const handleAddQuestionnaire = () => {
    setIsAddQuestionnaireOpen(true);
  };

  const handleSaveAddQuestionnaire = async () => {
    // This callback is called after the form is successfully assigned via the assignForm service
    // The service call and logging happens in AddQuestionnaireSidePanel's handleSave function
    // Refresh the questionnaires list
    refetch();
  };

  const handleClearSelected = () => {
    setSelectedQuestionnaires(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedQuestionnaires.size === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientId || !user?.id) return;

    try {
      await deleteClientQuestionnaires({
        questionnaireIds: Array.from(selectedQuestionnaires),
        clientId: clientId,
        coachId: user.id
      });

      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedQuestionnaires(new Set());
    } catch (error) {
      console.error('Failed to delete questionnaires:', error);
    }
  };

  const handleSendQuestionnaire = (questionnaire: ClientQuestionnaire) => {
    setQuestionnaireToSend(questionnaire);
    setIsSendDialogOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!questionnaireToSend || !clientId || !user?.id) return;

    try {
      await sendClientQuestionnaire({
        questionnaireId: questionnaireToSend.id,
        clientId: clientId,
        coachId: user.id
      });

      toast.success(t('athletes.profile.questionnaires.sendSuccess'));
      refetch();
      setIsSendDialogOpen(false);
      setQuestionnaireToSend(null);
    } catch (error) {
      console.error('Failed to send questionnaire:', error);
      toast.error(t('general.error'));
    }
  };

  const handleResendQuestionnaire = async (questionnaire: ClientQuestionnaire) => {
    if (!clientId || !user?.id) return;

    try {
      await resendClientQuestionnaire({
        questionnaireId: questionnaire.id,
        clientId: clientId,
        coachId: user.id
      });

      toast.success(t('athletes.profile.questionnaires.resendSuccess'));
      refetch();
    } catch (error) {
      console.error('Failed to resend questionnaire:', error);
      toast.error(t('general.error'));
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

  const getStatusBadge = (status: ClientQuestionnaire['status']) => {
    switch (status) {
      case 'draft':
        return (
          <Badge
            variant="outline"
            className="text-xs border-muted-foreground text-muted-foreground bg-transparent"
          >
            {t('athletes.profile.questionnaires.status.draft')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="text-xs border-primary text-primary bg-transparent"
          >
            {t('athletes.profile.questionnaires.status.pending')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            variant="default"
            className="text-xs rounded-full bg-primary text-primary-foreground border-transparent"
          >
            {t('athletes.profile.questionnaires.status.completed')}
          </Badge>
        );
      default:
        return null;
    }
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
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">
              {t('athletes.profile.questionnaires.columns.name')}
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
      renderCell: (row) => getStatusBadge(row.status),
    },
    {
      id: 'sentAt',
      label: t('athletes.profile.questionnaires.columns.sentAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => row.sentAt?.getTime() || 0,
      getSearchValue: (row) => row.sentAt ? formatDateTime(row.sentAt) : '',
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
          {row.sentAt ? formatDateTime(row.sentAt) : '--'}
        </span>
      ),
    },
    {
      id: 'completedAt',
      label: t('athletes.profile.questionnaires.columns.completedAt'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => row.completedAt?.getTime() || 0,
      getSearchValue: (row) => row.completedAt ? formatDateTime(row.completedAt) : '',
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
          {row.completedAt ? formatDateTime(row.completedAt) : '--'}
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
          {row.description || '--'}
        </span>
      ),
    },
    {
      id: 'actions',
      label: '',
      icon: <></>,
      sortable: false,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: () => '',
      getSearchValue: () => '',
      renderHeader: () => <></>,
      renderCell: (row) => (
        <div className="flex items-center justify-center" data-no-row-link="true">
          {row.status === 'draft' ? (
            <Button
              size="sm"
              className="gap-2"
              disabled={row.questionCount === 0}
              onClick={(e) => {
                e.stopPropagation();
                handleSendQuestionnaire(row);
              }}
            >
              <Send className="size-3" />
              {t('athletes.profile.questionnaires.sendForm')}
            </Button>
          ) : (
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResendQuestionnaire(row);
                  }}
                >
                  <RefreshCw className="size-4 mr-2" />
                  {t('athletes.profile.questionnaires.sendAgain')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuestionnaires(new Set([row.id]));
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2 text-destructive" />
                  {t('general.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
        enableSearch={true}
        searchPlaceholder={t('athletes.profile.questionnaires.searchPlaceholder')}
        searchFields={['name', 'description']}
        filterBarActions={
          <div className="flex items-center gap-2">
            <Button onClick={handleAddQuestionnaire} className="gap-2">
              <Plus className="size-4" />
              <span>{t('general.assign')} Questionnaire</span>
            </Button>
          </div>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedQuestionnaires}
        onSelectionChange={setSelectedQuestionnaires}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('athletes.profile.questionnaires.emptyMessage')}
        emptyState={
          <EmptyGridState
            title="No questionnaires assigned"
            subtitle="This client has no questionnaires assigned yet"
            action={
              <Button onClick={() => setIsAddQuestionnaireOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('general.assign')} Questionnaire</span>
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
          selectedQuestionnaires.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
              >
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedQuestionnaires.size })}</span>
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
        <AssignQuestionnaireSidePanel
          open={isAddQuestionnaireOpen}
          onOpenChange={setIsAddQuestionnaireOpen}
          onSave={handleSaveAddQuestionnaire}
          clientId={clientId}
          coachId={user.id}
          clientName={client?.name}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        count={selectedQuestionnaires.size}
        itemType="questionnaire"
        variant="default"
      />

      <ConfirmDeleteDialog
        open={isSendDialogOpen}
        onOpenChange={setIsSendDialogOpen}
        onConfirm={handleConfirmSend}
        title={t('athletes.profile.questionnaires.sendConfirmTitle')}
        description={t('athletes.profile.questionnaires.sendConfirmDescription')}
        confirmText={t('athletes.profile.questionnaires.sendForm')}
        variant="default"
      />
    </div>
  );
};

export default ClientQuestionnairesPage;
