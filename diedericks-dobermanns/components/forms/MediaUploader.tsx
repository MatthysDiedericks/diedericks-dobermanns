import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  captureWithCamera,
  pickDocument,
  pickFromLibrary,
  uploadMedia,
  type MediaKind,
  type PickedMedia,
} from '@/lib/media';
import type { StorageBucket } from '@/lib/storage';

export interface UploaderValue {
  url: string;
  kind: MediaKind;
  name?: string;
}

interface InternalItem extends UploaderValue {
  id: string;
  uri: string;
  status: 'uploading' | 'done' | 'error';
  picked?: PickedMedia;
}

interface MediaUploaderProps {
  value: UploaderValue[];
  onChange: (items: UploaderValue[]) => void;
  bucket: StorageBucket;
  /** Folder prefix inside the bucket (e.g. dog id or "gallery"). */
  folder: string;
  /** Allowed media kinds. Defaults to images only. */
  kinds?: MediaKind[];
  /** Max number of items. Defaults to 1. */
  max?: number;
  /** Show reorder + "set cover" controls (defaults to true when max > 1). */
  reorder?: boolean;
}

let counter = 0;
const nextId = () => `m-${Date.now()}-${counter++}`;

/**
 * Reusable, phone-friendly uploader: capture from camera, choose from the photo
 * library, or pick a document. Images are compressed before upload, each item
 * shows live progress / a completion tick / a retry affordance on failure, and
 * multi-item fields support reordering and choosing the cover (first) item.
 */
