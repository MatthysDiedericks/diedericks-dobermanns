import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminTestimonials } from '@/hooks/useAdmin';
import { setTestimonialApproved } from '@/hooks/useMutations';

export default function AdminTestimonialsScreen() {
  const { data: testimonials, loading, refetch } = useAdminTestimonials();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    await setTestimonialApproved(id, next);
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Content" title="Testimonials" />
      <View className="gap-3 px-6">
        {!loading && testimonials.length === 0 ? (
          <EmptyState title="No testimonials yet" />
        ) : (
          testimonials.map((t) => (
            <Card key={t.id}>
              <View className="flex-row items-center justify-between">
                <Typography variant="subtitle">{t.client_name}</Typography>
                <View className="flex-row gap-2">
                  {t.is_featured ? <Badge label="Featured" tone="gold" /> : null}
                  <Badge label={t.is_approved ? 'Approved' : 'Pending'} tone={t.is_approved ? 'success' : 'muted'} />
                </View>
              </View>
              <Typography variant="bodyMuted" className="mt-2">
                “{t.content}”
              </Typography>
              <Pressable
                onPress={() => toggle(t.id, !t.is_approved)}
                disabled={busy === t.id}
                className="mt-3 self-start rounded-lg border border-gold/40 px-4 py-2"
              >
                <Typography variant="caption" className="text-gold">
                  {busy === t.id ? 'Saving…' : t.is_approved ? 'Unapprove' : 'Approve'}
                </Typography>
              </Pressable>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
