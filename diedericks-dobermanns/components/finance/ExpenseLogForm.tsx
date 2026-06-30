import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';

import { ExpenseAllocationSection } from '@/components/finance/ExpenseAllocationSection';
import { ExpensePaymentSection } from '@/components/finance/ExpensePaymentSection';
import { ExpenseVatSection } from '@/components/finance/ExpenseVatSection';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useExpenseForm } from '@/hooks/useExpenseForm';
import { useExpenseCategories } from '@/hooks/useExpenses';
import { pickAndUploadReceipt } from '@/lib/finance/receiptUpload';
import { useAuthStore } from '@/stores/authStore';

const INTERVALS = ['monthly', 'quarterly', 'annual'] as const;

export function ExpenseLogForm() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { categories } = useExpenseCategories();
  const form = useExpenseForm();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handlePickReceipt = async () => {
    if (!userId) return;
    setUploadingReceipt(true);
    try {
      const result = await pickAndUploadReceipt(userId);
      if (result) {
        form.setReceiptPath(result.path);
        form.setReceiptName(result.fileName);
      }
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSave = async (andReset: boolean) => {
    const result = await form.save(andReset);
    if (result === 'back') router.back();
  };

  if (form.loadingExpense) {
    return <ActivityIndicator color={Colors.gold} className="mt-8" />;
  }

  return (
    <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
      {form.successMsg ? (
        <View className="mb-3 rounded-xl border border-success/40 bg-success/10 px-4 py-2">
          <Typography variant="label" className="text-success">
            {form.successMsg}
          </Typography>
        </View>
      ) : null}

      <Typography variant="label" className="mb-2">
        Category
      </Typography>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => form.setCategoryId(c.id)}
            className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${
              form.categoryId === c.id ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: c.colour }} />
            <Typography variant="caption">{c.name}</Typography>
          </Pressable>
        ))}
      </View>

      <Input value={form.description} onChangeText={form.setDescription} placeholder="Description" className="mb-3" />

      <ExpenseVatSection
        priceExclVat={form.priceExclVat}
        onPriceChange={form.setPriceExclVat}
        vatApplicable={form.vatApplicable}
        onVatChange={form.setVatApplicable}
        vatAmount={form.vatAmount}
        totalAmount={form.totalAmount}
      />

      <DateField label="Expense date" value={form.expenseDate} onChange={form.setExpenseDate} />
      <Input value={form.supplier} onChangeText={form.setSupplier} placeholder="Supplier (optional)" className="mb-3" />

      <ExpenseAllocationSection
        allocationType={form.allocationType}
        onAllocationTypeChange={form.setAllocationType}
        selectedDogId={form.selectedDogId}
        selectedDogName={form.selectedDogName}
        onDogSelect={(id, name) => {
          form.setSelectedDogId(id);
          form.setSelectedDogName(name);
        }}
        selectedLitterId={form.selectedLitterId}
        selectedLitterName={form.selectedLitterName}
        onLitterSelect={(id, name) => {
          form.setSelectedLitterId(id);
          form.setSelectedLitterName(name);
        }}
        locked={Boolean(form.lockedDog || form.lockedLitter)}
        lockLabel={form.lockLabel}
      />

      <Input
        value={form.invoiceRef}
        onChangeText={form.setInvoiceRef}
        placeholder="Invoice reference (optional)"
        className="mb-3"
      />

      <ExpensePaymentSection
        paymentAccountId={form.paymentAccountId}
        paymentAccountName={form.paymentAccountName}
        customAccount={form.customAccount}
        onSelectAccount={(id, name) => {
          form.setPaymentAccountId(id);
          form.setPaymentAccountName(name);
        }}
        onCustomAccountChange={form.setCustomAccount}
      />

      <View className="mb-4 flex-row items-center justify-between">
        <Typography variant="body">Accounts payable (creditor)</Typography>
        <Switch value={form.isPayable} onValueChange={form.setIsPayable} />
      </View>
      {form.isPayable ? (
        <>
          <Input
            value={form.creditorName}
            onChangeText={form.setCreditorName}
            placeholder="Creditor name"
            className="mb-3"
          />
          <DateField
            label="Payable due date"
            value={form.payableDueDate}
            onChange={form.setPayableDueDate}
            optional
          />
        </>
      ) : null}

      <View className="mb-4 flex-row items-center justify-between">
        <Typography variant="body">Recurring expense</Typography>
        <Switch value={form.isRecurring} onValueChange={form.setIsRecurring} />
      </View>
      {form.isRecurring ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {INTERVALS.map((i) => (
              <Pressable
                key={i}
                onPress={() => form.setInterval(i)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  form.interval === i ? 'border-gold bg-gold/15' : 'border-gold/30'
                }`}
              >
                <Typography variant="caption">{i}</Typography>
              </Pressable>
            ))}
          </ScrollView>
          <DateField
            label="Recurrence end date"
            value={form.recurringEnd}
            onChange={form.setRecurringEnd}
            optional
          />
        </>
      ) : null}

      <Typography variant="label" className="mb-2">
        Receipt
      </Typography>
      <Pressable
        onPress={() => void handlePickReceipt()}
        className="mb-4 flex-row items-center gap-2 rounded-xl border border-gold/30 bg-surface px-4 py-3"
      >
        {uploadingReceipt ? (
          <ActivityIndicator size="small" color={Colors.gold} />
        ) : (
          <Ionicons name="document-attach-outline" size={20} color={Colors.gold} />
        )}
        <Typography variant="body">{form.receiptName ?? 'Pick PDF or image receipt'}</Typography>
      </Pressable>

      <Input value={form.notes} onChangeText={form.setNotes} placeholder="Notes" className="mb-4" />

      {form.error ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {form.error}
        </Typography>
      ) : null}

      {form.editingId ? (
        <Button label="Update expense" onPress={() => void handleSave(false)} loading={form.saving} fullWidth />
      ) : (
        <View className="mb-8 flex-row gap-3">
          <Button
            label="Save & Add Another"
            variant="outline"
            onPress={() => void handleSave(true)}
            loading={form.saving}
            className="flex-1"
          />
          <Button
            label="Save Expense"
            onPress={() => void handleSave(false)}
            loading={form.saving}
            className="flex-1"
          />
        </View>
      )}
    </ScrollView>
  );
}
