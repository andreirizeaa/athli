'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/api-client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface LineItem {
  description: string | null;
  amount: number;
}

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
  line_items: LineItem[];
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

export const UnpaidInvoiceOverlay = () => {
  const { data } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: getInvoices,
    staleTime: 5 * 60 * 1000,
  });

  const openInvoices = data?.invoices.filter((inv) => inv.status === 'open') || [];

  if (openInvoices.length === 0) {
    return null;
  }

  const invoice = openInvoices[0]; // Show the first open invoice

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-lg max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold">Unpaid Invoice</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Please settle your outstanding invoice to continue using the app.
          </p>
        </div>

        <Separator />

        {/* Invoice Details */}
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {/* Invoice number and status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invoice</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{invoice.number || invoice.id.slice(0, 12)}</span>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Open
                </Badge>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm">{format(new Date(invoice.created * 1000), 'd MMM, yyyy')}</span>
            </div>

            {/* Line items (what was charged) */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase font-medium">Charges</span>
                  {invoice.line_items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[70%]">
                        {item.description || 'Subscription'}
                      </span>
                      <span>{formatCurrency(item.amount, invoice.currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Amount Due */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount Due</span>
              <span className="text-lg font-semibold">
                {formatCurrency(invoice.amount_due, invoice.currency)}
              </span>
            </div>
          </div>

          {/* Action button */}
          {invoice.hosted_invoice_url && (
            <Button
              className="w-full gap-2"
              onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
            >
              Pay Invoice
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
