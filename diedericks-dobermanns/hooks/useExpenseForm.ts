import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import {
  createExpense,
  fetchExpenseById,
  updateExpense,
  type AllocationType,
} from '@/hooks/useExpenses';

const VAT_RATE = 15;
export const OTHER_ACCOUNT = '__other__';

export function useExpenseForm() {
  const params = useLocalSearchParams<{
    expenseId?: string;
    isRecurring?: string;
    isPayable?: string;
    dogId?: string;
    dogName?: string;
    litterId?: string;
    litterName?: string;
  }>();

  const today = new Date().toISOString().slice(0, 10);
  const editingId = typeof params.expenseId === 'string' ? params.expenseId : undefined;
  const lockedDog = typeof params.dogId === 'string' ? params.dogId : undefined;
  const lockedLitter = typeof params.litterId === 'string' ? params.litterId : undefined;

  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [priceExclVat, setPriceExclVat] = useState('');
  const [vatApplicable, setVatApplicable] = useState(false);
  const [expenseDate, setExpenseDate] = useState(today);
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationType>('general');
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedDogName, setSelectedDogName] = useState('');
  const [selectedLitterId, setSelectedLitterId] = useState<string | null>(null);
  const [selectedLitterName, setSelectedLitterName] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null);
  const [paymentAccountName, setPaymentAccountName] = useState('');
  const [customAccount, setCustomAccount] = useState('');
  const [isRecurring, setIsRecurring] = useState(params.isRecurring === 'true');
  const [isPayable, setIsPayable] = useState(params.isPayable === 'true');
  const [payableDueDate, setPayableDueDate] = useState('');
  const [creditorName, setCreditorName] = useState('');
  const [interval, setInterval] = useState('monthly');
  const [recurringEnd, setRecurringEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const priceNum = parseFloat(priceExclVat) || 0;
  const vatAmount = vatApplicable ? Number((priceNum * VAT_RATE / 100).toFixed(2)) : 0;
  const totalAmount = priceNum + vatAmount;

  useEffect(() => {
    if (lockedDog) {
      setAllocationType('dog');
      setSelectedDogId(lockedDog);
      setSelectedDogName(typeof params.dogName === 'string' ? params.dogName : '');
    }
    if (lockedLitter) {
      setAllocationType('litter');
      setSelectedLitterId(lockedLitter);
      setSelectedLitterName(typeof params.litterName === 'string' ? params.litterName : '');
    }
  }, [lockedDog, lockedLitter, params.dogName, params.litterName]);

  useEffect(() => {
    if (!editingId) return;
    void (async () => {
      try {
        const exp = await fetchExpenseById(editingId);
        if (!exp) return;
        setCategoryId(exp.category_id);
        setDescription(exp.description);
        setPriceExclVat(String(exp.price_excl_vat ?? exp.amount));
        setVatApplicable(exp.vat_applicable ?? false);
        setExpenseDate(exp.expense_date);
        setSupplier(exp.supplier_name ?? '');
        setInvoiceRef(exp.invoice_reference ?? '');
        setAllocationType((exp.allocation_type as AllocationType) ?? 'general');
        setSelectedDogId(exp.dog_id);
        setSelectedLitterId(exp.litter_id);
        setPaymentAccountId(exp.payment_account_id);
        setPaymentAccountName(exp.payment_account_name ?? '');
        setIsRecurring(exp.is_recurring);
        setInterval(exp.recurrence_interval ?? 'monthly');
        setRecurringEnd(exp.recurrence_end_date ?? '');
        setIsPayable(exp.is_payable);
        setPayableDueDate(exp.payable_due_date ?? '');
        setCreditorName(exp.creditor_name ?? '');
        setNotes(exp.notes ?? '');
        if (exp.receipt_url) {
          setReceiptPath(exp.receipt_url);
          setReceiptName(exp.receipt_url.split('/').pop() ?? 'Receipt attached');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load expense');
      } finally {
        setLoadingExpense(false);
      }
    })();
  }, [editingId]);

  const lockLabel = useMemo(() => {
    if (lockedDog) return `Dog: ${selectedDogName || params.dogName || lockedDog}`;
    if (lockedLitter) return `Litter: ${selectedLitterName || params.litterName || lockedLitter}`;
    return undefined;
  }, [lockedDog, lockedLitter, selectedDogName, selectedLitterName, params.dogName, params.litterName]);

  const buildPayload = () => {
    const resolvedPaymentName =
      paymentAccountId === OTHER_ACCOUNT ? customAccount.trim() : paymentAccountName || null;
    const resolvedPaymentId = paymentAccountId === OTHER_ACCOUNT ? null : paymentAccountId;
    return {
      category_id: categoryId,
      description: description.trim(),
      price_excl_vat: priceNum,
      vat_applicable: vatApplicable,
      vat_rate: vatApplicable ? VAT_RATE : 0,
      vat_amount: vatAmount,
      amount: totalAmount,
      expense_date: expenseDate,
      supplier_name: supplier || undefined,
      invoice_reference: invoiceRef || undefined,
      allocation_type: allocationType,
      dog_id: allocationType === 'dog' ? selectedDogId : null,
      litter_id: allocationType === 'litter' ? selectedLitterId : null,
      payment_account_id: resolvedPaymentId,
      payment_account_name: resolvedPaymentName,
      receipt_url: receiptPath,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? interval : null,
      recurrence_end_date: isRecurring && recurringEnd ? recurringEnd : null,
      notes: notes || undefined,
      is_payable: isPayable,
      payable_due_date: isPayable && payableDueDate ? payableDueDate : null,
      creditor_name: isPayable && creditorName ? creditorName : null,
    };
  };

  const validate = (): string | null => {
    if (!categoryId || !description.trim() || !priceExclVat) {
      return 'Category, description and price are required.';
    }
    if (allocationType === 'dog' && !selectedDogId) return 'Select a dog for this allocation.';
    if (allocationType === 'litter' && !selectedLitterId) return 'Select a litter for this allocation.';
    return null;
  };

  const resetAfterSave = () => {
    setDescription('');
    setPriceExclVat('');
    setSupplier('');
    setInvoiceRef('');
    setNotes('');
    setReceiptPath(null);
    setReceiptName(null);
    if (!lockedDog && !lockedLitter) {
      setAllocationType('general');
      setSelectedDogId(null);
      setSelectedDogName('');
      setSelectedLitterId(null);
      setSelectedLitterName('');
    }
    setPaymentAccountId(null);
    setPaymentAccountName('');
    setCustomAccount('');
    setPayableDueDate('');
    setCreditorName('');
    setIsPayable(false);
    setRecurringEnd('');
    setSuccessMsg('Expense logged ✓');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const save = async (andReset: boolean) => {
    const err = validate();
    if (err) {
      setError(err);
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateExpense({ id: editingId, ...payload });
        return 'back' as const;
      }
      await createExpense(payload);
      if (andReset) resetAfterSave();
      return andReset ? 'reset' as const : 'back' as const;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save expense');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    editingId,
    lockedDog,
    lockedLitter,
    lockLabel,
    categoryId,
    setCategoryId,
    description,
    setDescription,
    priceExclVat,
    setPriceExclVat,
    vatApplicable,
    setVatApplicable,
    vatAmount,
    totalAmount,
    expenseDate,
    setExpenseDate,
    supplier,
    setSupplier,
    invoiceRef,
    setInvoiceRef,
    allocationType,
    setAllocationType,
    selectedDogId,
    selectedDogName,
    setSelectedDogId,
    setSelectedDogName,
    selectedLitterId,
    selectedLitterName,
    setSelectedLitterId,
    setSelectedLitterName,
    paymentAccountId,
    paymentAccountName,
    customAccount,
    setPaymentAccountId,
    setPaymentAccountName,
    setCustomAccount,
    isRecurring,
    setIsRecurring,
    isPayable,
    setIsPayable,
    payableDueDate,
    setPayableDueDate,
    creditorName,
    setCreditorName,
    interval,
    setInterval,
    recurringEnd,
    setRecurringEnd,
    notes,
    setNotes,
    receiptPath,
    receiptName,
    setReceiptPath,
    setReceiptName,
    loadingExpense,
    saving,
    error,
    successMsg,
    save,
  };
}
