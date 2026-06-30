import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { saveTrainerNotes, useSubmitting } from '@/hooks/useMutations';

export function SessionNotesSection({
  bookingId,
  initialNotes,
  updatedAt,
  onSaved,
}: {
  bookingId: string;
  initialNotes: string | null;
  updatedAt: string | null;
  onSaved: () => void;
}) {
  const { submitting, run } = useSubmitting();
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(updatedAt);

  useEffect(() => {
    setNotes(initialNotes ?? '');
    setSavedAt(updatedAt);
  }, [bookingId, initialNotes, updatedAt]);

  async function save() {
    const { error } = await run(() => saveTrainerNotes(bookingId, notes.trim()));
    if (!error) {
      setSavedAt(new Date().toISOString());
      onSaved();
    }
  }

  return (
    <View>
      <Input
        label="Session notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        className="h-32"
        placeholder="Observations, homework, progress…"
      />
      {savedAt ? (
        <Typography variant="caption" className="mb-2 text-silver">
          Last saved {new Date(savedAt).toLocaleString()}
        </Typography>
      ) : null}
      <Button label="Save Notes" onPress={save} loading={submitting} variant="outline" />
    </View>
  );
}
