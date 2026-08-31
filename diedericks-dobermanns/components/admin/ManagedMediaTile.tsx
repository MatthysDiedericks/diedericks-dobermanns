import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ThumbImage } from '@/components/media/ThumbImage';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { ManagedDogMedia } from '@/hooks/useManagedDogMedia';
import { formatKennelDate } from '@/lib/kennel/formatters';

export function ManagedMediaTile({
  item,
  selecting,
  selected,
  onPress,
  onLongPress,
  onHideShow,
  onMoveUp,
  onMoveDown,
  onSetCover,
  onSetPedigreePhoto,
  isPedigreePhoto,
  onCaption,
  onDelete,
}: {
  item: ManagedDogMedia;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onHideShow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetCover: () => void;
  onSetPedigreePhoto?: () => void;
  isPedigreePhoto?: boolean;
  onCaption: () => void;
  onDelete: () => void;
}) {
  const hidden = item.is_public === false;
  const poster = item.thumbnail_url ?? (item.type === 'photo' ? item.url : null);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={`mb-4 overflow-hidden rounded-2xl border ${selected ? 'border-gold' : 'border-gold/20'} bg-surface`}
    >
      <View className="relative aspect-square bg-black">
        {poster ? (
          <ThumbImage uri={poster} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="play-circle" size={42} color={Colors.gold} />
          </View>
        )}
        {item.type === 'video' ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="rounded-full bg-black/70 px-3 py-1">
              <Typography variant="caption" className="text-gold">
                ▶ Video
              </Typography>
            </View>
          </View>
        ) : null}
        {selecting ? (
          <View className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1">
            <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={18} color={Colors.gold} />
          </View>
        ) : null}
        <View className="absolute right-2 top-2 gap-1">
          {item.is_primary ? (
            <View className="rounded bg-gold px-1.5 py-0.5">
              <Typography variant="caption" className="text-[10px] text-black">
                Card photo
              </Typography>
            </View>
          ) : null}
          {isPedigreePhoto ? (
            <View className="rounded bg-gold px-1.5 py-0.5">
              <Typography variant="caption" className="text-[10px] text-black">
                Pedigree photo
              </Typography>
            </View>
          ) : null}
          <View className={`rounded px-1.5 py-0.5 ${hidden ? 'bg-black/70' : 'bg-gold/90'}`}>
            <Typography variant="caption" className={`text-[10px] ${hidden ? 'text-ink-muted' : 'text-black'}`}>
              {hidden ? 'Hidden' : 'Public'}
            </Typography>
          </View>
        </View>
      </View>
      <View className="p-3">
        <Typography variant="caption" className="text-silver">
          {item.type} · {formatKennelDate(item.uploaded_at)}
        </Typography>
        {item.uploader_is_client ? (
          <Typography variant="caption" className="mt-1 text-gold-dim">
            {item.client_consent
              ? `Client photo — consent given ${item.approved_at ? formatKennelDate(item.approved_at) : ''}`.trim()
              : 'Client photo — no consent'}
          </Typography>
        ) : null}
        <Typography variant="body" className="mt-1" numberOfLines={1}>
          {item.caption ?? 'No caption'}
        </Typography>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Pressable onPress={onHideShow} className="rounded-lg border border-gold/30 px-3 py-1.5">
            <Typography variant="caption" className="text-gold">
              {hidden ? 'Show' : 'Hide'}
            </Typography>
          </Pressable>
          <Pressable onPress={onMoveUp} className="rounded-lg border border-gold/30 px-3 py-1.5">
            <Typography variant="caption" className="text-gold">↑</Typography>
          </Pressable>
          <Pressable onPress={onMoveDown} className="rounded-lg border border-gold/30 px-3 py-1.5">
            <Typography variant="caption" className="text-gold">↓</Typography>
          </Pressable>
          <Pressable onPress={onSetCover} className="rounded-lg border border-gold/30 px-3 py-1.5">
            <Typography variant="caption" className="text-gold">
              {item.is_primary ? 'Card photo' : 'Set as card photo'}
            </Typography>
          </Pressable>
          {item.type !== 'video' && onSetPedigreePhoto ? (
            <Pressable onPress={onSetPedigreePhoto} className="rounded-lg border border-gold/30 px-3 py-1.5">
              <Typography variant="caption" className="text-gold">
                {isPedigreePhoto ? 'Clear pedigree photo' : 'Set as pedigree photo'}
              </Typography>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() =>
              Alert.alert('Actions', undefined, [
                { text: 'Edit caption', onPress: onCaption },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: onDelete,
                },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            className="rounded-lg px-3 py-1.5"
          >
            <Typography variant="caption" className="text-muted">⋯</Typography>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
