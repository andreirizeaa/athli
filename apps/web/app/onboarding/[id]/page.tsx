'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight, Pencil, Power } from 'lucide-react';
import { FlowEditor } from '@/components/flows/flow-editor';
import {
  getOnboardingById,
  updateOnboarding,
  updateOnboardingDetails,
  updateOnboardingStatus,
  deleteOnboarding,
  type Onboarding,
} from '@/api/coach/coach-onboarding-service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanel } from '@/components/app/side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { ConfirmPublishDialog } from '@/components/app/confirm-publish-dialog';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';

type FormValues = {
  name: string;
  description?: string;
};

const OnboardingDetailPage = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const onboardingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('onboarding.form.nameRequired'))
      .max(100, t('onboarding.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const reactForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    const fetchOnboarding = async () => {
      setIsLoading(true);
      try {
        const data = await getOnboardingById(onboardingId);
        setOnboarding(data);
      } catch (error) {
        console.error('Failed to fetch onboarding:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboarding();
  }, [onboardingId]);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleEditOpen = () => {
    reactForm.reset({
      name: onboarding?.name || '',
      description: onboarding?.description || '',
    });
    setIsEditPanelOpen(true);
  };

  const handleEditClose = () => {
    reactForm.reset();
    setIsEditPanelOpen(false);
  };

  const handleEditSave = async (values: FormValues) => {
    setIsSaving(true);
    try {
      await updateOnboardingDetails({
        id: onboardingId,
        name: values.name,
        description: values.description,
      });
      setOnboarding(prev =>
        prev ? { ...prev, name: values.name, description: values.description || '' } : prev
      );
      await queryClient.invalidateQueries({ queryKey: ['coach-onboardings'] });
      handleEditClose();
    } catch (error) {
      console.error('Failed to update onboarding details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      await deleteOnboarding(onboardingId);
      await queryClient.invalidateQueries({ queryKey: ['coach-onboardings'] });
      router.push('/onboarding');
    } catch (error) {
      console.error('Failed to delete onboarding:', error);
      toast.error(t('general.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async () => {
    const isActive = !onboarding?.is_active;
    try {
      await updateOnboardingStatus(onboardingId, isActive);
      setOnboarding(prev => prev ? { ...prev, is_active: isActive } : prev);
      toast.success(isActive ? 'Onboarding published' : 'Onboarding unpublished');
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      toast.error('Failed to update onboarding status');
    }
  };

  const handleSaveFlow = async (data: { nodes: any[]; edges: any[] }) => {
    await updateOnboarding({
      id: onboardingId,
      nodes: data.nodes,
      edges: data.edges,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('onboarding.notFound')}</h1>
          <p className="text-muted-foreground">{t('onboarding.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Full Width Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/onboarding')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('onboarding.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {onboarding.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold">{onboarding.name}</h1>
            </div>
          </div>
          <ButtonGroup>
            <Button
              variant="ghost"
              onClick={handleEditOpen}
              className="gap-2 border border-primary"
            >
              <Pencil className="size-4" />
              <span>{t('general.edit')}</span>
            </Button>
            <Button
              onClick={() => setIsPublishDialogOpen(true)}
              className="gap-2"
            >
              <Power className="size-4" />
              <span>{onboarding.is_active ? t('onboarding.unpublish') : t('onboarding.publish')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator />
      </div>

      {/* Flow Editor */}
      <FlowEditor
        flow={onboarding as any}
        forcedTriggerId="new-client-signup"
        hideWaitActions={true}
        onSaveFlow={handleSaveFlow}
        onFlowChange={(nodes, edges) => {}}
      />

      {/* Edit Onboarding Side Panel */}
      <SidePanel
        open={isEditPanelOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleEditClose();
          else setIsEditPanelOpen(true);
        }}
        title={t('onboarding.editOnboarding')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onSave={reactForm.handleSubmit(handleEditSave)}
        isSaving={isSaving}
        isSaveDisabled={!reactForm.formState.isValid}
        onDelete={() => setIsDeleteDialogOpen(true)}
        isDeleting={isDeleting}
        onCancel={handleEditClose}
      >
        <Form {...reactForm}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reactForm.handleSubmit(handleEditSave)(e);
            }}
            className="flex flex-col gap-6"
          >
            <FormField
              control={reactForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>
                      {t('onboarding.form.name')}
                      <RequiredAsterisk />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('onboarding.form.namePlaceholder')}
                      aria-label={t('onboarding.form.name')}
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={reactForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('onboarding.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('onboarding.form.descriptionPlaceholder')}
                      aria-label={t('onboarding.form.description')}
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </SidePanel>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={onboarding.name}
      />

      <ConfirmPublishDialog
        open={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        onConfirm={handleTogglePublish}
        isPublishing={!onboarding.is_active}
        itemName={onboarding.name}
      />
    </div>
  );
};

export default OnboardingDetailPage;
