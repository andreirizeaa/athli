'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { AddDiscountCodeSidePanel, type DiscountCodeFormData } from '@/components/business/add-discount-code-side-panel';
import { useDiscountCodes } from '@/hooks/use-coach-packages';
import type { DiscountCode } from '@athli/shared-types';

function formatDiscount(code: DiscountCode): string {
  if (code.discount_type === 'percentage') {
    return `${code.discount_value}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code.currency.toUpperCase(),
  }).format(code.discount_value);
}

function formatDuration(months: number | null): string {
  if (months === null) return 'One-time';
  if (months === 1) return '1 month';
  return `${months} months`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString();
}

const CodesPage = () => {
  const t = useTranslations();
  const {
    codes,
    isLoading,
    createCode,
    updateCode,
    deleteCode,
  } = useDiscountCodes();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);

  const handleSaveCode = async (data: DiscountCodeFormData) => {
    if (editingCode) {
      await updateCode({ id: editingCode.id, data });
      toast.success(t('business.codes.toast.updated'));
    } else {
      await createCode(data);
      toast.success(t('business.codes.toast.created'));
    }
  };

  const handleDeleteCode = async (id: string) => {
    await deleteCode(id);
    toast.success(t('business.codes.toast.deleted'));
  };

  const handleToggleActive = async (code: DiscountCode, value: boolean) => {
    try {
      await updateCode({ id: code.id, data: { is_active: value } });
    } catch {
      toast.error('Failed to update code');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteCode(id)));
      toast.success(t('general.deleteSuccessCount', { count: selectedIds.size, item: 'codes' }));
      setSelectedIds(new Set());
    } catch {
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!codeToDelete) return;
    try {
      const item = codes.find((c) => c.id === codeToDelete);
      await deleteCode(codeToDelete);
      toast.success(item ? t('general.deleteSuccessName', { name: item.name }) : t('business.codes.toast.deleted'));
      setCodeToDelete(null);
    } catch {
      toast.error(t('general.deleteError'));
    }
  };

  const columns: ColumnDefinition<DiscountCode>[] = [
    {
      id: 'name',
      label: t('business.codes.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          </div>
          <span className="text-xs uppercase text-muted-foreground">
            {t('business.codes.columns.name')}
          </span>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {
                const newSet = new Set(selectedIds);
                if (newSet.has(row.id)) newSet.delete(row.id);
                else newSet.add(row.id);
                setSelectedIds(newSet);
              }}
            />
          </div>
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'code',
      label: t('business.codes.columns.code'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.code,
      getSearchValue: (row) => row.code,
      renderCell: (row) => (
        <span className="text-sm font-mono">{row.code}</span>
      ),
    },
    {
      id: 'discount',
      label: t('business.codes.columns.discount'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.discount_value,
      renderCell: (row) => (
        <span className="text-sm">{formatDiscount(row)}</span>
      ),
    },
    {
      id: 'duration',
      label: t('business.codes.columns.duration'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.duration_months ?? -1,
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDuration(row.duration_months)}</span>
      ),
    },
    {
      id: 'redemptions',
      label: t('business.codes.columns.redemptions'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.redemption_count,
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.redemption_count} / {row.max_redemptions ?? t('business.codes.form.unlimited')}
        </span>
      ),
    },
    {
      id: 'expires',
      label: t('business.codes.columns.expires'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.expires_at ?? '',
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.expires_at)}</span>
      ),
    },
    {
      id: 'active',
      label: t('business.codes.columns.active'),
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div data-no-row-link="true">
          <Switch
            checked={row.is_active}
            onCheckedChange={(checked) => handleToggleActive(row, checked)}
          />
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setCodeToDelete(row.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={codes}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="discount-codes"
        enableSearch={true}
        searchPlaceholder="Search codes..."
        searchFields={['name', 'code']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyState={
          <EmptyGridState
            title={t('business.codes.noCodes')}
            subtitle={t('business.codes.noCodesSubtitle')}
            action={
              <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('business.codes.addCode')}</span>
              </Button>
            }
          />
        }
        filterBarActions={
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span>{t('business.codes.addCode')}</span>
          </Button>
        }
        selectionActions={
          selectedIds.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="gap-2">
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedIds.size })}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) return;
          setEditingCode(row);
          setIsEditOpen(true);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) return;
            event.preventDefault();
            setEditingCode(row);
            setIsEditOpen(true);
          }
        }}
      />

      <AddDiscountCodeSidePanel
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={handleSaveCode}
      />

      {editingCode && (
        <AddDiscountCodeSidePanel
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingCode(null);
          }}
          onSave={handleSaveCode}
          onDelete={handleDeleteCode}
          code={editingCode}
        />
      )}

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedIds.size}
        itemType="codes"
      />

      <ConfirmDeleteDialog
        open={codeToDelete !== null}
        onOpenChange={(open) => !open && setCodeToDelete(null)}
        onConfirm={handleDeleteSingle}
        itemName={codes.find((c) => c.id === codeToDelete)?.name}
        itemType="code"
      />
    </div>
  );
};

export default CodesPage;
