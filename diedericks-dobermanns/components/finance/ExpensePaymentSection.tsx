import { Pressable, ScrollView, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { usePaymentAccounts } from '@/hooks/useExpenses';

const OTHER_ID = '__other__';

interface Props {
  paymentAccountId: string | null;
  paymentAccountName: string;
  customAccount: string;
  onSelectAccount: (id: string | null, name: string) => void;
  onCustomAccountChange: (v: string) => void;
}

export function ExpensePaymentSection({
  paymentAccountId,
  paymentAccountName,
  customAccount,
  onSelectAccount,
  onCustomAccountChange,
}: Props) {
  const { accounts, loading } = usePaymentAccounts();
  const isOther = paymentAccountId === OTHER_ID;

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        Payment account
      </Typography>
      {loading ? (
        <Typography variant="caption" className="text-silver">
          Loading accounts…
        </Typography>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {accounts.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => onSelectAccount(a.id, a.name)}
              className={`mr-2 rounded-full border px-3 py-2 ${
                paymentAccountId === a.id ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{a.name}</Typography>
            </Pressable>
          ))}
          <Pressable
            onPress={() => onSelectAccount(OTHER_ID, customAccount)}
            className={`rounded-full border px-3 py-2 ${
              isOther ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">Other</Typography>
          </Pressable>
        </ScrollView>
      )}
      {isOther ? (
        <Input
          value={customAccount}
          onChangeText={(v) => {
            onCustomAccountChange(v);
            onSelectAccount(OTHER_ID, v);
          }}
          placeholder="Custom account name"
          className="mb-2"
        />
      ) : paymentAccountName ? (
        <Typography variant="caption" className="text-silver">
          {paymentAccountName}
        </Typography>
      ) : null}
    </View>
  );
}
