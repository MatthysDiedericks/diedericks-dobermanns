import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { ClientDogNotes } from '@/hooks/useClientDogNotes';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface DogNotesTabProps {
  dogName: string;
  notes: ClientDogNotes | null;
  saving: boolean;
  onSave: (patch: { personal_notes?: string }) => Promise<void>;
}

export function DogNotesTab({ dogName, notes, saving, onSave }: DogNotesTabProps) {
  const [personalNotes, setPersonalNotes] = useState(notes?.personal_notes ?? '');

  useEffect(() => {
    setPersonalNotes(notes?.personal_notes ?? '');
  }, [notes]);

  return (
    <View className="px-6 pb-8">
      <Typography variant="subtitle" className="mb-1">
        Your personal notes about {dogName}
      </Typography>
      <Typography variant="caption" className="mb-4 text-subtle">
        These are private to you — not visible to the kennel.
      </Typography>
      <Card>
        <Input
          value={personalNotes}
          onChangeText={setPersonalNotes}
          multiline
          numberOfLines={8}
          placeholder="Observations, routines, behaviour notes…"
          className="min-h-[160px]"
        />
        {notes?.updated_at ? (
          <Typography variant="caption" className="mt-2 text-subtle">
            Last updated {formatKennelDate(notes.updated_at)}
          </Typography>
        ) : null}
        <Button
          label="Save Notes"
          onPress={() => void onSave({ personal_notes: personalNotes.trim() || undefined })}
          loading={saving}
          className="mt-4"
          fullWidth
        />
      </Card>
    </View>
  );
}
