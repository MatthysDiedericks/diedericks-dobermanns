import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/usePortal';
import { signContract, useSubmitting } from '@/hooks/useMutations';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: contracts, refetch } = useContracts();
  const contract = contracts.find((c) => c.id === id);
  const { submitting, run } = useSubmitting();
  const [agreed, setAgreed] = useState(false);

  async function sign() {
    if (!contract || !agreed) return;
    await run(() => signContract(contract.id));
    await refetch();
    router.back();
  }

  if (!contract) {
    return (
      <ScreenContainer>
        <PageHeader title="Contract" />
        <Typography variant="bodyMuted" className="px-6">
          Contract not found.
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Sign Contract" />
      <View className="px-6 pb-12">
        <Card className="p-4">
          <Typography variant="subtitle">{contract.notes ?? 'Contract document'}</Typography>
          <Button
            label="View full document"
            variant="outline"
            onPress={() => Linking.openURL(contract.document_url)}
            fullWidth
            className="mt-4"
          />
        </Card>

        {!contract.signed_by_client ? (
          <View className="mt-6">
            <PressableRow agreed={agreed} onToggle={() => setAgreed((v) => !v)} />
            <Button
              label="Sign contract"
              onPress={sign}
              loading={submitting}
              disabled={!agreed}
              fullWidth
              className="mt-4"
            />
          </View>
        ) : (
          <Typography variant="body" className="mt-6 text-success">
            Signed on {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : '—'}
          </Typography>
        )}
      </View>
    </ScreenContainer>
  );
}

function PressableRow({ agreed, onToggle }: { agreed: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle}>
      <Card className="flex-row items-start p-4">
        <Typography variant="body" className="flex-1">
          {agreed ? '☑' : '☐'} I confirm I have read and agree to this contract.
        </Typography>
      </Card>
    </Pressable>
  );
}
