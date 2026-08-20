import { View } from 'react-native';

import { QuoteSaveIndicator, type QuoteSaveState } from '@/components/finance/QuoteSaveIndicator';
import { QuoteSendChecklist } from '@/components/finance/QuoteSendChecklist';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { QuoteOutstandingItem } from '@/lib/finance/quoteOutstanding';
import { formatPrice } from '@/lib/format';

export function AppQuoteSaveFooter({
  outstanding,
  onSelectOutstanding,
  formError,
  saveState,
  onRetry,
  total,
  statements,
  canSave,
  submitting,
  onSave,
}: {
  outstanding: QuoteOutstandingItem[];
  onSelectOutstanding: (item: QuoteOutstandingItem) => void;
  formError: string | null;
  saveState: QuoteSaveState;
  onRetry: () => void;
  total: number;
  statements: string[];
  canSave: boolean;
  submitting: boolean;
  onSave: () => void;
}) {
  return (
    <>
      {formError ? (
        <Typography variant="caption" className="text-red-400">
          {formError}
        </Typography>
      ) : null}
      <QuoteSendChecklist items={outstanding} onSelect={onSelectOutstanding} />
      <Card>
        <View className="flex-row justify-between">
          <Typography variant="bodyMuted">Total</Typography>
          <View className="items-end">
            <QuoteSaveIndicator state={saveState} onRetry={onRetry} />
            <Typography variant="subtitle" className="text-gold">
              {formatPrice(total)}
            </Typography>
          </View>
        </View>
        {statements.map((s) => (
          <Typography key={s} variant="caption" className="mt-2 text-ink-muted">
            {s}
          </Typography>
        ))}
      </Card>
      {canSave ? (
        <>
          <Button label="Save & Preview" onPress={onSave} loading={submitting} fullWidth />
          {outstanding.length ? (
            <Typography variant="caption" className="text-gold">
              You can save a draft. Send stays blocked until the items above are done.
            </Typography>
          ) : null}
        </>
      ) : null}
    </>
  );
}