export function MediaUploader({
  value,
  onChange,
  bucket,
  folder,
  kinds = ['image'],
  max = 1,
  reorder,
}: MediaUploaderProps) {
  const [items, setItems] = useState<InternalItem[]>(() =>
    value.map((v) => ({ ...v, id: nextId(), uri: v.url, status: 'done' as const })),
  );

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const showReorder = reorder ?? max > 1;
  const allowImageVideo = kinds.filter((k): k is 'image' | 'video' => k !== 'document');
  const allowDocument = kinds.includes('document');
  const remaining = max - items.length;

  // Pushes committed (uploaded) items up to the parent, outside the state updater.
  const emit = useCallback((next: InternalItem[]) => {
    queueMicrotask(() =>
      onChangeRef.current(
        next
          .filter((it) => it.status === 'done' && it.url)
          .map((it) => ({ url: it.url, kind: it.kind, name: it.name })),
      ),
    );
  }, []);

  const apply = useCallback(
    (producer: (prev: InternalItem[]) => InternalItem[]) => {
      setItems((prev) => {
        const next = producer(prev);
        emit(next);
        return next;
      });
    },
    [emit],
  );

  const doUpload = useCallback(
    async (id: string, picked: PickedMedia) => {
      const { url, error } = await uploadMedia(picked, bucket, folder);
      apply((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: error ? 'error' : 'done', url: url ?? it.uri }
            : it,
        ),
      );
    },
    [apply, bucket, folder],
  );

  const addPicked = useCallback(
    (picked: PickedMedia[]) => {
      if (picked.length === 0) return;
      const slots = max - items.length;
      const toAdd = picked.slice(0, Math.max(0, slots));
      const created: InternalItem[] = toAdd.map((p) => ({
        id: nextId(),
        uri: p.uri,
        url: p.uri,
        kind: p.kind,
        name: p.name,
        status: 'uploading',
        picked: p,
      }));
      apply((prev) => [...prev, ...created]);
      created.forEach((it) => it.picked && doUpload(it.id, it.picked));
    },
    [apply, doUpload, items.length, max],
  );

  const onLibrary = useCallback(async () => {
    const picked = await pickFromLibrary({ allowed: allowImageVideo, multiple: max > 1, limit: remaining });
    addPicked(picked);
  }, [addPicked, allowImageVideo, max, remaining]);

  const onCamera = useCallback(async () => {
    const picked = await captureWithCamera({ allowed: allowImageVideo });
    addPicked(picked);
  }, [addPicked, allowImageVideo]);

  const onDocument = useCallback(async () => {
    const picked = await pickDocument();
    addPicked(picked);
  }, [addPicked]);

  const remove = (id: string) => apply((prev) => prev.filter((it) => it.id !== id));
  const retry = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it?.picked) return;
    apply((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'uploading' } : x)));
    doUpload(id, it.picked);
  };
  const move = (id: string, dir: -1 | 1) =>
    apply((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  const makeCover = (id: string) =>
    apply((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });

  return (
    <View>
      {items.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-3">
          {items.map((it, i) => (
            <View key={it.id} className="w-28">
              <View className="h-28 w-28 overflow-hidden rounded-xl border border-gold/20 bg-surface">
                {it.kind === 'image' ? (
                  <Image source={{ uri: it.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons
                      name={it.kind === 'video' ? 'videocam' : 'document-text'}
                      size={26}
                      color={Colors.gold}
                    />
                    {it.name ? (
                      <Typography variant="caption" numberOfLines={1} className="mt-1 px-1 text-center">
                        {it.name}
                      </Typography>
                    ) : null}
                  </View>
                )}

                {/* Status overlay */}
                {it.status === 'uploading' ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/50">
                    <ActivityIndicator color={Colors.gold} />
                    <Typography variant="caption" className="mt-1 text-gold">
                      Uploading…
                    </Typography>
                  </View>
                ) : null}
                {it.status === 'done' ? (
                  <View className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70">
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                ) : null}

                {/* Remove */}
                <Pressable
                  onPress={() => remove(it.id)}
                  hitSlop={8}
                  className="absolute left-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70"
                >
                  <Ionicons name="close" size={14} color={Colors.gold} />
                </Pressable>

                {/* Cover badge */}
                {showReorder && i === 0 && it.status !== 'error' ? (
                  <View className="absolute bottom-1 left-1 rounded-full bg-gold px-2 py-0.5">
                    <Typography variant="caption" className="text-black">
                      Cover
                    </Typography>
                  </View>
                ) : null}
              </View>

              {it.status === 'error' ? (
                <Pressable onPress={() => retry(it.id)} className="mt-1 flex-row items-center justify-center">
                  <Ionicons name="refresh" size={13} color={Colors.danger} />
                  <Typography variant="caption" className="ml-1 text-danger">
                    Retry
                  </Typography>
                </Pressable>
              ) : null}

              {showReorder && items.length > 1 && it.status === 'done' ? (
                <View className="mt-1 flex-row items-center justify-between">
                  <Pressable onPress={() => move(it.id, -1)} hitSlop={6} disabled={i === 0}>
                    <Ionicons name="chevron-back" size={18} color={i === 0 ? Colors.silver : Colors.gold} />
                  </Pressable>
                  {i !== 0 ? (
                    <Pressable onPress={() => makeCover(it.id)} hitSlop={6}>
                      <Typography variant="caption" className="text-gold">
                        Cover
                      </Typography>
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  <Pressable onPress={() => move(it.id, 1)} hitSlop={6} disabled={i === items.length - 1}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={i === items.length - 1 ? Colors.silver : Colors.gold}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Upload buttons — large, thumb-friendly, gold outline */}
      {remaining > 0 ? (
        <View className="gap-2">
          {Platform.OS !== 'web' && allowImageVideo.length > 0 ? (
            <UploadButton icon="camera" label="Take Photo / Video" onPress={onCamera} />
          ) : null}
          {allowImageVideo.length > 0 ? (
            <UploadButton icon="images" label="Choose from Gallery" onPress={onLibrary} />
          ) : null}
          {allowDocument ? (
            <UploadButton icon="document-attach" label="Choose Document" onPress={onDocument} />
          ) : null}
        </View>
      ) : null}

      <Typography variant="caption" className="mt-2 text-silver">
        {items.length}/{max} {max > 1 ? 'files' : 'file'}
        {showReorder && items.length > 1 ? ' · first item is the cover' : ''}
      </Typography>
    </View>
  );
}

function UploadButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[56px] w-full flex-row items-center justify-center rounded-xl border border-gold bg-black-rich px-5"
    >
      <Ionicons name={icon} size={20} color={Colors.gold} />
      <Typography variant="body" className="ml-3 text-gold">
        {label}
      </Typography>
    </Pressable>
  );
}
