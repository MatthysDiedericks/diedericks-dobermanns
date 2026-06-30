import { Switch, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';

interface Props {
  priceExclVat: string;
  onPriceChange: (v: string) => void;
  vatApplicable: boolean;
  onVatChange: (v: boolean) => void;
  vatAmount: number;
  totalAmount: number;
}

export function ExpenseVatSection({
  priceExclVat,
  onPriceChange,
  vatApplicable,
  onVatChange,
  vatAmount,
  totalAmount,
}: Props) {
  return (
    <View className="mb-4 rounded-xl border border-gold/25 bg-surface p-4">
      <Typography variant="label" className="mb-3 text-gold">
        Amount
      </Typography>
      <Input
        value={priceExclVat}
        onChangeText={onPriceChange}
        placeholder="Price (excl VAT)"
        keyboardType="decimal-pad"
        className="mb-3"
      />
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="body">VAT (15%)</Typography>
        <Switch value={vatApplicable} onValueChange={onVatChange} />
      </View>
      {vatApplicable ? (
        <>
          <View className="mb-2 flex-row justify-between">
            <Typography variant="caption">VAT amount</Typography>
            <Typography variant="label">{formatAmount(vatAmount)}</Typography>
          </View>
          <View className="flex-row justify-between border-t border-gold/20 pt-2">
            <Typography variant="subtitle">Total</Typography>
            <Typography variant="label" className="text-gold">
              {formatAmount(totalAmount)}
            </Typography>
          </View>
        </>
      ) : (
        <View className="flex-row justify-between">
          <Typography variant="subtitle">Total</Typography>
          <Typography variant="label" className="text-gold">
            {formatAmount(totalAmount)}
          </Typography>
        </View>
      )}
    </View>
  );
}
