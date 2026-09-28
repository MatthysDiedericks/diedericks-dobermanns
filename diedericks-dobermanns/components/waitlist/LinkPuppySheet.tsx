import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import {
  litterDogsForLink,
  searchSoldDogsForLink,
  linkPuppyToEntry,
  type LinkDogOption,
} from '@/lib/waitlist/linkPuppy';

export function LinkPuppySheet({
  entryId,
  litterId,
  visible,
  onClose,
  onSaved,
}: {
  entryId: string | null;
  litterId: string | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState('');
  const [dogs, setDogs] = useState<LinkDogOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const run = query.trim().length >= 2
      ? searchSoldDogsForLink(query)
      : litterId
        ? litterDogsForLink(litterId)
        : Promise.resolve({ dogs: [] as LinkDogOption[], error: null });
    void run.then((res) => {
      if (cancelled) return;
      setDogs(res.dogs);
      setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, litterId, query]);

  async function choose(dogId: string) {
    if (!entryId) return;
    setBusy(true);
    setError(null);
    const res = await linkPuppyToEntry(entryId, dogId);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setQuery('');
    onSaved();
    onClose();
  }

  return (
    <Modal visible={visible} onClose={onClose} title="Link puppy">
      <Typography variant="caption" className="mb-3 text-silver">
        {litterId
          ? 'Puppies from their litter are listed first. Search to look through sold dogs.'
          : 'Search sold dogs. No litter is stored on this line.'}{' '}
        Linking does not change their stage.
      </Typography>
      <Input
        placeholder="Search sold dogs"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="words"
      />
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
      <ScrollView style={{ maxHeight: 256 }} className="mt-3">
        {dogs.map((dog) => (
          <Pressable
            key={dog.id}
            disabled={busy}
            onPress={() => void choose(dog.id)}
            className="border-b border-gold/10 py-2"
          >
            <Typography variant="body" className="text-gold">
              {dog.name}
              {dog.status ? ` · ${dog.status}` : ''}
            </Typography>
          </Pressable>
        ))}
        {dogs.length === 0 ? (
          <Typography variant="caption" className="text-silver">
            {query.trim().length >= 2
              ? 'No sold dog with that name.'
              : 'Type two letters, or pick from the litter.'}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="mt-4">
        <Button label="Cancel" variant="outline" onPress={onClose} />
      </View>
    </Modal>
  );
}
