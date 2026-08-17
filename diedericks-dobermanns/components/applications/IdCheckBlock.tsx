import { useState } from 'react';
import { Alert, View } from 'react-native';

import { MaskedIdNumber } from '@/components/applications/MaskedIdNumber';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { applyEmbeddedIdDob, overrideIdCheck } from '@/lib/applications/idCheck';
import {
  dobMismatchSentence,
  formatDobDisplay,
  formatDobWords,
  parseHistoricDob,
} from '@/lib/identity/dob';
import {
  checkIdNumber,
  ID_TYPE_LABELS,
  inferIdType,
  type IdCheckStatus,
  type IdType,
} from '@/lib/identity/idNumber';
import { useAuthStore } from '@/stores/authStore';
import type { Application } from '@/types/app.types';

const HONESTY =
  'Format checks catch typos and casual invention. They do not prove the number belongs to this person.';

export function IdCheckBlock({
  app,
  onDone,
}: {
  app: Application;
  onDone: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const type = (app.id_type as IdType | null) ?? inferIdType(app.id_number, app.country);
  const check = checkIdNumber({ type, number: app.id_number, country: app.country });
  const status = (app.id_check_status as IdCheckStatus | null) ?? check.status;
  const historic = parseHistoricDob(app.date_of_birth);
  const mismatch = dobMismatchSentence(check.parsed?.dobIso, app.date_of_birth);
  const offerDob =
    check.parsed && historic.kind !== 'iso' && historic.kind !== 'empty'
      ? formatDobWords(check.parsed.dobIso)
      : null;
  const summary =
    status === 'manual_override'
      ? 'Manual override'
      : check.adminSummary;

  async function override() {
    if (!profile?.id) return;
    setBusy(true);
    const { error } = await overrideIdCheck(
      app.id,
      profile.id,
      profile.full_name ?? 'Admin',
      note,
    );
    setBusy(false);
    if (error) Alert.alert('Could not override', error);
    else {
      setNote('');
      onDone();
    }
  }

  async function useIdDob() {
    if (!profile?.id) return;
    setBusy(true);
    const { error } = await applyEmbeddedIdDob(app.id, profile.id);
    setBusy(false);
    if (error) Alert.alert('Could not update date', error);
    else onDone();
  }

  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="mb-3 text-gold">
        Identity document
      </Typography>
      <Typography variant="caption">Number</Typography>
      <MaskedIdNumber value={app.id_number} />
      <Typography variant="caption" className="mt-3">
        Type
      </Typography>
      <Typography variant="body">{ID_TYPE_LABELS[type]}</Typography>
      <Typography variant="caption" className="mt-3">
        Date of birth
      </Typography>
      <Typography variant="body">{formatDobDisplay(app.date_of_birth)}</Typography>

      <Typography variant="body" className={`mt-3 ${status === 'failed' ? 'text-amber-400' : ''}`}>
        {summary}
      </Typography>
      {check.confirmNote ? (
        <Typography variant="body" className="mt-2 text-amber-400">
          {check.confirmNote}
        </Typography>
      ) : null}
      {mismatch ? (
        <Typography variant="body" className="mt-2 text-amber-400">
          {mismatch}
        </Typography>
      ) : null}
      {status === 'manual_override' && app.id_check_note ? (
        <Typography variant="caption" className="mt-2">
          {app.id_check_note}
        </Typography>
      ) : null}
      <Typography variant="caption" className="mt-3 opacity-70">
        {HONESTY}
      </Typography>

      {offerDob ? (
        <View className="mt-3 rounded-xl border border-gold/20 p-3">
          <Typography variant="caption">
            The stored date of birth is not a real date. The ID encodes {offerDob}. Confirm
            before writing it — it is not applied automatically.
          </Typography>
          <Button
            label={`Use ${offerDob} from the ID`}
            variant="outline"
            onPress={() => void useIdDob()}
            loading={busy}
            className="mt-3"
          />
        </View>
      ) : null}

      {status !== 'manual_override' ? (
        <View className="mt-4">
          <Input
            label="Manual override"
            value={note}
            onChangeText={setNote}
            placeholder="Why this document is accepted anyway"
            multiline
          />
          <Button
            label="Record override"
            onPress={() => void override()}
            loading={busy}
            className="mt-2"
          />
        </View>
      ) : null}
    </View>
  );
}
