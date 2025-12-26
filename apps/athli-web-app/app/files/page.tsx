'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
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
import { AddFileSidePanel } from '@/components/files/add-file-side-panel';
import { FilePreviewDialog } from '@/components/files/file-preview-dialog';
import { getFileUrl, downloadFile, isPreviewable, getFileTypeFromMime, type CoachFile } from '@/api/coach/coach-file-service';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { FileThumbnail } from '@/components/files/file-thumbnail';
import { BulkDeleteConfirmationDialog } from '@/components/app/bulk-delete-confirmation-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockAthletes } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';
import React from 'react';

const FilesPage = () => {
  const t = useTranslations();
  const { files, isLoading, uploadFile, updateFile, deleteFile: deleteFileMutation, isUploading } = useCoachFiles();

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

  const handleDeleteFile = (fileId: string) => {
    deleteFileMutation({ fileId });
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
      await Promise.all(idsToDelete.map((id) => deleteFileMutation({ fileId: id })));
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to bulk delete files:', error);
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

  const handleAssignFilesToClients = async () => {
    // Mocked implementation as requested
    console.log('Assigning files:', filesToAssign.map(f => f.id), 'to clients:', Array.from(selectedClientIds));
    setIsAssignToClientsOpen(false);
    setFilesToAssign([]);
    setSelectedFiles(new Set());
    setSelectedClientIds(new Set());
  };

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

  // Track changes in edit mode
  React.useEffect(() => {
    if (editingFile) {
      const hasChanges = editFileName.trim() !== editingFile.filename;
      setHasEditChanges(hasChanges);
    }
  }, [editingFile, editFileName]);

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
        <span className="text-xs uppercase text-muted-foreground">{t('files.columns.fileName')}</span>
      </div>
    );
  };

  const renderFirstColumn = (row: CoachFile, isSelected: boolean) => {
    return (
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
    );
  };

  const columns: ColumnDefinition<CoachFile>[] = [
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
                  handleDeleteFile(row.id);
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

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
        firstColumnId="filename"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('files.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('files.emptyState.title')}
            subtitle={t('files.emptyState.subtitle')}
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
              >
                <span>Clear {selectedFiles.size} selected</span>
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
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={!hasEditChanges}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseEdit}>
              {t('general.cancel')}
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

      {/* Assign to Clients Side Panel */}
      <SidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={t('forms.assignToClientsTitle')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleAssignFilesToClients}
              disabled={selectedClientIds.size === 0 || filesToAssign.length === 0}
            >
              {selectedClientIds.size === 1
                ? t('forms.assignToOneClient')
                : t('forms.assignToClientsCount', { count: selectedClientIds.size })}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsAssignToClientsOpen(false)}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 h-full">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-sm font-medium">{t('files.title')}</label>
            {filesToAssign.length > 0 ? (
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
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <label className="text-sm font-medium">{t('athletes.title')}</label>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataGrid
                data={mockAthletes}
                columns={[
                  {
                    id: 'name',
                    label: t('athletes.title'),
                    icon: <UserPlus className="size-3" />,
                    width: { class: 'w-full', pixel: '100%' },
                    getSortValue: (row) => row.name.toLowerCase(),
                    getSearchValue: (row) => `${row.name} ${row.email} ${row.country}`,
                  },
                ]}
                getRowId={(row) => row.id}
                gridKey="assign-files-to-clients"
                searchPlaceholder={t('forms.searchAthletes')}
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
                firstColumnId="name"
                stickyFirstColumn={true}
                firstColumnWidth="100%"
                hideFirstColumnBorder={true}
                renderFirstColumn={(row, isSelected) => {
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
                          <AvatarImage src={row.avatar} alt={row.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn('truncate text-sm font-medium')}>{row.name}</span>
                      </div>
                    </div>
                  );
                }}
                renderFirstColumnHeader={({ isAllSelected, onToggleAll }) => {
                  return (
                    <div className="flex items-center gap-3 h-full w-full">
                      <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                      <div className="flex items-center gap-2">
                        <UserPlus className="size-3 text-muted-foreground" />
                        <span className="text-xs uppercase text-muted-foreground">{t('athletes.title')}</span>
                      </div>
                    </div>
                  );
                }}
                emptyMessage={t('forms.noAthletesFound')}
                rowHeight="54px"
                compactMode={true}
                showPagination={true}
                itemsPerPage={10}
                gridPadding={true}
              />
            </div>
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default FilesPage;
