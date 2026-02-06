'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import {
  editClientCheckInDetails,
  deleteClientCheckIns,
  type ClientCheckInDetail,
} from '@/api/client/client-form-service';
import { toast } from 'sonner';

type EditClientCheckInFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ClientCheckInDetail | null;
  clientId: string;
  coachId: string;
  onSave?: (form: ClientCheckInDetail) => void;
  onDelete?: () => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const EditClientCheckInFormSidePanel = ({
  open,
  onOpenChange,
  form,
  clientId,
  coachId,
  onSave,
  onDelete,
}: EditClientCheckInFormSidePanelProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('forms.form.nameRequired'))
      .max(100, t('forms.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const reactForm = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (form && open) {
      reactForm.reset({
        name: form.name,
        description: form.description || '',
      });
    }
  }, [form, open, reactForm]);

  const handleClose = () => {
    reactForm.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    if (!form) return;

    setIsSaving(true);
    try {
      const updatedForm = await editClientCheckInDetails({
        clientId,
        coachId,
        checkInId: form.id,
        name: values.name,
        description: values.description,
      });

      toast.success(t('forms.toast.updateSuccess'));

      // Invalidate cache to refresh grid data
      queryClient.invalidateQueries({ queryKey: ['client-check-ins', clientId] });

      if (onSave) {
        onSave(updatedForm);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error(t('forms.toast.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form) return;

    setIsDeleting(true);
    try {
      await deleteClientCheckIns({
        checkInIds: [form.id],
        clientId,
        coachId,
      });
      toast.success(t('forms.toast.deleteSuccess'));

      // Invalidate cache to refresh grid data
      queryClient.invalidateQueries({ queryKey: ['client-check-ins', clientId] });

      if (onDelete) {
        onDelete();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error(t('forms.toast.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges = form && (
    reactForm.watch('name') !== form.name ||
    reactForm.watch('description') !== (form.description || '')
  );

  if (!form) return null;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('forms.editFormTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onSave={reactForm.handleSubmit(handleSave)}
      isSaving={isSaving}
      isSaveDisabled={!reactForm.formState.isValid || !hasChanges}
      onDelete={handleDelete}
      isDeleting={isDeleting}
      onCancel={handleClose}
    >
      <Form {...reactForm}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reactForm.handleSubmit(handleSave)(e);
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
                    {t('forms.form.name')}
                    <RequiredAsterisk />
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('forms.form.namePlaceholder')}
                    aria-label={t('forms.form.name')}
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
                <FormLabel>{t('forms.form.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('forms.form.descriptionPlaceholder')}
                    aria-label={t('forms.form.description')}
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              {t('forms.type.checkInInfo')}
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </SidePanel>
  );
};
