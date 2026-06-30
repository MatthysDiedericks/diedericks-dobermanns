import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminFaq } from '@/hooks/useAdmin';
import { setFaqPublished } from '@/hooks/useMutations';

export default function AdminFaqScreen() {
  const { data: faqs, loading, refetch } = useAdminFaq();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    await setFaqPublished(id, next);
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Content" title="FAQ" />
      <View className="gap-3 px-6">
        {!loading && faqs.length === 0 ? (
          <EmptyState title="No FAQ entries yet" />
        ) : (
          faqs.map((f) => (
            <Card key={f.id}>
              <View className="flex-row items-start justify-between">
                <Typography variant="subtitle" className="flex-1 pr-3">
                  {f.question}
                </Typography>
                <Badge
                  label={f.is_published ? 'Live' : 'Hidden'}
                  tone={f.is_published ? 'success' : 'muted'}
                />
              </View>
              <Typography variant="bodyMuted" className="mt-2">
                {f.answer}
              </Typography>
              <Pressable
                onPress={() => toggle(f.id, !f.is_published)}
                disabled={busy === f.id}
                className="mt-3 self-start rounded-lg border border-gold/40 px-4 py-2"
              >
                <Typography variant="caption" className="text-gold">
                  {busy === f.id ? 'Saving…' : f.is_published ? 'Unpublish' : 'Publish'}
                </Typography>
              </Pressable>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
