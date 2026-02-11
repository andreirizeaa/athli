'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DollarSign, TrendingUp, CreditCard, Users, Loader2, CalendarIcon, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { useStripeConnection, useSummaryAnalytics, useSummaryActivity, useCoachPackages } from '@/hooks/use-coach-packages';
import type { PaymentActivityRow } from '@athli/shared-types';
import type { DateRange } from 'react-day-picker';

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

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Event type colors and labels - each event has a unique color
const eventTypeConfig: Record<string, { color: string; label: string }> = {
  payment_succeeded: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Payment' },
  payment_failed: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
  subscription_created: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'New Subscription' },
  subscription_renewed: { color: 'bg-teal-100 text-teal-800 border-teal-200', label: 'Renewed' },
  subscription_cancelling: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Cancelling' },
  subscription_cancelled: { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Cancelled' },
  subscription_reactivated: { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'Reactivated' },
  subscription_past_due: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Past Due' },
  refund_issued: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Refund' },
  dispute_created: { color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Dispute' },
  // Trial events
  trial_started: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Trial Started' },
  trial_ending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Trial Ending' },
  trial_converted: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Trial Converted' },
  // Customer portal events
  customer_updated: { color: 'bg-sky-100 text-sky-800 border-sky-200', label: 'Profile Updated' },
  payment_method_added: { color: 'bg-lime-100 text-lime-800 border-lime-200', label: 'Card Added' },
  payment_method_updated: { color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', label: 'Card Updated' },
  payment_method_removed: { color: 'bg-stone-100 text-stone-800 border-stone-200', label: 'Card Removed' },
};

const ActivityPage = () => {
  const t = useTranslations();
  const { data: stripeAccount } = useStripeConnection();
  const { startOnboarding, isOnboarding } = useCoachPackages();
  const { data: analytics, isLoading: isAnalyticsLoading } = useSummaryAnalytics();
  const { data: activity, isLoading: isActivityLoading } = useSummaryActivity();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to start Stripe connection');
    }
  };

  const handleResetToToday = () => {
    const today = new Date();
    setDateRange({ from: today, to: today });
  };

  // Filter activity by date range and event type
  const filteredActivity = useMemo(() => {
    if (!activity) return [];

    let filtered = activity;

    // Filter by date range
    if (dateRange?.from) {
      filtered = filtered.filter((row) => {
        const rowDate = new Date(row.created_at);
        rowDate.setHours(0, 0, 0, 0);

        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0, 0, 0, 0);

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return rowDate >= fromDate && rowDate <= toDate;
        }

        // Single day selection
        return rowDate.getTime() === fromDate.getTime();
      });
    }

    // Filter by event type
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((row) => selectedStatuses.includes(row.event_type));
    }

    return filtered;
  }, [activity, dateRange, selectedStatuses]);

  const currency = analytics?.currency || 'usd';
  const changePercent = analytics
    ? getChangePercent(analytics.this_month_revenue_cents, analytics.last_month_revenue_cents)
    : null;

  const statCards = [
    {
      label: t('business.activity.grossRevenue'),
      value: analytics ? formatCurrency(analytics.gross_revenue_cents, currency) : '$0',
      icon: DollarSign,
    },
    {
      label: t('business.activity.thisMonth'),
      value: analytics ? formatCurrency(analytics.this_month_revenue_cents, currency) : '$0',
      icon: TrendingUp,
      change: changePercent,
    },
    {
      label: t('business.activity.activeSubscriptions'),
      value: analytics ? analytics.active_subscriptions_count.toString() : '0',
      icon: CreditCard,
    },
    {
      label: t('business.activity.payingClients'),
      value: analytics ? analytics.paying_clients_count.toString() : '0',
      icon: Users,
    },
  ];

  // Columns order: Athlete, Event, Amount, Package, Description, Date
  const columns: ColumnDefinition<PaymentActivityRow>[] = [
    {
      id: 'athlete',
      label: t('business.activity.columns.athlete'),
      sortable: true,
      width: { class: 'w-[180px]', pixel: '180px' },
      getSortValue: (row) => (row.client_name || '').toLowerCase(),
      getSearchValue: (row) => `${row.client_name || ''} ${row.client_email || ''}`,
      renderCell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={row.client_avatar_url || undefined} alt={row.client_name || ''} />
            <AvatarFallback>{getInitials(row.client_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{row.client_name || '-'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'event_type',
      label: t('business.activity.columns.event'),
      sortable: true,
      width: { class: 'w-[140px]', pixel: '140px' },
      getSortValue: (row) => row.event_type,
      renderCell: (row) => {
        const config = eventTypeConfig[row.event_type] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: row.event_type };
        return (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'amount',
      label: t('business.activity.columns.amount'),
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => row.amount_cents,
      renderCell: (row) => (
        <span className="text-sm font-medium">
          {row.amount_cents > 0 ? formatCurrencyPrecise(row.amount_cents, row.currency) : '-'}
        </span>
      ),
    },
    {
      id: 'package',
      label: t('business.activity.columns.package'),
      sortable: true,
      width: { class: 'w-[160px]', pixel: '160px' },
      getSortValue: (row) => (row.package_name || '').toLowerCase(),
      getSearchValue: (row) => row.package_name || '',
      renderCell: (row) => (
        row.package_id && row.package_name ? (
          <Link
            href={`/business/packages?highlight=${row.package_id}`}
            className="text-sm text-primary hover:underline truncate"
          >
            {row.package_name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
      ),
    },
    {
      id: 'description',
      label: t('business.activity.columns.description'),
      sortable: false,
      width: { class: 'flex-1 min-w-[200px]', pixel: '200px' },
      getSearchValue: (row) => row.description,
      renderCell: (row) => (
        <span className="text-sm truncate">{row.description}</span>
      ),
    },
    {
      id: 'date',
      label: t('business.activity.columns.date'),
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.created_at,
      renderCell: (row) => (
        <span className="text-sm text-primary">{formatDate(row.created_at)}</span>
      ),
    },
  ];

  const eventTypeOptions = [
    // Payments
    { value: 'payment_succeeded', label: 'Payment' },
    { value: 'payment_failed', label: 'Failed' },
    { value: 'refund_issued', label: 'Refund' },
    { value: 'dispute_created', label: 'Dispute' },
    // Subscriptions
    { value: 'subscription_created', label: 'New Subscription' },
    { value: 'subscription_renewed', label: 'Renewed' },
    { value: 'subscription_cancelling', label: 'Cancelling' },
    { value: 'subscription_cancelled', label: 'Cancelled' },
    { value: 'subscription_reactivated', label: 'Reactivated' },
    { value: 'subscription_past_due', label: 'Past Due' },
    // Trials
    { value: 'trial_started', label: 'Trial Started' },
    { value: 'trial_ending', label: 'Trial Ending' },
    { value: 'trial_converted', label: 'Trial Converted' },
    // Customer portal
    { value: 'customer_updated', label: 'Profile Updated' },
    { value: 'payment_method_added', label: 'Card Added' },
    { value: 'payment_method_updated', label: 'Card Updated' },
    { value: 'payment_method_removed', label: 'Card Removed' },
  ];

  const handleStatusToggle = (value: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const emptyState = !isConnected ? (
    <EmptyGridState
      title={t('business.stripe.connectMessage')}
      subtitle={t('business.activity.noStripeSubtitle')}
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
      title={t('business.activity.noPayments')}
      subtitle={t('business.activity.noPaymentsSubtitle')}
    />
  );

  return (
    <div className="h-full w-full flex flex-col">
      {/* Stat Cards - only show when connected */}
      {isConnected && (
        <div className="grid grid-cols-4 gap-4 px-4 pt-4 flex-shrink-0">
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
                    {card.change}% {t('business.activity.vsLastMonth')}
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
          data={filteredActivity}
          columns={columns}
          getRowId={(row) => row.id}
          gridKey="payment-activity"
          enableSearch={true}
          searchPlaceholder="Search..."
          searchFields={['client_name', 'package_name']}
          enableExport={true}
          exportFileName="payment-activity"
          exportDataTransform={(row) => ({
            Athlete: row.client_name || '-',
            Event: eventTypeConfig[row.event_type]?.label || row.event_type,
            Amount: row.amount_cents > 0 ? formatCurrencyPrecise(row.amount_cents, row.currency) : '-',
            Package: row.package_name || '-',
            Description: row.description,
            Date: formatDate(row.created_at),
          })}
          showPagination={!!isConnected}
          gridPadding={true}
          compactPagination={true}
          emptyState={emptyState}
          filterBarActions={
            <div className="flex items-center gap-2">
              {/* Date picker */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start px-2.5 font-normal"
                  >
                    <CalendarIcon className="size-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>{t('business.activity.allDates')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" collisionPadding={16}>
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                  <div className="flex justify-end p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleResetToToday();
                        setIsCalendarOpen(false);
                      }}
                    >
                      <RotateCcw className="size-4" />
                      {t('business.activity.today')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Event type dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-2.5 font-normal">
                    {t('business.activity.columns.event')}
                    {selectedStatuses.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                        {selectedStatuses.length}
                      </Badge>
                    )}
                    <ChevronDown className="size-4 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {eventTypeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-4 h-4 flex items-center justify-center">
                          {selectedStatuses.includes(option.value) && (
                            <Check className="size-4" />
                          )}
                        </div>
                        {option.label}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default ActivityPage;
