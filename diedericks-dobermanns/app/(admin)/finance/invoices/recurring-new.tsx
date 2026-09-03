import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { searchContactsForQuote } from '@/lib/finance/findOrCreateQuoteContact';
import { createRecurringInvoice } from '@/lib/finance/recurringInvoiceQueries';
import {
  RECURRING_INTERVALS,
  intervalPlain,
  previewIssueCopy,
  type RecurringInvoiceInterval,
} from '@/lib/finance/recurringInvoiceDates';
import { REVENUE_TYPES, REVENUE_TYPE_LABELS, type RevenueType } from '@/lib/finance/quoteTypes';

export default function NewRecurringInvoiceScreen() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactLabel, setContactLabel] = useState('');
  const [matches, setMatches] = useState<{ id: string; full_name: string; email: string | null }[]>([]);
  const [invoiceType, setInvoiceType] = useState<RevenueType>('board_train');
  const [description, setDescription] = useState('Board & train');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<RecurringInvoiceInterval>('monthly');
  const [nextIssue, setNextIssue] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [remaining, setRemaining] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () => previewIssueCopy(nextIssue, interval, endDate || null, remaining ? Number(remaining) : null),
    [nextIssue, interval, endDate, remaining],
  );

  async function onSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setMatches([]);
      return;
    }
    try {
      setMatches(await searchContactsForQuote(q));
    } catch {
      setMatches([]);
    }
  }

  async function save() {
    if (!contactId) {
      Alert.alert('Contact required', 'A schedule cannot invoice nobody.');
      return;
    }
    const amt = Number(amount);
    if (!description.trim() || !Number.isFinite(amt) || amt < 0) {
      Alert.alert('Missing amount', 'Enter a description and amount.');
      return;
    }
    setBusy(true);
    try {
      await createRecurringInvoice({
        contact_id: contactId,
        invoice_type: invoiceType,
        description: description.trim(),
        amount: amt,
        recurrence_interval: interval,
        next_issue_date: nextIssue,
        recurrence_end_date: endDate || null,
        occurrences_remaining: remaining ? Number(remaining) : null,
      });
      router.replace('/(admin)/finance/invoices/recurring' as never);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="New recurring invoice" />
      <View className="gap-3 px-6 pb-12">
        <Input label="Search contact" value={query} onChangeText={(t) => void onSearch(t)} />
        {contactId ? <Typography variant="caption" className="text-gold">{contactLabel}</Typography> : null}
        {matches.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              setContactId(m.id);
              setContactLabel(`${m.full_name} · ${m.email ?? 'no email'}`);
              setQuery(m.full_name);
              setMatches([]);
            }}
            className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2"
          >
            <Typography variant="body">{m.full_name}</Typography>
            <Typography variant="caption">{m.email ?? ''}</Typography>
          </Pressable>
        ))}
        <Typography variant="caption">Type</Typography>
        <View className="flex-row flex-wrap gap-2">
          {REVENUE_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setInvoiceType(t)}
              className={`rounded-full border px-3 py-1.5 ${
                invoiceType === t ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{REVENUE_TYPE_LABELS[t]}</Typography>
            </Pressable>
          ))}
        </View>
        <Input label="Description" value={description} onChangeText={setDescription} />
        <Input label="Amount (ZAR)" value={amount} onChangeText={setAmount} keyboardType="phone-pad" />
        <Typography variant="caption">Interval</Typography>
        <View className="flex-row flex-wrap gap-2">
          {RECURRING_INTERVALS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setInterval(i)}
              className={`rounded-full border px-3 py-1.5 ${
                interval === i ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{intervalPlain(i)}</Typography>
            </Pressable>
          ))}
        </View>
        <Input label="Next issue (YYYY-MM-DD)" value={nextIssue} onChangeText={setNextIssue} />
        <Input label="End date (optional)" value={endDate} onChangeText={setEndDate} />
        <Input label="Occurrences remaining (optional)" value={remaining} onChangeText={setRemaining} keyboardType="phone-pad" />
        <Typography variant="caption" className="text-gold">{preview}</Typography>
        <Button label={busy ? 'Saving…' : 'Save schedule'} fullWidth disabled={busy} onPress={() => void save()} />
      </View>
    </ScreenContainer>
  );
}
