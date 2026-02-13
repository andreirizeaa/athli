'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/api-client';
import { useTranslations } from 'next-intl';

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
}

async function getInvoices(): Promise<InvoicesResponse> {
  return apiFetch('/billing/invoices');
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function getInvoiceType(invoice: Invoice): 'subscription' | 'upgrade' {
  // If period_start and period_end are within 1 day, it's an upgrade invoice
  const oneDayInSeconds = 86400;
  const periodDiff = Math.abs(invoice.period_end - invoice.period_start);
  return periodDiff <= oneDayInSeconds ? 'upgrade' : 'subscription';
}

function formatPeriod(invoice: Invoice): string | null {
  const type = getInvoiceType(invoice);
  if (type === 'upgrade') {
    // Upgrades don't have periods
    return null;
  }
  // For subscriptions, show the period range
  return `${format(new Date(invoice.period_start * 1000), 'MMM d')} - ${format(new Date(invoice.period_end * 1000), 'MMM d, yyyy')}`;
}

export const InvoicesCard = () => {
  const t = useTranslations('settings.billing.invoices');
  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: getInvoices,
    staleTime: 5 * 60 * 1000,
  });

  const invoices = data?.invoices || [];

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">{t('status.paid')}</Badge>;
      case 'open':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">{t('status.open')}</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">{t('status.draft')}</Badge>;
      case 'void':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">{t('status.void')}</Badge>;
      case 'uncollectible':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/30">{t('status.uncollectible')}</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: 'subscription' | 'upgrade') => {
    if (type === 'subscription') {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">{t('type.subscription')}</Badge>;
    }
    return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">{t('type.upgrade')}</Badge>;
  };

  return (
    <Card className="bg-background max-w-3xl w-full">
      <CardHeader className="px-4">
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px]" />
      <CardContent className="px-0 py-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 px-4">
            <p className="text-sm text-muted-foreground">{t('error')}</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="flex flex-col">
            {/* Header row */}
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[18%] flex-shrink-0">{t('columns.type')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[14%] flex-shrink-0">{t('columns.amount')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[18%] flex-shrink-0">{t('columns.date')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[24%] flex-shrink-0">{t('columns.period')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[14%] flex-shrink-0">{t('columns.status')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold w-[12%] flex-shrink-0 text-right">{t('columns.invoice')}</span>
            </div>
            {invoices.map((invoice) => (
              <React.Fragment key={invoice.id}>
                <Separator />
                <div className="flex items-center px-4 py-3">
                  <span className="w-[18%] flex-shrink-0">
                    {getTypeBadge(getInvoiceType(invoice))}
                  </span>
                  <span className="text-sm font-medium w-[14%] flex-shrink-0">
                    {formatCurrency(invoice.status === 'open' ? invoice.amount_due : invoice.amount_paid, invoice.currency)}
                  </span>
                  <span className="text-sm w-[18%] flex-shrink-0">
                    {format(new Date(invoice.created * 1000), 'd MMM, yyyy')}
                  </span>
                  <span className="text-sm w-[24%] flex-shrink-0">
                    {formatPeriod(invoice) ?? '--'}
                  </span>
                  <span className="w-[14%] flex-shrink-0">
                    {getStatusBadge(invoice.status)}
                  </span>
                  <span className="w-[12%] flex-shrink-0 text-right">
                    {invoice.hosted_invoice_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 mr-[-10px]"
                        onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                      >
                        {t('actions.view')}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : invoice.invoice_pdf ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {t('actions.pdf')}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </span>
                </div>
              </React.Fragment>
            ))}
            <Separator />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 px-4">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
