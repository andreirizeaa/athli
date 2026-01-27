'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiAsyncSelect } from '@/components/ui/multi-async-select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Spinner } from '@/components/ui/spinner';
import { X, Upload, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { createExercise } from '@/api/coach/coach-exercise-service';
import { toast } from 'sonner';
import {
  MUSCLEWIKI_CATEGORY_OPTIONS,
  MUSCLEWIKI_MUSCLE_OPTIONS,
  MUSCLEWIKI_DIFFICULTY_OPTIONS,
} from '@athli/shared-types';

// Check if URL is a Supabase storage URL (custom upload)
const isSupabaseUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  try {
    const urlObj = new URL(url.trim());
    return urlObj.hostname.includes('supabase.co');
  } catch {
    return false;
  }
};

const extractVideoId = (url: string): { id: string; type: 'youtube' | 'vimeo' | null } => {
  if (!url.trim()) {
    return { id: '', type: null };
  }

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { id: youtubeMatch[1], type: 'youtube' };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { id: vimeoMatch[1], type: 'vimeo' };
  }

  return { id: '', type: null };
};

type AddExerciseSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const AddExerciseSidePanel = ({ open, onOpenChange, onSave }: AddExerciseSidePanelProps) => {
  const t = useTranslations();
  const [exerciseName, setExerciseName] = useState<string>('');
  const [exerciseInstructions, setExerciseInstructions] = useState<string>('');
  const [videoLink, setVideoLink] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [vimeoThumbnail, setVimeoThumbnail] = useState<string | null>(null);
  const [isLoadingVimeoThumbnail, setIsLoadingVimeoThumbnail] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('');
  const [exerciseNameError, setExerciseNameError] = useState<string | null>(null);
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);
  const [videoFileError, setVideoFileError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [muscleGroupsError, setMuscleGroupsError] = useState<string | null>(null);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const resetForm = () => {
    setExerciseName('');
    setExerciseInstructions('');
    setVideoLink('');
    setVideoFile(null);
    setVideoPreview(null);
    setVimeoThumbnail(null);
    setIsLoadingVimeoThumbnail(false);
    setIsDragging(false);
    setCategory('');
    setMuscleGroups([]);
    setDifficulty('');
    setExerciseNameError(null);
    setVideoLinkError(null);
    setVideoFileError(null);
    setCategoryError(null);
    setMuscleGroupsError(null);
    setDifficultyError(null);
    setIsSaving(false);
    dragCounterRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  };

  // Reset form when panel closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Fetch Vimeo thumbnail when video link changes
  useEffect(() => {
    if (videoFile) {
      // If file is selected, clear link
      setVideoLink('');
      setVimeoThumbnail(null);
      setIsLoadingVimeoThumbnail(false);
      return;
    }

    const { id, type } = extractVideoId(videoLink);

    if (id && type === 'vimeo') {
      setIsLoadingVimeoThumbnail(true);
      setVimeoThumbnail(null);

      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoLink)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch Vimeo thumbnail');
          }
          return response.json();
        })
        .then((data) => {
          if (data.thumbnail_url) {
            setVimeoThumbnail(data.thumbnail_url);
          }
        })
        .catch((error) => {
          console.error('Error fetching Vimeo thumbnail:', error);
          setVimeoThumbnail(null);
        })
        .finally(() => {
          setIsLoadingVimeoThumbnail(false);
        });
    } else {
      setVimeoThumbnail(null);
      setIsLoadingVimeoThumbnail(false);
    }
  }, [videoLink, videoFile]);

  // Handle video file selection
  const handleVideoFileSelect = (file: File) => {
    if (file.type !== 'video/mp4') {
      setVideoFileError(t('exercises.addExercise.videoFileTypeError') || 'Only MP4 video files are allowed');
      return;
    }

    // Check file size (50MB limit)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeInBytes) {
      setVideoFileError(t('exercises.addExercise.videoFileSizeError') || 'Video file must be 50MB or less');
      return;
    }

    // Clear any previous errors
    setVideoFileError(null);
    setVideoFile(file);
    // Clear video link when file is selected
    setVideoLink('');
    setVimeoThumbnail(null);
    setIsLoadingVimeoThumbnail(false);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(previewUrl);
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
    if (droppedFile && droppedFile.type === 'video/mp4') {
      handleVideoFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'video/mp4') {
      handleVideoFileSelect(file);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isFormValid = exerciseName.trim() !== '';

  const handleSave = async () => {
    let hasError = false;

    if (!exerciseName.trim()) {
      setExerciseNameError(t('exercises.addExercise.exerciseNameRequiredError'));
      hasError = true;
    } else {
      setExerciseNameError(null);
    }

    // Video validation - optional, but if provided must be valid
    if (videoLink.trim() && !videoFile) {
      // Supabase URLs are valid (custom uploads)
      if (isSupabaseUrl(videoLink)) {
        setVideoLinkError(null);
      } else {
        // Validate link only if provided and no file is selected
        const { id, type } = extractVideoId(videoLink);
        if (!id || !type) {
          setVideoLinkError(t('exercises.addExercise.videoLinkInvalidError'));
          hasError = true;
        } else {
          setVideoLinkError(null);
        }
      }
    } else {
      setVideoLinkError(null);
    }

    // Validate video file size if file is selected
    if (videoFile) {
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
      if (videoFile.size > maxSizeInBytes) {
        setVideoFileError(t('exercises.addExercise.videoFileSizeError') || 'Video file must be 50MB or less');
        hasError = true;
      } else {
        setVideoFileError(null);
      }
    } else {
      setVideoFileError(null);
    }

    // Category validation - Optional
    // if (!category) {
    //   setCategoryError(t('exercises.addExercise.categoryRequiredError'));
    //   hasError = true;
    // } else {
    //   setCategoryError(null);
    // }

    // Muscle groups validation - Optional
    // if (muscleGroups.length === 0) {
    //   setMuscleGroupsError(t('exercises.addExercise.muscleGroupsRequiredError'));
    //   hasError = true;
    // } else {
    //   setMuscleGroupsError(null);
    // }

    // Equipment validation - Optional
    // if (!equipment) {
    //   setEquipmentError(t('exercises.addExercise.equipmentRequiredError'));
    //   hasError = true;
    // } else {
    //   setEquipmentError(null);
    // }

    // Modality validation - Optional
    // if (!modality) {
    //   setModalityError(t('exercises.addExercise.modalityRequiredError'));
    //   hasError = true;
    // } else {
    //   setModalityError(null);
    // }

    if (hasError) {
      return;
    }

    setIsSaving(true);

    try {
      const exerciseData = {
        name: exerciseName.trim(),
        instructions: exerciseInstructions.trim() || undefined,
        videoLink: videoLink.trim() || undefined,
        videoFile: videoFile || undefined,
        category,
        muscleGroups,
        difficulty,
      };

      await createExercise(exerciseData);
      toast.success(t('exercises.actions.createSuccess') || 'Exercise created successfully');
      onSave();
      handleClose();
    } catch (error) {
      console.error('Failed to save exercise:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
      title={t('exercises.addExercise.title')}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            aria-label={t('exercises.addExercise.cancelAria')}
            className="gap-2"
          >
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            aria-label={t('exercises.addExercise.saveAria')}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t('general.save')}
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
            <p className="text-lg font-semibold text-primary">Drop video here</p>
          </div>
        )}

        {/* Form Content - hidden when dragging */}
        <div className={cn('flex flex-col gap-6', isDragging && 'opacity-0 pointer-events-none')}>
          <div className="flex flex-col gap-2">
            <label htmlFor="exercise-name" className="text-sm font-medium">
              {t('exercises.addExercise.exerciseName')}<RequiredAsterisk />
            </label>
            <Input
              id="exercise-name"
              type="text"
              placeholder={t('exercises.addExercise.exerciseNamePlaceholder')}
              value={exerciseName}
              onChange={(event) => {
                setExerciseName(event.target.value);
                if (exerciseNameError) {
                  setExerciseNameError(null);
                }
              }}
              className="w-full"
              aria-invalid={!!exerciseNameError}
            />
            {exerciseNameError && <p className="text-sm text-destructive">{exerciseNameError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="exercise-instructions" className="text-sm font-medium">
              {t('exercises.addExercise.instructions')}
            </label>
            <Textarea
              id="exercise-instructions"
              value={exerciseInstructions}
              onChange={(event) => {
                setExerciseInstructions(event.target.value);
              }}
              placeholder={t('exercises.addExercise.instructionsPlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="video-link" className="text-sm font-medium">
              {t('exercises.addExercise.video')}
            </label>

            {/* Video Link Input - shown when no file is selected */}
            {!videoFile && (
              <div className="relative">
                <Input
                  id="video-link"
                  type="text"
                  placeholder={t('exercises.addExercise.videoLinkPlaceholder')}
                  value={videoLink}
                  onChange={(event) => {
                    setVideoLink(event.target.value);
                    if (videoLinkError) {
                      setVideoLinkError(null);
                    }
                  }}
                  className={cn('w-full pr-8', videoLinkError && 'border-destructive aria-invalid:border-destructive')}
                  aria-invalid={!!videoLinkError}
                />
                {videoLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoLink('');
                      setVimeoThumbnail(null);
                      setIsLoadingVimeoThumbnail(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    aria-label={t('exercises.addExercise.clearVideoLink')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Video Link Preview */}
            {!videoFile && (() => {
              const { id, type } = extractVideoId(videoLink);
              if (id && type === 'youtube') {
                return (
                  <div className="mt-2">
                    <a
                      href={videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full rounded-md border border-border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                        }}
                      />
                    </a>
                  </div>
                );
              }
              if (id && type === 'vimeo') {
                if (isLoadingVimeoThumbnail) {
                  return (
                    <div className="mt-2">
                      <div className="w-full aspect-video rounded-md border border-border bg-muted flex items-center justify-center">
                        <Spinner className="h-4 w-4" />
                      </div>
                    </div>
                  );
                }

                if (vimeoThumbnail) {
                  return (
                    <div className="mt-2">
                      <a
                        href={videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={vimeoThumbnail}
                          alt="Video thumbnail"
                          className="w-full rounded-md border border-border"
                        />
                      </a>
                    </div>
                  );
                }

                return (
                  <div className="mt-2">
                    <div className="w-full aspect-video rounded-md border border-border bg-muted flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        {t('exercises.addExercise.vimeoThumbnailPlaceholder')}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* OR divider - shown when neither link nor file is selected */}
            {!videoLink.trim() && !videoFile && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Video File Upload Area - shown when no link is entered */}
            {!videoLink.trim() && (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors',
                  videoFile ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary'
                )}
              >
                {videoFile && videoPreview ? (
                  <>
                    <video
                      src={videoPreview}
                      className="w-full max-w-md rounded-md"
                      controls
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">{videoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setVideoFile(null);
                        if (videoPreview) {
                          URL.revokeObjectURL(videoPreview);
                        }
                        setVideoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      {t('general.change')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">Drop MP4 video here</p>
                      <p className="text-xs text-muted-foreground">or click to select</p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t('general.select')}
                    </Button>
                  </>
                )}
              </div>
            )}

            {videoLinkError && <p className="text-sm text-destructive">{videoLinkError}</p>}
            {videoFileError && <p className="text-sm text-destructive">{videoFileError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm font-medium">
              {t('exercises.addExercise.category')}
            </label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                if (categoryError) {
                  setCategoryError(null);
                }
              }}
            >
              <SelectTrigger
                id="category"
                className={cn('w-full', categoryError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!categoryError}
              >
                <SelectValue placeholder={t('general.select')} />
              </SelectTrigger>
              <SelectContent>
                {MUSCLEWIKI_CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && <p className="text-sm text-destructive">{categoryError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="muscle-groups" className="text-sm font-medium">
              {t('exercises.addExercise.muscleGroups')}
            </label>
            <MultiAsyncSelect
              options={MUSCLEWIKI_MUSCLE_OPTIONS.map((group) => ({ label: group.label, value: group.value }))}
              value={muscleGroups}
              onValueChange={(values) => {
                setMuscleGroups(values);
                if (muscleGroupsError) {
                  setMuscleGroupsError(null);
                }
              }}
              placeholder={t('exercises.addExercise.muscleGroupsPlaceholder')}
              searchPlaceholder={t('exercises.addExercise.searchMuscleGroups')}
              className={cn(muscleGroupsError && 'border-destructive')}
            />
            {muscleGroupsError && <p className="text-sm text-destructive">{muscleGroupsError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="difficulty" className="text-sm font-medium">
              {t('exercises.addExercise.difficulty')}
            </label>
            <Select
              value={difficulty}
              onValueChange={(value) => {
                setDifficulty(value);
                if (difficultyError) {
                  setDifficultyError(null);
                }
              }}
            >
              <SelectTrigger
                id="difficulty"
                className={cn('w-full', difficultyError && 'border-destructive aria-invalid:border-destructive')}
                aria-invalid={!!difficultyError}
              >
                <SelectValue placeholder={t('general.select')} />
              </SelectTrigger>
              <SelectContent>
                {MUSCLEWIKI_DIFFICULTY_OPTIONS.map((diff) => (
                  <SelectItem key={diff.value} value={diff.value}>
                    {diff.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {difficultyError && <p className="text-sm text-destructive">{difficultyError}</p>}
          </div>
        </div>
      </div>
    </SidePanel>
  );
};

