import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { allocateDogToClient, deallocateDog } from '@/lib/dogs/allocation';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

type ClientHit = { id: string; full_name: string | null; email: string | null };

export function ShareDogSection({ dog, onDone }: { dog: Dog; onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ClientHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerId = dog.owner_id ?? null;

  async function search(text: string) {
    setQuery(text);
    const q = text.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const { data } = await requireSupabase()
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'client')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(6);
    setHits((data ?? []) as ClientHit[]);
  }

  async function share(clientId: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await allocateDogToClient(dog.id, clientId);
    setBusy(false);
    if (err) setError(err);
    else {
      setQuery('');
      setHits([]);
      onDone();
    }
  }

  async function unshare() {
    setBusy(true);
    setError(null);
    const { error: err } = await deallocateDog(dog.id);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  }

  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="text-gold">
        SHARE WITH CLIENT
      </Typography>
      <Typography variant="caption" className="mt-1 text-muted">
        Same gate as allocation. Nothing is emailed.
      </Typography>
      {ownerId ? (
        <View className="mt-3">
          <Typography variant="body">Shared with this client</Typography>
          <Button label="Unshare" variant="outline" onPress={() => void unshare()} loading={busy} className="mt-2" />
        </View>
      ) : (
        <View className="mt-3">
          <Input value={query} onChangeText={(t) => void search(t)} placeholder="Search client name or email" />
          {hits.map((c) => (
            <Button
              key={c.id}
              label={`Share with ${c.full_name || c.email || 'client'}`}
              variant="outline"
              onPress={() => void share(c.id)}
              disabled={busy}
              className="mt-2"
            />
          ))}
        </View>
      )}
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
