'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useTerminology } from '@/hooks/use-terminology';
import { Plus, Loader2, Check, X, FolderPlus, Move, Folder } from 'lucide-react';
import { useFeatureAccess, useEntitlements } from '@/lib/permissions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UpgradeDialog } from '@/components/app/upgrade-dialog';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { cn } from '@/lib/general/utils';
import { PageHeader } from '@/components/app/page-header';
import { LibrarySidebarToggle } from '../library-sidebar-toggle';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import { MoreHorizontal, Edit, Trash2, UserPlus, FileText } from 'lucide-react';
import { useCoachFiles } from '@/hooks/use-coach-files';
import { useCoachFileFolders } from '@/hooks/use-coach-file-folders';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { AddFileSidePanel } from '@/components/files/add-file-side-panel';
import { FilePreviewDialog } from '@/components/files/file-preview-dialog';
import { getFileUrl, downloadFile, isPreviewable, getFileTypeFromMime, isExternalLink, type CoachFile } from '@/api/coach/coach-file-service';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { FileThumbnail } from '@/components/files/file-thumbnail';
import { BulkDeleteConfirmationDialog } from '@/components/app/bulk-delete-confirmation-dialog';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { AssignToClientsSidePanel } from '@/components/app/assign-to-clients-side-panel';
import { addFilesToClients } from '@/api/client/client-file-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { FolderCard } from '@/components/app/folder-card';
import { CreateFolderDialog } from '@/components/app/create-folder-dialog';
import { MoveToFolderDialog } from '@/components/app/move-to-folder-dialog';
import { FolderSearchButton } from '@/components/app/folder-search-button';
import { HardDrive } from 'lucide-react';
import React from 'react';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

function formatStorageUsed(bytes: number): string {
  if (bytes === 0) return '0 KB';

  const gb = bytes / BYTES_PER_GB;
  if (gb >= 1) {
    // Show GB with 1 decimal place
    return `${Math.round(gb * 10) / 10} GB`;
  }

  const mb = bytes / BYTES_PER_MB;
  if (mb >= 1) {
    // Show MB as whole number
    return `${Math.round(mb)} MB`;
  }

  const kb = bytes / BYTES_PER_KB;
  // Show KB as whole number
  return `${Math.round(kb)} KB`;
}

function getStorageColorClass(usedBytes: number, limitGb: number): string {
  const usedGb = usedBytes / BYTES_PER_GB;
  const percentage = (usedGb / limitGb) * 100;

  if (percentage >= 100) {
    return 'text-destructive'; // Red - at limit
  }
  if (percentage >= 50) {
    return 'text-amber-600 dark:text-amber-500'; // Amber - halfway
  }
  return 'text-muted-foreground'; // Default - under 50%
}

