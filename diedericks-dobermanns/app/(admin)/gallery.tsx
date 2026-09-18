import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AddDogMediaCard } from '@/components/admin/AddDogMediaCard';
import { DogMediaManager } from '@/components/admin/DogMediaManager';
import { GalleryItemEditSheet } from '@/components/admin/GalleryItemEditSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminGallery, useDogsForMediaPicker } from '@/hooks/useAdmin';
import { setGalleryFeatured } from '@/hooks/useMutations';
import { ThumbImage } from '@/components/media/ThumbImage';
import { titleCase } from '@/lib/format';
import { GRID_PAGE_SIZE } from '@/lib/thumbs';
import type { GalleryItem } from '@/types/app.types';

export default function AdminGalleryScreen() {
  const { data: items, loading, refetch } = useAdminGallery();
  const { data: dogs } = useDogsForMediaPicker();
  const [dogId, setDogId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shown, setShown] = useState(GRID_PAGE_SIZE);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [local, setLocal] = useState<GalleryItem[] | null>(null);
  const list = local ?? items;
  const visible = useMemo(() => list.slice(0, shown), [list, shown]);
  const dogName = dogs.find((d) => d.id === dogId)?.name;
  const dogStatus = dogs.find((d) => d.id === dogId)?.status;

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    await setGalleryFeatured(id, next);
    setLocal((prev) =>
      (prev ?? items).map((g) => (g.id === id ? { ...g, is_featured: next } : g)),
    );
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Content" title="Gallery" />
      <View className="px-6">
        <AddDogMediaCard
          dogs={dogs}
          dogId={dogId}
          onDogIdChange={setDogId}
          onUploaded={() => setRefreshKey((n) => n + 1)}
        />
      </View>
      <DogMediaManager key={`${dogId ?? 'all'}-${refreshKey}`} dogId={dogId} dogName={dogName} dogStatus={dogStatus} />
      {dogId ? null : (
      <View className="gap-3 px-6">
        {!loading && list.length === 0 ? (
          <EmptyState title="No gallery items yet" />
        ) : (
          visible.map((item) => (
            <Card key={item.id} className="flex-row items-center">
              <Pressable onPress={() => setEditing(item)} className="flex-1 flex-row items-center">
                <View className="h-16 w-16 overflow-hidden rounded-xl bg-surface">
                  {item.image_url ? (
                    <ThumbImage uri={item.image_url} size="avatar" />
                  ) : null}
                </View>
                <View className="ml-4 flex-1">
                  <Typography variant="subtitle" numberOfLines={1}>
                    {item.title ?? 'Untitled'}
                  </Typography>
                  <Typography variant="caption" className="mt-0.5">
                    {item.category ? titleCase(item.category) : 'Uncategorised'}
                  </Typography>
                  {item.description?.trim() ? (
                    <Typography variant="caption" numberOfLines={2} className="mt-1 text-silver">
                      {item.description.trim()}
                    </Typography>
                  ) : null}
                </View>
              </Pressable>
              <View className="items-end">
                <Pressable
                  onPress={() => toggle(item.id, !item.is_featured)}
                  disabled={busy === item.id}
                  className="rounded-lg border border-gold/40 px-3 py-1.5"
                >
                  <Typography variant="caption" className="text-gold">
                    {busy === item.id ? 'Saving…' : item.is_featured ? 'Unfeature' : 'Feature'}
                  </Typography>
                </Pressable>
                {item.is_featured ? <Badge label="Featured" tone="gold" /> : null}
              </View>
            </Card>
          ))
        )}
        {shown < list.length ? (
          <Pressable
            onPress={() => setShown((n) => n + GRID_PAGE_SIZE)}
            className="items-center rounded-xl border border-gold/40 py-3"
          >
            <Typography variant="caption" className="text-gold">
              Load more ({Math.min(GRID_PAGE_SIZE, list.length - shown)} of {list.length - shown})
            </Typography>
          </Pressable>
        ) : null}
      </View>
      )}
      {editing ? (
        <GalleryItemEditSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setLocal((prev) => (prev ?? items).map((g) => (g.id === next.id ? next : g)));
            setEditing(null);
            void refetch();
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}
