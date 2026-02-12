'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileText, Plus, Hash, MoreHorizontal, Trash2, Power } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { type Onboarding, createOnboarding, deleteOnboarding, updateOnboardingStatus } from '@/api/coach/coach-onboarding-service';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { UpgradeDialog } from '@/components/app/upgrade-dialog';
import { toast } from 'sonner';
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
import { useAddonAccess } from '@/lib/permissions/feature-gate';
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
  const { hasAccess: hasAutomationsAddon } = useAddonAccess('automations');

  const [optimisticOnboardings, setOptimisticOnboardings] = useState<Onboarding[]>([]);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingToDelete, setOnboardingToDelete] = useState<string | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

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
        onb.name !== prev[index]?.name ||
        onb.is_active !== prev[index]?.is_active
      );

      return hasChanged ? onboardings : prev;
    });
  }, [onboardings]);

  const handleToggleActive = async (onboarding: Onboarding, checked: boolean) => {
    if (!hasAutomationsAddon) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    // Store previous state for rollback
    const previousState = [...optimisticOnboardings];

    // Optimistically update the UI
    setOptimisticOnboardings((prev) =>
      prev.map((o) => (o.id === onboarding.id ? { ...o, is_active: checked } : o))
    );

    try {
      await updateOnboardingStatus(onboarding.id, checked);
      toast.success(
        checked
          ? t('onboarding.activated', { name: onboarding.name })
          : t('onboarding.deactivated', { name: onboarding.name })
      );
      queryClient.invalidateQueries({ queryKey: ['coach-onboardings'] });
    } catch (error) {
      // Rollback on error
      setOptimisticOnboardings(previousState);
      toast.error(t('general.error'));
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

  const handleDelete = async () => {
    if (!onboardingToDelete) return;
    try {
      const item = onboardings.find((o) => o.id === onboardingToDelete);
      await deleteOnboarding(onboardingToDelete);
      toast.success(item?.name ? t('general.deleteSuccessName', { name: item.name }) : t('general.deleteSuccess'));
      setOnboardingToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['coach-onboardings'] });
    } catch (error) {
      toast.error(t('general.deleteError'));
      setOnboardingToDelete(null);
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
      label: t('onboarding.columns.active'),
      icon: <Power className="size-3" />,
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => (row.is_active ? 1 : 0),
      renderCell: (row) => (
        <div data-no-row-link="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={!!row.is_active}
                    onCheckedChange={(checked) => handleToggleActive(row, checked)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {row.is_active
                    ? t('onboarding.unpublish')
                    : t('onboarding.publish')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setOnboardingToDelete(row.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                {t('general.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('onboarding.title')}
        action={
          <Button onClick={() => setIsAddPanelOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span>{t('onboarding.addOnboarding')}</span>
          </Button>
        }
      />

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

      <ConfirmDeleteDialog
        open={onboardingToDelete !== null}
        onOpenChange={(open) => !open && setOnboardingToDelete(null)}
        onConfirm={handleDelete}
        itemName={onboardings.find((o) => o.id === onboardingToDelete)?.name}
        itemType="onboarding"
      />

      <UpgradeDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        description="Activate onboarding flows to automatically guide new clients through your setup process."
        screenshot={{
          light: '/app-screenshots/onboardings/light.png',
          dark: '/app-screenshots/onboardings/dark.png',
          alt: 'Onboarding feature preview',
        }}
      />
    </div>
  );
};

export default OnboardingPage;
