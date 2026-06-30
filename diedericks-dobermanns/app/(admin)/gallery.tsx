import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminGallery } from '@/hooks/useAdmin';
import { setGalleryFeatured } from '@/hooks/useMutations';
import { titleCase } from '@/lib/format';

export default function AdminGalleryScreen() {
  const { data: items, loading, refetch } = useAdminGallery();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    await setGalleryFeatured(id, next);
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Content" title="Gallery" />
      <View className="gap-3 px-6">
        {!loading && items.length === 0 ? (
          <EmptyState title="No gallery items yet" />
        ) : (
          items.map((item) => (
            <Card key={item.id} className="flex-row items-center">
              <View className="h-16 w-16 overflow-hidden rounded-xl bg-surface">
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
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
      </View>
    </ScreenContainer>
  );
}
