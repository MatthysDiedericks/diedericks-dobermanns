import type { RevenueType } from '@/lib/finance/quoteTypes';
import type { RecurringInvoiceInterval } from '@/lib/finance/recurringInvoiceDates';

export type RecurringInvoice = {
  id: string;
  client_id: string | null;
  contact_id: string | null;
  dog_id: string | null;
  invoice_type: RevenueType;
  description: string;
  amount: number;
  currency: string;
  recurrence_interval: RecurringInvoiceInterval;
  next_issue_date: string;
  recurrence_end_date: string | null;
  occurrences_remaining: number | null;
  is_active: boolean;
  last_generated_invoice_id: string | null;
  last_generated_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: { full_name: string | null } | null;
  contact?: { full_name: string; email: string | null } | null;
  dog?: { name: string } | null;
};

export type RecurringInvoiceInput = {
  client_id?: string | null;
  contact_id?: string | null;
  dog_id?: string | null;
  invoice_type: RevenueType;
  description: string;
  amount: number;
  recurrence_interval: RecurringInvoiceInterval;
  next_issue_date: string;
  recurrence_end_date?: string | null;
  occurrences_remaining?: number | null;
  notes?: string | null;
};
