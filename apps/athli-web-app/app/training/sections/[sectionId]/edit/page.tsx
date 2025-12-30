'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
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
import { getSectionById, updateSection } from '@/api/coach/coach-section-service';
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

  const [sectionMeta, setSectionMeta] = useState<SectionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!sectionId || hasInitialized.current) return;
    hasInitialized.current = true;

    const loadSection = async () => {
      try {
        setIsLoading(true);
        const section = await getSectionById(sectionId);

        // Store section data in localStorage for the builder to load
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('athli_workout_schema', JSON.stringify(section.section_data));
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
      navigateBackToSections();
    } catch (error) {
      console.error('Failed to save section:', error);
      toast.error(t('library.sections.toast.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    if (path === '/training/sections') {
      navigateBackToSections();
    }
  };

  if (isLoading || !sectionMeta) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
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
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {sectionMeta.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveClick} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        <Separator />
      </div>

      <div className="flex-1 overflow-hidden">
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
          mode="section"
          sectionType={sectionMeta.sectionType}
        />
      </div>

      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default EditSectionPage;
