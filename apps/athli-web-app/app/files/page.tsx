'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, FileText, Upload, X, Check, Tag as TagIcon, UserPlus, MoreHorizontal, Edit, Trash2 as Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addFile, addFilesToClient, updateFile, deleteFile } from '@/lib/files/file-service';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockAthletes } from '@/components/app/app-shell';

type FileType = 'pdf' | 'image' | 'video' | 'document' | 'spreadsheet' | 'other';

type FileItem = {
  id: string;
  fileName: string;
  type: FileType;
  tags: string[];
  pinned: boolean;
};

// Mock data
const mockFiles: FileItem[] = [
  {
    id: '1',
    fileName: 'Training Program Template.pdf',
    type: 'pdf',
    tags: ['Training', 'Program', 'Template'],
    pinned: true,
  },
  {
    id: '2',
    fileName: 'Nutrition Guide.docx',
    type: 'document',
    tags: ['Nutrition', 'Education'],
    pinned: false,
  },
  {
    id: '3',
    fileName: 'Recovery Protocol.pdf',
    type: 'pdf',
    tags: ['Recovery', 'Rehab'],
    pinned: true,
  },
  {
    id: '4',
    fileName: 'Workout Video.mp4',
    type: 'video',
    tags: ['Training', 'Workout', 'Technique'],
    pinned: false,
  },
  {
    id: '5',
    fileName: 'Progress Tracking.xlsx',
    type: 'spreadsheet',
    tags: ['Progress', 'Tracking', 'Assessment'],
    pinned: false,
  },
];

const TAG_OPTIONS: Option[] = [
  { label: 'Training', value: 'Training' },
  { label: 'Nutrition', value: 'Nutrition' },
  { label: 'Recovery', value: 'Recovery' },
  { label: 'Mobility', value: 'Mobility' },
  { label: 'Rehab', value: 'Rehab' },
  { label: 'Technique', value: 'Technique' },
  { label: 'Mindset', value: 'Mindset' },
  { label: 'Education', value: 'Education' },
  { label: 'Assessment', value: 'Assessment' },
  { label: 'Progress', value: 'Progress' },
  { label: 'Checkin', value: 'Checkin' },
  { label: 'Program', value: 'Program' },
  { label: 'Workout', value: 'Workout' },
  { label: 'Warmup', value: 'Warmup' },
  { label: 'Cooldown', value: 'Cooldown' },
  { label: 'Cardio', value: 'Cardio' },
  { label: 'Strength', value: 'Strength' },
  { label: 'Hypertrophy', value: 'Hypertrophy' },
  { label: 'Conditioning', value: 'Conditioning' },
  { label: 'Power', value: 'Power' },
  { label: 'Endurance', value: 'Endurance' },
  { label: 'Flexibility', value: 'Flexibility' },
  { label: 'Lifestyle', value: 'Lifestyle' },
  { label: 'Supplements', value: 'Supplements' },
  { label: 'Recipes', value: 'Recipes' },
  { label: 'Tracking', value: 'Tracking' },
  { label: 'Form', value: 'Form' },
  { label: 'Template', value: 'Template' },
  { label: 'Admin', value: 'Admin' },
];

