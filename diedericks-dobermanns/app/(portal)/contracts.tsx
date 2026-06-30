import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/usePortal';
import { signContract } from '@/hooks/useMutations';

export default function ContractsScreen() {
  const { data: contracts, loading, refetch } = useContracts();
  const [busy, setBusy] = useState<string | null>(null);

  async function sign(id: string) {
    setBusy(id);
    await signContract(id);
    await refetch();
    setBusy(null);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Contracts" />
      <View className="gap-3 px-6">
        {!loading && contracts.length === 0 ? (
          <EmptyState
            title="No contracts yet"
            message="Documents will appear here once your reservation is confirmed."
          />
        ) : (
          contracts.map((c) => (
            <Card key={c.id}>
              <View className="flex-row items-start justify-between">
                <Typography variant="subtitle" className="flex-1 pr-3">
                  {c.notes ?? 'Contract document'}
                </Typography>
                <Badge
                  label={c.signed_by_client ? 'Signed' : 'Action needed'}
                  tone={c.signed_by_client ? 'success' : 'gold'}
                />
              </View>
              {c.signed_at ? (
                <Typography variant="caption" className="mt-2">
                  Signed {new Date(c.signed_at).toLocaleDateString()}
                </Typography>
              ) : null}

              <Pressable
                onPress={() => Linking.openURL(c.document_url)}
                className="mt-3 self-start"
              >
                <Typography variant="caption" className="text-gold underline">
                  View document
                </Typography>
              </Pressable>

              {!c.signed_by_client ? (
                <Button
                  label="Sign Contract"
                  onPress={() => sign(c.id)}
                  loading={busy === c.id}
                  fullWidth
                  className="mt-4"
                />
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
