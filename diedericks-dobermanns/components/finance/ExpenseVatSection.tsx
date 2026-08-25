import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';

interface Props {
  amount: string;
  onAmountChange: (v: string) => void;
  vatAmount: string;
  onVatChange: (v: string) => void;
  vatHint: boolean;
  totalAmount: number;
}

export function ExpenseVatSection({
  amount,
  onAmountChange,
  vatAmount,
  onVatChange,
  vatHint,
  totalAmount,
}: Props) {
  return (
    <View className="mb-4 rounded-xl border border-gold/25 bg-surface p-4">
      <Typography variant="label" className="mb-3 text-gold">
        Amount
      </Typography>
      <Input
        value={amount}
        onChangeText={onAmountChange}
        placeholder="Amount"
        keyboardType="decimal-pad"
        className="mb-3"
      />
      <Input
        value={vatAmount}
        onChangeText={onVatChange}
        placeholder="VAT"
        keyboardType="decimal-pad"
        className="mb-2"
      />
      {vatHint ? (
        <Typography variant="caption" className="mb-2 text-subtle">
          Doesn&apos;t look like 15% of the amount — left as you typed it.
        </Typography>
      ) : null}
      <View className="flex-row justify-between border-t border-gold/20 pt-2">
        <Typography variant="subtitle">Total</Typography>
        <Typography variant="label" className="text-gold">
          {formatAmount(totalAmount)}
        </Typography>
      </View>
    </View>
  );
}
