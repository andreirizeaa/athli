'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Check, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getAllFiles, type CoachFile, addFilesToClient } from '@/lib/files/file-service';

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
  { label: 'Template', value: 'Template' },
];

type AddFileSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fileName: string, file: File, tags: string[]) => Promise<void>;
  clientName?: string;
  clientId?: string;
};

export const AddFileSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientName,
  clientId,
}: AddFileSidePanelProps) => {
  const t = useTranslations();
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'new' | 'yourLibrary'>('yourLibrary');
  const [coachFiles, setCoachFiles] = useState<CoachFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<CoachFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (open && activeTab === 'yourLibrary') {
      fetchCoachFiles();
    }
  }, [open, activeTab]);

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
    setLibrarySearchQuery('');
    setSelectedLibraryFile(null);
    dragCounterRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedLibraryFile && clientId) {
      // Assign file from library to client
      try {
        await addFilesToClient({
          fileIds: [selectedLibraryFile.id],
          clientId: clientId,
        });
        handleClose();
      } catch (error) {
        console.error('Failed to assign file:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!fileName.trim() || !selectedFile) return;
    await onSave(fileName.trim(), selectedFile, selectedTags);
    handleClose();
  };

  const handleSelectLibraryFile = (file: CoachFile) => {
    setSelectedLibraryFile(file);
  };

  const handleDeselectLibraryFile = () => {
    setSelectedLibraryFile(null);
  };

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return true;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  const filteredLibraryFiles = useMemo(() => {
    if (!librarySearchQuery.trim()) {
      return coachFiles;
    }

    const query = librarySearchQuery.trim().toLowerCase();
    return coachFiles.filter(
      (file) =>
        isFuzzyMatch(file.fileName, query) ||
        file.tags.some((tag) => isFuzzyMatch(tag, query))
    );
  }, [coachFiles, librarySearchQuery]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!fileName.trim()) {
      setFileName(file.name);
    }
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
  const isValid = activeTab === 'yourLibrary'
    ? selectedLibraryFile !== null
    : fileName.trim() && selectedFile !== null;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('files.addFile')}
      footer={
        activeTab === 'yourLibrary' ? (
          <div className="flex w-full justify-start gap-2">
            <Button type="button" onClick={handleSaveFromYourLibrary} disabled={!selectedLibraryFile}>
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex w-full justify-start gap-2">
            <Button type="button" onClick={handleSave} disabled={!isValid}>
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        )
      }
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'yourLibrary')} className="w-full">
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

        <TabsContent value="yourLibrary" className="mt-0">
          <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
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
              <>
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('files.searchPlaceholder')}
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label={t('files.searchPlaceholder')}
                  />
                </div>
                {filteredLibraryFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('files.emptyMessage')}</p>
                  </div>
                ) : selectedLibraryFile ? (
                  <>
                    <Card className="p-4 ring-2 ring-primary">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{selectedLibraryFile.fileName}</h4>
                          </div>
                          {selectedLibraryFile.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {selectedLibraryFile.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-xs text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                              {selectedLibraryFile.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{selectedLibraryFile.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeselectLibraryFile}
                          className="h-8 w-8 flex-shrink-0"
                          aria-label={t('general.edit')}
                        >
                          <Info className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredLibraryFiles.map((file) => (
                      <Card
                        key={file.id}
                        className="p-4 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectLibraryFile(file)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectLibraryFile(file);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select file: ${file.fileName}`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{file.fileName}</h4>
                          </div>
                          {file.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {file.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-xs text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{file.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-0">
          <div
            className="flex flex-col gap-6 flex-1 min-h-0 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Drag Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
                <p className="text-lg font-semibold text-primary">Drop file here</p>
              </div>
            )}
            
            {/* Form Content - hidden when dragging */}
            <div className={cn('flex flex-col gap-6', isDragging && 'opacity-0 pointer-events-none')}>
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
                    'border-muted hover:border-primary',
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
          </div>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};

