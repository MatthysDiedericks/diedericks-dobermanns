import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { CreditorRow } from '@/hooks/useCreditors';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

interface Props {
  creditors: CreditorRow[];
  totalPayable: number;
  overdueCount: number;
  onMarkPaid: (id: string) => Promise<void>;
}

export function CreditorsTab({ creditors, totalPayable, overdueCount, onMarkPaid }: Props) {
  const router = useRouter();

  const handleMarkPaid = (row: CreditorRow) => {
    const name = row.creditor_name ?? row.supplier_name ?? row.description;
    Alert.alert('Mark as paid?', `${name} — ${formatAmount(row.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: () => {
          void onMarkPaid(row.id).catch((e) =>
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not mark paid'),
          );
        },
      },
    ]);
  };

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Card className="flex-1 border-gold/30">
          <Typography variant="caption" className="text-subtle">
            Total payable
          </Typography>
          <Typography variant="display" className="text-gold">
            {formatAmount(totalPayable)}
          </Typography>
          {overdueCount > 0 ? (
            <Typography variant="caption" className="mt-1 text-danger">
              {overdueCount} overdue
            </Typography>
          ) : null}
        </Card>
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(admin)/finance/expenses/new',
            params: { isPayable: 'true' },
          })
        }
        className="mb-4 self-start rounded-full border border-gold bg-gold/15 px-4 py-2"
      >
        <Typography variant="label" className="text-gold">
          Log payable
        </Typography>
      </Pressable>

      {creditors.length === 0 ? (
        <Typography variant="body" className="text-subtle">
          No unpaid payables.
        </Typography>
      ) : (
        creditors.map((row) => {
          const name = row.creditor_name ?? row.supplier_name ?? row.description;
          return (
            <Card
              key={row.id}
              className={`mb-3 ${row.isOverdue ? 'border-l-4 border-l-danger' : ''}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Typography variant="subtitle">{name}</Typography>
                  <Typography variant="caption">
                    {row.categoryName} · Due {formatDate(row.payable_due_date)}
                  </Typography>
                  <Typography variant="label" className="mt-1 text-gold">
                    {formatAmount(row.amount)}
                  </Typography>
                  {row.isOverdue ? (
                    <Typography variant="caption" className="text-danger">
                      OVERDUE
                    </Typography>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleMarkPaid(row)}
                  className="rounded-full border border-gold/40 px-3 py-1.5"
                >
                  <Typography variant="caption" className="text-gold">
                    Mark paid
                  </Typography>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}
