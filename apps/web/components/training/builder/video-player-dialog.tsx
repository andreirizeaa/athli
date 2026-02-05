'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getExerciseVideos } from '@/api/exercise/exercise-search';

type VideoPlayerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName?: string;
  musclewikiId?: string;
  customVideoUrl?: string;
};

export const VideoPlayerDialog = ({
  open,
  onOpenChange,
  exerciseName,
  musclewikiId,
  customVideoUrl,
}: VideoPlayerDialogProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Fetch video URL when dialog opens
  useEffect(() => {
    if (!open) {
      setVideoUrl(null);
      return;
    }

    // If custom video URL is provided, use it directly
    if (customVideoUrl) {
      setVideoUrl(customVideoUrl);
      return;
    }

    // Fetch from MuscleWiki
    if (musclewikiId) {
      setIsLoadingVideo(true);
      getExerciseVideos(musclewikiId)
        .then((videos) => {
          setVideoUrl(videos?.maleVideoFrontUrl || null);
        })
        .finally(() => setIsLoadingVideo(false));
    }
  }, [open, musclewikiId, customVideoUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[900px] sm:max-w-[900px] p-0" showCloseButton={false}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-left text-xl">{exerciseName}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
            {isLoadingVideo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No video available
              </div>
            )}
          </div>

          {/* Attribution */}
          {!customVideoUrl && (
            <p className="text-xs text-muted-foreground mt-3">
              Powered by MuscleWiki
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
