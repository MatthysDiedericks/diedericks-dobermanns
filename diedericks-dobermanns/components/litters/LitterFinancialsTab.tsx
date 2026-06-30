import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { LitterExpensesSection } from '@/components/litters/LitterExpensesSection';
import { formatZar, useLitterFinancials } from '@/hooks/useLitterFinancials';

export function TransactionList({
  transactions,
  onDelete,
}: {
  transactions: ReturnType<typeof useLitterFinancials>['transactions'];
  onDelete: (id: string) => void;
}) {
  if (!transactions.length) return null;
  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        TRANSACTIONS
      </Typography>
      {transactions.map((tx) => (
        <View
          key={tx.id}
          className={`mb-2 rounded-xl border p-3 ${tx.transaction_type === 'income' ? 'border-success/40' : 'border-danger/40'}`}
        >
          <View className="flex-row justify-between">
            <Typography variant="subtitle">{tx.category ?? tx.transaction_type}</Typography>
            <Typography variant="body">{formatZar(tx.total_cents)}</Typography>
          </View>
          <Typography variant="caption" className="text-subtle">
            {tx.transaction_date}
          </Typography>
          <Button label="Delete" size="sm" variant="ghost" onPress={() => onDelete(tx.id)} />
        </View>
      ))}
    </View>
  );
}

export function TransactionForm({ litterId }: { litterId: string }) {
  const { saveTransaction } = useLitterFinancials(litterId);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      Alert.alert('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await saveTransaction({
        litter_id: litterId,
        transaction_date: new Date().toISOString().slice(0, 10),
        transaction_type: type,
        category: category || null,
        currency: 'ZAR',
        amounts_tax_mode: 'exclusive',
        invoice_number: null,
        notes: null,
        attachment_path: null,
        subtotal_cents: cents,
        tax_cents: 0,
        total_cents: cents,
        items: [{ description: description || category || 'Line item', amount_cents: cents, tax_cents: 0 }],
      });
      setAmount('');
      setDescription('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Typography variant="label" className="mb-2 text-gold">
        ADD TRANSACTION
      </Typography>
      <View className="mb-3 flex-row gap-2">
        <Button
          label="Expense"
          size="sm"
          variant={type === 'expense' ? 'solid' : 'outline'}
          onPress={() => setType('expense')}
        />
        <Button
          label="Income"
          size="sm"
          variant={type === 'income' ? 'solid' : 'outline'}
          onPress={() => setType('income')}
        />
      </View>
      <Input label="Category" value={category} onChangeText={setCategory} />
      <Input label="Description" value={description} onChangeText={setDescription} />
      <Input label="Amount (ZAR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Button label="Save Transaction" onPress={() => void handleSave()} loading={saving} fullWidth />
    </View>
  );
}

export function LitterFinancialsTab({
  litterId,
  litterName,
}: {
  litterId: string;
  litterName: string;
}) {
  const { transactions, deleteTransaction } = useLitterFinancials(litterId);
  return (
    <View className="pb-8">
      <LitterExpensesSection litterId={litterId} litterName={litterName} />
      <TransactionList
        transactions={transactions}
        onDelete={(id) => void deleteTransaction(id)}
      />
      <TransactionForm litterId={litterId} />
    </View>
  );
}
