'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type PhotoItem = {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  view: 'front' | 'back' | 'side';
  takenAt: Date;
};

type PhotoView = 'front' | 'back' | 'side';

// Mock photo data - in production this would come from an API
const mockPhotos: PhotoItem[] = [
  {
    id: '1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'front',
    takenAt: new Date(2024, 0, 15),
  },
  {
    id: '2',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'back',
    takenAt: new Date(2024, 0, 20),
  },
  {
    id: '3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'side',
    takenAt: new Date(2024, 0, 25),
  },
  {
    id: '4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'front',
    takenAt: new Date(2024, 1, 5),
  },
  {
    id: '5',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'back',
    takenAt: new Date(2024, 1, 10),
  },
  {
    id: '6',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    view: 'side',
    takenAt: new Date(2024, 1, 15),
  },
];

const formatDate = (date: Date): string => {
  return format(date, 'MMM d, yyyy');
};

const ComparePhotosPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  
  const [leftPhotoId, setLeftPhotoId] = useState<string | null>(null);
  const [rightPhotoId, setRightPhotoId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<PhotoView>('front');
  const leftImageRef = useRef<HTMLImageElement>(null);
  const rightImageRef = useRef<HTMLImageElement>(null);

  // Filter and sort photos by view type and date (newest first)
  const sortedPhotos = useMemo(() => {
    return [...mockPhotos]
      .filter((photo) => photo.view === activeView)
      .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  }, [activeView]);

  // Set default selections (first two photos) - reset when view changes
  useEffect(() => {
    if (sortedPhotos.length >= 2) {
      setLeftPhotoId(sortedPhotos[1].id);
      setRightPhotoId(sortedPhotos[0].id);
    } else if (sortedPhotos.length === 1) {
      setLeftPhotoId(sortedPhotos[0].id);
      setRightPhotoId(null);
    } else {
      setLeftPhotoId(null);
      setRightPhotoId(null);
    }
  }, [sortedPhotos]);

  const leftPhoto = leftPhotoId ? sortedPhotos.find((p) => p.id === leftPhotoId) : null;
  const rightPhoto = rightPhotoId ? sortedPhotos.find((p) => p.id === rightPhotoId) : null;

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleLeftPhotoChange = (photoId: string) => {
    setLeftPhotoId(photoId);
  };

  const handleRightPhotoChange = (photoId: string) => {
    setRightPhotoId(photoId);
  };

  // Get available photos for left card (excluding right selected)
  const availableLeftPhotos = useMemo(() => {
    return sortedPhotos.filter((p) => p.id !== rightPhotoId);
  }, [sortedPhotos, rightPhotoId]);

  // Get available photos for right card (excluding left selected)
  const availableRightPhotos = useMemo(() => {
    return sortedPhotos.filter((p) => p.id !== leftPhotoId);
  }, [sortedPhotos, leftPhotoId]);

  // Get current index of left photo in available photos
  const leftPhotoIndex = useMemo(() => {
    if (!leftPhotoId) return -1;
    return availableLeftPhotos.findIndex((p) => p.id === leftPhotoId);
  }, [leftPhotoId, availableLeftPhotos]);

  // Get current index of right photo in available photos
  const rightPhotoIndex = useMemo(() => {
    if (!rightPhotoId) return -1;
    return availableRightPhotos.findIndex((p) => p.id === rightPhotoId);
  }, [rightPhotoId, availableRightPhotos]);

  // Left chevron goes towards the past (older dates = higher index in sorted array)
  const handlePreviousPhoto = () => {
    if (leftPhotoIndex < availableLeftPhotos.length - 1) {
      const olderPhoto = availableLeftPhotos[leftPhotoIndex + 1];
      setLeftPhotoId(olderPhoto.id);
    }
  };

  // Right chevron goes towards the future (newer dates = lower index in sorted array)
  const handleNextPhoto = () => {
    if (leftPhotoIndex > 0) {
      const newerPhoto = availableLeftPhotos[leftPhotoIndex - 1];
      setLeftPhotoId(newerPhoto.id);
    }
  };

  // Right card navigation - left chevron goes towards the past (older dates = higher index)
  const handleRightPreviousPhoto = () => {
    if (rightPhotoIndex < availableRightPhotos.length - 1) {
      const olderPhoto = availableRightPhotos[rightPhotoIndex + 1];
      setRightPhotoId(olderPhoto.id);
    }
  };

  // Right card navigation - right chevron goes towards the future (newer dates = lower index)
  const handleRightNextPhoto = () => {
    if (rightPhotoIndex > 0) {
      const newerPhoto = availableRightPhotos[rightPhotoIndex - 1];
      setRightPhotoId(newerPhoto.id);
    }
  };

  // Sync right image dimensions with left image
  const syncImageDimensions = useCallback(() => {
    if (leftImageRef.current && rightImageRef.current && leftPhoto && rightPhoto) {
      const leftImg = leftImageRef.current;
      const rightImg = rightImageRef.current;
      
      // Match the dimensions
      rightImg.style.width = `${leftImg.offsetWidth}px`;
      rightImg.style.height = `${leftImg.offsetHeight}px`;
    }
  }, [leftPhoto, rightPhoto]);

  useEffect(() => {
    syncImageDimensions();
  }, [syncImageDimensions]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/photos`)}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('photos.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {t('photos.compare')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold">{t('photos.comparingProgressPhotos')}</h1>
          </div>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex items-center justify-center w-full max-w-6xl mx-auto flex-col gap-4 h-full">
          {/* View Toggle */}
          <div className="w-full flex-shrink-0">
            <ButtonGroup className="w-full">
              <Button
                variant={activeView === 'front' ? 'default' : 'outline'}
                onClick={() => setActiveView('front')}
                className={cn(
                  'flex-1',
                  activeView === 'front' && 'bg-primary text-primary-foreground'
                )}
              >
                {t('photos.form.front')}
              </Button>
              <Button
                variant={activeView === 'back' ? 'default' : 'outline'}
                onClick={() => setActiveView('back')}
                className={cn(
                  'flex-1',
                  activeView === 'back' && 'bg-primary text-primary-foreground'
                )}
              >
                {t('photos.form.back')}
              </Button>
              <Button
                variant={activeView === 'side' ? 'default' : 'outline'}
                onClick={() => setActiveView('side')}
                className={cn(
                  'flex-1',
                  activeView === 'side' && 'bg-primary text-primary-foreground'
                )}
              >
                {t('photos.form.side')}
              </Button>
            </ButtonGroup>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-4 w-full flex-1 min-h-0">
            {/* Left Card */}
            <Card className="w-full flex flex-col relative h-full min-h-0">
              <div className="w-full pl-4 pr-4 pb-4 pt-2 border-b flex-shrink-0">
                <Select
                  value={leftPhotoId || ''}
                  onValueChange={handleLeftPhotoChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('photos.form.selectDate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeftPhotos.map((photo) => (
                      <SelectItem key={photo.id} value={photo.id}>
                        {formatDate(photo.takenAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {leftPhoto ? (
                <>
                  <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
                    <img
                      ref={leftImageRef}
                      src={leftPhoto.imageUrl}
                      alt={`Photo taken on ${formatDate(leftPhoto.takenAt)}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                      onLoad={syncImageDimensions}
                    />
                  </div>
                  {/* Navigation buttons - below the image */}
                  {availableLeftPhotos.length > 1 && (
                    <div className="flex items-center justify-center gap-2 pb-4 px-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={handlePreviousPhoto}
                        disabled={leftPhotoIndex === availableLeftPhotos.length - 1}
                        aria-label="Previous photo (older)"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={handleNextPhoto}
                        disabled={leftPhotoIndex === 0}
                        aria-label="Next photo (newer)"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
                  <p>{t('photos.emptyMessage')}</p>
                </div>
              )}
            </Card>

            {/* Right Card */}
            <Card className="w-full flex flex-col h-full min-h-0">
              <div className="w-full pl-4 pr-4 pb-4 pt-2 border-b flex-shrink-0">
                <Select
                  value={rightPhotoId || ''}
                  onValueChange={handleRightPhotoChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('photos.form.selectDate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRightPhotos.map((photo) => (
                      <SelectItem key={photo.id} value={photo.id}>
                        {formatDate(photo.takenAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {rightPhoto ? (
                <>
                  <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
                    <img
                      ref={rightImageRef}
                      src={rightPhoto.imageUrl}
                      alt={`Photo taken on ${formatDate(rightPhoto.takenAt)}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                      onLoad={syncImageDimensions}
                    />
                  </div>
                  {/* Navigation buttons - below the image */}
                  {availableRightPhotos.length > 1 && (
                    <div className="flex items-center justify-center gap-2 pb-4 px-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={handleRightPreviousPhoto}
                        disabled={rightPhotoIndex === availableRightPhotos.length - 1}
                        aria-label="Previous photo (older)"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={handleRightNextPhoto}
                        disabled={rightPhotoIndex === 0}
                        aria-label="Next photo (newer)"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
                  <p>{t('photos.emptyMessage')}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePhotosPage;
