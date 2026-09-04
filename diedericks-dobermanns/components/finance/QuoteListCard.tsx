import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { QuoteResendNote } from '@/components/finance/QuoteResendNote';
import { quoteSendLock } from '@/components/finance/QuoteDetailSendActions';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { holdChipLabel, isQuoteOnHold, reminderProgressLabel } from '@/lib/finance/quoteLapse';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { quoteBuyerDisplay, quoteListNumber } from '@/lib/finance/quoteBuyerDisplay';
import { sendQuoteToRecipient } from '@/lib/finance/sendQuote';
import { formatAmount } from '@/lib/finance/formatters';
import { titleCase } from '@/lib/format';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import type { Quote, QuoteStatus } from '@/types/app.types';

const QUOTE_TONE: Record<QuoteStatus, BadgeTone> = {
  draft: 'muted',
  sent: 'gold',
  accepted: 'success',
  declined: 'danger',
  expired: 'danger',
  cancelled: 'danger',
};

function canEditQuote(quote: Quote): boolean {
  return !quote.converted_invoice_id && quote.status !== 'accepted';
}

function canSendQuote(quote: Quote): boolean {
  return quote.status === 'draft' || quote.status === 'sent';
}

export function QuoteListCard({
  quote,
  onChanged,
}: {
  quote: Quote;
  onChanged: () => void;
}) {
  const router = useRouter();
  const buyer = quoteBuyerDisplay(quote);
  const previouslySent = Boolean(quote.sent_at) || (quote.revision ?? 1) > 1;
  const [menuOpen, setMenuOpen] = useState(false);
  const [awaitingNote, setAwaitingNote] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [busy, setBusy] = useState(false);
  const sendLock = quoteSendLock(quote);

  const openDetail = () =>
    router.push({ pathname: '/(admin)/quotes/[id]', params: { id: quote.id } });

  const goEdit = () => {
    setMenuOpen(false);
    router.push({ pathname: '/(admin)/quotes/[id]/edit', params: { id: quote.id } });
  };

  const sendEmail = async (note: string | null) => {
    setBusy(true);
    try {
      const user = await getCachedUser();
      const result = await sendQuoteToRecipient(quote, {
        changeNote: note,
        actorId: user?.id ?? null,
      });
      setAwaitingNote(false);
      setChangeNote('');
      Alert.alert('Quote sent', `Emailed to ${result.sentTo}.`);
      onChanged();
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startSend = () => {
    setMenuOpen(false);
    if (sendLock.sendLocked) {
      Alert.alert('Complete the quote first', sendLock.sendWhy ?? '');
      return;
    }
    Alert.alert(
      previouslySent ? 'Resend this quote?' : 'Email this quote?',
      'This emails a real client. Confirm before sending.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: previouslySent ? 'Continue' : 'Send',
          onPress: () => {
            if (previouslySent) {
              setAwaitingNote(true);
              return;
            }
            void sendEmail(null);
          },
        },
      ],
    );
  };

  return (
    <Card>
      <View className="flex-row items-center">
        <Pressable onPress={openDetail} className="flex-1">
          <View className="flex-row items-center gap-2">
            <Typography variant="subtitle" numberOfLines={1} className="flex-1">
              {buyer.name}
            </Typography>
            <Badge
              label={quote.status === 'expired' ? 'Lapsed' : titleCase(quote.status)}
              tone={QUOTE_TONE[quote.status]}
            />
          </View>
          {buyer.showNoPortalMarker ? (
            <Typography variant="caption" className="mt-0.5 text-gold">
              no account yet
            </Typography>
          ) : null}
          {isQuoteOnHold(quote.lapse_hold_until) && quote.lapse_hold_until ? (
            <Typography variant="caption" className="mt-0.5 text-amber-300">
              {holdChipLabel(quote.lapse_hold_until)}
            </Typography>
          ) : null}
          <Typography variant="caption" className="mt-0.5">
            {quoteListNumber(quote.quote_number, quote.revision)} · {quote.items?.length ?? 0}{' '}
            item{(quote.items?.length ?? 0) === 1 ? '' : 's'}
            {quote.status === 'sent' && reminderProgressLabel(quote)
              ? ` · ${reminderProgressLabel(quote)}`
              : ''}
          </Typography>
          <Typography variant="label" className="mt-2">
            {formatAmount(quote.total)}
          </Typography>
          <QuoteCardBalance outstanding={quote.invoiceOutstanding ?? null} />
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          hitSlop={8}
          accessibilityLabel="Quote actions"
          className="p-2"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.gold} />
        </Pressable>
      </View>

      {menuOpen ? (
        <View className="mt-2 border-t border-gold/20 pt-2">
          <Pressable onPress={openDetail} className="py-2">
            <Typography variant="label">Open</Typography>
          </Pressable>
          {canEditQuote(quote) ? (
            <Pressable onPress={goEdit} className="py-2">
              <Typography variant="label">Edit</Typography>
            </Pressable>
          ) : null}
          {canSendQuote(quote) ? (
            <Pressable onPress={startSend} className="py-2">
              <Typography variant="label">{previouslySent ? 'Resend' : 'Send'}</Typography>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {awaitingNote ? (
        <View className="mt-3">
          <QuoteResendNote
            changeNote={changeNote}
            onChangeNote={setChangeNote}
            busy={busy}
            phoneDisabled
            emailDisabled={sendLock.sendLocked}
            blockedReason={sendLock.sendWhy}
            onResendWhatsApp={() => undefined}
            onResendEmail={() => {
              if (!changeNote.trim()) {
                Alert.alert('Change note required', 'Explain what changed before resending.');
                return;
              }
              void sendEmail(changeNote.trim());
            }}
            onCancel={() => setAwaitingNote(false)}
          />
        </View>
      ) : null}
    </Card>
  );
}

function QuoteCardBalance({ outstanding }: { outstanding: number | null }) {
  if (outstanding == null) {
    return (
      <Typography variant="caption" className="mt-0.5 text-silver">
        Balance due —
      </Typography>
    );
  }
  if (outstanding <= 0) {
    return (
      <Typography variant="caption" className="mt-0.5 text-success">
        Paid
      </Typography>
    );
  }
  return (
    <Typography variant="caption" className="mt-0.5 text-gold">
      Balance due {formatAmount(outstanding)}
    </Typography>
  );
}
