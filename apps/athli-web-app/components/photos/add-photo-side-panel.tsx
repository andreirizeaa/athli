'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, ChevronDownIcon, X, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';
import { AddClientPhotosData, checkExistingPhotos } from '@/api/client/client-photo-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

type PhotoType = 'front' | 'side' | 'back';

type AddPhotoSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AddClientPhotosData) => Promise<void>;
  clientId: string;
};

export const AddPhotoSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
}: AddPhotoSidePanelProps) => {
  const t = useTranslations();
  const [photos, setPhotos] = useState<{
    front: { file: File | null; preview: string | null };
    side: { file: File | null; preview: string | null };
    back: { file: File | null; preview: string | null };
  }>({
    front: { file: null, preview: null },
    side: { file: null, preview: null },
    back: { file: null, preview: null },
  });
  const [recordedAt, setRecordedAt] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverType, setDragOverType] = useState<PhotoType | null>(null);
  const [existingAngles, setExistingAngles] = useState<PhotoType[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const dragCounterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const cleanupPreviews = () => {
    Object.values(photos).forEach((p) => {
      if (p.preview) URL.revokeObjectURL(p.preview);
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    cleanupPreviews();
    setPhotos({
      front: { file: null, preview: null },
      side: { file: null, preview: null },
      back: { file: null, preview: null },
    });
    setRecordedAt(new Date());
    setIsSaving(false);
    setExistingAngles([]);
  };

  useEffect(() => {
    if (!open) {
      cleanupPreviews();
    }
    return cleanupPreviews;
  }, [open]);

  // Check for existing photos when date or uploaded photos change
  useEffect(() => {
    const checkPhotos = async () => {
      if (!recordedAt || !clientId) {
        setExistingAngles([]);
        return;
      }

      // Only check if user has selected at least one photo
      const hasSelectedPhotos = photos.front.file || photos.side.file || photos.back.file;
      if (!hasSelectedPhotos) {
        setExistingAngles([]);
        return;
      }

      setIsChecking(true);
      try {
        const result = await checkExistingPhotos({
          clientId,
          date: recordedAt,
        });

        if (result.exists && result.angles.length > 0) {
          // Filter to only show warnings for angles that conflict with what user is uploading
          const conflictingAngles = result.angles.filter((angle) => {
            return photos[angle].file !== null;
          });
          setExistingAngles(conflictingAngles as PhotoType[]);
        } else {
          setExistingAngles([]);
        }
      } catch (error) {
        console.error('Error checking existing photos:', error);
        setExistingAngles([]);
      } finally {
        setIsChecking(false);
      }
    };

    checkPhotos();
  }, [recordedAt, photos.front.file, photos.side.file, photos.back.file, clientId]);

  const handleFileSelect = (type: PhotoType, file: File) => {
    if (!file.type.startsWith('image/')) return;

    const preview = URL.createObjectURL(file);
    setPhotos((prev) => {
      if (prev[type].preview) URL.revokeObjectURL(prev[type].preview!);
      return {
        ...prev,
        [type]: { file, preview },
      };
    });
  };

  const handleRemovePhoto = (type: PhotoType) => {
    setPhotos((prev) => {
      if (prev[type].preview) URL.revokeObjectURL(prev[type].preview!);
      return {
        ...prev,
        [type]: { file: null, preview: null },
      };
    });
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current!.value = '';
    }
  };

  const handleSave = async () => {
    if (!recordedAt || isSaving) return;
    if (!photos.front.file && !photos.side.file && !photos.back.file) return;

    setIsSaving(true);
    try {
      await onSave({
        clientId,
        frontFile: photos.front.file,
        sideFile: photos.side.file,
        backFile: photos.back.file,
        recordedAt,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save photos:', error);
    } finally {
      setIsSaving(false);
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
      setDragOverType(null);
    }
  };

  const getDropType = (clientX: number): PhotoType | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) return 'front';
    if (x < (width * 2) / 3) return 'side';
    return 'back';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const type = getDropType(e.clientX);
    setDragOverType(type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragOverType(null);
    dragCounterRef.current = 0;

    const type = getDropType(e.clientX);
    const file = e.dataTransfer.files[0];
    if (type && file) {
      handleFileSelect(type, file);
    }
  };

  const hasAnyPhoto = photos.front.file || photos.side.file || photos.back.file;

  const PhotoUploadBox = ({ type, label }: { type: PhotoType, label: string }) => {
    const photo = photos[type];
    return (
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase px-1 font-semibold">{label}</Label>
        <div
          className={cn(
            'relative aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden group',
            photo.file ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
          )}
        >
          {photo.preview ? (
            <>
              <img
                src={photo.preview}
                alt={label}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleRemovePhoto(type)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              onClick={() => fileInputRefs[type].current?.click()}
            >
              <div className="p-2 rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">{t('photos.form.selectImage')}</span>
            </button>
          )}
          <Input
            ref={fileInputRefs[type]}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(type, file);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('photos.addPhoto')}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasAnyPhoto || !recordedAt || isSaving}
            className="min-w-[80px]"
          >
            {isSaving ? t('general.saving') : t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="flex flex-col gap-8 flex-1 relative min-h-0"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex h-full gap-2 p-2 bg-background/60 backdrop-blur-[2px]">
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-colors rounded-xl p-4 text-center',
                dragOverType === 'front'
                  ? 'bg-primary/20 border-primary'
                  : 'bg-background/80 border-muted-foreground/20'
              )}
            >
              <Upload className={cn('size-10 mb-4', dragOverType === 'front' ? 'text-primary' : 'text-muted-foreground')} />
              <p className={cn('text-sm font-bold uppercase mb-1', dragOverType === 'front' ? 'text-primary' : 'text-muted-foreground')}>FRONT</p>
              <p className={cn('text-xs font-medium', dragOverType === 'front' ? 'text-primary/80' : 'text-muted-foreground/70')}>Drop front photo here</p>
            </div>
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-colors rounded-xl p-4 text-center',
                dragOverType === 'side'
                  ? 'bg-primary/20 border-primary'
                  : 'bg-background/80 border-muted-foreground/20'
              )}
            >
              <Upload className={cn('size-10 mb-4', dragOverType === 'side' ? 'text-primary' : 'text-muted-foreground')} />
              <p className={cn('text-sm font-bold uppercase mb-1', dragOverType === 'side' ? 'text-primary' : 'text-muted-foreground')}>SIDE</p>
              <p className={cn('text-xs font-medium', dragOverType === 'side' ? 'text-primary/80' : 'text-muted-foreground/70')}>Drop side photo here</p>
            </div>
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-colors rounded-xl p-4 text-center',
                dragOverType === 'back'
                  ? 'bg-primary/20 border-primary'
                  : 'bg-background/80 border-muted-foreground/20'
              )}
            >
              <Upload className={cn('size-10 mb-4', dragOverType === 'back' ? 'text-primary' : 'text-muted-foreground')} />
              <p className={cn('text-sm font-bold uppercase mb-1', dragOverType === 'back' ? 'text-primary' : 'text-muted-foreground')}>BACK</p>
              <p className={cn('text-xs font-medium', dragOverType === 'back' ? 'text-primary/80' : 'text-muted-foreground/70')}>Drop back photo here</p>
            </div>
          </div>
        )}

        <div className={cn('flex flex-col gap-8 flex-1', isDragging && 'opacity-0 pointer-events-none')}>
          {/* Photos Grid */}
          <div className="grid grid-cols-3 gap-4">
            <PhotoUploadBox type="front" label={t('photos.form.front')} />
            <PhotoUploadBox type="side" label={t('photos.form.side')} />
            <PhotoUploadBox type="back" label={t('photos.form.back')} />
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="date" className="text-xs text-muted-foreground uppercase px-1 font-semibold flex items-center">
              {t('photos.form.takenAt')}
              <RequiredAsterisk />
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors"
                  aria-label={t('photos.form.selectDate')}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{recordedAt ? recordedAt.toLocaleDateString() : t('photos.form.selectDate')}</span>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={recordedAt}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setRecordedAt(date);
                    setIsCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Warning for existing photos */}
          {existingAngles.length > 0 && recordedAt && (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <Info className="size-4" />
              <AlertDescription className="min-w-0 line-clamp-4">
                {existingAngles.length === 1 ? (
                  <>A <strong>{existingAngles[0]}</strong> photo already exists for <strong>{format(recordedAt, 'd MMM, yyyy')}</strong>. If you proceed, it will be overwritten.</>
                ) : (
                  <>Photos for <strong>{existingAngles.join(', ')}</strong> already exist for <strong>{format(recordedAt, 'd MMM, yyyy')}</strong>. If you proceed, they will be overwritten.</>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </SidePanel>
  );
};
