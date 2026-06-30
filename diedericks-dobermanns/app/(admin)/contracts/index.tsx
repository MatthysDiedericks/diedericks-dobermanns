import { useContracts } from '@/hooks/useContracts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { ScrollView, View } from 'react-native';

export default function ContractsScreen() {
  const { contracts, templates, loading, error, sendEsign } = useContracts();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Business" title="Contracts" back={false} />
      {loading ? (
        <Typography variant="body" className="px-6">Loading…</Typography>
      ) : error ? (
        <Typography variant="body" className="px-6 text-danger">{error}</Typography>
      ) : (
        <ScrollView className="px-6 pb-12">
          <Typography variant="label" className="mb-2">Templates</Typography>
          {templates.length === 0 ? (
            <EmptyState title="No templates" message="Contract templates will appear here once seeded." />
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="mb-2">
                <Typography variant="subtitle">{t.name}</Typography>
                <Typography variant="caption">{t.contract_title}</Typography>
              </Card>
            ))
          )}
          <Typography variant="label" className="mb-2 mt-6">Individual contracts</Typography>
          {contracts.map((c) => (
            <Card key={c.id} className="mb-2">
              <View className="flex-row justify-between">
                <Typography variant="subtitle">{c.contract_title ?? 'Contract'}</Typography>
                <Badge label={c.status ?? 'draft'} tone="gold" />
              </View>
              <Typography variant="caption">
                {c.client?.full_name ?? '—'} · {c.dog?.name ?? '—'} · {formatKennelDate(c.created_at)}
              </Typography>
              {c.status !== 'signed_client' && !c.signed_by_client ? (
                <Button label="Send eSign" size="sm" variant="secondary" onPress={() => sendEsign(c.id)} className="mt-2" />
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
