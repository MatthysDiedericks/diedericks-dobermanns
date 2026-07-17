import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';

import { DogGalleryVideoItem } from '@/components/dogs/DogGalleryVideoItem';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { DogMedia } from '@/types/app.types';

interface AdminVideoListProps {
  videos: DogMedia[];
  onDelete: (id: string) => Promise<void>;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
}

export function AdminVideoList({ videos, onDelete, onUpdateCaption }: AdminVideoListProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function captionFor(item: DogMedia): string {
    return drafts[item.id] ?? item.caption ?? '';
  }

  function confirmDelete(item: DogMedia) {
    Alert.alert(
      'Delete Video',
      'This will permanently remove the video and thumbnail from storage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void onDelete(item.id).catch((e) =>
              Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed'),
            );
          },
        },
      ],
    );
  }

  async function saveCaption(item: DogMedia) {
    setSavingId(item.id);
    try {
      await onUpdateCaption(item.id, captionFor(item));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save caption');
    } finally {
      setSavingId(null);
    }
  }

  function promptCaption(item: DogMedia) {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Edit Caption',
        undefined,
        (text) => {
          if (text != null) void onUpdateCaption(item.id, text);
        },
        'plain-text',
        item.caption ?? '',
      );
    }
  }

  return (
    <View className="mt-10">
      <View className="mb-4 flex-row items-center justify-between px-2">
        <Typography variant="subtitle">Videos</Typography>
        <Badge label={`${videos.length} video${videos.length === 1 ? '' : 's'}`} tone="gold" />
      </View>

      {videos.length === 0 ? (
        <View className="items-center rounded-2xl border border-gold/10 bg-black-rich px-6 py-10">
          <Typography variant="bodyMuted" className="text-center">
            No videos yet
          </Typography>
        </View>
      ) : (
        <View className="gap-6">
          {videos.map((item) => (
            <View key={item.id} className="gap-3">
              <DogGalleryVideoItem media={item} />
              <View className="flex-row items-end gap-2">
                {Platform.OS === 'ios' ? (
                  <Pressable
                    onPress={() => promptCaption(item)}
                    className="flex-1 rounded-xl border border-gold/20 bg-surface px-3 py-2.5"
                  >
                    <Typography variant="caption" className="text-silver">
                      Caption
                    </Typography>
                    <Typography variant="body" numberOfLines={2}>
                      {item.caption?.trim() ? item.caption : 'Tap to add caption…'}
                    </Typography>
                  </Pressable>
                ) : (
                  <TextInput
                    value={captionFor(item)}
                    onChangeText={(t) => setDrafts((prev) => ({ ...prev, [item.id]: t }))}
                    placeholder="Caption (optional)"
                    placeholderTextColor={Colors.silver}
                    className="flex-1 rounded-xl border border-gold/20 bg-surface px-3 py-2 text-text"
                  />
                )}
                {Platform.OS !== 'ios' ? (
                  <Button
                    label="Save"
                    size="sm"
                    variant="outline"
                    loading={savingId === item.id}
                    onPress={() => void saveCaption(item)}
                  />
                ) : null}
                <Pressable
                  onPress={() => confirmDelete(item)}
                  hitSlop={8}
                  className="mb-1 rounded-xl border border-danger/40 p-2.5"
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
