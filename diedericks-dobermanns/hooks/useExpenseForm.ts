import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import {
  createExpense,
  fetchExpenseById,
  updateExpense,
  type AllocationType,
} from '@/hooks/useExpenses';
import type { ReceiptIntent } from '@/components/finance/ExpenseReceiptControl';
import { buildExpensePayload, validateExpenseForm } from '@/lib/finance/expenseFormPayload';
import { normalizeAllocationType } from '@/lib/finance/allocation';
import {
  defaultVatAmount,
  EXPENSE_SAVE_FAILED,
  expenseGross,
  expenseLoggedLabel,
  expenseSavedConfirmation,
  vatLooksOffRate,
} from '@/lib/finance/expenseGross';

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
  const [employeeId, setEmployeeId] = useState('');
  const [description, setDescription] = useState('');
  const [priceExclVat, setPriceExclVat] = useState('');
  const [vatAmountText, setVatAmountText] = useState('');
  const [vatTouched, setVatTouched] = useState(false);
  const [expenseDate, setExpenseDate] = useState(today);
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationType>('shared');
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
  const [originalReceiptPath, setOriginalReceiptPath] = useState<string | null>(null);
  const [receiptIntent, setReceiptIntent] = useState<ReceiptIntent>('keep');
  const [loggedLabel, setLoggedLabel] = useState<string | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const successClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successClearRef.current) clearTimeout(successClearRef.current);
    };
  }, []);

  const priceNum = parseFloat(priceExclVat) || 0;
  const vatNum = parseFloat(vatAmountText) || 0;
  const totalAmount = priceNum + vatNum;
  const vatHint = vatTouched && vatLooksOffRate(priceNum, vatNum);

  const setAmountAndMaybeVat = (next: string) => {
    setPriceExclVat(next);
    if (!editingId && !vatTouched) {
      setVatAmountText(String(defaultVatAmount(parseFloat(next) || 0) || ''));
    }
  };

  const setVatTyped = (next: string) => {
    setVatTouched(true);
    setVatAmountText(next);
  };

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
        setEmployeeId(exp.employee_id ?? '');
        setDescription(exp.description);
        setPriceExclVat(String(exp.price_excl_vat ?? exp.amount));
        setVatAmountText(exp.vat_amount ? String(exp.vat_amount) : '');
        setVatTouched(true);
        setExpenseDate(exp.expense_date);
        setSupplier(exp.supplier_name ?? '');
        setInvoiceRef(exp.invoice_reference ?? '');
        setAllocationType(normalizeAllocationType(exp.allocation_type));
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
        setLoggedLabel(expenseLoggedLabel(exp.created_at, exp.recordedByName));
        if (exp.receipt_url) {
          setReceiptPath(exp.receipt_url);
          setOriginalReceiptPath(exp.receipt_url);
          setReceiptName(exp.receipt_url.split('/').pop() ?? 'Receipt attached');
          setReceiptIntent('keep');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load expense');
      } finally {
        setLoadingExpense(false);
      }
    })();
  }, [editingId]);

  const lockLabel = lockedDog
    ? `Dog: ${selectedDogName || params.dogName || lockedDog}`
    : lockedLitter
      ? `Litter: ${selectedLitterName || params.litterName || lockedLitter}`
      : undefined;

  const buildPayload = () =>
    buildExpensePayload({
      categoryId, description, priceNum, vatNum, expenseDate, supplier, invoiceRef,
      allocationType, selectedDogId, selectedLitterId, paymentAccountId,
      paymentAccountName, customAccount, isRecurring, interval, recurringEnd,
      notes, isPayable, payableDueDate, creditorName, employeeId,
      receiptUrl: !editingId
        ? receiptPath
        : receiptIntent === 'remove'
          ? null
          : receiptIntent === 'replace'
            ? receiptPath ?? originalReceiptPath
            : originalReceiptPath,
    });

  const validate = () =>
    validateExpenseForm({
      categoryId, description, amount: priceExclVat, allocationType,
      selectedDogId, selectedLitterId, editingId, receiptIntent, receiptPath,
      originalReceiptPath,
    });

  const resetAfterSave = () => {
    setDescription('');
    setPriceExclVat('');
    setVatAmountText('');
    setVatTouched(false);
    setInvoiceRef('');
    setNotes('');
    setReceiptPath(null);
    setReceiptName(null);
    setOriginalReceiptPath(null);
    setReceiptIntent('keep');
    setJustSaved(false);
    if (successClearRef.current) clearTimeout(successClearRef.current);
    successClearRef.current = setTimeout(() => setSuccessMsg(null), 4000);
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
      const confirmation = expenseSavedConfirmation({
        amount: expenseGross({ amount: payload.amount, vat_amount: payload.vat_amount }),
        supplier: supplier || payload.supplier_name,
        date: expenseDate,
      });
      if (editingId) {
        await updateExpense({ id: editingId, ...payload });
        setSuccessMsg(confirmation);
        setJustSaved(true);
        return 'saved' as const;
      }
      await createExpense(payload);
      setSuccessMsg(confirmation);
      if (andReset) {
        resetAfterSave();
        return 'reset' as const;
      }
      setJustSaved(true);
      return 'saved' as const;
    } catch {
      setError(EXPENSE_SAVE_FAILED);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    editingId,
    loggedLabel,
    lockedDog,
    lockedLitter,
    lockLabel,
    categoryId,
    setCategoryId,
    employeeId,
    setEmployeeId,
    description,
    setDescription,
    priceExclVat,
    setPriceExclVat: setAmountAndMaybeVat,
    vatAmountText,
    setVatAmountText: setVatTyped,
    vatHint,
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
    receiptIntent,
    setReceiptIntent,
    setReceiptPath,
    setReceiptName,
    originalReceiptPath,
    loadingExpense,
    saving,
    error,
    successMsg,
    justSaved,
    addAnother: resetAfterSave,
    save,
  };
}
