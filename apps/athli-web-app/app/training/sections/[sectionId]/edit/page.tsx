'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Check, X, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';


import { useTrainingData } from '../../../training-data-context';
import { EditSectionDetailsSidePanel } from '../../components/edit-section-details-side-panel';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StandardBuilder } from '../../../workouts/new/workout-builder';
import type { WorkoutProgramPayload } from '../../../workouts/new/workout-schema';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import { getSectionById, updateSection, deleteSections } from '@/api/coach/coach-section-service';
import { searchExercises } from '@/api/exercise/exercise-search';
import type { SectionType } from '../../section-type-utils';

type SectionMeta = {
  title: string;
  description: string;
  sectionType: SectionType;
};

const EditSectionPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const sectionId = params?.sectionId as string;
  const { refreshSections } = useTrainingData();

  const [sectionMeta, setSectionMeta] = useState<SectionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!sectionId || hasInitialized.current) return;
    hasInitialized.current = true;

    const loadSection = async () => {
      try {
        setIsLoading(true);
        const section = await getSectionById(sectionId);

        if (typeof window !== 'undefined') {
          // Wrap section data in items format for the builder
          // Ensure we merge the metadata (type, title/name) back into the section data
          // because it might be stripped from the JSONB if using the new schema
          // Unwrap section data if it's nested in an items array (from payload builder)
          let coreData = section.section_data;
          if (coreData?.items && Array.isArray(coreData.items) && coreData.items.length > 0 && coreData.items[0].itemType === 'section') {
            coreData = coreData.items[0].data;
          }

          // Flatten exercises and ensure instanceIds
          if (coreData && coreData.exercises && Array.isArray(coreData.exercises)) {
            const hasNestedExercises = coreData.exercises.some((ex: any) => ex.exercises && Array.isArray(ex.exercises));

            if (hasNestedExercises) {
              const flattenedExercises: any[] = [];
              coreData.exercises.forEach((group: any) => {
                const isSuperset = group.isSuperset;
                const supersetGroupId = isSuperset ? crypto.randomUUID() : undefined;

                if (group.exercises && Array.isArray(group.exercises)) {
                  group.exercises.forEach((ex: any) => {
                    flattenedExercises.push({
                      ...ex,
                      instanceId: crypto.randomUUID(),
                      supersetGroupId,
                    });
                  });
                }
              });
              coreData.exercises = flattenedExercises;
            } else {
              // Ensure instanceId exists for already flat exercises (e.g. AMRAP)
              coreData.exercises = coreData.exercises.map((ex: any) => ({
                ...ex,
                instanceId: ex.instanceId || crypto.randomUUID(),
              }));
            }
          }

          // Hydrate exercise details (name, image, etc.) from local DB
          if (coreData && coreData.exercises && Array.isArray(coreData.exercises)) {
            coreData.exercises = coreData.exercises.map((ex: any) => {
              const fullExercise = searchExercises('').find(e => e.exerciseId === ex.id);
              if (fullExercise) {
                return {
                  ...ex,
                  name: fullExercise.name,
                  imageUrl: fullExercise.imageUrl,
                  videoUrl: fullExercise.videoUrl,
                  equipments: fullExercise.equipments,
                  bodyParts: fullExercise.bodyParts,
                  targetMuscles: fullExercise.targetMuscles,
                  secondaryMuscles: fullExercise.secondaryMuscles,
                  keywords: fullExercise.keywords,
                  overview: fullExercise.overview,
                  instructions: fullExercise.instructions,
                  exerciseTips: fullExercise.exerciseTips,
                  variations: fullExercise.variations,
                  relatedExerciseIds: fullExercise.relatedExerciseIds,
                };
              }
              return ex;
            });
          }

          // Normalize AMRAP/Timed/Circuits exercises to include sets
          // The API returns flat metrics (weight, reps, etc.) for these types,
          // but the builder UI expects a 'sets' array.
          if (coreData && (coreData.type === 'amrap' || coreData.type === 'timed' || coreData.type === 'circuits')) {
            if (coreData.exercises && Array.isArray(coreData.exercises)) {
              coreData.exercises = coreData.exercises.map((ex: any) => {
                // If sets already exist, leave it
                if (ex.sets && ex.sets.length > 0) return ex;

                // Create a single set from root props
                // Map API numbers to Builder strings
                const set = {
                  setNumber: 1,
                  type: 'normal',
                  reps: ex.reps !== null && ex.reps !== undefined ? ex.reps.toString() : '',
                  weight: ex.weight !== null && ex.weight !== undefined ? ex.weight.toString() : '',
                  rest: ex.restSec !== null && ex.restSec !== undefined ? ex.restSec.toString() : '',
                  distance: ex.distance !== null && ex.distance !== undefined ? ex.distance.toString() : '',
                  duration: ex.durationSec !== null && ex.durationSec !== undefined ? ex.durationSec.toString() : '',
                };

                return {
                  ...ex,
                  sets: [set]
                };
              });
            }
          }

          const sectionData = {
            ...coreData,
            id: section.id,
            type: section.section_type,
            name: section.name,
          };

          const schema = {
            items: [{
              itemType: 'section',
              section: sectionData
            }]
          };
          window.localStorage.setItem('athli_workout_schema', JSON.stringify(schema));
          window.localStorage.setItem('athli_workout_builder_access', 'edit-standard');
        }

        setSectionMeta({
          title: section.name,
          description: section.description || '',
          sectionType: section.section_type as SectionType,
        });
      } catch (error) {
        console.error('Failed to load section:', error);
        toast.error(t('library.sections.toast.failedToLoad'));
        router.push('/training/sections');
      } finally {
        setIsLoading(false);
      }
    };

    loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const navigateBackToSections = () => {
    // Clean up localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('athli_workout_schema');
      window.localStorage.removeItem('athli_workout_builder_access');
    }
    router.push('/training/sections');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    navigateBackToSections();
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    setHasUnsavedChanges(false);
    navigateBackToSections();
  };

  const handleSaveClick = () => {
    setIsSaving(true);
    setSaveSignal((prev) => prev + 1);
  };

  const handleSaveSuccess = async (payload: WorkoutProgramPayload) => {
    if (!sectionMeta) return;

    try {
      await updateSection(sectionId, {
        ...payload,
        title: sectionMeta.title,
        description: sectionMeta.description,
        sectionType: sectionMeta.sectionType,
      });

      toast.success(t('library.sections.toast.updatedSuccessfully', { name: sectionMeta.title }), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });

      setHasUnsavedChanges(false);
      await refreshSections();
      navigateBackToSections();
    } catch (error) {
      console.error('Failed to save section:', error);
      toast.error(t('library.sections.toast.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async (details: { title: string; sectionType: SectionType; description: string }) => {
    try {
      await updateSection(sectionId, {
        title: details.title,
        description: details.description,
      });

      toast.success(t('library.sections.toast.updatedSuccessfully', { name: details.title }), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });

      setSectionMeta((prev) => prev ? { ...prev, ...details } : null);
      await refreshSections();
    } catch (error) {
      console.error('Failed to update section details:', error);
      toast.error(t('library.sections.toast.failedToSave'));
    }
  };

  const handleDeleteSection = async () => {
    try {
      await deleteSections(sectionId);
      toast.success(t('library.sections.toast.deletedSuccessfully', { name: sectionMeta?.title || '' }), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
      navigateBackToSections();
      await refreshSections();
    } catch (error) {
      console.error('Failed to delete section:', error);
      toast.error(t('library.sections.toast.failedToDelete'));
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    if (path === '/training') {
      router.push('/training');
    } else if (path === '/training/sections') {
      navigateBackToSections();
    }
  };

  if (isLoading || !sectionMeta) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('sidebar.links.training')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/training/sections')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('library.sections.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="px-0.5 font-semibold text-foreground">
                    {sectionMeta.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {t('general.edit')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold truncate">Editing {sectionMeta.title}</h1>
          </div>

          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditDetailsOpen(true)}
              className="gap-2 border border-primary"
            >
              <Pencil className="size-4" />
              <span>{t('general.editDetails') || 'Edit details'}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-2 border border-primary"
            >
              <X className="size-4" />
              <span>{t('general.cancel')}</span>
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin size-4" /> : <Check className="size-4" />}
              <span>{t('general.save')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <div className="flex-1 overflow-hidden bg-sidebar">
        <StandardBuilder
          meta={{
            title: sectionMeta.title,
            description: sectionMeta.description,
            type: sectionMeta.sectionType,
            difficulty: '',
          }}
          onDirtyChange={() => setHasUnsavedChanges(true)}
          saveSignal={saveSignal}
          onSaveSuccess={handleSaveSuccess}
          onSaveError={() => setIsSaving(false)}
          mode="section"
          sectionType={sectionMeta.sectionType}
        />
      </div>

      <EditSectionDetailsSidePanel
        open={isEditDetailsOpen}
        onOpenChange={setIsEditDetailsOpen}
        sectionMeta={sectionMeta}
        onSave={handleSaveDetails}
        onDelete={handleDeleteSection}
      />

      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default EditSectionPage;