const FilesPage = () => {
  const t = useTranslations();
  const terminology = useTerminology();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasAccess: hasFileStorageAccess } = useFeatureAccess('file_storage');
  const { storageLimit, hasUnlimitedStorage, plan } = useEntitlements();
  const { files, isLoading, uploadFile, updateFile, deleteFile: deleteFileMutation, isUploading } = useCoachFiles();
  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFile,
  } = useCoachFileFolders();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();
  const searchParams = useSearchParams();
  const [isAddFileOpen, setIsAddFileOpen] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderSearch, setFolderSearch] = useState<string>('');

  // Filter files to show only unfiled ones
  const unfiledFiles = useMemo(() => {
    return files.filter(f => !f.folder_id);
  }, [files]);

  // Get item counts for each folder
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach(f => {
      if (f.folder_id) {
        counts[f.folder_id] = (counts[f.folder_id] || 0) + 1;
      }
    });
    return counts;
  }, [files]);

  // Filter folders based on search (folder names and contents)
  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folders;
    const searchLower = folderSearch.toLowerCase();
    return folders.filter(f => {
      // Match folder name
      if (f.name.toLowerCase().includes(searchLower)) return true;
      // Match any file inside the folder
      const folderFiles = files.filter(file => file.folder_id === f.id);
      return folderFiles.some(file => file.filename.toLowerCase().includes(searchLower));
    });
  }, [folders, folderSearch, files]);

  // Calculate total storage used (only from actual files, not links)
  const { totalStorageBytes, isAtStorageLimit, canAddFiles } = useMemo(() => {
    const totalBytes = files.reduce((sum, file) => {
      // Skip external links - they don't count toward storage
      if (isExternalLink(file.file_path)) return sum;
      return sum + (file.size || 0);
    }, 0);

    const limitBytes = storageLimit * BYTES_PER_GB;
    const isAtLimit = !hasUnlimitedStorage && totalBytes >= limitBytes;
    const canAdd = hasUnlimitedStorage || totalBytes < limitBytes;

    return {
      totalStorageBytes: totalBytes,
      isAtStorageLimit: isAtLimit,
      canAddFiles: canAdd,
    };
  }, [files, storageLimit, hasUnlimitedStorage]);

  // Folder state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [fileToMove, setFileToMove] = useState<CoachFile | null>(null);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState<boolean>(false);

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
  const [folderToAssign, setFolderToAssign] = useState<{ id: string; name: string } | null>(null);

  // Single delete state
  const [fileToDelete, setFileToDelete] = useState<CoachFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Upgrade dialog state
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenAddFile();
      window.history.replaceState({}, '', '/library/files');
    }
  }, [searchParams]);

  const handleOpenAddFile = () => {
    if (!hasFileStorageAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }
    if (isAtStorageLimit) {
      toast.error(`Storage limit reached. ${plan === 'pro' ? 'Pro' : 'Your'} plan includes ${storageLimit} GB of storage.`);
      return;
    }
    setIsAddFileOpen(true);
  };

  const handleCloseAddFile = () => {
    setIsAddFileOpen(false);
  };

  const handleFileUpload = async (file: File, fileName: string) => {
    // Check if adding this file would exceed storage limit (with 0.5 GB buffer)
    if (!hasUnlimitedStorage && storageLimit > 0) {
      const maxAllowedBytes = (storageLimit + 0.5) * BYTES_PER_GB;
      const projectedTotal = totalStorageBytes + file.size;
      if (projectedTotal > maxAllowedBytes) {
        toast.error(`This file would exceed your ${storageLimit} GB storage limit.`);
        return;
      }
    }
    uploadFile({ file, fileName });
    handleCloseAddFile();
  };

  const handleFileClick = async (file: CoachFile) => {
    if (isExternalLink(file.file_path)) {
      window.open(file.file_path, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isPreviewable(file.mime_type)) {
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
      try {
        await downloadFile(file.id, file.filename);
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
      if (newSet.has(fileId)) newSet.delete(fileId);
      else newSet.add(fileId);
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
  };

  const handleRemoveFileFromAssignList = (fileId: string) => {
    setFilesToAssign((prev) => {
      const newList = prev.filter((f) => f.id !== fileId);
      if (newList.length === 0) setIsAssignToClientsOpen(false);
      return newList;
    });
  };

  const handleAssignFilesToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || filesToAssign.length === 0 || !user?.id) return;

    try {
      const result = await addFilesToClients({
        fileIds: filesToAssign.map(f => f.id),
        clientIds: clientIds,
        coachId: user.id
      });
      setIsAssignToClientsOpen(false);
      setFolderToAssign(null);

      clientIds.forEach(clientId => {
        queryClient.removeQueries({ queryKey: ['client-files', clientId] });
      });

      // Show summary toast based on result
      if (result.skipped > 0 && result.added > 0) {
        toast.success(`${result.added} file${result.added !== 1 ? 's' : ''} added, ${result.skipped} skipped (already assigned)`);
      } else if (result.skipped > 0 && result.added === 0) {
        toast.info(`All ${result.skipped} file${result.skipped !== 1 ? 's were' : ' was'} already assigned`);
      } else if (result.added > 0) {
        const clientCount = clientIds.length;
        if (result.added === 1 && clientCount === 1) {
          const fileName = filesToAssign[0].filename;
          const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
          toast.success(t('files.assignSuccessSingle', { fileName, clientName }));
        } else if (clientCount === 1) {
          const clientName = clients.find(c => c.id === clientIds[0])?.name || 'Client';
          toast.success(t('files.assignSuccessMultiFileSingleClient', { count: result.added, clientName }));
        } else {
          toast.success(`${result.added} file${result.added !== 1 ? 's' : ''} assigned to ${clientCount} client${clientCount !== 1 ? 's' : ''}`);
        }
      }

      setFilesToAssign([]);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to assign files to clients:', error);
      toast.error('Failed to assign files');
    }
  };

  // Folder handlers
  const handleCreateFolder = async (name: string) => {
    await createFolder({ name });
  };

  const handleUpdateFolder = async (name: string) => {
    if (!editingFolder) return;
    await updateFolder({ id: editingFolder.id, data: { name } });
    setEditingFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t('general.deleteError'));
    }
  };

  const handleMoveFile = async (folderId: string | null) => {
    if (!fileToMove) return;
    await moveFile({ fileId: fileToMove.id, folderId });
    setFileToMove(null);
  };

  const handleBulkMove = async (folderId: string | null) => {
    const idsToMove = Array.from(selectedFiles);
    await Promise.all(idsToMove.map((id) => moveFile({ fileId: id, folderId })));
    setSelectedFiles(new Set());
    setIsBulkMoveOpen(false);
  };

  const handleFolderClick = (folderId: string) => {
    router.push(`/files/folder/${folderId}`);
  };

  const handleAssignFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderFiles = files.filter(f => f.folder_id === folderId);
    if (folderFiles.length === 0) {
      toast.error('This folder is empty');
      return;
    }
    setFolderToAssign({ id: folder.id, name: folder.name });
    setFilesToAssign(folderFiles);
    setIsAssignToClientsOpen(true);
  };

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
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
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
        if (isExternalLink(row.file_path)) {
          return <span className="text-sm text-muted-foreground">Link</span>;
        }
        const fileType = getFileTypeFromMime(row.mime_type);
        const typeLabels: Record<string, string> = { pdf: 'PDF', image: 'Image', video: 'Video', other: 'Other' };
        return <span className="text-sm text-muted-foreground">{typeLabels[fileType]}</span>;
      },
      getSortValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type),
      getSearchValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type),
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[50px]', pixel: '50px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditFile(row); }}>
                <Edit className="size-4 mr-2" />
                <span>{t('general.edit')}</span>
              </DropdownMenuItem>
              {folders.length > 0 && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setFileToMove(row); }}>
                  <Move className="size-4 mr-2" />
                  <span>Move to folder</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteFile(row); }} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4 mr-2 text-destructive" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filters: FilterDefinition<CoachFile>[] = [
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
      getFilterValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
        <PageHeader
          title={t('files.title')}
          leading={<LibrarySidebarToggle />}
          action={
          <ButtonGroup>
            <FolderSearchButton
              value={folderSearch}
              onChange={setFolderSearch}
            />
            <Button variant="ghost" onClick={() => {
              if (!hasFileStorageAccess) {
                setIsUpgradeDialogOpen(true);
                return;
              }
              setIsCreateFolderOpen(true);
            }} className="gap-2 border border-primary">
              <FolderPlus className="size-4" />
              <span>Create Folder</span>
            </Button>
            <Button
              onClick={handleOpenAddFile}
              className="gap-2"
              disabled={hasFileStorageAccess && isAtStorageLimit}
            >
              <Plus className="size-4" />
              <span>{t('files.addFile')}</span>
            </Button>
          </ButtonGroup>
        }
      />

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="px-4 pt-3 pb-1 overflow-x-auto flex-shrink-0">
          <div className="flex gap-3 min-h-[72px] items-center">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  name={folder.name}
                  itemCount={folderItemCounts[folder.id] || 0}
                  onClick={() => handleFolderClick(folder.id)}
                  onEdit={() => setEditingFolder({ id: folder.id, name: folder.name })}
                  onDelete={() => setFolderToDelete(folder.id)}
                  onAssign={() => handleAssignFolder(folder.id)}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No folders match your search</span>
            )}
          </div>
        </div>
      )}

      <DataGrid
        data={unfiledFiles}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="files"
        searchPlaceholder={t('files.searchPlaceholder')}
        enableSearch={true}
        searchFields={['filename']}
        filters={filters}
        enableEditColumns={false}
        enableExport={false}
        filterBarPrefix={
          hasFileStorageAccess && storageLimit > 0 && !hasUnlimitedStorage ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background h-9 px-4 py-2 cursor-default",
                  getStorageColorClass(totalStorageBytes, storageLimit)
                )}>
                  <HardDrive className="size-4" />
                  <span>{formatStorageUsed(totalStorageBytes)} / {storageLimit} GB</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {formatStorageUsed(totalStorageBytes)} used out of the available {storageLimit} GB
              </TooltipContent>
            </Tooltip>
          ) : null
        }
        enableRowSelection={true}
        selectedRowIds={selectedFiles}
        onSelectionChange={setSelectedFiles}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) return;
          handleFileClick(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) return;
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
            action={<Button onClick={handleOpenAddFile} className="gap-2" disabled={hasFileStorageAccess && isAtStorageLimit}><Plus className="size-4" /><span>{t('files.addFile')}</span></Button>}
          />
        }
        selectionActions={
          selectedFiles.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={handleClearSelected} className="gap-2"><X className="size-4" /><span>{t('general.clearSelected', { count: selectedFiles.size })}</span></Button>
              <Button variant="ghost" onClick={handleOpenAssignToClients} className="gap-2"><UserPlus className="size-4" /><span>{terminology.assignToPlural}</span></Button>
              {folders.length > 0 && <Button variant="ghost" onClick={() => setIsBulkMoveOpen(true)} className="gap-2"><Move className="size-4" /><span>Move</span></Button>}
              <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /><span>{t('general.delete')}</span></Button>
            </div>
          ) : undefined
        }
      />

      <AddFileSidePanel open={isAddFileOpen} onOpenChange={setIsAddFileOpen} onUpload={handleFileUpload} onLinkCreated={() => queryClient.invalidateQueries({ queryKey: ['coach-files'] })} isUploading={isUploading} />

      <SidePanel open={editingFile !== null} onOpenChange={(open) => { if (!open) handleCloseEdit(); }} title={t('files.editFile.title')}
        footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="outline" onClick={handleCloseEdit}>{t('general.cancel')}</Button><Button type="button" onClick={handleSaveEdit} disabled={!hasEditChanges} className="gap-2"><Check className="size-4" />{t('general.save')}</Button></div>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-file-name" className="text-sm font-medium">{t('files.form.fileName')}</label>
            <Input id="edit-file-name" value={editFileName} onChange={(e) => setEditFileName(e.target.value)} placeholder={t('files.form.fileNamePlaceholder')} />
          </div>
        </div>
      </SidePanel>

      {isPreviewOpen && (
        <FilePreviewDialog open={isPreviewOpen} onOpenChange={handleClosePreview} fileUrl={previewUrl} filename={previewFile?.filename || ''} mimeType={previewFile?.mime_type || null} isLoading={isFetchingPreviewUrl} />
      )}

      <BulkDeleteConfirmationDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen} onConfirm={handleBulkDelete} count={selectedFiles.size} itemName={t('files.title').toLowerCase()} />
      <ConfirmDeleteDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={handleConfirmDelete} itemName={fileToDelete?.filename} itemType="file" />

      {/* Folder dialogs */}
      <CreateFolderDialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen} onSave={handleCreateFolder} title="Create Folder" />
      <CreateFolderDialog open={editingFolder !== null} onOpenChange={(open) => !open && setEditingFolder(null)} onSave={handleUpdateFolder} title="Edit Folder" initialName={editingFolder?.name || ''} isEdit={true} />
      <ConfirmDeleteDialog open={folderToDelete !== null} onOpenChange={(open) => !open && setFolderToDelete(null)} onConfirm={handleDeleteFolder} itemName={folders.find(f => f.id === folderToDelete)?.name} itemType="folder" />
      <MoveToFolderDialog open={fileToMove !== null} onOpenChange={(open) => !open && setFileToMove(null)} folders={folders} currentFolderId={fileToMove?.folder_id} onMove={handleMoveFile} itemName={fileToMove?.filename} />
      <MoveToFolderDialog open={isBulkMoveOpen} onOpenChange={setIsBulkMoveOpen} folders={folders} onMove={handleBulkMove} />

      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={(open) => {
          setIsAssignToClientsOpen(open);
          if (!open) setFolderToAssign(null);
        }}
        title={`Assign files to ${terminology.pluralLower}`}
        assignButtonLabel={(count) => terminology.assignToCountLabel(count)}
        onAssign={handleAssignFilesToClients}
        previewComponent={
          folderToAssign ? (
            <div className="border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Folder className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{folderToAssign.name}</span>
                  <p className="text-xs text-muted-foreground">{filesToAssign.length} {filesToAssign.length === 1 ? 'file' : 'files'}</p>
                </div>
              </div>
            </div>
          ) : filesToAssign.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {filesToAssign.map((file) => (
                <div key={file.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0"><FileThumbnail file={file} /><span className="text-sm truncate">{file.filename}</span></div>
                  <button type="button" onClick={() => handleRemoveFileFromAssignList(file.id)} className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-muted-foreground py-4 text-center">{t('forms.noFormsSelected')}</div>
        }
      />

      <UpgradeDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        description="Upload and share files with your clients - training plans, nutrition guides, and resources."
      />
    </div>
  );
};

export default FilesPage;
