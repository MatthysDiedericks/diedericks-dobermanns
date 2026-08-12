import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { QuoteReopenCard } from '@/components/finance/QuoteReopenCard';
import { QuoteResendNote } from '@/components/finance/QuoteResendNote';
import { QuoteRevisionList } from '@/components/finance/QuoteRevisionList';
import { LineItems } from '@/components/sales/LineItems';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useQuoteDetail } from '@/hooks/useQuotes';
import { assertQuoteEditable, summariseQuoteChanges } from '@/lib/finance/quoteEditGuards';
import {
  buildQuoteMessage,
  convertQuoteToInvoice,
  logQuoteEmailNotification,
  quoteEmail,
  quotePhone,
  reopenQuote,
  updateQuoteStatus,
} from '@/lib/finance/quoteQueries';
import { fetchQuoteRevisions, recordQuoteSendRevision } from '@/lib/finance/quoteRevisions';
import type { QuoteRevisionRow } from '@/lib/finance/quoteRevisions';
import { formatPrice, titleCase } from '@/lib/format';
import { QUOTE_TONE, quoteClientLabel } from '@/app/(admin)/quotes/index';
import { requireSupabase } from '@/lib/supabase';
import type { QuoteStatus } from '@/types/app.types';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quote, loading, refresh } = useQuoteDetail(id ?? '');
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState<QuoteRevisionRow[]>([]);
  const [changeNote, setChangeNote] = useState('');
  const [awaitingNote, setAwaitingNote] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchQuoteRevisions(id)
      .then(setRevisions)
      .catch(() => setRevisions([]));
  }, [id, quote?.updated_at, quote?.revision]);

  if (!loading && !quote) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Quote not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  const editGate = quote
    ? assertQuoteEditable({
        status: quote.status,
        converted_invoice_id: quote.converted_invoice_id,
      })
    : null;
  const previouslySent = Boolean(quote?.sent_at) || (quote?.revision ?? 1) > 1;
  const canConvert =
    !quote?.converted_invoice_id && (quote?.status === 'sent' || quote?.status === 'accepted');
  const canSend = quote?.status === 'draft' || quote?.status === 'sent';
  const phone = quote ? quotePhone(quote) : null;
  const email = quote ? quoteEmail(quote) : null;

  async function setStatus(status: QuoteStatus) {
    if (!id) return;
    setBusy(true);
    try {
      await updateQuoteStatus(id, status);
      await refresh();
    } catch (e) {
      Alert.alert('Could not update status', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function prepareChangeNote(): Promise<string> {
    if (!quote) return '';
    if (changeNote.trim()) return changeNote.trim();
    const prior = revisions[0]?.snapshot?.items ?? [];
    const current = (quote.items ?? []).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
    }));
    return summariseQuoteChanges(
      prior.length
        ? prior.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            line_total: it.line_total,
          }))
        : current,
      current,
      revisions[0]?.sent_at ?? quote.sent_at ?? null,
    );
  }

  async function finalizeSend(channel: 'whatsapp' | 'email') {
    if (!quote) return;
    const note = previouslySent ? await prepareChangeNote() : null;
    if (previouslySent && !note) {
      Alert.alert('Change note required', 'Explain what changed before resending.');
      return;
    }
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (channel === 'whatsapp') {
        if (!phone) throw new Error('No phone number on file.');
        const text = encodeURIComponent(buildQuoteMessage(quote, note));
        await Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`);
      } else if (quote.client_id) {
        await logQuoteEmailNotification(quote);
      } else {
        if (!email) throw new Error('No email on file.');
        const subject = encodeURIComponent(
          `Your Quote${quote.quote_number ? ` ${quote.quote_number}` : ''}`,
        );
        await Linking.openURL(
          `mailto:${email}?subject=${subject}&body=${encodeURIComponent(buildQuoteMessage(quote, note))}`,
        );
      }

      await recordQuoteSendRevision({
        quoteId: quote.id,
        sentTo: channel === 'whatsapp' ? phone : email,
        changeNote: note,
        actorId: user?.id ?? null,
      });
      setAwaitingNote(false);
      setChangeNote('');
      await refresh();
      setRevisions(await fetchQuoteRevisions(quote.id));
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function requestSend(channel: 'whatsapp' | 'email') {
    if (previouslySent && !awaitingNote) {
      void prepareChangeNote().then((n) => {
        setChangeNote(n);
        setAwaitingNote(true);
      });
      return;
    }
    void finalizeSend(channel);
  }

  function goEdit() {
    if (!quote) return;
    const open = () =>
      router.push({ pathname: '/(admin)/quotes/new', params: { id: quote.id } });
    if (quote.status === 'sent') {
      Alert.alert(
        'Editing a sent quote',
        'Saving updates the next revision draft. The revision number only increases when you resend.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: open },
        ],
      );
      return;
    }
    open();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Quote" title={quote?.quote_number ?? 'Draft Quote'} />
      {quote ? (
        <View className="gap-4 px-6 pb-10">
          <Card>
            <View className="flex-row items-center justify-between">
              <Typography variant="subtitle">{quoteClientLabel(quote)}</Typography>
              <Badge label={titleCase(quote.status)} tone={QUOTE_TONE[quote.status]} />
            </View>
            {(quote.revision ?? 1) > 1 ? (
              <Typography variant="caption" className="mt-1 text-gold">
                Revision {quote.revision}
              </Typography>
            ) : null}
            {quote.sent_at ? (
              <Typography variant="caption" className="mt-1">
                Sent {new Date(quote.sent_at).toLocaleString()}
              </Typography>
            ) : null}
          </Card>

          <LineItems
            items={quote.items ?? []}
            subtotal={quote.subtotal}
            discount={quote.discount}
            total={quote.total}
          />
          <QuoteRevisionList revisions={revisions} />

          {awaitingNote ? (
            <QuoteResendNote
              changeNote={changeNote}
              onChangeNote={setChangeNote}
              busy={busy}
              phoneDisabled={!phone}
              emailDisabled={!quote.client_id && !email}
              onResendWhatsApp={() => void finalizeSend('whatsapp')}
              onResendEmail={() => void finalizeSend('email')}
              onCancel={() => setAwaitingNote(false)}
            />
          ) : null}

          {showReopen ? (
            <QuoteReopenCard
              reason={reopenReason}
              onChangeReason={setReopenReason}
              busy={busy}
              onCancel={() => setShowReopen(false)}
              onConfirm={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await reopenQuote(quote.id, reopenReason);
                    setShowReopen(false);
                    await refresh();
                  } catch (e) {
                    Alert.alert(
                      'Could not reopen',
                      e instanceof Error ? e.message : 'Please try again.',
                    );
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            />
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            <Button label="Mark Sent" variant="outline" onPress={() => setStatus('sent')} loading={busy} />
            <Button label="Accepted" variant="outline" onPress={() => setStatus('accepted')} loading={busy} />
            <Button label="Declined" variant="danger" onPress={() => setStatus('declined')} loading={busy} />
          </View>

          {canSend && !awaitingNote ? (
            <View className="flex-row flex-wrap gap-2">
              <Button
                label={previouslySent ? 'Resend via WhatsApp' : 'Send via WhatsApp'}
                variant="outline"
                onPress={() => requestSend('whatsapp')}
                loading={busy}
                disabled={!phone}
              />
              <Button
                label={previouslySent ? 'Resend via Email' : 'Send via Email'}
                variant="outline"
                onPress={() => requestSend('email')}
                loading={busy}
                disabled={!quote.client_id && !email}
              />
            </View>
          ) : null}

          <Button
            label={
              quote.converted_invoice_id
                ? 'Already converted to invoice'
                : `Convert to Invoice · ${formatPrice(quote.total)}`
            }
            onPress={() => {
              void (async () => {
                setBusy(true);
                try {
                  const invoiceId = await convertQuoteToInvoice(quote.id);
                  router.replace({
                    pathname: '/(admin)/finance/invoices/[id]',
                    params: { id: invoiceId },
                  });
                } catch (e) {
                  Alert.alert(
                    'Could not convert to invoice',
                    e instanceof Error ? e.message : 'Please try again.',
                  );
                } finally {
                  setBusy(false);
                }
              })();
            }}
            loading={busy}
            disabled={!canConvert}
            fullWidth
          />

          {editGate?.ok ? (
            <Button label="Edit Quote" variant="outline" onPress={goEdit} fullWidth />
          ) : quote.status === 'accepted' && !quote.converted_invoice_id ? (
            <Button label="Reopen to Edit" variant="outline" onPress={() => setShowReopen(true)} fullWidth />
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}
