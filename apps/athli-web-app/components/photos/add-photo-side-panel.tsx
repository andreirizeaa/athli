'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PhotoType = 'front' | 'back' | 'side';

type AddPhotoSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (type: PhotoType, file: File, takenAt: Date) => Promise<void>;
  clientId: string;
};

export const AddPhotoSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
}: AddPhotoSidePanelProps) => {
  const t = useTranslations();
  const [photoType, setPhotoType] = useState<PhotoType>('front');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [takenAt, setTakenAt] = useState<Date | undefined>(new Date());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleClose = () => {
    onOpenChange(false);
    setPhotoType('front');
    setSelectedFile(null);
    setImagePreview(null);
    setTakenAt(new Date());
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Clean up object URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !takenAt) return;
    await onSave(photoType, selectedFile, takenAt);
    handleClose();
  };

  const handleFileSelect = (file: File) => {
    // Only allow image files
    if (!file.type.startsWith('image/')) {
      return;
    }
    setSelectedFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    // Clean up previous preview if exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(previewUrl);
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
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
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
            disabled={!selectedFile || !takenAt}
          >
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
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
            <p className="text-lg font-semibold text-primary">Drop image here</p>
          </div>
        )}
        
        {/* Form Content - hidden when dragging */}
        <div className={cn('flex flex-col gap-6', isDragging && 'opacity-0 pointer-events-none')}>
          {/* Type Dropdown */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="photo-type" className="px-1">
              {t('photos.form.type')}
            </Label>
            <Select value={photoType} onValueChange={(value) => setPhotoType(value as PhotoType)}>
              <SelectTrigger id="photo-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front">{t('photos.form.front')}</SelectItem>
                <SelectItem value="back">{t('photos.form.back')}</SelectItem>
                <SelectItem value="side">{t('photos.form.side')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Selection */}
          <div className="flex flex-col gap-2">
            <Label className="px-1">{t('photos.form.image')}</Label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors',
                selectedFile ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary'
              )}
            >
              {selectedFile && imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="size-20 object-cover rounded-md"
                  />
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
                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                      }
                      setImagePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    {t('photos.form.changeImage')}
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="size-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{t('photos.form.dropImageHere')}</p>
                    <p className="text-xs text-muted-foreground">{t('photos.form.orClickToSelect')}</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('photos.form.selectImage')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="date" className="px-1">
              {t('photos.form.takenAt')}
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className="w-full justify-between font-normal bg-sidebar"
                >
                  {takenAt ? takenAt.toLocaleDateString() : t('photos.form.selectDate')}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={takenAt}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setTakenAt(date);
                    setIsCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </SidePanel>
  );
};
