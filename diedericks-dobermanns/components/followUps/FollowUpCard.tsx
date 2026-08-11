import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useCheckInMutations } from '@/hooks/useOwnerFollowUps';
import {
  KIND_LABELS,
  OWNERSHIP_LABELS,
  type DueCheckIn,
} from '@/lib/followUps/types';
import { openWhatsAppDraft } from '@/lib/followUps/whatsapp';

export function FollowUpCard({
  item,
  onLog,
  onRefresh,
}: {
  item: DueCheckIn;
  onLog: () => void;
  onRefresh: () => void;
}) {
  const { markSent, skip, updateDraft } = useCheckInMutations();
  const [draft, setDraft] = useState(item.draft_message ?? '');
  const [busy, setBusy] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [doNotContact, setDoNotContact] = useState(false);

  const dogName = item.dog?.call_name || item.dog?.name || 'Dog';
  const phone = item.contact?.whatsapp_number || item.contact?.phone || null;
  const status = item.dog?.ownership_status ?? 'unknown';
  const warn = status !== 'with_owner';

  async function onWhatsApp() {
    if (!phone) return;
    setBusy(true);
    try {
      await updateDraft(item.id, draft);
      const opened = await openWhatsAppDraft(phone, draft);
      if (opened) await markSent(item.id, draft);
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function onSkip() {
    if (!skipReason.trim()) return;
    setBusy(true);
    try {
      await skip(item.id, item.dog_id, skipReason.trim(), doNotContact);
      setShowSkip(false);
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mb-4 rounded-sm border border-gold/20 bg-surface p-4">
      <Typography variant="subtitle" className="text-text">
        {dogName}{' '}
        <Typography variant="caption" className="text-gold">
          {KIND_LABELS[item.kind]}
        </Typography>
      </Typography>
      <Typography variant="caption" className="text-muted">
        Due {item.due_date}
      </Typography>
      {warn ? (
        <Typography variant="caption" className="mt-2 text-amber-300">
          Ownership: {OWNERSHIP_LABELS[status]} — confirm before messaging.
        </Typography>
      ) : null}
      <Typography variant="body" className="mt-2 text-gold">
        {item.contact?.full_name ?? 'No contact'}
      </Typography>
      <Typography variant="caption" className="text-muted">
        {phone ?? item.contact?.email ?? 'No phone/email'}
      </Typography>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        multiline
        className="mt-3 rounded-sm border border-gold/30 px-3 py-2 text-text"
        style={{ color: '#F5F0E8', minHeight: 72 }}
      />

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Button
          label="WhatsApp"
          size="sm"
          disabled={busy || !phone}
          onPress={() => void onWhatsApp()}
        />
        <Button label="Log response" size="sm" variant="outline" onPress={onLog} />
        <Button
          label="Skip"
          size="sm"
          variant="outline"
          onPress={() => setShowSkip((v) => !v)}
        />
      </View>

      {showSkip ? (
        <View className="mt-3">
          <TextInput
            value={skipReason}
            onChangeText={setSkipReason}
            placeholder="Why skip?"
            placeholderTextColor="#8a8374"
            className="mb-2 rounded-sm border border-gold/30 px-3 py-2 text-text"
            style={{ color: '#F5F0E8' }}
          />
          <Pressable
            onPress={() => setDoNotContact((v) => !v)}
            className="mb-2 flex-row items-center gap-2"
          >
            <View
              className={`h-4 w-4 rounded-sm border ${
                doNotContact ? 'border-gold bg-gold' : 'border-gold/40'
              }`}
            />
            <Typography variant="caption" className="text-text">
              Don&apos;t contact about this dog again
            </Typography>
          </Pressable>
          <Button label="Confirm skip" size="sm" onPress={() => void onSkip()} />
        </View>
      ) : null}
    </View>
  );
}
