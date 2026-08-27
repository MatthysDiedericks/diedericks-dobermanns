import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';

import { ManagedMediaTile } from '@/components/admin/ManagedMediaTile';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDocumentsForEntity } from '@/hooks/useDocuments';
import { useManagedDogMedia } from '@/hooks/useManagedDogMedia';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { profileCoverHint } from '@/lib/dogs/profilePhoto';

export function DogMediaManager({
  dogId,
  dogName,
  dogStatus,
}: {
  dogId: string | null;
  dogName?: string;
  dogStatus?: string | null;
}) {
  const router = useRouter();
  const mgr = useManagedDogMedia(dogId);
  const docs = useDocumentsForEntity('dog', dogId ?? '');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captionEdit, setCaptionEdit] = useState<{ id: string; text: string } | null>(null);

  const photos = mgr.media.filter((m) => m.type === 'photo').length;
  const videos = mgr.media.filter((m) => m.type === 'video').length;
  const heading = dogId && dogName
    ? `${dogName} — ${photos} photo${photos === 1 ? '' : 's'}, ${videos} video${videos === 1 ? '' : 's'}`
    : `All dog media — ${photos} photo${photos === 1 ? '' : 's'}, ${videos} video${videos === 1 ? '' : 's'}`;
  const hint = dogId
    ? profileCoverHint(dogStatus, mgr.media.some((m) => m.is_primary))
    : null;

  const ids = useMemo(() => [...selected], [selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function hideShow(id: string) {
    const item = mgr.media.find((m) => m.id === id);
    if (!item) return;
    const next = item.is_public === false;
    try {
      if (next && item.uploader_is_client && item.client_consent === false) {
        Alert.alert(
          'No owner consent',
          'This is a client photo and they have not given consent. Make it public anyway? This will be recorded against your account.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Make public', onPress: () => void mgr.setPublic(id, true, true) },
          ],
        );
        return;
      }
      await mgr.setPublic(id, next);
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert(
      'Delete this photo permanently?',
      'It will be removed from the website and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void mgr.remove(id) },
      ],
    );
  }

  return (
    <View className="px-6 pb-8">
      <Typography variant="subtitle" className="mb-3 text-gold">
        {heading}
      </Typography>

      {selecting && ids.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => void mgr.bulkSetPublic(ids, false).then(() => setSelected(new Set()))}
            className="rounded-lg border border-gold/40 px-3 py-2"
          >
            <Typography variant="caption" className="text-gold">Hide {ids.length}</Typography>
          </Pressable>
          <Pressable
            onPress={() =>
              void mgr.bulkSetPublic(ids, true).then(() => setSelected(new Set())).catch((e) =>
                Alert.alert('Could not show', e instanceof Error ? e.message : 'Try again.'),
              )
            }
            className="rounded-lg border border-gold/40 px-3 py-2"
          >
            <Typography variant="caption" className="text-gold">Show {ids.length}</Typography>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                `Delete ${ids.length} items permanently?`,
                'They will be removed from the website and cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void mgr.bulkRemove(ids).then(() => setSelected(new Set())),
                  },
                ],
              )
            }
            className="rounded-lg border border-red-400/40 px-3 py-2"
          >
            <Typography variant="caption" className="text-red-300">Delete {ids.length}</Typography>
          </Pressable>
          <Pressable onPress={() => { setSelecting(false); setSelected(new Set()); }}>
            <Typography variant="caption" className="text-muted">Done</Typography>
          </Pressable>
        </View>
      ) : (
        <Typography variant="caption" className="mb-3 text-silver">
          Long-press a tile to select several. Hide is on the tile; delete is behind ⋯.
        </Typography>
      )}

      {hint ? (
        <Typography variant="caption" className="mb-3 text-silver">
          {hint}
        </Typography>
      ) : null}

      {mgr.loading ? <ActivityIndicator color={Colors.gold} /> : null}
      {mgr.error ? <Typography variant="caption" className="mb-2 text-danger">{mgr.error}</Typography> : null}

      {mgr.media.map((item) => (
        <ManagedMediaTile
          key={item.id}
          item={item}
          selecting={selecting}
          selected={selected.has(item.id)}
          onPress={() => {
            if (selecting) toggle(item.id);
          }}
          onLongPress={() => {
            setSelecting(true);
            toggle(item.id);
          }}
          onHideShow={() => void hideShow(item.id)}
          onMoveUp={() => void mgr.move(item.id, -1)}
          onMoveDown={() => void mgr.move(item.id, 1)}
          onSetCover={() => void mgr.setCover(item.id, item.dog_id)}
          onCaption={() => setCaptionEdit({ id: item.id, text: item.caption ?? '' })}
          onDelete={() => confirmDelete(item.id)}
        />
      ))}

      {captionEdit ? (
        <View className="mb-4 rounded-2xl border border-gold/20 bg-surface p-3">
          <TextInput
            value={captionEdit.text}
            onChangeText={(text) => setCaptionEdit({ ...captionEdit, text })}
            className="text-ink"
            placeholder="Caption"
            placeholderTextColor={Colors.silver}
          />
          <Pressable
            onPress={() => {
              void mgr.updateCaption(captionEdit.id, captionEdit.text);
              setCaptionEdit(null);
            }}
            className="mt-2"
          >
            <Typography variant="label" className="text-gold">Save caption</Typography>
          </Pressable>
        </View>
      ) : null}

      {dogId ? (
        <View className="mt-6">
          <Typography variant="subtitle" className="mb-2 text-gold">
            Documents · {docs.documents.length}
          </Typography>
          {/* client_visible is listing, not access control — storage policy decides fetch. */}
          {docs.documents.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push('/(admin)/documents' as never)}
              className="mb-2 rounded-xl border border-gold/15 bg-surface p-3"
            >
              <Typography variant="body">{d.document_name}</Typography>
              <Typography variant="caption" className="text-silver">
                {d.category} · {d.date_of_document ? formatKennelDate(d.date_of_document) : '—'} ·{' '}
                {d.is_public ? 'Public' : 'Staff'}
                {d.client_visible ? ' · client list' : ''}
              </Typography>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/(admin)/documents' as never)}>
            <Typography variant="label" className="text-gold">Open documents library →</Typography>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
