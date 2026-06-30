import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { PhotoCard } from '@/components/dogs/PhotoCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { DogMedia } from '@/types/app.types';

interface PhotoGridProps {
  media: DogMedia[];
  onSetPrimary: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

export function PhotoGrid({
  media,
  onSetPrimary,
  onDelete,
  onUpdateCaption,
  onReorder,
}: PhotoGridProps) {
  const [preview, setPreview] = useState<DogMedia | null>(null);
  const [captionEdit, setCaptionEdit] = useState<{ id: string; text: string } | null>(null);
  const width = Dimensions.get('window').width;
  const cellSize = Math.floor(width / 3);

  const ordered = useMemo(
    () => [...media].sort((a, b) => a.sort_order - b.sort_order),
    [media],
  );

  function showActions(item: DogMedia, index: number) {
    const options = ['Set as Primary', 'Edit Caption', 'Move Earlier', 'Move Later', 'Delete', 'Cancel'];
    const destructive = 4;
    const cancel = 5;

    const run = async (idx: number) => {
      if (idx === 0) await onSetPrimary(item.id);
      if (idx === 1) promptCaption(item);
      if (idx === 2 && index > 0) {
        const ids = ordered.map((m) => m.id);
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
        await onReorder(ids);
      }
      if (idx === 3 && index < ordered.length - 1) {
        const ids = ordered.map((m) => m.id);
        [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
        await onReorder(ids);
      }
      if (idx === 4) confirmDelete(item);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructive, cancelButtonIndex: cancel },
        (idx) => {
          if (idx != null && idx !== cancel) void run(idx);
        },
      );
      return;
    }

    Alert.alert('Photo Options', item.caption ?? 'Choose an action', [
      { text: 'Set as Primary', onPress: () => void onSetPrimary(item.id) },
      { text: 'Edit Caption', onPress: () => promptCaption(item) },
      ...(index > 0
        ? [{ text: 'Move Earlier', onPress: () => void run(2) }]
        : []),
      ...(index < ordered.length - 1
        ? [{ text: 'Move Later', onPress: () => void run(3) }]
        : []),
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => confirmDelete(item),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
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
      return;
    }
    setCaptionEdit({ id: item.id, text: item.caption ?? '' });
  }

  function confirmDelete(item: DogMedia) {
    Alert.alert(
      'Delete Photo',
      'This will permanently remove the photo from storage and the database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void onDelete(item.id),
        },
      ],
    );
  }

  return (
    <>
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <PhotoCard
            item={item}
            index={index}
            size={cellSize}
            onPress={() => setPreview(item)}
            onLongPress={() => showActions(item, index)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="images-outline" size={40} color={Colors.silver} />
            <Typography variant="bodyMuted" className="mt-3">
              No photos yet. Tap Add Photos to upload.
            </Typography>
          </View>
        }
      />

      <Modal visible={preview != null} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/95"
          onPress={() => setPreview(null)}
        >
          <View className="flex-1 items-center justify-center px-4">
            {preview ? (
              <Image
                source={{ uri: preview.url }}
                style={{ width: width - 32, height: width - 32 }}
                contentFit="contain"
              />
            ) : null}
            {preview?.caption ? (
              <Typography variant="caption" className="mt-4 text-center text-muted">
                {preview.caption}
              </Typography>
            ) : null}
            <Pressable onPress={() => setPreview(null)} className="absolute right-6 top-14">
              <Ionicons name="close" size={28} color={Colors.gold} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={captionEdit != null} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/80 px-6"
          onPress={() => setCaptionEdit(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full rounded-xl border border-gold/30 bg-surface p-5"
          >
            <Typography variant="subtitle" className="text-gold">
              Edit Caption
            </Typography>
            <TextInput
              value={captionEdit?.text ?? ''}
              onChangeText={(text) =>
                setCaptionEdit((prev) => (prev ? { ...prev, text } : prev))
              }
              placeholder="Optional caption"
              placeholderTextColor={Colors.silver}
              className="mt-4 rounded-xl border border-gold/20 bg-black-rich px-4 py-3 font-body text-ink"
              multiline
            />
            <View className="mt-4 flex-row gap-3">
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setCaptionEdit(null)}
                className="flex-1"
              />
              <Button
                label="Save"
                variant="solid"
                onPress={() => {
                  if (captionEdit) void onUpdateCaption(captionEdit.id, captionEdit.text);
                  setCaptionEdit(null);
                }}
                className="flex-1"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
