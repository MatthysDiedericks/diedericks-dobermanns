import type { AllocationType, CreateExpenseInput } from '@/lib/finance/expenseMutations';

export const OTHER_ACCOUNT = '__other__';

export function validateExpenseForm(input: {
  categoryId: string;
  description: string;
  amount: string;
  allocationType: AllocationType;
  selectedDogId: string | null;
  selectedLitterId: string | null;
  editingId?: string;
  receiptIntent?: string;
  receiptPath?: string | null;
  originalReceiptPath?: string | null;
}): string | null {
  if (!input.categoryId || !input.description.trim() || !input.amount) {
    return 'Category, description and amount are required.';
  }
  if (input.allocationType === 'dog' && !input.selectedDogId) {
    return 'Select a dog for this allocation.';
  }
  if (input.allocationType === 'litter' && !input.selectedLitterId) {
    return 'Select a litter for this allocation.';
  }
  if (
    input.editingId &&
    input.receiptIntent === 'replace' &&
    input.receiptPath === input.originalReceiptPath
  ) {
    return 'Upload the new receipt first — the original stays attached until it succeeds.';
  }
  return null;
}

export function buildExpensePayload(input: {
  categoryId: string;
  description: string;
  priceNum: number;
  vatNum: number;
  expenseDate: string;
  supplier: string;
  invoiceRef: string;
  allocationType: AllocationType;
  selectedDogId: string | null;
  selectedLitterId: string | null;
  paymentAccountId: string | null;
  paymentAccountName: string;
  customAccount: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  interval: string;
  recurringEnd: string;
  notes: string;
  isPayable: boolean;
  payableDueDate: string;
  creditorName: string;
}): CreateExpenseInput {
  const resolvedPaymentName =
    input.paymentAccountId === OTHER_ACCOUNT
      ? input.customAccount.trim()
      : input.paymentAccountName || null;
  const resolvedPaymentId =
    input.paymentAccountId === OTHER_ACCOUNT ? null : input.paymentAccountId;
  return {
    category_id: input.categoryId,
    description: input.description.trim(),
    price_excl_vat: input.priceNum,
    vat_applicable: input.vatNum > 0,
    vat_rate: input.vatNum > 0 ? 15 : 0,
    vat_amount: input.vatNum,
    amount: input.priceNum,
    expense_date: input.expenseDate,
    supplier_name: input.supplier || undefined,
    invoice_reference: input.invoiceRef || undefined,
    allocation_type: input.allocationType,
    dog_id: input.allocationType === 'dog' ? input.selectedDogId : null,
    litter_id: input.allocationType === 'litter' ? input.selectedLitterId : null,
    payment_account_id: resolvedPaymentId,
    payment_account_name: resolvedPaymentName,
    receipt_url: input.receiptUrl,
    is_recurring: input.isRecurring,
    recurrence_interval: input.isRecurring ? input.interval : null,
    recurrence_end_date: input.isRecurring && input.recurringEnd ? input.recurringEnd : null,
    notes: input.notes || undefined,
    is_payable: input.isPayable,
    payable_due_date: input.isPayable && input.payableDueDate ? input.payableDueDate : null,
    creditor_name: input.isPayable && input.creditorName ? input.creditorName : null,
  };
}
