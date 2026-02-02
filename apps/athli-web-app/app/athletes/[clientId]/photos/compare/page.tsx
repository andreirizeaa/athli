'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientPhotos } from '@/hooks/use-client-photos';
import { addClientPhotos, deleteClientPhotoAngle, type AddClientPhotosData, type ClientPhoto } from '@/api/client/client-photo-service';
import { ComparisonCard } from '@/components/photos/comparison-card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useUserProfile } from '@/hooks/use-user-profile';

const PhotoComparisonPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; contactId: string }>();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const coachId = user?.id;

  const { photos, isLoading } = useClientPhotos(clientId);

  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups: { [key: string]: { date: Date; photos: { front?: ClientPhoto; back?: ClientPhoto; side?: ClientPhoto } } } = {};

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

    // Sort by date descending
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [photos]);

  const [leftIndex, setLeftIndex] = useState<number>(0);
  const [rightIndex, setRightIndex] = useState<number>(0);
  const [angleFilter, setAngleFilter] = useState<'all' | 'front' | 'back' | 'side'>('all');

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [deleteAngle, setDeleteAngle] = useState<'front' | 'side' | 'back' | null>(null);
  const [deleteDate, setDeleteDate] = useState<Date | null>(null);

  // Initialize indices when photos load
  useEffect(() => {
    if (groupedPhotos.length > 0) {
      // Right card shows newest (index 0)
      setRightIndex(0);

      // Left card shows second newest (index 1) if available, otherwise index 0 (will show empty if hasOnlyOneDate is true)
      if (groupedPhotos.length > 1) {
        setLeftIndex(1);
      } else {
        setLeftIndex(0);
      }
    }
  }, [groupedPhotos.length]);

  const handleDateChange = (side: 'left' | 'right', direction: 'prev' | 'next') => {
    const currentIndex = side === 'left' ? leftIndex : rightIndex;
    const setIndex = side === 'left' ? setLeftIndex : setRightIndex;

    if (direction === 'prev') {
      // Prev means OLDER date (higher index)
      if (currentIndex < groupedPhotos.length - 1) {
        setIndex(currentIndex + 1);
      }
    } else {
      // Next means NEWER date (lower index)
      if (currentIndex > 0) {
        setIndex(currentIndex - 1);
      }
    }
  };

  const handleDateSelect = (side: 'left' | 'right', date: Date) => {
    const index = groupedPhotos.findIndex(g => format(g.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    if (index !== -1) {
      if (side === 'left') {
        setLeftIndex(index);
      } else {
        setRightIndex(index);
      }
    }
  };

  const handleUpload = async (
    date: Date,
    angle: 'front' | 'side' | 'back',
    file: File
  ) => {
    if (!clientId || !coachId) return;
    try {
      const data: AddClientPhotosData = {
        clientId,
        coachId,
        recordedAt: date,
        frontFile: angle === 'front' ? file : undefined,
        sideFile: angle === 'side' ? file : undefined,
        backFile: angle === 'back' ? file : undefined,
      };
      await addClientPhotos(data);
      await queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  const handleDelete = async (photoId: string, angle: 'front' | 'side' | 'back', date: Date) => {
    setDeletePhotoId(photoId);
    setDeleteAngle(angle);
    setDeleteDate(date);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientId || !deletePhotoId || !deleteAngle || !coachId) return;
    try {
      await deleteClientPhotoAngle(clientId, coachId, deletePhotoId, deleteAngle);
      await queryClient.invalidateQueries({ queryKey: ['client-photos', clientId] });
    } catch (error) {
      console.error('Failed to delete photo angle:', error);
    } finally {
      setDeletePhotoId(null);
      setDeleteAngle(null);
      setDeleteDate(null);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // Redirect to photos page if no photos available
  if (groupedPhotos.length === 0) {
    router.push(`/athletes/${clientId}/photos`);
    return null;
  }

  const hasOnlyOneDate = groupedPhotos.length === 1;
  const leftGroup = hasOnlyOneDate ? null : groupedPhotos[leftIndex];
  const rightGroup = groupedPhotos[rightIndex];
  const availableDates = groupedPhotos.map(g => g.date);

  const handleNavigateToPhotos = () => {
    router.push(`/athletes/${clientId}/photos`);
  };

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0 bg-background">
      {/* Header with Breadcrumb */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={handleNavigateToPhotos}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  Photos
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronLeft className="h-2 w-2 rotate-180" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  Compare
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-[22px] font-semibold">Compare Photos</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden relative flex flex-col gap-4">
        {/* Angle Filter Toggle */}
        <div className="w-full flex-shrink-0">
          <Tabs value={angleFilter} onValueChange={(value) => setAngleFilter(value as 'all' | 'front' | 'back' | 'side')}>
            <TabsList className="w-full">
              <TabsTrigger
                value="all"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="front"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                Front
              </TabsTrigger>
              <TabsTrigger
                value="back"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                Back
              </TabsTrigger>
              <TabsTrigger
                value="side"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                Side
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Comparison Cards */}
        <div className="flex-1 w-full grid grid-cols-2 gap-4 min-h-0">
          {/* Left Card */}
          <ComparisonCard
            date={leftGroup?.date || null}
            photos={leftGroup?.photos || {}}
            availableDates={availableDates}
            hasPrev={!hasOnlyOneDate && leftIndex < groupedPhotos.length - 1}
            hasNext={!hasOnlyOneDate && leftIndex > 0}
            onDateChange={(dir) => handleDateChange('left', dir)}
            onDateSelect={(date) => handleDateSelect('left', date)}
            onUpload={(angle, file) => {
              if (leftGroup) {
                return handleUpload(leftGroup.date, angle, file);
              }
              return Promise.resolve();
            }}
            onDelete={handleDelete}
            isEmpty={hasOnlyOneDate}
            angleFilter={angleFilter}
            className="h-full"
          />

          {/* Right Card */}
          <ComparisonCard
            date={rightGroup?.date || null}
            photos={rightGroup?.photos || {}}
            availableDates={availableDates}
            hasPrev={rightIndex < groupedPhotos.length - 1}
            hasNext={rightIndex > 0}
            onDateChange={(dir) => handleDateChange('right', dir)}
            onDateSelect={(date) => handleDateSelect('right', date)}
            onUpload={(angle, file) => {
              if (rightGroup) {
                return handleUpload(rightGroup.date, angle, file);
              }
              return Promise.resolve();
            }}
            onDelete={handleDelete}
            angleFilter={angleFilter}
            className="h-full"
          />
        </div>
      </div>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={
          deleteAngle && deleteDate
            ? `${deleteAngle.charAt(0).toUpperCase() + deleteAngle.slice(1)} View (${format(deleteDate, 'MMM d, yyyy')})`
            : ''
        }
        itemType="photo"
      />
    </div>
  );
};

export default PhotoComparisonPage;
