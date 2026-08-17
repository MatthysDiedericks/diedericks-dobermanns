import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AddDogMediaCard } from '@/components/admin/AddDogMediaCard';
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

export default function AdminGalleryScreen() {
  const { data: items, loading, refetch } = useAdminGallery();
  const { data: dogs } = useDogsForMediaPicker();
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState(GRID_PAGE_SIZE);
  const visible = useMemo(() => items.slice(0, shown), [items, shown]);

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    await setGalleryFeatured(id, next);
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Content" title="Gallery" />
      <View className="px-6">
        <AddDogMediaCard dogs={dogs} />
      </View>
      <View className="gap-3 px-6">
        {!loading && items.length === 0 ? (
          <EmptyState title="No gallery items yet" />
        ) : (
          visible.map((item) => (
            <Card key={item.id} className="flex-row items-center">
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
                <Pressable
                  onPress={() => toggle(item.id, !item.is_featured)}
                  disabled={busy === item.id}
                  className="mt-2 self-start rounded-lg border border-gold/40 px-3 py-1.5"
                >
                  <Typography variant="caption" className="text-gold">
                    {busy === item.id ? 'Saving…' : item.is_featured ? 'Unfeature' : 'Feature'}
                  </Typography>
                </Pressable>
              </View>
              {item.is_featured ? <Badge label="Featured" tone="gold" /> : null}
            </Card>
          ))
        )}
        {shown < items.length ? (
          <Pressable
            onPress={() => setShown((n) => n + GRID_PAGE_SIZE)}
            className="items-center rounded-xl border border-gold/40 py-3"
          >
            <Typography variant="caption" className="text-gold">
              Load more ({Math.min(GRID_PAGE_SIZE, items.length - shown)} of {items.length - shown})
            </Typography>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
