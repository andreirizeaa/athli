'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/general/utils';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { format } from 'date-fns';
import { Plus, GitCompare, Trash2, Upload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddPhotoSidePanel } from '@/components/photos/add-photo-side-panel';
import { useClientPhotos } from '@/hooks/use-client-photos';
import { addClientPhotos, deleteClientPhoto, deleteClientPhotoAngle, type AddClientPhotosData } from '@/api/client/client-photo-service';

import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFeatureAccess } from '@/lib/permissions/feature-gate';

// Screenshot preview component for upgrade dialog
function ScreenshotPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const r = 8;

  return (
    <div ref={containerRef} className="relative">
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
        >
          <defs>
            <linearGradient id="border-grad-photos" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-photos)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-photos)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <img
        src="/app-screenshots/client/photos/light.png"
        alt="Photo tracking feature preview"
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src="/app-screenshots/client/photos/dark.png"
        alt="Photo tracking feature preview"
        className="hidden w-full h-auto rounded-lg border dark:block"
      />
    </div>
  );
}

type PhotoView = 'all' | 'front' | 'back' | 'side';

const ClientPhotosPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const isInbox = !!params.contactId;
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const coachId = user?.id;
  const { hasAccess: hasPhotoTrackingAccess } = useFeatureAccess('photo_tracking');

  // Use React Query hook instead of local state to prevent flickering
  const { photos, isLoading, refetch } = useClientPhotos(clientId);

  const [activeView, setActiveView] = useState<PhotoView>('all');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deleteAngle, setDeleteAngle] = useState<'front' | 'back' | 'side' | null>(null);
  const [uploadingAngle, setUploadingAngle] = useState<{ angle: 'front' | 'back' | 'side'; date: string } | null>(null);
  const [dragOverAngle, setDragOverAngle] = useState<{ angle: 'front' | 'back' | 'side'; date: string } | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState<boolean>(false);

  // Set initial selected photo when photos load
  React.useEffect(() => {
    if (photos.length > 0 && !selectedPhotoId) {
      setSelectedPhotoId(photos[0].id);
    }
  }, [photos, selectedPhotoId]);

  const handleViewChange = (view: PhotoView) => {
    setActiveView(view);
  };

  const groupedPhotos = useMemo(() => {
    const groups: { [key: string]: { date: Date; photos: { front?: any; back?: any; side?: any } } } = {};

    photos.forEach((photo) => {
      const dateKey = format(photo.recordedAt, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: photo.recordedAt,
          photos: {},
        };
      }
      groups[dateKey].photos[photo.type as 'front' | 'back' | 'side'] = photo;
    });

    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [photos]);

  const filteredGroupedPhotos = useMemo(() => {
    // Always show all photo groups regardless of active view
    // Pills will show muted colors for missing angles
    return groupedPhotos;
  }, [groupedPhotos]);

  const formatDate = (date: Date): string => {
    return format(date, 'MMM d, yyyy');
  };

  // Selected group date based on selected photo ID
  const selectedGroupDate = useMemo(() => {
    if (!selectedPhotoId) return null;
    const photo = photos.find((p) => p.id === selectedPhotoId);
    if (!photo) return null;
    return format(photo.recordedAt, 'yyyy-MM-dd');
  }, [selectedPhotoId, photos]);

  // Find the selected photo based on the selected group date and active view
  const selectedPhoto = useMemo(() => {
    if (!selectedGroupDate || activeView === 'all') return null;
    const group = groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate);
    if (!group) return null;
    return group.photos[activeView as 'front' | 'back' | 'side'] || null;
  }, [selectedGroupDate, activeView, groupedPhotos]);

  const handleGroupSelect = (group: (typeof groupedPhotos)[0]) => {
    const typeToSelect = activeView === 'all' ? (group.photos.front ? 'front' : group.photos.side ? 'side' : 'back') : activeView;
    const photo = group.photos[typeToSelect as 'front' | 'back' | 'side'];
    if (photo) {
      setSelectedPhotoId(photo.id);
    }
  };

  const handleAddPhoto = async (data: AddClientPhotosData) => {
    if (!clientId || !coachId) return;
    try {
      await addClientPhotos(data);
      // Invalidate cache to refresh photos
      await queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] });
      setIsAddPhotoOpen(false);
    } catch (error) {
      console.error('Failed to add photos:', error);
    }
  };

  const handleDeletePhoto = async () => {
    if (!clientId || !selectedPhotoId) return;
    try {
      // If deleteAngle is set, delete only that specific angle
      // Otherwise, if on a specific view (front, back, side), delete only that angle
      // If on 'all' view and no deleteAngle, delete the entire photo log entry
      if (deleteAngle) {
        await deleteClientPhotoAngle(clientId, coachId || '', selectedPhotoId, deleteAngle);
      } else if (activeView === 'all') {
        await deleteClientPhoto(clientId, coachId || '', selectedPhotoId);
      } else {
        await deleteClientPhotoAngle(clientId, coachId || '', selectedPhotoId, activeView);
      }
      await queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] });
      setSelectedPhotoId(null);
      setDeleteAngle(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleFileDrop = async (
    angle: 'front' | 'back' | 'side',
    file: File,
    date: Date
  ) => {
    if (!hasPhotoTrackingAccess) {
      setIsUpgradeDialogOpen(true);
      return;
    }
    if (!clientId) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    setUploadingAngle({ angle, date: dateKey });
    try {
      const data: AddClientPhotosData = {
        clientId,
        coachId: coachId || '',
        recordedAt: date,
        frontFile: angle === 'front' ? file : undefined,
        sideFile: angle === 'side' ? file : undefined,
        backFile: angle === 'back' ? file : undefined,
      };
      await addClientPhotos(data);
      await queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploadingAngle(null);
    }
  };

  if (!isLoading && photos.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center min-h-0">
        <EmptyGridState
          title={t('photos.emptyState.title', { defaultMessage: 'No photos yet' })}
          subtitle={t('photos.emptyState.subtitle', { defaultMessage: 'Add progress photos to track changes over time' })}
          action={
            <Button onClick={() => {
              if (!hasPhotoTrackingAccess) {
                setIsUpgradeDialogOpen(true);
                return;
              }
              setIsAddPhotoOpen(true);
            }} className="gap-2">
              <Plus className="size-4" />
              <span>{t('photos.addPhoto', { defaultMessage: 'Add photo' })}</span>
            </Button>
          }
        />
        <AddPhotoSidePanel
          open={isAddPhotoOpen}
          onOpenChange={setIsAddPhotoOpen}
          onSave={handleAddPhoto}

          clientId={clientId || ''}
          coachId={coachId || ''}
        />
        {/* Upgrade Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('upgrade.toPro')}</DialogTitle>
              <DialogDescription>
                Track client progress with photos - compare progress over time and visualize transformations.
              </DialogDescription>
            </DialogHeader>
            <ScreenshotPreview />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                Maybe Later
              </Button>
              <Button onClick={() => router.push('/settings/billing')}>
                View Plans
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar navigation */}
        <div className={cn(isInbox ? "w-60" : "w-80", "border-r bg-background flex-shrink-0 flex flex-col")}>
          <div className="w-full relative flex-shrink-0">
            <div className="px-3 py-3 flex items-center">
              <ButtonGroup className="w-full px-1">
                <Button
                  variant={activeView === 'all' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('all')}
                  className={cn(
                    'flex-1',
                    activeView === 'all' && 'bg-primary text-primary-foreground',
                    isInbox && "px-1 text-xs h-9"
                  )}
                >
                  All
                </Button>
                <Button
                  variant={activeView === 'front' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('front')}
                  className={cn(
                    'flex-1',
                    activeView === 'front' && 'bg-primary text-primary-foreground',
                    isInbox && "px-1 text-xs h-9"
                  )}
                >
                  Front
                </Button>
                <Button
                  variant={activeView === 'back' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('back')}
                  className={cn(
                    'flex-1',
                    activeView === 'back' && 'bg-primary text-primary-foreground',
                    isInbox && "px-1 text-xs h-9"
                  )}
                >
                  Back
                </Button>
                <Button
                  variant={activeView === 'side' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('side')}
                  className={cn(
                    'flex-1',
                    activeView === 'side' && 'bg-primary text-primary-foreground',
                    isInbox && "px-1 text-xs h-9"
                  )}
                >
                  Side
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-0">
              {filteredGroupedPhotos.map((group) => {
                const isSelected = selectedGroupDate === format(group.date, 'yyyy-MM-dd');

                return (
                  <React.Fragment key={format(group.date, 'yyyy-MM-dd')}>
                    <div onClick={() => handleGroupSelect(group)} className={cn('w-full flex items-center gap-4 px-4 py-4 text-sm transition-colors cursor-pointer border-b', isSelected ? 'bg-accent/50 border-l-2 border-l-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/30')}>
                      <div className="flex flex-col gap-2 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(activeView === 'all' || activeView === 'front') && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-2 h-5 uppercase font-bold tracking-wider transition-colors',
                                  group.photos.front
                                    ? 'border-primary text-primary' + (activeView === 'front' ? ' bg-primary/10' : '')
                                    : 'border-muted-foreground/30 text-muted-foreground/50'
                                )}
                              >
                                Front
                              </Badge>
                            )}
                            {(activeView === 'all' || activeView === 'side') && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-2 h-5 uppercase font-bold tracking-wider transition-colors',
                                  group.photos.side
                                    ? 'border-primary text-primary' + (activeView === 'side' ? ' bg-primary/10' : '')
                                    : 'border-muted-foreground/30 text-muted-foreground/50'
                                )}
                              >
                                Side
                              </Badge>
                            )}
                            {(activeView === 'all' || activeView === 'back') && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-2 h-5 uppercase font-bold tracking-wider transition-colors',
                                  group.photos.back
                                    ? 'border-primary text-primary' + (activeView === 'back' ? ' bg-primary/10' : '')
                                    : 'border-muted-foreground/30 text-muted-foreground/50'
                                )}
                              >
                                Back
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhotoId(group.photos[activeView === 'all' ? 'front' : activeView]?.id || null);
                              setDeleteAngle(null);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors flex items-center justify-center"
                            aria-label="Delete photo"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                        <span className={cn('text-sm font-semibold', isSelected ? 'text-foreground' : 'text-muted-foreground')}>{formatDate(group.date)}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="w-full relative flex-shrink-0 bg-background border-t">
            <div className="px-3 py-[11.5px] flex items-center justify-end">
              <ButtonGroup>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!hasPhotoTrackingAccess) {
                      setIsUpgradeDialogOpen(true);
                      return;
                    }
                    router.push(`/athletes/${clientId}/photos/compare`);
                  }}
                  className="gap-2 rounded-r-none border-r-0"
                  disabled={photos.length === 0}
                >
                  <GitCompare className="size-4" />
                  <span>{t('photos.compare')}</span>
                </Button>
                <Button
                  onClick={() => {
                    if (!hasPhotoTrackingAccess) {
                      setIsUpgradeDialogOpen(true);
                      return;
                    }
                    setIsAddPhotoOpen(true);
                  }}
                  className="gap-2 rounded-l-none"
                >
                  <Plus className="size-4" />
                  <span>{t('common.addPhoto')}</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-hidden p-8 relative flex items-center justify-center">
            {activeView === 'all' ? (
              selectedGroupDate ? (
                <div className="flex flex-col gap-6 w-full max-w-5xl h-full mx-auto min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Front Photo Card */}
                    <Card className="flex flex-col h-full overflow-hidden shadow-sm group">
                      <div className="w-full py-3 px-4 border-b flex justify-between items-center flex-shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Front View</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const frontPhoto = groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.front;
                            if (frontPhoto) {
                              setSelectedPhotoId(frontPhoto.id);
                              setDeleteAngle('front');
                              setIsDeleteDialogOpen(true);
                            }
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-destructive/10 transition-colors",
                            !groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.front && "invisible"
                          )}
                          aria-label="Delete front photo"
                        >
                          <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 bg-background flex items-center justify-center relative min-h-0">
                        {groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.front ? (
                          <img
                            src={groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.front.url}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-sm"
                            alt="Front view"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                              uploadingAngle?.angle === 'front' && uploadingAngle?.date === selectedGroupDate
                                ? "border-primary bg-primary/5"
                                : dragOverAngle?.angle === 'front' && dragOverAngle?.date === selectedGroupDate
                                  ? "border-primary bg-primary/10"
                                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                            )}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle({ angle: 'front', date: selectedGroupDate! });
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                              const file = e.dataTransfer.files[0];
                              if (file && file.type.startsWith('image/')) {
                                handleFileDrop('front', file, new Date(selectedGroupDate!));
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  handleFileDrop('front', file, new Date(selectedGroupDate!));
                                }
                              };
                              input.click();
                            }}
                          >
                            {uploadingAngle?.angle === 'front' && uploadingAngle?.date === selectedGroupDate ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="size-8 text-muted-foreground/40" />
                                <span className="text-xs text-muted-foreground/60">Drop or click to upload</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Side Photo Card */}
                    <Card className="flex flex-col h-full overflow-hidden shadow-sm group">
                      <div className="w-full py-3 px-4 border-b flex justify-between items-center flex-shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Side View</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sidePhoto = groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.side;
                            if (sidePhoto) {
                              setSelectedPhotoId(sidePhoto.id);
                              setDeleteAngle('side');
                              setIsDeleteDialogOpen(true);
                            }
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-destructive/10 transition-colors",
                            !groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.side && "invisible"
                          )}
                          aria-label="Delete side photo"
                        >
                          <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 bg-background flex items-center justify-center relative min-h-0">
                        {groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.side ? (
                          <img
                            src={groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.side.url}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-sm"
                            alt="Side view"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                              uploadingAngle?.angle === 'side' && uploadingAngle?.date === selectedGroupDate
                                ? "border-primary bg-primary/5"
                                : dragOverAngle?.angle === 'side' && dragOverAngle?.date === selectedGroupDate
                                  ? "border-primary bg-primary/10"
                                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                            )}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle({ angle: 'side', date: selectedGroupDate! });
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                              const file = e.dataTransfer.files[0];
                              if (file && file.type.startsWith('image/')) {
                                handleFileDrop('side', file, new Date(selectedGroupDate!));
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  handleFileDrop('side', file, new Date(selectedGroupDate!));
                                }
                              };
                              input.click();
                            }}
                          >
                            {uploadingAngle?.angle === 'side' && uploadingAngle?.date === selectedGroupDate ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="size-8 text-muted-foreground/40" />
                                <span className="text-xs text-muted-foreground/60">Drop or click to upload</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Back Photo Card */}
                    <Card className="flex flex-col h-full overflow-hidden shadow-sm group">
                      <div className="w-full py-3 px-4 border-b flex justify-between items-center flex-shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Back View</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const backPhoto = groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.back;
                            if (backPhoto) {
                              setSelectedPhotoId(backPhoto.id);
                              setDeleteAngle('back');
                              setIsDeleteDialogOpen(true);
                            }
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-destructive/10 transition-colors",
                            !groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.back && "invisible"
                          )}
                          aria-label="Delete back photo"
                        >
                          <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 bg-background flex items-center justify-center relative min-h-0">
                        {groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.back ? (
                          <img
                            src={groupedPhotos.find((g) => format(g.date, 'yyyy-MM-dd') === selectedGroupDate)?.photos.back.url}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-sm"
                            alt="Back view"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                              uploadingAngle?.angle === 'back' && uploadingAngle?.date === selectedGroupDate
                                ? "border-primary bg-primary/5"
                                : dragOverAngle?.angle === 'back' && dragOverAngle?.date === selectedGroupDate
                                  ? "border-primary bg-primary/10"
                                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                            )}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle({ angle: 'back', date: selectedGroupDate! });
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverAngle(null);
                              const file = e.dataTransfer.files[0];
                              if (file && file.type.startsWith('image/')) {
                                handleFileDrop('back', file, new Date(selectedGroupDate!));
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  handleFileDrop('back', file, new Date(selectedGroupDate!));
                                }
                              };
                              input.click();
                            }}
                          >
                            {uploadingAngle?.angle === 'back' && uploadingAngle?.date === selectedGroupDate ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="size-8 text-muted-foreground/40" />
                                <span className="text-xs text-muted-foreground/60">Drop or click to upload</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  <p>{t('common.selectDateViewPhotos')}</p>
                </div>
              )
            ) : selectedGroupDate ? (
              <Card className="flex-1 w-full h-full overflow-hidden shadow-md flex flex-col max-w-xs mx-auto">
                <div className="w-full py-3 px-4 border-b flex justify-between items-center flex-shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{activeView} View</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPhoto) {
                        setSelectedPhotoId(selectedPhoto.id);
                        setDeleteAngle(null);
                        setIsDeleteDialogOpen(true);
                      }
                    }}
                    className={cn(
                      "p-1 rounded hover:bg-destructive/10 transition-colors",
                      !selectedPhoto && "invisible"
                    )}
                    aria-label={`Delete ${activeView} photo`}
                  >
                    <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                <div className="flex-1 p-6 flex items-center justify-center relative bg-background min-h-0">
                  {selectedPhoto ? (
                    <img
                      src={selectedPhoto.url}
                      alt={`${selectedPhoto.type} view photo`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-sm"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                        uploadingAngle?.angle === activeView && uploadingAngle?.date === selectedGroupDate
                          ? "border-primary bg-primary/5"
                          : dragOverAngle?.angle === activeView && dragOverAngle?.date === selectedGroupDate
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverAngle({ angle: activeView as 'front' | 'back' | 'side', date: selectedGroupDate });
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverAngle(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverAngle(null);
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          handleFileDrop(activeView as 'front' | 'back' | 'side', file, new Date(selectedGroupDate));
                        }
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleFileDrop(activeView as 'front' | 'back' | 'side', file, new Date(selectedGroupDate));
                          }
                        };
                        input.click();
                      }}
                    >
                      {uploadingAngle?.angle === activeView && uploadingAngle?.date === selectedGroupDate ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="size-8 text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground/60">Drop or click to upload</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground italic">
                <p>{t('common.selectPhotoView')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddPhotoSidePanel
        open={isAddPhotoOpen}
        onOpenChange={setIsAddPhotoOpen}
        onSave={handleAddPhoto}

        clientId={clientId || ''}
        coachId={coachId || ''}
      />

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePhoto}
        itemName={
          selectedGroupDate
            ? deleteAngle
              ? `${deleteAngle} photo from ${formatDate(new Date(selectedGroupDate))}`
              : activeView === 'all'
                ? `all photos from ${formatDate(new Date(selectedGroupDate))}`
                : `${activeView} photo from ${formatDate(new Date(selectedGroupDate))}`
            : undefined
        }
        itemType="photo"
      />

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('upgrade.toPro')}</DialogTitle>
            <DialogDescription>
              Track client progress with photos - compare progress over time and visualize transformations.
            </DialogDescription>
          </DialogHeader>
          <ScreenshotPreview />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => router.push('/settings/billing')}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ClientPhotosPage;
