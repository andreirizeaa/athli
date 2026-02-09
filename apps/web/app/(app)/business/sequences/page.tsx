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
import { FileText, Plus, Hash, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { type Sequence, createSequence, deleteSequence } from '@/api/coach/coach-sequence-service';
import { useCoachSequences } from '@/hooks/use-coach-sequences';
import { Loader2 } from 'lucide-react';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
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

const countActionNodes = (flowData?: { nodes?: any[]; edges?: any[] }) =>
  flowData?.nodes?.filter((n: any) => n.type === 'action').length || 0;

type FormValues = {
  name: string;
  description?: string;
};

const SequencesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { sequences, isLoading, refetch } = useCoachSequences();

  const [optimisticSequences, setOptimisticSequences] = useState<Sequence[]>([]);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState<string | null>(null);

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
    if (!sequences || sequences.length === 0) {
      setOptimisticSequences((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setOptimisticSequences((prev) => {
      if (prev.length !== sequences.length) return sequences;

      const hasChanged = sequences.some((seq, index) =>
        seq.id !== prev[index]?.id ||
        seq.name !== prev[index]?.name
      );

      return hasChanged ? sequences : prev;
    });
  }, [sequences]);

  const handleAddPanelClose = () => {
    reactForm.reset();
    setIsAddPanelOpen(false);
  };

  const handleSave = async (values: FormValues) => {
    setIsSaving(true);
    try {
      await createSequence({
        name: values.name,
        description: values.description,
      });
      handleAddPanelClose();
      toast.success(t('business.sequences.toast.created'));
      queryClient.invalidateQueries({ queryKey: ['coach-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
    } catch (error) {
      console.error('Failed to create sequence:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!sequenceToDelete) return;
    try {
      const item = sequences.find((s) => s.id === sequenceToDelete);
      await deleteSequence(sequenceToDelete);
      toast.success(item?.name ? t('general.deleteSuccessName', { name: item.name }) : t('business.sequences.toast.deleted'));
      setSequenceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['coach-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['coach-sequences-dropdown'] });
    } catch (error: any) {
      if (error?.status === 409 || error?.message?.includes('linked')) {
        toast.error(t('business.sequences.toast.deleteLinked'));
      } else {
        toast.error(t('general.deleteError'));
      }
      setSequenceToDelete(null);
    }
  };

  const columns: ColumnDefinition<Sequence>[] = [
    {
      id: 'name',
      label: t('business.sequences.columns.name'),
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
      label: t('business.sequences.columns.description'),
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
      label: t('business.sequences.columns.stepCount'),
      icon: <Hash className="size-3" />,
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => countActionNodes(row.flow_data),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{countActionNodes(row.flow_data)}</span>
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
                  setSequenceToDelete(row.id);
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
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataGrid
            data={optimisticSequences}
            columns={columns}
            getRowId={(row) => row.id}
            gridKey="sequences"
            searchPlaceholder={t('business.sequences.searchPlaceholder')}
            enableSearch={true}
            searchFields={['name', 'description']}
            enableEditColumns={false}
            enableExport={false}
            enableRowSelection={false}
            showPagination={false}
            gridPadding={true}
            compactPagination={true}
            emptyMessage={t('business.sequences.emptyMessage')}
            emptyState={
              <EmptyGridState
                title={t('business.sequences.emptyState.title')}
                subtitle={t('business.sequences.emptyState.subtitle')}
                action={
                  <Button onClick={() => setIsAddPanelOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    <span>{t('business.sequences.addSequence')}</span>
                  </Button>
                }
              />
            }
            filterBarActions={
              <Button onClick={() => setIsAddPanelOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('business.sequences.addSequence')}</span>
              </Button>
            }
            onRowClick={(row, event) => {
              const targetElement = event.target as HTMLElement;
              if (targetElement.closest('[data-no-row-link="true"]')) {
                return;
              }
              router.push(`/business/sequences/${row.id}`);
            }}
            onRowKeyDown={(row, event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                const targetElement = event.target as HTMLElement;
                if (targetElement.closest('[data-no-row-link="true"]')) {
                  return;
                }
                event.preventDefault();
                router.push(`/business/sequences/${row.id}`);
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
        title={t('business.sequences.addSequence')}
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
        open={sequenceToDelete !== null}
        onOpenChange={(open) => !open && setSequenceToDelete(null)}
        onConfirm={handleDeleteSingle}
        itemName={sequences.find((s) => s.id === sequenceToDelete)?.name}
        itemType="sequence"
      />

    </div>
  );
};

export default SequencesPage;
