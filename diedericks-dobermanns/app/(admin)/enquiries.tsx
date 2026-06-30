import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useEnquiries } from '@/hooks/useAdmin';
import { updateEnquiryStatus } from '@/hooks/useMutations';
import { titleCase } from '@/lib/format';
import type { EnquiryStatus } from '@/types/app.types';

const TONE: Record<EnquiryStatus, BadgeTone> = {
  new: 'gold',
  replied: 'success',
  closed: 'muted',
};

export default function AdminEnquiriesScreen() {
  const { data: enquiries, loading, refetch } = useEnquiries();
  const [busy, setBusy] = useState<string | null>(null);

  async function markReplied(id: string) {
    setBusy(id);
    await updateEnquiryStatus(id, 'replied');
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Inbox" title="Enquiries" />
      <View className="gap-3 px-6">
        {!loading && enquiries.length === 0 ? (
          <EmptyState title="No enquiries yet" />
        ) : (
          enquiries.map((enq) => (
            <Card key={enq.id}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Typography variant="subtitle">{enq.full_name}</Typography>
                  <Typography variant="caption" className="mt-0.5">
                    {enq.email}
                    {enq.phone ? ` · ${enq.phone}` : ''}
                  </Typography>
                </View>
                <Badge label={titleCase(enq.status)} tone={TONE[enq.status]} />
              </View>
              {enq.subject ? (
                <Typography variant="label" className="mt-3">
                  {enq.subject}
                </Typography>
              ) : null}
              <Typography variant="bodyMuted" className="mt-1">
                {enq.message}
              </Typography>
              {enq.status === 'new' ? (
                <Pressable
                  onPress={() => markReplied(enq.id)}
                  disabled={busy === enq.id}
                  className="mt-3 self-start rounded-lg border border-gold/40 px-4 py-2"
                >
                  <Typography variant="caption" className="text-gold">
                    {busy === enq.id ? 'Saving…' : 'Mark as replied'}
                  </Typography>
                </Pressable>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
