import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { BankBlock } from '@/lib/finance/bankDetails';

export function PaymentBankingCard({
  blocks,
  paymentReference,
}: {
  blocks: BankBlock[];
  paymentReference: string;
}) {
  const visible = blocks.filter((b) => b.rows.length > 0);
  if (visible.length === 0) return null;

  return (
    <Card className="gap-4 p-4">
      <Typography variant="label" className="text-gold">
        Payment details
      </Typography>
      {visible.map((block) => (
        <View key={block.kind} className="gap-2">
          <Typography variant="subtitle" className="text-gold">
            {block.heading}
          </Typography>
          {block.rows.map((row) => (
            <View key={`${block.kind}-${row.label}`}>
              <Typography variant="caption">{row.label}</Typography>
              <Typography variant="body">{row.value}</Typography>
            </View>
          ))}
          {block.note ? (
            <Typography variant="caption" className="text-subtle">
              {block.note}
            </Typography>
          ) : null}
        </View>
      ))}
      <Typography variant="caption">
        Use {paymentReference} as your payment reference.
      </Typography>
    </Card>
  );
}
