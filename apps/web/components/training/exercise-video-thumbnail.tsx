'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Play, Loader2, X, User, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';
import { getExerciseVideos } from '@/api/exercise/exercise-search';

type VideoType = 'male_front' | 'male_side' | 'female_front' | 'female_side';

interface ExerciseVideoThumbnailProps {
  exerciseId: string;
  thumbnailUrl?: string;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Exercise Video Thumbnail Component
 *
 * Displays a thumbnail image for an exercise and allows users to click to watch
 * the exercise video. Videos are lazy-loaded only when the user clicks to watch,
 * minimizing API calls to MuscleWiki.
 *
 * Features:
 * - Shows thumbnail with play button overlay
 * - Lazy loads video URLs only when user clicks
 * - Supports multiple video angles (front/side) and models (male/female)
 * - Shows loading state while fetching video URLs
 */
export function ExerciseVideoThumbnail({
  exerciseId,
  thumbnailUrl,
  name,
  className,
  size = 'md',
}: ExerciseVideoThumbnailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrls, setVideoUrls] = useState<{
    maleVideoFrontUrl?: string;
    maleVideoSideUrl?: string;
    femaleVideoFrontUrl?: string;
    femaleVideoSideUrl?: string;
  } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoType>('male_front');
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const handleClick = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    try {
      const videos = await getExerciseVideos(exerciseId);
      if (videos) {
        setVideoUrls(videos);
        // Select first available video
        if (videos.maleVideoFrontUrl) {
          setSelectedVideo('male_front');
        } else if (videos.maleVideoSideUrl) {
          setSelectedVideo('male_side');
        } else if (videos.femaleVideoFrontUrl) {
          setSelectedVideo('female_front');
        } else if (videos.femaleVideoSideUrl) {
          setSelectedVideo('female_side');
        }
      } else {
        setError('No video available for this exercise');
      }
    } catch (err) {
      console.error('Failed to load exercise video:', err);
      setError('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId]);

  const getCurrentVideoUrl = (): string | undefined => {
    if (!videoUrls) return undefined;
    switch (selectedVideo) {
      case 'male_front':
        return videoUrls.maleVideoFrontUrl;
      case 'male_side':
        return videoUrls.maleVideoSideUrl;
      case 'female_front':
        return videoUrls.femaleVideoFrontUrl;
      case 'female_side':
        return videoUrls.femaleVideoSideUrl;
      default:
        return undefined;
    }
  };

  const hasVideo = (type: VideoType): boolean => {
    if (!videoUrls) return false;
    switch (type) {
      case 'male_front':
        return !!videoUrls.maleVideoFrontUrl;
      case 'male_side':
        return !!videoUrls.maleVideoSideUrl;
      case 'female_front':
        return !!videoUrls.femaleVideoFrontUrl;
      case 'female_side':
        return !!videoUrls.femaleVideoSideUrl;
      default:
        return false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'relative rounded-lg overflow-hidden bg-muted group cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          sizeClasses[size],
          className
        )}
        aria-label={`Watch ${name} exercise video`}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes={size === 'lg' ? '96px' : size === 'md' ? '64px' : '40px'}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-6 w-6 text-white fill-white" />
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogTitle className="sr-only">{name} - Exercise Video</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">{name}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Video Content */}
          <div className="relative aspect-video bg-black">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <p>{error}</p>
              </div>
            ) : getCurrentVideoUrl() ? (
              <video
                key={getCurrentVideoUrl()}
                src={getCurrentVideoUrl()}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
                controls
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <p>No video available</p>
              </div>
            )}
          </div>

          {/* Video Selection Controls */}
          {videoUrls && (
            <div className="p-4 border-t">
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  <span className="text-sm text-muted-foreground mr-2 flex items-center">
                    <User className="h-4 w-4 mr-1" /> Male:
                  </span>
                  {hasVideo('male_front') && (
                    <Button
                      size="sm"
                      variant={selectedVideo === 'male_front' ? 'default' : 'outline'}
                      onClick={() => setSelectedVideo('male_front')}
                    >
                      Front
                    </Button>
                  )}
                  {hasVideo('male_side') && (
                    <Button
                      size="sm"
                      variant={selectedVideo === 'male_side' ? 'default' : 'outline'}
                      onClick={() => setSelectedVideo('male_side')}
                    >
                      Side
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <span className="text-sm text-muted-foreground mr-2 flex items-center">
                    <User className="h-4 w-4 mr-1" /> Female:
                  </span>
                  {hasVideo('female_front') && (
                    <Button
                      size="sm"
                      variant={selectedVideo === 'female_front' ? 'default' : 'outline'}
                      onClick={() => setSelectedVideo('female_front')}
                    >
                      Front
                    </Button>
                  )}
                  {hasVideo('female_side') && (
                    <Button
                      size="sm"
                      variant={selectedVideo === 'female_side' ? 'default' : 'outline'}
                      onClick={() => setSelectedVideo('female_side')}
                    >
                      Side
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attribution - Required by MuscleWiki API Terms Section 8 */}
          <div className="px-4 py-2 border-t bg-muted/50 text-center">
            <span className="text-xs text-muted-foreground">
              Powered by{' '}
              <a
                href="https://musclewiki.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MuscleWiki
              </a>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExerciseVideoThumbnail;
