import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';

import { PreferenceBadges } from '@/components/waitlist/PreferenceBadges';
import { StageSelector } from '@/components/waitlist/StageSelector';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { updateWaitlistEntry, useSubmitting } from '@/hooks/useMutations';
import { useWaitlistEntry } from '@/hooks/useWaitingList';
import { WAITLIST_HISTORY_SELECT } from '@/lib/waitlist/queries';
import { daysWaiting, stageLabel } from '@/lib/waitlist/constants';
import { entryDisplayName, entryEmail, entryPhone, effectiveStage } from '@/lib/waitlist/helpers';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import type { WaitingListHistoryRow } from '@/types/app.types';

type Tab = 'overview' | 'preferences' | 'history' | 'notes';

export default function WaitlistEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entry, loading, refresh } = useWaitlistEntry(id ?? '');
  const { submitting, run } = useSubmitting();
  const [tab, setTab] = useState<Tab>('overview');
  const [stageOpen, setStageOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [history, setHistory] = useState<WaitingListHistoryRow[]>([]);

  useEffect(() => {
    if (entry) {
      setAdminNotes(entry.admin_notes ?? '');
      setFollowUp(entry.follow_up_date ?? '');
    }
  }, [entry]);

  useEffect(() => {
    void (async () => {
      if (!id || !supabase) return;
      const { data } = await supabase
        .from('waiting_list_history')
        .select(WAITLIST_HISTORY_SELECT)
        .eq('waiting_list_id', id)
        .order('created_at', { ascending: false });
      setHistory((data ?? []) as unknown as WaitingListHistoryRow[]);
    })();
  }, [id, entry?.pipeline_stage]);

  async function saveNotes() {
    if (!entry) return;
    await run(() =>
      updateWaitlistEntry(entry.id, {
        admin_notes: adminNotes.trim() || null,
        follow_up_date: followUp.trim() || null,
      }),
    );
    refresh();
  }

  if (loading || !entry) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  const tabs: Tab[] = ['overview', 'preferences', 'history', 'notes'];

  return (
    <ScreenContainer>
      <View className="px-4 pt-2">
        <Pressable onPress={() => router.back()} className="mb-2 h-9 w-9 items-center justify-center rounded-full border border-gold/30">
          <Ionicons name="arrow-back" size={18} color={Colors.gold} />
        </Pressable>
      </View>
      <PageHeader eyebrow="Waiting List" title={entryDisplayName(entry)} back={false} />
      <View className="mb-3 flex-row flex-wrap gap-2 px-4">
        <Badge label={stageLabel(effectiveStage(entry))} tone="gold" />
        <Badge label={entry.priority} tone="muted" />
      </View>
      <View className="mb-4 flex-row flex-wrap gap-2 px-4">
        {entryPhone(entry) ? (
          <Button label="Call" size="sm" variant="outline" onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)} />
        ) : null}
        {entryEmail(entry) ? (
          <Button label="Email" size="sm" variant="outline" onPress={() => Linking.openURL(`mailto:${entryEmail(entry)}`)} />
        ) : null}
        <Button label="Move stage" size="sm" onPress={() => setStageOpen(true)} />
        <Button
          label="Create invoice"
          size="sm"
          variant="outline"
          onPress={() =>
            router.push({
              pathname: '/(admin)/finance/invoices/new',
              params: entry.client_id ? { clientId: entry.client_id } : {},
            })
          }
        />
      </View>

      <ScrollView horizontal className="mb-4 px-4">
        {tabs.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={`mr-2 rounded-full border px-3 py-1.5 ${tab === t ? 'border-gold bg-gold/15' : 'border-gold/20'}`}>
            <Typography variant="caption" className={tab === t ? 'text-gold' : ''}>{t}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView className="px-4 pb-12">
        {tab === 'overview' ? (
          <Card className="p-4">
            <Typography variant="label" className="text-gold">Contact</Typography>
            <Typography variant="body">{entry.enquirer_country ?? entry.client?.phone}</Typography>
            <Typography variant="caption" className="mt-2 text-silver">Added {daysWaiting(entry.created_at)} days ago</Typography>
            <Typography variant="label" className="mt-4 text-gold">Payment</Typography>
            <Typography variant="body">{entry.payment_status.replace(/_/g, ' ')}</Typography>
            {entry.deposit_amount ? <Typography variant="body">{formatPrice(entry.deposit_amount)}</Typography> : null}
            {entry.deposit_invoice_id ? (
              <Typography
                variant="caption"
                className="mt-1 text-success underline"
                onPress={() =>
                  router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: entry.deposit_invoice_id! } })
                }
              >
                View deposit invoice →
              </Typography>
            ) : null}
            {entry.balance_invoice_id ? (
              <Typography
                variant="caption"
                className="mt-1 text-success underline"
                onPress={() =>
                  router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: entry.balance_invoice_id! } })
                }
              >
                View balance invoice →
              </Typography>
            ) : null}
            <Typography variant="label" className="mt-4 text-gold">Assignment</Typography>
            <Typography variant="body">
              {entry.assigned_dog?.name ?? entry.assigned_litter?.name ?? 'Not yet matched'}
            </Typography>
          </Card>
        ) : null}
        {tab === 'preferences' ? (
          <Card className="p-4">
            <PreferenceBadges entry={entry} />
            <Typography variant="body" className="mt-4">{entry.preference_notes ?? '—'}</Typography>
          </Card>
        ) : null}
        {tab === 'history' ? (
          <View>
            {history.length === 0 ? (
              <Typography variant="bodyMuted">No stage changes logged yet.</Typography>
            ) : (
              history.map((h) => (
                <Card key={h.id} className="mb-2 p-3">
                  <Typography variant="caption" className="text-silver">{h.created_at.slice(0, 10)}</Typography>
                  <Typography variant="body">
                    {stageLabel(h.from_stage)} → {stageLabel(h.to_stage)}
                  </Typography>
                  {h.changed_by_user?.full_name ? (
                    <Typography variant="caption">By {h.changed_by_user.full_name}</Typography>
                  ) : null}
                  {h.notes ? <Typography variant="caption" className="text-silver">{h.notes}</Typography> : null}
                </Card>
              ))
            )}
          </View>
        ) : null}
        {tab === 'notes' ? (
          <View>
            <Input label="Admin notes" value={adminNotes} onChangeText={setAdminNotes} multiline className="h-32" />
            <Input label="Follow-up date" value={followUp} onChangeText={setFollowUp} autoCapitalize="none" className="mt-3" />
            <Button label="Save" onPress={saveNotes} loading={submitting} fullWidth className="mt-4" />
          </View>
        ) : null}
      </ScrollView>

      <StageSelector visible={stageOpen} entry={entry} onClose={() => setStageOpen(false)} onSaved={refresh} />
    </ScreenContainer>
  );
}
