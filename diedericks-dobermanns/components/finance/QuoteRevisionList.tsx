import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { QuoteRevisionRow } from '@/lib/finance/quoteRevisions';
import { formatPrice } from '@/lib/format';

export function QuoteRevisionList({ revisions }: { revisions: QuoteRevisionRow[] }) {
  if (!revisions.length) return null;
  return (
    <Card>
      <Typography variant="label" className="mb-2">
        Revision history
      </Typography>
      {revisions.map((r) => (
        <View key={r.id} className="mb-3 border-b border-gold/10 pb-3">
          <Typography variant="body">
            Revision {r.revision}
            {r.sent_at ? ` · ${new Date(r.sent_at).toLocaleDateString()}` : ''}
          </Typography>
          <Typography variant="caption" className="text-gold">
            {formatPrice(r.total)}
          </Typography>
          {r.change_note ? (
            <Typography variant="caption" className="mt-1 text-silver">
              {r.change_note}
            </Typography>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
