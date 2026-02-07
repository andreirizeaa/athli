'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Image as ImageIcon,
  FileText,
  Video,
  Plus,
  Trash2,
  UserPlus,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { DataGrid } from '@/components/app/data-grid';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/general/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Athlete } from '@/api/coach/coach-client-service';
import { broadcastMessage, type BroadcastMessageData } from '../../../api/coach/coach-message-service';

const MAX_ATTACHMENTS = 4;

type BroadcastSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BroadcastStep = 1 | 2 | 3 | 4;

export const BroadcastSidePanel = ({ open, onOpenChange }: BroadcastSidePanelProps) => {
  const t = useTranslations();
  const { clients, isLoading: isLoadingClients } = useCoachClients();
  const [step, setStep] = useState<BroadcastStep>(1);
  const [message, setMessage] = useState<string>('');
  const [attachedPdf, setAttachedPdf] = useState<File | null>(null);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<File | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isAllClientsSelected, setIsAllClientsSelected] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [dragCounter, setDragCounter] = useState<number>(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Filter clients to only show connected ones (status 'accepted' or 'connected')
  const connectedClients = useMemo(() =>
    (clients || []).filter(c => c.status === 'accepted' || c.status === 'connected'),
    [clients]
  );

  // Calculate total attachments for limit enforcement
  const totalAttachments = attachedImages.length + (attachedPdf ? 1 : 0) + (attachedVideo ? 1 : 0);
  const remainingSlots = MAX_ATTACHMENTS - totalAttachments;

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setStep(1);
      setMessage('');
      setAttachedPdf(null);
      setAttachedImages([]);
      setAttachedVideo(null);
      setSelectedClientIds(new Set());
      setIsAllClientsSelected(false);
      setIsSaving(false);
      setIsDraggingOver(false);
      setDragCounter(0);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    // Limit to remaining slots
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    if (filesToAdd.length > 0) {
      setAttachedImages((prev) => [...prev, ...filesToAdd]);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (totalAttachments >= MAX_ATTACHMENTS && !attachedPdf) return; // No slots available

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setAttachedPdf(file);
    }

    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (totalAttachments >= MAX_ATTACHMENTS && !attachedVideo) return; // No slots available

    if (file.type === 'video/mp4' || file.name.endsWith('.mp4')) {
      setAttachedVideo(file);
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePdf = () => {
    setAttachedPdf(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handleRemoveVideo = () => {
    setAttachedVideo(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (event.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    setDragCounter(0);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    // Calculate current total (need fresh calculation for callback)
    const currentTotal = attachedImages.length + (attachedPdf ? 1 : 0) + (attachedVideo ? 1 : 0);
    let slotsUsed = 0;

    // Separate PDFs, videos, and images
    const pdfFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    const videoFiles = files.filter(
      (file) => file.type === 'video/mp4' || file.name.endsWith('.mp4')
    );
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    // Handle PDF (only one PDF can be attached)
    if (pdfFiles.length > 0 && currentTotal + slotsUsed < MAX_ATTACHMENTS) {
      const pdfFile = pdfFiles[0];
      if (!attachedPdf) {
        setAttachedPdf(pdfFile);
        slotsUsed++;
      } else {
        // Replace existing PDF (doesn't use a new slot)
        setAttachedPdf(pdfFile);
      }
    }

    // Handle video (only one video can be attached)
    if (videoFiles.length > 0 && currentTotal + slotsUsed < MAX_ATTACHMENTS) {
      const videoFile = videoFiles[0];
      if (!attachedVideo) {
        setAttachedVideo(videoFile);
        slotsUsed++;
      } else {
        // Replace existing video (doesn't use a new slot)
        setAttachedVideo(videoFile);
      }
    }

    // Handle images (multiple images can be attached, up to limit)
    if (imageFiles.length > 0) {
      const availableSlots = MAX_ATTACHMENTS - (currentTotal + slotsUsed);
      const imagesToAdd = imageFiles.slice(0, Math.max(0, availableSlots));
      if (imagesToAdd.length > 0) {
        setAttachedImages((prev) => [...prev, ...imagesToAdd]);
      }
    }
  }, [attachedImages.length, attachedPdf, attachedVideo]);

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(clientId)) {
        updated.delete(clientId);
        // If removing a client and we had "all clients" selected, clear that state
        if (isAllClientsSelected) {
          setIsAllClientsSelected(false);
        }
        // If all clients are removed, close the panel
        if (updated.size === 0) {
          setTimeout(() => handleOpenChange(false), 0);
          return updated;
        }
      } else {
        updated.add(clientId);
      }
      return updated;
    });
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!message.trim()) return;
      setStep(2);
    } else if (step === 2) {
      if (selectedClientIds.size === 0) return;
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };

  const handleSave = async () => {
    if (!message.trim() || selectedClientIds.size === 0) return;

    setIsSaving(true);
    try {
      // Convert files to MessageFile format
      const pdfFile = attachedPdf
        ? {
          name: attachedPdf.name,
          data: await fileToBase64(attachedPdf),
          type: attachedPdf.type,
          size: attachedPdf.size,
        }
        : undefined;

      const imageFiles = await Promise.all(
        attachedImages.map(async (image) => ({
          name: image.name,
          data: await fileToBase64(image),
          type: image.type,
          size: image.size,
        }))
      );

      const videoFile = attachedVideo
        ? {
          name: attachedVideo.name,
          data: await fileToBase64(attachedVideo),
          type: attachedVideo.type,
          size: attachedVideo.size,
        }
        : undefined;

      const broadcastData: BroadcastMessageData = {
        clientIds: Array.from(selectedClientIds),
        text: message.trim(),
        pdf: pdfFile,
        images: imageFiles.length > 0 ? imageFiles : undefined,
        video: videoFile,
      };

      await broadcastMessage(broadcastData);
      handleOpenChange(false);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const selectedClients = connectedClients.filter((athlete) => selectedClientIds.has(athlete.id));
  const isAllClients = isAllClientsSelected;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getTitle = () => {
    switch (step) {
      case 1:
        return t('messages.broadcastPanel.title');
      case 2:
        return t('messages.broadcastPanel.selectClients');
      case 3:
        return t('messages.broadcastPanel.confirmClients');
      case 4:
        return t('messages.broadcastPanel.confirmMessage');
      default:
        return t('messages.broadcastPanel.title');
    }
  };

  const renderFooter = () => {
    if (step === 1) {
      return (
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!message.trim()}
          >
            {t('general.continue')}
          </Button>
        </div>
      );
    } else if (step === 2 || step === 3) {
      return (
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleBack}>
            {t('general.back')}
          </Button>
          <Button type="button" onClick={handleContinue} disabled={step === 2 && selectedClientIds.size === 0}>
            {t('general.continue')}
          </Button>
        </div>
      );
    } else if (step === 4) {
      const broadcastButtonText = isAllClients
        ? t('messages.broadcastPanel.broadcastToAllClients')
        : t('messages.broadcastPanel.broadcastToClients', { count: selectedClients.length });

      return (
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !message.trim() || selectedClientIds.size === 0}
            className="gap-2"
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {broadcastButtonText}
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <SidePanel open={open} onOpenChange={handleOpenChange} title={getTitle()} footer={renderFooter()}>
      <div
        onDragEnter={(step === 1 || step === 4) ? handleDragEnter : undefined}
        onDragLeave={(step === 1 || step === 4) ? handleDragLeave : undefined}
        onDragOver={(step === 1 || step === 4) ? handleDragOver : undefined}
        onDrop={(step === 1 || step === 4) ? handleDrop : undefined}
        className={cn(
          'flex flex-col gap-6 h-full relative',
          (step === 1 || step === 4) && isDraggingOver && 'bg-muted/50 rounded-lg border-2 border-dashed border-primary'
        )}
      >
        {((step === 1 || step === 4) && isDraggingOver) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
            <div className="text-center">
              <p className="text-sm font-medium">{t('messages.dropFilesHere')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('messages.filesWillBeAdded')}
              </p>
            </div>
          </div>
        )}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="broadcast-message">
                <span>{t('messages.broadcastPanel.message')}<RequiredAsterisk /></span>
              </Label>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('messages.broadcastPanel.messagePlaceholder')}
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('messages.broadcastPanel.attachments')}</Label>
              <div className="flex flex-col gap-3">
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 bg-background border border-border hover:bg-destructive hover:text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => handleRemoveImage(index)}
                          aria-label={t('messages.remove', { name: image.name })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {attachedPdf && (
                  <div className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{attachedPdf.name}</p>
                        <p className="text-xs text-muted-foreground">PDF</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleRemovePdf}
                      aria-label={t('messages.removePdf')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {attachedVideo && (
                  <div className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                        <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{attachedVideo.name}</p>
                        <p className="text-xs text-muted-foreground">{t('messages.mp4')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleRemoveVideo}
                      aria-label={t('messages.removeVideo')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 w-full justify-start"
                            aria-label={t('messages.attachFile')}
                            disabled={totalAttachments >= MAX_ATTACHMENTS}
                          >
                            <Plus className="h-4 w-4" />
                            {t('messages.attachFiles')}
                            {totalAttachments > 0 && ` (${totalAttachments}/${MAX_ATTACHMENTS})`}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="mr-2 size-4" />
                          {t('messages.images')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                          <FileText className="mr-2 size-4" />
                          {t('messages.pdfs')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                          <Video className="mr-2 size-4" />
                          {t('messages.videos')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>{t('messages.attachFiles')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              onChange={handleImageChange}
              accept="image/*"
              multiple
              aria-label={t('messages.uploadImage')}
            />
            <input
              ref={pdfInputRef}
              type="file"
              className="hidden"
              onChange={handlePdfChange}
              accept=".pdf"
              aria-label={t('messages.uploadPdf')}
            />
            <input
              ref={videoInputRef}
              type="file"
              className="hidden"
              onChange={handleVideoChange}
              accept="video/mp4,.mp4"
              aria-label={t('messages.uploadVideo')}
            />
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <Label>
              <span>{t('athletes.title')}<RequiredAsterisk /></span>
            </Label>
            <div className="flex-1 min-h-0 overflow-hidden">
              {isLoadingClients ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner className="size-6" />
                </div>
              ) : (
                <DataGrid
                  data={connectedClients}
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
                  gridKey="broadcast-select-clients"
                  searchPlaceholder={t('messages.broadcastPanel.searchClients')}
                  enableSearch={true}
                  enableEditColumns={false}
                  enableExport={false}
                  enableRowSelection={true}
                  selectedRowIds={selectedClientIds}
                  onSelectionChange={(newSelection) => {
                    setSelectedClientIds(newSelection);
                    // Clear "all clients" flag if selection changes and it's no longer all clients
                    if (newSelection.size !== connectedClients.length || connectedClients.length === 0) {
                      setIsAllClientsSelected(false);
                    }
                  }}
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
                    const initials = getInitials(row.name);
                    return (
                      <div className="flex items-center gap-3 h-full w-full">
                        <div
                          className="flex items-center justify-center h-full flex-shrink-0"
                          data-no-row-link="true"
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleClient(row.id)} />
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={row.avatarUrl} alt={row.name} />
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
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => {
                            if (checked !== isAllSelected) {
                              onToggleAll();
                            }
                            setIsAllClientsSelected(checked === true);
                          }}
                          aria-label={t('general.selectAll')}
                        />
                        <div className="flex items-center gap-2">
                          <UserPlus className="size-3 text-muted-foreground" />
                          <span className="text-xs uppercase text-muted-foreground">{t('athletes.title')}</span>
                        </div>
                      </div>
                    );
                  }}
                  emptyMessage={t('messages.broadcastPanel.noClientsFound')}
                  rowHeight="54px"
                  compactMode={true}
                  showPagination={true}
                  itemsPerPage={10}
                  gridPadding={false}
                />
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={cn('flex flex-col gap-2', isAllClients ? '' : 'flex-1 min-h-0')}>
            <Label>{t('messages.broadcastPanel.selectedClients')}</Label>
            <div className={cn('border rounded-lg divide-y overflow-y-auto', isAllClients ? '' : 'flex-1 min-h-0')}>
              {isAllClients ? (
                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium">{t('messages.broadcastPanel.allClients')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientIds(new Set());
                      setIsAllClientsSelected(false);
                      handleOpenChange(false);
                    }}
                    className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={t('general.close')}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : (
                selectedClients.map((client) => {
                  const initials = getInitials(client.name);
                  return (
                    <div
                      key={client.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={client.avatarUrl} alt={client.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{client.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleClient(client.id);
                          // If this was the last client, the handleToggleClient will close the panel
                        }}
                        className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={t('messages.broadcastPanel.removeClient', { name: client.name })}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="broadcast-message-step4">
                <span>{t('messages.broadcastPanel.message')}<RequiredAsterisk /></span>
              </Label>
              <Textarea
                id="broadcast-message-step4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('messages.broadcastPanel.messagePlaceholder')}
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('messages.broadcastPanel.attachments')}</Label>
              <div className="flex flex-col gap-3">
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 bg-background border border-border hover:bg-destructive hover:text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => handleRemoveImage(index)}
                          aria-label={t('messages.remove', { name: image.name })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {attachedPdf && (
                  <div className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                        <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{attachedPdf.name}</p>
                        <p className="text-xs text-muted-foreground">PDF</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleRemovePdf}
                      aria-label={t('messages.removePdf')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {attachedVideo && (
                  <div className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                        <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{attachedVideo.name}</p>
                        <p className="text-xs text-muted-foreground">{t('messages.mp4')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleRemoveVideo}
                      aria-label={t('messages.removeVideo')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 w-full justify-start"
                            aria-label={t('messages.attachFile')}
                            disabled={totalAttachments >= MAX_ATTACHMENTS}
                          >
                            <Plus className="h-4 w-4" />
                            {t('messages.attachFiles')}
                            {totalAttachments > 0 && ` (${totalAttachments}/${MAX_ATTACHMENTS})`}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="mr-2 size-4" />
                          {t('messages.images')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                          <FileText className="mr-2 size-4" />
                          {t('messages.pdfs')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                          <Video className="mr-2 size-4" />
                          {t('messages.videos')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>{t('messages.attachFiles')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t('messages.broadcastPanel.selectedClients')}</Label>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('general.edit')}
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <div className="border rounded-lg divide-y">
                {isAllClients ? (
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium">{t('messages.broadcastPanel.allClients')}</span>
                    </div>
                  </div>
                ) : (
                  selectedClients.map((client) => {
                    const initials = getInitials(client.name);
                    return (
                      <div
                        key={client.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={client.avatarUrl} alt={client.name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{client.name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
};

