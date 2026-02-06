'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Check, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Info } from 'lucide-react';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { getAllFiles, type CoachFile, createLink } from '@/api/coach/coach-file-service';
import { addFilesToClient, createClientLink } from '@/api/client/client-file-service';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { useUserProfile } from '@/hooks/use-user-profile';
import { FileThumbnail } from '@/components/files/file-thumbnail';

type AddFileSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, fileName: string, tags: string[]) => Promise<void>;
  onSave?: (fileIds: string[]) => Promise<void>;
  onLinkCreated?: () => void;
  isUploading?: boolean;
  clientName?: string;
  clientId?: string;
  editingFileId?: string | null;
  editingFileName?: string;
  editingTags?: string[];
  onEditSave?: (fileName: string, tags: string[]) => Promise<void>;
  onEditDelete?: () => Promise<void>;
};

export const AddFileSidePanel = ({
  open,
  onOpenChange,
  onUpload,
  onSave,
  onLinkCreated,
  isUploading = false,
  clientName,
  clientId,
  editingFileId,
  editingFileName,
  editingTags,
  onEditSave,
  onEditDelete,
}: AddFileSidePanelProps) => {
  const t = useTranslations();
  const { user } = useUserProfile();
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'new' | 'yourLibrary'>('yourLibrary');
  const [coachFiles, setCoachFiles] = useState<CoachFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [selectedLibraryFiles, setSelectedLibraryFiles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Edit mode
  const isEditing = !!editingFileId;
  const [editFileName, setEditFileName] = useState<string>('');
  const [hasEditChanges, setHasEditChanges] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Link state
  const [linkUrl, setLinkUrl] = useState<string>('');

  useEffect(() => {
    if (open && isEditing && editingFileName !== undefined) {
      setEditFileName(editingFileName);
      setHasEditChanges(false);
    }
  }, [open, isEditing, editingFileId, editingFileName]);

  useEffect(() => {
    if (isEditing && open && editingFileName !== undefined) {
      const hasChanges = editFileName.trim() !== editingFileName;
      setHasEditChanges(hasChanges);
    }
  }, [isEditing, editFileName, editingFileName, open]);

  useEffect(() => {
    if (open && !isEditing && activeTab === 'yourLibrary') {
      fetchCoachFiles();
    }
  }, [open, isEditing, activeTab]);

  const fetchCoachFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await getAllFiles();
      setCoachFiles(files);
    } catch (error) {
      console.error('Failed to fetch coach files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFileName('');
    setSelectedFile(null);
    setSelectedTags([]);
    setIsDragging(false);
    setActiveTab('yourLibrary');
    setSelectedLibraryFiles(new Set());
    setLinkUrl('');
    setEditFileName('');
    setHasEditChanges(false);
    setIsDeleting(false);
    dragCounterRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditSave = async () => {
    if (!hasEditChanges || isSaving || isDeleting || !onEditSave) return;
    setIsSaving(true);
    try {
      await onEditSave(editFileName.trim(), editingTags || []);
      handleClose();
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDelete = async () => {
    if (isSaving || isDeleting || !onEditDelete) return;
    setIsDeleting(true);
    try {
      await onEditDelete();
      handleClose();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedLibraryFiles.size > 0 && clientId) {
      setIsSaving(true);
      try {
        const fileIds = Array.from(selectedLibraryFiles);
        if (onSave) {
          await onSave(fileIds);
        } else {
          await addFilesToClient({
            fileIds: fileIds,
            clientId: clientId,
            coachId: user?.id || '',
          });
        }
        handleClose();
      } catch (error) {
        console.error('Failed to assign files:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Determine if we're in link mode (link URL entered) or file mode
  const isLinkMode = linkUrl.trim().length > 0;
  const isFileMode = selectedFile !== null;

  const handleSave = async () => {
    // Handle link mode - when link URL is entered
    if (isLinkMode && !isFileMode) {
      if (!fileName.trim() || !linkUrl.trim()) return;
      // Validate URL
      if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) return;

      setIsSaving(true);
      try {
        // Use createClientLink when in client context, otherwise use createLink for coach library
        if (clientId && user?.id) {
          await createClientLink({
            filename: fileName.trim(),
            url: linkUrl.trim(),
            clientId: clientId,
            coachId: user.id,
          });
        } else {
          await createLink({ filename: fileName.trim(), url: linkUrl.trim() });
        }
        onLinkCreated?.();
        handleClose();
      } catch (error) {
        console.error('Failed to create link:', error);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Handle file upload mode
    if (!fileName.trim() || !selectedFile) return;
    setIsSaving(true);
    try {
      await onUpload(selectedFile, fileName.trim(), selectedTags);
      handleClose();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderFirstColumnHeader = ({
    isAllSelected,
    onToggleAll,
  }: {
    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('files.form.fileName')}</span>
        </div>
      </div>
    );
  };

  const renderFirstColumn = (row: CoachFile, isSelected: boolean, onToggle: () => void) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox checked={isSelected} onCheckedChange={onToggle} />
        </div>
        <div className="flex items-center gap-3 w-full min-w-0">
          <FileThumbnail file={row} />
          <span className="truncate text-sm">{row.filename}</span>
        </div>
      </div>
    );
  };

  const columns: ColumnDefinition<CoachFile>[] = [];

  const handleFileSelect = (file: File) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size exceeds 50MB limit. Please select a smaller file.');
      return;
    }
    setSelectedFile(file);
    // Clear link when file is selected
    setLinkUrl('');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

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

  const showAlert = !!clientName;

  // Validation: either valid link or valid file
  const isValidLink = linkUrl.trim() !== '' && (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'));
  const isValid = clientId && activeTab === 'yourLibrary'
    ? selectedLibraryFiles.size > 0
    : fileName.trim() !== '' && (isValidLink || selectedFile !== null);

  const getButtonText = () => {
    if (activeTab === 'yourLibrary') {
      const count = selectedLibraryFiles.size;
      return count > 0 ? `Add ${count} ${count === 1 ? 'File' : 'Files'}` : 'Add';
    }
    return 'Add';
  };

  // Render the new file form content (shared between clientId and non-clientId views)
  const renderNewFileForm = () => (
    <div
      className="flex flex-col gap-6 flex-1 min-h-0 relative"
      onDragEnter={!isLinkMode ? handleDragEnter : undefined}
      onDragLeave={!isLinkMode ? handleDragLeave : undefined}
      onDragOver={!isLinkMode ? handleDragOver : undefined}
      onDrop={!isLinkMode ? handleDrop : undefined}
    >
      {/* Drag Overlay */}
      {isDragging && !isLinkMode && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <p className="text-lg font-semibold text-primary">Drop file here</p>
        </div>
      )}

      {/* Form Content - hidden when dragging */}
      <div className={cn('flex flex-col gap-6 flex-1 min-h-0', isDragging && 'opacity-0 pointer-events-none')}>
        {showAlert && (
          <Alert className="bg-primary/5 border-primary/20 text-primary mb-6">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              Files added here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general file, navigate to the respective main page in <Link href="/files" className="underline hover:no-underline"><strong>Library</strong></Link>.
            </AlertDescription>
          </Alert>
        )}

        {/* File Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="file-name" className="text-sm font-medium">
            {t('files.form.fileName')}
            <RequiredAsterisk />
          </label>
          <Input
            id="file-name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={t('files.form.fileNamePlaceholder')}
          />
        </div>

        {/* Link URL Input - shown when no file is selected */}
        {!selectedFile && (
          <div className="flex flex-col gap-2">
            <label htmlFor="link-url" className="text-sm font-medium">
              Link URL
            </label>
            <div className="relative">
              <Input
                id="link-url"
                type="text"
                placeholder="https://youtube.com/watch?v=... or any URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full pr-8"
              />
              {linkUrl && (
                <button
                  type="button"
                  onClick={() => setLinkUrl('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Clear link"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* OR divider - shown when neither link nor file is selected */}
        {!linkUrl.trim() && !selectedFile && (
          <div className="flex items-center gap-2 -my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* File Drop Area - shown when no link is entered */}
        {!linkUrl.trim() && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <label className="text-sm font-medium">
              {t('files.form.file')}
            </label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors flex-1 min-h-0',
                'border-muted-foreground/30 hover:border-primary',
                selectedFile && 'border-primary bg-primary/5'
              )}
            >
              {selectedFile ? (
                <>
                  <Check className="size-10 text-green-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
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
                    accept="*/*"
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
        )}
      </div>
    </div>
  );

  return (
    <SidePanel
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          handleClose();
        }
      }}
      title={isEditing ? t('files.editFile.title') : t('files.addFile')}
      onSave={isEditing ? handleEditSave : (clientId && activeTab === 'yourLibrary') ? handleSaveFromYourLibrary : handleSave}
      saveText={isEditing ? undefined : (clientId && activeTab === 'yourLibrary') ? getButtonText() : 'Add'}
      isSaving={isUploading || isSaving}
      isSaveDisabled={isEditing ? !hasEditChanges : (clientId && activeTab === 'yourLibrary') ? selectedLibraryFiles.size === 0 : !isValid}
      onDelete={isEditing ? handleEditDelete : undefined}
      isDeleting={isDeleting}
      onCancel={handleClose}
    >
      {isEditing ? (
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
        </div>
      ) : clientId ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'yourLibrary')} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full mb-6">
            <TabsTrigger
              value="yourLibrary"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('files.yourLibrary')}
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('files.newFile')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yourLibrary" className="mt-0 h-full flex flex-col min-h-0">
            {isLoadingFiles ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('general.loading')}</p>
              </div>
            ) : coachFiles.length === 0 ? (
              <Alert className="bg-primary/5 border-primary/20 text-primary">
                <Info className="size-4" />
                <AlertDescription className="min-w-0 line-clamp-4">
                  {t('files.noLibraryFiles')}{' '}
                  <Link href="/files" className="underline hover:no-underline">
                    <strong>{t('files.libraryLink')}</strong>
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
                <DataGrid
                  data={coachFiles}
                  columns={columns}
                  getRowId={(row) => row.id}
                  gridKey="add-file-library"
                  searchPlaceholder={t('files.searchPlaceholder')}
                  searchFields={[(row) => row.filename]}
                  enableSearch={true}
                  enableEditColumns={false}
                  enableExport={false}
                  enableRowSelection={true}
                  selectOnRowClick={true}
                  selectedRowIds={selectedLibraryFiles}
                  onSelectionChange={setSelectedLibraryFiles}
                  stickyFirstColumn={true}
                  firstColumnWidth="300px"
                  renderFirstColumn={renderFirstColumn}
                  renderFirstColumnHeader={renderFirstColumnHeader}
                  emptyMessage={t('files.emptyMessage')}
                  rowHeight="54px"
                  compactMode={true}
                  showPagination={false}
                  gridPadding={false}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-0 flex-1 flex flex-col min-h-0">
            {renderNewFileForm()}
          </TabsContent>
        </Tabs>
      ) : (
        renderNewFileForm()
      )}
    </SidePanel>
  );
};