const FilesPage = () => {
  const t = useTranslations();
  const [isAddFileOpen, setIsAddFileOpen] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [filteredCount, setFilteredCount] = useState<number>(mockFiles.length);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Side panel state
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit file state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([]);
  const [hasEditChanges, setHasEditChanges] = useState<boolean>(false);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  
  // Add to clients side panel state
  const [isAddToClientsOpen, setIsAddToClientsOpen] = useState<boolean>(false);
  const [filesToAdd, setFilesToAdd] = useState<FileItem[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const itemsPerPage = 25;

  const handleOpenAddFile = () => {
    setIsAddFileOpen(true);
    setFileName('');
    setSelectedFile(null);
    setSelectedTags([]);
  };

  const handleCloseAddFile = () => {
    setIsAddFileOpen(false);
    setFileName('');
    setSelectedFile(null);
    setSelectedTags([]);
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!fileName.trim() || !selectedFile) {
      return;
    }
    
    try {
      // Call the addFile service method
      const fileId = await addFile({
        fileName: fileName.trim(),
        file: selectedFile,
        tags: selectedTags,
      });
      
      // Add the file to the local state
      const newFile: FileItem = {
        id: fileId,
        fileName: fileName.trim(),
        type: getFileType(selectedFile.name),
        tags: selectedTags,
        pinned: false,
      };
      setFiles((prev) => [...prev, newFile]);
      handleCloseAddFile();
    } catch (error) {
      console.error('Failed to add file:', error);
      // TODO: Show error toast
    }
  };

  const getFileType = (fileName: string): FileType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
    if (['doc', 'docx'].includes(ext || '')) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
    return 'other';
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!fileName.trim()) {
      setFileName(file.name);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };


  const handleClearSelected = () => {
    setSelectedFiles(new Set());
  };

  const handleAddToClients = () => {
    // Get selected files from the grid
    const selectedFileItems = files.filter((file) => selectedFiles.has(file.id));
    if (selectedFileItems.length === 0) {
      return;
    }
    
    setFilesToAdd(selectedFileItems);
    setIsAddToClientsOpen(true);
    setSelectedClientIds(new Set());
  };

  const handleRemoveFileFromAddList = (fileId: string) => {
    setFilesToAdd((prev) => {
      const newList = prev.filter((file) => file.id !== fileId);
      // Auto-close if no files remain
      if (newList.length === 0) {
        setIsAddToClientsOpen(false);
      }
      return newList;
    });
  };

  const handleAddFilesToClients = async () => {
    if (selectedClientIds.size === 0 || filesToAdd.length === 0) {
      return;
    }
    
    try {
      const fileIds = filesToAdd.map((file) => file.id);
      const clientIdsArray = Array.from(selectedClientIds);
      
      // Call the service for each client
      await Promise.all(
        clientIdsArray.map((clientId) =>
          addFilesToClient({
            fileIds,
            clientId,
          })
        )
      );
      
      // Close the side panel and clear selections
      setIsAddToClientsOpen(false);
      setFilesToAdd([]);
      setSelectedFiles(new Set());
      setSelectedClientIds(new Set());
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to add files to clients:', error);
      // TODO: Show error toast
    }
  };

  const handleCloseAddToClients = () => {
    setIsAddToClientsOpen(false);
    setFilesToAdd([]);
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

  const getFileTypeLabel = (type: FileType): string => {
    const labels: Record<FileType, string> = {
      pdf: 'PDF',
      image: 'Image',
      video: 'Video',
      document: 'Document',
      spreadsheet: 'Spreadsheet',
      other: 'Other',
    };
    return labels[type] || 'Other';
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
          <span className="text-xs uppercase text-muted-foreground">{t('files.columns.fileName')}</span>
        </div>
      </div>
    );
  };

  // Render first column with checkbox
  const renderFirstColumn = (row: FileItem, isSelected: boolean) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
        >
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleFile(row.id)} />
        </div>
        <div className="flex items-center w-full min-w-0">
          <span className="text-sm truncate">{row.fileName}</span>
        </div>
      </div>
    );
  };

  const handleFileClick = (file: FileItem) => {
    // Mock URL - in production this would come from the file service
    const mockFileUrl = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800';
    
    if (file.type === 'image' || file.type === 'video' || file.type === 'pdf') {
      // Open in new tab
      window.open(mockFileUrl, '_blank');
    } else {
      // Download
      const link = document.createElement('a');
      link.href = mockFileUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEditFile = (file: FileItem) => {
    setEditingFileId(file.id);
    setEditFileName(file.fileName);
    setEditSelectedTags([...file.tags]);
    setHasEditChanges(false);
    setRowMenuOpenId(null);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile({ fileId });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setRowMenuOpenId(null);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to delete file:', error);
      // TODO: Show error toast
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFileId || !hasEditChanges) return;
    
    try {
      await updateFile({
        fileId: editingFileId,
        fileName: editFileName.trim(),
        tags: editSelectedTags,
      });
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editingFileId
            ? { ...f, fileName: editFileName.trim(), tags: editSelectedTags }
            : f
        )
      );
      
      handleCloseEdit();
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to update file:', error);
      // TODO: Show error toast
    }
  };

  const handleCloseEdit = () => {
    setEditingFileId(null);
    setEditFileName('');
    setEditSelectedTags([]);
    setHasEditChanges(false);
  };

  // Track changes in edit mode
  React.useEffect(() => {
    if (editingFileId) {
      const originalFile = files.find((f) => f.id === editingFileId);
      if (originalFile) {
        const hasChanges =
          editFileName.trim() !== originalFile.fileName ||
          JSON.stringify([...editSelectedTags].sort()) !== JSON.stringify([...originalFile.tags].sort());
        setHasEditChanges(hasChanges);
      }
    }
  }, [editingFileId, editFileName, editSelectedTags, files]);

  // Create column definitions
  const columns: ColumnDefinition<FileItem>[] = [
    {
      id: 'fileName',
      label: t('files.columns.fileName'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm truncate">{row.fileName}</span>
        </div>
      ),
      getSortValue: (row) => row.fileName.toLowerCase(),
      getSearchValue: (row) => row.fileName,
    },
    {
      id: 'type',
      label: t('files.columns.type'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[150px]', pixel: '150px' },
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm">{getFileTypeLabel(row.type)}</span>
        </div>
      ),
      getSortValue: (row) => row.type,
      getSearchValue: (row) => getFileTypeLabel(row.type),
    },
    {
      id: 'tags',
      label: t('files.columns.tags'),
      icon: <TagIcon className="size-3" />,
      width: { class: 'min-w-[250px]', pixel: '250px' },
      renderCell: (row) => (
        <div className="flex items-center gap-1 flex-wrap w-full">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs border-primary text-primary">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 3 && (
            <Badge variant="outline" className="text-xs border-primary text-primary">
              +{row.tags.length - 3}
            </Badge>
          )}
        </div>
      ),
      getSortValue: (row) => row.tags.join(','),
      getSearchValue: (row) => row.tags.join(' '),
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
                  handleDeleteFile(row.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4 mr-2" />
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
      id: 'tags',
      label: t('files.filters.tags'),
      icon: <TagIcon className="size-4" />,
      options: TAG_OPTIONS.map((tag) => ({ value: tag.value, label: tag.label })),
      getFilterValue: (row) => {
        // Return comma-separated tags so DataGrid can match against them
        return row.tags.join(',');
      },
      multiSelect: true,
      searchPlaceholder: t('files.form.searchTags'),
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

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('files.title')}</h1>
          <Button onClick={handleOpenAddFile} className="gap-2">
            <Plus className="size-4" />
            <span>{t('files.addFile')}</span>
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <DataGrid
        data={sortedFiles}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="files"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('files.searchPlaceholder')}
        searchFields={[(row) => `${row.fileName} ${row.tags.join(' ')}`]}
        filters={filters}
        enableEditColumns={false}
        showLastColumnDivider={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedFiles}
        onSelectionChange={setSelectedFiles}
        firstColumnId="fileName"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        defaultColumnOrder={['fileName', 'type', 'tags', 'actions']}
        defaultVisibleColumns={['fileName', 'type', 'tags', 'actions']}
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
          <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
                aria-label={t('files.actions.clearSelected')}
              >
                <X className="size-4" />
                <span>
                  Clear {selectedFiles.size} selected
                </span>
              </Button>
            <Button
              variant="ghost"
              onClick={handleAddToClients}
              className="gap-2"
              aria-label={t('files.actions.addToClients')}
            >
              <UserPlus className="size-4" />
              <span>{t('files.actions.addToClients')}</span>
            </Button>
          </div>
        }
      />
      <SidePanel
        open={isAddFileOpen}
        onOpenChange={setIsAddFileOpen}
        title={t('files.addFile')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button type="button" onClick={handleSave} disabled={!fileName.trim() || !selectedFile}>
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAddFile}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* File Name Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="file-name" className="text-sm font-medium">
              {t('files.form.fileName')}
            </label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={t('files.form.fileNamePlaceholder')}
            />
          </div>

          {/* File Drop Area */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t('files.form.file')}</label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary',
                selectedFile && 'border-primary bg-primary/5'
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <>
                  <Check className="size-10 text-green-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{(selectedFile as globalThis.File).name}</p>
                    <p className="text-xs text-muted-foreground">
                      {((selectedFile as globalThis.File).size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    {t('files.form.changeFile')}
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="size-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{t('files.form.dropFileHere')}</p>
                    <p className="text-xs text-muted-foreground">{t('files.form.orClickToSelect')}</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('files.form.selectFile')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tags Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t('files.form.tags')}</label>
            <MultiAsyncSelect
              options={TAG_OPTIONS}
              value={selectedTags}
              onValueChange={setSelectedTags}
              placeholder={t('files.form.selectTags')}
              searchPlaceholder={t('files.form.searchTags')}
              maxCount={3}
              clearText={t('general.clear')}
              closeText={t('general.close')}
            />
          </div>
        </div>
      </SidePanel>
      
      {/* Edit File Side Panel */}
      <SidePanel
        open={editingFileId !== null}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (editingFileId) {
                  handleDeleteFile(editingFileId);
                  handleCloseEdit();
                }
              }}
            >
              {t('general.delete')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* File Name Input */}
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

          {/* Tags Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t('files.form.tags')}</label>
            <MultiAsyncSelect
              options={TAG_OPTIONS}
              value={editSelectedTags}
              onValueChange={setEditSelectedTags}
              placeholder={t('files.form.selectTags')}
              searchPlaceholder={t('files.form.searchTags')}
              maxCount={3}
              clearText={t('general.clear')}
              closeText={t('general.close')}
            />
          </div>
        </div>
      </SidePanel>
      
      {/* Add to Clients Side Panel */}
      <SidePanel
        open={isAddToClientsOpen}
        onOpenChange={setIsAddToClientsOpen}
        title={t('files.addToClients.title')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleAddFilesToClients}
              disabled={selectedClientIds.size === 0 || filesToAdd.length === 0}
            >
              {selectedClientIds.size === 1
                ? t('files.actions.addFilesToOneClient')
                : t('files.actions.addFilesToClients', { count: selectedClientIds.size })}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAddToClients}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Files to be added */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-sm font-medium">{t('files.addToClients.filesToBeAdded')}</label>
            {filesToAdd.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {filesToAdd.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{file.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFileFromAddList(file.id)}
                      className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={t('files.actions.removeFile', { fileName: file.fileName })}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t('files.addToClients.noFiles')}
              </div>
            )}
          </div>

          {/* Client Selection */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <label className="text-sm font-medium">{t('athletes.title')}</label>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataGrid
                data={mockAthletes}
                columns={[
                  {
                    id: 'name',
                    label: 'Athlete',
                    icon: <UserPlus className="size-3" />,
                    width: { class: 'w-full', pixel: '100%' },
                    getSortValue: (row) => row.name.toLowerCase(),
                    getSearchValue: (row) => `${row.name} ${row.email} ${row.country}`,
                  },
                ]}
                getRowId={(row) => row.id}
                gridKey="add-files-to-clients"
                searchPlaceholder="Search athletes..."
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
                        <span className="text-xs uppercase text-muted-foreground">Athlete</span>
                      </div>
                    </div>
                  );
                }}
                emptyMessage="No athletes found."
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
