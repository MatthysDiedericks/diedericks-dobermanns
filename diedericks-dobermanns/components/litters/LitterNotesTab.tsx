import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { requireSupabase } from '@/lib/supabase';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { timeAgo } from '@/lib/kennel/formatters';

export function LitterNotesTab({
  litterId,
  whelpingNotes,
  generalNotes,
  updatedAt,
}: {
  litterId: string;
  whelpingNotes?: string | null;
  generalNotes?: string | null;
  updatedAt?: string | null;
}) {
  const [whelping, setWhelping] = useState(whelpingNotes ?? '');
  const [notes, setNotes] = useState(generalNotes ?? '');
  const [lastSaved, setLastSaved] = useState(updatedAt);

  useEffect(() => {
    setWhelping(whelpingNotes ?? '');
    setNotes(generalNotes ?? '');
  }, [whelpingNotes, generalNotes]);

  async function saveWhelping() {
    try {
      const { error } = await requireSupabase()
        .from('litters')
        .update({ whelping_notes: whelping.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', litterId);
      if (error) throw new Error(error.message);
      setLastSaved(new Date().toISOString());
      showSaved();
    } catch {
      showError();
    }
  }

  async function saveGeneral() {
    try {
      const { error } = await requireSupabase()
        .from('litters')
        .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', litterId);
      if (error) throw new Error(error.message);
      setLastSaved(new Date().toISOString());
      showSaved();
    } catch {
      showError();
    }
  }

  return (
    <View className="pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        WHELPING NOTES
      </Typography>
      <Input
        value={whelping}
        onChangeText={setWhelping}
        multiline
        numberOfLines={6}
        onBlur={() => void saveWhelping()}
      />
      <Typography variant="label" className="mb-2 mt-4 text-gold">
        GENERAL NOTES
      </Typography>
      <Input
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={6}
        onBlur={() => void saveGeneral()}
      />
      {lastSaved ? (
        <Typography variant="caption" className="mt-2 text-subtle">
          Last updated {timeAgo(lastSaved)}
        </Typography>
      ) : null}
    </View>
  );
}
