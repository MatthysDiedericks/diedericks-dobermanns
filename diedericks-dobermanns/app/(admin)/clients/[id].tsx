import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';

import { DocumentList } from '@/components/documents/DocumentList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClients } from '@/hooks/useAdmin';
import { exportClientStatement } from '@/lib/finance/generatePDF';
import { titleCase } from '@/lib/format';

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="border-b border-gold/10 py-3">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body" className="mt-1">
        {value}
      </Typography>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: clients, loading } = useClients();
  const client = clients.find((c) => c.id === id);
  const [tab, setTab] = useState<'profile' | 'documents'>('profile');
  const [exportingStatement, setExportingStatement] = useState(false);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!client) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Client not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Client" title={client.full_name ?? 'Client'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6" contentContainerStyle={{ gap: 8 }}>
        {(['profile', 'documents'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`rounded-full border px-4 py-2 ${tab === t ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
          >
            <Typography variant="caption">{titleCase(t)}</Typography>
          </Pressable>
        ))}
      </ScrollView>
      <View className="px-6 pb-12">
        {tab === 'documents' ? (
          <DocumentList entityType="client" entityId={id ?? ''} />
        ) : (
          <>
            <View className="mb-4 flex-row items-center gap-3">
              <Badge label={titleCase(client.role)} tone="gold" />
              <Button
                label="Generate Statement"
                variant="outline"
                size="sm"
                loading={exportingStatement}
                onPress={() => {
                  setExportingStatement(true);
                  void exportClientStatement(client.id)
                    .catch(() => {})
                    .finally(() => setExportingStatement(false));
                }}
              />
            </View>
            <Card>
              <Field label="Phone" value={client.phone} />
              <Field label="City" value={client.city} />
              <Field label="Country" value={client.country} />
              <Field label="Member since" value={new Date(client.created_at).toLocaleDateString()} />
            </Card>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
