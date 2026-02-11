'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { usePackageCouponRedemptions } from '@/hooks/use-coach-packages';
import type { CoachPackage, PackageCouponRedemption } from '@athli/shared-types';

interface PackageRedemptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package: CoachPackage | null;
}

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function PackageRedemptionsDialog({
  open,
  onOpenChange,
  package: pkg,
}: PackageRedemptionsDialogProps) {
  const t = useTranslations();
  const { data: redemptions, isLoading } = usePackageCouponRedemptions(pkg?.id ?? null);

  const columns = useMemo<ColumnDefinition<PackageCouponRedemption>[]>(() => [
    {
      id: 'coupon',
      label: t('business.packages.redemptionsDialog.couponColumn'),
      sortable: false,
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{row.coupon_name}</span>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.coupon_code}</code>
            <span className="text-xs text-muted-foreground">
              {row.discount_type === 'percentage'
                ? `${row.discount_value}% off`
                : `${formatAmount(row.discount_value, row.currency)} off`}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'redemptions',
      label: 'Coupons',
      sortable: false,
      width: { class: 'w-[100px]', pixel: '100px' },
      renderCell: (row) => (
        <span className="text-sm font-medium">{row.redemption_count}</span>
      ),
    },
  ], [t]);

  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{pkg.name} coupon redemptions</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden min-w-[500px] h-[350px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataGrid
              data={redemptions || []}
              columns={columns}
              getRowId={(row) => row.coupon_id}
              gridKey="package-redemptions"
              showPagination={false}
              enableSearch={false}
              enableEditColumns={false}
              enableExport={false}
              compactMode
              gridPadding
              alwaysShowHeaders
              emptyMessage={t('business.packages.redemptionsDialog.noCoupons')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
