'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, GitCompare, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddPhotoSidePanel } from '@/components/photos/add-photo-side-panel';
import { addClientPhoto } from '@/lib/athletes/athlete-service';

type PhotoView = 'all' | 'front' | 'back' | 'side';

type PhotoItem = {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  view: 'front' | 'back' | 'side';
  takenAt: Date;
};

// Mock photo data
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

const ClientPhotosPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const [activeView, setActiveView] = useState<PhotoView>('all');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const handleViewChange = (view: PhotoView) => {
    setActiveView(view);
  };

  const filteredPhotos = useMemo(() => {
    if (activeView === 'all') {
      return mockPhotos;
    }
    return mockPhotos.filter((photo) => photo.view === activeView);
  }, [activeView]);

  const formatDate = (date: Date): string => {
    return format(date, 'MMM d, yyyy');
  };

  const getViewLabel = (view: 'front' | 'back' | 'side'): string => {
    return view.charAt(0).toUpperCase() + view.slice(1);
  };

  const selectedPhoto = selectedPhotoId
    ? mockPhotos.find((photo) => photo.id === selectedPhotoId)
    : null;

  const handleAddPhoto = async (type: 'front' | 'back' | 'side', file: File, takenAt: Date) => {
    if (!clientId) return;
    try {
      await addClientPhoto({
        clientId,
        type,
        file,
        takenAt,
      });
      // TODO: Refresh photos list
    } catch (error) {
      console.error('Failed to add photo:', error);
      // TODO: Show error toast
    }
  };

  const handleDeletePhoto = () => {
    // TODO: Implement delete photo
    console.log('Deleting photo:', selectedPhotoId);
    setIsDeleteDialogOpen(false);
    setSelectedPhotoId(null);
  };

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar navigation */}
        <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
          <div className="w-full relative flex-shrink-0">
            <div className="px-4 flex items-center mb-2 mt-2">
              <ButtonGroup className="w-full">
                <Button
                  variant={activeView === 'all' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('all')}
                  className={cn(
                    'flex-1',
                    activeView === 'all' && 'bg-primary text-primary-foreground'
                  )}
                >
                  All
                </Button>
                <Button
                  variant={activeView === 'front' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('front')}
                  className={cn(
                    'flex-1',
                    activeView === 'front' && 'bg-primary text-primary-foreground'
                  )}
                >
                  Front
                </Button>
                <Button
                  variant={activeView === 'back' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('back')}
                  className={cn(
                    'flex-1',
                    activeView === 'back' && 'bg-primary text-primary-foreground'
                  )}
                >
                  Back
                </Button>
                <Button
                  variant={activeView === 'side' ? 'default' : 'outline'}
                  onClick={() => handleViewChange('side')}
                  className={cn(
                    'flex-1',
                    activeView === 'side' && 'bg-primary text-primary-foreground'
                  )}
                >
                  Side
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-0">
              {filteredPhotos.map((photo, index) => {
                const isSelected = selectedPhotoId === photo.id;
                const isLast = index === filteredPhotos.length - 1;

                return (
                  <React.Fragment key={photo.id}>
                    <button
                      onClick={() => setSelectedPhotoId(photo.id)}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-3 rounded-md text-sm transition-colors text-left',
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                    >
                      <div className="flex-shrink-0">
                        <img
                          src={photo.thumbnailUrl}
                          alt={`${photo.view} view photo`}
                          className="w-10 h-10 object-cover rounded-md"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs w-fit',
                            photo.view === 'front' && 'border-primary text-primary',
                            photo.view === 'back' && 'border-primary text-primary',
                            photo.view === 'side' && 'border-primary text-primary'
                          )}
                        >
                          {getViewLabel(photo.view)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(photo.takenAt)}
                        </span>
                      </div>
                    </button>
                    {!isLast && <Separator className="my-1" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="w-full relative flex-shrink-0">
            <div className="px-4 flex items-center justify-end mb-2 mt-2">
              <ButtonGroup>
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(`/athletes/${clientId}/photos/compare`);
                  }}
                  className="gap-2 rounded-r-none border-r-0"
                >
                  <GitCompare className="size-4" />
                  <span>{t('photos.compare')}</span>
                </Button>
                <Button
                  onClick={() => setIsAddPhotoOpen(true)}
                  className="gap-2 rounded-l-none"
                >
                  <Plus className="size-4" />
                  <span>Add photo</span>
                </Button>
              </ButtonGroup>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 relative">
            {selectedPhoto ? (
              <>
                <div className="flex items-center justify-center h-full w-full">
                  <img
                    src={selectedPhoto.imageUrl}
                    alt={`${selectedPhoto.view} view photo`}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-md border"
                  />
                </div>
                <div className="absolute bottom-4 right-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="size-4" />
                    <span>{t('general.delete')}</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a photo to view</p>
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
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('photos.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('photos.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('general.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('general.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientPhotosPage;
