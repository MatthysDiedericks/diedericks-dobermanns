import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { DebtorGroup } from '@/hooks/useCreditors';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

type Band = 'overdue' | 'due' | 'not_yet_due';

function bandOf(dueDate: string | null, today: string): Band {
  if (!dueDate) return 'not_yet_due';
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'due';
  return 'not_yet_due';
}

const BANDS: { id: Band; title: string; hint: string }[] = [
  { id: 'overdue', title: 'Overdue', hint: 'The due date has passed.' },
  { id: 'due', title: 'Due', hint: 'Due today.' },
  { id: 'not_yet_due', title: 'Not yet due', hint: 'Often the go-home balance.' },
];

interface Props {
  debtors: DebtorGroup[];
  totalOutstanding: number;
  depositsHeld: number;
  awaitingReview: number;
  overdueCount: number;
}

export function DebtorsTab({
  debtors,
  totalOutstanding,
  depositsHeld,
  awaitingReview,
  overdueCount,
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const invoices = debtors.flatMap((g) =>
    g.invoices.map((inv) => ({
      ...inv,
      clientName: g.clientName,
      band: bandOf(inv.due_date, today),
    })),
  );

  return (
    <View>
      <View className="mb-4 gap-3">
        <Card>
          <Typography variant="caption" className="text-subtle">
            Total outstanding
          </Typography>
          <Typography variant="display" className="text-gold">
            {formatAmount(totalOutstanding)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            Revenue not yet collected.
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </Typography>
        </Card>
        <Card>
          <Typography variant="caption" className="text-subtle">
            Deposits held
          </Typography>
          <Typography variant="display" className="text-gold">
            {formatAmount(depositsHeld)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            How much of the cash in the bank already has a puppy attached to it.
          </Typography>
        </Card>
        <Pressable onPress={() => router.push('/(admin)/finance/proofs' as never)}>
          <Card>
            <Typography variant="caption" className="text-subtle">
              Awaiting review
            </Typography>
            <Typography variant="display" className="text-gold">
              {awaitingReview}
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              Proofs of payment to verify. Tap to review.
            </Typography>
          </Card>
        </Pressable>
      </View>

      {invoices.length === 0 ? (
        <Typography variant="body" className="text-subtle">
          No outstanding invoices.
        </Typography>
      ) : (
        BANDS.map((band) => {
          const rows = invoices.filter((i) => i.band === band.id);
          return (
            <View key={band.id} className="mb-4">
              <Typography variant="subtitle">{band.title}</Typography>
              <Typography variant="caption" className="mb-2 text-subtle">
                {band.hint}
              </Typography>
              {rows.length === 0 ? (
                <Typography variant="caption" className="text-subtle">
                  None.
                </Typography>
              ) : (
                rows.map((inv) => (
                  <Card
                    key={inv.id}
                    className={`mb-2 ${inv.band === 'overdue' ? 'border-l-4 border-l-danger' : ''}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Typography variant="body">{inv.invoice_number}</Typography>
                        <Typography variant="caption">{inv.clientName}</Typography>
                        <Typography variant="caption">
                          Paid {formatAmount(inv.amount_paid)} · due {formatDate(inv.due_date)}
                        </Typography>
                      </View>
                      <View className="items-end">
                        <Typography variant="label" className="text-gold">
                          {formatAmount(inv.amount_outstanding)}
                        </Typography>
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/(admin)/finance/invoices/[id]',
                              params: { id: inv.id },
                            })
                          }
                          className="mt-1 rounded-full border border-gold/40 px-3 py-1.5"
                        >
                          <Typography variant="caption" className="text-gold">
                            View
                          </Typography>
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
