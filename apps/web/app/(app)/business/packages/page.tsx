'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2, FileText, MoreHorizontal, Share2, Archive, ArchiveRestore } from 'lucide-react';
import { motion } from 'motion/react';
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
import { copyToClipboard } from '@/components/app/invite-link-dialog';
import { PackageRedemptionsDialog } from '@/components/business/package-redemptions-dialog';
import { useStripeConnection, useCoachPackages, useAllPackageStats } from '@/hooks/use-coach-packages';
import { usePlatformSettings } from '@/hooks/use-platform-settings';
import { DEFAULT_PACKAGE_IMAGE } from '@/lib/constants/package-presets';
import type { CoachPackage } from '@athli/shared-types';
import { useAddonAccess } from '@/lib/permissions/feature-gate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

function ScreenshotPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    };
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const r = 8;

  return (
    <div ref={containerRef} className="relative">
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
        >
          <defs>
            <linearGradient id="border-grad-packages" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-packages)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-packages)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <img
        src="/app-screenshots/packages/light.png"
        alt="Packages preview"
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src="/app-screenshots/packages/dark.png"
        alt="Packages preview"
        className="w-full h-auto rounded-lg border hidden dark:block"
      />
    </div>
  );
}

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

const PackagesPage = () => {
  const t = useTranslations();
  const router = useRouter();
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
  const { uniqueCode } = usePlatformSettings();
  const { hasAccess: hasPaymentsAddon } = useAddonAccess('payments');

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;
  // Can only activate packages (sync to Stripe) when user has payments addon AND Stripe is connected
  const canActivatePackages = hasPaymentsAddon && isConnected;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoachPackage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [redemptionsPackage, setRedemptionsPackage] = useState<CoachPackage | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  const filteredPackages = packages.filter((p) => showArchived ? !p.is_active : p.is_active);

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error(t('toasts.failedStartStripeConnection'));
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
    const newIsActive = !pkg.is_active;

    // Show upgrade dialog if user doesn't have access
    if (newIsActive && !canActivatePackages) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    try {
      await togglePackage({ id: pkg.id, field: 'is_active', value: newIsActive });
      toast.success(pkg.is_active ? 'Package deactivated' : 'Package activated');
    } catch {
      toast.error(t('toasts.failedUpdatePackage'));
    }
  };

  const handleBulkArchiveToggle = async () => {
    const newIsActive = showArchived; // archived → make active, active → make inactive

    // Show upgrade dialog if user doesn't have access
    if (newIsActive && !canActivatePackages) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          togglePackage({ id, field: 'is_active', value: newIsActive })
        )
      );
      toast.success(showArchived
        ? `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} activated`
        : `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} deactivated`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error(t('toasts.failedUpdatePackages'));
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
          className="text-sm text-primary hover:underline"
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
    // Only show toggle column when viewing inactive/archived items
    ...(showArchived ? [{
      id: 'toggle',
      label: 'Activate',
      sortable: false,
      width: { class: 'w-[100px]', pixel: '100px' },
      renderCell: (row: CoachPackage) => (
        <div data-no-row-link="true">
          <Switch
            checked={false}
            onCheckedChange={() => handleArchiveToggle(row)}
          />
        </div>
      ),
    } as ColumnDefinition<CoachPackage>] : []),
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
              {uniqueCode && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/auth/checkout/${uniqueCode}/${row.id}`;
                    copyToClipboard(url);
                    toast.success(t('business.packages.toast.linkCopied'));
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('business.packages.actions.shareLink')}
                </DropdownMenuItem>
              )}
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
  ) : (
    <EmptyGridState
      title={t('business.packages.noPackages')}
      subtitle={canActivatePackages
        ? t('business.packages.noPackagesSubtitle')
        : 'Create packages now. Connect Stripe later to start accepting payments.'}
      action={
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span>{t('business.packages.addPackage')}</span>
        </Button>
      }
    />
  );

  return (
    <>
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
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyState={emptyState}
        filterBarActions={(
          <div className="flex items-center gap-3">
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
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              <span>{t('business.packages.addPackage')}</span>
            </Button>
          </div>
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
                onClick={handleBulkArchiveToggle}
                className="gap-2"
              >
                {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                <span>{showArchived ? 'Activate' : 'Deactivate'}</span>
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

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {!hasPaymentsAddon ? 'Payments Add-on Required' : 'Connect Stripe First'}
            </DialogTitle>
            <DialogDescription>
              {!hasPaymentsAddon
                ? 'To activate packages and accept payments from your clients, you need to add the Payments add-on to your plan.'
                : 'To activate packages, you need to connect your Stripe account first.'}
            </DialogDescription>
          </DialogHeader>
          {/* Screenshot preview - only show for payments addon upsell */}
          {!hasPaymentsAddon && <ScreenshotPreview />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpgradeDialogOpen(false)}
            >
              {t('general.cancel')}
            </Button>
            <Button
              onClick={() => {
                setIsUpgradeDialogOpen(false);
                router.push(hasPaymentsAddon ? '/business/packages' : '/settings/billing/update');
              }}
            >
              {hasPaymentsAddon ? 'Connect Stripe' : 'Upgrade Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackagesPage;
