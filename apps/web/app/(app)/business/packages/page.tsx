'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2, FileText, MoreHorizontal, Share2, Archive, ArchiveRestore } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddPackageSidePanel, type PackageFormData } from '@/components/business/add-package-side-panel';
import { PackageRedemptionsDialog } from '@/components/business/package-redemptions-dialog';
import { useStripeConnection, useCoachPackages, useAllPackageStats } from '@/hooks/use-coach-packages';
import { DEFAULT_PACKAGE_IMAGE } from '@/lib/constants/package-presets';
import type { CoachPackage } from '@athli/shared-types';

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

const PackagesPage = () => {
  const t = useTranslations();
  const { data: stripeAccount } = useStripeConnection();
  const {
    packages,
    isLoading,
    startOnboarding,
    isOnboarding,
    createPackage,
    updatePackage,
    togglePackage,
  } = useCoachPackages();

  const { data: packageStats } = useAllPackageStats();

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoachPackage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [redemptionsPackage, setRedemptionsPackage] = useState<CoachPackage | null>(null);

  const filteredPackages = packages.filter((p) => showArchived ? !p.is_active : p.is_active);

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to start Stripe connection');
    }
  };

  const handleSavePackage = async (data: PackageFormData) => {
    if (editingPackage) {
      await updatePackage({ id: editingPackage.id, data });
      toast.success(t('business.packages.toast.updated'));
    } else {
      await createPackage(data);
      toast.success(t('business.packages.toast.created'));
    }
  };

  const handleToggle = async (pkg: CoachPackage, field: 'is_active' | 'is_visible', value: boolean) => {
    try {
      await togglePackage({ id: pkg.id, field, value });
    } catch {
      if (field === 'is_active') {
        toast.error(t('business.packages.toast.stripeRequired'));
      }
    }
  };

  const handleArchiveToggle = async (pkg: CoachPackage) => {
    try {
      await togglePackage({ id: pkg.id, field: 'is_active', value: !pkg.is_active });
      toast.success(pkg.is_active ? 'Package archived' : 'Package unarchived');
    } catch {
      toast.error('Failed to update package');
    }
  };

  const handleBulkArchiveToggle = async () => {
    try {
      const newIsActive = showArchived; // archived → make active, active → make inactive
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          togglePackage({ id, field: 'is_active', value: newIsActive })
        )
      );
      toast.success(showArchived
        ? `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} unarchived`
        : `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} archived`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to update packages');
    }
  };

  const columns: ColumnDefinition<CoachPackage>[] = [
    {
      id: 'name',
      label: t('business.packages.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[250px]', pixel: '250px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div className="flex items-center justify-center h-full flex-shrink-0" data-no-row-link="true">
            <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          </div>
          <span className="text-xs uppercase text-muted-foreground">
            {t('business.packages.columns.name')}
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
          <img
            src={row.image_url || DEFAULT_PACKAGE_IMAGE}
            alt=""
            className="h-8 w-12 rounded object-cover flex-shrink-0"
          />
          <span className="text-sm font-medium truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'sales',
      label: t('business.packages.columns.sales'),
      sortable: true,
      width: { class: 'w-[80px]', pixel: '80px' },
      getSortValue: (row) => packageStats?.[row.id]?.total_purchases ?? 0,
      renderCell: (row) => {
        const value = packageStats?.[row.id]?.total_purchases ?? 0;
        return <span className="text-sm">{value === 0 ? '--' : value}</span>;
      },
    },
    {
      id: 'refunds',
      label: t('business.packages.columns.refunds'),
      sortable: true,
      width: { class: 'w-[80px]', pixel: '80px' },
      getSortValue: (row) => packageStats?.[row.id]?.total_refunds ?? 0,
      renderCell: (row) => {
        const value = packageStats?.[row.id]?.total_refunds ?? 0;
        return <span className="text-sm">{value === 0 ? '--' : value}</span>;
      },
    },
    {
      id: 'cancellations',
      label: t('business.packages.columns.cancellations'),
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => packageStats?.[row.id]?.total_cancellations ?? 0,
      renderCell: (row) => {
        const value = packageStats?.[row.id]?.total_cancellations ?? 0;
        return <span className="text-sm">{value === 0 ? '--' : value}</span>;
      },
    },
    {
      id: 'revenue',
      label: t('business.packages.columns.revenue'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => packageStats?.[row.id]?.total_revenue_cents ?? 0,
      renderCell: (row) => {
        const stats = packageStats?.[row.id];
        if (!stats || stats.total_revenue_cents === 0) return <span className="text-sm">--</span>;
        return (
          <span className="text-sm font-medium">
            {formatAmount(stats.total_revenue_cents, stats.currency || row.currency)}
          </span>
        );
      },
    },
    {
      id: 'redemptions',
      label: t('business.packages.columns.redemptions'),
      sortable: false,
      width: { class: 'w-[110px]', pixel: '110px' },
      renderCell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRedemptionsPackage(row);
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          data-no-row-link="true"
        >
          {t('business.packages.viewStats')}
        </button>
      ),
    },
    {
      id: 'price',
      label: t('business.packages.columns.price'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.amount_cents,
      renderCell: (row) => (
        <span className="text-sm">
          {formatAmount(row.amount_cents, row.currency)}
          {row.interval !== 'one_time' && ` / ${row.interval}`}
        </span>
      ),
    },
    {
      id: 'type',
      label: t('business.packages.columns.type'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.interval,
      renderCell: (row) => {
        const count = row.interval_count ?? 1;
        const label = count > 1
          ? `Every ${count} ${row.interval}s`
          : t(`business.packages.interval.${row.interval}` as any);
        return (
          <Badge variant="outline" className="border-primary text-primary">
            {label}
          </Badge>
        );
      },
    },
    {
      id: 'toggle',
      label: showArchived ? t('business.packages.columns.archived') : t('business.packages.columns.visible'),
      sortable: false,
      width: { class: 'w-[100px]', pixel: '100px' },
      renderCell: (row) => (
        <div data-no-row-link="true">
          {row.is_active ? (
            <Switch
              checked={row.is_visible}
              onCheckedChange={(checked) => handleToggle(row, 'is_visible', checked)}
            />
          ) : (
            <Switch
              checked={true}
              onCheckedChange={() => handleArchiveToggle(row)}
            />
          )}
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
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {t('business.packages.actions.shareLink')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveToggle(row);
                }}
              >
                {row.is_active ? (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    {t('business.packages.actions.archive')}
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    {t('business.packages.actions.unarchive')}
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const emptyState = showArchived ? (
    <EmptyGridState
      title={t('business.packages.noArchivedPackages')}
      subtitle={t('business.packages.noArchivedPackagesSubtitle')}
    />
  ) : !isConnected ? (
    <EmptyGridState
      title={t('business.stripe.connectMessage')}
      subtitle={t('business.packages.noPackagesSubtitle')}
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
      title={t('business.packages.noPackages')}
      subtitle={t('business.packages.noPackagesSubtitle')}
      action={
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span>{t('business.packages.addPackage')}</span>
        </Button>
      }
    />
  );

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={filteredPackages}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="packages"
        enableSearch={true}
        searchPlaceholder="Search packages..."
        searchFields={['name']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showPagination={!!isConnected}
        gridPadding={true}
        compactPagination={true}
        emptyState={emptyState}
        searchBarExtra={(
          <Tabs value={showArchived ? 'archived' : 'active'} onValueChange={(v) => { setShowArchived(v === 'archived'); setSelectedIds(new Set()); }}>
            <TabsList>
              <TabsTrigger
                value="active"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
              >
                {t('business.packages.filter.active')}
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
              >
                {t('business.packages.filter.archived')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        filterBarActions={(
          <Button onClick={() => setIsAddOpen(true)} className="gap-2" disabled={!isConnected}>
            <Plus className="size-4" />
            <span>{t('business.packages.addPackage')}</span>
          </Button>
        )}
        selectionActions={
          selectedIds.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="gap-2">
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedIds.size })}</span>
              </Button>
              <Button variant="ghost" onClick={handleBulkArchiveToggle} className="gap-2">
                {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                <span>{showArchived ? t('business.packages.actions.unarchive') : t('business.packages.actions.archive')}</span>
              </Button>
            </div>
          ) : undefined
        }
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) return;
          setEditingPackage(row);
          setIsEditOpen(true);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) return;
            event.preventDefault();
            setEditingPackage(row);
            setIsEditOpen(true);
          }
        }}
      />

      <AddPackageSidePanel
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={handleSavePackage}
      />

      {editingPackage && (
        <AddPackageSidePanel
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingPackage(null);
          }}
          onSave={handleSavePackage}
          package={editingPackage}
        />
      )}

      <PackageRedemptionsDialog
        open={redemptionsPackage !== null}
        onOpenChange={(open) => !open && setRedemptionsPackage(null)}
        package={redemptionsPackage}
      />
    </div>
  );
};

export default PackagesPage;
