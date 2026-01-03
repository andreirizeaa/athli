'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { PageHeader } from '@/components/app/page-header';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, UserPlus } from 'lucide-react';
import { useCoachFiles } from '@/hooks/use-coach-files';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { AddFileSidePanel } from '@/components/files/add-file-side-panel';
import { FilePreviewDialog } from '@/components/files/file-preview-dialog';
import { getFileUrl, downloadFile, isPreviewable, getFileTypeFromMime, type CoachFile } from '@/api/coach/coach-file-service';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { FileThumbnail } from '@/components/files/file-thumbnail';
import { BulkDeleteConfirmationDialog } from '@/components/app/bulk-delete-confirmation-dialog';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/general/utils';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { addFilesToClients } from '@/api/client/client-file-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import React from 'react';

const FilesPage = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { files, isLoading, uploadFile, updateFile, deleteFile: deleteFileMutation, isUploading } = useCoachFiles();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();
  const searchParams = useSearchParams();
  const [isAddFileOpen, setIsAddFileOpen] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Preview dialog state
  const [previewFile, setPreviewFile] = useState<CoachFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isFetchingPreviewUrl, setIsFetchingPreviewUrl] = useState<boolean>(false);

  // Edit file state
  const [editingFile, setEditingFile] = useState<CoachFile | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');
  const [hasEditChanges, setHasEditChanges] = useState<boolean>(false);

  // Bulk delete and Assign state
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [filesToAssign, setFilesToAssign] = useState<CoachFile[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Single delete state
  const [fileToDelete, setFileToDelete] = useState<CoachFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Auto-open add file panel if ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenAddFile();
      // Clear the query param
      window.history.replaceState({}, '', '/files');
    }
  }, [searchParams]);

  const handleOpenAddFile = () => {
    setIsAddFileOpen(true);
  };

  const handleCloseAddFile = () => {
    setIsAddFileOpen(false);
  };

  const handleFileUpload = async (file: File, fileName: string) => {
    uploadFile({ file, fileName });
    handleCloseAddFile();
  };

  const handleFileClick = async (file: CoachFile) => {
    if (isPreviewable(file.mime_type)) {
      // Open preview dialog
      setPreviewFile(file);
      setIsPreviewOpen(true);
      setIsFetchingPreviewUrl(true);
      try {
        const fileWithUrl = await getFileUrl(file.id);
        setPreviewUrl(fileWithUrl.url);
      } catch (error) {
        console.error('Failed to get file URL:', error);
        setIsPreviewOpen(false);
      } finally {
        setIsFetchingPreviewUrl(false);
      }
    } else {
      // Download directly
      try {
        await downloadFile(file.id, file.filename);
      } catch (error) {
        console.error('Failed to download file:', error);
      }
    }
  };

  const handleDownloadFromPreview = async () => {
    if (previewFile) {
      try {
        await downloadFile(previewFile.id, previewFile.filename);
      } catch (error) {
        console.error('Failed to download file:', error);
      }
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
    setPreviewUrl('');
  };

  const handleEditFile = (file: CoachFile) => {
    setEditingFile(file);
    setEditFileName(file.filename);
    setHasEditChanges(false);
  };

  const handleCloseEdit = () => {
    setEditingFile(null);
    setEditFileName('');
    setHasEditChanges(false);
  };

  const handleSaveEdit = () => {
    if (editingFile && hasEditChanges) {
      updateFile({
        fileId: editingFile.id,
        fileName: editFileName.trim(),
      });
      handleCloseEdit();
    }
  };

  const handleDeleteFile = (file: CoachFile) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteFileMutation({ fileId: fileToDelete.id }, {
        onSuccess: () => {
          toast.success(t('general.deleteSuccessName', { name: fileToDelete.filename }));
        },
        onError: () => {
          toast.error(t('general.deleteError'));
        }
      });
      setFileToDelete(null);
    }
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleClearSelected = () => {
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedFiles);
      const deleteCount = idsToDelete.length;
      await Promise.all(idsToDelete.map((id) => deleteFileMutation({ fileId: id })));

      toast.success(t('general.deleteSuccessCount', { count: deleteCount, item: deleteCount === 1 ? 'file' : 'files' }));

      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to bulk delete files:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleOpenAssignToClients = () => {
    const selectedFileItems = files.filter((f) => selectedFiles.has(f.id));
    if (selectedFileItems.length === 0) return;

    setFilesToAssign(selectedFileItems);
    setIsAssignToClientsOpen(true);
    setSelectedClientIds(new Set());
  };

  const handleRemoveFileFromAssignList = (fileId: string) => {
    setFilesToAssign((prev) => {
      const newList = prev.filter((f) => f.id !== fileId);
      if (newList.length === 0) {
        setIsAssignToClientsOpen(false);
      }
      return newList;
    });
  };

  const handleAssignFilesToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || filesToAssign.length === 0 || !user?.id) {
      return;
    }

    try {
      await addFilesToClients({
        fileIds: filesToAssign.map(f => f.id),
        clientIds: clientIds,
        coachId: user.id
      });
      setIsAssignToClientsOpen(false);
      const fileCount = filesToAssign.length;
      const clientCount = clientIds.length;

      // Remove queries to force hard refresh and loading state
      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-files', clientId] });
      });

      // Determine toast message
      if (fileCount === 1 && clientCount === 1) {
        const fileName = filesToAssign[0].filename;
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('files.assignSuccessSingle', { fileName, clientName }));
      } else if (fileCount === 1) {
        const fileName = filesToAssign[0].filename;
        toast.success(t('files.assignSuccessFileMultiClient', { fileName, count: clientCount }));
      } else if (clientCount === 1) {
        const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
        toast.success(t('files.assignSuccessMultiFileSingleClient', { count: fileCount, clientName }));
      } else {
        toast.success(`Successfully assigned ${fileCount} files to ${clientCount} clients`);
      }

      // Clear selection
      setFilesToAssign([]);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to assign files to clients:', error);
      // Optional: add toast notification here
    }
  };



  // Track changes in edit mode
  React.useEffect(() => {
    if (editingFile) {
      const hasChanges = editFileName.trim() !== editingFile.filename;
      setHasEditChanges(hasChanges);
    }
  }, [editingFile, editFileName]);



  const columns: ColumnDefinition<CoachFile>[] = [
    {
      id: 'filename',
      label: t('files.columns.fileName'),
      width: { class: 'w-[350px]', pixel: '350px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <span className="text-xs uppercase text-muted-foreground">{t('files.columns.fileName')}</span>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
          >
            <Checkbox checked={isSelected} onCheckedChange={() => handleToggleFile(row.id)} />
          </div>
          <div className="flex items-center gap-3 w-full min-w-0">
            <FileThumbnail file={row} />
            <span className="text-sm truncate">{row.filename}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      label: t('files.columns.type'),
      width: { class: 'w-[150px]', pixel: '150px' },
      renderCell: (row) => {
        const fileType = getFileTypeFromMime(row.mime_type);
        const typeLabels = {
          pdf: 'PDF',
          image: 'Image',
          video: 'Video',
          other: 'Other',
        };
        return <span className="text-sm text-muted-foreground">{typeLabels[fileType]}</span>;
      },
      getSortValue: (row) => getFileTypeFromMime(row.mime_type),
      getSearchValue: (row) => getFileTypeFromMime(row.mime_type),
    },
    {
      id: 'size',
      label: t('files.columns.size'),
      width: { class: 'w-[120px]', pixel: '120px' },
      renderCell: (row) => {
        if (!row.size) return <span className="text-sm text-muted-foreground">-</span>;
        const sizeInKB = row.size / 1024;
        const sizeInMB = sizeInKB / 1024;
        const displaySize = sizeInMB > 1 ? `${sizeInMB.toFixed(2)} MB` : `${sizeInKB.toFixed(2)} KB`;
        return <span className="text-sm text-muted-foreground">{displaySize}</span>;
      },
      getSortValue: (row) => row.size || 0,
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[50px]', pixel: '50px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
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
                  handleEditFile(row);
                }}
              >
                <Edit className="size-4 mr-2" />
                <span>{t('general.edit')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(row);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];



  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('files.title')}
        action={
          <Button onClick={handleOpenAddFile} className="gap-2">
            <Plus className="size-4" />
            <span>{t('files.addFile')}</span>
          </Button>
        }
      />

      <DataGrid
        data={files}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="files"
        searchPlaceholder={t('files.searchPlaceholder')}
        enableSearch={true}
        searchFields={['filename']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedFiles}
        onSelectionChange={setSelectedFiles}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleFileClick(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleFileClick(row);
          }
        }}

        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('files.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('files.emptyState.title')}
            subtitle="Upload and organize files to share with your clients - training plans, nutrition guides, and resources"
            action={
              <Button onClick={handleOpenAddFile} className="gap-2">
                <Plus className="size-4" />
                <span>{t('files.addFile')}</span>
              </Button>
            }
          />
        }
        selectionActions={
          selectedFiles.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
                aria-label={t('general.clearSelected', { count: selectedFiles.size })}
              >
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedFiles.size })}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleOpenAssignToClients}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                <span>{t('forms.assignToClients')}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Add File Side Panel */}
      <AddFileSidePanel
        open={isAddFileOpen}
        onOpenChange={setIsAddFileOpen}
        onUpload={handleFileUpload}
        isUploading={isUploading}
      />

      {/* Edit File Side Panel */}
      <SidePanel
        open={editingFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEdit();
          }
        }}
        title={t('files.editFile.title')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseEdit}>
              {t('general.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={!hasEditChanges}
              className="gap-2"
            >
              <Check className="size-4" />
              {t('general.save')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-file-name" className="text-sm font-medium">
              {t('files.form.fileName')}
            </label>
            <Input
              id="edit-file-name"
              value={editFileName}
              onChange={(e) => setEditFileName(e.target.value)}
              placeholder={t('files.form.fileNamePlaceholder')}
            />
          </div>
        </div>
      </SidePanel>

      {/* File Preview Dialog */}
      {isPreviewOpen && (
        <FilePreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleClosePreview}
          fileUrl={previewUrl}
          filename={previewFile?.filename || ''}
          mimeType={previewFile?.mime_type || null}
          isLoading={isFetchingPreviewUrl}
        />
      )}

      <BulkDeleteConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedFiles.size}
        itemName={t('files.title').toLowerCase()}
      />

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={fileToDelete?.filename}
        itemType="file"
      />

      {/* Assign to Clients Side Panel */}
      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('forms.assignToClientsTitle')}
        assignButtonLabel={(count) =>
          count === 1
            ? t('forms.assignToOneClient')
            : t('forms.assignToClientsCount', { count })
        }
        onAssign={handleAssignFilesToClients}
        previewComponent={
          filesToAssign.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {filesToAssign.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileThumbnail file={file} />
                    <span className="text-sm truncate">{file.filename}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFileFromAssignList(file.id)}
                    className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${file.filename}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t('forms.noFormsSelected')}
            </div>
          )
        }
      />
    </div>
  );
};

export default FilesPage;
