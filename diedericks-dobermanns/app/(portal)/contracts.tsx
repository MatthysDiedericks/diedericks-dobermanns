import { useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/usePortal';

export default function ContractsScreen() {
  const { data: contracts, loading } = useContracts();
  const router = useRouter();

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
          contracts.map((c) => {
            const signed = c.signed_by_client || c.status === 'signed_client' || c.status === 'signed_both';
            return (
              <Card key={c.id}>
                <View className="flex-row items-start justify-between">
                  <Typography variant="subtitle" className="flex-1 pr-3">
                    {c.contract_title ?? c.notes ?? 'Contract document'}
                  </Typography>
                  <Badge label={signed ? 'Signed' : 'Action needed'} tone={signed ? 'success' : 'gold'} />
                </View>
                {c.client_signed_at ?? c.signed_at ? (
                  <Typography variant="caption" className="mt-2">
                    Signed {new Date((c.client_signed_at ?? c.signed_at)!).toLocaleDateString()}
                  </Typography>
                ) : null}

                {c.document_url ? (
                  <Pressable onPress={() => Linking.openURL(c.document_url)} className="mt-3 self-start">
                    <Typography variant="caption" className="text-gold underline">
                      View document
                    </Typography>
                  </Pressable>
                ) : null}

                {!signed ? (
                  <Button
                    label="Review & Sign"
                    onPress={() => router.push(`/(portal)/contracts/${c.id}` as never)}
                    fullWidth
                    className="mt-4"
                  />
                ) : null}
              </Card>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
