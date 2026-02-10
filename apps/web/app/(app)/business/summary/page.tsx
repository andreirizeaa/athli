'use client';

import { useTranslations } from 'next-intl';
import { DollarSign, TrendingUp, CreditCard, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { useStripeConnection, useSummaryAnalytics, useSummaryActivity, useCoachPackages } from '@/hooks/use-coach-packages';
import type { PaymentActivityRow } from '@athli/shared-types';

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCurrencyPrecise(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function getChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const statusColors: Record<string, string> = {
  succeeded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-blue-100 text-blue-800 border-blue-200',
  disputed: 'bg-orange-100 text-orange-800 border-orange-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const SummaryPage = () => {
  const t = useTranslations();
  const { data: stripeAccount } = useStripeConnection();
  const { startOnboarding, isOnboarding } = useCoachPackages();
  const { data: analytics, isLoading: isAnalyticsLoading } = useSummaryAnalytics();
  const { data: activity, isLoading: isActivityLoading } = useSummaryActivity();

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to start Stripe connection');
    }
  };
  const currency = analytics?.currency || 'usd';
  const changePercent = analytics
    ? getChangePercent(analytics.this_month_revenue_cents, analytics.last_month_revenue_cents)
    : null;

  const statCards = [
    {
      label: t('business.summary.grossRevenue'),
      value: analytics ? formatCurrency(analytics.gross_revenue_cents, currency) : '$0',
      icon: DollarSign,
    },
    {
      label: t('business.summary.thisMonth'),
      value: analytics ? formatCurrency(analytics.this_month_revenue_cents, currency) : '$0',
      icon: TrendingUp,
      change: changePercent,
    },
    {
      label: t('business.summary.activeSubscriptions'),
      value: analytics ? analytics.active_subscriptions_count.toString() : '0',
      icon: CreditCard,
    },
    {
      label: t('business.summary.payingClients'),
      value: analytics ? analytics.paying_clients_count.toString() : '0',
      icon: Users,
    },
  ];

  const columns: ColumnDefinition<PaymentActivityRow>[] = [
    {
      id: 'date',
      label: t('business.summary.columns.date'),
      sortable: true,
      width: { class: 'w-[140px]', pixel: '140px' },
      getSortValue: (row) => row.paid_at || row.created_at,
      renderCell: (row) => (
        <span className="text-sm">{formatDate(row.paid_at || row.created_at)}</span>
      ),
    },
    {
      id: 'client',
      label: t('business.summary.columns.client'),
      sortable: true,
      width: { class: 'w-[200px]', pixel: '200px' },
      getSortValue: (row) => (row.client_name || '').toLowerCase(),
      getSearchValue: (row) => `${row.client_name || ''} ${row.client_email || ''}`,
      renderCell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate">{row.client_name || '-'}</span>
          {row.client_email && (
            <span className="text-xs text-muted-foreground truncate">{row.client_email}</span>
          )}
        </div>
      ),
    },
    {
      id: 'package',
      label: t('business.summary.columns.package'),
      sortable: true,
      width: { class: 'w-[180px]', pixel: '180px' },
      getSortValue: (row) => (row.package_name || '').toLowerCase(),
      getSearchValue: (row) => row.package_name || '',
      renderCell: (row) => (
        <span className="text-sm truncate">{row.package_name || '-'}</span>
      ),
    },
    {
      id: 'amount',
      label: t('business.summary.columns.amount'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.amount_cents,
      renderCell: (row) => (
        <span className="text-sm font-medium">
          {formatCurrencyPrecise(row.amount_cents, row.currency)}
        </span>
      ),
    },
    {
      id: 'type',
      label: t('business.summary.columns.type'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.payment_type,
      renderCell: (row) => (
        <Badge variant="outline" className="border-primary text-primary">
          {t(`business.summary.type.${row.payment_type}` as any)}
        </Badge>
      ),
    },
    {
      id: 'status',
      label: t('business.summary.columns.status'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.status,
      renderCell: (row) => (
        <Badge
          variant="outline"
          className={statusColors[row.status] || 'bg-gray-100 text-gray-800 border-gray-200'}
        >
          {t(`business.summary.status.${row.status}` as any)}
        </Badge>
      ),
    },
  ];

  const statusFilter: FilterDefinition<PaymentActivityRow> = {
    id: 'status',
    label: t('business.summary.columns.status'),
    options: [
      { value: 'succeeded', label: t('business.summary.status.succeeded') },
      { value: 'pending', label: t('business.summary.status.pending') },
      { value: 'failed', label: t('business.summary.status.failed') },
      { value: 'refunded', label: t('business.summary.status.refunded') },
      { value: 'disputed', label: t('business.summary.status.disputed') },
      { value: 'cancelled', label: t('business.summary.status.cancelled') },
    ],
    getFilterValue: (row) => row.status,
  };

  const emptyState = !isConnected ? (
    <EmptyGridState
      title={t('business.stripe.connectMessage')}
      subtitle={t('business.summary.noStripeSubtitle')}
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
      title={t('business.summary.noPayments')}
      subtitle={t('business.summary.noPaymentsSubtitle')}
    />
  );

  return (
    <div className="h-full w-full flex flex-col">
      {/* Stat Cards - only show when connected */}
      {isConnected && (
        <div className="grid grid-cols-4 gap-4 p-4 flex-shrink-0">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <div className="rounded-md bg-primary/10 p-2">
                <card.icon className="size-4 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                {isAnalyticsLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <span className="text-lg font-semibold">{card.value}</span>
                )}
                {card.change !== undefined && !isAnalyticsLoading && card.change !== null && (
                  <span
                    className={`text-xs mt-0.5 ${
                      card.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {card.change >= 0 ? '+' : ''}
                    {card.change}% {t('business.summary.vsLastMonth')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Table */}
      <div className="flex-1 min-h-0">
        <DataGrid
          data={activity || []}
          columns={columns}
          getRowId={(row) => row.id}
          gridKey="payment-activity"
          enableSearch={true}
          searchPlaceholder="Search..."
          searchFields={['client_name', 'package_name']}
          filters={[statusFilter]}
          enableExport={true}
          exportFileName="payment-activity"
          exportDataTransform={(row) => ({
            Date: formatDate(row.paid_at || row.created_at),
            Client: row.client_name || '-',
            Email: row.client_email || '-',
            Package: row.package_name || '-',
            Amount: formatCurrencyPrecise(row.amount_cents, row.currency),
            Type: row.payment_type,
            Status: row.status,
          })}
          showPagination={!!isConnected}
          gridPadding={true}
          compactPagination={true}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
};

export default SummaryPage;
