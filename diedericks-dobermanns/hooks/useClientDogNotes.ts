import { useCallback, useEffect, useState } from 'react';

import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface ClientDogNotes {
  id: string;
  client_id: string;
  dog_id: string;
  nickname: string | null;
  personal_notes: string | null;
  vet_practice: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  updated_at: string;
}

export interface ClientDogNotesUpdate {
  nickname?: string;
  personal_notes?: string;
  vet_practice?: string;
  vet_name?: string;
  vet_phone?: string;
}

export function useClientDogNotes(dogId: string) {
  const profile = useAuthStore((s) => s.profile);
  const [notes, setNotes] = useState<ClientDogNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile?.id || !dogId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('client_dog_notes')
        .select('*')
        .eq('client_id', profile.id)
        .eq('dog_id', dogId)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setNotes((data as ClientDogNotes | null) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (patch: ClientDogNotesUpdate) => {
      if (!profile?.id || !dogId) return;
      setSaving(true);
      setError(null);
      try {
        const { data, error: err } = await requireSupabase()
          .from('client_dog_notes')
          .upsert(
            {
              client_id: profile.id,
              dog_id: dogId,
              ...patch,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'client_id,dog_id' },
          )
          .select()
          .single();
        if (err) throw new Error(err.message);
        setNotes(data as ClientDogNotes);
        showSaved('Saved ✓');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save';
        setError(msg);
        showError('Could not save — try again');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [profile?.id, dogId],
  );

  return { notes, loading, saving, error, save, refresh };
}
