import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  ARCHIVE_REASONS,
  archiveApplication,
  fetchArchiveRemainders,
  remaindersConfirm,
  restoreApplication,
  type ArchiveReasonValue,
} from '@/lib/applications/archive';
import { useAuthStore } from '@/stores/authStore';

export function ApplicationArchiveBlock({
  applicationId,
  archivedAt,
  archivedReason,
  onDone,
}: {
  applicationId: string;
  archivedAt: string | null | undefined;
  archivedReason: string | null | undefined;
  onDone: () => void;
}) {
  const userId = useAuthStore((s) => s.profile?.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ArchiveReasonValue>('duplicate');
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaindersText, setRemaindersText] = useState<string | null>(null);

  async function openForm() {
    setOpen(true);
    const remainders = await fetchArchiveRemainders(applicationId);
    setRemaindersText(remaindersConfirm(remainders));
  }

  async function confirmArchive() {
    const label =
      reason === 'other'
        ? other.trim()
        : (ARCHIVE_REASONS.find((r) => r.value === reason)?.label ?? reason);
    if (!label) {
      Alert.alert('Reason required', 'Say why this is being filed away.');
      return;
    }
    if (!userId) return;
    setBusy(true);
    const { error } = await archiveApplication(applicationId, userId, label);
    setBusy(false);
    if (error) {
      Alert.alert('Could not archive', error);
      return;
    }
    setOpen(false);
    onDone();
  }

  async function confirmRestore() {
    setBusy(true);
    const { error } = await restoreApplication(applicationId);
    setBusy(false);
    if (error) {
      Alert.alert('Could not restore', error);
      return;
    }
    onDone();
  }

  if (archivedAt) {
    return (
      <View className="mt-4">
        <Typography variant="caption" className="mb-2">
          Filed away{archivedReason ? `: ${archivedReason}` : '.'}
        </Typography>
        <Button label="Restore" variant="primary" onPress={() => void confirmRestore()} loading={busy} fullWidth />
      </View>
    );
  }

  if (!open) {
    return (
      <View className="mt-4">
        <Button label="Archive" variant="outline" onPress={() => void openForm()} fullWidth />
      </View>
    );
  }

  return (
    <View className="mt-4 rounded-xl border border-gold/20 bg-black-rich p-4">
      {remaindersText ? (
        <Typography variant="caption" className="mb-3 text-gold">
          {remaindersText}
        </Typography>
      ) : null}
      <Typography variant="caption" className="mb-3">
        A reason is required. Quotes, contacts and waiting-list entries stay where they are.
      </Typography>
      {ARCHIVE_REASONS.map((r) => (
        <Pressable key={r.value} onPress={() => setReason(r.value)} className="py-2">
          <Typography variant="body" className={reason === r.value ? 'text-gold' : ''}>
            {reason === r.value ? '● ' : '○ '}
            {r.label}
          </Typography>
        </Pressable>
      ))}
      {reason === 'other' ? (
        <Input
          label="Reason"
          value={other}
          onChangeText={setOther}
          placeholder="Why is this being filed away?"
        />
      ) : null}
      <View className="mt-3 gap-2">
        <Button label="Confirm archive" variant="danger" onPress={() => void confirmArchive()} loading={busy} fullWidth />
        <Button label="Cancel" variant="outline" onPress={() => setOpen(false)} fullWidth />
      </View>
    </View>
  );
}
