'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useTerminology } from '@/hooks/use-terminology';
import { Plus, Check, X, ChevronRight, Edit, Move, UserPlus } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import { MoreHorizontal, Trash2, FileText } from 'lucide-react';
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
import { CreateFolderDialog } from '@/components/app/create-folder-dialog';
import { MoveToFolderDialog } from '@/components/app/move-to-folder-dialog';
import React from 'react';

const FileFolderPage = () => {
  const params = useParams();
  const folderId = params.folderId as string;
  const t = useTranslations();
  const terminology = useTerminology();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { files, uploadFileAsync, updateFile, deleteFile: deleteFileMutation, isUploading } = useCoachFiles();
  const { folders, updateFolder, deleteFolder, moveFile } = useCoachFileFolders();
  const { clients } = useCoachClients();
  const { user } = useUserProfile();

  const currentFolder = useMemo(() => folders.find(f => f.id === folderId), [folders, folderId]);
  const folderFiles = useMemo(() => files.filter(f => f.folder_id === folderId), [files, folderId]);

  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<CoachFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFetchingPreviewUrl, setIsFetchingPreviewUrl] = useState(false);
  const [editingFile, setEditingFile] = useState<CoachFile | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [hasEditChanges, setHasEditChanges] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState(false);
  const [filesToAssign, setFilesToAssign] = useState<CoachFile[]>([]);
  const [fileToDelete, setFileToDelete] = useState<CoachFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<CoachFile | null>(null);

  React.useEffect(() => {
    if (editingFile) {
      setHasEditChanges(editFileName.trim() !== editingFile.filename);
    }
  }, [editingFile, editFileName]);

  const handleFileUpload = async (file: File, fileName: string) => {
    try {
      const uploadedFile = await uploadFileAsync({ file, fileName });
      await moveFile({ fileId: uploadedFile.id, folderId, silent: true });
      toast.success('File added successfully');
    } catch (error) {
      // Error toast is handled by the mutation
    } finally {
      setIsAddFileOpen(false);
    }
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

  const handleEditFile = (file: CoachFile) => {
    setEditingFile(file);
    setEditFileName(file.filename);
    setHasEditChanges(false);
  };

  const handleSaveEdit = () => {
    if (editingFile && hasEditChanges) {
      updateFile({ fileId: editingFile.id, fileName: editFileName.trim() });
      setEditingFile(null);
      setEditFileName('');
      setHasEditChanges(false);
    }
  };

  const handleDeleteFile = (file: CoachFile) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteFileMutation({ fileId: fileToDelete.id }, {
        onSuccess: () => toast.success(t('general.deleteSuccessName', { name: fileToDelete.filename })),
        onError: () => toast.error(t('general.deleteError'))
      });
      setFileToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedFiles);
      await Promise.all(idsToDelete.map(id => deleteFileMutation({ fileId: id })));
      toast.success(t('general.deleteSuccessCount', { count: idsToDelete.length, item: idsToDelete.length === 1 ? 'file' : 'files' }));
      setSelectedFiles(new Set());
    } catch (error) {
      toast.error(t('general.deleteError'));
    }
  };

  const handleAssignToClients = () => {
    const selectedFileItems = folderFiles.filter(f => selectedFiles.has(f.id));
    if (selectedFileItems.length === 0) return;
    setFilesToAssign(selectedFileItems);
    setIsAssignToClientsOpen(true);
  };

  const handleAssignFolderToClients = () => {
    if (folderFiles.length === 0) { toast.error('This folder is empty'); return; }
    setFilesToAssign(folderFiles);
    setIsAssignToClientsOpen(true);
  };

  const handleAssignFilesToClients = async (clientIds: string[]) => {
    if (clientIds.length === 0 || filesToAssign.length === 0 || !user?.id) return;

    try {
      const result = await addFilesToClients({ fileIds: filesToAssign.map(f => f.id), clientIds, coachId: user.id });
      setIsAssignToClientsOpen(false);
      clientIds.forEach(clientId => queryClient.removeQueries({ queryKey: ['client-files', clientId] }));

      // Show summary toast based on result
      if (result.skipped > 0 && result.added > 0) {
        toast.success(`${result.added} file${result.added !== 1 ? 's' : ''} added, ${result.skipped} skipped (already assigned)`);
      } else if (result.skipped > 0 && result.added === 0) {
        toast.info(`All ${result.skipped} file${result.skipped !== 1 ? 's were' : ' was'} already assigned`);
      } else if (result.added > 0) {
        toast.success(`${result.added} file${result.added !== 1 ? 's' : ''} assigned to ${clientIds.length} client${clientIds.length !== 1 ? 's' : ''}`);
      }

      setFilesToAssign([]);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to assign files to clients:', error);
      toast.error('Failed to assign files');
    }
  };

  const handleUpdateFolder = async (name: string) => {
    if (!currentFolder) return;
    await updateFolder({ id: currentFolder.id, data: { name } });
    setIsEditFolderOpen(false);
  };

  const handleDeleteFolder = async () => {
    if (!currentFolder) return;
    try {
      await deleteFolder(currentFolder.id);
      router.push('/library/files');
    } catch (error) {
      toast.error(t('general.deleteError'));
    }
  };

  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!fileToMove) return;
    await moveFile({ fileId: fileToMove.id, folderId: targetFolderId });
    setFileToMove(null);
  };

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
            <Checkbox checked={isSelected} onCheckedChange={() => { const newSet = new Set(selectedFiles); if (newSet.has(row.id)) newSet.delete(row.id); else newSet.add(row.id); setSelectedFiles(newSet); }} />
          </div>
          <div className="flex items-center gap-3 w-full min-w-0"><FileThumbnail file={row} /><span className="text-sm truncate">{row.filename}</span></div>
        </div>
      ),
    },
    {
      id: 'type',
      label: t('files.columns.type'),
      width: { class: 'w-[150px]', pixel: '150px' },
      renderCell: (row) => {
        if (isExternalLink(row.file_path)) return <span className="text-sm text-muted-foreground">Link</span>;
        const fileType = getFileTypeFromMime(row.mime_type);
        const typeLabels: Record<string, string> = { pdf: 'PDF', image: 'Image', video: 'Video', other: 'Other' };
        return <span className="text-sm text-muted-foreground">{typeLabels[fileType]}</span>;
      },
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[50px]', pixel: '50px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditFile(row); }}><Edit className="size-4 mr-2" /><span>{t('general.edit')}</span></DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setFileToMove(row); }}><Move className="size-4 mr-2" /><span>Move</span></DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteFile(row); }} className="text-destructive focus:text-destructive"><Trash2 className="size-4 mr-2 text-destructive" /><span>{t('general.delete')}</span></DropdownMenuItem>
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
      options: [{ value: 'pdf', label: 'PDF' }, { value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }, { value: 'link', label: 'Link' }, { value: 'other', label: 'Other' }],
      getFilterValue: (row) => isExternalLink(row.file_path) ? 'link' : getFileTypeFromMime(row.mime_type),
    },
  ];

  // Redirect if folder not found
  React.useEffect(() => {
    if (!currentFolder) {
      router.push('/library/files');
    }
  }, [currentFolder, router]);

  if (!currentFolder) {
    return null;
  }

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      {/* Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => router.push('/library/files')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('files.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 font-semibold text-foreground">
                    {currentFolder?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">{currentFolder?.name}</h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button variant="ghost" onClick={() => setIsEditFolderOpen(true)} className="gap-2 border border-primary"><Edit className="size-4" /><span>Edit Folder</span></Button>
            <Button variant="ghost" onClick={handleAssignFolderToClients} className="gap-2 border border-primary"><UserPlus className="size-4" /><span>Assign Folder</span></Button>
            <Button onClick={() => setIsAddFileOpen(true)} className="gap-2"><Plus className="size-4" /><span>{t('files.addFile')}</span></Button>
          </ButtonGroup>
        </div>
        <div className="border-b" />
      </div>

      <DataGrid
        data={folderFiles}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`files-folder-${folderId}`}
        searchPlaceholder={t('files.searchPlaceholder')}
        enableSearch={true}
        searchFields={['filename']}
        filters={filters}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedFiles}
        onSelectionChange={setSelectedFiles}
        onRowClick={(row, event) => { if (!(event.target as HTMLElement).closest('[data-no-row-link="true"]')) handleFileClick(row); }}
        onRowKeyDown={(row, event) => { if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).closest('[data-no-row-link="true"]')) { event.preventDefault(); handleFileClick(row); } }}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage="No files in this folder"
        emptyState={<EmptyGridState title="No files in this folder" subtitle="Upload files to this folder to organize your library" action={<Button onClick={() => setIsAddFileOpen(true)} className="gap-2"><Plus className="size-4" /><span>{t('files.addFile')}</span></Button>} />}
        selectionActions={selectedFiles.size > 0 ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => setSelectedFiles(new Set())} className="gap-2"><X className="size-4" /><span>{t('general.clearSelected', { count: selectedFiles.size })}</span></Button>
            <Button variant="ghost" onClick={handleAssignToClients} className="gap-2"><UserPlus className="size-4" /><span>{terminology.assignToPlural}</span></Button>
            <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /><span>{t('general.delete')}</span></Button>
          </div>
        ) : undefined}
      />

      <AddFileSidePanel
        open={isAddFileOpen}
        onOpenChange={setIsAddFileOpen}
        onUpload={handleFileUpload}
        onLinkCreated={async (newLink) => {
          // Move the newly created link to this folder
          await moveFile({ fileId: newLink.id, folderId, silent: true });
          queryClient.invalidateQueries({ queryKey: ['coach-files'] });
        }}
        isUploading={isUploading}
      />

      <SidePanel open={editingFile !== null} onOpenChange={(open) => { if (!open) { setEditingFile(null); setEditFileName(''); setHasEditChanges(false); } }} title={t('files.editFile.title')}
        footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setEditingFile(null); setEditFileName(''); setHasEditChanges(false); }}>{t('general.cancel')}</Button><Button type="button" onClick={handleSaveEdit} disabled={!hasEditChanges} className="gap-2"><Check className="size-4" />{t('general.save')}</Button></div>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-file-name" className="text-sm font-medium">{t('files.form.fileName')}</label>
            <Input id="edit-file-name" value={editFileName} onChange={(e) => setEditFileName(e.target.value)} placeholder={t('files.form.fileNamePlaceholder')} />
          </div>
        </div>
      </SidePanel>

      {isPreviewOpen && (<FilePreviewDialog open={isPreviewOpen} onOpenChange={() => { setIsPreviewOpen(false); setPreviewFile(null); setPreviewUrl(''); }} fileUrl={previewUrl} filename={previewFile?.filename || ''} mimeType={previewFile?.mime_type || null} isLoading={isFetchingPreviewUrl} />)}

      <BulkDeleteConfirmationDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen} onConfirm={handleBulkDelete} count={selectedFiles.size} itemName={t('files.title').toLowerCase()} />
      <ConfirmDeleteDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={handleConfirmDelete} itemName={fileToDelete?.filename} itemType="file" />
      <CreateFolderDialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen} onSave={handleUpdateFolder} title="Edit Folder" initialName={currentFolder?.name || ''} isEdit={true} />
      <MoveToFolderDialog open={fileToMove !== null} onOpenChange={(open) => !open && setFileToMove(null)} folders={folders} currentFolderId={folderId} onMove={handleMoveFile} itemName={fileToMove?.filename} />

      <AssignToClientsSidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title={`Assign files to ${terminology.pluralLower}`}
        assignButtonLabel={(count) => terminology.assignToCountLabel(count)}
        onAssign={handleAssignFilesToClients}
        previewComponent={filesToAssign.length > 0 ? (
          <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
            {filesToAssign.map((file) => (<div key={file.id} className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3 flex-1 min-w-0"><FileThumbnail file={file} /><span className="text-sm truncate">{file.filename}</span></div><button type="button" onClick={() => setFilesToAssign(prev => prev.filter(f => f.id !== file.id))} className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button></div>))}
          </div>
        ) : <div className="text-sm text-muted-foreground py-4 text-center">{t('forms.noFormsSelected')}</div>}
      />
    </div>
  );
};

export default FileFolderPage;
