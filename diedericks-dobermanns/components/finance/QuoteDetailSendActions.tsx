import { View } from 'react-native';

import { QuoteSendChecklist } from '@/components/finance/QuoteSendChecklist';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  outstandingForSavedQuote,
  sendBlockedReason,
  type QuoteOutstandingItem,
} from '@/lib/finance/quoteOutstanding';
import type { Quote } from '@/types/app.types';

export function quoteSendLock(quote: Quote): {
  outstanding: QuoteOutstandingItem[];
  sendWhy: string | null;
  sendLocked: boolean;
} {
  const outstanding = outstandingForSavedQuote(quote);
  const sendWhy =
    sendBlockedReason(outstanding) ??
    (!quote.total || Number(quote.total) <= 0
      ? 'Send is blocked until this quote has a price.'
      : null);
  return { outstanding, sendWhy, sendLocked: Boolean(sendWhy) };
}

export function QuoteDetailSendActions({
  quote,
  previouslySent,
  phone,
  busy,
  onSend,
  onSelectOutstanding,
}: {
  quote: Quote;
  previouslySent: boolean;
  phone: string | null;
  busy: boolean;
  onSend: (channel: 'whatsapp' | 'email') => void;
  onSelectOutstanding: (item: QuoteOutstandingItem) => void;
}) {
  const { outstanding, sendWhy, sendLocked } = quoteSendLock(quote);
  const phoneWhy = !phone ? 'No phone number on file.' : null;

  return (
    <View className="gap-2">
      <QuoteSendChecklist items={outstanding} onSelect={onSelectOutstanding} />
      <View className="flex-row flex-wrap gap-2">
        <Button
          label={previouslySent ? 'Resend via WhatsApp' : 'Send via WhatsApp'}
          variant="outline"
          onPress={() => onSend('whatsapp')}
          loading={busy}
          disabled={sendLocked || !phone}
        />
        <Button
          label={previouslySent ? 'Resend via Email' : 'Send via Email'}
          variant="outline"
          onPress={() => onSend('email')}
          loading={busy}
          disabled={sendLocked}
        />
      </View>
      {sendWhy ? (
        <Typography variant="caption" className="text-gold">
          {sendWhy}
        </Typography>
      ) : null}
      {!sendLocked && phoneWhy ? (
        <Typography variant="caption" className="text-gold">
          {phoneWhy}
        </Typography>
      ) : null}
    </View>
  );
}
