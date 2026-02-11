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
import { ChevronRight, Pencil } from 'lucide-react';
import { FlowEditor } from '@/components/flows/flow-editor';
import {
  getSequenceById,
  updateSequence,
  updateSequenceDetails,
  deleteSequence,
  type Sequence,
} from '@/api/coach/coach-sequence-service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanel } from '@/components/app/side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
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

const SequenceDetailPage = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sequenceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('business.sequences.form.nameRequired'))
      .max(100, t('business.sequences.form.nameMaxLength')),
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
    const fetchSequence = async () => {
      setIsLoading(true);
      try {
        const data = await getSequenceById(sequenceId);
        setSequence(data);
      } catch (error) {
        console.error('Failed to fetch sequence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSequence();
  }, [sequenceId]);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleEditOpen = () => {
    reactForm.reset({
      name: sequence?.name || '',
      description: sequence?.description || '',
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
      await updateSequenceDetails({
        id: sequenceId,
        name: values.name,
        description: values.description,
      });
      setSequence(prev =>
        prev ? { ...prev, name: values.name, description: values.description || '' } : prev
      );
      await queryClient.invalidateQueries({ queryKey: ['coach-sequences'] });
      await queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
      handleEditClose();
    } catch (error) {
      console.error('Failed to update sequence details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      await deleteSequence(sequenceId);
      await queryClient.invalidateQueries({ queryKey: ['coach-sequences'] });
      await queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
      router.push('/business/sequences');
    } catch (error: any) {
      console.error('Failed to delete sequence:', error);
      if (error?.status === 409 || error?.message?.includes('linked')) {
        toast.error(t('business.sequences.toast.deleteLinked'));
      } else {
        toast.error(t('general.error'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveFlow = async (data: { nodes: any[]; edges: any[] }) => {
    await updateSequence({
      id: sequenceId,
      nodes: data.nodes,
      edges: data.edges,
    });
    // Invalidate cache so the sequences list shows updated step counts
    queryClient.invalidateQueries({ queryKey: ['coach-sequences'] });
    queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('business.sequences.notFound')}</h1>
          <p className="text-muted-foreground">{t('business.sequences.notFoundDescription')}</p>
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
                    onClick={() => handleBreadcrumbClick('/business/sequences')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('business.tabs.sequences')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {sequence.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold">{sequence.name}</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleEditOpen}
            className="gap-2 border border-primary"
          >
            <Pencil className="size-4" />
            <span>{t('general.edit')}</span>
          </Button>
        </div>
        <Separator />
      </div>

      {/* Flow Editor */}
      <FlowEditor
        flow={sequence as any}
        isOnboardingMode={true}
        forcedTriggerId="payment-completed"
        hideWaitActions={true}
        onSaveFlow={handleSaveFlow}
        onFlowChange={(nodes, edges) => {}}
      />

      {/* Edit Sequence Side Panel */}
      <SidePanel
        open={isEditPanelOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleEditClose();
          else setIsEditPanelOpen(true);
        }}
        title={t('business.sequences.editSequence')}
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
                      {t('business.sequences.form.name')}
                      <RequiredAsterisk />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('business.sequences.form.namePlaceholder')}
                      aria-label={t('business.sequences.form.name')}
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
                  <FormLabel>{t('business.sequences.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('business.sequences.form.descriptionPlaceholder')}
                      aria-label={t('business.sequences.form.description')}
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
        itemName={sequence.name}
      />

    </div>
  );
};

export default SequenceDetailPage;
