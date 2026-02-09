'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, FileText, X, Tag as TagIcon, MoreHorizontal, Edit, Trash2 as Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { uploadFile, updateFile, deleteFile, getFileTypeFromMime, isExternalLink } from '@/api/coach/coach-file-service';
import { deleteClientFiles, addFilesToClient, uploadClientFile, getClientFileUrl, downloadClientFile, isPreviewable } from '@/api/client/client-file-service';
import { getClientFiles } from '@/api/coach/coach-client-service';
import { AddFileSidePanel } from '@/components/files/add-file-side-panel';
import { FilePreviewDialog } from '@/components/files/file-preview-dialog';
import { ClientFileThumbnail } from '@/components/files/client-file-thumbnail';
import { useClientFiles } from '@/hooks/use-client-files';
import { useClientProfileContext } from '../client-profile-context';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';

type FileType = 'pdf' | 'image' | 'video' | 'document' | 'spreadsheet' | 'other';

type FileItem = {
  id: string;
  fileName: string;
  filename: string; // For FileThumbnail compatibility
  type: FileType;
  tags: string[];
  pinned: boolean;
  mime_type?: string;
  size?: number;
  file_path?: string;
};

// Mock data removed

const ClientFilesPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;

  const { user } = useUserProfile();
  const { files: filesFromContext, isLoading: isLoadingContext, refreshData } = useClientProfileContext();
  const { files: filesFromHook, isLoading: isLoadingHook, refetch } = useClientFiles(clientId);

  const rawFiles = filesFromContext.length > 0 ? filesFromContext : filesFromHook;
  const isLoading = isLoadingContext || isLoadingHook;

  const [isAddFileOpen, setIsAddFileOpen] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState<boolean>(false);

  // Edit file state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  // Preview dialog state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const itemsPerPage = 25;

  const getFileType = (fileName: string | undefined): FileType => {
    if (!fileName) return 'other';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
    if (['doc', 'docx'].includes(ext || '')) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
    return 'other';
  };

  const files = useMemo(() => {
    return rawFiles.map((item: any) => {
      const fileName = item.filename || item.fileName || item.name || 'Untitled';
      return {
        id: item.assignment_id || item.id,
        fileName,
        filename: fileName, // Add this for FileThumbnail compatibility
        type: getFileType(fileName),
        tags: item.tags || [],
        pinned: item.is_pinned || false,
        url: item.url,
        mime_type: item.mime_type,
        size: item.size,
        file_path: item.file_path,
      };
    });
  }, [rawFiles]);

  const clientName = '';

  const handleOpenAddFile = () => {
    setIsAddFileOpen(true);
  };

  const handleSaveFile = async (file: File, fileName: string, tags: string[]) => {
    if (!clientId || !user?.id) return;
    try {
      // Direct upload for client
      await uploadClientFile({
        file,
        fileName: fileName.trim(),
        tags,
        clientId,
        coachId: user.id
      });

      // 3. Update local state
      refetch();
      refreshData?.();

      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to add file:', error);
      // TODO: Show error toast
    }
  };

  const handleAssignExistingFiles = async (fileIds: string[]) => {
    if (!clientId || !user?.id) return;

    try {
      await addFilesToClient({
        fileIds,
        clientId,
        coachId: user.id,
      });

      refetch();
      refreshData?.();
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to assign files:', error);
      // TODO: Show error toast
    }
  };

  const handleClearSelected = () => {
    setSelectedFiles(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return;
    setIsBulkDelete(true);
    setFileToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientId || !user?.id) return;

    try {
      if (isBulkDelete) {
        await deleteClientFiles({
          fileIds: Array.from(selectedFiles),
          clientId: clientId,
          coachId: user.id,
        });
        setSelectedFiles(new Set());
      } else if (fileToDelete) {
        await deleteClientFiles({
          fileIds: [fileToDelete.id],
          clientId: clientId,
          coachId: user.id,
        });
      }

      refetch();
      refreshData?.();
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Failed to delete files:', error);
    }
  };

  const handleFileClick = async (file: FileItem) => {
    if (!clientId || !user?.id) return;

    // Handle external links - open in new tab
    if (isExternalLink(file.file_path)) {
      window.open(file.file_path, '_blank', 'noopener,noreferrer');
      return;
    }

    const fileType = getFileTypeFromMime(file.mime_type || null);

    // For PDFs, open in new tab
    if (fileType === 'pdf') {
      try {
        const fileWithUrl = await getClientFileUrl(file.id, clientId, user.id);
        window.open(fileWithUrl.url, '_blank');
      } catch (error) {
        console.error('Failed to get PDF URL:', error);
      }
      return;
    }

    // For images and videos, fetch URL first then show preview dialog
    if (fileType === 'image' || fileType === 'video') {
      try {
        const fileWithUrl = await getClientFileUrl(file.id, clientId, user.id);
        setPreviewFile(file);
        setPreviewUrl(fileWithUrl.url);
        setIsPreviewOpen(true);
      } catch (error) {
        console.error('Failed to get file URL:', error);
      }
      return;
    }

    // For other file types, download directly
    try {
      await downloadClientFile(file.id, file.fileName, clientId, user.id);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
    setPreviewUrl('');
  };

  const handleEditFile = (file: FileItem) => {
    setEditingFileId(file.id);
    setRowMenuOpenId(null);
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
    setIsBulkDelete(false);
    setIsDeleteDialogOpen(true);
    setRowMenuOpenId(null);
  };

  const handleSaveEdit = async (fileName: string, tags: string[]) => {
    if (!editingFileId) return;

    try {
      await updateFile({
        fileId: editingFileId,
        fileName: fileName.trim(),
        // tags: tags, // Update service doesn't support tags yet
      });

      refetch();
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to update file:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteEdit = async () => {
    if (!editingFileId || !editingFile) return;
    handleDeleteFile(editingFile);
    setEditingFileId(null);
  };

  const editingFile = editingFileId ? files.find((f) => f.id === editingFileId) : null;

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

  // Create column definitions
  const columns: ColumnDefinition<FileItem>[] = [
    {
      id: 'fileName',
      label: t('files.columns.fileName'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('files.columns.fileName')}</span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => {
        if (!clientId || !user?.id) return null;

        return (
          <div className="flex items-center gap-3 h-full w-full">
            <div
              className="flex items-center justify-center h-full flex-shrink-0"
              data-no-row-link="true"
            >
              <Checkbox checked={isSelected} onCheckedChange={() => handleToggleFile(row.id)} />
            </div>
            <div className="flex items-center gap-3 w-full min-w-0">
              <ClientFileThumbnail
                file={row as any}
                clientId={clientId}
                coachId={user.id}
              />
              <span className="text-sm truncate">{row.fileName}</span>
            </div>
          </div>
        );
      },
      getSortValue: (row) => row.fileName.toLowerCase(),
      getSearchValue: (row) => row.fileName,
    },
    {
      id: 'type',
      label: t('files.columns.type'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[150px]', pixel: '150px' },
      renderCell: (row) => {
        // Check for external link first
        if (isExternalLink(row.file_path)) {
          return (
            <div className="flex items-center w-full">
              <span className="text-sm text-muted-foreground">Link</span>
            </div>
          );
        }
        const fileType = getFileTypeFromMime(row.mime_type || null);
        const typeLabels = {
          pdf: 'PDF',
          image: 'Image',
          video: 'Video',
          other: 'Other',
        };
        return (
          <div className="flex items-center w-full">
            <span className="text-sm text-muted-foreground">{typeLabels[fileType]}</span>
          </div>
        );
      },
      getSortValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type || null),
      getSearchValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type || null),
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[26px]', pixel: '26px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-action-menu="true">
          <DropdownMenu open={rowMenuOpenId === row.id} onOpenChange={(open) => setRowMenuOpenId(open ? row.id : null)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setRowMenuOpenId(row.id);
                }}
                aria-label={t('files.actions.moreOptions', { fileName: row.fileName })}
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
                <Trash2Icon className="size-4 mr-2 text-destructive" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Create filter definitions
  const filters: FilterDefinition<FileItem>[] = [
    {
      id: 'type',
      label: t('files.columns.type'),
      icon: <FileText className="size-4" />,
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
        { value: 'link', label: 'Link' },
        { value: 'other', label: 'Other' },
      ],
      getFilterValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type || null),
    },
  ];

  // Sort files - pinned first, then by fileName
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.fileName.localeCompare(b.fileName);
    });
  }, [files]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no files and no loading, show empty state inside DataGrid via emptyState prop or wrapper.
  // The DataGrid supports emptyState. But currently `files` is empty array, so DataGrid will show emptyMessage or emptyState.
  // The current code passes `emptyState` to DataGrid. So validation should be fine.

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={sortedFiles}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`client-files-${clientId}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder={t('files.searchPlaceholder')}
        searchFields={[(row) => row.fileName]}
        filters={filters}
        showLastColumnDivider={false}
        filterBarActions={
          <Button onClick={handleOpenAddFile} className="gap-2">
            <Plus className="size-4" />
            <span>{t('files.addFile')}</span>
          </Button>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedFiles}
        onSelectionChange={setSelectedFiles}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]') || targetElement.closest('[data-action-menu="true"]')) {
            return;
          }
          handleFileClick(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]') || targetElement.closest('[data-action-menu="true"]')) {
              return;
            }
            event.preventDefault();
            handleFileClick(row);
          }
        }}
        defaultColumnOrder={['fileName', 'type', 'actions']}
        defaultVisibleColumns={['fileName', 'type', 'actions']}
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
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedFiles.size })}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeleteSelected}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
      />
      <AddFileSidePanel
        open={isAddFileOpen}
        onOpenChange={setIsAddFileOpen}
        onUpload={handleSaveFile}
        onSave={handleAssignExistingFiles}
        onLinkCreated={() => {
          refetch();
          refreshData?.();
        }}
        clientName={clientName}
        clientId={clientId}
      />

      {editingFile && (
        <AddFileSidePanel
          open={editingFileId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingFileId(null);
            }
          }}
          onUpload={async () => {}}
          editingFileId={editingFileId}
          editingFileName={editingFile.fileName}
          editingTags={editingFile.tags}
          onEditSave={handleSaveEdit}
          onEditDelete={handleDeleteEdit}
        />
      )}

      {isPreviewOpen && (
        <FilePreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleClosePreview}
          fileUrl={previewUrl}
          filename={previewFile?.fileName || ''}
          mimeType={previewFile?.mime_type || null}
          isLoading={false}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={fileToDelete?.fileName}
        count={selectedFiles.size}
        itemType="file"
        variant="default"
      />
    </div>
  );
};

export default ClientFilesPage;
