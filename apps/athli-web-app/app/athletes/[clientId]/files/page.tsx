'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, FileText, X, Tag as TagIcon, MoreHorizontal, Edit, Trash2 as Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { type Option } from '@/components/ui/multi-async-select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addFile, updateFile, deleteFile } from '@/lib/files/file-service';
import { mockAthletes } from '@/components/app/app-shell';
import { AddFileSidePanel } from '@/components/files/add-file-side-panel';
import { EditFileSidePanel } from '@/components/files/edit-file-side-panel';

type FileType = 'pdf' | 'image' | 'video' | 'document' | 'spreadsheet' | 'other';

type FileItem = {
  id: string;
  fileName: string;
  type: FileType;
  tags: string[];
  pinned: boolean;
};

// Mock data - in production this would be filtered by clientId
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

const ClientFilesPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  
  const athlete = mockAthletes.find((item) => item.id === clientId);
  const clientName = athlete?.name || 'this client';
  
  const [isAddFileOpen, setIsAddFileOpen] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [filteredCount, setFilteredCount] = useState<number>(mockFiles.length);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Edit file state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const itemsPerPage = 25;

  const handleOpenAddFile = () => {
    setIsAddFileOpen(true);
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

  const handleSaveFile = async (fileName: string, file: File, tags: string[]) => {
    try {
      // Call the addFile service method
      const fileId = await addFile({
        fileName: fileName.trim(),
        file: file,
        tags: tags,
      });
      
      // Add the file to the local state
      const newFile: FileItem = {
        id: fileId,
        fileName: fileName.trim(),
        type: getFileType(file.name),
        tags: tags,
        pinned: false,
      };
      setFiles((prev) => [...prev, newFile]);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to add file:', error);
      // TODO: Show error toast
    }
  };

  const handleClearSelected = () => {
    setSelectedFiles(new Set());
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

  const handleSaveEdit = async (fileName: string, tags: string[]) => {
    if (!editingFileId) return;
    
    try {
      await updateFile({
        fileId: editingFileId,
        fileName: fileName.trim(),
        tags: tags,
      });
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editingFileId
            ? { ...f, fileName: fileName.trim(), tags: tags }
            : f
        )
      );
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to update file:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteEdit = async () => {
    if (!editingFileId) return;
    await handleDeleteFile(editingFileId);
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
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={sortedFiles}
          columns={columns}
          getRowId={(row) => row.id}
          gridKey={`client-files-${clientId}`}
          itemsPerPage={itemsPerPage}
          onFilteredDataChange={setFilteredCount}
          enableSearch={true}
          searchPlaceholder={t('files.searchPlaceholder')}
          searchFields={[(row) => `${row.fileName} ${row.tags.join(' ')}`]}
          filters={filters}
          showLastColumnDivider={true}
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
                  {t('files.actions.clearSelected')} {selectedFiles.size}
                </span>
              </Button>
            </div>
          }
        />
      <AddFileSidePanel
        open={isAddFileOpen}
        onOpenChange={setIsAddFileOpen}
        onSave={handleSaveFile}
        clientName={clientName}
      />
      
      {editingFile && (
        <EditFileSidePanel
          open={editingFileId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingFileId(null);
            }
          }}
          fileId={editingFileId}
          fileName={editingFile.fileName}
          tags={editingFile.tags}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEdit}
        />
      )}
    </div>
  );
};

export default ClientFilesPage;

