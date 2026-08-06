import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { LinkedQuote } from '@/hooks/useLinkedQuote';

interface ApprovalQuoteStatusProps {
  quotePending: boolean;
  quoteFailed: boolean;
  linkedQuote: LinkedQuote | null;
  onViewQuote: (quote: LinkedQuote) => void;
  onBack: () => void;
}

/**
 * Confirmation shown right after approving an application. The draft quote is
 * created in the background (see `reviewApplication()`), so this reflects
 * whichever of pending/created/failed state `useLinkedQuote`'s poll lands on —
 * a failed auto-quote never implies the approval itself failed.
 */
export function ApprovalQuoteStatus({
  quotePending,
  quoteFailed,
  linkedQuote,
  onViewQuote,
  onBack,
}: ApprovalQuoteStatusProps) {
  return (
    <Card className="mb-4 border border-success/40 bg-success/10">
      <Typography variant="subtitle" className="text-success">
        Application approved
      </Typography>
      {quotePending ? (
        <View className="mt-2 flex-row items-center gap-2">
          <ActivityIndicator size="small" color={Colors.gold} />
          <Typography variant="bodyMuted">Creating draft quote…</Typography>
        </View>
      ) : linkedQuote ? (
        <>
          <Typography variant="bodyMuted" className="mt-2">
            Draft quote created.
          </Typography>
          <Button
            label={`View Quote ${linkedQuote.quote_number ?? ''}`}
            variant="outline"
            onPress={() => onViewQuote(linkedQuote)}
            className="mt-3"
          />
        </>
      ) : quoteFailed ? (
        <Typography variant="caption" className="mt-2 text-silver">
          Quote could not be created automatically — create one manually.
        </Typography>
      ) : null}
      <Button label="Back to Applications" variant="ghost" onPress={onBack} className="mt-3" />
    </Card>
  );
}
