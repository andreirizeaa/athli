'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X, Loader2, FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { AddCouponSidePanel, type CouponFormData } from '@/components/business/add-coupon-side-panel';
import { useStripeConnection, useCoachPackages, useCoupons } from '@/hooks/use-coach-packages';
import type { Coupon } from '@athli/shared-types';

function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === 'percentage') {
    return `${coupon.discount_value}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: coupon.currency.toUpperCase(),
  }).format(coupon.discount_value);
}

function formatDuration(months: number | null): string {
  if (months === null) return 'Once';
  if (months === 0) return 'Forever';
  if (months === 1) return '1 month';
  return `${months} months`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString();
}

const CouponsPage = () => {
  const t = useTranslations();
  const { data: stripeAccount } = useStripeConnection();
  const { startOnboarding, isOnboarding } = useCoachPackages();
  const {
    coupons,
    isLoading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCoupon,
  } = useCoupons();

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to start Stripe connection');
    }
  };

  const handleSaveCoupon = async (data: CouponFormData) => {
    if (editingCoupon) {
      await updateCoupon({ id: editingCoupon.id, data });
      toast.success(t('business.coupons.toast.updated'));
    } else {
      await createCoupon(data);
      toast.success(t('business.coupons.toast.created'));
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    await deleteCoupon(id);
    toast.success(t('business.coupons.toast.deleted'));
  };

  const handleToggleActive = async (coupon: Coupon, value: boolean) => {
    try {
      await toggleCoupon({ id: coupon.id, value });
    } catch {
      toast.error('Failed to update coupon');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteCoupon(id)));
      toast.success(t('general.deleteSuccessCount', { count: selectedIds.size, item: 'coupons' }));
      setSelectedIds(new Set());
    } catch {
      toast.error(t('general.deleteError'));
    }
  };

  const handleDeleteSingle = async () => {
    if (!couponToDelete) return;
    try {
      const item = coupons.find((c) => c.id === couponToDelete);
      await deleteCoupon(couponToDelete);
      toast.success(item ? t('general.deleteSuccessName', { name: item.name }) : t('business.coupons.toast.deleted'));
      setCouponToDelete(null);
    } catch {
      toast.error(t('general.deleteError'));
    }
  };

  const columns: ColumnDefinition<Coupon>[] = [
    {
      id: 'name',
      label: t('business.coupons.columns.name'),
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
            {t('business.coupons.columns.name')}
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
      label: t('business.coupons.columns.code'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.code,
      getSearchValue: (row) => row.code,
      renderCell: (row) => (
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-sm flex-1 min-w-0 truncate">{row.code}</span>
          <div className="flex items-center flex-shrink-0">
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyCode(row.code, row.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyCode(row.code, row.id);
                }
              }}
              data-no-row-link="true"
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              {copiedId === row.id ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'discount',
      label: t('business.coupons.columns.discount'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.discount_value,
      renderCell: (row) => (
        <span className="text-sm">{formatDiscount(row)}</span>
      ),
    },
    {
      id: 'duration',
      label: t('business.coupons.columns.duration'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.duration_months ?? -1,
      renderCell: (row) => (
        <span className="text-sm">{formatDuration(row.duration_months)}</span>
      ),
    },
    {
      id: 'redemptions',
      label: t('business.coupons.columns.redemptions'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.redemption_count,
      renderCell: (row) => (
        <span className="text-sm">
          {row.redemption_count} / {row.max_redemptions ?? t('business.coupons.form.unlimited')}
        </span>
      ),
    },
    {
      id: 'expires',
      label: t('business.coupons.columns.expires'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.expires_at ?? '',
      renderCell: (row) => (
        <span className="text-sm">{formatDate(row.expires_at)}</span>
      ),
    },
    {
      id: 'active',
      label: t('business.coupons.columns.active'),
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
              setCouponToDelete(row.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const emptyState = !isConnected ? (
    <EmptyGridState
      title={t('business.stripe.connectMessage')}
      subtitle={t('business.coupons.noCouponsSubtitle')}
      action={
        <button
          onClick={handleConnectStripe}
          disabled={isOnboarding}
          className="flex items-center justify-center gap-2 rounded-md border border-[#635BFF] px-3 h-9 text-sm font-medium text-[#635BFF] hover:bg-[#635BFF]/5 transition-colors disabled:opacity-50"
        >
          {isOnboarding ? (
            <Loader2 className="size-4 animate-spin text-[#635BFF]" />
          ) : (
            <img src="/icons/stripe-icon.png" alt="" className="size-5" />
          )}
          {stripeAccount ? t('business.packages.stripe.continueSetup') : t('business.packages.stripe.connect')}
        </button>
      }
    />
  ) : (
    <EmptyGridState
      title={t('business.coupons.noCoupons')}
      subtitle={t('business.coupons.noCouponsSubtitle')}
      action={
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span>{t('business.coupons.addCoupon')}</span>
        </Button>
      }
    />
  );

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={coupons}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="coupons"
        enableSearch={true}
        searchPlaceholder="Search coupons..."
        searchFields={['name', 'code']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showPagination={!!isConnected}
        gridPadding={true}
        compactPagination={true}
        emptyState={emptyState}
        filterBarActions={(
          <Button onClick={() => setIsAddOpen(true)} className="gap-2" disabled={!isConnected}>
            <Plus className="size-4" />
            <span>{t('business.coupons.addCoupon')}</span>
          </Button>
        )}
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
          setEditingCoupon(row);
          setIsEditOpen(true);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) return;
            event.preventDefault();
            setEditingCoupon(row);
            setIsEditOpen(true);
          }
        }}
      />

      <AddCouponSidePanel
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={handleSaveCoupon}
      />

      {editingCoupon && (
        <AddCouponSidePanel
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingCoupon(null);
          }}
          onSave={handleSaveCoupon}
          onDelete={handleDeleteCoupon}
          coupon={editingCoupon}
        />
      )}

      <ConfirmDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedIds.size}
        itemType="coupons"
      />

      <ConfirmDeleteDialog
        open={couponToDelete !== null}
        onOpenChange={(open) => !open && setCouponToDelete(null)}
        onConfirm={handleDeleteSingle}
        itemName={coupons.find((c) => c.id === couponToDelete)?.name}
        itemType="coupon"
      />
    </div>
  );
};

export default CouponsPage;
