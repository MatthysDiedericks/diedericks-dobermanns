import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { DebtorGroup } from '@/hooks/useCreditors';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

interface Props {
  debtors: DebtorGroup[];
  totalOutstanding: number;
  overdueCount: number;
}

export function DebtorsTab({ debtors, totalOutstanding, overdueCount }: Props) {
  const router = useRouter();

  return (
    <View>
      <Card className="mb-4 border-gold/30">
        <Typography variant="caption" className="text-subtle">
          Total outstanding
        </Typography>
        <Typography variant="display" className="text-gold">
          {formatAmount(totalOutstanding)}
        </Typography>
        {overdueCount > 0 ? (
          <Typography variant="caption" className="mt-1 text-danger">
            {overdueCount} overdue invoice{overdueCount === 1 ? '' : 's'}
          </Typography>
        ) : null}
      </Card>

      {debtors.length === 0 ? (
        <Typography variant="body" className="text-subtle">
          No outstanding invoices.
        </Typography>
      ) : (
        debtors.map((group) => (
          <View key={group.clientId} className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Typography variant="subtitle">{group.clientName}</Typography>
              <View className="items-end">
                <Typography variant="label" className="text-gold">
                  {formatAmount(group.totalOutstanding)}
                </Typography>
                {group.maxDaysOverdue > 0 ? (
                  <Typography variant="caption" className="text-danger">
                    {group.maxDaysOverdue} days overdue
                  </Typography>
                ) : (
                  <Typography variant="caption" className="text-subtle">
                    Current
                  </Typography>
                )}
              </View>
            </View>
            {group.invoices.map((inv) => (
              <Card
                key={inv.id}
                className={`mb-2 ${inv.isOverdue ? 'border-l-4 border-l-danger' : ''}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Typography variant="body">{inv.invoice_number}</Typography>
                    <Typography variant="caption">
                      Due {formatDate(inv.due_date)} · {formatAmount(inv.amount_outstanding)}
                    </Typography>
                    {inv.isOverdue ? (
                      <Typography variant="caption" className="text-danger">
                        {inv.daysOverdue} days overdue
                      </Typography>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/(admin)/finance/invoices/[id]',
                        params: { id: inv.id },
                      })
                    }
                    className="rounded-full border border-gold/40 px-3 py-1.5"
                  >
                    <Typography variant="caption" className="text-gold">
                      View
                    </Typography>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
    </View>
  );
}
