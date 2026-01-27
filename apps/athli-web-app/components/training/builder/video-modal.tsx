'use client';

import { useEffect, useState } from 'react';
import { X, Dumbbell, Target, Zap, Settings2, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getExerciseVideos } from '@/api/exercise/exercise-search';
import type { Exercise } from '@/api/exercise/exercise-search';

type VideoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
};

export const VideoModal = ({ open, onOpenChange, exercise }: VideoModalProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Fetch male front video URL when modal opens
  useEffect(() => {
    if (open && exercise?.musclewikiId) {
      setIsLoadingVideo(true);
      getExerciseVideos(exercise.musclewikiId)
        .then((videos) => {
          setVideoUrl(videos?.maleVideoFrontUrl || null);
        })
        .finally(() => setIsLoadingVideo(false));
    } else {
      setVideoUrl(null);
    }
  }, [open, exercise?.musclewikiId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1400px] sm:max-w-[1400px] h-[85vh] flex flex-col p-0" showCloseButton={false}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-left text-xl">{exercise?.name}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          {exercise && (
            <div className="flex flex-wrap gap-2 mt-2">
              {exercise.category && (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <Dumbbell className="w-3 h-3 mr-1" />
                  {exercise.category}
                </Badge>
              )}
              {exercise.difficulty && (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  {exercise.difficulty}
                </Badge>
              )}
              {exercise.force && (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <Zap className="w-3 h-3 mr-1" />
                  {exercise.force}
                </Badge>
              )}
              {exercise.mechanic && (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <Settings2 className="w-3 h-3 mr-1" />
                  {exercise.mechanic}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        {exercise && (
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
              {/* Video Section */}
              <div className="p-6 flex flex-col">
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
                <p className="text-xs text-muted-foreground mt-3">
                  Powered by MuscleWiki
                </p>
              </div>

              {/* Details Section - Instructions and Muscles side by side */}
              <ScrollArea className="border-l bg-muted/30 h-full">
                <div className="p-6 space-y-6">
                  {/* Instructions Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Instructions</h3>
                    {exercise.instructions?.length > 0 ? (
                      <ol className="space-y-3">
                        {exercise.instructions.map((step, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">No instructions available.</p>
                    )}
                  </div>

                  {/* Muscles Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Muscles</h3>
                    <div className="space-y-4">
                      {exercise.targetMuscles?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium flex items-center gap-2 mb-2 text-muted-foreground">
                            <Target className="w-3 h-3 text-primary" />
                            Primary
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {exercise.targetMuscles.map((muscle) => (
                              <Badge key={muscle} variant="outline" className="border-primary text-primary">
                                {muscle}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {exercise.secondaryMuscles?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium flex items-center gap-2 mb-2 text-muted-foreground">
                            <Target className="w-3 h-3" />
                            Secondary
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {exercise.secondaryMuscles.map((muscle) => (
                              <Badge key={muscle} variant="secondary">
                                {muscle}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!exercise.targetMuscles?.length && !exercise.secondaryMuscles?.length) && (
                        <p className="text-sm text-muted-foreground">No muscle information available.</p>
                      )}
                    </div>
                  </div>

                  {/* Tips Section */}
                  {exercise.exerciseTips?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Tips</h3>
                      <ul className="space-y-2">
                        {exercise.exerciseTips.map((tip, index) => (
                          <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
