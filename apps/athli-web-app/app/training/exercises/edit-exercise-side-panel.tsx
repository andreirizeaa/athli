'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
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
import { X, Upload } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { editExercise, type Exercise } from '@/api/coach/coach-exercise-service';
import { toast } from 'sonner';

const EXERCISE_CATEGORIES = ['Weight & Reps', 'Reps', 'Distance / Duration'] as const;

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Traps',
  'Lats',
  'Delts',
  'Full Body',
] as const;

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable Machine',
  'Machine',
  'Resistance Band',
  'Bodyweight',
  'Medicine Ball',
  'TRX',
  'Pulley',
  'Smith Machine',
  'Plate Loaded',
  'Free Weights',
] as const;

const MODALITY_OPTIONS = [
  'Strength',
  'Power',
  'Agility',
  'Plyos',
  'Mobility',
  'Endurance',
  'Cardio',
  'Flexibility',
  'Balance',
  'Stability',
  'Speed',
  'Coordination',
] as const;

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

type EditExerciseSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onSave: () => void;
  onDelete?: () => void;
};

export const EditExerciseSidePanel = ({ open, onOpenChange, exercise, onSave, onDelete }: EditExerciseSidePanelProps) => {
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
  const [equipment, setEquipment] = useState<string>('');
  const [modality, setModality] = useState<string>('');
  const [exerciseNameError, setExerciseNameError] = useState<string | null>(null);
  const [videoLinkError, setVideoLinkError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [muscleGroupsError, setMuscleGroupsError] = useState<string | null>(null);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [modalityError, setModalityError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [originalExerciseData, setOriginalExerciseData] = useState<{
    name: string;
    instructions: string;
    videoLink: string;
    category: string;
    muscleGroups: string[];
    equipment: string;
    modality: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Populate form when exercise changes
  useEffect(() => {
    if (exercise && open) {
      setExerciseName(exercise.name || '');
      setExerciseInstructions(exercise.description || '');
      setVideoLink(exercise.video_link || '');
      setVideoFile(null);
      setVideoPreview(null);
      setCategory(exercise.category || '');
      setMuscleGroups(exercise.muscle_group || []);
      setEquipment(exercise.equipment || '');
      setModality(exercise.modality || '');

      // Store original data for change detection
      setOriginalExerciseData({
        name: exercise.name || '',
        instructions: exercise.description || '',
        videoLink: exercise.video_link || '',
        category: exercise.category || '',
        muscleGroups: exercise.muscle_group || [],
        equipment: exercise.equipment || '',
        modality: exercise.modality || '',
      });
    }
  }, [exercise, open]);

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
      return;
    }
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

  const hasFormChanged = (): boolean => {
    if (!originalExerciseData || !exercise) {
      return false;
    }

    return (
      exerciseName.trim() !== originalExerciseData.name.trim() ||
      exerciseInstructions.trim() !== originalExerciseData.instructions.trim() ||
      videoLink.trim() !== originalExerciseData.videoLink.trim() ||
      !!videoFile || // File upload counts as change
      category !== originalExerciseData.category ||
      JSON.stringify([...muscleGroups].sort()) !== JSON.stringify([...originalExerciseData.muscleGroups].sort()) ||
      equipment !== originalExerciseData.equipment ||
      modality !== originalExerciseData.modality
    );
  };

  const handleClose = () => {
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
    setEquipment('');
    setModality('');
    setExerciseNameError(null);
    setVideoLinkError(null);
    setCategoryError(null);
    setMuscleGroupsError(null);
    setEquipmentError(null);
    setModalityError(null);
    setIsSaving(false);
    setOriginalExerciseData(null);
    dragCounterRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!exercise) return;

    let hasError = false;

    if (!exerciseName.trim()) {
      setExerciseNameError(t('exercises.addExercise.exerciseNameRequiredError'));
      hasError = true;
    } else {
      setExerciseNameError(null);
    }

    // Video validation - either link or file is required
    if (!videoLink.trim() && !videoFile) {
      setVideoLinkError(t('exercises.addExercise.videoLinkRequiredError'));
      hasError = true;
    } else if (videoLink.trim() && !videoFile) {
      // Validate link only if no file is selected
      const { id, type } = extractVideoId(videoLink);
      if (!id || !type) {
        setVideoLinkError(t('exercises.addExercise.videoLinkInvalidError'));
        hasError = true;
      } else {
        setVideoLinkError(null);
      }
    } else {
      setVideoLinkError(null);
    }

    if (!category) {
      setCategoryError(t('exercises.addExercise.categoryRequiredError'));
      hasError = true;
    } else {
      setCategoryError(null);
    }

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
        equipment,
        modality,
      };

      await editExercise(exercise.id, exerciseData);
      toast.success(t('exercises.actions.updateSuccess') || 'Exercise updated successfully');
      onSave();
      handleClose();
    } catch (error) {
      console.error('Failed to save exercise:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!exercise) return null;

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        title={t('exercises.addExercise.editTitle')}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasFormChanged()}
              aria-label={t('exercises.addExercise.saveAria')}
              className={cn(isSaving && 'min-w-[120px] justify-center')}
            >
              {isSaving ? <Spinner className="h-4 w-4" /> : t('general.save')}
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isSaving}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              aria-label={t('exercises.addExercise.cancelAria')}
            >
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
                {t('exercises.addExercise.video')}<RequiredAsterisk />
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
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                {t('exercises.addExercise.category')}<RequiredAsterisk />
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
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
                options={MUSCLE_GROUPS.map((group) => ({ label: group, value: group }))}
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
              <label htmlFor="equipment" className="text-sm font-medium">
                {t('exercises.addExercise.equipment')}
              </label>
              <Select
                value={equipment}
                onValueChange={(value) => {
                  setEquipment(value);
                  if (equipmentError) {
                    setEquipmentError(null);
                  }
                }}
              >
                <SelectTrigger
                  id="equipment"
                  className={cn('w-full', equipmentError && 'border-destructive aria-invalid:border-destructive')}
                  aria-invalid={!!equipmentError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <SelectItem key={eq} value={eq}>
                      {eq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {equipmentError && <p className="text-sm text-destructive">{equipmentError}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="modality" className="text-sm font-medium">
                {t('exercises.addExercise.modality')}
              </label>
              <Select
                value={modality}
                onValueChange={(value) => {
                  setModality(value);
                  if (modalityError) {
                    setModalityError(null);
                  }
                }}
              >
                <SelectTrigger
                  id="modality"
                  className={cn('w-full', modalityError && 'border-destructive aria-invalid:border-destructive')}
                  aria-invalid={!!modalityError}
                >
                  <SelectValue placeholder={t('general.select')} />
                </SelectTrigger>
                <SelectContent>
                  {MODALITY_OPTIONS.map((mod) => (
                    <SelectItem key={mod} value={mod}>
                      {mod}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modalityError && <p className="text-sm text-destructive">{modalityError}</p>}
            </div>
          </div>
        </div>
      </SidePanel>
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          onDelete?.();
        }}
        itemName={exerciseName}
        itemType="exercise"
      />
    </>
  );
};

