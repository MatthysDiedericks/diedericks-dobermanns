import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ThumbImage } from '@/components/media/ThumbImage';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { PendingMediaItem } from '@/lib/media/pendingReview';

type Props = {
  item: PendingMediaItem;
  onPublish: (id: string) => Promise<{ error?: string }>;
  onDecline: (id: string) => Promise<{ error?: string }>;
  onDelete: (item: PendingMediaItem) => Promise<{ error?: string }>;
};

export function PendingMediaRow({ item, onPublish, onDecline, onDelete }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.error) setError(result.error);
  }

  function confirmDelete() {
    Alert.alert('Delete this photo permanently?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void run(() => onDelete(item)),
      },
    ]);
  }

  return (
    <View className="rounded-sm border border-gold/20 bg-surface p-4">
      <View className="flex-row gap-3">
        <View className="h-20 w-20 overflow-hidden rounded-sm bg-surface">
          {item.type === 'video' ? (
            <View className="h-full w-full items-center justify-center">
              <Typography variant="caption" className="text-subtle">
                Video
              </Typography>
            </View>
          ) : (
            <ThumbImage uri={item.thumbnail_url ?? item.url} size="avatar" />
          )}
        </View>
        <View className="flex-1">
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(admin)/dogs/[id]', params: { id: item.dog_id } } as never)
            }
          >
            <Typography variant="body" className="text-gold">
              {item.dog_name}
            </Typography>
          </Pressable>
          <Typography variant="caption" className="mt-1 text-subtle">
            Uploaded by {item.uploader_name ?? 'unknown'}
            {item.uploader_is_client ? ' (owner)' : ''} · {formatKennelDate(item.uploaded_at)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            Approve sets public + consent. Decline is silent to the owner.
          </Typography>
        </View>
      </View>

      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Button
          label="Approve"
          size="sm"
          disabled={busy}
          loading={busy}
          onPress={() => void run(() => onPublish(item.id))}
        />
        <Button
          label="Decline"
          size="sm"
          variant="outline"
          disabled={busy}
          onPress={() => void run(() => onDecline(item.id))}
        />
        <Button
          label="Delete"
          size="sm"
          variant="danger"
          disabled={busy}
          onPress={confirmDelete}
        />
      </View>
    </View>
  );
}
