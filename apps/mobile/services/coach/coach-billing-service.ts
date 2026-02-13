import { apiFetch } from '@/lib/api-client';

/**
 * Invoice from Stripe
 */
export interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
}

/**
 * Fetch all invoices for the authenticated coach
 */
export async function getCoachInvoices(): Promise<InvoicesResponse> {
  try {
    const response = await apiFetch<InvoicesResponse>('/billing/invoices');
    return response;
  } catch (error) {
    console.error('[getCoachInvoices] Error:', error);
    throw error;
  }
}

/**
 * Format currency from cents
 */
export function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Get status display info
 */
export function getInvoiceStatusInfo(status: Invoice['status']): { label: string; color: string } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: 'success' };
    case 'open':
      return { label: 'Open', color: 'warning' };
    case 'draft':
      return { label: 'Draft', color: 'muted' };
    case 'void':
      return { label: 'Void', color: 'muted' };
    case 'uncollectible':
      return { label: 'Uncollectible', color: 'error' };
    default:
      return { label: status, color: 'muted' };
  }
}
