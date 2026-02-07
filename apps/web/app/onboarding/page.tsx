'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Power, Plus, Hash } from 'lucide-react';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { type Onboarding, createOnboarding, updateOnboardingStatus } from '@/api/coach/coach-onboarding-service';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { Loader2 } from 'lucide-react';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ConfirmPublishDialog } from '@/components/app/confirm-publish-dialog';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const countActionNodes = (flowData?: { nodes?: any[]; edges?: any[] }) =>
  flowData?.nodes?.filter((n: any) => n.type === 'action').length || 0;

type FormValues = {
  name: string;
  description?: string;
};

const OnboardingPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { onboardings, isLoading, refetch } = useCoachOnboardings();

  const [optimisticOnboardings, setOptimisticOnboardings] = useState<Onboarding[]>([]);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishDialogOnboarding, setPublishDialogOnboarding] = useState<{ onboarding: Onboarding; checked: boolean } | null>(null);

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
    if (!onboardings || onboardings.length === 0) {
      setOptimisticOnboardings((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setOptimisticOnboardings((prev) => {
      if (prev.length !== onboardings.length) return onboardings;

      const hasChanged = onboardings.some((onb, index) =>
        onb.id !== prev[index]?.id ||
        onb.is_active !== prev[index]?.is_active ||
        onb.name !== prev[index]?.name
      );

      return hasChanged ? onboardings : prev;
    });
  }, [onboardings]);

  const handleToggleActive = async (onboarding: Onboarding, checked: boolean) => {
    const previousState = optimisticOnboardings;

    setOptimisticOnboardings(prev =>
      prev.map(o => o.id === onboarding.id ? { ...o, is_active: checked } : o)
    );

    try {
      await updateOnboardingStatus(onboarding.id, checked);
      toast.success(checked ? `${onboarding.name} published` : `${onboarding.name} unpublished`);
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      toast.error(`Failed to update ${onboarding.name} status`);
      setOptimisticOnboardings(previousState);
    }
  };

  const handleAddPanelClose = () => {
    reactForm.reset();
    setIsAddPanelOpen(false);
  };

  const handleSave = async (values: FormValues) => {
    setIsSaving(true);
    try {
      await createOnboarding({
        name: values.name,
        description: values.description,
      });
      handleAddPanelClose();
      toast.success('Onboarding created successfully');
      queryClient.invalidateQueries({ queryKey: ['coach-onboardings'] });
    } catch (error) {
      console.error('Failed to create onboarding:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnDefinition<Onboarding>[] = [
    {
      id: 'name',
      label: t('onboarding.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[300px]', pixel: '300px' },
      getSortValue: (row) => (row.name || '').toLowerCase(),
      getSearchValue: (row) => row.name || '',
      renderCell: (row) => (
        <span className="text-sm font-medium truncate">{row.name}</span>
      ),
    },
    {
      id: 'description',
      label: t('onboarding.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground truncate block">
          {row.description || '-'}
        </span>
      ),
    },
    {
      id: 'steps',
      label: t('onboarding.columns.stepCount'),
      icon: <Hash className="size-3" />,
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => countActionNodes(row.flow_data),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{countActionNodes(row.flow_data)}</span>
      ),
    },
    {
      id: 'is_active',
      label: 'Published',
      icon: <Power className="size-3" />,
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => (row.is_active ? 1 : 0),
      renderHeader: ({ isSorted, isAscending }) => (
        <div className="flex items-center justify-end w-full pr-4 gap-2">
          <Power className="size-3" />
          <span className="text-xs font-medium">Published</span>
          {isSorted && (
            <span className="ml-1">
              {isAscending ? (
                <ArrowUpNarrowWide className="size-3" />
              ) : (
                <ArrowDownWideNarrow className="size-3" />
              )}
            </span>
          )}
        </div>
      ),
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full pr-4" data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={!!row.is_active}
                    onCheckedChange={(checked) => setPublishDialogOnboarding({ onboarding: row, checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.is_active ? 'Unpublish onboarding' : 'Publish onboarding'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('onboarding.title')}</h1>
          <Button
            size="sm"
            onClick={() => setIsAddPanelOpen(true)}
          >
            <Plus className="size-4" />
            {t('onboarding.addOnboarding')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <div className="flex-1 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataGrid
            data={optimisticOnboardings}
            columns={columns}
            getRowId={(row) => row.id}
            gridKey="onboardings"
            searchPlaceholder={t('onboarding.searchPlaceholder')}
            enableSearch={true}
            searchFields={['name', 'description']}
            enableEditColumns={false}
            enableExport={false}
            enableRowSelection={false}
            showPagination={false}
            gridPadding={true}
            compactPagination={true}
            emptyMessage={t('onboarding.emptyMessage')}
            emptyState={
              <EmptyGridState
                title={t('onboarding.emptyState.title')}
                subtitle={t('onboarding.emptyState.subtitle')}
                action={
                  <Button onClick={() => setIsAddPanelOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    <span>{t('onboarding.addOnboarding')}</span>
                  </Button>
                }
              />
            }
            onRowClick={(row, event) => {
              const targetElement = event.target as HTMLElement;
              if (targetElement.closest('[data-no-row-link="true"]')) {
                return;
              }
              router.push(`/onboarding/${row.id}`);
            }}
            onRowKeyDown={(row, event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                const targetElement = event.target as HTMLElement;
                if (targetElement.closest('[data-no-row-link="true"]')) {
                  return;
                }
                event.preventDefault();
                router.push(`/onboarding/${row.id}`);
              }
            }}
          />
        )}
      </div>

      <SidePanel
        open={isAddPanelOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleAddPanelClose();
          else setIsAddPanelOpen(true);
        }}
        title={t('onboarding.addOnboarding')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onSave={reactForm.handleSubmit(handleSave)}
        isSaving={isSaving}
        isSaveDisabled={!reactForm.formState.isValid}
        onCancel={handleAddPanelClose}
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

      <ConfirmPublishDialog
        open={!!publishDialogOnboarding}
        onOpenChange={(open) => { if (!open) setPublishDialogOnboarding(null); }}
        onConfirm={async () => {
          if (publishDialogOnboarding) {
            await handleToggleActive(publishDialogOnboarding.onboarding, publishDialogOnboarding.checked);
            setPublishDialogOnboarding(null);
          }
        }}
        isPublishing={!!publishDialogOnboarding?.checked}
        itemName={publishDialogOnboarding?.onboarding.name}
      />
    </div>
  );
};

export default OnboardingPage;
